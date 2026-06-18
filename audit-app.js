const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const issues = [];

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Check 1: Multiple id="supportModal" or missing supportModal?
  const supportModals = (content.match(/id="supportModal"/g) || []).length;
  if (supportModals > 1) issues.push(`[${file}] Multiple supportModal definitions`);

  // Check 2: Check if modal close logic has proper selectors
  const hasCloseLogic = content.includes('closeModal(');
  if (!hasCloseLogic) {
    issues.push(`[${file}] Missing closeModal function or logic`);
  } else {
    // Determine which close button selector is used
    if (content.includes("m.querySelectorAll('button')")) {
      // It's using the broad 'button' selector
    } else if (content.includes("m.querySelectorAll('.modal-close-btn, .legal-modal-close, button.btn-primary')")) {
      // It's using the strict selector
    } else {
      issues.push(`[${file}] Uses an unknown or potentially buggy close button selector`);
    }
  }

  // Check 3: Check for duplicated class attributes e.g. class="..." class="..."
  if (content.match(/class="[^"]*"\s+class="[^"]*"/)) {
    issues.push(`[${file}] Contains duplicated class attributes`);
  }

  // Check 4: Check if support-trigger is present
  const hasSupportTrigger = content.includes('support-trigger');
  if (hasSupportTrigger && supportModals === 0) {
    issues.push(`[${file}] Has support-trigger but NO supportModal HTML`);
  }

  // Check 5: Check if no-scroll logic has height: 100vh bug (in CSS, but we can check if inline)
  if (content.includes('height: 100vh') && content.includes('no-scroll')) {
    issues.push(`[${file}] Might have inline no-scroll height bug`);
  }

  // Check 6: Check for the FAQ drop-down bug `maxHeight = null`
  if (content.includes('maxHeight = null')) {
    issues.push(`[${file}] Contains the FAQ accordion bug (maxHeight = null)`);
  }
});

console.log('--- AUDIT RESULTS ---');
if (issues.length === 0) {
  console.log('No issues found based on current checks.');
} else {
  issues.forEach(i => console.log(i));
}
