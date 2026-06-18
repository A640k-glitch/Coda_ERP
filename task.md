# Revamp Checklist

- [x] Revamp design system and global rules in `styles.css`
- [x] Revamp Landing Page `index.html` (including interactive pricing toggle and clean SVG brand logos)
- [x] Revamp Authentication views (`login.html` & `signup.html`)
- [x] Revamp API documentation `api.html`
# Revamp Checklist

- [x] Revamp design system and global rules in `styles.css`
- [x] Revamp Landing Page `index.html` (including interactive pricing toggle and clean SVG brand logos)
- [x] Revamp Authentication views (`login.html` & `signup.html`)
- [x] Revamp API documentation `api.html`
- [x] Revamp central user application `dashboard.html` (Accounting, Inventory, CRM, HR/Payroll, Tax, Subscriptions)
- [x] Revamp admin control panel `admin.html`
- [x] Run application and verify all screens manually
- [x] Enrich View Content
  - [x] Populate tables inside all 7 tab views with additional realistic financial data rows
  - [x] Restructure all 8 tabs to use dual-column layouts (`2fr 1fr` grid) containing data tables (left) and rich operational summary widgets (right) to completely fill the widescreen space
- [x] Refine Sidebar & Pie Chart (High Fidelity Alignment)
  - [x] Structure mockup sidebar HTML and CSS to match the `.app-sidebar` design system of the actual dashboard
  - [x] Set active tab background to the brand's green (`var(--teal-600)`)
  - [x] Load Chart.js in `public/index.html`
  - [x] Replace static CSS expense chart with a real Chart.js doughnut chart matching the actual dashboard
- [x] Verification
  - [x] Check console and browser display (manually verify scaling and data presentation)
