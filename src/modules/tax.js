// Tax module — VAT, WHT, PAYE, CIT, compliance
const config = require('../config');
const { db } = require('../db');

function calculateVAT(amount) {
  return +(Number(amount) * config.taxRates.vat).toFixed(2);
}

function calculateWHT(amount, payerType = 'companies') {
  const rate = config.taxRates.wht[payerType] || config.taxRates.wht.companies;
  return +(Number(amount) * rate).toFixed(2);
}

function calculatePAYE(annualIncome) {
  let tax = 0;
  let remaining = Number(annualIncome);
  for (const b of config.taxRates.payeBrackets) {
    if (remaining <= 0) break;
    const width = b.max === Infinity ? remaining : (b.max - b.min + 1);
    const taxable = Math.min(remaining, width);
    if (taxable > 0) {
      tax += taxable * b.rate;
      remaining -= taxable;
    }
  }
  return +tax.toFixed(2);
}

function getFilingDeadlines() {
  return {
    vat: '21st of next month',
    wht: '21st of next month',
    cit: '6 months after year-end',
    paye: '10th of next month',
  };
}

function getPaymentInstructions() {
  return {
    bank: 'First Bank Nigeria',
    accountNumber: '1234567890',
    accountName: 'Coda Tax Account',
    referenceFormat: 'CODA-TAX-{businessId}-{period}',
  };
}

function generateTaxReport(businessId, period) {
  // MVP: synthesize from journal activity in the period
  const from = period?.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const to = period?.to || new Date().toISOString();

  // VAT payable: 7.5% of revenue lines in period
  const revenueAccounts = db
    .prepare("SELECT id FROM accounts WHERE business_id = ? AND type = 'revenue'")
    .all(businessId)
    .map(a => a.id);
  let revenue = 0;
  if (revenueAccounts.length) {
    const ph = revenueAccounts.map(() => '?').join(',');
    const r = db
      .prepare(
        `SELECT COALESCE(SUM(jl.credit - jl.debit), 0) AS total
         FROM journal_lines jl
         JOIN journal_entries je ON je.id = jl.entry_id
         WHERE jl.account_id IN (${ph}) AND je.business_id = ?
           AND je.date >= ? AND je.date <= ?`
      )
      .get(...revenueAccounts, businessId, from, to);
    revenue = r.total;
  }
  const vatPayable = +(revenue * config.taxRates.vat).toFixed(2);

  // CIT: 30% of net profit
  const expenseAccounts = db
    .prepare("SELECT id FROM accounts WHERE business_id = ? AND type = 'expense'")
    .all(businessId)
    .map(a => a.id);
  let expenses = 0;
  if (expenseAccounts.length) {
    const ph = expenseAccounts.map(() => '?').join(',');
    const r = db
      .prepare(
        `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS total
         FROM journal_lines jl
         JOIN journal_entries je ON je.id = jl.entry_id
         WHERE jl.account_id IN (${ph}) AND je.business_id = ?
           AND je.date >= ? AND je.date <= ?`
      )
      .get(...expenseAccounts, businessId, from, to);
    expenses = r.total;
  }
  const netProfit = revenue - expenses;
  const cit = +Math.max(0, netProfit * config.taxRates.cit).toFixed(2);

  return {
    businessId,
    period: { from, to },
    revenue,
    expenses,
    netProfit,
    vat: { payable: vatPayable, receivable: 0, netVAT: vatPayable },
    wht: { deducted: 0, creditable: 0 },
    cit,
    paye: 0, // populated from payroll if needed
    filingDeadlines: getFilingDeadlines(),
    paymentInstructions: getPaymentInstructions(),
    currency: 'NGN',
  };
}

module.exports = {
  calculateVAT,
  calculateWHT,
  calculatePAYE,
  generateTaxReport,
  getFilingDeadlines,
  getPaymentInstructions,
};
