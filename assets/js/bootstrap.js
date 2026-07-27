(function (global) {
  'use strict';

  var DEFAULT_CONFIG = {
    application: { name: 'easyITCalendar', locale: 'de-DE', timezone: 'Europe/Stockholm' },
    user: { id: 1, role_id: 1, tutor_id: 1, student_id: 0 },
    views: { default: 'week', day: true, week: true, month: true },
    rights: {
      lesson_read: true, lesson_create: true, lesson_edit: true, lesson_delete: true,
      lesson_move: true, block_read: true, block_create: true, block_delete: true, help_read: true
    },
    features: {
      drag_drop: true, overlaps: true, blocked_slots: true,
      block_range_drag: true, help: true, completion_events: true
    },
    calendar: { slot_minutes: 30, hour_start: 7, hour_end: 22, snap_radius_px: 5 }
  };

  function validate(config) {
    if (!config || typeof config !== 'object') throw new Error('init.json enthält kein gültiges Objekt.');
    if (!config.views || !config.rights || !config.features || !config.calendar) {
      throw new Error('init.json enthält nicht alle Pflichtbereiche: views, rights, features und calendar.');
    }
    var allowed = ['day', 'week', 'month'];
    if (allowed.indexOf(config.views.default) < 0) throw new Error('views.default muss day, week oder month sein.');
    if (!config.views[config.views.default]) throw new Error('Die Standardansicht ist in init.json deaktiviert.');
    return config;
  }

  function showFatal(message) {
    function renderError() {
      document.body.innerHTML = '<main style="max-width:760px;margin:4rem auto;padding:2rem;font-family:system-ui,sans-serif;border:1px solid #b91c1c;border-radius:12px;background:#fff7f7">' +
        '<h1 style="margin-top:0;color:#991b1b">easyITCalendar konnte nicht gestartet werden</h1>' +
        '<p>' + String(message).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }) + '</p>' +
        '<p>Prüfen Sie <code>init.json</code> und die JavaScript-Dateien im Browser-Entwicklerwerkzeug.</p></main>';
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderError, { once: true });
    else renderError();
  }

  function startCalendar(config, warning) {
    global.TinyCalendarInit = Object.freeze(config);
    global.easyITCalendarInit = global.TinyCalendarInit;
    global.easyITCalendarBootstrapWarning = warning || '';

    var script = document.createElement('script');
    script.src = 'assets/js/calendar.js?v=20260726-3';
    script.onload = function () {
      if (!warning) return;
      global.setTimeout(function () {
        var status = document.getElementById('calendarStatus');
        if (status) {
          status.className = 'calendar-status error';
          status.textContent = warning + ' Der Kalender wurde deshalb mit der sicheren Standardkonfiguration gestartet.';
        }
      }, 0);
    };
    script.onerror = function () { showFatal('calendar.js konnte nicht geladen werden.'); };
    document.head.appendChild(script);
  }

  fetch('init.json?v=20260726-2', { cache: 'no-store', credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) throw new Error('init.json konnte nicht geladen werden (HTTP ' + response.status + ').');
      return response.json();
    })
    .then(validate)
    .then(function (config) { startCalendar(config, ''); })
    .catch(function (error) {
      console.error('easyITCalendar Initialisierung:', error);
      startCalendar(validate(DEFAULT_CONFIG), 'init.json war nicht erreichbar oder ungültig.');
    });
})(window);
