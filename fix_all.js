const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// =============================================
// 1. ADD LOGIN FORM AS A SECOND TAB IN THE POPUP
// =============================================

// The current popup only shows the signup form.
// We need to add tabs (Sign Up / Sign In) and a login form.

// First, find the auth-form-wrap and wrap the signup content in a tab view
const signupFormStart = '<div class="auth-form-wrap">';
const signupH1 = '<h1>Start your free trial</h1>';

// Add tab switcher and wrap signup form in a tab div
const tabSwitcherHTML = `<div class="auth-form-wrap">
        <!-- Auth Tab Switcher -->
        <div id="authTabSwitcher" style="display: flex; gap: 0; margin-bottom: 24px; border-radius: 12px; background: var(--surface, #f1f5f9); padding: 4px; border: 1px solid var(--border-color, #e2e8f0);">
          <button type="button" id="tabSignup" class="auth-tab-btn active" style="flex: 1; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: #fff; color: var(--slate-900, #0f172a); box-shadow: 0 1px 3px rgba(0,0,0,0.08);">Create Account</button>
          <button type="button" id="tabSignin" class="auth-tab-btn" style="flex: 1; padding: 10px 16px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; background: transparent; color: var(--text-muted, #94a3b8);">Sign In</button>
        </div>
        
        <!-- SIGNUP VIEW -->
        <div id="authViewSignup">
        <h1>Start your free trial</h1>`;

html = html.replace(
  signupFormStart + '\r\n        \r\n        ' + signupH1,
  tabSwitcherHTML
);

// Close the signup view div and add login view before the footer
const signupResultEnd = '<div class="auth-result" id="signupResult"></div>';
const footerStart = '      </div>\r\n      <div style="margin-top: 32px';

const loginFormHTML = `<div class="auth-result" id="signupResult"></div>
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
        </div>`;

html = html.replace(signupResultEnd, loginFormHTML);

// =============================================
// 2. ADD TAB SWITCHING + LOGIN FORM LOGIC SCRIPT
// =============================================

// Add it before the closing </script> of the auth IIFE
const authIIFEEnd = "    window.togglePasswordVisibility = togglePasswordVisibility;\n    })();";

const tabSwitchScript = `    window.togglePasswordVisibility = togglePasswordVisibility;
    
      // Tab switching logic
      const tabSignup = document.getElementById('tabSignup');
      const tabSignin = document.getElementById('tabSignin');
      const viewSignup = document.getElementById('authViewSignup');
      const viewSignin = document.getElementById('authViewSignin');
      
      function showSignupView() {
        viewSignup.style.display = 'block';
        viewSignin.style.display = 'none';
        tabSignup.style.background = '#fff';
        tabSignup.style.color = 'var(--slate-900, #0f172a)';
        tabSignup.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        tabSignin.style.background = 'transparent';
        tabSignin.style.color = 'var(--text-muted, #94a3b8)';
        tabSignin.style.boxShadow = 'none';
      }
      
      function showSigninView() {
        viewSignup.style.display = 'none';
        viewSignin.style.display = 'block';
        tabSignin.style.background = '#fff';
        tabSignin.style.color = 'var(--slate-900, #0f172a)';
        tabSignin.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        tabSignup.style.background = 'transparent';
        tabSignup.style.color = 'var(--text-muted, #94a3b8)';
        tabSignup.style.boxShadow = 'none';
      }
      
      if (tabSignup) tabSignup.addEventListener('click', showSignupView);
      if (tabSignin) tabSignin.addEventListener('click', showSigninView);
      
      // Expose for external use
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
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
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
    })();`;

html = html.replace(authIIFEEnd, tabSwitchScript);

// =============================================
// 3. UPDATE THE POPOUT SCRIPT TO SUPPORT data-auth-view
// =============================================
// Buttons with class 'trigger-auth-signin' should open to signin tab
// Buttons with class 'trigger-auth' should open to signup tab (default)

const oldClickHandler = `    document.querySelectorAll('.trigger-auth, #btnExpandAuth').forEach(btn => {
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
        
        
        if(inlineContent) inlineContent.style.opacity = '0';
        closeBtn.style.opacity = '0';
        
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
          const targetWidth = Math.min(window.innerWidth - 48, 1400);
          const targetHeight = Math.min(window.innerHeight - 48, 900);
          
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
    });`;

const newClickHandler = `    document.querySelectorAll('.trigger-auth, .trigger-auth-signin, #btnExpandAuth').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Switch to the correct view
        const isSignin = btn.classList.contains('trigger-auth-signin');
        if (isSignin && window._showSigninView) {
          window._showSigninView();
        } else if (window._showSignupView) {
          window._showSignupView();
        }
        
        const rect = btn.getBoundingClientRect();
        
        overlay.style.display = 'block';
        setTimeout(() => overlay.style.opacity = '1', 10);
        
        // Start from the exact button position
        container.style.display = 'block';
        container.style.top = rect.top + 'px';
        container.style.left = rect.left + 'px';
        container.style.transform = 'none';
        container.style.width = rect.width + 'px';
        container.style.height = rect.height + 'px';
        container.style.borderRadius = rect.height / 2 + 'px';
        container.style.opacity = '1';
        
        if(inlineContent) inlineContent.style.opacity = '0';
        closeBtn.style.opacity = '0';
        
        document.body.style.overflow = 'hidden';
        
        // Animate to center
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const targetWidth = Math.min(window.innerWidth - 48, 1400);
            const targetHeight = Math.min(window.innerHeight - 48, 900);
            
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            container.style.width = targetWidth + 'px';
            container.style.height = targetHeight + 'px';
            container.style.borderRadius = '24px';
            
            setTimeout(() => {
              if(inlineContent) inlineContent.style.opacity = '1';
              closeBtn.style.opacity = '1';
            }, 250);
          });
        });
        
        // Store origin for close animation
        container.dataset.originTop = rect.top;
        container.dataset.originLeft = rect.left;
        container.dataset.originWidth = rect.width;
        container.dataset.originHeight = rect.height;
      });
    });`;

html = html.replace(oldClickHandler, newClickHandler);

// =============================================
// 4. CHANGE MACBOOK BEZELS TO SILVER
// =============================================

// Change bezel background from dark to silver
html = html.replace(
  "background: #0c0c0e;\n      /* Matte black bezel */",
  "background: linear-gradient(135deg, #e8e8ed 0%, #c8c8cf 100%);\n      /* Silver aluminum bezel */"
);

// Update border color to silver
html = html.replace(
  "border: 3px solid #1a1a1c;",
  "border: 3px solid #b0b0b8;"
);

// Update camera dot to silver
html = html.replace(
  "background: #040404;",
  "background: #9ca3af;"
);
html = html.replace(
  "border: 1.5px solid #2d2d30;",
  "border: 1.5px solid #b0b0b8;"
);

// Update shadow for silver bezel
html = html.replace(
  "inset 0 0 0 1px rgba(255, 255, 255, 0.08),",
  "inset 0 0 0 1px rgba(255, 255, 255, 0.4),"
);

// =============================================
// 5. ADD SIGN-IN BUTTON TO NAV
// =============================================
html = html.replace(
  '<div class="nav-auth" id="navAuthArea"></div>',
  '<div class="nav-auth" id="navAuthArea"><a href="#" class="btn btn-sm trigger-auth-signin" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); font-weight: 600; margin-right: 8px;">Sign in</a><a href="#" class="btn btn-primary btn-sm trigger-auth">Start Free Trial</a></div>'
);

fs.writeFileSync('public/index.html', html);
console.log('All fixes applied successfully!');
