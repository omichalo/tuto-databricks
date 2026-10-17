---
name: firebase-app-hosting
description: Prépare et vérifie un déploiement Firebase App Hosting (apphosting.yaml par environnement, secrets, rollout staging, matrice de versions Next.js, rollback). À utiliser pour la préparation du staging, un changement de version Next.js ou un incident de déploiement.
paths: apphosting*.yaml, .github/workflows/**, docs/runbooks/**
---

# App Hosting

## Fichiers

- `apphosting.yaml` : valeurs communes (`minInstances: 0`, `maxInstances`, flags).
- `apphosting.staging.yaml`, `apphosting.production.yaml` : `APP_ENV`, `APP_ORIGIN`, secrets par référence (`secret: <NOM>`), aucune valeur réelle tant que l'utilisateur ne l'a pas fournie.
- `apphosting.emulator.yaml` : exécution locale.

## Avant un rollout (avec accord explicite de l'utilisateur)

```
- [ ] Identifiants staging fournis par l'utilisateur (.firebaserc alias staging)
- [ ] Secrets créés dans Secret Manager par l'utilisateur ou avec son accord
- [ ] npm run check, build, security:bundle, test:emulators:run, test:e2e au vert
- [ ] Avis de sécurité Next.js revérifiés le jour même (config/security-baseline.json)
- [ ] Runbook docs/runbooks/staging-deploy.md suivi pas à pas
```

## Après le rollout

Tests de fumée (`E2E_BASE_URL=<url staging> npx playwright test`), en-têtes, journaux Cloud Logging sans erreur, puis mise à jour de `docs/status.md` (« Testé en staging »).

## Repli de version

Si 15.5.28 échoue sur App Hosting : 16.4.1 via ADR (docs/adr/0001), jamais une version vulnérable. Rollback : rollout précédent depuis la console App Hosting.
