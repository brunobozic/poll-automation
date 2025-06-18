const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/polls.db');

const createTables = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    const schema = `
      CREATE TABLE IF NOT EXISTS poll_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        base_url TEXT NOT NULL,
        login_url TEXT,
        username_selector TEXT,
        password_selector TEXT,
        submit_selector TEXT,
        polls_page_url TEXT,
        poll_selectors TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        password_encrypted TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES poll_sites (id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        cookies TEXT,
        auth_tokens TEXT,
        expires_at TIMESTAMP,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES poll_sites (id)
      );

      CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER NOT NULL,
        poll_url TEXT NOT NULL,
        title TEXT,
        questions TEXT,
        answers TEXT,
        status TEXT CHECK(status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES poll_sites (id)
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id INTEGER,
        poll_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        success BOOLEAN,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (site_id) REFERENCES poll_sites (id),
        FOREIGN KEY (poll_id) REFERENCES polls (id)
      );

      CREATE TABLE IF NOT EXISTS poll_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_id INTEGER NOT NULL,
        site_id INTEGER NOT NULL,
        session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_end TIMESTAMP,
        status TEXT CHECK(status IN ('started', 'in_progress', 'completed', 'failed', 'abandoned')) DEFAULT 'started',
        total_questions INTEGER DEFAULT 0,
        answered_questions INTEGER DEFAULT 0,
        trick_questions_detected INTEGER DEFAULT 0,
        error_message TEXT,
        completion_time_seconds INTEGER,
        FOREIGN KEY (poll_id) REFERENCES polls (id),
        FOREIGN KEY (site_id) REFERENCES poll_sites (id)
      );

      CREATE TABLE IF NOT EXISTS question_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_session_id INTEGER NOT NULL,
        question_index INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        question_options TEXT,
        is_required BOOLEAN DEFAULT FALSE,
        is_trick_question BOOLEAN DEFAULT FALSE,
        trick_detection_flags TEXT,
        answer_value TEXT,
        answer_confidence REAL,
        answer_reasoning TEXT,
        response_time_ms INTEGER,
        human_response_used BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (poll_session_id) REFERENCES poll_sessions (id)
      );

      CREATE TABLE IF NOT EXISTS poll_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        poll_session_id INTEGER,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        page_url TEXT,
        screenshot_path TEXT,
        recovery_attempted BOOLEAN DEFAULT FALSE,
        recovery_successful BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (poll_session_id) REFERENCES poll_sessions (id)
      );
    `;

    db.exec(schema, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
        reject(err);
      } else {
        console.log('Database tables created successfully');
        resolve();
      }
      db.close();
    });
  });
};

const insertSampleData = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const sampleSite = `
      INSERT OR IGNORE INTO poll_sites (
        name, base_url, login_url, username_selector, password_selector, 
        submit_selector, polls_page_url, poll_selectors
      ) VALUES (
        'Sample Poll Site',
        'https://example-polls.com',
        'https://example-polls.com/login',
        '#username',
        '#password',
        'button[type="submit"]',
        'https://example-polls.com/polls',
        '{"poll_links": "a[href*=\"/poll/\"]", "questions": ".question", "options": ".option input"}'
      );
    `;

    db.run(sampleSite, (err) => {
      if (err) {
        console.error('Error inserting sample data:', err);
        reject(err);
      } else {
        console.log('Sample data inserted');
        resolve();
      }
      db.close();
    });
  });
};

const setupDatabase = async () => {
  try {
    const fs = require('fs');
    const dataDir = path.join(__dirname, '../../data');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    await createTables();
    await insertSampleData();
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase, DB_PATH };