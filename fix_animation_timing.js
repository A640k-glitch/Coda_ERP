const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// Remove inlineContent opacity toggling
html = html.replace("if(inlineContent) inlineContent.style.opacity = '0';", "");
html = html.replace("if(inlineContent) inlineContent.style.opacity = '1';", "");
html = html.replace("if(inlineContent) inlineContent.style.opacity = '0';", ""); // in close handler
html = html.replace("setTimeout(() => {", "setTimeout(() => {"); // just to be safe, but wait, I can just replace the whole setTimeout block

html = html.replace(`setTimeout(() => {
              if(inlineContent) inlineContent.style.opacity = '1';
              closeBtn.style.opacity = '1';
            }, 100);`, `closeBtn.style.opacity = '1';`);

html = html.replace(`if(inlineContent) inlineContent.style.opacity = '0';
        closeBtn.style.opacity = '0';
        
        document.body.style.overflow = 'hidden';`, `closeBtn.style.opacity = '0';
        
        document.body.style.overflow = 'hidden';`);

html = html.replace(`document.body.style.overflow = '';
      
      if(inlineContent) inlineContent.style.opacity = '0';
      closeBtn.style.opacity = '0';`, `document.body.style.overflow = '';
      
      closeBtn.style.opacity = '0';`);

fs.writeFileSync('public/index.html', html);
console.log('Fixed animation mismatch in index.html');
