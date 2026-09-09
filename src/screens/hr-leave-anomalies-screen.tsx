import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { useAttendanceStore } from '../store/attendance-store';
import { useAuthStore } from '../store/auth-store';

const issueLabels = {
  'late-arrival': 'Late arrival',
  'missed-checkout': 'Missed checkout',
  'outside-geofence': 'Outside geofence',
  'manual-override': 'Manual override',
} as const;

export const HrLeaveAnomaliesScreen = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const leaveRequests = useAttendanceStore((state) => state.leaveRequests);
  const attendanceAnomalies = useAttendanceStore((state) => state.attendanceAnomalies);
  const approveLeaveRequest = useAttendanceStore((state) => state.approveLeaveRequest);
  const rejectLeaveRequest = useAttendanceStore((state) => state.rejectLeaveRequest);
  const resolveAnomaly = useAttendanceStore((state) => state.resolveAnomaly);

  const visibleLeaveRequests = leaveRequests.filter(
    (request) => request.status === 'Pending' && ((user?.assignedClinicIds ?? []).includes(request.clinicId) || user?.accessScope === 'all-clinics'),
  );
  const visibleAnomalies = attendanceAnomalies.filter(
    (anomaly) => (user?.assignedClinicIds ?? []).includes(anomaly.clinicId) || user?.accessScope === 'all-clinics',
  );

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppMenuHeader
        eyebrow="HR Leave & Anomalies"
        title="Resolve attendance exceptions"
        subtitle="Pending leave and anomaly queues are centralized here so HR can unblock payroll and compliance decisions quickly."
      />

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Pending leave approvals</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Approve or reject requests across the clinics under your scope.</Text>

        <View style={styles.listWrap}>
          {visibleLeaveRequests.map((request) => (
            <View key={request.id} style={[styles.rowCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.rowHeader}>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{request.employeeName}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
                    {request.type} · {request.startDate} to {request.endDate}
                  </Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>{request.clinicName}</Text>
                </View>
                <Chip compact>{request.status}</Chip>
              </View>

              {request.note ? <Text style={[styles.rowNote, { color: theme.colors.onSurfaceVariant }]}>{request.note}</Text> : null}

              <View style={styles.buttonRow}>
                <Button mode="contained" onPress={() => approveLeaveRequest(request.id, 'Approved by HR operations.')}>Approve</Button>
                <Button mode="outlined" onPress={() => rejectLeaveRequest(request.id, 'Coverage unavailable for selected dates.')}>Reject</Button>
              </View>
            </View>
          ))}
        </View>
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Attendance anomalies</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Use this queue to close missed checkouts, late arrivals, and geofence exceptions before they become payroll disputes.</Text>

        <View style={styles.listWrap}>
          {visibleAnomalies.map((anomaly) => (
            <View key={anomaly.id} style={[styles.rowCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View style={styles.rowHeader}>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{anomaly.employeeName}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>{anomaly.clinicName} · {anomaly.date}</Text>
                </View>
                <Chip compact>{anomaly.status}</Chip>
              </View>

              <View style={styles.anomalyLabelRow}>
                <MaterialCommunityIcons color={theme.colors.primary} name="alert-octagon-outline" size={18} />
                <Text style={[styles.rowMeta, { color: theme.colors.onSurface }]}>{issueLabels[anomaly.issue]}</Text>
              </View>

              <Text style={[styles.rowNote, { color: theme.colors.onSurfaceVariant }]}>{anomaly.note}</Text>

              <Button mode="contained-tonal" onPress={() => resolveAnomaly(anomaly.id, 'Resolved by HR after review.')}>Mark resolved</Button>
            </View>
          ))}
        </View>
      </Surface>
    </ScrollView>
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
  listWrap: {
    gap: 12,
    marginTop: 18,
  },
  rowCard: {
    borderRadius: 22,
    gap: 12,
    padding: 16,
  },
  rowHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
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
    lineHeight: 18,
    marginTop: 4,
  },
  rowNote: {
    fontSize: 13,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  anomalyLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});