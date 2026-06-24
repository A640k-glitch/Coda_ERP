const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');

const regex = /<div id="authPopoutOverlay"[\s\S]*?<\/script>\s*<\/body>/;

const cleanAuthBlock = `<div id="authPopoutOverlay" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); display: none; opacity: 0; transition: opacity 0.4s ease; z-index: 9999;"></div>
<div id="authPopoutContainer" style="position: fixed; z-index: 10000; background: var(--bg-card); overflow: hidden; display: none; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); will-change: top, left, width, height, border-radius; transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);">
  <button id="authPopoutClose" style="position: absolute; top: 16px; right: 16px; background: rgba(255, 255, 255, 0.1); border: none; color: #0d9488; cursor: pointer; width: 40px; height: 40px; border-radius: 20px; display: flex; align-items: center; justify-content: center; z-index: 10001; opacity: 0; transition: opacity 0.3s ease; backdrop-filter: blur(4px);">
    <span class="material-symbols-outlined" style="font-size: 24px; font-weight: 900;">close</span>
  </button>
  
  <div id="inlineAuthContent" style="width:100%; height:100%; overflow-y:auto; opacity: 1; transition: opacity 0.25s ease; background: var(--bg-card); border-radius: 24px;">
    <div class="auth-container" style="min-height: 100%; height: 100%;">
      <div class="auth-form-panel">
        <div class="auth-form-wrap">
          
          <!-- Auth Tab Switcher -->
          <div id="authTabSwitcher" style="display: flex; gap: 0; margin-bottom: 24px; border-radius: 12px; background: var(--surface, #f1f5f9); padding: 4px; border: 1px solid var(--border-color, #e2e8f0);">
            <button type="button" id="tabSignup" class="auth-tab-btn active" style="flex: 1; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: #fff; color: var(--slate-900, #0f172a); box-shadow: 0 1px 3px rgba(0,0,0,0.08);">Create Account</button>
            <button type="button" id="tabSignin" class="auth-tab-btn" style="flex: 1; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: transparent; color: var(--text-muted, #94a3b8);">Sign In</button>
          </div>
          
          <!-- SIGNUP VIEW -->
          <div id="authViewSignup">
            <h1>Start your free trial</h1>
            <p class="sub" style="margin-bottom: 12px;">14 days trial account, no card details needed.</p>
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 20px; display: flex; align-items: center; gap: 4px;">
              <span style="color: var(--error); font-weight: bold;">*</span> indicates a required field
            </p>

            <form id="signupForm" autocomplete="off">
              <input type="hidden" id="signupTier" value="professional">
              
              <div class="form-group">
                <label class="form-label" for="signupTierSelect">Plan Tier</label>
                <select class="form-control" id="signupTierSelect">
                  <option value="starter">Starter — ₦15,000/mo</option>
                  <option value="professional" selected>Business Suite — ₦45,000/mo (Popular)</option>
                  <option value="enterprise">Enterprise — ₦150,000/mo</option>
                </select>
              </div>

              <div class="field-row">
                <div class="form-group">
                  <label class="form-label" for="signupName">Full Name <span style="color: var(--error);">*</span></label>
                  <input class="form-control" type="text" id="signupName" placeholder="Adebayo Ogundele" required autocomplete="name">
                </div>
                <div class="form-group">
                  <label class="form-label" for="signupEmail">Email Address <span style="color: var(--error);">*</span></label>
                  <input class="form-control" type="email" id="signupEmail" placeholder="hello@firm.com" required autocomplete="email">
                </div>
              </div>

              <div class="field-row">
                <div class="form-group">
                  <label class="form-label" for="signupPassword">Password <span style="color: var(--error);">*</span></label>
                  <div class="password-wrapper">
                    <input class="form-control" type="password" id="signupPassword" placeholder="Minimum 8 characters" required minlength="8" autocomplete="new-password">
                    <button type="button" class="toggle-password-btn" onclick="togglePasswordVisibility('signupPassword', this)" aria-label="Toggle password visibility">
                      <span class="material-symbols-outlined">visibility</span>
                    </button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label" for="signupConfirmPassword">Confirm Password <span style="color: var(--error);">*</span></label>
                  <div class="password-wrapper">
                    <input class="form-control" type="password" id="signupConfirmPassword" placeholder="Re-enter password" required minlength="8" autocomplete="new-password">
                    <button type="button" class="toggle-password-btn" onclick="togglePasswordVisibility('signupConfirmPassword', this)" aria-label="Toggle password visibility">
                      <span class="material-symbols-outlined">visibility</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="field-row">
                <div class="form-group">
                  <label class="form-label" for="signupBusinessName">Business Name <span style="color: var(--error);">*</span></label>
                  <input class="form-control" type="text" id="signupBusinessName" placeholder="Reni Mercantile Ltd" required autocomplete="organization">
                </div>
                <div class="form-group">
                  <label class="form-label" for="signupPhone">Phone Number</label>
                  <input class="form-control" type="tel" id="signupPhone" placeholder="080 1234 5678" autocomplete="tel">
                </div>
              </div>

              <div class="field-row">
                <div class="form-group">
                  <label class="form-label" for="signupCAC">CAC Reg Number</label>
                  <input class="form-control" type="text" id="signupCAC" placeholder="RC1234567" autocomplete="organization">
                </div>
                <div class="form-group">
                  <label class="form-label" for="signupType">Business Type</label>
                  <select class="form-control" id="signupType">
                    <option value="sole_proprietorship">Sole Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="limited" selected>Limited Liability Company</option>
                  </select>
                </div>
              </div>

              <button type="submit" class="btn btn-primary" id="signupSubmit" style="width: 100%; margin-top: 8px;">
                <span class="material-symbols-outlined" style="font-size:18px">rocket_launch</span>
                Create Account
              </button>
            </form>
            <div class="auth-result" id="signupResult"></div>
          </div>
          
          <!-- SIGNIN VIEW (hidden by default) -->
          <div id="authViewSignin" style="display: none;">
            <h1>Welcome back</h1>
            <p class="sub">Access your corporate ledger & dashboard.</p>
            <form id="popupLoginForm" autocomplete="on">
              <div class="form-group">
                <label class="form-label" for="popupLoginEmail">Email Address</label>
                <input class="form-control" type="email" id="popupLoginEmail" placeholder="name@firm.com" required autocomplete="email">
              </div>
              <div class="form-group" style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <label class="form-label" for="popupLoginPassword" style="margin-bottom: 0;">Password</label>
                  <a href="/forgot-password" style="font-size: 12.5px; color: var(--teal-600); font-weight: 500; text-decoration: none;">Forgot password?</a>
                </div>
                <div class="password-wrapper">
                  <input class="form-control" type="password" id="popupLoginPassword" placeholder="••••••••" required autocomplete="current-password" minlength="8">
                  <button type="button" class="toggle-password-btn" onclick="togglePasswordVisibility('popupLoginPassword', this)" aria-label="Toggle password visibility">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </div>
              <button type="submit" class="btn btn-primary" id="popupLoginSubmit" style="width: 100%;">
                <span class="material-symbols-outlined" style="font-size:18px">login</span>
                Sign In
              </button>
            </form>
            <div class="auth-result" id="popupLoginResult"></div>
          </div>

        </div> <!-- /.auth-form-wrap -->

        <div style="margin-top: 32px; display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
          <span>&copy; 2026 Coda Technologies Ltd. All rights reserved.</span>
          <div style="display: flex; gap: 12px;">
            <a href="#!" class="legal-trigger-privacy">Privacy</a>
            <a href="#!" class="legal-trigger-terms">Terms</a>
          </div>
        </div>

      </div> <!-- /.auth-form-panel -->

      <div class="auth-brand-panel">
        <div class="auth-brand-content">
          <div class="auth-brand-logo">
            <span class="auth-brand-icon"><svg viewBox="20 20 54 58" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/><rect x="22" y="32" width="18" height="38" rx="3.5" fill="currentColor"/><rect x="34" y="62" width="38" height="14" rx="3" fill="currentColor"/></svg></span>
            <span>Coda</span>
          </div>
          <p class="auth-brand-quote">"We cut our accounting workload by 70% and got FIRS-compliant in one week. Coda is built for how Nigeria does business."</p>
          <p class="auth-brand-attribution">— Chidi Okonkwo, CFO at Best Foods Ltd</p>
          <div class="auth-brand-features">
            <div class="auth-brand-feat">
              <span class="material-symbols-outlined">verified</span>
              <span>NDPR Compliant</span>
            </div>
            <div class="auth-brand-feat">
              <span class="material-symbols-outlined">payments</span>
              <span>Naira Native</span>
            </div>
            <div class="auth-brand-feat">
              <span class="material-symbols-outlined">receipt_long</span>
              <span>FIRS Ready</span>
            </div>
          </div>
        </div>
      </div> <!-- /.auth-brand-panel -->
    </div> <!-- /.auth-container -->
  </div> <!-- /#inlineAuthContent -->
</div>

<script>
  (function() {
    'use strict';
    
    // Tab switching logic
    const tabSignup = document.getElementById('tabSignup');
    const tabSignin = document.getElementById('tabSignin');
    const viewSignup = document.getElementById('authViewSignup');
    const viewSignin = document.getElementById('authViewSignin');
    
    function showSignupView() {
      if(viewSignup) viewSignup.style.display = 'block';
      if(viewSignin) viewSignin.style.display = 'none';
      if(tabSignup) {
        tabSignup.style.background = '#fff';
        tabSignup.style.color = 'var(--slate-900, #0f172a)';
        tabSignup.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      }
      if(tabSignin) {
        tabSignin.style.background = 'transparent';
        tabSignin.style.color = 'var(--text-muted, #94a3b8)';
        tabSignin.style.boxShadow = 'none';
      }
    }
    
    function showSigninView() {
      if(viewSignup) viewSignup.style.display = 'none';
      if(viewSignin) viewSignin.style.display = 'block';
      if(tabSignin) {
        tabSignin.style.background = '#fff';
        tabSignin.style.color = 'var(--slate-900, #0f172a)';
        tabSignin.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      }
      if(tabSignup) {
        tabSignup.style.background = 'transparent';
        tabSignup.style.color = 'var(--text-muted, #94a3b8)';
        tabSignup.style.boxShadow = 'none';
      }
    }
    
    if (tabSignup) tabSignup.addEventListener('click', showSignupView);
    if (tabSignin) tabSignin.addEventListener('click', showSigninView);
    
    window._showSignupView = showSignupView;
    window._showSigninView = showSigninView;
    
    // Login form handler
    const loginForm = document.getElementById('popupLoginForm');
    const loginSubmitBtn = document.getElementById('popupLoginSubmit');
    const loginResultEl = document.getElementById('popupLoginResult');
    
    if (loginForm) {
      loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('popupLoginEmail').value.trim();
        const password = document.getElementById('popupLoginPassword').value;
        
        if (!email || !password) {
          loginResultEl.textContent = 'Please enter email and password';
          loginResultEl.className = 'auth-result show error';
          return;
        }
        
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.innerHTML = 'Signing in...';
        loginResultEl.classList.remove('show', 'success', 'error');
        loginResultEl.textContent = '';
        
        try {
          const res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          
          if (!res.ok) {
            if (data.redirect) {
              window.location.href = data.redirect;
              return;
            }
            loginResultEl.textContent = data.error || 'Invalid email or password';
            loginResultEl.className = 'auth-result show error';
            return;
          }
          
          loginResultEl.textContent = 'Welcome back! Redirecting...';
          loginResultEl.className = 'auth-result show success';
          loginForm.reset();
          
          if (data.token) {
            localStorage.setItem('coda_token', data.token);
            localStorage.setItem('coda_user', JSON.stringify(data.user));
          }
          
          setTimeout(() => window.top.location.href = '/dashboard', 900);
        } catch (err) {
          loginResultEl.textContent = 'Network error. Please try again.';
          loginResultEl.className = 'auth-result show error';
        } finally {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">login</span> Sign In';
        }
      });
    }

    const overlay = document.getElementById('authPopoutOverlay');
    const container = document.getElementById('authPopoutContainer');
    const closeBtn = document.getElementById('authPopoutClose');
    const inlineContent = document.getElementById('inlineAuthContent');
    
    document.querySelectorAll('.trigger-auth, .trigger-auth-signin, #btnExpandAuth').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Switch to the correct view
        const isSignin = btn.classList.contains('trigger-auth-signin');
        if (isSignin && window._showSigninView) {
          window._showSigninView();
        } else if (window._showSignupView) {
          window._showSignupView();
        }
        
        // Simple center popup
        overlay.style.display = 'block';
        container.style.display = 'block';
        
        // Position center directly
        const targetWidth = Math.min(window.innerWidth - 48, 1400);
        const targetHeight = Math.min(window.innerHeight - 48, 900);
        
        container.style.top = '50%';
        container.style.left = '50%';
        container.style.transform = 'translate(-50%, -50%) scale(0.95)';
        container.style.width = targetWidth + 'px';
        container.style.height = targetHeight + 'px';
        container.style.borderRadius = '24px';
        container.style.opacity = '0';
        
        if(inlineContent) inlineContent.style.opacity = '0';
        closeBtn.style.opacity = '0';
        
        document.body.style.overflow = 'hidden';
        
        // Fade in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            container.style.opacity = '1';
            container.style.transform = 'translate(-50%, -50%) scale(1)';
            
            setTimeout(() => {
              if(inlineContent) inlineContent.style.opacity = '1';
              closeBtn.style.opacity = '1';
            }, 100);
          });
        });
      });
    });

    closeBtn.addEventListener('click', () => {
      document.body.style.overflow = '';
      
      if(inlineContent) inlineContent.style.opacity = '0';
      closeBtn.style.opacity = '0';
      
      container.style.opacity = '0';
      container.style.transform = 'translate(-50%, -50%) scale(0.95)';
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        container.style.display = 'none';
        overlay.style.display = 'none';
      }, 300); // Wait for fade out
    });
    
    function togglePasswordVisibility(id, btn) {
      const input = document.getElementById(id);
      if (!input) return;
      const icon = btn.querySelector('.material-symbols-outlined');
      if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        if (icon) icon.textContent = 'visibility';
      }
    }
    window.togglePasswordVisibility = togglePasswordVisibility;
  })();
</script>
</body>`;

const updatedHtml = html.replace(regex, cleanAuthBlock);

fs.writeFileSync('public/index.html', updatedHtml);
console.log('Fixed index.html structure');
