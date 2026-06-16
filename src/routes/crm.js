// CRM routes — customers + leads
const express = require('express');
const router = express.Router();
const crm = require('../modules/crm');
const { requireAuth, requireBusiness } = require('../auth');

router.use(requireAuth, requireBusiness);

router.get('/customers', (req, res) => {
  const { q, limit, offset } = req.query;
  res.json({ customers: crm.listCustomers(req.businessId, { q, limit: Number(limit) || 100, offset: Number(offset) || 0 }) });
});
router.post('/customers', (req, res) => {
  res.status(201).json({ customer: crm.addCustomer(req.businessId, req.body) });
});
router.get('/customers/:id', (req, res) => {
  const c = crm.getCustomer(req.businessId, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json({ customer: c });
});
router.patch('/customers/:id', (req, res) => {
  const c = crm.updateCustomer(req.businessId, req.params.id, req.body);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json({ customer: c });
});
router.delete('/customers/:id', (req, res) => {
  res.json({ ok: crm.deleteCustomer(req.businessId, req.params.id) });
});

router.get('/leads', (req, res) => {
  const { status, limit, offset } = req.query;
  res.json({ leads: crm.listLeads(req.businessId, { status, limit: Number(limit) || 100, offset: Number(offset) || 0 }) });
});
router.post('/leads', (req, res) => {
  res.status(201).json({ lead: crm.addLead(req.businessId, req.body) });
});
router.patch('/leads/:id', (req, res) => {
  const l = crm.updateLead(req.businessId, req.params.id, req.body);
  if (!l) return res.status(404).json({ error: 'Not found' });
  res.json({ lead: l });
});
router.delete('/leads/:id', (req, res) => {
  res.json({ ok: crm.deleteLead(req.businessId, req.params.id) });
});

module.exports = router;
