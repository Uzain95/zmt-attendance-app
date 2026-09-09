import { create } from 'zustand';

import { getClinicById, getClinicNameById } from '../constants/clinics';
import { ATTENDANCE_POLICY } from '../constants/office';
import { calculateMonthlyLateLeaveSummary, classifyAttendancePolicy } from '../services/attendance/attendance-policy';
import { useAuthStore } from './auth-store';
import type {
  AttendanceAnomaly,
  AttendanceDayRecord,
  AttendanceEventKind,
  AttendanceEventPayload,
  AuditSession,
  AttendanceStatus,
  CompanyAttendanceSnapshot,
  FieldVisitSession,
  LeaveRequest,
  LeaveType,
  LiveFieldVisitTracker,
  MonthlyLatePolicySummary,
  PermissionState,
} from '../types/attendance';

type AttendanceState = {
  employeeName: string;
  employeeRole: string;
  todayStatus: AttendanceStatus;
  currentClinicId?: string;
  currentSessionStart?: string;
  currentSessionEnd?: string;
  hoursWorkedToday: number;
  pendingSyncCount: number;
  isSyncing: boolean;
  automationEnabled: boolean;
  automationPermission: PermissionState;
  registeredGeofenceClinicIds: string[];
  fieldVisitSession?: FieldVisitSession;
  activeAuditSession?: AuditSession;
  completedAuditSessions: AuditSession[];
  lastEventAt?: string;
  lastEventKind?: AttendanceEventKind;
  attendanceHistory: Record<string, AttendanceDayRecord>;
  leaveRequests: LeaveRequest[];
  companyAttendance: CompanyAttendanceSnapshot[];
  attendanceAnomalies: AttendanceAnomaly[];
  liveFieldVisitSnapshots: LiveFieldVisitTracker[];
  monthlyLatePolicySummary: MonthlyLatePolicySummary;
  applyAttendanceEvent: (event: AttendanceEventPayload) => void;
  setPendingSyncCount: (count: number) => void;
  setSyncing: (isSyncing: boolean) => void;
  setAutomationState: (permission: PermissionState, enabled: boolean) => void;
  setRegisteredGeofenceClinicIds: (clinicIds: string[]) => void;
  setLiveFieldVisitSnapshots: (snapshots: LiveFieldVisitTracker[]) => void;
  submitLeaveRequest: (draft: {
    type: LeaveType;
    startDate: string;
    endDate: string;
    note?: string;
  }) => void;
  approveLeaveRequest: (requestId: string, reviewerNote?: string) => void;
  rejectLeaveRequest: (requestId: string, reviewerNote?: string) => void;
  resolveAnomaly: (anomalyId: string, note?: string) => void;
};

const formatDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const calculateHoursWorked = (startAt: string, endAt: string) => {
  const milliseconds = new Date(endAt).getTime() - new Date(startAt).getTime();
  const hours = milliseconds / (1000 * 60 * 60);

  return Math.max(Number(hours.toFixed(1)), 0);
};

const isLateArrival = (timestamp: string) => {
  const checkInTime = new Date(timestamp);
  const threshold = new Date(checkInTime);
  threshold.setHours(
    ATTENDANCE_POLICY.officialStartHour,
    ATTENDANCE_POLICY.officialStartMinute + ATTENDANCE_POLICY.lateGraceMinutes,
    0,
    0,
  );

  return checkInTime.getTime() > threshold.getTime();
};

