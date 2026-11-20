# CONTEXTE — LetShare

Fiche de reprise du projet : à lire au début de chaque session de travail, et à mettre à jour à la fin.

## 1. Le projet en bref
- **LetShare** : plateforme de don et d'échange d'objets entre étudiants vérifiés (email universitaire).
  En production sur https://letshare-app.fr (hébergement IONOS).
- Autrice : Ana (Fausat), en MBA Développeur Full Stack, en alternance. Le projet sert aussi à apprendre :
  chaque changement s'accompagne d'une explication simple du « pourquoi ».
- Stack : PHP 8.2 (PDO, **sans framework**), MySQL 8, HTML/CSS/JS vanilla, Composer (`vlucas/phpdotenv`,
  `minishlink/web-push`), Pusher (temps réel), Web Push, Google Translate, Brevo (emails).

## 2. ⚠️ Règle n°1 : `main` = production
Le workflow `.github/workflows/deploy-ionos.yml` **déploie automatiquement sur le serveur à chaque push sur `main`**
(SFTP, `lftp mirror --delete`).
- On ne pousse **jamais** directement sur `main`. Une branche par sujet, une Pull Request, on teste, puis on fusionne.
- `mirror --delete` **supprime sur le serveur tout ce qui n'est pas dans le dépôt**. Avant de stocker des fichiers
  envoyés par les utilisateurs sur le disque (ex. `uploads/`), il faut **exclure ce dossier** du mirror,
  sinon chaque déploiement les efface.
- Le dossier `database/` n'est pas déployé : les migrations SQL se lancent à la main (phpMyAdmin IONOS), **avant**
  de fusionner le code qui en a besoin.

## 3. Organisation du code
```
*.html            pages (index = fil, login, register, profile, settings, pages légales)
js/               un fichier par zone : api.js (appels HTTP), main.js (init), items.js (fil, publication),
                  messages.js + conversation-modal.js (messagerie), pusher-chat.js, presence.js,
                  profile-*.js, settings.js, translations.js (FR/EN), utils.js
css/              styles
api/              un fichier PHP par ressource, avec un grand switch ($_SERVER['REQUEST_METHOD'])
  config.php      .env, constantes, CORS, connexion PDO, sendResponse(), auth (session), CSRF, rate limit
  auth/           inscription, connexion, codes email, mot de passe
  push/           notifications Web Push
  items.php, conversations.php, messages.php, notifications.php, reviews.php, users.php…
database/         schema.sql (structure) + migration_*.sql (à appliquer à la main)
```
- Authentification : **session PHP** (cookie httpOnly) + jeton en session, vérifiés par `requireAuth()` /
  `getCurrentUser()` dans `config.php`. (Le README parle de JWT : ce n'est plus le cas, à corriger.)
- Réponses : toujours via `sendResponse($success, $message, $data, $status)` → `{success, message, data}`.
- Requêtes d'écriture : `requireAuth()` puis `requireCSRFToken()` (en-tête `X-CSRF-Token`, voir `api/csrf.php`).

## 4. Lancer et vérifier en local
1. `composer install`, copier `.env.example` en `.env` et le remplir (base locale, clés de test).
2. Base : importer `database/schema.sql` puis les migrations utiles (une base locale avec des **données de test**,
   jamais une copie de la production).
3. Serveur : WAMP/XAMPP (`http://localhost/letShare_APP`) ou `php -S localhost:8000` à la racine.
4. Avant chaque PR : `bash tools/check.sh` (syntaxe PHP de tous les fichiers + garde-fous : pas de `.env`,
   pas de dump SQL avec des données). La même vérification tourne sur chaque Pull Request (`.github/workflows/check.yml`).
5. Tester à la main le parcours touché (liste dans la PR).

## 5. Comment on travaille
- **Une branche par sujet** : `fix/…`, `perf/…`, `refactor/…`, `feat/…`, `docs/…`, `security/…`.
- **Petits commits** au format `type: description` (ex. `perf: paginer le fil d'annonces`).
- **Pull Request** avec le modèle `.github/PULL_REQUEST_TEMPLATE.md` : ce qui change, pourquoi, comment tester,
  migration SQL éventuelle.
- **Expliquer avant de changer** : pour chaque modification, Claude dit ce qu'il fait et pourquoi, en français simple,
  et fait le lien avec ce qu'Ana apprend (DTO, Repository, index SQL, `static`…). Ana peut demander à coder elle-même
  et faire relire.
- **Migrations** : nouveau fichier `database/migration_AAAAMMJJ_sujet.sql`, idempotent si possible
  (`IF NOT EXISTS`), et noté dans le journal ci-dessous.
- **Secrets** : uniquement dans `.env` (ignoré par Git) et dans les secrets GitHub. Jamais dans le code, une note,
  un commit ou une issue.
- **Fin de session** : mettre à jour la feuille de route et le journal de ce fichier.

## 6. Feuille de route (revue du 20/11/2026)
Cocher au fur et à mesure ; ajouter la branche/PR à côté.

**Étape 1 — Hygiène et sécurité du dépôt**
- [ ] Retirer du dépôt les fichiers de données réelles et les purger de l'historique Git (détails dans les
      instructions du projet Claude, pas ici : le dépôt est public)
- [ ] Mettre à jour le README (auth par session, installation avec `schema.sql` seulement)

**Étape 2 — Performance des images et du fil**
- [ ] Paginer `GET api/items.php` (`limit`/`offset`) + « charger plus » côté `items.js`
- [ ] Stocker les images en fichiers (URL en base) au lieu du base64 en `LONGTEXT` ; miniatures pour le fil ;
      script de migration des images existantes ; exclure le dossier d'upload du déploiement (voir §2)
- [ ] Même chose pour les images des messages (`messages.image`)

**Étape 3 — Corrections rapides**
- [ ] `getDBConnection()` : une seule connexion par requête (`static`)
- [ ] Une seule fonction pour les en-têtes CORS (aujourd'hui copiés 3 fois dans `config.php` + 4 fichiers)
- [ ] Un seul `getTimeAgo()` (copié dans `items.php`, `interested.php`, `reviews.php`)
- [ ] Fusionner `auth/send_email_code.php` et `auth/send_email_code_v2.php`
- [ ] Supprimer les blocs vides (`if (…) { }`, `catch` muets) ; journaliser avec `errorLog()`
- [ ] `items.php` : une seule fonction pour les filtres (écrits deux fois)

**Étape 4 — Base de données**
- [ ] Index composés : `items(status, university_id, created_at)`, `messages(conversation_id, created_at)`,
      `messages(to_user_id, read_status)`
- [ ] Paramètres nommés dans la requête des conversations (`messages.php`, `$userId` passé 9 fois)
- [ ] Plus tard : recherche `FULLTEXT` sur `items(title, description)`

**Étape 5 — Temps réel**
- [ ] Nouveaux messages / notifications poussés par Pusher ; les 5 `setInterval` deviennent un secours lent

**Étape 6 — Organisation (au fil de l'eau)**
- [ ] Découper `items.php` puis `conversations.php` : validation (DTO), SQL (Repository), mise en forme de la réponse

## 7. Journal
Une ligne par session : date, ce qui a été fait, décisions, ce qui reste en suspens.

- **20/11/2026** — Revue complète du code, mise en place de ce fichier, de `CLAUDE.md`, de `tools/check.sh`
  et de la vérification automatique des PR. Rien de corrigé dans le code pour l'instant.
