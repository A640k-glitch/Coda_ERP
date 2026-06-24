const fs = require('fs');
const path = require('path');

function updateHtmlFile(filePath) {
  const fullPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;
  let html = fs.readFileSync(fullPath, 'utf-8');

  // Regex replacer for elements that need classes
  const addClass = (htmlStr, searchRegex, classesToAdd) => {
    return htmlStr.replace(searchRegex, (match, p1) => {
      // If the matched string already contains the class, skip it
      let newClasses = p1;
      const toAdd = classesToAdd.split(' ').filter(c => !newClasses.includes(c));
      if (toAdd.length > 0) {
        newClasses = p1 + ' ' + toAdd.join(' ');
      }
      return match.replace(p1, newClasses);
    });
  };

  // Add responsive utility
  html = addClass(html, /class="([^"]*premium-kpi-card[^"]*)"/g, 'glass-panel hover-lift');
  html = addClass(html, /class="([^"]*feature-card-soft[^"]*)"/g, 'glass-panel hover-lift');
  html = addClass(html, /class="([^"]*ledger-card[^"]*)"/g, 'glass-panel hover-lift');
  html = addClass(html, /class="([^"]*pricing-card-glass[^"]*)"/g, 'glass-panel hover-lift');

  html = addClass(html, /class="([^"]*btn-pricing-primary[^"]*)"/g, 'btn-interactive');
  html = addClass(html, /class="([^"]*btn-pricing-secondary[^"]*)"/g, 'btn-interactive');
  html = addClass(html, /class="([^"]*btn-pricing-white[^"]*)"/g, 'btn-interactive');
  html = addClass(html, /class="([^"]*btn-primary[^"]*)"/g, 'btn-interactive');
  
  // App shell responsiveness
  html = addClass(html, /class="([^"]*app-shell[^"]*)"/g, 'flex-responsive');

  // Add toast container if not exists
  if (!html.includes('toast-container')) {
    html = html.replace('</body>', 
      `<div id="toast-container" style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;"></div>\n</body>`
    );
  }

  // Update hero gradient
  html = html.replace(
    /(<div[^>]*class="[^"]*macbook-wrapper[^"]*"[^>]*>)/, 
    '<div style="background: linear-gradient(135deg, var(--bg-primary) 0%, var(--surface-hover) 100%); width: 100%; display: flex; justify-content: center;">\n$1'
  );

  fs.writeFileSync(fullPath, html);
  console.log('Updated UI classes (regex mode) in:', filePath);
}

const files = [
  'public/index.html',
  'public/dashboard.html',
  'public/admin.html'
];

files.forEach(f => updateHtmlFile(f));
