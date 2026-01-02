# Configuration ngrok pour LetShare (Windows + WAMP)

## 🎯 Objectif
Lancer votre application LetShare avec HTTPS (nécessaire pour push notifications) sans avoir de nom de domaine.

---

## 📋 Prérequis

- ✅ WAMP installé et fonctionnel
- ✅ Votre application accessible sur `http://localhost` ou `http://localhost/XHANGE_APP`
- ✅ Connexion Internet

---

## 🚀 Installation et Configuration

### Étape 1 : Télécharger ngrok

1. Aller sur https://ngrok.com/download
2. Télécharger la version Windows
3. Extraire `ngrok.exe` dans un dossier (ex: `C:\ngrok\`)
4. Ajouter au PATH Windows (optionnel mais recommandé)

### Étape 2 : Créer un compte gratuit

1. Aller sur https://dashboard.ngrok.com/signup
2. Créer un compte (gratuit)
3. Se connecter au dashboard

### Étape 3 : Obtenir votre authtoken

1. Dans le dashboard ngrok, aller dans "Your Authtoken"
2. Copier le token (format: `2abc123...xyz`)

### Étape 4 : Configurer ngrok

Ouvrir PowerShell ou CMD en tant qu'administrateur :

```powershell
# Si ngrok est dans le PATH:
ngrok config add-authtoken VOTRE_TOKEN_ICI

# Sinon, aller dans le dossier ngrok:
cd C:\ngrok
.\ngrok.exe config add-authtoken VOTRE_TOKEN_ICI
```

**Exemple** :
```powershell
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678stu
```

---

## 🔧 Lancer ngrok

### Option A : WAMP sur port 80 (par défaut)

```powershell
ngrok http 80
```

### Option B : WAMP sur port spécifique

```powershell
# Si WAMP utilise le port 8080:
ngrok http 8080

# Si WAMP utilise le port 8888:
ngrok http 8888
```

### Option C : Dossier spécifique (si votre app est dans un sous-dossier)

Si votre application est dans `http://localhost/XHANGE_APP`, vous devez configurer ngrok pour pointer vers ce dossier.

**Solution 1** : Utiliser le port direct de WAMP (recommandé)
```powershell
# Dans WAMP, clic droit > Tools > Port utilisé par Apache
# Utiliser ce port dans ngrok
ngrok http 80
# Puis accéder via: https://abc123.ngrok.io/XHANGE_APP/
```

**Solution 2** : Créer un tunnel avec rewrite
```powershell
# Utiliser ngrok avec option
ngrok http 80 --host-header="localhost"
```

---

## 📝 Configuration .env

Une fois ngrok lancé, vous verrez quelque chose comme :

```
Session Status                online
Account                       votre-email@example.com
Forwarding                    https://abc123-def456.ngrok.io -> http://localhost:80
```

**Important** : Copiez l'URL HTTPS (celle qui commence par `https://`)

### Mettre à jour votre fichier `.env` :

```env
# Utiliser l'URL ngrok
APP_BASE_URL=https://abc123-def456.ngrok.io

# Si votre app est dans un sous-dossier:
APP_BASE_URL=https://abc123-def456.ngrok.io/XHANGE_APP

# CORS - mettre la même URL
CORS_ALLOWED_ORIGINS=https://abc123-def456.ngrok.io

# Ou avec sous-dossier:
CORS_ALLOWED_ORIGINS=https://abc123-def456.ngrok.io/XHANGE_APP
```

---

## ⚠️ Important : URL Changeante

**Avec le plan gratuit** : L'URL ngrok change à chaque fois que vous redémarrez ngrok.

**Solution** :
1. Notez l'URL à chaque démarrage
2. Mettez à jour `.env` avec la nouvelle URL
3. Ou passez au plan payant ($8/mois) pour une URL fixe

---

## ✅ Vérification

### 1. Tester l'accès
Ouvrir dans le navigateur :
```
https://abc123-def456.ngrok.io/Test.html
```
ou
```
https://abc123-def456.ngrok.io/XHANGE_APP/Test.html
```

### 2. Vérifier HTTPS
Le cadenas vert doit apparaître dans la barre d'adresse.

### 3. Tester les Push Notifications
Les push notifications nécessitent HTTPS - ngrok le fournit automatiquement.

---

## 🔧 Configuration Avancée

### Garder ngrok actif en arrière-plan

**Option 1 : Fenêtre séparée**
Laissez la fenêtre PowerShell avec ngrok ouverte.

**Option 2 : Service Windows (avancé)**
Configurer ngrok comme service Windows pour qu'il démarre automatiquement.

### Voir les requêtes en temps réel

Ngrok fournit un dashboard web :
```
http://127.0.0.1:4040
```

Ouvrir ce lien dans votre navigateur pour voir toutes les requêtes en temps réel.

---

## 🐛 Troubleshooting

### Problème : "Tunnel not found"
**Solution** : Vérifiez que WAMP est bien lancé et accessible sur `http://localhost`

### Problème : "403 Forbidden" avec sous-dossier
**Solution** : 
```powershell
ngrok http 80 --host-header="localhost"
```

### Problème : CORS errors
**Solution** : Vérifiez que `CORS_ALLOWED_ORIGINS` dans `.env` correspond exactement à l'URL ngrok (avec https://)

### Problème : Push notifications ne fonctionnent pas
**Solution** : 
1. Vérifiez que vous utilisez l'URL HTTPS (pas HTTP)
2. Vérifiez que `APP_BASE_URL` dans `.env` utilise HTTPS
3. Vérifiez la console du navigateur (F12) pour les erreurs

### Problème : Service Worker ne se charge pas
**Solution** : 
- Vérifiez que `sw.js` est accessible : `https://abc123.ngrok.io/sw.js`
- Si dans un sous-dossier : `https://abc123.ngrok.io/XHANGE_APP/sw.js`
- Vérifiez les chemins dans `push-notifications.js`

---

## 📝 Script Automatique (Optionnel)

Créez un fichier `start_ngrok.bat` :

```batch
@echo off
echo Starting ngrok...
ngrok http 80
pause
```

Double-cliquez dessus pour lancer ngrok facilement.

---

## 🎯 Prochaines Étapes

Une fois ngrok configuré :

1. ✅ Lancer WAMP
2. ✅ Lancer ngrok : `ngrok http 80`
3. ✅ Copier l'URL HTTPS fournie
4. ✅ Mettre à jour `.env` avec cette URL
5. ✅ Tester l'application
6. ✅ Partager l'URL avec vos testeurs

---

## 💡 Astuce : Plan Payant ($8/mois)

Si vous avez besoin d'une URL fixe :
1. Passer au plan payant ngrok
2. Configurer un domaine réservé
3. URL fixe : `https://letshare.ngrok.io` (par exemple)

---

**Besoin d'aide ? Consultez la documentation ngrok : https://ngrok.com/docs**

