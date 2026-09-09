import type {
  AttendanceDayRecord,
  AttendancePolicyDirection,
  AttendancePolicyOutcome,
  MonthlyLatePolicySummary,
} from '../../types/attendance';

type TimeWindowRule = {
  fromMinutes: number;
  toMinutes: number;
  status: AttendancePolicyOutcome;
  direction: AttendancePolicyDirection;
};

const INBOUND_RULES: TimeWindowRule[] = [
  { fromMinutes: 9 * 60 + 16, toMinutes: 10 * 60, status: 'Late', direction: 'D (In)' },
  { fromMinutes: 10 * 60 + 1, toMinutes: 11 * 60, status: 'Short Leave (Morning)', direction: 'D (In)' },
  { fromMinutes: 11 * 60 + 1, toMinutes: 13 * 60, status: 'Half Day', direction: 'D (In)' },
  { fromMinutes: 13 * 60 + 1, toMinutes: 15 * 60, status: 'Half + Short', direction: 'D (In)' },
];

const OUTBOUND_RULES: TimeWindowRule[] = [
  { fromMinutes: 15 * 60 + 1, toMinutes: 16 * 60 + 45, status: 'Short Leave (Evening)', direction: 'E (Out)' },
  { fromMinutes: 16 * 60 + 46, toMinutes: 16 * 60 + 59, status: 'Early', direction: 'E (Out)' },
];

const getDateOnly = (value?: string) => (value ? new Date(value) : undefined);

const toMinutes = (value: Date) => value.getHours() * 60 + value.getMinutes();

const findRuleForMinutes = (minutes: number, rules: TimeWindowRule[]) =>
  rules.find((rule) => minutes >= rule.fromMinutes && minutes <= rule.toMinutes);

export const classifyAttendancePolicy = (record: Pick<AttendanceDayRecord, 'date' | 'checkIn' | 'checkOut' | 'status'>) => {
  const recordDate = new Date(`${record.date}T00:00:00`);
  const dayOfWeek = recordDate.getDay();
  const checkInDate = getDateOnly(record.checkIn);
  const checkOutDate = getDateOnly(record.checkOut);

  if (dayOfWeek === 0) {
    return {
      direction: undefined,
      status: 'Sunday (Off)' as AttendancePolicyOutcome,
    };
  }

  if (!checkInDate && !checkOutDate) {
    return {
      direction: undefined,
      status: record.status === 'leave' ? ('Leave' as AttendancePolicyOutcome) : ('Leave' as AttendancePolicyOutcome),
    };
  }

  if (!checkInDate || !checkOutDate) {
    return {
      direction: undefined,
      status: 'Missing Punch' as AttendancePolicyOutcome,
    };
  }

  const inboundRule = findRuleForMinutes(toMinutes(checkInDate), INBOUND_RULES);

  if (inboundRule) {
    return {
      direction: inboundRule.direction,
      status: inboundRule.status,
    };
  }

  const outboundRule = findRuleForMinutes(toMinutes(checkOutDate), OUTBOUND_RULES);

  if (outboundRule) {
    return {
      direction: outboundRule.direction,
      status: outboundRule.status,
    };
  }

  return {
    direction: undefined,
    status: 'Present' as AttendancePolicyOutcome,
  };
};

export const calculateMonthlyLateLeaveSummary = (records: Record<string, AttendanceDayRecord>): MonthlyLatePolicySummary => {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
  const recordsThisMonth = Object.values(records).filter((record) => record.date.startsWith(monthKey));
  const lateCount = recordsThisMonth.filter((record) => classifyAttendancePolicy(record).status === 'Late').length;
  const leaveDeductions = Math.floor(lateCount / 3);

  return {
    monthKey,
    lateCount,
    leaveDeductions,
    remainingLateBalance: lateCount % 3,
  };
};