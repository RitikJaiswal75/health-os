import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { AppLaunchScreen } from '@/src/core/components/AppLaunchScreen';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';
import { updateBackupState } from './backupState';
import { needsRestoreChoice, restoreFromDrive } from './restoreService';

type Phase = 'checking' | 'prompt' | 'ready';

/**
 * Runs before the database opens. A fresh install (no data, no earlier choice) is offered a restore;
 * anyone with data, or who already chose, goes straight through. Signing in happens only if they tap Restore.
 */
export function RestoreGate({ children }: { children: ReactNode }) {
  const { t } = useT();
  const [phase, setPhase] = useState<Phase>('checking');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const needsChoice = await needsRestoreChoice();
      if (needsChoice) void SplashScreen.hideAsync();
      setPhase(needsChoice ? 'prompt' : 'ready');
    })().catch(() => setPhase('ready'));
  }, []);

  if (phase === 'checking') return <AppLaunchScreen />;
  if (phase === 'ready') return <>{children}</>;

  const restore = async () => {
    setBusy(true);
    setMessage(null);
    const result = await restoreFromDrive();
    setBusy(false);
    if (result.status === 'restored') setPhase('ready');
    else if (result.status === 'none') setMessage(t('backup.restore.none'));
    else setMessage(t('backup.restore.failed', { message: result.message }));
  };
  const startFresh = async () => {
    await updateBackupState({ restoreDecided: true }).catch(() => undefined);
    setPhase('ready');
  };

  return (
    <View style={styles.center}>
      <Text variant="titleLarge">{t('backup.restore.title')}</Text>
      <Text style={styles.body}>{t('backup.restore.body')}</Text>
      {message ? <Text style={styles.body}>{message}</Text> : null}
      <Button mode="contained" onPress={restore} loading={busy} disabled={busy}>
        {busy ? t('backup.restore.busy') : t('backup.restore.action')}
      </Button>
      <Button mode="text" onPress={startFresh} disabled={busy}>
        {t('backup.restore.fresh')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: healthOsTheme.colors.background,
  },
  body: { color: healthOsTheme.colors.onSurfaceVariant, textAlign: 'center' },
});
