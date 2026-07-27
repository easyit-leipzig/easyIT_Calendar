# easyITCalendar: nojquery POST + PHP-Handler

## Architektur

Das Kalender-Frontend verwendet für sämtliche Terminoperationen nur noch:

```text
nj.post() -> api/calendar_handler.php -> PDO -> MariaDB
```

Der Handler akzeptiert ausschließlich HTTP POST. Die gewünschte Operation steht im Feld `action`.

## Unterstützte Aktionen

### Termine laden

```javascript
nj.post('api/calendar_handler.php', {
  action: 'list',
  start: '2026-07-27',
  end: '2026-08-03'
});
```

### Termin anlegen

```javascript
nj.post('api/calendar_handler.php', {
  action: 'create',
  to_role: 3,
  to_tutor: 1,
  to_student: 2,
  start: '2026-07-27T09:00:00',
  end: '2026-07-27T10:00:00',
  activ: true,
  thema: 'Mathematik',
  description: 'Lineare Gleichungen',
  appendizies: []
});
```

### Termin ändern

Wie `create`, zusätzlich mit:

```json
{"action":"update","id":15}
```

### Termin deaktivieren

```javascript
nj.post('api/calendar_handler.php', {
  action: 'delete',
  id: 15
});
```

## Sicherheit

`index.php` erzeugt ein CSRF-Token in der PHP-Sitzung. `nojquery.post.js` überträgt dieses Token im Header `X-CSRF-Token`. Der PHP-Handler lehnt fehlende oder abweichende Token mit HTTP 403 ab.

## Erweiterbarkeit

Neue Aktionen können im `switch ($action)` des Handlers ergänzt werden, beispielsweise:

- `persons.list`
- `roles.list`
- `blocks.list`
- `blocks.create`
- `attachments.upload`

Damit bleibt ein einzelner, konsistenter POST-Endpunkt erhalten, ohne dass das Frontend an REST-Methoden wie PUT oder DELETE gebunden ist.
