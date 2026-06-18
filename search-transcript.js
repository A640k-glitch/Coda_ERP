const fs = require('fs');
const path = 'C:/Users/AK/.gemini/antigravity/brain/00488089-91f6-4d0a-aba1-f8011bb4dc25/.system_generated/logs/transcript.jsonl';
if (!fs.existsSync(path)) {
  console.log('Transcript not found at ' + path);
  process.exit(1);
}
const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('adminBtn') || line.includes('Admin Panel')) {
    // try to parse json
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
          if (tc.args && tc.args.ReplacementContent && (tc.args.ReplacementContent.includes('adminBtn') || tc.args.ReplacementContent.includes('Admin Panel'))) {
            console.log('FOUND REPLACEMENT:');
            console.log(tc.args.ReplacementContent);
            console.log('----------------');
          }
        });
      }
    } catch(e) {}
  }
}
