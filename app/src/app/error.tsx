'use client';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app-shell">
      <section className="notice">
        <h2>Algo salió mal</h2>
        <p>{error.message || 'No se pudo cargar esta sección.'}</p>
        <button className="button" type="button" onClick={reset}>
          Intentar de nuevo
        </button>
      </section>
    </main>
  );
}
