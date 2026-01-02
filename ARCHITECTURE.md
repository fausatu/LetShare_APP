# Architecture de LetShare

## Vue d'ensemble
LetShare est une application web moderne de partage et d'échange d'objets entre étudiants universitaires, construite avec une architecture **client-serveur** classique.

---

## 🏗️ Architecture Globale

### Pattern: **Monolithique Multi-Pages (MPA)**
- **Frontend**: Pages HTML statiques + JavaScript vanilla
- **Backend**: API REST PHP
- **Base de données**: MySQL
- **Communication**: Fetch API (XMLHttpRequest moderne)

```
┌─────────────────┐
│   Frontend      │  HTML/CSS/JavaScript
│   (Client)      │  ──────────────────
└────────┬────────┘
         │ HTTP/HTTPS
         │ REST API
         │
┌────────▼────────┐
│   Backend       │  PHP API
│   (Server)      │  ──────────────────
└────────┬────────┘
         │ PDO
         │
┌────────▼────────┐
│   Database      │  MySQL
│   (Data)        │  ──────────────────
└─────────────────┘
```

---

## 📁 Structure des Fichiers

### Frontend (`/`)

#### Pages HTML
```
├── Test.html              # Page principale (liste des items)
├── login.html             # Authentification
├── register.html          # Inscription
├── profile.html           # Profil utilisateur
├── settings.html          # Paramètres utilisateur
├── reset_password.html    # Réinitialisation mot de passe
├── email_login.html       # Connexion par email
└── sw.js                  # Service Worker (Push Notifications)
```

#### JavaScript (`/js/`)
```
├── api.js                 # Gestion centralisée des appels API
├── auth.js                # Authentification client-side
├── items.js               # Gestion des items (affichage, création)
├── modals.js              # Modals (détails items, reviews)
├── messages.js            # Système de messagerie
├── profile.js             # Gestion du profil utilisateur
├── settings.js            # Gestion des paramètres
├── filters.js             # Filtres de recherche
├── translations.js        # Internationalisation (i18n)
├── push-notifications.js  # Push notifications client
├── presence.js            # Présence en ligne
├── utils.js               # Utilitaires généraux
├── feedback.js            # Feedback utilisateur
└── main.js                # Initialisation globale
```

#### CSS (`/css/`)
```
├── main.css               # Styles principaux
├── auth.css               # Styles authentification
├── profile.css            # Styles profil
└── settings.css           # Styles paramètres
```

---

### Backend (`/api/`)

#### Configuration
```
├── config.php             # Configuration globale (DB, CORS, JWT, Email)
```

#### Authentification (`/api/auth/`)
```
├── login.php              # Connexion
├── register.php           # Inscription
├── logout.php             # Déconnexion
├── me.php                 # Récupérer utilisateur actuel
├── forgot_password.php    # Mot de passe oublié
├── reset_password.php     # Réinitialiser mot de passe
├── verify_email.php       # Vérification email
├── send_verification_email.php
├── send_email_code.php    # Code à 6 chiffres
├── verify_email_code.php
├── resend_verification.php
├── validate_university_email.php
├── complete_email_registration.php
└── google/                # OAuth Google
    ├── login.php
    └── callback.php
```

#### API Principale
```
├── users.php              # CRUD utilisateurs
├── users_public.php       # Profils publics
├── items.php              # CRUD items (donations/échanges)
├── conversations.php      # Conversations entre utilisateurs
├── messages.php           # Messages dans conversations
├── interested.php         # Items intéressants
├── reviews.php            # Avis utilisateurs
├── notifications.php      # Notifications
├── departments.php        # Départements/filières
├── universities.php       # Universités
├── matching.php           # Matching/Recommandations
├── presence.php           # Présence en ligne
├── moderation.php         # Modération
└── feedback.php           # Feedback
```

#### Push Notifications (`/api/push/`)
```
├── subscribe.php          # S'abonner aux notifications
├── unsubscribe.php        # Se désabonner
├── send.php               # Envoyer une notification
├── test.php               # Tester les notifications
├── vapid-key.php          # Clé publique VAPID
├── push_sender.php        # Helper pour envoi
└── check_table.php        # Vérifier table subscriptions
```

---

### Base de Données (`/database/`)

#### Schéma Principal
```
├── schema.sql             # Schéma initial complet
```

#### Migrations
```
├── migration_email_verification.sql
├── migration_password_reset.sql
├── migration_privacy_settings.sql
├── migration_create_push_subscriptions.sql
├── migration_add_university_logo.sql
├── migration_add_cancelled_status.sql
├── migration_add_conversation_hidden.sql
├── migration_add_notification_types.sql
├── migration_fix_image_columns.sql
├── migration_fix_endpoint_column.sql
├── migration_add_conversation_id_to_reviews.sql
├── migration_university_validation.sql
└── migration_new_features.sql
```

#### Tables Principales
```sql
- users                    # Utilisateurs
- items                    # Items (donations/échanges)
- item_images              # Images des items (multi-images)
- conversations            # Conversations entre utilisateurs
- messages                 # Messages dans conversations
- user_reviews             # Avis utilisateurs
- interested_items         # Items marqués comme intéressants
- notifications            # Notifications
- push_subscriptions       # Abonnements push notifications
- universities             # Universités
- departments              # Départements/filières
```

---

## 🔄 Flux de Données

