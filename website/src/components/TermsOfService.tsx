import { LegalPage, type Section } from './LegalPage';

const LAST_UPDATED = '14 November 2026';

const SECTIONS: Section[] = [
  {
    title: 'Acceptance',
    body: [
      'By installing or using Health OS you agree to these terms. If you do not agree, do not use the app. Our Privacy Policy explains how data is handled and forms part of these terms.',
    ],
  },
  {
    title: 'Not medical advice',
    body: [
      'Health OS is a reminder and record-keeping tool. It does not provide medical advice, diagnosis or treatment, and its medicine information comes from third-party public catalogs that may be incomplete or out of date. Always follow your doctor or pharmacist, and verify medicine names, doses and schedules yourself. In an emergency, contact emergency services.',
    ],
  },
  {
    title: 'Reminders are best-effort',
    body: [
      'Reminders depend on your phone: battery optimisation, Do Not Disturb, notification and alarm permissions, a dead battery or a system update can delay or block them. Do not rely on Health OS as your only means of taking critical medication on time.',
    ],
  },
  {
    title: 'Your data and Google Drive backup',
    body: [
      'You own the data you enter. It is stored on your device, and if you choose to back up, in your own Google Drive. You are responsible for keeping your device and Google account secure and for the accuracy of what you enter. Backups are your responsibility: we cannot recover lost, deleted or corrupted data, because we do not hold a copy.',
    ],
  },
  {
    title: 'Acceptable use',
    body: ['You agree not to:'],
    list: [
      'Reverse engineer, tamper with or redistribute the app in a way the licence does not allow.',
      'Use the app, our catalog API or configuration services in a way that disrupts them, such as automated scraping or overloading.',
      'Use the app for anything unlawful.',
    ],
  },
  {
    title: 'Open source and licence',
    body: [
      'Health OS source code is available on GitHub and is covered by the licence in that repository. These terms do not replace that licence for the code. Catalog data comes from NRCeS CDCI (CC BY 4.0), NIH NLM RxTerms and NIH DSLD, under their own terms. The Health OS name and logo are not licensed for use that implies endorsement.',
    ],
  },
  {
    title: 'No warranty',
    body: [
      'The app is provided "as is" and "as available", without warranties of any kind, including accuracy, reliability, availability or fitness for a particular purpose.',
    ],
  },
  {
    title: 'Limitation of liability',
    body: [
      'To the maximum extent permitted by law, the developer is not liable for any indirect, incidental or consequential damages, or for any loss of data, missed or late doses, or health outcomes arising from use of or inability to use the app. Nothing here limits liability that cannot be limited by law.',
    ],
  },
  {
    title: 'Changes and termination',
    body: [
      'We may update the app or these terms, and may stop providing online services such as the catalog API at any time. Continued use after a change means you accept it. You can stop using the app at any time by uninstalling it.',
    ],
  },
  {
    title: 'Governing law',
    body: ['These terms are governed by the laws of India, and its courts have jurisdiction over any dispute.'],
  },
];

export function TermsOfService() {
  return <LegalPage title="Terms of Service" updated={LAST_UPDATED} sections={SECTIONS} />;
}
