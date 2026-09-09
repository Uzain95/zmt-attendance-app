export type AttendanceEventKind =
  | 'check_in'
  | 'check_out'
  | 'field_visit_start'
  | 'field_visit_end'
  | 'audit_enter'
  | 'audit_exit';

export type AttendanceSource =
  | 'manual'
  | 'geofence-enter'
  | 'geofence-exit'
  | 'reconciliation'
  | 'field-visit'
  | 'admin-adjustment'
  | 'live-location';

export type AttendanceStatus = 'idle' | 'checked-in' | 'field-visit' | 'checked-out';

export type PermissionState = 'unknown' | 'granted' | 'denied';

export type AttendanceEventPayload = {
  id: string;
  kind: AttendanceEventKind;
  source: AttendanceSource;
  timestamp: string;
  clinicId?: string;
  metadata?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    triggeredBy?: string;
    geofenceIdentifier?: string;
    destinationClinicId?: string;
    destinationClinicName?: string;
    auditSessionId?: string;
    auditStartedAt?: string;
    auditEndedAt?: string;
    auditDurationMinutes?: number;
    heading?: number | null;
    note?: string;
    speedMps?: number | null;
  };
};

export type AttendancePolicyOutcome =
  | 'Sunday (Off)'
  | 'Leave'
  | 'Missing Punch'
  | 'Late'
  | 'Short Leave (Morning)'
  | 'Half Day'
  | 'Half + Short'
  | 'Short Leave (Evening)'
  | 'Early'
  | 'Present';

export type AttendancePolicyDirection = 'D (In)' | 'E (Out)';

export type AttendanceDayRecord = {
  date: string;
  status: 'present' | 'late' | 'absent' | 'leave' | 'field-visit';
  checkIn?: string;
  checkOut?: string;
  hoursWorked: number;
  clinicId?: string;
  clinicName?: string;
  fieldVisitStops?: string[];
  policyStatus?: AttendancePolicyOutcome;
  policyDirection?: AttendancePolicyDirection;
};

export type LeaveType = 'Sick' | 'Casual' | 'Annual';

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  clinicId: string;
  clinicName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  note?: string;
  reviewerNote?: string;
  submittedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

export type AttendanceAnomaly = {
  id: string;
  employeeId: string;
  employeeName: string;
  clinicId: string;
  clinicName: string;
  date: string;
  issue: 'late-arrival' | 'missed-checkout' | 'outside-geofence' | 'manual-override';
  status: 'Open' | 'Reviewing' | 'Resolved';
  note: string;
};

export type CompanyAttendanceSnapshot = {
  clinicId: string;
  clinicName: string;
  region: string;
  scheduledEmployees: number;
  checkedInCount: number;
  fieldVisitCount: number;
  lateCount: number;
  absentCount: number;
  pendingLeaveCount: number;
  openAnomalies: number;
};

export type FieldVisitSession = {
  destinationClinicId: string;
  destinationClinicName: string;
  startedAt: string;
  note?: string;
};

export type AuditSession = {
  id: string;
  clinicId: string;
  clinicName: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
};

export type LiveFieldVisitLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number | null;
  speedMps?: number | null;
  timestamp: string;
};

export type LiveFieldVisitStatus = 'en-route' | 'auditing';

export type LiveFieldVisitTracker = {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  primaryClinicId?: string;
  primaryClinicName?: string;
  destinationClinicId: string;
  destinationClinicName: string;
  fieldVisitStartedAt: string;
  lastUpdatedAt: string;
  status: LiveFieldVisitStatus;
  realtimePath: string;
  currentClinicId?: string;
  currentClinicName?: string;
  currentLocation: LiveFieldVisitLocation;
  routeTrail: LiveFieldVisitLocation[];
  activeAuditSession?: AuditSession;
  recentAuditSessions: AuditSession[];
};

export type MonthlyLatePolicySummary = {
  monthKey: string;
  lateCount: number;
  leaveDeductions: number;
  remainingLateBalance: number;
};

export type PendingAttendanceMutation = {
  id: string;
  payload: AttendanceEventPayload;
  createdAt: string;
  retryCount: number;
};