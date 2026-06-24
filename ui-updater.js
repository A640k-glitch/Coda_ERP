const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

function updateHtmlFile(filePath) {
  const fullPath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;
  const html = fs.readFileSync(fullPath, 'utf-8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Add responsive utility to all containers
  document.querySelectorAll('.premium-kpi-card, .feature-card-soft, .mockup-col > div, .ledger-card').forEach(el => {
    el.classList.add('glass-panel');
    el.classList.add('hover-lift');
  });

  document.querySelectorAll('button, .btn-pricing-primary, .btn-pricing-secondary, .btn-pricing-white, .btn-primary').forEach(el => {
    el.classList.add('btn-interactive');
  });

  // Inject gradient background to hero if present
  const heroWrapper = document.querySelector('.macbook-wrapper');
  if (heroWrapper && heroWrapper.parentElement) {
    heroWrapper.parentElement.style.background = 'linear-gradient(135deg, var(--bg-primary) 0%, var(--surface-hover) 100%)';
  }

  // Specifically for pricing cards
  document.querySelectorAll('.pricing-card-glass').forEach(card => {
    card.classList.add('glass-panel');
    card.classList.add('hover-lift');
  });

  fs.writeFileSync(fullPath, dom.serialize());
  console.log('Updated UI classes in:', filePath);
}

const files = [
  'public/index.html',
  'public/dashboard.html',
  'public/admin.html'
];

files.forEach(f => updateHtmlFile(f));
