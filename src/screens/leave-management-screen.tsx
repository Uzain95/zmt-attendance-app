import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Divider, SegmentedButtons, Surface, Text, TextInput, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { useAuthStore } from '../store/auth-store';
import { useAttendanceStore } from '../store/attendance-store';
import type { LeaveType } from '../types/attendance';

export const LeaveManagementScreen = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const leaveRequests = useAttendanceStore((state) => state.leaveRequests);
  const submitLeaveRequest = useAttendanceStore((state) => state.submitLeaveRequest);
  const personalLeaveRequests = leaveRequests.filter((request) => request.employeeId === (user?.id ?? 'user-ada-okafor'));

  const [leaveType, setLeaveType] = useState<LeaveType>('Casual');
  const [leaveStartDate, setLeaveStartDate] = useState('2026-04-16');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-04-16');
  const [leaveNote, setLeaveNote] = useState('');

  const handleSubmitLeave = () => {
    submitLeaveRequest({
      type: leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      note: leaveNote.trim() || undefined,
    });

    setLeaveNote('');
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppMenuHeader
        eyebrow="Leave Management"
        title="Plan and track leave"
        subtitle="Employees manage their own leave here, while HR handles approvals and anomalies in a separate operations workspace."
      />

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>New request</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Submit time off without mixing leave controls into the dashboard’s core attendance flow.</Text>

        <SegmentedButtons
          density="small"
          value={leaveType}
          onValueChange={(value) => setLeaveType(value as LeaveType)}
          style={styles.segmentedButtons}
          buttons={[
            { label: 'Sick', value: 'Sick' },
            { label: 'Casual', value: 'Casual' },
            { label: 'Annual', value: 'Annual' },
          ]}
        />

        <View style={styles.formRow}>
          <TextInput label="Start date" mode="outlined" value={leaveStartDate} onChangeText={setLeaveStartDate} style={styles.input} />
          <TextInput label="End date" mode="outlined" value={leaveEndDate} onChangeText={setLeaveEndDate} style={styles.input} />
        </View>

        <TextInput label="Reason" mode="outlined" value={leaveNote} onChangeText={setLeaveNote} multiline numberOfLines={4} style={styles.textArea} />

        <Button mode="contained" onPress={handleSubmitLeave} contentStyle={styles.primaryButton} style={styles.primaryButtonWrap}>
          Request leave
        </Button>
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Request history</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Your submitted requests are filtered from the shared company dataset, so HR approvals reflect back here automatically.</Text>

        <Divider style={styles.divider} />

        <View style={styles.historyWrap}>
          {personalLeaveRequests.map((request) => (
            <View key={request.id} style={styles.historyRow}>
              <View style={styles.historyCopy}>
                <Text style={[styles.historyTitle, { color: theme.colors.onSurface }]}>{request.type} leave</Text>
                <Text style={[styles.historyMeta, { color: theme.colors.onSurfaceVariant }]}>
                  {request.startDate} to {request.endDate} · {request.clinicName}
                </Text>
                {request.note ? <Text style={[styles.historyMeta, { color: theme.colors.onSurfaceVariant }]}>{request.note}</Text> : null}
              </View>
              <Chip compact>{request.status}</Chip>
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
  segmentedButtons: {
    marginTop: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  input: {
    flex: 1,
  },
  textArea: {
    marginTop: 14,
  },
  primaryButtonWrap: {
    marginTop: 16,
  },
  primaryButton: {
    height: 50,
  },
  divider: {
    marginVertical: 16,
  },
  historyWrap: {
    gap: 14,
  },
  historyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  historyCopy: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyMeta: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 2,
  },
});