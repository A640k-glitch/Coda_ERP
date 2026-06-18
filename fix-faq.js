const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Fix modal close buttons so clicking FAQ accordion doesn't close modal
  // Old: var buttons = m.querySelectorAll('button');
  // New: var buttons = m.querySelectorAll('.modal-close-btn');
  content = content.replace(/var buttons = m\.querySelectorAll\('button'\);/g, "var buttons = m.querySelectorAll('.modal-close-btn');");

  // 2. Fix scrolling issue for modals
  // When modal is open, we need to add .no-scroll to body AND directly disable scroll on internal containers
  // Look for `document.body.style.overflow = 'hidden';`
  const openModalFix = `document.body.classList.add('no-scroll');
        var dm = document.querySelector('.dashboard-main'); if(dm) dm.style.overflow = 'hidden';
        var am = document.querySelector('.admin-main'); if(am) am.style.overflow = 'hidden';`;
  
  content = content.replace(/document\.body\.style\.overflow = 'hidden';/g, openModalFix);

  // Look for `document.body.style.overflow = '';`
  const closeModalFix = `document.body.classList.remove('no-scroll');
        var dm = document.querySelector('.dashboard-main'); if(dm) dm.style.overflow = '';
        var am = document.querySelector('.admin-main'); if(am) am.style.overflow = '';`;
  
  content = content.replace(/document\.body\.style\.overflow = '';/g, closeModalFix);

  fs.writeFileSync(filePath, content, 'utf-8');
});

// Also update styles.css to ensure no-scroll works perfectly everywhere
const stylesPath = path.join(publicDir, 'styles.css');
let stylesContent = fs.readFileSync(stylesPath, 'utf-8');

if (!stylesContent.includes('.dashboard-main.no-scroll')) {
  stylesContent += `
/* Universal No-Scroll Fix for Modals */
body.no-scroll .dashboard-main,
body.no-scroll .admin-main {
  overflow: hidden !important;
}
`;
  fs.writeFileSync(stylesPath, stylesContent, 'utf-8');
}

console.log('FAQ bugs fixed.');
