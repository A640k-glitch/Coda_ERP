// Seed script — localhost only demo data
// Only runs in development mode when the database is empty

const { db, seedAccounts } = require('./db');

function seedDemoData() {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount > 0) {
    return;
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Demo business
  const bizId = 'BIZ_DEMO_001';
  db.prepare(`INSERT OR IGNORE INTO businesses (id, name, cac_number, business_type, address, phone, email, tier, subscription_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(bizId, 'Afri-Trade Ventures Ltd', 'RC1234567', 'limited', '42 Awolowo Road, Ikoyi, Lagos', '+234 802 345 6789', 'demo@afritrade.ng', 'premium', 'active', now);

  seedAccounts(bizId);

  // Demo admin
  const adminId = 'USR_ADMIN_001';
  const bcrypt = require('bcrypt');
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  db.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash, name, business_id, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(adminId, 'demo@codaerp.ng', adminHash, 'Chidi Okonkwo', bizId, 'owner', now);

  // Demo owner
  const ownerId = 'USR_OWNER_001';
  const ownerHash = bcrypt.hashSync('Demo@123', 10);
  db.prepare(`INSERT OR IGNORE INTO users (id, email, password_hash, name, business_id, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(ownerId, 'owner@afritrade.ng', ownerHash, 'Ada Obi', bizId, 'owner', now);

  // Subscription
  const subId = 'SUB_DEMO_001';
  db.prepare(`INSERT OR IGNORE INTO subscriptions (id, business_id, tier, status, start_date, next_billing_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(subId, bizId, 'premium', 'active', now, new Date(Date.now() + 30 * 86400000).toISOString().replace('T', ' ').slice(0, 19), now);

  // Products
  const products = [
    { id: 'PRD_001', sku: 'NG-GARRI-001', name: 'Garri (Yellow) 50kg', cost: 8500, sell: 12500, stock: 340, reorder: 50 },
    { id: 'PRD_002', sku: 'NG-PALM-001', name: 'Palm Oil (25L)', cost: 22000, sell: 32000, stock: 120, reorder: 20 },
    { id: 'PRD_003', sku: 'NG-RICE-001', name: 'Ofada Rice (50kg)', cost: 28000, sell: 42000, stock: 85, reorder: 30 },
    { id: 'PRD_004', sku: 'NG-BEAN-001', name: 'Brown Beans (50kg)', cost: 18000, sell: 26000, stock: 200, reorder: 40 },
    { id: 'PRD_005', sku: 'NG-YAM-001', name: 'Yam Tuber (bundle)', cost: 3500, sell: 5500, stock: 0, reorder: 100 },
    { id: 'PRD_006', sku: 'NG-FISH-001', name: 'Dry Catfish (kg)', cost: 2500, sell: 4000, stock: 60, reorder: 15 },
  ];
  const prodStmt = db.prepare(`INSERT OR IGNORE INTO products (id, business_id, sku, name, cost_price, sell_price, stock_level, reorder_point, category, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of products) {
    prodStmt.run(p.id, bizId, p.sku, p.name, p.cost, p.sell, p.stock, p.reorder, 'Goods', now, now);
  }

  // Customers
  const customers = [
    { id: 'CUST_001', name: 'Chief Emeka Nwosu', email: 'emeka.nwosu@gmail.com', phone: '+234 803 111 2222', address: '15B Bourdillon Road, Ikoyi' },
    { id: 'CUST_002', name: 'Madam Funke Akindele', email: 'funke.akindele@yahoo.com', phone: '+234 805 333 4444', address: '7 Adeniran Ogunsanya, Surulere' },
    { id: 'CUST_003', name: 'Alhaji Suleiman Bello', email: 'suleiman.bello@proton.me', phone: '+234 806 555 6666', address: '22 Airport Road, Abuja' },
    { id: 'CUST_004', name: 'Dr. Ngozi Eze', email: 'ngozi.eze@gmail.com', phone: '+234 809 777 8888', address: '3 Unity Road, Enugu' },
    { id: 'CUST_005', name: 'Barr. Femi Adebayo', email: 'femi.adebayo@outlook.com', phone: '+234 802 999 0000', address: '10 Liberty Road, Ibadan' },
  ];
  const custStmt = db.prepare(`INSERT OR IGNORE INTO customers (id, business_id, name, email, phone, address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const c of customers) {
    custStmt.run(c.id, bizId, c.name, c.email, c.phone, c.address, now);
  }

  // Employees
  const employees = [
    { id: 'EMP_001', name: 'Blessing Adeyemi', email: 'blessing.adeyemi@afritrade.ng', role: 'Accountant', salary: 250000 },
    { id: 'EMP_002', name: 'Michael Obi', email: 'michael.obi@afritrade.ng', role: 'Store Keeper', salary: 150000 },
    { id: 'EMP_003', name: 'Grace Yusuf', email: 'grace.yusuf@afritrade.ng', role: 'Sales Rep', salary: 120000 },
  ];
  const empStmt = db.prepare(`INSERT OR IGNORE INTO employees (id, business_id, name, email, role, salary, hire_date, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`);
  for (const e of employees) {
    empStmt.run(e.id, bizId, e.name, e.email, e.role, e.salary, now, now);
  }

  // Journal entries (transactions)
  const entries = [
    { id: 'JE_001', date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), desc: 'Sale of 20 bags Garri to Chief Emeka Nwosu' },
    { id: 'JE_002', date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), desc: 'Sale of 10 cartons Palm Oil to Madam Funke' },
    { id: 'JE_003', date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), desc: 'Restock of Rice from Olam Nigeria' },
    { id: 'JE_004', date: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), desc: 'Salary payment for March' },
  ];
  const entryStmt = db.prepare(`INSERT OR IGNORE INTO journal_entries (id, business_id, date, description, reference, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const e of entries) {
    entryStmt.run(e.id, bizId, e.date, e.desc, 'REF-' + e.id.slice(-3), adminId, now);
  }

  // Journal lines
  const lines = [
    { entry: 'JE_001', account: '4000', debit: 0, credit: 250000 },
    { entry: 'JE_001', account: '1000', debit: 250000, credit: 0 },
    { entry: 'JE_002', account: '4000', debit: 0, credit: 320000 },
    { entry: 'JE_002', account: '1000', debit: 320000, credit: 0 },
    { entry: 'JE_003', account: '5000', debit: 280000, credit: 0 },
    { entry: 'JE_003', account: '1000', debit: 0, credit: 280000 },
    { entry: 'JE_004', account: '5100', debit: 520000, credit: 0 },
    { entry: 'JE_004', account: '1000', debit: 0, credit: 520000 },
  ];
  const lineStmt = db.prepare(`INSERT OR IGNORE INTO journal_lines (entry_id, account_id, debit, credit)
    VALUES (?, (SELECT id FROM accounts WHERE business_id = ? AND code = ?), ?, ?)`);
  for (const l of lines) {
    lineStmt.run(l.entry, bizId, l.account, l.debit, l.credit);
  }

  // Sales
  const sales = [
    { id: 'SALE_001', product: 'PRD_001', customer: 'CUST_001', qty: 20, price: 12500 },
    { id: 'SALE_002', product: 'PRD_002', customer: 'CUST_002', qty: 10, price: 32000 },
  ];
  const saleStmt = db.prepare(`INSERT OR IGNORE INTO sales (id, business_id, product_id, customer_id, qty, unit_price, total, cogs, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const s of sales) {
    const total = s.qty * s.price;
    const product = products.find(p => p.id === s.product);
    const cogs = product ? s.qty * product.cost : 0;
    saleStmt.run(s.id, bizId, s.product, s.customer, s.qty, s.price, total, cogs, now);
  }

  // Bank transactions
  const bankTxns = [
    { id: 'BNK_001', date: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), amount: 250000, desc: 'POS Transfer — Chief Emeka', ref: 'MONO-TX-001' },
    { id: 'BNK_002', date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10), amount: 320000, desc: 'Bank Transfer — Madam Funke', ref: 'MONO-TX-002' },
    { id: 'BNK_003', date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), amount: 280000, desc: 'POS Withdrawal — Olam Supply', ref: 'MONO-TX-003' },
  ];
  const bnkStmt = db.prepare(`INSERT OR IGNORE INTO bank_transactions (id, business_id, date, amount, description, reference, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'unreconciled', ?)`);
  for (const b of bankTxns) {
    bnkStmt.run(b.id, bizId, b.date, b.amount, b.desc, b.ref, now);
  }

  // Notifications
  const notifs = [
    { id: 'NOTIF_001', title: 'Low Stock Alert', message: 'Yam Tuber (bundle) is out of stock. Please reorder.' },
    { id: 'NOTIF_002', title: 'Bank Transaction', message: '₦250,000 received from Chief Emeka Nwosu. Reconcile now.' },
    { id: 'NOTIF_003', title: 'Subscription Renewal', message: 'Your Premium plan renews in 7 days.' },
  ];
  const notifStmt = db.prepare(`INSERT OR IGNORE INTO notifications (id, business_id, user_id, title, message, type, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, 'info', 0, ?)`);
  for (const n of notifs) {
    notifStmt.run(n.id, bizId, ownerId, n.title, n.message, now);
  }
}

module.exports = { seedDemoData };