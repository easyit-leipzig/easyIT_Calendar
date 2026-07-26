# Initialisierung über init.json

Der Kalender lädt beim Start zwingend zuerst `init.json`. Erst nach erfolgreicher Prüfung wird `assets/js/calendar.js` nachgeladen und die Oberfläche aufgebaut.

## Bereiche

- `application`: Name, Sprache und Zeitzone
- `user`: aktuelle Benutzer-, Rollen-, Tutor- und Studenten-ID
- `views`: freigegebene Ansichten und Standardansicht
- `rights`: Les-, Schreib-, Lösch-, Verschiebe-, Blockier- und Hilferechte
- `features`: globale Funktionsschalter
- `calendar`: Raster, sichtbarer Zeitraum und Snap-Radius

## Verhalten

Nicht freigegebene Ansichten werden ausgeblendet. Rechte werden nicht nur optisch, sondern auch in den Ereignisfunktionen und in der öffentlichen JavaScript-API geprüft. Ist `init.json` nicht erreichbar oder ungültig, startet der Kalender nicht und zeigt eine verständliche Fehlermeldung.

Das Paket muss über einen Webserver geöffnet werden, beispielsweise über XAMPP. Ein direkter Start per `file://` kann das Laden der JSON-Datei durch Browser-Sicherheitsregeln verhindern.


## HTML-Handbuch

Eine vollständige browserbasierte Referenz befindet sich in `help/handbook.html`. Die Seite verwendet `help/help.css` und `help/handbook.css` und ist in die Navigation des bestehenden Hilfesystems eingebunden.
