import { basename } from 'node:path';
import type { Decision } from './lib';

const PRODUCTION =
  /\b(firebase|gcloud)\b[^\n]*(--project[= ](prod|production)\b|\bproduction\b)|apphosting:rollouts:create[^\n]*prod/i;
const CLOUD_MUTATION =
  /\bfirebase(?:-tools(?:@\S+)?)?\b[^\n;&|]*?\s(deploy|hosting:channel:deploy|apphosting:(backends:create|rollouts:create|secrets:set)|projects:create|apps:create|functions:delete|firestore:delete)\b|\bgcloud\s+(?!config\b)(?:[a-z-]+\s+){1,3}(create|deploy|delete|update|enable|add-iam-policy-binding)\b/i;
const DATABRICKS_CLI =
  /(^|[;&|(]\s*|\b(?:npx|uvx|pipx\s+run|sudo|env|exec|xargs)\s+)databricks(?=\s|$)(?!\s+(?:--version|-v|help)\b)/i;
const DATABRICKS_API =
  /https:\/\/[^\s'"]*(cloud\.databricks\.com|azuredatabricks\.net|gcp\.databricks\.com)\/api\//i;
const ENV_READ =
  /\b(cat|less|more|head|tail|bat|grep|rg|sed|awk|source|xxd|od|strings)\s+[^|;&]*\.env(?!\.example\b)(\.[\w-]+)*(?![\w.])/;
/** Toute autre mention d'un fichier .env* (python, node, git show HEAD:.env…) : confirmation. */
const ENV_REFERENCE = /(^|[\s'"=:/(<>])\.env(?!\.example\b)(\.[\w-]+)*(?![\w.])/;
const COPY_ENV_TEMPLATE = /^\s*cp\s+(-[a-z]+\s+)*\.env\.example\s+\.env(\.[\w-]+)*\s*$/;

export type ShellVerdict = Decision | 'run-invariants';

export function shellVerdict(command: string): ShellVerdict {
  if (PRODUCTION.test(command)) {
    return {
      permission: 'deny',
      user_message:
        'Déploiement vers la production bloqué : il passe uniquement par la CI après approbation.',
      agent_message: 'Interdit : aucune commande ne doit cibler la production depuis un poste.',
    };
  }
  if (CLOUD_MUTATION.test(command)) {
    return {
      permission: 'ask',
      user_message:
        'Cette commande crée, déploie ou modifie une ressource cloud (coût possible). Confirmez explicitement.',
      agent_message:
        "Aucune ressource cloud ni dépense sans l'autorisation explicite de l'utilisateur.",
    };
  }
  if (DATABRICKS_CLI.test(command) || DATABRICKS_API.test(command)) {
    return {
      permission: 'deny',
      user_message:
        "Commande Databricks bloquée : aucune automatisation sur Free Edition sans validation préalable des conditions d'utilisation.",
      agent_message:
        'Les TP réels sont exécutés manuellement par une personne (docs/runbooks/lab-manual-validation.md).',
    };
  }
  if (ENV_READ.test(command)) {
    return {
      permission: 'deny',
      user_message:
        'Lecture d’un fichier .env bloquée (secrets potentiels). Utilisez .env.example.',
      agent_message: 'Les fichiers .env* (hors .env.example) ne doivent pas être lus.',
    };
  }
  if (ENV_REFERENCE.test(command) && !COPY_ENV_TEMPLATE.test(command)) {
    return {
      permission: 'ask',
      user_message:
        'Cette commande mentionne un fichier .env (secrets potentiels). Confirmez qu’elle n’en expose pas le contenu.',
      agent_message: 'Ne pas lire ni afficher le contenu des fichiers .env* (hors .env.example).',
    };
  }
  if (/\bgit\s+commit\b/.test(command)) return 'run-invariants';
  return { permission: 'allow' };
}

export function readDecision(filePath: string): Decision {
  const name = basename(filePath);
  const secret =
    (name.startsWith('.env') && name !== '.env.example') ||
    /^service-account.*\.json$/.test(name) ||
    name.endsWith('.pem');
  return secret
    ? {
        permission: 'deny',
        user_message: `Lecture de ${name} bloquée (secrets potentiels).`,
        agent_message: 'Utiliser .env.example ; ne jamais lire de secrets.',
      }
    : { permission: 'allow' };
}
