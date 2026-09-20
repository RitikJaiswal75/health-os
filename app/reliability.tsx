import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, type ButtonProps } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { healthOsTheme } from '@/src/core/theme/paperTheme';
import {
  ADD_MEDICATION_PATH,
  usePermissionState,
  getBlockedRemindersMessage,
  getRecommendedRemindersMessage,
  getNextPermissionAction,
  type PermissionActionKind,
} from '@/src/features/reliability/reliabilityService';
import { permissionHelper, type PermissionKind } from '@/src/core/permissions/permissionHelper';
import { ensureNotificationSetup } from '@/src/features/reminders/notificationSetup';
import { useWizardStore } from '@/src/features/medications/wizardStore';
import { useT } from '@/src/i18n/useT';

const MIN_CHECK_AGAIN_FEEDBACK_MS = 700;

type ReliabilityButtonAction = PermissionActionKind | 'check_again' | 'continue';

function isPrimaryReliabilityAction(
  action: ReliabilityButtonAction,
  nextAction: PermissionActionKind | null,
): boolean {
  if (action === 'check_again') return false;
  if (action === 'continue') return nextAction === null;
  return action === nextAction;
}

function ReliabilityButton({
  action,
  nextAction,
  style,
  ...props
}: ButtonProps & { action: ReliabilityButtonAction; nextAction: PermissionActionKind | null }) {
  const primary = isPrimaryReliabilityAction(action, nextAction);

  if (primary) {
    return <Button mode="contained" style={style} {...props} />;
  }

  return (
    <Button
      mode="outlined"
      buttonColor="#000000"
      textColor={healthOsTheme.colors.primary}
      style={[styles.secondaryButton, style]}
      {...props}
    />
  );
}

function PermissionRow({ label, granted }: { label: string; granted: boolean }) {
  return (
    <Text style={styles.row}>
      {granted ? '✓' : '○'} {label}
    </Text>
  );
}

