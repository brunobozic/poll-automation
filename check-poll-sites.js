#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'data/polls.db');

const db = new sqlite3.Database(DB_PATH);

db.all('SELECT * FROM poll_sites', (err, rows) => {
    if (err) {
        console.error('Error querying poll_sites:', err);
        return;
    }
    
    console.log('📊 Poll Sites Data:');
    console.log(JSON.stringify(rows, null, 2));
    
    db.close();
});