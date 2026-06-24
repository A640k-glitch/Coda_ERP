const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

const heroActionsTarget = `<div class="hero-actions">
          <a href="signup.html" class="btn btn-primary btn-lg btn-interactive">
            Start your free trial
          </a>
          <a href="login.html" class="btn btn-secondary btn-lg">View Live Demo</a>
        </div>`;

const heroActionsReplacement = `<div class="hero-actions">
          <a href="#" class="btn btn-primary btn-lg btn-interactive trigger-auth">
            Start your free trial
          </a>
        </div>`;

if (content.includes(heroActionsTarget)) {
  content = content.replace(heroActionsTarget, heroActionsReplacement);
  fs.writeFileSync('public/index.html', content);
  console.log('Fixed hero actions');
} else {
  console.log('Could not find hero actions block!');
}
