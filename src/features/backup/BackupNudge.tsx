import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner } from 'react-native-paper';
import { router } from 'expo-router';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import { useT } from '@/src/i18n/useT';
import { DAY_MS, STALE_SNOOZE_MS } from './constants';
import { isBackupStale } from './backupPolicy';
import { runBackup } from './backupService';
import { updateBackupState } from './backupState';
import { useBackupState } from './useBackupState';

/** Home banner: the opt-in offer for people who never set up backup, or the 7-day reminder for those who did. */
export function BackupNudge() {
  const { t } = useT();
  const [state, refresh, now] = useBackupState();
  const [busy, setBusy] = useState(false);
  if (!state) return null;

  if (!state.enabled) {
    if (state.optInDismissed) return null;
    return (
      <Nudge
        title={`${t('backup.card.title')}\n${t('backup.card.body')}`}
        actions={[
          { label: t('backup.card.later'), onPress: () => void updateBackupState({ optInDismissed: true }).then(refresh) },
          { label: t('backup.card.setup'), onPress: () => router.push('/backup') },
        ]}
      />
    );
  }

  if (!isBackupStale(state, now)) return null;
  const since = state.lastSuccessAt;
  const body =
    since === null ? t('backup.stale.never') : t('backup.stale.body', { days: Math.floor((now - since) / DAY_MS) });
  return (
    <Nudge
      title={body}
      actions={[
        { label: t('backup.stale.later'), onPress: () => void updateBackupState({ staleSnoozedUntil: Date.now() + STALE_SNOOZE_MS }).then(refresh) },
        {
          label: state.needsSignIn ? t('backup.signIn') : busy ? t('backup.running') : t('backup.stale.now'),
          onPress: () => {
            // A manual run cannot fix an expired sign-in; the backup screen can.
            if (state.needsSignIn) return router.push('/backup');
            if (busy) return;
            setBusy(true);
            // A failed manual run leaves the banner up; the backup screen shows the reason.
            void runBackup('manual').finally(() => {
              setBusy(false);
              refresh();
            });
          },
        },
      ]}
    />
  );
}

function Nudge({ title, actions }: { title: string; actions: { label: string; onPress: () => void }[] }) {
  return (
    <View style={styles.wrap}>
      <Banner visible icon="cloud-upload-outline" style={styles.banner} actions={actions}>
        {title}
      </Banner>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 8 },
  banner: { backgroundColor: healthOsTheme.colors.surfaceVariant, borderRadius: 12 },
});
