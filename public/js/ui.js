/* global TaskManager, TaskTimer */

/**
 * UI Module
 * Handles all UI interactions and rendering
 */

class UI {
  /**
   * Project badge color palette (solarized-compatible)
   */
  static PROJECT_COLORS = [
    '#d33682', // magenta
    '#6c71c4', // violet
    '#268bd2', // blue
    '#2aa198', // cyan
    '#859900', // green
    '#b58900', // yellow
    '#cb4b16', // orange
    '#dc322f', // red
  ];

  /**
   * Get a consistent color index for a project name via simple hash
   * @param {string} name - Project name
   * @returns {number} Color index (0-7)
   */
  static getProjectColorIndex(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % UI.PROJECT_COLORS.length;
  }

  /**
   * Get the color hex for a project name
   * @param {string} name - Project name
   * @returns {string} Color hex string
   */
  static getProjectColor(name) {
    return UI.PROJECT_COLORS[UI.getProjectColorIndex(name)];
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show modal
   * @param {boolean} isEditing - Whether we're editing an existing task
   */
  static showModal(isEditing = false) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('modal-delete-btn');

    if (title) {
      title.textContent = isEditing ? 'Edit Task' : 'Add New Task';
    }

    if (deleteBtn) {
      deleteBtn.style.display = isEditing ? 'inline-block' : 'none';
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
        metaHtml += `<span class="active-priority-${task.priority}">${task.priority}</span>`;
      }
      if (task.recurring) {
        const recurringIcon = TaskManager.getRecurringIcon(task.recurring);
        metaHtml += `<span class="active-recurring">${recurringIcon} ${task.recurring}</span>`;
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
    const recurringIcon = TaskManager.getRecurringIcon(task.recurring);
    const dateTimeStr = TaskManager.formatDateTime(task.dueDate, task.dueTime);
    const appointmentIndicator = task.isAppointment ? ' 🔔' : '';
    const dateTimeHtml = dateTimeStr
      ? `<span class="task-due">${dateTimeStr}${appointmentIndicator}</span>`
      : task.isAppointment
        ? `<span class="task-due">🔔</span>`
        : '';
    const recurringHtml = recurringIcon
      ? `<span class="recurring-badge" title="Recurring: ${task.recurring}">${recurringIcon} ${task.recurring}</span>`
      : '';

    // Escape HTML helper function
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    // Format time spent
    const timeSpent = task.timeSpent || 0;
    const timeHtml =
      timeSpent > 0
        ? `<span class="task-time" data-task-id-time="${escapeHtml(task.id)}">⏱ ${TaskTimer.formatTime(timeSpent)}</span>`
        : '';

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

    const priority = task.priority || 'medium';

    // Format project badge
    const projectBadgeHtml = task.project
      ? `<span class="project-badge" style="--badge-color: ${UI.getProjectColor(task.project)}">${escapeHtml(task.project)}</span>`
      : '';

    return `
      <div class="task-item priority-${priority}" data-task-id="${escapeHtml(task.id)}">
        <div class="task-item-header">
           <div class="task-content">
             <div class="task-title">${escapeHtml(task.description)}${projectBadgeHtml ? `<span class="task-title-badge-right">${projectBadgeHtml}</span>` : ''}</div>
             <div class="task-meta">
               ${dateTimeHtml}
               ${recurringHtml}
               ${timeHtml}
             </div>
           </div>
        </div>
        <div class="task-item-details hidden">
          ${detailsHtml}
          ${linksHtml}
          <div class="task-actions">
            <button class="start-btn" data-task-id="${escapeHtml(
              task.id
            )}" title="Start timer">START</button>
            <button class="complete-task-btn" data-task-id="${escapeHtml(
              task.id
            )}" title="Complete task">DONE</button>
            <button class="edit-btn" data-task-id="${escapeHtml(
              task.id
            )}" title="Edit task">EDIT</button>
          </div>
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

    // Format completed date using settings if available
    let completedDate = 'Unknown';
    if (task.completedAt) {
      if (window.settingsManager) {
        completedDate = window.settingsManager.formatDate(task.completedAt);
      } else {
        completedDate = new Date(task.completedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
    }

    // Format completed time using settings if available
    let completedTime = '';
    if (task.completedAt) {
      const timeStr = new Date(task.completedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      if (window.settingsManager) {
        completedTime = window.settingsManager.formatTime(timeStr);
      } else {
        completedTime = timeStr;
      }
    }

    // Escape HTML in task description
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const projectBadgeHtml = task.project
      ? `<span class="project-badge" style="--badge-color: ${UI.getProjectColor(task.project)}">${escapeHtml(task.project)}</span>`
      : '';

    return `
      <div class="archived-task" data-task-id="${escapeHtml(task.id)}">
        <div class="archived-task-info">
          <div class="archived-task-title">
            ${escapeHtml(task.description)}
            ${projectBadgeHtml}
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
  static async showCleanupModal() {
    const modal = document.getElementById('cleanup-modal');
    const dateInput = document.getElementById('cleanup-date');
    if (modal) {
      // Fetch configured cutoff days from settings
      let cutoffDays = 30; // default
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const settings = await response.json();
          cutoffDays = settings.cleanup?.defaultCutoffDays || 30;
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }

      // Set default date based on configured cutoff days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);
      const dateStr = cutoffDate.toISOString().split('T')[0];
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

    const plannedStartTime =
      document.getElementById('planned-start-time').value;
    const plannedDuration = parseInt(
      document.getElementById('planned-duration').value,
      10
    );

    const project = document.getElementById('project').value.trim();

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
      plannedStartTime: plannedStartTime || null,
      plannedDuration: plannedDuration || 60,
      project: project || null,
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
    document.getElementById('project').value = task.project || '';
    document.getElementById('links').value = TaskManager.linksToString(
      task.links
    );
    document.getElementById('planned-start-time').value =
      task.plannedStartTime || '';
    const durationSelect = document.getElementById('planned-duration');
    const durationVal = String(task.plannedDuration || 60);
    // If the duration from a clock drag isn't a standard option, add it
    if (!durationSelect.querySelector(`option[value="${durationVal}"]`)) {
      const mins = parseInt(durationVal, 10);
      const label =
        mins >= 60
          ? `${(mins / 60).toFixed(1).replace('.0', '')} hours`
          : `${mins} min`;
      const opt = document.createElement('option');
      opt.value = durationVal;
      opt.textContent = label;
      durationSelect.appendChild(opt);
    }
    durationSelect.value = durationVal;
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
    if (details) {
      details.classList.toggle('hidden');
      taskItem.classList.toggle(
        'expanded',
        !details.classList.contains('hidden')
      );
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
  static async initDailyChecklist() {
    // Render checklist items from config
    await UI.renderDailyChecklistFromConfig();

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
   * Render daily checklist items from config
   */
  static async renderDailyChecklistFromConfig() {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const settings = await response.json();
      const { dailyRoutine } = settings;

      const checklistContainer = document.getElementById(
        'daily-checklist-list'
      );
      if (!checklistContainer) return;

      // Clear existing items but keep the container for state management
      checklistContainer.innerHTML = '';

      // Render enabled items
      if (dailyRoutine && Array.isArray(dailyRoutine)) {
        dailyRoutine.forEach((item) => {
          if (item.enabled) {
            const label = document.createElement('label');
            label.className = 'checklist-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'checklist-checkbox';
            checkbox.dataset.itemId = item.id;
            checkbox.dataset.item = item.id; // For backward compatibility

            const text = document.createElement('span');
            text.textContent = `${item.icon} ${item.label}`;

            label.appendChild(checkbox);
            label.appendChild(text);
            checklistContainer.appendChild(label);
          }
        });
      }
    } catch (error) {
      console.error('Error rendering daily checklist from config:', error);
      // Fall back to existing checklist if available
    }
  }

  /**
   * Toggle daily routine dropdown visibility
   */
  static toggleDailyChecklist() {
    const dropdown = document.getElementById('daily-checklist-list');
    const btn = document.getElementById('daily-checklist-toggle');
    if (dropdown) {
      const isHidden = dropdown.classList.toggle('hidden');
      if (btn) {
        if (isHidden) {
          btn.classList.remove('active');
        } else {
          btn.classList.add('active');
          // Close when clicking outside
          const closeHandler = (e) => {
            if (!dropdown.contains(e.target) && e.target !== btn) {
              dropdown.classList.add('hidden');
              btn.classList.remove('active');
              document.removeEventListener('click', closeHandler);
            }
          };
          setTimeout(() => document.addEventListener('click', closeHandler), 0);
        }
      }
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

  /**
   * Show a status message in the terminal status bar
   * @param {string} message - Status message to display
   */
  static showStatus(message) {
    const messageEl = document.getElementById('terminal-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }
}
