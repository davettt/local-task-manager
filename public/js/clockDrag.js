/**
 * ClockDrag - Drag interaction handler for the 24-hour clock view.
 * Supports drag-to-reposition (change time) and drag-to-resize (change duration).
 * All drags snap to 15-minute increments.
 */
class ClockDrag {
  constructor() {
    this.svg = null;
    this.clockView = null;
    this.isDragging = false;
    this.dragType = null; // 'move' or 'resize-end'
    this.dragTaskId = null;
    this.dragTask = null;
    this.dragRing = null;
    this.ghostPath = null;
    this.originalStartTime = null;
    this.originalDuration = null;
    this.onDragEnd = null; // callback(taskId, newStartTime, newDuration)

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
  }

  /**
   * Initialize drag handling on the SVG element.
   */
  init(svg, clockView) {
    this.svg = svg;
    this.clockView = clockView;

    svg.addEventListener('mousedown', this._onMouseDown);
    svg.addEventListener('mousemove', this._onMouseMove);
    svg.addEventListener('mouseup', this._onMouseUp);
    svg.addEventListener('mouseleave', this._onMouseUp);

    svg.addEventListener('touchstart', this._onTouchStart, { passive: false });
    svg.addEventListener('touchmove', this._onTouchMove, { passive: false });
    svg.addEventListener('touchend', this._onTouchEnd);
  }

  /**
   * Convert a mouse/touch event to SVG coordinates.
   */
  _eventToSVGPoint(e) {
    const rect = this.svg.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Scale from screen pixels to SVG viewBox coordinates
    const scaleX = ClockMath.VIEW_SIZE / rect.width;
    const scaleY = ClockMath.VIEW_SIZE / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  /**
   * Convert SVG point to clock angle (0-360, 0=top).
   */
  _pointToAngle(point) {
    const dx = point.x - ClockMath.CENTER_X;
    const dy = point.y - ClockMath.CENTER_Y;
    // atan2 gives angle from positive x-axis, but we want from top (negative y-axis)
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    return ((angle % 360) + 360) % 360;
  }

  /**
   * Check if a point is near the end edge of an arc (for resize).
   */
  _isNearArcEnd(point, task) {
    const startTime = task.plannedStartTime || task.dueTime;
    const duration = task.plannedDuration || 60;
    const endMinutes = ClockMath.timeToMinutes(startTime) + duration;
    const endAngle = (endMinutes / 1440) * 360;
    const pointAngle = this._pointToAngle(point);

    // Within 8 degrees of the end = resize
    const diff = Math.abs(pointAngle - (endAngle % 360));
    return diff < 8 || diff > 352;
  }

  _onMouseDown(e) {
    const arc = e.target.closest('.task-arc');
    if (!arc) return;
    this._startDrag(e, arc);
  }

  _onTouchStart(e) {
    const arc = e.target.closest('.task-arc');
    if (!arc) return;
    e.preventDefault();
    this._startDrag(e, arc);
  }

  _startDrag(e, arc) {
    const taskId = arc.getAttribute('data-task-id');
    if (!taskId || !this.clockView) return;

    const task = this.clockView.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Cannot drag appointments
    if (task.isAppointment) return;

    const point = this._eventToSVGPoint(e);

    this.isDragging = true;
    this.dragTaskId = taskId;
    this.dragTask = task;
    this.originalStartTime = task.plannedStartTime || task.dueTime;
    this.originalDuration = task.plannedDuration || 60;

    // Determine drag type
    if (this._isNearArcEnd(point, task)) {
      this.dragType = 'resize-end';
    } else {
      this.dragType = 'move';
    }

    // Determine which ring
    const dist = Math.sqrt(
      (point.x - ClockMath.CENTER_X) ** 2 + (point.y - ClockMath.CENTER_Y) ** 2
    );
    this.dragRing = this._distanceToRing(dist);

    // Create ghost arc
    this._createGhostArc();

    this.svg.style.cursor = this.dragType === 'move' ? 'grabbing' : 'ew-resize';
  }

  _onMouseMove(e) {
    if (!this.isDragging) {
      // Update cursor on hover near arc edges
      this._updateHoverCursor(e);
      return;
    }
    this._handleDragMove(e);
  }

  _onTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    this._handleDragMove(e);
  }

  _handleDragMove(e) {
    const point = this._eventToSVGPoint(e);
    const angle = this._pointToAngle(point);
    const snappedAngle = ClockMath.snapAngle(angle);
    const snappedTime = ClockMath.angleToTime(snappedAngle);

    if (this.dragType === 'move') {
      // Move: change start time, keep duration
      this._updateGhostArc(snappedTime, this.originalDuration);
    } else {
      // Resize: keep start time, change duration
      const startMinutes = ClockMath.timeToMinutes(this.originalStartTime);
      let snappedMinutes = ClockMath.timeToMinutes(snappedTime);

      // Handle wrap-around midnight
      if (snappedMinutes <= startMinutes) {
        snappedMinutes += 1440;
      }

      let newDuration = snappedMinutes - startMinutes;
      // Clamp: 15 min to 480 min (8 hours)
      newDuration = Math.max(15, Math.min(480, newDuration));

      this._updateGhostArc(this.originalStartTime, newDuration);
    }
  }

