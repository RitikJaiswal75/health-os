import { GITHUB_URL, SITE_VERSION } from '../data/site';

export function Footer() {
  return (
    <footer className="border-t border-outline px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-8 w-8 opacity-80" width={32} height={32} />
          <span className="text-sm text-muted">Health OS v{SITE_VERSION}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-primary"
          >
            GitHub
          </a>
          <span className="hidden sm:inline">·</span>
          <span className="text-center text-xs sm:text-left">
            India drugs: NRCeS CDCI (CC BY 4.0) · US: NLM RxTerms · Supplements: NIH DSLD
          </span>
        </div>
      </div>
    </footer>
  );
}
