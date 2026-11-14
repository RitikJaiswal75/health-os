import { LegalPage, type Section } from './LegalPage';

const LAST_UPDATED = '14 November 2026';

const SECTIONS: Section[] = [
  {
    title: 'Summary',
    body: [
      'Health OS is a local-first medicine and supplement tracker for Android. Your medications, schedules, dose history and pill photos stay on your device. Signing in with Google is optional and is used only to back up your data to your own Google Drive when you choose to. We have no servers that store your health data, we do not sell your data, and we show no ads.',
    ],
  },
  {
    title: 'Data stored on your device',
    body: ['The app stores the following in its private storage, which other apps cannot read:'],
    list: [
      'Medications, schedules, dose history, inventory and refill information you enter.',
      'Photos you take or pick for a pill image (the app uses the camera or the system photo picker only when you ask).',
      'App settings such as language and reminder preferences.',
    ],
  },
  {
    title: 'Data that leaves your device',
    body: ['Your health data is never uploaded to us. The app makes only these network requests:'],
    list: [
      'Medicine search: the text you type is sent to public drug catalogs — our India catalog API (drugs.healthos.ritik.cc, built from NRCeS CDCI), NIH NLM RxTerms and NIH DSLD. Results are cached on your device for 24 hours. These services receive your search text and your IP address, as any web request does.',
      'App configuration: the app fetches update notices, translations and crash-reporting settings from healthos.ritik.cc and config.healthos.ritik.cc. These requests carry no health data.',
    ],
  },
  {
    title: 'Google sign-in and Drive backup',
    body: [
      'If you choose to back up, you sign in with your Google account and the app saves a backup file of your app data (medications, schedules, dose history and pill photos) to your Google Drive, and can restore it from there. A backup only happens when you trigger it.',
    ],
    list: [
      'What we access: your basic Google profile (name and email, to show which account is connected) and the Drive access needed to create, read and delete the backup file the app makes. The app cannot see your other Drive files.',
      'Where it goes: directly from your device to your Google Drive. Backups never pass through or get stored on our servers, and we cannot read them.',
      'Your control: you can disconnect at any time in the app, delete the backup from your Drive, or revoke Health OS in your Google Account permissions (myaccount.google.com/permissions).',
      'Google user data is used only to provide the backup and restore feature. It is not used for advertising, sold, or shared with anyone else, and no humans read it.',
      'Health OS\u2019s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.',
    ],
  },
  {
    title: 'Crash reports',
    body: [
      'To fix bugs, the app may send crash reports through Sentry and Google Firebase Crashlytics. A report contains: a random install ID (not linked to your identity), app version, Android version, device model, the name of the screen you were on, an error code and technical stack trace. File paths are removed from reports before sending. Reports do not include your medications, schedules, photos or other health entries.',
      'Crash reporting can be switched off remotely by us. If you are offline, reports are queued on your device and sent later.',
    ],
  },
  {
    title: 'Permissions',
    body: ['Android permissions the app requests and why:'],
    list: [
      'Notifications, exact alarms, full-screen intent, display over other apps, wake lock and vibrate: to deliver dose reminders reliably, including the alarm screen.',
      'Receive boot completed: to restore your reminders after the phone restarts.',
      'Internet and Google account (optional): to search medicine catalogs and, if you choose, back up to Google Drive.',
      'Camera (optional): to photograph a pill. Photos are saved only in app-private storage.',
    ],
  },
  {
    title: 'Backups and deletion',
    body: [
      'Your on-device data is removed when you clear the app data or uninstall it. A Google Drive backup is not removed by this; delete it from your Drive or from within the app. If Android’s own Google backup is enabled on your phone, your device may back up and restore app data under Google’s terms; Health OS does not control that.',
      'Because we hold none of your health data, we cannot access, export or delete it for you — you control it from your device and your own Google Drive.',
    ],
  },
  {
    title: 'Children',
    body: [
      'Health OS is not directed at children under 13 and does not knowingly collect personal information from them.',
    ],
  },
  {
    title: 'Not medical advice',
    body: [
      'Health OS is a reminder and tracking tool. It does not provide medical advice, diagnosis or treatment. Always follow your doctor’s instructions.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'If we change this policy we will update the date above and publish the new version on this page.',
    ],
  },
];

export function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" updated={LAST_UPDATED} sections={SECTIONS} />;
}
