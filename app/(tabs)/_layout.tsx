import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { healthOsNavigationTheme } from '@/src/core/theme/navigationTheme';
import { healthOsTheme } from '@/src/core/theme/paperTheme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: healthOsTheme.colors.primary,
        tabBarInactiveTintColor: healthOsTheme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: healthOsTheme.colors.surface,
          borderTopColor: healthOsTheme.colors.outline,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        sceneStyle: { backgroundColor: healthOsNavigationTheme.colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Medications',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="pill" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
