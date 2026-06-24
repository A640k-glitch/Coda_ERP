const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// Remove authPopoutLoading
content = content.replace(/<div id="authPopoutLoading"[\s\S]*?<\/div>/, '');

// Make animation faster and less bouncy
content = content.replace(/transition: all 0\.6s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\);/g, 'transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);');

// Change opacity: 0 of inlineAuthContent to 1 to remove loading delay
content = content.replace(/id="inlineAuthContent" style="width:100%; height:100%; overflow-y:auto; opacity: 0; transition: opacity 0\.4s ease;/, 'id="inlineAuthContent" style="width:100%; height:100%; overflow-y:auto; opacity: 1; transition: opacity 0.25s ease;');

// Remove the JS that handles the loading spinner
content = content.replace(/const loadingState = document\.getElementById\('authPopoutLoading'\);/, '');
content = content.replace(/if\(loadingState\) loadingState\.style\.opacity = '0';/g, '');
content = content.replace(/if\(loadingState\) loadingState\.style\.opacity = '1';/g, '');
content = content.replace(/setTimeout\(\(\) => \{[\s\n]*if\(inlineContent\) inlineContent\.style\.opacity = '1';[\s\n]*\}, 400\);/g, "if(inlineContent) inlineContent.style.opacity = '1';");

fs.writeFileSync('public/index.html', content);
console.log('Fixed index.html animations and loading states');
