import type { Metadata } from 'next';
import { resolveLocale } from '@/components/layout/locale-params';
import { Callout } from '@/components/ui/primitives';
import { PRODUCT } from '@/config/product';
import { FREE_EDITION_TERMS_NOTICE } from '@/domain/labs/terms';

export const metadata: Metadata = { title: 'À propos' };

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  return (
    <div className="stack" style={{ maxWidth: 'var(--reading-width)' }} lang="fr">
      <h1>À propos de {PRODUCT.name}</h1>
      <Callout kind="info" title="Projet indépendant">
        {PRODUCT.disclaimer[locale]}
      </Callout>

      <h2>Ce qui est vérifié, et ce qui ne l’est pas</h2>
      <ul>
        <li>
          <strong>Quiz</strong> : corrigés par le serveur, à visée formative.
        </li>
        <li>
          <strong>Exercices SQL du navigateur</strong> : votre requête s’exécute dans votre
          navigateur (DuckDB-Wasm). Le serveur compare l’empreinte du résultat à celle de la
          solution. C’est un contrôle formatif : il ne prouve pas que vous avez écrit la requête.
        </li>
        <li>
          <strong>TP sur Databricks</strong> : la plateforme ne se connecte jamais à votre
          workspace. Votre résultat est <em>déclaré par vous</em> et affiché comme tel, même lorsque
          le code de contrôle saisi est cohérent.
        </li>
      </ul>

      <h2>Statut des TP</h2>
      <ul>
        <li>
          <strong>Brouillon</strong> : en cours d’écriture, jamais publié.
        </li>
        <li>
          <strong>Expérimental</strong> : complet et testé automatiquement (génération des données,
          contrôle des notebooks, nettoyage), mais pas encore exécuté sur un vrai workspace.
        </li>
        <li>
          <strong>Validé</strong> : exécuté de bout en bout sur un vrai workspace (initialisation,
          exécution, vérification, nettoyage), avec une preuve documentée qui correspond exactement
          aux fichiers publiés. Toute modification des fichiers rend la validation périmée.
        </li>
      </ul>

      <h2>Databricks Free Edition</h2>
      <ul>
        {FREE_EDITION_TERMS_NOTICE.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p>
        Conditions officielles :{' '}
        <a href={FREE_EDITION_TERMS_NOTICE.termsUrl} target="_blank" rel="noopener noreferrer">
          {FREE_EDITION_TERMS_NOTICE.termsUrl}
        </a>
      </p>
      <p>Aucun traitement automatisé n’est exécuté par cette plateforme sur Free Edition.</p>

      <h2>Données personnelles</h2>
      <p>
        Nous enregistrons votre progression (leçons, scores de quiz, résultats d’exercices,
        déclarations de TP) et votre acceptation des conditions Free Edition. Aucune donnée de votre
        workspace Databricks n’est collectée. Les TP utilisent uniquement des données synthétiques
        générées dans le notebook.
      </p>
    </div>
  );
}
