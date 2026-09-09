import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { useAppNavigationMenu } from './app-navigation-context';

type AppMenuHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  inverse?: boolean;
  rightContent?: ReactNode;
};

export const AppMenuHeader = ({ title, subtitle, eyebrow, inverse = false, rightContent }: AppMenuHeaderProps) => {
  const { openMenu } = useAppNavigationMenu();
  const theme = useTheme();

  const titleColor = inverse ? '#F8FFFF' : theme.colors.onSurface;
  const subtitleColor = inverse ? 'rgba(248, 255, 255, 0.82)' : theme.colors.onSurfaceVariant;
  const iconBackground = inverse ? 'rgba(255,255,255,0.16)' : theme.colors.surface;

  return (
    <View style={styles.row}>
      <View style={styles.leftWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={openMenu}
          style={[styles.menuButton, { backgroundColor: iconBackground }]}
        >
          <MaterialCommunityIcons color={titleColor} name="menu" size={22} />
        </Pressable>

        <View style={styles.copyWrap}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: subtitleColor }]}>{eyebrow}</Text> : null}
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text> : null}
        </View>
      </View>

      {rightContent ? <View style={styles.rightWrap}>{rightContent}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  leftWrap: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 14,
  },
  rightWrap: {
    marginTop: 6,
  },
  menuButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copyWrap: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});