
    (function() {
      'use strict';

      let currentUser = null;
      let usersPage = 1, businessesPage = 1, auditPage = 1;
      let signupsChart = null, revenueChart = null, tierChart = null, revenueTierChart = null;

      // Sync preloaded sidebar collapsed state
      const adminSidebar = document.getElementById('adminSidebar');
      if (adminSidebar && document.documentElement.classList.contains('sidebar-collapsed-pref')) {
        adminSidebar.classList.add('collapsed');
        document.documentElement.classList.remove('sidebar-collapsed-pref');
      }

      function showToast(title, message, type) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'success');
        toast.innerHTML = '<div class="toast-title">' + title + '</div><div class="toast-message">' + message + '</div>';
        container.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 4000);
      }

      function formatCurrency(amount) {
        if (typeof window.formatCurrency === 'function') {
          return window.formatCurrency(amount);
        }
        const formatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
        return formatted.replace('₦', '₦ ');
      }

      function formatDate(d) {
        return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
      }

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

      async function fetchWithAuth(url) {
        const res = await fetch(url, { credentials: 'include' });
        if (res.status === 401) { 
          window.location.href = '/login'; 
          return null; 
        }
        if (res.status === 403) { 
          window.location.href = '/dashboard'; 
          return null; 
        }
        return res.ok ? res.json() : null;
      }

      function switchTab(tab) {
        localStorage.setItem('coda_admin_active_view', tab);
        
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab));
        document.querySelectorAll('.admin-nav .nav-item[data-tab]').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));

        // Force layout reflow before removing override styles to prevent visual flickering
        document.body.offsetHeight;

        const override = document.getElementById('early-admin-override');
        if (override) override.remove();
      }

      document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const t = tab.dataset.tab;
          switchTab(t);
          if (t === 'analytics') loadAnalytics();
          if (t === 'audit') loadAuditLog(1);
          if (t === 'requests') loadNotifications();
        });
      });
      
      document.querySelectorAll('.admin-nav .nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', () => {
          switchTab(item.dataset.tab);
          if (item.dataset.tab === 'analytics') loadAnalytics();
          if (item.dataset.tab === 'audit') loadAuditLog(1);
          if (item.dataset.tab === 'requests') loadNotifications();
        });
      });

      document.getElementById('sidebarToggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = document.getElementById('adminSidebar');
        if (window.innerWidth <= 1024) {
          s.classList.toggle('open');
          if (s.classList.contains('open')) {
            document.body.classList.add('no-scroll');
          } else {
            document.body.classList.remove('no-scroll');
          }
        } else {
          s.classList.toggle('collapsed');
          localStorage.setItem('coda_sidebar_collapsed', s.classList.contains('collapsed'));
        }
      });
      document.getElementById('sidebarClose')?.addEventListener('click', () => {
        document.getElementById('adminSidebar').classList.remove('open');
        document.body.classList.remove('no-scroll');
      });

      // Click outside to close admin mobile sidebar
      document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('adminSidebar');
        const toggle = document.getElementById('sidebarToggle');
        if (window.innerWidth <= 1024 && sidebar && sidebar.classList.contains('open')) {
          if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
            sidebar.classList.remove('open');
            document.body.classList.remove('no-scroll');
          }
        }
      });

      // Escape key handler for admin page sidebar
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const sidebar = document.getElementById('adminSidebar');
          if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            document.body.classList.remove('no-scroll');
          }
        }
      });

      document.getElementById('btnAdminLogout')?.addEventListener('click', async () => {
        try {
          await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {}
        localStorage.removeItem('coda_token');
        localStorage.removeItem('coda_user');
        window.location.href = '/login';
      });

      async function setUserStatus(userId, status) {
        const label = status === 'active' ? 'Activate' : status === 'blocked' ? 'Block' : 'Suspend';
        if (!confirm('Are you sure you want to ' + label.toLowerCase() + ' this user?')) return;
        await fetch('/api/v1/admin/users/' + userId + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        loadUsers(usersPage);
      }
      function activateUser(id) { setUserStatus(id, 'active'); }
      function suspendUser(id) { setUserStatus(id, 'suspended'); }
      function blockUser(id) { setUserStatus(id, 'blocked'); }

      async function adminDeleteUser(userId) {
        if (!confirm('WARNING: This will permanently delete this user and all their sessions. Are you sure?')) return;
        if (!confirm('This action cannot be undone. Type OK to confirm.')) return;
        await fetch('/api/v1/admin/users/' + userId, { method: 'DELETE' });
        showToast('Deleted', 'User has been permanently deleted.', 'success');
        loadUsers(usersPage);
      }

      async function adminChangeUserTier(userId, tier) {
        if (!confirm('Change this user\'s business tier to ' + tier.toUpperCase() + '?')) {
          loadUsers(usersPage); // Reset dropdown
          return;
        }
        const res = await fetch('/api/v1/admin/users/' + userId + '/upgrade', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier })
        });
        if (res.ok) {
          showToast('Updated', 'Business tier updated to ' + tier, 'success');
        } else {
          showToast('Error', 'Failed to update business tier.', 'error');
        }
        loadUsers(usersPage);
      }
      
      let currentNotifications = [];

      async function loadNotifications() {
        const data = await fetchWithAuth('/api/v1/notifications');
        if (!data) return;
        const tbody = document.getElementById('notificationsBody');
        if (!data.notifications || !data.notifications.length) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted);">No pending requests.</td></tr>';
          return;
        }
        currentNotifications = data.notifications;
        tbody.innerHTML = data.notifications.map(n => {
          const isRead = n.is_read === 1;
          const readStyle = isRead ? 'opacity: 0.6;' : 'font-weight: 600;';
          let actionBtn = '';
          if (n.title === 'Upgrade Request' && !isRead) {
            actionBtn = `<button class="btn btn-xs btn-outline" onclick="approveUpgradeFromNotification('${n.id}', '${n.business_id}')">Approve</button>`;
          }
          if (!isRead) {
            actionBtn += `<button class="btn btn-xs btn-outline" style="margin-left:4px;" onclick="markNotificationRead('${n.id}')">Dismiss</button>`;
          } else {
            actionBtn = '<span style="color:var(--text-muted); font-size:11px;">Processed</span>';
          }
          return `<tr style="${readStyle}">
            <td>${n.title}</td>
            <td>${n.message}</td>
            <td>${formatDate(n.created_at)}</td>
            <td>${actionBtn}</td>
          </tr>`;
        }).join('');
      }

      async function approveUpgradeFromNotification(id, businessId) {
        const notif = currentNotifications.find(n => n.id === id);
        let tier = 'professional';
        if (notif && notif.message.toLowerCase().includes('enterprise')) tier = 'enterprise';
        if (notif && notif.message.toLowerCase().includes('starter')) tier = 'starter';
        
        if (!confirm('Approve upgrade to ' + tier.toUpperCase() + '?')) return;
        
        const res = await fetch('/api/v1/admin/businesses/' + businessId + '/tier', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier })
        });
        
        if (res.ok) {
          showToast('Approved', 'Business upgraded to ' + tier, 'success');
          await fetch('/api/v1/notifications/' + id + '/read', { method: 'PATCH' });
          loadNotifications();
        } else {
          showToast('Error', 'Failed to upgrade business.', 'error');
        }
      }

      async function markNotificationRead(id) {
        await fetch('/api/v1/notifications/' + id + '/read', { method: 'PATCH' });
        loadNotifications();
      }

      async function loadOverview() {
        const data = await fetchWithAuth('/api/v1/admin/analytics/overview');
        if (!data) return;
        const o = data.overview;
        document.getElementById('kpiUsers').textContent = o.totalUsers.toLocaleString();
        document.getElementById('kpiBusinesses').textContent = o.totalBusinesses.toLocaleString();
        document.getElementById('kpiActiveSubs').textContent = o.activeSubscriptions.toLocaleString();
        document.getElementById('kpiRevenue').textContent = formatCurrency(o.paidRevenue);
        document.getElementById('kpiRevenueSub').textContent = o.totalBusinesses > 0 ? formatCurrency(Math.round(o.paidRevenue / o.totalBusinesses)) + ' avg/business' : '';
        document.getElementById('kpiSignups').textContent = o.signupsThisMonth.toLocaleString();
        document.getElementById('adminLastUpdated').textContent = 'Updated ' + new Date().toLocaleString('en-NG');
      }

      async function loadUsers(page) {
        const data = await fetchWithAuth('/api/v1/admin/users?page=' + page + '&limit=20');
        if (!data) return;
        const tbody = document.getElementById('usersBody');
        if (!data.users.length) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No users found.</td></tr>';
          document.getElementById('usersPagination').style.display = 'none';
          return;
        }
        tbody.innerHTML = data.users.map(u => {
          const status = u.status || 'active';
          const statusClass = status === 'active' ? 'badge-active' : status === 'blocked' ? 'badge-inactive' : 'badge-warning';
          const actBtn = status === 'active' ? '<button class="btn btn-xs btn-outline" onclick="suspendUser(\'' + u.id + '\')">Suspend</button><button class="btn btn-xs btn-outline" onclick="blockUser(\'' + u.id + '\')">Block</button>' : status === 'blocked' ? '<button class="btn btn-xs btn-outline" onclick="activateUser(\'' + u.id + '\')">Activate</button>' : '<button class="btn btn-xs btn-outline" onclick="activateUser(\'' + u.id + '\')">Activate</button><button class="btn btn-xs btn-outline" onclick="blockUser(\'' + u.id + '\')">Block</button>';
          const bTier = u.business_tier || 'starter';
          const upgradeSelect = `<select class="btn btn-xs btn-outline" style="margin-left:4px; padding:2px 4px;" onchange="adminChangeUserTier('${u.id}', this.value)">
            <option value="starter" ${bTier === 'starter' ? 'selected' : ''}>Starter</option>
            <option value="professional" ${bTier === 'professional' ? 'selected' : ''}>Professional</option>
            <option value="enterprise" ${bTier === 'enterprise' ? 'selected' : ''}>Enterprise</option>
          </select>`;
          return '<tr><td>' + (u.name || '-') + '</td><td class="email-cell" title="' + u.email + '">' + u.email + '</td><td>' + (u.business_name || '-') + '</td><td>' + u.role + '</td><td>' + bTier + '</td><td><span class="badge ' + statusClass + '">' + status.toUpperCase() + '</span></td><td>' + formatDate(u.created_at) + '</td><td style="white-space:nowrap;">' + actBtn + upgradeSelect + '<button class="btn btn-xs btn-danger" onclick="adminDeleteUser(\'' + u.id + '\')" style="margin-left:4px;">Delete</button></td></tr>';
        }).join('');
        const p = data.pagination;
        document.getElementById('usersPagination').style.display = 'flex';
        document.getElementById('usersPageInfo').textContent = 'Page ' + p.page + ' of ' + p.pages + ' (' + p.total + ' users)';
        document.getElementById('usersPrev').disabled = p.page <= 1;
        document.getElementById('usersNext').disabled = p.page >= p.pages;
        document.getElementById('usersPrev').onclick = () => loadUsers(--usersPage);
        document.getElementById('usersNext').onclick = () => loadUsers(++usersPage);
      }

      async function loadBusinesses(page) {
        const data = await fetchWithAuth('/api/v1/admin/businesses?page=' + page + '&limit=20');
        if (!data) return;
        const tbody = document.getElementById('businessesBody');
        if (!data.businesses.length) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No businesses found.</td></tr>';
          document.getElementById('businessesPagination').style.display = 'none';
          return;
        }
        tbody.innerHTML = data.businesses.map(b => {
          const statusClass = b.subscription_status === 'active' || b.subscription_status === 'paid' ? 'badge-active' : b.subscription_status === 'trial' ? 'badge-trial' : 'badge-inactive';
          return '<tr><td><strong>' + b.name + '</strong></td><td>' + (b.tier || '-') + '</td><td><span class="badge ' + statusClass + '">' + b.subscription_status + '</span></td><td>' + b.user_count + '</td><td>' + b.payment_count + '</td><td>' + formatDate(b.created_at) + '</td></tr>';
        }).join('');
        const p = data.pagination;
        document.getElementById('businessesPagination').style.display = 'flex';
        document.getElementById('businessesPageInfo').textContent = 'Page ' + p.page + ' of ' + p.pages + ' (' + p.total + ' businesses)';
        document.getElementById('businessesPrev').disabled = p.page <= 1;
        document.getElementById('businessesNext').disabled = p.page >= p.pages;
        document.getElementById('businessesPrev').onclick = () => loadBusinesses(--businessesPage);
        document.getElementById('businessesNext').onclick = () => loadBusinesses(++businessesPage);
      }

      async function loadAnalytics() {
        const [signupData, revenueData] = await Promise.all([
          fetchWithAuth('/api/v1/admin/analytics/signups'),
          fetchWithAuth('/api/v1/admin/analytics/revenue'),
        ]);
        if (!signupData || !revenueData) return;

        const colors = { green: '#0d9488', copper: '#d97706', bgLight: '#f1f5f9', border: '#e2e8f0' };

        if (signupsChart) signupsChart.destroy();
        const sCtx = document.getElementById('signupsChart')?.getContext('2d');
        if (sCtx && signupData.signups) {
          signupsChart = new Chart(sCtx, {
            type: 'bar',
            data: {
              labels: signupData.signups.labels,
              datasets: [{ label: 'Signups', data: signupData.signups.values, backgroundColor: colors.green, borderRadius: 4 }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false } },
                y: { grid: { color: colors.border }, beginAtZero: true }
              }
            }
          });
        }

        if (revenueChart) revenueChart.destroy();
        const rCtx = document.getElementById('revenueChart')?.getContext('2d');
        if (rCtx && revenueData.revenueTrend) {
          revenueChart = new Chart(rCtx, {
            type: 'line',
            data: {
              labels: revenueData.revenueTrend.labels,
              datasets: [{
                label: 'Revenue', data: revenueData.revenueTrend.values,
                borderColor: colors.copper, backgroundColor: 'rgba(217,119,6,0.08)',
                fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatCurrency(ctx.raw) } } },
              scales: {
                x: { grid: { display: false } },
                y: { grid: { color: colors.border }, ticks: { callback: v => (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + (v/1000).toFixed(0) + 'k' }, beginAtZero: true }
              }
            }
          });
        }

        if (tierChart) tierChart.destroy();
        const tCtx = document.getElementById('tierChart')?.getContext('2d');
        if (tCtx && revenueData.revenueByTier) {
          const tiers = revenueData.revenueByTier;
          tierChart = new Chart(tCtx, {
            type: 'doughnut',
            data: {
              labels: tiers.map(t => t.tier || 'unknown'),
              datasets: [{ data: tiers.map(t => t.total), backgroundColor: ['#0d9488', '#d97706', '#0f172a'], borderWidth: 0, cutout: '65%' }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 } } }
            }
          });
        }

        if (revenueTierChart) revenueTierChart.destroy();
        const rtCtx = document.getElementById('revenueTierChart')?.getContext('2d');
        if (rtCtx && revenueData.revenueByTier) {
          const tiers = revenueData.revenueByTier;
          revenueTierChart = new Chart(rtCtx, {
            type: 'bar',
            data: {
              labels: tiers.map(t => t.tier || 'unknown'),
              datasets: [{ label: 'Revenue', data: tiers.map(t => t.total), backgroundColor: ['#0d9488', '#d97706', '#0f172a'], borderRadius: 4 }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatCurrency(ctx.raw) } } },
              scales: {
                x: { grid: { display: false } },
                y: { grid: { color: colors.border }, ticks: { callback: v => (typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦') + (v/1000).toFixed(0) + 'k' }, beginAtZero: true }
              }
            }
          });
        }
      }

      async function loadAuditLog(page) {
        const data = await fetchWithAuth('/api/v1/admin/audit-log?page=' + page + '&limit=50');
        if (!data) return;
        const tbody = document.getElementById('auditBody');
        if (!data.entries.length) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">No audit entries.</td></tr>';
          document.getElementById('auditPagination').style.display = 'none';
          return;
        }
        tbody.innerHTML = data.entries.map(e => {
          let details = '';
          try { const d = JSON.parse(e.details); details = Object.values(d).join(', '); } catch (_) { details = e.details || ''; }
          return '<tr><td><code style="background:var(--slate-100);padding:2px 8px;border-radius:4px;font-size:11px;">' + e.action + '</code></td><td class="email-cell" title="' + (e.user_email || '') + '">' + (e.user_name || e.user_email || '-') + '</td><td>' + (e.business_name || '-') + '</td><td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + details + '">' + details + '</td><td>' + formatDate(e.created_at) + '</td></tr>';
        }).join('');
        const p = data.pagination;
        document.getElementById('auditPagination').style.display = 'flex';
        document.getElementById('auditPageInfo').textContent = 'Page ' + p.page + ' of ' + p.pages + ' (' + p.total + ' entries)';
        document.getElementById('auditPrev').disabled = p.page <= 1;
        document.getElementById('auditNext').disabled = p.page >= p.pages;
        document.getElementById('auditPrev').onclick = () => loadAuditLog(--auditPage);
        document.getElementById('auditNext').onclick = () => loadAuditLog(++auditPage);
      }

      async function init() {
        await initCsrf();
        const me = await fetchWithAuth('/api/v1/auth/me');
        if (!me) return;
        currentUser = me.user;

        // Cross-tab session invalidation: re-check auth when tab becomes visible
        document.addEventListener('visibilitychange', function onVis() {
          if (document.visibilityState === 'visible' && currentUser) {
            fetch('/api/v1/auth/me', { credentials: 'include' }).then(r => {
              if (!r.ok) window.location.href = '/login';
            });
          }
        });

        const ui = document.getElementById('adminUserInfo');
        if (ui && currentUser) {
          ui.innerHTML = '<div class="user-avatar">' + (currentUser.name?.charAt(0)?.toUpperCase() || 'A') + '</div><div class="user-details"><div class="user-name">' + (currentUser.name || '') + '</div><div class="user-role">Platform Admin</div></div>';
        }

        // Fire data loads asynchronously (same fire-and-forget pattern as user dashboard)
        loadOverview();
        loadUsers(1);
        loadBusinesses(1);

        // Switch to saved tab (removes early-override, applies .active classes)
        const savedTab = localStorage.getItem('coda_admin_active_view') || 'users';
        switchTab(savedTab);
        if (savedTab === 'analytics') loadAnalytics();
        if (savedTab === 'audit') loadAuditLog(1);

        // Safety net: ensure a panel is actually active, fall back to users
        const anyActive = Array.from(document.querySelectorAll('.admin-panel')).some(p => p.classList.contains('active'));
        if (!anyActive) {
          switchTab('users');
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
      // Expose event handlers to window object so inline onclick/onchange attributes work
      window.activateUser = activateUser;
      window.suspendUser = suspendUser;
      window.blockUser = blockUser;
      window.adminDeleteUser = adminDeleteUser;
      window.adminChangeUserTier = adminChangeUserTier;
      window.approveUpgradeFromNotification = approveUpgradeFromNotification;
      window.markNotificationRead = markNotificationRead;
    })();
  