## Objet

<!-- Ce que change la PR et pourquoi. -->

## Statut atteint (docs/status.md)

- [ ] Implémenté
- [ ] Testé localement (commandes et résultats ci-dessous)
- [ ] Testé en staging

## Vérifications

- [ ] `npm run check`
- [ ] `npm run build && npm run security:bundle`
- [ ] `npm run test:emulators:run` (si API, règles ou services modifiés)
- [ ] `npm run test:e2e` (si interface modifiée)
- [ ] `docs/status.md` et `docs/roadmap.md` mis à jour

## Garde-fous

- [ ] Aucun identifiant réel ni secret
- [ ] Aucun TP passé en `validated` sans preuve d'exécution réelle dans `labs/<id>/validation/`
- [ ] Résultats déclarés (`self-reported`) jamais présentés comme vérifiés
- [ ] Aucune automatisation de traitements sur Databricks Free Edition
- [ ] Revue de sécurité (`/review-security`) si auth, API, règles ou dépendances modifiées
