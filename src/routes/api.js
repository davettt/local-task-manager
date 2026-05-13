const express = require('express');
const {
  readTasks,
  getTask,
  saveTask,
  deleteTask,
  writeTasks,
  archiveTasks,
  readConfig,
  writeConfig,
  updateUserSettings,
  readArchivedTasks,
  clearAllArchiveFiles,
} = require('../utils/fileManager');

const router = express.Router();

/**
 * Validate task object
 */
function validateTask(task) {
  if (!task.description || task.description.trim().length === 0) {
    throw new Error('Description is required');
  }

  if (task.priority && !['low', 'medium', 'high'].includes(task.priority)) {
    throw new Error('Invalid priority value');
  }

  if (task.details && typeof task.details !== 'string') {
    throw new Error('Details must be a string');
  }

  if (task.links && Array.isArray(task.links)) {
    task.links.forEach((link) => {
      try {
        const parsed = new URL(link);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error(`Only http and https URLs are allowed: ${link}`);
        }
      } catch (e) {
        throw e.message.includes('Only http')
          ? e
          : new Error(`Invalid URL: ${link}`);
      }
    });
  }
}

/**
 * Calculate next due date for recurring task
 * @param {string} currentDate - Current due date in YYYY-MM-DD format
 * @param {string} recurring - Recurring interval ('daily' or 'weekly')
 * @returns {string} Next due date in YYYY-MM-DD format
 */
function calculateNextDueDate(currentDate, recurring, workingDaysOnly = false) {
  if (!currentDate || !recurring) {
    return currentDate;
  }

  // Parse date string (YYYY-MM-DD) and create date in local timezone
  const [year, month, day] = currentDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (recurring === 'daily') {
    date.setDate(date.getDate() + 1);

    // If working days only, skip weekends (0 = Sunday, 6 = Saturday)
    if (workingDaysOnly) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0) {
        // Sunday - move to Monday
        date.setDate(date.getDate() + 1);
      } else if (dayOfWeek === 6) {
        // Saturday - move to Monday
        date.setDate(date.getDate() + 2);
      }
    }
  } else if (recurring === 'weekly') {
    date.setDate(date.getDate() + 7);
  }

  // Format back to YYYY-MM-DD without timezone conversion
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');

  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * GET /api/tasks
 * Returns all active (non-archived) tasks
 */
