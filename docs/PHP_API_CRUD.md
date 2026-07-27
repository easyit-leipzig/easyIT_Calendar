# easyITCalendar – PHP-Startseite und Event-CRUD

## Installation

1. Das Projekt nach `C:\xampp\htdocs\easyIT_Calendar` kopieren.
2. `sql/easyit_calendar_database.sql` in MariaDB importieren.
3. In `api/config.php` bei Bedarf Host, Port, Datenbankname, Benutzer und Passwort anpassen.
4. Im Browser `http://localhost/easyIT_Calendar/index.php` öffnen.

Die Anwendung darf nicht mehr direkt als lokale Datei (`file://`) gestartet werden, weil PHP und die Datenbank-API sonst nicht ausgeführt werden.

## Datenfluss

- `index.php` startet die Anwendung.
- `assets/js/calendar.js` berechnet beim Start und bei jedem Blättern den sichtbaren Zeitraum.
- `GET api/events.php?start=YYYY-MM-DD&end=YYYY-MM-DD` lädt nur die Termine dieses Zeitraums.
- `POST api/events.php` legt einen Termin an.
- `PUT api/events.php` bearbeitet oder verschiebt einen Termin.
- `DELETE api/events.php` deaktiviert einen Termin durch `activ=0`.

Alle Schreibvorgänge verwenden PDO, Prepared Statements und für Termin, Teilnehmer und Anlagen eine Datenbanktransaktion.

## Zuordnung der Frontend-Felder

- `to_tutor`: Personen-ID des primären Tutors.
- `to_student`: Personen-ID des primären Teilnehmers.
- `to_role`: Rollen-ID des Teilnehmers, normalerweise `3`.
- `appendizies`: Dateinamen werden als Datensätze in `event_attachments` gespeichert. Ein echter Datei-Upload ist noch nicht enthalten.

## Verbesserung für die nächste Ausbaustufe

Die numerischen Felder für Tutor, Teilnehmer und Rolle sollten durch Datenbank-Selectfelder ersetzt werden. Zusätzlich sollten Anmeldung, Session-Rechte, CSRF-Schutz und ein echter Datei-Upload ergänzt werden. Die Datenbank ist dafür bereits vorbereitet.
