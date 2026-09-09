import { getClinicById } from '../../constants/clinics';
import type { AttendanceAnomaly, AttendanceEventPayload, LeaveRequest } from '../../types/attendance';
import type { Clinic } from '../../types/clinic';
import { useAttendanceStore } from '../../store/attendance-store';
import { useAuthStore } from '../../store/auth-store';

import { apiRequest } from './api-client';
import { mapAttendanceSourceToBackend } from './backend-mappers';

type BackendClinicDirectoryItem = {
  id: number;
  code: string;
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: number;
};

let backendClinicsCache: BackendClinicDirectoryItem[] | null = null;

const getBackendClinics = async () => {
  if (backendClinicsCache) {
    return backendClinicsCache;
  }

  backendClinicsCache = await apiRequest<BackendClinicDirectoryItem[]>('/clinics', {
    method: 'GET',
    requiresAuth: true,
  });

  return backendClinicsCache;
};

const resolveBackendClinicId = async (localClinicId?: string) => {
  if (!localClinicId) {
    return undefined;
  }

  const localClinic = getClinicById(localClinicId);

  if (!localClinic) {
    throw new Error('The selected clinic is not recognized by the mobile app.');
  }

  const backendClinics = await getBackendClinics();
  const backendClinic = backendClinics.find(
    (clinic) => clinic.code === localClinic.code || clinic.name.toLowerCase() === localClinic.name.toLowerCase(),
  );

  if (!backendClinic) {
    throw new Error(`${localClinic.name} has not been provisioned in the backend clinic registry yet.`);
  }

  return backendClinic.id;
};

const mapEventMetadata = async (payload?: AttendanceEventPayload['metadata']) => {
  if (!payload) {
    return undefined;
  }

  const metadata: Record<string, unknown> = {
    ...payload,
  };

  if (payload.destinationClinicId) {
    metadata.destination_clinic_id = await resolveBackendClinicId(payload.destinationClinicId);
    metadata.destination_clinic_name = getClinicById(payload.destinationClinicId)?.name ?? payload.destinationClinicName;
    delete metadata.destinationClinicId;
  }

  if (payload.auditSessionId) {
    metadata.audit_session_id = payload.auditSessionId;
    delete metadata.auditSessionId;
  }

  if (payload.auditStartedAt) {
    metadata.audit_started_at = payload.auditStartedAt;
    delete metadata.auditStartedAt;
  }

  if (payload.auditEndedAt) {
    metadata.audit_ended_at = payload.auditEndedAt;
    delete metadata.auditEndedAt;
  }

  if (payload.auditDurationMinutes !== undefined) {
    metadata.audit_duration_minutes = payload.auditDurationMinutes;
    delete metadata.auditDurationMinutes;
  }

  if (payload.speedMps !== undefined) {
    metadata.speed_mps = payload.speedMps;
    delete metadata.speedMps;
  }

  return metadata;
};

const getActiveFieldVisit = async () => {
  const activeVisits = await apiRequest<Array<{ id: number; status: string }>>('/field-visits/active', {
    method: 'GET',
    requiresAuth: true,
  });

  return activeVisits.find((visit) => visit.status === 'active') ?? null;
};

const getCurrentOriginClinicId = () => {
  const authUser = useAuthStore.getState().user;
  const attendanceState = useAttendanceStore.getState();
  return attendanceState.currentClinicId ?? authUser?.homeClinicId;
};

export const submitAttendanceEvent = async (payload: AttendanceEventPayload) => {
  const triggerSource = mapAttendanceSourceToBackend(payload.source);

  if (payload.kind === 'check_in' || payload.kind === 'check_out') {
    const clinicId = await resolveBackendClinicId(payload.clinicId);

    if (!clinicId) {
      throw new Error('Attendance sync needs a mapped clinic before it can submit this event.');
    }

    return apiRequest<{ id: number }>('/attendance/logs', {
      method: 'POST',
      requiresAuth: true,
      body: {
        clinic_id: clinicId,
        event_type: payload.kind,
        trigger_source: triggerSource,
        event_timestamp: payload.timestamp,
        metadata: await mapEventMetadata(payload.metadata),
      },
    });
  }

  if (payload.kind === 'field_visit_start') {
    const originClinicId = await resolveBackendClinicId(getCurrentOriginClinicId());
    const destinationClinicId = await resolveBackendClinicId(payload.metadata?.destinationClinicId ?? payload.clinicId);

    if (!originClinicId || !destinationClinicId) {
      throw new Error('Field visits need both origin and destination clinics mapped before sync.');
    }

    return apiRequest<{ id: number }>('/field-visits/start', {
      method: 'POST',
      requiresAuth: true,
      body: {
        origin_clinic_id: originClinicId,
        destination_clinic_id: destinationClinicId,
        started_at: payload.timestamp,
        trigger_source: triggerSource,
      },
    });
  }

  const activeFieldVisit = await getActiveFieldVisit();

  if (!activeFieldVisit) {
    throw new Error('No active field visit session is available to sync this event yet.');
  }

  const clinicId = await resolveBackendClinicId(payload.clinicId);

  if (!clinicId) {
    throw new Error('Field visit sync needs a mapped clinic before it can continue.');
  }

  if (payload.kind === 'audit_enter') {
    return apiRequest<{ id: number }>(`/field-visits/${activeFieldVisit.id}/audit-enter`, {
      method: 'POST',
      requiresAuth: true,
      body: {
        clinic_id: clinicId,
        entered_at: payload.timestamp,
        trigger_source: triggerSource,
      },
    });
  }

  if (payload.kind === 'audit_exit') {
    return apiRequest<{ id: number }>(`/field-visits/${activeFieldVisit.id}/audit-exit`, {
      method: 'POST',
      requiresAuth: true,
      body: {
        clinic_id: clinicId,
        exited_at: payload.timestamp,
        trigger_source: triggerSource,
      },
    });
  }

  return apiRequest<{ id: number }>(`/field-visits/${activeFieldVisit.id}/end`, {
    method: 'POST',
    requiresAuth: true,
    body: {
      clinic_id: clinicId,
      ended_at: payload.timestamp,
      trigger_source: triggerSource,
    },
  });
};

export const submitLeaveRequest = async (payload: Omit<LeaveRequest, 'id' | 'status'>) => {
  return apiRequest<{ id: number }>('/leaves', {
    method: 'POST',
    requiresAuth: true,
    body: {
      type: payload.type,
      start_date: payload.startDate,
      end_date: payload.endDate,
      reason: payload.note,
    },
  });
};

export const submitAttendanceAnomalyResolution = async (payload: Pick<AttendanceAnomaly, 'id' | 'status' | 'note'>) => {
  return apiRequest<{ id: string }>(`/attendance/anomalies/${payload.id}/resolve`, {
    method: 'POST',
    requiresAuth: true,
    body: payload,
  });
};

export const submitClinicConfiguration = async (payload: Clinic) => {
  const backendClinicId = await resolveBackendClinicId(payload.id);

  if (!backendClinicId) {
    throw new Error('This clinic is not available in the backend registry yet.');
  }

  return apiRequest<{ id: number }>(`/clinics/${backendClinicId}`, {
    method: 'PUT',
    requiresAuth: true,
    body: {
      code: payload.code,
      name: payload.name,
      city: payload.city,
      address: payload.address,
      latitude: payload.geofence.latitude,
      longitude: payload.geofence.longitude,
      radius_meters: payload.geofence.radiusMeters,
      is_active: payload.isActive,
    },
  });
};