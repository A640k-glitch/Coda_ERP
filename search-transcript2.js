const fs = require('fs');
const path = 'C:/Users/AK/.gemini/antigravity/brain/00488089-91f6-4d0a-aba1-f8011bb4dc25/.system_generated/logs/transcript.jsonl';
const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('Admin Panel') && line.includes('span class')) {
    console.log(line.substring(0, 500) + '...');
  }
}
