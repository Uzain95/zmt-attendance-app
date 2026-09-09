import NetInfo from '@react-native-community/netinfo';

import { submitAttendanceEvent } from '../api/attendance-api';
import {
  enqueueAttendanceEvent,
  getPendingAttendanceEvents,
  getPendingQueueSize,
  incrementRetryCount,
  initializeOfflineQueue,
  removeAttendanceEvent,
} from '../offline/offline-queue';
import { useAuthStore } from '../../store/auth-store';
import { useAttendanceStore } from '../../store/attendance-store';
import type { AttendanceEventKind, AttendanceEventPayload, AttendanceSource } from '../../types/attendance';

const DUPLICATE_EVENT_WINDOW_MS = 2 * 60 * 1000;

const generateEventId = () => `event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

type CaptureAttendanceInput = {
  kind: AttendanceEventKind;
  source: AttendanceSource;
  clinicId?: string;
  metadata?: AttendanceEventPayload['metadata'];
  timestamp?: string;
};

const resolveClinicId = ({ kind, clinicId, metadata }: CaptureAttendanceInput) => {
  if (clinicId) {
    return clinicId;
  }

  if (kind === 'field_visit_start' && metadata?.destinationClinicId) {
    return metadata.destinationClinicId;
  }

  const authUser = useAuthStore.getState().user;
  const attendanceState = useAttendanceStore.getState();
  return attendanceState.currentClinicId ?? authUser?.homeClinicId;
};

const buildAttendanceEvent = ({ kind, source, clinicId, metadata, timestamp }: CaptureAttendanceInput) => ({
  id: generateEventId(),
  kind,
  source,
  timestamp: timestamp ?? new Date().toISOString(),
  clinicId: resolveClinicId({ kind, source, clinicId, metadata, timestamp }),
  metadata,
});

const shouldSkipEvent = (event: AttendanceEventPayload) => {
  const state = useAttendanceStore.getState();

  if (
    state.lastEventAt &&
    state.lastEventKind === event.kind &&
    new Date(event.timestamp).getTime() - new Date(state.lastEventAt).getTime() < DUPLICATE_EVENT_WINDOW_MS
  ) {
    return true;
  }

  if (event.kind === 'check_in' && state.todayStatus === 'checked-in') {
    return true;
  }

  if (event.kind === 'check_in' && state.todayStatus === 'field-visit') {
    return true;
  }

  if (event.kind === 'check_out') {
    return state.todayStatus !== 'checked-in';
  }

  if (event.kind === 'field_visit_start') {
    return state.todayStatus !== 'checked-in';
  }

  if (event.kind === 'field_visit_end') {
    return state.todayStatus !== 'field-visit';
  }

  if (event.kind === 'audit_enter') {
    return Boolean(state.activeAuditSession && state.activeAuditSession.clinicId === event.clinicId);
  }

  if (event.kind === 'audit_exit') {
    return !state.activeAuditSession;
  }

  return false;
};

const updatePendingCount = async () => {
  const nextCount = await getPendingQueueSize();
  useAttendanceStore.getState().setPendingSyncCount(nextCount);
};

const persistOrSync = async (event: AttendanceEventPayload) => {
  const networkState = await NetInfo.fetch();
  const isOnline = Boolean(networkState.isConnected && networkState.isInternetReachable !== false);

  if (!isOnline) {
    await enqueueAttendanceEvent(event);
    await updatePendingCount();
    return 'queued';
  }

  try {
    await submitAttendanceEvent(event);
    await updatePendingCount();
    return 'sent';
  } catch {
    await enqueueAttendanceEvent(event);
    await updatePendingCount();
    return 'queued';
  }
};

export const captureAttendanceEvent = async (input: CaptureAttendanceInput) => {
  const event = buildAttendanceEvent(input);

  if (shouldSkipEvent(event)) {
    return { status: 'skipped' as const, event };
  }

  useAttendanceStore.getState().applyAttendanceEvent(event);
  const status = await persistOrSync(event);

  return { status, event };
};

export const synchronizeQueuedAttendance = async () => {
  await initializeOfflineQueue();

  const networkState = await NetInfo.fetch();
  const isOnline = Boolean(networkState.isConnected && networkState.isInternetReachable !== false);

  if (!isOnline) {
    await updatePendingCount();
    return;
  }

  const store = useAttendanceStore.getState();
  store.setSyncing(true);

  try {
    const queuedEvents = await getPendingAttendanceEvents();

    for (const queuedEvent of queuedEvents) {
      try {
        await submitAttendanceEvent(queuedEvent.payload);
        await removeAttendanceEvent(queuedEvent.id);
      } catch {
        await incrementRetryCount(queuedEvent.id);
      }
    }
  } finally {
    store.setSyncing(false);
    await updatePendingCount();
  }
};

export const startAttendanceSyncListener = () => {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void synchronizeQueuedAttendance();
    }
  });
};