const createSeedHistory = () => {
  const today = new Date();
  const history: Record<string, AttendanceDayRecord> = {};
  const seededDays: Array<Omit<AttendanceDayRecord, 'date'>> = [
    {
      status: 'present',
      checkIn: '08:57',
      checkOut: '17:26',
      hoursWorked: 8.5,
      clinicId: 'clinic-03',
      clinicName: getClinicNameById('clinic-03'),
    },
    {
      status: 'late',
      checkIn: '09:18',
      checkOut: '17:41',
      hoursWorked: 8.4,
      clinicId: 'clinic-03',
      clinicName: getClinicNameById('clinic-03'),
      fieldVisitStops: [getClinicNameById('clinic-13')],
    },
    {
      status: 'present',
      checkIn: '08:49',
      checkOut: '17:13',
      hoursWorked: 8.4,
      clinicId: 'clinic-04',
      clinicName: getClinicNameById('clinic-04'),
    },
    { status: 'leave', hoursWorked: 0, clinicId: 'clinic-03', clinicName: getClinicNameById('clinic-03') },
    {
      status: 'present',
      checkIn: '08:54',
      checkOut: '17:19',
      hoursWorked: 8.4,
      clinicId: 'clinic-13',
      clinicName: getClinicNameById('clinic-13'),
    },
    { status: 'absent', hoursWorked: 0, clinicId: 'clinic-03', clinicName: getClinicNameById('clinic-03') },
  ];

  seededDays.forEach((record, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (index + 1));
    history[formatDateKey(date)] = {
      date: formatDateKey(date),
      ...record,
      checkIn: record.checkIn
        ? new Date(`${formatDateKey(date)}T${record.checkIn}:00`).toISOString()
        : undefined,
      checkOut: record.checkOut
        ? new Date(`${formatDateKey(date)}T${record.checkOut}:00`).toISOString()
        : undefined,
    };
  });

  history[formatDateKey(today)] = {
    date: formatDateKey(today),
    status: 'absent',
    hoursWorked: 0,
    clinicId: 'clinic-03',
    clinicName: getClinicNameById('clinic-03'),
  };

  return history;
};

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const createSeedLeaveRequests = (): LeaveRequest[] => [
  {
    id: 'leave-1',
    employeeId: 'user-ada-okafor',
    employeeName: 'Ada Okafor',
    clinicId: 'clinic-03',
    clinicName: getClinicNameById('clinic-03'),
    type: 'Annual',
    startDate: '2026-04-09',
    endDate: '2026-04-11',
    note: 'Family travel',
    submittedAt: '2026-04-02T10:15:00.000Z',
    status: 'Pending',
  },
  {
    id: 'leave-2',
    employeeId: 'user-ifeoma-ajayi',
    employeeName: 'Ifeoma Ajayi',
    clinicId: 'clinic-07',
    clinicName: getClinicNameById('clinic-07'),
    type: 'Sick',
    startDate: '2026-03-12',
    endDate: '2026-03-12',
    note: 'Medical appointment',
    submittedAt: '2026-03-10T08:20:00.000Z',
    status: 'Approved',
  },
  {
    id: 'leave-3',
    employeeId: 'user-emeka-nwachukwu',
    employeeName: 'Emeka Nwachukwu',
    clinicId: 'clinic-13',
    clinicName: getClinicNameById('clinic-13'),
    type: 'Casual',
    startDate: '2026-04-18',
    endDate: '2026-04-19',
    note: 'Family event coverage request',
    submittedAt: '2026-04-07T11:40:00.000Z',
    status: 'Pending',
  },
  {
    id: 'leave-4',
    employeeId: 'user-amaka-obi',
    employeeName: 'Amaka Obi',
    clinicId: 'clinic-24',
    clinicName: getClinicNameById('clinic-24'),
    type: 'Annual',
    startDate: '2026-04-22',
    endDate: '2026-04-24',
    note: 'Conference attendance',
    submittedAt: '2026-04-08T09:00:00.000Z',
    status: 'Pending',
  },
];

const createCompanySnapshots = (): CompanyAttendanceSnapshot[] => [
  {
    clinicId: 'clinic-01',
    clinicName: getClinicNameById('clinic-01'),
    region: 'Lagos Mainland',
    scheduledEmployees: 28,
    checkedInCount: 23,
    fieldVisitCount: 2,
    lateCount: 3,
    absentCount: 0,
    pendingLeaveCount: 2,
    openAnomalies: 3,
  },
  {
    clinicId: 'clinic-07',
    clinicName: getClinicNameById('clinic-07'),
    region: 'Lagos Island',
    scheduledEmployees: 26,
    checkedInCount: 20,
    fieldVisitCount: 1,
    lateCount: 2,
    absentCount: 3,
    pendingLeaveCount: 1,
    openAnomalies: 2,
  },
  {
    clinicId: 'clinic-13',
    clinicName: getClinicNameById('clinic-13'),
    region: 'Ikeja Corridor',
    scheduledEmployees: 29,
    checkedInCount: 24,
    fieldVisitCount: 3,
    lateCount: 1,
    absentCount: 1,
    pendingLeaveCount: 2,
    openAnomalies: 1,
  },
  {
    clinicId: 'clinic-20',
    clinicName: getClinicNameById('clinic-20'),
    region: 'Lekki Axis',
    scheduledEmployees: 19,
    checkedInCount: 15,
    fieldVisitCount: 2,
    lateCount: 1,
    absentCount: 1,
    pendingLeaveCount: 1,
    openAnomalies: 2,
  },
  {
    clinicId: 'clinic-24',
    clinicName: getClinicNameById('clinic-24'),
    region: 'Abuja',
    scheduledEmployees: 30,
    checkedInCount: 26,
    fieldVisitCount: 1,
    lateCount: 2,
    absentCount: 1,
    pendingLeaveCount: 2,
    openAnomalies: 2,
  },
  {
    clinicId: 'clinic-30',
    clinicName: getClinicNameById('clinic-30'),
    region: 'Port Harcourt',
    scheduledEmployees: 23,
    checkedInCount: 18,
    fieldVisitCount: 1,
    lateCount: 2,
    absentCount: 2,
    pendingLeaveCount: 1,
    openAnomalies: 2,
  },
];

