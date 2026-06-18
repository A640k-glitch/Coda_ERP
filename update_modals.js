const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = ['index.html', 'api.html', 'login.html', 'signup.html', 'forgot-password.html', 'reset-password.html'];

const oldPrivacyText1 = `Your privacy is important to us. It is Coda's policy to respect your privacy regarding any information we may collect from you across our website, platform, and other sites we own and operate.`;
const newPrivacyText1 = `Coda acts as a data processor for your business. We securely process your financial, payroll, employee, and customer data exclusively to provide our ERP services. We employ military-grade encryption and strict access controls to ensure your corporate data remains confidential, compliant with financial regulations, and is never sold to third parties.`;

const oldTermsText1 = `By accessing and using Coda's enterprise financial systems, you agree to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.`;
const oldTermsText2 = `Our platform is provided "as is". Coda makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.`;

const newTermsText1 = `By accessing Coda's enterprise financial systems, you agree to these Terms of Service. As a financial operating system, you entrust us with critical business data; in turn, you agree to use the platform lawfully and maintain the confidentiality of your account credentials.`;
const newTermsText2 = `While Coda guarantees 99.9% uptime and rigorous data backups for our core ERP features, the platform is provided without liability for indirect business losses. You remain responsible for the accuracy of the financial and tax data you input into the system.`;

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Update text
  content = content.replace(oldPrivacyText1, newPrivacyText1);
  content = content.replace(oldTermsText1, newTermsText1);
  content = content.replace(oldTermsText2, newTermsText2);

  // If the file is forgot-password or reset-password, inject the footer links and modals
  if (file === 'forgot-password.html' || file === 'reset-password.html') {
    // 1. Add links to footer
    const footerRegex = /(<span>&copy; 2026 Coda Technologies<\/span>)/;
    if (content.match(footerRegex) && !content.includes('privacyModal')) {
      content = content.replace(footerRegex, `$1
        <div style="display: flex; gap: 12px;">
          <a href="#" onclick="event.preventDefault(); document.body.classList.add('no-scroll'); document.getElementById('privacyModal').style.display='flex'">Privacy</a>
          <a href="#" onclick="event.preventDefault(); document.body.classList.add('no-scroll'); document.getElementById('termsModal').style.display='flex'">Terms</a>
        </div>`);
    }

    // 2. Add modals at the bottom before </body>
    if (!content.includes('id="termsModal"')) {
      const modals = `
<div class="modal-overlay" id="termsModal" style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:1000;">
  <div style="background:#fff;width:100%;max-width:500px;border-radius:14px;padding:32px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);">
    <button onclick="document.body.classList.remove('no-scroll'); document.getElementById('termsModal').style.display='none'" style="position:absolute;top:24px;right:24px;background:none;border:none;cursor:pointer;color:#64748b;"><span class="material-symbols-outlined">close</span></button>
    <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:24px;">
      <span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><svg viewBox="20 20 54 58" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/><rect x="22" y="32" width="18" height="38" rx="3.5" fill="currentColor"/><rect x="34" y="62" width="38" height="14" rx="3" fill="currentColor"/></svg></span>
      <span>Coda</span>
    </div>
    <h2 style="font-size:20px;margin-bottom:16px;">Terms of Service</h2>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">${newTermsText1}</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">${newTermsText2}</p>
    <button onclick="document.body.classList.remove('no-scroll'); document.getElementById('termsModal').style.display='none'" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;width:100%;margin-top:16px;height:40px;">Acknowledge</button>
  </div>
</div>

<div class="modal-overlay" id="privacyModal" style="position:fixed;inset:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:1000;">
  <div style="background:#fff;width:100%;max-width:500px;border-radius:14px;padding:32px;position:relative;max-height:80vh;overflow-y:auto;box-shadow:0 20px 25px -5px rgba(15,23,42,0.06);">
    <button onclick="document.body.classList.remove('no-scroll'); document.getElementById('privacyModal').style.display='none'" style="position:absolute;top:24px;right:24px;background:none;border:none;cursor:pointer;color:#64748b;"><span class="material-symbols-outlined">close</span></button>
    <div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:18px;color:#0f172a;margin-bottom:24px;">
      <span style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;"><svg viewBox="20 20 54 58" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><rect x="38" y="22" width="34" height="14" rx="3" fill="#0d9488"/><rect x="22" y="32" width="18" height="38" rx="3.5" fill="currentColor"/><rect x="34" y="62" width="38" height="14" rx="3" fill="currentColor"/></svg></span>
      <span>Coda</span>
    </div>
    <h2 style="font-size:20px;margin-bottom:16px;">Privacy Policy</h2>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:12px;">${newPrivacyText1}</p>
    <button onclick="document.body.classList.remove('no-scroll'); document.getElementById('privacyModal').style.display='none'" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;width:100%;margin-top:16px;height:40px;">Acknowledge</button>
  </div>
</div>
`;
      content = content.replace('</body>', `${modals}\n</body>`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
});
console.log('Update complete.');
