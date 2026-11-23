import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { DRIVE_APPDATA_SCOPE, GOOGLE_WEB_CLIENT_ID } from './constants';

export class BackupAuthError extends Error {}

let configured = false;
function configure(): void {
  if (configured) return;
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, scopes: [DRIVE_APPDATA_SCOPE] });
  configured = true;
}

/** Interactive: shows the Google account picker and the Drive consent screen. Null if cancelled. */
export async function signInInteractive(): Promise<{ email: string } | null> {
  configure();
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();
  if (result.type !== 'success') return null;
  const user = result.data.user;
  if (!result.data.scopes.includes(DRIVE_APPDATA_SCOPE)) {
    const added = await GoogleSignin.addScopes({ scopes: [DRIVE_APPDATA_SCOPE] });
    if (!added || added.type !== 'success') return null;
  }
  return { email: user.email };
}

/** Silent, for background runs: no UI. Throws BackupAuthError when the user must sign in again. */
export async function getAccessToken(): Promise<string> {
  configure();
  try {
    if (!GoogleSignin.hasPreviousSignIn()) throw new BackupAuthError('Not signed in');
    const silent = await GoogleSignin.signInSilently();
    if (silent.type !== 'success') throw new BackupAuthError('Sign-in expired');
    // Android caches the token and can hand back an expired one: drop it and ask again for a fresh one.
    await GoogleSignin.clearCachedAccessToken((await GoogleSignin.getTokens()).accessToken);
    return (await GoogleSignin.getTokens()).accessToken;
  } catch (error) {
    // Only a real sign-in problem stops background backups. Offline or a Play Services hiccup is retried.
    if ((error as { code?: string }).code === statusCodes.SIGN_IN_REQUIRED) throw new BackupAuthError('Sign-in required');
    throw error;
  }
}

export async function signOut(): Promise<void> {
  configure();
  await GoogleSignin.signOut().catch(() => undefined);
}
