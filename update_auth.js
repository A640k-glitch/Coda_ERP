const fs = require("fs");

function updateAuthPage(filePath, isSignup) {
  let html = fs.readFileSync(filePath, "utf8");
  const scriptRegex = /<script>([\s\S]*?)<\/script>\s*<div class="modal-overlay"/;
  const match = html.match(scriptRegex);
  if (!match) return;
  const mainScript = match[1];
  const bodyRegex = /<body>([\s\S]*?)<script>/;

  const newCss = `
    body { margin: 0; min-height: 100vh; background-color: #020617; font-family: 'Inter', sans-serif; overflow: hidden; }
    .popout-container { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 50; animation: popout-fade-in 0.4s ease-out; }
    @keyframes popout-fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .popout-card { position: relative; display: flex; flex-direction: column; height: 100%; width: 100%; max-width: 1280px; overflow: hidden; background-color: #0f766e; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    @media (min-width: 1024px) { .popout-card { flex-direction: row; } }
    .mesh-bg { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 0% 0%, rgba(13, 148, 136, 0.8) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(15, 118, 110, 0.8) 0%, transparent 50%), radial-gradient(circle at 100% 0%, rgba(2, 6, 23, 0.4) 0%, transparent 50%); opacity: 0.8; z-index: 0; }
    .close-btn { position: absolute; right: 32px; top: 32px; z-index: 50; display: flex; height: 40px; width: 40px; align-items: center; justify-content: center; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.1); color: white; backdrop-filter: blur(12px); border: none; cursor: pointer; transition: background-color 0.2s; }
    .close-btn:hover { background-color: rgba(255, 255, 255, 0.2); }
    .left-panel { position: relative; z-index: 10; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 32px; gap: 32px; color: white; overflow-y: auto; }
    @media (min-width: 1024px) { .left-panel { padding: 64px; overflow: hidden; } }
    .right-panel { position: relative; z-index: 10; flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; background-color: rgba(0, 0, 0, 0.1); backdrop-filter: blur(4px); }
    @media (min-width: 1024px) { .right-panel { padding: 64px; background-color: transparent; backdrop-filter: none; } }
    .glass-form-card { width: 100%; max-width: 448px; background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    .left-title { font-size: 36px; font-weight: 700; line-height: 1.1; margin-bottom: 16px; letter-spacing: -0.02em; }
    @media (min-width: 640px) { .left-title { font-size: 48px; } }
    .left-subtitle { color: #ccfbf1; font-size: 18px; max-width: 400px; }
    .feature-list { display: flex; flex-direction: column; gap: 24px; }
    .feature-item { display: flex; gap: 16px; align-items: flex-start; }
    .feature-icon-box { flex-shrink: 0; width: 48px; height: 48px; border-radius: 12px; background-color: rgba(255, 255, 255, 0.1); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255, 255, 255, 0.1); }
    .feature-icon-box .material-symbols-outlined { color: #99f6e4; }
    .feature-title { font-weight: 600; font-size: 18px; margin: 0 0 4px 0; }
    .feature-desc { color: rgba(204, 251, 241, 0.8); font-size: 14px; line-height: 1.6; margin: 0; }
    .testimonial { margin-top: auto; padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.2); }
    .testimonial blockquote { font-size: 20px; font-weight: 500; line-height: 1.6; margin: 0 0 24px 0; }
    .testimonial-author { display: flex; align-items: center; gap: 16px; }
    .avatar { height: 48px; width: 48px; border-radius: 9999px; background: linear-gradient(to top right, #fb923c, #ec4899); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: white; }
    .author-name { font-weight: 600; margin-bottom: 2px; }
    .author-role { font-size: 14px; color: #99f6e4; }
    .form-header { margin-bottom: 24px; }
    .form-header h3 { font-size: 20px; font-weight: 600; color: white; margin: 0 0 4px 0; }
    .form-header p { font-size: 14px; color: #99f6e4; margin: 0; }
    .glass-form .form-group { margin-bottom: 16px; }
    .glass-form .form-label { display: block; font-size: 12px; font-weight: 500; color: #99f6e4; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .glass-form .form-control { width: 100%; box-sizing: border-box; padding: 12px 16px; border-radius: 8px; background-color: rgba(4, 47, 46, 0.4); border: 1px solid rgba(94, 234, 212, 0.2); color: white; font-size: 14px; transition: all 0.2s; }
    .glass-form .form-control::placeholder { color: rgba(255, 255, 255, 0.3); }
    .glass-form .form-control:focus { outline: none; border-color: transparent; box-shadow: 0 0 0 2px #2dd4bf; }
    .glass-form select.form-control { appearance: none; cursor: pointer; }
    .glass-form select.form-control option { background-color: #134e4a; color: white; }
    .glass-form .btn-primary { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 32px; border-radius: 8px; background-color: white; color: #0f766e; font-weight: 600; font-size: 16px; border: none; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
    .glass-form .btn-primary:hover { background-color: #f0fdfa; }
    .glass-form .btn-primary:focus { box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.3); outline: none; }
    .glass-form .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
    .password-wrapper { position: relative; }
    .toggle-password-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255, 255, 255, 0.5); cursor: pointer; display: flex; align-items: center; padding: 4px; }
    .toggle-password-btn:hover { color: white; }
    .auth-switch { text-align: center; font-size: 12px; color: rgba(153, 246, 228, 0.6); margin-top: 16px; }
    .auth-switch a { color: white; text-decoration: none; font-weight: 500; }
    .auth-switch a:hover { text-decoration: underline; }
    .auth-result { background: rgba(2, 6, 23, 0.8); color: #ffffff; border-radius: 8px; padding: 12px 16px; font-size: 12px; margin-top: 16px; display: none; }
    .auth-result.show { display: block; }
    .auth-result.error { border-left: 3px solid #ef4444; background: rgba(239, 68, 68, 0.1); color: #fca5a5; }
    .auth-result.success { border-left: 3px solid #10b981; background: rgba(16, 185, 129, 0.1); color: #6ee7b7; }
  `;

  const formHtml = isSignup ? 
    `<form id="signupForm" class="glass-form" autocomplete="on">
      <div class="form-group"><label class="form-label" for="signupName">Full Name *</label><input class="form-control" type="text" id="signupName" placeholder="Adebayo Ogundele" required autocomplete="name"></div>
      <div class="form-group"><label class="form-label" for="signupEmail">Email Address *</label><input class="form-control" type="email" id="signupEmail" placeholder="hello@firm.com" required autocomplete="email"></div>
      <div class="form-group"><label class="form-label" for="signupPassword">Password *</label><div class="password-wrapper"><input class="form-control" type="password" id="signupPassword" placeholder="********" required autocomplete="new-password" minlength="8"><button type="button" class="toggle-password-btn" onclick="togglePasswordVisibility('signupPassword', this)"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span></button></div></div>
      <div style="display: flex; gap: 16px; margin-bottom: 16px;"><div class="form-group" style="flex:1; margin-bottom:0;"><label class="form-label" for="signupCompany">Business Name *</label><input class="form-control" type="text" id="signupCompany" placeholder="Reni Mercantile" required autocomplete="organization"></div><div class="form-group" style="flex:1; margin-bottom:0;"><label class="form-label" for="signupTier">Tier</label><select class="form-control" id="signupTier"><option value="starter">Starter</option><option value="professional">Business Suite</option><option value="enterprise">Enterprise</option></select></div></div>
      <div class="form-group" style="margin-bottom:24px;"><label style="display: flex; gap: 8px; align-items: flex-start; cursor: pointer; margin-top: 8px;"><input type="checkbox" id="signupTerms" required style="margin-top: 3px;"><span style="font-size: 11px; color: rgba(255,255,255,0.7); line-height: 1.4;">I agree to the <a href="#!" class="legal-trigger-terms" style="color: #99f6e4;">Terms of Service</a> and <a href="#!" class="legal-trigger-privacy" style="color: #99f6e4;">Privacy Policy</a>.</span></label></div>
      <button type="submit" class="btn-primary" id="signupSubmit">Create Account</button>
    </form><div class="auth-result" id="signupResult"></div><div class="auth-switch">Already have an account? <a href="/login.html">Sign In</a></div>` :
    `<form id="loginForm" class="glass-form" autocomplete="on">
      <div class="form-group"><label class="form-label" for="loginEmail">Email Address *</label><input class="form-control" type="email" id="loginEmail" placeholder="name@firm.com" required autocomplete="email"></div>
      <div class="form-group" style="margin-bottom: 24px;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;"><label class="form-label" for="loginPassword" style="margin-bottom: 0;">Password *</label><a href="/forgot-password" style="font-size: 11px; color: #99f6e4; font-weight: 500; text-decoration: none;">Forgot password?</a></div><div class="password-wrapper"><input class="form-control" type="password" id="loginPassword" placeholder="********" required autocomplete="current-password" minlength="8"><button type="button" class="toggle-password-btn" onclick="togglePasswordVisibility('loginPassword', this)"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span></button></div></div>
      <button type="submit" class="btn-primary" id="loginSubmit">Sign In</button>
    </form><div class="auth-result" id="loginResult"></div><div class="auth-switch">Don't have an account? <a href="/signup.html">Start Trial</a></div>`;

  const bodyHtml = `
<body>
  <div class="popout-container">
    <div class="popout-card">
      <div class="mesh-bg"></div>
      <button class="close-btn" onclick="window.location.href='/';"><span class="material-symbols-outlined">close</span></button>
      <div class="left-panel">
        <div><h2 class="left-title">Ready to scale?</h2><p class="left-subtitle">Join 4,000+ forward-thinking companies building the future with Coda.</p></div>
        <div class="feature-list">
          <div class="feature-item"><div class="feature-icon-box"><span class="material-symbols-outlined">bar_chart</span></div><div><h3 class="feature-title">FIRS Ready</h3><p class="feature-desc">Automated tax compliance embedded directly into your workflow.</p></div></div>
          <div class="feature-item"><div class="feature-icon-box"><span class="material-symbols-outlined">public</span></div><div><h3 class="feature-title">Naira Native</h3><p class="feature-desc">Designed from the ground up for Nigerian businesses.</p></div></div>
        </div>
        <div class="testimonial">
          <blockquote>"We cut our accounting workload by 70% and got FIRS-compliant in one week. Coda is built for how Nigeria does business."</blockquote>
          <div class="testimonial-author"><div class="avatar">CO</div><div><div class="author-name">Chidi Okonkwo</div><div class="author-role">CFO at Best Foods Ltd</div></div></div>
        </div>
      </div>
      <div class="right-panel">
        <div class="glass-form-card">
          <div class="form-header"><h3>${isSignup ? 'Start your free trial' : 'Welcome back'}</h3><p>${isSignup ? '14 days trial account, no card details needed.' : 'Access your corporate ledger & dashboard.'}</p></div>
          ${formHtml}
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="termsModal" style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:9999;"><div style="background:#fff;width:100%;max-width:500px;border-radius:14px;padding:32px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);"><button class="legal-trigger-terms" style="position:absolute;top:24px;right:24px;background:none;border:none;cursor:pointer;color:#64748b;"><span class="material-symbols-outlined">close</span></button><div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:24px;"><span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><svg viewBox="20 20 54 58" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/><rect x="22" y="32" width="18" height="38" rx="3.5" fill="currentColor"/><rect x="34" y="62" width="38" height="14" rx="3" fill="currentColor"/></svg></span><span>Coda</span></div><h2 style="font-size:20px;margin-bottom:16px;color:#020617;">Terms of Service</h2><p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">By accessing Coda's enterprise financial systems, you agree to these Terms of Service. As a financial operating system, you entrust us with critical business data; in turn, you agree to use the platform lawfully and maintain the confidentiality of your account credentials.</p><p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">While Coda guarantees 99.9% uptime and rigorous data backups for our core ERP features, the platform is provided without liability for indirect business losses. You remain responsible for the accuracy of the financial and tax data you input into the system.</p><button class="legal-trigger-terms" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;width:100%;margin-top:16px;height:40px;">Acknowledge</button></div></div>
  <div class="modal-overlay" id="privacyModal" style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:9999;"><div style="background:#fff;width:100%;max-width:500px;border-radius:14px;padding:32px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);"><button class="legal-trigger-privacy" style="position:absolute;top:24px;right:24px;background:none;border:none;cursor:pointer;color:#64748b;"><span class="material-symbols-outlined">close</span></button><div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:24px;"><span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><svg viewBox="20 20 54 58" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/><rect x="22" y="32" width="18" height="38" rx="3.5" fill="currentColor"/><rect x="34" y="62" width="38" height="14" rx="3" fill="currentColor"/></svg></span><span>Coda</span></div><h2 style="font-size:20px;margin-bottom:16px;color:#020617;">Privacy Policy</h2><p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">Coda acts as a data processor for your business. We securely process your financial, payroll, employee, and customer data exclusively to provide our ERP services. We employ industry-standard AES-256 encryption and strict access controls to ensure your corporate data remains confidential, compliant with financial regulations, and is never sold to third parties.</p><p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we're collecting it and how it will be used. We don't share any personally identifying information publicly or with third-parties, except when required to by law.</p><button class="legal-trigger-privacy" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;width:100%;margin-top:16px;height:40px;">Acknowledge</button></div></div>

  <script>
    ${mainScript}
  </script>

  <script id="modal-fix-script">
    document.addEventListener('DOMContentLoaded', function() {
      function openModal(id) {
        var m = document.getElementById(id);
        if (m) {
          document.body.style.overflow = 'hidden';
          m.style.setProperty('display', 'flex', 'important');
          m.classList.add('active');
          m.style.zIndex = '999999';
          m.style.opacity = '1';
          m.style.visibility = 'visible';
        }
      }
      function closeModal(id) {
        var m = document.getElementById(id);
        if (m) {
          document.body.style.overflow = '';
          m.style.setProperty('display', 'none', 'important');
          m.classList.remove('active');
        }
      }
      
      document.querySelectorAll('.legal-trigger-privacy').forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          openModal('privacyModal');
        });
      });
      
      document.querySelectorAll('.legal-trigger-terms').forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          openModal('termsModal');
        });
      });

      ['privacyModal', 'termsModal'].forEach(function(id) {
        var m = document.getElementById(id);
        if (m) {
          var buttons = m.querySelectorAll('button');
          buttons.forEach(function(btn) {
            btn.addEventListener('click', function() {
              closeModal(id);
            });
          });
        }
      });
    });
  </script>
</body>`;

  let newHtml = html.replace(/<style>[\s\S]*?<\/style>/, '<style>' + newCss + '</style>');
  newHtml = newHtml.replace(bodyRegex, bodyHtml + '<script>');
  fs.writeFileSync(filePath, newHtml, 'utf8');
  console.log('Updated ' + filePath);
}

updateAuthPage('c:/Users/AK/Documents/fifthapp/public/login.html', false);
updateAuthPage('c:/Users/AK/Documents/fifthapp/public/signup.html', true);
