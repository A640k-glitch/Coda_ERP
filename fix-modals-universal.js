const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Clean up any existing inline onclick handlers for the modals
  content = content.replace(/onclick="[^"]*privacyModal[^"]*"/g, 'class="legal-trigger-privacy"');
  content = content.replace(/onclick="[^"]*termsModal[^"]*"/g, 'class="legal-trigger-terms"');
  
  // Remove any previous injected modal script
  content = content.replace(/<script id="modal-fix-script">[\s\S]*?<\/script>/, '');

  const scriptToInject = `
<script id="modal-fix-script">
  document.addEventListener('DOMContentLoaded', function() {
    function openModal(id) {
      var m = document.getElementById(id);
      if (m) {
        document.body.style.overflow = 'hidden';
        m.style.setProperty('display', 'flex', 'important');
        m.classList.add('active');
        m.style.zIndex = '999999';
        m.style.opacity = '1';
        m.style.visibility = 'visible';
      }
    }
    function closeModal(id) {
      var m = document.getElementById(id);
      if (m) {
        document.body.style.overflow = '';
        m.style.setProperty('display', 'none', 'important');
        m.classList.remove('active');
      }
    }
    
    document.querySelectorAll('.legal-trigger-privacy').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        openModal('privacyModal');
      });
    });
    
    document.querySelectorAll('.legal-trigger-terms').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        openModal('termsModal');
      });
    });

    // Close buttons
    ['privacyModal', 'termsModal'].forEach(function(id) {
      var m = document.getElementById(id);
      if (m) {
        var buttons = m.querySelectorAll('button');
        buttons.forEach(function(btn) {
          btn.addEventListener('click', function() {
            closeModal(id);
          });
        });
      }
    });
  });
</script>
</body>`;

  if (!content.includes('modal-fix-script')) {
    content = content.replace('</body>', scriptToInject);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('Fixed modals universally.');
