# Guide de Déploiement sur Render.com - LetShare

## 🎯 Vue d'ensemble

Render.com est une excellente plateforme pour déployer LetShare gratuitement avec :
- ✅ HTTPS automatique
- ✅ Sous-domaine gratuit (ex: `letshare.onrender.com`)
- ✅ Déploiement automatique depuis GitHub
- ✅ Variables d'environnement sécurisées

**Limitations du plan gratuit** :
- Service peut "s'endormir" après 15 min d'inactivité
- Redis non disponible (sessions PHP fonctionneront quand même)
- MySQL non disponible gratuitement (voir alternatives ci-dessous)

---

## 📋 Prérequis

- [ ] Compte GitHub (pour stocker votre code)
- [ ] Code LetShare sur GitHub (repo public ou privé)
- [ ] Compte Render.com (gratuit)

---

## 🗄️ Étape 1 : Base de Données MySQL

Render ne propose pas MySQL gratuitement (seulement PostgreSQL). Vous avez 2 options :

### Option A : Base de Données MySQL Externe Gratuite

#### 1.1 Utiliser FreeMySQLHosting.net (Gratuit)

1. Aller sur https://www.freemysqlhosting.net/
2. Cliquer sur "Sign Up Free"
3. Créer un compte
4. Créer une base de données
5. Noter les informations :
   - **Host** : `sql11.freemysqlhosting.net` (exemple)
   - **Database Name** : `sql11xxxxx`
   - **Username** : `sql11xxxxx`
   - **Password** : (celui que vous avez défini)

#### 1.2 Importer le schéma

Utiliser un client MySQL (phpMyAdmin, MySQL Workbench, ou en ligne) :

1. Se connecter à votre base de données externe
2. Importer `database/schema.sql`
3. Appliquer toutes les migrations :
   ```sql
   -- Exécuter chaque fichier migration_*.sql
   ```

### Option B : Utiliser PostgreSQL (Gratuit sur Render)

Si vous êtes prêt à migrer vers PostgreSQL, Render offre PostgreSQL gratuit.

**Pour ce guide, nous utiliserons Option A (MySQL externe gratuit).**

---

## 🚀 Étape 2 : Préparer le Code

### 2.1 Créer un fichier `render.yaml` (Optionnel mais recommandé)

Créer `render.yaml` à la racine du projet :

```yaml
services:
  - type: web
    name: letshare
    env: php
    buildCommand: composer install --no-dev --optimize-autoloader
    startCommand: php -S 0.0.0.0:$PORT -t .
    envVars:
      - key: APP_ENV
        value: production
      - key: DEBUG_MODE
        value: false
      # Les autres variables seront ajoutées dans le dashboard
```

### 2.2 Vérifier la structure

Votre structure doit être :
```
/
├── api/
├── js/
├── css/
├── *.html
├── sw.js          ← Service Worker (DOIT être à la racine)
├── composer.json
├── .env           ← Ne sera PAS commité (ajouter au .gitignore)
└── render.yaml    ← Optionnel
```

### 2.3 Ajouter au .gitignore

Créer/modifier `.gitignore` :
```
.env
.env.*
*.backup.*
vendor/
.DS_Store
```

---

## 🌐 Étape 3 : Créer le Service sur Render

### 3.1 Créer un compte Render

1. Aller sur https://render.com
2. Cliquer sur "Get Started for Free"
3. S'inscrire avec GitHub (recommandé)

### 3.2 Créer un nouveau Web Service

1. Dans le dashboard Render, cliquer sur "New +"
2. Sélectionner "Web Service"
3. Connecter votre repository GitHub
4. Sélectionner le repository LetShare

### 3.3 Configurer le Service

**Configuration de base** :
- **Name** : `letshare` (ou le nom que vous voulez)
- **Environment** : `PHP`
- **Region** : Choisir le plus proche de vos utilisateurs
- **Branch** : `main` ou `master`

**Build & Deploy** :
- **Build Command** :
  ```bash
  composer install --no-dev --optimize-autoloader
  ```
- **Start Command** :
  ```bash
  php -S 0.0.0.0:$PORT -t .
  ```

**Advanced - Root Directory** :
- Si votre code est dans un sous-dossier du repo, indiquer le chemin
- Sinon, laisser vide

