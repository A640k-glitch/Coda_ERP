const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('c:/Users/AK/Documents/fifthapp/public/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously' });

setTimeout(() => {
  try {
    const btn = dom.window.document.querySelector('a[onclick*="termsModal"]');
    console.log('Button found:', !!btn);
    btn.click();
    console.log('After click, modal active:', dom.window.document.getElementById('termsModal').className);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}, 500);
