import { getClinicById, getClinicNameById } from '../../constants/clinics';
import { useAttendanceStore } from '../../store/attendance-store';
import type { LiveFieldVisitLocation, LiveFieldVisitTracker } from '../../types/attendance';

type MockRealtimeDatabase = {
  activeFieldVisits: Record<string, LiveFieldVisitTracker>;
  lastEventAt?: string;
};

const mockRealtimeDatabase: MockRealtimeDatabase = {
  activeFieldVisits: {},
};

let simulationTimer: ReturnType<typeof setInterval> | null = null;

const buildRealtimePath = (employeeId: string) => `fieldVisits/${employeeId}`;

const cloneSnapshot = (tracker: LiveFieldVisitTracker): LiveFieldVisitTracker => ({
  ...tracker,
  activeAuditSession: tracker.activeAuditSession ? { ...tracker.activeAuditSession } : undefined,
  currentLocation: { ...tracker.currentLocation },
  recentAuditSessions: tracker.recentAuditSessions.map((session) => ({ ...session })),
  routeTrail: tracker.routeTrail.map((point) => ({ ...point })),
});

const syncStoreSnapshot = () => {
  useAttendanceStore.getState().setLiveFieldVisitSnapshots(Object.values(mockRealtimeDatabase.activeFieldVisits).map(cloneSnapshot));
};

export const publishLiveFieldVisitTracker = (tracker: LiveFieldVisitTracker) => {
  mockRealtimeDatabase.activeFieldVisits[tracker.employeeId] = cloneSnapshot(tracker);
  mockRealtimeDatabase.lastEventAt = tracker.lastUpdatedAt;
  syncStoreSnapshot();
};

export const clearLiveFieldVisitTracker = (employeeId: string) => {
  delete mockRealtimeDatabase.activeFieldVisits[employeeId];
  mockRealtimeDatabase.lastEventAt = new Date().toISOString();
  syncStoreSnapshot();
};

export const getLiveFieldVisitSnapshot = () => Object.values(mockRealtimeDatabase.activeFieldVisits).map(cloneSnapshot);

const nudgeLocation = (origin: LiveFieldVisitLocation, destinationLatitude: number, destinationLongitude: number) => {
  const nextLatitude = origin.latitude + (destinationLatitude - origin.latitude) * 0.18;
  const nextLongitude = origin.longitude + (destinationLongitude - origin.longitude) * 0.18;

  return {
    accuracy: 12,
    heading: origin.heading,
    latitude: Number(nextLatitude.toFixed(6)),
    longitude: Number(nextLongitude.toFixed(6)),
    speedMps: 12,
    timestamp: new Date().toISOString(),
  };
};

const seedRemoteTravelers = () => {
  if (Object.keys(mockRealtimeDatabase.activeFieldVisits).length > 0) {
    return;
  }

  const destinationClinic = getClinicById('clinic-13');
  const destinationClinicTwo = getClinicById('clinic-24');

  if (!destinationClinic || !destinationClinicTwo) {
    return;
  }

  publishLiveFieldVisitTracker({
    activeAuditSession: undefined,
    currentClinicId: undefined,
    currentClinicName: undefined,
    currentLocation: {
      accuracy: 18,
      heading: 72,
      latitude: 6.5809,
      longitude: 3.3624,
      speedMps: 14,
      timestamp: new Date().toISOString(),
    },
    destinationClinicId: destinationClinic.id,
    destinationClinicName: destinationClinic.name,
    employeeId: 'employee-remote-1',
    employeeName: 'Temi Alade',
    employeeRole: 'Nursing Lead',
    fieldVisitStartedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    primaryClinicId: 'clinic-07',
    primaryClinicName: getClinicNameById('clinic-07'),
    realtimePath: buildRealtimePath('employee-remote-1'),
    recentAuditSessions: [],
    routeTrail: [],
    status: 'en-route',
  });

  publishLiveFieldVisitTracker({
    activeAuditSession: {
      clinicId: destinationClinicTwo.id,
      clinicName: destinationClinicTwo.name,
      durationMinutes: 45,
      endedAt: undefined,
      id: 'audit-remote-1',
      startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
    currentClinicId: destinationClinicTwo.id,
    currentClinicName: destinationClinicTwo.name,
    currentLocation: {
      accuracy: 10,
      heading: 180,
      latitude: destinationClinicTwo.geofence.latitude,
      longitude: destinationClinicTwo.geofence.longitude,
      speedMps: 0,
      timestamp: new Date().toISOString(),
    },
    destinationClinicId: destinationClinicTwo.id,
    destinationClinicName: destinationClinicTwo.name,
    employeeId: 'employee-remote-2',
    employeeName: 'Kemi Hassan',
    employeeRole: 'Regional Audit Nurse',
    fieldVisitStartedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    primaryClinicId: 'clinic-20',
    primaryClinicName: getClinicNameById('clinic-20'),
    realtimePath: buildRealtimePath('employee-remote-2'),
    recentAuditSessions: [],
    routeTrail: [],
    status: 'auditing',
  });
};

export const ensureMockFieldVisitSimulation = () => {
  seedRemoteTravelers();

  if (simulationTimer) {
    return () => undefined;
  }

  simulationTimer = setInterval(() => {
    const currentSnapshot = getLiveFieldVisitSnapshot();

    currentSnapshot.forEach((tracker) => {
      if (tracker.employeeId === 'employee-remote-1') {
        const destinationClinic = getClinicById(tracker.destinationClinicId);

        if (!destinationClinic) {
          return;
        }

        const nextLocation = nudgeLocation(
          tracker.currentLocation,
          destinationClinic.geofence.latitude,
          destinationClinic.geofence.longitude,
        );
        const isNearDestination =
          Math.abs(nextLocation.latitude - destinationClinic.geofence.latitude) < 0.0008 &&
          Math.abs(nextLocation.longitude - destinationClinic.geofence.longitude) < 0.0008;

        publishLiveFieldVisitTracker({
          ...tracker,
          activeAuditSession: isNearDestination
            ? {
                clinicId: destinationClinic.id,
                clinicName: destinationClinic.name,
                durationMinutes: tracker.activeAuditSession?.durationMinutes ?? 0,
                id: tracker.activeAuditSession?.id ?? 'audit-remote-seeded',
                startedAt: tracker.activeAuditSession?.startedAt ?? new Date().toISOString(),
              }
            : undefined,
          currentClinicId: isNearDestination ? destinationClinic.id : undefined,
          currentClinicName: isNearDestination ? destinationClinic.name : undefined,
          currentLocation: nextLocation,
          lastUpdatedAt: nextLocation.timestamp,
          routeTrail: [...tracker.routeTrail.slice(-14), nextLocation],
          status: isNearDestination ? 'auditing' : 'en-route',
        });
        return;
      }

      if (tracker.employeeId === 'employee-remote-2' && tracker.activeAuditSession) {
        publishLiveFieldVisitTracker({
          ...tracker,
          activeAuditSession: {
            ...tracker.activeAuditSession,
            durationMinutes: (tracker.activeAuditSession.durationMinutes ?? 0) + 1,
          },
          lastUpdatedAt: new Date().toISOString(),
        });
      }
    });
  }, 15_000);

  return () => {
    if (simulationTimer) {
      clearInterval(simulationTimer);
      simulationTimer = null;
    }
  };
};