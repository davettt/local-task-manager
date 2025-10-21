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
  }

  /**
   * Start timer for a task
   * @param {string} taskId - Task ID
   * @param {string} startedAt - ISO timestamp when task started
   * @param {number} previousTimeSpent - Seconds already spent on task
   */
  start(taskId, startedAt, previousTimeSpent = 0) {
    // Stop existing timer if any
    this.stop();

    this.activeTaskId = taskId;
    this.startedAt = new Date(startedAt);
    this.previousTimeSpent = previousTimeSpent;

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
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
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
