import appJson from '../../expo.base.json';

// Play Console flags orientation locks; Android 16 ignores them on large screens anyway.
describe('app orientation', () => {
  it('does not lock MainActivity to portrait', () => {
    expect(appJson.expo.orientation).toBe('default');
  });
});
