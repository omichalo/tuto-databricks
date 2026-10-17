---
name: databricks-simulators
description: Conçoit des simulateurs pédagogiques purs (journal Delta, plan Spark, Unity Catalog, médaillon) dans src/domain, avec tests et mentions de simplification. À utiliser pour les phases 5 et 6 ou tout composant qui imite un comportement Databricks.
paths: src/domain/**, src/components/**
---

# Simulateurs

## Principes

1. Modéliser uniquement un comportement documenté ; citer la source (URL officielle, date) dans le module et dans la leçon.
2. Domaine pur dans `src/domain/simulators/<nom>/` : fonctions déterministes `state → action → state`, sans React ni Firebase.
3. Interface dans `src/components/simulators/<nom>/` (composant client), accessible au clavier.
4. Afficher à l'apprenant ce qui est simplifié (« Simulation : ... n'est pas modélisé »).
5. Tests unitaires : cas nominal, cas limite documenté, invariants (ex. versions Delta strictement croissantes).

## Exemple de contrat

```ts
export interface DeltaLogState {
  readonly version: number;
  readonly files: readonly string[];
  readonly history: readonly {
    version: number;
    operation: 'WRITE' | 'UPDATE' | 'DELETE' | 'MERGE';
  }[];
}
export function applyUpdate(
  state: DeltaLogState,
  removed: readonly string[],
  added: readonly string[],
): DeltaLogState;
```

## À éviter

- Présenter une durée, un coût ou une limite chiffrée non sourcée.
- Simuler des comportements propres à une version de runtime sans la nommer.
