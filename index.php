<?php
declare(strict_types=1);
session_start();
if (empty($_SESSION['easyit_calendar_csrf'])) {
    $_SESSION['easyit_calendar_csrf'] = bin2hex(random_bytes(32));
}
$easyITCalendarCsrf = $_SESSION['easyit_calendar_csrf'];
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>easyITCalendar – Stundenplanung</title>
  <link rel="stylesheet" href="assets/css/calendar.css?v=20260726-3">
</head>
<body>
  <header class="app-header">
    <a class="brand" href="index.php" aria-label="easyITCalendar Startseite">
      <img class="brand-logo" src="assets/img/easyITCalendar-logo.png" alt="easyITCalendar">
      <span class="brand-text">
        <strong>easyITCalendar</strong>
        <small>Stundenplanung im 30-Minuten-Raster</small>
      </span>
    </a>
    <nav class="toolbar" aria-label="Kalendersteuerung">
      <div class="view-switch" role="group" aria-label="Kalenderansicht">
        <button id="dayView" type="button" aria-pressed="false">Tag</button>
        <button id="weekView" class="active" type="button" aria-pressed="true">Woche</button>
        <button id="monthView" type="button" aria-pressed="false">Monat</button>
      </div>
      <button id="prevWeek" type="button" aria-label="Vorheriger Zeitraum">‹</button>
      <button id="today" type="button">Heute</button>
      <button id="nextWeek" type="button" aria-label="Nächster Zeitraum">›</button>
      <button id="helpButton" class="help-button" type="button" aria-haspopup="dialog">Hilfe</button>
      <strong id="weekLabel" aria-live="polite"></strong>
    </nav>
  </header>

  <main class="calendar-shell">
    <p id="calendarStatus" class="calendar-status info" role="status" aria-live="polite">In der Tages- und Wochenansicht können Termine verschoben und Zeiten blockiert werden. Die Monatsansicht zeigt ausschließlich alle Termine ohne Drag-and-drop.</p>
    <section class="calendar" aria-label="Wochenkalender">
      <div id="calendarGrid" class="calendar-grid"></div>
    </section>
  </main>

  <dialog id="lessonDialog">
    <form id="lessonForm" method="dialog">
      <h2 id="dialogTitle">Termin anlegen</h2>
      <input id="lessonId" type="hidden">
      <label>Datum<input id="lessonDate" type="date" required></label>
      <div class="form-row">
        <label>Beginn<input id="lessonStart" type="time" step="1800" required></label>
        <label>Ende<input id="lessonEnd" type="time" step="1800" required></label>
      </div>
      <div class="form-row three-columns">
        <label>Rollen-ID<input id="toRole" type="number" min="0" step="1" required></label>
        <label>Tutor-ID<input id="toTutor" type="number" min="0" step="1" required></label>
        <label>Student-ID<input id="toStudent" type="number" min="0" step="1" required></label>
      </div>
      <label class="checkbox-label"><input id="lessonActiv" type="checkbox" checked> Termin aktiv</label>
      <label>Thema<textarea id="lessonThema" rows="2"></textarea></label>
      <label>Beschreibung<textarea id="lessonDescription" rows="3"></textarea></label>
      <label>Anlagen / Dateinamen<textarea id="lessonAppendizies" rows="3" placeholder="Ein Dateiname je Zeile, alternativ Komma oder Semikolon"></textarea></label>
      <p id="formError" class="error" role="alert"></p>
      <div class="dialog-actions">
        <button id="deleteLesson" class="danger" type="button" hidden>Löschen</button>
        <span></span>
        <button id="cancelDialog" type="button">Abbrechen</button>
        <button class="primary" type="submit">Speichern</button>
      </div>
    </form>
  </dialog>

  <dialog id="helpDialog" class="help-dialog" aria-labelledby="helpDialogTitle">
    <div class="help-dialog-shell">
      <header class="help-dialog-header">
        <div>
          <h2 id="helpDialogTitle">Kalenderhilfe</h2>
          <p id="helpDialogSubtitle">Bedienungsanleitung</p>
        </div>
        <button id="closeHelp" type="button" aria-label="Hilfefenster schließen">×</button>
      </header>
      <iframe id="helpFrame" title="Bedienungsanleitung des Kalenders" src="help/index.html"></iframe>
    </div>
  </dialog>

  <script src="assets/js/nojquery.core.js?v=20260726-4"></script>
  <script src="assets/js/nojquery.post.js?v=20260726-4"></script>
  <script>
    window.easyITCalendarHandler = "api/calendar_handler.php";
    window.easyITCalendarCsrf = <?= json_encode($easyITCalendarCsrf, JSON_UNESCAPED_SLASHES) ?>;
  </script>
  <script src="assets/js/bootstrap.js?v=20260726-4"></script>
</body>
</html>
