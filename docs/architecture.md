# Architecture

État au 2026-10-17 (phases 0 et 1). Décisions : `docs/adr/`.

## Vue d'ensemble

```mermaid
flowchart LR
  subgraph Navigateur
    UI[Pages SSG + composants client]
    Duck[DuckDB-Wasm<br/>Web Worker]
    FA[Firebase Auth SDK]
  end
  subgraph AppHosting[Firebase App Hosting - Next.js 15.5.28]
    Pages[Pages pré-rendues<br/>contenu filtré par statut]
    API[Route Handlers /api/*<br/>route()]
    Svc[Services serveur]
  end
  FS[(Firestore)]
  Auth[(Firebase Auth)]
  UI -- fetch + cookie __session + App Check --> API
  UI --> Duck
  FA --> Auth
  API --> Svc -- Admin SDK --> FS
  API -- vérification session --> Auth
```

## Couches

| Couche         | Dossier                                             | Règle                                                                         |
| -------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| Domaine pur    | `src/domain/**`                                     | sans Next, React, Firebase ; testé par Vitest                                 |
| Contenu généré | `src/generated/**` (par `scripts/build-content.ts`) | public (`content.ts`) et serveur (`server/keys.ts` : clés, empreintes, codes) |
| Serveur        | `src/server/**`                                     | `server-only`, configuration par `serverEnv()`, Admin SDK                     |
| API            | `src/app/api/**/route.ts`                           | uniquement via `route()`                                                      |
| Client         | `src/lib/client/**`, `src/components/**`            | Firebase Auth seul ; appels `apiJson` ; aucun Firestore                       |
| Pages          | `src/app/[locale]/**`                               | SSG, `dynamicParams = false`, FR obligatoire, EN avec repli                   |

## Chaîne d'une requête API (`src/server/route.ts`)

1. Identifiant de requête et journal JSON.
2. Méthodes mutantes : en-tête `Origin` égal à `APP_ORIGIN` (plus `localhost` en local et test).
3. App Check si `APP_CHECK_ENFORCED=true`.
4. Session : cookie `__session` (HttpOnly, SameSite=Lax, Secure hors local), vérification avec révocation.
5. Corps : Zod `.strict()`, 16 Ko maximum.
6. Quota par utilisateur et par route (document Firestore à fenêtre fixe, TTL `expireAt`).
7. Service métier, réponse `cache-control: private, no-store`.

## Données (Firestore)

| Document                                     | Écrit par                                          | Lisible par le client |
| -------------------------------------------- | -------------------------------------------------- | --------------------- |
| `users/{uid}`                                | `user-service` (profil, acquittement Free Edition) | propriétaire (`get`)  |
| `users/{uid}/lessonProgress/{track__lesson}` | `progress-service`                                 | propriétaire          |
| `users/{uid}/trackProgress/{trackId}`        | `progress-service` (même transaction)              | propriétaire          |
| `users/{uid}/exerciseResults/{exerciseId}`   | `learning-service` (`automatic-formative`)         | propriétaire          |
| `users/{uid}/labProgress/{labId}`            | `lab-service` (`self-reported`)                    | propriétaire          |
| `rateLimits/{key}`                           | `rate-limit`                                       | non                   |

Aucune écriture client (`firestore.rules`). Storage fermé.

## Vérifié ou déclaré

| Source                  | Mécanisme                                                                         | Étiquette affichée                   |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| Quiz                    | réponses corrigées côté serveur (`QUIZ_KEYS`)                                     | Vérifié par la plateforme            |
| Exercice SQL navigateur | empreinte SHA-256 du résultat canonique comparée côté serveur (`timingSafeEqual`) | Vérifié par la plateforme (formatif) |
| TP réel                 | déclaration de l'apprenant ; code de contrôle = indice de cohérence               | Déclaré par vous                     |

## Moteur de TP

- Manifeste `labs/<id>/lab.yaml` (Zod `labManifestSchema`), fournisseurs `browser`, `databricks-free-manual`, `professional-workspace`, `databricks-connected` (interface seule, toujours indisponible).
- Notebooks générés depuis `notebooks/source.py` ; code de contrôle et statistiques attendues calculés par la CI (DuckDB Node) à partir du générateur déterministe.
- Chaîne `npm run labs:check` : manifestes et preuves, synchronisation, lint serverless, couverture du nettoyage, reproductibilité des données, secrets.
- Statuts et preuves : ADR 0004, `docs/runbooks/lab-manual-validation.md`.

## Exercices DuckDB-Wasm

- Bundles `mvp` et `eh` servis depuis `/vendor/duckdb/1.32.0/` (copiés par `scripts/vendor-duckdb.ts`), CSP `worker-src 'self' blob:`.
- Base reconstruite à chaque exécution, `enable_external_access=false`, `lock_configuration=true`, délai de 10 s puis arrêt du worker.

## Environnements

| Environnement | Projet                              | Seuils de visibilité                   | Statut                                           |
| ------------- | ----------------------------------- | -------------------------------------- | ------------------------------------------------ |
| local / test  | `demo-tuto-databricks` (émulateurs) | `draft` / `draft`                      | opérationnel                                     |
| staging       | à fournir                           | `in-technical-review` / `experimental` | préparé (`apphosting.staging.yaml`), non déployé |
| production    | à fournir                           | `published` / `validated`              | préparé, non déployé                             |
