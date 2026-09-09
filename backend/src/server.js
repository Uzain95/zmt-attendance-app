const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const { execute, query, waitForDatabase, withTransaction } = require('./database');
const { authenticate, requireRole } = require('./middleware/auth');
const { verifyPassword } = require('./security/password');
const { signAccessToken } = require('./security/token');

const app = express();
const port = Number(process.env.API_PORT || 3000);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const sendError = (response, error) => {
  response.status(500).json({ message: error.message });
};

const getUserAssignments = async (userId) =>
  query(
    `SELECT uca.clinic_id, c.code, c.name, uca.assignment_type
     FROM user_clinic_assignments uca
     INNER JOIN clinics c ON c.id = uca.clinic_id
     WHERE uca.user_id = ?
     ORDER BY FIELD(uca.assignment_type, 'primary', 'secondary', 'audit'), c.name ASC`,
    [userId],
  );

const resolveRequestedUserId = (request) => {
  const requestedUserId = request.query.userId || request.body?.user_id;

  if (request.auth.role === 'Employee') {
    return request.auth.id;
  }

  return requestedUserId ? Number(requestedUserId) : undefined;
};

app.get('/health', async (_request, response) => {
  try {
    const rows = await query('SELECT 1 AS ok');
    response.json({ status: 'ok', database: rows[0]?.ok === 1 ? 'connected' : 'unknown' });
  } catch (error) {
    response.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/auth/login', async (request, response) => {
  try {
    const { email, password } = request.body ?? {};

    if (!email || !password) {
      return response.status(400).json({ message: 'Email and password are required.' });
    }

    const rows = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.assigned_clinic_id, c.name AS assigned_clinic_name
       FROM users u
       LEFT JOIN clinics c ON c.id = u.assigned_clinic_id
       WHERE u.email = ? AND u.is_active = 1
       LIMIT 1`,
      [String(email).trim().toLowerCase()],
    );

    const user = rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return response.status(401).json({ message: 'Invalid credentials.' });
    }

    const assignments = await getUserAssignments(user.id);
    const accessToken = signAccessToken(user);

    return response.json({
      accessToken,
      user: {
        assignedClinicId: user.assigned_clinic_id,
        assignedClinicName: user.assigned_clinic_name,
        assignments,
        email: user.email,
        id: user.id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return sendError(response, error);
  }
});

app.get('/api/auth/me', authenticate, async (request, response) => {
  try {
    const assignments = await getUserAssignments(request.auth.id);
    return response.json({
      ...request.auth,
      assignments,
    });
  } catch (error) {
    return sendError(response, error);
  }
});

app.get('/api/clinics', authenticate, async (_request, response) => {
  try {
    const rows = await query(
      `SELECT id, code, name, city, address, latitude, longitude, radius_meters, is_active
       FROM clinics
       ORDER BY name ASC`,
    );

    response.json(rows);
  } catch (error) {
    sendError(response, error);
  }
});

app.post('/api/clinics', authenticate, requireRole('Superadmin'), async (request, response) => {
  try {
    const { code, name, city, address, latitude, longitude, radius_meters, is_active = 1 } = request.body ?? {};

    if (!code || !name || !city || latitude === undefined || longitude === undefined) {
      return response.status(400).json({ message: 'Clinic code, name, city, latitude, and longitude are required.' });
    }

    const result = await execute(
      `INSERT INTO clinics (code, name, city, address, latitude, longitude, radius_meters, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name, city, address ?? null, latitude, longitude, radius_meters ?? 120, is_active ? 1 : 0],
    );

    const rows = await query('SELECT * FROM clinics WHERE id = ?', [result.insertId]);
    return response.status(201).json(rows[0]);
  } catch (error) {
    return sendError(response, error);
  }
});

