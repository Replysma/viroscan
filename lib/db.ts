/**
 * Couche base de données avec mode dual :
 * - Local (dev)       : node:sqlite (built-in Node.js, aucune config requise)
 * - Production Vercel : @vercel/postgres (via POSTGRES_URL)
 *
 * La détection est automatique selon la présence de POSTGRES_URL.
 */

import path from 'path'
import fs from 'fs'

const USE_POSTGRES = !!process.env.POSTGRES_URL

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DbArchive {
  id: string
  user_id: string | null
  session_id: string | null
  name: string
  type: string
  size: number
  file_count: number
  dir_count: number
  storage_path: string
  tree_json: string
  uploaded_at: string
  expires_at: string
  // Scan malware
  scan_status:      'pending' | 'scanning' | 'clean' | 'infected' | 'suspicious' | 'error'
  scan_result:      string | null  // JSON ScanReport
  scan_started_at:  string | null
  scan_finished_at: string | null
}

export interface DbUser {
  id: string
  plan: 'free' | 'premium'
  created_at: string
  stripe_customer_id:     string | null
  stripe_subscription_id: string | null
  subscription_status:    'free' | 'active' | 'cancelled' | 'past_due'
}

export interface DbScanUsage {
  id: string
  identifier: string   // userId ou hash IP
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
      scan_result TEXT,
      scan_started_at TEXT,
      scan_finished_at TEXT
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
  // Migrations : ajouter colonnes si elles n'existent pas encore
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
    id: row.id,
    plan: row.plan,
    created_at: toIso(row.created_at),
    stripe_customer_id:     row.stripe_customer_id     ?? null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    subscription_status:    row.subscription_status    ?? 'free',
  }
}

// ─── Init schéma Postgres (appelé via /api/setup) ────────────────────────────

