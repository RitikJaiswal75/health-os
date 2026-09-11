import type { Feature } from '../data/features';
import { PhoneFrame } from './PhoneFrame';

type FeatureStepProps = {
  feature: Feature;
  index: number;
  activeIndex: number;
  allScreenshots: string[];
  altLabels: string[];
  stepRef: (el: HTMLElement | null) => void;
};

export function FeatureStep({
  feature,
  index,
  activeIndex,
  allScreenshots,
  altLabels,
  stepRef,
}: FeatureStepProps) {
  const isActive = index === activeIndex;

  return (
    <article
      ref={stepRef}
      className="flex min-h-[80vh] flex-col justify-center gap-8 py-16 lg:min-h-screen lg:py-24"
      aria-current={isActive ? 'step' : undefined}
    >
      <div className="lg:hidden">
        <PhoneFrame screenshots={allScreenshots} altLabels={altLabels} activeIndex={index} />
      </div>

      <div
        className={`transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-60 lg:opacity-40'}`}
      >
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-secondary">
          {String(index + 1).padStart(2, '0')}
        </p>
        <h3 className="mb-4 text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
          {feature.title}
        </h3>
        <p className="max-w-lg text-lg leading-relaxed text-muted">{feature.description}</p>
      </div>
    </article>
  );
}
