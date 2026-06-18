const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// Correct brand color
const BRAND_COLOR = '#0d9488';

// Universal legal texts
const termsText = `By accessing Coda's enterprise financial systems, you agree to these Terms of Service. As a financial operating system, you entrust us with critical business data; in turn, you agree to use the platform lawfully and maintain the confidentiality of your account credentials.</p>\n      <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">While Coda guarantees 99.9% uptime and rigorous data backups for our core ERP features, the platform is provided without liability for indirect business losses. You remain responsible for the accuracy of the financial and tax data you input into the system.`;
const termsTextIndex = `By accessing Coda's enterprise financial systems, you agree to these Terms of Service. As a financial operating system, you entrust us with critical business data; in turn, you agree to use the platform lawfully and maintain the confidentiality of your account credentials.</p>\n      <p>While Coda guarantees 99.9% uptime and rigorous data backups for our core ERP features, the platform is provided without liability for indirect business losses. You remain responsible for the accuracy of the financial and tax data you input into the system.`;

const privacyText = `Coda acts as a data processor for your business. We securely process your financial, payroll, employee, and customer data exclusively to provide our ERP services. We employ military-grade encryption and strict access controls to ensure your corporate data remains confidential, compliant with financial regulations, and is never sold to third parties.</p>\n    <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we're collecting it and how it will be used. We don't share any personally identifying information publicly or with third-parties, except when required to by law.`;

const footerFull = `&copy; 2026 Coda Technologies Ltd. All rights reserved.`;

// 1. Fix Logo Color everywhere
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
htmlFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace teal-500 (#14b8a6) with teal-600 (#0d9488) in logos
  content = content.replace(/fill="#14b8a6"/g, 'fill="#0d9488"');
  
  fs.writeFileSync(filePath, content, 'utf-8');
});

// 2. Fix api.html Privacy Policy
{
  const filePath = path.join(publicDir, 'api.html');
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(
    /<h2 style="font-size:20px;margin-bottom:16px;">Privacy Policy<\/h2>[\s\S]*?<button/m,
    `<h2 style="font-size:20px;margin-bottom:16px;">Privacy Policy</h2>\n    <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">${privacyText}</p>\n    <button`
  );
  fs.writeFileSync(filePath, content, 'utf-8');
}

// 3. Fix Footer Text in Auth Pages
['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html'].forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/&copy; 2026 Coda Technologies<\/span>/g, `&copy; 2026 Coda Technologies Ltd. All rights reserved.</span>`);
  fs.writeFileSync(filePath, content, 'utf-8');
});

// 4. Fix Dashboard.html links and modals
{
  const filePath = path.join(publicDir, 'dashboard.html');
  let content = fs.readFileSync(filePath, 'utf-8');
  
  content = content.replace(/<a href="#">Privacy<\/a>/, '<a href="#!" class="legal-trigger-privacy">Privacy</a>');
  content = content.replace(/<a href="#">Terms<\/a>/, '<a href="#!" class="legal-trigger-terms">Terms</a>');
  
  // Inject the universal modal HTML if missing
  if (!content.includes('id="termsModal"')) {
    const modalsHtml = `
<div class="modal-overlay" id="termsModal" style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:1000;">
  <div style="background:#fff;width:100%;max-width:500px;border-radius:14px;padding:32px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);">
    <button class="modal-close-btn" style="position:absolute;top:24px;right:24px;background:none;border:none;cursor:pointer;color:#64748b;"><span class="material-symbols-outlined">close</span></button>
    <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:24px;">
      <span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><svg viewBox="20 20 54 58" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/><rect x="22" y="32" width="18" height="38" rx="3.5" fill="currentColor"/><rect x="34" y="62" width="38" height="14" rx="3" fill="currentColor"/></svg></span>
      <span>Coda</span>
    </div>
    <h2 style="font-size:20px;margin-bottom:16px;">Terms of Service</h2>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">${termsText}</p>
    <button class="modal-close-btn" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;width:100%;margin-top:16px;height:40px;">Acknowledge</button>
  </div>
</div>

<div class="modal-overlay" id="privacyModal" style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:1000;">
  <div style="background:#fff;width:100%;max-width:500px;border-radius:14px;padding:32px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);">
    <button class="modal-close-btn" style="position:absolute;top:24px;right:24px;background:none;border:none;cursor:pointer;color:#64748b;"><span class="material-symbols-outlined">close</span></button>
    <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:24px;">
      <span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><svg viewBox="20 20 54 58" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/><rect x="22" y="32" width="18" height="38" rx="3.5" fill="currentColor"/><rect x="34" y="62" width="38" height="14" rx="3" fill="currentColor"/></svg></span>
      <span>Coda</span>
    </div>
    <h2 style="font-size:20px;margin-bottom:16px;">Privacy Policy</h2>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">${privacyText}</p>
    <button class="modal-close-btn" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;width:100%;margin-top:16px;height:40px;">Acknowledge</button>
  </div>
</div>
`;
    // We can't safely assume </body>, but we can append it at the end of the file.
    content += `\n${modalsHtml}\n`;
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

console.log('Execution completed successfully.');