const createSeedAnomalies = (): AttendanceAnomaly[] => [
  {
    id: 'anomaly-1',
    employeeId: 'user-emeka-nwachukwu',
    employeeName: 'Emeka Nwachukwu',
    clinicId: 'clinic-13',
    clinicName: getClinicNameById('clinic-13'),
    date: '2026-04-10',
    issue: 'missed-checkout',
    status: 'Open',
    note: 'No checkout recorded after 18:00 local time.',
  },
  {
    id: 'anomaly-2',
    employeeId: 'user-zainab-sadiq',
    employeeName: 'Zainab Sadiq',
    clinicId: 'clinic-07',
    clinicName: getClinicNameById('clinic-07'),
    date: '2026-04-10',
    issue: 'outside-geofence',
    status: 'Reviewing',
    note: 'Manual check-in happened 220m outside configured geofence.',
  },
  {
    id: 'anomaly-3',
    employeeId: 'user-ada-okafor',
    employeeName: 'Ada Okafor',
    clinicId: 'clinic-03',
    clinicName: getClinicNameById('clinic-03'),
    date: '2026-04-09',
    issue: 'late-arrival',
    status: 'Open',
    note: 'Employee arrived 13 minutes after grace period.',
  },
  {
    id: 'anomaly-4',
    employeeId: 'user-amaka-obi',
    employeeName: 'Amaka Obi',
    clinicId: 'clinic-24',
    clinicName: getClinicNameById('clinic-24'),
    date: '2026-04-08',
    issue: 'manual-override',
    status: 'Open',
    note: 'HR override used after field visit ended offsite.',
  },
];

const resolveAttendanceRecordClinic = (clinicId?: string) => {
  const clinic = getClinicById(clinicId);
  return {
    clinicId: clinic?.id,
    clinicName: clinic?.name,
  };
};

const createAuditSession = (clinicId: string, timestamp: string): AuditSession => ({
  clinicId,
  clinicName: getClinicNameById(clinicId),
  id: generateId('audit'),
  startedAt: timestamp,
});

const buildPolicyDecoratedRecord = (record: AttendanceDayRecord) => {
  const policy = classifyAttendancePolicy(record);

  return {
    ...record,
    policyDirection: policy.direction,
    policyStatus: policy.status,
  };
};

const buildLatePolicySummary = (history: Record<string, AttendanceDayRecord>) => calculateMonthlyLateLeaveSummary(history);

