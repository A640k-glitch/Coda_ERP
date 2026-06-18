const fs = require('fs');
const path = 'C:/Users/AK/.gemini/antigravity/brain/00488089-91f6-4d0a-aba1-f8011bb4dc25/.system_generated/logs/transcript.jsonl';
const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('Admin Panel') || line.includes('adminBtn = ')) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
          if (tc.args && tc.args.ReplacementContent && tc.args.ReplacementContent.includes('adminBtn = ')) {
            console.log('--- FOUND ---');
            console.log(tc.args.ReplacementContent);
          }
        });
      }
    } catch(e) {}
  }
}
