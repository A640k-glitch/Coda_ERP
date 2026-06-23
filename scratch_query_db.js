const Database = require('better-sqlite3');
const db = new Database('./data/coda.db');

const users = db.prepare('SELECT id, email, name, role, business_id FROM users').all();
console.log('USERS:', JSON.stringify(users, null, 2));

const businesses = db.prepare('SELECT id, name, tier, subscription_status FROM businesses').all();
console.log('BUSINESSES:', JSON.stringify(businesses, null, 2));
