const { db, seedAccounts } = require('./src/db');
const businesses = db.prepare('SELECT id FROM businesses').all();
let seeded = 0;
for (const b of businesses) {
  const cnt = db.prepare('SELECT COUNT(*) AS cnt FROM accounts WHERE business_id = ?').get(b.id).cnt;
  if (cnt === 0) {
    seedAccounts(b.id);
    seeded++;
    console.log(`Seeded accounts for business ${b.id}`);
  }
}
console.log(`Seeded accounts for ${seeded} businesses.`);
