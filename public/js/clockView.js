/**
 * ClockView - 24-hour circular clock visualization.
 * Renders an SVG clock alongside the task list.
 */
class ClockView {
  constructor() {
    this.container = null;
    this.svg = null;
    this.isVisible = false;
    this.tasks = [];
    this.selectedTaskId = null;
    this.timeFormat = '12h';
    this.timeUpdateInterval = null;
    this.onTaskSelected = null;
    this.onTaskTimeNudged = null;
    this.routineItems = [];
    this.activeTaskId = null;
    this.activeTaskStartedAt = null;
    this.activeTaskTimeSpent = 0;
    this.activeTaskPomodoroMode = false;
    this.activeTaskPomodoroInterval = 25;
    this.activeUpdateInterval = null;
    this.viewDateOffset = 0; // 0 = today, 1 = tomorrow, -1 = yesterday
  }

  /**
   * Initialize the clock view with a DOM container.
   */
  init(container) {
    this.container = container;
    if (!this.container) return;
    this._createSVG();

    // Restore persisted visibility
    const saved = localStorage.getItem('clockViewVisible');
    if (saved === 'true' && window.innerWidth >= 800) {
      this.show();
    }
  }

  show() {
    if (!this.container) return;
    this.isVisible = true;
    const panel = document.getElementById('clock-panel');
    if (panel) panel.classList.remove('hidden');
    const layout = document.querySelector('.app-layout');
    if (layout) layout.classList.add('clock-active');
    const btn = document.getElementById('clock-toggle-btn');
    if (btn) btn.classList.add('active');
    localStorage.setItem('clockViewVisible', 'true');
    this._startTimeUpdate();
    this.render();
    this._updateNavState();
    this.loadUpcomingPreviews();
  }

  hide() {
    this.isVisible = false;
    const panel = document.getElementById('clock-panel');
    if (panel) panel.classList.add('hidden');
    const layout = document.querySelector('.app-layout');
    if (layout) layout.classList.remove('clock-active');
    const btn = document.getElementById('clock-toggle-btn');
    if (btn) btn.classList.remove('active');
    localStorage.setItem('clockViewVisible', 'false');
    this._stopTimeUpdate();
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Receive updated task data and re-render the clock.
   */
  updateTasks(tasks) {
    this.tasks = tasks || [];
    if (this.isVisible) {
      this.render();
    }
  }

  /**
   * Set the time format for hour labels.
   */
  setTimeFormat(format) {
    this.timeFormat = format || '12h';
    if (this.isVisible) {
      this.render();
    }
  }

  /**
   * Full render of the SVG clock.
   */
  render() {
    if (!this.svg || !this.isVisible) return;

    // Clear all dynamic content groups
    const groups = [
      '.clock-hours',
      '.clock-labels',
      '.clock-routine',
      '.clock-appointments',
      '.clock-blocked-zones',
      '.clock-ring[data-ring="1"]',
      '.clock-ring[data-ring="2"]',
      '.clock-ring[data-ring="3"]',
      '.clock-conflicts',
    ];
    groups.forEach((sel) => {
      const el = this.svg.querySelector(sel);
      if (el) el.innerHTML = '';
    });

    this._renderHourMarkings();
    this._renderRoutineBlocks();
    this._renderAppointments();
    this._renderTaskArcs();
    this._renderTimeHand();
  }

  // ── Private methods ──────────────────────────────────────────

  /**
   * Create the base SVG element with all layer groups.
   */
  _createSVG() {
    const NS = 'http://www.w3.org/2000/svg';

    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'day-clock');
    this.svg.setAttribute('viewBox', '0 0 600 600');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', '24-hour clock view');

    // Clock face background
    const bg = document.createElementNS(NS, 'circle');
    bg.setAttribute('class', 'clock-bg');
    bg.setAttribute('cx', ClockMath.CENTER_X);
    bg.setAttribute('cy', ClockMath.CENTER_Y);
    bg.setAttribute('r', ClockMath.CLOCK_RADIUS);
    this.svg.appendChild(bg);

    // Ring backgrounds (faint circles showing ring positions)
    this._renderRingBackgrounds();

    // Layer groups in render order (bottom to top)
    const layerNames = [
      'clock-routine',
      'clock-appointments',
      'clock-blocked-zones',
      'clock-ring',
      'clock-ring',
      'clock-ring',
      'clock-conflicts',
      'clock-hours',
      'clock-labels',
      'clock-time-hand',
    ];
    const ringNumbers = [
      null,
      null,
      null,
      '1',
      '2',
      '3',
      null,
      null,
      null,
      null,
    ];

    layerNames.forEach((name, i) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', name);
      if (ringNumbers[i]) {
        g.setAttribute('data-ring', ringNumbers[i]);
      }
      this.svg.appendChild(g);
    });

    // Click on empty space to deselect
    this.svg.addEventListener('click', (e) => {
      if (e.target === this.svg || e.target.classList.contains('clock-bg')) {
        this.selectedTaskId = null;
        this._hideInfoPanel();
        this.render();
      }
    });

