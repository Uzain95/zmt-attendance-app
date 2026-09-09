import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { getClinicById, getClinicNameById, MAX_BACKGROUND_GEOFENCE_REGIONS } from '../../constants/clinics';
import { useAuthStore } from '../../store/auth-store';
import { useClinicStore } from '../../store/clinic-store';
import { useAttendanceStore } from '../../store/attendance-store';
import type { AttendanceEventKind, LiveFieldVisitTracker } from '../../types/attendance';
import { captureAttendanceEvent } from '../attendance/attendance-service';
import { clearLiveFieldVisitTracker, getLiveFieldVisitSnapshot, publishLiveFieldVisitTracker } from '../realtime/field-visit-realtime';

export const ATTENDANCE_GEOFENCE_TASK = 'zmt-attendance-geofence';
export const FIELD_VISIT_LOCATION_TASK = 'zmt-attendance-field-visit-location';

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceBetween = (
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
) => {
  const earthRadius = 6371000;
  const latitudeDelta = toRadians(endLatitude - startLatitude);
  const longitudeDelta = toRadians(endLongitude - startLongitude);
  const startLatitudeInRadians = toRadians(startLatitude);
  const endLatitudeInRadians = toRadians(endLatitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(startLatitudeInRadians) *
      Math.cos(endLatitudeInRadians) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const createMetadata = (
  position?: Location.LocationObject | null,
  triggeredBy?: string,
  geofenceIdentifier?: string,
  note?: string,
) => ({
  latitude: position?.coords.latitude,
  longitude: position?.coords.longitude,
  accuracy: position?.coords.accuracy ?? undefined,
  triggeredBy,
  geofenceIdentifier,
  note,
  speedMps: position?.coords.speed ?? undefined,
  heading: position?.coords.heading ?? undefined,
});

const getAccessibleClinics = () => {
  const clinics = useClinicStore.getState().clinics.filter((clinic) => clinic.isActive);
  const user = useAuthStore.getState().user;

  if (!user) {
    return clinics;
  }

  if (user.accessScope === 'all-clinics') {
    return clinics;
  }

  if (user.assignedClinicIds.length === 0) {
    return user.homeClinicId ? clinics.filter((clinic) => clinic.id === user.homeClinicId) : clinics.slice(0, 1);
  }

  return clinics.filter((clinic) => user.assignedClinicIds.includes(clinic.id));
};

const pickClinicsForAutomation = (position?: Location.LocationObject | null) => {
  const user = useAuthStore.getState().user;
  const clinics = getAccessibleClinics();

  if (clinics.length <= MAX_BACKGROUND_GEOFENCE_REGIONS) {
    return clinics;
  }

  const pinnedClinics = user?.homeClinicId ? clinics.filter((clinic) => clinic.id === user.homeClinicId) : [];
  const remainingClinics = clinics.filter((clinic) => clinic.id !== user?.homeClinicId);

  if (!position) {
    return [...pinnedClinics, ...remainingClinics].slice(0, MAX_BACKGROUND_GEOFENCE_REGIONS);
  }

  const sortedClinics = remainingClinics.sort((left, right) => {
    const leftDistance = distanceBetween(
      position.coords.latitude,
      position.coords.longitude,
      left.geofence.latitude,
      left.geofence.longitude,
    );
    const rightDistance = distanceBetween(
      position.coords.latitude,
      position.coords.longitude,
      right.geofence.latitude,
      right.geofence.longitude,
    );

    return leftDistance - rightDistance;
  });

  return [...pinnedClinics, ...sortedClinics].slice(0, MAX_BACKGROUND_GEOFENCE_REGIONS);
};

const createRegions = (clinics: ReturnType<typeof pickClinicsForAutomation>) =>
  clinics.map((clinic) => ({
    identifier: clinic.id,
    latitude: clinic.geofence.latitude,
    longitude: clinic.geofence.longitude,
    radius: clinic.geofence.radiusMeters,
    notifyOnEnter: clinic.geofence.notifyOnEnter,
    notifyOnExit: clinic.geofence.notifyOnExit,
  }));

const findClinicContainingPoint = (position: Location.LocationObject, clinics = getAccessibleClinics()) => {
  return clinics
    .filter((clinic) => {
      const distance = distanceBetween(
        position.coords.latitude,
        position.coords.longitude,
        clinic.geofence.latitude,
        clinic.geofence.longitude,
      );

      return distance <= clinic.geofence.radiusMeters;
    })
    .sort((left, right) => {
      const leftDistance = distanceBetween(
        position.coords.latitude,
        position.coords.longitude,
        left.geofence.latitude,
        left.geofence.longitude,
      );
      const rightDistance = distanceBetween(
        position.coords.latitude,
        position.coords.longitude,
        right.geofence.latitude,
        right.geofence.longitude,
      );

      return leftDistance - rightDistance;
    })[0];
};

const getFieldVisitLocationOptions = (): Location.LocationTaskOptions => ({
  accuracy: Location.Accuracy.BestForNavigation,
  activityType: Location.ActivityType.AutomotiveNavigation,
  deferredUpdatesInterval: 15_000,
  distanceInterval: 75,
  foregroundService: {
    notificationBody: 'Tracking live field visit location for HR operations.',
    notificationColor: '#379C95',
    notificationTitle: 'ZMT Field Visit Tracking',
  },
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  timeInterval: 15_000,
});

const buildCurrentUserTracker = (position: Location.LocationObject): LiveFieldVisitTracker | undefined => {
  const authUser = useAuthStore.getState().user;
  const attendanceState = useAttendanceStore.getState();
  const fieldVisitSession = attendanceState.fieldVisitSession;

  if (!authUser || !fieldVisitSession) {
    return undefined;
  }

  const existingTracker = getLiveFieldVisitSnapshot().find((snapshot) => snapshot.employeeId === authUser.id);
  const currentClinic = attendanceState.activeAuditSession
    ? getClinicById(attendanceState.activeAuditSession.clinicId)
    : findClinicContainingPoint(position);
  const nextLocation = {
    accuracy: position.coords.accuracy ?? undefined,
    heading: position.coords.heading ?? undefined,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speedMps: position.coords.speed ?? undefined,
    timestamp: position.timestamp ? new Date(position.timestamp).toISOString() : new Date().toISOString(),
  };

  return {
    activeAuditSession: attendanceState.activeAuditSession,
    currentClinicId: currentClinic?.id,
    currentClinicName: currentClinic?.name,
    currentLocation: nextLocation,
    destinationClinicId: fieldVisitSession.destinationClinicId,
    destinationClinicName: fieldVisitSession.destinationClinicName,
    employeeId: authUser.id,
    employeeName: authUser.name,
    employeeRole: authUser.jobTitle,
    fieldVisitStartedAt: fieldVisitSession.startedAt,
    lastUpdatedAt: nextLocation.timestamp,
    primaryClinicId: authUser.homeClinicId,
    primaryClinicName: getClinicNameById(authUser.homeClinicId),
    realtimePath: `fieldVisits/${authUser.id}`,
    recentAuditSessions: existingTracker?.recentAuditSessions ?? attendanceState.completedAuditSessions.slice(0, 6),
    routeTrail: [...(existingTracker?.routeTrail ?? []).slice(-19), nextLocation],
    status: attendanceState.activeAuditSession ? 'auditing' : 'en-route',
  };
};

const publishCurrentUserFieldVisitLocation = (position: Location.LocationObject) => {
  const tracker = buildCurrentUserTracker(position);

  if (!tracker) {
    return;
  }

  publishLiveFieldVisitTracker(tracker);
};

if (!TaskManager.isTaskDefined(ATTENDANCE_GEOFENCE_TASK)) {
  TaskManager.defineTask(ATTENDANCE_GEOFENCE_TASK, async ({ data, error }) => {
    if (error) {
      return;
    }

    const geofenceEvent = data as
      | {
          eventType: Location.GeofencingEventType;
          region?: {
            identifier?: string;
          };
        }
      | undefined;

    if (!geofenceEvent) {
      return;
    }

    const store = useAttendanceStore.getState();
    const regionIdentifier = geofenceEvent.region?.identifier;
    const authUser = useAuthStore.getState().user;
    const isFieldVisitAuditClinic = Boolean(
      store.fieldVisitSession && regionIdentifier && regionIdentifier !== authUser?.homeClinicId,
    );

    if (store.fieldVisitSession && isFieldVisitAuditClinic && regionIdentifier) {
      const timestamp = new Date().toISOString();

      if (geofenceEvent.eventType === Location.GeofencingEventType.Enter) {
        await captureAttendanceEvent({
          kind: 'audit_enter',
          source: 'geofence-enter',
          clinicId: regionIdentifier,
          timestamp,
          metadata: {
            geofenceIdentifier: regionIdentifier,
            triggeredBy: 'geofence-task',
          },
        });

        return;
      }

      const activeAuditSession = store.activeAuditSession;
      const auditDurationMinutes =
        activeAuditSession && activeAuditSession.clinicId === regionIdentifier
          ? Math.max(
              Math.round((new Date(timestamp).getTime() - new Date(activeAuditSession.startedAt).getTime()) / (1000 * 60)),
              0,
            )
          : undefined;

      await captureAttendanceEvent({
        kind: 'audit_exit',
        source: 'geofence-exit',
        clinicId: regionIdentifier,
        timestamp,
        metadata: {
          auditDurationMinutes,
          auditEndedAt: timestamp,
          auditSessionId: activeAuditSession?.id,
          auditStartedAt: activeAuditSession?.startedAt,
          geofenceIdentifier: regionIdentifier,
          triggeredBy: 'geofence-task',
        },
      });

      return;
    }

    if (store.fieldVisitSession && geofenceEvent.eventType === Location.GeofencingEventType.Exit) {
      return;
    }

    const kind: AttendanceEventKind =
      geofenceEvent.eventType === Location.GeofencingEventType.Enter ? 'check_in' : 'check_out';

    /*
      iOS can relaunch the app briefly for a region transition, and Android may deliver the callback late
      while the device is in Doze. Keep this handler short: write locally first through the shared service,
      then let connectivity-driven sync flush the queue opportunistically.
    */
    await captureAttendanceEvent({
      kind,
      source: kind === 'check_in' ? 'geofence-enter' : 'geofence-exit',
      clinicId: regionIdentifier,
      metadata: { triggeredBy: 'geofence-task', geofenceIdentifier: regionIdentifier },
    });
  });
}

if (!TaskManager.isTaskDefined(FIELD_VISIT_LOCATION_TASK)) {
  TaskManager.defineTask(FIELD_VISIT_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      return;
    }

    const locationUpdate = data as
      | {
          locations?: Location.LocationObject[];
        }
      | undefined;

    const latestLocation = locationUpdate?.locations?.[locationUpdate.locations.length - 1];

    if (!latestLocation) {
      return;
    }

    publishCurrentUserFieldVisitLocation(latestLocation);
  });
}

