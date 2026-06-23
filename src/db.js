// SQLite database — schema, migrations, prepared statements
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.CODA_DB_PATH || path.join(DATA_DIR, 'coda.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cac_number TEXT,
      tin TEXT,
      business_type TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      tier TEXT NOT NULL DEFAULT 'starter',
      subscription_status TEXT NOT NULL DEFAULT 'trial',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT,
      business_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      api_key TEXT UNIQUE,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT DEFAULT NULL,
      password_reset_token TEXT DEFAULT NULL,
      password_reset_expires TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      tier TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      start_date TEXT NOT NULL,
      next_billing_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      subscription_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      method TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reference TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      UNIQUE (business_id, code),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      reference TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_je_business_date ON journal_entries(business_id, date);
    CREATE INDEX IF NOT EXISTS idx_jl_entry ON journal_lines(entry_id);
    CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines(account_id);

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      sku TEXT,
      name TEXT NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      sell_price REAL NOT NULL DEFAULT 0,
      stock_level REAL NOT NULL DEFAULT 0,
      reorder_point REAL NOT NULL DEFAULT 10,
      category TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(business_id, sku) WHERE sku IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      tin TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      source TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id);

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      customer_id TEXT,
      qty REAL NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      cogs REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id, created_at);

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT,
      salary REAL NOT NULL DEFAULT 0,
      hire_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_employees_business ON employees(business_id);

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id, date);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_log(business_id, created_at);

    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      reference TEXT,
      status TEXT NOT NULL DEFAULT 'unreconciled',
      matched_journal_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (matched_journal_id) REFERENCES journal_entries(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bank_tx_business ON bank_transactions(business_id, status);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_business ON notifications(business_id, user_id, is_read);
  `);

  // Run ALTER TABLE statements for existing databases to ensure columns exist
  try { db.exec("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN locked_until TEXT DEFAULT NULL;"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN password_reset_token TEXT DEFAULT NULL;"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN password_reset_expires TEXT DEFAULT NULL;"); } catch(e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';"); } catch(e) {}
}

migrate();

// Seed default chart of accounts for a new business
function seedAccounts(businessId) {
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO accounts (business_id, code, name, type) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const a of config.chartOfAccounts) {
      stmt.run(businessId, a.code, a.name, a.type);
    }
  });
  tx();
}

module.exports = { db, migrate, seedAccounts };
