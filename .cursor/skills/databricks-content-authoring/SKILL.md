---
name: databricks-content-authoring
description: Rédige ou révise une leçon MDX du catalogue Databricks (frontmatter, objectifs, sources officielles, quiz, statut de relecture). À utiliser pour créer une leçon, un module ou un parcours dans content/.
paths: content/**
---

# Rédiger une leçon

## Fichiers

- `content/tracks/<track>/track.yaml` : modules et ordre des leçons.
- `content/tracks/<track>/<module>/<lesson>.fr.mdx` : leçon (FR obligatoire ; `.en.mdx` facultatif).
- `content/tracks/<track>/<module>/<lesson>.quiz.yaml` : quiz (clés côté serveur uniquement).
- `content/objectives/<track>.yaml` : objectifs mesurables (verbe de Bloom, sources).

## Définition de Done

```
- [ ] 2 à 5 objectifs, chacun évalué par au moins une question ou un exercice
- [ ] Sources officielles avec verifiedAt (date de vérification réelle)
- [ ] Interaction : exerciseId, labId, ou interactionWaiver justifiée
- [ ] Exemples exécutables ; pas de comportement non documenté
- [ ] Quiz : explications pour chaque option, renvoi vers la section (ancre h2/h3)
- [ ] Statut draft → in-technical-review ; published seulement après double relecture humaine
- [ ] npm run content:build && npm run content:check
```

## Style

- Phrases courtes, tutoiement non, vouvoiement oui. Terminologie Databricks officielle en anglais entre backticks (`MERGE INTO`).
- Une notion par section h2 ; un encadré `<Callout>` pour les pièges.
- Signaler explicitement ce qui diffère entre Free Edition, workspace professionnel et simulation navigateur.

## Vérification des faits

Pour toute affirmation sur les valeurs par défaut, limites ou disponibilités : subagent `databricks-fact-checker`. Une affirmation non confirmée est retirée, pas adoucie.
