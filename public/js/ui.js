/* global TaskManager, TaskTimer */

/**
 * UI Module
 * Handles all UI interactions and rendering
 */

class UI {
  /**
   * Show modal
   * @param {boolean} isEditing - Whether we're editing an existing task
   */
  static showModal(isEditing = false) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');

    if (title) {
      title.textContent = isEditing ? 'Edit Task' : 'Add New Task';
    }

    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  /**
   * Hide modal
   */
  static hideModal() {
    const modal = document.getElementById('task-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    UI.clearForm();
  }

  /**
   * Clear form fields
   */
  static clearForm() {
    const form = document.getElementById('task-form');
    if (form) {
      form.reset();
    }
  }

  /**
   * Show active task section with full details
   * @param {Object} task - Task object
   */
  static showActiveTask(task) {
    const section = document.getElementById('active-task-section');
    const title = document.getElementById('active-task-title');
    const details = document.getElementById('active-task-details');
    const metaDiv = document.getElementById('active-task-meta');
    const detailsDiv = document.getElementById('active-task-extended-details');
    const linksDiv = document.getElementById('active-task-links');

    if (section && title) {
      title.textContent = task.description;

      // Build meta information
      let metaHtml = '';
      if (task.priority) {
        const icon = TaskManager.getPriorityIcon(task.priority);
        metaHtml += `<span class="active-priority">${icon} ${task.priority}</span>`;
      }
      if (task.recurring) {
        const recurringIcon = TaskManager.getRecurringIcon(task.recurring);
        metaHtml += `<span class="active-priority">${recurringIcon} ${task.recurring}</span>`;
      }
      if (task.dueDate || task.dueTime) {
        const dateTimeStr = TaskManager.formatDateTime(
          task.dueDate,
          task.dueTime
        );
        metaHtml += `<span class="active-due">${dateTimeStr}</span>`;
      }

      // Build extended details
      let extendedDetailsHtml = '';
      if (task.details && task.details.trim()) {
        extendedDetailsHtml = `<div class="active-details-content">${task.details.replace(/\n/g, '<br>')}</div>`;
      }

      // Build links
      let linksHtml = '';
      if (task.links && task.links.length > 0) {
        linksHtml = `<div class="active-links">
          ${task.links
            .map(
              (link) =>
                `<a href="${link}" target="_blank" rel="noopener noreferrer" class="active-link">
              🔗 ${link}
            </a>`
            )
            .join('')}
          </div>`;
      }

      if (metaDiv) {
        metaDiv.innerHTML = metaHtml;
      }
      if (detailsDiv) {
        detailsDiv.innerHTML = extendedDetailsHtml;
      }
      if (linksDiv) {
        linksDiv.innerHTML = linksHtml;
      }
      if (details && (metaHtml || extendedDetailsHtml || linksHtml)) {
        details.classList.remove('hidden');
      }

      section.classList.remove('hidden');
    }
  }

  /**
   * Hide active task section
   */
  static hideActiveTask() {
    const section = document.getElementById('active-task-section');
    const details = document.getElementById('active-task-details');
    if (section) {
      section.classList.add('hidden');
    }
    if (details) {
      details.classList.add('hidden');
    }
  }

  /**
   * Render task list
   * @param {Array} tasks - Array of tasks
   */
  static renderTaskList(tasks) {
    const taskList = document.getElementById('task-list');
    if (!taskList) {
      return;
    }

    if (tasks.length === 0) {
      taskList.innerHTML =
        '<div class="empty-state">No tasks yet. Create one to get started!</div>';
      return;
    }

    taskList.innerHTML = tasks
      .map((task) => UI.createTaskElement(task))
      .join('');
  }

  /**
   * Create task element HTML
   * @param {Object} task - Task object
   * @returns {string} HTML string
   */
  static createTaskElement(task) {
    const priorityIcon = TaskManager.getPriorityIcon(task.priority);
    const recurringIcon = TaskManager.getRecurringIcon(task.recurring);
    const dateTimeStr = TaskManager.formatDateTime(task.dueDate, task.dueTime);
    const dateTimeHtml = dateTimeStr
      ? `<span class="task-due">${dateTimeStr}</span>`
      : '';

    // Escape HTML in task description
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    // Format links for display
    const linksHtml =
      task.links && task.links.length > 0
        ? `<div class="task-links">
           ${task.links
             .map(
               (link) =>
                 `<a href="${escapeHtml(
                   link
                 )}" target="_blank" rel="noopener noreferrer" class="task-link">
              🔗 ${escapeHtml(link)}
            </a>`
             )
             .join('')}
           </div>`
        : '';

    // Format details for display
    const detailsHtml =
      task.details && task.details.trim()
        ? `<div class="task-details-section">
             <div class="task-details-label">Details:</div>
             <div class="task-details-text">${escapeHtml(task.details)}</div>
           </div>`
        : '';

