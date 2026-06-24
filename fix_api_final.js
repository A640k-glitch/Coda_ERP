const fs = require('fs');

// Read the freshly updated index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
let apiHtml = fs.readFileSync('public/api.html', 'utf8');

// 1. Extract the full auth injection block from index.html
// It starts at <div id="authPopoutOverlay" and goes to the closing </script> before </body>
const authBlockMatch = indexHtml.match(/(<div id="authPopoutOverlay"[\s\S]*?<\/script>)\s*\n<\/body>/);
if (!authBlockMatch) {
  console.log('ERROR: Could not find auth block in index.html');
  process.exit(1);
}
const authBlock = authBlockMatch[1];

// 2. Remove any existing auth popout from api.html
apiHtml = apiHtml.replace(/<div id="authPopoutOverlay"[\s\S]*?<\/script>\s*\n?(<\/body>)/, '$1');

// 3. Inject fresh auth block into api.html
apiHtml = apiHtml.replace('</body>', authBlock + '\n</body>');

// 4. Update the nav auth buttons - replace the old nav with Sign in trigger
const oldApiNav = /<div class="nav-auth" id="apiNavAuth">[\s\S]*?<\/div>/;
const newApiNav = `<div class="nav-auth" id="apiNavAuth">
            <a href="#" class="btn btn-primary btn-sm trigger-auth-signin" id="btnExpandAuth">Sign in</a>
          </div>`;
apiHtml = apiHtml.replace(oldApiNav, newApiNav);

fs.writeFileSync('public/api.html', apiHtml);
console.log('API page updated with auth popup!');
