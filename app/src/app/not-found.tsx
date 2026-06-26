import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="app-shell">
      <section className="notice">
        <h2>Page not found</h2>
        <p>The section you are looking for does not exist in this predictor.</p>
        <Link className="button" href="/knockout-stage">
          Back to Knockout Stage
        </Link>
      </section>
    </main>
  );
}
