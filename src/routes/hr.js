// HR routes
const express = require('express');
const router = express.Router();
const hr = require('../modules/hr');
const tax = require('../modules/tax');
const { db } = require('../db');
const TenantDB = require('../tenant-db');
const { requireAuth, requireBusiness, logAudit } = require('../auth');
const { requireTierModule } = require('../entitlements');
const PDFDocument = require('pdfkit');

router.use(requireAuth, requireBusiness);
const { generateId } = require('../utils');
router.use(requireTierModule('hr'));

router.post('/employees/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
  const placeholders = ids.map(() => '?').join(',');
  const tdb = new TenantDB(req.businessId);
  const result = tdb.prepare(`DELETE FROM employees WHERE id IN (${placeholders}) AND business_id = ?`).run(...ids, req.businessId);
  logAudit(req.businessId, req.user.id, 'employee.batch_delete', { count: result.changes });
  res.json({ deleted: result.changes });
});

router.patch('/employees/batch-status', (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
  if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'status must be active or inactive' });
  const placeholders = ids.map(() => '?').join(',');
  const tdb = new TenantDB(req.businessId);
  const result = tdb.prepare(`UPDATE employees SET status = ? WHERE id IN (${placeholders}) AND business_id = ?`).run(status, ...ids, req.businessId);
  logAudit(req.businessId, req.user.id, 'employee.batch_status', { status, count: result.changes });
  res.json({ updated: result.changes });
});

