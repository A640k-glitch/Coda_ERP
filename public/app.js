document.addEventListener('DOMContentLoaded', () => {


  // ----------------------------------------------------------
  // 1. Hero mockup chart bar animation
  // ----------------------------------------------------------
  const chartBars = document.querySelectorAll('.mockup-bar');
  if (chartBars.length) {
    chartBars.forEach(bar => {
      const h = bar.style.height;
      bar.style.height = '0px';
      setTimeout(() => {
        bar.style.transition = 'height 600ms cubic-bezier(.22,1,.36,1)';
        bar.style.height = h;
      }, 400);
    });
  }

  // ----------------------------------------------------------
  // 2. Counter animation (scroll-triggered)
  // ----------------------------------------------------------
  function animateCounter(el, target, suffix = '', decimals = 0) {
    const duration = 1800;
    const start = performance.now();
    const startVal = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * eased;
      el.textContent = (decimals ? current.toFixed(decimals) : Math.floor(current)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = (decimals ? target.toFixed(decimals) : target) + suffix;
    }
    requestAnimationFrame(tick);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        if (!isNaN(target)) animateCounter(el, target);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

  // ----------------------------------------------------------
  

  // ----------------------------------------------------------
  // 4. Charts (scroll-triggered via IntersectionObserver)
  // ----------------------------------------------------------
  const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const id = el.id;
        if (id === 'revenueChart' && !el._chart) initRevenueChart(el);
        if (id === 'expenseChart' && !el._chart) initExpenseChart(el);
        chartObserver.unobserve(el);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('canvas#revenueChart, canvas#expenseChart').forEach(el => chartObserver.observe(el));

  // KPI cards animate-in
  const kpiObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.transition = 'opacity 400ms ease, transform 400ms ease';
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        kpiObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.kpi-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transitionDelay = (i * 80) + 'ms';
    kpiObserver.observe(el);
  });

  // Revenue chart — smooth area line
  function initRevenueChart(ctx) {
    if (!ctx) return;
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(42,133,102,.18)');
    gradient.addColorStop(1, 'rgba(42,133,102,.01)');

    ctx._chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue (₦)',
          data: [2800000, 3100000, 2950000, 3400000, 3250000, 3700000],
          borderColor: '#2a8566',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#2a8566',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f3b2d',
            titleFont: { family: 'Switzer, sans-serif', weight: '600' },
            bodyFont: { family: 'Switzer, sans-serif' },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: { label: ctx => ' ₦' + ctx.raw.toLocaleString() }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
            border: { display: false },
            ticks: {
              font: { family: 'Switzer, sans-serif', size: 11 },
              color: '#7d9289',
              padding: 8,
              callback: v => '₦' + (v / 1000000).toFixed(1) + 'M'
            }
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { family: 'Switzer, sans-serif', size: 11 }, color: '#7d9289', padding: 8 }
          }
        },
        interaction: { intersect: false, mode: 'index' }
      }
    });
  }

  // Expense chart — doughnut (matches admin dashboard style)
  function initExpenseChart(ctx) {
    if (!ctx) return;
    ctx._chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Salaries', 'Operations', 'Marketing', 'Tax', 'Other'],
        datasets: [{
          data: [720000, 380000, 250000, 310000, 180000],
          backgroundColor: ['#145240', '#2a8566', '#c87533', '#b8652e', '#8fa89e'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { family: 'Switzer, sans-serif', size: 12 },
              color: '#4B5563'
            }
          },
          tooltip: {
            backgroundColor: '#0f3b2d',
            bodyFont: { family: 'Switzer, sans-serif', size: 12 },
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: { label: ctx => ' ₦' + ctx.raw.toLocaleString() }
          }
        }
      }
    });
  }

  // ----------------------------------------------------------
  // 5. KPI counter animation
  // ----------------------------------------------------------
  function animateKPI(el, target) {
    const duration = 1200;
    const start = performance.now();
    const sym = typeof getActiveCurrencySymbol === 'function' ? getActiveCurrencySymbol() : '₦';

    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = Math.floor(target * eased);
      el.textContent = sym + current.toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = sym + target.toLocaleString();
    }
    requestAnimationFrame(tick);
  }

  const kpiValues = {
    kpiRevenue: 12400000,
    kpiIncome: 8600000,
    kpiOutstanding: 3200000,
    kpiCashflow: 5400000
  };

  const kpiCounterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const key = el.id;
        if (kpiValues[key]) animateKPI(el, kpiValues[key]);
        kpiCounterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  Object.keys(kpiValues).forEach(id => {
    const el = document.getElementById(id);
    if (el) kpiCounterObserver.observe(el);
  });

  // ----------------------------------------------------------
  // 6. Transactions table
  // ----------------------------------------------------------
  const transactions = [
    { date: '12 Jun 2025', desc: 'Invoice #1042 — Reni Mercantile', cat: 'Revenue', amount: 845000, status: 'Paid' },
    { date: '11 Jun 2025', desc: 'Office rent — Q2', cat: 'Expense', amount: 1200000, status: 'Paid' },
    { date: '10 Jun 2025', desc: 'Payroll — June', cat: 'Expense', amount: 3200000, status: 'Paid' },
    { date: '09 Jun 2025', desc: 'Invoice #1041 — Trestle Group', cat: 'Revenue', amount: 2100000, status: 'Paid' },
    { date: '08 Jun 2025', desc: 'VAT remittance — May', cat: 'Tax', amount: 340000, status: 'Paid' },
    { date: '07 Jun 2025', desc: 'WHT remittance — May', cat: 'Tax', amount: 120000, status: 'Pending' },
    { date: '06 Jun 2025', desc: 'Invoice #1040 — Bridgeway Logistics', cat: 'Revenue', amount: 560000, status: 'Paid' },
    { date: '05 Jun 2025', desc: 'Software subscriptions', cat: 'Expense', amount: 180000, status: 'Pending' },
    { date: '04 Jun 2025', desc: 'Invoice #1039 — Reni Mercantile', cat: 'Revenue', amount: 420000, status: 'Paid' },
    { date: '03 Jun 2025', desc: 'Internet & utilities', cat: 'Expense', amount: 95000, status: 'Paid' }
  ];

  const tbody = document.getElementById('transactionsBody');
  if (tbody) {
    transactions.forEach(tx => {
      const badgeClass = tx.cat === 'Revenue' ? 'badge-revenue' : tx.cat === 'Expense' ? 'badge-expense' : 'badge-tax';
      const statusClass = tx.status === 'Paid' ? 'badge-paid' : 'badge-pending';
      const amountClass = tx.cat === 'Revenue' ? '' : '';
      const tr = document.createElement('tr');
      const formattedAmount = typeof formatCurrency === 'function' ? formatCurrency(tx.amount) : '₦' + tx.amount.toLocaleString();
      tr.innerHTML = `
        <td>${tx.date}</td>
        <td>${tx.desc}</td>
        <td><span class="badge ${badgeClass}">${tx.cat}</span></td>
        <td class="amount ${amountClass}">${formattedAmount}</td>
        <td><span class="badge ${statusClass}">${tx.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ----------------------------------------------------------
  // 7. Paycheck / Tax Calculator
  // ----------------------------------------------------------
  const calcBtn = document.getElementById('calcBtn');
  const grossInput = document.getElementById('grossInput');
  const pensionSelect = document.getElementById('pensionSelect');
  const demoResult = document.getElementById('demoResult');

  function calculatePAYE(gross) {
    // Nigerian PAYE tax brackets 2024-2025
    const brackets = [
      { limit: 300000, rate: 0.07 },
      { limit: 300000, rate: 0.11 },
      { limit: 500000, rate: 0.15 },
      { limit: 500000, rate: 0.19 },
      { limit: 1600000, rate: 0.21 },
      { limit: Infinity, rate: 0.24 }
    ];

    let annual = gross * 12;
    let tax = 0;
    let remaining = annual;
    let cra = 200000; // Consolidated Relief Allowance

    annual = Math.max(0, annual - cra);

    for (const bracket of brackets) {
      if (annual <= 0) break;
      const slice = Math.min(annual, bracket.limit);
      tax += slice * bracket.rate;
      annual -= slice;
    }

    return tax / 12;
  }

  function calculate() {
    if (!grossInput) return;
    const gross = parseFloat(grossInput.value);
    if (isNaN(gross) || gross <= 0) {
      if (demoResult) demoResult.innerHTML = '<div class="result-placeholder">Enter a valid salary amount</div>';
      return;
    }

    const pensionMode = pensionSelect ? pensionSelect.value : 'none';
    let employeePensionRate = 0.08;
    let employerPensionRate = 0.10;

    if (pensionMode === 'rba') {
      employeePensionRate = 0.10;
    } else if (pensionMode === 'none') {
      employeePensionRate = 0;
      employerPensionRate = 0;
    }

    const employeePension = gross * employeePensionRate;
    const employerPension = gross * employerPensionRate;
    const taxableIncome = gross - employeePension;
    const paye = calculatePAYE(taxableIncome);
    const nhf = gross <= 0 ? 0 : Math.min(gross * 0.025, 15000);
    const netPay = taxableIncome - paye - nhf;

    const cur = n => typeof formatCurrency === 'function' ? formatCurrency(n, 2) : '₦' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (demoResult) {
      demoResult.innerHTML = `
        <div class="result-content">
          <div class="result-row"><span class="label">Gross Salary</span><span class="value">${cur(gross)}</span></div>
          <div class="result-row"><span class="label">Employee Pension (${(employeePensionRate * 100).toFixed(0)}%)</span><span class="value">${cur(employeePension)}</span></div>
          <div class="result-row"><span class="label">Employer Pension (${(employerPensionRate * 100).toFixed(0)}%)</span><span class="value">${cur(employerPension)}</span></div>
          <div class="result-row"><span class="label">PAYE Tax</span><span class="value">${cur(paye)}</span></div>
          <div class="result-row"><span class="label">NHF (2.5%)</span><span class="value">${cur(nhf)}</span></div>
          <div class="result-row" style="border-bottom:none;padding-bottom:0;"><span class="label">Net Pay</span><span class="value highlight">${cur(netPay)}</span></div>
        </div>
      `;
    }
  }

  if (calcBtn) calcBtn.addEventListener('click', calculate);
  if (grossInput) grossInput.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });

  // Auto-calculate on load
  if (grossInput) calculate();

  // ----------------------------------------------------------
  // 8. Session check
  // ----------------------------------------------------------
  async function checkUserSession() {
    const navAuth = document.querySelector('.nav-auth');
    let hasSession = false;
    try {
      const res = await fetch('/api/v1/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          hasSession = true;
          if (navAuth) {
            const displayName = data.business ? data.business.name : (data.user.name || data.user.email || 'User');
            navAuth.innerHTML = `
              <button class="btn-user-profile" onclick="location.href='/dashboard'">
                <span class="material-symbols-outlined">person</span>
                <span class="btn-user-name">${displayName}</span>
              </button>
            `;
          }
          // Remove hero actions if logged in
          const heroActions = document.querySelector('.hero-actions');
          if (heroActions) heroActions.remove();
          window.codaHasSession = true;
        }
      }
    } catch (e) {}
    if (!hasSession && navAuth) {
      navAuth.innerHTML = '<a href="#" class="btn btn-sm trigger-auth-signin" style="background:#0d9488;color:#fff;border:1px solid #0d9488;font-weight:600;margin-right:8px">Sign in</a>';
    }
  }
  
  checkUserSession();
  
  function applyCookieAuthSync() {
    if (document.cookie.includes('coda_logged_in=true')) {
      const navAuth = document.querySelector('.nav-auth');
      if (navAuth && !navAuth.querySelector('.btn-user-profile')) {
        const userStr = localStorage.getItem('coda_user');
        let name = 'User';
        if (userStr) {
          try { name = JSON.parse(userStr).name || 'User'; } catch(e) {}
        }
        const esc = s => String(s).replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[m]));
        navAuth.innerHTML = `
          <button class="btn-user-profile" onclick="location.href='/dashboard'">
            <span class="material-symbols-outlined">person</span>
            <span class="btn-user-name">${esc(name)}</span>
          </button>
        `;
      }
      const heroActions = document.querySelector('.hero-actions');
      if (heroActions) heroActions.style.display = 'none';
    }
  }

  // Re-check session when switching back to this tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      applyCookieAuthSync();
      checkUserSession();
    }
  });

  // Handle bfcache restorations (clicking Back button)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) applyCookieAuthSync();
  });

});
