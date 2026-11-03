/* eslint-disable @typescript-eslint/no-require-imports */
const {
  MAX_FILE_BYTES,
  findBlockedPath,
  findContentIssues,
  lintableFiles,
} = require('../../scripts/hooks/checkStaged');

describe('pre-commit staged file checks', () => {
  it.each([
    ['.env', 'secret'],
    ['.env.local', 'secret'],
    ['.env.production', 'secret'],
    ['@ritikj1__health-os-app.jks', 'secret'],
    ['android/app/release.keystore', 'secret'],
    ['@ritikj1__health-os-app-keystore-credentials.md', 'secret'],
    ['google-services.json', 'secret'],
    ['android/app/google-services.json', 'secret'],
    ['dist/health-os-release.apk', 'artifact'],
    ['build-1793477574234.aab', 'artifact'],
  ])('blocks %s', (path, kind) => {
    expect(findBlockedPath(path, 100)).toMatch(new RegExp(kind, 'i'));
  });

  it.each([
    '.env.example',
    'src/core/dates/dateUtils.ts',
    'src/features/auth/credentialsService.ts',
    'assets/images/icon.png',
    'eas.json',
  ])(
    'allows %s',
    (path) => {
      expect(findBlockedPath(path, 100)).toBeNull();
    },
  );

  it('blocks files over the size limit', () => {
    expect(findBlockedPath('assets/video.mp4', MAX_FILE_BYTES + 1)).toMatch(/MB/);
    expect(findBlockedPath('assets/video.mp4', MAX_FILE_BYTES)).toBeNull();
  });

  it('flags merge conflict markers', () => {
    const content = ['const a = 1;', '<<<<<<< HEAD', 'const b = 2;', '=======', 'const b = 3;', '>>>>>>> main'].join('\n');
    expect(findContentIssues('src/a.ts', content)).toEqual([
      expect.stringMatching(/conflict marker.*line 2/i),
    ]);
  });

  it('flags focused tests only in test files', () => {
    // Fixtures are assembled so this file doesn't trip its own pre-commit check.
    const only = 'only';
    const content = `describe('x', () => {\n  it.${only}('y', () => {});\n});`;
    expect(findContentIssues('__tests__/x.test.ts', content)).toEqual([
      expect.stringMatching(/focused test.*line 2/i),
    ]);
    expect(findContentIssues('src/x.ts', content)).toEqual([]);
    expect(findContentIssues('__tests__/x.test.ts', `describe.${only}('x', () => {});`)).toHaveLength(1);
    expect(findContentIssues('__tests__/x.test.ts', `${'f'}it('x', () => {});`)).toHaveLength(1);
  });

  it('passes clean content', () => {
    const content = "it('works', () => {\n  expect(profit('a')).toBe(1);\n});";
    expect(findContentIssues('__tests__/x.test.ts', content)).toEqual([]);
  });

  it('selects only ts/tsx files for eslint', () => {
    expect(lintableFiles(['app/(tabs)/index.tsx', 'src/a.ts', 'scripts/a.js', 'README.md'])).toEqual([
      'app/(tabs)/index.tsx',
      'src/a.ts',
    ]);
  });
});
