# 0002. Nom de produit provisoire et neutre

- Statut : accepté
- Date : 2026-10-17

## Contexte

« Databricks Academy » est le nom d'une offre de Databricks, Inc. et ne doit pas être utilisé comme marque. Le nom définitif n'est pas choisi.

## Décision

- Nom provisoire : **Orion Data Lab**, identifiant technique `orion-data-lab`.
- Une seule source : `src/config/product.ts` (`PRODUCT`), surchargeable par `NEXT_PUBLIC_PRODUCT_NAME`. Les préfixes techniques des TP (`orion_lab_*`, `orion_dft_*`) sont dans les manifestes.
- Mention de non-affiliation dans le pied de page et dans chaque TP.

## Conséquences

- Changer de nom : modifier `src/config/product.ts` et la variable d'environnement ; les préfixes de schéma des TP ne changent qu'avec une nouvelle version de TP.
- Le nom définitif (vérification de disponibilité et de non-contrefaçon) bloque toute mise en ligne publique, pas le développement.
