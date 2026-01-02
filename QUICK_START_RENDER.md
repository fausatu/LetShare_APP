# Déploiement Rapide sur Render - Guide Express

## 🚀 Étapes Rapides (15 minutes)

### 1. Préparer le Code sur GitHub

```bash
# Si pas déjà fait, initialiser Git
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Créer un repo sur GitHub, puis:
git remote add origin https://github.com/VOTRE_USERNAME/letshare.git
git push -u origin main
```

### 2. Base de Données MySQL Gratuite

**Option simple** : Utiliser https://www.freemysqlhosting.net/

1. Créer un compte
2. Créer une base de données
3. Noter : Host, Database, Username, Password
4. Importer `database/schema.sql` via phpMyAdmin en ligne
5. Appliquer les migrations

### 3. Créer le Service sur Render

1. Aller sur https://render.com
2. "Get Started" > Se connecter avec GitHub
3. "New +" > "Web Service"
4. Sélectionner votre repo GitHub

**Configuration** :
- **Name** : `letshare`
- **Environment** : `PHP`
- **Build Command** :
  ```bash
  composer install --no-dev --optimize-autoloader
  ```
- **Start Command** :
  ```bash
  php -S 0.0.0.0:$PORT -t .
  ```

### 4. Variables d'Environnement

Dans "Environment", ajouter :

```env
APP_ENV=production
DEBUG_MODE=false

DB_HOST=sql11.freemysqlhosting.net
DB_NAME=votre_db
DB_USER=votre_user
DB_PASS=votre_pass

JWT_SECRET=votre_secret_generé
APP_BASE_URL=https://letshare-xxx.onrender.com
CORS_ALLOWED_ORIGINS=https://letshare-xxx.onrender.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-app-password
SMTP_FROM_EMAIL=noreply@letshare.onrender.com
SMTP_FROM_NAME=LetShare

VAPID_PUBLIC_KEY=votre_cle_publique
VAPID_PRIVATE_KEY=votre_cle_privee
```

**Note** : Remplacer `letshare-xxx.onrender.com` par l'URL réelle après le premier déploiement.

### 5. Déployer

1. Cliquer sur "Create Web Service"
2. Attendre le déploiement (2-5 minutes)
3. Copier l'URL fournie (ex: `https://letshare-abc123.onrender.com`)

### 6. Mettre à jour les URLs

1. Retourner dans "Environment"
2. Mettre à jour :
   - `APP_BASE_URL` avec votre URL Render
   - `CORS_ALLOWED_ORIGINS` avec votre URL Render
   - `GOOGLE_REDIRECT_URI` avec votre URL Render
3. Redémarrer : "Manual Deploy" > "Clear build cache & deploy"

### 7. Tester

1. Accéder à : `https://letshare-abc123.onrender.com/Test.html`
2. Tester connexion/inscription
3. Tester push notifications
4. Vérifier les logs dans Render dashboard

---

## ✅ Vérification Finale

- [ ] Application accessible
- [ ] Connexion fonctionne
- [ ] Création d'item fonctionne
- [ ] Push notifications fonctionnent
- [ ] Pas d'erreurs dans les logs

---

## 🐛 Problèmes Courants

**Erreur 404** :
→ Vérifier que les fichiers HTML sont à la racine

**Erreur de base de données** :
→ Vérifier les variables DB_* dans Environment
→ Vérifier que la base externe autorise les connexions publiques

**Push notifications ne marchent pas** :
→ Vérifier que `sw.js` est accessible : `https://votre-url.onrender.com/sw.js`
→ Vérifier `APP_BASE_URL` avec HTTPS

---

**Guide détaillé** : Voir `DEPLOY_RENDER.md`

