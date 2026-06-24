const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

// The class might be just "hero-text-container" without reveal already.
// Let's just remove .reveal from the entire document to stop all flashing.
content = content.replace(/ class="(.*?)reveal(.*?)"/g, ' class="$1$2"');
content = content.replace(/ class="reveal"/g, '');

// Fix double spaces in class
content = content.replace(/ class="(.*?)  (.*?)"/g, ' class="$1 $2"');
content = content.replace(/ class=" "/g, '');

fs.writeFileSync('public/index.html', content);
console.log('Removed reveal class from entire page');
