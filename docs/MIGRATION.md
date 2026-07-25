# Migrationsentscheidung

## Entfernt

- TypeScript-Compiler und Typdeklarationen
- `.ts` und `.tsx`
- React-, Vue- und Preact-Schichten
- Babel-TypeScript-Preset
- ts-jest, ts-patch und TypeScript-ESLint
- Workspace-/Monorepo-Buildabhängigkeiten

## Ersetzt

- Framework-Komponenten durch direkte DOM-Erzeugung
- synthetische Framework-Events durch native Browser-Events
- internen Store durch einen kleinen JavaScript-State
- Eventmodell durch serialisierbare Unterrichtsobjekte
- Grid-Selektion durch delegierte noquery-Handler

## Datenmodell

```js
{
  id: 'uuid',
  date: '2026-07-27',
  start: '09:30',
  end: '10:00',
  student: 'Name',
  subject: 'Mathematik',
  notes: ''
}
```
