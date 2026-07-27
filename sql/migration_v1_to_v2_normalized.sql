-- ============================================================================
-- easyITCalendar – Migration V1 -> V2 (normalisierte Event-Teilnehmer)
-- Voraussetzung: Die V1-Datenbank easyit_calendar ist vorhanden.
-- Vorher vollständiges Backup erstellen.
-- Zielsystem: MariaDB 10.4+
-- ============================================================================
USE easyit_calendar;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_frontend_events;
DROP VIEW IF EXISTS v_event_participants;

-- 1. Alte Eventtabelle sichern.
DROP TABLE IF EXISTS events_v1_backup;
RENAME TABLE events TO events_v1_backup;

-- 2. Neue Eventtabelle ohne feste Teilnehmerfelder.
CREATE TABLE events (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    start           DATETIME NOT NULL,
    end             DATETIME NOT NULL,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    thema           VARCHAR(255) NOT NULL DEFAULT '',
    description     TEXT NULL,
    location        VARCHAR(255) NULL,
    event_status    VARCHAR(30) NOT NULL DEFAULT 'planned',
    visibility      VARCHAR(30) NOT NULL DEFAULT 'private',
    color           VARCHAR(20) NULL,
    all_day         TINYINT(1) NOT NULL DEFAULT 0,
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    version_no      INT UNSIGNED NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_events_created_by FOREIGN KEY (created_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_events_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_events_period CHECK (`end` > `start`),
    KEY idx_events_period (`start`, `end`),
    KEY idx_events_activ_period (activ, `start`, `end`),
    KEY idx_events_status (event_status),
    KEY idx_events_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO events
(id, start, end, activ, thema, description, location, event_status, visibility,
 created_by, updated_by, version_no, created_at, updated_at)
SELECT
 id, start, end, activ, thema, description, location, event_status, visibility,
 created_by, updated_by, version_no, created_at, updated_at
FROM events_v1_backup;

-- 3. Teilnehmer-Zuordnungstabelle.
DROP TABLE IF EXISTS event_participants;
CREATE TABLE event_participants (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id            BIGINT UNSIGNED NOT NULL,
    person_id           INT UNSIGNED NOT NULL,
    role_id             INT UNSIGNED NOT NULL,
    participation_status VARCHAR(30) NOT NULL DEFAULT 'accepted',
    is_primary          TINYINT(1) NOT NULL DEFAULT 0,
    notes               VARCHAR(500) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_event_participant_role (event_id, person_id, role_id),
    KEY idx_event_participants_event_role (event_id, role_id, is_primary),
    KEY idx_event_participants_person_period (person_id, event_id),
    CONSTRAINT fk_event_participants_event FOREIGN KEY (event_id) REFERENCES events(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_event_participants_person FOREIGN KEY (person_id) REFERENCES persons(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_event_participants_role FOREIGN KEY (role_id) REFERENCES roles(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tutorrollen übernehmen.
INSERT IGNORE INTO event_participants
(event_id, person_id, role_id, participation_status, is_primary)
SELECT e.id, e.to_tutor, r.id, 'accepted', 1
FROM events_v1_backup e
JOIN roles r ON r.role_key = 'tutor'
WHERE e.to_tutor IS NOT NULL AND e.to_tutor > 0;

-- Teilnehmerrollen übernehmen. to_role wird bevorzugt, sofern diese Rolle existiert;
-- andernfalls wird die Systemrolle student verwendet.
INSERT IGNORE INTO event_participants
(event_id, person_id, role_id, participation_status, is_primary)
SELECT e.id,
       e.to_student,
       COALESCE(valid_role.id, student_role.id),
       'accepted',
       1
FROM events_v1_backup e
LEFT JOIN roles valid_role ON valid_role.id = e.to_role
JOIN roles student_role ON student_role.role_key = 'student'
WHERE e.to_student IS NOT NULL AND e.to_student > 0;

-- 4. Fremdschlüssel der Anlagen auf neue Eventtabelle neu aufbauen.
ALTER TABLE event_attachments DROP FOREIGN KEY fk_event_attachments_event;
ALTER TABLE event_attachments
  ADD CONSTRAINT fk_event_attachments_event
  FOREIGN KEY (event_id) REFERENCES events(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- 5. Kompatibilitätsviews.
CREATE OR REPLACE VIEW v_event_participants AS
SELECT ep.id, ep.event_id, ep.person_id, p.display_name, ep.role_id,
       r.role_key, r.role_name, ep.participation_status, ep.is_primary, ep.notes
FROM event_participants ep
JOIN persons p ON p.id = ep.person_id
JOIN roles r ON r.id = ep.role_id;

CREATE OR REPLACE VIEW v_frontend_events AS
SELECT
    e.id,
    COALESCE((SELECT ep.role_id FROM event_participants ep JOIN roles r ON r.id=ep.role_id
              WHERE ep.event_id=e.id AND r.role_key='student'
              ORDER BY ep.is_primary DESC, ep.id ASC LIMIT 1),0) AS to_role,
    COALESCE((SELECT ep.person_id FROM event_participants ep JOIN roles r ON r.id=ep.role_id
              WHERE ep.event_id=e.id AND r.role_key='tutor'
              ORDER BY ep.is_primary DESC, ep.id ASC LIMIT 1),0) AS to_tutor,
    COALESCE((SELECT ep.person_id FROM event_participants ep JOIN roles r ON r.id=ep.role_id
              WHERE ep.event_id=e.id AND r.role_key='student'
              ORDER BY ep.is_primary DESC, ep.id ASC LIMIT 1),0) AS to_student,
    DATE_FORMAT(e.start,'%Y-%m-%dT%H:%i:%s') AS start,
    DATE_FORMAT(e.end,'%Y-%m-%dT%H:%i:%s') AS end,
    e.activ,
    e.thema,
    COALESCE(e.description,'') AS description,
    CONCAT('[',COALESCE((SELECT GROUP_CONCAT(JSON_QUOTE(a.original_name)
      ORDER BY a.id SEPARATOR ',') FROM event_attachments a
      WHERE a.event_id=e.id AND a.activ=1),''),']') AS appendizies
FROM events e;

SET FOREIGN_KEY_CHECKS = 1;

-- Kontrolle: Die Zahl der Events muss in beiden Tabellen identisch sein.
SELECT 'events_v1_backup' AS source, COUNT(*) AS amount FROM events_v1_backup
UNION ALL
SELECT 'events_v2', COUNT(*) FROM events;

SELECT * FROM v_frontend_events ORDER BY start, id;

-- Erst nach erfolgreicher Kontrolle kann die Sicherung manuell entfernt werden:
-- DROP TABLE events_v1_backup;
