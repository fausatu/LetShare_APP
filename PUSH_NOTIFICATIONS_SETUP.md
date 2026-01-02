# Configuration des Notifications Push

## Étapes pour activer les notifications push du navigateur

### 1. Générer les clés VAPID

Les clés VAPID (Voluntary Application Server Identification) sont nécessaires pour envoyer des notifications push.

**Option 1 : Utiliser un générateur en ligne**
- Allez sur https://web-push-codelab.glitch.me/
- Cliquez sur "Generate VAPID Keys"
- Copiez les clés générées

**Option 2 : Utiliser Node.js**
```bash
npm install -g web-push
web-push generate-vapid-keys
```

### 2. Mettre à jour les clés VAPID

Éditez `api/push/vapid-key.php` et remplacez `VAPID_PUBLIC_KEY` par votre clé publique.

Créez aussi `api/push/send.php` avec votre clé privée (ne jamais exposer la clé privée au client).

### 3. Installer les dépendances PHP (optionnel)

Pour envoyer les notifications push depuis PHP, vous pouvez utiliser la bibliothèque `web-push-php` :

```bash
composer require minishlink/web-push
```

### 4. Activer les notifications

1. Ouvrez les paramètres de l'application
2. Activez le toggle "Browser Push Notifications"
3. Autorisez les notifications dans la popup du navigateur

### 5. Tester

Les notifications push fonctionneront même quand le site est fermé, tant que le navigateur est ouvert.

## Notes importantes

- Les notifications push nécessitent HTTPS (sauf en localhost)
- Chaque navigateur a ses propres limitations
- Les utilisateurs doivent autoriser les notifications manuellement
- Le Service Worker doit être accessible depuis la racine du site

