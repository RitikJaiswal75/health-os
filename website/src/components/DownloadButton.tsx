import { DOWNLOAD_URL } from '../data/site';

type DownloadButtonProps = {
  className?: string;
  variant?: 'primary' | 'outline';
};

export function DownloadButton({ className = '', variant = 'primary' }: DownloadButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-full px-8 py-3 text-sm font-semibold transition-colors duration-200';

  const styles =
    variant === 'primary'
      ? 'bg-primary text-background hover:bg-primary/90'
      : 'border border-outline text-foreground hover:border-primary hover:text-primary';

  return (
    <a
      href={DOWNLOAD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${styles} ${className}`}
    >
      Download for Android
    </a>
  );
}
