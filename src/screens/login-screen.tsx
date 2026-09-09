import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Checkbox, Chip, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { ZmtBrandMark } from '../components/branding/zmt-brand-mark';
import { useAuthStore } from '../store/auth-store';
import { zmtPalette } from '../theme';

export const LoginScreen = () => {
  const theme = useTheme();
  const { isBusy, signInWithMicrosoft, signInWithPassword } = useAuthStore();
  const [email, setEmail] = useState('ada.okafor@zmt.example.com');
  const [password, setPassword] = useState('Password123');
  const [enableBiometric, setEnableBiometric] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoAccounts = [
    { label: 'Employee demo', email: 'ada.okafor@zmt.example.com' },
    { label: 'HR demo', email: 'hr.operations@zmt.example.com' },
    { label: 'Superadmin demo', email: 'superadmin@zmt.example.com' },
  ];

  const handlePasswordLogin = async () => {
    setErrorMessage(null);

    try {
      await signInWithPassword({ email: email.trim().toLowerCase(), password, enableBiometric });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in right now.');
    }
  };

  const handleMicrosoftLogin = async () => {
    setErrorMessage(null);

    try {
      await signInWithMicrosoft(email.trim().toLowerCase());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Microsoft sign-in is currently unavailable.');
    }
  };

  return (
    <LinearGradient
      colors={theme.dark ? ['#143036', '#17353D', '#102126'] : [zmtPalette.blueMist, zmtPalette.tealSoft, '#F8FDFF']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.screen}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.heroBlock}>
            <ZmtBrandMark subtitle="Attendance workspace" />
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Sign in to enter the employee, HR, or superadmin workspace. Your work email now determines RBAC access and clinic scope.</Text>
          </View>

          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Sign in to ZMT Attendance</Text>
            <Text style={[styles.cardCopy, { color: theme.colors.onSurfaceVariant }]}>Use a role demo below to preview the enterprise flows for employees, HR operations, and superadmin clinic management.</Text>

            <View style={styles.demoRow}>
              {demoAccounts.map((account) => (
                <Chip key={account.email} compact onPress={() => setEmail(account.email)}>
                  {account.label}
                </Chip>
              ))}
            </View>

            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Work email"
              mode="outlined"
              onChangeText={setEmail}
              value={email}
            />

            <TextInput
              autoCapitalize="none"
              label="Password"
              mode="outlined"
              onChangeText={setPassword}
              secureTextEntry
              value={password}
            />

            <View style={styles.checkboxRow}>
              <Checkbox status={enableBiometric ? 'checked' : 'unchecked'} onPress={() => setEnableBiometric((value) => !value)} />
              <Text style={[styles.checkboxCopy, { color: theme.colors.onSurfaceVariant }]}>Enable Face ID or fingerprint for returning sign-ins</Text>
            </View>

            {errorMessage ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{errorMessage}</Text> : null}

            <Button mode="contained" onPress={handlePasswordLogin} loading={isBusy} contentStyle={styles.primaryButton}>
              Sign in
            </Button>

            <Button mode="contained-tonal" onPress={handleMicrosoftLogin} loading={isBusy} contentStyle={styles.secondaryButton}>
              Continue with Microsoft
            </Button>
          </Surface>

          <Text style={[styles.footerCopy, { color: theme.colors.onSurfaceVariant }]}>Examples: employee `ada.okafor@zmt.example.com`, HR `hr.operations@zmt.example.com`, superadmin `superadmin@zmt.example.com`.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 20,
    justifyContent: 'center',
    padding: 24,
  },
  heroBlock: {
    gap: 14,
  },
  title: {
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 42,
  },
  subtitle: {
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: 28,
    gap: 16,
    padding: 24,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 22,
  },
  cardCopy: {
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkboxRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: -8,
  },
  checkboxCopy: {
    flex: 1,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontWeight: '700',
    fontSize: 13,
  },
  primaryButton: {
    height: 52,
  },
  secondaryButton: {
    height: 50,
  },
  footerCopy: {
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});