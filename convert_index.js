const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) {
  console.error("No body found");
  process.exit(1);
}

let bodyHtml = bodyMatch[1];

bodyHtml = bodyHtml.replace(
  /<div class="hero-actions">[\s\S]*?<\/div>/,
  '<HeroButtonExpendable />'
);

bodyHtml = bodyHtml.replace(
  /<div class="nav-buttons">[\s\S]*?<\/div>/,
  '<div className="nav-buttons"></div>'
);

bodyHtml = bodyHtml.replace(/<div id="authPopoutOverlay"[\s\S]*?<\/script>/, '');

let jsx = bodyHtml;
jsx = jsx.replace(/class=/g, 'className=');
jsx = jsx.replace(/for=/g, 'htmlFor=');

// Close unclosed tags
jsx = jsx.replace(/<img([^>]*[^\/])>/g, '<img$1 />');
jsx = jsx.replace(/<input([^>]*[^\/])>/g, '<input$1 />');
jsx = jsx.replace(/<br([^>]*[^\/])?>/g, '<br$1 />');
jsx = jsx.replace(/<hr([^>]*[^\/])?>/g, '<hr$1 />');
jsx = jsx.replace(/<meta([^>]*[^\/])>/g, '<meta$1 />');
jsx = jsx.replace(/<link([^>]*[^\/])>/g, '<link$1 />');

// Convert inline styles to objects
jsx = jsx.replace(/style="([^"]*)"/g, (match, p1) => {
  const styles = p1.split(';').filter(s => s.trim() !== '');
  const obj = {};
  styles.forEach(s => {
    let [key, val] = s.split(':');
    if (key && val) {
      key = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      obj[key] = val.trim();
    }
  });
  return `style={${JSON.stringify(obj)}}`;
});

// Fix any comments
jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Remove leftover style tag entirely to avoid mapping issues
jsx = jsx.replace(/<style[\s\S]*?<\/style>/g, '');

const output = `import React, { useEffect } from 'react';
import HeroButtonExpendable from '../../components/ui/hero-button-expendable';

export default function LandingPage() {
  useEffect(() => {
    // Add logic from app.js here later if necessary
  }, []);

  return (
    <>
      ${jsx}
    </>
  );
}
`;

fs.writeFileSync('react-src/pages/LandingPage.tsx', output, 'utf8');
console.log("Converted successfully!");
