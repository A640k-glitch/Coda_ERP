const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'public', 'dashboard.v3.js');
let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('function escapeHTML(')) {
  content = `function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "\\'": '&#039;' }[m];
  });
}\n\n` + content;
}

const targets = [
  'c.name', 'c.email', 'c.phone', 'c.tin', 'c.address', 'c.source', 'c.notes',
  'p.name', 'p.sku', 'p.category',
  'e.name', 'e.email', 'e.role', 'e.phone',
  't.description', 't.reference', 't.type',
  'a.name', 'a.code', 'currentUser.name',
  'line.account_code', 'line.accountCode', 'line.account_name', 'line.accountName',
  'po.description', 'po.id',
  'kpi.productCount', 'kpi.lowStockCount', 'kpi.customerCount', 'kpi.openLeads', 'kpi.employeeCount',
  'n.title', 'n.message', 'title', 'message', 'viewName', 'moduleName'
];

targets.forEach(t => {
  const regex = new RegExp(`\\$\\{(${t.replace(/\./g, '\\.')}(?:\\?\\.[a-zA-Z0-9_]+)?(?:\\s*\\|\\|\\s*[^}]+)?)\\}`, 'g');
  content = content.replace(regex, '${escapeHTML($1)}');
});

fs.writeFileSync(targetFile, content);
console.log('Fixed dashboard.v3.js XSS');