    return `
      <div class="task-item" data-task-id="${escapeHtml(task.id)}">
        <div class="task-item-header">
          <span class="priority-icon">${priorityIcon}</span>
          ${recurringIcon ? `<span class="priority-icon" title="Recurring: ${task.recurring}">${recurringIcon}</span>` : ''}
          ${task.isAppointment ? `<span class="appointment-badge" title="Calendar Appointment">🔔</span>` : ''}
          <div class="task-content" style="flex: 1">
            <div class="task-title">${escapeHtml(task.description)}</div>
            <div class="task-meta">
              ${dateTimeHtml}
            </div>
          </div>
          <button class="expand-btn" data-task-id="${escapeHtml(
            task.id
          )}" title="Show details">▼</button>
        </div>
        <div class="task-item-details hidden">
          ${detailsHtml}
          ${linksHtml}
        </div>
        <div class="task-actions">
          <button class="start-btn" data-task-id="${escapeHtml(
            task.id
          )}" title="Start timer">▸ START</button>
          <button class="complete-task-btn" data-task-id="${escapeHtml(
            task.id
          )}" title="Complete task">✓ DONE</button>
          <button class="edit-btn" data-task-id="${escapeHtml(
            task.id
          )}" title="Edit task">◇ EDIT</button>
          <button class="delete-btn" data-task-id="${escapeHtml(
            task.id
          )}" title="Delete task">✗ DEL</button>
        </div>
      </div>
    `;
  }

  /**
   * Render archive section
   * @param {Array} tasks - Array of archived tasks
   */
  static renderArchive(tasks) {
    const archiveCount = document.getElementById('archive-count');
    const archiveList = document.getElementById('archive-list');

    if (archiveCount) {
      archiveCount.textContent = tasks.length > 0 ? `(${tasks.length})` : '';
    }

    if (!archiveList) {
      return;
    }

    if (tasks.length === 0) {
      archiveList.innerHTML = '';
      archiveList.classList.add('hidden');
      return;
    }

    archiveList.innerHTML = tasks
      .map((task) => UI.createArchivedTaskElement(task))
      .join('');
  }

  /**
   * Create archived task element HTML
   * @param {Object} task - Task object
   * @returns {string} HTML string
   */
  static createArchivedTaskElement(task) {
    const timeSpent = TaskTimer.formatTime(task.timeSpent || 0);
    const completedDate = task.completedAt
      ? new Date(task.completedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'Unknown';
    const completedTime = task.completedAt
      ? new Date(task.completedAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    // Escape HTML in task description
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    return `
      <div class="archived-task" data-task-id="${escapeHtml(task.id)}">
        <div class="archived-task-info">
          <div class="archived-task-title">
            ${escapeHtml(task.description)}
            ${task.isAppointment ? `<span class="appointment-badge" title="Calendar Appointment">🔔</span>` : ''}
          </div>
          <div class="archived-task-time">
            Completed ${completedDate} at ${completedTime} (${timeSpent})
          </div>
        </div>
        <button class="restore-btn" data-task-id="${escapeHtml(
          task.id
        )}" title="Restore task">↶ RESTORE</button>
        <button class="delete-btn" data-task-id="${escapeHtml(
          task.id
        )}" title="Delete task">✗ DEL</button>
      </div>
    `;
  }

  /**
   * Toggle archive visibility
   */
  static toggleArchive() {
    const archiveContent = document.getElementById('archive-list');
    if (archiveContent) {
      archiveContent.classList.toggle('hidden');
    }
  }

  /**
   * Show cleanup modal
   */
  static showCleanupModal() {
    const modal = document.getElementById('cleanup-modal');
    const dateInput = document.getElementById('cleanup-date');
    if (modal) {
      // Set default date to 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
      if (dateInput) {
        dateInput.value = dateStr;
      }
      modal.classList.remove('hidden');
    }
  }

  /**
   * Hide cleanup modal
   */
  static hideCleanupModal() {
    const modal = document.getElementById('cleanup-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  static showError(message) {
    alert(`Error: ${message}`);
  }

  /**
   * Get form data
   * @returns {Object} Form data
   */
  static getFormData() {
    const description = document.getElementById('description').value;
    const dueDate = document.getElementById('due-date').value;
    const dueTime = document.getElementById('due-time').value;
    const priority = document.getElementById('priority').value;
    const linksInput = document.getElementById('links').value;
    const recurring = document.getElementById('recurring').value;
    const details = document.getElementById('details').value;
    const isAppointment = document.getElementById('is-appointment').checked;
    const reminderMinutes = parseInt(
      document.getElementById('reminder-minutes').value,
      10
    );
    const workingDaysOnly =
      document.getElementById('working-days-only').checked;
    const links = TaskManager.parseLinks(linksInput);

    const formData = {
      description,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      priority,
      recurring: recurring || null,
      details: details || null,
      isAppointment,
      reminderMinutes: isAppointment ? reminderMinutes : null,
      workingDaysOnly: recurring === 'daily' ? workingDaysOnly : false,
      links,
    };

    return formData;
  }

  /**
   * Populate form with task data for editing
   * @param {Object} task - Task object
   */
  static populateFormWithTask(task) {
    document.getElementById('description').value = task.description || '';
    document.getElementById('due-date').value = task.dueDate || '';
    document.getElementById('due-time').value = task.dueTime || '';
    document.getElementById('priority').value = task.priority || 'medium';
    document.getElementById('recurring').value = task.recurring || '';
    document.getElementById('details').value = task.details || '';
    document.getElementById('is-appointment').checked =
      task.isAppointment || false;
    document.getElementById('reminder-minutes').value =
      task.reminderMinutes || 30;
    document.getElementById('reminder-minutes').disabled = !task.isAppointment;
    document.getElementById('working-days-only').checked =
      task.workingDaysOnly || false;
    document.getElementById('working-days-only').disabled =
      task.recurring !== 'daily';
    document.getElementById('links').value = TaskManager.linksToString(
      task.links
    );
  }

  /**
   * Toggle task details visibility
   * @param {string} taskId - Task ID
   */
  static toggleTaskDetails(taskId) {
    const taskItem = document.querySelector(
      `.task-item[data-task-id="${taskId}"]`
    );
    if (!taskItem) return;

    const details = taskItem.querySelector('.task-item-details');
    const expandBtn = taskItem.querySelector('.expand-btn');

    if (details) {
      details.classList.toggle('hidden');
      expandBtn.textContent = details.classList.contains('hidden') ? '▼' : '▲';
    }
  }

  /**
   * Disable form submission while processing
   */
  static disableForm() {
    const form = document.getElementById('task-form');
    if (form) {
      const inputs = form.querySelectorAll('input, textarea, select, button');
      inputs.forEach((input) => {
        input.disabled = true;
      });
    }
  }

  /**
   * Enable form submission
   */
  static enableForm() {
    const form = document.getElementById('task-form');
    if (form) {
      const inputs = form.querySelectorAll('input, textarea, select, button');
      inputs.forEach((input) => {
        input.disabled = false;
      });
    }
  }

  /**
   * Initialize daily checklist event listeners and load saved state
   */
  static initDailyChecklist() {
    // Attach toggle handler for checklist header
    const checklistToggle = document.getElementById('daily-checklist-toggle');
    if (checklistToggle) {
      checklistToggle.addEventListener('click', () => {
        UI.toggleDailyChecklist();
      });
    }

    // Load saved checklist state and attach checkbox listeners
    UI.loadChecklistState();
    UI.attachChecklistListeners();

    // Check if a new day has started and reset if needed
    UI.checkAndResetDailyChecklist();
  }

  /**
   * Toggle daily checklist visibility
   */
  static toggleDailyChecklist() {
    const checklistContent = document.getElementById('daily-checklist-list');
    if (checklistContent) {
      checklistContent.classList.toggle('hidden');
    }
  }

  /**
   * Attach event listeners to checklist checkboxes
   */
  static attachChecklistListeners() {
    const checkboxes = document.querySelectorAll('.checklist-checkbox');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        UI.saveChecklistState();
      });
    });
  }

  /**
   * Save checklist state to localStorage
   */
  static saveChecklistState() {
    const checkboxes = document.querySelectorAll('.checklist-checkbox');
    const state = {
      date: new Date().toDateString(),
      items: {},
    };

    checkboxes.forEach((checkbox) => {
      const item = checkbox.getAttribute('data-item');
      state.items[item] = checkbox.checked;
    });

    localStorage.setItem('dailyChecklistState', JSON.stringify(state));
  }

  /**
   * Load checklist state from localStorage
   */
  static loadChecklistState() {
    const saved = localStorage.getItem('dailyChecklistState');
    if (!saved) {
      return;
    }

    const state = JSON.parse(saved);
    const today = new Date().toDateString();

    // Only load if state is from today
    if (state.date === today) {
      const checkboxes = document.querySelectorAll('.checklist-checkbox');
      checkboxes.forEach((checkbox) => {
        const item = checkbox.getAttribute('data-item');
        if (state.items[item] !== undefined) {
          checkbox.checked = state.items[item];
        }
      });
    }
  }

  /**
   * Check if a new day has started and reset checklist if needed
   */
  static checkAndResetDailyChecklist() {
    const saved = localStorage.getItem('dailyChecklistState');
    if (saved) {
      const state = JSON.parse(saved);
      const today = new Date().toDateString();

      if (state.date !== today) {
        // New day detected - reset all checkboxes
        const checkboxes = document.querySelectorAll('.checklist-checkbox');
        checkboxes.forEach((checkbox) => {
          checkbox.checked = false;
        });

        // Save the reset state
        UI.saveChecklistState();
      }
    }
  }
}
