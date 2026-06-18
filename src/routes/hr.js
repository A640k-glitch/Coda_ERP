// HR routes
const express = require('express');
const router = express.Router();
const hr = require('../modules/hr');
const { db } = require('../db');
const { requireAuth, requireBusiness, logAudit } = require('../auth');

router.use(requireAuth, requireBusiness);

router.post('/employees/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM employees WHERE id IN (${placeholders}) AND business_id = ?`).run(...ids, req.businessId);
  logAudit(req.businessId, req.user.id, 'employee.batch_delete', { count: result.changes });
  res.json({ deleted: result.changes });
});

router.patch('/employees/batch-status', (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
  if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'status must be active or inactive' });
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`UPDATE employees SET status = ? WHERE id IN (${placeholders}) AND business_id = ?`).run(status, ...ids, req.businessId);
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
    res.json({ success: true, entry, summary });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

