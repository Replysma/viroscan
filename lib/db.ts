/**
 * Couche base de données — mode triple :
 *
 *  1. DATABASE_URL  → pg Pool TCP    (Railway, Supabase, Render…)
 *  2. POSTGRES_URL  → @vercel/postgres createPool (Vercel)
 *  3. Aucun         → node:sqlite    (dev local, zéro config)
 *
 * Les modes Postgres partagent la même API : query(sql, params[]).
 */

import path from 'path'
import fs   from 'fs'
import { USE_POSTGRES, query as pgQuery } from './pg-adapter'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DbArchive {
  id:               string
  user_id:          string | null
  session_id:       string | null
  name:             string
  type:             string
  size:             number
  file_count:       number
  dir_count:        number
  storage_path:     string
  tree_json:        string
  uploaded_at:      string
  expires_at:       string
  scan_status:      'pending' | 'scanning' | 'clean' | 'infected' | 'suspicious' | 'error'
  scan_result:      string | null
  scan_started_at:  string | null
  scan_finished_at: string | null
}

export interface DbUser {
  id:                     string
  plan:                   'free' | 'premium'
  created_at:             string
  stripe_customer_id:     string | null
  stripe_subscription_id: string | null
  subscription_status:    'free' | 'active' | 'cancelled' | 'past_due'
}

export interface DbScanUsage {
  id:         string
  identifier: string
  scanned_at: string
}

// ─── SQLite (dev local) ───────────────────────────────────────────────────────

let _sqlite: any = null

function getSqlite() {
  if (_sqlite) return _sqlite
  const { DatabaseSync } = require('node:sqlite')
  const dbDir = process.env.STORAGE_PATH
    ? path.resolve(process.env.STORAGE_PATH)
    : path.join(process.cwd(), 'tmp', 'zipview')
  fs.mkdirSync(dbDir, { recursive: true })
  _sqlite = new DatabaseSync(path.join(dbDir, 'zipview.db'))
  _sqlite.exec('PRAGMA journal_mode = WAL')
  _sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, plan TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT NOT NULL DEFAULT 'free'
    );
    CREATE TABLE IF NOT EXISTS archives (
      id TEXT PRIMARY KEY, user_id TEXT, session_id TEXT,
      name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL,
      file_count INTEGER NOT NULL DEFAULT 0, dir_count INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT NOT NULL, tree_json TEXT NOT NULL DEFAULT '[]',
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL,
      scan_status TEXT NOT NULL DEFAULT 'pending',
      scan_result TEXT, scan_started_at TEXT, scan_finished_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_archives_user    ON archives(user_id);
    CREATE INDEX IF NOT EXISTS idx_archives_session ON archives(session_id);
    CREATE INDEX IF NOT EXISTS idx_archives_expires ON archives(expires_at);
    CREATE TABLE IF NOT EXISTS scan_usage (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scan_usage_identifier ON scan_usage(identifier);
    CREATE INDEX IF NOT EXISTS idx_scan_usage_scanned_at ON scan_usage(scanned_at);
  `)
  // Migrations non-destructives
  for (const col of [
    "ALTER TABLE archives ADD COLUMN scan_status TEXT NOT NULL DEFAULT 'pending'",
    'ALTER TABLE archives ADD COLUMN scan_result TEXT',
    'ALTER TABLE archives ADD COLUMN scan_started_at TEXT',
    'ALTER TABLE archives ADD COLUMN scan_finished_at TEXT',
    'ALTER TABLE users ADD COLUMN stripe_customer_id TEXT',
    'ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT',
    "ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'free'",
  ]) {
    try { _sqlite.exec(col) } catch { /* colonne déjà présente */ }
  }
  return _sqlite
}

// ─── Init schéma Postgres (appelé via /api/setup ou au démarrage) ─────────────

export async function initSchema() {
  await pgQuery(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'free'
  )`)

  await pgQuery(`CREATE TABLE IF NOT EXISTS archives (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    file_count INTEGER NOT NULL DEFAULT 0,
    dir_count INTEGER NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    tree_json TEXT NOT NULL DEFAULT '[]',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    scan_status TEXT NOT NULL DEFAULT 'pending',
    scan_result TEXT,
    scan_started_at TIMESTAMPTZ,
    scan_finished_at TIMESTAMPTZ
  )`)

  await pgQuery(`CREATE INDEX IF NOT EXISTS idx_archives_user    ON archives(user_id)`)
  await pgQuery(`CREATE INDEX IF NOT EXISTS idx_archives_session ON archives(session_id)`)
  await pgQuery(`CREATE INDEX IF NOT EXISTS idx_archives_expires ON archives(expires_at)`)

  await pgQuery(`CREATE TABLE IF NOT EXISTS scan_usage (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)

  await pgQuery(`CREATE INDEX IF NOT EXISTS idx_scan_usage_identifier ON scan_usage(identifier)`)
  await pgQuery(`CREATE INDEX IF NOT EXISTS idx_scan_usage_scanned_at ON scan_usage(scanned_at)`)

  // Migrations pour bases existantes
  const migrations = [
    `ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_result TEXT`,
    `ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_started_at TIMESTAMPTZ`,
    `ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_finished_at TIMESTAMPTZ`,
    `ALTER TABLE users    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`,
    `ALTER TABLE users    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`,
    `ALTER TABLE users    ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free'`,
  ]
  await Promise.allSettled(migrations.map(sql => pgQuery(sql)))
}

