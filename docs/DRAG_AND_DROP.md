# Drag-and-drop – technische Beschreibung

## Ablauf

1. Eine Terminkachel wird gezogen.
2. Ein Zielslot liefert über `data-date` und `data-time` das neue Datum und die neue Startzeit.
3. Die vorhandene Termindauer wird in Minuten ermittelt.
4. Die neue Endzeit wird aus Zielbeginn plus Dauer berechnet.
5. Der Termin wird im `localStorage` gespeichert und der Kalender neu gerendert.
6. Ein Abschlussereignis wird protokolliert und ausgelöst.

## DOM-Ereignis

```js
document.addEventListener('tinycalendar:lesson-move-completed', function (event) {
  console.log(event.detail);
});
```

## Struktur des Abschlussereignisses

```js
{
  id: '...',
  type: 'lesson-move-completed',
  lessonId: '...',
  student: '...',
  subject: '...',
  oldDate: '2026-07-27',
  oldStart: '09:00',
  oldEnd: '10:00',
  newDate: '2026-07-29',
  newStart: '11:30',
  newEnd: '12:30',
  completedAt: '2026-07-26T...Z'
}
```

## Persistenz

- Termine: `tinycalendar.lessons.v1`
- Abschlussereignisse: `tinycalendar.completionEvents.v1`

## API

```js
TinyCalendar.getCompletionEvents();
TinyCalendar.clearCompletionEvents();
TinyCalendar.moveLesson(lessonId, '2026-07-30', '10:30');
TinyCalendar.onMoveCompleted = function (event) {};
```


## Überlagerte Termine und Versatzdarstellung

Ein belegter Zielslot blockiert das Ablegen nicht. Nach jeder Verschiebung werden die Termine des betroffenen Tages erneut ausgewertet.

- identische und teilweise überlappende Zeitintervalle sind zulässig
- zusammenhängende Überschneidungen werden zu einem Block gruppiert
- jeder Termin erhält innerhalb dieses Blocks eine freie Teilspalte
- die benötigte Anzahl der Teilspalten wird dynamisch bestimmt
- Zeit, Fach und Notiz werden in jeder Kachel ausgegeben
- beim Überfahren oder Fokussieren wird eine schmale überlagerte Kachel hervorgehoben

Zwei unmittelbar aufeinanderfolgende Termine, bei denen der erste exakt zum Beginn des zweiten endet, gelten nicht als Überlagerung.

## Snap-Verhalten der linken Terminkante

Für die Zielerkennung gilt ein Snap-Radius von `5 px` (`SNAP_RADIUS_PX`). Entscheidend ist nicht mehr die Position des Mauszeigers allein, sondern die berechnete linke Kante der gezogenen Terminkachel:

```text
linke Terminkante = Mausposition X - Griffabstand innerhalb der Kachel
```

Sobald diese linke Kante einen Tages-/Zeitslot erreicht oder höchstens 5 px von dessen Begrenzung entfernt liegt, wird der Slot als Ziel markiert. Dadurch genügt es, den Termin mit seiner linken Seite in den gewünschten Slot hineinzuschieben. Das Ablegen auf belegten Slots bleibt erlaubt; die anschließende Überlagerungsberechnung stellt die Termine versetzt dar.
