const fs = require('fs');

function fixHtml() {
  let html = fs.readFileSync('public/index.html', 'utf8');

  // 1. Remove Start Free Trial button from Nav
  html = html.replace(
    '<a href="#" class="btn btn-primary btn-sm trigger-auth">Start Free Trial</a>',
    ''
  );

  // 2. Remove reveal classes and intersection observer to prevent flashes
  // Remove "reveal " and " reveal" and "reveal" from class attributes
  html = html.replace(/class="([^"]*?)\s*\breveal\b\s*([^"]*?)"/g, (match, p1, p2) => {
    const newClass = (p1 + ' ' + p2).trim().replace(/\s+/g, ' ');
    return `class="${newClass}"`;
  });

  // Remove the script that initializes revealObserver
  const revealScriptRegex = /\/\/ Reveal animations[\s\S]*?revealObserver\.observe\(el\);\r?\n\s*}\);/m;
  html = html.replace(revealScriptRegex, '');

  // 3. Add tab switching JS logic right before the end of the script block
  // If it's not already there.
  if (!html.includes('const tabSignup = document.getElementById')) {
    const tabLogic = `
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
`;
    // Insert before the auth trigger logic
    html = html.replace("document.querySelectorAll('.trigger-auth, .trigger-auth-signin, #btnExpandAuth').forEach", tabLogic + "\n    document.querySelectorAll('.trigger-auth, .trigger-auth-signin, #btnExpandAuth').forEach");
  }

  // 4. Change auth popout animation to a simple center fade in/out
  // Find the block for document.querySelectorAll('.trigger-auth... and replace it.
  const oldTriggerLogicRegex = /document\.querySelectorAll\('\.trigger-auth, \.trigger-auth-signin, #btnExpandAuth'\)\.forEach\(btn => \{[\s\S]*?\}\);\s*\}\);\s*<\/script>/;
  
  const newTriggerLogic = `document.querySelectorAll('.trigger-auth, .trigger-auth-signin, #btnExpandAuth').forEach(btn => {
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
  });
</script>`;

  html = html.replace(oldTriggerLogicRegex, newTriggerLogic);

  // Overwrite the file
  fs.writeFileSync('public/index.html', html);
  console.log("index.html fixed successfully!");
}

fixHtml();