export const useAttendanceStore = create<AttendanceState>((set) => ({
  employeeName: 'Ada Okafor',
  employeeRole: 'Clinic Operations Associate',
  todayStatus: 'idle',
  currentClinicId: 'clinic-03',
  hoursWorkedToday: 0,
  pendingSyncCount: 0,
  isSyncing: false,
  automationEnabled: false,
  automationPermission: 'unknown',
  registeredGeofenceClinicIds: [],
  fieldVisitSession: undefined,
  activeAuditSession: undefined,
  completedAuditSessions: [],
  attendanceHistory: createSeedHistory(),
  leaveRequests: createSeedLeaveRequests(),
  companyAttendance: createCompanySnapshots(),
  attendanceAnomalies: createSeedAnomalies(),
  liveFieldVisitSnapshots: [],
  monthlyLatePolicySummary: buildLatePolicySummary(createSeedHistory()),
  applyAttendanceEvent: (event) => {
    set((state) => {
      const authUser = useAuthStore.getState().user;
      const todayKey = formatDateKey(new Date(event.timestamp));
      const existingDay = state.attendanceHistory[todayKey] ?? {
        date: todayKey,
        status: 'present',
        hoursWorked: 0,
      };

      const resolvedClinic = resolveAttendanceRecordClinic(event.clinicId ?? state.currentClinicId);

      if (event.kind === 'audit_enter' && event.clinicId) {
        const nextAuditSession = createAuditSession(event.clinicId, event.timestamp);
        const nextRecord = buildPolicyDecoratedRecord({
          ...existingDay,
          ...resolvedClinic,
          fieldVisitStops: Array.from(new Set([...(existingDay.fieldVisitStops ?? []), getClinicNameById(event.clinicId)])),
        });

        return {
          activeAuditSession: nextAuditSession,
          attendanceHistory: {
            ...state.attendanceHistory,
            [todayKey]: nextRecord,
          },
          currentClinicId: event.clinicId,
          lastEventAt: event.timestamp,
          lastEventKind: event.kind,
          liveFieldVisitSnapshots: state.liveFieldVisitSnapshots.map((snapshot) =>
            snapshot.employeeId === authUser?.id
              ? {
                  ...snapshot,
                  activeAuditSession: nextAuditSession,
                  currentClinicId: event.clinicId,
                  currentClinicName: getClinicNameById(event.clinicId),
                  lastUpdatedAt: event.timestamp,
                  status: 'auditing',
                }
              : snapshot,
          ),
          monthlyLatePolicySummary: buildLatePolicySummary({
            ...state.attendanceHistory,
            [todayKey]: nextRecord,
          }),
        };
      }

      if (event.kind === 'audit_exit' && state.activeAuditSession) {
        const durationMinutes =
          event.metadata?.auditDurationMinutes ??
          Math.max(
            Math.round(
              (new Date(event.timestamp).getTime() - new Date(state.activeAuditSession.startedAt).getTime()) / (1000 * 60),
            ),
            0,
          );
        const completedAuditSession: AuditSession = {
          ...state.activeAuditSession,
          durationMinutes,
          endedAt: event.timestamp,
        };

        return {
          activeAuditSession: undefined,
          completedAuditSessions: [completedAuditSession, ...state.completedAuditSessions],
          currentClinicId: authUser?.homeClinicId ?? state.currentClinicId,
          lastEventAt: event.timestamp,
          lastEventKind: event.kind,
          liveFieldVisitSnapshots: state.liveFieldVisitSnapshots.map((snapshot) =>
            snapshot.employeeId === authUser?.id
              ? {
                  ...snapshot,
                  activeAuditSession: undefined,
                  currentClinicId: undefined,
                  currentClinicName: undefined,
                  lastUpdatedAt: event.timestamp,
                  recentAuditSessions: [completedAuditSession, ...snapshot.recentAuditSessions].slice(0, 6),
                  status: 'en-route',
                }
              : snapshot,
          ),
        };
      }

      if (event.kind === 'field_visit_start') {
        const destinationClinicId = event.metadata?.destinationClinicId ?? event.clinicId ?? state.currentClinicId;
        const destinationClinicName = event.metadata?.destinationClinicName ?? getClinicNameById(destinationClinicId);
        const nextFieldVisitStops = Array.from(new Set([...(existingDay.fieldVisitStops ?? []), destinationClinicName]));
        const nextRecord = buildPolicyDecoratedRecord({
          ...existingDay,
          ...resolvedClinic,
          fieldVisitStops: nextFieldVisitStops,
        });

        return {
          todayStatus: 'field-visit',
          activeAuditSession: undefined,
          fieldVisitSession: {
            destinationClinicId: destinationClinicId ?? 'unassigned-clinic',
            destinationClinicName,
            startedAt: event.timestamp,
            note: event.metadata?.note,
          },
          lastEventAt: event.timestamp,
          lastEventKind: event.kind,
          attendanceHistory: {
            ...state.attendanceHistory,
            [todayKey]: nextRecord,
          },
          monthlyLatePolicySummary: buildLatePolicySummary({
            ...state.attendanceHistory,
            [todayKey]: nextRecord,
          }),
        };
      }

      if (event.kind === 'field_visit_end') {
        return {
          activeAuditSession: undefined,
          todayStatus: state.currentSessionStart ? 'checked-in' : 'idle',
          fieldVisitSession: undefined,
          lastEventAt: event.timestamp,
          lastEventKind: event.kind,
        };
      }

      if (event.kind === 'check_in') {
        const nextRecord: AttendanceDayRecord = {
          ...existingDay,
          date: todayKey,
          checkIn: event.timestamp,
          checkOut: undefined,
          hoursWorked: 0,
          status: isLateArrival(event.timestamp) ? 'late' : 'present',
          ...resolvedClinic,
        };
        const nextDecoratedRecord = buildPolicyDecoratedRecord(nextRecord);

        return {
          todayStatus: 'checked-in',
          currentClinicId: nextRecord.clinicId,
          currentSessionStart: event.timestamp,
          currentSessionEnd: undefined,
          hoursWorkedToday: 0,
          fieldVisitSession: undefined,
          lastEventAt: event.timestamp,
          lastEventKind: event.kind,
          attendanceHistory: {
            ...state.attendanceHistory,
            [todayKey]: nextDecoratedRecord,
          },
          monthlyLatePolicySummary: buildLatePolicySummary({
            ...state.attendanceHistory,
            [todayKey]: nextDecoratedRecord,
          }),
        };
      }

      const sessionStart = existingDay.checkIn ?? state.currentSessionStart ?? event.timestamp;
      const hoursWorked = calculateHoursWorked(sessionStart, event.timestamp);
      const nextRecord: AttendanceDayRecord = {
        ...existingDay,
        date: todayKey,
        checkOut: event.timestamp,
        hoursWorked,
        status: existingDay.status === 'absent' ? 'present' : existingDay.status,
        ...resolvedClinic,
      };
      const nextDecoratedRecord = buildPolicyDecoratedRecord(nextRecord);

      return {
        todayStatus: 'checked-out',
        currentClinicId: nextRecord.clinicId,
        currentSessionStart: undefined,
        currentSessionEnd: event.timestamp,
        hoursWorkedToday: hoursWorked,
        fieldVisitSession: undefined,
        lastEventAt: event.timestamp,
        lastEventKind: event.kind,
        attendanceHistory: {
          ...state.attendanceHistory,
          [todayKey]: nextDecoratedRecord,
        },
        monthlyLatePolicySummary: buildLatePolicySummary({
          ...state.attendanceHistory,
          [todayKey]: nextDecoratedRecord,
        }),
      };
    });
  },
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setAutomationState: (permission, enabled) =>
    set({ automationPermission: permission, automationEnabled: enabled }),
  setRegisteredGeofenceClinicIds: (clinicIds) => set({ registeredGeofenceClinicIds: clinicIds }),
  setLiveFieldVisitSnapshots: (snapshots) => set({ liveFieldVisitSnapshots: snapshots }),
  submitLeaveRequest: (draft) =>
    set((state) => {
      const user = useAuthStore.getState().user;
      const clinicId = user?.homeClinicId ?? state.currentClinicId ?? 'clinic-03';

      return {
        leaveRequests: [
          {
            id: generateId('leave'),
            employeeId: user?.id ?? 'user-ada-okafor',
            employeeName: user?.name ?? state.employeeName,
            clinicId,
            clinicName: getClinicNameById(clinicId),
            submittedAt: new Date().toISOString(),
            status: 'Pending',
            ...draft,
          },
          ...state.leaveRequests,
        ],
      };
    }),
  approveLeaveRequest: (requestId, reviewerNote) =>
    set((state) => ({
      leaveRequests: state.leaveRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              reviewerNote,
              status: 'Approved',
            }
          : request,
      ),
    })),
  rejectLeaveRequest: (requestId, reviewerNote) =>
    set((state) => ({
      leaveRequests: state.leaveRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              reviewerNote,
              status: 'Rejected',
            }
          : request,
      ),
    })),
  resolveAnomaly: (anomalyId, note) =>
    set((state) => ({
      attendanceAnomalies: state.attendanceAnomalies.map((anomaly) =>
        anomaly.id === anomalyId
          ? {
              ...anomaly,
              status: 'Resolved',
              note: note ?? anomaly.note,
            }
          : anomaly,
      ),
    })),
}));