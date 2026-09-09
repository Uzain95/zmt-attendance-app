import { Calendar } from 'react-native-calendars';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Surface, Text, useTheme } from 'react-native-paper';

import { AppMenuHeader } from '../components/navigation/app-menu-header';
import { useAttendanceStore } from '../store/attendance-store';

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

export const AttendanceCalendarScreen = () => {
  const theme = useTheme();
  const attendanceHistory = useAttendanceStore((state) => state.attendanceHistory);

  const markedDates = Object.values(attendanceHistory).reduce<
    Record<string, { marked: true; dotColor: string; selected: boolean; selectedColor?: string }>
  >((accumulator, day) => {
    const colorByStatus = {
      present: theme.colors.primary,
      late: theme.colors.tertiary,
      absent: theme.colors.error,
      leave: theme.colors.secondary,
      'field-visit': theme.colors.secondary,
    } as const;

    accumulator[day.date] = {
      marked: true,
      dotColor: colorByStatus[day.status],
      selected: day.date === new Date().toISOString().slice(0, 10),
      selectedColor: day.date === new Date().toISOString().slice(0, 10) ? theme.colors.primaryContainer : undefined,
    };

    return accumulator;
  }, {});

  const history = Object.values(attendanceHistory).sort((left, right) => right.date.localeCompare(left.date));

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AppMenuHeader
        eyebrow="Attendance Calendar"
        title="Daily attendance history"
        subtitle="The calendar and historical logs now live on their own screen for faster scanning."
      />

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Calendar
          enableSwipeMonths
          hideExtraDays
          markedDates={markedDates}
          theme={{
            arrowColor: theme.colors.primary,
            calendarBackground: theme.colors.surface,
            dayTextColor: theme.colors.onSurface,
            monthTextColor: theme.colors.onSurface,
            textDayFontWeight: '500',
            textDayHeaderFontWeight: '700',
            textMonthFontWeight: '700',
            todayTextColor: theme.colors.primary,
          }}
        />
      </Surface>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Historical logs</Text>
        <Text style={[styles.sectionCopy, { color: theme.colors.onSurfaceVariant }]}>Each record now carries the clinic worked, plus any field visit stops captured during the shift.</Text>

        <View style={styles.listWrap}>
          {history.map((day) => (
            <View key={day.date} style={styles.row}>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{day.date}</Text>
                <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
                  {(day.clinicName ?? 'Clinic not set').toUpperCase()} · {formatClockTime(day.checkIn)} - {formatClockTime(day.checkOut)}
                </Text>
                <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
                  {day.status.toUpperCase()}
                  {day.fieldVisitStops?.length ? ` · ${day.fieldVisitStops.length} field visit stop(s)` : ''}
                </Text>
              </View>
              <Chip compact>{formatHourCount(day.hoursWorked)}</Chip>
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
    gap: 14,
    marginTop: 18,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});