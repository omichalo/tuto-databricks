---
name: firebase-security-rules
description: Modifie et teste firestore.rules et storage.rules selon le modèle du projet (lecture propriétaire, aucune écriture client, Storage fermé). À utiliser pour toute modification de règles ou d'index Firestore.
paths: firestore.rules, storage.rules, firestore.indexes.json, tests/emulators/firestore-rules.test.ts
---

# Règles de sécurité

## Modèle

Liste fermée de sous-collections, lecture propriétaire, refus par défaut :

```
match /users/{uid} {
  allow get: if isOwner(uid);
  allow list, create, update, delete: if false;
  match /labProgress/{labId} {
    allow get, list: if isOwner(uid);
    allow write: if false;
  }
}
match /{document=**} { allow read, write: if false; }
```

Pas de joker `{document=**}` sous `users/{uid}` : une nouvelle sous-collection doit être ajoutée explicitement.

## Déroulé

1. Écrire d'abord le test qui échoue dans `tests/emulators/firestore-rules.test.ts` (`assertFails` / `assertSucceeds`).
2. Modifier la règle au plus juste ; aucun `get()`/`exists()`.
3. `npm run test:emulators:run`.
4. Audit : subagent `security-auditor` ou skill `firebase-security-rules-auditor`.

Le déploiement des règles passe par la CI (workflow staging, désactivé tant que les identifiants ne sont pas fournis), jamais depuis un poste vers la production.
