# Premier déploiement en staging

**Ne rien exécuter sans l'accord explicite de l'utilisateur** : ces étapes créent des ressources et peuvent entraîner des coûts (offre Blaze).

## Informations à demander à l'utilisateur

| Information                                                         | Où elle sert                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ID du projet Firebase staging (offre Blaze)                         | `.firebaserc` (`staging`), variable GitHub `STAGING_FIREBASE_PROJECT_ID` |
| Région App Hosting et Firestore (proposé : `europe-west4` / `eur3`) | création du backend et de la base                                        |
| Branche `staging` du dépôt `omichalo/tuto-databricks`               | connexion App Hosting                                                    |
| Domaine ou URL App Hosting attendue                                 | `APP_ORIGIN` dans `apphosting.staging.yaml`                              |
| Clé de site reCAPTCHA Enterprise (staging)                          | `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`, App Check                   |
| E-mail d'alerte et montant du budget                                | alerte de facturation                                                    |

## Étapes

1. **Projet** : créer (ou fournir) le projet staging, activer Blaze, créer un budget avec alertes.
2. **Firestore** : base en mode natif dans la région retenue. La politique TTL sur `rateLimits.expireAt` est déclarée dans `firestore.indexes.json` et appliquée avec le déploiement des index (étape 6).
3. **Auth** : activer les fournisseurs Anonyme et Google ; domaine autorisé = URL App Hosting.
4. **App Check** : enregistrer l'application web avec reCAPTCHA Enterprise ; laisser `APP_CHECK_ENFORCED=false` jusqu'à vérification des jetons, puis passer à `true`.
5. **App Hosting** : créer le backend relié au dépôt, branche `staging`, environnement `staging` (fichier `apphosting.staging.yaml` : remplacer `REPLACE_WITH_STAGING_BACKEND_URL` et `REPLACE_WITH_STAGING_RECAPTCHA_SITE_KEY` ; seuils de recette `CONTENT_MIN_STATUS=in-technical-review`, `LAB_MIN_STATUS=experimental`).
6. **Règles et index** : soit `firebase deploy --only firestore:rules,firestore:indexes --project <staging>` (avec accord), soit le workflow `deploy-staging.yml` après configuration de Workload Identity Federation (`STAGING_WIF_PROVIDER`, `STAGING_DEPLOY_SERVICE_ACCOUNT`) et `STAGING_DEPLOY_ENABLED=true`.
7. **Rollout** : pousser sur `staging` ; suivre le rollout dans la console App Hosting.

## Tests de fumée après rollout

```bash
E2E_BASE_URL=https://<url-staging> npx playwright test   # sans serveur local ; écrit des données de test (compte anonyme)
curl -sI https://<url-staging>/fr | grep -Ei "content-security-policy|strict-transport|x-content-type"
```

Vérifier aussi : connexion anonyme puis Google, exercice SQL (DuckDB-Wasm chargé, CSP sans erreur dans la console), quiz, déclaration de TP, tableau de bord, journaux Cloud Logging sans erreur.

Si l'application échoue en 15.5.28 sur App Hosting : consigner l'erreur, appliquer le repli 16.4.1 (ADR 0001) après `npm run security:advisories -- --version 16.4.1`.

## Rollback

- Application : rollout précédent depuis la console App Hosting.
- Règles : redéployer la version du tag précédent.
- Données : export Firestore planifié (à mettre en place en phase 8).

Mettre à jour `docs/status.md` (« Testé en staging », date, URL, résultat).
