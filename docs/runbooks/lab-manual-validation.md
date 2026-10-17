# Validation manuelle d'un TP réel

Objectif : faire passer un environnement de TP de `experimental` à `validated` avec une preuve reproductible. **Aucune étape n'est automatisée.**

## Préalables (bloquants)

- [ ] Les conditions d'usage de Databricks Free Edition ont été revues et autorisent cette validation par la personne qui l'exécute (usage personnel, non commercial ; voir https://www.databricks.com/legal/databricks-free-edition). Décision consignée dans `docs/status.md`.
- [ ] Workspace de test appartenant à la personne qui valide, sans donnée réelle.
- [ ] `npm run labs:check` vert sur le commit validé ; noter l'empreinte des artefacts :
  ```bash
  npx tsx -e "import('./scripts/labs/lab-files.ts').then(m => console.log(m.computeArtifactHash('labs/<id>')))"
  ```

## Procédure (exemple : `delta-first-table`)

1. **Initialisation**
   - Télécharger `public/labs/<id>/<id>-exercise.ipynb` et `<id>-cleanup.ipynb` (générés par `npm run content:build`), ou depuis la page du TP en local.
   - Importer dans le workspace (Workspace > dossier personnel > Import), attacher au calcul serverless.
   - Noter la version du runtime serverless affichée (environnement du notebook).
2. **Génération et exercice** : exécuter les cellules dans l'ordre en complétant les cellules « À compléter » avec la solution (`labs/<id>/notebooks/solution.py`).
3. **Vérification** : exécuter la cellule de vérification ; tous les contrôles doivent afficher `OK` ; noter le code affiché.
4. **Nettoyage** : exécuter `cleanup` avec les mêmes widgets ; la dernière cellule doit afficher `Objets du TP restants : 0`.
5. **Rejeu** : relancer une seconde fois l'ensemble (le TP doit être rejouable depuis le début) ; noter tout écart.
6. **Captures** : conserver hors dépôt les captures (elles peuvent contenir l'URL du workspace) ; ne rien committer d'identifiant.

## Preuve

Créer `labs/<id>/validation/<environnement>-<AAAA-MM-JJ>.json` (schéma `validationEvidenceSchema`, `src/domain/labs/manifest-schema.ts`) :

```json
{
  "labId": "delta-first-table",
  "labVersion": "1.0.0",
  "environment": "databricks-free-manual",
  "runtime": "<version serverless relevée>",
  "date": "AAAA-MM-JJ",
  "artifactHash": "<empreinte des artefacts>",
  "executedBy": "<nom ou pseudonyme de la personne>",
  "steps": [
    { "name": "setup", "outcome": "passed" },
    { "name": "generate", "outcome": "passed" },
    { "name": "exercise", "outcome": "passed" },
    { "name": "verification", "outcome": "passed", "notes": "tous les contrôles OK" },
    { "name": "cleanup", "outcome": "passed" },
    { "name": "cleanup-check", "outcome": "passed", "notes": "Objets du TP restants : 0" }
  ],
  "checkCode": "<code affiché>",
  "remainingObjectsAfterCleanup": 0
}
```

Puis, dans `lab.yaml`, pour l'environnement concerné :

```yaml
status: validated
validation:
  date: AAAA-MM-JJ
  environment: databricks-free-manual
  runtime: <version>
  artifactHash: <empreinte>
  evidence: validation/<fichier>.json
  validatedBy: <nom>
```

Contrôler : `npm run guards && npm run labs:check`. Mettre à jour `docs/status.md` (ligne du TP : statut, date, preuve).

## En cas d'échec

Consigner l'étape en échec dans `docs/status.md`, corriger les artefacts, repasser par la CI, puis recommencer la procédure complète. Ne jamais écrire de preuve partielle comme `passed`.
