CREATE DATABASE IF NOT EXISTS zmt_attendance;
USE zmt_attendance;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS clinics (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255) NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INT UNSIGNED NOT NULL DEFAULT 120,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clinics_code (code),
  KEY idx_clinics_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Employee', 'HR', 'Superadmin') NOT NULL,
  assigned_clinic_id BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_assigned_clinic (assigned_clinic_id),
  CONSTRAINT fk_users_assigned_clinic
    FOREIGN KEY (assigned_clinic_id) REFERENCES clinics (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_clinic_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  clinic_id BIGINT UNSIGNED NOT NULL,
  assignment_type ENUM('primary', 'secondary', 'audit') NOT NULL DEFAULT 'secondary',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_clinic_assignment (user_id, clinic_id),
  KEY idx_user_clinic_assignments_clinic (clinic_id),
  CONSTRAINT fk_user_clinic_assignments_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_user_clinic_assignments_clinic
    FOREIGN KEY (clinic_id) REFERENCES clinics (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  clinic_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('check_in', 'check_out', 'field_visit_start', 'field_visit_end', 'audit_enter', 'audit_exit') NOT NULL,
  trigger_source ENUM('manual', 'geofence', 'reconciliation', 'field-visit', 'admin-adjustment', 'live-location') NOT NULL,
  event_timestamp DATETIME(6) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attendance_logs_user_time (user_id, event_timestamp),
  KEY idx_attendance_logs_clinic_time (clinic_id, event_timestamp),
  CONSTRAINT fk_attendance_logs_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_attendance_logs_clinic
    FOREIGN KEY (clinic_id) REFERENCES clinics (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS field_visit_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  origin_clinic_id BIGINT UNSIGNED NOT NULL,
  destination_clinic_id BIGINT UNSIGNED NOT NULL,
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  started_at DATETIME(6) NOT NULL,
  ended_at DATETIME(6) NULL,
  realtime_channel VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_field_visit_sessions_user (user_id),
  KEY idx_field_visit_sessions_status (status),
  CONSTRAINT fk_field_visit_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_field_visit_sessions_origin_clinic
    FOREIGN KEY (origin_clinic_id) REFERENCES clinics (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_field_visit_sessions_destination_clinic
    FOREIGN KEY (destination_clinic_id) REFERENCES clinics (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS field_visit_live_locations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  field_visit_session_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy_meters DECIMAL(8,2) NULL,
  heading DECIMAL(8,2) NULL,
  speed_mps DECIMAL(8,2) NULL,
  recorded_at DATETIME(6) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_field_visit_live_locations_session_time (field_visit_session_id, recorded_at),
  CONSTRAINT fk_field_visit_live_locations_session
    FOREIGN KEY (field_visit_session_id) REFERENCES field_visit_sessions (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_field_visit_live_locations_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS field_visit_audit_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  field_visit_session_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  clinic_id BIGINT UNSIGNED NOT NULL,
  entered_at DATETIME(6) NOT NULL,
  exited_at DATETIME(6) NULL,
  duration_minutes INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_field_visit_audit_sessions_session (field_visit_session_id),
  KEY idx_field_visit_audit_sessions_clinic (clinic_id),
  CONSTRAINT fk_field_visit_audit_sessions_session
    FOREIGN KEY (field_visit_session_id) REFERENCES field_visit_sessions (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_field_visit_audit_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_field_visit_audit_sessions_clinic
    FOREIGN KEY (clinic_id) REFERENCES clinics (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('Sick', 'Casual', 'Annual') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  reviewer_user_id BIGINT UNSIGNED NULL,
  reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_leave_requests_user (user_id),
  KEY idx_leave_requests_status (status),
  CONSTRAINT fk_leave_requests_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_leave_requests_reviewer
    FOREIGN KEY (reviewer_user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO clinics (id, code, name, city, address, latitude, longitude, radius_meters, is_active)
VALUES
  (1, 'LGM-001', 'Yaba Central Clinic', 'Lagos', '12 Herbert Macaulay Way, Yaba', 6.5095000, 3.3713000, 120, 1),
  (2, 'ABJ-001', 'Wuse District Clinic', 'Abuja', '14 Adetokunbo Ademola Crescent, Wuse II', 9.0782000, 7.4811000, 125, 1),
  (3, 'ZMT-G', 'ZMT Gulshan', 'Karachi', 'FL-6, 6, Block 4 Block 04 Gulshan-e-Iqbal, Karachi, 75300, Pakistan', 24.9004884, 67.0824283, 120, 1),
  (4, 'ZMT-B', 'ZMT Bahadurabad', 'Karachi', '25 Bahadur Shah Zafar Road, Bahadurabad, Karachi, Pakistan', 24.8829000, 67.0688000, 120, 1),
  (5, 'ZMT-C', 'ZMT Clifton', 'Karachi', 'Block 5 Clifton, Karachi, Pakistan', 24.8137000, 67.0305000, 125, 1),
  (6, 'ZMT-D', 'ZMT DHA', 'Karachi', 'Khayaban-e-Shahbaz, DHA Phase 6, Karachi, Pakistan', 24.8004000, 67.0657000, 130, 1),
  (7, 'ZMT-N', 'ZMT North Nazimabad', 'Karachi', 'Block H North Nazimabad, Karachi, Pakistan', 24.9387000, 67.0436000, 128, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  city = VALUES(city),
  address = VALUES(address),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude),
  radius_meters = VALUES(radius_meters),
  is_active = VALUES(is_active);

INSERT INTO users (id, name, email, password_hash, role, assigned_clinic_id, is_active)
VALUES
  (1, 'Musa Ibrahim', 'superadmin@zmt.example.com', 'pbkdf2_sha512$100000$zmt-demo-salt$cb296b7418988e10d97edf31577db76de5fbbf23572334a35296625988714ca729cdda9f2f3b81231ab95fb82b81f22a4b3a9f2ba3a1a47f68e6029d657fe8bc', 'Superadmin', 1, 1),
  (2, 'Chiamaka Nwosu', 'hr.operations@zmt.example.com', 'pbkdf2_sha512$100000$zmt-demo-salt$cb296b7418988e10d97edf31577db76de5fbbf23572334a35296625988714ca729cdda9f2f3b81231ab95fb82b81f22a4b3a9f2ba3a1a47f68e6029d657fe8bc', 'HR', 1, 1),
  (3, 'Ada Okafor', 'ada.okafor@zmt.example.com', 'pbkdf2_sha512$100000$zmt-demo-salt$cb296b7418988e10d97edf31577db76de5fbbf23572334a35296625988714ca729cdda9f2f3b81231ab95fb82b81f22a4b3a9f2ba3a1a47f68e6029d657fe8bc', 'Employee', 1, 1),
  (4, 'Ali Raza', 'ali.raza@zmt.example.com', 'pbkdf2_sha512$100000$zmt-demo-salt$cb296b7418988e10d97edf31577db76de5fbbf23572334a35296625988714ca729cdda9f2f3b81231ab95fb82b81f22a4b3a9f2ba3a1a47f68e6029d657fe8bc', 'Employee', 3, 1),
  (5, 'Sana Ahmed', 'sana.ahmed@zmt.example.com', 'pbkdf2_sha512$100000$zmt-demo-salt$cb296b7418988e10d97edf31577db76de5fbbf23572334a35296625988714ca729cdda9f2f3b81231ab95fb82b81f22a4b3a9f2ba3a1a47f68e6029d657fe8bc', 'Employee', 4, 1),
  (6, 'Hamza Khan', 'hamza.khan@zmt.example.com', 'pbkdf2_sha512$100000$zmt-demo-salt$cb296b7418988e10d97edf31577db76de5fbbf23572334a35296625988714ca729cdda9f2f3b81231ab95fb82b81f22a4b3a9f2ba3a1a47f68e6029d657fe8bc', 'Employee', 5, 1),
  (7, 'Ayesha Malik', 'ayesha.malik@zmt.example.com', 'pbkdf2_sha512$100000$zmt-demo-salt$cb296b7418988e10d97edf31577db76de5fbbf23572334a35296625988714ca729cdda9f2f3b81231ab95fb82b81f22a4b3a9f2ba3a1a47f68e6029d657fe8bc', 'Employee', 6, 1),
  (8, 'Bilal Siddiqui', 'bilal.siddiqui@zmt.example.com', 'pbkdf2_sha512$100000$zmt-demo-salt$cb296b7418988e10d97edf31577db76de5fbbf23572334a35296625988714ca729cdda9f2f3b81231ab95fb82b81f22a4b3a9f2ba3a1a47f68e6029d657fe8bc', 'Employee', 7, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  assigned_clinic_id = VALUES(assigned_clinic_id),
  is_active = VALUES(is_active);

INSERT INTO user_clinic_assignments (user_id, clinic_id, assignment_type)
VALUES
  (1, 1, 'primary'),
  (1, 2, 'secondary'),
  (1, 3, 'secondary'),
  (1, 4, 'secondary'),
  (1, 5, 'secondary'),
  (1, 6, 'secondary'),
  (1, 7, 'secondary'),
  (2, 1, 'primary'),
  (2, 2, 'audit'),
  (2, 3, 'audit'),
  (2, 4, 'audit'),
  (2, 5, 'audit'),
  (2, 6, 'audit'),
  (2, 7, 'audit'),
  (3, 1, 'primary'),
  (3, 2, 'audit'),
  (3, 3, 'audit'),
  (4, 3, 'primary'),
  (4, 4, 'audit'),
  (5, 4, 'primary'),
  (5, 3, 'audit'),
  (6, 5, 'primary'),
  (6, 6, 'audit'),
  (7, 6, 'primary'),
  (7, 5, 'audit'),
  (8, 7, 'primary'),
  (8, 3, 'audit')
ON DUPLICATE KEY UPDATE
  assignment_type = VALUES(assignment_type);

INSERT INTO attendance_logs (user_id, clinic_id, event_type, trigger_source, event_timestamp, metadata)
VALUES
  (3, 1, 'check_in', 'geofence', '2026-04-01 08:58:00.000000', JSON_OBJECT('accuracy', 11.3, 'note', 'Morning automatic check-in')),
  (3, 2, 'field_visit_start', 'manual', '2026-04-01 11:10:00.000000', JSON_OBJECT('destination_clinic_id', 2, 'destination_clinic_name', 'Wuse District Clinic')),
  (3, 2, 'field_visit_end', 'manual', '2026-04-01 14:45:00.000000', JSON_OBJECT('note', 'Audit complete'));

INSERT INTO field_visit_sessions (id, user_id, origin_clinic_id, destination_clinic_id, status, started_at, ended_at, realtime_channel)
VALUES
  (1, 3, 1, 2, 'completed', '2026-04-01 11:10:00.000000', '2026-04-01 14:45:00.000000', 'fieldVisits/3')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  ended_at = VALUES(ended_at),
  realtime_channel = VALUES(realtime_channel);

INSERT INTO field_visit_audit_sessions (field_visit_session_id, user_id, clinic_id, entered_at, exited_at, duration_minutes)
VALUES
  (1, 3, 2, '2026-04-01 11:40:00.000000', '2026-04-01 14:20:00.000000', 160);

INSERT INTO leave_requests (user_id, type, start_date, end_date, status, reviewer_user_id, reason, reviewed_at)
VALUES
  (3, 'Annual', '2026-04-12', '2026-04-14', 'Pending', NULL, 'Family travel', NULL),
  (2, 'Casual', '2026-04-20', '2026-04-20', 'Approved', 1, 'Regional hiring event', '2026-03-28 09:20:00');