/**
 * Bidirectional Sync Manager
 * Syncs tasks between local storage and Todoist
 * Strategy: Last-modified-wins conflict resolution
 */

const fs = require('fs');
const path = require('path');

class SyncManager {
  constructor(todoist, dataDir = './local_data') {
    this.todoist = todoist;
    this.dataDir = dataDir;
    this.tasksPath = path.join(dataDir, 'tasks.json');
    this.metadataPath = path.join(dataDir, 'todoist-metadata.json');
  }

  /**
   * Load local tasks from JSON file
   * @returns {Array} Array of task objects
   */
  loadLocalTasks() {
    try {
      if (fs.existsSync(this.tasksPath)) {
        const content = fs.readFileSync(this.tasksPath, 'utf-8');
        const parsed = JSON.parse(content);
        // Handle both array and object with tasks property
        return parsed.tasks && Array.isArray(parsed.tasks)
          ? parsed.tasks
          : Array.isArray(parsed)
            ? parsed
            : [];
      }
      return [];
    } catch (error) {
      throw new Error(`Failed to load local tasks: ${error.message}`);
    }
  }

  /**
   * Load sync metadata (tracks which tasks are synced)
   * @returns {Object} Metadata object
   */
  loadMetadata() {
    try {
      if (fs.existsSync(this.metadataPath)) {
        const content = fs.readFileSync(this.metadataPath, 'utf-8');
        return JSON.parse(content);
      }
      return {
        lastSync: null,
        taskMappings: {}, // local_id -> todoist_id mapping
        checksums: {}, // Store checksums to detect changes
      };
    } catch (error) {
      return {
        lastSync: null,
        taskMappings: {},
        checksums: {},
      };
    }
  }

  /**
   * Save sync metadata
   * @param {Object} metadata - Metadata to save
   */
  saveMetadata(metadata) {
    try {
      fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      throw new Error(`Failed to save metadata: ${error.message}`);
    }
  }

