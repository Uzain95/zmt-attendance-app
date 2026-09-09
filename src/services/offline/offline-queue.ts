import * as SQLite from 'expo-sqlite';

import type { AttendanceEventPayload, PendingAttendanceMutation } from '../../types/attendance';

type QueueRow = {
  id: string;
  payload: string;
  created_at: string;
  retry_count: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDatabase = async () => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('zmt-attendance.db');
  }

  return databasePromise;
};

export const initializeOfflineQueue = async () => {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS attendance_queue (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0
    );
  `);
};

export const enqueueAttendanceEvent = async (payload: AttendanceEventPayload) => {
  const db = await getDatabase();

  await db.runAsync(
    'INSERT OR REPLACE INTO attendance_queue (id, payload, created_at, retry_count) VALUES (?, ?, ?, ?)',
    [payload.id, JSON.stringify(payload), new Date().toISOString(), 0],
  );
};

export const getPendingAttendanceEvents = async (): Promise<PendingAttendanceMutation[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<QueueRow>(
    'SELECT id, payload, created_at, retry_count FROM attendance_queue ORDER BY created_at ASC',
  );

  return rows.map((row) => ({
    id: row.id,
    payload: JSON.parse(row.payload) as AttendanceEventPayload,
    createdAt: row.created_at,
    retryCount: row.retry_count,
  }));
};

export const removeAttendanceEvent = async (id: string) => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM attendance_queue WHERE id = ?', [id]);
};

export const incrementRetryCount = async (id: string) => {
  const db = await getDatabase();
  await db.runAsync('UPDATE attendance_queue SET retry_count = retry_count + 1 WHERE id = ?', [id]);
};

export const getPendingQueueSize = async () => {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM attendance_queue',
  );

  return result?.count ?? 0;
};