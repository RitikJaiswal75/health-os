import { useRef } from 'react';
import { FEATURES } from '../data/features';
import { useActiveFeature } from '../hooks/useActiveFeature';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { FeatureStep } from './FeatureStep';
import { PhoneFrame } from './PhoneFrame';

export function FeatureShowcase() {
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const activeIndex = useActiveFeature(stepRefs);
  const { ref: headingRef, isVisible } = useScrollReveal<HTMLDivElement>();
  const screenshots = FEATURES.map((f) => f.screenshot);
  const altLabels = FEATURES.map((f) => `${f.title} — Health OS app screenshot`);

  return (
    <section id="features" className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div
          ref={headingRef}
          className={`reveal-up mb-16 text-center lg:mb-24 ${isVisible ? 'is-visible' : ''}`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            Everything you need
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            From adding your first medication to never missing a dose — scroll to explore.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-16">
          <div>
            {FEATURES.map((feature, index) => (
              <FeatureStep
                key={feature.id}
                feature={feature}
                index={index}
                activeIndex={activeIndex}
                allScreenshots={screenshots}
                altLabels={altLabels}
                stepRef={(el) => {
                  stepRefs.current[index] = el;
                }}
              />
            ))}
          </div>

          <div className="hidden lg:block lg:-mt-[100px]">
            <div className="sticky top-16 flex items-center justify-center pb-24 pt-8">
              <PhoneFrame screenshots={screenshots} altLabels={altLabels} activeIndex={activeIndex} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
