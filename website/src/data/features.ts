export type Feature = {
  id: string;
  title: string;
  description: string;
  screenshot: string;
};

export const FEATURES: Feature[] = [
  {
    id: 'today',
    title: 'Today at a glance',
    description:
      'See every scheduled dose for the day with a completion donut, date strip, and quick Taken, Skip, or Snooze actions. Edit doses and check remaining stock without leaving the screen.',
    screenshot: '/screenshots/01-today.jpg',
  },
  {
    id: 'search',
    title: 'Search the catalog',
    description:
      'Find medicines fast with the India drug catalog, plus RxTerms and NIH DSLD. Results are cached locally so repeat searches stay instant.',
    screenshot: '/screenshots/02-search.jpg',
  },
  {
    id: 'configure',
    title: 'Make it yours',
    description:
      'Set type, strength, pill shape and colour, nickname, and notes. Attach a photo from camera or gallery so each medication is easy to spot.',
    screenshot: '/screenshots/03-configure.jpg',
  },
  {
    id: 'schedule',
    title: 'Flexible schedules',
    description:
      'Daily, every N days, specific weekdays, monthly, or as-needed — with multiple times per day and optional end dates.',
    screenshot: '/screenshots/04-schedule.jpg',
  },
  {
    id: 'reminder',
    title: 'Reminders that reach you',
    description:
      'Native exact alarms with full-screen intent on Android — the reminder opens even when the app is killed. Snooze for 30 minutes, 1 hour, or a custom time.',
    screenshot: '/screenshots/05-reminder.jpg',
  },
  {
    id: 'library',
    title: 'Your medication library',
    description:
      'All medications in one place with pill icons, strength, and stock. Tap to edit or refill with one tap when supplies run low.',
    screenshot: '/screenshots/06-library.jpg',
  },
  {
    id: 'history',
    title: 'Review your history',
    description:
      'Browse past days and see what you took, skipped, or missed. Edit or delete logged doses anytime.',
    screenshot: '/screenshots/07-history.jpg',
  },
];

export const VALUE_PROPS = [
  {
    title: 'Local-first',
    description: 'Everything stays on your device. No accounts, no cloud sync, no sign-up.',
  },
  {
    title: 'Private by design',
    description: 'Your database and pill photos live in durable Documents/HealthOS/ storage on your phone.',
  },
  {
    title: 'Reliable reminders',
    description: 'Full-screen Android alarms that work even when the app is closed — with guided permission setup.',
  },
] as const;

export const INSTALL_STEPS = [
  {
    step: 1,
    title: 'Download the APK',
    description: 'Get health-os-release.apk from GitHub Releases — about 41 MB, arm64 only.',
  },
  {
    step: 2,
    title: 'Allow unknown apps',
    description: 'Enable Install unknown apps for your browser or file manager (Settings → Apps → Special access).',
  },
  {
    step: 3,
    title: 'Install and open',
    description: 'Open the APK, tap Install, and start adding your medications.',
  },
] as const;
