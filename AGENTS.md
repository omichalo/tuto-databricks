# Consignes pour les agents

Plateforme de formation interactive à Databricks (nom provisoire : `src/config/product.ts`). Next.js 15.5.28, TypeScript strict, Firebase.

## Commencer une session

1. Lire `docs/status.md` (état réel, défauts, blocages) et `docs/roadmap.md` (prochaines tâches).
2. Les règles du dépôt sont dans `.cursor/rules/` (`00-core.mdc` s'applique toujours).
3. Démarrage local : `docs/runbooks/local-dev.md`.

## Ressources

- Skills projet : `.cursor/skills/` (dont `databricks-lab-authoring`, `sql-exercise-authoring`, `firebase-architecture`, `security-review`).
- Subagents : `.cursor/agents/` ; les relecteurs (`security-auditor`, `architecture-reviewer`, `pedagogy-reviewer`, `databricks-fact-checker`, `free-edition-compat-checker`, `verifier`) sont en lecture seule.
- Hooks : `.cursor/hooks.json` (production, dépenses cloud, Databricks, `.env`, invariants avant commit, Prettier).
- Architecture : `docs/architecture.md` ; décisions : `docs/adr/` ; procédures : `docs/runbooks/`.

## Non négociable

- Aucun identifiant réel ni secret ; aucun déploiement ni dépense sans accord explicite de l'utilisateur.
- Un TP n'est `validated` qu'après exécution réelle et preuve documentée.
- Les résultats déclarés par les apprenants (`self-reported`) ne sont jamais présentés comme vérifiés.
- Aucune automatisation de traitements sur Databricks Free Edition.
- `npm run check` vert avant tout commit ; mettre à jour `docs/status.md` à chaque incrément.
