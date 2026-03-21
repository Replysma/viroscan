// src/config/stripe.js
// Instance Stripe partagée dans tout le backend

const Stripe = require('stripe')

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('❌ STRIPE_SECRET_KEY manquante dans .env')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  telemetry: false, // désactive la télémétrie en prod
})

module.exports = stripe
