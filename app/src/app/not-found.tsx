import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="app-shell">
      <section className="notice">
        <h2>Página no encontrada</h2>
        <p>La sección que buscás no existe en esta quiniela.</p>
        <Link className="button" href="/">
          Volver a Mi Quiniela
        </Link>
      </section>
    </main>
  );
}
