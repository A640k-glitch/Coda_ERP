# Coda — ERP for Nigerian Small Businesses

I built Coda to help small and medium businesses in Nigeria manage their day-to-day operations in one place. It handles accounting, inventory, customers, employees, taxes, and subscriptions — all tailored to how Nigerian businesses actually work.

## What Coda Does

- **Accounting** — I implemented double-entry bookkeeping with journal entries, so your books stay accurate.
- **Inventory** — You can track products, stock levels, and sales.
- **CRM** — Manage your customers and leads.
- **HR** — Handle employee records, attendance, and payroll.
- **Tax** — Calculate Nigerian taxes like VAT, WHT, PAYE, and CIT automatically.
- **Payments** — Accept payments through Paystack, Flutterwave, Monnify, or Remita.
- **Subscriptions** — Three pricing tiers: Starter (₦5,000), Professional (₦15,000), and Enterprise (₦45,000).
- **Admin Panel** — A separate admin dashboard for managing all businesses on the platform.

## How It's Built

I built this as a full-stack JavaScript app with three layers:

| Layer | What it is | What I used |
|-------|-----------|-------------|
| Frontend | What you see in the browser | Plain HTML, CSS, JavaScript |
| Backend | The server that handles requests | Node.js + Express |
| Database | Where everything is stored | SQLite (via better-sqlite3) |

There's no React, Vue, or any fancy frontend framework — just clean HTML, CSS, and vanilla JavaScript. I wanted to keep it simple.

## Project Structure

```
├── app.js                  # Main server file — starts everything
├── public/                 # Frontend files (HTML, CSS, JS)
│   ├── index.html          # Landing page
│   ├── login.html          # Login page
│   ├── signup.html         # Signup page
│   ├── dashboard.html      # Main app dashboard
│   ├── dashboard.js        # Dashboard logic
│   ├── admin.html          # Admin panel
│   ├── app.js              # Landing page logic
│   ├── styles.css          # All styling
│   └── favicon.svg         # App icon
├── src/
│   ├── auth.js             # Login, passwords, security
│   ├── config.js           # Settings, prices, tax rates
│   ├── db.js               # Database setup and tables
│   ├── utils.js            # Helper functions
│   ├── routes/             # API endpoints (handle requests)
│   │   ├── auth.js         # Login/signup routes
│   │   ├── business.js     # Business management routes
│   │   ├── accounting.js   # Accounting routes
│   │   ├── inventory.js    # Inventory routes
│   │   ├── crm.js          # Customer management routes
│   │   ├── hr.js           # HR routes
│   │   ├── tax.js          # Tax calculation routes
│   │   ├── subscription.js # Subscription/billing routes
│   │   └── admin.js        # Admin panel routes
│   └── modules/            # Business logic (the real work)
│       ├── accounting.js   # Accounting calculations
│       ├── inventory.js    # Inventory logic
│       ├── crm.js          # CRM logic
│       ├── hr.js           # HR and payroll logic
│       ├── tax.js          # Tax calculations
│       ├── subscription.js # Subscription management
│       └── reporting.js    # Reports and analytics
├── data/
│   └── coda.db             # The SQLite database file
├── package.json
└── .env                    # Environment variables (admin email, etc.)
```

## How to Run It

1. Make sure you have Node.js installed (version 14 or higher).
2. Clone this repo:
   ```bash
   git clone https://github.com/A640k-glitch/Coda-ERP.git
   cd Coda-ERP
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   node app.js
   ```
5. Open your browser and go to `http://localhost:3100`.

That's it. The app starts on port 3100 by default. You can change the port by setting the `PORT` environment variable.

## API Endpoints

All API endpoints live under `/api/v1`. Here are the main ones:

| Endpoint | What it does |
|----------|-------------|
| `POST /api/v1/auth/signup` | Create a new account |
| `POST /api/v1/auth/login` | Log in to your account |
| `POST /api/v1/business/onboard` | Set up your business |
| `GET /api/v1/accounting/...` | Accounting operations |
| `GET /api/v1/inventory/...` | Inventory operations |
| `GET /api/v1/crm/...` | Customer management |
| `GET /api/v1/hr/...` | HR and payroll |
| `GET /api/v1/tax/...` | Tax calculations |
| `GET /api/v1/subscription/...` | Subscription management |

## Tech I Used

- **Express** — web framework for handling HTTP requests
- **better-sqlite3** — SQLite database driver
- **bcryptjs** — hashing passwords so they're stored securely
- **express-session** — keeping users logged in
- **express-rate-limit** — preventing brute-force attacks on login
- **pdfkit** — generating PDF reports
- **dotenv** — loading environment variables from `.env`

## License

This is a personal project. All rights reserved.
