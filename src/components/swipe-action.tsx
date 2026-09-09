import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type SwipeActionProps = {
  label: string;
  hint: string;
  loading?: boolean;
  onComplete: () => Promise<void> | void;
};

const THUMB_SIZE = 58;

export const SwipeAction = ({ label, hint, loading = false, onComplete }: SwipeActionProps) => {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const [success, setSuccess] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const maxTranslateX = useMemo(() => Math.max(trackWidth - THUMB_SIZE - 8, 0), [trackWidth]);

  const animateTo = (value: number, callback?: () => void) => {
    Animated.spring(translateX, {
      toValue: value,
      friction: 8,
      tension: 48,
      useNativeDriver: true,
    }).start(callback);
  };

  const resetThumb = () => {
    setSuccess(false);
    animateTo(0);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (
          _event: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => Math.abs(gestureState.dx) > 8 && !loading,
        onPanResponderMove: (
          _event: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          const nextValue = Math.min(maxTranslateX, Math.max(0, gestureState.dx));
          translateX.setValue(nextValue);
        },
        onPanResponderRelease: async (
          _event: GestureResponderEvent,
          gestureState: PanResponderGestureState,
        ) => {
          if (loading) {
            resetThumb();
            return;
          }

          const shouldComplete = gestureState.dx >= maxTranslateX * 0.82;

          if (!shouldComplete) {
            resetThumb();
            return;
          }

          animateTo(maxTranslateX, () => {
            setSuccess(true);
          });

          try {
            await onComplete();
          } finally {
            setTimeout(() => {
              resetThumb();
            }, 850);
          }
        },
      }),
    [loading, maxTranslateX, onComplete, translateX],
  );

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.track,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}
    >
      <View style={styles.copyWrap}>
        <Text variant="titleMedium" style={[styles.label, { color: theme.colors.onSurface }]}>
          {success ? 'Attendance logged' : label}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {success ? 'Your record will sync automatically if the network is unavailable.' : hint}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: success ? theme.colors.primary : theme.colors.secondary,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : success ? (
          <MaterialCommunityIcons color={theme.colors.onPrimary} name="check-bold" size={28} />
        ) : (
          <MaterialCommunityIcons color={theme.colors.onPrimary} name="arrow-right" size={26} />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: 30,
    borderWidth: 1,
    height: 74,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
  copyWrap: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 72,
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
  thumb: {
    alignItems: 'center',
    borderRadius: 29,
    height: THUMB_SIZE,
    justifyContent: 'center',
    left: 8,
    position: 'absolute',
    top: 8,
    width: THUMB_SIZE,
  },
});