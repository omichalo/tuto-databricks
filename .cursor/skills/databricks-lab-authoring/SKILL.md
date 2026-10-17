---
name: databricks-lab-authoring
description: Crée ou modifie un TP réel Databricks (Free Edition ou workspace professionnel) - manifeste lab.yaml, notebooks serverless, générateur de données, vérification, nettoyage, matrice de compatibilité et procédure de validation manuelle. À utiliser pour tout travail dans labs/ ou sur un TP Databricks.
paths: labs/**, scripts/labs/**, src/domain/labs/**
---

# Rédiger un TP Databricks

Modèle de référence : `labs/delta-first-table/`. Schéma : `src/domain/labs/manifest-schema.ts`.

## Déroulé

```
- [ ] 1. Objectifs : choisir 2 à 6 objectifs existants (content/objectives/*.yaml)
- [ ] 2. Compatibilité : chaque fonctionnalité dans config/free-edition-features.json, statut confirmed + source officielle
- [ ] 3. Générateur : data/generator.sql déterministe (pas de rand() non semé, pas de téléchargement)
- [ ] 4. Référence : data/reference.sql + expected-stats.json calculés par la CI (DuckDB)
- [ ] 5. Notebooks : écrire notebooks/source.py (marqueurs solution/exercice) et notebooks/cleanup.py ; exercise.*, solution.* et les .ipynb sont générés
- [ ] 6. Vérification : verification.server.json généré (code de contrôle, jamais dans les notebooks publics)
- [ ] 7. README.fr.md : initialisation, exécution, vérification, nettoyage, dépannage
- [ ] 8. npm run labs:build-notebooks && npm run labs:check
- [ ] 9. Revue : subagent free-edition-compat-checker, puis databricks-fact-checker
```

## Contraintes serverless (Free Edition)

- Python et SQL seulement ; pas de RDD, `sparkContext`, `.cache()`/`.persist()`, chemins `dbfs:/`.
- Streaming : `trigger(availableNow=True)` ou `once` ; jamais `processingTime` ni `continuous`.
- Accès Internet sortant restreint : données générées dans le notebook.
- Widgets `catalog` (vide = catalogue courant) et `schema` ; repli sur `default` avec préfixe si `CREATE SCHEMA` est refusé.

## Nettoyage

`DROP TABLE IF EXISTS` pour chaque objet créé, puis `DROP SCHEMA` seulement s'il est vide, jamais `CASCADE`. La dernière cellule affiche le nombre d'objets restants (attendu : 0). `check-cleanup.ts` vérifie la couverture.

## Statuts

- Nouveau TP : `draft`. Complet et vert en CI : `experimental`.
- `validated` uniquement après exécution réelle par une personne selon `docs/runbooks/lab-manual-validation.md`, preuve JSON dans `validation/` et `validation` renseigné dans le manifeste (empreinte des artefacts incluse).
- Ne jamais écrire de preuve sans exécution réelle. Ne jamais automatiser l'exécution sur Free Edition.

## Résultats

Le résultat d'un apprenant est toujours `self-reported`. Le code de contrôle (préfixe + modulo) n'est qu'un indice de cohérence ; ne jamais le présenter comme une preuve.
