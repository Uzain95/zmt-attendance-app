import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { getDefaultRouteForRole } from '../../src/constants/navigation';
import { useAuthStore } from '../../src/store/auth-store';

export default function AuthLayout() {
  const theme = useTheme();
  const { isAuthenticated, isHydrated, user } = useAuthStore();

  if (!isHydrated) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.background,
          flex: 1,
          gap: 12,
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, fontWeight: '600' }}>Loading sign-in</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={user ? `/${getDefaultRouteForRole(user.role)}` : '/login'} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}