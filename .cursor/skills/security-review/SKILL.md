---
name: security-review
description: Liste de contrôle de sécurité propre au projet (auth et sessions, Route Handlers, règles Firestore, fuites de corrigés, dépendances, CSP, secrets). À utiliser avant une PR touchant l'auth, l'API, les règles, la configuration ou les dépendances.
---

# Revue de sécurité

## Contrôles automatiques

```bash
npm run security:baseline   # versions, avis, configuration Next.js
npm run build && npm run security:bundle   # pas de corrigé dans le bundle client
npm run guards              # TP validés avec preuve, correcteur désactivé, pas d'automatisation Databricks
npm run test:emulators:run  # refus d'origine, sessions forgées, quotas, règles
```

## Liste manuelle

```
- [ ] Toute mutation passe par route() : origine, session, Zod strict, quota
- [ ] Aucune réponse ou journal ne contient de clé, empreinte attendue ou code attendu
- [ ] Le client n'importe ni firebase/firestore ni src/server
- [ ] Les nouveaux champs Firestore sont en lecture propriétaire seule (ou non lisibles)
- [ ] Pas de fusion implicite de comptes ; reauthentification exigée pour les comptes permanents
- [ ] Nouvelle dépendance : version exacte, avis vérifiés, audit prod = 0
- [ ] CSP inchangée ou durcie ; hôtes d'émulateurs absents hors local
- [ ] Aucun secret ni identifiant réel ajouté
```

Ensuite : `/review-security` (subagent dédié) et, pour les règles, `firebase-security-rules-auditor`.