router.get('/employees', (req, res) => {
  const { status, limit, offset } = req.query;
  res.json({ employees: hr.listEmployees(req.businessId, { status, limit: Number(limit) || 100, offset: Number(offset) || 0 }) });
});
router.post('/employees', (req, res) => {
  const e = hr.addEmployee(req.businessId, req.body);
  logAudit(req.businessId, req.user.id, 'employee.create', { id: e.id, name: e.name });
  res.status(201).json({ employee: e });
});
router.get('/employees/:id', (req, res) => {
  const e = hr.getEmployee(req.businessId, req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json({ employee: e });
});
router.patch('/employees/:id', (req, res) => {
  const e = hr.updateEmployee(req.businessId, req.params.id, req.body);
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json({ employee: e });
});
router.delete('/employees/:id', (req, res) => {
  res.json({ ok: hr.deleteEmployee(req.businessId, req.params.id) });
});

router.post('/attendance', (req, res) => {
  res.status(201).json({ attendance: hr.recordAttendance(req.businessId, req.body) });
});
router.get('/attendance', (req, res) => {
  const { employee_id, date, limit } = req.query;
  res.json({ attendance: hr.listAttendance(req.businessId, { employee_id, date, limit: Number(limit) || 100 }) });
});
router.get('/payroll', (req, res) => {
  res.json({ payroll: hr.payrollSummary(req.businessId) });
});
router.post('/payroll/disburse', (req, res) => {
  try {
    const summary = hr.payrollSummary(req.businessId);
    if (summary.totalMonthlyGross <= 0) {
      return res.status(400).json({ error: 'No active employees to pay.' });
    }
    const accountingModule = require('../modules/accounting');
    const entry = accountingModule.recordTransaction(req.businessId, req.user.id, {
      date: new Date().toISOString(),
      description: `Payroll Disbursed - ${new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}`,
      lines: [
        { account: '6100', debit: summary.totalMonthlyGross, credit: 0 },
        { account: '1100', debit: 0, credit: summary.totalMonthlyNet },
        { account: '2300', debit: 0, credit: summary.totalMonthlyPAYE }
      ]
    });
    logAudit(req.businessId, req.user.id, 'payroll.disburse', { total: summary.totalMonthlyGross });
    
    // Create a notification for payroll disbursement
    const notifId = generateId('notif');
    const tdb = new TenantDB(req.businessId);
    const grossFormatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(summary.totalMonthlyGross);
    tdb.prepare(`
      INSERT INTO notifications (id, business_id, title, message, type, target_view, target_item_id)
      VALUES (?, ?, 'Payroll Disbursed', ?, 'success', 'accounting', ?)
    `).run(
      notifId,
      req.businessId,
      `Monthly payroll of ${grossFormatted} disbursed for ${summary.count} active employees.`,
      entry.id
    );

    res.json({ success: true, entry, summary });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/leaves', (req, res) => {
  const { employee_id, status, limit, offset } = req.query;
  res.json({ leaves: hr.listLeaves(req.businessId, { employee_id, status, limit: Number(limit) || 100, offset: Number(offset) || 0 }) });
});
router.post('/leaves', (req, res) => {
  const l = hr.addLeave(req.businessId, { ...req.body, employee_id: req.body.employee_id });
  logAudit(req.businessId, req.user.id, 'leave.create', { id: l.id, employee_id: l.employee_id });
  res.status(201).json({ leave: l });
});
router.patch('/leaves/:id', (req, res) => {
  const l = hr.updateLeave(req.businessId, req.params.id, { ...req.body, approved_by: req.body.status === 'approved' ? req.user.id : undefined });
  if (!l) return res.status(404).json({ error: 'Not found' });
  res.json({ leave: l });
});
router.delete('/leaves/:id', (req, res) => {
  const ok = hr.deleteLeave(req.businessId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.get('/employees/:id/payslip', (req, res) => {
  try {
    const emp = hr.getEmployee(req.businessId, req.params.id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const annualPAYE = tax.calculatePAYE(emp.salary * 12);
    const monthlyPAYE = annualPAYE / 12;
    const monthlyNet = emp.salary - monthlyPAYE;
    const month = req.query.month || new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${emp.name.replace(/\s+/g, '_')}-${month}.pdf"`);
    doc.pipe(res);

    // Colors
    const primary = '#0d9488';
    const secondary = '#64748b';
    const light = '#f1f5f9';

    // Header bar
    doc.rect(0, 0, doc.page.width, 100).fill(primary);
    doc.fillColor('#fff').fontSize(24).font('Helvetica-Bold').text('PAYSLIP', 50, 30);
    doc.fontSize(12).font('Helvetica').text(`Period: ${month}`, 50, 65);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-NG')}`, 50, 82);

    // Employee info card
    doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('EMPLOYEE DETAILS', 50, 130);
    doc.moveTo(50, 148).lineTo(545, 148).strokeColor('#e2e8f0').stroke();
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica');
    const infoY = 160;
    doc.text(`Name: ${emp.name}`, 50, infoY);
    doc.text(`Role: ${emp.role || 'N/A'}`, 250, infoY);
    doc.text(`Email: ${emp.email || 'N/A'}`, 50, infoY + 20);
    doc.text(`Status: ${emp.status || 'active'}`, 250, infoY + 20);

    // Earnings table
    const tableY = 230;
    doc.fillColor('#1e293b').fontSize(14).font('Helvetica-Bold').text('EARNINGS & DEDUCTIONS', 50, tableY);
    doc.moveTo(50, tableY + 18).lineTo(545, tableY + 18).strokeColor('#e2e8f0').stroke();

    // Table header
    doc.rect(50, tableY + 25, 495, 22).fill(light);
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold');
    const col1 = 60, col2 = 340, col3 = 430, col4 = 500;
    doc.text('Description', col1, tableY + 30);
    doc.text('Rate', col2, tableY + 30);
    doc.text('Amount', col3, tableY + 30);

    // Rows
    let rowY = tableY + 55;
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica');
    doc.text('Basic Salary (Monthly)', col1, rowY);
    doc.text('Monthly', col2, rowY);
    doc.text(emp.salary.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }), col3, rowY, { width: 100, align: 'right' });
    rowY += 22;

    // PAYE deduction
    doc.rect(50, rowY - 4, 495, 22).fill('#fef2f2');
    doc.fillColor('#dc2626').text('PAYE Tax (Monthly)', col1, rowY);
    doc.text(monthlyPAYE.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }), col3, rowY, { width: 100, align: 'right' });
    rowY += 26;

    // Net pay separator
    doc.moveTo(50, rowY).lineTo(545, rowY).strokeColor(primary).stroke();
    rowY += 10;

    // Net Pay
    doc.fillColor(primary).fontSize(12).font('Helvetica-Bold');
    doc.text('NET PAY', col1, rowY);
    doc.text(monthlyNet.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }), col3, rowY, { width: 100, align: 'right' });

    // Footer
    doc.fillColor(secondary).fontSize(8).font('Helvetica').text(
      'This is a computer-generated payslip and does not require a signature.',
      50, doc.page.height - 60,
      { align: 'center', width: 495 }
    );
    doc.text(`Employee ID: ${emp.id}`, 50, doc.page.height - 45, { align: 'center', width: 495 });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
