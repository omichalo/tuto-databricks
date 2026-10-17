---
name: instructional-design
description: Applique la conception pédagogique du projet (objectifs mesurables, alignement objectifs-évaluations, progression, charge cognitive, indicateurs). À utiliser pour concevoir un parcours, un module, un quiz, ou évaluer la qualité pédagogique d'une leçon.
paths: content/**
---

# Conception pédagogique

## Alignement

Chaque objectif (verbe de Bloom observable) est enseigné dans une section et évalué par au moins une question, un exercice ou un TP. `npm run content:check` signale les objectifs non couverts.

## Structure d'une leçon

1. Pourquoi (problème concret, 2-3 phrases).
2. Notions, une par section h2, avec un exemple exécutable.
3. Pièges fréquents (encadré).
4. Pratique : exercice navigateur ou TP réel.
5. Quiz de 3 à 6 questions, distracteurs plausibles, explication par option.

## Quiz

- Une question évalue un seul objectif ; pas de piège de formulation.
- Les explications renvoient à une ancre de la leçon (« Relire la section »).

## Indicateurs à suivre (phase 8)

Taux de complétion par leçon, score moyen au premier essai par objectif, abandon par étape de TP, part des déclarations de TP avec code cohérent.

## Revue

Subagent `pedagogy-reviewer` avant tout passage à `in-pedagogical-review`.