router.get('/tasks', (_req, res) => {
  try {
    const tasks = readTasks();
    const activeTasks = tasks.filter((task) => !task.archived);
    res.json(activeTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/tasks/upcoming
 * Returns tasks for the next N days (default 3), grouped by date.
 */
router.get('/tasks/upcoming', (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 3;
    const tasks = readTasks();
    const activeTasks = tasks.filter(
      (task) => !task.archived && !task.completed
    );

    const result = {};
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      result[dateStr] = activeTasks.filter((t) => t.dueDate === dateStr);
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming tasks' });
  }
});

/**
 * GET /api/tasks/archived
 * Returns all archived (completed) tasks from both tasks.json and archive files
 */
router.get('/tasks/archived', (_req, res) => {
  try {
    // Get archived tasks from tasks.json only
    // Archive files are for long-term storage, not for the active UI
    const tasks = readTasks();
    const tasksJsonArchived = tasks.filter((task) => task.archived);

    res.json(tasksJsonArchived);
  } catch (error) {
    console.error('Error fetching archived tasks:', error);
    res.status(500).json({ error: 'Failed to fetch archived tasks' });
  }
});

/**
 * GET /api/tasks/archive-files
 * Returns all tasks from archive_*.json files (tasks moved out of tasks.json by cleanup)
 */
router.get('/tasks/archive-files', (_req, res) => {
  try {
    const archivedTasks = readArchivedTasks();
    res.json(archivedTasks);
  } catch (error) {
    console.error('Error fetching archive file tasks:', error);
    res.status(500).json({ error: 'Failed to fetch archive file tasks' });
  }
});

/**
 * POST /api/tasks
 * Create or update a task
 */
router.post('/tasks', (req, res) => {
  try {
    const {
      id,
      description,
      dueDate,
      dueTime,
      priority,
      links,
      recurring,
      details,
      isAppointment,
      reminderMinutes,
      workingDaysOnly,
      pomodoroMode,
      pomodoroInterval,
      plannedStartDate,
      plannedStartTime,
      plannedDuration,
      project,
    } = req.body;

    // Validate required fields
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Validate recurring value
    if (recurring && !['daily', 'weekly'].includes(recurring)) {
      return res
        .status(400)
        .json({ error: 'Recurring must be "daily" or "weekly"' });
    }

    // Check if task exists (update case)
    let task;
    if (id) {
      const existingTask = getTask(id);
      if (existingTask) {
        // Preserve existing metadata and timer data
        task = {
          ...existingTask,
          description: description.trim(),
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          priority: priority || 'medium',
          recurring: recurring || null,
          details: details || null,
          links: links || [],
          isAppointment: isAppointment || false,
          reminderMinutes: isAppointment ? reminderMinutes || 30 : null,
          workingDaysOnly:
            recurring === 'daily' ? workingDaysOnly || false : false,
          pomodoroMode: pomodoroMode ?? existingTask.pomodoroMode ?? false,
          pomodoroInterval:
            pomodoroInterval || existingTask.pomodoroInterval || 25,
          plannedStartDate:
            plannedStartDate ?? existingTask.plannedStartDate ?? null,
          plannedStartTime:
            plannedStartTime ?? existingTask.plannedStartTime ?? null,
          project:
            project !== undefined
              ? project || null
              : existingTask.project || null,
          plannedDuration:
            plannedDuration ?? existingTask.plannedDuration ?? 60,
          clockRing: existingTask.clockRing ?? null,
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Task doesn't exist, create new one
        task = {
          id,
          description: description.trim(),
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          priority: priority || 'medium',
          recurring: recurring || null,
          details: details || null,
          isAppointment: isAppointment || false,
          reminderMinutes: isAppointment ? reminderMinutes || 30 : null,
          workingDaysOnly:
            recurring === 'daily' ? workingDaysOnly || false : false,
          completed: false,
          archived: false,
          inProgress: false,
          startedAt: null,
          timeSpent: 0,
          completedAt: null,
          links: links || [],
          pomodoroMode: pomodoroMode || false,
          pomodoroInterval: pomodoroInterval || 25,
          plannedStartDate: plannedStartDate || null,
          plannedStartTime: plannedStartTime || null,
          plannedDuration: plannedDuration || 60,
          clockRing: null,
          project: project || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      // Create new task
      task = {
        id: Date.now().toString(),
        description: description.trim(),
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        priority: priority || 'medium',
        recurring: recurring || null,
        details: details || null,
        isAppointment: isAppointment || false,
        reminderMinutes: isAppointment ? reminderMinutes || 30 : null,
        workingDaysOnly:
          recurring === 'daily' ? workingDaysOnly || false : false,
        completed: false,
        archived: false,
        inProgress: false,
        startedAt: null,
        timeSpent: 0,
        completedAt: null,
        links: links || [],
        pomodoroMode: pomodoroMode || false,
        pomodoroInterval: pomodoroInterval || 25,
        plannedStartDate: plannedStartDate || null,
        plannedStartTime: plannedStartTime || null,
        plannedDuration: plannedDuration || 60,
        clockRing: null,
        project: project || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    validateTask(task);
    const savedTask = saveTask(task);
    res.json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/tasks/:id/start
 * Start task timer
 */
router.post('/tasks/:id/start', (req, res) => {
  try {
    const { id } = req.params;
    const tasks = readTasks();

    // Stop any other active task
    tasks.forEach((task) => {
      if (task.inProgress && task.id !== id) {
        task.inProgress = false;
        task.startedAt = null;
      }
    });

    // Start the requested task
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.inProgress = true;
    task.startedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    saveTask(task);
    res.json(task);
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({ error: 'Failed to start task' });
  }
});

/**
 * POST /api/tasks/:id/stop
 * Stop task timer (pause)
 */
router.post('/tasks/:id/stop', (req, res) => {
  try {
    const { id } = req.params;
    const task = getTask(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.inProgress && task.startedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(task.startedAt).getTime()) / 1000
      );
      task.timeSpent += elapsed;
    }

    task.inProgress = false;
    task.startedAt = null;
    task.updatedAt = new Date().toISOString();

    saveTask(task);
    res.json(task);
  } catch (error) {
    console.error('Error stopping task:', error);
    res.status(500).json({ error: 'Failed to stop task' });
  }
});

/**
 * POST /api/tasks/:id/complete
 * Complete and archive task
 */
router.post('/tasks/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    const allTasks = readTasks();
    const taskIndex = allTasks.findIndex((t) => t.id === id);

    if (taskIndex < 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = allTasks[taskIndex];

    if (task.inProgress && task.startedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(task.startedAt).getTime()) / 1000
      );
      task.timeSpent += elapsed;
    }

    task.completed = true;
    task.archived = true;
    task.inProgress = false;
    task.startedAt = null;
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    // Update the completed task
    allTasks[taskIndex] = task;

    // If task is recurring, create a new task for the next occurrence
    if (task.recurring && task.dueDate) {
      const nextDueDate = calculateNextDueDate(
        task.dueDate,
        task.recurring,
        task.workingDaysOnly
      );
      // Calculate planned start date for recurring task
      // Use date string splitting to avoid UTC/local timezone mismatches
      let nextPlannedStartDate = null;
      if (task.plannedStartDate && task.dueDate) {
        const [dueY, dueM, dueD] = task.dueDate.split('-').map(Number);
        const [startY, startM, startD] = task.plannedStartDate
          .split('-')
          .map(Number);
        const dueMs = Date.UTC(dueY, dueM - 1, dueD);
        const startMs = Date.UTC(startY, startM - 1, startD);
        const offsetDays = Math.round((startMs - dueMs) / 86400000);
        const [nextY, nextM, nextD] = nextDueDate.split('-').map(Number);
        const nextStartDate = new Date(
          Date.UTC(nextY, nextM - 1, nextD + offsetDays)
        );
        const sy = nextStartDate.getUTCFullYear();
        const sm = String(nextStartDate.getUTCMonth() + 1).padStart(2, '0');
        const sd = String(nextStartDate.getUTCDate()).padStart(2, '0');
        nextPlannedStartDate = `${sy}-${sm}-${sd}`;
      } else if (task.plannedStartDate) {
        nextPlannedStartDate = calculateNextDueDate(
          task.plannedStartDate,
          task.recurring,
          task.workingDaysOnly
        );
      }

      const newTask = {
        id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
        description: task.description,
        dueDate: nextDueDate,
        dueTime: task.dueTime || null,
        priority: task.priority,
        recurring: task.recurring,
        details: task.details || null,
        isAppointment: task.isAppointment || false,
        reminderMinutes: task.reminderMinutes || null,
        workingDaysOnly: task.workingDaysOnly || false,
        completed: false,
        archived: false,
        inProgress: false,
        startedAt: null,
        timeSpent: 0,
        completedAt: null,
        links: task.links || [],
        pomodoroMode: task.pomodoroMode || false,
        pomodoroInterval: task.pomodoroInterval || 25,
        plannedStartDate: nextPlannedStartDate,
        plannedStartTime: task.plannedStartTime || null,
        plannedDuration: task.plannedDuration || 60,
        clockRing: null,
        project: task.project || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      allTasks.push(newTask);
    }

    // Write all changes at once
    writeTasks(allTasks);

    res.json(task);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

/**
 * POST /api/tasks/:id/restore
 * Move task from archive back to active list
 */
router.post('/tasks/:id/restore', (req, res) => {
  try {
    const { id } = req.params;
    const task = getTask(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.archived = false;
    task.completed = false;
    task.updatedAt = new Date().toISOString();

    saveTask(task);
    res.json(task);
  } catch (error) {
    console.error('Error restoring task:', error);
    res.status(500).json({ error: 'Failed to restore task' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Permanently delete task
 */
router.delete('/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const task = getTask(id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    deleteTask(id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

/**
 * POST /api/archive/cleanup
 * Move archived tasks completed before a specified date to archive files
 * and mark them with archivedToFile flag
 */
router.post('/archive/cleanup', (req, res) => {
  try {
    const { cutoffDate } = req.body;

    if (!cutoffDate) {
      return res.status(400).json({ error: 'Cutoff date is required' });
    }

    const tasks = readTasks();
    const cutoffTime = new Date(cutoffDate).getTime();

    // Find tasks to move (archived and completed before cutoff date)
    const tasksToMove = tasks.filter((task) => {
      if (!task.archived || !task.completedAt) {
        return false;
      }
      const completedTime = new Date(task.completedAt).getTime();
      return completedTime < cutoffTime;
    });

    if (tasksToMove.length === 0) {
      return res.json({
        success: true,
        moved: 0,
        message: 'No archived tasks found before that date',
      });
    }

    // Mark tasks as archivedToFile and organize by completion date
    const tasksByDate = {};
    tasksToMove.forEach((task) => {
      task.archivedToFile = true;
      // Extract date from completedAt timestamp (YYYY-MM-DD)
      const completedDate = new Date(task.completedAt)
        .toISOString()
        .split('T')[0];
      if (!tasksByDate[completedDate]) {
        tasksByDate[completedDate] = [];
      }
      tasksByDate[completedDate].push(task);
    });

    // Save tasks to their respective archive files by completion date
    Object.entries(tasksByDate).forEach(([dateStr, tasksForDate]) => {
      archiveTasks(dateStr, tasksForDate);
    });

    // Remove moved tasks from the main list
    const remainingTasks = tasks.filter((task) => !tasksToMove.includes(task));

    // Write the updated tasks back
    writeTasks(remainingTasks);

    // Return success
    res.json({
      success: true,
      moved: tasksToMove.length,
      message: `Moved ${tasksToMove.length} archived tasks to archive files`,
    });
  } catch (error) {
    console.error('Error cleaning archive:', error);
    res.status(500).json({ error: 'Failed to clean archive' });
  }
});

/**
 * GET /api/config
 * Returns application configuration
 */
router.get('/config', (_req, res) => {
  try {
    const config = readConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * GET /api/settings
 * Returns user settings
 */
router.get('/settings', (_req, res) => {
  try {
    const config = readConfig();
    res.json(config.userSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/settings
 * Updates user settings (full or partial)
 */
router.put('/settings', (req, res) => {
  try {
    const updates = req.body;

    // Validate update object
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid settings object' });
    }

    const config = updateUserSettings(updates);
    res.json(config.userSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * PUT /api/settings/timezone
 * Updates timezone settings specifically
 */
router.put('/settings/timezone', (req, res) => {
  try {
    const { timezone } = req.body;

    if (!timezone || typeof timezone !== 'object') {
      return res.status(400).json({ error: 'Invalid timezone object' });
    }

    const config = updateUserSettings({ timezone });
    res.json(config.userSettings.timezone);
  } catch (error) {
    console.error('Error updating timezone:', error);
    res.status(500).json({ error: 'Failed to update timezone' });
  }
});

/**
 * PUT /api/settings/daily-routine
 * Updates daily routine items
 */
router.put('/settings/daily-routine', (req, res) => {
  try {
    const { dailyRoutine } = req.body;

    if (!Array.isArray(dailyRoutine)) {
      return res.status(400).json({ error: 'dailyRoutine must be an array' });
    }

    // Validate items count
    if (dailyRoutine.length > 10) {
      return res
        .status(400)
        .json({ error: 'Maximum 10 daily routine items allowed' });
    }

    // Validate each item
    dailyRoutine.forEach((item) => {
      if (!item.id || !item.label || !item.icon) {
        throw new Error('Each item must have id, label, and icon');
      }
      if (typeof item.enabled !== 'boolean') {
        throw new Error('Each item must have enabled boolean flag');
      }
    });

    const config = updateUserSettings({ dailyRoutine });
    res.json(config.userSettings.dailyRoutine);
  } catch (error) {
    console.error('Error updating daily routine:', error);
    res.status(500).json({ error: 'Failed to update daily routine' });
  }
});

/**
 * POST /api/backup/import
 * Import backup data (tasks + config) from an exported JSON file
 */
router.post('/backup/import', (req, res) => {
  try {
    const { tasks, config } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res
        .status(400)
        .json({ error: 'Invalid backup: tasks must be an array' });
    }

    if (!config || typeof config !== 'object') {
      return res
        .status(400)
        .json({ error: 'Invalid backup: config must be an object' });
    }

    // Clear existing archive files before restoring
    clearAllArchiveFiles();

    // Separate tasks: those that were in archive files go back to archive files
    const tasksJsonTasks = tasks.filter((t) => !t.archivedToFile);
    const archiveFileTasks = tasks.filter((t) => t.archivedToFile);

    // Write tasks.json tasks
    writeTasks(tasksJsonTasks);

    // Restore archive file tasks to their respective archive files by completion date
    if (archiveFileTasks.length > 0) {
      const tasksByDate = {};
      archiveFileTasks.forEach((task) => {
        const completedDate = task.completedAt
          ? new Date(task.completedAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        if (!tasksByDate[completedDate]) {
          tasksByDate[completedDate] = [];
        }
        tasksByDate[completedDate].push(task);
      });

      Object.entries(tasksByDate).forEach(([dateStr, tasksForDate]) => {
        archiveTasks(dateStr, tasksForDate);
      });
    }

    if (config.mantra && typeof config.mantra === 'object') {
      const sanitize = (val, fb) =>
        typeof val === 'string' ? val.slice(0, 200) : fb;
      config.mantra.username = sanitize(config.mantra.username, 'user');
      config.mantra.hostname = sanitize(config.mantra.hostname, 'matrix');
      config.mantra.text = sanitize(config.mantra.text, '');
    }

    writeConfig(config);

    res.json({
      success: true,
      taskCount: tasks.length,
      message: `Imported ${tasksJsonTasks.length} tasks and ${archiveFileTasks.length} archived tasks`,
    });
  } catch (error) {
    console.error('Error importing backup:', error);
    res.status(500).json({ error: 'Failed to import backup' });
  }
});

/**
 * POST /api/tasks/import
 * Import tasks additively (merges with existing tasks, does not replace)
 * Accepts LLM-friendly format: { project: string, tasks: [{ description, priority?, dueDate?, ... }] }
 */
router.post('/tasks/import', (req, res) => {
  try {
    const { project, tasks: importTasks } = req.body;

    if (
      !importTasks ||
      !Array.isArray(importTasks) ||
      importTasks.length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'Invalid import: tasks must be a non-empty array' });
    }

    // Validate each task has at least a description
    for (let i = 0; i < importTasks.length; i++) {
      if (
        !importTasks[i].description ||
        importTasks[i].description.trim().length === 0
      ) {
        return res
          .status(400)
          .json({ error: `Task at index ${i} is missing a description` });
      }
    }

    const existingTasks = readTasks();
    const now = Date.now();
    const timestamp = new Date().toISOString();
    const projectName = project && project.trim() ? project.trim() : null;

    const newTasks = importTasks.map((t, index) => ({
      id: (now + index).toString(),
      description: t.description.trim(),
      dueDate: t.dueDate || null,
      dueTime: t.dueTime || null,
      priority: t.priority || 'medium',
      recurring: t.recurring || null,
      details: t.details || null,
      isAppointment: t.isAppointment || false,
      reminderMinutes: t.isAppointment ? t.reminderMinutes || 30 : null,
      workingDaysOnly:
        t.recurring === 'daily' ? t.workingDaysOnly || false : false,
      completed: false,
      archived: false,
      inProgress: false,
      startedAt: null,
      timeSpent: 0,
      completedAt: null,
      links: t.links || [],
      pomodoroMode: t.pomodoroMode || false,
      pomodoroInterval: t.pomodoroInterval || 25,
      plannedStartDate: t.plannedStartDate || null,
      plannedStartTime: t.plannedStartTime || null,
      plannedDuration: t.plannedDuration || 60,
      clockRing: null,
      project: projectName,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    writeTasks([...existingTasks, ...newTasks]);

    res.json({
      success: true,
      imported: newTasks.length,
      project: projectName,
      message: `Imported ${newTasks.length} tasks${projectName ? ` for project "${projectName}"` : ''}`,
    });
  } catch (error) {
    console.error('Error importing tasks:', error);
    res.status(500).json({ error: 'Failed to import tasks' });
  }
});

/**
 * PUT /api/config
 * Updates full configuration (mantra + user settings)
 */
router.put('/config', (req, res) => {
  try {
    const config = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Invalid config object' });
    }

    if (!config.mantra || typeof config.mantra !== 'object') {
      return res
        .status(400)
        .json({ error: 'Config must include mantra object' });
    }

    const sanitizeString = (val, fallback) =>
      typeof val === 'string' ? val.slice(0, 200) : fallback;

    config.mantra.username = sanitizeString(config.mantra.username, 'user');
    config.mantra.hostname = sanitizeString(config.mantra.hostname, 'matrix');
    config.mantra.text = sanitizeString(config.mantra.text, '');

    if (config.userSettings && config.userSettings.dailyRoutine) {
      if (!Array.isArray(config.userSettings.dailyRoutine)) {
        return res.status(400).json({ error: 'dailyRoutine must be an array' });
      }
      config.userSettings.dailyRoutine = config.userSettings.dailyRoutine
        .slice(0, 10)
        .map((item) => ({
          id: sanitizeString(item.id, ''),
          label: sanitizeString(item.label, ''),
          icon: sanitizeString(item.icon, ''),
          enabled: Boolean(item.enabled),
          startTime: item.startTime || null,
          duration: typeof item.duration === 'number' ? item.duration : 0,
          days: Array.isArray(item.days)
            ? item.days.filter((d) => typeof d === 'string')
            : [],
        }));
    }

    writeConfig(config);
    res.json(config);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

module.exports = router;
