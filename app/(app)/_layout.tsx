import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect } from 'expo-router';
import { Stack } from 'expo-router';
import { useSegments } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { AppDrawerContent } from '../../src/components/navigation/app-drawer-content';
import { AppNavigationProvider } from '../../src/components/navigation/app-navigation-context';
import { getAppRoutePath, getDefaultRouteForRole, isRouteAllowedForRole } from '../../src/constants/navigation';
import { useAuthStore } from '../../src/store/auth-store';
import { zmtPalette } from '../../src/theme';

export default function AppLayout() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const segments = useSegments();

  const navigationMenuValue = useMemo(
    () => ({
      closeMenu: () => setIsMenuVisible(false),
      openMenu: () => setIsMenuVisible(true),
    }),
    [],
  );

  if (!isHydrated) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: zmtPalette.canvas,
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={zmtPalette.tealDeep} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const defaultRoute = getDefaultRouteForRole(user.role);
  const activeRouteName = typeof segments[1] === 'string' ? segments[1] : defaultRoute;

  if (!isRouteAllowedForRole(user.role, activeRouteName)) {
    return <Redirect href={getAppRoutePath(defaultRoute)} />;
  }

  return (
    <AppNavigationProvider value={navigationMenuValue}>
      <View style={{ backgroundColor: zmtPalette.canvas, flex: 1 }}>
        <Stack
          screenOptions={{
            animation: 'fade',
            contentStyle: { backgroundColor: zmtPalette.canvas },
            headerShown: false,
          }}
        >
          {/* Post-login workflows stay split into dedicated routes, but the sidebar is now a custom in-app surface instead of a dependency on the broken drawer package export. */}
          <Stack.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
            }}
          />
          <Stack.Screen
            name="attendance-calendar"
            options={{
              title: 'Attendance Calendar',
            }}
          />
          <Stack.Screen
            name="leave-management"
            options={{
              title: 'Leave Management',
            }}
          />
          <Stack.Screen
            name="profile-settings"
            options={{
              title: 'Profile & Settings',
            }}
          />
          <Stack.Screen
            name="hr-attendance-overview"
            options={{
              title: 'HR Attendance Overview',
            }}
          />
          <Stack.Screen
            name="hr-leave-anomalies"
            options={{
              title: 'HR Leave & Anomalies',
            }}
          />
          <Stack.Screen
            name="active-field-visits-map"
            options={{
              title: 'Active Field Visits Map',
            }}
          />
          <Stack.Screen
            name="superadmin-clinic-management"
            options={{
              title: 'Clinic Management',
            }}
          />
          <Stack.Screen
            name="superadmin-geofence-control"
            options={{
              title: 'Geofence Control',
            }}
          />
        </Stack>

        <AppDrawerContent visible={isMenuVisible} onClose={() => setIsMenuVisible(false)} />
      </View>
    </AppNavigationProvider>
  );
}