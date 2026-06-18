const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace the modal-close-btn selector to also include the buttons inside Terms and Privacy modals
  const oldSelector = "var buttons = m.querySelectorAll('.modal-close-btn');";
  const newSelector = "var buttons = m.querySelectorAll('.modal-close-btn, .legal-modal-close, button.btn-primary');";
  
  if (content.includes(oldSelector)) {
    content = content.replace(oldSelector, newSelector);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Close buttons fixed for all modals.');
