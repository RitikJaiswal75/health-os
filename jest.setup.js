jest.mock('expo-sqlite');
jest.mock('expo-file-system/legacy');
jest.mock(
  'expo-localization',
  () => ({
    getLocales: () => [{ languageTag: 'en-IN', languageCode: 'en', textDirection: 'ltr' }],
  }),
  { virtual: true },
);
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.0.1', extra: {} } },
}));
jest.mock('@sentry/react-native');
jest.mock('@react-native-firebase/app');
jest.mock('@react-native-firebase/crashlytics');
