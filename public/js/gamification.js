/**
 * Gamification Module
 * Handles streaks, sound effects, and celebration messages
 */

class Gamification {
  constructor() {
    this.streakKey = 'taskStreakData';
    this.loadStreakData();
  }

  /**
   * Load streak data from localStorage
   */
  loadStreakData() {
    try {
      const stored = localStorage.getItem(this.streakKey);
      if (stored) {
        const data = JSON.parse(stored);
        const today = new Date().toDateString();

        // Check if streak is still valid (completed a task today)
        if (data.lastCompletedDate === today) {
          this.currentStreak = data.currentStreak || 0;
          this.lastCompletedDate = data.lastCompletedDate;
          this.tasksCompletedToday = data.tasksCompletedToday || 0;
        } else if (data.lastCompletedDate) {
          // Check if it's the next consecutive day
          const lastDate = new Date(data.lastCompletedDate);
          const todayDate = new Date(today);
          const daysDiff = Math.floor(
            (todayDate - lastDate) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff === 1) {
            // Streak continues!
            this.currentStreak = data.currentStreak + 1;
            this.lastCompletedDate = today;
            this.tasksCompletedToday = 0;
          } else {
            // Streak broken
            this.currentStreak = 0;
            this.lastCompletedDate = today;
            this.tasksCompletedToday = 0;
          }
        } else {
          this.resetStreak();
        }
      } else {
        this.resetStreak();
      }
    } catch (error) {
      this.resetStreak();
    }
  }

  /**
   * Reset streak data
   */
  resetStreak() {
    this.currentStreak = 0;
    this.lastCompletedDate = null;
    this.tasksCompletedToday = 0;
  }

  /**
   * Save streak data to localStorage
   */
  saveStreakData() {
    try {
      const data = {
        currentStreak: this.currentStreak,
        lastCompletedDate: this.lastCompletedDate,
        tasksCompletedToday: this.tasksCompletedToday,
      };
      localStorage.setItem(this.streakKey, JSON.stringify(data));
    } catch (error) {
      // Silently fail if localStorage not available
    }
  }

  /**
   * Record task completion
   * @returns {boolean} True if streak minimum (3 tasks) was just reached
   */
  recordTaskCompletion() {
    const today = new Date().toDateString();

    if (this.lastCompletedDate === today) {
      // Already completed task today, increment count
      this.tasksCompletedToday += 1;
      this.saveStreakData();

      // Check if we just hit the 3-task minimum - start/show streak
      if (this.tasksCompletedToday === 3 && this.currentStreak === 0) {
        this.currentStreak = 1;
        this.saveStreakData();
      }

      return this.tasksCompletedToday === 3;
    } else {
      // New day - check if previous day met the 3-task minimum
      const previousDayMet = this.tasksCompletedToday >= 3;

      if (previousDayMet && this.currentStreak > 0) {
        // Continue the streak
        this.currentStreak += 1;
      } else if (previousDayMet && this.currentStreak === 0) {
        // Start new streak (shouldn't happen but safety check)
        this.currentStreak = 1;
      } else if (!previousDayMet) {
        // Previous day didn't meet minimum - reset streak
        this.currentStreak = 0;
      }

      // Reset for new day
      this.lastCompletedDate = today;
      this.tasksCompletedToday = 1;

      this.saveStreakData();
      return false; // Need 2 more tasks to reach minimum of 3
    }
  }

  /**
   * Get current streak info
   * @returns {Object} Streak information
   */
  getStreakInfo() {
    return {
      currentStreak: this.currentStreak,
      tasksCompletedToday: this.tasksCompletedToday,
      lastCompletedDate: this.lastCompletedDate,
    };
  }

  /**
   * Show ASCII celebration modal
   * @param {string} taskName - Name of completed task
   */
  showCelebration(taskName) {
    // Create celebration modal
    const celebrationId = `celebration-${Date.now()}`;
    const celebration = document.createElement('div');
    celebration.id = celebrationId;

    const streakProgress = `${this.tasksCompletedToday}/3`;
    const streakText =
      this.tasksCompletedToday >= 3
        ? '+STREAK POINT'
        : `${streakProgress} FOR STREAK`;

    const asciiBox = `
    ╔════════════════════════════════╗
    ║   ✓ TASK COMPLETED             ║
    ║   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 100%        ║
    ║                                ║
    ║   ${taskName.substring(0, 26).padEnd(26)}║
    ║   ${streakText.padEnd(26)}║
    ╚════════════════════════════════╝
    `;

    celebration.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #001a23;
      border: 2px solid #2aa198;
      color: #2aa198;
      padding: 30px;
      border-radius: 4px;
      z-index: 10001;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      white-space: pre;
      box-shadow: 0 0 20px rgba(42, 161, 152, 0.5);
      text-align: center;
      animation: celebrationPulse 0.6s ease-out;
      line-height: 1.6;
    `;

    celebration.textContent = asciiBox;

    // Add animation keyframes if not present
    if (!document.querySelector('#celebration-styles')) {
      const style = document.createElement('style');
      style.id = 'celebration-styles';
      style.textContent = `
        @keyframes celebrationPulse {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0;
            filter: blur(10px);
          }
          50% {
            box-shadow: 0 0 40px rgba(42, 161, 152, 0.8);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
            filter: blur(0);
          }
        }
        @keyframes celebrationFade {
          0% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Add to page
    document.body.appendChild(celebration);

    // Play sound
    this.playMatrixSound();

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      celebration.style.animation = 'celebrationFade 0.5s ease-out forwards';
      setTimeout(() => {
        if (celebration.parentNode) {
          celebration.remove();
        }
      }, 500);
    }, 3000);
  }

  /**
   * Play matrix-themed sound effect
   * Uses Web Audio API to create digital/hacker sounds
   */
  playMatrixSound() {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Create multiple oscillators for matrix effect
      const now = audioContext.currentTime;

      // High pitch "success" beep
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.setValueAtTime(1500, now + 0.1);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Lower pitch resonance
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(800, now);
      osc2.frequency.setValueAtTime(900, now + 0.05);
      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(now);
      osc2.stop(now + 0.2);

      // Final "ding" for finality
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(2000, now + 0.15);
      osc3.frequency.setValueAtTime(1800, now + 0.25);
      gain3.gain.setValueAtTime(0.2, now + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.start(now + 0.15);
      osc3.stop(now + 0.35);
    } catch (error) {
      // Silently fail if audio context not available
    }
  }

  /**
   * Get streak display text
   * @returns {string} Formatted streak text
   */
  getStreakDisplayText() {
    if (this.currentStreak === 0) {
      return '';
    }
    const streakText = this.currentStreak === 1 ? 'DAY' : 'DAYS';
    return `🔥 ${this.currentStreak}-${streakText}`;
  }
}

// eslint-disable-next-line no-unused-vars
const gamification = new Gamification();
