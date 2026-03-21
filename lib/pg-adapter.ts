/**
 * Adaptateur PostgreSQL universel.
 *
 * Priorité de détection :
 *  1. DATABASE_URL  → pg Pool standard  (Railway, Supabase, Render, Neon TCP…)
 *  2. POSTGRES_URL  → @vercel/postgres createPool (Vercel)
 *  3. Aucun         → SQLite local (dev)
 *
 * L'API exportée est identique dans les deux modes :
 *   const { rows, rowCount } = await query('SELECT …', [param1, param2])
 */

export type QueryResult = {
  rows:     any[]
  rowCount: number | null
}

type PoolLike = {
  query: (text: string, values?: any[]) => Promise<QueryResult>
  end?:  () => Promise<void>
}

let _pool: PoolLike | null = null

export const USE_POSTGRES =
  !!(process.env.DATABASE_URL || process.env.POSTGRES_URL)

/**
 * Retourne le pool Postgres (lazy init, singleton).
 * Lance une erreur si aucune URL Postgres n'est configurée.
 */
export async function getPool(): Promise<PoolLike> {
  if (_pool) return _pool

  if (process.env.DATABASE_URL) {
    // ── Railway / Supabase / Render / tout Postgres TCP ──────────────────────
    const { Pool } = await import('pg')
    const connectionString = process.env.DATABASE_URL

    // Désactive la vérification SSL uniquement en localhost (dev Railway local)
    const ssl = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }

    _pool = new Pool({ connectionString, ssl })

    // Vérification de la connexion au démarrage
    try {
      await (_pool as any).query('SELECT 1')
      console.log('[pg-adapter] Connecté à Postgres via DATABASE_URL')
    } catch (err) {
      console.error('[pg-adapter] Échec de connexion DATABASE_URL :', err)
      _pool = null
      throw err
    }

    return _pool
  }

  if (process.env.POSTGRES_URL) {
    // ── Vercel Postgres (createPool = pg-pool, connexion TCP standard) ────────
    const { createPool } = await import('@vercel/postgres')
    _pool = createPool({ connectionString: process.env.POSTGRES_URL }) as PoolLike
    console.log('[pg-adapter] Connecté à Postgres via POSTGRES_URL (Vercel)')
    return _pool
  }

  throw new Error(
    '[pg-adapter] Aucune URL Postgres configurée. Définissez DATABASE_URL ou POSTGRES_URL.'
  )
}

/**
 * Exécute une requête paramétrée.
 * Utilise $1, $2… comme placeholders (syntaxe PostgreSQL standard).
 */
export async function query(text: string, values?: any[]): Promise<QueryResult> {
  const pool = await getPool()
  return pool.query(text, values)
}
