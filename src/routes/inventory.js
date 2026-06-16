// Inventory routes
const express = require('express');
const router = express.Router();
const inventory = require('../modules/inventory');
const { requireAuth, requireBusiness } = require('../auth');

router.use(requireAuth, requireBusiness);

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

router.get('/low-stock', (req, res) => {
  res.json({ products: inventory.lowStockAlerts(req.businessId) });
});

module.exports = router;