  /**
   * Save local tasks to JSON file
   * @param {Array} tasks - Tasks array to save
   */
  saveLocalTasks(tasks) {
    try {
      // Check if original format was { tasks: [...] }
      const currentContent = fs.readFileSync(this.tasksPath, 'utf-8');
      const currentData = JSON.parse(currentContent);
      const dataToSave = currentData.tasks ? { tasks } : tasks;
      fs.writeFileSync(this.tasksPath, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
      throw new Error(`Failed to save local tasks: ${error.message}`);
    }
  }

  /**
   * Generate a checksum for a task to detect changes
   * @param {Object} task - Task object
   * @returns {string} Checksum
   */
  generateChecksum(task) {
    const relevant = {
      description: task.description,
      completed: task.completed,
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      details: task.details,
      updatedAt: task.updatedAt,
    };
    return JSON.stringify(relevant);
  }

  /**
   * Get changes made locally (since last sync)
   * @param {Array} localTasks - Current local tasks
   * @param {Object} metadata - Sync metadata
   * @returns {Object} Object with arrays: created, updated, deleted
   */
  detectLocalChanges(localTasks, metadata) {
    const changes = {
      created: [],
      updated: [],
      deleted: [],
    };

    // Find created and updated tasks
    localTasks.forEach((task) => {
      const checksum = this.generateChecksum(task);
      const todoistId = metadata.taskMappings[task.id];

      if (!todoistId) {
        // New local task (not yet synced to Todoist)
        if (!task.completed) {
          changes.created.push(task);
        }
      } else if (metadata.checksums[task.id] !== checksum) {
        // Task was modified locally
        if (!task.completed) {
          changes.updated.push(task);
        }
      }
    });

    // Find deleted tasks
    Object.keys(metadata.taskMappings).forEach((localId) => {
      const task = localTasks.find((t) => t.id === localId);
      if (!task) {
        // Task was deleted locally
        changes.deleted.push({
          localId,
          todoistId: metadata.taskMappings[localId],
        });
      }
    });

    return changes;
  }

  /**
   * Perform bidirectional sync
   * @returns {Promise<Object>} Sync report
   */
  async bidirectionalSync() {
    const syncReport = {
      startTime: new Date(),
      status: 'pending',
      localChanges: null,
      remoteChanges: null,
      conflicts: [],
      synced: {
        created: 0,
        updated: 0,
        deleted: 0,
        pulled: 0,
      },
      errors: [],
    };

    try {
      // Load current state
      const localTasks = this.loadLocalTasks();
      const metadata = this.loadMetadata();

      // Step 1: Detect local changes
      const localChanges = this.detectLocalChanges(localTasks, metadata);
      syncReport.localChanges = localChanges;

      // Step 2: Push local changes to Todoist
      for (const task of localChanges.created) {
        try {
          const todoistTask = await this.todoist.createTask({
            content: task.description,
            description: task.details || '',
            priority: this.mapLocalPriorityToTodoist(task.priority),
            due_date: task.dueDate || undefined,
            labels: task.labels || [],
          });

          // Map local task ID to Todoist task ID
          metadata.taskMappings[task.id] = todoistTask.id;
          metadata.checksums[task.id] = this.generateChecksum(task);
          syncReport.synced.created++;
        } catch (error) {
          syncReport.errors.push({
            type: 'create',
            taskId: task.id,
            message: error.message,
          });
        }
      }

      for (const task of localChanges.updated) {
        try {
          const todoistId = metadata.taskMappings[task.id];
          await this.todoist.updateTask(todoistId, {
            content: task.description,
            description: task.details || '',
            priority: this.mapLocalPriorityToTodoist(task.priority),
            due_date: task.dueDate || undefined,
            labels: task.labels || [],
          });

          metadata.checksums[task.id] = this.generateChecksum(task);
          syncReport.synced.updated++;
        } catch (error) {
          syncReport.errors.push({
            type: 'update',
            taskId: task.id,
            message: error.message,
          });
        }
      }

      for (const deletion of localChanges.deleted) {
        try {
          await this.todoist.deleteTask(deletion.todoistId);
          delete metadata.taskMappings[deletion.localId];
          delete metadata.checksums[deletion.localId];
          syncReport.synced.deleted++;
        } catch (error) {
          syncReport.errors.push({
            type: 'delete',
            taskId: deletion.localId,
            message: error.message,
          });
        }
      }

      // Step 3: Pull remote changes from Todoist
      const remoteTasks = await this.todoist.getAllTasks();
      const remoteChanges = {
        created: [],
        updated: [],
        deleted: [],
      };

      remoteTasks.forEach((todoistTask) => {
        // Find corresponding local task
        let localTask = null;

        for (const [lId, tId] of Object.entries(metadata.taskMappings)) {
          if (tId === todoistTask.id) {
            localTask = localTasks.find((t) => t.id === lId);
            break;
          }
        }

        if (!localTask) {
          // Remote task doesn't exist locally - it's new from Todoist
          remoteChanges.created.push(todoistTask);
        } else {
          // Check if remote task was updated
          // We'll use the updated_at field from Todoist API if available
          if (todoistTask.updated_at && localTask.updatedAt) {
            const remoteTime = new Date(todoistTask.updated_at).getTime();
            const localTime = new Date(localTask.updatedAt).getTime();

            if (remoteTime > localTime) {
              remoteChanges.updated.push(todoistTask);
            }
          }
        }
      });

      // Check for locally deleted but remotely existing tasks
      Object.entries(metadata.taskMappings).forEach(([localId, todoistId]) => {
        const stillExistsRemote = remoteTasks.some((t) => t.id === todoistId);
        const stillExistsLocal = localTasks.some((t) => t.id === localId);

        if (!stillExistsLocal && stillExistsRemote) {
          // Task was deleted locally but still exists on Todoist
          remoteChanges.deleted.push({ todoistId, localId });
        }
      });

      syncReport.remoteChanges = remoteChanges;

      // Step 4: Apply remote changes to local
      for (const todoistTask of remoteChanges.created) {
        try {
          const newLocalTask = this.todoistTaskToLocal(todoistTask);
          localTasks.push(newLocalTask);
          metadata.taskMappings[newLocalTask.id] = todoistTask.id;
          metadata.checksums[newLocalTask.id] =
            this.generateChecksum(newLocalTask);
          syncReport.synced.pulled++;
        } catch (error) {
          syncReport.errors.push({
            type: 'pull_create',
            todoistId: todoistTask.id,
            message: error.message,
          });
        }
      }

      for (const todoistTask of remoteChanges.updated) {
        try {
          // Find local task to update
          let localTaskId = null;
          for (const [lId, tId] of Object.entries(metadata.taskMappings)) {
            if (tId === todoistTask.id) {
              localTaskId = lId;
              break;
            }
          }

          if (localTaskId) {
            const localIndex = localTasks.findIndex(
              (t) => t.id === localTaskId
            );
            if (localIndex >= 0) {
              const updated = this.todoistTaskToLocal(todoistTask);
              updated.id = localTaskId;
              localTasks[localIndex] = updated;
              metadata.checksums[localTaskId] = this.generateChecksum(updated);
              syncReport.synced.pulled++;
            }
          }
        } catch (error) {
          syncReport.errors.push({
            type: 'pull_update',
            todoistId: todoistTask.id,
            message: error.message,
          });
        }
      }

      // Save updated local tasks and metadata
      this.saveLocalTasks(localTasks);
      metadata.lastSync = new Date().toISOString();
      this.saveMetadata(metadata);

      syncReport.status = 'success';
    } catch (error) {
      syncReport.status = 'error';
      syncReport.errors.push({
        type: 'sync_fatal',
        message: error.message,
      });
    }

    syncReport.endTime = new Date();
    syncReport.duration = syncReport.endTime - syncReport.startTime;

    return syncReport;
  }

  /**
   * Map local priority to Todoist priority
   * Local: "high", "medium", "low"
   * Todoist: 1-4 (4 is highest)
   * @param {string} localPriority - Local priority
   * @returns {number} Todoist priority
   */
  mapLocalPriorityToTodoist(localPriority) {
    const map = {
      high: 3,
      medium: 2,
      low: 1,
    };
    return map[localPriority] || 1;
  }

  /**
   * Map Todoist priority to local priority
   * @param {number} todoistPriority - Todoist priority (1-4)
   * @returns {string} Local priority
   */
  mapTodoistPriorityToLocal(todoistPriority) {
    const map = {
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'high',
    };
    return map[todoistPriority] || 'low';
  }

  /**
   * Convert Todoist task to local task format
   * @param {Object} todoistTask - Task from Todoist API
   * @returns {Object} Local task format
   */
  todoistTaskToLocal(todoistTask) {
    // Generate a local ID if not already mapped
    const localId = `todoist_${todoistTask.id}`;

    return {
      id: localId,
      description: todoistTask.content,
      dueDate: todoistTask.due ? todoistTask.due.date : null,
      dueTime: null,
      priority: this.mapTodoistPriorityToLocal(todoistTask.priority),
      recurring: null,
      details: todoistTask.description || '',
      isAppointment: false,
      reminderMinutes: null,
      workingDaysOnly: false,
      completed: todoistTask.is_completed || false,
      archived: false,
      inProgress: false,
      startedAt: null,
      timeSpent: 0,
      completedAt: todoistTask.is_completed ? new Date().toISOString() : null,
      links: [],
      createdAt: todoistTask.created_at || new Date().toISOString(),
      updatedAt: todoistTask.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Get last sync time
   * @returns {Date|null} Last sync time or null if never synced
   */
  getLastSyncTime() {
    const metadata = this.loadMetadata();
    return metadata.lastSync ? new Date(metadata.lastSync) : null;
  }
}

module.exports = SyncManager;
