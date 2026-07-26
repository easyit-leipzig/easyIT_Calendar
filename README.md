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
- Überschneidungen ausdrücklich zulässig
- automatische versetzte Teilspalten bei gleichen oder überlappenden Zeiten
- Zeit, Fach und Notiz bleiben auch bei Überlagerungen sichtbar
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

## Drag-and-drop und Abschlussereignis

Terminkacheln sind verschiebbar. Beim Ablegen auf einem anderen 30-Minuten-Slot werden Datum und Startzeit aus dem Zielslot übernommen; die ursprüngliche Dauer bleibt erhalten und die Endzeit wird neu berechnet.

Jede erfolgreiche Verschiebung wird unter `tinycalendar.completionEvents.v1` im `localStorage` gespeichert und zusätzlich als DOM-Ereignis ausgelöst:

```js
document.addEventListener('tinycalendar:lesson-move-completed', function (event) {
  console.log(event.detail);
});
```

Öffentliche API:

```js
TinyCalendar.getCompletionEvents();
TinyCalendar.clearCompletionEvents();
TinyCalendar.moveLesson(lessonId, '2026-07-30', '10:30');
TinyCalendar.onMoveCompleted = function (completionEvent) {
  console.log(completionEvent);
};
```

Das Abschlussereignis enthält die alte und neue Datums-/Zeitbelegung sowie `completedAt` als ISO-Zeitstempel. Zeitliche Überschneidungen sind ausdrücklich zulässig. Alle Termine eines zusammenhängenden Überschneidungsblocks werden automatisch auf versetzte Teilspalten verteilt. Dies gilt für identische Startzeiten ebenso wie für nur teilweise überlappende Termine.

### Präziser 5-px-Snap

Beim Verschieben wird der Zielslot anhand der linken Kante der Terminkachel erkannt. Ein Snap-Radius von 5 px erleichtert das Erfassen des gewünschten Tages- und 30-Minuten-Slots. Es reicht, die linke Terminseite in den Slot zu führen; der Mauszeiger muss sich nicht mittig über dem Slot befinden.

## Verbindliches Terminobjekt

Jeder Termin enthält immer diese Felder:

```js
{
  id: 1,                         // int
  to_role: 2,                    // int
  to_tutor: 7,                   // int
  to_student: 15,                // int
  start: '2026-07-27T09:00:00',  // datetime
  end: '2026-07-27T10:30:00',    // datetime
  activ: true,                   // boolean
  thema: 'Mathematik',           // text
  description: 'Bruchrechnung',  // text
  appendizies: ['blatt.pdf']     // array of filenames
}
```

Details und Migrationsregeln stehen in `docs/TERMIN_DATENMODELL.md`. Beim Drag-and-drop werden ausschließlich `start` und `end` verändert; alle übrigen Felder bleiben vollständig erhalten.


## Zeitbereiche blockieren

- **Strg + Rechtsklick** blockiert oder entsperrt einen einzelnen 30-Minuten-Slot.
- **Strg + rechte Maustaste ziehen** markiert einen zusammenhängenden Bereich desselben Tages.
- Der Startslot bestimmt die Aktion für den gesamten Bereich: frei = blockieren, blockiert = freigeben.
- Ein normaler Rechtsklick bleibt für das Browser-Kontextmenü verfügbar.
- Eine farbliche Vorschau zeigt den Bereich vor dem Loslassen.
- Die Blockierung erzeugt keinen Termin und verändert keine Terminobjekte.
- Blockierungen werden getrennt unter `tinycalendar.blockedSlots.v1` im `localStorage` gespeichert.
- Drag-and-drop ignoriert blockierte Slots als mögliche Ziele.
- DOM-Ereignisse: `tinycalendar:block-changed` und bei Bereichen zusätzlich `tinycalendar:block-range-changed`.


## Monatsansicht

Über die Schaltflächen **Woche** und **Monat** kann zwischen beiden Darstellungen gewechselt werden. Die Monatsansicht zeigt alle Termine eines Monats chronologisch innerhalb der Tageszellen. Sie ist bewusst schreibgeschützt: Es gibt dort kein Drag-and-drop, keine Slot-Blockierung und keine Terminbearbeitung. Mit den Pfeiltasten wird monatsweise navigiert; **Heute** springt zum aktuellen Monat.

## Tagesansicht

Über die Schaltfläche **Tag** steht eine eintägige Ansicht mit sämtlichen Funktionen der Wochenansicht zur Verfügung. Die Pfeilnavigation wechselt tageweise. Details: `docs/TAGESANSICHT.md`.


## Integriertes Hilfesystem

Über den Button **Hilfe** öffnet jede Ansicht ihre eigene HTML-Bedienungsanleitung in einem modalen Fenster. Das eigenständige Paket liegt unter `help/` und verwendet ausschließlich HTML und CSS.


## HTML-Handbuch

Das vollständige Handbuch liegt unter `help/handbook.html`. Es ist über die Übersichtsseite des integrierten Hilfesystems erreichbar und kann zusätzlich direkt im Browser geöffnet werden. Es beschreibt Installation, Startablauf, `init.json`, Rechte, Ansichten, Funktionsschalter, Rollenprofile, Terminmodell, Blockierungen, Abschlussereignisse und Fehlerbehebung.


## Administrationshandbuch

Das ausführliche Administrationshandbuch liegt unter `help/admin-handbook.html`. Das zugehörige MariaDB-/MySQL-Skript mit Tabelle und Grundwerten befindet sich unter `sql/main_settings.sql`.
