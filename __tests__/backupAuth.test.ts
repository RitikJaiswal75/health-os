const mockGoogle = {
  configure: jest.fn(),
  hasPreviousSignIn: jest.fn(),
  signInSilently: jest.fn(),
  getTokens: jest.fn(),
  clearCachedAccessToken: jest.fn(),
};
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: mockGoogle,
  statusCodes: { SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED' },
}));

/* eslint-disable import/first */
import { BackupAuthError, getAccessToken } from '@/src/features/backup/auth';
/* eslint-enable import/first */

describe('getAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoogle.hasPreviousSignIn.mockReturnValue(true);
    mockGoogle.signInSilently.mockResolvedValue({ type: 'success' });
  });

  it('drops the cached token and returns a fresh one', async () => {
    mockGoogle.getTokens
      .mockResolvedValueOnce({ accessToken: 'expired-cached' })
      .mockResolvedValueOnce({ accessToken: 'fresh' });

    await expect(getAccessToken()).resolves.toBe('fresh');
    expect(mockGoogle.clearCachedAccessToken).toHaveBeenCalledWith('expired-cached');
  });

  it('asks for a new sign-in when the user was never signed in or the session is gone', async () => {
    mockGoogle.hasPreviousSignIn.mockReturnValue(false);
    await expect(getAccessToken()).rejects.toBeInstanceOf(BackupAuthError);

    mockGoogle.hasPreviousSignIn.mockReturnValue(true);
    mockGoogle.signInSilently.mockResolvedValue({ type: 'noSavedCredentialFound' });
    await expect(getAccessToken()).rejects.toBeInstanceOf(BackupAuthError);

    mockGoogle.signInSilently.mockRejectedValue({ code: 'SIGN_IN_REQUIRED' });
    await expect(getAccessToken()).rejects.toBeInstanceOf(BackupAuthError);
  });

  it('does not treat being offline as a sign-in problem, so background backups keep retrying', async () => {
    mockGoogle.getTokens.mockRejectedValue(new Error('Network error'));
    const error = await getAccessToken().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(BackupAuthError);
  });
});
