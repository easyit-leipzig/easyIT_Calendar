# Verbindliches Termin-Datenmodell

Jeder Termin wird vollständig in folgender Form gespeichert:

```json
{
  "id": 1,
  "to_role": 2,
  "to_tutor": 7,
  "to_student": 15,
  "start": "2026-07-27T09:00:00",
  "end": "2026-07-27T10:30:00",
  "activ": true,
  "thema": "Lineare Gleichungssysteme",
  "description": "Wiederholung und Übungsaufgaben",
  "appendizies": ["arbeitsblatt_01.pdf", "loesungen.pdf"]
}
```

## Feldregeln

| Feld | Typ | Regel |
|---|---|---|
| `id` | Integer | positive, eindeutige Termin-ID |
| `to_role` | Integer | Rollenreferenz, mindestens 0 |
| `to_tutor` | Integer | Tutorreferenz, mindestens 0 |
| `to_student` | Integer | Teilnehmerreferenz, mindestens 0 |
| `start` | Datetime | lokales ISO-Format `YYYY-MM-DDTHH:mm:ss` |
| `end` | Datetime | lokales ISO-Format, muss nach `start` liegen |
| `activ` | Boolean | `true` oder `false` |
| `thema` | Text | kann leer sein |
| `description` | Text | kann leer sein |
| `appendizies` | Array | Array aus Dateinamen ohne leere Einträge |

Beim Drag-and-drop werden nur `start` und `end` angepasst. Die Termindauer und alle übrigen Felder bleiben erhalten.

## Browser-Speicherung

Neue Termine werden unter `tinycalendar.lessons.v2` im `localStorage` gespeichert. Vorhandene Einträge aus `tinycalendar.lessons.v1` werden beim ersten Laden automatisch in das neue Modell überführt.
