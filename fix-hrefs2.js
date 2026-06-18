const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace href="javascript:void(0)" with href="#!"
  content = content.replace(/href="javascript:void\(0\)"/g, 'href="#!"');
  
  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Fixed hrefs to use #! instead of javascript:void(0)');
