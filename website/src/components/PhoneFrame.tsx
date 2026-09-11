import { useState } from 'react';

type PhoneFrameProps = {
  screenshots: string[];
  altLabels: string[];
  activeIndex: number;
  className?: string;
  floating?: boolean;
};

export function PhoneFrame({
  screenshots,
  altLabels,
  activeIndex,
  className = '',
  floating = false,
}: PhoneFrameProps) {
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});

  return (
    <div
      className={`phone-frame mx-auto w-[min(100%,280px)] lg:w-[min(100%,320px)] ${floating ? 'animate-hero-float' : ''} ${className}`}
    >
      <div className="phone-screen screenshot-stack">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-surface to-secondary/10" />

        {screenshots.map((src, index) => (
          <img
            key={src}
            src={src}
            alt={altLabels[index] ?? 'Health OS app screenshot'}
            aria-hidden={index !== activeIndex}
            className={index === activeIndex ? 'screenshot-active' : ''}
            onLoad={() => setLoadedImages((prev) => ({ ...prev, [index]: true }))}
            onError={() => setLoadedImages((prev) => ({ ...prev, [index]: false }))}
            style={{
              opacity: loadedImages[index] === false && index === activeIndex ? 0 : undefined,
            }}
          />
        ))}

        {loadedImages[activeIndex] === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/20" />
            <p className="text-xs text-muted">Screenshot coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
