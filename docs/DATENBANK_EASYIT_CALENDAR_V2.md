# easyITCalendar – Datenbank V2

## Ziel der Überarbeitung

Die Eventstruktur ist jetzt normalisiert. Ein Termin enthält nur seine eigenen fachlichen Daten. Personen und Rollen werden über `event_participants` zugeordnet. Damit können Termine einen oder mehrere Tutoren sowie beliebig viele Teilnehmer enthalten, ohne die Tabelle `events` später erneut ändern zu müssen.

## Zentrale Tabellen

- `roles`, `permissions`, `role_permissions`: Rollen- und Rechtesystem
- `persons`, `person_roles`: Personen und ihre grundsätzlichen Rollen
- `contacts`, `person_contacts`: mehrfach nutzbare Kontakte
- `users`, `user_roles`: Anmeldung und Anwendungsrechte
- `events`: Termin, Zeitraum, Thema, Beschreibung und Status
- `event_participants`: Zuordnung beliebig vieler Personen mit Eventrolle
- `event_attachments`: Anlagen zu Terminen
- `blocked_ranges`: blockierte Bereiche
- `main_settings`: zentrale Kalenderkonfiguration
- `audit_log`: Änderungsprotokoll

## Eventmodell

```text
events
  1
  |
  n
event_participants
  n
  |
  1
persons
```

Ein Gruppentermin mit einem Tutor und drei Teilnehmern besteht aus einem Datensatz in `events` und vier Datensätzen in `event_participants`.

## Frontend-Kompatibilität

Die View `v_frontend_events` liefert weiterhin die bisherigen Felder:

```text
id, to_role, to_tutor, to_student, start, end,
activ, thema, description, appendizies
```

Bei mehreren Teilnehmern stellt die View nur den primären Teilnehmer in `to_student` dar. Alle Zuordnungen stehen vollständig in `v_event_participants` beziehungsweise `event_participants` bereit. Die kommende PHP-API sollte daher zusätzlich ein Array `participants` ausgeben.

## MariaDB-10.4-Kompatibilität

`JSON_ARRAYAGG()` wird nicht verwendet. Anlagen und Kontakte werden mit `GROUP_CONCAT()` und `JSON_QUOTE()` als gültige JSON-Arrays aufgebaut. Dadurch läuft das Skript unter MariaDB 10.4.

## Installation

Neue Installation:

```text
sql/easyit_calendar_database.sql
```

Migration einer bereits installierten V1-Datenbank:

```text
sql/migration_v1_to_v2_normalized.sql
```

Vor der Migration muss ein vollständiges Datenbank-Backup erstellt werden. Die alte Eventtabelle bleibt als `events_v1_backup` erhalten, bis die Migration geprüft wurde.

## Empfohlene API-Ausgabe

```json
{
  "id": 2,
  "start": "2026-07-27T10:00:00",
  "end": "2026-07-27T11:00:00",
  "activ": true,
  "thema": "Vektorrechnung",
  "description": "Grundlagen und Anwendungen",
  "participants": [
    {"person_id": 1, "role": "tutor", "primary": true},
    {"person_id": 3, "role": "student", "primary": true},
    {"person_id": 4, "role": "student", "primary": false}
  ],
  "attachments": []
}
```

## Nächster technischer Schritt

Das Frontend sollte über eine PHP-PDO-API auf diese Struktur zugreifen. Beim Speichern eines Events werden `events` und `event_participants` gemeinsam in einer Transaktion bearbeitet. `version_no` dient dabei der Erkennung paralleler Änderungen.
