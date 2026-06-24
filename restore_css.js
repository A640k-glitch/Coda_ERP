const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(
  /      \.btn-pricing {\r?\n    \.auth-form-panel {/,
  `      .pricing-card-glass {
        padding: 32px !important;
      }

      .btn-pricing {
        height: 36px;
        font-size: 12px;
      }
    }

    /* zoom removed to fix painting glitches */
    .auth-container {
      display: flex;
      width: 100%;
      min-height: 100vh;
    }
    .auth-form-panel {`
);

fs.writeFileSync('public/index.html', html);
console.log('Restored index.html CSS');
