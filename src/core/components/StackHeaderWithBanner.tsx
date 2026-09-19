import { Appbar } from 'react-native-paper';
import { ReminderPermissionBanner } from '@/src/core/components/ReminderPermissionBanner';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export function StackHeaderWithBanner({
  navigation,
  options,
}: {
  navigation: { canGoBack: () => boolean; goBack: () => void };
  options: Record<string, unknown>;
}) {
  const headerStyle = options.headerStyle as { backgroundColor?: string } | null | undefined;
  const backgroundColor = headerStyle?.backgroundColor ?? healthOsTheme.colors.surface;
  const tintColor = (options.headerTintColor as string | undefined) ?? healthOsTheme.colors.onSurface;
  const title = (options.title as string | undefined) ?? '';

  return (
    <>
      <Appbar.Header style={{ backgroundColor }}>
        {navigation.canGoBack() ? (
          <Appbar.BackAction onPress={navigation.goBack} color={tintColor} />
        ) : null}
        <Appbar.Content
          title={title}
          color={tintColor}
          titleStyle={options.headerTitleStyle as object | undefined}
        />
      </Appbar.Header>
      <ReminderPermissionBanner />
    </>
  );
}
