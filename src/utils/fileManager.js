const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || './local_data';
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Initialize tasks file with empty tasks array if it doesn't exist
 */
function initializeTasksFile() {
  ensureDataDir();
  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify({ tasks: [] }, null, 2));
  }
}

/**
 * Read all tasks from file
 * @returns {Array} Array of task objects
 */
function readTasks() {
  try {
    initializeTasksFile();
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.tasks || [];
  } catch (error) {
    console.error('Error reading tasks file:', error);
    return [];
  }
}

/**
 * Write tasks to file
 * @param {Array} tasks - Array of task objects
 */
function writeTasks(tasks) {
  try {
    ensureDataDir();
    fs.writeFileSync(TASKS_FILE, JSON.stringify({ tasks }, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing tasks file:', error);
    throw error;
  }
}

/**
 * Get a single task by ID
 * @param {string} taskId - Task ID
 * @returns {Object|null} Task object or null if not found
 */
function getTask(taskId) {
  const tasks = readTasks();
  return tasks.find((task) => task.id === taskId) || null;
}

/**
 * Add or update a task
 * @param {Object} task - Task object
 * @returns {Object} Updated task object
 */
function saveTask(task) {
  const tasks = readTasks();
  const existingIndex = tasks.findIndex((t) => t.id === task.id);

  if (existingIndex >= 0) {
    tasks[existingIndex] = task;
  } else {
    tasks.push(task);
  }

  writeTasks(tasks);
  return task;
}

/**
 * Delete a task by ID
 * @param {string} taskId - Task ID
 */
function deleteTask(taskId) {
  const tasks = readTasks();
  const filtered = tasks.filter((task) => task.id !== taskId);
  writeTasks(filtered);
}

module.exports = {
  readTasks,
  writeTasks,
  getTask,
  saveTask,
  deleteTask,
  ensureDataDir,
  initializeTasksFile,
};
