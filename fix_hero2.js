const fs = require('fs');
let content = fs.readFileSync('public/index.html', 'utf8');

const regex = /<div class="hero-actions">[\s\S]*?<a href="signup\.html" class="btn btn-primary btn-lg btn-interactive">[\s\S]*?Start your free trial[\s\S]*?<\/a>[\s\S]*?<a href="login\.html" class="btn btn-secondary btn-lg">View Live Demo<\/a>[\s\S]*?<\/div>/;

const replacement = `<div class="hero-actions">
          <a href="#" class="btn btn-primary btn-lg btn-interactive trigger-auth" id="btnExpandAuth">
            Start your free trial
          </a>
        </div>`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('public/index.html', content);
  console.log('Successfully replaced hero actions');
} else {
  console.log('Regex did not match hero actions');
}
