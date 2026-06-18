const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000/');
  
  // Try clicking Privacy Policy
  console.log('Clicking Privacy Policy...');
  await page.evaluate(() => {
    const el = document.querySelector('a[onclick*="privacyModal"]');
    if (el) el.click();
    else console.log('Link not found!');
  });
  
  await page.waitForTimeout(500);
  
  const modalClass = await page.evaluate(() => {
    const modal = document.getElementById('privacyModal');
    return modal ? modal.className : 'NULL';
  });
  console.log('Modal class after click:', modalClass);
  
  const scrollY = await page.evaluate(() => window.scrollY);
  console.log('Scroll Y after click:', scrollY);
  
  await browser.close();
})();
