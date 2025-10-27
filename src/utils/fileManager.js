const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || './local_data';
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

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

/**
 * Get archive file path for a given date
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Path to archive file
 */
function getArchiveFilePath(dateStr) {
  const fileName = `archive_${dateStr.replace(/-/g, '')}.json`;
  return path.join(DATA_DIR, fileName);
}

/**
 * Read all tasks from all archive files
 * @returns {Array} Array of archived task objects
 */
function readArchivedTasks() {
  try {
    ensureDataDir();
    const files = fs.readdirSync(DATA_DIR);
    const archivedTasks = [];

    files.forEach((file) => {
      if (file.startsWith('archive_') && file.endsWith('.json')) {
        const filePath = path.join(DATA_DIR, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          archivedTasks.push(...parsed.tasks);
        }
      }
    });

    return archivedTasks;
  } catch (error) {
    console.error('Error reading archived tasks:', error);
    return [];
  }
}

/**
 * Append tasks to archive file for a given date
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {Array} tasksToArchive - Tasks to add to archive
 */
function archiveTasks(dateStr, tasksToArchive) {
  try {
    ensureDataDir();
    const filePath = getArchiveFilePath(dateStr);

    let archiveData = { tasks: [] };

    // If file exists, read existing data
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      archiveData = JSON.parse(data);
    }

    // Add new tasks to archive
    archiveData.tasks.push(...tasksToArchive);

    fs.writeFileSync(filePath, JSON.stringify(archiveData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error archiving tasks:', error);
    throw error;
  }
}

/**
 * Clean up archive files older than specified days
 * @param {number} daysOld - Delete archives older than this many days (default: 45)
 */
function cleanupOldArchives(daysOld = 45) {
  try {
    ensureDataDir();
    const files = fs.readdirSync(DATA_DIR);
    const now = new Date().getTime();
    const cutoffTime = now - daysOld * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      if (file.startsWith('archive_') && file.endsWith('.json')) {
        const filePath = path.join(DATA_DIR, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          // eslint-disable-next-line no-console
          console.log(`Deleted old archive file: ${file}`);
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up old archives:', error);
  }
}

/**
 * Get default config
 * @returns {Object} Default configuration
 */
function getDefaultConfig() {
  return {
    mantra: {
      enabled: true,
      text: 'Name it. Trace it. Fix it. Share it.',
      descriptions: {
        nameIt: "What's the issue?",
        traceIt: 'Why is it happening?',
        fixIt: "What's the solution + execute it",
        shareIt: 'Keep people in the loop',
      },
    },
  };
}

/**
 * Initialize config file with defaults if it doesn't exist
 */
function initializeConfigFile() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(getDefaultConfig(), null, 2),
      'utf8'
    );
  }
}

/**
 * Read configuration from file
 * @returns {Object} Configuration object
 */
function readConfig() {
  try {
    initializeConfigFile();
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading config file:', error);
    return getDefaultConfig();
  }
}

/**
 * Write configuration to file
 * @param {Object} config - Configuration object
 */
function writeConfig(config) {
  try {
    ensureDataDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing config file:', error);
    throw error;
  }
}

module.exports = {
  readTasks,
  writeTasks,
  getTask,
  saveTask,
  deleteTask,
  readArchivedTasks,
  archiveTasks,
  getArchiveFilePath,
  cleanupOldArchives,
  ensureDataDir,
  initializeTasksFile,
  readConfig,
  writeConfig,
  initializeConfigFile,
};
