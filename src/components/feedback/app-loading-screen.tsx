import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type AppLoadingScreenProps = {
  label: string;
};

export const AppLoadingScreen = ({ label }: AppLoadingScreenProps) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <ActivityIndicator color={theme.colors.primary} size="large" />
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});