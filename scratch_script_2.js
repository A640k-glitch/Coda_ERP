
  document.addEventListener('DOMContentLoaded', function() {
    // FAQ Accordion Logic
    const faqToggles = document.querySelectorAll('.faq-toggle');
    faqToggles.forEach(toggle => {
      toggle.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent accidental form submissions/jumps
        const content = this.nextElementSibling;
        const icon = this.querySelector('.faq-icon');
        
        // Close all others safely
        document.querySelectorAll('.faq-content').forEach(c => {
          if(c !== content) {
            c.style.maxHeight = '0px';
            c.style.paddingTop = '0px';
          }
        });
        document.querySelectorAll('.faq-icon').forEach(i => {
          if(i !== icon) {
            i.style.transform = 'rotate(0deg)';
          }
        });

        if (content.style.maxHeight && content.style.maxHeight !== '0px') {
          content.style.maxHeight = '0px';
          content.style.paddingTop = '0px';
          icon.style.transform = 'rotate(0deg)';
        } else {
          content.style.paddingTop = '12px';
          content.style.maxHeight = content.scrollHeight + 24 + "px";
          icon.style.transform = 'rotate(180deg)';
        }
      });
    });
  });
