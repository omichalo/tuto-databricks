# 0003. Le navigateur n'accède jamais à Firestore

- Statut : accepté
- Date : 2026-10-17

## Contexte

Les clés de quiz, les empreintes d'exercices et les codes de contrôle de TP doivent rester côté serveur. Les règles Firestore seules ne permettent pas d'exprimer la logique de correction ni les quotas.

## Décision

- Le client n'utilise que Firebase Auth. Toutes les lectures et écritures passent par des Route Handlers (`route()`), avec l'Admin SDK.
- `firestore.rules` : lecture propriétaire seule sur une liste fermée de sous-collections, aucune écriture client, refus par défaut. `storage.rules` : refus total.
- ESLint interdit `firebase/firestore` dans `src/` ; `npm run security:bundle` vérifie qu'aucun corrigé n'apparaît dans les fichiers servis.

## Options écartées

- SDK Firestore client avec règles riches : impossible de cacher les corrigés, `get()` coûteux dans les règles.
- Server Actions : interdites par la base de sécurité (GHSA-p3m5-59mp-jv5r et surface CSRF).

## Conséquences

- Chaque fonctionnalité de progression demande une route et un service ; pas de temps réel (acceptable).
- Coût : une requête HTTP par action, quotas en transaction Firestore (à surveiller en phase 8).
