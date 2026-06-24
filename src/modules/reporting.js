// Reporting module — dashboard aggregates, PDF/CSV export
const { db } = require('../db');
const accounting = require('./accounting');
const inventory = require('./inventory');
const hr = require('./hr');
const { toCSV } = require('../utils');
const { getBusinessTier, tierAllows } = require('../entitlements');

function financialSummary(businessId) {
  const { from, to } = currentMonth();
  const pl = accounting.incomeStatement(businessId, { from, to });
  const expenses = (pl.operatingExpenses || 0) + (pl.costOfGoodsSold || 0);
  return {
    period: { from, to },
    revenue: pl.revenue,
    expenses,
    profit: pl.netProfit,
    currency: 'NGN',
  };
}

function currentMonth() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { from, to };
}

function revenueLast6Months(businessId) {
  const labels = [];
  const values = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = d.toISOString();
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const pl = accounting.incomeStatement(businessId, { from, to });
    labels.push(d.toLocaleDateString('en-NG', { month: 'short' }));
    values.push(+(pl.revenue || 0).toFixed(2));
  }
  return { labels, values };
}

function dashboard(businessId) {
  const fin = financialSummary(businessId);
  const tier = getBusinessTier(businessId);
  const hasInventory = tierAllows(tier, 'inventory');
  const hasCrm = tierAllows(tier, 'crm');
  const hasHr = tierAllows(tier, 'hr');
  const lowStock = hasInventory ? inventory.lowStockAlerts(businessId) : [];
  const recentSales = hasInventory ? inventory.listSales(businessId, { limit: 5 }) : [];
  const customerCount = hasCrm ? db.prepare('SELECT COUNT(*) AS c FROM customers WHERE business_id = ?').get(businessId).c : 0;
  const employeeCount = hasHr ? db.prepare("SELECT COUNT(*) AS c FROM employees WHERE business_id = ? AND status = 'active'").get(businessId).c : 0;
  const productCount = hasInventory ? db.prepare('SELECT COUNT(*) AS c FROM products WHERE business_id = ?').get(businessId).c : 0;
  const openLeads = hasCrm ? db.prepare("SELECT COUNT(*) AS c FROM leads WHERE business_id = ? AND status NOT IN ('won','lost')").get(businessId).c : 0;
  return {
    kpi: {
      revenue: fin.revenue,
      expenses: fin.expenses,
      profit: fin.profit,
      customerCount,
      employeeCount,
      productCount,
      openLeads,
      lowStockCount: lowStock.length,
    },
    tier,
    entitlements: {
      inventory: hasInventory,
      crm: hasCrm,
      hr: hasHr,
    },
    revenue6m: revenueLast6Months(businessId),
    lowStock: lowStock.slice(0, 5),
    recentSales,
    currency: 'NGN',
  };
}

// Export to CSV
function exportFinancialCSV(businessId, { from, to } = {}) {
  const pl = accounting.incomeStatement(businessId, { from, to });
  const rows = [];
  rows.push({ label: 'Revenue', amount: pl.revenue });
  rows.push({ label: 'Cost of Goods Sold', amount: pl.costOfGoodsSold });
  rows.push({ label: 'Gross Profit', amount: pl.grossProfit });
  rows.push({ label: 'Operating Expenses', amount: pl.operatingExpenses });
  rows.push({ label: 'Net Profit', amount: pl.netProfit });
  return toCSV(rows, [
    { label: 'Line Item', value: r => r.label },
    { label: 'Amount (NGN)', value: r => r.amount.toFixed(2) },
  ]);
}

function exportBalanceSheetCSV(businessId, asOf = null) {
  const bs = accounting.balanceSheet(businessId, asOf);
  const rows = [];
  rows.push({ section: 'ASSETS', item: '— Current —', amount: '' });
  for (const a of bs.assets.current) rows.push({ section: 'Assets', item: `${a.code} ${a.name}`, amount: a.balance.toFixed(2) });
  rows.push({ section: 'ASSETS', item: '— Non-current —', amount: '' });
  for (const a of bs.assets.nonCurrent) rows.push({ section: 'Assets', item: `${a.code} ${a.name}`, amount: a.balance.toFixed(2) });
  rows.push({ section: 'ASSETS', item: 'TOTAL ASSETS', amount: bs.assets.total.toFixed(2) });
  rows.push({ section: 'LIABILITIES', item: '— Current —', amount: '' });
  for (const l of bs.liabilities.current) rows.push({ section: 'Liabilities', item: `${l.code} ${l.name}`, amount: l.balance.toFixed(2) });
  rows.push({ section: 'LIABILITIES', item: '— Non-current —', amount: '' });
  for (const l of bs.liabilities.nonCurrent) rows.push({ section: 'Liabilities', item: `${l.code} ${l.name}`, amount: l.balance.toFixed(2) });
  rows.push({ section: 'LIABILITIES', item: 'TOTAL LIABILITIES', amount: bs.liabilities.total.toFixed(2) });
  rows.push({ section: 'EQUITY', item: '— Items —', amount: '' });
  for (const e of bs.equity.items) rows.push({ section: 'Equity', item: `${e.code} ${e.name}`, amount: e.balance.toFixed(2) });
  rows.push({ section: 'EQUITY', item: 'TOTAL EQUITY', amount: bs.equity.total.toFixed(2) });
  return toCSV(rows, [
    { label: 'Section', value: r => r.section },
    { label: 'Item', value: r => r.item },
    { label: 'Amount (NGN)', value: r => r.amount },
  ]);
}

module.exports = {
  financialSummary,
  revenueLast6Months,
  dashboard,
  exportFinancialCSV,
  exportBalanceSheetCSV,
  currentMonth,
};
