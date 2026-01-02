# Checklist de mise en production - LetShare

## 🔴 CRITIQUE - À corriger absolument avant la mise en production

### 1. Sécurité des secrets (URGENT)
**Problème**: Tous les secrets sont hardcodés dans `api/config.php`
- Google OAuth Client Secret exposé
- Mot de passe SMTP exposé
- VAPID keys exposées
- JWT Secret par défaut

**Solution**: 
- Créer un fichier `.env` (ou utiliser les variables d'environnement du serveur)
- Utiliser une bibliothèque comme `vlucas/phpdotenv`
- Ajouter `config.php` et `.env` au `.gitignore`
- Générer un nouveau JWT_SECRET fort et unique

### 2. Configuration CORS
**Problème**: CORS accepte toutes les origines (`*`) en mode développement
- `$isDevelopment = true` toujours actif
- CORS trop permissif même en production

**Solution**:
- Définir `$isDevelopment = false` en production
- Restreindre les origines autorisées à votre domaine uniquement
- Retirer les headers `ngrok-skip-browser-warning` en production

### 3. Mode Debug activé
**Problème**: `DEBUG_MODE = true` dans `config.php`
- Les tokens de vérification sont loggés au lieu d'être envoyés par email
- Risque d'exposition d'informations sensibles

**Solution**: 
- Définir `DEBUG_MODE = false` en production
- Ne jamais activer en production

### 4. Gestion des erreurs
**Problème**: Messages d'erreur détaillés exposés
- `'Database error: ' . $e->getMessage()` expose la structure de la DB
- Logs d'erreur dans le code (`error_log()` partout)
- Stack traces potentiellement exposées

**Solution**:
- Masquer les détails d'erreur en production
- Logger les erreurs dans un fichier séparé (pas accessible publiquement)
- Retourner des messages génériques aux utilisateurs

### 5. HTTPS obligatoire
**Problème**: Service Workers et Push Notifications nécessitent HTTPS
- Actuellement configuré pour HTTP/localhost

**Solution**:
- Configurer SSL/HTTPS sur le serveur de production
- Rediriger HTTP vers HTTPS
- Mettre à jour toutes les URLs hardcodées

---

## 🟡 IMPORTANT - À corriger pour une production robuste

### 6. Variables d'environnement
**Action**: Créer un système de configuration par environnement
- Séparer config développement/production
- Utiliser des variables d'environnement
- Créer un `.env.example` pour la documentation

### 7. Validation et sanitisation
**À vérifier**:
- Toutes les entrées utilisateur sont-elles validées ?
- Protection XSS (échappement des sorties)
- Vérification des types de fichiers uploadés
- Limites de taille pour les uploads

### 8. Gestion de la base de données
**À faire**:
- Sauvegardes automatiques configurées
- Credentials de DB différents pour dev/prod
- Mot de passe DB fort en production
- Vérifier les index SQL pour les performances

### 9. URLs hardcodées
**Problème**: URLs ngrok dans le code
- `APP_BASE_URL` avec ngrok URL
- `GOOGLE_REDIRECT_URI` avec ngrok URL

**Solution**: 
- Utiliser des variables d'environnement
- Détecter automatiquement l'URL de base

### 10. Performance
**À vérifier**:
- Mise en cache côté serveur
- Optimisation des requêtes SQL (éviter N+1 queries)
- Compression des assets (CSS/JS/images)
- Minification des fichiers JS/CSS en production

### 11. Tests
**Recommandé**:
- Tests de bout en bout sur les fonctionnalités critiques
- Test de charge (nombre d'utilisateurs simultanés)
- Tests de sécurité (OWASP Top 10)

---

## 🟢 BONNES PRATIQUES - Améliorations suggérées

### 12. Monitoring et logs
- Système de logs centralisé
- Monitoring des erreurs (Sentry, Rollbar, etc.)
- Analytics d'utilisation

### 13. Documentation
- README avec instructions de déploiement
- Documentation API complète
- Guide de configuration

### 14. Sécurité supplémentaire
- Rate limiting sur les endpoints sensibles
- Protection CSRF (si applicable)
- Validation de taille des requêtes
- Timeout des sessions configuré

### 15. Code quality
- Retirer les `console.log()` de production
- Nettoyer le code commenté
- Uniformiser le style de code

---

## ✅ Points positifs déjà en place

- ✅ Utilisation de PDO avec prepared statements (protection SQL injection)
- ✅ Validation des données d'entrée
- ✅ Authentification par session
- ✅ Service Worker configuré
- ✅ Structure d'API bien organisée
- ✅ Hashage des mots de passe avec `password_hash()`

---

## Plan d'action recommandé

### Phase 1 - Sécurité critique (À faire EN PRIORITÉ)
1. Mettre les secrets dans des variables d'environnement
2. Désactiver DEBUG_MODE
3. Corriger la configuration CORS
4. Masquer les erreurs détaillées

### Phase 2 - Configuration production
5. Configurer HTTPS
6. Mettre à jour les URLs
7. Configurer les backups DB

### Phase 3 - Tests et optimisation
8. Tests fonctionnels complets
9. Optimisation performance
10. Monitoring en place

---

**Note**: Ne jamais mettre en production avec des secrets exposés ou DEBUG_MODE activé.

