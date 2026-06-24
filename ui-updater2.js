const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

function updateHtmlFile(filePath) {
  const fullPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;
  const html = fs.readFileSync(fullPath, 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Add toast container to body if missing
  if (!document.querySelector('#toast-container')) {
    const toastHtml = `
      <div id="toast-container" style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;">
        <!-- Toasts will be injected here -->
      </div>
    `;
    const toastDiv = document.createElement('div');
    toastDiv.innerHTML = toastHtml;
    document.body.appendChild(toastDiv.firstElementChild);
  }

  // Update layout structure for better mobile support (wrapping sidebar/main content)
  const appShell = document.querySelector('.app-shell');
  if (appShell && !appShell.classList.contains('flex-responsive')) {
    appShell.classList.add('flex-responsive');
  }

  fs.writeFileSync(fullPath, dom.serialize());
  console.log('Added toast container & layout classes in:', filePath);
}

const files = [
  'public/dashboard.html',
  'public/admin.html'
];

files.forEach(f => updateHtmlFile(f));