export default function ReliabilityScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { state, refresh } = usePermissionState();
  const [checkingAgain, setCheckingAgain] = useState(false);
  const blocked = getBlockedRemindersMessage(state);
  const recommended = getRecommendedRemindersMessage(state);
  const nextAction = getNextPermissionAction(state);
  const isPreAddFlow = returnTo === ADD_MEDICATION_PATH;
  const nativeLinked = permissionHelper.isNativeAlarmModuleLinked();
  const { t } = useT();

  const runPermissionAction = useCallback(
    async (action: () => Promise<unknown>) => {
      await action();
      await refresh();
    },
    [refresh],
  );

  const openNativeSetting = useCallback(
    (kind: PermissionKind) => runPermissionAction(() => permissionHelper.request(kind)),
    [runPermissionAction],
  );

  const handleCheckAgain = useCallback(async () => {
    setCheckingAgain(true);
    try {
      await Promise.all([
        refresh(),
        new Promise<void>((resolve) => setTimeout(resolve, MIN_CHECK_AGAIN_FEEDBACK_MS)),
      ]);
    } finally {
      setCheckingAgain(false);
    }
  }, [refresh]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const handleContinue = () => {
    if (returnTo === ADD_MEDICATION_PATH) {
      useWizardStore.getState().reset();
      router.replace('/medicine/search');
      return;
    }
    router.replace('/(tabs)');
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="titleMedium" style={styles.title}>
        {blocked ? t('reliability.enable') : t('reliability.ready')}
      </Text>

      {!nativeLinked && (
        <Text style={styles.warning} accessibilityRole="alert">
          {t('reliability.moduleMissing')}
        </Text>
      )}

      {blocked ? (
        <Text style={styles.body} accessibilityRole="alert">
          {isPreAddFlow
            ? t('reliability.preAddBlocked')
            : blocked}
        </Text>
      ) : (
        <Text style={styles.body}>
          {isPreAddFlow
            ? t('reliability.preAddReady')
            : t('reliability.readyBody')}
        </Text>
      )}

      {recommended && !blocked && (
        <Text style={styles.recommended} accessibilityRole="alert">
          {recommended}
        </Text>
      )}

      {state && (
        <View style={styles.checklist}>
          <PermissionRow label={t('reliability.notifications')} granted={state.notifications} />
          <PermissionRow label={t('reliability.exactAlarms')} granted={state.exactAlarm} />
          <PermissionRow label={t('reliability.fullScreen')} granted={state.fullScreenIntent} />
          <PermissionRow label={t('reliability.overlay')} granted={state.overlay} />
        </View>
      )}

      {(blocked || recommended) && (
        <>
          {!state?.notifications && (
            <ReliabilityButton
              action="notifications"
              nextAction={nextAction}
              onPress={() => runPermissionAction(() => ensureNotificationSetup())}
              accessibilityLabel={t('reliability.enableNotifications')}
            >
              {t('reliability.enableNotifications')}
            </ReliabilityButton>
          )}
          {!state?.exactAlarm && (
            <ReliabilityButton
              action="exact_alarm"
              nextAction={nextAction}
              onPress={() => openNativeSetting('exact_alarm')}
              accessibilityLabel={t('reliability.enableExact')}
            >
              {t('reliability.enableExact')}
            </ReliabilityButton>
          )}
          {!state?.fullScreenIntent && (
            <ReliabilityButton
              action="full_screen_intent"
              nextAction={nextAction}
              onPress={() => openNativeSetting('full_screen_intent')}
              accessibilityLabel={t('reliability.enableFullScreen')}
            >
              {t('reliability.enableFullScreen')}
            </ReliabilityButton>
          )}
          {!state?.overlay && (
            <ReliabilityButton
              action="overlay"
              nextAction={nextAction}
              onPress={() => openNativeSetting('overlay')}
              accessibilityLabel={t('reliability.openOverlay')}
            >
              {t('reliability.overlay')}
            </ReliabilityButton>
          )}
          <ReliabilityButton
            action="check_again"
            nextAction={nextAction}
            onPress={() => void handleCheckAgain()}
            loading={checkingAgain}
            disabled={checkingAgain}
            accessibilityLabel={t('reliability.checkAgain')}
          >
            {t('reliability.checkAgain')}
          </ReliabilityButton>
        </>
      )}

      {blocked ? (
        <ReliabilityButton
          action="check_again"
          nextAction={nextAction}
          onPress={handleBack}
          style={styles.continueBtn}
          accessibilityLabel={t('reliability.goBack')}
        >
          {t('common.back')}
        </ReliabilityButton>
      ) : (
        <ReliabilityButton
          action="continue"
          nextAction={nextAction}
          onPress={handleContinue}
          style={styles.continueBtn}
          accessibilityLabel={isPreAddFlow ? t('reliability.continueAdd') : t('reliability.continueHome')}
        >
          {isPreAddFlow ? t('reliability.addMedication') : t('reliability.goHome')}
        </ReliabilityButton>
      )}

      <Text variant="bodySmall" style={styles.note}>
        Force-stop clears all alarms on Android. Re-open Health OS after force-stop to reschedule.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    backgroundColor: healthOsTheme.colors.background,
  },
  title: {
    color: healthOsTheme.colors.onSurface,
    fontWeight: '600',
  },
  body: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
  recommended: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 22,
  },
  warning: {
    color: '#FF9800',
    fontSize: 15,
    lineHeight: 22,
  },
  checklist: {
    gap: 4,
    paddingVertical: 4,
  },
  row: {
    color: healthOsTheme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryButton: {
    borderColor: healthOsTheme.colors.outline,
    borderWidth: 1,
  },
  continueBtn: {
    marginTop: 8,
  },
  note: {
    marginTop: 8,
    color: healthOsTheme.colors.onSurfaceVariant,
    opacity: 0.8,
  },
});
