const { getDatabaseManager } = require('./database-manager.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// const EncryptionManager = require('../security/encryption'); // Module not found

class DatabaseManager {
  constructor(dbPath = './poll-automation.db') {
    // Database path managed by DatabaseManager
        this.dbPath = dbPath;
        this.db = null; // Will be initialized with DatabaseManager
        // this.encryption = new EncryptionManager(); // Module not found
  }

  // Initialize database connection
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(new Error(`Database connection failed: ${err.message}`));
        } else {
          console.log('Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  // Close database connection
  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) console.error('Error closing database:', err);
          else console.log('Database connection closed');
          resolve();
        });
      });
    }
  }

  // Poll Sites Management
  async addPollSite(siteData) {
    const query = `
      INSERT INTO poll_sites (
        name, base_url, login_url, username_selector, password_selector,
        submit_selector, polls_page_url, poll_selectors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(query, [
        siteData.name,
        siteData.base_url,
        siteData.login_url,
        siteData.username_selector,
        siteData.password_selector,
        siteData.submit_selector,
        siteData.polls_page_url,
        JSON.stringify(siteData.poll_selectors)
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getPollSites() {
    const query = 'SELECT * FROM poll_sites ORDER BY name';
    
    return new Promise((resolve, reject) => {
      this.db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else {
          const sites = rows.map(row => ({
            ...row,
            poll_selectors: JSON.parse(row.poll_selectors || '{}')
          }));
          resolve(sites);
        }
      });
    });
  }

  async getPollSiteById(id) {
    const query = 'SELECT * FROM poll_sites WHERE id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.get(query, [id], (err, row) => {
        if (err) reject(err);
        else if (row) {
          resolve({
            ...row,
            poll_selectors: JSON.parse(row.poll_selectors || '{}')
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  // Credentials Management (with encryption)
  async saveCredentials(siteId, username, password) {
    const encryptedPassword = this.encryption.encrypt(password);
    
    const query = `
      INSERT OR REPLACE INTO credentials (site_id, username, password_encrypted)
      VALUES (?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(query, [siteId, username, encryptedPassword], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getCredentials(siteId) {
    const query = 'SELECT * FROM credentials WHERE site_id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.get(query, [siteId], (err, row) => {
        if (err) reject(err);
        else if (row) {
          try {
            const decryptedPassword = this.encryption.decrypt(row.password_encrypted);
            resolve({
              username: row.username,
              password: decryptedPassword
            });
          } catch (decryptError) {
            reject(new Error('Failed to decrypt credentials'));
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  // Session Management
  async saveSession(siteId, cookies, authTokens, expiresAt) {
    const query = `
      INSERT OR REPLACE INTO sessions (site_id, cookies, auth_tokens, expires_at)
      VALUES (?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(query, [
        siteId,
        JSON.stringify(cookies),
        JSON.stringify(authTokens),
        expiresAt
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getSession(siteId) {
    const query = `
      SELECT * FROM sessions 
      WHERE site_id = ? AND expires_at > datetime('now')
      ORDER BY last_used DESC
      LIMIT 1
    `;
    
    return new Promise((resolve, reject) => {
      this.db.get(query, [siteId], (err, row) => {
        if (err) reject(err);
        else if (row) {
          resolve({
            ...row,
            cookies: JSON.parse(row.cookies || '[]'),
            auth_tokens: JSON.parse(row.auth_tokens || '{}')
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async updateSessionUsage(sessionId) {
    const query = 'UPDATE sessions SET last_used = datetime("now") WHERE id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.run(query, [sessionId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Poll Management
  async savePoll(pollData) {
    const query = `
      INSERT INTO polls (site_id, poll_url, title, questions, answers, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(query, [
        pollData.site_id,
        pollData.poll_url,
        pollData.title,
        JSON.stringify(pollData.questions),
        JSON.stringify(pollData.answers),
        pollData.status || 'pending'
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async updatePollStatus(pollId, status, answers = null) {
    let query = 'UPDATE polls SET status = ?';
    const params = [status];
    
    if (answers) {
      query += ', answers = ?';
      params.push(JSON.stringify(answers));
    }
    
    if (status === 'completed') {
      query += ', completed_at = datetime("now")';
    }
    
    query += ' WHERE id = ?';
    params.push(pollId);

    return new Promise((resolve, reject) => {
      this.db.run(query, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getPendingPolls(siteId = null) {
    let query = 'SELECT * FROM polls WHERE status = "pending"';
    const params = [];
    
    if (siteId) {
      query += ' AND site_id = ?';
      params.push(siteId);
    }
    
    query += ' ORDER BY created_at ASC';

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else {
          const polls = rows.map(row => ({
            ...row,
            questions: JSON.parse(row.questions || '[]'),
            answers: JSON.parse(row.answers || '[]')
          }));
          resolve(polls);
        }
      });
    });
  }

  // Logging
  async logAction(siteId, action, details, success = true) {
    const query = `
      INSERT INTO logs (site_id, action, details, success)
      VALUES (?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(query, [siteId, action, details, success], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getRecentLogs(siteId = null, limit = 100) {
    let query = 'SELECT * FROM logs';
    const params = [];
    
    if (siteId) {
      query += ' WHERE site_id = ?';
      params.push(siteId);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Statistics
  async getStats() {
    const queries = {
      totalSites: 'SELECT COUNT(*) as count FROM poll_sites',
      totalPolls: 'SELECT COUNT(*) as count FROM polls',
      completedPolls: 'SELECT COUNT(*) as count FROM polls WHERE status = "completed"',
      failedPolls: 'SELECT COUNT(*) as count FROM polls WHERE status = "failed"',
      activeSessions: 'SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime("now")'
    };

    const stats = {};
    
    for (const [key, query] of Object.entries(queries)) {
      try {
        stats[key] = await new Promise((resolve, reject) => {
          this.db.get(query, [], (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
          });
        });
      } catch (error) {
        stats[key] = 0;
      }
    }

    return stats;
  }

  // Cleanup old data
  async cleanup() {
    const queries = [
      'DELETE FROM sessions WHERE expires_at < datetime("now", "-7 days")',
      'DELETE FROM logs WHERE timestamp < datetime("now", "-30 days")',
      'DELETE FROM polls WHERE status = "completed" AND completed_at < datetime("now", "-90 days")'
    ];

    for (const query of queries) {
      await new Promise((resolve, reject) => {
        this.db.run(query, [], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    console.log('Database cleanup completed');
  }
}

module.exports = DatabaseManager;