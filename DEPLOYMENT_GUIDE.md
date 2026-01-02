# Guide de Déploiement en Production - LetShare

> **Note** : Si vous n'avez pas encore de nom de domaine, consultez `DEPLOYMENT_OPTIONS.md` pour les alternatives (ngrok, services gratuits, etc.).

## 🚀 Prérequis

### Serveur
- PHP 7.4+ (recommandé 8.0+)
- MySQL 5.7+ ou MariaDB 10.3+
- Apache 2.4+ avec mod_rewrite et mod_headers
- SSL Certificate (HTTPS obligatoire pour push notifications)
- Composer installé

### Configuration minimale PHP
```ini
memory_limit = 256M
upload_max_filesize = 10M
post_max_size = 10M
max_execution_time = 30
session.gc_maxlifetime = 7200
```

---

## 📋 Checklist Avant Déploiement

### 1. Exécuter le script de vérification
```bash
php scripts/check_production.php
```

Ce script vérifie :
- ✅ Existence du fichier `.env`
- ✅ Configuration sécurisée (pas de valeurs par défaut)
- ✅ DEBUG_MODE désactivé
- ✅ CORS configuré
- ✅ Fichiers sensibles protégés
- ✅ Dépendances installées

---

## 🔧 Étapes de Déploiement

### Étape 1 : Préparer l'environnement

#### 1.1 Cloner/Uploader le code
```bash
# Sur votre serveur
cd /var/www/html  # ou votre répertoire web
# Uploader tous les fichiers (sauf .env)
```

#### 1.2 Installer les dépendances Composer
```bash
composer install --no-dev --optimize-autoloader
```

#### 1.3 Créer le fichier `.env`
```bash
cp env.example.txt .env
nano .env  # Éditer avec vos valeurs
```

#### 1.4 Configurer `.env` pour production
```env
# CRITIQUE - Changer toutes ces valeurs
APP_ENV=production
DEBUG_MODE=false

# Database (utiliser un utilisateur dédié avec mot de passe fort)
DB_HOST=localhost
DB_NAME=letshare_db
DB_USER=letshare_user
DB_PASS=votre_mot_de_passe_fort_ici

# JWT Secret (générer avec: openssl rand -base64 32)
JWT_SECRET=votre_secret_jwt_fort_ici

# Application URL (sans slash final)
APP_BASE_URL=https://votre-domaine.com

# CORS - Liste des domaines autorisés (séparés par virgules)
CORS_ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-app-password-gmail
SMTP_FROM_EMAIL=noreply@votre-domaine.com
SMTP_FROM_NAME=LetShare

# VAPID Keys pour Push Notifications
VAPID_PUBLIC_KEY=votre_clé_publique_vapid
VAPID_PRIVATE_KEY=votre_clé_privée_vapid

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=votre-client-id
GOOGLE_CLIENT_SECRET=votre-client-secret
GOOGLE_REDIRECT_URI=https://votre-domaine.com/api/auth/google/callback.php
```

---

### Étape 2 : Base de Données

#### 2.1 Créer la base de données
```sql
CREATE DATABASE letshare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 2.2 Créer un utilisateur dédié (recommandé)
```sql
CREATE USER 'letshare_user'@'localhost' IDENTIFIED BY 'mot_de_passe_fort';
GRANT ALL PRIVILEGES ON letshare_db.* TO 'letshare_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 2.3 Importer le schéma
```bash
mysql -u letshare_user -p letshare_db < database/schema.sql
```

#### 2.4 Appliquer les migrations
```bash
# Appliquer toutes les migrations dans l'ordre
mysql -u letshare_user -p letshare_db < database/migration_email_verification.sql
mysql -u letshare_user -p letshare_db < database/migration_password_reset.sql
mysql -u letshare_user -p letshare_db < database/migration_privacy_settings.sql
mysql -u letshare_user -p letshare_db < database/migration_create_push_subscriptions.sql
# ... (appliquez toutes les autres migrations)
```

---

### Étape 3 : Configuration Apache

#### 3.1 Vérifier que `.htaccess` est activé
Dans votre configuration Apache, assurez-vous que :
```apache
<Directory /var/www/html>
    AllowOverride All
    Require all granted
</Directory>
```

#### 3.2 Vérifier les modules Apache
```bash
# Vérifier que ces modules sont activés
a2enmod rewrite
a2enmod headers
a2enmod expires
a2enmod deflate

# Redémarrer Apache
systemctl restart apache2
```

#### 3.3 Configurer SSL (HTTPS)
```bash
# Si vous utilisez Let's Encrypt
apt-get install certbot python3-certbot-apache
certbot --apache -d votre-domaine.com -d www.votre-domaine.com
```

Le `.htaccess` contient déjà la redirection HTTPS (décommentez si nécessaire).

---

### Étape 4 : Permissions de fichiers

