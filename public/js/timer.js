/**
 * Timer Module
 * Handles all timer-related functionality
 */

class TaskTimer {
  constructor() {
    this.intervalId = null;
    this.activeTaskId = null;
    this.previousTimeSpent = 0;
    this.startedAt = null;
    // Pomodoro-specific properties
    this.pomodoroMode = false;
    this.pomodoroInterval = 25; // minutes
    this.pomodoroIntervalStartedAt = null;
    this.pomodoroIntervalNotified = false;
    this.onPomodoroIntervalReached = null; // Callback function
  }

  /**
   * Start timer for a task
   * @param {string} taskId - Task ID
   * @param {string} startedAt - ISO timestamp when task started
   * @param {number} previousTimeSpent - Seconds already spent on task
   * @param {boolean} pomodoroMode - Enable pomodoro mode
   * @param {number} pomodoroInterval - Pomodoro interval in minutes (25, 45, or 65)
   * @param {Function} onPomodoroIntervalReached - Callback when pomodoro interval reached
   */
  start(
    taskId,
    startedAt,
    previousTimeSpent = 0,
    pomodoroMode = false,
    pomodoroInterval = 25,
    onPomodoroIntervalReached = null
  ) {
    // Stop existing timer if any
    this.stop();

    this.activeTaskId = taskId;
    this.startedAt = new Date(startedAt);
    this.previousTimeSpent = previousTimeSpent;
    this.pomodoroMode = pomodoroMode;
    this.pomodoroInterval = pomodoroInterval;
    this.onPomodoroIntervalReached = onPomodoroIntervalReached;

    // If pomodoro mode, set the interval start time
    if (this.pomodoroMode) {
      this.pomodoroIntervalStartedAt = new Date();
      this.pomodoroIntervalNotified = false;
    }

    // Update display immediately
    this.updateDisplay();

    // Update every second
    this.intervalId = setInterval(() => {
      this.updateDisplay();
    }, 1000);
  }

  /**
   * Stop the timer
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activeTaskId = null;
    this.startedAt = null;
    this.previousTimeSpent = 0;
  }

  /**
   * Update the timer display
   */
  updateDisplay() {
    if (!this.activeTaskId || !this.startedAt) {
      return;
    }

    const elapsed = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
    const totalSeconds = this.previousTimeSpent + elapsed;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const display = `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) {
      timerDisplay.textContent = display;
    }

    // Update progress bar if in pomodoro mode
    this.updateProgressBar();

    // Check if pomodoro interval has been reached
    if (
      this.pomodoroMode &&
      this.pomodoroIntervalStartedAt &&
      !this.pomodoroIntervalNotified
    ) {
      const pomodoroElapsed = Math.floor(
        (Date.now() - this.pomodoroIntervalStartedAt.getTime()) / 1000
      );
      const pomodoroIntervalSeconds = this.pomodoroInterval * 60;

      if (pomodoroElapsed >= pomodoroIntervalSeconds) {
        this.pomodoroIntervalNotified = true;
        // Trigger callback if provided
        if (
          this.onPomodoroIntervalReached &&
          typeof this.onPomodoroIntervalReached === 'function'
        ) {
          this.onPomodoroIntervalReached();
        }
      }
    }
  }

  /**
   * Get the current active task ID
   */
  getActiveTaskId() {
    return this.activeTaskId;
  }

  /**
   * Check if timer is running
   */
  isRunning() {
    return this.intervalId !== null;
  }

  /**
   * Resume from a pomodoro break
   */
  resumeFromBreak() {
    if (this.pomodoroMode && this.activeTaskId) {
      this.pomodoroIntervalStartedAt = new Date();
      this.pomodoroIntervalNotified = false;
    }
  }

  /**
   * Get pomodoro info
   */
  getPomodoroInfo() {
    if (!this.pomodoroMode || !this.pomodoroIntervalStartedAt) {
      return null;
    }

    const pomodoroElapsed = Math.floor(
      (Date.now() - this.pomodoroIntervalStartedAt.getTime()) / 1000
    );
    const pomodoroIntervalSeconds = this.pomodoroInterval * 60;
    const pomodoroRemaining = Math.max(
      0,
      pomodoroIntervalSeconds - pomodoroElapsed
    );

    return {
      elapsed: pomodoroElapsed,
      remaining: pomodoroRemaining,
      total: pomodoroIntervalSeconds,
      interval: this.pomodoroInterval,
    };
  }

  /**
   * Update progress bar display
   */
  updateProgressBar() {
    const pomodoroInfo = this.getPomodoroInfo();
    const progressBar = document.getElementById('pomodoro-progress');
    const countdown = document.getElementById('pomodoro-countdown');
    const intervalLabel = document.getElementById('pomodoro-interval-label');

    if (pomodoroInfo) {
      const progress =
        ((pomodoroInfo.total - pomodoroInfo.remaining) / pomodoroInfo.total) *
        100;

      if (progressBar) {
        progressBar.style.width = `${Math.min(100, progress)}%`;
      }

      const minutes = Math.floor(pomodoroInfo.remaining / 60);
      const seconds = pomodoroInfo.remaining % 60;
      const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      if (countdown) {
        countdown.textContent = `${countdownText} remaining`;
      }

      if (intervalLabel) {
        intervalLabel.textContent = `(${pomodoroInfo.interval} min)`;
      }
    } else {
      if (progressBar) {
        progressBar.style.width = '0%';
      }
      if (countdown) {
        countdown.textContent = '';
      }
    }
  }

  /**
   * Format seconds to HH:MM:SS
   */
  static formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Play completion sound using Web Audio API
 */
// eslint-disable-next-line no-unused-vars
function playCompletionSound() {
  try {
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Pleasant tone
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Audio not supported:', error);
  }
}
