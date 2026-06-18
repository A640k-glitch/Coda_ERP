const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace href="#" with href="javascript:void(0)" where onclick is used to open modals
  content = content.replace(/href="#"\s+onclick="(event\.preventDefault\(\);\s*)?document\.body\.classList/g, 'href="javascript:void(0)" onclick="document.body.classList');
  
  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Fixed hrefs in HTML files to prevent scrolling to top.');
