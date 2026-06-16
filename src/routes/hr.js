// HR routes
const express = require('express');
const router = express.Router();
const hr = require('../modules/hr');
const { requireAuth, requireBusiness } = require('../auth');

router.use(requireAuth, requireBusiness);

router.get('/employees', (req, res) => {
  const { status, limit, offset } = req.query;
  res.json({ employees: hr.listEmployees(req.businessId, { status, limit: Number(limit) || 100, offset: Number(offset) || 0 }) });
});
router.post('/employees', (req, res) => {
  res.status(201).json({ employee: hr.addEmployee(req.businessId, req.body) });
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

module.exports = router;
