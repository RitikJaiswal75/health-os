import appJson from '../../expo.base.json';

// Play flags permissions without a core use. Photos come through the system photo picker (no
// permission), the camera takes stills only, and data lives in app-private storage.
describe('declared Android permissions', () => {
  it('does not ask for the photo library, storage or the microphone', () => {
    expect(appJson.expo.android.permissions).not.toEqual(
      expect.arrayContaining(['READ_MEDIA_IMAGES']),
    );
    for (const permission of ['READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'RECORD_AUDIO']) {
      expect(appJson.expo.android.permissions).not.toContain(permission);
    }
    const imagePicker = appJson.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-image-picker',
    ) as [string, { microphonePermission?: boolean }] | undefined;
    expect(imagePicker?.[1].microphonePermission).toBe(false);
    // Blocked, so no library manifest can add them back.
    expect(appJson.expo.android.blockedPermissions).toEqual(
      expect.arrayContaining(['android.permission.READ_MEDIA_IMAGES', 'android.permission.RECORD_AUDIO']),
    );
  });
});
