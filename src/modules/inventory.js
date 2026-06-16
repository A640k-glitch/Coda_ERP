// Inventory module — products, sales, COGS, reorder alerts
const { db } = require('../db');
const { generateId } = require('../utils');
const accounting = require('./accounting');

function addProduct(businessId, data) {
  if (!data.name) throw new Error('Product name is required');
  const id = generateId('prod');
  db.prepare(
    `INSERT INTO products (id, business_id, sku, name, cost_price, sell_price, stock_level, reorder_point, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    businessId,
    data.sku || null,
    data.name,
    Number(data.cost_price || 0),
    Number(data.sell_price || 0),
    Number(data.stock_level || 0),
    Number(data.reorder_point || 10),
    data.category || null
  );
  return getProduct(businessId, id);
}

function updateProduct(businessId, id, data) {
  const existing = getProduct(businessId, id);
  if (!existing) return null;
  db.prepare(
    `UPDATE products
     SET sku = ?, name = ?, cost_price = ?, sell_price = ?, reorder_point = ?, category = ?, updated_at = datetime('now')
     WHERE id = ? AND business_id = ?`
  ).run(
    data.sku ?? existing.sku,
    data.name ?? existing.name,
    data.cost_price != null ? Number(data.cost_price) : existing.cost_price,
    data.sell_price != null ? Number(data.sell_price) : existing.sell_price,
    data.reorder_point != null ? Number(data.reorder_point) : existing.reorder_point,
    data.category ?? existing.category,
    id,
    businessId
  );
  return getProduct(businessId, id);
}

function getProduct(businessId, id) {
  return db.prepare('SELECT * FROM products WHERE id = ? AND business_id = ?').get(id, businessId);
}

function listProducts(businessId, { q, lowStockOnly, limit = 100, offset = 0 } = {}) {
  const where = ['business_id = ?'];
  const params = [businessId];
  if (q) {
    where.push('(name LIKE ? OR sku LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (lowStockOnly) where.push('stock_level <= reorder_point');
  return db
    .prepare(
      `SELECT * FROM products WHERE ${where.join(' AND ')}
       ORDER BY name LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
}

function deleteProduct(businessId, id) {
  const r = db.prepare('DELETE FROM products WHERE id = ? AND business_id = ?').run(id, businessId);
  return r.changes > 0;
}

function recordSale(businessId, userId, { product_id, qty, unit_price, customer_id }) {
  const product = getProduct(businessId, product_id);
  if (!product) throw new Error('Product not found');
  const q = Number(qty);
  if (!q || q <= 0) throw new Error('Quantity must be positive');
  if (product.stock_level < q) {
    throw new Error(`Insufficient stock. Available: ${product.stock_level}, requested: ${q}`);
  }
  const price = unit_price != null ? Number(unit_price) : product.sell_price;
  const total = +(price * q).toFixed(2);
  const cogs = +(product.cost_price * q).toFixed(2);

  const id = generateId('sale');
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO sales (id, business_id, product_id, customer_id, qty, unit_price, total, cogs)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, businessId, product_id, customer_id || null, q, price, total, cogs);
    db.prepare('UPDATE products SET stock_level = stock_level - ?, updated_at = datetime(\'now\') WHERE id = ?').run(q, product_id);
    // Post journal entry: Dr Cash (or AR), Cr Sales; Dr COGS, Cr Inventory
    accounting.recordTransaction(businessId, userId, {
      date: new Date().toISOString(),
      description: `Sale of ${q} × ${product.name}`,
      reference: id,
      lines: [
        { account: '1000', debit: total, credit: 0 },
        { account: '4000', debit: 0, credit: total },
        { account: '5000', debit: cogs, credit: 0 },
        { account: '1300', debit: 0, credit: cogs },
      ],
    });
  });
  tx();
  return db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
}

function listSales(businessId, { limit = 50, offset = 0, from, to } = {}) {
  const where = ['s.business_id = ?'];
  const params = [businessId];
  if (from) { where.push('s.created_at >= ?'); params.push(from); }
  if (to)   { where.push('s.created_at <= ?'); params.push(to); }
  return db
    .prepare(
      `SELECT s.*, p.name AS product_name, p.sku, c.name AS customer_name
       FROM sales s
       LEFT JOIN products p ON p.id = s.product_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE ${where.join(' AND ')}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
}

function lowStockAlerts(businessId) {
  return db
    .prepare('SELECT * FROM products WHERE business_id = ? AND stock_level <= reorder_point ORDER BY stock_level ASC')
    .all(businessId);
}

module.exports = {
  addProduct,
  updateProduct,
  getProduct,
  listProducts,
  deleteProduct,
  recordSale,
  listSales,
  lowStockAlerts,
};
