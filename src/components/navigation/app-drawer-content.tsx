import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter, useSegments } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

import { getAppRoutePath, getMenuItemsForRole, ROLE_LABELS } from '../../constants/navigation';
import { useAuthStore } from '../../store/auth-store';
import { ZmtBrandMark } from '../branding/zmt-brand-mark';

type AppDrawerContentProps = {
  onClose: () => void;
  visible: boolean;
};

export const AppDrawerContent = ({ onClose, visible }: AppDrawerContentProps) => {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { signOut, user } = useAuthStore();
  const activeRouteName = segments[1] ?? 'dashboard';
  const userRole = user?.role ?? 'employee';
  const menuItems = getMenuItemsForRole(userRole);
  const roleSummary =
    userRole === 'employee'
      ? `${user?.assignedClinicIds.length ?? 0} clinic assignments active`
      : userRole === 'hr'
        ? `${user?.assignedClinicIds.length ?? 0} clinics in HR scope`
        : `${user?.assignedClinicIds.length ?? 0} clinics under platform control`;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Surface style={[styles.panel, { backgroundColor: '#F8FCFD' }]} elevation={4}>
          <View style={styles.contentWrap}>
            <Surface style={[styles.brandCard, { backgroundColor: theme.colors.surface }]} elevation={0}>
              <ZmtBrandMark subtitle={`${ROLE_LABELS[userRole]} workspace`} />
              <Text style={[styles.userName, { color: theme.colors.onSurface }]}>{user?.name ?? 'ZMT employee'}</Text>
              <Text style={[styles.userMeta, { color: theme.colors.onSurfaceVariant }]}>
                {user?.jobTitle ?? 'Workforce member'} · {ROLE_LABELS[userRole]}
              </Text>
            </Surface>

            <View style={styles.navWrap}>
              {menuItems.map((item) => {
                const isFocused = activeRouteName === item.route;

                return (
                  <Pressable
                    key={item.route}
                    accessibilityRole="button"
                    style={[
                      styles.item,
                      isFocused ? { backgroundColor: theme.colors.secondaryContainer } : undefined,
                    ]}
                    onPress={() => {
                      onClose();

                      if (!isFocused) {
                        router.push(getAppRoutePath(item.route));
                      }
                    }}
                  >
                    <View style={styles.itemIconWrap}>
                      <MaterialCommunityIcons
                        color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        name={item.icon as any}
                        size={22}
                      />
                    </View>
                    <View style={styles.itemCopy}>
                      <Text
                        style={[
                          styles.itemLabel,
                          {
                            color: isFocused ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={[styles.itemDescription, { color: theme.colors.onSurfaceVariant }]}>{item.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Surface style={[styles.footerCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
              <View style={styles.footerRow}>
                <MaterialCommunityIcons color={theme.colors.primary} name="shield-account-outline" size={20} />
                <Text style={[styles.footerTitle, { color: theme.colors.onSurface }]}>{roleSummary}</Text>
              </View>
              <Text style={[styles.footerCopy, { color: theme.colors.onSurfaceVariant }]}>Sidebar access is now controlled by strict RBAC, so each role only sees its operational modules.</Text>
            </Surface>

            <Pressable
              accessibilityRole="button"
              style={styles.signOutItem}
              onPress={() => {
                onClose();
                void signOut();
              }}
            >
              <MaterialCommunityIcons color={theme.colors.error} name="logout" size={22} />
              <Text style={[styles.signOutLabel, { color: theme.colors.error }]}>Sign out</Text>
            </Pressable>
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(10, 32, 40, 0.24)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  panel: {
    borderRadius: 28,
    maxWidth: 312,
    minHeight: 520,
    width: '82%',
  },
  contentWrap: {
    flex: 1,
    gap: 18,
    padding: 18,
  },
  brandCard: {
    borderRadius: 24,
    gap: 10,
    padding: 18,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  userMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  navWrap: {
    borderRadius: 24,
    gap: 2,
    overflow: 'hidden',
  },
  item: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  itemIconWrap: {
    width: 24,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  footerCard: {
    borderRadius: 22,
    gap: 8,
    padding: 16,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerCopy: {
    fontSize: 13,
    lineHeight: 20,
  },
  signOutItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signOutLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});