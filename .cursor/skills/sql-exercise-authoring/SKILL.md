---
name: sql-exercise-authoring
description: Crée un exercice SQL exécuté dans le navigateur avec DuckDB-Wasm (jeu de données, énoncé, solution, empreinte vérifiée côté serveur, différences de dialecte avec Databricks SQL). À utiliser pour ajouter ou modifier un exercice dans content/exercises/.
paths: content/exercises/**, src/lib/client/duckdb-runner.ts, src/domain/sql/**
---

# Exercice SQL navigateur

Référence : `content/exercises/revenus-par-pays/exercise.yaml`.

## Champs

- `id`, `title`, `objectiveIds`, `statement` (colonnes attendues dans l'ordre), `hints`.
- `dataset` : générateur partagé avec le TP (`labs/<id>/data/generator.sql`), `rows` (petit volume), `table`.
- `starterSql` : point de départ exécutable.
- `ordered` : l'ordre des lignes compte-t-il ?
- `expectedShape` : colonnes et nombre de lignes.
- `solutionSql` et `expectedHash` : séparés côté serveur par `scripts/build-content.ts`, jamais envoyés au navigateur. Le build vérifie que l'empreinte de la solution correspond.

## Règles

- Le moteur est formatif : résultat `automatic-formative`, jamais présenté comme une certification.
- L'empreinte porte sur le résultat canonique (`src/domain/sql/result-fingerprint.ts`) : colonnes renommées acceptées, valeurs et ordre (si `ordered`) comparés.
- Arrondir explicitement les décimales (`round(x, 2)`) pour éviter les écarts flottants.
- Accès externe désactivé dans DuckDB : pas de `read_csv('https://…')`.
- Toute construction propre à Databricks (Delta, `DESCRIBE HISTORY`, `VERSION AS OF`) relève d'un TP réel, pas d'un exercice navigateur.

## Vérifier

```bash
npm run content:build && npm test && npm run build && npm run security:bundle
```

Puis test E2E : `tests/e2e/smoke.spec.ts` (solution équivalente acceptée).
