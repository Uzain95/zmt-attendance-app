import { CLINIC_DIRECTORY, getClinicById } from '../../constants/clinics';
import type { AttendanceSource } from '../../types/attendance';
import type { AppRole, AuthProvider, AuthenticatedUser, ClinicAccessScope, SessionPayload } from '../../types/auth';

type BackendRole = 'Employee' | 'HR' | 'Superadmin';

export type BackendClinicAssignment = {
  clinic_id: number;
  code: string;
  name: string;
  assignment_type: 'primary' | 'secondary' | 'audit';
};

export type BackendAuthUser = {
  id: number;
  name: string;
  email: string;
  role: BackendRole;
  assignments?: BackendClinicAssignment[];
  assignedClinicId?: number;
  assignedClinicName?: string;
  clinicId?: number;
};

const ALL_CLINIC_IDS = CLINIC_DIRECTORY.map((clinic) => clinic.id);
const LOCAL_CLINIC_BY_CODE = Object.fromEntries(CLINIC_DIRECTORY.map((clinic) => [clinic.code, clinic]));

const ROLE_MAP: Record<BackendRole, AppRole> = {
  Employee: 'employee',
  HR: 'hr',
  Superadmin: 'superadmin',
};

const JOB_TITLE_MAP: Record<AppRole, string> = {
  employee: 'Clinic Operations Associate',
  hr: 'Regional HR Manager',
  superadmin: 'Enterprise Operations Director',
};

const ACCESS_SCOPE_MAP: Record<AppRole, ClinicAccessScope> = {
  employee: 'assigned',
  hr: 'regional',
  superadmin: 'all-clinics',
};

const toUniqueValues = (values: Array<string | undefined>) => Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const resolveLocalClinicId = (clinicCode?: string, clinicName?: string) => {
  if (clinicCode && LOCAL_CLINIC_BY_CODE[clinicCode]) {
    return LOCAL_CLINIC_BY_CODE[clinicCode].id;
  }

  if (clinicName) {
    return CLINIC_DIRECTORY.find((clinic) => clinic.name.toLowerCase() === clinicName.toLowerCase())?.id;
  }

  return undefined;
};

export const mapBackendUserToAuthenticatedUser = (backendUser: BackendAuthUser): AuthenticatedUser => {
  const role = ROLE_MAP[backendUser.role];
  const assignments = backendUser.assignments ?? [];
  const primaryAssignment = assignments.find((assignment) => assignment.assignment_type === 'primary');
  const homeClinicId =
    resolveLocalClinicId(primaryAssignment?.code, primaryAssignment?.name) ??
    resolveLocalClinicId(undefined, backendUser.assignedClinicName);

  const assignedClinicIds =
    role === 'superadmin'
      ? ALL_CLINIC_IDS
      : toUniqueValues([
          ...assignments.map((assignment) => resolveLocalClinicId(assignment.code, assignment.name)),
          homeClinicId,
        ]);

  return {
    id: String(backendUser.id),
    name: backendUser.name,
    email: backendUser.email,
    role,
    jobTitle: JOB_TITLE_MAP[role],
    homeClinicId,
    assignedClinicIds,
    accessScope: ACCESS_SCOPE_MAP[role],
  };
};

export const buildSessionFromBackend = (provider: AuthProvider, accessToken: string, backendUser: BackendAuthUser): SessionPayload => ({
  accessToken,
  refreshToken: '',
  provider,
  user: mapBackendUserToAuthenticatedUser(backendUser),
});

export const mapAttendanceSourceToBackend = (
  source: AttendanceSource,
): 'manual' | 'geofence' | 'reconciliation' | 'field-visit' | 'admin-adjustment' | 'live-location' => {
  if (source === 'geofence-enter' || source === 'geofence-exit') {
    return 'geofence';
  }

  return source;
};

export const mapLocalClinicIdToClinicCode = (clinicId?: string) => getClinicById(clinicId)?.code;