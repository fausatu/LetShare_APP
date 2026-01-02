# Guide de configuration pour la production - LetShare

## 🚀 Étapes de configuration

### 1. Installer les dépendances Composer

```bash
composer install
```

Cela installera notamment `vlucas/phpdotenv` pour la gestion des variables d'environnement.

### 2. Créer le fichier .env

1. Copiez `env.example.txt` vers `.env` dans le répertoire racine :
   ```bash
   cp env.example.txt .env
   ```

2. Éditez le fichier `.env` et remplissez toutes les valeurs :

   **IMPORTANT**: Remplacez TOUTES les valeurs par défaut !

   - `APP_ENV=production` (pas "development")
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` : vos credentials de base de données de production
   - `JWT_SECRET` : Générez une clé aléatoire forte avec :
     ```bash
     openssl rand -base64 32
     ```
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` : vos credentials Google OAuth
   - `SMTP_*` : vos paramètres SMTP pour l'envoi d'emails
   - `APP_BASE_URL` : l'URL complète de votre application (ex: `https://letshare.example.com`)
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` : vos clés VAPID pour les notifications push
   - `DEBUG_MODE=false` (IMPORTANT: toujours false en production)
   - `CORS_ALLOWED_ORIGINS` : votre domaine de production (ex: `https://letshare.example.com`)

### 3. Vérifier la sécurité

**Avant de déployer, vérifiez que :**

- ✅ Le fichier `.env` existe et contient toutes les valeurs
- ✅ `APP_ENV=production` dans `.env`
- ✅ `DEBUG_MODE=false` dans `.env`
- ✅ `JWT_SECRET` a été changé (pas la valeur par défaut)
- ✅ Tous les secrets sont remplis (pas de valeurs vides pour les clés sensibles)
- ✅ `CORS_ALLOWED_ORIGINS` contient uniquement votre domaine de production
- ✅ Le fichier `.env` est dans `.gitignore` (NE JAMAIS commiter `.env`)

### 4. Configuration HTTPS

**Obligatoire pour la production** car les Service Workers et Push Notifications nécessitent HTTPS.

Configurez SSL sur votre serveur web (Apache/Nginx) et redirigez HTTP vers HTTPS.

### 5. Configuration de la base de données

1. Créez une base de données MySQL/MariaDB de production
2. Importez le schéma :
   ```bash
   mysql -u votre_user -p votre_db < database/schema.sql
   ```
3. Appliquez toutes les migrations si nécessaire :
   ```bash
   # Exécutez chaque fichier migration dans database/
   mysql -u votre_user -p votre_db < database/migration_*.sql
   ```

### 6. Permissions des fichiers

Assurez-vous que les permissions sont correctes :

```bash
# Fichiers PHP (lecture seule pour le serveur web)
chmod 644 api/*.php
chmod 644 api/**/*.php

# Répertoire pour les logs (si vous créez un dossier logs/)
mkdir logs
chmod 755 logs
chmod 644 logs/*.log
```

### 7. Configuration du serveur web

#### Apache (.htaccess recommandé)

Créez un fichier `.htaccess` à la racine pour :

```apache
# Forcer HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Protéger le fichier .env
<Files ".env">
    Order allow,deny
    Deny from all
</Files>

# Protection des fichiers sensibles
<FilesMatch "^(config\.php|\.env|composer\.(json|lock))$">
    Order allow,deny
    Deny from all
</FilesMatch>
```

#### Nginx

Ajoutez dans votre configuration :

```nginx
# Forcer HTTPS
server {
    listen 80;
    server_name letshare.example.com;
    return 301 https://$server_name$request_uri;
}

# Bloquer l'accès au .env
location ~ /\.env {
    deny all;
    return 404;
}

# Bloquer l'accès aux fichiers sensibles
location ~ ^/(config\.php|composer\.(json|lock))$ {
    deny all;
    return 404;
}
```

### 8. Tests avant la mise en ligne

1. **Test de connexion DB** : Vérifiez que l'application se connecte à la base de données
2. **Test d'authentification** : Essayez de créer un compte et de vous connecter
3. **Test des emails** : Vérifiez que les emails de vérification sont envoyés
4. **Test des notifications push** : Vérifiez que les notifications fonctionnent
5. **Test CORS** : Vérifiez que les requêtes depuis votre domaine fonctionnent
6. **Vérifier les logs** : Consultez les logs d'erreur PHP pour détecter les problèmes

### 9. Monitoring en production

- Configurez la rotation des logs
- Surveillez les erreurs dans les logs PHP (`error_log`)
- Configurez des alertes pour les erreurs critiques
- Surveillez l'utilisation de la base de données

### 10. Sauvegardes

Configurez des sauvegardes automatiques :
- Base de données (quotidien recommandé)
- Fichiers de l'application (hebdomadaire minimum)
- Fichier `.env` (sauvegardez-le séparément et sécurisé)

---

## ⚠️ Checklist de sécurité finale

Avant de mettre en ligne, vérifiez :

- [ ] `.env` configuré avec toutes les valeurs de production
- [ ] `DEBUG_MODE=false` dans `.env`
- [ ] `APP_ENV=production` dans `.env`
- [ ] `JWT_SECRET` changé et fort
- [ ] Tous les secrets remplis (pas de valeurs par défaut)
- [ ] `CORS_ALLOWED_ORIGINS` limité à votre domaine
- [ ] HTTPS configuré et fonctionnel
- [ ] `.env` dans `.gitignore` et non commité
- [ ] Permissions de fichiers correctes
- [ ] Base de données de production créée et migrée
- [ ] Tests fonctionnels effectués
- [ ] Logs d'erreur configurés

---

## 🔧 Dépannage

### Erreur "Database connection failed"
- Vérifiez les credentials dans `.env`
- Vérifiez que la base de données existe
- Vérifiez que l'utilisateur DB a les permissions

### Erreur "JWT_SECRET must be changed"
- Changez `JWT_SECRET` dans `.env` avec une clé forte

### CORS errors
- Vérifiez que `CORS_ALLOWED_ORIGINS` contient votre domaine
- Vérifiez que `APP_ENV=production` dans `.env`

### Emails non envoyés
- Vérifiez les paramètres SMTP dans `.env`
- Vérifiez que `DEBUG_MODE=false` (sinon les emails ne sont pas envoyés)

