const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'taskmanager.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Use sql.js (pure JS, no native compilation needed)
const initSqlJs = require('sql.js');

let _db = null;

function saveDb(db) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function loadDb(SQL) {
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    return new SQL.Database(fileBuffer);
  }
  return new SQL.Database();
}

// Synchronous-style wrapper to match better-sqlite3 API
class SyncDb {
  constructor(db, SQL) {
    this._db = db;
    this._SQL = SQL;
  }

  exec(sql) {
    this._db.run(sql);
    saveDb(this._db);
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        // Get last insert rowid before saving because export() resets it
        const result = self._db.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = result[0]?.values[0][0] ?? null;
        const changes = self._db.getRowsModified();
        
        saveDb(self._db);
        
        return {
          lastInsertRowid,
          changes,
        };
      },
      get(...params) {
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = self._db.exec(sql, params);
        if (!results.length) return [];
        const { columns, values } = results[0];
        return values.map(row => {
          const obj = {};
          columns.forEach((col, i) => { obj[col] = row[i]; });
          return obj;
        });
      },
    };
  }

  pragma(sql) {
    try { this._db.run(`PRAGMA ${sql}`); } catch(e) {}
  }
}

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;
  throw new Error('DB not initialized. Call initDb() first.');
}

async function initDb() {
  const SQL = await initSqlJs();
  const db = loadDb(SQL);
  const wrapper = new SyncDb(db, SQL);

  wrapper.pragma('foreign_keys = ON');

  wrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6366f1',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      assigned_to INTEGER,
      created_by INTEGER NOT NULL,
      due_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  dbInstance = wrapper;
  return wrapper;
}

module.exports = { initDb, getDb };
