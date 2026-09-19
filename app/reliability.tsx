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
        {blocked ? 'Enable reminders' : 'Reminders ready'}
      </Text>

      {!nativeLinked && (
        <Text style={styles.warning} accessibilityRole="alert">
          Alarm module is not loaded. Rebuild the app with `npm run android` after these changes,
          then return here.
        </Text>
      )}

      {blocked ? (
        <Text style={styles.body} accessibilityRole="alert">
          {isPreAddFlow
            ? 'Health OS needs notifications and exact alarms before you add a medication, so it can remind you on time.'
            : blocked}
        </Text>
      ) : (
        <Text style={styles.body}>
          {isPreAddFlow
            ? 'Reminder permissions look good. You can add your medication now.'
            : 'Reminder permissions look good.'}
        </Text>
      )}

      {recommended && !blocked && (
        <Text style={styles.recommended} accessibilityRole="alert">
          {recommended}
        </Text>
      )}

      {state && (
        <View style={styles.checklist}>
          <PermissionRow label="Notifications" granted={state.notifications} />
          <PermissionRow label="Exact alarms" granted={state.exactAlarm} />
          <PermissionRow label="Full-screen alarms" granted={state.fullScreenIntent} />
          <PermissionRow label="Display over other apps" granted={state.overlay} />
        </View>
      )}

      {(blocked || recommended) && (
        <>
          {!state?.notifications && (
            <ReliabilityButton
              action="notifications"
              nextAction={nextAction}
              onPress={() => runPermissionAction(() => ensureNotificationSetup())}
              accessibilityLabel="Enable notifications"
            >
              Enable notifications
            </ReliabilityButton>
          )}
          {!state?.exactAlarm && (
            <ReliabilityButton
              action="exact_alarm"
              nextAction={nextAction}
              onPress={() => openNativeSetting('exact_alarm')}
              accessibilityLabel="Enable exact alarms"
            >
              Enable exact alarms
            </ReliabilityButton>
          )}
          {!state?.fullScreenIntent && (
            <ReliabilityButton
              action="full_screen_intent"
              nextAction={nextAction}
              onPress={() => openNativeSetting('full_screen_intent')}
              accessibilityLabel="Enable full screen intent"
            >
              Enable full-screen alarms
            </ReliabilityButton>
          )}
          {!state?.overlay && (
            <ReliabilityButton
              action="overlay"
              nextAction={nextAction}
              onPress={() => openNativeSetting('overlay')}
              accessibilityLabel="Open overlay settings"
            >
              Display over other apps
            </ReliabilityButton>
          )}
          <ReliabilityButton
            action="check_again"
            nextAction={nextAction}
            onPress={() => void handleCheckAgain()}
            loading={checkingAgain}
            disabled={checkingAgain}
            accessibilityLabel="Check permissions again"
          >
            Check again
          </ReliabilityButton>
        </>
      )}

      {blocked ? (
        <ReliabilityButton
          action="check_again"
          nextAction={nextAction}
          onPress={handleBack}
          style={styles.continueBtn}
          accessibilityLabel="Go back"
        >
          Back
        </ReliabilityButton>
      ) : (
        <ReliabilityButton
          action="continue"
          nextAction={nextAction}
          onPress={handleContinue}
          style={styles.continueBtn}
          accessibilityLabel={isPreAddFlow ? 'Continue to add medication' : 'Continue to home'}
        >
          {isPreAddFlow ? 'Add medication' : 'Go to home'}
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
