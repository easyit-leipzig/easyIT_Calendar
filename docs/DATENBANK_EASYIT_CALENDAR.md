# Datenbankkonzept easyITCalendar

## Ziel

Die Datenbank `easyit_calendar` bildet Rollen, Rechte, Personen, Kontakte, Benutzerkonten, Termine, Anlagen, blockierte Zeitbereiche, Einstellungen und ein Änderungsprotokoll ab. Die Termintabelle verwendet bewusst die Feldnamen des bestehenden JavaScript-Modells, damit die spätere PHP-API ohne unnötige Umbenennungen zwischen Datenbank und Frontend vermitteln kann.

## Kerntabellen

| Tabelle | Aufgabe |
|---|---|
| `roles` | Fachliche und technische Rollen wie Administrator, Tutor und Teilnehmer |
| `permissions` | Einzelrechte des Kalenders |
| `role_permissions` | Zuordnung der Rechte zu Rollen |
| `persons` | Zentrale Personendaten |
| `person_roles` | Mehrfachrollen einer Person |
| `contacts` | E-Mail, Telefon, Anschrift oder sonstige Kontaktangaben |
| `person_contacts` | Zuordnung von Kontakten zu Personen |
| `users` | Anmeldung und Passwort-Hash, getrennt von den Personendaten |
| `user_roles` | Technische Rollen eines Benutzerkontos |
| `events` | Termine mit den Frontend-Feldern `to_role`, `to_tutor`, `to_student`, `start`, `end`, `activ`, `thema`, `description` |
| `event_attachments` | Anlagen eines Termins |
| `blocked_ranges` | Durch Strg + Rechtsklick oder Strg + Rechtsziehen blockierte Zeitbereiche |
| `main_settings` | Zentrale Kalender- und Funktionskonfiguration |
| `audit_log` | Nachvollziehbare Änderungen |

## Frontend-Kompatibilität

Die View `v_frontend_events` liefert genau das bestehende Terminmodell:

```json
{
  "id": 1,
  "to_role": 3,
  "to_tutor": 1,
  "to_student": 2,
  "start": "2026-07-27T09:00:00",
  "end": "2026-07-27T10:30:00",
  "activ": true,
  "thema": "Lineare Gleichungssysteme",
  "description": "Wiederholung und Übungsaufgaben",
  "appendizies": ["arbeitsblatt_01.pdf", "loesungen.pdf"]
}
```

`appendizies` bleibt zunächst als API-Feld erhalten, damit das aktuelle JavaScript unverändert lesen kann. Intern wird die fachlich korrekte Tabelle `event_attachments` verwendet.

## Erforderliche API-Schicht

Ein Browser sollte niemals direkt auf MariaDB zugreifen. Zwischen Frontend und Datenbank muss eine PHP-API liegen. Empfohlene Endpunkte:

| Methode | Endpunkt | Aufgabe |
|---|---|---|
| `GET` | `/api/init.php` | Nutzer, Rechte, Ansichten und Einstellungen laden |
| `GET` | `/api/events.php?from=...&to=...` | Termine eines Zeitraums laden |
| `POST` | `/api/events.php` | Termin anlegen |
| `PUT` | `/api/events.php?id=123` | Termin bearbeiten oder verschieben |
| `DELETE` | `/api/events.php?id=123` | Termin deaktivieren oder löschen |
| `GET` | `/api/blocked-ranges.php?from=...&to=...` | Blockierungen laden |
| `POST` | `/api/blocked-ranges.php` | Bereich blockieren |
| `DELETE` | `/api/blocked-ranges.php?id=123` | Blockierung aufheben |
| `POST` | `/api/attachments.php?event_id=123` | Anlage hochladen |
| `DELETE` | `/api/attachments.php?id=123` | Anlage entfernen |
| `GET` | `/api/persons.php?role=student` | Teilnehmerauswahl laden |
| `GET` | `/api/persons.php?role=tutor` | Tutorauswahl laden |

## Wichtige Verbesserungen gegenüber dem bisherigen Browsermodell

1. **Personennamen statt numerischer Platzhalter:** Im Kalender sollte später nicht mehr `Student 15`, sondern der tatsächliche Anzeigename erscheinen.
2. **Anlagen normalisieren:** Dateinamen gehören nicht dauerhaft als Array in einen Termin. Die eigene Anlagentabelle ermöglicht Uploadpfad, MIME-Typ, Größe und Prüfsumme.
3. **Rollen und Rechte trennen:** Eine Person kann Tutor und Administrator sein. Deshalb sind Personenrollen und Benutzerrollen als Mehrfachzuordnung ausgeführt.
4. **Blockierungen speichern:** Die bereits vorhandene Frontend-Funktion benötigt eine dauerhafte Tabelle, damit Blockierungen nach einem Browserwechsel erhalten bleiben.
5. **Optimistische Sperre:** `version_no` verhindert, dass zwei Benutzer Änderungen gegenseitig unbemerkt überschreiben.
6. **Soft-Delete:** `activ` bleibt für Termine, Personen, Kontakte und Anlagen erhalten. Das schützt Historie und Referenzen.
7. **Audit-Protokoll:** Änderungen können später für Administration und Fehlersuche nachvollzogen werden.
8. **Zeitzonenregel:** In der Datenbank sollte eine einheitliche Zeitzone verwendet werden. Die API konvertiert zur in `main_settings` hinterlegten IANA-Zeitzone.

## Import

1. phpMyAdmin öffnen.
2. Die Datei `sql/easyit_calendar_database.sql` importieren.
3. Den Platzhalter-Passwort-Hash des Benutzers `admin` durch einen mit PHP `password_hash()` erzeugten Hash ersetzen.
4. Danach die PHP-API anbinden; bis dahin arbeitet das Frontend weiterhin mit `localStorage`.

## Nächster Entwicklungsschritt

Die Datenbank ist unmittelbar für eine API vorbereitet. Für echte Interaktion mit dem bestehenden Frontend müssen `loadLessons()` und `saveLessons()` im JavaScript auf `fetch()` umgestellt werden. Als Übergang kann zuerst die API geladen und bei Nichterreichbarkeit auf `localStorage` zurückgefallen werden.