#### 4.1 Permissions recommandées
```bash
# Fichiers PHP
find . -type f -name "*.php" -exec chmod 644 {} \;

# Répertoires
find . -type d -exec chmod 755 {} \;

# Fichiers sensibles (protéger)
chmod 600 .env
chmod 600 api/config.php

# Répertoire d'upload (si vous en créez un)
# mkdir uploads
# chmod 755 uploads
# chown www-data:www-data uploads
```

---

### Étape 5 : Vérifications Finales

#### 5.1 Tester les endpoints API
```bash
# Test de santé (créer un endpoint si nécessaire)
curl https://votre-domaine.com/api/users.php

# Vérifier que les erreurs ne s'affichent pas
# (doit retourner JSON, pas d'erreurs PHP)
```

#### 5.2 Vérifier les logs
```bash
# Vérifier les erreurs PHP
tail -f /var/log/apache2/error.log

# Vérifier les logs PHP
tail -f /var/log/php/error.log  # selon votre configuration
```

#### 5.3 Tester les fonctionnalités
- [ ] Connexion/Inscription
- [ ] Création d'item
- [ ] Push notifications
- [ ] Messagerie
- [ ] Upload d'images (si applicable)

---

## 🔒 Sécurité Post-Déploiement

### 1. Protection des fichiers sensibles
Vérifier que `.htaccess` bloque :
- ✅ `.env`
- ✅ `composer.json` / `composer.lock`
- ✅ `api/config.php` (via `api/.htaccess`)

### 2. Headers de sécurité
Les headers suivants sont configurés dans `.htaccess` :
- ✅ X-Frame-Options
- ✅ X-XSS-Protection
- ✅ X-Content-Type-Options
- ✅ Referrer-Policy

### 3. Rate Limiting
Le rate limiting est actif sur :
- ✅ `/api/auth/forgot_password.php` (3 tentatives / 15 min)
- ✅ `/api/auth/login.php` (via fonction `applyRateLimit()`)
- ✅ `/api/auth/register.php` (via fonction `applyRateLimit()`)

### 4. Vérifier CORS
Assurez-vous que `CORS_ALLOWED_ORIGINS` dans `.env` contient UNIQUEMENT vos domaines.

---

## 📊 Monitoring et Maintenance

### 1. Logs à surveiller
```bash
# Erreurs Apache
tail -f /var/log/apache2/error.log

# Erreurs PHP (selon configuration)
tail -f /var/log/php/error.log
```

### 2. Sauvegardes Base de Données
Configurer des sauvegardes automatiques :
```bash
# Exemple de script de backup quotidien
#!/bin/bash
mysqldump -u letshare_user -p letshare_db > /backups/letshare_$(date +%Y%m%d).sql
```

### 3. Monitoring des performances
- Surveiller l'utilisation CPU/Mémoire
- Surveiller les requêtes lentes en base de données
- Surveiller l'espace disque

---

## 🐛 Troubleshooting

### Problème : Erreurs 500
**Solution** :
1. Vérifier les logs Apache/PHP
2. Vérifier les permissions des fichiers
3. Vérifier que `.env` est bien configuré
4. Vérifier la connexion à la base de données

### Problème : CORS errors
**Solution** :
1. Vérifier `CORS_ALLOWED_ORIGINS` dans `.env`
2. Vérifier que le domaine correspond exactement
3. Vérifier les headers dans `api/.htaccess`

### Problème : Push notifications ne fonctionnent pas
**Solution** :
1. Vérifier que HTTPS est activé
2. Vérifier les VAPID keys dans `.env`
3. Vérifier que `sw.js` est accessible à la racine
4. Vérifier la console du navigateur (F12)

### Problème : Images ne se chargent pas
**Solution** :
1. Vérifier les permissions du répertoire d'images
2. Vérifier la configuration `upload_max_filesize` dans PHP
3. Vérifier les chemins dans la base de données

---

## ✅ Checklist Finale

Avant de mettre en ligne :

- [ ] `.env` configuré avec vraies valeurs
- [ ] `DEBUG_MODE=false`
- [ ] `APP_ENV=production`
- [ ] Base de données créée et migrée
- [ ] SSL/HTTPS configuré
- [ ] `.htaccess` en place
- [ ] Permissions de fichiers correctes
- [ ] Composer dependencies installées
- [ ] Tests fonctionnels passés
- [ ] Script `check_production.php` sans erreurs
- [ ] CORS configuré correctement
- [ ] Sauvegardes configurées
- [ ] Monitoring en place

---

## 📞 Support

En cas de problème, vérifier :
1. Les logs serveur
2. La console navigateur (F12)
3. Le script `check_production.php`
4. La documentation dans `ARCHITECTURE.md`

---

**Version**: 1.0.0  
**Dernière mise à jour**: 2024

