# 0004. Statuts des TP réels et résultats déclarés

- Statut : accepté
- Date : 2026-10-17

## Contexte

Les TP réels s'exécutent dans le workspace Databricks de l'apprenant (Free Edition ou professionnel), auquel la plateforme n'a aucun accès. Les conditions d'usage de Free Edition (usage personnel, non commercial) n'autorisent pas, sans validation préalable, d'automatiser des traitements pour le compte de la plateforme.

## Décision

1. Statut par environnement : `draft`, `experimental`, `validated`.
   - `experimental` : TP complet, chaîne d'artefacts verte en CI (génération déterministe, résultats attendus recalculés, lint serverless, couverture du nettoyage, absence de secrets).
   - `validated` : uniquement après **exécution réelle** par une personne selon `docs/runbooks/lab-manual-validation.md`, avec une preuve JSON dans `labs/<id>/validation/` dont l'empreinte correspond aux artefacts. Toute modification d'artefact invalide la validation.
   - Imposé par `npm run guards`, le hook de commit et la CI.
2. Visibilité : `LAB_MIN_STATUS` (production : `validated`). Un environnement sous le seuil est indisponible dans l'interface et refusé par l'API.
3. Résultats : un TP réel produit toujours un résultat `self-reported` (« Déclaré par vous »). Le code de contrôle affiché par le notebook n'est qu'un indice de cohérence, jamais une preuve. Seuls les quiz et exercices navigateur produisent `automatic-formative` (« Vérifié par la plateforme »). Les deux sont affichés séparément.
4. Aucune automatisation (CI, CLI, API) n'exécute de traitement sur Free Edition. Le fournisseur `databricks-connected` existe comme interface seulement, toujours indisponible.
5. Avis Free Edition (`free-edition-v1`) : acquittement versionné, exigé par le serveur avant toute déclaration.

## Conséquences

- En production, aucun TP n'est proposé tant qu'aucun n'est `validated`.
- Une validation automatisée ne sera envisagée qu'après accord écrit sur les conditions d'usage (nouvelle ADR).
