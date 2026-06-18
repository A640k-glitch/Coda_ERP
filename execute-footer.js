const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// 1. Add Dashboard Footer CSS to styles.css
const stylesPath = path.join(publicDir, 'styles.css');
let stylesContent = fs.readFileSync(stylesPath, 'utf-8');

if (!stylesContent.includes('.dashboard-footer')) {
  const footerCss = `
/* Dashboard Footer */
.dashboard-footer {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--slate-200);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 14px;
  padding-bottom: 24px;
}
@media (min-width: 768px) {
  .dashboard-footer {
    flex-direction: row;
    justify-content: space-between;
  }
}
.dashboard-footer-links {
  display: flex;
  gap: 16px;
  align-items: center;
}
.dashboard-footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}
.dashboard-footer-links a:hover {
  color: var(--teal-600);
}
`;
  stylesContent += `\n${footerCss}\n`;
  fs.writeFileSync(stylesPath, stylesContent, 'utf-8');
}


// Support Modal HTML
const supportModalHtml = `
<div class="modal-overlay" id="supportModal" style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:1000;">
  <div style="background:#fff;width:100%;max-width:500px;border-radius:14px;padding:32px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);">
    <button class="modal-close-btn" style="position:absolute;top:24px;right:24px;background:none;border:none;cursor:pointer;color:#64748b;"><span class="material-symbols-outlined">close</span></button>
    
    <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:24px;">
      <span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><svg viewBox="20 20 54 58" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/><rect x="22" y="32" width="18" height="38" rx="3.5" fill="currentColor"/><rect x="34" y="62" width="38" height="14" rx="3" fill="currentColor"/></svg></span>
      <span>Coda Support Hub</span>
    </div>
    
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0; margin-bottom: 24px;">
        <span class="material-symbols-outlined" style="color: #059669; font-size: 20px;">check_circle</span>
        <span style="color: #065f46; font-size: 14px; font-weight: 500;">System Status: All Systems Operational</span>
      </div>

      <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 12px;">Frequently Asked Questions</h3>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px;">
        <li><a href="#" style="color: #0d9488; text-decoration: none; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 4px;">How do I reset my account password? <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span></a></li>
        <li><a href="#" style="color: #0d9488; text-decoration: none; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 4px;">How to export monthly financial reports? <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span></a></li>
        <li><a href="#" style="color: #0d9488; text-decoration: none; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 4px;">Managing team permissions & access <span class="material-symbols-outlined" style="font-size: 16px;">arrow_forward</span></a></li>
      </ul>
    </div>

    <button class="modal-close-btn" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;width:100%;height:40px;">Contact Support Team</button>
  </div>
</div>
`;

// Footer HTML template
const dashboardFooterHtml = `
      <!-- Dashboard Footer -->
      <footer class="dashboard-footer">
        <p>&copy; 2026 Coda Technologies Ltd. All rights reserved.</p>
        <div class="dashboard-footer-links">
          <a href="#!" class="legal-trigger-privacy">Privacy</a>
          <a href="#!" class="legal-trigger-terms">Terms</a>
          <a href="#!" class="support-trigger">Support Hub</a>
        </div>
      </footer>
`;


// 2. Fix Dashboard.html
const dashboardPath = path.join(publicDir, 'dashboard.html');
let dashboardHtml = fs.readFileSync(dashboardPath, 'utf-8');

dashboardHtml = dashboardHtml.replace(/<a href="#">Support Hub<\/a>/, '<a href="#!" class="support-trigger">Support Hub</a>');

if (!dashboardHtml.includes('id="supportModal"')) {
  dashboardHtml += `\n${supportModalHtml}\n`;
}

// Update script array in dashboard
dashboardHtml = dashboardHtml.replace(/\['privacyModal', 'termsModal'\]/g, "['privacyModal', 'termsModal', 'supportModal']");

// Inject support trigger listener
if (!dashboardHtml.includes('support-trigger')) {
  // It shouldn't get here unless missing entirely, but we did the replace above.
}
if (!dashboardHtml.includes('.querySelectorAll(\'.support-trigger\')')) {
  const scriptInsertion = `
    document.querySelectorAll('.support-trigger').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        openModal('supportModal');
      });
    });
  `;
  dashboardHtml = dashboardHtml.replace(/(document\.querySelectorAll\('\.legal-trigger-terms'\)[\s\S]*?\}\);)/, "$1\n" + scriptInsertion);
}

fs.writeFileSync(dashboardPath, dashboardHtml, 'utf-8');


// 3. Fix Admin.html
const adminPath = path.join(publicDir, 'admin.html');
let adminHtml = fs.readFileSync(adminPath, 'utf-8');

// Inject footer right before closing main tag
if (!adminHtml.includes('dashboard-footer')) {
  adminHtml = adminHtml.replace(/(<\/main>)/, `${dashboardFooterHtml}\n    $1`);
}

// Inject supportModal
if (!adminHtml.includes('id="supportModal"')) {
  adminHtml += `\n${supportModalHtml}\n`;
}

// Update script array in admin
adminHtml = adminHtml.replace(/\['privacyModal', 'termsModal'\]/g, "['privacyModal', 'termsModal', 'supportModal']");

// Inject support trigger listener
if (!adminHtml.includes('.querySelectorAll(\'.support-trigger\')')) {
  const scriptInsertion = `
    document.querySelectorAll('.support-trigger').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        openModal('supportModal');
      });
    });
  `;
  adminHtml = adminHtml.replace(/(document\.querySelectorAll\('\.legal-trigger-terms'\)[\s\S]*?\}\);)/, "$1\n" + scriptInsertion);
}

fs.writeFileSync(adminPath, adminHtml, 'utf-8');

console.log("Footer and Support Hub executed successfully.");