### 3.4 Variables d'Environnement

Dans la section "Environment Variables", ajouter :

```env
# Environment
APP_ENV=production
DEBUG_MODE=false

# Database (MySQL externe - utiliser les infos de FreeMySQLHosting)
DB_HOST=sql11.freemysqlhosting.net
DB_NAME=votre_nom_base
DB_USER=votre_utilisateur
DB_PASS=votre_mot_de_passe
DB_CHARSET=utf8mb4

# JWT Secret (générer un nouveau : php -r "echo base64_encode(random_bytes(32));")
JWT_SECRET=votre_jwt_secret_generé

# Application URL (sera mis à jour après déploiement)
APP_BASE_URL=https://letshare.onrender.com

# CORS
CORS_ALLOWED_ORIGINS=https://letshare.onrender.com

# SMTP (Gmail ou autre)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-app-password
SMTP_FROM_EMAIL=noreply@letshare.onrender.com
SMTP_FROM_NAME=LetShare

# VAPID Keys (générer si pas déjà fait)
VAPID_PUBLIC_KEY=votre_cle_publique_vapid
VAPID_PRIVATE_KEY=votre_cle_privee_vapid

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre-client-id
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=https://letshare.onrender.com/api/auth/google/callback.php
```

**Important** : Ne pas mettre les vraies valeurs maintenant, on les mettra après avoir l'URL finale.

---

## 🔧 Étape 4 : Configuration Post-Déploiement

### 4.1 Obtenir l'URL du service

Une fois déployé, Render donnera une URL comme :
```
https://letshare-abc123.onrender.com
```

### 4.2 Mettre à jour les variables d'environnement

1. Aller dans le dashboard Render
2. Cliquer sur votre service
3. Aller dans "Environment"
4. Mettre à jour :
   - `APP_BASE_URL=https://letshare-abc123.onrender.com`
   - `CORS_ALLOWED_ORIGINS=https://letshare-abc123.onrender.com`
   - `GOOGLE_REDIRECT_URI=https://letshare-abc123.onrender.com/api/auth/google/callback.php`

### 4.3 Redémarrer le service

Après modification des variables, redémarrer le service :
- Cliquer sur "Manual Deploy" > "Clear build cache & deploy"

---

## 🛠️ Étape 5 : Configuration PHP pour Render

### 5.1 Créer `public/index.php` (Optionnel)

Si Render nécessite un point d'entrée, créer `public/index.php` :

```php
<?php
// Redirect to main page
header('Location: /Test.html');
exit;
```

Puis changer le `startCommand` à :
```bash
php -S 0.0.0.0:$PORT -t public
```

**Mais pour LetShare, garder** :
```bash
php -S 0.0.0.0:$PORT -t .
```

---

## 🔒 Étape 6 : Sécurité et Configuration

### 6.1 Service Worker (sw.js)

Le Service Worker DOIT être à la racine pour fonctionner.

Vérifier que dans `js/push-notifications.js`, le chemin est correct :

```javascript
// Doit pointer vers la racine
const swPath = '/sw.js';
```

### 6.2 CORS Configuration

Render ajoute automatiquement des headers. Vérifier que dans `api/config.php`, la détection de production fonctionne correctement.

### 6.3 Sessions PHP

Les sessions PHP fonctionneront avec Render, mais elles sont stockées localement.
Pour la scalabilité, considérer Redis plus tard (payant sur Render).

---

## ✅ Étape 7 : Vérification

### 7.1 Tester l'application

1. Accéder à : `https://letshare-abc123.onrender.com/Test.html`
2. Tester la connexion
3. Tester la création d'item
4. Tester les push notifications

### 7.2 Vérifier les logs

Dans le dashboard Render :
- Aller dans "Logs" pour voir les erreurs PHP
- Vérifier les erreurs de base de données
- Vérifier les erreurs de connexion

### 7.3 Problèmes courants

**Erreur 404** :
- Vérifier que les fichiers HTML sont à la racine
- Vérifier le "Root Directory" dans la config

**Erreur de base de données** :
- Vérifier les variables DB_* dans Environment
- Vérifier que la base de données externe autorise les connexions depuis Render (IP)

