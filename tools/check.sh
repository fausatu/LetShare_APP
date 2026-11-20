#!/usr/bin/env bash
# Vérifications avant une Pull Request : syntaxe PHP + garde-fous de sécurité du dépôt.
# Usage : bash tools/check.sh
set -u
cd "$(dirname "$0")/.."
erreurs=0

echo "1/3 Syntaxe PHP"
while IFS= read -r f; do
  if ! sortie=$(php -l "$f" 2>&1); then
    echo "  ✗ $sortie"
    erreurs=$((erreurs + 1))
  fi
done < <(git ls-files '*.php')
[ "$erreurs" -eq 0 ] && echo "  ✓ tous les fichiers PHP sont valides"

echo "2/3 Pas de fichier .env suivi par Git"
if git ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'; then
  echo "  ✗ un fichier .env est suivi par Git (il contient des secrets)"
  erreurs=$((erreurs + 1))
else
  echo "  ✓ ok"
fi

echo "3/3 Pas de données réelles d'utilisateurs dans les fichiers SQL"
# Les données de test doivent utiliser des adresses @example.com / @example.org / @test.local
reels=""
for f in $(git ls-files '*.sql'); do
  if grep -q -i -E 'INSERT INTO `?users`?' "$f" && \
     grep -o -E "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}" "$f" | grep -v -i -E '@(example\.(com|org|net)|test\.local)$' | grep -q .; then
    reels="$reels $f"
  fi
done
if [ -n "$reels" ]; then
  # sur GitHub (logs publics) on ne nomme pas les fichiers
  if [ -n "${CI:-}" ]; then echo "  ✗ un fichier SQL contient des données d'utilisateurs réels (lance tools/check.sh en local pour le voir)"
  else echo "  ✗ données d'utilisateurs réels dans :$reels (ne versionner que la structure et des données de test @example.com)"; fi
  erreurs=$((erreurs + 1))
else
  echo "  ✓ ok"
fi

if [ "$erreurs" -gt 0 ]; then
  echo "→ $erreurs problème(s) à corriger."
  exit 1
fi
echo "→ Tout est bon."
