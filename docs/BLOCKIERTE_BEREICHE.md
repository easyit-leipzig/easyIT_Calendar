# Blockierte Zeitbereiche

Blockierungen sind keine Termine und verändern das verbindliche Termin-Datenmodell nicht.

## Bedienung

| Eingabe | Wirkung |
|---|---|
| normaler Rechtsklick | Browser-Kontextmenü |
| Strg + Rechtsklick | einzelnen 30-Minuten-Slot blockieren oder freigeben |
| Strg + rechte Maustaste ziehen | zusammenhängenden Bereich blockieren oder freigeben |

Beim Ziehen bestimmt der zuerst angefasste Slot die Aktion:

- Ist der Startslot frei, wird der gesamte ausgewählte Bereich blockiert.
- Ist der Startslot blockiert, wird der gesamte ausgewählte Bereich freigegeben.
- Die Auswahl bleibt innerhalb eines Tages.
- Während des Ziehens zeigt eine farbliche Vorschau den betroffenen Bereich.
- Beim Blockieren wird kein Termin erzeugt.

Mehrere direkt aufeinanderfolgende blockierte Slots erscheinen optisch als zusammenhängender Bereich. Blockierte Slots sind keine gültigen Drag-and-drop-Ziele für Termine.

## Speicherung

LocalStorage-Schlüssel: `tinycalendar.blockedSlots.v1`

Format:

```json
[
  "2026-07-27T09:00",
  "2026-07-27T09:30"
]
```

## JavaScript-API

- `easyITCalendar.getBlockedSlots()`
- `easyITCalendar.setBlockedSlots(slots)`
- `easyITCalendar.toggleBlockedSlot(date, time)`

Ereignisse:

- `tinycalendar:block-changed` bei Einzel- und Bereichsänderungen
- `tinycalendar:block-range-changed` zusätzlich nach einer Bereichsänderung

Das Ereignisdetail einer Bereichsänderung enthält `action`, `date`, `start`, `end`, `keys`, `slot_count` und `changed_count`.