**Push notifications ne fonctionnent pas** :
- Vérifier que `APP_BASE_URL` utilise HTTPS
- Vérifier que `sw.js` est accessible : `https://letshare.onrender.com/sw.js`
- Vérifier les VAPID keys

**CORS errors** :
- Vérifier `CORS_ALLOWED_ORIGINS` dans Environment
- Vérifier qu'il correspond exactement à l'URL (avec https://)

---

## 🔄 Étape 8 : Déploiements Automatiques

Render déploie automatiquement à chaque push sur la branche configurée.

**Pour éviter les déploiements automatiques** (pour tester) :
- Désactiver "Auto-Deploy" dans les settings
- Utiliser "Manual Deploy" pour déployer manuellement

---

## 💰 Étape 9 : Plan Payant (Optionnel)

Pour améliorer les performances :
- **Starter Plan** : $7/mois
  - Service toujours actif (ne s'endort pas)
  - Meilleures performances
  - Support prioritaire

---

## 📝 Checklist de Déploiement

- [ ] Code sur GitHub
- [ ] Compte Render créé
- [ ] Base de données MySQL créée (externe ou PostgreSQL)
- [ ] Schéma SQL importé
- [ ] Migrations appliquées
- [ ] Service web créé sur Render
- [ ] Variables d'environnement configurées
- [ ] Build Command configuré
- [ ] Start Command configuré
- [ ] Déploiement réussi
- [ ] URL obtenue
- [ ] Variables d'environnement mises à jour avec l'URL
- [ ] Service redémarré
- [ ] Application testée
- [ ] Push notifications testées
- [ ] Logs vérifiés

---

## 🐛 Troubleshooting Avancé

### Problème : Service Worker ne se charge pas

**Solution** :
1. Vérifier que `sw.js` est à la racine du projet
2. Vérifier l'accessibilité : `https://letshare.onrender.com/sw.js`
3. Vérifier les chemins dans `push-notifications.js`
4. Vérifier les headers CORS pour `sw.js`

### Problème : Sessions PHP perdues

**Cause** : Sur Render gratuit, les sessions sont stockées localement et peuvent être perdues.

**Solution temporaire** : Utiliser localStorage côté client (déjà fait dans votre code)

**Solution permanente** : Passer au plan payant pour Redis

### Problème : Timeout lors du build

**Cause** : `composer install` prend trop de temps

**Solution** :
1. Vérifier que `composer.json` ne demande pas trop de dépendances
2. Optimiser avec `--no-dev --optimize-autoloader`
3. Vérifier la connexion réseau

### Problème : Base de données externe refuse la connexion

**Cause** : Restrictions IP

**Solution** :
1. Vérifier que la base de données externe autorise les connexions depuis n'importe quelle IP
2. Ou utiliser une base de données qui autorise les connexions publiques
3. Alternative : Utiliser PostgreSQL sur Render (gratuit)

---

## 📊 Configuration Recommandée

### Variables d'Environnement Minimales

```env
APP_ENV=production
DEBUG_MODE=false
DB_HOST=votre_host_mysql
DB_NAME=votre_db
DB_USER=votre_user
DB_PASS=votre_pass
JWT_SECRET=votre_secret
APP_BASE_URL=https://letshare-abc123.onrender.com
CORS_ALLOWED_ORIGINS=https://letshare-abc123.onrender.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email
SMTP_PASSWORD=votre-app-password
SMTP_FROM_EMAIL=noreply@letshare.onrender.com
VAPID_PUBLIC_KEY=votre_cle
VAPID_PRIVATE_KEY=votre_cle
```

---

## 🔗 Ressources

- Documentation Render : https://render.com/docs
- Documentation PHP sur Render : https://render.com/docs/deploy-php
- Free MySQL Hosting : https://www.freemysqlhosting.net/
- Alternative MySQL gratuite : https://www.db4free.net/

---

## ✅ Prochaines Étapes

1. **Maintenant** : Suivre ce guide étape par étape
2. **Après déploiement** : Tester toutes les fonctionnalités
3. **Si tout fonctionne** : Partager l'URL avec vos utilisateurs
4. **Pour améliorer** : Considérer le plan payant si vous avez beaucoup d'utilisateurs

---

**Besoin d'aide ? N'hésitez pas à me poser des questions lors du déploiement !**

