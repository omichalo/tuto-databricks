# 0001. Next.js 15.5.28 épinglé, repli 16.4.1

- Statut : accepté (plan d'architecture révision 3, validé par l'utilisateur)
- Date : 2026-10-17
- Décideurs : mainteneur du projet

## Contexte

Avis de sécurité vérifiés le 2026-10-17 dans les avis du dépôt `vercel/next.js` (API GitHub `repos/vercel/next.js/security-advisories`, 72 avis publiés) et dans la base globale (`/advisories?ecosystem=npm`) :

| Avis                                                  | Gravité  | Versions 15.x affectées  | Corrigé en       |
| ----------------------------------------------------- | -------- | ------------------------ | ---------------- |
| GHSA-2464-fhr4-w9xw (RCE, optimisation d'images SVG)  | critique | ≤ 15.5.27                | 15.5.28 / 16.4.1 |
| GHSA-p3m5-59mp-jv5r (déni de service, Server Actions) | élevée   | ≤ 15.5.27                | 15.5.28 / 16.4.1 |
| GHSA-4jqv-mc3x-m676 (empoisonnement de cache SSG/ISR) | modérée  | < 15.5.27                | 15.5.27 / 16.3.8 |
| GHSA-mcj8-r9mp-w47p (empoisonnement de cache SSG/ISR) | modérée  | < 15.5.27                | 15.5.27 / 16.3.8 |
| GHSA-673q-mjm6-r5xr (RCE, `use cache`)                | critique | aucune (16.0.0 à 16.4.0) | 16.4.1           |

Les deux premiers avis, publiés le 2026-10-14, ne figuraient pas encore dans la base globale (donc invisibles pour `npm audit`) au moment de la vérification. Les plages de versions des avis du dépôt sont parfois mal formées (ex. `|| < 16.3.3` signifiant « 16.x avant 16.3.3 ») : la décision repose sur `patched_versions`.

## Décision

- `next` épinglé à **15.5.28**, version exacte, avec `eslint-config-next` 15.5.28.
- Défense en profondeur : aucune Server Action, pas de `middleware.ts`, pas de `next/og`, optimisation d'images sans source distante, `sharp` forcé en 0.35.5.
- **Repli** autorisé : **16.4.1** (aucun avis non corrigé au 2026-10-17), si 15.5.28 échoue sur App Hosting. Jamais une version présentant un avis critique ou élevé non corrigé.
- Contrôle automatique : `npm run security:advisories` (avis du dépôt `vercel/next.js`, en CI et chaque semaine), `npm run security:baseline` (versions minimales, `npm audit --omit=dev` = 0).

## Options écartées

- 16.x d'emblée : surface plus large (Turbopack par défaut, `use cache`, concerné par GHSA-673q-mjm6-r5xr jusqu'à 16.4.0) sans besoin fonctionnel ; la ligne 15.5 reste corrigée.
- Version flottante (`^15.5.28`) : contraire à la base de sécurité.

## Conséquences

- Toute montée de version passe par une nouvelle ADR et `security:advisories --version <cible>`.
- Le rollout réel en staging (preuve de compatibilité App Hosting) reste à faire : identifiants staging requis.
- Réexamen : à chaque nouvel avis Next.js et au plus tard le 2026-11-17.
