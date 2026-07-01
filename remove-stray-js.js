const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'public', 'how-it-works.html');
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Delete lines from index 1201 (line 1202) to index 1322 (line 1323)
lines.splice(1201, 1323 - 1201 + 1);

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Deleted stray js lines.');
