<div align="center">

<img src="https://img.shields.io/badge/-%F0%9F%8E%93%20LetShare-1a1a2e?style=for-the-badge&logoColor=white" alt="LetShare" height="60"/>

### **Give, Swap, Grow** 🌱
*La plateforme de don et d'échange entre étudiants*

[![PHP](https://img.shields.io/badge/PHP-8.0+-777BB4?logo=php&logoColor=white)](https://php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://mysql.com)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red)](#-licence)
[![Status](https://img.shields.io/badge/Status-Live%20🟢-brightgreen)](https://letshare-app.fr)

**[🌐 Voir l'application](https://letshare-app.fr)** • **[🐛 Signaler un bug](https://github.com/fausatu/letShare_APP/issues)** • **[📧 Contact](mailto:support@letshare-app.fr)**

---

> **LetShare**, c'est le Leboncoin des étudiants — mais 100% gratuit, 100% communautaire.  
> Conçu pour réduire le gaspillage et connecter les étudiants autour du partage.

</div>

---

## Pourquoi LetShare ?

Sur mon campus, il y avait un système de don physique — une grande boîte dans le couloir. Elle se remplissait, mais ne se vidait jamais vraiment. Et honnêtement ? Je comprends pourquoi. Fouiller dedans devant tout le monde, au milieu des couloirs bondés... c'est gênant. Personne n'ose.

C'est de cette observation simple que LetShare est né : **le don entre étudiants fonctionne mieux quand il est discret, digital, et communautaire.** Pas de regard des autres, pas de déplacement — juste un échange entre étudiants vérifiés depuis son téléphone.

| Problème observé | Solution LetShare |
|-----------------|-------------------|
| La boîte de don se remplit, personne n'ose y fouiller | Navigation privée depuis chez soi, zéro regard extérieur |
| Objets inutilisés qui finissent à la poubelle | Don ou échange entre étudiants vérifiés |
| Budget limité pour acheter du matériel | Accès 100% gratuit à des centaines d'objets |
| Méfiance envers des inconnus en ligne | Communauté fermée, email universitaire obligatoire |
| Donner son numéro à des étrangers | Messagerie intégrée et sécurisée |

---

##  Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 🔐 **Inscription sécurisée** | Validation par email universitaire (50+ universités supportées) |
| 📦 **Publication d'articles** | Don ou échange, jusqu'à 5 photos, catégories multiples |
| 🔍 **Feed personnalisé** | Filtres par type, département, état de l'objet |
| 💬 **Chat temps réel** | Messagerie instantanée avec indicateur de présence (Pusher) |
| 🌍 **Traduction automatique** | Messages traduits à la volée FR ↔ EN (Google Translate API) |
| ✅ **Double confirmation** | Les deux parties confirment la réussite de l'échange |
| ⭐ **Avis & réputation** | Système de notation 1–5 étoiles avec commentaires |
| 🔔 **Notifications push** | Alertes en temps réel dans le navigateur |
| 🌙 **Mode sombre** | Interface adaptée à vos préférences |

---

##  Stack Technologique

### Frontend
- **HTML5 / CSS3** — Interface responsive mobile-first
- **JavaScript Vanilla ES6+** — Sans framework, zéro dépendance lourde
- **Pusher.js** — WebSocket pour le temps réel

### Backend
- **PHP 8.0+** — API REST structurée
- **MySQL 8.0** — Base de données relationnelle
- **PDO** — Requêtes préparées sécurisées
- **JWT** — Authentification stateless

### Services externes

| Service | Usage |
|---------|-------|
| [Pusher](https://pusher.com) | Chat temps réel & indicateurs de présence |
| [Google Translate API](https://cloud.google.com/translate) | Traduction automatique des messages |
| [Brevo](https://brevo.com) | Emails transactionnels (confirmation, alertes) |
| [IONOS](https://ionos.fr) | Hébergement production |

---

## 📁 Structure du Projet

```
letshare/
├── 📄 index.html              # Feed principal
├── 📄 login.html              # Connexion
├── 📄 register.html           # Inscription
├── 📄 profile.html            # Profil utilisateur
├── 📄 settings.html           # Paramètres
│
├── 📁 api/                    # Endpoints PHP (API REST)
│   ├── auth/                  # Login, register, JWT refresh
│   ├── items.php              # CRUD articles
│   ├── messages.php           # Messagerie
│   ├── conversations.php      # Gestion conversations
│   ├── notifications.php      # Notifications
│   ├── reviews.php            # Avis & notations
│   └── translate.php          # Proxy Google Translate
│
├── 📁 js/                     # Scripts frontend
│   ├── main.js                # Initialisation globale
│   ├── items.js               # Gestion articles
│   ├── messages.js            # Liste conversations
│   ├── conversation-modal.js  # Chat temps réel
│   ├── pusher-chat.js         # Intégration Pusher
│   └── translations.js        # i18n FR/EN
│
├── 📁 css/                    # Feuilles de style
│   ├── main.css               # Styles globaux
│   └── auth.css               # Pages connexion/inscription
│
├── 📁 database/               # Schémas & migrations SQL
│   ├── schema.sql
│   └── migration_*.sql
│
└── 📁 vendor/                 # Dépendances Composer
```

---

##  Base de Données

| Table | Description |
|-------|-------------|
| `users` | Profils, authentification, préférences |
| `items` | Articles publiés (don/échange) |
| `item_images` | Photos associées aux articles |
| `conversations` | Conversations entre utilisateurs |
| `messages` | Messages des conversations |
| `reviews` | Avis et notations |
| `notifications` | Notifications utilisateurs |
| `push_subscriptions` | Abonnements push web |

---

## 🚀 Installation

### Prérequis

- PHP 8.0+
- MySQL 8.0+
- Composer
- Apache / Nginx (ou WAMP / XAMPP en local)

### 1. Cloner le repository

```bash
git clone https://github.com/fausatu/letShare_APP.git
cd letShare_APP
```

### 2. Installer les dépendances PHP

```bash
composer install
```

### 3. Configurer l'environnement

Créer un fichier `.env` à la racine :

```env
# Base de données
DB_HOST=localhost
DB_NAME=letshare_db
DB_USER=root
DB_PASS=

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_securise

# Pusher (temps réel)
PUSHER_APP_ID=votre_app_id
PUSHER_KEY=votre_key
PUSHER_SECRET=votre_secret
PUSHER_CLUSTER=eu

# Google Translate API
GOOGLE_TRANSLATE_API_KEY=votre_api_key

# Brevo (emails)
BREVO_API_KEY=votre_api_key
```

### 4. Importer la base de données

```bash
mysql -u root -p letshare_db < database/schema.sql
```

> Ou via phpMyAdmin : importer `database/letshare_db.sql`

### 5. Lancer en local (WAMP)

Placer le projet dans `C:\wamp64\www\letShare_APP` et accéder via `http://localhost/letShare_APP`.

---

## 🔧 Configuration des services

<details>
<summary><strong>Pusher — Chat temps réel</strong></summary>

1. Créer un compte sur [pusher.com](https://pusher.com)
2. Créer une app **Channels**
3. Copier les credentials dans `.env`

</details>

<details>
<summary><strong>Google Translate API</strong></summary>

1. Activer **Cloud Translation API** dans Google Cloud Console
2. Créer une clé API
3. Ajouter `GOOGLE_TRANSLATE_API_KEY` dans `.env`

</details>

<details>
<summary><strong>Brevo — Emails transactionnels</strong></summary>

1. Créer un compte sur [brevo.com](https://brevo.com)
2. Générer une clé API dans les paramètres
3. Ajouter `BREVO_API_KEY` dans `.env`

</details>

---

## 🔒 Sécurité

- ✅ Authentification **JWT** stateless
- ✅ Validation obligatoire par **email universitaire**
- ✅ **Requêtes préparées PDO** — protection contre les injections SQL
- ✅ Protection **CSRF**
- ✅ **Rate limiting** sur les endpoints sensibles
- ✅ **Échappement HTML** — protection contre les XSS
- ✅ **HTTPS** obligatoire en production

---

## 🌍 Internationalisation

L'application supporte le **français** et l'**anglais** :

- **Interface** : fichier `js/translations.js` (i18n statique)
- **Messages chat** : traduction temps réel via Google Translate API
- **Articles** : traduction à la volée du contenu

Le changement de langue est disponible dans les paramètres utilisateur.

---

## 🤝 Contribution

Ce projet est partagé à titre éducatif, le code source reste sous mon contrôle. Les contributions ne sont pas ouvertes librement, mais les suggestions et retours sont les bienvenus.

Si tu souhaites contribuer, **ouvre d'abord une issue** pour en discuter avant de soumettre quoi que ce soit. Les PR sans discussion préalable ne seront pas acceptées.

---

## 👤 Auteur

Développé par **[Fausatu](https://github.com/fausatu)**,étudiant qui a transformé une observation de couloir en application web.

---

##  Licence

**© 2026 LetShare — Tous droits réservés**

Ce code est partagé à des fins éducatives et de démonstration uniquement.  
Toute reproduction, modification ou utilisation commerciale sans autorisation écrite est interdite.

---

<div align="center">

*🎓 Fait avec 💚 pour les étudiants — Give, Swap, Grow 🌱*

</div>
