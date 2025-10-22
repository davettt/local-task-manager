/* global TaskManager, TaskTimer, UI, playCompletionSound */

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

    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    this.attachEventListeners();
    UI.initDailyChecklist();
    await this.loadTasks();
  }

  /**
   * Attach all event listeners
   */
  attachEventListeners() {
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
        this.editingActiveTask = false;
        UI.hideModal();
      });
    }

    if (modalCancel) {
      modalCancel.addEventListener('click', () => {
        this.editingTaskId = null;
        this.editingActiveTask = false;
        UI.hideModal();
      });
    }

    if (taskForm) {
      taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Archive toggle
    const archiveToggle = document.getElementById('archive-toggle');
    if (archiveToggle) {
      archiveToggle.addEventListener('click', () => {
        UI.toggleArchive();
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
      stopBtn.addEventListener('click', () => this.handleStopTask());
    }

    if (completeBtn) {
      completeBtn.addEventListener('click', () => this.handleCompleteTask());
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
      this.timer.start(
        activeTask.id,
        activeTask.startedAt,
        activeTask.timeSpent
      );
      UI.showActiveTask(activeTask);
    }
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

    // Sort tasks by due date (most urgent first)
    regularTasks = this.sortTasksByDueDate(regularTasks);

    // Render task list
    UI.renderTaskList(regularTasks);

    // Render archive
    UI.renderArchive(this.archivedTasks);

    // Attach task list event listeners
    this.attachTaskListeners();
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

    // Expand buttons in task list
    const expandButtons = document.querySelectorAll('.expand-btn');
    expandButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const taskId = btn.getAttribute('data-task-id');
        UI.toggleTaskDetails(taskId);
      });
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

      UI.hideModal();
      this.editingTaskId = null;

      // If editing active task, update display without full re-render (keeps timer running)
      if (this.editingActiveTask) {
        this.editingActiveTask = false;
        UI.showActiveTask(task);
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
    UI.populateFormWithTask(task);
    UI.showModal(true);
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

      // Start UI timer
      this.timer.start(task.id, task.startedAt, task.timeSpent);
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
      }

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
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line no-unused-vars
  const app = new App();
});