export async function initSchema() {
  const { sql } = await import('@vercel/postgres')
  await sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'free')`
  await sql`CREATE TABLE IF NOT EXISTS archives (
    id TEXT PRIMARY KEY, user_id TEXT, session_id TEXT,
    name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL,
    file_count INTEGER NOT NULL DEFAULT 0, dir_count INTEGER NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL, tree_json TEXT NOT NULL DEFAULT '[]',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL,
    scan_status TEXT NOT NULL DEFAULT 'pending',
    scan_result TEXT,
    scan_started_at TIMESTAMPTZ,
    scan_finished_at TIMESTAMPTZ)`
  await sql`CREATE INDEX IF NOT EXISTS idx_archives_user    ON archives(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_archives_session ON archives(session_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_archives_expires ON archives(expires_at)`
  await sql`CREATE TABLE IF NOT EXISTS scan_usage (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  await sql`CREATE INDEX IF NOT EXISTS idx_scan_usage_identifier ON scan_usage(identifier)`
  await sql`CREATE INDEX IF NOT EXISTS idx_scan_usage_scanned_at ON scan_usage(scanned_at)`
  // Migrations pour les bases existantes
  await Promise.allSettled([
    sql`ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'pending'`,
    sql`ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_result TEXT`,
    sql`ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_started_at TIMESTAMPTZ`,
    sql`ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_finished_at TIMESTAMPTZ`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`,
    sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free'`,
  ])
}

// ─── Archive repository ───────────────────────────────────────────────────────

export const archiveRepo = {

  async create(data: Omit<DbArchive, 'uploaded_at'>): Promise<DbArchive> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`
        INSERT INTO archives (id,user_id,session_id,name,type,size,file_count,dir_count,storage_path,tree_json,expires_at)
        VALUES (${data.id},${data.user_id},${data.session_id},${data.name},${data.type},
                ${data.size},${data.file_count},${data.dir_count},${data.storage_path},
                ${data.tree_json},${data.expires_at}) RETURNING *`
      return rowToArchive(rows[0])
    }
    const db = getSqlite()
    db.prepare(`INSERT INTO archives (id,user_id,session_id,name,type,size,file_count,dir_count,storage_path,tree_json,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(data.id,data.user_id,data.session_id,data.name,data.type,
           data.size,data.file_count,data.dir_count,data.storage_path,data.tree_json,data.expires_at)
    return rowToArchive(db.prepare('SELECT * FROM archives WHERE id=?').get(data.id))
  },

  async findById(id: string): Promise<DbArchive | null> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`SELECT * FROM archives WHERE id=${id}`
      return rows[0] ? rowToArchive(rows[0]) : null
    }
    const row = getSqlite().prepare('SELECT * FROM archives WHERE id=?').get(id)
    return row ? rowToArchive(row) : null
  },

  async findByUser(userId: string): Promise<DbArchive[]> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`SELECT * FROM archives WHERE user_id=${userId} ORDER BY uploaded_at DESC`
      return rows.map(rowToArchive)
    }
    return getSqlite().prepare('SELECT * FROM archives WHERE user_id=? ORDER BY uploaded_at DESC').all(userId).map(rowToArchive)
  },

  async findBySession(sessionId: string): Promise<DbArchive[]> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`SELECT * FROM archives WHERE session_id=${sessionId} ORDER BY uploaded_at DESC`
      return rows.map(rowToArchive)
    }
    return getSqlite().prepare('SELECT * FROM archives WHERE session_id=? ORDER BY uploaded_at DESC').all(sessionId).map(rowToArchive)
  },

  async delete(id: string): Promise<void> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      await sql`DELETE FROM archives WHERE id=${id}`
      return
    }
    getSqlite().prepare('DELETE FROM archives WHERE id=?').run(id)
  },

  async deleteExpired(): Promise<number> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rowCount } = await sql`DELETE FROM archives WHERE expires_at < NOW()`
      return rowCount ?? 0
    }
    const res = getSqlite().prepare("DELETE FROM archives WHERE expires_at < datetime('now')").run()
    return res.changes ?? 0
  },

  /** Met à jour le statut de scan d'une archive */
  async updateScan(id: string, data: {
    scan_status:      DbArchive['scan_status']
    scan_result?:     string | null
    scan_started_at?: string | null
    scan_finished_at?: string | null
  }): Promise<void> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      await sql`
        UPDATE archives SET
          scan_status      = ${data.scan_status},
          scan_result      = ${data.scan_result      ?? null},
          scan_started_at  = ${data.scan_started_at  ?? null},
          scan_finished_at = ${data.scan_finished_at ?? null}
        WHERE id = ${id}
      `
      return
    }
    getSqlite().prepare(`
      UPDATE archives SET
        scan_status=?, scan_result=?, scan_started_at=?, scan_finished_at=?
      WHERE id=?
    `).run(
      data.scan_status,
      data.scan_result      ?? null,
      data.scan_started_at  ?? null,
      data.scan_finished_at ?? null,
      id
    )
  },
}

// ─── User repository ──────────────────────────────────────────────────────────

export const userRepo = {

  async create(data: { id: string; plan: 'free' | 'premium' }): Promise<DbUser> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`
        INSERT INTO users (id,plan) VALUES (${data.id},${data.plan})
        ON CONFLICT (id) DO NOTHING RETURNING *`
      if (rows.length === 0) return (await userRepo.findById(data.id))!
      return rowToUser(rows[0])
    }
    const db = getSqlite()
    db.prepare('INSERT OR IGNORE INTO users (id,plan) VALUES (?,?)').run(data.id, data.plan)
    const row = db.prepare('SELECT * FROM users WHERE id=?').get(data.id)
    // Si la ligne n'est pas trouvée (cas edge en dev), retourner un objet par défaut
    if (!row) return { id: data.id, plan: data.plan, created_at: new Date().toISOString(), stripe_customer_id: null, stripe_subscription_id: null, subscription_status: 'free' }
    return rowToUser(row)
  },

  async findById(id: string): Promise<DbUser | null> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`SELECT * FROM users WHERE id=${id}`
      return rows[0] ? rowToUser(rows[0]) : null
    }
    const row = getSqlite().prepare('SELECT * FROM users WHERE id=?').get(id)
    return row ? rowToUser(row) : null
  },

  async setPlan(id: string, plan: 'free' | 'premium'): Promise<void> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      await sql`UPDATE users SET plan=${plan} WHERE id=${id}`
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
      const { sql } = await import('@vercel/postgres')
      await sql`
        UPDATE users SET
          stripe_customer_id     = COALESCE(${data.stripe_customer_id     ?? null}, stripe_customer_id),
          stripe_subscription_id = COALESCE(${data.stripe_subscription_id ?? null}, stripe_subscription_id),
          subscription_status    = COALESCE(${data.subscription_status    ?? null}, subscription_status),
          plan                   = COALESCE(${data.plan                   ?? null}, plan)
        WHERE id = ${id}`
      return
    }
    const db = getSqlite()
    if (data.stripe_customer_id !== undefined)
      db.prepare('UPDATE users SET stripe_customer_id=? WHERE id=?').run(data.stripe_customer_id, id)
    if (data.stripe_subscription_id !== undefined)
      db.prepare('UPDATE users SET stripe_subscription_id=? WHERE id=?').run(data.stripe_subscription_id, id)
    if (data.subscription_status !== undefined)
      db.prepare('UPDATE users SET subscription_status=? WHERE id=?').run(data.subscription_status, id)
    if (data.plan !== undefined)
      db.prepare('UPDATE users SET plan=? WHERE id=?').run(data.plan, id)
  },

  async findByStripeCustomer(stripeCustomerId: string): Promise<DbUser | null> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`SELECT * FROM users WHERE stripe_customer_id=${stripeCustomerId}`
      return rows[0] ? rowToUser(rows[0]) : null
    }
    const row = getSqlite().prepare('SELECT * FROM users WHERE stripe_customer_id=?').get(stripeCustomerId)
    return row ? rowToUser(row) : null
  },
}

// ─── Scan usage repository (rate limiting) ────────────────────────────────────

export const scanUsageRepo = {

  /** Enregistre une nouvelle utilisation du scan */
  async record(identifier: string): Promise<void> {
    const { v4: uuidv4 } = await import('uuid')
    const id = uuidv4()
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      await sql`INSERT INTO scan_usage (id, identifier) VALUES (${id}, ${identifier})`
      return
    }
    getSqlite().prepare('INSERT INTO scan_usage (id, identifier) VALUES (?, ?)').run(id, identifier)
  },

  /** Compte les scans des dernières 24h pour un identifiant */
  async countLast24h(identifier: string): Promise<number> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`
        SELECT COUNT(*) as cnt FROM scan_usage
        WHERE identifier = ${identifier}
          AND scanned_at > NOW() - INTERVAL '24 hours'`
      return Number(rows[0]?.cnt ?? 0)
    }
    const row = getSqlite().prepare(
      "SELECT COUNT(*) as cnt FROM scan_usage WHERE identifier=? AND scanned_at > datetime('now', '-24 hours')"
    ).get(identifier)
    return Number((row as any)?.cnt ?? 0)
  },

  /** Purge les entrées de plus de 24h (appelé périodiquement) */
  async purgeOld(): Promise<void> {
    if (USE_POSTGRES) {
      const { sql } = await import('@vercel/postgres')
      await sql`DELETE FROM scan_usage WHERE scanned_at < NOW() - INTERVAL '25 hours'`
      return
    }
    getSqlite().prepare("DELETE FROM scan_usage WHERE scanned_at < datetime('now', '-25 hours')").run()
  },
}
