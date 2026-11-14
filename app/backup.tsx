import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { useT } from '@/src/i18n/useT';
import { signInInteractive, signOut } from '@/src/features/backup/auth';
import { hasOlderBackupToReplace, runBackup } from '@/src/features/backup/backupService';
import { enableBackup, updateBackupState } from '@/src/features/backup/backupState';
import { setBackgroundBackup } from '@/src/features/backup/backupTask';
import { useBackupState } from '@/src/features/backup/useBackupState';

export default function BackupScreen() {
  const { t } = useT();
  const [state, refresh] = useBackupState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Set while the user is asked whether this phone's data may replace an older Drive backup. */
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  if (!state) return null;

  /** First consent happens here: nothing asks for a Google login before the user taps this. */
  const signInAndBackup = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const account = await signInInteractive();
      if (!account) {
        setMessage(t('backup.signInCancelled'));
        return;
      }
      // The first upload replaces the one backup in Drive: never do that silently over an older one.
      if (await hasOlderBackupToReplace(state.lastSuccessAt)) {
        setConfirmEmail(account.email);
        return;
      }
      await startBackup(account.email);
    } catch (error) {
      setMessage(t('backup.failed', { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const startBackup = async (email: string) => {
    await enableBackup(email);
    await setBackgroundBackup(true);
    await backupNow();
  };

  const confirmReplace = async () => {
    const email = confirmEmail;
    setConfirmEmail(null);
    if (!email) return;
    setBusy(true);
    try {
      await startBackup(email);
    } catch (error) {
      setMessage(t('backup.failed', { message: error instanceof Error ? error.message : String(error) }));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const cancelReplace = async () => {
    setConfirmEmail(null);
    await signOut(); // not opted in: leave no Google session behind
  };

  const backupNow = async () => {
    const outcome = await runBackup('manual');
    if (outcome.status === 'success') setMessage(t('backup.success'));
    else if (outcome.status === 'failed') setMessage(t('backup.failed', { message: outcome.message }));
    else if (outcome.status === 'skipped' && outcome.reason === 'empty') setMessage(t('backup.empty'));
  };

  const turnOff = async () => {
    await setBackgroundBackup(false);
    await signOut();
    // Sign-in stays off; the Drive copy is left in place so a later reinstall can still restore it.
    await updateBackupState({ enabled: false, email: null, needsSignIn: false });
    refresh();
  };

  const last = state.lastSuccessAt ? new Date(state.lastSuccessAt).toLocaleString() : t('backup.never');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="bodyMedium">{t('backup.intro')}</Text>
      <Text variant="bodySmall">{t('backup.privacy')}</Text>
      {state.enabled ? (
        <>
          {state.email ? <Text variant="bodyMedium">{t('backup.account', { email: state.email })}</Text> : null}
          <Text variant="bodyMedium">{t('backup.lastBackup', { when: last })}</Text>
          <Text variant="bodySmall">{t('backup.autoNote')}</Text>
          {state.needsSignIn ? (
            <>
              <Text variant="bodyMedium">{t('backup.needsSignIn')}</Text>
              <Button mode="contained" onPress={signInAndBackup} disabled={busy}>
                {t('backup.signIn')}
              </Button>
            </>
          ) : (
            <Button
              mode="contained"
              loading={busy}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                setMessage(null);
                await backupNow();
                setBusy(false);
                refresh();
              }}
            >
              {busy ? t('backup.running') : t('backup.now')}
            </Button>
          )}
          <Button mode="outlined" onPress={turnOff} disabled={busy}>
            {t('backup.disable')}
          </Button>
        </>
      ) : (
        <Button mode="contained" loading={busy} disabled={busy} onPress={signInAndBackup}>
          {t('backup.enable')}
        </Button>
      )}
      {message ? <Text variant="bodyMedium">{message}</Text> : null}
      <Portal>
        <Dialog visible={confirmEmail !== null} onDismiss={cancelReplace}>
          <Dialog.Title>{t('backup.replace.title')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('backup.replace.body')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={cancelReplace}>{t('common.cancel')}</Button>
            <Button onPress={confirmReplace}>{t('backup.replace.confirm')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 12 } });
