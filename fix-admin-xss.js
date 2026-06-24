const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'public', 'admin.html');
let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('function escapeHTML(')) {
  const insertIndex = content.indexOf('<script>') + '<script>'.length;
  content = content.slice(0, insertIndex) + `\n      function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, function(m) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "\\'": '&#039;' }[m];
        });
      }\n` + content.slice(insertIndex);
}

const targets = [
  'u.name', 'u.email', 'u.business_name',
  'b.name', 'b.cac_number', 'b.email', 'b.phone', 'b.address',
  'e.action', 'e.details', 'e.user_email', 'e.business_name', 'e.user_name',
  'n.title', 'n.message', 'title', 'message', 'currentUser.name'
];

targets.forEach(t => {
  const regex = new RegExp(`\\$\\{(${t.replace(/\./g, '\\.')}(?:\\?\\.[a-zA-Z0-9_]+)?(?:\\s*\\|\\|\\s*[^}]+)?)\\}`, 'g');
  content = content.replace(regex, '${escapeHTML($1)}');
});

content = content.replace(/' \+ title \+ '/g, "' + escapeHTML(title) + '");
content = content.replace(/' \+ message \+ '/g, "' + escapeHTML(message) + '");
content = content.replace(/\(currentUser\.name/g, "escapeHTML(currentUser.name)");
content = content.replace(/currentUser\.name \|\| ''/g, "escapeHTML(currentUser.name || '')");

fs.writeFileSync(targetFile, content);
console.log('Fixed admin.html XSS');
