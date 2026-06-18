const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const data = {};

htmlFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract Terms of Service text
  let termsMatch = content.match(/Terms of Service.*?<p[^>]*>(.*?)<\/p>/s);
  let termsText = termsMatch ? termsMatch[1].trim() : null;
  
  // Extract Privacy Policy text
  let privacyMatch = content.match(/Privacy Policy.*?<p[^>]*>(.*?)<\/p>/s);
  let privacyText = privacyMatch ? privacyMatch[1].trim() : null;
  
  // Extract Footer text
  let footerMatch = content.match(/&copy;\s*(.*?)<\/div>/s) || content.match(/&copy;\s*(.*?)<\/span>/s);
  let footerText = footerMatch ? footerMatch[1].trim() : null;
  
  // Extract logo color
  let logoMatch = content.match(/rect[^>]*fill="([^"]+)"[^>]*>/);
  let logoColor = logoMatch ? logoMatch[1] : null;

  data[file] = {
    termsText: termsText ? termsText.substring(0, 50) + '...' : null,
    privacyText: privacyText ? privacyText.substring(0, 50) + '...' : null,
    footerText,
    logoColor
  };
});

console.log(JSON.stringify(data, null, 2));
