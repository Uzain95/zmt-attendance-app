import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startAttendanceSyncListener, synchronizeQueuedAttendance } from '../src/services/attendance/attendance-service';
import { getAutomationRuntimeState } from '../src/services/background/geofencing';
import { initializeOfflineQueue } from '../src/services/offline/offline-queue';
import { useAuthStore } from '../src/store/auth-store';
import { zmtDarkTheme, zmtLightTheme } from '../src/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const theme = colorScheme === 'dark' ? zmtDarkTheme : zmtLightTheme;

  useEffect(() => {
    // App-wide services hydrate once here while the route groups decide whether the user sees auth or the post-login workspace.
    void hydrateAuth();
    void initializeOfflineQueue();
    void synchronizeQueuedAttendance();
    void getAutomationRuntimeState();

    const unsubscribe = startAttendanceSyncListener();
    return () => unsubscribe();
  }, [hydrateAuth]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack
          screenOptions={{
            animation: 'fade',
            contentStyle: { backgroundColor: theme.colors.background },
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
