import { INSTALL_STEPS } from '../data/features';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { DownloadButton } from './DownloadButton';

export function InstallGuide() {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <section id="install" className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl">
        <div ref={ref} className={`reveal-up text-center ${isVisible ? 'is-visible' : ''}`}>
          <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            How to install
          </h2>
          <p className="mt-4 text-muted">
            No app store required — download the APK directly from GitHub Releases.
          </p>
        </div>

        <ol className="mt-12 space-y-8">
          {INSTALL_STEPS.map((item) => (
            <li key={item.step} className="flex gap-6">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary text-sm font-bold text-primary">
                {item.step}
              </span>
              <div className="border-l-2 border-outline pl-6">
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-muted">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex justify-center">
          <DownloadButton />
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          Requires Android 8+ · arm64-v8a (most phones from ~2017 onward)
        </p>
      </div>
    </section>
  );
}
