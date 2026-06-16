// Dashboard App Logic - Secure Version
(function() {
  'use strict';

  // ===== State =====
  let currentUser = null;
  let currentView = 'overview';

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
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
        window.__isAdmin = data.isAdmin === true;
        return true;
      }
    } catch (e) {
      // Ignore - will redirect
    }
    return false;
  }

  // ===== UI Elements =====
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const pageTitle = document.getElementById('pageTitle');
  const userInfo = document.getElementById('userInfo');
  const navItems = document.querySelectorAll('.nav-item');
  const moduleViews = document.querySelectorAll('.module-view');

  // ===== Init App =====
  async function initApp() {
    // Hide all content until auth verified
    document.body.style.visibility = 'hidden';
    
    const authenticated = await verifyAuth();
    const authModal = document.getElementById('authModal');
    
    if (!authenticated) {
      document.body.style.visibility = 'visible';
      document.body.style.overflow = 'hidden';
      const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
      if (mainContent) mainContent.style.overflow = 'hidden';
      if (authModal) authModal.style.display = 'flex';
      return;
    }

    // Show content
    if (authModal) authModal.style.display = 'none';
    document.body.style.visibility = 'visible';
    document.body.style.overflow = '';
    const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
    if (mainContent) mainContent.style.overflow = '';
    
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

    // Show admin nav if user is admin
    const adminNav = document.getElementById('adminNavSection');
    if (adminNav && window.__isAdmin) {
      adminNav.style.display = '';
    }

    // Initialize components
    initCharts();
    renderTransactions();
    loadNotifications();
    loadSettings();
    updateNotificationBadge();

    // Event listeners
    setupEventListeners();
  }

  function setupEventListeners() {
    // Sidebar Navigation
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        switchView(view);
      });
    });

    // Sidebar Toggle
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
    function closeAllPanels() {
      [panelNotifications, panelSettings].forEach(p => p && p.classList.remove('open'));
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
      await new Promise(r => setTimeout(r, 800));
      btn.disabled = false;
      btn.innerHTML = original;
      showToast('Saved', 'General settings updated successfully.', 'success');
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

    // Logout
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
      try {
        await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {}
      localStorage.removeItem('coda_token');
      localStorage.removeItem('coda_user');
      showToast('Signed out', 'You have been signed out successfully.', 'success');
      document.body.style.overflow = 'hidden';
      const mainContent = document.getElementById('mainContent') || document.querySelector('.main-content');
      if (mainContent) mainContent.style.overflow = 'hidden';
      const authModal = document.getElementById('authModal');
      if (authModal) authModal.style.display = 'flex';
    });

    // New Transaction
    document.getElementById('btnNewTransaction')?.addEventListener('click', () => {
      showToast('Coming soon', 'Transaction creation UI will be in the Accounting module.', 'warning');
    });

    // Sidebar Promo Card
    document.querySelector('.btn-promo')?.addEventListener('click', () => {
      showToast('Enterprise', 'Contact sales@coda.ng for Enterprise pricing.', 'info');
    });

    // Global Search Filter (Per User Local Search)
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const tbody = document.getElementById('transactionsBody');
        if (tbody) {
          const rows = tbody.querySelectorAll('tr');
          rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
          });
        }
      });
    }
  }

  function switchView(viewName) {
    currentView = viewName;
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });
    const labels = {
      overview: 'Dashboard',
      accounting: 'Accounting',
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
    document.getElementById('btnNewTransaction').style.display = viewName === 'overview' ? 'flex' : 'none';
  }

  // ===== Charts =====
  let revenueChart, expenseChart;

  function initCharts() {
    const chartColors = {
      primary: '#2A8566',
      copper: '#B8652E',
      green50: '#E8F5F0',
      copper50: '#FDF2E8',
      border: '#E8ECEA'
    };

    // Revenue Chart (Line)
    const revCtx = document.getElementById('revenueChart')?.getContext('2d');
    if (revCtx) {
      revenueChart = new Chart(revCtx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue',
            data: [2.1, 2.4, 2.8, 3.1, 2.9, 3.25],
            borderColor: chartColors.primary,
            backgroundColor: 'rgba(42,133,102,0.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: chartColors.primary,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverBorderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#9CA3AF' } },
            y: { grid: { color: chartColors.border }, ticks: { color: '#9CA3AF', callback: v => '₦' + (v/1).toFixed(1) + 'M' }, beginAtZero: true }
          },
          elements: { line: { borderWidth: 3 } }
        }
      });
    }

    // Expense Chart (Doughnut)
    const expCtx = document.getElementById('expenseChart')?.getContext('2d');
    if (expCtx) {
      expenseChart = new Chart(expCtx, {
        type: 'doughnut',
        data: {
          labels: ['Salaries', 'Rent', 'Marketing', 'Utilities', 'Supplies', 'Other'],
          datasets: [{
            data: [840, 320, 180, 120, 90, 290],
            backgroundColor: ['#2A8566', '#34A87A', '#60C89A', '#8CE8BB', '#B8652E', '#D4A85D'],
            borderWidth: 0,
            cutout: '70%'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 12, family: 'Switzer' }, color: '#4B5563' } }, tooltip: { callbacks: { label: ctx => ctx.label + ': ₦' + ctx.raw.toLocaleString() + 'k' } } }
        }
      });
    }
  }

  // ===== Sample Data =====
  const sampleTransactions = [
    { date: '2024-12-15', desc: 'Invoice INV-2024-0452', category: 'Sales Revenue', amount: 450000, type: 'revenue', status: 'paid' },
    { date: '2024-12-14', desc: 'Payroll - Dec 2024', category: 'Salaries', amount: -840000, type: 'expense', status: 'paid' },
    { date: '2024-12-13', desc: 'VAT Return Filing Q4', category: 'Tax', amount: -125000, type: 'tax', status: 'paid' },
    { date: '2024-12-12', desc: 'Invoice INV-2024-0451', category: 'Sales Revenue', amount: 320000, type: 'revenue', status: 'paid' },
    { date: '2024-12-11', desc: 'Office Rent - Dec', category: 'Rent', amount: -320000, type: 'expense', status: 'paid' },
    { date: '2024-12-10', desc: 'Marketing Campaign - Meta', category: 'Marketing', amount: -180000, type: 'expense', status: 'paid' },
    { date: '2024-12-09', desc: 'Invoice INV-2024-0450', category: 'Sales Revenue', amount: 285000, type: 'revenue', status: 'pending' },
    { date: '2024-12-08', desc: 'Utilities - Electricity', category: 'Utilities', amount: -45000, type: 'expense', status: 'paid' },
    { date: '2024-12-07', desc: 'Inventory Purchase - Packaging', category: 'Supplies', amount: -90000, type: 'expense', status: 'paid' },
    { date: '2024-12-06', desc: 'WHT Remittance - Nov', category: 'Tax', amount: -65000, type: 'tax', status: 'paid' }
  ];

  function renderTransactions() {
    const tbody = document.getElementById('transactionsBody');
    if (!tbody) return;
    tbody.innerHTML = sampleTransactions.map(t => `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>${t.desc}</td>
        <td>${t.category}</td>
        <td class="amount ${t.amount >= 0 ? 'positive' : 'negative'}" style="text-align: right;">${formatCurrency(Math.abs(t.amount))}</td>
        <td><span class="badge badge-${t.type}">${t.type}</span></td>
        <td><span class="badge badge-${t.status}">${t.status}</span></td>
      </tr>
    `).join('');
  }

  // ===== Notifications =====
  let notificationCount = 0;
  let notificationsData = [
    { id: 1, type: 'success', title: 'VAT Return Filed', message: 'Your Q4 2024 VAT return was successfully filed with FIRS.', time: '2 hours ago', read: true },
    { id: 2, type: 'info', title: 'New Invoice', message: 'Invoice INV-2024-0453 for ₦450,000 has been paid by Best Foods Ltd.', time: '5 hours ago', read: false },
    { id: 3, type: 'warning', title: 'Low Stock Alert', message: 'Product "Packaging Boxes" is below reorder point (12 units left).', time: '1 day ago', read: false },
    { id: 4, type: 'info', title: 'Payroll Processed', message: 'December 2024 payroll for 12 employees processed successfully.', time: '2 days ago', read: true },
    { id: 5, type: 'error', title: 'Payment Failed', message: 'Payment of ₦128,000 to Sterling Bank was declined. Please retry.', time: '3 days ago', read: true },
  ];
  notificationCount = notificationsData.filter(n => !n.read).length;

  function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    container.innerHTML = notificationsData.map(n => `
      <div class="notification-item${n.read ? '' : ' unread'}" data-id="${n.id}" style="cursor: pointer; padding: 16px; margin-bottom: 12px; border-radius: 12px; background: rgba(15, 23, 42, 0.95); display: flex; gap: 14px; opacity: ${n.read ? 0.7 : 1}; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(8px);">
        <div class="notification-icon ${n.type}" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;flex-shrink:0; border-radius: 50%; background: rgba(255,255,255,0.05);">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--${n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info'});">${n.type === 'success' ? 'check_circle' : n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : 'info'}</span>
        </div>
        <div class="notification-content" style="flex:1;">
          <div class="notification-title" style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #ffffff;">${n.title}</div>
          <div class="notification-message" style="font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; margin-bottom: 6px;">${n.message}</div>
          <div class="notification-time" style="font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 500;">${n.time}</div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        const notif = notificationsData.find(n => n.id === id);
        if (notif && !notif.read) {
          notif.read = true;
          item.classList.remove('unread');
          item.style.opacity = '0.6';
          notificationCount = Math.max(0, notificationCount - 1);
          updateNotificationBadge();
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

  // Spin animation
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
})();