export const getAutomationRuntimeState = async () => {
  const [backgroundPermission, started] = await Promise.all([
    Location.getBackgroundPermissionsAsync(),
    Location.hasStartedGeofencingAsync(ATTENDANCE_GEOFENCE_TASK),
  ]);

  const granted = backgroundPermission.status === 'granted';
  const selectedClinics = pickClinicsForAutomation();
  useAttendanceStore.getState().setAutomationState(granted ? 'granted' : 'denied', granted && started);
  useAttendanceStore.getState().setRegisteredGeofenceClinicIds(started ? selectedClinics.map((clinic) => clinic.id) : []);

  return {
    permission: granted ? 'granted' : 'denied',
    enabled: granted && started,
  };
};

export const requestAttendanceAutomationPermissions = async () => {
  const foregroundPermission = await Location.requestForegroundPermissionsAsync();

  if (foregroundPermission.status !== 'granted') {
    useAttendanceStore.getState().setAutomationState('denied', false);
    return false;
  }

  /*
    Android 11+ may push this request into system settings instead of a single in-app prompt.
    Show rationale in UI before calling this so the user understands why "Allow all the time" matters.
  */
  const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
  const granted = backgroundPermission.status === 'granted';

  useAttendanceStore.getState().setAutomationState(granted ? 'granted' : 'denied', false);
  return granted;
};

