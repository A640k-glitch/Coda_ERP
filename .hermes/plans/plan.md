# Coda — Implementation Plan

**Project:** Coda ERP for Nigerian SMEs
**Location:** `C:\Users\AK\Documents\fifthapp`
**Goal:** Turn the in-memory stub app into a working, persistent, multi-tenant SaaS with a real dashboard.

---

## Current state (what I found)

- Single `app.js` (1363 lines) + static `public/`
- Express 5, no DB — everything is `new Map()` in memory, lost on restart
- All "reports" return hardcoded ₦3.5M / ₦1.5M / ₦2M numbers
- `processSale` doesn't post a journal entry — accounting and inventory are disconnected
- `getRecentTransactions` returns `[]` always
- `getContentType()` referenced but never defined → report export crashes
- 6 POST endpoints, **0 GET endpoints** for reading data
- No auth, no multi-tenant scoping
- Pricing button for "Contact Sales" still opens the same trial modal
- Frontend already has a marketing site, hero mockup, demo tax calc, signup modal — all wired to live endpoints

## Decisions

| Concern | Choice | Why |
|---|---|---|
| DB | **SQLite (better-sqlite3)** | Zero setup, single file, synchronous API works perfectly with Express. Easy to swap to Postgres later. |
| Auth | **bcryptjs + cookie sessions** | No extra infra, works on Windows. API key for programmatic access. |
| File export | **pdfkit + native CSV** | pdfkit is pure JS, no native deps to break on Windows. |
| Frontend | **Extend existing static + add `/dashboard` SPA** | The marketing site is good. Add a real dashboard page; keep the same design system. |
| Refactor | **Split into `src/` modules** | Single-file app.js is unmaintainable at 1363 lines. |

## Architecture

```
fifthapp/
├── app.js                  # Entry: Express setup, mount routes, listen
├── src/
│   ├── db.js               # better-sqlite3 init + schema + migrations
│   ├── config.js           # Subscription tiers, tax rates, compliance
│   ├── auth.js             # Session + API key middleware
│   ├── utils.js            # generateId, formatNGN, etc.
│   ├── modules/
│   │   ├── accounting.js   # Journal entries, ledger, reports (real)
│   │   ├── inventory.js    # Products, sales, stock, COGS
│   │   ├── crm.js          # Customers, leads
│   │   ├── hr.js           # Employees, attendance, payroll
│   │   ├── tax.js          # VAT/WHT/CIT/PAYE (existing logic, persisted)
│   │   ├── subscription.js # Tier mgmt, billing history
│   │   └── reporting.js    # Dashboards, real PDF/CSV export
│   └── routes/
│       ├── auth.js         # POST /signup, POST /login, POST /logout
│       ├── business.js     # /onboard, /me
│       ├── accounting.js   # GET/POST transactions, GET reports
│       ├── inventory.js    # CRUD products, POST sales, GET stock
│       ├── crm.js          # CRUD customers, leads
│       ├── hr.js           # CRUD employees, attendance, payroll
│       ├── tax.js          # /calculate, /report
│       ├── subscription.js # GET/POST sub actions
│       └── dashboard.js    # GET /api/v1/dashboard (aggregated)
├── public/
│   ├── index.html          # existing marketing site (untouched)
│   ├── api.html            # existing API docs
│   ├── styles.css          # existing
│   ├── app.js              # existing marketing JS
│   ├── login.html          # NEW
│   ├── signup.html         # NEW
│   ├── dashboard.html      # NEW — real ERP UI
│   └── dashboard.js        # NEW
├── data/
│   └── coda.db             # SQLite file (gitignored)
├── .env.example
├── .gitignore
└── README.md
```

## Schema (SQLite)

```sql
-- Users & auth
users (id, email UNIQUE, password_hash, business_id, api_key UNIQUE, role, created_at)
sessions (id, user_id, expires_at, created_at)

-- Multi-tenant
businesses (id, name, cac_number, tin, business_type, address, phone, tier,
            subscription_status, created_at)

-- Accounting
accounts (id, business_id, code, name, type, parent_id)   -- chart of accounts
journal_entries (id, business_id, date, description, reference, created_by, created_at)
journal_lines (id, entry_id, account_id, debit, credit)   -- double-entry

-- Inventory
products (id, business_id, sku UNIQUE, name, cost_price, sell_price, stock_level,
          reorder_point, category, created_at)
sales (id, business_id, product_id, qty, unit_price, total, customer_id, created_at)

-- CRM
customers (id, business_id, name, email, phone, tin, address, created_at)
leads (id, business_id, name, email, phone, source, status, notes, created_at)

-- HR
employees (id, business_id, name, email, phone, role, salary, hire_date, status, created_at)
attendance (id, business_id, employee_id, date, check_in, check_out)

-- Subscriptions & billing
subscriptions (id, business_id, tier, status, start_date, next_billing_date, created_at)
payments (id, business_id, subscription_id, amount, currency, method, status, reference, created_at)

-- Tax
tax_filings (id, business_id, type, period, amount_due, status, filed_at)
```

All business-scoped tables have `business_id` and a composite index. This is the multi-tenant boundary.

## Key fixes (from the audit)

1. **Real ledger** — double-entry with `journal_entries` + `journal_lines`. Every product sale auto-posts Dr Cash / Cr Sales + Dr COGS / Cr Inventory.
2. **Real reports** — Balance Sheet sums account balances by type. P&L sums revenue/expense accounts for a period. Cash Flow tracks journal lines tagged by category.
3. **`getContentType` defined** + `pdfkit` for real PDFs, native CSV for spreadsheets.
4. **Full CRUD** — GET endpoints for every resource, paginated.
5. **Auth** — signup creates user + business + trial subscription; login sets httpOnly cookie; protected routes check session OR `X-API-Key` header.
6. **Multi-tenant** — every query is scoped by `business_id` from the session. Cross-tenant access returns 404.
7. **Dashboard page** — real KPIs from the DB, with charts via Chart.js, CRUD modals for products/customers/employees/transactions.
8. **Enterprise pricing** — "Contact Sales" button opens an email/WhatsApp CTA instead of the trial modal.

## Build order

1. Install deps (better-sqlite3, bcryptjs, cookie-parser, pdfkit, express-session)
2. Create `src/` skeleton + DB module + schema
3. Refactor modules to use DB instead of Maps
4. Wire routes
5. Build auth (signup → login → session)
6. Add dashboard page
7. Smoke test: boot server, hit endpoints with curl, walk the dashboard in browser
8. Write README

## Verification (acceptance criteria)

- [ ] `node app.js` boots without errors on port 3100
- [ ] `POST /api/v1/auth/signup` creates a business + user + trial subscription
- [ ] `POST /api/v1/auth/login` returns a session cookie
- [ ] `POST /api/v1/inventory/products` creates a product, persists across server restart
- [ ] `POST /api/v1/accounting/transactions` posts a balanced journal entry
- [ ] `GET /api/v1/reports/:businessId/financial` returns numbers derived from real journal entries
- [ ] `GET /api/v1/reports/:businessId/financial?format=csv` downloads a real CSV file
- [ ] `GET /dashboard` renders the SPA, shows live KPIs, supports CRUD
- [ ] Tax calc demo on landing page still works
- [ ] Signup modal on landing page creates a real account

## Risks

- **better-sqlite3 native build** on Windows sometimes fails. Mitigation: prebuilt binaries usually available for Node 24, will fall back to `sqlite3` (async) if needed.
- **pdfkit size** adds ~200KB; acceptable for ERP use.
- **Refactor regression** — keeping the original `app.js` behavior in modules tested via curl after each step.
