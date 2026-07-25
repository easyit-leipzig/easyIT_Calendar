(function (global) {
  'use strict';

  const nj = global.nj;
  if (!nj) throw new Error('nojquery.core.js muss vor calendar.js geladen werden.');

  const STORAGE_KEY = 'tinycalendar.lessons.v1';
  const SLOT_MINUTES = 30;
  const HOUR_START = 7;
  const HOUR_END = 22;
  const DAY_COUNT = 7;

  const state = {
    weekStart: getMonday(new Date()),
    lessons: loadLessons(),
    selectedSlot: null
  };

  const els = {};

  nj.ready(function () {
    Object.assign(els, {
      grid: nj('#calendarGrid'),
      weekLabel: nj('#weekLabel'),
      dialog: nj('#lessonDialog').get(),
      form: nj('#lessonForm'),
      title: nj('#dialogTitle'),
      id: nj('#lessonId'),
      date: nj('#lessonDate'),
      start: nj('#lessonStart'),
      end: nj('#lessonEnd'),
      student: nj('#studentName'),
      subject: nj('#subject'),
      notes: nj('#notes'),
      error: nj('#formError'),
      deleteButton: nj('#deleteLesson')
    });

    bindControls();
    render();
  });

  function bindControls() {
    nj('#prevWeek').on('click', function () { changeWeek(-7); });
    nj('#nextWeek').on('click', function () { changeWeek(7); });
    nj('#today').on('click', function () { state.weekStart = getMonday(new Date()); render(); });
    nj('#cancelDialog').on('click', function () { els.dialog.close(); });
    els.form.on('submit', saveLessonFromForm);
    els.deleteButton.on('click', deleteCurrentLesson);

    els.grid.on('click', '.slot', function () {
      openCreateDialog(this.dataset.date, this.dataset.time);
    });

    els.grid.on('keydown', '.slot', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCreateDialog(this.dataset.date, this.dataset.time);
      }
    });

    els.grid.on('click', '.lesson', function (event) {
      event.stopPropagation();
      openEditDialog(this.dataset.id);
    });
  }

  function render() {
    els.grid.empty();
    renderHeaders();
    renderSlots();
    renderLessons();
    renderWeekLabel();
  }

  function renderHeaders() {
    els.grid.get().appendChild(nj.create('div', { class: 'corner' }));
    const today = toISODate(new Date());

    for (let day = 0; day < DAY_COUNT; day += 1) {
      const date = addDays(state.weekStart, day);
      const iso = toISODate(date);
      const head = nj.create('div', {
        class: `day-head${iso === today ? ' today' : ''}`,
        html: `<strong>${weekday(date)}</strong><span>${formatDate(date)}</span>`
      });
      els.grid.get().appendChild(head);
    }
  }

  function renderSlots() {
    const totalSlots = (HOUR_END - HOUR_START) * 2;
    for (let row = 0; row < totalSlots; row += 1) {
      const minutes = HOUR_START * 60 + row * SLOT_MINUTES;
      const time = minutesToTime(minutes);
      const half = minutes % 60 !== 0;
      els.grid.get().appendChild(nj.create('div', {
        class: `time-label${half ? ' half' : ''}`,
        text: half ? '·' : time
      }));

      for (let day = 0; day < DAY_COUNT; day += 1) {
        const date = toISODate(addDays(state.weekStart, day));
        els.grid.get().appendChild(nj.create('div', {
          class: `slot${half ? '' : ' hour'}`,
          tabindex: 0,
          role: 'button',
          'aria-label': `${date}, ${time} bis ${minutesToTime(minutes + SLOT_MINUTES)}`,
          dataset: { date, time }
        }));
      }
    }
  }

  function renderLessons() {
    const grid = els.grid.get();
    const slotHeight = 34;
    const headerHeight = 64;
    const rows = (HOUR_END - HOUR_START) * 2;

    state.lessons.forEach(function (lesson) {
      const lessonDate = parseLocalDate(lesson.date);
      const dayIndex = dayDifference(state.weekStart, lessonDate);
      if (dayIndex < 0 || dayIndex >= DAY_COUNT) return;

      const startMinutes = timeToMinutes(lesson.start);
      const endMinutes = timeToMinutes(lesson.end);
      const visibleStart = Math.max(startMinutes, HOUR_START * 60);
      const visibleEnd = Math.min(endMinutes, HOUR_END * 60);
      if (visibleEnd <= visibleStart) return;

      const top = headerHeight + ((visibleStart - HOUR_START * 60) / SLOT_MINUTES) * slotHeight;
      const height = Math.max(30, ((visibleEnd - visibleStart) / SLOT_MINUTES) * slotHeight - 4);
      const columnWidth = `(100% - 72px) / 7`;
      const lessonEl = nj.create('button', {
        type: 'button',
        class: 'lesson',
        dataset: { id: lesson.id },
        style: `top:${top}px;height:${height}px;left:calc(72px + (${dayIndex} * ${columnWidth}) + 4px);width:calc(${columnWidth} - 8px)`,
        html: `<strong>${escapeHTML(lesson.student)}</strong><small>${escapeHTML(lesson.start)}–${escapeHTML(lesson.end)}${lesson.subject ? ' · ' + escapeHTML(lesson.subject) : ''}</small>`
      });
      grid.appendChild(lessonEl);
    });

    grid.style.minHeight = `${headerHeight + rows * slotHeight}px`;
  }

  function openCreateDialog(date, start) {
    const end = minutesToTime(timeToMinutes(start) + SLOT_MINUTES);
    clearForm();
    els.title.text('Unterrichtsstunde planen');
    els.date.val(date);
    els.start.val(start);
    els.end.val(end);
    els.deleteButton.prop('hidden', true);
    state.selectedSlot = { date, start, end };
    els.dialog.showModal();
    els.student.get().focus();
  }

  function openEditDialog(id) {
    const lesson = state.lessons.find(function (item) { return item.id === id; });
    if (!lesson) return;
    clearForm();
    els.title.text('Unterrichtsstunde bearbeiten');
    els.id.val(lesson.id);
    els.date.val(lesson.date);
    els.start.val(lesson.start);
    els.end.val(lesson.end);
    els.student.val(lesson.student);
    els.subject.val(lesson.subject || '');
    els.notes.val(lesson.notes || '');
    els.deleteButton.prop('hidden', false);
    els.dialog.showModal();
  }

  function saveLessonFromForm(event) {
    event.preventDefault();
    els.error.text('');

    const lesson = {
      id: els.id.val() || makeId(),
      date: els.date.val(),
      start: normalizeHalfHour(els.start.val()),
      end: normalizeHalfHour(els.end.val()),
      student: String(els.student.val() || '').trim(),
      subject: String(els.subject.val() || '').trim(),
      notes: String(els.notes.val() || '').trim()
    };

    const error = validateLesson(lesson);
    if (error) { els.error.text(error); return; }

    const index = state.lessons.findIndex(function (item) { return item.id === lesson.id; });
    if (index >= 0) state.lessons[index] = lesson;
    else state.lessons.push(lesson);

    persist();
    els.dialog.close();
    render();
  }

  function validateLesson(lesson) {
    if (!lesson.date || !lesson.start || !lesson.end || !lesson.student) return 'Datum, Beginn, Ende und Schüler/in sind erforderlich.';
    if (timeToMinutes(lesson.end) <= timeToMinutes(lesson.start)) return 'Das Ende muss nach dem Beginn liegen.';
    const conflict = state.lessons.some(function (item) {
      return item.id !== lesson.id && item.date === lesson.date &&
        timeToMinutes(item.start) < timeToMinutes(lesson.end) &&
        timeToMinutes(item.end) > timeToMinutes(lesson.start);
    });
    return conflict ? 'Dieser Zeitraum überschneidet sich mit einer vorhandenen Stunde.' : '';
  }

  function deleteCurrentLesson() {
    const id = els.id.val();
    if (!id) return;
    state.lessons = state.lessons.filter(function (item) { return item.id !== id; });
    persist();
    els.dialog.close();
    render();
  }

  function clearForm() {
    els.form.get().reset();
    els.id.val('');
    els.error.text('');
  }

  function changeWeek(days) {
    state.weekStart = addDays(state.weekStart, days);
    render();
  }

  function renderWeekLabel() {
    const end = addDays(state.weekStart, 6);
    els.weekLabel.text(`${formatDate(state.weekStart)} – ${formatDate(end)}`);
  }

  function loadLessons() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (error) {
      console.warn('Gespeicherte Stunden konnten nicht geladen werden.', error);
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lessons));
  }

  function normalizeHalfHour(value) {
    const minutes = timeToMinutes(value);
    return minutesToTime(Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES);
  }

  function getMonday(date) {
    const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = value.getDay() || 7;
    value.setDate(value.getDate() - day + 1);
    return value;
  }

  function addDays(date, count) {
    const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    value.setDate(value.getDate() + count);
    return value;
  }

  function dayDifference(a, b) {
    const day = 86400000;
    return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / day);
  }

  function parseLocalDate(value) {
    const parts = String(value).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function toISODate(date) {
    return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  function weekday(date) {
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(date);
  }

  function timeToMinutes(value) {
    const parts = String(value || '00:00').split(':').map(Number);
    return parts[0] * 60 + parts[1];
  }

  function minutesToTime(value) {
    const normalized = Math.max(0, Math.min(value, 24 * 60));
    return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
  }

  function pad(value) { return String(value).padStart(2, '0'); }
  function makeId() { return global.crypto && crypto.randomUUID ? crypto.randomUUID() : `lesson-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function escapeHTML(value) {
    return String(value).replace(/[&<>'"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char];
    });
  }

  global.TinyCalendar = {
    getLessons: function () { return state.lessons.map(function (item) { return Object.assign({}, item); }); },
    setLessons: function (lessons) { state.lessons = Array.isArray(lessons) ? lessons : []; persist(); render(); },
    openSlot: openCreateDialog,
    constants: { SLOT_MINUTES, HOUR_START, HOUR_END }
  };
})(window);
