const fs = require("fs");

let appJs = fs.readFileSync("c:/Users/AK/Documents/fifthapp/public/app.js", "utf8");
appJs = appJs.replace(/heroActions\.remove\(\);/g, "// heroActions.remove(); // Disabled to allow testing CTA");
fs.writeFileSync("c:/Users/AK/Documents/fifthapp/public/app.js", appJs, "utf8");

let html = fs.readFileSync("c:/Users/AK/Documents/fifthapp/public/index.html", "utf8");

// Remove the secondary button
html = html.replace(
  '<a href="login.html" class="btn btn-secondary btn-lg">View Live Demo</a>',
  ''
);

// Replace the primary button with a button element that has an ID
html = html.replace(
  '<a href="signup.html" class="btn btn-primary btn-lg btn-interactive">\n              Start your free trial\n            </a>',
  '<button id="btnExpandAuth" class="btn btn-primary btn-lg btn-interactive" style="border:none; cursor:pointer;">Start your free trial</button>'
);

const expandScript = `
<div id="authPopoutOverlay" style="position: fixed; inset: 0; z-index: 9999; display: none; background: rgba(15,23,42,0.8); backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.3s ease;">
</div>
<div id="authPopoutContainer" style="position: fixed; z-index: 10000; background: var(--bg-app, #ffffff); overflow: hidden; display: none; transform-origin: top left; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);">
  <button id="closeAuthPopoutBtn" style="position: absolute; top: 16px; right: 16px; z-index: 50; background: rgba(0,0,0,0.1); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-primary); transition: background 0.2s;">
    <span class="material-symbols-outlined">close</span>
  </button>
  <iframe id="authIframe" src="" style="width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.3s ease; transition-delay: 0.3s;"></iframe>
</div>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnExpandAuth');
    const overlay = document.getElementById('authPopoutOverlay');
    const container = document.getElementById('authPopoutContainer');
    const iframe = document.getElementById('authIframe');
    const closeBtn = document.getElementById('closeAuthPopoutBtn');

    if(!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.body.style.overflow = 'hidden';
      
      const rect = btn.getBoundingClientRect();
      
      // Initial state matching the button
      container.style.display = 'block';
      container.style.top = rect.top + 'px';
      container.style.left = rect.left + 'px';
      container.style.width = rect.width + 'px';
      container.style.height = rect.height + 'px';
      container.style.borderRadius = '9999px';
      
      overlay.style.display = 'block';
      
      // Force reflow
      container.offsetHeight;
      
      // Animate to full size
      overlay.style.opacity = '1';
      
      // Target bounds (centered)
      const targetWidth = Math.min(window.innerWidth - 32, 1200);
      const targetHeight = Math.min(window.innerHeight - 32, 900);
      const targetTop = (window.innerHeight - targetHeight) / 2;
      const targetLeft = (window.innerWidth - targetWidth) / 2;
      
      container.style.top = targetTop + 'px';
      container.style.left = targetLeft + 'px';
      container.style.width = targetWidth + 'px';
      container.style.height = targetHeight + 'px';
      container.style.borderRadius = '24px';
      
      // Load iframe and fade it in
      iframe.src = 'signup.html';
      iframe.style.opacity = '1';
    });

    closeBtn.addEventListener('click', () => {
      document.body.style.overflow = '';
      
      const rect = btn.getBoundingClientRect();
      
      // Fade out iframe
      iframe.style.opacity = '0';
      
      // Animate container back to button
      container.style.top = rect.top + 'px';
      container.style.left = rect.left + 'px';
      container.style.width = rect.width + 'px';
      container.style.height = rect.height + 'px';
      container.style.borderRadius = '9999px';
      
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        container.style.display = 'none';
        overlay.style.display = 'none';
        iframe.src = '';
      }, 500);
    });

    window.addEventListener('message', (e) => {
      if (e.data === 'closeAuthPopout') {
        closeBtn.click();
      }
    });
  });
</script>
`;

if (!html.includes('id="authPopoutOverlay"')) {
  html = html.replace('</body>', expandScript + '\n</body>');
  fs.writeFileSync("c:/Users/AK/Documents/fifthapp/public/index.html", html, "utf8");
}
