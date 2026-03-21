/**
 * Optional: run manually with `npm run db:init`
 * Uses Node.js built-in node:sqlite (Node 22+)
 */

const path = require('path')
const fs = require('fs')
const { DatabaseSync } = require('node:sqlite')

const storageDir = path.join(process.cwd(), 'tmp', 'zipview')
fs.mkdirSync(storageDir, { recursive: true })
console.log('[db:init] Storage directory ready:', storageDir)

const dbPath = path.join(storageDir, 'zipview.db')
const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS archives (
    id TEXT PRIMARY KEY, user_id TEXT, session_id TEXT,
    name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL,
    file_count INTEGER DEFAULT 0, dir_count INTEGER DEFAULT 0,
    storage_path TEXT NOT NULL, tree_json TEXT DEFAULT '[]',
    uploaded_at TEXT DEFAULT (datetime('now')), expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_archives_user ON archives(user_id);
  CREATE INDEX IF NOT EXISTS idx_archives_session ON archives(session_id);
  CREATE INDEX IF NOT EXISTS idx_archives_expires ON archives(expires_at);
`)

console.log('[db:init] Database initialized at:', dbPath)
db.close()
