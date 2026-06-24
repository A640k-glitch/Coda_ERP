// Inventory routes
const express = require('express');
const router = express.Router();
const inventory = require('../modules/inventory');
const { db } = require('../db');
const { requireAuth, requireBusiness, logAudit } = require('../auth');
const { requireTierModule } = require('../entitlements');

router.use(requireAuth, requireBusiness);
router.use(requireTierModule('inventory'));

router.post('/products/batch-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });
  const placeholders = ids.map(() => '?').join(',');
  const result = db.prepare(`DELETE FROM products WHERE id IN (${placeholders}) AND business_id = ?`).run(...ids, req.businessId);
  logAudit(req.businessId, req.user.id, 'product.batch_delete', { count: result.changes });
  res.json({ deleted: result.changes });
});

router.get('/products', (req, res) => {
  const { q, lowStockOnly, limit, offset } = req.query;
  res.json({
    products: inventory.listProducts(req.businessId, {
      q: q || undefined,
      lowStockOnly: lowStockOnly === 'true',
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    }),
  });
});

router.post('/products', (req, res) => {
  const p = inventory.addProduct(req.businessId, req.body);
  logAudit(req.businessId, req.user.id, 'product.create', { id: p.id, name: p.name });
  res.status(201).json({ product: p });
});

router.get('/products/:id', (req, res) => {
  const p = inventory.getProduct(req.businessId, req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ product: p });
});

router.patch('/products/:id', (req, res) => {
  const p = inventory.updateProduct(req.businessId, req.params.id, req.body);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ product: p });
});

router.delete('/products/:id', (req, res) => {
  const ok = inventory.deleteProduct(req.businessId, req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.post('/sales', (req, res) => {
  const s = inventory.recordSale(req.businessId, req.user.id, req.body);
  logAudit(req.businessId, req.user.id, 'sale.create', { id: s.id, total: s.total });
  res.status(201).json({ sale: s });
});

router.get('/sales', (req, res) => {
  const { from, to, limit, offset } = req.query;
  res.json({
    sales: inventory.listSales(req.businessId, {
      from: from || undefined,
      to: to || undefined,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    }),
  });
});

router.get('/purchase-orders', (req, res) => {
  try {
    const pos = db.prepare(`
      SELECT je.id, je.date, je.description, jl.credit AS amount
      FROM journal_entries je
      JOIN journal_lines jl ON je.id = jl.entry_id
      JOIN accounts a ON jl.account_id = a.id
      WHERE je.business_id = ? AND je.description LIKE 'PO to %' AND a.code = '2000'
      ORDER BY je.date DESC
    `).all(req.businessId);
    res.json({ purchaseOrders: pos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
