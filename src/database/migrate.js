/**
 * Migration runner.
 * Usage:
 *   node src/database/migrate.js          -> creates tables if they do not exist
 *   node src/database/migrate.js --force  -> drops all tables first, then recreates (destructive)
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

function dropAllTables() {
  const tables = [
    'notifications',
    'reviews',
    'applications',
    'tasks',
    'categories',
    'profiles',
    'users',
  ];
  db.pragma('foreign_keys = OFF');
  for (const table of tables) {
    db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }
  db.pragma('foreign_keys = ON');
}

function migrate() {
  const force = process.argv.includes('--force');

  if (force) {
    console.log('[migrate] --force flag detected: dropping existing tables...');
    dropAllTables();
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  db.exec(schema);

  console.log('[migrate] Schema applied successfully.');
}

migrate();
