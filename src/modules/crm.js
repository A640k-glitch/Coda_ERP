// CRM module — customers + leads
const { db } = require('../db');
const { generateId } = require('../utils');

function addCustomer(businessId, data) {
  if (!data.name) throw new Error('Customer name is required');
  const id = generateId('cust');
  db.prepare(
    `INSERT INTO customers (business_id, id, name, email, phone, tin, address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(businessId, id, data.name, data.email || null, data.phone || null, data.tin || null, data.address || null);
  return getCustomer(businessId, id);
}

function updateCustomer(businessId, id, data) {
  const existing = getCustomer(businessId, id);
  if (!existing) return null;
  db.prepare(
    `UPDATE customers
     SET name = ?, email = ?, phone = ?, tin = ?, address = ?
     WHERE id = ? AND business_id = ?`
  ).run(
    data.name ?? existing.name,
    data.email ?? existing.email,
    data.phone ?? existing.phone,
    data.tin ?? existing.tin,
    data.address ?? existing.address,
    id,
    businessId
  );
  return getCustomer(businessId, id);
}

function getCustomer(businessId, id) {
  return db.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(id, businessId);
}

function listCustomers(businessId, { q, limit = 100, offset = 0 } = {}) {
  const where = ['business_id = ?'];
  const params = [businessId];
  if (q) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  return db
    .prepare(`SELECT * FROM customers WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
}

function deleteCustomer(businessId, id) {
  const r = db.prepare('DELETE FROM customers WHERE id = ? AND business_id = ?').run(id, businessId);
  return r.changes > 0;
}

function addLead(businessId, data) {
  if (!data.name) throw new Error('Lead name is required');
  const id = generateId('lead');
  db.prepare(
    `INSERT INTO leads (business_id, id, name, email, phone, source, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    businessId,
    id,
    data.name,
    data.email || null,
    data.phone || null,
    data.source || null,
    data.status || 'new',
    data.notes || null
  );
  return getLead(businessId, id);
}

function updateLead(businessId, id, data) {
  const existing = getLead(businessId, id);
  if (!existing) return null;
  db.prepare(
    `UPDATE leads SET name = ?, email = ?, phone = ?, source = ?, status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND business_id = ?`
  ).run(
    data.name ?? existing.name,
    data.email ?? existing.email,
    data.phone ?? existing.phone,
    data.source ?? existing.source,
    data.status ?? existing.status,
    data.notes ?? existing.notes,
    id,
    businessId
  );
  return getLead(businessId, id);
}

function getLead(businessId, id) {
  return db.prepare('SELECT * FROM leads WHERE id = ? AND business_id = ?').get(id, businessId);
}

function listLeads(businessId, { status, limit = 100, offset = 0 } = {}) {
  const where = ['business_id = ?'];
  const params = [businessId];
  if (status) { where.push('status = ?'); params.push(status); }
  return db
    .prepare(`SELECT * FROM leads WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
}

function deleteLead(businessId, id) {
  const r = db.prepare('DELETE FROM leads WHERE id = ? AND business_id = ?').run(id, businessId);
  return r.changes > 0;
}

function importCustomers(businessId, customersList) {
  const stmt = db.prepare(
    `INSERT INTO customers (business_id, id, name, email, phone, tin, address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  
  const inserted = [];
  const transaction = db.transaction((list) => {
    for (const c of list) {
      if (!c.name) continue;
      const id = generateId('cust');
      stmt.run(businessId, id, c.name, c.email || null, c.phone || null, c.tin || null, c.address || null);
      inserted.push({ id, ...c });
    }
  });
  
  transaction(customersList);
  return inserted;
}

module.exports = {
  addCustomer, updateCustomer, getCustomer, listCustomers, deleteCustomer,
  addLead, updateLead, getLead, listLeads, deleteLead, importCustomers,
};

