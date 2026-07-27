(function (global) {
  'use strict';

  const nj = global.nj;
  if (!nj) throw new Error('nojquery.core.js muss vor calendar.js geladen werden.');

  const CONFIG = global.TinyCalendarInit;
  if (!CONFIG) throw new Error('init.json wurde nicht vor calendar.js geladen.');

  const STORAGE_KEY = 'tinycalendar.lessons.v2';
  const LEGACY_STORAGE_KEY = 'tinycalendar.lessons.v1';
  const COMPLETION_STORAGE_KEY = 'tinycalendar.completionEvents.v2';
  const BLOCK_STORAGE_KEY = 'tinycalendar.blockedSlots.v1';
  const SLOT_MINUTES = Number(CONFIG.calendar.slot_minutes) || 30;
  const HOUR_START = Number(CONFIG.calendar.hour_start) || 7;
  const HOUR_END = Number(CONFIG.calendar.hour_end) || 22;
  const DAY_COUNT = 7;
  const SNAP_RADIUS_PX = Number(CONFIG.calendar.snap_radius_px) || 5;

  const state = {
    view: CONFIG.views.default,
    weekStart: getMonday(new Date()),
    dayDate: new Date(),
    monthDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    lessons: [],
    loadingEvents: false,
    completionEvents: loadCompletionEvents(),
    blockedSlots: loadBlockedSlots(),
    draggedLessonId: null,
    dragGrabOffsetX: 0,
    activeDropSlot: null,
    suppressLessonClickUntil: 0,
    blockDrag: null
  };

  const els = {};

  nj.ready(function () {
    Object.assign(els, {
      grid: nj('#calendarGrid'), weekLabel: nj('#weekLabel'), dialog: nj('#lessonDialog').get(),
      form: nj('#lessonForm'), title: nj('#dialogTitle'), id: nj('#lessonId'), date: nj('#lessonDate'),
      start: nj('#lessonStart'), end: nj('#lessonEnd'), toRole: nj('#toRole'), toTutor: nj('#toTutor'),
      toStudent: nj('#toStudent'), activ: nj('#lessonActiv'), thema: nj('#lessonThema'),
      description: nj('#lessonDescription'), appendizies: nj('#lessonAppendizies'), error: nj('#formError'),
      deleteButton: nj('#deleteLesson'), status: nj('#calendarStatus'), helpDialog: nj('#helpDialog').get(),
      helpFrame: nj('#helpFrame').get(), helpTitle: nj('#helpDialogTitle'), helpSubtitle: nj('#helpDialogSubtitle')
    });
    applyInitConfiguration();
    bindControls();
    render();
    loadVisibleEvents();
    document.dispatchEvent(new CustomEvent('tinycalendar:initialized', { detail: { config: CONFIG } }));
  });



  function hasRight(name) { return CONFIG.rights[name] === true; }
  function hasFeature(name) { return CONFIG.features[name] === true; }
  function isViewEnabled(name) { return CONFIG.views[name] === true; }
  function deny(message) { setStatus(message || 'Für diese Aktion fehlt die Berechtigung.', 'error'); return false; }

  function applyInitConfiguration() {
    ['day', 'week', 'month'].forEach(function (view) {
      const button = document.getElementById(`${view}View`);
      if (button) button.hidden = !isViewEnabled(view);
    });
    const helpButton = document.getElementById('helpButton');
    if (helpButton) helpButton.hidden = !(hasFeature('help') && hasRight('help_read'));
    if (!isViewEnabled(state.view)) state.view = ['week', 'day', 'month'].find(isViewEnabled) || 'month';
    document.documentElement.dataset.calendarRole = String((CONFIG.user && CONFIG.user.role_id) || 0);
  }

  function bindControls() {
    nj('#prevWeek').on('click', function () { changePeriod(-1); });
    nj('#nextWeek').on('click', function () { changePeriod(1); });
    nj('#today').on('click', function () {
      const now = new Date();
      state.weekStart = getMonday(now);
      state.dayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      state.monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
      loadVisibleEvents();
    });
    nj('#dayView').on('click', function () { setView('day'); });
    nj('#weekView').on('click', function () { setView('week'); });
    nj('#monthView').on('click', function () { setView('month'); });
    nj('#helpButton').on('click', openHelpDialog);
    nj('#closeHelp').on('click', function () { els.helpDialog.close(); });
    nj('#cancelDialog').on('click', function () { els.dialog.close(); });
    els.form.on('submit', saveLessonFromForm);
    els.deleteButton.on('click', deleteCurrentLesson);
    els.grid.on('click', '.slot', function () {
      if (isSlotBlocked(this.dataset.date, this.dataset.time)) { setStatus('Dieser Zeitraum ist blockiert. Mit Strg+Rechtsklick kann die Blockierung aufgehoben werden.', 'info'); return; }
      openCreateDialog(this.dataset.date, this.dataset.time);
    });
    els.grid.on('contextmenu', '.slot', function (event) {
      if (!event.ctrlKey) return;
      event.preventDefault();
    });
    els.grid.on('mousedown', '.slot', handleBlockMouseDown);
    document.addEventListener('mousemove', handleBlockMouseMove);
    document.addEventListener('mouseup', handleBlockMouseUp);
    global.addEventListener('blur', cancelBlockDrag);
    els.grid.on('keydown', '.slot', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (isSlotBlocked(this.dataset.date, this.dataset.time)) { setStatus('Dieser Zeitraum ist blockiert. Mit Strg+Rechtsklick kann die Blockierung aufgehoben werden.', 'info'); return; }
        openCreateDialog(this.dataset.date, this.dataset.time);
      }
    });
    els.grid.on('click', '.lesson', function (event) {
      event.stopPropagation();
      if (Date.now() < state.suppressLessonClickUntil) return;
      openEditDialog(Number(this.dataset.id));
    });
    els.grid.on('dragstart', '.lesson', handleDragStart);
    els.grid.on('dragend', '.lesson', handleDragEnd);
    els.grid.on('dragover', handleDragOver);
    els.grid.on('dragleave', handleDragLeave);
    els.grid.on('drop', handleDrop);
  }


  function openHelpDialog() {
    if (!(hasFeature('help') && hasRight('help_read'))) return deny('Die Hilfe ist für diese Rolle nicht freigegeben.');
    const helpPages = {
      day: { file: 'help/day.html', title: 'Hilfe zur Tagesansicht', subtitle: 'Terminplanung und Blockierungen für einen Tag' },
      week: { file: 'help/week.html', title: 'Hilfe zur Wochenansicht', subtitle: 'Terminplanung und Blockierungen für sieben Tage' },
      month: { file: 'help/month.html', title: 'Hilfe zur Monatsansicht', subtitle: 'Lesende Übersicht aller Termine eines Monats' }
    };
    const page = helpPages[state.view] || helpPages.week;
    els.helpFrame.src = page.file;
    els.helpTitle.text(page.title);
    els.helpSubtitle.text(page.subtitle);
    if (typeof els.helpDialog.showModal === 'function') els.helpDialog.showModal();
    else global.open(page.file, '_blank', 'noopener');
  }

  function handleBlockMouseDown(event) {
    if (!hasFeature('blocked_slots') || !hasFeature('block_range_drag')) return;
    if (!(hasRight('block_create') || hasRight('block_delete'))) return;
    if (state.view !== 'week' && state.view !== 'day') return;
    if (event.button !== 2 || !event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    const date = this.dataset.date;
    const time = this.dataset.time;
    state.blockDrag = {
      date,
      startTime: time,
      currentTime: time,
      action: isSlotBlocked(date, time) ? 'unblock' : 'block',
      moved: false
    };
    if (state.blockDrag.action === 'block' && !hasRight('block_create')) { state.blockDrag = null; return deny('Sie dürfen keine Zeitbereiche blockieren.'); }
    if (state.blockDrag.action === 'unblock' && !hasRight('block_delete')) { state.blockDrag = null; return deny('Sie dürfen Blockierungen nicht aufheben.'); }
    updateBlockDragPreview();
    setStatus(`${state.blockDrag.action === 'block' ? 'Blockieren' : 'Freigeben'}: Bereich mit gedrückter Strg-Taste und rechter Maustaste ziehen.`, 'info');
  }

  function handleBlockMouseMove(event) {
    if (!state.blockDrag) return;
    event.preventDefault();
    const slot = document.elementFromPoint(event.clientX, event.clientY);
    const target = slot && slot.closest ? slot.closest('.slot') : null;
    if (!target || !els.grid.get().contains(target)) return;
    if (target.dataset.date !== state.blockDrag.date) return;
    if (target.dataset.time !== state.blockDrag.currentTime) {
      state.blockDrag.currentTime = target.dataset.time;
      state.blockDrag.moved = true;
      updateBlockDragPreview();
    }
  }

  function handleBlockMouseUp(event) {
    if (!state.blockDrag) return;
    if (event.button !== 2) return;
    event.preventDefault();
    const drag = state.blockDrag;
    const times = getTimeRange(drag.startTime, drag.currentTime);
    const shouldBlock = drag.action === 'block';
    let changed = 0;
    times.forEach(function (time) {
      const key = slotKey(drag.date, time);
      const index = state.blockedSlots.indexOf(key);
      if (shouldBlock && index < 0) { state.blockedSlots.push(key); changed += 1; }
      if (!shouldBlock && index >= 0) { state.blockedSlots.splice(index, 1); changed += 1; }
    });
    state.blockedSlots.sort();
    persistBlockedSlots();
    clearBlockDragPreview();
    state.blockDrag = null;
    render();
    const first = times[0];
    const last = times[times.length - 1];
    const end = minutesToTime(timeToMinutes(last) + SLOT_MINUTES);
    const action = shouldBlock ? 'blocked' : 'unblocked';
    setStatus(`${shouldBlock ? 'Zeitraum blockiert' : 'Blockierung aufgehoben'}: ${formatISODate(drag.date)}, ${first}–${end} (${times.length} Slot${times.length === 1 ? '' : 's'}).`, 'success');
    dispatchBlockRangeChanged(action, drag.date, first, end, times, changed);
  }

  function cancelBlockDrag() {
    if (!state.blockDrag) return;
    clearBlockDragPreview();
    state.blockDrag = null;
    setStatus('Bereichsauswahl abgebrochen.', 'info');
  }

  function getTimeRange(startTime, endTime) {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const lower = Math.min(start, end);
    const upper = Math.max(start, end);
    const times = [];
    for (let value = lower; value <= upper; value += SLOT_MINUTES) times.push(minutesToTime(value));
    return times;
  }

  function updateBlockDragPreview() {
    clearBlockDragPreview();
    if (!state.blockDrag) return;
    const previewClass = state.blockDrag.action === 'block' ? 'block-preview-add' : 'block-preview-remove';
    getTimeRange(state.blockDrag.startTime, state.blockDrag.currentTime).forEach(function (time) {
      const selector = `.slot[data-date="${state.blockDrag.date}"][data-time="${time}"]`;
      const slot = els.grid.get().querySelector(selector);
      if (slot) slot.classList.add('block-range-preview', previewClass);
    });
  }

  function clearBlockDragPreview() {
    if (!els.grid || !els.grid.get()) return;
    els.grid.get().querySelectorAll('.block-range-preview').forEach(function (slot) {
      slot.classList.remove('block-range-preview', 'block-preview-add', 'block-preview-remove');
    });
  }

  function render() {
    els.grid.empty();
    els.grid.get().classList.toggle('month-grid', state.view === 'month');
    els.grid.get().classList.toggle('week-grid', state.view === 'week');
    els.grid.get().classList.toggle('day-grid', state.view === 'day');
    if (state.view === 'month') renderMonth();
    else { renderHeaders(); renderSlots(); renderLessons(); }
    renderPeriodLabel();
    updateViewControls();
  }

  function setView(view) {
    if (!isViewEnabled(view)) return deny('Diese Kalenderansicht ist nicht freigegeben.');
    if (view !== 'day' && view !== 'week' && view !== 'month') return;
    const previousView = state.view;
    if (view === 'month') {
      const source = previousView === 'day' ? state.dayDate : state.weekStart;
      state.monthDate = new Date(source.getFullYear(), source.getMonth(), 1);
    } else if (view === 'day') {
      if (previousView === 'month') state.dayDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth(), 1);
      else if (previousView === 'week') state.dayDate = new Date(state.weekStart);
    } else if (view === 'week') {
      const source = previousView === 'day' ? state.dayDate : state.monthDate;
      state.weekStart = getMonday(source);
    }
    state.view = view;
    render();
    loadVisibleEvents();
    const messages = {
      day: 'Tagesansicht: alle Funktionen der Wochenansicht stehen für den gewählten Tag zur Verfügung.',
      week: 'Wochenansicht: Termine können verschoben und Zeitbereiche blockiert werden.',
      month: 'Monatsansicht: reine Darstellung aller Termine ohne Drag-and-drop.'
    };
    setStatus(messages[view], 'info');
  }

  function changePeriod(direction) {
    if (state.view === 'month') state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + direction, 1);
    else if (state.view === 'day') state.dayDate = addDays(state.dayDate, direction);
    else state.weekStart = addDays(state.weekStart, direction * 7);
    render();
    loadVisibleEvents();
  }

  function updateViewControls() {
    const dayButton = document.getElementById('dayView');
    const weekButton = document.getElementById('weekView');
    const monthButton = document.getElementById('monthView');
    dayButton.classList.toggle('active', state.view === 'day');
    weekButton.classList.toggle('active', state.view === 'week');
    monthButton.classList.toggle('active', state.view === 'month');
    dayButton.setAttribute('aria-pressed', String(state.view === 'day'));
    weekButton.setAttribute('aria-pressed', String(state.view === 'week'));
    monthButton.setAttribute('aria-pressed', String(state.view === 'month'));
  }

  function renderPeriodLabel() {
    if (state.view === 'month') {
      els.weekLabel.text(new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(state.monthDate));
      return;
    }
    if (state.view === 'day') {
      els.weekLabel.text(new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(state.dayDate));
      return;
    }
    els.weekLabel.text(`${formatDate(state.weekStart)} – ${formatDate(addDays(state.weekStart, 6))}`);
  }

  function visibleDayCount() { return state.view === 'day' ? 1 : DAY_COUNT; }
  function visibleStartDate() { return state.view === 'day' ? state.dayDate : state.weekStart; }

  function renderMonth() {
    const grid = els.grid.get();
    ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].forEach(function (label) {
      grid.appendChild(nj.create('div', { class: 'month-weekday', text: label }));
    });
    const first = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth(), 1);
    const last = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const cellStart = addDays(first, -offset);
    const totalCells = Math.ceil((offset + last.getDate()) / 7) * 7;
    const today = toISODate(new Date());
    for (let index = 0; index < totalCells; index += 1) {
      const date = addDays(cellStart, index);
      const iso = toISODate(date);
      const inMonth = date.getMonth() === state.monthDate.getMonth();
      const dayLessons = state.lessons
        .filter(function (lesson) { return datetimeDate(lesson.start) === iso; })
        .sort(function (a, b) { return a.start.localeCompare(b.start) || a.id - b.id; });
      const cell = nj.create('section', {
        class: `month-day${inMonth ? '' : ' outside'}${iso === today ? ' today' : ''}`,
        'aria-label': `${formatDate(date)}, ${dayLessons.length} Termin${dayLessons.length === 1 ? '' : 'e'}`
      });
      cell.appendChild(nj.create('header', { class: 'month-day-number', text: String(date.getDate()) }));
      const list = nj.create('div', { class: 'month-lessons' });
      dayLessons.forEach(function (lesson) {
        const text = [lesson.thema, lesson.description].filter(Boolean).join(' – ');
        list.appendChild(nj.create('article', {
          class: `month-lesson${lesson.activ ? '' : ' inactive'}`,
          title: `${datetimeTime(lesson.start)}–${datetimeTime(lesson.end)}\n${lesson.thema || ''}${lesson.description ? '\n' + lesson.description : ''}`,
          html: `<time>${datetimeTime(lesson.start)}–${datetimeTime(lesson.end)}</time><strong>${escapeHTML(lesson.thema || 'Termin')}</strong>${lesson.description ? `<span>${escapeHTML(lesson.description)}</span>` : ''}`
        }));
      });
      cell.appendChild(list);
      grid.appendChild(cell);
    }
    grid.style.minHeight = '';
  }

  function renderHeaders() {
    els.grid.get().appendChild(nj.create('div', { class: 'corner' }));
    const today = toISODate(new Date());
    for (let day = 0; day < visibleDayCount(); day += 1) {
      const date = addDays(visibleStartDate(), day); const iso = toISODate(date);
      els.grid.get().appendChild(nj.create('div', {
        class: `day-head${iso === today ? ' today' : ''}`,
        html: `<strong>${weekday(date)}</strong><span>${formatDate(date)}</span>`
      }));
    }
  }

  function renderSlots() {
    const totalSlots = (HOUR_END - HOUR_START) * 2;
    for (let row = 0; row < totalSlots; row += 1) {
      const minutes = HOUR_START * 60 + row * SLOT_MINUTES;
      const time = minutesToTime(minutes); const half = minutes % 60 !== 0;
      els.grid.get().appendChild(nj.create('div', { class: `time-label${half ? ' half' : ''}`, text: half ? '·' : time }));
      for (let day = 0; day < visibleDayCount(); day += 1) {
        const date = toISODate(addDays(visibleStartDate(), day));
        els.grid.get().appendChild(nj.create('div', {
          class: `slot${half ? '' : ' hour'}${isSlotBlocked(date, time) ? ' blocked' : ''}`, tabindex: 0, role: 'button',
          'aria-label': `${date}, ${time} bis ${minutesToTime(minutes + SLOT_MINUTES)}${isSlotBlocked(date, time) ? ', blockiert' : ''}`,
          title: isSlotBlocked(date, time) ? 'Blockierter Zeitraum – Strg+Rechtsklick zum Freigeben' : 'Strg+Rechtsklick zum Blockieren; Strg+Rechtsziehen für einen Bereich',
          dataset: { date, time }
        }));
      }
    }
  }

  function renderLessons() {
    const grid = els.grid.get(); const slotHeight = 34; const headerHeight = 64;
    const rows = (HOUR_END - HOUR_START) * 2; const dayCount = visibleDayCount(); const columnWidth = `(100% - 72px) / ${dayCount}`;
    calculateLessonLayouts().forEach(function (layout) {
      const lesson = layout.lesson;
      const top = headerHeight + ((layout.visibleStart - HOUR_START * 60) / SLOT_MINUTES) * slotHeight;
      const height = Math.max(30, ((layout.visibleEnd - layout.visibleStart) / SLOT_MINUTES) * slotHeight - 4);
      const laneGap = 3; const dayInset = 4; const laneCount = Math.max(1, layout.laneCount);
      const laneWidth = `((${columnWidth}) - ${dayInset * 2}px - ${(laneCount - 1) * laneGap}px) / ${laneCount}`;
      const left = `calc(72px + (${layout.dayIndex} * ${columnWidth}) + ${dayInset}px + (${layout.lane} * (${laneWidth} + ${laneGap}px)))`;
      const startTime = datetimeTime(lesson.start); const endTime = datetimeTime(lesson.end);
      const details = [lesson.thema, lesson.description].filter(Boolean).join(' · ');
      const studentLabel = `Student ${lesson.to_student}`;
      grid.appendChild(nj.create('button', {
        type: 'button', class: `lesson${layout.laneCount > 1 ? ' overlapping' : ''}${lesson.activ ? '' : ' inactive'}`,
        draggable: true, 'aria-grabbed': 'false',
        'aria-label': `${studentLabel}, ${startTime} bis ${endTime}${details ? ', ' + details : ''}`,
        title: `${studentLabel}\n${startTime}–${endTime}${details ? '\n' + details : ''}\nID: ${lesson.id}\nPer Drag-and-drop verschieben`,
        dataset: { id: lesson.id }, style: `top:${top}px;height:${height}px;left:${left};width:calc(${laneWidth})`,
        html: `<strong>${escapeHTML(studentLabel)}</strong><small class="lesson-time">${startTime}–${endTime}</small>${lesson.thema ? `<small>${escapeHTML(lesson.thema)}</small>` : ''}${lesson.description ? `<small class="lesson-description">${escapeHTML(lesson.description)}</small>` : ''}`
      }));
    });
    grid.style.minHeight = `${headerHeight + rows * slotHeight}px`;
  }

  function calculateLessonLayouts() {
    const dayCount = visibleDayCount();
    const startDate = visibleStartDate();
    const visibleByDay = Array.from({ length: dayCount }, function () { return []; });
    state.lessons.forEach(function (lesson) {
      const lessonDate = parseLocalDate(datetimeDate(lesson.start));
      const dayIndex = dayDifference(startDate, lessonDate);
      if (dayIndex < 0 || dayIndex >= dayCount) return;
      const startMinutes = timeToMinutes(datetimeTime(lesson.start));
      const endDate = datetimeDate(lesson.end);
      const endMinutes = endDate === datetimeDate(lesson.start) ? timeToMinutes(datetimeTime(lesson.end)) : 24 * 60;
      const visibleStart = Math.max(startMinutes, HOUR_START * 60); const visibleEnd = Math.min(endMinutes, HOUR_END * 60);
      if (visibleEnd <= visibleStart) return;
      visibleByDay[dayIndex].push({ lesson, dayIndex, startMinutes, endMinutes, visibleStart, visibleEnd, lane: 0, laneCount: 1 });
    });
    const result = [];
    visibleByDay.forEach(function (items) {
      items.sort(function (a, b) { return a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes; });
      let group = []; let groupEnd = -1;
      function finishGroup() { if (!group.length) return; assignOverlapLanes(group); result.push.apply(result, group); group = []; groupEnd = -1; }
      items.forEach(function (item) { if (group.length && item.startMinutes >= groupEnd) finishGroup(); group.push(item); groupEnd = Math.max(groupEnd, item.endMinutes); });
      finishGroup();
    });
    return result;
  }

  function assignOverlapLanes(group) {
    const laneEnds = [];
    group.forEach(function (item) {
      let lane = laneEnds.findIndex(function (endMinutes) { return endMinutes <= item.startMinutes; });
      if (lane < 0) lane = laneEnds.length; laneEnds[lane] = item.endMinutes; item.lane = lane;
    });
    group.forEach(function (item) { item.laneCount = Math.max(1, laneEnds.length); });
  }

  function handleDragStart(event) {
    if (!(hasFeature('drag_drop') && hasRight('lesson_move'))) { event.preventDefault(); return deny('Termine dürfen nicht verschoben werden.'); }
    if (state.view !== 'week' && state.view !== 'day') { event.preventDefault(); return; }
    const id = Number(this.dataset.id); const lesson = state.lessons.find(function (item) { return item.id === id; });
    if (!lesson) { event.preventDefault(); return; }
    state.draggedLessonId = id; state.dragGrabOffsetX = Math.max(0, event.clientX - this.getBoundingClientRect().left); state.activeDropSlot = null;
    this.classList.add('dragging'); this.setAttribute('aria-grabbed', 'true');
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(id)); }
    clearDropTargets(); setStatus(`Termin ${lesson.id} wird verschoben. Zielslot auswählen.`, 'info');
  }

  function handleDragOver(event) {
    if (state.draggedLessonId === null) return; event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const targetSlot = findSnapSlot(event.clientX, event.clientY);
    if (targetSlot === state.activeDropSlot) return;
    clearDropTargets(); state.activeDropSlot = targetSlot; if (targetSlot) targetSlot.classList.add('drop-target');
  }

  function handleDragLeave(event) {
    const next = event.relatedTarget;
    if (!next || !els.grid.get().contains(next)) { clearDropTargets(); state.activeDropSlot = null; }
  }

  function handleDrop(event) {
    if (state.draggedLessonId === null) return; event.preventDefault(); event.stopPropagation();
    const rawId = state.draggedLessonId !== null ? state.draggedLessonId : Number(event.dataTransfer && event.dataTransfer.getData('text/plain'));
    const targetSlot = findSnapSlot(event.clientX, event.clientY) || state.activeDropSlot;
    clearDropTargets(); state.activeDropSlot = null;
    if (!Number.isInteger(rawId) || !targetSlot) { setStatus('Kein gültiger Zielslot innerhalb des 5-px-Snap-Radius erkannt.', 'error'); return; }
    moveLessonToSlot(rawId, targetSlot.dataset.date, targetSlot.dataset.time);
  }

  function findSnapSlot(clientX, clientY) {
    const lessonLeftX = clientX - state.dragGrabOffsetX; let bestSlot = null; let bestDistance = Infinity;
    els.grid.get().querySelectorAll('.slot').forEach(function (slot) {
      if (slot.classList.contains('blocked')) return;
      const rect = slot.getBoundingClientRect();
      if (clientY < rect.top - SNAP_RADIUS_PX || clientY > rect.bottom + SNAP_RADIUS_PX || lessonLeftX < rect.left - SNAP_RADIUS_PX || lessonLeftX > rect.right + SNAP_RADIUS_PX) return;
      const horizontalDistance = lessonLeftX < rect.left ? rect.left - lessonLeftX : lessonLeftX > rect.right ? lessonLeftX - rect.right : 0;
      const score = horizontalDistance * 1000 + Math.abs(clientY - (rect.top + rect.height / 2));
      if (score < bestDistance) { bestDistance = score; bestSlot = slot; }
    });
    return bestSlot;
  }

  function handleDragEnd() { this.classList.remove('dragging'); this.setAttribute('aria-grabbed', 'false'); clearDropTargets(); state.draggedLessonId = null; state.dragGrabOffsetX = 0; state.activeDropSlot = null; }
  function clearDropTargets() { els.grid.get().querySelectorAll('.slot.drop-target').forEach(function (slot) { slot.classList.remove('drop-target'); }); }

  async function moveLessonToSlot(id, targetDate, targetStart) {
    if (!(hasFeature('drag_drop') && hasRight('lesson_move'))) return deny('Termine dürfen nicht verschoben werden.');
    if (isSlotBlocked(targetDate, targetStart)) { setStatus('Der Zielzeitraum ist blockiert und kann nicht belegt werden.', 'error'); state.draggedLessonId = null; return; }
    const index = state.lessons.findIndex(function (item) { return item.id === id; }); if (index < 0) return;
    const oldValue = cloneLesson(state.lessons[index]); const duration = datetimeToMinutes(oldValue.end) - datetimeToMinutes(oldValue.start);
    const newStart = `${targetDate}T${targetStart}:00`; const newEnd = addMinutesToDatetime(newStart, duration);
    if (datetimeDate(newEnd) !== targetDate) { setStatus('Der Termin kann nicht über Mitternacht hinaus verschoben werden.', 'error'); state.draggedLessonId = null; return; }
    const updated = Object.assign({}, oldValue, { start: newStart, end: newEnd });
    const error = validateLesson(updated); if (error) { setStatus(error, 'error'); state.draggedLessonId = null; return; }
    try {
      setStatus('Termin wird verschoben …', 'info');
      await apiRequest('PUT', updated);
      state.lessons[index] = updated;
      const completion = createMoveCompletionEvent(oldValue, updated);
      state.suppressLessonClickUntil = Date.now() + 350; state.draggedLessonId = null; render();
      setStatus(`Termin ${updated.id} verschoben: ${formatISODate(targetDate)}, ${datetimeTime(updated.start)}–${datetimeTime(updated.end)}.`, 'success');
      dispatchMoveCompleted(completion);
    } catch (error) {
      state.draggedLessonId = null;
      setStatus(error.message, 'error');
      render();
    }
  }

  function createMoveCompletionEvent(oldLesson, newLesson) {
    const completion = {
      id: nextCompletionId(), type: 'lesson-move-completed', lesson_id: newLesson.id,
      old_start: oldLesson.start, old_end: oldLesson.end, new_start: newLesson.start, new_end: newLesson.end,
      completed_at: new Date().toISOString()
    };
    state.completionEvents.push(completion); persistCompletionEvents(); return completion;
  }

  function dispatchMoveCompleted(completion) {
    document.dispatchEvent(new CustomEvent('tinycalendar:lesson-move-completed', { detail: Object.assign({}, completion) }));
    if (global.TinyCalendar && typeof global.TinyCalendar.onMoveCompleted === 'function') global.TinyCalendar.onMoveCompleted(Object.assign({}, completion));
  }

  function setStatus(message, type) { if (!els.status || !els.status.get()) return; els.status.text(message || ''); els.status.get().className = `calendar-status ${type || 'info'}`; }
  function formatISODate(value) { return formatDate(parseLocalDate(value)); }

  function openCreateDialog(date, start) {
    if (!hasRight('lesson_create')) return deny('Sie dürfen keine Termine anlegen.');
    clearForm(); els.title.text('Termin anlegen'); els.date.val(date); els.start.val(start); els.end.val(minutesToTime(timeToMinutes(start) + SLOT_MINUTES));
    els.activ.get().checked = true; els.deleteButton.prop('hidden', true); els.dialog.showModal(); els.toStudent.get().focus();
  }

  function openEditDialog(id) {
    if (!hasRight('lesson_edit')) return deny('Sie dürfen Termine nur ansehen, aber nicht bearbeiten.');
    const lesson = state.lessons.find(function (item) { return item.id === id; }); if (!lesson) return;
    clearForm(); els.title.text('Termin bearbeiten'); els.id.val(String(lesson.id)); els.date.val(datetimeDate(lesson.start));
    els.start.val(datetimeTime(lesson.start)); els.end.val(datetimeTime(lesson.end)); els.toRole.val(String(lesson.to_role));
    els.toTutor.val(String(lesson.to_tutor)); els.toStudent.val(String(lesson.to_student)); els.activ.get().checked = lesson.activ;
    els.thema.val(lesson.thema); els.description.val(lesson.description); els.appendizies.val(lesson.appendizies.join('\n'));
    els.deleteButton.prop('hidden', false); els.dialog.showModal();
  }

  async function saveLessonFromForm(event) {
    event.preventDefault();
    const existingId = Number(els.id.val());
    if (Number.isInteger(existingId) ? !hasRight('lesson_edit') : !hasRight('lesson_create')) return deny('Für das Speichern dieses Termins fehlt die Berechtigung.');
    els.error.text(''); const date = els.date.val();
    const lesson = normalizeLesson({
      id: els.id.val() ? Number(els.id.val()) : 0, to_role: Number(els.toRole.val()),
      to_tutor: Number(els.toTutor.val()), to_student: Number(els.toStudent.val()),
      start: `${date}T${normalizeHalfHour(els.start.val())}:00`, end: `${date}T${normalizeHalfHour(els.end.val())}:00`,
      activ: Boolean(els.activ.get().checked), thema: String(els.thema.val() || '').trim(),
      description: String(els.description.val() || '').trim(), appendizies: parseFilenames(els.appendizies.val())
    });
    if (!existingId) lesson.id = 1;
    const error = validateLesson(lesson); if (error) { els.error.text(error); return; }
    try {
      const result = await apiRequest(existingId ? 'PUT' : 'POST', Object.assign({}, lesson, existingId ? { id: existingId } : {}));
      els.dialog.close();
      await loadVisibleEvents();
      setStatus(`Termin ${result.id} wurde ${existingId ? 'aktualisiert' : 'angelegt'}.`, 'success');
    } catch (error) {
      els.error.text(error.message);
    }
  }

  function validateLesson(lesson) {
    if (!Number.isInteger(lesson.id) || lesson.id < 1) return 'ID muss eine positive Ganzzahl sein.';
    if (!Number.isInteger(lesson.to_role) || lesson.to_role < 0 || !Number.isInteger(lesson.to_tutor) || lesson.to_tutor < 0 || !Number.isInteger(lesson.to_student) || lesson.to_student < 0) return 'Rolle, Tutor und Student müssen Ganzzahlen ab 0 sein.';
    if (!isValidDatetime(lesson.start) || !isValidDatetime(lesson.end)) return 'Start und Ende müssen gültige Datums-/Zeitwerte sein.';
    if (datetimeToMinutes(lesson.end) <= datetimeToMinutes(lesson.start)) return 'Das Ende muss nach dem Beginn liegen.';
    if (typeof lesson.activ !== 'boolean') return 'activ muss ein boolescher Wert sein.';
    if (typeof lesson.thema !== 'string' || typeof lesson.description !== 'string') return 'Thema und Beschreibung müssen Text sein.';
    if (!Array.isArray(lesson.appendizies) || lesson.appendizies.some(function (name) { return typeof name !== 'string' || !name.trim(); })) return 'appendizies muss ein Array gültiger Dateinamen sein.';
    return '';
  }

  async function deleteCurrentLesson() {
    if (!hasRight('lesson_delete')) return deny('Sie dürfen keine Termine löschen.');
    const id = Number(els.id.val()); if (!Number.isInteger(id)) return;
    if (!global.confirm('Termin wirklich deaktivieren?')) return;
    try {
      await apiRequest('DELETE', { id });
      els.dialog.close();
      await loadVisibleEvents();
      setStatus(`Termin ${id} wurde deaktiviert.`, 'success');
    } catch (error) { els.error.text(error.message); }
  }
  function clearForm() { els.form.get().reset(); els.id.val(''); els.error.text(''); els.appendizies.val(''); }

  function visibleRange() {
    if (state.view === 'month') {
      const first = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth(), 1);
      const next = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + 1, 1);
      return { start: toISODate(first), end: toISODate(next) };
    }
    const first = visibleStartDate();
    return { start: toISODate(first), end: toISODate(addDays(first, visibleDayCount())) };
  }

  async function loadVisibleEvents() {
    if (!hasRight('lesson_read')) { state.lessons = []; render(); return; }
    const range = visibleRange();
    state.loadingEvents = true;
    setStatus('Termine werden aus der Datenbank geladen …', 'info');
    try {
      const data = await nj.post(global.easyITCalendarHandler, {
        action: 'list',
        start: range.start,
        end: range.end
      }, {
        headers: { 'X-CSRF-Token': global.easyITCalendarCsrf || '' }
      });
      state.lessons = (Array.isArray(data.events) ? data.events : []).map(normalizeLesson);
      render();
      setStatus(`${state.lessons.length} Termin(e) aus der Datenbank geladen.`, 'success');
    } catch (error) {
      state.lessons = [];
      render();
      setStatus(`Termine konnten nicht geladen werden: ${error.message}`, 'error');
    } finally { state.loadingEvents = false; }
  }

  async function apiRequest(method, payload) {
    const actionMap = { POST: 'create', PUT: 'update', DELETE: 'delete' };
    const action = actionMap[String(method || '').toUpperCase()];
    if (!action) throw new Error(`Nicht unterstützte Kalenderaktion: ${method}`);
    return nj.post(global.easyITCalendarHandler, Object.assign({ action }, payload || {}), {
      headers: { 'X-CSRF-Token': global.easyITCalendarCsrf || '' }
    });
  }

  function migrateLesson(item, index) {
    try {
      if (item && item.start && String(item.start).includes('T')) return normalizeLesson(item);
      const date = item.date || toISODate(new Date());
      return normalizeLesson({
        id: Number.isInteger(Number(item.id)) && Number(item.id) > 0 ? Number(item.id) : index + 1,
        to_role: Number(item.to_role || 0), to_tutor: Number(item.to_tutor || 0), to_student: Number(item.to_student || 0),
        start: `${date}T${item.start || '09:00'}:00`, end: `${date}T${item.end || '09:30'}:00`, activ: item.activ !== false,
        thema: item.thema || item.subject || '', description: item.description || item.notes || item.student || '',
        appendizies: Array.isArray(item.appendizies) ? item.appendizies : []
      });
    } catch (error) { console.warn('Termin wurde bei der Migration verworfen.', item, error); return null; }
  }

  function normalizeLesson(item) {
    return {
      id: Number(item.id), to_role: Number(item.to_role), to_tutor: Number(item.to_tutor), to_student: Number(item.to_student),
      start: normalizeDatetime(item.start), end: normalizeDatetime(item.end), activ: Boolean(item.activ),
      thema: String(item.thema || ''), description: String(item.description || ''),
      appendizies: Array.isArray(item.appendizies) ? item.appendizies.map(String).map(function (v) { return v.trim(); }).filter(Boolean) : [],
      version_no: Number(item.version_no || 1)
    };
  }

  function slotKey(date, time) { return `${date}T${time}`; }
  function isSlotBlocked(date, time) { return state.blockedSlots.includes(slotKey(date, time)); }
  function toggleBlockedSlot(date, time) {
    if (!hasFeature('blocked_slots')) return deny('Blockierungen sind deaktiviert.');
    if (isSlotBlocked(date, time) && !hasRight('block_delete')) return deny('Sie dürfen Blockierungen nicht aufheben.');
    if (!isSlotBlocked(date, time) && !hasRight('block_create')) return deny('Sie dürfen keine Zeitbereiche blockieren.');
    const key = slotKey(date, time);
    const index = state.blockedSlots.indexOf(key);
    if (index >= 0) {
      state.blockedSlots.splice(index, 1);
      persistBlockedSlots();
      render();
      setStatus(`Blockierung aufgehoben: ${formatISODate(date)}, ${time}–${minutesToTime(timeToMinutes(time) + SLOT_MINUTES)}.`, 'success');
      dispatchBlockChanged('unblocked', date, time);
      return;
    }
    state.blockedSlots.push(key);
    state.blockedSlots.sort();
    persistBlockedSlots();
    render();
    setStatus(`Zeitraum blockiert: ${formatISODate(date)}, ${time}–${minutesToTime(timeToMinutes(time) + SLOT_MINUTES)}.`, 'success');
    dispatchBlockChanged('blocked', date, time);
  }
  function dispatchBlockChanged(action, date, time) {
    const end = minutesToTime(timeToMinutes(time) + SLOT_MINUTES);
    const detail = { action, date, start: time, end, key: slotKey(date, time), keys: [slotKey(date, time)], slot_count: 1 };
    document.dispatchEvent(new CustomEvent('tinycalendar:block-changed', { detail }));
  }
  function dispatchBlockRangeChanged(action, date, start, end, times, changed) {
    const detail = { action, date, start, end, keys: times.map(function (time) { return slotKey(date, time); }), slot_count: times.length, changed_count: changed };
    document.dispatchEvent(new CustomEvent('tinycalendar:block-changed', { detail }));
    document.dispatchEvent(new CustomEvent('tinycalendar:block-range-changed', { detail }));
  }
  function loadBlockedSlots() {
    try {
      const value = JSON.parse(localStorage.getItem(BLOCK_STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(function (item) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(item)); }) : [];
    } catch (error) { return []; }
  }
  function persistBlockedSlots() { localStorage.setItem(BLOCK_STORAGE_KEY, JSON.stringify(state.blockedSlots)); }

  function loadCompletionEvents() { try { const value = JSON.parse(localStorage.getItem(COMPLETION_STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch (error) { return []; } }
  function persist() { /* Termine werden serverseitig gespeichert. */ }
  function persistCompletionEvents() { localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(state.completionEvents)); }
  function nextLessonId() { return state.lessons.reduce(function (max, item) { return Math.max(max, item.id); }, 0) + 1; }
  function nextCompletionId() { return state.completionEvents.reduce(function (max, item) { return Math.max(max, Number(item.id) || 0); }, 0) + 1; }
  function parseFilenames(value) { return String(value || '').split(/[\n,;]+/).map(function (name) { return name.trim(); }).filter(Boolean); }
  function normalizeHalfHour(value) { return minutesToTime(Math.round(timeToMinutes(value) / SLOT_MINUTES) * SLOT_MINUTES); }
  function normalizeDatetime(value) { const text = String(value || '').trim().replace(' ', 'T'); return text.length === 16 ? `${text}:00` : text.slice(0, 19); }
  function isValidDatetime(value) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(String(value)) && !Number.isNaN(new Date(value).getTime()); }
  function datetimeDate(value) { return String(value).slice(0, 10); }
  function datetimeTime(value) { return String(value).slice(11, 16); }
  function datetimeToMinutes(value) { return Math.floor(new Date(value).getTime() / 60000); }
  function addMinutesToDatetime(value, minutes) { const date = new Date(value); date.setMinutes(date.getMinutes() + minutes); return `${toISODate(date)}T${minutesToTime(date.getHours() * 60 + date.getMinutes())}:00`; }
  function cloneLesson(item) { return Object.assign({}, item, { appendizies: item.appendizies.slice() }); }
  function getMonday(date) { const value = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const day = value.getDay() || 7; value.setDate(value.getDate() - day + 1); return value; }
  function addDays(date, count) { const value = new Date(date.getFullYear(), date.getMonth(), date.getDate()); value.setDate(value.getDate() + count); return value; }
  function dayDifference(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
  function parseLocalDate(value) { const parts = String(value).split('-').map(Number); return new Date(parts[0], parts[1] - 1, parts[2]); }
  function toISODate(date) { return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-'); }
  function formatDate(date) { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date); }
  function weekday(date) { return new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(date); }
  function timeToMinutes(value) { const parts = String(value || '00:00').split(':').map(Number); return parts[0] * 60 + parts[1]; }
  function minutesToTime(value) { const normalized = Math.max(0, Math.min(value, 24 * 60)); return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`; }
  function pad(value) { return String(value).padStart(2, '0'); }
  function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]; }); }

  global.TinyCalendar = {
    getConfig: function () { return JSON.parse(JSON.stringify(CONFIG)); },
    hasRight: hasRight,
    getLessons: function () { return hasRight('lesson_read') ? state.lessons.map(cloneLesson) : []; },
    setLessons: function (lessons) {
      const normalized = (Array.isArray(lessons) ? lessons : []).map(normalizeLesson);
      const error = normalized.map(validateLesson).find(Boolean); if (error) throw new TypeError(error);
      const ids = normalized.map(function (item) { return item.id; });
      if (new Set(ids).size !== ids.length) throw new TypeError('Termin-IDs müssen eindeutig sein.');
      state.lessons = normalized; render();
    },
    getCompletionEvents: function () { return state.completionEvents.map(function (item) { return Object.assign({}, item); }); },
    clearCompletionEvents: function () { state.completionEvents = []; persistCompletionEvents(); },
    getBlockedSlots: function () { return state.blockedSlots.slice(); },
    setBlockedSlots: function (slots) {
      const normalized = Array.from(new Set((Array.isArray(slots) ? slots : []).map(String)));
      if (normalized.some(function (item) { return !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(item); })) throw new TypeError('Blockierte Slots müssen das Format YYYY-MM-DDTHH:MM haben.');
      state.blockedSlots = normalized.sort(); persistBlockedSlots(); render();
    },
    toggleBlockedSlot: toggleBlockedSlot,
    moveLesson: function (id, date, start) { moveLessonToSlot(Number(id), date, normalizeHalfHour(start)); },
    onMoveCompleted: null, openSlot: openCreateDialog,
    config: CONFIG,
    constants: { SLOT_MINUTES, HOUR_START, HOUR_END, SNAP_RADIUS_PX, BLOCK_STORAGE_KEY },
    schema: { id: 'int', to_role: 'int', to_tutor: 'int', to_student: 'int', start: 'datetime', end: 'datetime', activ: 'boolean', thema: 'text', description: 'text', appendizies: 'string[]' }
  };
})(window);
