import { useScrollReveal } from '../hooks/useScrollReveal';

const PRIVACY_POINTS = [
  'No accounts and no cloud sync — everything stays on your device.',
  'Database and pill photos live in durable Documents/HealthOS/ storage.',
  'Data survives Android Clear cache; removed only on Clear data or uninstall.',
  'Catalog API queries (RxTerms, DSLD) are cached locally for 24 hours.',
] as const;

export function Privacy() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl">
        <div
          ref={ref}
          className={`reveal-up rounded-2xl border border-outline/50 bg-surface p-8 lg:p-12 ${isVisible ? 'is-visible' : ''}`}
        >
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Privacy &amp; data
          </h2>
          <ul className="space-y-4">
            {PRIVACY_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
