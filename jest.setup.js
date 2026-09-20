jest.mock('expo-sqlite');
jest.mock('expo-file-system/legacy');
jest.mock(
  'expo-localization',
  () => ({
    getLocales: () => [{ languageTag: 'en-IN', languageCode: 'en', textDirection: 'ltr' }],
  }),
  { virtual: true },
);
