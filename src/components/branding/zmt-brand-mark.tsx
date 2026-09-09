import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

type ZmtBrandMarkProps = {
  subtitle?: string;
};

export const ZmtBrandMark = ({ subtitle }: ZmtBrandMarkProps) => {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.secondaryContainer }]}> 
        <MaterialCommunityIcons color={theme.colors.primary} name="office-building-marker-outline" size={24} />
      </View>
      <View style={styles.copyWrap}>
        <Text style={[styles.wordmark, { color: theme.colors.onSurface }]}>ZMT</Text>
        <Text style={[styles.submark, { color: theme.colors.onSurfaceVariant }]}>Workforce</Text>
        {subtitle ? <Text style={[styles.caption, { color: theme.colors.onSurfaceVariant }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  copyWrap: {
    gap: 2,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  submark: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
  },
});