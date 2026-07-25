# TinyCalendar – nojquery / JavaScript

Dieser Stand ist eine vollständige, eigenständig lauffähige Neufassung des für die Stundenplanung benötigten Kalenderkerns.

## Eigenschaften

- kein TypeScript und keine `.ts`/`.tsx`-Dateien
- kein jQuery
- DOM-Zugriffe über `nojquery.core.js` 4.0.0
- kein React, Vue oder Preact
- kein npm-, Vite-, Webpack- oder Rollup-Zwang
- 7-Tage-Wochenansicht
- festes 30-Minuten-Raster von 07:00 bis 22:00 Uhr
- Klick- und Tastatur-Handler für jede Rasterzelle
- Anlegen, Bearbeiten und Löschen von Unterrichtsstunden
- Überschneidungsprüfung
- Speicherung im Browser über `localStorage`
- öffentliche JavaScript-API über `window.TinyCalendar`

## Start

`index.html` direkt im Browser öffnen. Für produktiven Betrieb empfiehlt sich ein lokaler Webserver.

Beispiel mit PHP:

```bash
php -S localhost:8080
```

Danach `http://localhost:8080` öffnen.

## Klick-Handler

Jede Rasterzelle enthält `data-date` und `data-time`. Der delegierte Handler wird über nojquery registriert:

```js
nj('#calendarGrid').on('click', '.slot', function () {
  openCreateDialog(this.dataset.date, this.dataset.time);
});
```

Das Ende wird automatisch auf 30 Minuten nach dem Beginn gesetzt.

## Öffentliche API

```js
TinyCalendar.getLessons();
TinyCalendar.setLessons([...]);
TinyCalendar.openSlot('2026-07-27', '09:30');
```

## Abgrenzung zum ursprünglichen Paket

Das ursprüngliche TOAST-UI-Repository ist ein umfangreiches Framework-Monorepo mit TypeScript, Framework-Wrappern, Buildsystemen, Storybook und Tests. Dieser Stand ersetzt nicht jede historische Framework-API, sondern den tatsächlich benötigten Funktionsumfang für eine halbstündliche Stundenplanung durch einen wartbaren Vanilla-JavaScript-Kern.
