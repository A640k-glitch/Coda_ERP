const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'api.html');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Sign in button
content = content.replace(
  '<a href="login.html" class="btn btn-ghost btn-sm">Sign in</a>',
  '<a href="login.html" class="btn btn-sm" style="background-color: var(--teal-600, #0d9488); color: white; border: none; font-weight: 600;">Sign in</a>'
);

// 2. Duplicate classes in modals
content = content.replace(
  '<button class="legal-modal-close" class="legal-trigger-terms"><span class="material-symbols-outlined">close</span></button>',
  '<button class="legal-modal-close"><span class="material-symbols-outlined">close</span></button>'
);
content = content.replace(
  '<button class="legal-modal-close" class="legal-trigger-privacy"><span class="material-symbols-outlined">close</span></button>',
  '<button class="legal-modal-close"><span class="material-symbols-outlined">close</span></button>'
);

// Also remove them from Acknowledge buttons if present
content = content.replace(
  '<button class="btn btn-primary" style="width:100%; margin-top:16px;" class="legal-trigger-terms">Acknowledge</button>',
  '<button class="btn btn-primary" style="width:100%; margin-top:16px;">Acknowledge</button>'
);
content = content.replace(
  '<button class="btn btn-primary" style="width:100%; margin-top:16px;" class="legal-trigger-privacy">Acknowledge</button>',
  '<button class="btn btn-primary" style="width:100%; margin-top:16px;">Acknowledge</button>'
);

// 3. Update the login fetch script to match app.js logic
const newScript = `
            let adminBtn = '';
            if (data.isAdmin) {
              adminBtn = '<a href="/admin" class="btn btn-ghost btn-sm" style="display:flex; align-items:center; gap:8px;"><span class="material-symbols-outlined" style="font-size: 20px; color: var(--success, #10b981);">account_circle</span> Admin Panel</a>';
            }
            navAuth.innerHTML = adminBtn + \`
              <a href="/dashboard" class="btn btn-primary btn-sm" style="color:white!important; display:flex; align-items:center; gap:8px;">
                <div style="width:22px; height:22px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">\${initials}</div>
                Dashboard
              </a>
            \`;
`;
// Replace the block from `const profileTag = data.isAdmin ? 'a' : 'div';` to the end of innerHTML
const oldScriptPattern = /const profileTag = data\.isAdmin \? 'a' : 'div';[\s\S]*?<\/a>\s*`;/;
if (content.match(oldScriptPattern)) {
  content = content.replace(oldScriptPattern, newScript.trim());
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed api.html');
