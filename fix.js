const fs = require('fs');
let index = fs.readFileSync('public/index.html', 'utf8');
const signup = fs.readFileSync('public/signup.html', 'utf8');

const godRaysHTML = '<div class="css-godrays"><div class="css-godray ray-1"></div><div class="css-godray ray-2"></div><div class="css-godray ray-3"></div><div class="css-godray ray-4"></div><div class="css-godrays-bloom"></div></div>';
index = index.replace('<div class="hero-bg"></div>', godRaysHTML + '\n    <div class="hero-bg"></div>');

const containerMatch = signup.match(/<div class="auth-container">([\s\S]*?)<script id="modal-fix-script">/);
let authContainer = containerMatch ? containerMatch[1] : '';

const styleMatch = signup.match(/<style>([\s\S]*?)<\/style>/);
let signupStyles = styleMatch ? styleMatch[1] : '';
signupStyles = signupStyles.replace(/body\s*\{[\s\S]*?\}/, '');

authContainer = authContainer.replace(/<div class="modal-overlay" id="termsModal"[\s\S]*/, '');
authContainer = authContainer.replace(/<a href="\/" class="auth-back">[\s\S]*?<\/a>/, '');
authContainer = authContainer.replace(/<div class="mobile-logo">[\s\S]*?<\/div>/, '');

const inlineContainer = '<div id="inlineAuthContent" style="width:100%; height:100%; overflow-y:auto; opacity: 0; transition: opacity 0.4s ease; background: var(--bg-card); border-radius: 24px;"><div class="auth-container" style="min-height: 100%; height: 100%;">' + authContainer + '</div></div>';
index = index.replace(/<iframe id="authIframe"[\s\S]*?<\/iframe>/, inlineContainer);

index = index.replace('</style>', signupStyles + '\n</style>');

index = index.replace(/const targetWidth = Math\.min\(window\.innerWidth - 48, 1100\);\s*const targetHeight = Math\.min\(window\.innerHeight - 48, 800\);\s*const targetTop = \(window\.innerHeight - targetHeight\) \/ 2;\s*const targetLeft = \(window\.innerWidth - targetWidth\) \/ 2;\s*container\.style\.top = targetTop \+ 'px';\s*container\.style\.left = targetLeft \+ 'px';/, 'const targetWidth = Math.min(window.innerWidth - 48, 1100); const targetHeight = Math.min(window.innerHeight - 48, 800); container.style.top = "50%"; container.style.left = "50%"; container.style.transform = "translate(-50%, -50%)"; container.style.width = targetWidth + "px"; container.style.height = targetHeight + "px";');

index = index.replace(/container\.style\.left = rect\.left \+ 'px';/g, 'container.style.left = rect.left + "px"; container.style.transform = "none";');

index = index.replace(/\/\/ Delay iframe load so animation is buttery smooth[\s\S]*?iframe\.addEventListener\('load', \(\) => \{[\s\S]*?\}\);/, 'setTimeout(() => { const inlineContent = document.getElementById("inlineAuthContent"); if(inlineContent) inlineContent.style.opacity = "1"; closeBtn.style.opacity = "1"; if(loadingState) setTimeout(() => loadingState.style.opacity = "0", 100); }, 500); });');

index = index.replace(/\/\/ Fade out iframe & close btn instantly\s*iframe\.style\.opacity = '0';\s*closeBtn\.style\.opacity = '0';\s*loadingState\.style\.opacity = '1';/, 'const inlineContent = document.getElementById("inlineAuthContent"); if(inlineContent) inlineContent.style.opacity = "0"; closeBtn.style.opacity = "0"; if(loadingState) loadingState.style.opacity = "1";');

index = index.replace(/overlay\.style\.display = 'none';\s*iframe\.src = '';/, 'overlay.style.display = "none";');

index = index.replace(/href="signup\.html\?tier=starter"/g, 'href="#" class="trigger-auth" data-tier="starter"');
index = index.replace(/href="signup\.html\?tier=professional"/g, 'href="#" class="trigger-auth" data-tier="professional"');
index = index.replace(/href="signup\.html\?tier=enterprise"/g, 'href="#" class="trigger-auth" data-tier="enterprise"');

index = index.replace(/btn\.addEventListener\('click', \(e\) => \{/g, 'document.querySelectorAll(".trigger-auth, #btnExpandAuth").forEach(btnTrigger => { btnTrigger.addEventListener("click", (e) => { e.preventDefault(); const rect = btnTrigger.getBoundingClientRect();');

index = index.replace(/const rect = btn\.getBoundingClientRect\(\);/g, ''); 

// Ensure dashboard redirect is on the main window since it's already main window now
index = index.replace(/window\.location\.href = '\/dashboard'/g, 'window.top.location.href = \'/dashboard\'');

fs.writeFileSync('public/index.html', index);
console.log('Done');