### Authentification
```
1. Utilisateur saisit credentials (login.html)
   ↓
2. auth.js → POST /api/auth/login.php
   ↓
3. Serveur vérifie credentials + crée session
   ↓
4. Retour JWT token (ou session ID)
   ↓
5. Stockage localStorage + redirection
```

### Affichage Items
```
1. Test.html charge
   ↓
2. items.js → GET /api/items.php
   ↓
3. Serveur query MySQL → items + users + images
   ↓
4. Formatage JSON
   ↓
5. items.js rend les cards HTML
```

### Push Notifications
```
1. Service Worker enregistré (sw.js)
   ↓
2. push-notifications.js demande permission
   ↓
3. Subscription PushManager
   ↓
4. POST /api/push/subscribe.php → sauvegarde DB
   ↓
5. Serveur peut envoyer via WebPush (PHP library)
   ↓
6. Service Worker reçoit → affiche notification
```

---

## 🛠️ Technologies Utilisées

### Frontend
- **HTML5** - Structure
- **CSS3** - Styles (avec gradients, animations)
- **JavaScript (ES6+)** - Logique client
- **Service Workers** - Push notifications, offline
- **Fetch API** - Appels HTTP
- **LocalStorage/SessionStorage** - Cache client

### Backend
- **PHP 7.4+** - Langage serveur
- **PDO** - Accès base de données
- **MySQL** - Base de données relationnelle
- **Composer** - Gestionnaire de dépendances

### Bibliothèques PHP (via Composer)
- **vlucas/phpdotenv** - Variables d'environnement (.env)
- **minishlink/web-push** - Push notifications (WebPush)
- **web-token/jwt-framework** - JWT (si utilisé)

### Configuration
- **.env** - Variables d'environnement (secrets)
- **CORS** - Cross-Origin Resource Sharing
- **Sessions PHP** - Authentification étatful

---

## 🔐 Sécurité

### Authentification
- **Session-based** (PHP sessions)
- Support JWT (configuration disponible)
- OAuth Google (optionnel)

### Validation
- Validation email universitaire
- Vérification email par code à 6 chiffres
- Mot de passe hashé (password_hash PHP)

### Protection
- **CORS** configuré (development/production)
- **SQL Injection** protection (PDO prepared statements)
- **XSS** protection (échappement des données)
- Rate limiting (pour password reset)

---

## 🌐 Internationalisation (i18n)

- **Support multilingue**: FR/EN
- **Fichier**: `js/translations.js`
- **Détection automatique**: Basée sur navigateur
- **Sauvegarde préférence**: localStorage

---

## 📦 Dépendances Externes

### Composer (`composer.json`)
```json
{
  "require": {
    "vlucas/phpdotenv": "^5.5",
    "minishlink/web-push": "^7.0"
  }
}
```

### Installation
```bash
composer install
```

---

## 🚀 Déploiement

### Structure Production
```
/
├── api/           # API PHP (accessible publiquement)
├── css/           # Fichiers statiques
├── js/            # Fichiers statiques
├── *.html         # Pages publiques
├── sw.js          # Service Worker (racine obligatoire)
├── .env           # Variables d'environnement (NE JAMAIS COMMIT)
├── vendor/        # Dépendances Composer
└── database/      # Migrations (scripts SQL)
```

### Configuration Production
1. **.env** avec vraies valeurs
2. **APP_ENV=production**
3. **DEBUG_MODE=false**
4. **CORS_ALLOWED_ORIGINS** configuré
5. **JWT_SECRET** changé
6. **DB credentials** sécurisés

---

## 📊 Flux Utilisateur Principal

```
1. Visite → login.html / register.html
   ↓
2. Authentification → Test.html (liste items)
   ↓
3. Navigation:
   - Voir items → modals.js
   - Créer item → items.js
   - Profil → profile.html
   - Paramètres → settings.html
   - Messages → messages.js
   ↓
4. Interactions:
   - Marquer intéressé → interested.php
   - Demander item → conversations.php
   - Envoyer message → messages.php
   - Laisser avis → reviews.php
```

---

## 🔍 Points Clés Architecture

### ✅ Avantages
- **Simple** - Architecture classique, facile à comprendre
- **Monolithique** - Tout en un, pas de microservices complexes
- **Rapide développement** - Pas de build step, modifications directes
- **Stateless API** - Chaque requête indépendante (sauf sessions)

### ⚠️ Limitations Actuelles
- **Pas de build process** - Pas de minification/bundling
- **Pas de framework frontend** - JavaScript vanilla (pros/cons)
- **Monolithique** - Scalabilité horizontale limitée
- **Pas de cache** - Chaque requête DB directe

---

## 🔄 Évolutions Possibles

### Court terme
- Cache Redis pour sessions/requêtes fréquentes
- CDN pour assets statiques
- Optimisation images (compression)

### Long terme
- Framework frontend (React/Vue) si nécessaire
- API GraphQL
- Microservices si besoin de scalabilité
- Docker containerisation

---

## 📝 Notes Techniques

### Session Management
- Sessions PHP côté serveur
- localStorage côté client (cache)
- Synchronisation via API `/auth/me`

### Push Notifications
- Service Worker requis
- VAPID keys pour authentification
- Stockage subscriptions en DB

### Multi-images Items
- Table `item_images` séparée
- Support plusieurs images par item
- Ordre d'affichage via `display_order`

---

**Version**: 1.0.0  
**Dernière mise à jour**: 2024

