/*
 * nojquery.post.js
 * Kleine POST-Transportschicht für easyITCalendar.
 * Erwartet JSON-Antworten und wirft bei Anwendungs- oder HTTP-Fehlern Error.
 */
(function (global) {
  'use strict';

  const nj = global.nj;
  if (!nj) throw new Error('nojquery.core.js muss vor nojquery.post.js geladen werden.');

  nj.post = async function post(url, data, options) {
    const settings = Object.assign({
      timeout: nj.config.ajaxTimeout || 8000,
      credentials: 'same-origin',
      headers: {},
      signal: null
    }, options || {});

    const controller = new AbortController();
    const externalSignal = settings.signal;
    let timeoutId = null;

    if (externalSignal) {
      if (externalSignal.aborted) controller.abort(externalSignal.reason);
      else externalSignal.addEventListener('abort', function () {
        controller.abort(externalSignal.reason);
      }, { once: true });
    }

    if (settings.timeout > 0) {
      timeoutId = global.setTimeout(function () {
        controller.abort(new DOMException('Zeitüberschreitung', 'TimeoutError'));
      }, settings.timeout);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: settings.credentials,
        cache: 'no-store',
        signal: controller.signal,
        headers: Object.assign({
          'Accept': 'application/json',
          'Content-Type': 'application/json; charset=UTF-8'
        }, settings.headers),
        body: JSON.stringify(data || {})
      });

      const text = await response.text();
      let result = {};
      if (text.trim()) {
        try { result = JSON.parse(text); }
        catch (error) { throw new Error('Der PHP-Handler lieferte keine gültige JSON-Antwort.'); }
      }

      if (!response.ok || result.ok === false) {
        const error = new Error(result.error || `Serverfehler (HTTP ${response.status}).`);
        error.status = response.status;
        error.response = result;
        throw error;
      }

      return result;
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('Die Anfrage an den PHP-Handler wurde abgebrochen oder dauerte zu lange.');
      }
      throw error;
    } finally {
      if (timeoutId !== null) global.clearTimeout(timeoutId);
    }
  };
})(window);
