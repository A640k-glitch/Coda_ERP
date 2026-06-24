const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Change bezel background from dark to silver
html = html.replace(
  "background: #0c0c0e;",
  "background: linear-gradient(135deg, #e8e8ed 0%, #c8c8cf 100%);"
);
html = html.replace(
  "/* Matte black bezel */",
  "/* Silver aluminum bezel */"
);

// Update border color to silver
html = html.replace(
  "border: 3px solid #1a1a1c;",
  "border: 3px solid #b0b0b8;"
);

// Update camera dot to silver
html = html.replace(
  "background: #040404;",
  "background: #9ca3af;"
);
html = html.replace(
  "border: 1.5px solid #2d2d30;",
  "border: 1.5px solid #b0b0b8;"
);

// Update inset shadow for silver bezel
html = html.replace(
  "inset 0 0 0 1px rgba(255, 255, 255, 0.08),",
  "inset 0 0 0 1px rgba(255, 255, 255, 0.5),"
);

// Update the sheen gradient for silver
html = html.replace(
  "background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 50%);",
  "background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 50%);"
);

fs.writeFileSync('public/index.html', html);
console.log('Silver bezels applied!');
