/**
 * Task Manager Module
 * Handles all task API operations
 */

class TaskManager {
  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Fetch all active tasks
   * @returns {Promise<Array>} Array of tasks
   */
  async getActiveTasks() {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  /**
   * Fetch all archived tasks
   * @returns {Promise<Array>} Array of archived tasks
   */
  async getArchivedTasks() {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/archived`);
      if (!response.ok) {
        throw new Error('Failed to fetch archived tasks');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching archived tasks:', error);
      return [];
    }
  }

  /**
   * Create or update a task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created/updated task
   */
  async saveTask(taskData) {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
    }
  }

  /**
   * Start a task timer
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Updated task
   */
  async startTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting task:', error);
      throw error;
    }
  }

  /**
   * Stop a task timer (pause)
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Updated task
   */
  async stopTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error stopping task:', error);
      throw error;
    }
  }

  /**
   * Complete a task (move to archive)
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Completed task
   */
  async completeTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to complete task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Restore a task from archive
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Restored task
   */
  async restoreTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restore task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error restoring task:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   * @param {string} taskId - Task ID
   * @returns {Promise<void>}
   */
  async deleteTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * Parse comma-separated links string to array
   * @param {string} linksString - Comma-separated links
   * @returns {Array} Array of links
   */
  static parseLinks(linksString) {
    if (!linksString || typeof linksString !== 'string') {
      return [];
    }
    return linksString
      .split(',')
      .map((link) => link.trim())
      .filter((link) => link.length > 0);
  }

  /**
   * Convert links array to comma-separated string
   * @param {Array} links - Array of links
   * @returns {string} Comma-separated links
   */
  static linksToString(links) {
    if (!Array.isArray(links)) {
      return '';
    }
    return links.join(', ');
  }

  /**
   * Get priority icon
   * @param {string} priority - Priority level
   * @returns {string} Icon symbol
   */
  static getPriorityIcon(priority) {
    switch (priority) {
      case 'high':
        return '!';
      case 'medium':
        return '—';
      case 'low':
        return '·';
      default:
        return '○';
    }
  }

  /**
   * Get recurring icon
   * @param {string} recurring - Recurring interval ('daily', 'weekly', or null)
   * @returns {string} Icon symbol or empty string if not recurring
   */
  static getRecurringIcon(recurring) {
    if (recurring === 'daily' || recurring === 'weekly') {
      return '↻';
    }
    return '';
  }

  /**
   * Get relative date label (Today, Tomorrow, Overdue, or formatted date)
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {string} Relative date label
   */
  static getRelativeDate(date) {
    if (!date) {
      return '';
    }

    const taskDate = new Date(date);
    const today = new Date();

    // Reset time to midnight for accurate date comparison
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);

    const timeDiff = taskDate.getTime() - today.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (dayDiff === 0) {
      return 'Today';
    }
    if (dayDiff === 1) {
      return 'Tomorrow';
    }
    if (dayDiff < 0) {
      return 'Overdue';
    }

    // For other dates, show formatted date
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return taskDate.toLocaleDateString('en-US', options);
  }

  /**
   * Format date and time for display with relative labels
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} time - Time in HH:MM format
   * @returns {string} Formatted date and time
   */
  static formatDateTime(date, time) {
    if (!date && !time) {
      return '';
    }

    let result = '';

    if (date) {
      result = TaskManager.getRelativeDate(date);
    }

    if (time) {
      result += result ? ' ' : '';
      result += time;
    }

    return result;
  }
}
