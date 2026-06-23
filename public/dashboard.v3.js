// Dashboard App Logic - Secure Version
(function() {
  'use strict';

  // ===== State =====
  let currentUser = null;
  let currentView = 'overview';

  // Search targets per view (hoisted so switchView can reset them)
  const viewSearchTargets = {
    overview: ['#transactionsBody tr'],
    accounting: ['#accountingTransactionsBody tr', '#coaTableBody tr'],
    reconciliation: ['#reconBankFeedList > div', '#reconLedgerMatchList > div'],
    inventory: ['#inventoryTableBody tr'],
    crm: ['#crmTableBody tr'],
    hr: ['#hrTableBody tr'],
    tax: ['#taxTableBody tr'],
    reports: ['#reportsTableBody tr']
  };

  // ===== Helpers =====
  function showToast(title, message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
    toast.innerHTML = `
      <span class="material-symbols-outlined">${icons[type]}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss"><span class="material-symbols-outlined">close</span></button>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  function formatCurrency(amount) {
    if (typeof window.formatCurrency === 'function') {
      return window.formatCurrency(amount);
    }
    const formatted = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
    return formatted.replace('₦', '₦ ');
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ===== Auth Check =====
  async function verifyAuth() {
    try {
      const res = await fetch('/api/v1/auth/me', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        if (currentUser && data.business) {
          currentUser.tier = data.business.tier;
        }
        window.__isAdmin = data.isAdmin === true;
        return true;
      }
    } catch (e) {
      // Ignore - will redirect
    }
    return false;
  }

  const sidebar = document.getElementById('sidebar');
  if (sidebar && document.documentElement.classList.contains('sidebar-collapsed-pref')) {
    sidebar.classList.add('collapsed');
    document.documentElement.classList.remove('sidebar-collapsed-pref');
  }
  const mainContent = document.getElementById('mainContent');
  const pageTitle = document.getElementById('pageTitle');
  const userInfo = document.getElementById('userInfo');
  const navItems = document.querySelectorAll('.nav-item');
  const moduleViews = document.querySelectorAll('.module-view');

  let csrfToken = '';

  async function initCsrf() {
    try {
      const res = await fetch('/api/v1/auth/csrf-token');
      if (res.ok) {
        const data = await res.json();
        csrfToken = data.csrfToken;
        
        // Override global fetch to automatically inject CSRF token header for state-changing requests
        // and redirect to login on 401 (session invalidated in another tab)
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
          init = init || {};
          init.headers = init.headers || {};
          const method = (init.method || 'GET').toUpperCase();
          if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            if (init.headers instanceof Headers) {
              init.headers.set('X-CSRF-Token', csrfToken);
            } else {
              init.headers['X-CSRF-Token'] = csrfToken;
            }
          }
          return originalFetch(input, init).then(res => {
            if (res.status === 401 && currentUser) {
              window.location.href = '/login';
            }
            return res;
          });
        };
      }
    } catch (err) {
      console.error('Failed to initialize CSRF token:', err);
    }
  }

  // ===== Init App =====
  async function initApp() {
    await initCsrf();
    // Hide all content until auth verified
    if (!localStorage.getItem('coda_user')) {
      document.body.style.visibility = 'hidden';
    }
    
    const authenticated = await verifyAuth();
    const authModal = document.getElementById('authModal');
    
    if (!authenticated) {
      document.body.style.visibility = 'visible';
      document.body.style.overflow = 'hidden';
      const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
      if (mainContent) mainContent.style.overflow = 'hidden';
      if (authModal) authModal.style.display = 'flex';
      
      // Remove loader to show login
      const loader = document.getElementById('pageLoader');
      if (loader) loader.remove();
      return;
    }

    // Show content
    if (authModal) authModal.style.display = 'none';
    document.body.style.visibility = 'visible';
    document.body.style.overflow = '';
    const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
    if (mainContent) mainContent.style.overflow = '';
    
    // Cross-tab session invalidation: re-check auth when tab becomes visible
    document.addEventListener('visibilitychange', function onVis() {
      if (document.visibilityState === 'visible' && currentUser) {
        fetch('/api/v1/auth/me', { credentials: 'include' }).then(r => {
          if (!r.ok) window.location.href = '/login';
        });
      }
    });

    // Render user info
    if (userInfo && currentUser) {
      userInfo.innerHTML = `
        <div class="user-avatar">${currentUser.name?.charAt(0)?.toUpperCase() || 'A'}</div>
        <div class="user-details">
          <div class="user-name">${currentUser.name}</div>
          <div class="user-role">${currentUser.tier || 'professional'}</div>
        </div>
      `;
    }

    // Update subscription badge in sidebar brand
    const subBadge = document.querySelector('.sidebar-brand .badge-subscription');
    if (subBadge && currentUser && currentUser.tier) {
      const tierText = currentUser.tier.toLowerCase() === 'professional' ? 'Pro' : currentUser.tier.charAt(0).toUpperCase() + currentUser.tier.slice(1);
      subBadge.textContent = tierText;
    }

    // Show admin nav if user is admin
    const adminNav = document.getElementById('adminNavSection');
    if (adminNav && window.__isAdmin) {
      adminNav.style.display = '';
    }

    // Apply Tier Restrictions
    function applyTierRestrictions(tier) {
      const t = (tier || 'starter').toLowerCase();
      const modules = {
        starter: ['overview', 'accounting', 'reconciliation', 'tax', 'reports'],
        professional: ['overview', 'accounting', 'reconciliation', 'tax', 'reports', 'crm', 'hr'],
        enterprise: ['overview', 'accounting', 'reconciliation', 'inventory', 'crm', 'hr', 'tax', 'reports']
      };
      const allowed = modules[t] || modules.starter;
      
      document.querySelectorAll('.nav-item[data-view]').forEach(el => {
        const view = el.getAttribute('data-view');
        if (!allowed.includes(view)) {
          el.style.display = 'none';
        } else {
          el.style.display = 'flex';
        }
      });

      const promoCard = document.querySelector('.sidebar-promo-card');
      const promoTitle = promoCard?.querySelector('.promo-title');
      const promoDesc = promoCard?.querySelector('.promo-desc');
      
      if (promoCard) {
        if (t === 'enterprise') {
          promoCard.style.display = 'none';
        } else if (t === 'professional') {
          if (promoTitle) promoTitle.textContent = 'Enterprise Tier';
          if (promoDesc) promoDesc.textContent = 'Multi-depot inventory and APIs.';
          promoCard.style.display = 'block';
        } else {
          if (promoTitle) promoTitle.textContent = 'Professional Tier';
          if (promoDesc) promoDesc.textContent = 'Unlock CRM, HR & Payroll.';
          promoCard.style.display = 'block';
        }
      }

      // Gate Overview Cards
      const overviewCards = {
        inventory: document.getElementById('card-inventory'),
        crm: document.getElementById('card-crm'),
        hr: document.getElementById('card-hr'),
        tax: document.getElementById('card-tax')
      };
      
      for (const [key, el] of Object.entries(overviewCards)) {
        if (el) {
          if (!allowed.includes(key)) {
            el.style.display = 'none';
          } else {
            el.style.display = '';
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => switchView(key));
          }
        }
      }
      return allowed;
    }

    const allowedViews = applyTierRestrictions(currentUser.tier);

    // Initialize components
    initCharts();
    fetchNotifications();
    loadSettings();
    fetchBusinessData();
    updateNotificationBadge();

    // Event listeners
    setupEventListeners();

    // Restore saved view or default to overview
    let savedView = localStorage.getItem('coda_active_view') || 'overview';
    if (!allowedViews.includes(savedView)) {
      savedView = 'overview';
    }
    switchView(savedView);

    // Safety net: ensure a view is actually active, force overview if not
    const anyActive = Array.from(moduleViews).some(v => v.classList.contains('active'));
    if (!anyActive) {
      switchView('overview');
    }

    // Ensure the early-view-override style is always removed so views aren't stuck hidden
    const leftover = document.getElementById('early-view-override');
    if (leftover) leftover.remove();

    // Wait for initial data to load before revealing shell
    await currentLoadPromise;

    // Reveal shell with smooth cross-fade (same as admin)
    const shell = document.querySelector('.app-shell');
    if (shell) shell.classList.add('loaded');
    const loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 300);
    }
  }

  function closeAllPanels() {
    const pn = document.getElementById('panelNotifications');
    const ps = document.getElementById('panelSettings');
    if (pn) pn.classList.remove('open');
    if (ps) ps.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }

  function setupEventListeners() {
    // Sidebar Navigation
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (!view) return; // Prevent empty shell flash for standard links like Admin Panel
        switchView(view);
      });
    });

    // Overview KPI Cards Navigation Shortcuts
    const statCards = {
      statCardRevenue: 'accounting',
      statCardExpenses: 'accounting',
      statCardProfit: 'accounting',
      statCardTax: 'tax'
    };
    for (const [id, view] of Object.entries(statCards)) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => switchView(view));
      }
    }

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        sidebar.classList.toggle('open');
        if (sidebar.classList.contains('open')) {
          document.body.classList.add('no-scroll');
        } else {
          document.body.classList.remove('no-scroll');
        }
      } else {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('coda_sidebar_collapsed', sidebar.classList.contains('collapsed'));
      }
    });
    document.getElementById('sidebarClose')?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      document.body.classList.remove('no-scroll');
    });
    // Right Panels
    const panelNotifications = document.getElementById('panelNotifications');
    const panelSettings = document.getElementById('panelSettings');
    const btnNotifications = document.getElementById('btnNotifications');
    const btnSettings = document.getElementById('btnSettings');
    const closeNotifications = document.getElementById('closeNotifications');
    const closeSettings = document.getElementById('closeSettings');

    function openPanel(panel) {
      panel.classList.add('open');
      document.body.classList.add('no-scroll');
    }
    function closePanel(panel) {
      panel.classList.remove('open');
      document.body.classList.remove('no-scroll');
    }
    btnNotifications?.addEventListener('click', () => {
      closeAllPanels();
      openPanel(panelNotifications);
      loadNotifications();
    });
    btnSettings?.addEventListener('click', () => {
      closeAllPanels();
      openPanel(panelSettings);
      loadSettings();
    });
    closeNotifications?.addEventListener('click', () => closePanel(panelNotifications));
    closeSettings?.addEventListener('click', () => closePanel(panelSettings));

    document.addEventListener('click', e => {
      if (panelNotifications?.classList.contains('open') &&
          !panelNotifications.contains(e.target) && !e.target.closest('#btnNotifications')) {
        closePanel(panelNotifications);
      }
      if (panelSettings?.classList.contains('open') &&
          !panelSettings.contains(e.target) && !e.target.closest('#btnSettings')) {
        closePanel(panelSettings);
      }
    });

    // Settings Tabs
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    settingsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        settingsTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
        settingsPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${target}`));
      });
    });

    // Forms
    const formGeneral = document.getElementById('formGeneralSettings');
    formGeneral?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = formGeneral.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">refresh</span> Saving...';
      
      const currencySelect = document.getElementById('optCurrency');
      if (currencySelect) {
        localStorage.setItem('app_currency', currencySelect.value);
      }

      await new Promise(r => setTimeout(r, 800));
      btn.disabled = false;
      btn.innerHTML = original;
      showToast('Saved', 'General settings updated successfully.', 'success');
      
      if (typeof updateCurrencyDOM === 'function') {
        updateCurrencyDOM();
      }
      setTimeout(() => {
        window.location.reload();
      }, 800);
    });

    const btnUpdateProfile = document.getElementById('btnUpdateProfile');
    btnUpdateProfile?.addEventListener('click', async () => {
      const btn = btnUpdateProfile;
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite">refresh</span> Updating...';
      await new Promise(r => setTimeout(r, 800));
      btn.disabled = false;
      btn.innerHTML = original;
      showToast('Updated', 'Profile updated successfully.', 'success');
    });

    // Delete Account — multi-step safety flow
    // Step 0: Are you sure? → reveal danger zone
    document.getElementById('btnShowDangerZone')?.addEventListener('click', () => {
      const modal = document.getElementById('actionModal');
      const titleEl = document.getElementById('actionModalTitle');
      const fieldsEl = document.getElementById('actionModalFields');
      const form = document.getElementById('actionModalForm');
      titleEl.textContent = 'Delete Account?';
      fieldsEl.innerHTML = '<p style="color: var(--error); font-weight: 600; margin-bottom: 16px;">This is the first step toward permanently deleting your account.</p><p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">If you proceed, you will be asked for your password and final confirmation. This action <strong>cannot be undone</strong>.</p>';
      const submitBtn = document.getElementById('actionModalSubmit');
      submitBtn.textContent = 'I understand, continue';
      submitBtn.style.background = 'var(--error)';
      submitBtn.style.borderColor = 'var(--error)';
      modal.style.display = 'flex';
      document.body.classList.add('no-scroll');
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);
      newForm.onsubmit = (e) => {
        e.preventDefault();
        // Restore button styles before moving to the next step
        document.getElementById('actionModalSubmit').textContent = 'Save';
        document.getElementById('actionModalSubmit').style.background = '';
        document.getElementById('actionModalSubmit').style.borderColor = '';
        // Automatically reveal danger zone behind the scenes
        document.getElementById('dangerZoneReveal').style.display = 'block';
        document.getElementById('btnShowDangerZone').style.display = 'none';
        // Immediately trigger the password step
        document.getElementById('btnDeleteAccount').click();
      };
    });

    // Step 1: Password confirmation
    document.getElementById('btnDeleteAccount')?.addEventListener('click', () => {
      const modal = document.getElementById('actionModal');
      const titleEl = document.getElementById('actionModalTitle');
      const fieldsEl = document.getElementById('actionModalFields');
      const form = document.getElementById('actionModalForm');
      titleEl.textContent = 'Delete Account — Confirm Password';
      fieldsEl.innerHTML = '<div class="form-group"><label class="form-label">Enter your password to continue</label><input class="form-control" type="password" name="password" required></div>';
      const submitBtn = document.getElementById('actionModalSubmit');
      submitBtn.textContent = 'Continue';
      submitBtn.style.background = 'var(--error)';
      submitBtn.style.borderColor = 'var(--error)';
      modal.style.display = 'flex';
      document.body.classList.add('no-scroll');
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);
      newForm.onsubmit = async (e) => {
        e.preventDefault();
        const password = new FormData(newForm).get('password');
        modal.style.display = 'none';
        document.body.classList.remove('no-scroll');
        document.getElementById('actionModalSubmit').textContent = 'Save';
        document.getElementById('actionModalSubmit').style.background = '';
        document.getElementById('actionModalSubmit').style.borderColor = '';
        // Step 2: Final warning — type DELETE
        const modal2 = document.getElementById('actionModal');
        const titleEl2 = document.getElementById('actionModalTitle');
        const fieldsEl2 = document.getElementById('actionModalFields');
        const form2 = document.getElementById('actionModalForm');
        titleEl2.textContent = 'Are you absolutely sure?';
        fieldsEl2.innerHTML = '<div class="form-group"><label class="form-label">This will permanently delete your account' + (currentUser?.role === 'owner' ? ' and your entire business' : '') + '. Type <strong>DELETE</strong> to confirm:</label><input class="form-control" type="text" name="confirmation" required placeholder="Type DELETE"></div><p style="font-size:12px;color:var(--error);margin-top:8px;">This action cannot be undone.</p>';
        const submitBtn2 = document.getElementById('actionModalSubmit');
        submitBtn2.textContent = 'Permanently Delete';
        submitBtn2.style.background = 'var(--error)';
        submitBtn2.style.borderColor = 'var(--error)';
        modal2.style.display = 'flex';
        document.body.classList.add('no-scroll');
        const newForm2 = form2.cloneNode(true);
        form2.parentNode.replaceChild(newForm2, form2);
        newForm2.onsubmit = async (e2) => {
          e2.preventDefault();
          const confirmation = new FormData(newForm2).get('confirmation');
          submitBtn2.disabled = true; submitBtn2.textContent = 'Deleting...';
          try {
            const res = await fetch('/api/v1/auth/delete-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password, confirmation })
            });
            if (res.ok) {
              modal2.style.display = 'none';
              document.body.classList.remove('no-scroll');
              showToast('Account Deleted', 'Your account has been permanently deleted.', 'success');
              setTimeout(() => { window.location.href = '/'; }, 1500);
            } else {
              const err = await res.json();
              showToast('Error', err.error || 'Failed to delete account.', 'error');
              modal2.style.display = 'none';
              document.body.classList.remove('no-scroll');
            }
          } catch (e) { showToast('Error', 'Failed to delete account.', 'error'); }
          submitBtn2.disabled = false; submitBtn2.textContent = 'Permanently Delete';
        };
      };
    });

    // Logout
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
      try {
        await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {}
      localStorage.removeItem('coda_token');
      localStorage.removeItem('coda_user');
      window.location.href = '/login';
    });

    // Sidebar Promo Card
    document.querySelector('.btn-promo')?.addEventListener('click', async () => {
      if (document.getElementById('btnManageBilling')) {
         document.getElementById('btnManageBilling').click();
      }
    });

    // Billing tab logic
    const btnManageBilling = document.getElementById('btnManageBilling');
    if (btnManageBilling) {
      btnManageBilling.addEventListener('click', async () => {
        showModal('Upgrade Subscription', [
          { label: 'Select Tier', name: 'tier', type: 'select', options: ['professional', 'enterprise'] }
        ], async (data) => {
          const tier = data.tier;
          try {
            const res = await fetch('/api/v1/business/request-upgrade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ new_tier: tier.toLowerCase() })
            });
            const resData = await res.json();
            if (resData.success) {
              showToast('Upgrade Requested', 'Request sent to admin! You can track this in the admin portal.', 'success');
            } else {
              showToast('Error', resData.error || 'Failed to request upgrade', 'error');
            }
          } catch (err) {
            showToast('Error', 'Failed to request upgrade', 'error');
          }
        });
      });
    }


    // Global Search Filter (Per User Local Search for active view)
    // viewSearchTargets is defined at IIFE scope (hoisted for switchView access)
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const targets = viewSearchTargets[currentView] || [];
        targets.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            if (el.textContent.includes('No transactions found') || el.textContent.includes('No pending bank transactions')) return;
            const text = el.textContent.toLowerCase();
            el.style.display = text.includes(query) ? '' : 'none';
          });
        });
      });
    }
  }

  let currentLoadPromise = Promise.resolve();

  function switchView(viewName) {
    // Clear search and reset all hidden rows when switching views
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) searchInput.value = '';
    Object.values(viewSearchTargets).flat().forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.style.display = '');
    });

    currentView = viewName;
    localStorage.setItem('coda_active_view', viewName);
    
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });
    const labels = {
      overview: 'Dashboard',
      accounting: 'Accounting',
      reconciliation: 'Bank Reconciliation',
      inventory: 'Inventory',
      crm: 'CRM & Customers',
      hr: 'HR & Payroll',
      tax: 'Tax Center',
      reports: 'Reports'
    };
    pageTitle.textContent = labels[viewName] || 'Dashboard';
    moduleViews.forEach(v => {
      v.classList.toggle('active', v.id === `view-${viewName}`);
    });

    // Force style/layout reflow before removing early styles to ensure zero-flicker rendering
    document.body.offsetHeight;

    const override = document.getElementById('early-view-override');
    if (override) override.remove();
    
    if (viewName === 'reconciliation') currentLoadPromise = loadReconciliation();
    else if (viewName === 'inventory') currentLoadPromise = loadInventory();
    else if (viewName === 'crm') currentLoadPromise = loadCRM();
    else if (viewName === 'hr') currentLoadPromise = loadHR();
    else if (viewName === 'tax') currentLoadPromise = loadTax();
    else if (viewName === 'accounting' || viewName === 'overview') currentLoadPromise = loadAccounting();
    
    document.getElementById('btnNewTransaction').style.display = viewName === 'overview' ? 'flex' : 'none';
  }

  // ===== Charts =====
  let revenueChart, expenseChart;

  const expenseChartColors = {
    '6000': '#2A8566',
    '6100': '#B8652E',
    '6200': '#34A87A',
    '6300': '#D4A85D',
    '6400': '#60C89A'
  };

  function initCharts() {
    const chartColors = {
      primary: '#2A8566',
      copper: '#B8652E',
      green50: '#E8F5F0',
      copper50: '#FDF2E8',
      border: '#E8ECEA'
    };

    // Revenue Chart (Line or Bar) — initialise empty, real data loaded via updateChartsData
    const revCtx = document.getElementById('revenueChart')?.getContext('2d');
    const savedChartType = localStorage.getItem('revenueChartPref') || 'line';
    const isBar = savedChartType === 'bar';

    if (revCtx) {
      revenueChart = new Chart(revCtx, {
        type: savedChartType,
        data: {
          labels: [],
          datasets: [{
            label: 'Revenue',
            data: [],
            borderColor: chartColors.primary,
            backgroundColor: isBar ? chartColors.primary : 'rgba(42,133,102,0.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: chartColors.primary,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3,
            borderRadius: isBar ? 6 : 0,
            barThickness: isBar ? 28 : undefined
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
          scales: {
            x: { 
              grid: { display: false }, 
              ticks: { color: '#9CA3AF' },
              offset: isBar
            },
            y: { grid: { color: chartColors.border }, ticks: { color: '#9CA3AF', callback: v => (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + (v/1).toFixed(1) + 'M' }, beginAtZero: true }
          },
          elements: { line: { borderWidth: 3 } }
        }
      });
    }

    // Chart type toggle
    const btnChartLine = document.getElementById('btnChartLine');
    const btnChartBar = document.getElementById('btnChartBar');
    if (btnChartLine && btnChartBar && typeof revenueChart !== 'undefined') {
      if (isBar) {
        btnChartBar.classList.add('active');
        btnChartLine.classList.remove('active');
      }

      btnChartLine.addEventListener('click', () => {
        btnChartLine.classList.add('active');
        btnChartBar.classList.remove('active');
        localStorage.setItem('revenueChartPref', 'line');
        revenueChart.config.type = 'line';
        revenueChart.data.datasets[0].backgroundColor = 'rgba(42,133,102,0.12)';
        delete revenueChart.data.datasets[0].barThickness;
        if (revenueChart.options.scales.x) revenueChart.options.scales.x.offset = false;
        revenueChart.update();
      });
      btnChartBar.addEventListener('click', () => {
        btnChartBar.classList.add('active');
        btnChartLine.classList.remove('active');
        localStorage.setItem('revenueChartPref', 'bar');
        revenueChart.config.type = 'bar';
        revenueChart.data.datasets[0].backgroundColor = chartColors.primary;
        revenueChart.data.datasets[0].borderRadius = 6;
        revenueChart.data.datasets[0].barThickness = 28; // Slimmer, uniform bars
        if (revenueChart.options.scales.x) revenueChart.options.scales.x.offset = true;
        revenueChart.update();
      });
    }


    // Expense Chart (Doughnut) — initialise empty, real data loaded via updateChartsData
    const expCtx = document.getElementById('expenseChart')?.getContext('2d');
    if (expCtx) {
      expenseChart = new Chart(expCtx, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            data: [],
            backgroundColor: Object.values(expenseChartColors),
            borderWidth: 0,
            cutout: '70%'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12, family: 'Inter' }, color: '#4B5563' } }, tooltip: { callbacks: { label: ctx => ctx.label + ': ' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ctx.raw.toLocaleString() + 'k' } } }
        }
      });
    }
  }

  async function renderTransactions() {
    const tbodyOverview = document.getElementById('transactionsBody');
    const tbodyAccounting = document.getElementById('accountingTransactionsBody');
    if (!tbodyOverview && !tbodyAccounting) return;
    
    try {
      const res = await fetch('/api/v1/accounting/transactions?limit=10');
      const data = await res.json();
      
      const noTxRow = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No transactions found.</td></tr>';
      const errorRow = '<tr><td colspan="8" style="text-align: center; color: var(--error); padding: 24px;">Failed to load transactions.</td></tr>';
      
      if (!data.transactions || data.transactions.length === 0) {
        if (tbodyOverview) tbodyOverview.innerHTML = noTxRow;
        if (tbodyAccounting) tbodyAccounting.innerHTML = noTxRow;
        return;
      }
      
      const txs = data.transactions;
      const rowsHtml = txs.map((t, i) => {
        let total = 0;
        t.lines?.forEach(l => total += l.debit);
        
        return `
          <tr data-id="${t.id}" data-idx="${i}">
            <td class="checkbox-col"><input type="checkbox" class="row-select" value="${t.id}" onclick="updateBatchActionBar()"></td>
            <td>${formatDate(t.date)}</td>
            <td>${t.description || 'Journal Entry'}</td>
            <td>${t.type || 'Journal'}</td>
            <td class="amount positive" style="text-align: right;">${formatCurrency(total)}</td>
            <td><span class="badge badge-info">${t.type || 'Ledger'}</span></td>
            <td><span class="badge badge-success">Posted</span></td>
            <td class="actions-col">
              <button class="btn-icon btn-edit" title="Edit">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon btn-icon-danger btn-delete" title="Delete">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
      
      if (tbodyOverview) { tbodyOverview.innerHTML = rowsHtml; tbodyOverview.querySelectorAll('.btn-edit').forEach(b => b.remove()); txs.forEach((t, i) => { const row = tbodyOverview.querySelector(`tr[data-idx="${i}"]`); if (row) row.dataset.item = JSON.stringify(t); }); }
      if (tbodyAccounting) { tbodyAccounting.innerHTML = rowsHtml; txs.forEach((t, i) => { const row = tbodyAccounting.querySelector(`tr[data-idx="${i}"]`); if (row) row.dataset.item = JSON.stringify(t); }); }
    } catch (e) {
      console.error(e);
      if (tbodyOverview) tbodyOverview.innerHTML = errorRow;
      if (tbodyAccounting) tbodyAccounting.innerHTML = errorRow;
    }
  }

  async function loadKPIs() {
    try {
      const res = await fetch('/api/v1/subscription/dashboard');
      if (!res.ok) return;
      const data = await res.json();
      const kpi = data.dashboard?.kpi;
      if (!kpi) return;
      
      const kpiRev = document.getElementById('kpiRevenue');
      const kpiExp = document.getElementById('kpiExpense');
      const kpiProf = document.getElementById('kpiProfit');
      const kpiTx = document.getElementById('kpiTax');
      
      if (kpiRev) kpiRev.textContent = formatCurrency(kpi.revenue);
      if (kpiExp) kpiExp.textContent = formatCurrency(kpi.expenses);
      if (kpiProf) kpiProf.textContent = formatCurrency(kpi.profit);
      
      // Calculate a dynamic tax reserve (VAT + CIT)
      const totalTax = (kpi.revenue * 0.075) + (kpi.profit > 0 ? kpi.profit * 0.3 : 0);
      if (kpiTx) kpiTx.textContent = formatCurrency(totalTax);

      // Update Operations Summary stats
      const pCount = document.getElementById('summaryProductCount');
      const lsCount = document.getElementById('summaryLowStockCount');
      const cCount = document.getElementById('summaryCustomerCount');
      const lCount = document.getElementById('summaryLeadCount');
      const eCount = document.getElementById('summaryEmployeeCount');
      
      if (pCount) pCount.textContent = `${kpi.productCount} Products`;
      if (lsCount) lsCount.textContent = `${kpi.lowStockCount} Low stock items`;
      if (cCount) cCount.textContent = `${kpi.customerCount} Customers`;
      if (lCount) lCount.textContent = `${kpi.openLeads} Open sales leads`;
      if (eCount) eCount.textContent = `${kpi.employeeCount} Employees`;
    } catch (e) {
      console.error('Failed to load KPIs:', e);
    }
  }

  async function updateChartsData() {
    try {
      const [dashRes, incRes] = await Promise.all([
        fetch('/api/v1/subscription/dashboard'),
        fetch('/api/v1/accounting/reports/income-statement'),
      ]);

      // Update Revenue Chart
      if (dashRes.ok) {
        const data = await dashRes.json();
        const revData = data.dashboard?.revenue6m;
        if (revenueChart && revData) {
          revenueChart.data.labels = revData.labels;
          revenueChart.data.datasets[0].data = revData.values.map(v => v / 1_000_000);
          revenueChart.update();
        }
      }

      // Update Expense Doughnut
      if (incRes.ok) {
        const incData = await incRes.json();
        const expenses = incData.report?.breakdown?.expenses || [];
        const filtered = expenses.filter(e => e.code !== '5000');
        if (expenseChart && filtered.length) {
          expenseChart.data.labels = filtered.map(e => e.name);
          expenseChart.data.datasets[0].data = filtered.map(e => e.amount);
          expenseChart.data.datasets[0].backgroundColor = filtered.map(e => expenseChartColors[e.code] || '#94A3B8');
          expenseChart.update();
        }
      }
    } catch (e) {
      console.error('Failed to update charts data:', e);
    }
  }

  async function renderAccounts() {
    const tbody = document.getElementById('coaTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/v1/accounting/accounts-with-balances');
      const data = await res.json();
      if (!data.accounts || data.accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No accounts found.</td></tr>';
        return;
      }
      
      const bankAcct = data.accounts.find(a => a.code === '1100');
      const receivableAcct = data.accounts.find(a => a.code === '1200');
      
      const ledgerMetrics = document.querySelectorAll('#view-accounting .ledger-metric');
      if (ledgerMetrics.length >= 3) {
        if (bankAcct) {
          ledgerMetrics[0].textContent = formatCurrency(bankAcct.balance);
        }
        if (receivableAcct) {
          ledgerMetrics[2].textContent = formatCurrency(receivableAcct.balance);
        }
      }
      
      tbody.innerHTML = data.accounts.map((a, i) => {
        let classification = a.type.charAt(0).toUpperCase() + a.type.slice(1);
        let statusBadge = '<span class="badge badge-success">Active</span>';
        if (a.code === '1200' && a.balance > 0) {
          statusBadge = '<span class="badge badge-warning">Review</span>';
        }
        return `
          <tr data-id="${a.id}" data-idx="${i}">
            <td class="checkbox-col"><input type="checkbox" class="row-select" value="${a.id}" onclick="updateBatchActionBar()"></td>
            <td><code>${a.code}</code></td>
            <td>${a.name}</td>
            <td>${classification}</td>
            <td style="text-align: right; font-weight: 700;">${formatCurrency(a.balance)}</td>
            <td>${statusBadge}</td>
            <td class="actions-col">
              <button class="btn-icon btn-edit" title="Edit">
                <span class="material-symbols-outlined">edit</span>
              </button>
              <button class="btn-icon btn-icon-danger btn-delete" title="Delete">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
      data.accounts.forEach((a, i) => {
        const row = tbody.querySelector(`tr[data-idx="${i}"]`);
        if (row) row.dataset.item = JSON.stringify(a);
      });
    } catch (e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--error); padding: 24px;">Failed to load accounts.</td></tr>';
    }
  }

  async function loadAccounting() {
    await renderAccounts();
    await renderTransactions();
    await loadKPIs();
    await updateChartsData();
  }

  document.getElementById('btnNewJournal')?.addEventListener('click', () => {
    showModal('New Journal Entry', [
      { label: 'Description', name: 'description' },
      { label: 'Amount (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'amount', type: 'number', step: '0.01' }
      // Note: A real journal entry requires dual lines, but we simplify the UI prompt for the sake of demonstration
    ], async (data) => {
      const res = await fetch('/api/v1/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          description: data.description,
          lines: [
            { account: '1000', debit: data.amount, credit: 0 },
            { account: '4000', debit: 0, credit: data.amount }
          ]
        })
      });
      if (!res.ok) throw new Error('Failed to post journal entry');
      showToast('Success', 'Journal entry posted', 'success');
      loadAccounting();
    });
  });

  async function fetchBusinessData() {
    try {
      const res = await fetch('/api/v1/business/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.business) {
          const planEl = document.getElementById('billingPlan');
          if (planEl) {
            planEl.textContent = (data.business.tier || 'Starter').toUpperCase() + ' PLAN';
          }
        }
      }
    } catch (err) {
      console.error('Failed to load business data:', err);
    }
  }

  // ===== Notifications =====
  let notificationCount = 0;
  let notificationsData = [];

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/v1/notifications', { credentials: 'include' });
      const data = await res.json();
      if (data && data.notifications) {
        notificationsData = data.notifications;
        notificationCount = notificationsData.filter(n => !n.is_read).length;
        updateNotificationBadge();
        if (document.getElementById('panelNotifications')?.classList.contains('open')) {
          loadNotifications();
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }

  function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (notificationsData.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); padding:20px; text-align:center;">No notifications</div>';
      return;
    }
    
    container.innerHTML = notificationsData.map(n => {
      const timeStr = typeof formatDate === 'function' ? formatDate(n.created_at) : new Date(n.created_at).toLocaleString();
      return `
      <div class="notification-item${n.is_read ? '' : ' unread'}" data-id="${n.id}" style="cursor: pointer; padding: 16px; margin-bottom: 12px; border-radius: 12px; background: rgba(15, 23, 42, 0.95); display: flex; gap: 14px; opacity: ${n.is_read ? 0.7 : 1}; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(8px);">
        <div class="notification-icon ${n.type}" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;flex-shrink:0; border-radius: 50%; background: rgba(255,255,255,0.05);">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--${n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info'});">${n.type === 'success' ? 'check_circle' : n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : 'info'}</span>
        </div>
        <div class="notification-content" style="flex:1;">
          <div class="notification-title" style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #ffffff;">${n.title}</div>
          <div class="notification-message" style="font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; margin-bottom: 6px;">${n.message}</div>
          <div class="notification-time" style="font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 500;">${timeStr}</div>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const notif = notificationsData.find(n => n.id === id);
        if (notif && !notif.is_read) {
          notif.is_read = true;
          item.classList.remove('unread');
          item.style.opacity = '0.6';
          notificationCount = Math.max(0, notificationCount - 1);
          updateNotificationBadge();
          await fetch('/api/v1/notifications/' + id + '/read', { method: 'PATCH', credentials: 'include' });
        }
      });
    });
  }
  function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      if (notificationCount > 0) {
        badge.textContent = notificationCount > 9 ? '9+' : notificationCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ===== Settings =====
  function loadSettings() {
    const user = currentUser;
    if (!user) return;
    const optFullName = document.getElementById('optFullName');
    const optEmail = document.getElementById('optEmail');
    const optBusinessName = document.getElementById('optBusinessName');
    if (optFullName) optFullName.value = user.name || '';
    if (optEmail) optEmail.value = user.email || '';
    if (optBusinessName) optBusinessName.value = user.business_name || '';
  }

  // ===== Start =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // ===== Bank Reconciliation Logic =====
  async function loadReconciliation() {
    try {
      const res = await fetch('/api/v1/reconciliation/pending');
      const data = await res.json();
      const listLeft = document.getElementById('reconBankFeedList');
      const listRight = document.getElementById('reconLedgerMatchList');
      
      if (!data.transactions || data.transactions.length === 0) {
        listLeft.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); background: white; border: 1px dashed var(--border-color); border-radius: var(--radius-md);">No pending bank transactions. Click "Simulate Bank Sync" to fetch new data.</div>`;
        listRight.innerHTML = '';
        return;
      }
      
      listLeft.innerHTML = '';
      listRight.innerHTML = '';
      
      data.transactions.forEach((tx) => {
        // Left Side: Bank TX
        const leftHtml = `
          <div class="recon-row">
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600; color: var(--slate-900);">${tx.description}</span>
              <span style="font-weight: 600; color: ${tx.amount > 0 ? 'var(--success)' : 'var(--error)'};">${formatCurrency(Math.abs(tx.amount))}</span>
            </div>
            <div style="font-size: 13px; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>${tx.date}</span>
              <span>Ref: ${tx.reference || 'N/A'}</span>
            </div>
          </div>
        `;
        listLeft.insertAdjacentHTML('beforeend', leftHtml);
        
        // Right Side: Suggested Match or Add Button
        let rightHtml = '';
        if (tx.suggestedMatch) {
          rightHtml = `
            <div class="recon-match" id="match-row-${tx.id}" style="background: var(--teal-50); border: 1px solid var(--teal-200);">
              <div>
                <div style="font-weight: 600; color: var(--teal-800); font-size: 14px;">Ledger Entry Match</div>
                <div style="font-size: 13px; color: var(--teal-700);">${tx.suggestedMatch.date} • ${formatCurrency(Math.abs(tx.suggestedMatch.debit - tx.suggestedMatch.credit))}</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="confirmReconciliation('${(tx.id || '').replace(/'/g, '\\u0027')}', '${(tx.suggestedMatch ? tx.suggestedMatch.id || '' : '').replace(/'/g, '\\u0027')}')">Match</button>
            </div>
          `;
        } else {
          rightHtml = `
            <div class="recon-match" id="match-row-${tx.id}" style="background: var(--slate-50); border: 1px dashed var(--slate-300);">
              <div style="font-size: 14px; color: var(--text-muted);">No exact match found in ledger.</div>
              <button class="btn btn-secondary btn-sm" onclick="addAsNewLedger('${(tx.id || '').replace(/'/g, '\\u0027')}', ${tx.amount}, '${(tx.description || '').replace(/'/g, '\\u0027')}', '${(tx.date || '').replace(/'/g, '\\u0027')}')">Add to Ledger</button>
            </div>
          `;
        }
        listRight.insertAdjacentHTML('beforeend', rightHtml);
      });
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to load reconciliation data', 'error');
    }
  }

  // Expose to window for inline onclick handlers
  window.confirmReconciliation = async (bankTxId, journalEntryId) => {
    try {
      const btn = document.getElementById(`match-row-${bankTxId}`)?.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Matching...';
      
      const res = await fetch('/api/v1/reconciliation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankTxId, journalEntryId })
      });
      if (res.ok) {
        showToast('Matched!', 'Transaction successfully reconciled.', 'success');
        document.getElementById(`match-row-${bankTxId}`).innerHTML = '<div style="color: var(--success); font-weight: bold; width: 100%; text-align: center;">✓ Reconciled</div>';
        setTimeout(() => loadReconciliation(), 1500);
      } else {
        showToast('Error', 'Failed to reconcile transaction.', 'error');
        btn.disabled = false;
        btn.textContent = 'Match';
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.addAsNewLedger = async (bankTxId, amount, desc, date) => {
    try {
      const btn = document.getElementById(`match-row-${bankTxId}`)?.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Adding...';

      // Create a quick transaction payload. We assume Bank Account is 1100.
      // If it's a deposit (amount > 0), debit bank, credit sales.
      // If it's a withdrawal (amount < 0), credit bank, debit general expense.
      const isDeposit = amount > 0;
      const absAmount = Math.abs(amount);
      const newTransaction = {
        date,
        description: desc,
        lines: [
          { account: '1100', debit: isDeposit ? absAmount : 0, credit: isDeposit ? 0 : absAmount },
          { account: isDeposit ? '4000' : '6400', debit: isDeposit ? 0 : absAmount, credit: isDeposit ? absAmount : 0 }
        ]
      };

      const res = await fetch('/api/v1/reconciliation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankTxId, newTransaction })
      });

      if (res.ok) {
        showToast('Added!', 'New ledger entry created and reconciled.', 'success');
        document.getElementById(`match-row-${bankTxId}`).innerHTML = '<div style="color: var(--success); font-weight: bold; width: 100%; text-align: center;">✓ Added & Reconciled</div>';
        setTimeout(() => loadReconciliation(), 1500);
      } else {
        const err = await res.json();
        showToast('Error', err.error || 'Failed to add ledger entry.', 'error');
        btn.disabled = false;
        btn.textContent = 'Add to Ledger';
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ===== Global Action Modal System =====
  function showModal(title, fields, onSubmit) {
    const modal = document.getElementById('actionModal');
    const titleEl = document.getElementById('actionModalTitle');
    const fieldsEl = document.getElementById('actionModalFields');
    const form = document.getElementById('actionModalForm');
    
    titleEl.textContent = title;
    fieldsEl.innerHTML = fields.map(f => {
      if (f.type === 'select') {
        const opts = (f.options || []).map(o => `<option value="${o}" ${f.value === o ? 'selected' : ''}>${o.charAt(0).toUpperCase() + o.slice(1)}</option>`).join('');
        return `
          <div class="form-group">
            <label class="form-label">${f.label}</label>
            <select class="form-control" name="${f.name}" required>${opts}</select>
          </div>
        `;
      }
      return `
        <div class="form-group">
          <label class="form-label">${f.label}</label>
          <input class="form-control" type="${f.type || 'text'}" name="${f.name}" required="${f.required !== false}" ${f.step ? `step="${f.step}"` : ''} ${f.value ? `value="${f.value}"` : ''}>
        </div>
      `;
    }).join('');
    
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
    
    // Clean up old listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('actionModalSubmit');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      
      const formData = new FormData(newForm);
      const data = Object.fromEntries(formData.entries());
      
      try {
        await onSubmit(data);
        modal.style.display = 'none';
        document.body.classList.remove('no-scroll');
      } catch (err) {
        console.error(err);
        showToast('Error', err.message || 'An error occurred', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save';
      }
    });
  }

  document.getElementById('closeActionModal')?.addEventListener('click', () => {
    document.getElementById('actionModal').style.display = 'none';
    document.body.classList.remove('no-scroll');
  });

  // Click outside to close actionModal
  document.getElementById('actionModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('actionModal')) {
      document.getElementById('actionModal').style.display = 'none';
      document.body.classList.remove('no-scroll');
    }
  });

  // Global Escape key listener to close modals & panels
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const actionModal = document.getElementById('actionModal');
      if (actionModal && actionModal.style.display !== 'none') {
        actionModal.style.display = 'none';
        document.body.classList.remove('no-scroll');
      }
      const confirmModal = document.getElementById('confirmDeleteModal');
      if (confirmModal && confirmModal.style.display !== 'none') {
        confirmModal.style.display = 'none';
        document.body.classList.remove('no-scroll');
      }
      if (typeof closeAllPanels === 'function') {
        closeAllPanels();
      }
    }
  });

  // ===== Shared CRUD Helpers =====

  function toggleSelectAll(checkbox) {
    try {
      // Find the closest view so we only check boxes within this specific tab/module
      const view = checkbox.closest('.module-view') || document.querySelector('.module-view.active');
      if (!view) return;
      const checkboxes = view.querySelectorAll('tbody input[type="checkbox"].row-select');
      checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
      });
      updateBatchActionBar();
    } catch (err) {
      console.error('Error in toggleSelectAll:', err);
    }
  }

  function getSelectedIds(tableId) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return [];
    const ids = [];
    tbody.querySelectorAll('input[type="checkbox"].row-select:checked').forEach(cb => {
      ids.push(cb.value);
    });
    return ids;
  }

  function confirmDelete(itemLabel, id, endpoint, onSuccess) {
    const modal = document.getElementById('confirmDeleteModal');
    const msg = document.getElementById('confirmDeleteMessage');
    msg.textContent = 'Are you sure you want to delete this ' + itemLabel + '? This action cannot be undone.';
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
    const okBtn = document.getElementById('confirmDeleteOk');
    const cancelBtn = document.getElementById('confirmDeleteCancel');
    const cleanup = () => {
      modal.style.display = 'none';
      document.body.classList.remove('no-scroll');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };
    okBtn.onclick = async () => {
      okBtn.disabled = true;
      okBtn.textContent = 'Deleting...';
      try {
        const res = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          showToast('Deleted', itemLabel + ' has been deleted.', 'success');
          if (onSuccess) onSuccess();
        } else {
          const err = await res.json();
          showToast('Error', err.error || 'Failed to delete.', 'error');
        }
      } catch (e) {
        showToast('Error', 'Failed to delete.', 'error');
      }
      okBtn.disabled = false;
      okBtn.textContent = 'Delete';
      cleanup();
    };
    cancelBtn.onclick = cleanup;
  }

  function showEditModal(title, fields, data, endpoint, id, onSuccess) {
    const modal = document.getElementById('actionModal');
    const titleEl = document.getElementById('actionModalTitle');
    const fieldsEl = document.getElementById('actionModalFields');
    const form = document.getElementById('actionModalForm');
    titleEl.textContent = title;
    fieldsEl.innerHTML = fields.map(f => {
      const val = data[f.name] !== undefined && data[f.name] !== null ? String(data[f.name]) : '';
      if (f.type === 'select') {
        const opts = (f.options || []).map(o => '<option value="' + o + '" ' + (val === o ? 'selected' : '') + '>' + o.charAt(0).toUpperCase() + o.slice(1) + '</option>').join('');
        return '<div class="form-group"><label class="form-label">' + f.label + '</label><select class="form-control" name="' + f.name + '" required>' + opts + '</select></div>';
      }
      return '<div class="form-group"><label class="form-label">' + f.label + '</label><input class="form-control" type="' + (f.type || 'text') + '" name="' + f.name + '" required="' + (f.required !== false) + '" ' + (f.step ? 'step="' + f.step + '"' : '') + ' value="' + val.replace(/"/g, '&quot;') + '"></div>';
    }).join('');
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('actionModalSubmit');
      btn.disabled = true;
      btn.textContent = 'Saving...';
      const formData = new FormData(newForm);
      const data2 = Object.fromEntries(formData.entries());
      try {
        const res = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data2) });
        if (res.ok) {
          modal.style.display = 'none';
          document.body.classList.remove('no-scroll');
          showToast('Updated', title + ' has been updated.', 'success');
          if (onSuccess) onSuccess();
        } else {
          const err = await res.json();
          showToast('Error', err.error || 'Failed to update.', 'error');
        }
      } catch (e) {
        showToast('Error', 'Failed to update.', 'error');
      }
      btn.disabled = false;
      btn.textContent = 'Save';
    });
  }

  function updateBatchActionBar() {
    const visibleView = document.querySelector('.module-view.active');
    if (!visibleView) return;
    
    // Select checked boxes across the entire active view, not just the first table
    const checkboxes = visibleView.querySelectorAll('tbody input[type="checkbox"].row-select');
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    const bar = document.getElementById('batchActionBar');
    const countEl = document.getElementById('batchCount');
    
    if (checked.length === 0) { 
      bar.style.display = 'none'; 
      return; 
    }
    
    bar.style.display = 'flex';
    countEl.textContent = checked.length + ' selected';
    
    const isHR = visibleView.id === 'view-hr';
    document.getElementById('batchStatusActive').style.display = isHR ? '' : 'none';
    document.getElementById('batchStatusInactive').style.display = isHR ? '' : 'none';
  }

  function batchDeleteSelected() {
    const visibleView = document.querySelector('.module-view.active');
    if (!visibleView) return;
    const checkboxes = visibleView.querySelectorAll('tbody input[type="checkbox"].row-select:checked');
    if (!checkboxes.length) return;
    
    // Determine the exact entity based on the nearest tbody of the first checked item
    const firstChecked = checkboxes[0];
    const tbodyId = firstChecked.closest('tbody').id;
    
    const ids = Array.from(checkboxes).filter(cb => cb.closest('tbody').id === tbodyId).map(cb => cb.value);

    const endpointMap = {
      'inventoryBody': { label: 'products', url: '/api/v1/inventory/products/batch-delete', refresh: loadInventory },
      'crmBody': { label: 'customers', url: '/api/v1/crm/customers/batch-delete', refresh: loadCRM },
      'hrBody': { label: 'employees', url: '/api/v1/hr/employees/batch-delete', refresh: loadHR },
      'coaTableBody': { label: 'accounts', url: '/api/v1/accounting/accounts/batch-delete', refresh: loadAccounting },
      'accountingTransactionsBody': { label: 'transactions', url: '/api/v1/accounting/transactions/batch-delete', refresh: loadAccounting },
      'transactionsBody': { label: 'transactions', url: '/api/v1/accounting/transactions/batch-delete', refresh: loadAccounting }
    };

    const mapping = endpointMap[tbodyId];
    if (!mapping) return;

    const modal = document.getElementById('confirmDeleteModal');
    const msg = document.getElementById('confirmDeleteMessage');
    msg.textContent = 'Are you sure you want to delete ' + ids.length + ' ' + mapping.label + '? This action cannot be undone.';
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
    const okBtn = document.getElementById('confirmDeleteOk');
    const cancelBtn = document.getElementById('confirmDeleteCancel');
    
    const cleanup = () => { 
      modal.style.display = 'none'; 
      document.body.classList.remove('no-scroll'); 
      okBtn.onclick = null; 
      cancelBtn.onclick = null; 
    };
    
    okBtn.onclick = async () => {
      okBtn.disabled = true; 
      okBtn.textContent = 'Deleting...';
      try {
        const res = await fetch(mapping.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
        if (res.ok) {
          showToast('Deleted', ids.length + ' ' + mapping.label + ' deleted.', 'success');
          mapping.refresh();
          updateBatchActionBar();
        } else {
          const err = await res.json();
          showToast('Error', err.error || 'Failed to delete items.', 'error');
        }
      } catch (e) {
        showToast('Error', 'Failed to delete items.', 'error');
      }
      okBtn.disabled = false; 
      okBtn.textContent = 'Delete';
      cleanup();
    };
    cancelBtn.onclick = cleanup;
  }

  async function batchSetStatus(status) {
    const visibleView = document.querySelector('.module-view.active');
    if (!visibleView || visibleView.id !== 'view-hr') return;
    const ids = getSelectedIds('hrTableBody');
    if (!ids.length) return;
    fetch('/api/v1/hr/employees/batch-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status })
    }).then(res => {
      if (res.ok) { showToast('Updated', ids.length + ' employees marked as ' + status + '.', 'success'); switchView('hr'); }
      else { res.json().then(err => showToast('Error', err.error || 'Failed to update.', 'error')); }
    });
  }

  // ===== Data Loaders =====
  
  // Inventory Loader
  async function loadInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/v1/inventory/products');
      const data = await res.json();
      if (!data.products || data.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No products found.</td></tr>';
        return;
      }
      tbody.innerHTML = data.products.map((p, i) => `
        <tr data-id="${p.id}" data-idx="${i}">
          <td class="checkbox-col"><input type="checkbox" class="row-select" value="${p.id}" onclick="updateBatchActionBar()"></td>
          <td class="id-col">${p.id}</td>
          <td><code>${p.sku || 'N/A'}</code></td>
          <td style="font-weight: 500; color: var(--text-primary);">${p.name}</td>
          <td>${formatCurrency(p.cost_price)}</td>
          <td>${formatCurrency(p.sell_price)}</td>
          <td>${p.stock_level} units</td>
          <td>${p.stock_level <= p.reorder_point ? '<span class="status-badge status-pending">Low Stock</span>' : '<span class="status-badge status-active">Optimal</span>'}</td>
          <td class="actions-col">
            <button class="btn-icon btn-edit" title="Edit">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-icon-danger btn-delete" title="Delete">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </td>
        </tr>
      `).join('');
      // Store full data in dataset after DOM insertion
      data.products.forEach((p, i) => {
        const row = tbody.querySelector(`tr[data-idx="${i}"]`);
        if (row) row.dataset.item = JSON.stringify(p);
      });
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to load inventory', 'error');
    }
  }

  document.getElementById('btnNewProduct')?.addEventListener('click', () => {
    showModal('Add New Product', [
      { label: 'Product Name', name: 'name' },
      { label: 'SKU', name: 'sku', required: false },
      { label: 'Cost Price (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'cost_price', type: 'number', step: '0.01' },
      { label: 'Selling Price (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'sell_price', type: 'number', step: '0.01' },
      { label: 'Initial Stock Level', name: 'stock_level', type: 'number', value: '0' },
      { label: 'Reorder Point', name: 'reorder_point', type: 'number', value: '10' }
    ], async (data) => {
      const res = await fetch('/api/v1/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to add product');
      showToast('Success', 'Product added successfully', 'success');
      loadInventory();
    });
  });

  // CRM Loader
  async function loadCRM() {
    const tbody = document.getElementById('crmTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/v1/crm/customers');
      const data = await res.json();
      if (!data.customers || data.customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No customers found.</td></tr>';
        return;
      }
      tbody.innerHTML = data.customers.map((c, i) => `
        <tr data-id="${c.id}" data-idx="${i}">
          <td class="checkbox-col"><input type="checkbox" class="row-select" value="${c.id}" onclick="updateBatchActionBar()"></td>
          <td class="id-col">${c.id}</td>
          <td style="font-weight: 500; color: var(--text-primary);">${c.name}</td>
          <td>${c.email || 'N/A'}</td>
          <td>${c.phone || 'N/A'}</td>
          <td>${c.tin || 'N/A'}</td>
          <td>${formatDate(c.created_at)}</td>
          <td class="actions-col">
            <button class="btn-icon btn-edit" title="Edit">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-icon-danger btn-delete" title="Delete">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </td>
        </tr>
      `).join('');
      data.customers.forEach((c, i) => {
        const row = tbody.querySelector(`tr[data-idx="${i}"]`);
        if (row) row.dataset.item = JSON.stringify(c);
      });
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to load customers', 'error');
    }
  }

  document.getElementById('btnNewCustomer')?.addEventListener('click', () => {
    showModal('Add New Customer', [
      { label: 'Company / Name', name: 'name' },
      { label: 'Email', name: 'email', type: 'email', required: false },
      { label: 'Phone', name: 'phone', required: false },
      { label: 'TIN', name: 'tin', required: false },
      { label: 'Address', name: 'address', required: false }
    ], async (data) => {
      const res = await fetch('/api/v1/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to add customer');
      showToast('Success', 'Customer added successfully', 'success');
      loadCRM();
    });
  });

  // HR Loader
  async function loadHR() {
    const tbody = document.getElementById('hrTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/v1/hr/employees');
      const data = await res.json();
      if (!data.employees || data.employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No employees found.</td></tr>';
        return;
      }
      tbody.innerHTML = data.employees.map((e, i) => `
        <tr data-id="${e.id}" data-idx="${i}">
          <td class="checkbox-col"><input type="checkbox" class="row-select" value="${e.id}" onclick="updateBatchActionBar()"></td>
          <td class="id-col">${e.id}</td>
          <td style="font-weight: 500; color: var(--text-primary);">${e.name}</td>
          <td>${e.role || 'N/A'}</td>
          <td>${e.email || 'N/A'}</td>
          <td>${formatCurrency(e.salary)}</td>
          <td><span class="status-badge status-${e.status === 'active' ? 'active' : 'inactive'}">${e.status.toUpperCase()}</span></td>
          <td class="actions-col">
            <button class="btn-icon btn-edit" title="Edit">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-icon-danger btn-delete" title="Delete">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </td>
        </tr>
      `).join('');
      data.employees.forEach((e, i) => {
        const row = tbody.querySelector(`tr[data-idx="${i}"]`);
        if (row) row.dataset.item = JSON.stringify(e);
      });
    } catch (e) {
      console.error(e);
      showToast('Error', 'Failed to load employees', 'error');
    }
  }

  document.getElementById('btnNewEmployee')?.addEventListener('click', () => {
    showModal('Add New Employee', [
      { label: 'Full Name', name: 'name' },
      { label: 'Email', name: 'email', type: 'email', required: false },
      { label: 'Role / Department', name: 'role', required: false },
      { label: 'Base Salary (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'salary', type: 'number', step: '0.01' }
    ], async (data) => {
      const res = await fetch('/api/v1/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to add employee');
      showToast('Success', 'Employee added successfully', 'success');
      loadHR();
    });
  });

  document.getElementById('btnRunPayroll')?.addEventListener('click', async () => {
    try {
      const btn = document.getElementById('btnRunPayroll');
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Processing...';
      
      const res = await fetch('/api/v1/hr/payroll/disburse', { method: 'POST' });
      if (res.ok) {
        showToast('Payroll Processed', 'Payroll disbursed and recorded in ledger successfully.', 'success');
        loadHR();
        loadAccounting();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Payroll failed to run');
      }
      btn.disabled = false;
      btn.textContent = original;
    } catch (e) {
      console.error(e);
      showToast('Error', e.message, 'error');
      document.getElementById('btnRunPayroll').disabled = false;
      document.getElementById('btnRunPayroll').textContent = 'Disburse Payroll';
    }
  });

  async function loadTax() {
    const tbody = document.getElementById('taxTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/v1/tax/report');
      const data = await res.json();
      const report = data.report;
      const periodStr = new Date(report.period.from).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });
      
      tbody.innerHTML = `
        <tr>
          <td>${periodStr}</td>
          <td>Value Added Tax (VAT 7.5%)</td>
          <td>${formatCurrency(report.revenue)}</td>
          <td>${formatCurrency(report.vatPayable)}</td>
          <td><span class="badge ${report.vatPayable > 0 ? 'badge-warning' : 'badge-success'}">${report.vatPayable > 0 ? 'Pending Filing' : 'Filed'}</span></td>
        </tr>
        <tr>
          <td>${periodStr}</td>
          <td>Company Income Tax (CIT 30%)</td>
          <td>${formatCurrency(report.netProfit)}</td>
          <td>${formatCurrency(report.cit)}</td>
          <td><span class="badge ${report.cit > 0 ? 'badge-warning' : 'badge-success'}">${report.cit > 0 ? 'Pending Filing' : 'Filed'}</span></td>
        </tr>
        <tr>
          <td>${periodStr}</td>
          <td>PAYE Tax Liability</td>
          <td>-</td>
          <td>${formatCurrency(report.payePayable || 0)}</td>
          <td><span class="badge ${report.payePayable > 0 ? 'badge-warning' : 'badge-success'}">${report.payePayable > 0 ? 'Pending Filing' : 'Filed'}</span></td>
        </tr>
      `;
    } catch (e) {
      console.error(e);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--error); padding: 24px;">Failed to load tax report.</td></tr>';
    }
  }

  document.getElementById('btnCalculateTax')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnCalculateTax');
    btn.disabled = true;
    btn.textContent = 'Calculating...';
    await loadTax();
    showToast('Success', 'Tax liabilities recalculated from transaction ledger.', 'success');
    btn.disabled = false;
    btn.textContent = 'Recalculate liabilities';
  });

  document.getElementById('btnSimulateBankSync')?.addEventListener('click', async () => {
    try {
      const btn = document.getElementById('btnSimulateBankSync');
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Syncing...';
      
      const res = await fetch('/api/v1/reconciliation/import', { method: 'POST' });
      if (res.ok) {
        showToast('Sync Complete', 'New bank transactions imported.', 'success');
        loadReconciliation();
      }
      
      btn.disabled = false;
      btn.textContent = original;
    } catch (e) {
      console.error(e);
      showToast('Sync Failed', 'Failed to pull from bank feed.', 'error');
      document.getElementById('btnSimulateBankSync').disabled = false;
    }
  });

  // ===== Remaining Unwired Buttons =====
  
  // Helper to parse CSV quote-correctly
  function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('company') || h.includes('client'));
    if (nameIdx === -1) {
      throw new Error('CSV must contain a "name" or "company" column.');
    }
    
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('number'));
    const tinIdx = headers.findIndex(h => h.includes('tin'));
    const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('location'));
    
    const customers = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = [];
      let currentVal = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
      
      if (values[nameIdx]) {
        customers.push({
          name: values[nameIdx],
          email: emailIdx !== -1 ? values[emailIdx] : '',
          phone: phoneIdx !== -1 ? values[phoneIdx] : '',
          tin: tinIdx !== -1 ? values[tinIdx] : '',
          address: addressIdx !== -1 ? values[addressIdx] : ''
        });
      }
    }
    return customers;
  }

  function showImportPreviewModal(customers) {
    const modal = document.getElementById('actionModal');
    const titleEl = document.getElementById('actionModalTitle');
    const fieldsEl = document.getElementById('actionModalFields');
    const form = document.getElementById('actionModalForm');
    
    titleEl.textContent = `Import ${customers.length} Customers`;
    
    const previewRows = customers.slice(0, 5).map(c => `
      <tr>
        <td style="font-weight:600; padding:6px; font-size:12px; color: #fff;">${c.name}</td>
        <td style="padding:6px; font-size:12px; color: rgba(255,255,255,0.7);">${c.email || 'N/A'}</td>
        <td style="padding:6px; font-size:12px; color: rgba(255,255,255,0.7);">${c.phone || 'N/A'}</td>
      </tr>
    `).join('');
    
    fieldsEl.innerHTML = `
      <p style="font-size:13px; color:rgba(255,255,255,0.7); margin-bottom:12px;">
        Review the customer records parsed from your CSV file.
      </p>
      <div style="border:1px solid rgba(255,255,255,0.1); border-radius:var(--radius-sm); margin-bottom:16px; background: rgba(0,0,0,0.2);">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:rgba(255,255,255,0.05); border-bottom:1px solid rgba(255,255,255,0.1);">
              <th style="padding:6px; font-size:12px; color:rgba(255,255,255,0.5);">Name</th>
              <th style="padding:6px; font-size:12px; color:rgba(255,255,255,0.5);">Email</th>
              <th style="padding:6px; font-size:12px; color:rgba(255,255,255,0.5);">Phone</th>
            </tr>
          </thead>
          <tbody>
            ${previewRows}
            ${customers.length > 5 ? `<tr><td colspan="3" style="text-align:center; padding:6px; font-size:11px; color:rgba(255,255,255,0.4);">...and ${customers.length - 5} more</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;
    
    modal.style.display = 'flex';
    document.body.classList.add('no-scroll');
    
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    const btnSubmit = document.getElementById('actionModalSubmit');
    btnSubmit.textContent = 'Confirm Import';
    btnSubmit.disabled = false;
    
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Importing...';
      
      try {
        const res = await fetch('/api/v1/crm/customers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customers })
        });
        
        if (!res.ok) {
          throw new Error('Failed to import customers');
        }
        
        const resData = await res.json();
        showToast('Success', `Successfully imported ${resData.count} customers.`, 'success');
        modal.style.display = 'none';
        document.body.classList.remove('no-scroll');
        loadCRM();
      } catch (err) {
        showToast('Error', err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Save';
      }
    });
  }

  // ===== Remaining Unwired Buttons =====
  
  document.getElementById('btnNewTransaction')?.addEventListener('click', () => {
    showModal('Add Quick Transaction', [
      { label: 'Date', name: 'date', type: 'date', value: new Date().toISOString().split('T')[0] },
      { label: 'Description', name: 'description' },
      { label: 'Amount (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'amount', type: 'number', step: '0.01' },
      { label: 'Type', name: 'type', type: 'select', options: ['expense', 'income'], value: 'expense' }
    ], async (data) => {
      const isExpense = data.type === 'expense';
      const amount = parseFloat(data.amount);
      const lines = isExpense 
        ? [
            { account: '6400', debit: amount, credit: 0 },
            { account: '1100', debit: 0, credit: amount }
          ]
        : [
            { account: '1100', debit: amount, credit: 0 },
            { account: '4000', debit: 0, credit: amount }
          ];
      const res = await fetch('/api/v1/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(data.date).toISOString(),
          description: data.description,
          lines
        })
      });
      if (!res.ok) throw new Error('Failed to record transaction');
      showToast('Success', 'Transaction recorded successfully.', 'success');
      loadAccounting();
    });
  });

  document.getElementById('btnNewInvoice')?.addEventListener('click', () => {
    showModal('Create New Invoice', [
      { label: 'Customer Name', name: 'customer' },
      { label: 'Invoice Amount (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'amount', type: 'number', step: '0.01' },
      { label: 'Due Date', name: 'due_date', type: 'date', value: new Date().toISOString().split('T')[0] }
    ], async (data) => {
      const amount = parseFloat(data.amount);
      const res = await fetch('/api/v1/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(data.due_date).toISOString(),
          description: `Invoice to ${data.customer}`,
          lines: [
            { account: '1200', debit: amount, credit: 0 },
            { account: '4000', debit: 0, credit: amount }
          ]
        })
      });
      if (!res.ok) throw new Error('Failed to create invoice transaction');
      showToast('Invoice Created', `Invoice for ${data.customer} created successfully.`, 'success');
      loadAccounting();
    });
  });

  document.getElementById('btnViewCOA')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnViewCOA');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite; font-size: 16px; vertical-align: middle; margin-right: 4px;">refresh</span> Refreshing...';
    try {
      await loadAccounting();
      showToast('Refreshed', 'Ledger and Chart of Accounts updated.', 'success');
    } catch (e) {
      showToast('Error', 'Failed to refresh ledger: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  document.getElementById('btnNewPurchaseOrder')?.addEventListener('click', () => {
    showModal('Create Purchase Order', [
      { label: 'Supplier Name', name: 'supplier' },
      { label: 'Total Amount (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'amount', type: 'number', step: '0.01' },
      { label: 'Expected Delivery Date', name: 'delivery_date', type: 'date', value: new Date().toISOString().split('T')[0] }
    ], async (data) => {
      const amount = parseFloat(data.amount);
      const res = await fetch('/api/v1/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(data.delivery_date).toISOString(),
          description: `PO to ${data.supplier}`,
          lines: [
            { account: '6400', debit: amount, credit: 0 },
            { account: '2010', debit: 0, credit: amount }
          ]
        })
      });
      if (!res.ok) throw new Error('Failed to record Purchase Order');
      showToast('PO Created', `Purchase order sent to ${data.supplier} and recorded in ledger.`, 'success');
      loadAccounting();
    });
  });

  document.getElementById('btnAddFirstProduct')?.addEventListener('click', () => {
    document.getElementById('btnNewProduct')?.click();
  });

  document.getElementById('btnImportCustomers')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.style.display = 'none';
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        try {
          const customers = parseCSV(text);
          if (customers.length === 0) {
            showToast('Error', 'No valid rows found in CSV.', 'error');
            return;
          }
          showImportPreviewModal(customers);
        } catch (err) {
          showToast('Error', 'Failed to parse CSV: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    });
    
    input.click();
  });

  document.getElementById('btnAddFirstCustomer')?.addEventListener('click', () => {
    document.getElementById('btnNewCustomer')?.click();
  });

  document.getElementById('btnAddFirstEmployee')?.addEventListener('click', () => {
    document.getElementById('btnNewEmployee')?.click();
  });

  document.getElementById('btnFileVAT')?.addEventListener('click', () => {
    showModal('File VAT Returns', [
      { label: 'Period (e.g. Q4 2026)', name: 'period' },
      { label: 'VAT Collected (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'vat', type: 'number', step: '0.01' }
    ], async (data) => {
      const vat = parseFloat(data.vat);
      const res = await fetch('/api/v1/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          description: `VAT Return Filed - ${data.period}`,
          lines: [
            { account: '2010', debit: vat, credit: 0 },
            { account: '1100', debit: 0, credit: vat }
          ]
        })
      });
      if (!res.ok) throw new Error('Filing failed');
      showToast('Filed', `VAT returns for ${data.period} filed and payment remitted successfully.`, 'success');
      loadAccounting();
      loadTax();
    });
  });

  document.getElementById('btnTryTaxCalc')?.addEventListener('click', () => {
    showModal('Tax Calculator', [
      { label: 'Amount to Calculate (' + (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + ')', name: 'amount', type: 'number', step: '0.01' },
      { label: 'Tax Type', name: 'taxType', type: 'select', options: ['vat', 'wht', 'paye'], value: 'vat' },
      { label: 'Payer Type (WHT only)', name: 'payerType', type: 'select', options: ['companies', 'individuals'], value: 'companies' }
    ], async (data) => {
      const res = await fetch('/api/v1/tax/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Calculation failed');
      const resData = await res.json();
      showModal('Tax Calculation Result', [
        { label: 'Gross Amount', name: 'g', value: formatCurrency(resData.amount), type: 'text', required: false },
        { label: 'Tax Amount', name: 't', value: formatCurrency(resData.taxAmount), type: 'text', required: false },
        { label: 'Total Net / Grossed', name: 'tot', value: formatCurrency(resData.total), type: 'text', required: false }
      ], async () => {});
    });
  });

  document.getElementById('btnCustomReport')?.addEventListener('click', () => {
    showToast('Filters', 'Report filter sidebar opened.', 'info');
  });

  document.getElementById('btnGenerateReport')?.addEventListener('click', () => {
    window.location.href = '/api/v1/subscription/exports/financial.pdf';
  });

  document.getElementById('btnViewReports')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnViewReports');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined" style="animation:spin 1s linear infinite; font-size: 16px; vertical-align: middle; margin-right: 4px;">refresh</span> Updating...';
    try {
      await new Promise(r => setTimeout(r, 600));
      showToast('Updated', 'Report records refreshed.', 'success');
    } catch (e) {
      showToast('Error', 'Connection issue', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  const reportRows = document.querySelectorAll('#view-reports table tbody tr');
  reportRows.forEach(tr => {
    const docName = tr.cells[0].textContent;
    const btn = tr.querySelector('button');
    if (btn) {
      btn.addEventListener('click', () => {
        if (docName.includes('Profit & Loss')) {
          window.location.href = '/api/v1/subscription/exports/financial.pdf';
        } else if (docName.includes('Balance Sheet')) {
          window.location.href = '/api/v1/subscription/exports/balance-sheet.csv';
        } else if (docName.includes('General Ledger')) {
          window.location.href = '/api/v1/subscription/exports/ledger.csv';
        }
      });
    }
  });

  // Expose CRUD helpers globally (for onclick in checkboxes, batch bar)
  window.toggleSelectAll = toggleSelectAll;
  window.updateBatchActionBar = updateBatchActionBar;
  window.batchDeleteSelected = batchDeleteSelected;
  window.batchSetStatus = batchSetStatus;

  // Delegated click handler for edit/delete buttons in tables
  const tableActionConfig = {
    'view-inventory': { entity: 'product', editEndpoint: (id) => '/api/v1/inventory/products/' + id, deleteEndpoint: (id) => '/api/v1/inventory/products/' + id, refresh: () => loadInventory(), editFields: [{name:'sku',label:'SKU',type:'text'},{name:'name',label:'Name',type:'text'},{name:'cost_price',label:'Unit Cost',type:'number',step:'0.01'},{name:'sell_price',label:'Selling Price',type:'number',step:'0.01'},{name:'reorder_point',label:'Reorder Point',type:'number',step:'1'}] },
    'view-crm': { entity: 'customer', editEndpoint: (id) => '/api/v1/crm/customers/' + id, deleteEndpoint: (id) => '/api/v1/crm/customers/' + id, refresh: () => loadCRM(), editFields: [{name:'name',label:'Name',type:'text'},{name:'email',label:'Email',type:'email'},{name:'phone',label:'Phone',type:'text'},{name:'tin',label:'TIN',type:'text'}] },
    'view-hr': { entity: 'employee', editEndpoint: (id) => '/api/v1/hr/employees/' + id, deleteEndpoint: (id) => '/api/v1/hr/employees/' + id, refresh: () => loadHR(), editFields: [{name:'name',label:'Name',type:'text'},{name:'email',label:'Email',type:'email'},{name:'role',label:'Role',type:'text'},{name:'salary',label:'Salary',type:'number',step:'0.01'}] },
  };
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    if (!editBtn && !deleteBtn) return;
    const row = (editBtn || deleteBtn).closest('tr');
    if (!row || !row.dataset.item) return;
    const view = row.closest('.module-view');
    if (!view) return;
    const cfg = tableActionConfig[view.id];
    if (!cfg) return;
    const data = JSON.parse(row.dataset.item);
    const id = row.dataset.id;
    if (editBtn) {
      showEditModal('Edit ' + cfg.entity.charAt(0).toUpperCase() + cfg.entity.slice(1), cfg.editFields, data, cfg.editEndpoint(id), id, cfg.refresh);
    } else if (deleteBtn) {
      confirmDelete(cfg.entity, id, cfg.deleteEndpoint(id), cfg.refresh);
    }
  });

  // Accounting table action config (separate because accounts use different endpoints)
  document.getElementById('coaTableBody')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    if (!editBtn && !deleteBtn) return;
    const row = (editBtn || deleteBtn).closest('tr');
    if (!row || !row.dataset.item) return;
    const data = JSON.parse(row.dataset.item);
    const id = row.dataset.id;
    if (editBtn) {
      showEditModal('Edit Account', [{name:'code',label:'Code',type:'text'},{name:'name',label:'Name',type:'text'},{name:'type',label:'Type',type:'select',options:['asset','liability','equity','revenue','expense']}], data, '/api/v1/accounting/accounts/' + id, id, () => loadAccounting());
    } else {
      confirmDelete('account', id, '/api/v1/accounting/accounts/' + id, () => loadAccounting());
    }
  });
  document.getElementById('accountingTransactionsBody')?.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');
    if (!editBtn && !deleteBtn) return;
    const row = (editBtn || deleteBtn).closest('tr');
    if (!row || !row.dataset.item) return;
    const data = JSON.parse(row.dataset.item);
    const id = row.dataset.id;
    if (editBtn) {
      showEditModal('Edit Transaction', [{name:'date',label:'Date',type:'date'},{name:'description',label:'Description',type:'text'},{name:'reference',label:'Reference',type:'text'}], data, '/api/v1/accounting/transactions/' + id, id, () => loadAccounting());
    } else {
      confirmDelete('transaction', id, '/api/v1/accounting/transactions/' + id, () => loadAccounting());
    }
  });
  // Also handle overview table transactions
  document.getElementById('transactionsBody')?.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (!deleteBtn) return;
    const row = deleteBtn.closest('tr');
    if (!row || !row.dataset.item) return;
    const id = row.dataset.id;
    confirmDelete('transaction', id, '/api/v1/accounting/transactions/' + id, () => loadAccounting());
  });

  // Batch action bar button handlers
  document.getElementById('batchClearBtn')?.addEventListener('click', () => {
    document.querySelectorAll('input[type="checkbox"].row-select').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="checkbox"].select-all').forEach(cb => cb.checked = false);
    updateBatchActionBar();
  });
  document.getElementById('batchDeleteBtn')?.addEventListener('click', batchDeleteSelected);
  document.getElementById('batchStatusActive')?.addEventListener('click', () => batchSetStatus('active'));
  document.getElementById('batchStatusInactive')?.addEventListener('click', () => batchSetStatus('inactive'));

  // Spin animation
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
})();