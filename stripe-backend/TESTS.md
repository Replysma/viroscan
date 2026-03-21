# Guide de Tests — Stripe SaaS Backend

## 1. Setup initial

```bash
# Cloner / aller dans le projet
cd stripe-backend

# Installer les dépendances
npm install

# Copier et remplir les variables d'environnement
cp .env.example .env
# → Remplir STRIPE_SECRET_KEY, STRIPE_PRICE_ID, DATABASE_URL

# Initialiser la base de données
npx prisma migrate dev --name init
npx prisma generate

# Démarrer le serveur
npm run dev
# → http://localhost:4000
```

---

## 2. Récupérer ton STRIPE_PRICE_ID

1. Va sur [dashboard.stripe.com/products](https://dashboard.stripe.com/products)
2. Clique sur ton produit "Premium"
3. Copie l'ID du prix (commence par `price_`)
4. Colle dans `.env` → `STRIPE_PRICE_ID=price_XXXX`

---

## 3. Configurer le Webhook Stripe (développement local)

### Option A — Stripe CLI (recommandé)

```bash
# Installer Stripe CLI
# Windows : winget install Stripe.StripeCLI
# Mac     : brew install stripe/stripe-cli/stripe

# S'authentifier
stripe login

# Écouter et forwarder vers ton serveur local
stripe listen --forward-to http://localhost:4000/webhook

# → Stripe CLI affiche un webhook secret du type :
#   whsec_XXXXXXXXXXXXXXXXXXXXXXXX
# → Copie-le dans .env : STRIPE_WEBHOOK_SECRET=whsec_XXXX
```

### Option B — ngrok (exposer localhost)

```bash
# Installer ngrok : https://ngrok.com
ngrok http 4000
# → URL publique : https://abc123.ngrok.io

# Configurer dans Stripe Dashboard :
# Developers > Webhooks > Add endpoint
# URL : https://abc123.ngrok.io/webhook
# Events : checkout.session.completed, invoice.payment_succeeded,
#           invoice.payment_failed, customer.subscription.deleted
```

---

## 4. Cartes de test Stripe

| Carte                | Numéro              | Résultat                        |
|----------------------|---------------------|---------------------------------|
| Paiement réussi      | 4242 4242 4242 4242 | ✅ Succès immédiat               |
| Auth 3D Secure       | 4000 0025 0000 3155 | 🔐 Demande d'authentification    |
| Paiement refusé      | 4000 0000 0000 9995 | ❌ Fonds insuffisants            |
| Carte expirée        | 4000 0000 0000 0069 | ❌ Carte expirée                 |
| Erreur générique     | 4000 0000 0000 0002 | ❌ Carte refusée                 |

**Pour toutes les cartes test :**
- Date d'expiration : n'importe quelle date future (ex: 12/34)
- CVC : n'importe quel 3 chiffres (ex: 123)
- Code postal : n'importe (ex: 75001)

---

## 5. Tests avec Stripe CLI — Simuler les événements

```bash
# Simuler un paiement réussi (checkout)
stripe trigger checkout.session.completed

# Simuler un renouvellement
stripe trigger invoice.payment_succeeded

# Simuler un paiement échoué
stripe trigger invoice.payment_failed

# Simuler une annulation d'abonnement
stripe trigger customer.subscription.deleted

# Simuler une mise à jour d'abonnement
stripe trigger customer.subscription.updated
```

---

## 6. Test manuel — Flow complet

### 6.1 Créer une session Checkout

```bash
curl -X POST http://localhost:4000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Réponse : { "url": "https://checkout.stripe.com/..." }
# Ouvrir l'URL dans le navigateur → payer avec 4242 4242 4242 4242
```

### 6.2 Vérifier l'activation en BDD

```bash
# Ouvrir Prisma Studio
npx prisma studio
# → Aller dans la table users
# → Vérifier : isPremium = true, subscriptionStatus = active
```

### 6.3 Tester le middleware requirePremium

```bash
# Avec un userId premium
curl http://localhost:4000/api/premium/dashboard \
  -H "x-user-id: VOTRE_USER_ID"
# → 200 : { "message": "Bienvenue..." }

# Avec un userId sans premium
curl http://localhost:4000/api/premium/dashboard \
  -H "x-user-id: USER_NON_PREMIUM"
# → 403 : { "error": "Cette fonctionnalité nécessite un abonnement premium.", "code": "PREMIUM_REQUIRED" }
```

### 6.4 Ouvrir le portail client

```bash
curl -X POST http://localhost:4000/api/create-billing-portal \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# → { "url": "https://billing.stripe.com/..." }
```

### 6.5 Simuler un paiement échoué

```bash
# Dans Stripe CLI :
stripe trigger invoice.payment_failed

# Vérifier en BDD : isPremium = false, subscriptionStatus = past_due
```

---

## 7. Checklist de sécurité avant production

- [ ] `STRIPE_WEBHOOK_SECRET` configuré avec la vraie valeur du Dashboard Stripe
- [ ] `STRIPE_SECRET_KEY` est la clé **live** (commence par `sk_live_`)
- [ ] `NODE_ENV=production` dans `.env`
- [ ] Base de données PostgreSQL en production (pas SQLite)
- [ ] HTTPS activé sur le serveur (obligatoire pour Stripe)
- [ ] Le webhook endpoint est enregistré dans Stripe Dashboard avec les bons events
- [ ] Logs en production (Winston, Datadog, etc.)
- [ ] Variables d'environnement dans un gestionnaire de secrets (AWS Secrets Manager, Vault…)

---

## 8. Déploiement

### Railway (recommandé pour démarrer)
```bash
npm install -g @railway/cli
railway login
railway init
railway add postgresql
railway up
# Configurer les env vars dans le dashboard Railway
```

### Render
- New Web Service → connecter GitHub
- Build command : `npm install && npx prisma generate && npx prisma migrate deploy`
- Start command : `npm start`
- Ajouter PostgreSQL Add-on

### Variables d'environnement à configurer en production
```
STRIPE_SECRET_KEY=sk_live_XXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXX (créer un nouveau endpoint dans Stripe Dashboard)
STRIPE_PRICE_ID=price_XXXX
DATABASE_URL=postgresql://...
FRONTEND_URL=https://ton-domaine.com
SUCCESS_URL=https://ton-domaine.com/success
CANCEL_URL=https://ton-domaine.com/cancel
NODE_ENV=production
PORT=4000
```
