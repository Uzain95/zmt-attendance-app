import * as LocalAuthentication from 'expo-local-authentication';

export const authenticateReturningUser = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    return { available: false, success: false };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock ZMT Attendance',
    fallbackLabel: 'Use device passcode',
    disableDeviceFallback: false,
  });

  return {
    available: true,
    success: result.success,
    error: result.success ? undefined : result.error,
  };
};