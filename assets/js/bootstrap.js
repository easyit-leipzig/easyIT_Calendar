(function (global) {
  'use strict';

  function showFatal(message) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.innerHTML = '<main style="max-width:760px;margin:4rem auto;padding:2rem;font-family:system-ui,sans-serif;border:1px solid #b91c1c;border-radius:12px;background:#fff7f7">' +
        '<h1 style="margin-top:0;color:#991b1b">Kalender konnte nicht gestartet werden</h1>' +
        '<p>' + String(message).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }) + '</p>' +
        '<p>Die Datei <code>init.json</code> muss vor dem Kalender erreichbar und gültig sein. Öffnen Sie das Paket über einen Webserver, zum Beispiel XAMPP.</p></main>';
    });
  }

  function validate(config) {
    if (!config || typeof config !== 'object') throw new Error('init.json enthält kein gültiges Objekt.');
    if (!config.views || !config.rights || !config.features || !config.calendar) throw new Error('init.json enthält nicht alle Pflichtbereiche: views, rights, features und calendar.');
    var allowed = ['day', 'week', 'month'];
    if (allowed.indexOf(config.views.default) < 0) throw new Error('views.default muss day, week oder month sein.');
    if (!config.views[config.views.default]) throw new Error('Die Standardansicht ist in init.json deaktiviert.');
    return config;
  }

  fetch('init.json', { cache: 'no-store', credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('init.json konnte nicht geladen werden (HTTP ' + response.status + ').');
      return response.json();
    })
    .then(validate)
    .then(function (config) {
      global.TinyCalendarInit = Object.freeze(config);
      var script = document.createElement('script');
      script.src = 'assets/js/calendar.js';
      script.defer = true;
      script.onerror = function () { showFatal('calendar.js konnte nach dem Laden der init.json nicht gestartet werden.'); };
      document.head.appendChild(script);
    })
    .catch(function (error) {
      console.error(error);
      showFatal(error.message || 'Unbekannter Initialisierungsfehler.');
    });
})(window);
