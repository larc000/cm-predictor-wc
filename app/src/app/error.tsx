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
        <h2>Something went wrong</h2>
        <p>{error.message || 'This section could not be loaded.'}</p>
        <button className="button" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
