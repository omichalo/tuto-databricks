import { FREE_EDITION_TERMS_VERSION } from './providers';

/**
 * Notice affichée avant le premier TP Free Edition. Ce n'est pas un résumé juridique : elle
 * renvoie aux conditions officielles, que l'apprenant doit lire lui-même.
 * Toute modification du texte impose d'incrémenter FREE_EDITION_TERMS_VERSION.
 */
export const FREE_EDITION_TERMS_NOTICE = {
  version: FREE_EDITION_TERMS_VERSION,
  termsUrl: 'https://www.databricks.com/legal/databricks-free-edition',
  limitsUrl: 'https://docs.databricks.com/aws/en/getting-started/free-edition-limitations',
  points: [
    'Databricks Free Edition est réservé à un usage personnel et non commercial : n’utilisez pas ce compte pour votre travail rémunéré ou celui de votre entreprise.',
    'Utilisez votre propre compte : ne le partagez pas et n’utilisez pas celui d’un autre apprenant.',
    'Free Edition applique des quotas de calcul : en cas de dépassement, le calcul est suspendu pour la journée, voire pour le mois.',
    'Ce site n’accède jamais à votre workspace : vous importez et exécutez vous-même les notebooks.',
    'Exécutez le notebook de nettoyage à la fin de chaque TP.',
  ],
} as const;
