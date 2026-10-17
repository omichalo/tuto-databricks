---
name: architecture-adr
description: Rédige une ADR (Architecture Decision Record) dans docs/adr/ pour toute décision structurante (version Next.js, dépendance majeure, base de données, activation du correcteur, changement de modèle de sécurité). À utiliser quand une décision est difficile à défaire ou contredit une règle du projet.
paths: docs/adr/**
---

# ADR

Fichier : `docs/adr/NNNN-titre-court.md`, numérotation continue.

```markdown
# NNNN. Titre

- Statut : proposé | accepté | remplacé par NNNN
- Date : AAAA-MM-JJ
- Décideurs : <noms ou rôles>

## Contexte

Faits vérifiés (sources, versions, avis de sécurité consultés avec leur date).

## Décision

Ce qui est retenu, en une phrase, puis les détails.

## Options écartées

Chaque option et la raison précise.

## Conséquences

Positives, négatives, actions de suivi, critère de réexamen.
```

- Une ADR qui touche à la sécurité ou aux coûts reste `proposé` tant que l'utilisateur ne l'a pas acceptée.
- Mettre à jour `docs/architecture.md` si la décision change un flux ou un composant.
