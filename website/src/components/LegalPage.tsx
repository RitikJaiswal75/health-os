import { GITHUB_URL } from '../data/site';

const CONTACT_URL = `${GITHUB_URL}/issues`;

export type Section = { title: string; body: string[]; list?: string[] };

type Props = { title: string; updated: string; sections: Section[] };

export function LegalPage({ title, updated, sections }: Props) {
  return (
    <main className="px-6 py-16 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm text-muted transition-colors hover:text-primary">
          &larr; Health OS
        </a>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>

        {sections.map(({ title: heading, body, list }) => (
          <section key={heading} className="mt-10">
            <h2 className="mb-3 text-xl font-semibold text-foreground">{heading}</h2>
            {body.map((p) => (
              <p key={p} className="mb-3 leading-relaxed text-muted">
                {p}
              </p>
            ))}
            {list && (
              <ul className="space-y-3">
                {list.map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed text-muted">
                    <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold text-foreground">Contact</h2>
          <p className="leading-relaxed text-muted">
            Questions? Open an issue at{' '}
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {CONTACT_URL.replace('https://', '')}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
