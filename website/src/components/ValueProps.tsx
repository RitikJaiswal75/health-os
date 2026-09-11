import { VALUE_PROPS } from '../data/features';
import { useScrollReveal } from '../hooks/useScrollReveal';

function ValueCard({
  title,
  description,
  delay,
}: {
  title: string;
  description: string;
  delay: number;
}) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal-up rounded-2xl border border-outline/50 bg-surface p-8 ${isVisible ? 'is-visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <h3 className="mb-3 text-xl font-semibold text-foreground">{title}</h3>
      <p className="leading-relaxed text-muted">{description}</p>
    </div>
  );
}

export function ValueProps() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div ref={ref} className={`reveal-up mb-12 text-center ${isVisible ? 'is-visible' : ''}`}>
          <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            Built for daily use
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Calm, dark-themed, and designed to stay out of your way — while keeping your medication
            routine on track.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {VALUE_PROPS.map((prop, index) => (
            <ValueCard
              key={prop.title}
              title={prop.title}
              description={prop.description}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
