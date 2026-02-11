/**
 * ClockMath - Pure utility class for 24-hour clock calculations.
 * All methods are static. No DOM dependencies.
 *
 * Angle convention:
 *   0°   = 00:00 (top / 12 o'clock position)
 *   90°  = 06:00
 *   180° = 12:00
 *   270° = 18:00
 *
 * SVG coordinate adjustment: SVG 0° is at 3 o'clock,
 * so we subtract 90° when converting to SVG x/y.
 */
class ClockMath {
  // ViewBox dimensions
  static VIEW_SIZE = 600;
  static CENTER_X = 300;
  static CENTER_Y = 300;

  // Clock face radius (inner circle)
  static CLOCK_RADIUS = 200;

  // Appointment arcs render inside the clock
  static APPOINTMENT_INNER = 140;
  static APPOINTMENT_OUTER = 195;

  // Priority rings (outside the clock face)
  static RING_1_INNER = 210; // High priority (closest)
  static RING_1_OUTER = 235;
  static RING_2_INNER = 240; // Medium priority
  static RING_2_OUTER = 265;
  static RING_3_INNER = 270; // Low priority (outermost)
  static RING_3_OUTER = 295;

  // Hour label radius (inside clock face)
  static LABEL_RADIUS = 180;

  // Tick mark radii
  static TICK_OUTER = 200;
  static TICK_INNER_MAJOR = 188;
  static TICK_INNER_MINOR = 193;

  // Time hand extends from center to this radius
  static HAND_RADIUS = 190;

  /**
   * Convert "HH:MM" to angle in degrees (0-360).
   * 00:00 = 0°, 06:00 = 90°, 12:00 = 180°, 18:00 = 270°
   */
  static timeToAngle(timeStr) {
    const minutes = ClockMath.timeToMinutes(timeStr);
    return (minutes / 1440) * 360;
  }

  /**
   * Convert angle (degrees) back to "HH:MM", snapped to 15-minute increments.
   */
  static angleToTime(angleDeg) {
    // Normalize to 0-360
    let a = ((angleDeg % 360) + 360) % 360;
    let totalMinutes = (a / 360) * 1440;
    // Snap to 15 minutes
    totalMinutes = Math.round(totalMinutes / 15) * 15;
    if (totalMinutes >= 1440) totalMinutes = 0;
    return ClockMath.minutesToTime(totalMinutes);
  }

  /**
   * Convert "HH:MM" to total minutes from midnight.
   */
  static timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hours * 60 + mins;
  }

  /**
   * Convert total minutes from midnight to "HH:MM".
   */
  static minutesToTime(minutes) {
    let m = ((minutes % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  /**
   * Convert polar coordinates (center, radius, clock-angle) to SVG cartesian (x, y).
   * Adjusts from clock convention (0° = top) to SVG convention (0° = right)
   * by subtracting 90°.
   */
  static polarToCartesian(cx, cy, radius, angleDeg) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad),
    };
  }

  /**
   * Generate an SVG path `d` attribute for an arc (annular sector) between
   * two radii, spanning from startTime for durationMinutes.
   *
   * Returns a closed path tracing: outer arc → line to inner → inner arc (reversed) → close.
   */
  static arcPath(startTimeStr, durationMinutes, innerRadius, outerRadius) {
    if (!startTimeStr || durationMinutes <= 0) return '';

    const startAngle = ClockMath.timeToAngle(startTimeStr);
    const endMinutes = ClockMath.timeToMinutes(startTimeStr) + durationMinutes;
    const endAngle = (endMinutes / 1440) * 360;
    const sweep = endAngle - startAngle;

    // SVG arc large-arc-flag: 1 if arc > 180°
    const largeArc = Math.abs(sweep) > 180 ? 1 : 0;

    const outerStart = ClockMath.polarToCartesian(
      ClockMath.CENTER_X,
      ClockMath.CENTER_Y,
      outerRadius,
      startAngle
    );
    const outerEnd = ClockMath.polarToCartesian(
      ClockMath.CENTER_X,
      ClockMath.CENTER_Y,
      outerRadius,
      endAngle
    );
    const innerStart = ClockMath.polarToCartesian(
      ClockMath.CENTER_X,
      ClockMath.CENTER_Y,
      innerRadius,
      startAngle
    );
    const innerEnd = ClockMath.polarToCartesian(
      ClockMath.CENTER_X,
      ClockMath.CENTER_Y,
      innerRadius,
      endAngle
    );

    // Path: outer arc clockwise, line to inner, inner arc counter-clockwise, close
    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  }

  /**
   * Check if two time ranges overlap.
   * Times are "HH:MM" strings, durations in minutes.
   */
  static timeRangesOverlap(start1, dur1, start2, dur2) {
    const s1 = ClockMath.timeToMinutes(start1);
    const e1 = s1 + (dur1 || 60);
    const s2 = ClockMath.timeToMinutes(start2);
    const e2 = s2 + (dur2 || 60);
    return s1 < e2 && s2 < e1;
  }

  /**
   * Snap angle to nearest 15-minute increment.
   */
  static snapAngle(angleDeg) {
    const minutesPer15 = (15 / 1440) * 360; // 3.75°
    return Math.round(angleDeg / minutesPer15) * minutesPer15;
  }

  /**
   * Get inner and outer radii for a ring number (1, 2, or 3).
   */
  static getRingRadii(ringNumber) {
    switch (ringNumber) {
      case 1:
        return { inner: ClockMath.RING_1_INNER, outer: ClockMath.RING_1_OUTER };
      case 2:
        return { inner: ClockMath.RING_2_INNER, outer: ClockMath.RING_2_OUTER };
      case 3:
        return { inner: ClockMath.RING_3_INNER, outer: ClockMath.RING_3_OUTER };
      default:
        return { inner: ClockMath.RING_2_INNER, outer: ClockMath.RING_2_OUTER };
    }
  }

  /**
   * Get current local time as "HH:MM".
   */
  static getCurrentTime() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Format hour number for display based on time format.
   * @param {number} hour - 0-23
   * @param {string} format - '12h' or '24h'
   * @returns {string} formatted label
   */
  static formatHourLabel(hour, format) {
    if (format === '24h') {
      return String(hour);
    }
    // 12h format
    if (hour === 0) return '12a';
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return '12p';
    return `${hour - 12}p`;
  }
}
