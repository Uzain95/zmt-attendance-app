import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { useAttendanceStore } from '../store/attendance-store';
import { useAuthStore } from '../store/auth-store';

export const HrAttendanceOverviewScreen = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const companyAttendance = useAttendanceStore((state) => state.companyAttendance);

  const visibleSnapshots = companyAttendance.filter((snapshot) =>
    user?.accessScope === 'all-clinics' ? true : (user?.assignedClinicIds ?? []).includes(snapshot.clinicId),
  );

  const totals = visibleSnapshots.reduce(
    (accumulator, snapshot) => ({
      activeClinics: accumulator.activeClinics + 1,
      checkedIn: accumulator.checkedIn + snapshot.checkedInCount,
      fieldVisits: accumulator.fieldVisits + snapshot.fieldVisitCount,
      anomalies: accumulator.anomalies + snapshot.openAnomalies,
      pendingLeave: accumulator.pendingLeave + snapshot.pendingLeaveCount,
    }),
    { activeClinics: 0, checkedIn: 0, fieldVisits: 0, anomalies: 0, pendingLeave: 0 },
  );

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppMenuHeader
        eyebrow="HR Attendance Overview"
        title="Regional attendance command"
        subtitle="Track clinic staffing, late arrivals, field visits, and pending leave across your HR scope."
      />

      <View style={styles.summaryRow}>
        <SummaryCard icon="hospital-building" label="Active clinics" tone={theme.colors.primaryContainer} value={`${totals.activeClinics}`} />
        <SummaryCard icon="account-check-outline" label="Checked in" tone={theme.colors.secondaryContainer} value={`${totals.checkedIn}`} />
      </View>

      <View style={styles.summaryRow}>
        <SummaryCard icon="car-connected" label="Field visits" tone={theme.colors.primaryContainer} value={`${totals.fieldVisits}`} />
        <SummaryCard icon="alert-circle-outline" label="Open anomalies" tone={theme.colors.secondaryContainer} value={`${totals.anomalies}`} />
      </View>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Clinic coverage</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Each row shows the live staffing position for one clinic so HR can escalate anomalies before end-of-day reconciliation.</Text>

        <View style={styles.listWrap}>
          {visibleSnapshots.map((snapshot) => (
            <View key={snapshot.clinicId} style={[styles.rowCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.rowHeader}>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{snapshot.clinicName}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>{snapshot.region}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.primary }]}>{snapshot.checkedInCount}/{snapshot.scheduledEmployees}</Text>
              </View>

              <View style={styles.metricsRow}>
                <MetricPill label="Late" value={`${snapshot.lateCount}`} />
                <MetricPill label="Absent" value={`${snapshot.absentCount}`} />
                <MetricPill label="Leave" value={`${snapshot.pendingLeaveCount}`} />
                <MetricPill label="Anomalies" value={`${snapshot.openAnomalies}`} />
              </View>
            </View>
          ))}
        </View>
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Workload note</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Pending leave requests across your scope: {totals.pendingLeave}. Field visits currently active: {totals.fieldVisits}. Open the Leave & Anomalies screen to resolve issues quickly.</Text>
      </Surface>
    </ScrollView>
  );
};

type SummaryCardProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  tone: string;
  value: string;
};

const SummaryCard = ({ icon, label, tone, value }: SummaryCardProps) => {
  const theme = useTheme();

  return (
    <Surface style={[styles.summaryCard, { backgroundColor: tone }]} elevation={0}>
      <MaterialCommunityIcons color={theme.colors.primary} name={icon} size={22} />
      <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </Surface>
  );
};

type MetricPillProps = {
  label: string;
  value: string;
};

const MetricPill = ({ label, value }: MetricPillProps) => {
  const theme = useTheme();

  return (
    <View style={[styles.metricPill, { borderColor: theme.colors.outlineVariant ?? theme.colors.outline }]}>
      <Text style={[styles.metricPillLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[styles.metricPillValue, { color: theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    borderRadius: 22,
    flex: 1,
    gap: 8,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '700',
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
  listWrap: {
    gap: 12,
    marginTop: 18,
  },
  rowCard: {
    borderRadius: 22,
    gap: 14,
    padding: 16,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  rowValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricPill: {
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricPillLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricPillValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
});