app.put('/api/clinics/:clinicId', authenticate, requireRole('Superadmin'), async (request, response) => {
  try {
    const clinicId = Number(request.params.clinicId);
    const { code, name, city, address, latitude, longitude, radius_meters, is_active } = request.body ?? {};

    await execute(
      `UPDATE clinics
       SET code = ?, name = ?, city = ?, address = ?, latitude = ?, longitude = ?, radius_meters = ?, is_active = ?
       WHERE id = ?`,
      [code, name, city, address ?? null, latitude, longitude, radius_meters ?? 120, is_active ? 1 : 0, clinicId],
    );

    const rows = await query('SELECT * FROM clinics WHERE id = ?', [clinicId]);
    return response.json(rows[0]);
  } catch (error) {
    return sendError(response, error);
  }
});

app.get('/api/users', authenticate, requireRole('HR', 'Superadmin'), async (_request, response) => {
  try {
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.role, c.name AS assigned_clinic_name
       FROM users u
       LEFT JOIN clinics c ON c.id = u.assigned_clinic_id
       ORDER BY u.id ASC`,
    );

    response.json(rows);
  } catch (error) {
    sendError(response, error);
  }
});

app.get('/api/attendance/logs', authenticate, async (request, response) => {
  try {
    const requestedUserId = resolveRequestedUserId(request);
    const clinicId = request.query.clinicId ? Number(request.query.clinicId) : undefined;
    const conditions = [];
    const params = [];

    if (requestedUserId) {
      conditions.push('al.user_id = ?');
      params.push(requestedUserId);
    }

    if (clinicId) {
      conditions.push('al.clinic_id = ?');
      params.push(clinicId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT al.id, al.user_id, u.name AS user_name, al.clinic_id, c.name AS clinic_name,
              al.event_type, al.trigger_source, al.event_timestamp, al.metadata
       FROM attendance_logs al
       INNER JOIN users u ON u.id = al.user_id
       INNER JOIN clinics c ON c.id = al.clinic_id
       ${whereClause}
       ORDER BY al.event_timestamp DESC
       LIMIT 200`,
      params,
    );

    return response.json(rows);
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/attendance/logs', authenticate, async (request, response) => {
  try {
    const userId = resolveRequestedUserId(request) ?? request.auth.id;
    const { clinic_id, event_type, trigger_source, event_timestamp, metadata } = request.body ?? {};

    if (!clinic_id || !event_type || !trigger_source || !event_timestamp) {
      return response.status(400).json({ message: 'clinic_id, event_type, trigger_source, and event_timestamp are required.' });
    }

    const result = await execute(
      `INSERT INTO attendance_logs (user_id, clinic_id, event_type, trigger_source, event_timestamp, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, clinic_id, event_type, trigger_source, event_timestamp, metadata ? JSON.stringify(metadata) : null],
    );

    const rows = await query('SELECT * FROM attendance_logs WHERE id = ?', [result.insertId]);
    return response.status(201).json(rows[0]);
  } catch (error) {
    return sendError(response, error);
  }
});

app.get('/api/field-visits/active', authenticate, async (request, response) => {
  try {
    const conditions = ['fvs.status = ?'];
    const params = ['active'];

    if (request.auth.role === 'Employee') {
      conditions.push('fvs.user_id = ?');
      params.push(request.auth.id);
    }

    const rows = await query(
      `SELECT fvs.id, fvs.user_id, u.name AS user_name, u.role AS user_role,
              origin.name AS origin_clinic_name, destination.name AS destination_clinic_name,
              fvs.status, fvs.started_at, fvs.ended_at, fvs.realtime_channel,
              fll.latitude, fll.longitude, fll.accuracy_meters, fll.heading, fll.speed_mps, fll.recorded_at,
              fas.id AS audit_session_id, fas.entered_at, fas.exited_at, fas.duration_minutes,
              audit_clinic.name AS audit_clinic_name
       FROM field_visit_sessions fvs
       INNER JOIN users u ON u.id = fvs.user_id
       INNER JOIN clinics origin ON origin.id = fvs.origin_clinic_id
       INNER JOIN clinics destination ON destination.id = fvs.destination_clinic_id
       LEFT JOIN field_visit_audit_sessions fas
         ON fas.field_visit_session_id = fvs.id AND fas.exited_at IS NULL
       LEFT JOIN clinics audit_clinic ON audit_clinic.id = fas.clinic_id
       LEFT JOIN field_visit_live_locations fll
         ON fll.id = (
           SELECT inner_fll.id
           FROM field_visit_live_locations inner_fll
           WHERE inner_fll.field_visit_session_id = fvs.id
           ORDER BY inner_fll.recorded_at DESC
           LIMIT 1
         )
       WHERE ${conditions.join(' AND ')}
       ORDER BY fvs.started_at DESC`,
      params,
    );

    return response.json(rows);
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/field-visits/start', authenticate, async (request, response) => {
  try {
    const { destination_clinic_id, origin_clinic_id, started_at, trigger_source = 'manual' } = request.body ?? {};
    const userId = request.auth.id;
    const originClinicId = Number(origin_clinic_id || request.auth.clinicId);
    const destinationClinicId = Number(destination_clinic_id);

    if (!originClinicId || !destinationClinicId || !started_at) {
      return response.status(400).json({ message: 'origin_clinic_id, destination_clinic_id, and started_at are required.' });
    }

    const result = await withTransaction(async (connection) => {
      const [sessionResult] = await connection.execute(
        `INSERT INTO field_visit_sessions (user_id, origin_clinic_id, destination_clinic_id, status, started_at, realtime_channel)
         VALUES (?, ?, ?, 'active', ?, ?)`,
        [userId, originClinicId, destinationClinicId, started_at, `fieldVisits/${userId}`],
      );

      await connection.execute(
        `INSERT INTO attendance_logs (user_id, clinic_id, event_type, trigger_source, event_timestamp, metadata)
         VALUES (?, ?, 'field_visit_start', ?, ?, JSON_OBJECT('destination_clinic_id', ?, 'field_visit_session_id', ?))`,
        [userId, destinationClinicId, trigger_source, started_at, destinationClinicId, sessionResult.insertId],
      );

      return sessionResult.insertId;
    });

    const rows = await query('SELECT * FROM field_visit_sessions WHERE id = ?', [result]);
    return response.status(201).json(rows[0]);
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/field-visits/:fieldVisitId/location', authenticate, async (request, response) => {
  try {
    const fieldVisitId = Number(request.params.fieldVisitId);
    const { latitude, longitude, accuracy_meters, heading, speed_mps, recorded_at } = request.body ?? {};

    if (latitude === undefined || longitude === undefined || !recorded_at) {
      return response.status(400).json({ message: 'latitude, longitude, and recorded_at are required.' });
    }

    const visits = await query('SELECT id, user_id FROM field_visit_sessions WHERE id = ? LIMIT 1', [fieldVisitId]);
    const visit = visits[0];

    if (!visit) {
      return response.status(404).json({ message: 'Field visit session not found.' });
    }

    if (request.auth.role === 'Employee' && visit.user_id !== request.auth.id) {
      return response.status(403).json({ message: 'You can only publish locations for your own visit.' });
    }

    const result = await execute(
      `INSERT INTO field_visit_live_locations (field_visit_session_id, user_id, latitude, longitude, accuracy_meters, heading, speed_mps, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fieldVisitId, visit.user_id, latitude, longitude, accuracy_meters ?? null, heading ?? null, speed_mps ?? null, recorded_at],
    );

    const rows = await query('SELECT * FROM field_visit_live_locations WHERE id = ?', [result.insertId]);
    return response.status(201).json(rows[0]);
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/field-visits/:fieldVisitId/audit-enter', authenticate, async (request, response) => {
  try {
    const fieldVisitId = Number(request.params.fieldVisitId);
    const { clinic_id, entered_at, trigger_source = 'geofence' } = request.body ?? {};

    if (!clinic_id || !entered_at) {
      return response.status(400).json({ message: 'clinic_id and entered_at are required.' });
    }

    const result = await withTransaction(async (connection) => {
      const [visitRows] = await connection.execute(
        'SELECT id, user_id FROM field_visit_sessions WHERE id = ? LIMIT 1',
        [fieldVisitId],
      );
      const visit = visitRows[0];

      if (!visit) {
        const error = new Error('Field visit session not found.');
        error.statusCode = 404;
        throw error;
      }

      if (request.auth.role === 'Employee' && visit.user_id !== request.auth.id) {
        const error = new Error('You can only audit your own field visit.');
        error.statusCode = 403;
        throw error;
      }

      const [auditResult] = await connection.execute(
        `INSERT INTO field_visit_audit_sessions (field_visit_session_id, user_id, clinic_id, entered_at)
         VALUES (?, ?, ?, ?)`,
        [fieldVisitId, visit.user_id, clinic_id, entered_at],
      );

      await connection.execute(
        `INSERT INTO attendance_logs (user_id, clinic_id, event_type, trigger_source, event_timestamp, metadata)
         VALUES (?, ?, 'audit_enter', ?, ?, JSON_OBJECT('field_visit_session_id', ?, 'audit_session_id', ?))`,
        [visit.user_id, clinic_id, trigger_source, entered_at, fieldVisitId, auditResult.insertId],
      );

      return auditResult.insertId;
    });

    const rows = await query('SELECT * FROM field_visit_audit_sessions WHERE id = ?', [result]);
    return response.status(201).json(rows[0]);
  } catch (error) {
    return response.status(error.statusCode || 500).json({ message: error.message });
  }
});

app.post('/api/field-visits/:fieldVisitId/audit-exit', authenticate, async (request, response) => {
  try {
    const fieldVisitId = Number(request.params.fieldVisitId);
    const { clinic_id, exited_at, trigger_source = 'geofence' } = request.body ?? {};

    if (!clinic_id || !exited_at) {
      return response.status(400).json({ message: 'clinic_id and exited_at are required.' });
    }

    const result = await withTransaction(async (connection) => {
      const [auditRows] = await connection.execute(
        `SELECT id, user_id, entered_at
         FROM field_visit_audit_sessions
         WHERE field_visit_session_id = ? AND clinic_id = ? AND exited_at IS NULL
         ORDER BY entered_at DESC
         LIMIT 1`,
        [fieldVisitId, clinic_id],
      );
      const auditSession = auditRows[0];

      if (!auditSession) {
        const error = new Error('Active audit session not found.');
        error.statusCode = 404;
        throw error;
      }

      const durationRows = await connection.execute(
        `SELECT TIMESTAMPDIFF(MINUTE, ?, ?) AS duration_minutes`,
        [auditSession.entered_at, exited_at],
      );
      const durationMinutes = durationRows[0][0].duration_minutes;

      await connection.execute(
        `UPDATE field_visit_audit_sessions
         SET exited_at = ?, duration_minutes = ?
         WHERE id = ?`,
        [exited_at, durationMinutes, auditSession.id],
      );

      await connection.execute(
        `INSERT INTO attendance_logs (user_id, clinic_id, event_type, trigger_source, event_timestamp, metadata)
         VALUES (?, ?, 'audit_exit', ?, ?, JSON_OBJECT('field_visit_session_id', ?, 'audit_session_id', ?, 'duration_minutes', ?))`,
        [auditSession.user_id, clinic_id, trigger_source, exited_at, fieldVisitId, auditSession.id, durationMinutes],
      );

      return auditSession.id;
    });

    const rows = await query('SELECT * FROM field_visit_audit_sessions WHERE id = ?', [result]);
    return response.json(rows[0]);
  } catch (error) {
    return response.status(error.statusCode || 500).json({ message: error.message });
  }
});

app.post('/api/field-visits/:fieldVisitId/end', authenticate, async (request, response) => {
  try {
    const fieldVisitId = Number(request.params.fieldVisitId);
    const { clinic_id, ended_at, trigger_source = 'manual' } = request.body ?? {};

    if (!clinic_id || !ended_at) {
      return response.status(400).json({ message: 'clinic_id and ended_at are required.' });
    }

    await withTransaction(async (connection) => {
      const [visitRows] = await connection.execute('SELECT id, user_id FROM field_visit_sessions WHERE id = ? LIMIT 1', [fieldVisitId]);
      const visit = visitRows[0];

      if (!visit) {
        const error = new Error('Field visit session not found.');
        error.statusCode = 404;
        throw error;
      }

      await connection.execute(
        `UPDATE field_visit_sessions
         SET status = 'completed', ended_at = ?
         WHERE id = ?`,
        [ended_at, fieldVisitId],
      );

      await connection.execute(
        `INSERT INTO attendance_logs (user_id, clinic_id, event_type, trigger_source, event_timestamp, metadata)
         VALUES (?, ?, 'field_visit_end', ?, ?, JSON_OBJECT('field_visit_session_id', ?))`,
        [visit.user_id, clinic_id, trigger_source, ended_at, fieldVisitId],
      );
    });

    const rows = await query('SELECT * FROM field_visit_sessions WHERE id = ?', [fieldVisitId]);
    return response.json(rows[0]);
  } catch (error) {
    return response.status(error.statusCode || 500).json({ message: error.message });
  }
});

app.get('/api/leaves', authenticate, async (request, response) => {
  try {
    const conditions = [];
    const params = [];

    if (request.auth.role === 'Employee') {
      conditions.push('lr.user_id = ?');
      params.push(request.auth.id);
    } else if (request.query.status) {
      conditions.push('lr.status = ?');
      params.push(request.query.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT lr.id, lr.user_id, u.name AS user_name, lr.type, lr.start_date, lr.end_date,
              lr.status, reviewer.name AS reviewer_name, lr.reason, lr.created_at, lr.reviewed_at
       FROM leave_requests lr
       INNER JOIN users u ON u.id = lr.user_id
       LEFT JOIN users reviewer ON reviewer.id = lr.reviewer_user_id
       ${whereClause}
       ORDER BY lr.created_at DESC`,
      params,
    );

    return response.json(rows);
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/leaves', authenticate, async (request, response) => {
  try {
    const { type, start_date, end_date, reason } = request.body ?? {};

    if (!type || !start_date || !end_date) {
      return response.status(400).json({ message: 'type, start_date, and end_date are required.' });
    }

    const result = await execute(
      `INSERT INTO leave_requests (user_id, type, start_date, end_date, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [request.auth.id, type, start_date, end_date, reason ?? null],
    );

    const rows = await query('SELECT * FROM leave_requests WHERE id = ?', [result.insertId]);
    return response.status(201).json(rows[0]);
  } catch (error) {
    return sendError(response, error);
  }
});

app.post('/api/leaves/:leaveId/review', authenticate, requireRole('HR', 'Superadmin'), async (request, response) => {
  try {
    const leaveId = Number(request.params.leaveId);
    const { status } = request.body ?? {};

    if (!['Approved', 'Rejected'].includes(status)) {
      return response.status(400).json({ message: 'status must be Approved or Rejected.' });
    }

    await execute(
      `UPDATE leave_requests
       SET status = ?, reviewer_user_id = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, request.auth.id, leaveId],
    );

    const rows = await query('SELECT * FROM leave_requests WHERE id = ?', [leaveId]);
    return response.json(rows[0]);
  } catch (error) {
    return sendError(response, error);
  }
});

const start = async () => {
  try {
    await waitForDatabase();
    app.listen(port, () => {
      console.log(`ZMT backend listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start API server:', error);
    process.exit(1);
  }
};

start();