---
name: testing-strategy
description: Choisit et écrit les bons tests (unitaires Vitest, émulateurs Firebase, E2E Playwright, chaîne d'artefacts de TP) et les exécute localement. À utiliser pour ajouter des tests, corriger un défaut ou préparer une PR.
paths: tests/**, vitest.config.ts, playwright.config.ts
---

# Stratégie de test

| Changement                 | Test attendu         | Commande                                                  |
| -------------------------- | -------------------- | --------------------------------------------------------- |
| Domaine, script, politique | `tests/unit/**`      | `npm test`                                                |
| Route API, service, règles | `tests/emulators/**` | `npm run test:emulators:run`                              |
| Parcours UI, en-têtes      | `tests/e2e/**`       | `npm run build && npm run test:e2e` (émulateurs démarrés) |
| TP réel                    | chaîne d'artefacts   | `npm run labs:check`                                      |
| Contenu                    | rapport de contenu   | `npm run content:check`                                   |

## Prérequis locaux

- Java 21 pour les émulateurs (`JAVA_HOME`, voir `docs/runbooks/local-dev.md`).
- Navigateurs Playwright : `npx playwright install chromium`.

## Règles

- Un correctif ajoute un test qui échouait avant.
- Couvrir les refus (401, 403, 409, 429) et l'absence de fuite.
- Données de test synthétiques ; projet `demo-tuto-databricks` uniquement.
- Ne jamais désactiver un test pour faire passer la CI.
