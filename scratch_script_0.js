
    if (localStorage.getItem('coda_sidebar_collapsed') === 'true' && window.innerWidth > 1024) {
      document.documentElement.classList.add('sidebar-collapsed-pref');
    }
    // Prevent view layout flickering on reload
    (function() {
      const activeTab = localStorage.getItem('coda_admin_active_view') || 'users';
      const style = document.createElement('style');
      style.id = 'early-admin-override';
      style.textContent = `
        .admin-panel { display: none !important; } 
        #panel-${activeTab} { display: block !important; }
        .admin-tab[data-tab="${activeTab}"] { color: var(--slate-900) !important; border-bottom-color: var(--slate-900) !important; }
        .nav-item[data-tab="${activeTab}"] { background: var(--teal-600) !important; color: #ffffff !important; font-weight: 600 !important; }
        .nav-item[data-tab="${activeTab}"] .material-symbols-outlined { color: #ffffff !important; }
      `;
      document.head.appendChild(style);
    })();
  