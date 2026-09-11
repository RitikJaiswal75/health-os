import { FEATURES } from '../data/features';
import { DownloadButton } from './DownloadButton';
import { PhoneFrame } from './PhoneFrame';

export function Hero() {
  const screenshots = FEATURES.map((f) => f.screenshot);
  const altLabels = FEATURES.map((f) => `${f.title} — Health OS app screenshot`);

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 lg:pb-32 lg:pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(187,134,252,0.12)_0%,_transparent_60%)]" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
        <div className="flex-1 text-center lg:text-left">
          <img
            src="/logo.png"
            alt="Health OS"
            className="mx-auto mb-8 h-16 w-16 lg:mx-0"
            width={64}
            height={64}
          />
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your medicines.
            <br />
            <span className="text-primary">On your device.</span>
          </h1>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted lg:text-xl">
            A local-first medicine and supplement tracker for Android. Schedule doses, get reliable
            full-screen reminders, track inventory, and search drug catalogs — no account required.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <DownloadButton />
            <a
              href="#features"
              className="text-sm font-medium text-muted transition-colors hover:text-primary"
            >
              See features ↓
            </a>
          </div>
        </div>

        <div className="flex-shrink-0">
          <PhoneFrame screenshots={screenshots} altLabels={altLabels} activeIndex={0} floating />
        </div>
      </div>
    </section>
  );
}
