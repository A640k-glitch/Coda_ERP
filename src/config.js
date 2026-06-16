// Coda — config, subscription tiers, tax rates, compliance
const config = {
  appName: 'Coda',
  version: '1.0.0',
  company: 'Coda Technologies',
  environment: process.env.NODE_ENV || 'development',
  adminEmail: process.env.CODA_ADMIN_EMAIL || null,

  compliance: {
    dataProtection: 'GDPR, NDPR (Nigeria Data Protection Regulation)',
    accountingStandards: ['IFRS', 'Nigerian GAAP'],
    taxCompliance: ['VAT', 'WHT', 'CIT', 'PAYE', 'Tertiary Education Tax'],
    securityStandards: 'ISO 27001, PCI DSS',
    regulatoryBodies: ['CBN', 'FIRS', 'LIRS', 'CAC', 'NDPC'],
  },

  subscriptionTiers: {
    starter: {
      name: 'Starter',
      price: 5000,
      annualPrice: 54000,
      quarterlyPrice: 13500,
      features: ['Basic Accounting', 'Invoice Management', '5 Users', 'Basic Reports', 'Mobile App Access', 'Email Support'],
    },
    professional: {
      name: 'Professional',
      price: 15000,
      annualPrice: 162000,
      quarterlyPrice: 40500,
      features: ['Full Accounting', 'Inventory Management', 'CRM', '20 Users', 'Advanced Reports', 'Tax Automation', 'Multi-Currency Support', 'Bank Reconciliation', 'WhatsApp Business Integration', 'Priority Email Support'],
    },
    enterprise: {
      name: 'Enterprise',
      price: 45000,
      annualPrice: 486000,
      quarterlyPrice: 121500,
      features: ['All Professional Features', 'Multi-branch Support', 'API Access', 'Custom Modules', 'Priority Support', 'AI Analytics', 'Dedicated Account Manager', 'White-label Solution', 'Advanced Security Features', 'SLA Guarantee', 'Training Sessions'],
    },
  },

  paymentMethods: [
    { id: 'card', name: 'Card Payment', providers: ['Paystack', 'Flutterwave'] },
    { id: 'bank_transfer', name: 'Bank Transfer', providers: ['Monnify', 'Remita'] },
    { id: 'ussd', name: 'USSD', providers: ['*966#', '*737#'] },
    { id: 'mobile_money', name: 'Mobile Money', providers: ['Paga', 'OPay'] },
  ],

  taxRates: {
    vat: 0.075, // 7.5% VAT in Nigeria
    wht: { companies: 0.10, individuals: 0.05 },
    cit: 0.30,
    payeBrackets: [
      { min: 0, max: 300000, rate: 0.07 },
      { min: 300001, max: 600000, rate: 0.11 },
      { min: 600001, max: 1100000, rate: 0.15 },
      { min: 1100001, max: 1600000, rate: 0.19 },
      { min: 1600001, max: 3200000, rate: 0.21 },
      { min: 3200001, max: Infinity, rate: 0.24 },
    ],
  },

  chartOfAccounts: [
    // Assets
    { code: '1000', name: 'Cash', type: 'asset' },
    { code: '1100', name: 'Bank', type: 'asset' },
    { code: '1200', name: 'Accounts Receivable', type: 'asset' },
    { code: '1300', name: 'Inventory', type: 'asset' },
    { code: '1400', name: 'Equipment', type: 'asset' },
    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'liability' },
    { code: '2100', name: 'Tax Payable - VAT', type: 'liability' },
    { code: '2200', name: 'Tax Payable - WHT', type: 'liability' },
    { code: '2300', name: 'Tax Payable - PAYE', type: 'liability' },
    { code: '2400', name: 'Loans Payable', type: 'liability' },
    // Equity
    { code: '3000', name: "Owner's Equity", type: 'equity' },
    { code: '3100', name: 'Retained Earnings', type: 'equity' },
    // Revenue
    { code: '4000', name: 'Sales Revenue', type: 'revenue' },
    { code: '4100', name: 'Service Revenue', type: 'revenue' },
    // Expenses
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
    { code: '6000', name: 'Rent Expense', type: 'expense' },
    { code: '6100', name: 'Salaries Expense', type: 'expense' },
    { code: '6200', name: 'Utilities Expense', type: 'expense' },
    { code: '6300', name: 'Marketing Expense', type: 'expense' },
    { code: '6400', name: 'General Expense', type: 'expense' },
  ],
};

module.exports = config;
