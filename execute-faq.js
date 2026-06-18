const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// The new FAQ structure to replace the static list
const newFaqStructure = `
      <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 12px;">Frequently Asked Questions</h3>
      <div class="faq-accordion" style="display: flex; flex-direction: column; gap: 8px;">
        
        <div class="faq-item" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <button class="faq-toggle" style="width: 100%; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: none; padding: 12px 16px; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif;">
            <span style="color: #0f172a; font-weight: 600; font-size: 14px;">How do I reset my account password?</span>
            <span class="material-symbols-outlined faq-icon" style="color: #64748b; font-size: 20px; transition: transform 0.2s;">expand_more</span>
          </button>
          <div class="faq-content" style="padding: 0 16px; max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease; background: #fff;">
            <p style="font-size: 14px; color: #475569; margin: 0; padding-bottom: 12px; line-height: 1.5;">Go to the login screen and click "Forgot Password". A secure reset link will be sent to your registered email. For security, links expire after 15 minutes.</p>
          </div>
        </div>

        <div class="faq-item" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <button class="faq-toggle" style="width: 100%; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: none; padding: 12px 16px; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif;">
            <span style="color: #0f172a; font-weight: 600; font-size: 14px;">How do I export monthly financial reports?</span>
            <span class="material-symbols-outlined faq-icon" style="color: #64748b; font-size: 20px; transition: transform 0.2s;">expand_more</span>
          </button>
          <div class="faq-content" style="padding: 0 16px; max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease; background: #fff;">
            <p style="font-size: 14px; color: #475569; margin: 0; padding-bottom: 12px; line-height: 1.5;">Navigate to the <b>Reports</b> tab from your dashboard. Select "Profit & Loss" or "Balance Sheet", choose your date range, and click the Export button to download as CSV or PDF.</p>
          </div>
        </div>

        <div class="faq-item" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <button class="faq-toggle" style="width: 100%; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: none; padding: 12px 16px; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif;">
            <span style="color: #0f172a; font-weight: 600; font-size: 14px;">How do I run Bank Reconciliation?</span>
            <span class="material-symbols-outlined faq-icon" style="color: #64748b; font-size: 20px; transition: transform 0.2s;">expand_more</span>
          </button>
          <div class="faq-content" style="padding: 0 16px; max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease; background: #fff;">
            <p style="font-size: 14px; color: #475569; margin: 0; padding-bottom: 12px; line-height: 1.5;">Open the <b>Bank Reconciliation</b> module. You can manually match your ERP ledger entries against your uploaded bank statements by clicking the "Match" icon next to each transaction.</p>
          </div>
        </div>

        <div class="faq-item" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <button class="faq-toggle" style="width: 100%; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: none; padding: 12px 16px; cursor: pointer; text-align: left; font-family: 'Inter', sans-serif;">
            <span style="color: #0f172a; font-weight: 600; font-size: 14px;">How do I manage team permissions?</span>
            <span class="material-symbols-outlined faq-icon" style="color: #64748b; font-size: 20px; transition: transform 0.2s;">expand_more</span>
          </button>
          <div class="faq-content" style="padding: 0 16px; max-height: 0; overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease; background: #fff;">
            <p style="font-size: 14px; color: #475569; margin: 0; padding-bottom: 12px; line-height: 1.5;">Navigate to the <b>Admin Portal</b>. From the "Team Management" section, you can add new users and assign them specific role-based access controls (e.g., restricted to HR & Payroll or full access).</p>
          </div>
        </div>
        
      </div>
`;

const newButtonHTML = `<a href="mailto:support@codatechnologies.com" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;text-decoration:none;cursor:pointer;width:100%;height:40px;box-sizing:border-box;">Contact Support Team</a>`;

const scriptHtml = `
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // FAQ Accordion Logic
    const faqToggles = document.querySelectorAll('.faq-toggle');
    faqToggles.forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent accidental form submissions/jumps
        const content = this.nextElementSibling;
        const icon = this.querySelector('.faq-icon');
        
        // Close all others
        document.querySelectorAll('.faq-content').forEach(c => {
          if(c !== content) {
            c.style.maxHeight = null;
            c.style.paddingTop = '0';
          }
        });
        document.querySelectorAll('.faq-icon').forEach(i => {
          if(i !== icon) {
            i.style.transform = 'rotate(0deg)';
          }
        });

        if (content.style.maxHeight) {
          content.style.maxHeight = null;
          content.style.paddingTop = '0';
          icon.style.transform = 'rotate(0deg)';
        } else {
          content.style.paddingTop = '12px';
          content.style.maxHeight = content.scrollHeight + 24 + "px";
          icon.style.transform = 'rotate(180deg)';
        }
      });
    });
  });
</script>
`;

['dashboard.html', 'admin.html'].forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace old static FAQ with new accordion
  const oldFaqRegex = /<h3 style="font-size: 16px; color: #0f172a; margin-bottom: 12px;">Frequently Asked Questions<\/h3>[\s\S]*?<\/ul>/;
  content = content.replace(oldFaqRegex, newFaqStructure);

  // Replace button
  const oldButtonRegex = /<button class="modal-close-btn" style="display:inline-flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;width:100%;height:40px;">Contact Support Team<\/button>/;
  content = content.replace(oldButtonRegex, newButtonHTML);

  // Inject Script before </body>
  if (!content.includes('FAQ Accordion Logic')) {
    content = content.replace('</body>', scriptHtml + '\n</body>');
  }

  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('FAQ Accordion successfully generated and injected.');
