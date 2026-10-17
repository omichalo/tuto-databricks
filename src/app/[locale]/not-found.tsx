import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="stack">
      <h1>Page introuvable</h1>
      <p className="muted">Cette page n’existe pas ou n’est pas encore publiée.</p>
      <p>
        <Link href="/fr">Retour à l’accueil</Link>
      </p>
    </div>
  );
}
