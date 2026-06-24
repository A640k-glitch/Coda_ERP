const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Fix the close animation to use the original button's border-radius
html = html.replace(
  "container.style.borderRadius = '9999px';",
  "container.style.borderRadius = (parseFloat(container.dataset.originHeight) / 2) + 'px';"
);

fs.writeFileSync('public/index.html', html);
console.log('Fixed close animation border-radius');