    this.container.innerHTML = '';
    this.container.appendChild(this.svg);
  }

  /**
   * Render faint ring background circles to show where task arcs will go.
   */
  _renderRingBackgrounds() {
    const NS = 'http://www.w3.org/2000/svg';
    for (let ring = 1; ring <= 3; ring++) {
      const { inner, outer } = ClockMath.getRingRadii(ring);
      const midRadius = (inner + outer) / 2;
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('class', 'clock-ring-bg');
      circle.setAttribute('cx', ClockMath.CENTER_X);
      circle.setAttribute('cy', ClockMath.CENTER_Y);
      circle.setAttribute('r', midRadius);
      circle.setAttribute('stroke-width', outer - inner);
      this.svg.appendChild(circle);
    }
  }

  /**
   * Render 24 hour tick marks and labels at major positions.
   */
  _renderHourMarkings() {
    const NS = 'http://www.w3.org/2000/svg';
    const hoursGroup = this.svg.querySelector('.clock-hours');
    const labelsGroup = this.svg.querySelector('.clock-labels');
    if (!hoursGroup || !labelsGroup) return;

    const majorHours = [0, 3, 6, 9, 12, 15, 18, 21];

    for (let h = 0; h < 24; h++) {
      const angle = (h / 24) * 360;
      const isMajor = majorHours.includes(h);

      // Tick mark
      const tickInner = isMajor
        ? ClockMath.TICK_INNER_MAJOR
        : ClockMath.TICK_INNER_MINOR;
      const start = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        tickInner,
        angle
      );
      const end = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        ClockMath.TICK_OUTER,
        angle
      );

      const tick = document.createElementNS(NS, 'line');
      tick.setAttribute(
        'class',
        isMajor ? 'clock-hour-mark-major' : 'clock-hour-mark'
      );
      tick.setAttribute('x1', start.x);
      tick.setAttribute('y1', start.y);
      tick.setAttribute('x2', end.x);
      tick.setAttribute('y2', end.y);
      hoursGroup.appendChild(tick);

      // Labels only at major hours
      if (isMajor) {
        const labelPos = ClockMath.polarToCartesian(
          ClockMath.CENTER_X,
          ClockMath.CENTER_Y,
          ClockMath.LABEL_RADIUS,
          angle
        );

        const label = document.createElementNS(NS, 'text');
        label.setAttribute('class', 'clock-hour-label');
        label.setAttribute('x', labelPos.x);
        label.setAttribute('y', labelPos.y);
        label.textContent = ClockMath.formatHourLabel(h, this.timeFormat);
        labelsGroup.appendChild(label);
      }
    }
  }

  /**
   * Render the current time hand (line + dot at center).
   */
  _renderTimeHand() {
    const NS = 'http://www.w3.org/2000/svg';
    const handGroup = this.svg.querySelector('.clock-time-hand');
    if (!handGroup) return;
    handGroup.innerHTML = '';

    // Only show time hand when viewing today
    if (this.viewDateOffset !== 0) return;

    const currentTime = ClockMath.getCurrentTime();
    const angle = ClockMath.timeToAngle(currentTime);
    const tip = ClockMath.polarToCartesian(
      ClockMath.CENTER_X,
      ClockMath.CENTER_Y,
      ClockMath.HAND_RADIUS,
      angle
    );

    // Hand line
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('class', 'clock-hand');
    line.setAttribute('x1', ClockMath.CENTER_X);
    line.setAttribute('y1', ClockMath.CENTER_Y);
    line.setAttribute('x2', tip.x);
    line.setAttribute('y2', tip.y);
    handGroup.appendChild(line);

    // Center dot
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'clock-hand-dot');
    dot.setAttribute('cx', ClockMath.CENTER_X);
    dot.setAttribute('cy', ClockMath.CENTER_Y);
    dot.setAttribute('r', 4);
    handGroup.appendChild(dot);

    // Small dot at the tip
    const tipDot = document.createElementNS(NS, 'circle');
    tipDot.setAttribute('class', 'clock-hand-dot');
    tipDot.setAttribute('cx', tip.x);
    tipDot.setAttribute('cy', tip.y);
    tipDot.setAttribute('r', 3);
    handGroup.appendChild(tipDot);
  }

  /**
   * Start interval to update the time hand every 60 seconds.
   */
  _startTimeUpdate() {
    this._stopTimeUpdate();
    this.timeUpdateInterval = setInterval(() => {
      this._renderTimeHand();
    }, 60000);
  }

  /**
   * Stop the time update interval.
   */
  _stopTimeUpdate() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  /**
   * Set routine items for rendering on the clock.
   */
  setRoutineItems(items) {
    this.routineItems = items || [];
    if (this.isVisible) this.render();
  }

  // ── Routine Blocks (Phase 8) ──────────────────────────────

  /**
   * Render routine time blocks as background arcs on the clock.
   */
  _renderRoutineBlocks() {
    const NS = 'http://www.w3.org/2000/svg';
    const routineGroup = this.svg.querySelector('.clock-routine');
    if (!routineGroup) return;

    // Determine day of week for the viewed date
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const viewDate = new Date();
    if (this.viewDateOffset)
      viewDate.setDate(viewDate.getDate() + this.viewDateOffset);
    const today = dayNames[viewDate.getDay()];

    this.routineItems.forEach((item) => {
      if (!item.enabled) return;
      if (!item.startTime) return;
      if (item.days && !item.days.includes(today)) return;

      if (item.duration && item.duration > 0) {
        // Time block - render as muted background arc
        const pathD = ClockMath.arcPath(
          item.startTime,
          item.duration,
          ClockMath.CLOCK_RADIUS - 5,
          ClockMath.CLOCK_RADIUS
        );
        if (pathD) {
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', pathD);
          path.setAttribute('class', 'routine-arc');
          path.style.cursor = 'pointer';
          const title = document.createElementNS(NS, 'title');
          title.textContent = `${item.icon || ''} ${item.label}\n${item.startTime} (${item.duration} min)`;
          path.appendChild(title);
          path.addEventListener('click', (e) => {
            e.stopPropagation();
            this._showRoutineInfoPanel(item);
          });
          routineGroup.appendChild(path);
        }
      } else {
        // Quick checklist item - render as small dot marker
        const angle = ClockMath.timeToAngle(item.startTime);
        const pos = ClockMath.polarToCartesian(
          ClockMath.CENTER_X,
          ClockMath.CENTER_Y,
          ClockMath.CLOCK_RADIUS - 3,
          angle
        );
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('class', 'routine-dot');
        dot.setAttribute('cx', pos.x);
        dot.setAttribute('cy', pos.y);
        dot.setAttribute('r', 4);
        dot.style.cursor = 'pointer';
        const title = document.createElementNS(NS, 'title');
        title.textContent = `${item.icon || ''} ${item.label} (${item.startTime})`;
        dot.appendChild(title);
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          this._showRoutineInfoPanel(item);
        });
        routineGroup.appendChild(dot);
      }
    });
  }

  // ── Task Arc Rendering (Phase 2) ───────────────────────────

  /**
   * Get the currently viewed date as YYYY-MM-DD string.
   * Uses viewDateOffset (0 = today, +1 = tomorrow, etc.)
   */
  _getToday() {
    const now = new Date();
    if (this.viewDateOffset) {
      now.setDate(now.getDate() + this.viewDateOffset);
    }
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Navigate the clock view by a number of days (clamped to 0–2).
   */
  navigateDay(delta) {
    const newOffset = this.viewDateOffset + delta;
    if (newOffset < 0 || newOffset > 2) return;
    this.viewDateOffset = newOffset;
    this.render();
    this._updateNavState();
    this.loadUpcomingPreviews();
  }

  /**
   * Reset the clock view to today.
   */
  goToToday() {
    this.viewDateOffset = 0;
    this.render();
    this._updateNavState();
    this.loadUpcomingPreviews();
  }

  /**
   * Update nav button enabled/disabled state and date label.
   */
  _updateNavState() {
    const prevBtn = document.getElementById('clock-nav-prev');
    const nextBtn = document.getElementById('clock-nav-next');
    const todayBtn = document.getElementById('clock-nav-today');

    if (prevBtn) {
      prevBtn.disabled = this.viewDateOffset <= 0;
    }
    if (nextBtn) {
      nextBtn.disabled = this.viewDateOffset >= 2;
    }
    if (todayBtn) {
      // Show date label on the Today button
      if (this.viewDateOffset === 0) {
        todayBtn.textContent = 'Today';
      } else if (this.viewDateOffset === 1) {
        todayBtn.textContent = 'Tomorrow';
      } else {
        const d = new Date();
        d.setDate(d.getDate() + this.viewDateOffset);
        todayBtn.textContent = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }
    }
  }

  /**
   * Render task arcs on the three priority rings.
   */
  _renderTaskArcs() {
    const today = this._getToday();
    const todayTasks = this.tasks.filter(
      (task) =>
        !task.completed &&
        !task.archived &&
        !task.isAppointment &&
        task.dueDate === today &&
        (task.plannedStartTime || task.dueTime)
    );

    const assignments = this._assignTasksToRings(todayTasks);

    assignments.forEach(({ task, ring, conflict, appointmentConflict }) => {
      this._renderSingleTaskArc(task, ring, conflict, appointmentConflict);
    });
  }

  /**
   * Assign tasks to rings based on priority with overflow logic.
   * High→ring1, Medium→ring2, Low→ring3. Overflow outward then inward.
   */
  _assignTasksToRings(tasks) {
    const occupiedSlots = [];
    const assignments = [];

    // Sort by priority for assignment precedence (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...tasks].sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
    );

    // Gather appointments for conflict checking
    const today = this._getToday();
    const appointments = this.tasks.filter(
      (t) =>
        t.isAppointment &&
        !t.completed &&
        !t.archived &&
        t.dueDate === today &&
        t.dueTime
    );

    sorted.forEach((task) => {
      const startTime = task.plannedStartTime || task.dueTime;
      const duration = task.plannedDuration || 60;
      const preferredRing = { high: 1, medium: 2, low: 3 }[task.priority] || 2;

      let assignedRing = null;

      // Try preferred ring, then outward
      for (let ring = preferredRing; ring <= 3; ring++) {
        const hasConflict = occupiedSlots.some(
          (slot) =>
            slot.ring === ring &&
            ClockMath.timeRangesOverlap(
              startTime,
              duration,
              slot.start,
              slot.duration
            )
        );
        if (!hasConflict) {
          assignedRing = ring;
          break;
        }
      }

      // If not found, try inward
      if (!assignedRing) {
        for (let ring = preferredRing - 1; ring >= 1; ring--) {
          const hasConflict = occupiedSlots.some(
            (slot) =>
              slot.ring === ring &&
              ClockMath.timeRangesOverlap(
                startTime,
                duration,
                slot.start,
                slot.duration
              )
          );
          if (!hasConflict) {
            assignedRing = ring;
            break;
          }
        }
      }

      // All rings occupied — place on preferred with conflict flag
      const conflict = !assignedRing;
      if (!assignedRing) assignedRing = preferredRing;

      occupiedSlots.push({ ring: assignedRing, start: startTime, duration });

      // Check appointment conflicts
      const appointmentConflict = appointments.some((appt) =>
        ClockMath.timeRangesOverlap(
          startTime,
          duration,
          appt.dueTime,
          appt.plannedDuration || 60
        )
      );

      assignments.push({
        task,
        ring: assignedRing,
        conflict,
        appointmentConflict,
      });
    });

    return assignments;
  }

  /**
   * Render a single task arc on a ring.
   */
  _renderSingleTaskArc(task, ring, conflict, appointmentConflict) {
    const NS = 'http://www.w3.org/2000/svg';
    const startTime = task.plannedStartTime || task.dueTime;
    const duration = task.plannedDuration || 60;
    const { inner, outer } = ClockMath.getRingRadii(ring);
    const pathD = ClockMath.arcPath(startTime, duration, inner, outer);
    if (!pathD) return;

    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('data-task-id', task.id);

    // Build class list
    let classes = `task-arc task-arc-${task.priority}`;
    if (conflict) classes += ' task-arc-conflict';
    if (appointmentConflict) classes += ' task-arc-appointment-conflict';
    if (task.id === this.selectedTaskId) classes += ' task-arc-selected';
    if (task.id === this.activeTaskId) classes += ' task-arc-active';
    path.setAttribute('class', classes);

    // Accessibility
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute(
      'aria-label',
      `${task.description}, ${startTime}, ${duration} minutes, ${task.priority} priority`
    );

    // Tooltip
    const title = document.createElementNS(NS, 'title');
    title.textContent = `${task.description}\n${startTime} (${duration} min)`;
    path.appendChild(title);

    // Click handler - select task and show info panel
    path.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectedTaskId = task.id;
      this._showInfoPanel(task, startTime, duration);
      this.render();
      if (this.onTaskSelected) {
        this.onTaskSelected(task.id);
      }
    });

    // Keyboard: Enter to select, arrow keys to nudge time
    path.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectedTaskId = task.id;
        this._showInfoPanel(task, startTime, duration);
        this.render();
        if (this.onTaskSelected) this.onTaskSelected(task.id);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.key === 'ArrowRight' ? 15 : -15;
        const currentMins = ClockMath.timeToMinutes(startTime);
        const newMins = (((currentMins + delta) % 1440) + 1440) % 1440;
        const newTime = ClockMath.minutesToTime(newMins);
        if (this.onTaskTimeNudged) {
          this.onTaskTimeNudged(task.id, newTime, duration);
        }
      }
    });

    const ringGroup = this.svg.querySelector(
      `.clock-ring[data-ring="${ring}"]`
    );
    if (ringGroup) {
      ringGroup.appendChild(path);
    }
  }

  /**
   * Show the info panel below the clock with selected task details.
   */
  _showInfoPanel(task, startTime, duration) {
    const panel = document.getElementById('clock-info-panel');
    if (!panel) return;

    const priorityClass = `clock-info-priority-${task.priority}`;
    const endMins = ClockMath.timeToMinutes(startTime) + duration;
    const endTime = ClockMath.minutesToTime(endMins % 1440);

    panel.innerHTML = `
      <div class="clock-info-title">${this._escapeHtml(task.description)}</div>
      <div class="clock-info-meta">
        <span>${startTime} – ${endTime}</span>
        <span>${duration} min</span>
        <span class="${priorityClass}">${task.priority} priority</span>
      </div>
    `;
    panel.classList.add('active');
  }

  /**
   * Show the info panel for an appointment.
   */
  _showAppointmentInfoPanel(appt, startTime, duration) {
    const panel = document.getElementById('clock-info-panel');
    if (!panel) return;

    const endMins = ClockMath.timeToMinutes(startTime) + duration;
    const endTime = ClockMath.minutesToTime(endMins % 1440);

    panel.innerHTML = `
      <div class="clock-info-title" style="color: var(--color-accent-cyan)">${this._escapeHtml(appt.description)}</div>
      <div class="clock-info-meta">
        <span>${startTime} – ${endTime}</span>
        <span>${duration} min</span>
        <span style="color: var(--color-accent-cyan)">appointment</span>
      </div>
    `;
    panel.classList.add('active');
  }

  /**
   * Show the info panel for a routine item.
   */
  _showRoutineInfoPanel(item) {
    const panel = document.getElementById('clock-info-panel');
    if (!panel) return;

    const icon = item.icon || '';
    const label = this._escapeHtml(item.label);
    const durationStr = item.duration ? `${item.duration} min` : 'Quick item';
    const endMins = item.duration
      ? ClockMath.timeToMinutes(item.startTime) + item.duration
      : null;
    const endTime = endMins ? ClockMath.minutesToTime(endMins % 1440) : '';
    const timeRange = endTime
      ? `${item.startTime} – ${endTime}`
      : item.startTime;

    panel.innerHTML = `
      <div class="clock-info-title" style="color: rgba(38, 139, 210, 0.9)">${icon} ${label}</div>
      <div class="clock-info-meta">
        <span>${timeRange}</span>
        <span>${durationStr}</span>
        <span style="color: rgba(38, 139, 210, 0.7)">routine</span>
      </div>
    `;
    panel.classList.add('active');
  }

  /**
   * Hide the info panel.
   */
  _hideInfoPanel() {
    const panel = document.getElementById('clock-info-panel');
    if (panel) {
      panel.classList.remove('active');
      panel.innerHTML =
        '<div class="clock-info-placeholder">Click an arc for details</div>';
    }
  }

  /**
   * Escape HTML for safe insertion.
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Appointment Rendering (Phase 3) ──────────────────────

  /**
   * Render appointment arcs inside the clock face and blocked zones on rings.
   */
  _renderAppointments() {
    const today = this._getToday();
    const appointments = this.tasks.filter(
      (task) =>
        task.isAppointment &&
        !task.completed &&
        !task.archived &&
        task.dueDate === today &&
        task.dueTime
    );

    const NS = 'http://www.w3.org/2000/svg';
    const appointmentGroup = this.svg.querySelector('.clock-appointments');
    const blockedGroup = this.svg.querySelector('.clock-blocked-zones');
    if (!appointmentGroup || !blockedGroup) return;

    appointments.forEach((appt) => {
      const startTime = appt.dueTime;
      const duration = appt.plannedDuration || 60;

      // Appointment arc inside clock
      const pathD = ClockMath.arcPath(
        startTime,
        duration,
        ClockMath.APPOINTMENT_INNER,
        ClockMath.APPOINTMENT_OUTER
      );
      if (!pathD) return;

      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', pathD);
      path.setAttribute('data-task-id', appt.id);
      let classes = 'appointment-arc';
      if (appt.id === this.selectedTaskId) classes += ' task-arc-selected';
      path.setAttribute('class', classes);

      // Tooltip
      const title = document.createElementNS(NS, 'title');
      title.textContent = `${appt.description}\n${startTime} (${duration} min) - Appointment`;
      path.appendChild(title);

      // Click handler
      path.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedTaskId = appt.id;
        this._showAppointmentInfoPanel(appt, startTime, duration);
        this.render();
        if (this.onTaskSelected) {
          this.onTaskSelected(appt.id);
        }
      });

      appointmentGroup.appendChild(path);

      // Label inside the arc
      const midMinutes = ClockMath.timeToMinutes(startTime) + duration / 2;
      const midAngle = (midMinutes / 1440) * 360;
      const labelRadius =
        (ClockMath.APPOINTMENT_INNER + ClockMath.APPOINTMENT_OUTER) / 2;
      const labelPos = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        labelRadius,
        midAngle
      );

      const label = document.createElementNS(NS, 'text');
      label.setAttribute('class', 'appointment-label');
      label.setAttribute('x', labelPos.x);
      label.setAttribute('y', labelPos.y);
      label.textContent =
        appt.description.length > 15
          ? appt.description.substring(0, 14) + '\u2026'
          : appt.description;
      appointmentGroup.appendChild(label);

      // Blocked zones on all 3 rings
      for (let ring = 1; ring <= 3; ring++) {
        const { inner, outer } = ClockMath.getRingRadii(ring);
        const blockedD = ClockMath.arcPath(startTime, duration, inner, outer);
        if (!blockedD) continue;

        const blocked = document.createElementNS(NS, 'path');
        blocked.setAttribute('d', blockedD);
        blocked.setAttribute('class', 'blocked-zone');
        blockedGroup.appendChild(blocked);
      }
    });
  }

  // ── Mini Clock for Focus Mode (Phase 6) ───────────────────

  /**
   * Render a simplified mini clock in the given container.
   * Shows only: clock face, current time hand, active task arc, upcoming appointments.
   */
  renderMiniClock(container) {
    if (!container) return;
    const NS = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'mini-clock');
    svg.setAttribute('viewBox', '0 0 600 600');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Mini clock');

    // Clock face
    const bg = document.createElementNS(NS, 'circle');
    bg.setAttribute('class', 'clock-bg');
    bg.setAttribute('cx', ClockMath.CENTER_X);
    bg.setAttribute('cy', ClockMath.CENTER_Y);
    bg.setAttribute('r', ClockMath.CLOCK_RADIUS);
    svg.appendChild(bg);

    // Simplified hour marks (major only)
    const majorHours = [0, 3, 6, 9, 12, 15, 18, 21];
    majorHours.forEach((h) => {
      const angle = (h / 24) * 360;
      const start = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        ClockMath.TICK_INNER_MAJOR,
        angle
      );
      const end = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        ClockMath.TICK_OUTER,
        angle
      );
      const tick = document.createElementNS(NS, 'line');
      tick.setAttribute('class', 'clock-hour-mark-major');
      tick.setAttribute('x1', start.x);
      tick.setAttribute('y1', start.y);
      tick.setAttribute('x2', end.x);
      tick.setAttribute('y2', end.y);
      svg.appendChild(tick);
    });

    // Current time hand
    const currentTime = ClockMath.getCurrentTime();
    const handAngle = ClockMath.timeToAngle(currentTime);
    const handTip = ClockMath.polarToCartesian(
      ClockMath.CENTER_X,
      ClockMath.CENTER_Y,
      ClockMath.HAND_RADIUS,
      handAngle
    );

    const hand = document.createElementNS(NS, 'line');
    hand.setAttribute('class', 'clock-hand');
    hand.setAttribute('x1', ClockMath.CENTER_X);
    hand.setAttribute('y1', ClockMath.CENTER_Y);
    hand.setAttribute('x2', handTip.x);
    hand.setAttribute('y2', handTip.y);
    svg.appendChild(hand);

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'clock-hand-dot');
    dot.setAttribute('cx', ClockMath.CENTER_X);
    dot.setAttribute('cy', ClockMath.CENTER_Y);
    dot.setAttribute('r', 6);
    svg.appendChild(dot);

    // Ring backgrounds
    for (let ring = 1; ring <= 3; ring++) {
      const { inner, outer } = ClockMath.getRingRadii(ring);
      const ringBg = document.createElementNS(NS, 'circle');
      ringBg.setAttribute('class', 'clock-ring-bg');
      ringBg.setAttribute('cx', ClockMath.CENTER_X);
      ringBg.setAttribute('cy', ClockMath.CENTER_Y);
      ringBg.setAttribute('r', (inner + outer) / 2);
      ringBg.setAttribute('stroke-width', outer - inner);
      svg.appendChild(ringBg);
    }

    const today = this._getToday();
    const priorityToRing = { high: 1, medium: 2, low: 3 };

    // All task arcs for today (not just active)
    const todayTasks = this.tasks.filter(
      (t) =>
        !t.completed &&
        !t.archived &&
        !t.isAppointment &&
        t.dueDate === today &&
        (t.plannedStartTime || t.dueTime)
    );

    todayTasks.forEach((task) => {
      const startTime = task.plannedStartTime || task.dueTime;
      const duration = task.plannedDuration || 60;
      const ring = priorityToRing[task.priority] || 2;
      const { inner, outer } = ClockMath.getRingRadii(ring);
      const arcD = ClockMath.arcPath(startTime, duration, inner, outer);
      if (arcD) {
        const arc = document.createElementNS(NS, 'path');
        arc.setAttribute('d', arcD);
        let cls = `task-arc task-arc-${task.priority}`;
        if (task.id === this.activeTaskId) cls += ' task-arc-active';
        arc.setAttribute('class', cls);
        svg.appendChild(arc);

        // Progress fill for active task
        if (task.id === this.activeTaskId) {
          const elapsed = this._getActiveElapsedMinutes();
          if (elapsed > 0) {
            const fillDuration = Math.min(elapsed, duration);
            const progressD = ClockMath.arcPath(
              startTime,
              fillDuration,
              inner,
              outer
            );
            if (progressD) {
              const progress = document.createElementNS(NS, 'path');
              progress.setAttribute('d', progressD);
              progress.setAttribute('class', 'task-arc-progress');
              svg.appendChild(progress);
            }
          }
        }
      }
    });

    // All appointments for today
    const appointments = this.tasks.filter(
      (t) =>
        t.isAppointment &&
        !t.completed &&
        !t.archived &&
        t.dueDate === today &&
        t.dueTime
    );

    appointments.forEach((appt) => {
      const arcD = ClockMath.arcPath(
        appt.dueTime,
        appt.plannedDuration || 60,
        ClockMath.APPOINTMENT_INNER,
        ClockMath.APPOINTMENT_OUTER
      );
      if (arcD) {
        const arc = document.createElementNS(NS, 'path');
        arc.setAttribute('d', arcD);
        arc.setAttribute('class', 'appointment-arc');
        svg.appendChild(arc);
      }
    });

    container.innerHTML = '';
    container.appendChild(svg);
  }

  /**
   * Clear the mini clock.
   */
  clearMiniClock(container) {
    if (container) container.innerHTML = '';
  }

  // ── Three-Day View (Phase 7) ──────────────────────────────

  /**
   * Render a small read-only preview clock for a given date and tasks.
   */
  renderPreviewClock(container, dateStr, tasks) {
    if (!container) return;
    const NS = 'http://www.w3.org/2000/svg';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'preview-clock');
    svg.setAttribute('viewBox', '0 0 600 600');

    // Clock face
    const bg = document.createElementNS(NS, 'circle');
    bg.setAttribute('class', 'clock-bg');
    bg.setAttribute('cx', ClockMath.CENTER_X);
    bg.setAttribute('cy', ClockMath.CENTER_Y);
    bg.setAttribute('r', ClockMath.CLOCK_RADIUS);
    svg.appendChild(bg);

    // Simplified hour marks (major only)
    [0, 6, 12, 18].forEach((h) => {
      const angle = (h / 24) * 360;
      const start = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        ClockMath.TICK_INNER_MAJOR,
        angle
      );
      const end = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        ClockMath.TICK_OUTER,
        angle
      );
      const tick = document.createElementNS(NS, 'line');
      tick.setAttribute('class', 'clock-hour-mark-major');
      tick.setAttribute('x1', start.x);
      tick.setAttribute('y1', start.y);
      tick.setAttribute('x2', end.x);
      tick.setAttribute('y2', end.y);
      svg.appendChild(tick);
    });

    // Ring backgrounds
    for (let ring = 1; ring <= 3; ring++) {
      const { inner, outer } = ClockMath.getRingRadii(ring);
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('class', 'clock-ring-bg');
      circle.setAttribute('cx', ClockMath.CENTER_X);
      circle.setAttribute('cy', ClockMath.CENTER_Y);
      circle.setAttribute('r', (inner + outer) / 2);
      circle.setAttribute('stroke-width', outer - inner);
      svg.appendChild(circle);
    }

    // Render task arcs (simplified - no labels, just arcs)
    const clockTasks = (tasks || []).filter(
      (t) =>
        !t.completed &&
        !t.archived &&
        !t.isAppointment &&
        (t.plannedStartTime || t.dueTime)
    );

    const priorityToRing = { high: 1, medium: 2, low: 3 };
    clockTasks.forEach((task) => {
      const startTime = task.plannedStartTime || task.dueTime;
      const duration = task.plannedDuration || 60;
      const ring = priorityToRing[task.priority] || 2;
      const { inner, outer } = ClockMath.getRingRadii(ring);
      const pathD = ClockMath.arcPath(startTime, duration, inner, outer);
      if (pathD) {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('class', `task-arc task-arc-${task.priority}`);
        const title = document.createElementNS(NS, 'title');
        title.textContent = `${task.description}\n${startTime} (${duration} min)`;
        path.appendChild(title);
        svg.appendChild(path);
      }
    });

    // Render appointment arcs
    const appointments = (tasks || []).filter(
      (t) => t.isAppointment && !t.completed && !t.archived && t.dueTime
    );
    appointments.forEach((appt) => {
      const arcD = ClockMath.arcPath(
        appt.dueTime,
        appt.plannedDuration || 60,
        ClockMath.APPOINTMENT_INNER,
        ClockMath.APPOINTMENT_OUTER
      );
      if (arcD) {
        const arc = document.createElementNS(NS, 'path');
        arc.setAttribute('d', arcD);
        arc.setAttribute('class', 'appointment-arc');
        const title = document.createElementNS(NS, 'title');
        title.textContent = appt.description;
        arc.appendChild(title);
        svg.appendChild(arc);
      }
    });

    // Date label
    const dateLabel = document.createElementNS(NS, 'text');
    dateLabel.setAttribute('class', 'preview-clock-label');
    dateLabel.setAttribute('x', ClockMath.CENTER_X);
    dateLabel.setAttribute('y', ClockMath.CENTER_Y);
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dateLabel.textContent = `${dayNames[dateObj.getDay()]} ${dateObj.getDate()}`;
    svg.appendChild(dateLabel);

    container.innerHTML = '';
    container.appendChild(svg);
  }

  /**
   * Load upcoming tasks and render preview clocks relative to current view.
   * Shows the two dates that are NOT the currently viewed date (from the 3-day window).
   */
  async loadUpcomingPreviews() {
    try {
      const response = await fetch('/api/tasks/upcoming?days=3');
      if (!response.ok) return;
      const data = await response.json();
      const dates = Object.keys(data).sort();

      // The main clock shows dates[viewDateOffset].
      // Preview clocks show the other two dates from the 3-day window.
      const previewDates = dates.filter((_, i) => i !== this.viewDateOffset);

      const preview1 = document.getElementById('clock-preview-1');
      const preview2 = document.getElementById('clock-preview-2');

      if (previewDates[0] && preview1) {
        preview1.title = previewDates[0];
        this.renderPreviewClock(
          preview1,
          previewDates[0],
          data[previewDates[0]]
        );
        const offset0 = dates.indexOf(previewDates[0]);
        preview1.style.cursor = 'pointer';
        preview1.onclick = () => {
          if (offset0 >= 0 && offset0 <= 2) {
            this.viewDateOffset = offset0;
            this.render();
            this._updateNavState();
            this.loadUpcomingPreviews();
          }
        };
      }
      if (previewDates[1] && preview2) {
        preview2.title = previewDates[1];
        this.renderPreviewClock(
          preview2,
          previewDates[1],
          data[previewDates[1]]
        );
        const offset1 = dates.indexOf(previewDates[1]);
        preview2.style.cursor = 'pointer';
        preview2.onclick = () => {
          if (offset1 >= 0 && offset1 <= 2) {
            this.viewDateOffset = offset1;
            this.render();
            this._updateNavState();
            this.loadUpcomingPreviews();
          }
        };
      }
    } catch (error) {
      console.error('Error loading upcoming previews:', error);
    }
  }

  // ── Active Task & Pomodoro (Phase 5) ──────────────────────

  /**
   * Set the active task (timer running).
   */
  setActiveTask(taskId, startedAt, timeSpent, pomodoroMode, pomodoroInterval) {
    this.activeTaskId = taskId;
    this.activeTaskStartedAt = startedAt;
    this.activeTaskTimeSpent = timeSpent || 0;
    this.activeTaskPomodoroMode = pomodoroMode || false;
    this.activeTaskPomodoroInterval = pomodoroInterval || 25;

    this._startActiveUpdate();
    if (this.isVisible) this.render();
  }

  /**
   * Clear the active task (timer stopped).
   */
  clearActiveTask() {
    this.activeTaskId = null;
    this.activeTaskStartedAt = null;
    this.activeTaskTimeSpent = 0;
    this.activeTaskPomodoroMode = false;
    this._stopActiveUpdate();
    if (this.isVisible) this.render();
  }

  /**
   * Start 1-second interval to update the active task arc.
   */
  _startActiveUpdate() {
    this._stopActiveUpdate();
    this.activeUpdateInterval = setInterval(() => {
      if (this.isVisible && this.activeTaskId) {
        this._updateActiveArc();
      }
    }, 1000);
  }

  _stopActiveUpdate() {
    if (this.activeUpdateInterval) {
      clearInterval(this.activeUpdateInterval);
      this.activeUpdateInterval = null;
    }
  }

  /**
   * Update only the active task arc (progress fill) without full re-render.
   */
  _updateActiveArc() {
    const progressEl = this.svg?.querySelector('.task-arc-progress');
    const overrunEl = this.svg?.querySelector('.task-arc-overrun');
    if (!this.activeTaskId) return;

    const task = this.tasks.find((t) => t.id === this.activeTaskId);
    if (!task) return;

    const startTime = task.plannedStartTime || task.dueTime;
    if (!startTime) return;

    const plannedDuration = task.plannedDuration || 60;
    const elapsed = this._getActiveElapsedMinutes();

    const NS = 'http://www.w3.org/2000/svg';
    const ring = this._getTaskRing(task);
    const { inner, outer } = ClockMath.getRingRadii(ring);

    // Remove old progress/overrun arcs
    if (progressEl) progressEl.remove();
    if (overrunEl) overrunEl.remove();

    if (elapsed > 0 && elapsed <= plannedDuration) {
      // Progress fill within planned duration
      const progressD = ClockMath.arcPath(startTime, elapsed, inner, outer);
      if (progressD) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', progressD);
        p.setAttribute('class', 'task-arc-progress');
        this.svg.appendChild(p);
      }
    } else if (elapsed > plannedDuration) {
      // Full progress + overrun extension
      const fullD = ClockMath.arcPath(startTime, plannedDuration, inner, outer);
      if (fullD) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', fullD);
        p.setAttribute('class', 'task-arc-progress');
        this.svg.appendChild(p);
      }

      const overrunStart = ClockMath.minutesToTime(
        ClockMath.timeToMinutes(startTime) + plannedDuration
      );
      const overrunDuration = elapsed - plannedDuration;
      const overrunD = ClockMath.arcPath(
        overrunStart,
        Math.min(overrunDuration, 480),
        inner,
        outer
      );
      if (overrunD) {
        const o = document.createElementNS(NS, 'path');
        o.setAttribute('d', overrunD);
        o.setAttribute('class', 'task-arc-overrun');
        this.svg.appendChild(o);
      }
    }

    // Update pomodoro segment markers
    if (this.activeTaskPomodoroMode) {
      this._renderPomodoroSegments(task, ring);
    }
  }

  /**
   * Get elapsed time in minutes for the active task.
   */
  _getActiveElapsedMinutes() {
    if (!this.activeTaskStartedAt) return 0;
    const elapsedMs = Date.now() - new Date(this.activeTaskStartedAt).getTime();
    const elapsedSeconds =
      Math.floor(elapsedMs / 1000) + this.activeTaskTimeSpent;
    return elapsedSeconds / 60;
  }

  /**
   * Determine which ring a task is on (based on priority).
   */
  _getTaskRing(task) {
    return { high: 1, medium: 2, low: 3 }[task.priority] || 2;
  }

  /**
   * Render pomodoro segment markers on the active task arc.
   */
  _renderPomodoroSegments(task, ring) {
    const NS = 'http://www.w3.org/2000/svg';
    const startTime = task.plannedStartTime || task.dueTime;
    if (!startTime) return;

    const plannedDuration = task.plannedDuration || 60;
    const intervalMinutes = this.activeTaskPomodoroInterval;
    const { inner, outer } = ClockMath.getRingRadii(ring);

    // Remove existing segment markers
    this.svg
      .querySelectorAll('.pomodoro-segment-marker')
      .forEach((el) => el.remove());

    const startMinutes = ClockMath.timeToMinutes(startTime);

    for (
      let offset = intervalMinutes;
      offset < plannedDuration;
      offset += intervalMinutes
    ) {
      const markerMinutes = startMinutes + offset;
      const markerAngle = (markerMinutes / 1440) * 360;
      const p1 = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        inner,
        markerAngle
      );
      const p2 = ClockMath.polarToCartesian(
        ClockMath.CENTER_X,
        ClockMath.CENTER_Y,
        outer,
        markerAngle
      );

      const line = document.createElementNS(NS, 'line');
      line.setAttribute('class', 'pomodoro-segment-marker');
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
      this.svg.appendChild(line);
    }
  }

  /**
   * Clean up resources.
   */
  destroy() {
    this._stopTimeUpdate();
    this._stopActiveUpdate();
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.svg = null;
  }
}
