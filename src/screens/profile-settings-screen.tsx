import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { ROLE_LABELS } from '../constants/navigation';
import { PERMISSION_RATIONALE } from '../constants/office';
import { synchronizeQueuedAttendance } from '../services/attendance/attendance-service';
import {
  reconcileCurrentPresence,
  requestAttendanceAutomationPermissions,
  startAttendanceAutomation,
} from '../services/background/geofencing';
import { useAttendanceStore } from '../store/attendance-store';
import { useAuthStore } from '../store/auth-store';
import { useClinicStore } from '../store/clinic-store';

export const ProfileSettingsScreen = () => {
  const theme = useTheme();
  const { biometricEnabled, provider, signOut, user } = useAuthStore();
  const clinics = useClinicStore((state) => state.clinics);
  const { automationEnabled, automationPermission, isSyncing, pendingSyncCount, registeredGeofenceClinicIds } = useAttendanceStore();
  const [isEnablingAutomation, setIsEnablingAutomation] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const assignedClinics = clinics.filter((clinic) => (user?.assignedClinicIds ?? []).includes(clinic.id));

  const handleEnableAutomation = async () => {
    setIsEnablingAutomation(true);

    try {
      const granted = await requestAttendanceAutomationPermissions();

      if (!granted) {
        return;
      }

      await startAttendanceAutomation();
      await reconcileCurrentPresence();
    } finally {
      setIsEnablingAutomation(false);
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);

    try {
      await synchronizeQueuedAttendance();
      await reconcileCurrentPresence();
    } finally {
      setIsManualSyncing(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppMenuHeader
        eyebrow="Profile & Settings"
        title="Automation and preferences"
        subtitle="Role scope, clinic access, and automation health are consolidated here for every workspace."
      />

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Profile</Text>
        <View style={styles.infoWrap}>
          <InfoRow icon="account-circle-outline" label="Name" value={user?.name ?? 'Ada Okafor'} />
          <InfoRow icon="briefcase-outline" label="Job title" value={user?.jobTitle ?? 'Clinic Operations Associate'} />
          <InfoRow icon="shield-account-outline" label="System role" value={ROLE_LABELS[user?.role ?? 'employee']} />
          <InfoRow icon="hospital-building" label="Clinic scope" value={`${assignedClinics.length} clinics`} />
          <InfoRow icon="shield-account-outline" label="Provider" value={provider ?? 'password'} />
          <InfoRow icon="fingerprint" label="Biometrics" value={biometricEnabled ? 'Enabled' : 'Disabled'} />
        </View>
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Attendance automation</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>{PERMISSION_RATIONALE.body}</Text>

        <View style={[styles.noticeCard, { backgroundColor: theme.colors.secondaryContainer }]}> 
          <MaterialCommunityIcons color={theme.colors.secondary} name="radar" size={20} />
          <Text style={[styles.noticeCopy, { color: theme.colors.onSurface }]}>Permission state: {automationPermission}. {PERMISSION_RATIONALE.geofenceHint}</Text>
        </View>

        <View style={styles.infoWrap}>
          <InfoRow icon="map-marker-radius-outline" label="Automation" value={automationEnabled ? 'Active' : 'Manual fallback ready'} />
          <InfoRow icon="vector-polyline" label="Registered geofences" value={`${registeredGeofenceClinicIds.length}`} />
          <InfoRow icon="cloud-sync-outline" label="Pending sync" value={`${pendingSyncCount}`} />
          <InfoRow icon="autorenew" label="Background sync" value={isSyncing ? 'Running' : 'Idle'} />
        </View>

        <Button mode="contained" onPress={handleEnableAutomation} loading={isEnablingAutomation} disabled={automationEnabled || isEnablingAutomation} contentStyle={styles.primaryButton} style={styles.buttonSpacing}>
          {automationEnabled ? 'Automation enabled' : 'Enable automation'}
        </Button>

        <Button mode="contained-tonal" onPress={handleManualSync} loading={isManualSyncing} contentStyle={styles.secondaryButton} style={styles.buttonSpacing}>
          Sync queued attendance
        </Button>
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Assigned clinics</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Automation registration prioritizes your home clinic plus the nearest permitted clinics if the OS background limit is reached.</Text>

        <View style={styles.infoWrap}>
          {assignedClinics.map((clinic) => (
            <InfoRow key={clinic.id} icon="map-marker-outline" label={clinic.code} value={clinic.name} />
          ))}
        </View>
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Account actions</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>This screen now owns deeper account and access controls so each role workspace can stay focused on operations.</Text>

        <Button mode="outlined" onPress={() => void signOut()} contentStyle={styles.secondaryButton} style={styles.buttonSpacing}>
          Sign out
        </Button>
      </Surface>
    </ScrollView>
  );
};

type InfoRowProps = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
};

const InfoRow = ({ icon, label, value }: InfoRowProps) => {
  const theme = useTheme();

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelWrap}>
        <MaterialCommunityIcons color={theme.colors.primary} name={icon} size={18} />
        <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 24,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  sectionCopy: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    marginTop: 6,
  },
  infoWrap: {
    gap: 14,
    marginTop: 16,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  noticeCard: {
    borderRadius: 20,
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    padding: 14,
  },
  noticeCopy: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 21,
  },
  buttonSpacing: {
    marginTop: 14,
  },
  primaryButton: {
    height: 50,
  },
  secondaryButton: {
    height: 48,
  },
});