export const startAttendanceAutomation = async () => {
  const permission = await Location.getBackgroundPermissionsAsync();

  if (permission.status !== 'granted') {
    useAttendanceStore.getState().setAutomationState('denied', false);
    useAttendanceStore.getState().setRegisteredGeofenceClinicIds([]);
    return false;
  }

  const foregroundPermission = await Location.getForegroundPermissionsAsync();
  const position =
    foregroundPermission.status === 'granted'
      ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      : null;
  const automationClinics = pickClinicsForAutomation(position);
  const hasStarted = await Location.hasStartedGeofencingAsync(ATTENDANCE_GEOFENCE_TASK);

  if (hasStarted) {
    await Location.stopGeofencingAsync(ATTENDANCE_GEOFENCE_TASK);
  }

  if (automationClinics.length > 0) {
    await Location.startGeofencingAsync(ATTENDANCE_GEOFENCE_TASK, createRegions(automationClinics));
  }

  useAttendanceStore.getState().setRegisteredGeofenceClinicIds(automationClinics.map((clinic) => clinic.id));
  useAttendanceStore.getState().setAutomationState('granted', automationClinics.length > 0);
  return automationClinics.length > 0;
};

export const refreshAttendanceAutomation = async () => {
  return startAttendanceAutomation();
};

export const startFieldVisitWorkflow = async (input: {
  destinationClinicId: string;
  destinationClinicName: string;
  note?: string;
}) => {
  const backgroundPermission = await Location.getBackgroundPermissionsAsync();
  const hasPermission =
    backgroundPermission.status === 'granted' || (await requestAttendanceAutomationPermissions());

  if (!hasPermission) {
    return false;
  }

  await captureAttendanceEvent({
    kind: 'field_visit_start',
    source: 'field-visit',
    clinicId: input.destinationClinicId,
    metadata: {
      destinationClinicId: input.destinationClinicId,
      destinationClinicName: input.destinationClinicName,
      note: input.note,
      triggeredBy: 'dashboard-field-visit',
    },
  });

  const hasStartedTracking = await Location.hasStartedLocationUpdatesAsync(FIELD_VISIT_LOCATION_TASK);

  if (!hasStartedTracking) {
    await Location.startLocationUpdatesAsync(FIELD_VISIT_LOCATION_TASK, getFieldVisitLocationOptions());
  }

  const currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
  publishCurrentUserFieldVisitLocation(currentPosition);
  await startAttendanceAutomation();

  return true;
};

