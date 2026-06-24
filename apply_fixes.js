const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// 1. Remove the legacy auth buttons in navAuthArea
content = content.replace(
  /<div class="nav-auth" id="navAuthArea">[\s\S]*?<\/div>/,
  '<div class="nav-auth" id="navAuthArea"></div>'
);

// 2. Remove the 'Sign In' link inside the popup
content = content.replace(
  /<div class="auth-alt">\s*Already have an account\? <a href="\/login">Sign In<\/a>\s*<\/div>/,
  ''
);

// 3. Fix the transform on initial/close
content = content.replace(
  /container\.style\.display = 'block';\s*container\.style\.top = rect\.top \+ 'px';\s*container\.style\.left = rect\.left \+ 'px';\s*container\.style\.width = rect\.width \+ 'px';/,
  "container.style.display = 'block';\n      container.style.top = rect.top + 'px';\n      container.style.left = rect.left + 'px';\n      container.style.transform = 'none';\n      container.style.width = rect.width + 'px';"
);

content = content.replace(
  /\/\/ Animate container back to button\s*container\.style\.top = rect\.top \+ 'px';\s*container\.style\.left = rect\.left \+ 'px';\s*container\.style\.width = rect\.width \+ 'px';/,
  "// Animate container back to button\n      container.style.top = rect.top + 'px';\n      container.style.left = rect.left + 'px';\n      container.style.transform = 'none';\n      container.style.width = rect.width + 'px';"
);

// 4. Fix the target centering to use transform
content = content.replace(
  /\/\/ Target bounds \(centered\)[\s\S]*?container\.style\.left = targetLeft \+ 'px';/,
  "// Target bounds (centered)\n      const targetWidth = Math.min(window.innerWidth - 48, 1100);\n      const targetHeight = Math.min(window.innerHeight - 48, 800);\n      \n      container.style.top = '50%';\n      container.style.left = '50%';\n      container.style.transform = 'translate(-50%, -50%)';\n      container.style.width = targetWidth + 'px';"
);

fs.writeFileSync('public/index.html', content);
console.log('Fixed index.html properly');
