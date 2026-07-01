const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const stylesPath = path.join(publicDir, 'styles.css');

// 1. Fix styles.css td borders
let css = fs.readFileSync(stylesPath, 'utf8');

// Replace td borders back to light grey
css = css.replace(/\.transactions-table td\s*\{\s*([\s\S]*?)border-bottom:\s*1\.5px\s*solid\s*var\(--slate-800\);/g, 
                  '.transactions-table td {\n$1border-bottom: 1px solid var(--border-color);');
                  
css = css.replace(/\.data-table td\s*\{\s*([\s\S]*?)border-bottom:\s*1\.5px\s*solid\s*var\(--slate-800\);/g, 
                  '.data-table td {\n$1border-bottom: 1px solid var(--border-color);');
                  
css = css.replace(/\.api-table td\s*\{\s*([\s\S]*?)border-bottom:\s*1\.5px\s*solid\s*var\(--slate-800\);/g, 
                  '.api-table td {\n$1border-bottom: 1px solid var(--border-light);');

fs.writeFileSync(stylesPath, css, 'utf8');
console.log('Fixed td borders in styles.css');

// 2. Bump cache versions in HTML files
function bumpVersion(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      bumpVersion(fullPath);
    } else if (fullPath.endsWith('.html')) {
      let html = fs.readFileSync(fullPath, 'utf8');
      // Look for styles.css?v=X.X.X or just styles.css"
      let newHtml = html.replace(/styles\.css(\?v=[\d\.]+)?/g, 'styles.css?v=1.0.5');
      if (html !== newHtml) {
        fs.writeFileSync(fullPath, newHtml, 'utf8');
        console.log(`Bumped css version in ${file}`);
      }
    }
  }
}

bumpVersion(publicDir);
console.log('Done!');