// ─── Helpers conversion ───────────────────────────────────────────────────────

function toIso(val: any): string {
  if (!val) return new Date().toISOString()
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

function rowToArchive(row: any): DbArchive {
  return { ...row, uploaded_at: toIso(row.uploaded_at), expires_at: toIso(row.expires_at) }
}

function rowToUser(row: any): DbUser {
  return {
    id:                     row.id,
    plan:                   row.plan,
    created_at:             toIso(row.created_at),
    stripe_customer_id:     row.stripe_customer_id     ?? null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    subscription_status:    row.subscription_status    ?? 'free',
  }
}

// ─── Archive repository ───────────────────────────────────────────────────────

export const archiveRepo = {

  async create(data: Omit<DbArchive, 'uploaded_at'>): Promise<DbArchive> {
    if (USE_POSTGRES) {
      const { rows } = await pgQuery(
        `INSERT INTO archives
           (id,user_id,session_id,name,type,size,file_count,dir_count,storage_path,tree_json,expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [data.id, data.user_id, data.session_id, data.name, data.type,
         data.size, data.file_count, data.dir_count, data.storage_path,
         data.tree_json, data.expires_at]
      )
      return rowToArchive(rows[0])
    }
    const db = getSqlite()
    db.prepare(`INSERT INTO archives
      (id,user_id,session_id,name,type,size,file_count,dir_count,storage_path,tree_json,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.id,data.user_id,data.session_id,data.name,data.type,
           data.size,data.file_count,data.dir_count,data.storage_path,data.tree_json,data.expires_at)
    return rowToArchive(db.prepare('SELECT * FROM archives WHERE id=?').get(data.id))
  },

  async findById(id: string): Promise<DbArchive | null> {
    if (USE_POSTGRES) {
      const { rows } = await pgQuery('SELECT * FROM archives WHERE id=$1', [id])
      return rows[0] ? rowToArchive(rows[0]) : null
    }
    const row = getSqlite().prepare('SELECT * FROM archives WHERE id=?').get(id)
    return row ? rowToArchive(row) : null
  },

  async findByUser(userId: string): Promise<DbArchive[]> {
    if (USE_POSTGRES) {
      const { rows } = await pgQuery(
        'SELECT * FROM archives WHERE user_id=$1 ORDER BY uploaded_at DESC', [userId]
      )
      return rows.map(rowToArchive)
    }
    return getSqlite()
      .prepare('SELECT * FROM archives WHERE user_id=? ORDER BY uploaded_at DESC')
      .all(userId).map(rowToArchive)
  },

  async findBySession(sessionId: string): Promise<DbArchive[]> {
    if (USE_POSTGRES) {
      const { rows } = await pgQuery(
        'SELECT * FROM archives WHERE session_id=$1 ORDER BY uploaded_at DESC', [sessionId]
      )
      return rows.map(rowToArchive)
    }
    return getSqlite()
      .prepare('SELECT * FROM archives WHERE session_id=? ORDER BY uploaded_at DESC')
      .all(sessionId).map(rowToArchive)
  },

  async delete(id: string): Promise<void> {
    if (USE_POSTGRES) {
      await pgQuery('DELETE FROM archives WHERE id=$1', [id])
      return
    }
    getSqlite().prepare('DELETE FROM archives WHERE id=?').run(id)
  },

  async deleteExpired(): Promise<number> {
    if (USE_POSTGRES) {
      const { rowCount } = await pgQuery(
        "DELETE FROM archives WHERE expires_at < NOW()"
      )
      return rowCount ?? 0
    }
    const res = getSqlite()
      .prepare("DELETE FROM archives WHERE expires_at < datetime('now')").run()
    return res.changes ?? 0
  },

  async updateScan(id: string, data: {
    scan_status:       DbArchive['scan_status']
    scan_result?:      string | null
    scan_started_at?:  string | null
    scan_finished_at?: string | null
  }): Promise<void> {
    if (USE_POSTGRES) {
      await pgQuery(
        `UPDATE archives SET
           scan_status=$1, scan_result=$2, scan_started_at=$3, scan_finished_at=$4
         WHERE id=$5`,
        [data.scan_status, data.scan_result ?? null,
         data.scan_started_at ?? null, data.scan_finished_at ?? null, id]
      )
      return
    }
    getSqlite().prepare(`
      UPDATE archives SET
        scan_status=?, scan_result=?, scan_started_at=?, scan_finished_at=?
      WHERE id=?
    `).run(
      data.scan_status, data.scan_result ?? null,
      data.scan_started_at ?? null, data.scan_finished_at ?? null, id
    )
  },
}

// ─── User repository ──────────────────────────────────────────────────────────

export const userRepo = {

  async create(data: { id: string; plan: 'free' | 'premium' }): Promise<DbUser> {
    if (USE_POSTGRES) {
      const { rows } = await pgQuery(
        `INSERT INTO users (id,plan) VALUES ($1,$2)
         ON CONFLICT (id) DO NOTHING RETURNING *`,
        [data.id, data.plan]
      )
      if (rows.length === 0) return (await userRepo.findById(data.id))!
      return rowToUser(rows[0])
    }
    const db = getSqlite()
    db.prepare('INSERT OR IGNORE INTO users (id,plan) VALUES (?,?)').run(data.id, data.plan)
    const row = db.prepare('SELECT * FROM users WHERE id=?').get(data.id)
    if (!row) return {
      id: data.id, plan: data.plan,
      created_at: new Date().toISOString(),
      stripe_customer_id: null, stripe_subscription_id: null, subscription_status: 'free',
    }
    return rowToUser(row)
  },

  async findById(id: string): Promise<DbUser | null> {
    if (USE_POSTGRES) {
      const { rows } = await pgQuery('SELECT * FROM users WHERE id=$1', [id])
      return rows[0] ? rowToUser(rows[0]) : null
    }
    const row = getSqlite().prepare('SELECT * FROM users WHERE id=?').get(id)
    return row ? rowToUser(row) : null
  },

  async setPlan(id: string, plan: 'free' | 'premium'): Promise<void> {
    if (USE_POSTGRES) {
      await pgQuery('UPDATE users SET plan=$1 WHERE id=$2', [plan, id])
      return
    }
    getSqlite().prepare('UPDATE users SET plan=? WHERE id=?').run(plan, id)
  },

  async setStripe(id: string, data: {
    stripe_customer_id?:     string | null
    stripe_subscription_id?: string | null
    subscription_status?:    DbUser['subscription_status']
    plan?:                   'free' | 'premium'
  }): Promise<void> {
    if (USE_POSTGRES) {
      await pgQuery(
        `UPDATE users SET
           stripe_customer_id     = COALESCE($1, stripe_customer_id),
           stripe_subscription_id = COALESCE($2, stripe_subscription_id),
           subscription_status    = COALESCE($3, subscription_status),
           plan                   = COALESCE($4, plan)
         WHERE id=$5`,
        [data.stripe_customer_id     ?? null,
         data.stripe_subscription_id ?? null,
         data.subscription_status    ?? null,
         data.plan                   ?? null,
         id]
      )
      return
    }
    const db = getSqlite()
    if (data.stripe_customer_id     !== undefined)
      db.prepare('UPDATE users SET stripe_customer_id=? WHERE id=?').run(data.stripe_customer_id, id)
    if (data.stripe_subscription_id !== undefined)
      db.prepare('UPDATE users SET stripe_subscription_id=? WHERE id=?').run(data.stripe_subscription_id, id)
    if (data.subscription_status    !== undefined)
      db.prepare('UPDATE users SET subscription_status=? WHERE id=?').run(data.subscription_status, id)
    if (data.plan                   !== undefined)
      db.prepare('UPDATE users SET plan=? WHERE id=?').run(data.plan, id)
  },

  async findByStripeCustomer(stripeCustomerId: string): Promise<DbUser | null> {
    if (USE_POSTGRES) {
      const { rows } = await pgQuery(
        'SELECT * FROM users WHERE stripe_customer_id=$1', [stripeCustomerId]
      )
      return rows[0] ? rowToUser(rows[0]) : null
    }
    const row = getSqlite()
      .prepare('SELECT * FROM users WHERE stripe_customer_id=?').get(stripeCustomerId)
    return row ? rowToUser(row) : null
  },
}

// ─── Scan usage repository (rate limiting) ────────────────────────────────────

export const scanUsageRepo = {

  async record(identifier: string): Promise<void> {
    const { v4: uuidv4 } = await import('uuid')
    const id = uuidv4()
    if (USE_POSTGRES) {
      await pgQuery(
        'INSERT INTO scan_usage (id, identifier) VALUES ($1, $2)', [id, identifier]
      )
      return
    }
    getSqlite().prepare('INSERT INTO scan_usage (id, identifier) VALUES (?, ?)').run(id, identifier)
  },

  async countLast24h(identifier: string): Promise<number> {
    if (USE_POSTGRES) {
      const { rows } = await pgQuery(
        `SELECT COUNT(*) AS cnt FROM scan_usage
         WHERE identifier=$1 AND scanned_at > NOW() - INTERVAL '24 hours'`,
        [identifier]
      )
      return Number(rows[0]?.cnt ?? 0)
    }
    const row = getSqlite().prepare(
      "SELECT COUNT(*) AS cnt FROM scan_usage WHERE identifier=? AND scanned_at > datetime('now','-24 hours')"
    ).get(identifier)
    return Number((row as any)?.cnt ?? 0)
  },

  async purgeOld(): Promise<void> {
    if (USE_POSTGRES) {
      await pgQuery(
        `DELETE FROM scan_usage WHERE scanned_at < NOW() - INTERVAL '25 hours'`
      )
      return
    }
    getSqlite()
      .prepare("DELETE FROM scan_usage WHERE scanned_at < datetime('now','-25 hours')").run()
  },
}
