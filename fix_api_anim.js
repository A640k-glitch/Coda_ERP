const fs = require('fs');
let content = fs.readFileSync('public/api.html', 'utf8');

// Remove authPopoutLoading from api.html too
content = content.replace(/<div id="authPopoutLoading"[\s\S]*?<\/div>/, '');
content = content.replace(/transition: all 0\.6s cubic-bezier\(0\.34, 1\.56, 0\.64, 1\);/g, 'transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1);');
content = content.replace(/id="inlineAuthContent" style="width:100%; height:100%; overflow-y:auto; opacity: 0; transition: opacity 0\.4s ease;/, 'id="inlineAuthContent" style="width:100%; height:100%; overflow-y:auto; opacity: 1; transition: opacity 0.25s ease;');
content = content.replace(/const loadingState = document\.getElementById\('authPopoutLoading'\);/, '');
content = content.replace(/if\(loadingState\) loadingState\.style\.opacity = '0';/g, '');
content = content.replace(/if\(loadingState\) loadingState\.style\.opacity = '1';/g, '');
content = content.replace(/setTimeout\(\(\) => \{[\s\n]*if\(inlineContent\) inlineContent\.style\.opacity = '1';[\s\n]*\}, 400\);/g, "if(inlineContent) inlineContent.style.opacity = '1';");
content = content.replace(/1100/g, '1400');
content = content.replace(/800/g, '900');

// Remove reveal from api.html
content = content.replace(/ class="(.*?)reveal(.*?)"/g, ' class="$1$2"');
content = content.replace(/ class="reveal"/g, '');
content = content.replace(/ class="(.*?)  (.*?)"/g, ' class="$1 $2"');
content = content.replace(/ class=" "/g, '');

fs.writeFileSync('public/api.html', content);
console.log('Fixed api.html');
