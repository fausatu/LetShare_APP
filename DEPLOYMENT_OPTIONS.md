# Options de Déploiement sans Nom de Domaine - LetShare

## 🚀 Solutions Recommandées

### Option 1 : ngrok (GRATUIT - Recommandé pour tests)

**Avantages** :
- ✅ Gratuit (avec limitations)
- ✅ HTTPS automatique (requis pour push notifications)
- ✅ URL publique instantanée
- ✅ Parfait pour tests et démonstrations
- ✅ Pas besoin de configuration serveur complexe

**Inconvénients** :
- ⚠️ URL change à chaque redémarrage (gratuit)
- ⚠️ Limité à 40 connexions/min (gratuit)
- ⚠️ Pas pour production réelle

**Installation** :
```bash
# Windows (via Chocolatey)
choco install ngrok

# Ou télécharger depuis: https://ngrok.com/download
```

**Configuration** :
```bash
# 1. Créer un compte gratuit sur ngrok.com
# 2. Obtenir votre authtoken
# 3. Configurer:
ngrok config add-authtoken VOTRE_TOKEN_ICI

# 4. Lancer ngrok (port 80 ou 8080 selon votre config WAMP)
ngrok http 80

# Ou si vous utilisez un autre port:
ngrok http 8080
```

**Mise à jour .env** :
```env
APP_BASE_URL=https://votre-url-ngrok.ngrok.io
CORS_ALLOWED_ORIGINS=https://votre-url-ngrok.ngrok.io

# Exemple:
APP_BASE_URL=https://abc123.ngrok.io
CORS_ALLOWED_ORIGINS=https://abc123.ngrok.io
```

**Note** : Avec le plan gratuit, l'URL change à chaque redémarrage. Il faudra mettre à jour `.env` à chaque fois.

---

### Option 2 : Serveur Local avec IP Publique (GRATUIT mais complexe)

**Avantages** :
- ✅ Gratuit
- ✅ Contrôle total
- ✅ Pas de limitations

**Inconvénients** :
- ❌ Nécessite IP publique statique
- ❌ Configuration routeur/firewall complexe
- ❌ Pas de HTTPS par défaut (nécessite certificat)
- ❌ Sécurité moindre

**Configuration** :
1. Configurer le routeur (port forwarding port 80/443)
2. Obtenir votre IP publique : `https://whatismyipaddress.com`
3. Configurer le firewall Windows
4. Optionnel : Utiliser Let's Encrypt pour HTTPS

**Non recommandé** : Trop complexe et moins sécurisé.

---

### Option 3 : Services Cloud Gratuits

#### 3a. Vercel (Gratuit - Frontend uniquement)

**Pour** : Frontend (HTML/CSS/JS) uniquement
**Limitation** : Nécessite un backend séparé

#### 3b. Railway.app (Gratuit avec crédits)

**Avantages** :
- ✅ Gratuit ($5 crédits/mois)
- ✅ HTTPS automatique
- ✅ Sous-domaine gratuit
- ✅ Déploiement simple

**Inconvénients** :
- ⚠️ Crédits limités (gratuit)
- ⚠️ Nécessite compte GitHub

**Setup** :
1. Créer compte sur railway.app
2. Connecter votre repo GitHub
3. Railway détecte PHP automatiquement
4. Configuration MySQL via Railway
5. Ajouter variables d'environnement

#### 3c. Render.com (Gratuit avec limitations)

**Avantages** :
- ✅ Gratuit (service peut "s'endormir")
- ✅ HTTPS automatique
- ✅ Sous-domaine gratuit
- ✅ Base de données MySQL incluse

**Inconvénients** :
- ⚠️ Service gratuit peut être lent au démarrage
- ⚠️ Limité si pas d'activité

**URL** : `https://letshare.onrender.com` (exemple)

---

### Option 4 : Services Payants Pas Chers

#### 4a. DigitalOcean Droplet ($6/mois)

**Avantages** :
- ✅ Serveur VPS complet
- ✅ Contrôle total
- ✅ Performance garantie
- ✅ Nom de domaine inclus (1 an gratuit)

