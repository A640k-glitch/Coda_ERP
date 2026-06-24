const fs = require('fs');

let indexHtml = fs.readFileSync('public/index.html', 'utf8');
let apiHtml = fs.readFileSync('public/api.html', 'utf8');

// 1. Extract the auth overlay and container from index.html
// It starts at <div id="authPopoutOverlay" and ends right before </body>
const authMatch = indexHtml.match(/<div id="authPopoutOverlay"[\s\S]*?<\/script>\s*<\/body>/);
if (!authMatch) {
  console.log('Could not find auth injection in index.html');
  process.exit(1);
}

// Extract just the injected content, without </body>
const injectedAuth = authMatch[0].replace(/<\/body>/, '');

// 2. Remove existing auth Popout from api.html if it exists to avoid duplication
apiHtml = apiHtml.replace(/<div id="authPopoutOverlay"[\s\S]*?<\/script>\s*(<\/body>)?/, '');

// 3. Inject into api.html
apiHtml = apiHtml.replace('</body>', injectedAuth + '\n</body>');

// 4. Update the nav buttons in api.html
const newNavAuth = `<div class="nav-auth" id="apiNavAuth">
            <a href="#" class="btn btn-primary btn-sm trigger-auth" id="btnExpandAuth">Sign in</a>
          </div>`;

apiHtml = apiHtml.replace(/<div class="nav-auth" id="apiNavAuth">[\s\S]*?<\/div>/, newNavAuth);

fs.writeFileSync('public/api.html', apiHtml);
console.log('Injected auth into api.html');
