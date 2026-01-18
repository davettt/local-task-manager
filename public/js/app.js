/* global TaskManager, TaskTimer, UI, playCompletionSound, appointmentReminder, gamification */

/**
 * Main Application Module
 * Orchestrates all components and handles user interactions
 */

class App {
  constructor() {
    this.taskManager = new TaskManager();
    this.timer = new TaskTimer();
    this.tasks = [];
    this.archivedTasks = [];
    this.activeTaskId = null;
    this.editingTaskId = null;
    this.editingActiveTask = false;
    this.searchQuery = '';
    this.isFocusMode = false;
    this.pomodoroSessionTotalTime = 0;
    this.pomodoroSessionStartTime = null;

    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    this.attachEventListeners();
    UI.initDailyChecklist();
    await this.loadConfig();
    await this.loadTasks();
  }

  /**
   * Load configuration from server
   */
  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Failed to load config');
      }
      const config = await response.json();
      this.applyConfig(config);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  /**
   * Apply configuration to the UI
   */
  applyConfig(config) {
    if (config.mantra) {
      const mantraEl = document.querySelector('.terminal-mantra');
      const promptEl = document.querySelector('.terminal-prompt');
      const commandEl = document.querySelector('.terminal-command');

      if (config.mantra.enabled && mantraEl && commandEl) {
        // Update username and hostname
        const username = config.mantra.username || 'user';
        const hostname = config.mantra.hostname || 'matrix';
        if (promptEl) {
          promptEl.textContent = `${username}@${hostname}:~$`;
        }

        // Update text
        commandEl.textContent = config.mantra.text;

        // Update tooltip with descriptions
        if (config.mantra.descriptions) {
          const desc = config.mantra.descriptions;
          const tooltipText = `${username}@${hostname} = ${desc.nameIt} • Trace it = ${desc.traceIt} • Fix it = ${desc.fixIt} • Share it = ${desc.shareIt}`;
          mantraEl.setAttribute('data-tooltip', tooltipText);
        }

        mantraEl.style.display = 'flex';
      } else if (mantraEl) {
        mantraEl.style.display = 'none';
      }
    }
  }

  /**
   * Attach all event listeners
   */
  attachEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.render();
      });
    }

    // Modal controls
    const addTaskBtn = document.getElementById('add-task-btn');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const taskForm = document.getElementById('task-form');

    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => {
        this.editingTaskId = null;
        UI.clearForm();
        UI.showModal(false);
      });
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => {
        this.editingTaskId = null;
        const wasEditingActiveTask = this.editingActiveTask;
        this.editingActiveTask = false;
        UI.hideModal();
        // Re-activate focus mode if we were editing the active task
        if (
          wasEditingActiveTask &&
          this.activeTaskId &&
          this.timer.pomodoroMode
        ) {
          this.activateFocusMode();
        }
      });
    }

    if (modalCancel) {
      modalCancel.addEventListener('click', () => {
        this.editingTaskId = null;
        const wasEditingActiveTask = this.editingActiveTask;
        this.editingActiveTask = false;
        UI.hideModal();
        // Re-activate focus mode if we were editing the active task
        if (
          wasEditingActiveTask &&
          this.activeTaskId &&
          this.timer.pomodoroMode
        ) {
          this.activateFocusMode();
        }
      });
    }

    if (taskForm) {
      taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Appointment checkbox toggle
    const appointmentCheckbox = document.getElementById('is-appointment');
    const reminderSelect = document.getElementById('reminder-minutes');
    if (appointmentCheckbox) {
      appointmentCheckbox.addEventListener('change', (e) => {
        reminderSelect.disabled = !e.target.checked;
      });
    }

    // Working days checkbox toggle
    const recurringSelect = document.getElementById('recurring');
    const workingDaysCheckbox = document.getElementById('working-days-only');
    if (recurringSelect && workingDaysCheckbox) {
      recurringSelect.addEventListener('change', (e) => {
        // Only enable working days option for daily recurring
        workingDaysCheckbox.disabled = e.target.value !== 'daily';
        if (e.target.value !== 'daily') {
          workingDaysCheckbox.checked = false;
        }
      });
    }

    // Archive toggle
    const archiveToggle = document.getElementById('archive-toggle');
    if (archiveToggle) {
      archiveToggle.addEventListener('click', () => {
        UI.toggleArchive();
      });
    }

    // Clean archive button
    const cleanArchiveBtn = document.getElementById('clean-archive-btn');
    if (cleanArchiveBtn) {
      cleanArchiveBtn.addEventListener('click', () => {
        UI.showCleanupModal();
      });
    }

    // Cleanup modal controls
    const cleanupModalClose = document.getElementById('cleanup-modal-close');
    const cleanupCancelBtn = document.getElementById('cleanup-cancel-btn');
    const cleanupConfirmBtn = document.getElementById('cleanup-confirm-btn');

    if (cleanupModalClose) {
      cleanupModalClose.addEventListener('click', () => {
        UI.hideCleanupModal();
      });
    }

    if (cleanupCancelBtn) {
      cleanupCancelBtn.addEventListener('click', () => {
        UI.hideCleanupModal();
      });
    }

    if (cleanupConfirmBtn) {
      cleanupConfirmBtn.addEventListener('click', () => {
        this.handleCleanupConfirm();
      });
    }

    // Timer buttons and edit
    const editActiveBtn = document.getElementById('edit-active-btn');
    const stopBtn = document.getElementById('stop-btn');
    const completeBtn = document.getElementById('complete-btn');

    if (editActiveBtn) {
      editActiveBtn.addEventListener('click', () =>
        this.handleEditActiveTask()
      );
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (this.timer.pomodoroMode) {
          this.handleStopPomodoro();
        } else {
          this.handleStopTask();
        }
      });
    }

    if (completeBtn) {
      completeBtn.addEventListener('click', () => this.handleCompleteTask());
    }

    // Pomodoro controls
    const pomodoroToggle = document.getElementById('pomodoro-toggle-checkbox');
    const pomodoroInterval = document.getElementById('pomodoro-interval');

    if (pomodoroToggle) {
      pomodoroToggle.addEventListener('change', (e) => {
        // Enable/disable interval dropdown
        if (pomodoroInterval) {
          pomodoroInterval.disabled = !e.target.checked;
        }
        // Update timer if currently running
        if (this.timer.isRunning() && this.activeTaskId) {
          this.updatePomodoroSettings();
          // Activate focus mode if pomodoro is enabled
          if (e.target.checked) {
            this.activateFocusMode();
          }
        }
      });
    }

    if (pomodoroInterval) {
      pomodoroInterval.addEventListener('change', () => {
        // Update timer if currently running
        if (this.timer.isRunning() && this.activeTaskId) {
          this.updatePomodoroSettings();
        }
      });
    }

    // Break modal controls
    const breakSkipBtn = document.getElementById('break-skip-btn');
    const breakContinueBtn = document.getElementById('break-continue-btn');

    if (breakSkipBtn) {
      breakSkipBtn.addEventListener('click', () => this.handleBreakSkip());
    }

    if (breakContinueBtn) {
      breakContinueBtn.addEventListener('click', () =>
        this.handleBreakContinue()
      );
    }

    // Modal background click to close
    const modal = document.getElementById('task-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          UI.hideModal();
        }
      });
    }

    // Focus mode controls
    const exitFocusBtn = document.getElementById('exit-focus-btn');
    const focusExitBtn = document.getElementById('focus-exit-btn');
    const focusStopBtn = document.getElementById('focus-stop-btn');
    const focusPauseBtn = document.getElementById('focus-pause-btn');
    const focusCompleteBtn = document.getElementById('focus-complete-btn');

    if (exitFocusBtn) {
      exitFocusBtn.addEventListener('click', () => this.handleStopPomodoro());
    }

    if (focusExitBtn) {
      focusExitBtn.addEventListener('click', () => this.handleStopPomodoro());
    }

    if (focusStopBtn) {
      focusStopBtn.addEventListener('click', () => this.handleStopPomodoro());
    }

    if (focusPauseBtn) {
      focusPauseBtn.addEventListener('click', () => this.handlePauseInFocus());
    }

    const focusResumeBtn = document.getElementById('focus-resume-btn');
    if (focusResumeBtn) {
      focusResumeBtn.addEventListener('click', () =>
        this.handleResumeInFocus()
      );
    }

    if (focusCompleteBtn) {
      focusCompleteBtn.addEventListener('click', () =>
        this.handleCompleteTask()
      );
    }

    // Focus mode edit button
    const focusEditBtn = document.getElementById('focus-edit-btn');
    if (focusEditBtn) {
      focusEditBtn.addEventListener('click', () => {
        this.handleEditActiveTask();
      });
    }

    // Keyboard shortcut for focus mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isFocusMode) {
        this.deactivateFocusMode();
      }
    });
  }

  /**
   * Load tasks from server
   */
  async loadTasks() {
    try {
      this.tasks = await this.taskManager.getActiveTasks();
      this.archivedTasks = await this.taskManager.getArchivedTasks();

      // Render UI
      this.render();

      // Check for active task and resume timer
      this.resumeActiveTask();

      // Start checking for appointment reminders
      appointmentReminder.startCheckingReminders(this.tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      UI.showError('Failed to load tasks');
    }
  }

  /**
   * Resume active task timer if one exists
   */
  resumeActiveTask() {
    const activeTask = this.tasks.find((task) => task.inProgress);

    if (activeTask && activeTask.startedAt) {
      this.activeTaskId = activeTask.id;
      const pomodoroMode = activeTask.pomodoroMode || false;
      const pomodoroInterval = activeTask.pomodoroInterval || 25;
      this.timer.start(
        activeTask.id,
        activeTask.startedAt,
        activeTask.timeSpent,
        pomodoroMode,
        pomodoroInterval,
        () => this.handlePomodoroIntervalReached()
      );
      UI.showActiveTask(activeTask);
    }
  }

  /**
   * Filter tasks by search query
   * @param {Array} tasks - Tasks to filter
   * @returns {Array} Filtered tasks
   */
  filterTasksBySearch(tasks) {
    if (!this.searchQuery) {
      return tasks;
    }

    return tasks.filter((task) =>
      task.description.toLowerCase().includes(this.searchQuery)
    );
  }

  /**
   * Sort tasks by due date/time (most urgent first)
   * @param {Array} tasks - Tasks to sort
   * @returns {Array} Sorted tasks
   */
  sortTasksByDueDate(tasks) {
    return tasks.sort((a, b) => {
      // Tasks without due date go to the bottom
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      // Compare by date first
      const dateA = new Date(a.dueDate);
      const dateB = new Date(b.dueDate);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }

      // If same date, compare by time
      if (a.dueTime && b.dueTime) {
        return a.dueTime.localeCompare(b.dueTime);
      }
      if (a.dueTime) return -1;
      if (b.dueTime) return 1;

      return 0;
    });
  }

  /**
   * Render entire UI
   */
  render() {
    // Separate in-progress task from regular tasks
    let regularTasks = this.tasks.filter((task) => !task.inProgress);

    // Filter tasks by search query
    regularTasks = this.filterTasksBySearch(regularTasks);

    // Sort tasks by due date (most urgent first)
    regularTasks = this.sortTasksByDueDate(regularTasks);

    // Render task list
    UI.renderTaskList(regularTasks);

    // Render archive
    UI.renderArchive(this.archivedTasks);

    // Update streak display
    this.updateStreakDisplay();

    // Attach task list event listeners
    this.attachTaskListeners();
  }

  /**
   * Update streak display in header
   */
  updateStreakDisplay() {
    const streakDisplay = document.getElementById('streak-display');
    if (!streakDisplay) return;

    const streakText = gamification.getStreakDisplayText();
    streakDisplay.textContent = streakText;

    if (streakText) {
      streakDisplay.classList.add('active');
    } else {
      streakDisplay.classList.remove('active');
    }
  }

  /**
   * Attach event listeners to task list items
   */
  attachTaskListeners() {
    // Start buttons
    const startButtons = document.querySelectorAll('.start-btn');
    startButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-task-id');
        this.handleStartTask(taskId);
      });
    });

    // Delete buttons in task list
    const deleteButtons = document.querySelectorAll('.task-item .delete-btn');
    deleteButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-task-id');
        this.handleDeleteTask(taskId);
      });
    });

    // Restore buttons in archive
    const restoreButtons = document.querySelectorAll('.restore-btn');
    restoreButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-task-id');
        this.handleRestoreTask(taskId);
      });
    });

    // Delete buttons in archive
    const archiveDeleteButtons = document.querySelectorAll(
      '.archived-task .delete-btn'
    );
    archiveDeleteButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-task-id');
        this.handleDeleteTask(taskId);
      });
    });

    // Edit buttons in task list
    const editButtons = document.querySelectorAll('.task-item .edit-btn');
    editButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-task-id');
        this.handleEditTask(taskId);
      });
    });

    // Expand task details - click on task header to toggle
    const taskHeaders = document.querySelectorAll('.task-item-header');
    taskHeaders.forEach((header) => {
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking on the expand button itself
        if (e.target.classList.contains('expand-btn')) {
          e.preventDefault();
          e.stopPropagation();
        }
        const taskItem = header.closest('.task-item');
        if (taskItem) {
          const taskId = taskItem.getAttribute('data-task-id');
          UI.toggleTaskDetails(taskId);
        }
      });
      // Add cursor pointer style to indicate the entire header is clickable
      header.style.cursor = 'pointer';
    });

    // Checkboxes in task list (mark as complete)
    const checkboxes = document.querySelectorAll('.task-checkbox');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const taskId = checkbox.getAttribute('data-task-id');
        if (checkbox.checked) {
          this.handleCompleteTask(taskId);
          checkbox.checked = false; // Reset after handling
        }
      });
    });

    // Complete task buttons (direct completion)
    const completeTaskBtns = document.querySelectorAll('.complete-task-btn');
    completeTaskBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-task-id');
        this.handleCompleteTask(taskId);
      });
    });
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    e.preventDefault();

    try {
      UI.disableForm();

      const formData = UI.getFormData();

      // If editing, add the task ID to the form data
      if (this.editingTaskId) {
        formData.id = this.editingTaskId;
      }

      const task = await this.taskManager.saveTask(formData);

      // Add to tasks list if not already there
      const existingIndex = this.tasks.findIndex((t) => t.id === task.id);
      if (existingIndex >= 0) {
        this.tasks[existingIndex] = task;
      } else {
        this.tasks.push(task);
      }

      // Reset reminder for this task in case it was edited
      appointmentReminder.resetTaskReminder(task.id);

      UI.hideModal();
      this.editingTaskId = null;

      // If editing active task, update display without full re-render (keeps timer running)
      if (this.editingActiveTask) {
        this.editingActiveTask = false;
        UI.showActiveTask(task);
        // Update focus mode task display if in focus mode
        if (this.isFocusMode) {
          this.renderFocusModeTask(task);
        }
        // Re-activate focus mode if pomodoro is enabled
        if (this.timer.pomodoroMode) {
          this.activateFocusMode();
        }
      } else {
        // Regular task edit/create - full render
        this.render();
      }
    } catch (error) {
      console.error('Error saving task:', error);
      UI.showError(error.message);
    } finally {
      UI.enableForm();
    }
  }

  /**
   * Handle edit task
   */
  handleEditTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) {
      return;
    }

    this.editingTaskId = taskId;
    UI.clearForm();
    UI.populateFormWithTask(task);
    UI.showModal(true);
  }

  /**
   * Handle edit active task (while timer is running)
   */
  handleEditActiveTask() {
    if (!this.activeTaskId) {
      return;
    }

    const task = this.tasks.find((t) => t.id === this.activeTaskId);
    if (!task) {
      return;
    }

    this.editingTaskId = this.activeTaskId;
    this.editingActiveTask = true;
    UI.clearForm();
    UI.populateFormWithTask(task);
    UI.showModal(true);

    // Hide focus mode overlay while editing
    const overlay = document.getElementById('focus-mode-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  /**
   * Handle start task
   */
  async handleStartTask(taskId) {
    try {
      // Stop any running timer and get the stopped task back into the list
      if (this.timer.isRunning()) {
        const activeId = this.timer.getActiveTaskId();
        if (activeId) {
          const stoppedTask = await this.taskManager.stopTask(activeId);
          // Add the stopped task back to the list
          const index = this.tasks.findIndex((t) => t.id === activeId);
          if (index >= 0) {
            this.tasks[index] = stoppedTask;
          } else {
            this.tasks.push(stoppedTask);
          }
        }
      }

      // Start new task
      const task = await this.taskManager.startTask(taskId);

      // Update local state
      this.activeTaskId = taskId;
      const index = this.tasks.findIndex((t) => t.id === taskId);
      if (index >= 0) {
        this.tasks[index] = task;
      }

      // Start UI timer with pomodoro callback
      const pomodoroMode = task.pomodoroMode || false;
      const pomodoroInterval = task.pomodoroInterval || 25;
      this.timer.start(
        task.id,
        task.startedAt,
        task.timeSpent,
        pomodoroMode,
        pomodoroInterval,
        () => this.handlePomodoroIntervalReached()
      );

      // Update pomodoro UI
      this.updatePomodoroDisplay();

      // Auto-activate focus mode if pomodoro is enabled
      if (pomodoroMode) {
        this.activateFocusMode();
      }

      UI.showActiveTask(task);

      // Scroll to top to show active task
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Re-render task list (remove active task from list)
      this.render();
    } catch (error) {
      console.error('Error starting task:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Handle stop task
   */
  async handleStopTask() {
    try {
      if (!this.activeTaskId) {
        return;
      }

      // Save pomodoro settings before stopping
      this.savePomodoroSettingsToTask();

      // Deactivate focus mode
      this.deactivateFocusMode();

      const task = await this.taskManager.stopTask(this.activeTaskId);

      // Stop timer
      this.timer.stop();

      // Update local state
      const index = this.tasks.findIndex((t) => t.id === this.activeTaskId);
      if (index >= 0) {
        this.tasks[index] = task;
      }

      // Reset active task
      this.activeTaskId = null;

      // Hide active task section and re-render
      UI.hideActiveTask();
      this.render();
    } catch (error) {
      console.error('Error stopping task:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Stop Pomodoro mode and timer (exit Pomodoro focus)
   */
  async handleStopPomodoro() {
    try {
      if (!this.activeTaskId) {
        return;
      }

      // Save pomodoro settings (turn off pomodoro)
      this.savePomodoroSettingsToTask();

      // Deactivate focus mode
      this.deactivateFocusMode();

      // Stop the timer
      const task = await this.taskManager.stopTask(this.activeTaskId);

      // Update local state
      const index = this.tasks.findIndex((t) => t.id === this.activeTaskId);
      if (index >= 0) {
        this.tasks[index] = task;
      }

      // Reset active task
      this.activeTaskId = null;

      // Hide active task section and re-render
      UI.hideActiveTask();
      this.render();
    } catch (error) {
      console.error('Error stopping pomodoro:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Pause timer while keeping focus mode active
   */
  async handlePauseInFocus() {
    try {
      if (!this.activeTaskId) {
        return;
      }

      const task = this.tasks.find((t) => t.id === this.activeTaskId);
      if (!task) return;

      // Calculate elapsed time for this session
      const elapsed = Math.floor(
        (Date.now() - new Date(task.startedAt).getTime()) / 1000
      );
      const totalTimeSpent = task.timeSpent + elapsed;

      // Get Pomodoro info before stopping
      const wasPomodoroMode = this.timer.pomodoroMode;
      const pomodoroInterval = this.timer.pomodoroInterval;
      const pomodoroElapsed = wasPomodoroMode
        ? Math.floor(
            (Date.now() - this.timer.pomodoroIntervalStartedAt.getTime()) / 1000
          )
        : 0;
      const pomodoroRemaining = wasPomodoroMode
        ? Math.max(0, pomodoroInterval * 60 - pomodoroElapsed)
        : 0;

      // Stop timer update interval
      this.stopFocusModeTimerUpdate();
      this.timer.stop();

      // Update task with accumulated time and clear startedAt
      task.timeSpent = totalTimeSpent;
      task.startedAt = null;
      task.pomodoroMode = false;

      // Store pomodoro state for resume
      this._pausedPomodoroState = {
        wasPomodoroMode,
        pomodoroInterval,
        pomodoroRemaining,
      };

      // Directly update button visibility
      const pauseBtn = document.getElementById('focus-pause-btn');
      const resumeBtn = document.getElementById('focus-resume-btn');
      if (pauseBtn) pauseBtn.classList.add('hidden');
      if (resumeBtn) resumeBtn.classList.remove('hidden');

      // Update UI with paused state
      UI.showActiveTask(task);

      // Update focus mode display with static values
      this.updateFocusModeTimer();
    } catch (error) {
      console.error('Error pausing timer:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Resume timer after pause
   */
  async handleResumeInFocus() {
    try {
      if (!this.activeTaskId || !this._pausedPomodoroState) {
        return;
      }

      const { wasPomodoroMode, pomodoroInterval, pomodoroRemaining } =
        this._pausedPomodoroState;
      this._pausedPomodoroState = null;

      const task = this.tasks.find((t) => t.id === this.activeTaskId);
      if (!task) return;

      // Start a new session from now
      const newStartedAt = new Date().toISOString();

      // Calculate what the pomodoro start time should be so that remaining time is correct
      let pomodoroStartedAt = new Date();
      if (wasPomodoroMode && pomodoroRemaining > 0) {
        // remaining = interval * 60 - (now - startedAt)
        // startedAt = now - (interval * 60 - remaining)
        const offsetMs = (pomodoroInterval * 60 - pomodoroRemaining) * 1000;
        pomodoroStartedAt = new Date(Date.now() - offsetMs);
      }

      // Start timer with accumulated time and new start time
      this.timer.start(
        task.id,
        newStartedAt,
        task.timeSpent,
        wasPomodoroMode,
        pomodoroInterval,
        () => this.handlePomodoroIntervalReached()
      );

      // Restore pomodoro interval start time
      if (wasPomodoroMode) {
        this.timer.pomodoroIntervalStartedAt = pomodoroStartedAt;
        this.timer.pomodoroIntervalNotified = false;
      }

      // Update task with new startedAt and restored pomodoro settings
      task.startedAt = newStartedAt;
      task.pomodoroMode = wasPomodoroMode;
      task.pomodoroInterval = pomodoroInterval;

      // Directly update button visibility
      const pauseBtn = document.getElementById('focus-pause-btn');
      const resumeBtn = document.getElementById('focus-resume-btn');
      if (pauseBtn) pauseBtn.classList.remove('hidden');
      if (resumeBtn) resumeBtn.classList.add('hidden');

      // Update UI
      UI.showActiveTask(task);

      // Update focus mode timer
      this.startFocusModeTimerUpdate();
    } catch (error) {
      console.error('Error resuming timer:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Handle complete task
   * @param {string} taskId - Optional task ID (if not provided, completes active task)
   */
  async handleCompleteTask(taskId = null) {
    try {
      const targetTaskId = taskId || this.activeTaskId;
      if (!targetTaskId) {
        return;
      }

      const task = await this.taskManager.completeTask(targetTaskId);

      // Stop timer if completing active task
      if (targetTaskId === this.activeTaskId) {
        this.timer.stop();
      }

      // Update local state
      const index = this.tasks.findIndex((t) => t.id === targetTaskId);
      if (index >= 0) {
        this.tasks.splice(index, 1);
      }

      // Add to archived tasks
      this.archivedTasks.unshift(task);

      // Reset active task if it was the one being completed
      if (targetTaskId === this.activeTaskId) {
        this.activeTaskId = null;
        UI.hideActiveTask();
        // Deactivate focus mode when task is completed
        this.deactivateFocusMode();
      }

      // Record gamification (streak + celebration)
      gamification.recordTaskCompletion();
      gamification.showCelebration(task.description);

      // Play completion sound
      playCompletionSound();

      // Re-render
      this.render();
    } catch (error) {
      console.error('Error completing task:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Handle delete task
   */
  async handleDeleteTask(taskId) {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this task?'
    );
    if (!confirmDelete) {
      return;
    }

    try {
      await this.taskManager.deleteTask(taskId);

      // Update local state
      this.tasks = this.tasks.filter((t) => t.id !== taskId);
      this.archivedTasks = this.archivedTasks.filter((t) => t.id !== taskId);

      // If active task was deleted, stop timer
      if (this.activeTaskId === taskId) {
        this.timer.stop();
        this.activeTaskId = null;
        UI.hideActiveTask();
      }

      // Re-render
      this.render();
    } catch (error) {
      console.error('Error deleting task:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Handle restore task
   */
  async handleRestoreTask(taskId) {
    try {
      const task = await this.taskManager.restoreTask(taskId);

      // Update local state
      this.archivedTasks = this.archivedTasks.filter((t) => t.id !== taskId);
      this.tasks.push(task);

      // Re-render
      this.render();
    } catch (error) {
      console.error('Error restoring task:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Handle archive cleanup confirmation
   */
  async handleCleanupConfirm() {
    try {
      const cutoffDate = document.getElementById('cleanup-date').value;

      if (!cutoffDate) {
        UI.showError('Please select a date');
        return;
      }

      const response = await fetch('/api/archive/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cutoffDate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clean archive');
      }

      const result = await response.json();

      if (result.moved === 0) {
        UI.showError(result.message);
        return;
      }

      // Close modal and reload
      UI.hideCleanupModal();
      await this.loadTasks();

      // Show success message
      alert(`✓ Moved ${result.moved} completed tasks to archive files`);
    } catch (error) {
      console.error('Error cleaning archive:', error);
      UI.showError(error.message);
    }
  }

  /**
   * Update pomodoro settings when user toggles or changes interval
   */
  updatePomodoroSettings() {
    if (!this.activeTaskId) {
      return;
    }

    const pomodoroToggle = document.getElementById('pomodoro-toggle-checkbox');
    const pomodoroIntervalSelect = document.getElementById('pomodoro-interval');

    const pomodoroMode = pomodoroToggle ? pomodoroToggle.checked : false;
    const pomodoroInterval = pomodoroIntervalSelect
      ? parseInt(pomodoroIntervalSelect.value)
      : 25;

    // Update timer settings
    this.timer.pomodoroMode = pomodoroMode;
    this.timer.pomodoroInterval = pomodoroInterval;

    // Reset pomodoro interval tracking
    if (pomodoroMode) {
      this.timer.pomodoroIntervalStartedAt = new Date();
      this.timer.pomodoroIntervalNotified = false;
    }

    // Update task in local state
    const taskIndex = this.tasks.findIndex((t) => t.id === this.activeTaskId);
    if (taskIndex >= 0) {
      this.tasks[taskIndex].pomodoroMode = pomodoroMode;
      this.tasks[taskIndex].pomodoroInterval = pomodoroInterval;
    }

    // Update pomodoro display visibility
    this.updatePomodoroDisplay();
  }

  updatePomodoroDisplay() {
    const pomodoroDisplay = document.getElementById('pomodoro-display');
    const pomodoroMode = this.timer.pomodoroMode;

    if (pomodoroDisplay) {
      if (pomodoroMode) {
        pomodoroDisplay.classList.remove('hidden');
      } else {
        pomodoroDisplay.classList.add('hidden');
      }
    }
  }

  activateFocusMode() {
    if (!this.activeTaskId) return;

    this.isFocusMode = true;
    document.body.classList.add('focus-mode');

    const task = this.tasks.find((t) => t.id === this.activeTaskId);
    if (task) {
      this.renderFocusModeTask(task);
    }

    this.updateFocusModeUI();
    this.startFocusModeTimerUpdate();
  }

  deactivateFocusMode() {
    this.isFocusMode = false;
    document.body.classList.remove('focus-mode');
    this.stopFocusModeTimerUpdate();
    this.updateFocusModeUI();
  }

  renderFocusModeTask(task) {
    const container = document.getElementById('focus-task-container');
    if (!container) return;

    let html = `<div class="focus-task-title">${UI.escapeHtml(task.description)}</div>`;

    // Add meta info row
    const metaParts = [];
    if (task.priority && task.priority !== 'medium') {
      metaParts.push(`Priority: ${task.priority}`);
    }
    if (task.dueDate) {
      const formattedDate = TaskManager.formatDateTime(
        task.dueDate,
        task.dueTime
      );
      if (formattedDate) {
        metaParts.push(`Due: ${formattedDate}`);
      }
    }
    if (task.recurring) {
      metaParts.push(`Recurring: ${task.recurring}`);
    }

    if (metaParts.length > 0) {
      html += `<div class="focus-task-meta">${metaParts.join(' | ')}</div>`;
    }

    if (task.details) {
      html += `<div class="focus-task-details">${UI.escapeHtml(task.details)}</div>`;
    }

    if (task.links && task.links.length > 0) {
      html += `<div class="focus-task-links">`;
      task.links.forEach((link) => {
        html += `<a href="${UI.escapeHtml(link)}" target="_blank" class="focus-link">🔗 ${UI.escapeHtml(link)}</a>`;
      });
      html += `</div>`;
    }

    container.innerHTML = html;
  }

  updateFocusModeUI() {
    const overlay = document.getElementById('focus-mode-overlay');
    const header = document.getElementById('focus-mode-header');
    const pomodoroDisplay = document.getElementById('pomodoro-display');
    const pauseBtn = document.getElementById('focus-pause-btn');
    const resumeBtn = document.getElementById('focus-resume-btn');

    if (overlay) {
      if (this.isFocusMode) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }

    if (header) {
      if (this.isFocusMode) {
        header.classList.remove('hidden');
      } else {
        header.classList.add('hidden');
      }
    }

    if (pomodoroDisplay && this.timer.pomodoroMode) {
      if (this.isFocusMode) {
        pomodoroDisplay.classList.add('hidden');
      } else {
        pomodoroDisplay.classList.remove('hidden');
      }
    }

    // Handle pause/resume button visibility
    const isTimerRunning = this.timer.isRunning();
    if (pauseBtn && resumeBtn) {
      if (isTimerRunning && this.isFocusMode) {
        pauseBtn.classList.remove('hidden');
        resumeBtn.classList.add('hidden');
      } else if (
        !isTimerRunning &&
        this.isFocusMode &&
        this._pausedPomodoroState
      ) {
        pauseBtn.classList.add('hidden');
        resumeBtn.classList.remove('hidden');
      } else {
        pauseBtn.classList.add('hidden');
        resumeBtn.classList.add('hidden');
      }
    }
  }

  updateFocusModeTimer() {
    if (!this.isFocusMode) return;

    const focusTimerDisplay = document.getElementById('focus-timer-display');
    const timerDisplay = document.getElementById('timer-display');

    if (focusTimerDisplay && timerDisplay) {
      focusTimerDisplay.textContent = timerDisplay.textContent;
    }

    const pomodoroInfo = this.timer.getPomodoroInfo();
    const focusPomodoroTimer = document.getElementById('focus-pomodoro-timer');
    const focusPomodoroProgress = document.getElementById(
      'focus-pomodoro-progress'
    );

    if (pomodoroInfo) {
      const minutes = Math.floor(pomodoroInfo.remaining / 60);
      const seconds = pomodoroInfo.remaining % 60;
      const countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      if (focusPomodoroTimer) {
        focusPomodoroTimer.textContent = countdownText;
      }

      const progress =
        ((pomodoroInfo.total - pomodoroInfo.remaining) / pomodoroInfo.total) *
        100;
      if (focusPomodoroProgress) {
        focusPomodoroProgress.style.width = `${Math.min(100, progress)}%`;
      }
    } else {
      if (focusPomodoroTimer) {
        focusPomodoroTimer.textContent = '--:--';
      }
      if (focusPomodoroProgress) {
        focusPomodoroProgress.style.width = '0%';
      }
    }
  }

  savePomodoroSettingsToTask() {
    if (!this.activeTaskId) return;

    const taskIndex = this.tasks.findIndex((t) => t.id === this.activeTaskId);
    if (taskIndex >= 0) {
      this.tasks[taskIndex].pomodoroMode = this.timer.pomodoroMode || false;
      this.tasks[taskIndex].pomodoroInterval =
        this.timer.pomodoroInterval || 25;
    }
  }

  /**
   * Handle pomodoro interval reached
   */
  handlePomodoroIntervalReached() {
    // Calculate total time spent before stopping (including this pomodoro session)
    if (!this.activeTaskId) {
      return;
    }

    const currentTask = this.tasks.find((t) => t.id === this.activeTaskId);
    if (!currentTask) {
      return;
    }

    // Calculate elapsed time for this session
    const elapsed = Math.floor(
      (Date.now() - new Date(currentTask.startedAt).getTime()) / 1000
    );
    const totalTimeSpent = currentTask.timeSpent + elapsed;

    // Store these values for resuming after break
    this.pomodoroSessionTotalTime = totalTimeSpent;
    this.pomodoroSessionStartTime = currentTask.startedAt;

    // Stop the timer
    this.timer.stop();

    // Update focus mode timer display
    this.updateFocusModeTimer();

    // Show break modal
    const breakModal = document.getElementById('break-modal');
    if (breakModal) {
      breakModal.classList.remove('hidden');
      this.startBreakCountdown();
    }

    // Play completion sound
    playCompletionSound();
  }

  /**
   * Start break countdown timer
   */
  startBreakCountdown() {
    const breakCountdown = document.getElementById('break-countdown');
    if (!breakCountdown) {
      return;
    }

    let secondsRemaining = 5 * 60; // 5 minutes in seconds

    const updateCountdown = () => {
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      breakCountdown.textContent = `${minutes}:${seconds
        .toString()
        .padStart(2, '0')}`;

      if (secondsRemaining > 0) {
        secondsRemaining--;
        setTimeout(updateCountdown, 1000);
      }
    };

    updateCountdown();
  }

  /**
   * Handle skip break button
   */
  handleBreakSkip() {
    const breakModal = document.getElementById('break-modal');
    if (breakModal) {
      breakModal.classList.add('hidden');
    }

    // Resume timer for next pomodoro
    this.resumeFromBreak();
  }

  /**
   * Handle continue working button
   */
  handleBreakContinue() {
    const breakModal = document.getElementById('break-modal');
    if (breakModal) {
      breakModal.classList.add('hidden');
    }

    // Resume timer for next pomodoro
    this.resumeFromBreak();

    // Re-activate focus mode
    if (this.activeTaskId) {
      this.activateFocusMode();
      this.startFocusModeTimerUpdate();
    }
  }

  startFocusModeTimerUpdate() {
    if (this.focusModeInterval) {
      clearInterval(this.focusModeInterval);
    }

    this.focusModeInterval = setInterval(() => {
      this.updateFocusModeTimer();
    }, 1000);
  }

  stopFocusModeTimerUpdate() {
    if (this.focusModeInterval) {
      clearInterval(this.focusModeInterval);
      this.focusModeInterval = null;
    }
  }

  /**
   * Resume from break and continue next pomodoro
   */
  resumeFromBreak() {
    if (!this.activeTaskId) {
      return;
    }

    // Resume timer
    this.timer.resumeFromBreak();

    // Re-start the timer interval with correct time values
    const pomodoroMode = this.timer.pomodoroMode;
    const pomodoroInterval = this.timer.pomodoroInterval;

    // Use current time as start point and accumulated time as previous time spent
    const nowISO = new Date().toISOString();
    const previousTimeSpent = this.pomodoroSessionTotalTime || 0;

    this.timer.start(
      this.activeTaskId,
      nowISO,
      previousTimeSpent,
      pomodoroMode,
      pomodoroInterval,
      () => this.handlePomodoroIntervalReached()
    );
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line no-unused-vars
  const app = new App();
});
