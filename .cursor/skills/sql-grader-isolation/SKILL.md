---
name: sql-grader-isolation
description: Encadre tout travail sur un correcteur SQL exécuté côté serveur (phase 4b optionnelle) - isolation, projet dédié, tests adversariaux, flag désactivé. À utiliser avant de toucher à SQL_SERVER_GRADING_ENABLED ou à du code exécutant le SQL d'un apprenant côté serveur.
---

# Correcteur SQL serveur (phase 4b, désactivé)

État actuel : **désactivé**. `SQL_SERVER_GRADING_ENABLED` est imposé au littéral `"false"` par `src/server/env.ts`, vérifié par `npm run guards` et le hook de commit.

## Préalables obligatoires avant toute activation

```
- [ ] ADR acceptée par l'utilisateur (docs/adr/) : besoin, menace, coût
- [ ] Projet Google Cloud dédié, sans accès aux données des apprenants
- [ ] Exécution dans un bac à sable sans réseau, sans système de fichiers, limites CPU/mémoire/durée
- [ ] Tests adversariaux (tests/grader-adversarial) : évasion, déni de service, lecture de fichiers, extensions
- [ ] Revue /review-security et subagent security-auditor
- [ ] Démonstration en staging, flag OFF en production par défaut
```

## Interdits

- Exécuter le SQL d'un apprenant dans le processus Next.js.
- Activer le flag dans `apphosting*.yaml` ou `.env.example` sans les préalables.
- Réutiliser les identifiants du projet principal.
