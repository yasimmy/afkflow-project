import { getDb } from './src/database/db.js';

const db = getDb();
console.log('Users:', db.prepare('SELECT * FROM users').all());
console.log('Sessions:', db.prepare('SELECT * FROM sessions').all());
console.log('Subscriptions:', db.prepare('SELECT * FROM subscriptions').all());