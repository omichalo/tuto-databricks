# Feuille de route

Référence : plan d'architecture révision 3 (validé). État détaillé : `docs/status.md`.

## Fait (phases 0 et 1, local)

- Socle Next.js 15.5.28 / TypeScript strict / Firebase avec Emulator Suite, base de sécurité vérifiée.
- Configuration Cursor : 10 rules, 12 skills, 8 subagents, hooks, Bugbot, `AGENTS.md`.
- CI (qualité, secrets, émulateurs, E2E, build aux seuils de production, avis Next.js), veille hebdomadaire, staging préparé et inactif.
- Parcours pilote « Databricks SQL et Delta : premiers pas » : 4 leçons (`in-technical-review`), quiz corrigés côté serveur, exercice DuckDB-Wasm.
- Moteur de TP et TP `delta-first-table` (expérimental) avec procédure complète, chaîne d'artefacts.
- Auth anonyme, session, progression, séparation « vérifié » / « déclaré ».

## Maintenant (prochaine session)

1. Traiter les constats des revues indépendantes encore ouverts (section ci-dessous).
2. Créer le dépôt GitHub (avec accord), pousser `feat/phase-0-1`, obtenir une CI réelle verte, ouvrir la PR vers `main`.
3. Relectures humaines technique et pédagogique des 4 leçons ; passage en `published` seulement ensuite.
4. Test manuel de la liaison anonyme → Google sur l'émulateur Auth (popup), puis test automatisé si possible.
5. Staging dès réception des identifiants (`docs/runbooks/staging-deploy.md`) : rollout 15.5.28, tests de fumée, statut « Testé en staging ».
6. Validation réelle de `delta-first-table` sur Free Edition après décision sur les conditions d'usage (`docs/runbooks/lab-manual-validation.md`).

## Ensuite

- **Phase 2** : GitHub et lien magique, transitions sans fusion implicite, module d'onboarding Free Edition.
- **Phase 3** : évaluations notées côté serveur, tentatives, App Check appliqué (`APP_CHECK_ENFORCED=true`).
- **Phase 4** : généralisation DuckDB-Wasm (couche de dialecte, plusieurs exercices par leçon) ; chargement différé et compressé du moteur.
- **Phase 4b** (optionnelle, flag OFF) : correcteur isolé, skill `sql-grader-isolation`.
- **Phases 5 et 6** : simulateurs Delta, Spark, Unity Catalog et médaillon.
- **Phase 7** : catalogue FR, un TP Free Edition par objectif compatible, certificats.
- **Phase 8** : CSP par nonces, observabilité, budgets, sauvegardes, accessibilité outillée, charge.
- **Phase 9** : mise en production.

## Revues indépendantes (2026-10-17)

_Section complétée à la fin de la session avec les constats et leur traitement._
