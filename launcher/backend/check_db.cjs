const Database = require('better-sqlite3');
const db = new Database('./data/afkflow.db');
console.log('Users:', JSON.stringify(db.prepare('SELECT * FROM users').all()));
console.log('Sessions:', JSON.stringify(db.prepare('SELECT * FROM sessions').all()));
console.log('Subscriptions:', JSON.stringify(db.prepare('SELECT * FROM subscriptions').all()));