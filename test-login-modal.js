const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, 'public', 'login.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const dom = new JSDOM(htmlContent, {
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.document.addEventListener("DOMContentLoaded", () => {
  const document = dom.window.document;
  
  // Find the privacy link
  const privacyLink = document.querySelector('a[onclick*="privacyModal"]');
  console.log("Privacy link found:", !!privacyLink);
  
  if (privacyLink) {
    console.log("Onclick attribute:", privacyLink.getAttribute('onclick'));
    
    // Simulate click manually since JSDOM might not execute inline onclick automatically
    // Wait, runScripts: "dangerously" SHOULD execute it if we call click()
    privacyLink.click();
    
    setTimeout(() => {
      const modal = document.getElementById('privacyModal');
      console.log("Modal found:", !!modal);
      if (modal) {
        console.log("Modal display style:", modal.style.display);
        const computed = dom.window.getComputedStyle(modal);
        console.log("Modal computed display:", computed.display);
      }
    }, 100);
  }
});