export const endFieldVisitWorkflow = async () => {
  const authUser = useAuthStore.getState().user;
  const attendanceState = useAttendanceStore.getState();

  if (attendanceState.activeAuditSession) {
    const timestamp = new Date().toISOString();
    const auditDurationMinutes = Math.max(
      Math.round((new Date(timestamp).getTime() - new Date(attendanceState.activeAuditSession.startedAt).getTime()) / (1000 * 60)),
      0,
    );

    await captureAttendanceEvent({
      kind: 'audit_exit',
      source: 'field-visit',
      clinicId: attendanceState.activeAuditSession.clinicId,
      timestamp,
      metadata: {
        auditDurationMinutes,
        auditEndedAt: timestamp,
        auditSessionId: attendanceState.activeAuditSession.id,
        auditStartedAt: attendanceState.activeAuditSession.startedAt,
        destinationClinicId: attendanceState.fieldVisitSession?.destinationClinicId,
        destinationClinicName: attendanceState.fieldVisitSession?.destinationClinicName,
        triggeredBy: 'field-visit-end',
      },
    });
  }

  const hasStartedTracking = await Location.hasStartedLocationUpdatesAsync(FIELD_VISIT_LOCATION_TASK);

  if (hasStartedTracking) {
    await Location.stopLocationUpdatesAsync(FIELD_VISIT_LOCATION_TASK);
  }

  if (authUser) {
    clearLiveFieldVisitTracker(authUser.id);
  }

  if (attendanceState.fieldVisitSession) {
    await captureAttendanceEvent({
      kind: 'field_visit_end',
      source: 'field-visit',
      clinicId: attendanceState.fieldVisitSession.destinationClinicId,
      metadata: {
        destinationClinicId: attendanceState.fieldVisitSession.destinationClinicId,
        destinationClinicName: attendanceState.fieldVisitSession.destinationClinicName,
        note: 'Field visit ended from dashboard.',
        triggeredBy: 'dashboard-field-visit',
      },
    });
  }

  await refreshAttendanceAutomation();
};

export const stopAttendanceAutomation = async () => {
  const hasStarted = await Location.hasStartedGeofencingAsync(ATTENDANCE_GEOFENCE_TASK);

  if (hasStarted) {
    await Location.stopGeofencingAsync(ATTENDANCE_GEOFENCE_TASK);
  }

  useAttendanceStore.getState().setAutomationState('granted', false);
  useAttendanceStore.getState().setRegisteredGeofenceClinicIds([]);

  const hasStartedTracking = await Location.hasStartedLocationUpdatesAsync(FIELD_VISIT_LOCATION_TASK);

  if (hasStartedTracking) {
    await Location.stopLocationUpdatesAsync(FIELD_VISIT_LOCATION_TASK);
  }
};

export const reconcileCurrentPresence = async () => {
  const foregroundPermission = await Location.getForegroundPermissionsAsync();

  if (foregroundPermission.status !== 'granted') {
    return;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const currentClinic = findClinicContainingPoint(position);
  const store = useAttendanceStore.getState();

  if (currentClinic && (store.todayStatus === 'idle' || store.todayStatus === 'checked-out')) {
    await captureAttendanceEvent({
      kind: 'check_in',
      source: 'reconciliation',
      clinicId: currentClinic.id,
      metadata: createMetadata(position, 'presence-reconciliation', currentClinic.id),
    });

    return;
  }

  if (!currentClinic && store.todayStatus === 'checked-in' && !store.fieldVisitSession) {
    await captureAttendanceEvent({
      kind: 'check_out',
      source: 'reconciliation',
      clinicId: store.currentClinicId,
      metadata: createMetadata(position, 'presence-reconciliation', store.currentClinicId),
    });
  }
};