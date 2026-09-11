import { useEffect, useState, type RefObject } from 'react';

export function useActiveFeature(stepRefs: RefObject<(HTMLElement | null)[] | null>) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const elements = stepRefs.current?.filter(Boolean) as HTMLElement[] | undefined;
    if (!elements?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const index = elements.indexOf(visible[0]!.target as HTMLElement);
          if (index >= 0) setActiveIndex(index);
        }
      },
      {
        threshold: [0.25, 0.5, 0.75],
        rootMargin: '-120px 0px -35% 0px',
      },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [stepRefs]);

  return activeIndex;
}
