// src/index.js
// Point d'entrée du serveur Express

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const checkoutRoutes  = require('./routes/checkout')
const webhookRoutes   = require('./routes/webhook')
const portalRoutes    = require('./routes/portal')
const protectedRoutes = require('./routes/protected')

const app  = express()
const PORT = process.env.PORT || 4000

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  CRITIQUE : le webhook Stripe a besoin du body RAW (Buffer).
//    Il DOIT être enregistré AVANT express.json().
// ─────────────────────────────────────────────────────────────────────────────
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookRoutes
)

// ─── Middlewares globaux ──────────────────────────────────────────────────────
app.use(express.json())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
)

// ─── Fichiers statiques (frontend minimal) ───────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')))

// ─── Routes API ──────────────────────────────────────────────────────────────
app.use('/api', checkoutRoutes)
app.use('/api', portalRoutes)
app.use('/api', protectedRoutes)

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date() })
})

// ─── Gestion des routes inconnues ────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' })
})

// ─── Gestion globale des erreurs ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ Erreur non gérée :', err)
  res.status(500).json({ error: 'Erreur interne du serveur' })
})

// ─── Démarrage ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`)
  console.log(`📦 Environment : ${process.env.NODE_ENV}`)
  console.log(`💳 Stripe : ${process.env.STRIPE_SECRET_KEY?.slice(0, 14)}...`)
  console.log(`🔗 Webhook endpoint : http://localhost:${PORT}/webhook\n`)
})

module.exports = app
