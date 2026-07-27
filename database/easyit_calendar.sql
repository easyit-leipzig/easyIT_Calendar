-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Erstellungszeit: 27. Jul 2026 um 03:44
-- Server-Version: 10.4.32-MariaDB
-- PHP-Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Datenbank: `easyit_calendar`
--

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `audit_log`
--

CREATE TABLE `audit_log` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action_type` varchar(30) NOT NULL,
  `previous_value` longtext DEFAULT NULL,
  `new_value` longtext DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `blocked_ranges`
--

CREATE TABLE `blocked_ranges` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `person_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'NULL = global blockiert',
  `start` datetime NOT NULL,
  `end` datetime NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `color` varchar(20) DEFAULT NULL,
  `activ` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Daten für Tabelle `blocked_ranges`
--

INSERT INTO `blocked_ranges` (`id`, `person_id`, `start`, `end`, `reason`, `color`, `activ`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-07-28 12:00:00', '2026-07-28 13:30:00', 'Nicht verfügbar', '#C84B4B', 1, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `contacts`
--

CREATE TABLE `contacts` (
  `id` int(10) UNSIGNED NOT NULL,
  `contact_type` varchar(30) NOT NULL COMMENT 'email, phone, mobile, address, messenger, other',
  `label` varchar(80) DEFAULT NULL COMMENT 'privat, dienstlich, Mutter, Vater usw.',
  `contact_value` varchar(500) NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `verified_at` datetime DEFAULT NULL,
  `activ` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `contacts`
--

INSERT INTO `contacts` (`id`, `contact_type`, `label`, `contact_value`, `is_primary`, `verified_at`, `activ`, `created_at`, `updated_at`) VALUES
(1, 'email', 'dienstlich', 'olaf@example.invalid', 1, NULL, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(2, 'mobile', 'privat', '+49 000 0000000', 1, NULL, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(3, 'email', 'Eltern', 'familie.beispiel@example.invalid', 1, NULL, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `events`
--

CREATE TABLE `events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `start` datetime NOT NULL,
  `end` datetime NOT NULL,
  `activ` tinyint(1) NOT NULL DEFAULT 1,
  `thema` varchar(255) NOT NULL DEFAULT '',
  `description` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `event_status` varchar(30) NOT NULL DEFAULT 'planned' COMMENT 'planned, confirmed, completed, cancelled',
  `visibility` varchar(30) NOT NULL DEFAULT 'private' COMMENT 'private, internal, public',
  `color` varchar(20) DEFAULT NULL,
  `all_day` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `version_no` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

--
-- Daten für Tabelle `events`
--

INSERT INTO `events` (`id`, `start`, `end`, `activ`, `thema`, `description`, `location`, `event_status`, `visibility`, `color`, `all_day`, `created_by`, `updated_by`, `version_no`, `created_at`, `updated_at`) VALUES
(1, '2026-07-27 09:00:00', '2026-07-27 10:30:00', 1, 'Lineare Gleichungssysteme', 'Wiederholung und Übungsaufgaben', NULL, 'confirmed', 'private', NULL, 0, 1, 1, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(2, '2026-07-27 10:00:00', '2026-07-27 11:00:00', 1, 'Vektorrechnung', 'Grundlagen und Anwendungen als Gruppentermin', NULL, 'planned', 'private', NULL, 0, 1, 1, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `event_attachments`
--

CREATE TABLE `event_attachments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_id` bigint(20) UNSIGNED NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `storage_path` varchar(1000) NOT NULL,
  `mime_type` varchar(150) DEFAULT NULL,
  `file_size` bigint(20) UNSIGNED DEFAULT NULL,
  `checksum_sha256` char(64) DEFAULT NULL,
  `uploaded_by` int(10) UNSIGNED DEFAULT NULL,
  `activ` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `event_attachments`
--

INSERT INTO `event_attachments` (`id`, `event_id`, `original_name`, `stored_name`, `storage_path`, `mime_type`, `file_size`, `checksum_sha256`, `uploaded_by`, `activ`, `created_at`) VALUES
(1, 1, 'arbeitsblatt_01.pdf', 'event_1_arbeitsblatt_01.pdf', 'uploads/events/1/event_1_arbeitsblatt_01.pdf', 'application/pdf', 123456, NULL, 1, 1, '2026-07-26 16:50:50'),
(2, 1, 'loesungen.pdf', 'event_1_loesungen.pdf', 'uploads/events/1/event_1_loesungen.pdf', 'application/pdf', 65432, NULL, 1, 1, '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `event_participants`
--

CREATE TABLE `event_participants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_id` bigint(20) UNSIGNED NOT NULL,
  `person_id` int(10) UNSIGNED NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `participation_status` varchar(30) NOT NULL DEFAULT 'accepted' COMMENT 'invited, accepted, tentative, declined, cancelled',
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `notes` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `event_participants`
--

INSERT INTO `event_participants` (`id`, `event_id`, `person_id`, `role_id`, `participation_status`, `is_primary`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 2, 'accepted', 1, NULL, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(2, 1, 2, 3, 'accepted', 1, NULL, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(3, 2, 1, 2, 'accepted', 1, NULL, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(4, 2, 3, 3, 'accepted', 1, NULL, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(5, 2, 4, 3, 'accepted', 0, NULL, '2026-07-26 16:50:50', '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `main_settings`
--

CREATE TABLE `main_settings` (
  `setting_id` int(10) UNSIGNED NOT NULL,
  `setting_group` varchar(50) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `value_type` varchar(20) NOT NULL DEFAULT 'string',
  `description` text DEFAULT NULL,
  `editable` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `main_settings`
--

INSERT INTO `main_settings` (`setting_id`, `setting_group`, `setting_key`, `setting_value`, `value_type`, `description`, `editable`, `created_at`, `updated_at`) VALUES
(1, 'application', 'name', 'easyITCalendar', 'string', 'Anzeigename der Anwendung.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(2, 'application', 'locale', 'de-DE', 'string', 'Sprache und Datumsformat.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(3, 'application', 'timezone', 'Europe/Stockholm', 'string', 'IANA-Zeitzone.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(4, 'calendar', 'default_view', 'week', 'string', 'Startansicht.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(5, 'calendar', 'slot_minutes', '30', 'int', 'Rastergröße in Minuten.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(6, 'calendar', 'hour_start', '7', 'int', 'Erste sichtbare Stunde.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(7, 'calendar', 'hour_end', '22', 'int', 'Letzte sichtbare Stunde.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(8, 'calendar', 'snap_radius_px', '5', 'int', 'Snap-Radius in Pixeln.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(9, 'features', 'drag_drop', 'true', 'boolean', 'Drag-and-drop aktivieren.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(10, 'features', 'overlaps', 'true', 'boolean', 'Überlappungen darstellen.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(11, 'features', 'blocked_slots', 'true', 'boolean', 'Blockierte Bereiche aktivieren.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(12, 'features', 'attachments', 'true', 'boolean', 'Anlagen aktivieren.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(13, 'features', 'multiple_participants', 'true', 'boolean', 'Beliebig viele Event-Teilnehmer aktivieren.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(14, 'attachments', 'max_files', '20', 'int', 'Maximale Anlagenzahl je Termin.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(15, 'attachments', 'max_size_mb', '25', 'int', 'Maximale Dateigröße.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(16, 'attachments', 'allowed_extensions', '[\"pdf\",\"doc\",\"docx\",\"xls\",\"xlsx\",\"jpg\",\"jpeg\",\"png\",\"zip\"]', 'json', 'Erlaubte Dateiendungen.', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `permissions`
--

CREATE TABLE `permissions` (
  `id` int(10) UNSIGNED NOT NULL,
  `permission_key` varchar(100) NOT NULL,
  `permission_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `permissions`
--

INSERT INTO `permissions` (`id`, `permission_key`, `permission_name`, `description`) VALUES
(1, 'lesson_read', 'Termine lesen', 'Termine anzeigen.'),
(2, 'lesson_create', 'Termine anlegen', 'Neue Termine anlegen.'),
(3, 'lesson_edit', 'Termine bearbeiten', 'Bestehende Termine ändern.'),
(4, 'lesson_delete', 'Termine löschen', 'Termine deaktivieren oder löschen.'),
(5, 'lesson_move', 'Termine verschieben', 'Drag-and-drop für Termine.'),
(6, 'block_read', 'Blockierungen lesen', 'Blockierte Bereiche anzeigen.'),
(7, 'block_create', 'Blockierungen anlegen', 'Blockierte Zeitbereiche anlegen.'),
(8, 'block_delete', 'Blockierungen löschen', 'Blockierte Zeitbereiche aufheben.'),
(9, 'help_read', 'Hilfe lesen', 'Hilfesystem öffnen.'),
(10, 'admin_access', 'Administration', 'Administrationsbereich verwenden.');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `persons`
--

CREATE TABLE `persons` (
  `id` int(10) UNSIGNED NOT NULL,
  `person_no` varchar(30) DEFAULT NULL,
  `salutation` varchar(30) DEFAULT NULL,
  `title` varchar(50) DEFAULT NULL,
  `firstname` varchar(100) NOT NULL,
  `lastname` varchar(100) NOT NULL,
  `display_name` varchar(220) GENERATED ALWAYS AS (trim(concat(`firstname`,' ',`lastname`))) STORED,
  `birth_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `activ` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `persons`
--

INSERT INTO `persons` (`id`, `person_no`, `salutation`, `title`, `firstname`, `lastname`, `birth_date`, `notes`, `activ`, `created_at`, `updated_at`) VALUES
(1, 'P-0001', 'Herr', NULL, 'Olaf', 'Thiele', NULL, 'Beispiel-Tutor', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(2, 'P-0002', NULL, NULL, 'Lena', 'Beispiel', NULL, 'Beispiel-Teilnehmerin', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(3, 'P-0003', NULL, NULL, 'Max', 'Muster', NULL, 'Beispiel-Teilnehmer', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(4, 'P-0004', NULL, NULL, 'Mia', 'Demo', NULL, 'Zweite Teilnehmerin im Gruppentermin', 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `person_contacts`
--

CREATE TABLE `person_contacts` (
  `person_id` int(10) UNSIGNED NOT NULL,
  `contact_id` int(10) UNSIGNED NOT NULL,
  `relation_name` varchar(80) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `person_contacts`
--

INSERT INTO `person_contacts` (`person_id`, `contact_id`, `relation_name`) VALUES
(1, 1, 'eigener Kontakt'),
(1, 2, 'eigener Kontakt'),
(2, 3, 'Erziehungsberechtigte');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `person_roles`
--

CREATE TABLE `person_roles` (
  `person_id` int(10) UNSIGNED NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_until` date DEFAULT NULL,
  `activ` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `person_roles`
--

INSERT INTO `person_roles` (`person_id`, `role_id`, `valid_from`, `valid_until`, `activ`) VALUES
(1, 2, NULL, NULL, 1),
(2, 3, NULL, NULL, 1),
(3, 3, NULL, NULL, 1),
(4, 3, NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `roles`
--

CREATE TABLE `roles` (
  `id` int(10) UNSIGNED NOT NULL,
  `role_key` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT 0,
  `activ` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `roles`
--

INSERT INTO `roles` (`id`, `role_key`, `role_name`, `description`, `is_system`, `activ`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Administrator', 'Vollzugriff auf Anwendung und Administration.', 1, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(2, 'tutor', 'Tutor', 'Lehrkraft oder Nachhilfelehrer.', 1, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(3, 'student', 'Teilnehmer', 'Schüler oder Teilnehmer.', 1, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50'),
(4, 'viewer', 'Leser', 'Nur lesender Zugriff.', 1, 1, '2026-07-26 16:50:50', '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` int(10) UNSIGNED NOT NULL,
  `permission_id` int(10) UNSIGNED NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `role_permissions`
--

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(1, 1, 1),
(1, 2, 1),
(1, 3, 1),
(1, 4, 1),
(1, 5, 1),
(1, 6, 1),
(1, 7, 1),
(1, 8, 1),
(1, 9, 1),
(1, 10, 1),
(2, 1, 1),
(2, 2, 1),
(2, 3, 1),
(2, 5, 1),
(2, 6, 1),
(2, 9, 1),
(3, 1, 1),
(3, 9, 1),
(4, 1, 1),
(4, 9, 1);

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `person_id` int(10) UNSIGNED DEFAULT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `activ` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `users`
--

INSERT INTO `users` (`id`, `person_id`, `username`, `password_hash`, `email`, `activ`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'admin', '$2y$10$REPLACE_WITH_REAL_PASSWORD_HASH', 'admin@example.invalid', 1, NULL, '2026-07-26 16:50:50', '2026-07-26 16:50:50');

-- --------------------------------------------------------

--
-- Tabellenstruktur für Tabelle `user_roles`
--

CREATE TABLE `user_roles` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `role_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Daten für Tabelle `user_roles`
--

INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, 1);

-- --------------------------------------------------------

--
-- Stellvertreter-Struktur des Views `v_event_participants`
-- (Siehe unten für die tatsächliche Ansicht)
--
CREATE TABLE `v_event_participants` (
`id` bigint(20) unsigned
,`event_id` bigint(20) unsigned
,`person_id` int(10) unsigned
,`display_name` varchar(220)
,`role_id` int(10) unsigned
,`role_key` varchar(50)
,`role_name` varchar(100)
,`participation_status` varchar(30)
,`is_primary` tinyint(1)
,`notes` varchar(500)
);

-- --------------------------------------------------------

--
-- Stellvertreter-Struktur des Views `v_frontend_blocked_ranges`
-- (Siehe unten für die tatsächliche Ansicht)
--
CREATE TABLE `v_frontend_blocked_ranges` (
`id` bigint(20) unsigned
,`person_id` decimal(10,0)
,`start` varchar(24)
,`end` varchar(24)
,`reason` varchar(255)
,`color` varchar(20)
,`activ` tinyint(1)
);

-- --------------------------------------------------------

--
-- Stellvertreter-Struktur des Views `v_frontend_events`
-- (Siehe unten für die tatsächliche Ansicht)
--
CREATE TABLE `v_frontend_events` (
`id` bigint(20) unsigned
,`to_role` decimal(10,0)
,`to_tutor` decimal(10,0)
,`to_student` decimal(10,0)
,`start` varchar(24)
,`end` varchar(24)
,`activ` tinyint(1)
,`thema` varchar(255)
,`description` mediumtext
,`appendizies` mediumtext
);

-- --------------------------------------------------------

--
-- Stellvertreter-Struktur des Views `v_person_contact_summary`
-- (Siehe unten für die tatsächliche Ansicht)
--
CREATE TABLE `v_person_contact_summary` (
`person_id` int(10) unsigned
,`display_name` varchar(220)
,`activ` tinyint(1)
,`contacts` mediumtext
);

-- --------------------------------------------------------

--
-- Struktur des Views `v_event_participants`
--
DROP TABLE IF EXISTS `v_event_participants`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_event_participants`  AS SELECT `ep`.`id` AS `id`, `ep`.`event_id` AS `event_id`, `ep`.`person_id` AS `person_id`, `p`.`display_name` AS `display_name`, `ep`.`role_id` AS `role_id`, `r`.`role_key` AS `role_key`, `r`.`role_name` AS `role_name`, `ep`.`participation_status` AS `participation_status`, `ep`.`is_primary` AS `is_primary`, `ep`.`notes` AS `notes` FROM ((`event_participants` `ep` join `persons` `p` on(`p`.`id` = `ep`.`person_id`)) join `roles` `r` on(`r`.`id` = `ep`.`role_id`)) ;

-- --------------------------------------------------------

--
-- Struktur des Views `v_frontend_blocked_ranges`
--
DROP TABLE IF EXISTS `v_frontend_blocked_ranges`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_frontend_blocked_ranges`  AS SELECT `b`.`id` AS `id`, coalesce(`b`.`person_id`,0) AS `person_id`, date_format(`b`.`start`,'%Y-%m-%dT%H:%i:%s') AS `start`, date_format(`b`.`end`,'%Y-%m-%dT%H:%i:%s') AS `end`, coalesce(`b`.`reason`,'') AS `reason`, coalesce(`b`.`color`,'') AS `color`, `b`.`activ` AS `activ` FROM `blocked_ranges` AS `b` ;

-- --------------------------------------------------------

--
-- Struktur des Views `v_frontend_events`
--
DROP TABLE IF EXISTS `v_frontend_events`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_frontend_events`  AS SELECT `e`.`id` AS `id`, coalesce((select `ep`.`role_id` from (`event_participants` `ep` join `roles` `r` on(`r`.`id` = `ep`.`role_id`)) where `ep`.`event_id` = `e`.`id` and `r`.`role_key` = 'student' order by `ep`.`is_primary` desc,`ep`.`id` limit 1),0) AS `to_role`, coalesce((select `ep`.`person_id` from (`event_participants` `ep` join `roles` `r` on(`r`.`id` = `ep`.`role_id`)) where `ep`.`event_id` = `e`.`id` and `r`.`role_key` = 'tutor' order by `ep`.`is_primary` desc,`ep`.`id` limit 1),0) AS `to_tutor`, coalesce((select `ep`.`person_id` from (`event_participants` `ep` join `roles` `r` on(`r`.`id` = `ep`.`role_id`)) where `ep`.`event_id` = `e`.`id` and `r`.`role_key` = 'student' order by `ep`.`is_primary` desc,`ep`.`id` limit 1),0) AS `to_student`, date_format(`e`.`start`,'%Y-%m-%dT%H:%i:%s') AS `start`, date_format(`e`.`end`,'%Y-%m-%dT%H:%i:%s') AS `end`, `e`.`activ` AS `activ`, `e`.`thema` AS `thema`, coalesce(`e`.`description`,'') AS `description`, concat('[',coalesce((select group_concat(json_quote(`a`.`original_name`) order by `a`.`id` ASC separator ',') from `event_attachments` `a` where `a`.`event_id` = `e`.`id` and `a`.`activ` = 1),''),']') AS `appendizies` FROM `events` AS `e` ;

-- --------------------------------------------------------

--
-- Struktur des Views `v_person_contact_summary`
--
DROP TABLE IF EXISTS `v_person_contact_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_person_contact_summary`  AS SELECT `p`.`id` AS `person_id`, `p`.`display_name` AS `display_name`, `p`.`activ` AS `activ`, concat('[',coalesce(group_concat(case when `c`.`id` is not null then json_object('id',`c`.`id`,'type',`c`.`contact_type`,'label',coalesce(`c`.`label`,''),'value',`c`.`contact_value`,'primary',`c`.`is_primary`) end order by `c`.`is_primary` DESC,`c`.`id` ASC separator ','),''),']') AS `contacts` FROM ((`persons` `p` left join `person_contacts` `pc` on(`pc`.`person_id` = `p`.`id`)) left join `contacts` `c` on(`c`.`id` = `pc`.`contact_id` and `c`.`activ` = 1)) GROUP BY `p`.`id`, `p`.`display_name`, `p`.`activ` ;

--
-- Indizes der exportierten Tabellen
--

--
-- Indizes für die Tabelle `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_audit_created` (`created_at`),
  ADD KEY `fk_audit_log_user` (`user_id`);

--
-- Indizes für die Tabelle `blocked_ranges`
--
ALTER TABLE `blocked_ranges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_blocked_ranges_user` (`created_by`),
  ADD KEY `idx_blocked_ranges_period` (`start`,`end`),
  ADD KEY `idx_blocked_ranges_person_period` (`person_id`,`start`,`end`),
  ADD KEY `idx_blocked_ranges_activ` (`activ`);

--
-- Indizes für die Tabelle `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_contacts_type` (`contact_type`),
  ADD KEY `idx_contacts_primary` (`is_primary`,`activ`);

--
-- Indizes für die Tabelle `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_events_created_by` (`created_by`),
  ADD KEY `fk_events_updated_by` (`updated_by`),
  ADD KEY `idx_events_period` (`start`,`end`),
  ADD KEY `idx_events_activ_period` (`activ`,`start`,`end`),
  ADD KEY `idx_events_status` (`event_status`),
  ADD KEY `idx_events_updated` (`updated_at`);

--
-- Indizes für die Tabelle `event_attachments`
--
ALTER TABLE `event_attachments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_event_attachments_stored_name` (`stored_name`),
  ADD KEY `idx_event_attachments_event` (`event_id`,`activ`),
  ADD KEY `fk_event_attachments_user` (`uploaded_by`);

--
-- Indizes für die Tabelle `event_participants`
--
ALTER TABLE `event_participants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_event_participant_role` (`event_id`,`person_id`,`role_id`),
  ADD KEY `idx_event_participants_event_role` (`event_id`,`role_id`,`is_primary`),
  ADD KEY `idx_event_participants_person_period` (`person_id`,`event_id`),
  ADD KEY `fk_event_participants_role` (`role_id`);

--
-- Indizes für die Tabelle `main_settings`
--
ALTER TABLE `main_settings`
  ADD PRIMARY KEY (`setting_id`),
  ADD UNIQUE KEY `uk_main_settings_group_key` (`setting_group`,`setting_key`),
  ADD KEY `idx_main_settings_group` (`setting_group`);

--
-- Indizes für die Tabelle `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_permissions_key` (`permission_key`);

--
-- Indizes für die Tabelle `persons`
--
ALTER TABLE `persons`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_persons_person_no` (`person_no`),
  ADD KEY `idx_persons_name` (`lastname`,`firstname`),
  ADD KEY `idx_persons_activ` (`activ`);

--
-- Indizes für die Tabelle `person_contacts`
--
ALTER TABLE `person_contacts`
  ADD PRIMARY KEY (`person_id`,`contact_id`),
  ADD KEY `idx_person_contacts_contact` (`contact_id`);

--
-- Indizes für die Tabelle `person_roles`
--
ALTER TABLE `person_roles`
  ADD PRIMARY KEY (`person_id`,`role_id`),
  ADD KEY `idx_person_roles_role` (`role_id`,`activ`);

--
-- Indizes für die Tabelle `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_roles_role_key` (`role_key`),
  ADD KEY `idx_roles_activ` (`activ`);

--
-- Indizes für die Tabelle `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_role_permissions_permission` (`permission_id`);

--
-- Indizes für die Tabelle `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_users_username` (`username`),
  ADD UNIQUE KEY `uk_users_email` (`email`),
  ADD UNIQUE KEY `uk_users_person` (`person_id`);

--
-- Indizes für die Tabelle `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_id`,`role_id`),
  ADD KEY `fk_user_roles_role` (`role_id`);

--
-- AUTO_INCREMENT für exportierte Tabellen
--

--
-- AUTO_INCREMENT für Tabelle `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `blocked_ranges`
--
ALTER TABLE `blocked_ranges`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT für Tabelle `events`
--
ALTER TABLE `events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT für Tabelle `event_attachments`
--
ALTER TABLE `event_attachments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT für Tabelle `event_participants`
--
ALTER TABLE `event_participants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT für Tabelle `main_settings`
--
ALTER TABLE `main_settings`
  MODIFY `setting_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT für Tabelle `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT für Tabelle `persons`
--
ALTER TABLE `persons`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT für Tabelle `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT für Tabelle `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints der exportierten Tabellen
--

--
-- Constraints der Tabelle `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `fk_audit_log_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints der Tabelle `blocked_ranges`
--
ALTER TABLE `blocked_ranges`
  ADD CONSTRAINT `fk_blocked_ranges_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_blocked_ranges_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints der Tabelle `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_events_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints der Tabelle `event_attachments`
--
ALTER TABLE `event_attachments`
  ADD CONSTRAINT `fk_event_attachments_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_attachments_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints der Tabelle `event_participants`
--
ALTER TABLE `event_participants`
  ADD CONSTRAINT `fk_event_participants_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_participants_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_event_participants_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;

--
-- Constraints der Tabelle `person_contacts`
--
ALTER TABLE `person_contacts`
  ADD CONSTRAINT `fk_person_contacts_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_person_contacts_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints der Tabelle `person_roles`
--
ALTER TABLE `person_roles`
  ADD CONSTRAINT `fk_person_roles_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_person_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE;

--
-- Constraints der Tabelle `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints der Tabelle `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_person` FOREIGN KEY (`person_id`) REFERENCES `persons` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints der Tabelle `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
