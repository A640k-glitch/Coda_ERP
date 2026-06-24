const { db } = require('./src/db');
const businesses = db.prepare('SELECT id, email FROM businesses').all();
for (const b of businesses) {
  const accounts = db.prepare('SELECT * FROM accounts WHERE business_id = ?').all(b.id);
  console.log(`Business ${b.id} (${b.email}) has ${accounts.length} accounts:`);
  console.log(accounts.map(a => a.code).join(', '));
}
