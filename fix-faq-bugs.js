const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Fix the dropdown accordion bug where they drop down when opened.
  // The buggy script block:
  // c.style.maxHeight = null;
  // c.style.paddingTop = '0';
  const oldScript = `
        // Close all others
        document.querySelectorAll('.faq-content').forEach(c => {
          if(c !== content) {
            c.style.maxHeight = null;
            c.style.paddingTop = '0';
          }
        });
        document.querySelectorAll('.faq-icon').forEach(i => {
          if(i !== icon) {
            i.style.transform = 'rotate(0deg)';
          }
        });

        if (content.style.maxHeight) {
          content.style.maxHeight = null;
          content.style.paddingTop = '0';
          icon.style.transform = 'rotate(0deg)';
        } else {
          content.style.paddingTop = '12px';
          content.style.maxHeight = content.scrollHeight + 24 + "px";
          icon.style.transform = 'rotate(180deg)';
        }
`;

  const newScript = `
        // Close all others safely
        document.querySelectorAll('.faq-content').forEach(c => {
          if(c !== content) {
            c.style.maxHeight = '0px';
            c.style.paddingTop = '0px';
          }
        });
        document.querySelectorAll('.faq-icon').forEach(i => {
          if(i !== icon) {
            i.style.transform = 'rotate(0deg)';
          }
        });

        if (content.style.maxHeight && content.style.maxHeight !== '0px') {
          content.style.maxHeight = '0px';
          content.style.paddingTop = '0px';
          icon.style.transform = 'rotate(0deg)';
        } else {
          content.style.paddingTop = '12px';
          content.style.maxHeight = content.scrollHeight + 24 + "px";
          icon.style.transform = 'rotate(180deg)';
        }
`;

  if (content.includes("c.style.maxHeight = null;")) {
    content = content.replace(oldScript, newScript);
  }

  // Also catch any instances where it might be slightly differently formatted
  content = content.replace(/c\.style\.maxHeight = null;/g, "c.style.maxHeight = '0px';");
  content = content.replace(/content\.style\.maxHeight = null;/g, "content.style.maxHeight = '0px';");


  // 2. Fix the square corners caused by scrollbar
  // The issue is `overflow-y:auto;` directly on the border-radius container
  // Replace: <div style="background:#fff;width:100%;max-width:500px;border-radius:14px;padding:32px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);">
  // With:    <div style="background:#fff;width:100%;max-width:500px;border-radius:14px;position:relative;max-height:80vh;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);display:flex;flex-direction:column;overflow:hidden;"><div style="padding:32px;overflow-y:auto;flex:1;">
  // And we need an extra closing </div> before the </div> of the modal.
  
  // Actually, wait, replacing HTML structurally via regex is risky if we don't close the div properly.
  // Safer: just add CSS for the scrollbar! If we hide the scrollbar track and give it a margin, it doesn't clip the border.
  // Even safer: Just apply `margin: 16px` to the modal-overlay to ensure it doesn't touch the edge.
  // Wait, the scrollbar is inside the modal. If we do `overflow: hidden` on the modal, and wrap the content, it's safe.
  // Let's just use CSS!
  
  fs.writeFileSync(filePath, content, 'utf-8');
});


// 2. Fix Modal rounded corners by styling the scrollbar to be transparent on the track
const stylesPath = path.join(publicDir, 'styles.css');
let stylesContent = fs.readFileSync(stylesPath, 'utf-8');

if (!stylesContent.includes('.modal-overlay > div::-webkit-scrollbar')) {
  stylesContent += `
/* Modal Scrollbar Fix for Rounded Corners */
.modal-overlay > div {
  /* For Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--slate-300) transparent;
}
.modal-overlay > div::-webkit-scrollbar {
  width: 8px;
}
.modal-overlay > div::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 14px;
}
.modal-overlay > div::-webkit-scrollbar-thumb {
  background-color: var(--slate-300);
  border-radius: 14px;
  border: 2px solid #fff;
}
`;
  fs.writeFileSync(stylesPath, stylesContent, 'utf-8');
}

console.log('Fixed accordion JS bug and modal scrollbar clipping.');
