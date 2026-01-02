# Installation de la bibliothèque web-push-php

Pour que les notifications push fonctionnent correctement, vous devez installer la bibliothèque `minishlink/web-push` via Composer.

## Installation

1. **Ouvrez un terminal** dans le dossier racine de votre projet (`C:\wamp64\www\XHANGE_APP`)

2. **Installez Composer** (si ce n'est pas déjà fait) :
   - Téléchargez Composer depuis https://getcomposer.org/download/
   - Ou utilisez l'installeur Windows

3. **Installez la bibliothèque** :
   ```bash
   composer require minishlink/web-push
   ```

4. **Vérifiez l'installation** :
   - Un dossier `vendor/` devrait être créé
   - Le fichier `composer.json` devrait être mis à jour

## Pourquoi cette bibliothèque est nécessaire ?

Les notifications push nécessitent :
- **Encryption AES-128-GCM** du payload
- **Génération de token JWT VAPID** signé avec ES256
- **Gestion des clés cryptographiques** (p256dh, auth)

Le fallback cURL basique ne peut pas faire cela correctement, d'où l'erreur HTTP 401.

## Alternative

Si vous ne pouvez pas installer Composer, vous devrez implémenter manuellement :
- L'encryption AES-128-GCM
- La génération de token JWT avec signature ES256
- La gestion HKDF pour les clés

C'est beaucoup plus complexe que d'utiliser la bibliothèque existante.

