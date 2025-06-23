#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/polls.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

// List all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) {
        console.error('Error listing tables:', err);
        return;
    }
    
    console.log('\n📋 ALL TABLES IN DATABASE:');
    console.log('=' * 30);
    rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.name}`);
    });
    
    console.log(`\nTotal tables: ${rows.length}`);
    
    db.close();
});