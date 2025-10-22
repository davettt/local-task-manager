const express = require('express');
const {
  readTasks,
  getTask,
  saveTask,
  deleteTask,
  writeTasks,
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

  if (task.links && Array.isArray(task.links)) {
    task.links.forEach((link) => {
      try {
        // eslint-disable-next-line no-new
        new URL(link);
      } catch {
        throw new Error(`Invalid URL: ${link}`);
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
function calculateNextDueDate(currentDate, recurring) {
  if (!currentDate || !recurring) {
    return currentDate;
  }

  // Parse date string (YYYY-MM-DD) and create date in local timezone
  const [year, month, day] = currentDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (recurring === 'daily') {
    date.setDate(date.getDate() + 1);
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
 * GET /api/tasks/archived
 * Returns all archived (completed) tasks
 */
router.get('/tasks/archived', (_req, res) => {
  try {
    const tasks = readTasks();
    const archivedTasks = tasks.filter((task) => task.archived);
    res.json(archivedTasks);
  } catch (error) {
    console.error('Error fetching archived tasks:', error);
    res.status(500).json({ error: 'Failed to fetch archived tasks' });
  }
});

/**
 * POST /api/tasks
 * Create or update a task
 */
router.post('/tasks', (req, res) => {
  try {
    const { id, description, dueDate, dueTime, priority, links, recurring } =
      req.body;

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
          links: links || [],
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
          completed: false,
          archived: false,
          inProgress: false,
          startedAt: null,
          timeSpent: 0,
          completedAt: null,
          links: links || [],
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
        completed: false,
        archived: false,
        inProgress: false,
        startedAt: null,
        timeSpent: 0,
        completedAt: null,
        links: links || [],
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
      const nextDueDate = calculateNextDueDate(task.dueDate, task.recurring);
      const newTask = {
        id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
        description: task.description,
        dueDate: nextDueDate,
        dueTime: task.dueTime || null,
        priority: task.priority,
        recurring: task.recurring,
        completed: false,
        archived: false,
        inProgress: false,
        startedAt: null,
        timeSpent: 0,
        completedAt: null,
        links: task.links || [],
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

module.exports = router;