  _onMouseUp() {
    if (!this.isDragging) return;
    this._finishDrag();
  }

  _onTouchEnd() {
    if (!this.isDragging) return;
    this._finishDrag();
  }

  _finishDrag() {
    if (!this.ghostPath || !this.dragTaskId) {
      this._cleanupDrag();
      return;
    }

    // Read final position from ghost
    const newStartTime = this.ghostPath.getAttribute('data-start-time');
    const newDuration = parseInt(
      this.ghostPath.getAttribute('data-duration'),
      10
    );

    this._removeGhostArc();

    // Only fire callback if something actually changed
    if (
      newStartTime !== this.originalStartTime ||
      newDuration !== this.originalDuration
    ) {
      if (this.onDragEnd) {
        this.onDragEnd(this.dragTaskId, newStartTime, newDuration);
      }
    }

    this._cleanupDrag();
  }

  _cleanupDrag() {
    this.isDragging = false;
    this.dragType = null;
    this.dragTaskId = null;
    this.dragTask = null;
    this.dragRing = null;
    this.originalStartTime = null;
    this.originalDuration = null;
    this._removeGhostArc();
    if (this.svg) this.svg.style.cursor = '';
  }

  /**
   * Create a semi-transparent ghost arc for drag feedback.
   */
  _createGhostArc() {
    const NS = 'http://www.w3.org/2000/svg';
    const ring = this.dragRing || 2;
    const { inner, outer } = ClockMath.getRingRadii(ring);
    const startTime = this.originalStartTime;
    const duration = this.originalDuration;
    const pathD = ClockMath.arcPath(startTime, duration, inner, outer);
    if (!pathD) return;

    this.ghostPath = document.createElementNS(NS, 'path');
    this.ghostPath.setAttribute('d', pathD);
    this.ghostPath.setAttribute('class', 'task-arc-ghost');
    this.ghostPath.setAttribute('data-start-time', startTime);
    this.ghostPath.setAttribute('data-duration', duration);
    this.svg.appendChild(this.ghostPath);
  }

  /**
   * Update ghost arc position/size during drag.
   */
  _updateGhostArc(startTime, duration) {
    if (!this.ghostPath) return;
    const ring = this.dragRing || 2;
    const { inner, outer } = ClockMath.getRingRadii(ring);
    const pathD = ClockMath.arcPath(startTime, duration, inner, outer);
    if (pathD) {
      this.ghostPath.setAttribute('d', pathD);
      this.ghostPath.setAttribute('data-start-time', startTime);
      this.ghostPath.setAttribute('data-duration', duration);
    }
  }

  _removeGhostArc() {
    if (this.ghostPath && this.ghostPath.parentNode) {
      this.ghostPath.parentNode.removeChild(this.ghostPath);
    }
    this.ghostPath = null;
  }

  /**
   * Determine which ring a distance from center corresponds to.
   */
  _distanceToRing(dist) {
    if (dist <= ClockMath.RING_1_OUTER) return 1;
    if (dist <= ClockMath.RING_2_OUTER) return 2;
    return 3;
  }

  /**
   * Update cursor when hovering near arc edges (resize indicator).
   */
  _updateHoverCursor(e) {
    const arc = e.target.closest('.task-arc');
    if (!arc) {
      if (this.svg) this.svg.style.cursor = '';
      return;
    }

    const taskId = arc.getAttribute('data-task-id');
    const task = this.clockView?.tasks.find((t) => t.id === taskId);
    if (!task || task.isAppointment) {
      this.svg.style.cursor = '';
      return;
    }

    const point = this._eventToSVGPoint(e);
    if (this._isNearArcEnd(point, task)) {
      this.svg.style.cursor = 'ew-resize';
    } else {
      this.svg.style.cursor = 'grab';
    }
  }

  /**
   * Clean up event listeners.
   */
  destroy() {
    if (this.svg) {
      this.svg.removeEventListener('mousedown', this._onMouseDown);
      this.svg.removeEventListener('mousemove', this._onMouseMove);
      this.svg.removeEventListener('mouseup', this._onMouseUp);
      this.svg.removeEventListener('mouseleave', this._onMouseUp);
      this.svg.removeEventListener('touchstart', this._onTouchStart);
      this.svg.removeEventListener('touchmove', this._onTouchMove);
      this.svg.removeEventListener('touchend', this._onTouchEnd);
    }
  }
}
