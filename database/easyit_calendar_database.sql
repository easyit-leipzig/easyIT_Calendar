-- ============================================================================
-- easyITCalendar – Datenbankstruktur
-- Zielsystem: MariaDB 10.4+ / MySQL 8.0+
-- Datenbank: easyit_calendar
-- Zeichensatz: utf8mb4
-- ============================================================================

CREATE DATABASE IF NOT EXISTS easyit_calendar
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE easyit_calendar;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS v_frontend_events;
DROP VIEW IF EXISTS v_frontend_blocked_ranges;
DROP VIEW IF EXISTS v_person_contact_summary;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS blocked_ranges;
DROP TABLE IF EXISTS event_attachments;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS person_contacts;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS person_roles;
DROP TABLE IF EXISTS persons;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS main_settings;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. Rollen und Rechte
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    role_key        VARCHAR(50) NOT NULL,
    role_name       VARCHAR(100) NOT NULL,
    description     TEXT NULL,
    is_system       TINYINT(1) NOT NULL DEFAULT 0,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_roles_role_key (role_key),
    KEY idx_roles_activ (activ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissions (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    permission_key  VARCHAR(100) NOT NULL,
    permission_name VARCHAR(150) NOT NULL,
    description     TEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_permissions_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE role_permissions (
    role_id         INT UNSIGNED NOT NULL,
    permission_id   INT UNSIGNED NOT NULL,
    allowed         TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
      FOREIGN KEY (role_id) REFERENCES roles(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
      FOREIGN KEY (permission_id) REFERENCES permissions(id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Personen
-- ----------------------------------------------------------------------------
CREATE TABLE persons (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    person_no       VARCHAR(30) NULL,
    salutation      VARCHAR(30) NULL,
    title           VARCHAR(50) NULL,
    firstname       VARCHAR(100) NOT NULL,
    lastname        VARCHAR(100) NOT NULL,
    display_name    VARCHAR(220) GENERATED ALWAYS AS
                    (TRIM(CONCAT(firstname, ' ', lastname))) STORED,
    birth_date      DATE NULL,
    notes           TEXT NULL,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_persons_person_no (person_no),
    KEY idx_persons_name (lastname, firstname),
    KEY idx_persons_activ (activ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE person_roles (
    person_id       INT UNSIGNED NOT NULL,
    role_id         INT UNSIGNED NOT NULL,
    valid_from      DATE NULL,
    valid_until     DATE NULL,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (person_id, role_id),
    CONSTRAINT fk_person_roles_person
      FOREIGN KEY (person_id) REFERENCES persons(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_person_roles_role
      FOREIGN KEY (role_id) REFERENCES roles(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    KEY idx_person_roles_role (role_id, activ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Kontakte
-- Ein Kontakt kann später auch mehreren Personen zugeordnet werden, z. B.
-- Elternkontakt für Geschwister. Daher getrennte Kontakt- und Zuordnungstabelle.
-- ----------------------------------------------------------------------------
CREATE TABLE contacts (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    contact_type    VARCHAR(30) NOT NULL COMMENT 'email, phone, mobile, address, messenger, other',
    label           VARCHAR(80) NULL COMMENT 'privat, dienstlich, Mutter, Vater usw.',
    contact_value   VARCHAR(500) NOT NULL,
    is_primary      TINYINT(1) NOT NULL DEFAULT 0,
    verified_at     DATETIME NULL,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contacts_type (contact_type),
    KEY idx_contacts_primary (is_primary, activ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE person_contacts (
    person_id       INT UNSIGNED NOT NULL,
    contact_id      INT UNSIGNED NOT NULL,
    relation_name   VARCHAR(80) NULL COMMENT 'eigener Kontakt, Erziehungsberechtigter usw.',
    PRIMARY KEY (person_id, contact_id),
    CONSTRAINT fk_person_contacts_person
      FOREIGN KEY (person_id) REFERENCES persons(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_person_contacts_contact
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    KEY idx_person_contacts_contact (contact_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Benutzerkonten
-- Personen und Login werden bewusst getrennt gehalten.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    person_id       INT UNSIGNED NULL,
    username        VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NULL,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at   DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_username (username),
    UNIQUE KEY uk_users_email (email),
    UNIQUE KEY uk_users_person (person_id),
    CONSTRAINT fk_users_person
      FOREIGN KEY (person_id) REFERENCES persons(id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
    user_id         INT UNSIGNED NOT NULL,
    role_id         INT UNSIGNED NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
      FOREIGN KEY (role_id) REFERENCES roles(id)
      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Termine / Events
-- Feldnamen to_role, to_tutor, to_student, start, end, activ, thema und
-- description entsprechen direkt dem vorhandenen JavaScript-Datenmodell.
-- ----------------------------------------------------------------------------
CREATE TABLE events (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    to_role         INT UNSIGNED NOT NULL,
    to_tutor        INT UNSIGNED NULL,
    to_student      INT UNSIGNED NULL,
    start           DATETIME NOT NULL,
    end             DATETIME NOT NULL,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    thema           VARCHAR(255) NOT NULL DEFAULT '',
    description     TEXT NULL,
    location        VARCHAR(255) NULL,
    event_status    VARCHAR(30) NOT NULL DEFAULT 'planned'
                    COMMENT 'planned, confirmed, completed, cancelled',
    visibility      VARCHAR(30) NOT NULL DEFAULT 'private'
                    COMMENT 'private, internal, public',
    created_by      INT UNSIGNED NULL,
    updated_by      INT UNSIGNED NULL,
    version_no      INT UNSIGNED NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_events_role
      FOREIGN KEY (to_role) REFERENCES roles(id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_events_tutor
      FOREIGN KEY (to_tutor) REFERENCES persons(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_events_student
      FOREIGN KEY (to_student) REFERENCES persons(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_events_created_by
      FOREIGN KEY (created_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_events_updated_by
      FOREIGN KEY (updated_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_events_period CHECK (`end` > `start`),
    KEY idx_events_period (`start`, `end`),
    KEY idx_events_tutor_period (to_tutor, `start`, `end`),
    KEY idx_events_student_period (to_student, `start`, `end`),
    KEY idx_events_role (to_role),
    KEY idx_events_activ (activ),
    KEY idx_events_status (event_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Anlagen
-- Im Frontend heißt die JSON-Eigenschaft aus Kompatibilitätsgründen weiterhin
-- appendizies. In der Datenbank wird der fachlich korrekte Begriff attachment
-- verwendet.
-- ----------------------------------------------------------------------------
CREATE TABLE event_attachments (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id        BIGINT UNSIGNED NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    stored_name     VARCHAR(255) NOT NULL,
    storage_path    VARCHAR(1000) NOT NULL,
    mime_type       VARCHAR(150) NULL,
    file_size       BIGINT UNSIGNED NULL,
    checksum_sha256 CHAR(64) NULL,
    uploaded_by     INT UNSIGNED NULL,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_event_attachments_stored_name (stored_name),
    KEY idx_event_attachments_event (event_id, activ),
    CONSTRAINT fk_event_attachments_event
      FOREIGN KEY (event_id) REFERENCES events(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_event_attachments_user
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Blockierte Zeitbereiche
-- Erforderlich für Strg + Rechtsklick beziehungsweise Strg + Rechtsziehen.
-- ----------------------------------------------------------------------------
CREATE TABLE blocked_ranges (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    person_id       INT UNSIGNED NULL COMMENT 'NULL = global blockiert',
    start           DATETIME NOT NULL,
    end             DATETIME NOT NULL,
    reason          VARCHAR(255) NULL,
    color           VARCHAR(20) NULL,
    activ           TINYINT(1) NOT NULL DEFAULT 1,
    created_by      INT UNSIGNED NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_blocked_ranges_person
      FOREIGN KEY (person_id) REFERENCES persons(id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_blocked_ranges_user
      FOREIGN KEY (created_by) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_blocked_ranges_period CHECK (`end` > `start`),
    KEY idx_blocked_ranges_period (`start`, `end`),
    KEY idx_blocked_ranges_person_period (person_id, `start`, `end`),
    KEY idx_blocked_ranges_activ (activ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Zentrale Einstellungen
-- ----------------------------------------------------------------------------
CREATE TABLE main_settings (
    setting_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    setting_group   VARCHAR(50) NOT NULL,
    setting_key     VARCHAR(100) NOT NULL,
    setting_value   LONGTEXT NULL,
    value_type      VARCHAR(20) NOT NULL DEFAULT 'string',
    description     TEXT NULL,
    editable        TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (setting_id),
    UNIQUE KEY uk_main_settings_group_key (setting_group, setting_key),
    KEY idx_main_settings_group (setting_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Änderungsprotokoll
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id         INT UNSIGNED NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       BIGINT UNSIGNED NULL,
    action_type     VARCHAR(30) NOT NULL,
    previous_value  LONGTEXT NULL,
    new_value       LONGTEXT NULL,
    ip_address      VARCHAR(45) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_audit_entity (entity_type, entity_id),
    KEY idx_audit_created (created_at),
    CONSTRAINT fk_audit_log_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Frontend-kompatible Views
-- appendizies wird als JSON-Array mit Dateinamen ausgegeben.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_frontend_events AS
SELECT
    e.id,
    e.to_role,
    COALESCE(e.to_tutor, 0) AS to_tutor,
    COALESCE(e.to_student, 0) AS to_student,
    DATE_FORMAT(e.start, '%Y-%m-%dT%H:%i:%s') AS start,
    DATE_FORMAT(e.end, '%Y-%m-%dT%H:%i:%s') AS end,
    IF(e.activ = 1, TRUE, FALSE) AS activ,
    e.thema,
    COALESCE(e.description, '') AS description,
    COALESCE(
      (
        SELECT JSON_ARRAYAGG(a.original_name)
        FROM event_attachments a
        WHERE a.event_id = e.id AND a.activ = 1
      ),
      JSON_ARRAY()
    ) AS appendizies
FROM events e;

CREATE OR REPLACE VIEW v_frontend_blocked_ranges AS
SELECT
    b.id,
    COALESCE(b.person_id, 0) AS person_id,
    DATE_FORMAT(b.start, '%Y-%m-%dT%H:%i:%s') AS start,
    DATE_FORMAT(b.end, '%Y-%m-%dT%H:%i:%s') AS end,
    COALESCE(b.reason, '') AS reason,
    COALESCE(b.color, '') AS color,
    IF(b.activ = 1, TRUE, FALSE) AS activ
FROM blocked_ranges b;

CREATE OR REPLACE VIEW v_person_contact_summary AS
SELECT
    p.id AS person_id,
    p.display_name,
    p.activ,
    COALESCE(JSON_ARRAYAGG(
      JSON_OBJECT(
        'id', c.id,
        'type', c.contact_type,
        'label', COALESCE(c.label, ''),
        'value', c.contact_value,
        'primary', IF(c.is_primary = 1, TRUE, FALSE)
      )
    ), JSON_ARRAY()) AS contacts
FROM persons p
LEFT JOIN person_contacts pc ON pc.person_id = p.id
LEFT JOIN contacts c ON c.id = pc.contact_id AND c.activ = 1
GROUP BY p.id, p.display_name, p.activ;

-- ----------------------------------------------------------------------------
-- 11. Stammdaten und Beispielinhalte
-- ----------------------------------------------------------------------------
INSERT INTO roles (id, role_key, role_name, description, is_system, activ) VALUES
(1, 'admin',   'Administrator', 'Vollzugriff auf Anwendung und Administration.', 1, 1),
(2, 'tutor',   'Tutor',         'Lehrkraft oder Nachhilfelehrer.', 1, 1),
(3, 'student', 'Teilnehmer',    'Schüler oder Teilnehmer.', 1, 1),
(4, 'viewer',  'Leser',         'Nur lesender Zugriff.', 1, 1)
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name), description = VALUES(description), activ = VALUES(activ);

INSERT INTO permissions (permission_key, permission_name, description) VALUES
('lesson_read',   'Termine lesen',       'Termine anzeigen.'),
('lesson_create', 'Termine anlegen',     'Neue Termine anlegen.'),
('lesson_edit',   'Termine bearbeiten',  'Bestehende Termine ändern.'),
('lesson_delete', 'Termine löschen',     'Termine deaktivieren oder löschen.'),
('lesson_move',   'Termine verschieben', 'Drag-and-drop für Termine.'),
('block_read',    'Blockierungen lesen', 'Blockierte Bereiche anzeigen.'),
('block_create',  'Blockierungen anlegen','Blockierte Zeitbereiche anlegen.'),
('block_delete',  'Blockierungen löschen','Blockierte Zeitbereiche aufheben.'),
('help_read',     'Hilfe lesen',          'Hilfesystem öffnen.'),
('admin_access',  'Administration',       'Administrationsbereich verwenden.')
ON DUPLICATE KEY UPDATE permission_name = VALUES(permission_name), description = VALUES(description);

INSERT INTO role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
FROM roles r CROSS JOIN permissions p
WHERE r.role_key = 'admin'
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

INSERT INTO role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
FROM roles r JOIN permissions p
  ON p.permission_key IN ('lesson_read','lesson_create','lesson_edit','lesson_move','block_read','help_read')
WHERE r.role_key = 'tutor'
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

INSERT INTO role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, 1
FROM roles r JOIN permissions p
  ON p.permission_key IN ('lesson_read','help_read')
WHERE r.role_key IN ('student','viewer')
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);

INSERT INTO persons (id, person_no, salutation, firstname, lastname, notes, activ) VALUES
(1, 'P-0001', 'Herr',  'Olaf',  'Thiele', 'Beispiel-Tutor', 1),
(2, 'P-0002', NULL,    'Lena',  'Beispiel', 'Beispiel-Teilnehmerin', 1),
(3, 'P-0003', NULL,    'Max',   'Muster', 'Beispiel-Teilnehmer', 1)
ON DUPLICATE KEY UPDATE firstname = VALUES(firstname), lastname = VALUES(lastname), notes = VALUES(notes), activ = VALUES(activ);

INSERT INTO person_roles (person_id, role_id, activ)
SELECT 1, id, 1 FROM roles WHERE role_key = 'tutor'
ON DUPLICATE KEY UPDATE activ = VALUES(activ);
INSERT INTO person_roles (person_id, role_id, activ)
SELECT 2, id, 1 FROM roles WHERE role_key = 'student'
ON DUPLICATE KEY UPDATE activ = VALUES(activ);
INSERT INTO person_roles (person_id, role_id, activ)
SELECT 3, id, 1 FROM roles WHERE role_key = 'student'
ON DUPLICATE KEY UPDATE activ = VALUES(activ);

-- Passwort-Hash ist absichtlich nur ein Platzhalter. Vor echtem Einsatz mit
-- password_hash() in PHP erzeugen und ersetzen.
INSERT INTO users (id, person_id, username, password_hash, email, activ) VALUES
(1, 1, 'admin', '$2y$10$REPLACE_WITH_REAL_PASSWORD_HASH', 'admin@example.invalid', 1)
ON DUPLICATE KEY UPDATE person_id = VALUES(person_id), email = VALUES(email), activ = VALUES(activ);

INSERT INTO user_roles (user_id, role_id)
SELECT 1, id FROM roles WHERE role_key = 'admin'
ON DUPLICATE KEY UPDATE role_id = VALUES(role_id);

INSERT INTO contacts (id, contact_type, label, contact_value, is_primary, activ) VALUES
(1, 'email',  'dienstlich', 'olaf@example.invalid', 1, 1),
(2, 'mobile', 'privat',     '+49 000 0000000', 1, 1),
(3, 'email',  'Eltern',     'familie.beispiel@example.invalid', 1, 1)
ON DUPLICATE KEY UPDATE contact_value = VALUES(contact_value), is_primary = VALUES(is_primary), activ = VALUES(activ);

INSERT INTO person_contacts (person_id, contact_id, relation_name) VALUES
(1, 1, 'eigener Kontakt'),
(1, 2, 'eigener Kontakt'),
(2, 3, 'Erziehungsberechtigte')
ON DUPLICATE KEY UPDATE relation_name = VALUES(relation_name);

INSERT INTO events
(id, to_role, to_tutor, to_student, start, end, activ, thema, description, event_status, created_by, updated_by)
VALUES
(1, 3, 1, 2, '2026-07-27 09:00:00', '2026-07-27 10:30:00', 1,
 'Lineare Gleichungssysteme', 'Wiederholung und Übungsaufgaben', 'confirmed', 1, 1),
(2, 3, 1, 3, '2026-07-27 10:00:00', '2026-07-27 11:00:00', 1,
 'Vektorrechnung', 'Grundlagen und Anwendungen', 'planned', 1, 1)
ON DUPLICATE KEY UPDATE
  to_role = VALUES(to_role), to_tutor = VALUES(to_tutor), to_student = VALUES(to_student),
  start = VALUES(start), end = VALUES(end), activ = VALUES(activ),
  thema = VALUES(thema), description = VALUES(description), event_status = VALUES(event_status);

INSERT INTO event_attachments
(event_id, original_name, stored_name, storage_path, mime_type, file_size, uploaded_by, activ)
VALUES
(1, 'arbeitsblatt_01.pdf', 'event_1_arbeitsblatt_01.pdf', 'uploads/events/1/event_1_arbeitsblatt_01.pdf', 'application/pdf', 123456, 1, 1),
(1, 'loesungen.pdf', 'event_1_loesungen.pdf', 'uploads/events/1/event_1_loesungen.pdf', 'application/pdf', 65432, 1, 1)
ON DUPLICATE KEY UPDATE original_name = VALUES(original_name), storage_path = VALUES(storage_path), activ = VALUES(activ);

INSERT INTO blocked_ranges
(person_id, start, end, reason, color, activ, created_by)
VALUES
(1, '2026-07-28 12:00:00', '2026-07-28 13:30:00', 'Nicht verfügbar', '#C84B4B', 1, 1);

INSERT INTO main_settings
(setting_group, setting_key, setting_value, value_type, description, editable)
VALUES
('application','name','easyITCalendar','string','Anzeigename der Anwendung.',1),
('application','locale','de-DE','string','Sprache und Datumsformat.',1),
('application','timezone','Europe/Stockholm','string','IANA-Zeitzone.',1),
('calendar','default_view','week','string','Startansicht.',1),
('calendar','slot_minutes','30','int','Rastergröße in Minuten.',1),
('calendar','hour_start','7','int','Erste sichtbare Stunde.',1),
('calendar','hour_end','22','int','Letzte sichtbare Stunde.',1),
('calendar','snap_radius_px','5','int','Snap-Radius in Pixeln.',1),
('features','drag_drop','true','boolean','Drag-and-drop aktivieren.',1),
('features','overlaps','true','boolean','Überlappungen darstellen.',1),
('features','blocked_slots','true','boolean','Blockierte Bereiche aktivieren.',1),
('features','attachments','true','boolean','Anlagen aktivieren.',1),
('attachments','max_files','20','int','Maximale Anlagenzahl je Termin.',1),
('attachments','max_size_mb','25','int','Maximale Dateigröße.',1),
('attachments','allowed_extensions','["pdf","doc","docx","xls","xlsx","jpg","jpeg","png","zip"]','json','Erlaubte Dateiendungen.',1)
ON DUPLICATE KEY UPDATE
setting_value = VALUES(setting_value), value_type = VALUES(value_type),
description = VALUES(description), editable = VALUES(editable);

-- Frontend-Testausgaben
SELECT * FROM v_frontend_events ORDER BY start, id;
SELECT * FROM v_frontend_blocked_ranges ORDER BY start, id;
