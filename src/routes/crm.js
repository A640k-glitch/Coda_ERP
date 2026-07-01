// CRM routes — customers + leads
const express = require('express');
const router = express.Router();
const crm = require('../modules/crm');
const { db } = require('../db');
const TenantDB = require('../tenant-db');
const { requireAuth, requireBusiness, logAudit } = require('../auth');
const { requireTierModule } = require('../entitlements');

router.use(requireAuth, requireBusiness);
router.use(requireTierModule('crm'));

router.post('/customers/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
  const placeholders = ids.map(() => '?').join(',');
  const tdb = new TenantDB(req.businessId);
  const result = tdb.prepare(`DELETE FROM customers WHERE id IN (${placeholders}) AND business_id = ?`).run(...ids, req.businessId);
  logAudit(req.businessId, req.user.id, 'customer.batch_delete', { count: result.changes });
  res.json({ deleted: result.changes });
});

router.get('/customers', (req, res) => {
  const { q, limit, offset } = req.query;
  res.json({ customers: crm.listCustomers(req.businessId, { q, limit: Number(limit) || 100, offset: Number(offset) || 0 }) });
});
router.post('/customers', (req, res) => {
  const customer = crm.addCustomer(req.businessId, req.body);
  logAudit(req.businessId, req.user.id, 'customer.create', { id: customer.id, name: customer.name });
  res.status(201).json({ customer });
});
router.post('/customers/import', (req, res) => {
  if (!Array.isArray(req.body.customers)) {
    return res.status(400).json({ error: 'customers array required' });
  }
  try {
    const imported = crm.importCustomers(req.businessId, req.body.customers);
    logAudit(req.businessId, req.user.id, 'customer.import_csv', { count: imported.length });
    res.json({ success: true, count: imported.length, customers: imported });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router.get('/customers/:id', (req, res) => {
  const c = crm.getCustomer(req.businessId, req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json({ customer: c });
});

router.get('/customers/:id/transactions', (req, res) => {
  const result = crm.getCustomerTransactions(req.businessId, req.params.id);
  if (!result) return res.status(404).json({ error: 'Customer not found' });
  res.json(result);
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

// ── Communication Log Routes ──────────────────────────
router.get('/customers/:id/communications', (req, res) => {
  res.json({ communications: crm.listCommunications(req.businessId, req.params.id) });
});

router.post('/customers/:id/communications', (req, res) => {
  const comm = crm.addCommunication(req.businessId, {
    customer_id: req.params.id,
    type: req.body.type || 'note',
    subject: req.body.subject || null,
    notes: req.body.notes || null,
    created_by: req.user.id,
  });
  res.status(201).json({ communication: comm });
});

router.delete('/communications/:id', (req, res) => {
  res.json({ ok: crm.deleteCommunication(req.businessId, req.params.id) });
});

module.exports = router;
