const fs = require('fs');
['login.html', 'signup.html'].forEach(file => {
  let content = fs.readFileSync('c:/Users/AK/Documents/fifthapp/public/' + file, 'utf8');
  // Inject postMessage script into the close button instead of navigating to '/'
  content = content.replace(
    onclick="window.location.href='/';">, 
    onclick="if(window.parent !== window) { window.parent.postMessage('closeAuthPopout', '*'); } else { window.location.href='/'; }">
  );
  fs.writeFileSync('c:/Users/AK/Documents/fifthapp/public/' + file, content, 'utf8');
});
