const fs = require('fs');

let js = fs.readFileSync('public/app.js', 'utf8');

// Remove the section "// 3. Scroll reveal (IntersectionObserver)"
const revealRegex = /\/\/\s*3\.\s*Scroll reveal \(IntersectionObserver\)[\s\S]*?revealObserver\.observe\(el\);\r?\n\s*}\);/m;
js = js.replace(revealRegex, '');

fs.writeFileSync('public/app.js', js);
console.log('app.js reveal fixed!');
