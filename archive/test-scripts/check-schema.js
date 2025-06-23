#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/polls.db');

const db = new sqlite3.Database(DB_PATH);

console.log('🔍 Checking registration_attempts table schema...');

db.all("PRAGMA table_info(registration_attempts)", (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    console.log('\n📋 registration_attempts columns:');
    rows.forEach(row => {
        console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.dflt_value ? `DEFAULT ${row.dflt_value}` : ''}`);
    });
    
    db.close();
});