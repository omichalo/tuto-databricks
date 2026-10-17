---
name: firebase-architecture
description: Architecture Firebase du projet (Admin SDK derrière des Route Handlers, modèle Firestore, sessions, App Check, émulateurs). À utiliser pour ajouter une collection, un service serveur ou une route API, ou pour raisonner sur le flux de données.
paths: src/server/**, src/app/api/**, firestore.rules, firebase.json
---

# Architecture Firebase

## Flux

Navigateur → `fetch` (`src/lib/client/api.ts`, en-tête App Check) → Route Handler (`route()`) → service (`src/server/services`) → Admin SDK → Firestore.
Le client n'utilise que Firebase Auth (connexion) ; il n'accède jamais à Firestore.

## Modèle (`src/server/repositories/paths.ts`)

| Chemin                                           | Contenu                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `users/{uid}`                                    | profil minimal, acquittements (`acknowledgements.freeEditionTerms`) |
| `users/{uid}/lessonProgress/{trackId__lessonId}` | vue, complétion, meilleur score de quiz                             |
| `users/{uid}/trackProgress/{trackId}`            | synthèse (mise à jour dans la même transaction)                     |
| `users/{uid}/exerciseResults/{exerciseId}`       | `automatic-formative`, tentatives                                   |
| `users/{uid}/labProgress/{labId}`                | `self-reported` par environnement                                   |
| `rateLimits/{key}`                               | compteur avec TTL `expireAt`                                        |

## Ajouter une fonctionnalité

1. Type du domaine (`src/domain/...`) + schéma Zod du corps de requête.
2. Chemin dans `paths.ts`, service transactionnel et idempotent.
3. Route avec `route({ name, auth, body, rateLimit })`.
4. Règle Firestore en lecture propriétaire seule si le client doit lire (sinon rien).
5. Tests : `tests/emulators/api-flow.test.ts` (succès, refus, idempotence, absence de fuite).

Skills génériques utiles : `firebase-auth-basics`, `firebase-firestore`.
