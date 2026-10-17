/**
 * Nom provisoire et neutre du produit. Il ne doit pas reprendre une marque tierce
 * (ni « Databricks Academy », ni une variante) : voir docs/adr/0002-nom-produit-neutre.md.
 * Modifiable sans toucher au code via NEXT_PUBLIC_PRODUCT_NAME.
 */
export const PRODUCT = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? 'Orion Data Lab',
  technicalId: 'tuto-databricks',
  tagline: {
    fr: 'Apprendre Databricks SQL et Delta Lake par la pratique',
    en: 'Learn Databricks SQL and Delta Lake by doing',
  },
  disclaimer: {
    fr: 'Projet de formation indépendant, non affilié à Databricks, Inc., ni approuvé par elle. Databricks, Delta Lake et Apache Spark sont des marques de leurs propriétaires respectifs.',
    en: 'Independent training project, not affiliated with or endorsed by Databricks, Inc. Databricks, Delta Lake and Apache Spark are trademarks of their respective owners.',
  },
} as const;
