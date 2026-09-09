import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { getClinicNameById } from '../constants/clinics';
import { SwipeAction } from '../components/swipe-action';
import { captureAttendanceEvent, synchronizeQueuedAttendance } from '../services/attendance/attendance-service';
import { endFieldVisitWorkflow, reconcileCurrentPresence, startFieldVisitWorkflow } from '../services/background/geofencing';
import { useAttendanceStore } from '../store/attendance-store';
import { useAuthStore } from '../store/auth-store';
import { useClinicStore } from '../store/clinic-store';
import { zmtPalette } from '../theme';

const formatClockTime = (value?: string) => {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatHourCount = (value: number) => `${value.toFixed(1)}h`;

const statusLabelMap = {
  idle: 'Not checked in',
  'checked-in': 'Checked in',
  'field-visit': 'On field visit',
  'checked-out': 'Checked out',
} as const;

export const DashboardScreen = () => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const clinics = useClinicStore((state) => state.clinics);
  const {
    employeeName,
    employeeRole,
    todayStatus,
    currentClinicId,
    currentSessionStart,
    currentSessionEnd,
    fieldVisitSession,
    hoursWorkedToday,
    pendingSyncCount,
    isSyncing,
    automationEnabled,
    registeredGeofenceClinicIds,
    attendanceHistory,
    activeAuditSession,
    monthlyLatePolicySummary,
  } = useAttendanceStore();
  const displayName = user?.name ?? employeeName;
  const displayRole = user?.jobTitle ?? employeeRole;
  const assignedClinics = useMemo(
    () => clinics.filter((clinic) => (user?.assignedClinicIds ?? []).includes(clinic.id)),
    [clinics, user?.assignedClinicIds],
  );
  const todayKey = new Date().toISOString().slice(0, 10);
  const fieldVisitsToday = attendanceHistory[todayKey]?.fieldVisitStops?.length ?? 0;
  const currentClinicName = getClinicNameById(currentClinicId ?? user?.homeClinicId);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [isFieldVisitSubmitting, setIsFieldVisitSubmitting] = useState(false);
  const [liveClock, setLiveClock] = useState(() => Date.now());
  const [selectedFieldVisitClinicId, setSelectedFieldVisitClinicId] = useState<string | null>(null);

  useEffect(() => {
    if (todayStatus !== 'checked-in' && todayStatus !== 'field-visit') {
      return undefined;
    }

    const interval = setInterval(() => {
      setLiveClock(Date.now());
    }, 60_000);

    return () => clearInterval(interval);
  }, [todayStatus]);

  const liveHoursWorked = useMemo(() => {
    if ((todayStatus !== 'checked-in' && todayStatus !== 'field-visit') || !currentSessionStart) {
      return hoursWorkedToday;
    }

    const elapsedHours = (liveClock - new Date(currentSessionStart).getTime()) / (1000 * 60 * 60);
    return Math.max(Number(elapsedHours.toFixed(1)), 0);
  }, [currentSessionStart, hoursWorkedToday, liveClock, todayStatus]);

  const fieldVisitCandidates = useMemo(
    () => assignedClinics.filter((clinic) => clinic.id !== (currentClinicId ?? user?.homeClinicId)),
    [assignedClinics, currentClinicId, user?.homeClinicId],
  );

  useEffect(() => {
    if (fieldVisitSession) {
      setSelectedFieldVisitClinicId(fieldVisitSession.destinationClinicId);
      return;
    }

    if (!selectedFieldVisitClinicId || !fieldVisitCandidates.some((clinic) => clinic.id === selectedFieldVisitClinicId)) {
      setSelectedFieldVisitClinicId(fieldVisitCandidates[0]?.id ?? null);
    }
  }, [fieldVisitCandidates, fieldVisitSession, selectedFieldVisitClinicId]);

  const nextManualAction = todayStatus === 'checked-in' ? 'check_out' : 'check_in';

  const handleManualAttendance = async () => {
    setIsManualSubmitting(true);

    try {
      await captureAttendanceEvent({
        kind: nextManualAction,
        source: 'manual',
        metadata: { triggeredBy: 'swipe-action' },
      });
    } finally {
      setIsManualSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await Promise.all([reconcileCurrentPresence(), synchronizeQueuedAttendance()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFieldVisitToggle = async () => {
    setIsFieldVisitSubmitting(true);

    try {
      if (fieldVisitSession) {
        await endFieldVisitWorkflow();

        return;
      }

      if (!selectedFieldVisitClinicId) {
        return;
      }

      const destinationClinic = assignedClinics.find((clinic) => clinic.id === selectedFieldVisitClinicId);

      await startFieldVisitWorkflow({
        destinationClinicId: selectedFieldVisitClinicId,
        destinationClinicName: destinationClinic?.name ?? getClinicNameById(selectedFieldVisitClinicId),
        note: 'Field visit started from dashboard.',
      });
    } finally {
      setIsFieldVisitSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={theme.dark ? ['#17353D', '#1E4350'] : [zmtPalette.tealDeep, '#A6D9D4']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <AppMenuHeader
          inverse
          title={`Hello, ${displayName.split(' ')[0]}`}
          subtitle={displayRole}
          eyebrow="Dashboard"
          rightContent={
            <Chip compact icon={automationEnabled ? 'radar' : 'map-marker-off-outline'} style={styles.heroChip} textStyle={styles.heroChipText}>
              {automationEnabled ? `${registeredGeofenceClinicIds.length} geofences armed` : 'Manual fallback ready'}
            </Chip>
          }
        />

        <Surface elevation={0} style={[styles.statusHeroCard, { backgroundColor: 'rgba(248, 255, 255, 0.18)' }]}> 
          <Text style={[styles.statusLabel, { color: '#EAF7F0' }]}>{statusLabelMap[todayStatus]}</Text>
          <Text style={[styles.statusValue, { color: '#FFFFFF' }]}>{formatHourCount(liveHoursWorked)}</Text>
          <View style={styles.heroMetricsRow}>
            <View>
              <Text style={[styles.metricCaption, { color: 'rgba(255,255,255,0.72)' }]}>Checked in</Text>
              <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>{formatClockTime(currentSessionStart)}</Text>
            </View>
            <View>
              <Text style={[styles.metricCaption, { color: 'rgba(255,255,255,0.72)' }]}>Current clinic</Text>
              <Text style={[styles.metricValue, { color: '#FFFFFF' }]} numberOfLines={1}>{currentClinicName}</Text>
            </View>
            <View>
              <Text style={[styles.metricCaption, { color: 'rgba(255,255,255,0.72)' }]}>Last checkout</Text>
              <Text style={[styles.metricValue, { color: '#FFFFFF' }]}>{formatClockTime(currentSessionEnd)}</Text>
            </View>
          </View>
        </Surface>
      </LinearGradient>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Check-in control</Text>
            <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Use the swipe action if location automation misses a transition. Field Visit mode now prevents false check-outs while you move between your assigned clinics.</Text>
          </View>
          {isSyncing ? <Chip compact icon="cloud-sync">Syncing</Chip> : null}
        </View>

        {todayStatus === 'field-visit' ? (
          <Surface style={[styles.infoPanel, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
            <Text style={[styles.infoTitle, { color: theme.colors.onSurface }]}>Field visit in progress</Text>
            <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>
              {fieldVisitSession?.destinationClinicName ?? 'Assigned clinic'} is active. End the visit before final checkout so the session closes cleanly.
            </Text>
          </Surface>
        ) : (
          <SwipeAction
            hint={todayStatus === 'checked-in' ? 'Swipe right to clock out for the day.' : 'Swipe right to log your arrival manually.'}
            label={todayStatus === 'checked-in' ? 'Swipe to check out' : 'Swipe to check in'}
            loading={isManualSubmitting}
            onComplete={handleManualAttendance}
          />
        )}
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Field visit workflow</Text>
            <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>HR and employees can move between clinics without breaking attendance. Start a field visit before leaving your current clinic geofence.</Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          {fieldVisitCandidates.map((clinic) => {
            const isSelected = clinic.id === selectedFieldVisitClinicId;

            return (
              <Chip
                key={clinic.id}
                selected={isSelected}
                showSelectedOverlay
                onPress={() => setSelectedFieldVisitClinicId(clinic.id)}
              >
                {clinic.name}
              </Chip>
            );
          })}
        </View>

        <Button
          mode={fieldVisitSession ? 'contained' : 'contained-tonal'}
          onPress={handleFieldVisitToggle}
          loading={isFieldVisitSubmitting}
          disabled={!fieldVisitSession && !selectedFieldVisitClinicId}
          contentStyle={styles.fieldVisitButton}
        >
          {fieldVisitSession ? `End visit at ${fieldVisitSession.destinationClinicName}` : 'Start field visit'}
        </Button>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons color={theme.colors.primary} name="cloud-sync-outline" size={20} />
            <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Assigned clinics</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{assignedClinics.length}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.secondaryContainer }]}>
            <MaterialCommunityIcons color={theme.colors.secondary} name="timer-cog-outline" size={20} />
            <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Active audit</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{activeAuditSession ? 'Live' : '--'}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons color={theme.colors.primary} name="calendar-month-outline" size={20} />
            <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Field visits today</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{fieldVisitsToday}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.secondaryContainer }]}>
            <MaterialCommunityIcons color={theme.colors.secondary} name="account-alert-outline" size={20} />
            <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Late to leave rule</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{monthlyLatePolicySummary.lateCount}/{monthlyLatePolicySummary.leaveDeductions}</Text>
          </View>
        </View>

        <Text style={[styles.rationaleText, { color: theme.colors.onSurfaceVariant }]}>Use the drawer to open Attendance Calendar for full history, Leave Management for requests, and Profile & Settings for automation coverage across your clinic set.</Text>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: 32,
  },
  hero: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    gap: 18,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 28,
  },
  heroChip: {
    backgroundColor: zmtPalette.blueSoft,
  },
  heroChipText: {
    fontWeight: '700',
  },
  statusHeroCard: {
    borderRadius: 22,
    gap: 12,
    padding: 18,
  },
  statusLabel: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontWeight: '700',
    fontSize: 46,
    lineHeight: 50,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCaption: {
    fontWeight: '500',
    fontSize: 12,
  },
  metricValue: {
    fontWeight: '700',
    fontSize: 18,
    marginTop: 2,
  },
  card: {
    borderRadius: 24,
    gap: 16,
    marginHorizontal: 16,
    padding: 18,
  },
  infoPanel: {
    borderRadius: 20,
    gap: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 20,
  },
  sectionCopy: {
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  rationaleBox: {
    marginTop: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rationaleText: {
    fontWeight: '500',
    fontSize: 13,
    lineHeight: 21,
  },
  fieldVisitButton: {
    height: 48,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  summaryCard: {
    borderRadius: 20,
    flex: 1,
    gap: 8,
    padding: 16,
  },
  summaryLabel: {
    fontWeight: '500',
    fontSize: 12,
  },
  summaryValue: {
    fontWeight: '700',
    fontSize: 18,
  },
});