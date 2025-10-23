/**
 * Appointment Reminder Module
 * Handles browser notifications for calendar appointments
 */

class AppointmentReminder {
  constructor() {
    this.remindedTaskIds = new Set();
    this.checkInterval = null;
    this.loadRemindedTasks();
  }

  /**
   * Load previously reminded task IDs from localStorage
   */
  loadRemindedTasks() {
    try {
      const stored = localStorage.getItem('appointmentReminders');
      if (stored) {
        const reminders = JSON.parse(stored);
        // Only keep reminders from today (compare dates)
        const today = new Date().toDateString();
        if (reminders.date === today) {
          this.remindedTaskIds = new Set(reminders.taskIds);
        } else {
          // Clear old reminders and start fresh
          this.saveRemindedTasks();
        }
      }
    } catch (error) {
      // Silently fail - use empty reminder set
    }
  }

  /**
   * Save reminded task IDs to localStorage
   */
  saveRemindedTasks() {
    try {
      const reminders = {
        date: new Date().toDateString(),
        taskIds: Array.from(this.remindedTaskIds),
      };
      localStorage.setItem('appointmentReminders', JSON.stringify(reminders));
    } catch (error) {
      // Silently fail if localStorage not available
    }
  }

  /**
   * Start checking for appointment reminders
   * @param {Array} tasks - Array of active tasks
   */
  startCheckingReminders(tasks) {
    // Check every minute (60000 ms)
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkAndNotifyAppointments(tasks);
    }, 60000);

    // Also check immediately
    this.checkAndNotifyAppointments(tasks);
  }

  /**
   * Stop checking for reminders
   */
  stopCheckingReminders() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check all appointments and send notifications if needed
   * @param {Array} tasks - Array of active tasks
   */
  checkAndNotifyAppointments(tasks) {
    if (!tasks || tasks.length === 0) return;

    const now = new Date();
    const nowMs = now.getTime();

    tasks.forEach((task) => {
      // Skip if not an appointment, already reminded, or no due date/time
      if (!task.isAppointment || !task.dueDate || !task.dueTime) return;
      if (this.remindedTaskIds.has(task.id)) return;

      const dueDateTime = this.parseDueDateTime(task.dueDate, task.dueTime);
      if (!dueDateTime) return;

      const dueDateTimeMs = dueDateTime.getTime();
      const reminderMinutes = task.reminderMinutes || 30;
      const reminderWindowMs = reminderMinutes * 60000;
      const reminderTimeMs = dueDateTimeMs - reminderWindowMs;

      // Check if we're within the reminder window (from reminder time until due time + 5 minutes grace period)
      // Grace period allows notifications that just passed the reminder window
      const graceMs = 5 * 60000; // 5 minute grace period

      if (nowMs >= reminderTimeMs && nowMs <= dueDateTimeMs + graceMs) {
        this.showInAppAlert(task, dueDateTime);
        this.remindedTaskIds.add(task.id);
        this.saveRemindedTasks(); // Persist so it doesn't repeat on page reload
      }
    });
  }

  /**
   * Parse due date and time strings into a Date object
   * @param {string} dueDate - Date in YYYY-MM-DD format
   * @param {string} dueTime - Time in HH:MM format
   * @returns {Date|null} Parsed datetime or null if invalid
   */
  parseDueDateTime(dueDate, dueTime) {
    try {
      // dueDate is YYYY-MM-DD, dueTime is HH:MM
      const dateTimeStr = `${dueDate}T${dueTime || '00:00'}`;
      return new Date(dateTimeStr);
    } catch (error) {
      console.error('Error parsing due date/time:', error);
      return null;
    }
  }

  /**
   * Show in-app visual alert for appointment reminder
   * @param {Object} task - Task object
   * @param {Date} dueDateTime - Due date/time as Date object
   */
  showInAppAlert(task, dueDateTime) {
    const timeStr = dueDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Create alert element
    const alertId = `appointment-alert-${task.id}`;
    const existingAlert = document.getElementById(alertId);
    if (existingAlert) return; // Already showing

    const alert = document.createElement('div');
    alert.id = alertId;
    alert.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #dc322f;
      color: #001a23;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      font-weight: bold;
      font-size: 14px;
      max-width: 300px;
      animation: slideInRight 0.3s ease-out;
      font-family: monospace;
    `;

    alert.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span style="font-size: 24px;">🔔</span>
        <div>
          <div>Appointment Reminder!</div>
          <div style="font-size: 12px; margin-top: 4px;">${task.description}</div>
          <div style="font-size: 12px; color: rgba(0, 26, 35, 0.7);">at ${timeStr}</div>
        </div>
      </div>
      <button id="close-alert-${task.id}" style="
        width: 100%;
        padding: 8px;
        background-color: rgba(0, 26, 35, 0.2);
        border: 1px solid rgba(0, 26, 35, 0.3);
        color: #001a23;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: all 150ms ease;
      ">Dismiss</button>
    `;

    // Add animation keyframes if not already present
    if (!document.querySelector('#appointment-alert-styles')) {
      const style = document.createElement('style');
      style.id = 'appointment-alert-styles';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add to page
    document.body.appendChild(alert);

    // Add close handler
    const closeBtn = document.getElementById(`close-alert-${task.id}`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        alert.remove();
      });
    }

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 10000);

    // Play sound notification
    this.playNotificationSound();
  }

  /**
   * Play a sound notification
   */
  playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant bell-like tones
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.6
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch (error) {
      // Silently fail if audio context not available
    }
  }

  /**
   * Reset reminders for a specific task (used when task is updated)
   * @param {string} taskId - Task ID to reset
   */
  resetTaskReminder(taskId) {
    this.remindedTaskIds.delete(taskId);
    this.saveRemindedTasks();
  }

  /**
   * Clear all reminders (used at midnight or when clearing tasks)
   */
  clearAllReminders() {
    this.remindedTaskIds.clear();
    this.saveRemindedTasks();
  }
}

// Create singleton instance
// eslint-disable-next-line no-unused-vars
const appointmentReminder = new AppointmentReminder();
