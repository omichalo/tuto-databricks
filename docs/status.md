# État du projet

Dernière mise à jour : 2026-10-17 — branche `feat/phase-0-1`. Nom provisoire : **Orion Data Lab** (`src/config/product.ts`).

Statuts de livraison : `Non commencé` → `Implémenté` → `Testé localement` → `Testé en staging` → `Validé pour la production`. Rien n'est encore déployé : **aucun composant n'a dépassé « Testé localement »**.

## Reprendre le travail

1. `docs/runbooks/local-dev.md` (Java 21 et navigateur Playwright dans `.tools/`).
2. `npm ci && cp .env.example .env.local && npm run check`.
3. Prochaines tâches : `docs/roadmap.md`, section « Maintenant ».

## Composants

| Composant                                                                 | Statut               | Preuve (2026-10-17)                                                                                                                                       |
| ------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Socle Next.js 15.5.28, TypeScript strict, ESLint, Prettier                | Testé localement     | `npm run check` vert ; `next build` : 23 pages SSG (seuils locaux), 9 routes API                                                                          |
| Base de sécurité (versions, avis, en-têtes, interdits)                    | Testé localement     | `security:baseline`, `security:advisories` (72 avis `vercel/next.js` examinés, aucun non corrigé pour 15.5.28), `security:bundle` (89 fichiers, 4 motifs) |
| Pipeline de contenu (MDX, Zod, statuts, repli EN → FR, rapport)           | Testé localement     | `content:check` : 4 leçons `in-technical-review`, 10/10 objectifs couverts ; empreintes d'exercices recalculées                                           |
| Visibilité par statut (production : `published` / `validated`)            | Testé localement     | build aux seuils de production : 11 pages génériques, aucune leçon ni TP (`visibility:check`)                                                             |
| Design system et mise en page (FR/EN, mode sombre, accessibilité de base) | Implémenté           | vérification visuelle dans Chromium ; pas d'audit d'accessibilité outillé                                                                                 |
| Auth anonyme + session `__session`                                        | Testé localement     | `tests/emulators/api-flow.test.ts`, E2E (session anonyme créée automatiquement)                                                                           |
| Liaison anonyme → Google (sans fusion implicite)                          | Implémenté           | code et refus `account-exists` ; **non testé** (popup Google non automatisée sur l'émulateur)                                                             |
| Chaîne `route()` (origine, App Check, session, Zod strict, quotas)        | Testé localement     | 28 tests d'émulateurs : 401, 403, 400, cookie forgé, 429, corps > 16 Ko (déclaré ou en flux), quota de sessions, révocation anonyme                       |
| Règles Firestore et Storage                                               | Testé localement     | `tests/emulators/firestore-rules.test.ts`                                                                                                                 |
| Progression des leçons (vue, terminée, synthèse du parcours)              | Testé localement     | émulateurs (idempotence) + E2E                                                                                                                            |
| Quiz corrigé côté serveur                                                 | Testé localement     | émulateurs + navigateur (score, explications, liens « Relire la section »)                                                                                |
| Exercice DuckDB-Wasm `revenus-par-pays`                                   | Testé localement     | E2E : exécution, solution équivalente acceptée, accès externe refusé                                                                                      |
| Moteur de TP (manifeste, fournisseurs, chaîne d'artefacts)                | Testé localement     | `labs:check` (6 contrôles) + tests unitaires des règles de chaque contrôle                                                                                |
| Déclaration de TP (`self-reported`), avis Free Edition versionné          | Testé localement     | émulateurs (403 sans avis, 409 version périmée) + E2E                                                                                                     |
| Tableau de bord « Vérifié par la plateforme » / « Déclaré par vous »      | Testé localement     | E2E                                                                                                                                                       |
| Configuration Cursor (rules, skills, subagents, hooks, Bugbot)            | Testé localement     | hooks testés en conditions réelles (lecture `.env` bloquée, faux positif corrigé) et 46 tests unitaires de politique                                      |
| CI GitHub Actions                                                         | Implémenté           | `actionlint` vert ; **jamais exécutée** (pas de dépôt GitHub)                                                                                             |
| Déploiement staging (App Hosting, règles)                                 | Implémenté (préparé) | `apphosting.staging.yaml`, `deploy-staging.yml` inactif, runbook ; bloqué par les identifiants                                                            |

Tests au 2026-10-17 (après corrections des revues) : **115 unitaires**, **28 émulateurs**, **7 E2E** Playwright, tous verts ; `actionlint` et `security:advisories` verts.

## TP réels

| TP                  | Version | Navigateur                   | Free Edition     | Workspace professionnel | Validation réelle                                       |
| ------------------- | ------- | ---------------------------- | ---------------- | ----------------------- | ------------------------------------------------------- |
| `delta-first-table` | 1.0.0   | partiel (`revenus-par-pays`) | **experimental** | **experimental**        | `not-run` : aucune exécution réelle, `validation/` vide |

Aucun TP n'est `validated`. En production (`LAB_MIN_STATUS=validated`), aucun environnement réel n'est proposé.

## Contenus

| Leçon                    | Statut              | Relecture technique humaine | Relecture pédagogique humaine |
| ------------------------ | ------------------- | --------------------------- | ----------------------------- |
| `lakehouse-et-delta`     | in-technical-review | à faire                     | à faire                       |
| `ecrire-dans-delta`      | in-technical-review | à faire                     | à faire                       |
| `requetes-agregations`   | in-technical-review | à faire                     | à faire                       |
| `historique-time-travel` | in-technical-review | à faire                     | à faire                       |

## Défauts connus

1. CSP avec `'unsafe-inline'` pour les scripts (scripts d'hydratation Next.js) : à remplacer par des nonces ou des empreintes (phase 8).
2. Alertes de dépendances de **développement** uniquement (braces, micromatch, fast-glob via `eslint-config-next`) : acceptées dans `config/security-baseline.json` jusqu'au 2026-11-17 ; `npm audit --omit=dev` = 0.
3. Les avis du dépôt `vercel/next.js` peuvent précéder `npm audit` : `security:advisories` les contrôle (plages parfois mal formées, décision par `patched_versions`).
4. Liaison anonyme → Google : peut demander deux fenêtres (liaison puis réauthentification récente) ; non testée automatiquement.
5. DuckDB-Wasm : ~34 Mo non compressés téléchargés au premier exercice (bundle `eh`), désormais en cache `immutable`. Le plafond de 10 000 lignes est contrôlé après transfert du résultat Arrow : il protège le rendu, pas la mémoire du worker (bornée par `memory_limit = 256MB`).
6. Plusieurs identifiants d'avis cités dans le plan initial n'ont pas été retrouvés ; l'ADR 0001 ne cite que des avis vérifiés.
7. Comptes anonymes multiples (Sybil) : les quotas par `uid` se contournent en recréant des comptes. Atténuation actuelle : quota de création de session par client réseau (20 / 10 min, empreinte SHA-256 de l'IP). À compléter en staging : App Check appliqué, alertes de budget, quota global éventuel.
8. Quotas Firestore : une transaction par requête limitée (coût et contention par document) ; acceptable au lancement, à revoir à la charge (phase 8).
9. `readTrackProgress` lit tous les `exerciseResults` et `labProgress` de l'utilisateur : borné par la taille du catalogue, à paginer ou synthétiser en phase 2.
10. `attempts` d'un exercice compte aussi les nouvelles soumissions après réussite (sémantique « nombre de soumissions »).
11. Par conception : `expectedResults` du TP et la formule du code de contrôle sont publics ; le code est un indice de cohérence, jamais une preuve (résultat `self-reported`).
12. Hooks Cursor : garde-fous d'assistance, non une frontière de sécurité (contournables par un shell arbitraire) ; durcis pour toute mention de `.env*` et `firebase … deploy` quel que soit l'ordre des arguments.

## Blocages externes

| Blocage                                                                | Bloque                                 | Information à fournir                                                      |
| ---------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Projets Firebase staging et production (Blaze), région                 | staging, preuve App Hosting de 15.5.28 | ID de projet, accord de dépense, `europe-west4` / `eur3`                   |
| Dépôt GitHub                                                           | CI réelle, CODEOWNERS, App Hosting     | propriétaire et nom                                                        |
| Clés reCAPTCHA Enterprise                                              | App Check                              | une clé par environnement                                                  |
| Conditions d'usage Free Edition pour la validation par les mainteneurs | validation réelle des TP               | décision écrite (usage personnel non commercial de la personne qui valide) |
| Workspace Free Edition de test                                         | `phase1-free-edition-validation`       | personne physique, compte personnel                                        |
| Nom définitif du produit                                               | mise en ligne publique                 | nom vérifié (marque)                                                       |
| Double relecture humaine des leçons                                    | passage en `published`                 | relecteurs technique et pédagogique                                        |

## Revues indépendantes

Voir la section du même nom dans `docs/roadmap.md` (constats et suites données).
