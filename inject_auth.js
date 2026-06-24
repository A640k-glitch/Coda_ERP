const fs = require('fs');
let index = fs.readFileSync('public/index.html', 'utf8');
const signup = fs.readFileSync('public/signup.html', 'utf8');

// 1. Extract Auth Container
const containerMatch = signup.match(/<div class="auth-container">([\s\S]*?)<script id="modal-fix-script">/);
let authContainer = containerMatch ? containerMatch[1] : '';

const styleMatch = signup.match(/<style>([\s\S]*?)<\/style>/);
let signupStyles = styleMatch ? styleMatch[1] : '';
signupStyles = signupStyles.replace(/body\s*\{[\s\S]*?\}/, '');

authContainer = authContainer.replace(/<div class="modal-overlay" id="termsModal"[\s\S]*/, '');
authContainer = authContainer.replace(/<a href="\/" class="auth-back">[\s\S]*?<\/a>/, '');
authContainer = authContainer.replace(/<div class="mobile-logo">[\s\S]*?<\/div>/, '');

const inlineContainer = `
<div id="authPopoutOverlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: none; opacity: 0; transition: opacity 0.4s ease; z-index: 9999;"></div>
<div id="authPopoutContainer" style="position: fixed; z-index: 10000; background: var(--bg-card); overflow: hidden; display: none; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); will-change: top, left, width, height, border-radius; transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">
  <button id="authPopoutClose" style="position: absolute; top: 16px; right: 16px; background: rgba(255, 255, 255, 0.1); border: none; color: #0d9488; cursor: pointer; width: 40px; height: 40px; border-radius: 20px; display: flex; align-items: center; justify-content: center; z-index: 10001; opacity: 0; transition: opacity 0.3s ease; backdrop-filter: blur(4px);">
    <span class="material-symbols-outlined" style="font-size: 24px; font-weight: 800;">close</span>
  </button>
  <div id="authPopoutLoading" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 10000; transition: opacity 0.4s ease; background: var(--bg-card);">
    <span class="material-symbols-outlined" style="font-size: 32px; color: #0d9488; animation: spin 1s linear infinite;">sync</span>
  </div>
  <div id="inlineAuthContent" style="width:100%; height:100%; overflow-y:auto; opacity: 0; transition: opacity 0.4s ease; background: var(--bg-card); border-radius: 24px;"><div class="auth-container" style="min-height: 100%; height: 100%;">${authContainer}</div></div>
</div>

<script>
  document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('authPopoutOverlay');
    const container = document.getElementById('authPopoutContainer');
    const closeBtn = document.getElementById('authPopoutClose');
    const loadingState = document.getElementById('authPopoutLoading');
    const inlineContent = document.getElementById('inlineAuthContent');
    
    document.querySelectorAll('.trigger-auth, #btnExpandAuth').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        const rect = btn.getBoundingClientRect();
        
        overlay.style.display = 'block';
        setTimeout(() => overlay.style.opacity = '1', 10);
        
        container.style.display = 'block';
        container.style.top = rect.top + 'px';
        container.style.left = rect.left + 'px';
        container.style.transform = 'none';
        container.style.width = rect.width + 'px';
        container.style.height = rect.height + 'px';
        container.style.borderRadius = '9999px';
        container.style.opacity = '1';
        
        if(loadingState) loadingState.style.opacity = '1';
        if(inlineContent) inlineContent.style.opacity = '0';
        closeBtn.style.opacity = '0';
        
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
          const targetWidth = Math.min(window.innerWidth - 48, 1100);
          const targetHeight = Math.min(window.innerHeight - 48, 800);
          
          container.style.top = '50%';
          container.style.left = '50%';
          container.style.transform = 'translate(-50%, -50%)';
          container.style.width = targetWidth + 'px';
          container.style.height = targetHeight + 'px';
          container.style.borderRadius = '24px';
          
          setTimeout(() => {
            if(inlineContent) inlineContent.style.opacity = '1';
            closeBtn.style.opacity = '1';
            if(loadingState) setTimeout(() => loadingState.style.opacity = '0', 100);
          }, 500);
        }, 50);
        
        // Expose original button for close logic
        container.dataset.originTop = rect.top;
        container.dataset.originLeft = rect.left;
        container.dataset.originWidth = rect.width;
        container.dataset.originHeight = rect.height;
      });
    });

    closeBtn.addEventListener('click', () => {
      document.body.style.overflow = '';
      
      if(inlineContent) inlineContent.style.opacity = '0';
      closeBtn.style.opacity = '0';
      if(loadingState) loadingState.style.opacity = '1';
      
      container.style.top = container.dataset.originTop + 'px';
      container.style.left = container.dataset.originLeft + 'px';
      container.style.transform = 'none';
      container.style.width = container.dataset.originWidth + 'px';
      container.style.height = container.dataset.originHeight + 'px';
      container.style.borderRadius = '9999px';
      
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        container.style.display = 'none';
        overlay.style.display = 'none';
      }, 700);
    });
  });
</script>
`;

index = index.replace('</body>', inlineContainer + '\n</body>');
index = index.replace('</style>', signupStyles + '\n</style>');

// Fix pricing links
index = index.replace(/href="signup\.html\?tier=starter"/g, 'href="#" class="trigger-auth" data-tier="starter"');
index = index.replace(/href="signup\.html\?tier=professional"/g, 'href="#" class="trigger-auth" data-tier="professional"');
index = index.replace(/href="signup\.html\?tier=enterprise"/g, 'href="#" class="trigger-auth" data-tier="enterprise"');

// Fix inline logic for dashboard redirect
index = index.replace(/window\.location\.href = '\/dashboard'/g, 'window.top.location.href = \'/dashboard\'');

// Inject GodRays
const godRaysHTML = '<div class="css-godrays"><div class="css-godray ray-1"></div><div class="css-godray ray-2"></div><div class="css-godray ray-3"></div><div class="css-godray ray-4"></div><div class="css-godrays-bloom"></div></div>';
index = index.replace('<div class="hero-bg"></div>', godRaysHTML + '\n    <div class="hero-bg"></div>');

// Remove redundant old auth buttons in nav
index = index.replace(/<a href="login.html" class="nav-link">Sign In<\/a>[\s\S]*?<a href="signup.html" class="btn btn-primary">Get started<\/a>/, '');

fs.writeFileSync('public/index.html', index);
console.log('done');