**Setup** :
1. Créer compte DigitalOcean
2. Créer un Droplet Ubuntu
3. Installer LAMP stack
4. Uploader votre code
5. Configurer SSL (Let's Encrypt gratuit)

**Coût** : ~$6-12/mois

#### 4b. Hostinger Shared Hosting (~$2-4/mois)

**Avantages** :
- ✅ Très bon marché
- ✅ PHP/MySQL inclus
- ✅ Panel cPanel facile
- ✅ Nom de domaine gratuit (1 an)
- ✅ SSL gratuit

**URL** : `https://letshare.hostinger.com` ou avec nom de domaine

#### 4c. Contabo VPS (~€4/mois)

**Avantages** :
- ✅ VPS européen (GDPR compliant)
- ✅ Prix très bas
- ✅ Bonnes performances

---

## 📋 Comparaison Rapide

| Solution | Coût | HTTPS | Domaine | Complexité | Production |
|----------|------|-------|---------|------------|------------|
| **ngrok** | Gratuit | ✅ | ❌ (changant) | ⭐ Facile | ❌ Tests seulement |
| **Railway** | Gratuit* | ✅ | ✅ (sous-domaine) | ⭐⭐ Moyen | ⚠️ Limité |
| **Render** | Gratuit* | ✅ | ✅ (sous-domaine) | ⭐⭐ Moyen | ⚠️ Limité |
| **DigitalOcean** | $6/mois | ✅ | ✅ (1 an gratuit) | ⭐⭐⭐ Avancé | ✅ Oui |
| **Hostinger** | $2-4/mois | ✅ | ✅ (1 an gratuit) | ⭐⭐ Moyen | ✅ Oui |

*Gratuit avec limitations

---

## 🎯 Recommandation par Cas d'Usage

### Pour Tester / Démo Rapide
👉 **ngrok** - Le plus rapide à mettre en place

### Pour MVP / Petit Projet
👉 **Hostinger** - Prix bas, tout inclus, facile

### Pour Projet Sérieux
👉 **DigitalOcean** - Contrôle total, scalable

### Pour Test Prolongé Gratuit
👉 **Render.com** - Gratuit, sous-domaine stable

---

## 🚀 Guide Rapide : ngrok (Solution Immédiate)

### Étape 1 : Installer ngrok
```bash
# Télécharger depuis https://ngrok.com/download
# Ou via Chocolatey:
choco install ngrok
```

### Étape 2 : Créer compte et configurer
1. Aller sur https://ngrok.com
2. Créer compte gratuit
3. Copier votre authtoken
4. Dans PowerShell/CMD :
```bash
ngrok config add-authtoken VOTRE_TOKEN_ICI
```

### Étape 3 : Lancer WAMP
Assurez-vous que WAMP est lancé et que votre site est accessible sur `http://localhost`

### Étape 4 : Lancer ngrok
```bash
ngrok http 80
```

Vous obtiendrez une URL comme : `https://abc123.ngrok.io`

### Étape 5 : Mettre à jour .env
```env
APP_BASE_URL=https://abc123.ngrok.io
CORS_ALLOWED_ORIGINS=https://abc123.ngrok.io

# Note: L'URL change à chaque redémarrage de ngrok
# Il faudra mettre à jour .env à chaque fois
```

### Étape 6 : Vérifier
- Accéder à `https://abc123.ngrok.io/Test.html`
- Tester les push notifications (nécessite HTTPS)

---

## 🚀 Guide Rapide : Render.com (Gratuit et Stable)

### Étape 1 : Préparer le projet
1. Mettre votre code sur GitHub
2. S'assurer que `composer.json` existe

### Étape 2 : Créer compte Render
1. Aller sur https://render.com
2. Créer compte (avec GitHub)
3. Créer un nouveau "Web Service"

### Étape 3 : Configurer
- **Build Command** : `composer install --no-dev`
- **Start Command** : `php -S 0.0.0.0:$PORT -t .`
- **Environment** : PHP

### Étape 4 : Ajouter Base de Données
1. Créer "PostgreSQL" (gratuit) OU "MySQL" (payant)
2. Ou utiliser MySQL externe (gratuit comme https://www.freemysqlhosting.net/)

### Étape 5 : Variables d'environnement
Dans Render, ajouter toutes les variables de `.env`

### Étape 6 : Déployer
Render déploiera automatiquement et donnera une URL comme :
`https://letshare-abc123.onrender.com`

---

## 🔒 Important : HTTPS Obligatoire

**Toutes les solutions ci-dessus fournissent HTTPS automatiquement** (sauf serveur local basique).

Pour push notifications, HTTPS est **obligatoire**.

---

## 📝 Checklist Déploiement

### Avec ngrok
- [ ] ngrok installé et configuré
- [ ] WAMP lancé
- [ ] ngrok lancé (`ngrok http 80`)
- [ ] `.env` mis à jour avec URL ngrok
- [ ] Tester l'application

### Avec Render/Railway
- [ ] Code sur GitHub
- [ ] Compte créé sur la plateforme
- [ ] Service créé
- [ ] Base de données créée
- [ ] Variables d'environnement configurées
- [ ] Déploiement réussi
- [ ] Tester l'application

### Avec Hostinger/DigitalOcean
- [ ] Compte créé
- [ ] Serveur configuré
- [ ] Code uploadé (FTP/SSH)
- [ ] Base de données créée
- [ ] `.env` configuré
- [ ] SSL installé (Let's Encrypt)
- [ ] Tester l'application

---

## 💡 Astuce : Nom de Domaine Gratuit

### Freenom (.tk, .ml, .ga - Gratuit)
- ⚠️ Pas très professionnel
- ⚠️ Souvent bloqué par les navigateurs

### GitHub Student Pack
- Si vous êtes étudiant, vous pouvez obtenir des crédits gratuits

### Nom de Domaine Pas Cher
- **Namecheap** : ~$1-2/an pour .xyz
- **Porkbun** : ~$3-5/an pour .com

---

## 🎯 Ma Recommandation

**Pour commencer rapidement (tests/démo)** :
👉 Utilisez **ngrok** - Gratuit, rapide, HTTPS inclus

**Pour MVP/Production** :
👉 Utilisez **Hostinger** - $2-4/mois, nom de domaine gratuit, SSL gratuit, facile

**Pour projet sérieux/scalable** :
👉 Utilisez **DigitalOcean** - $6/mois, contrôle total

---

**Besoin d'aide pour configurer une de ces solutions ? Dites-moi laquelle vous préférez !**

