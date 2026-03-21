/**
 * scripts/migrate.js
 * Initialise / migre le schéma Postgres au démarrage du serveur.
 * Exécuté avant `npm start` via railway.json startCommand.
 *
 * Usage: node scripts/migrate.js
 */

'use strict'

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!DATABASE_URL) {
  console.log('[migrate] Pas de DATABASE_URL / POSTGRES_URL → SQLite local, aucune migration.')
  process.exit(0)
}

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
})

async function run() {
  console.log('[migrate] Connexion à Postgres…')
  const client = await pool.connect()

  try {
    console.log('[migrate] Création des tables si nécessaire…')

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                     TEXT PRIMARY KEY,
        plan                   TEXT NOT NULL DEFAULT 'free',
        created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        stripe_customer_id     TEXT,
        stripe_subscription_id TEXT,
        subscription_status    TEXT NOT NULL DEFAULT 'free'
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS archives (
        id               TEXT PRIMARY KEY,
        user_id          TEXT,
        session_id       TEXT,
        name             TEXT NOT NULL,
        type             TEXT NOT NULL,
        size             INTEGER NOT NULL,
        file_count       INTEGER NOT NULL DEFAULT 0,
        dir_count        INTEGER NOT NULL DEFAULT 0,
        storage_path     TEXT NOT NULL,
        tree_json        TEXT NOT NULL DEFAULT '[]',
        uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at       TIMESTAMPTZ NOT NULL,
        scan_status      TEXT NOT NULL DEFAULT 'pending',
        scan_result      TEXT,
        scan_started_at  TIMESTAMPTZ,
        scan_finished_at TIMESTAMPTZ
      )
    `)

    await client.query(`CREATE INDEX IF NOT EXISTS idx_archives_user    ON archives(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_archives_session ON archives(session_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_archives_expires ON archives(expires_at)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS scan_usage (
        id         TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`CREATE INDEX IF NOT EXISTS idx_scan_usage_identifier ON scan_usage(identifier)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scan_usage_scanned_at ON scan_usage(scanned_at)`)

    // Migrations non-destructives (colonnes ajoutées après la création initiale)
    const migrations = [
      `ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_status      TEXT NOT NULL DEFAULT 'pending'`,
      `ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_result      TEXT`,
      `ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_started_at  TIMESTAMPTZ`,
      `ALTER TABLE archives ADD COLUMN IF NOT EXISTS scan_finished_at TIMESTAMPTZ`,
      `ALTER TABLE users    ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT`,
      `ALTER TABLE users    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`,
      `ALTER TABLE users    ADD COLUMN IF NOT EXISTS subscription_status    TEXT NOT NULL DEFAULT 'free'`,
    ]

    for (const sql of migrations) {
      try { await client.query(sql) } catch { /* colonne déjà présente */ }
    }

    console.log('[migrate] ✅ Schéma Postgres prêt.')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => {
  console.error('[migrate] ❌ Échec migration :', err.message)
  process.exit(1)
})
