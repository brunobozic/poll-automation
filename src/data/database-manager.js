/**
 * Database Manager
 * Centralized database connection and management
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(process.cwd(), 'poll-automation.db');
        this.isInitialized = false;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Database connection failed:', err);
                    reject(err);
                } else {
                    console.log('✅ Database connected successfully');
                    this.isInitialized = true;
                    resolve();
                }
            });
        });
    }

    getConnection() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Database close error:', err);
                    }
                    this.isInitialized = false;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new DatabaseManager();