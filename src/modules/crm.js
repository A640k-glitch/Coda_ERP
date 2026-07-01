// CRM module — customers + leads
const { db } = require('../db');
const TenantDB = require('../tenant-db');
const { generateId } = require('../utils');

function addCustomer(businessId, data) {
  const tdb = new TenantDB(businessId);
  if (!data.name) throw new Error('Customer name is required');
  const id = generateId('cust');
  tdb.prepare(
    `INSERT INTO customers (business_id, id, name, email, phone, tin, address, notes, preferred_payment, important_dates)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(businessId, id, data.name, data.email || null, data.phone || null, data.tin || null, data.address || null, data.notes || null, data.preferred_payment || null, data.important_dates || null);
  return getCustomer(businessId, id);
}

function updateCustomer(businessId, id, data) {
  const tdb = new TenantDB(businessId);
  const existing = getCustomer(businessId, id);
  if (!existing) return null;
  tdb.prepare(
    `UPDATE customers
     SET name = ?, email = ?, phone = ?, tin = ?, address = ?, notes = ?, preferred_payment = ?, important_dates = ?
     WHERE id = ? AND business_id = ?`
  ).run(
    data.name ?? existing.name,
    data.email ?? existing.email,
    data.phone ?? existing.phone,
    data.tin ?? existing.tin,
    data.address ?? existing.address,
    data.notes ?? existing.notes,
    data.preferred_payment ?? existing.preferred_payment,
    data.important_dates ?? existing.important_dates,
    id,
    businessId
  );
  return getCustomer(businessId, id);
}

function getCustomer(businessId, id) {
  const tdb = new TenantDB(businessId);
  return tdb.prepare('SELECT * FROM customers WHERE id = ? AND business_id = ?').get(id, businessId);
}

function listCustomers(businessId, { q, limit = 100, offset = 0 } = {}) {
  const tdb = new TenantDB(businessId);
  const where = ['business_id = ?'];
  const params = [businessId];
  if (q) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  return tdb.prepare(`SELECT * FROM customers WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
}

function deleteCustomer(businessId, id) {
  const tdb = new TenantDB(businessId);
  const r = tdb.prepare('DELETE FROM customers WHERE id = ? AND business_id = ?').run(id, businessId);
  return r.changes > 0;
}

function addLead(businessId, data) {
  const tdb = new TenantDB(businessId);
  if (!data.name) throw new Error('Lead name is required');
  const id = generateId('lead');
  tdb.prepare(
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
  const tdb = new TenantDB(businessId);
  const existing = getLead(businessId, id);
  if (!existing) return null;
  tdb.prepare(
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
  const tdb = new TenantDB(businessId);
  return tdb.prepare('SELECT * FROM leads WHERE id = ? AND business_id = ?').get(id, businessId);
}

function listLeads(businessId, { status, limit = 100, offset = 0 } = {}) {
  const tdb = new TenantDB(businessId);
  const where = ['business_id = ?'];
  const params = [businessId];
  if (status) { where.push('status = ?'); params.push(status); }
  return tdb.prepare(`SELECT * FROM leads WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
}

function deleteLead(businessId, id) {
  const tdb = new TenantDB(businessId);
  const r = tdb.prepare('DELETE FROM leads WHERE id = ? AND business_id = ?').run(id, businessId);
  return r.changes > 0;
}

function importCustomers(businessId, customersList) {
  const tdb = new TenantDB(businessId);
  const stmt = tdb.prepare(
    `INSERT INTO customers (business_id, id, name, email, phone, tin, address, notes, preferred_payment, important_dates)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  
  const inserted = [];
  const transaction = tdb.transaction((list) => {
    for (const c of list) {
      if (!c.name) continue;
      const id = generateId('cust');
      stmt.run(businessId, id, c.name, c.email || null, c.phone || null, c.tin || null, c.address || null, c.notes || null, c.preferred_payment || null, c.important_dates || null);
      inserted.push({ id, ...c });
    }
  });
  
  transaction(customersList);
  return inserted;
}

function getCustomerTransactions(businessId, customerId) {
  const tdb = new TenantDB(businessId);
  const customer = getCustomer(businessId, customerId);
  if (!customer) return null;

  // Get journal entries linked to this customer
  const journalEntries = tdb.prepare(`
    SELECT je.*,
           (SELECT COALESCE(SUM(jl.debit), 0) FROM journal_lines jl WHERE jl.entry_id = je.id) AS total
    FROM journal_entries je
    WHERE je.business_id = ? AND je.customer_id = ?
    ORDER BY je.date DESC, je.created_at DESC
    LIMIT 100
  `).all(businessId, customerId);

  // Get sales records for this customer
  const salesRecords = tdb.prepare(`
    SELECT s.*, p.name AS product_name
    FROM sales s
    LEFT JOIN products p ON p.id = s.product_id
    WHERE s.business_id = ? AND s.customer_id = ?
    ORDER BY s.created_at DESC
    LIMIT 100
  `).all(businessId, customerId);

  // Also look for journal entries where description mentions the customer name
  // (backwards compatibility for entries before customer_id was stored)
  const legacyEntries = tdb.prepare(`
    SELECT je.*,
           (SELECT COALESCE(SUM(jl.debit), 0) FROM journal_lines jl WHERE jl.entry_id = je.id) AS total
    FROM journal_entries je
    WHERE je.business_id = ?
      AND (je.customer_id IS NULL OR je.customer_id = '')
      AND je.description LIKE ?
    ORDER BY je.date DESC, je.created_at DESC
    LIMIT 50
  `).all(businessId, `%${customer.name}%`);

  return {
    customer,
    transactions: journalEntries,
    sales: salesRecords,
    legacyTransactions: legacyEntries,
  };
}

// ── Communication Log ──────────────────────────────────
function addCommunication(businessId, data) {
  const tdb = new TenantDB(businessId);
  if (!data.customer_id) throw new Error('customer_id is required');
  const id = generateId('comm');
  tdb.prepare(
    `INSERT INTO customer_communications (id, business_id, customer_id, type, subject, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, businessId, data.customer_id, data.type || 'note', data.subject || null, data.notes || null, data.created_by || null);
  return tdb.prepare('SELECT * FROM customer_communications WHERE id = ?').get(id);
}

function listCommunications(businessId, customerId) {
  const tdb = new TenantDB(businessId);
  return tdb.prepare(
    `SELECT c.*, u.name AS created_by_name
     FROM customer_communications c
     LEFT JOIN users u ON u.id = c.created_by
     WHERE c.business_id = ? AND c.customer_id = ?
     ORDER BY c.created_at DESC
     LIMIT 100`
  ).all(businessId, customerId);
}

function deleteCommunication(businessId, id) {
  const tdb = new TenantDB(businessId);
  const r = tdb.prepare('DELETE FROM customer_communications WHERE id = ? AND business_id = ?').run(id, businessId);
  return r.changes > 0;
}

module.exports = {
  addCustomer, updateCustomer, getCustomer, listCustomers, deleteCustomer,
  addLead, updateLead, getLead, listLeads, deleteLead, importCustomers,
  getCustomerTransactions,
  addCommunication, listCommunications, deleteCommunication,
};

