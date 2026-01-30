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
    const defaults = {
      lastSync: null,
      taskMappings: {}, // local_id -> todoist_id mapping
      localChecksums: {}, // Local task checksums for detecting local changes
      todoistChecksums: {}, // Todoist task checksums for detecting remote changes
    };

    try {
      if (fs.existsSync(this.metadataPath)) {
        const content = fs.readFileSync(this.metadataPath, 'utf-8');
        const loaded = JSON.parse(content);
        // Merge with defaults to handle missing fields from older metadata files
        return {
          ...defaults,
          ...loaded,
          // Ensure nested objects exist
          taskMappings: loaded.taskMappings || {},
          localChecksums: loaded.localChecksums || {},
          todoistChecksums: loaded.todoistChecksums || {},
        };
      }
      return defaults;
    } catch (_error) {
      return defaults;
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
   * Generate a checksum for a local task to detect changes
   * @param {Object} task - Local task object
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
      recurring: task.recurring,
      updatedAt: task.updatedAt,
    };
    return JSON.stringify(relevant);
  }

  /**
   * Generate a checksum for a Todoist task to detect changes
   * @param {Object} todoistTask - Todoist API task object
   * @returns {string} Checksum
   */
  generateTodoistTaskChecksum(todoistTask) {
    const relevant = {
      content: todoistTask.content,
      is_completed: todoistTask.is_completed,
      priority: todoistTask.priority,
      due: todoistTask.due,
      description: todoistTask.description,
      labels: todoistTask.labels,
      is_recurring: todoistTask.due?.is_recurring,
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
      const localChecksum = this.generateChecksum(task);
      const todoistId = metadata.taskMappings[task.id];

      if (!todoistId) {
        // New local task (not yet synced to Todoist)
        if (!task.completed) {
          changes.created.push(task);
        }
      } else {
        // For synced tasks, check if LOCAL checksum has changed
        // OR if local and Todoist states differ (out of sync)
        // metadata.localChecksums tracks what the local version looked like at last sync
        const storedLocalChecksum = metadata.localChecksums?.[task.id];
        const todoistChecksum = metadata.todoistChecksums?.[task.id];

        // Push update if:
        // 1. Local has changed since last sync, OR
        // 2. Local and Todoist are out of sync (local != todoist)
        const localChanged =
          storedLocalChecksum && storedLocalChecksum !== localChecksum;
        const outOfSync = localChecksum !== todoistChecksum;

        if (localChanged || outOfSync) {
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
          // Store checksums after successful push
          metadata.localChecksums[task.id] = this.generateChecksum(task);
          metadata.todoistChecksums[task.id] =
            this.generateTodoistTaskChecksum(todoistTask);
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

          // Skip updating task fields for recurring tasks - Todoist REST API v2
          // doesn't support setting recurrence patterns, so we avoid the updateTask
          // call to preserve recurrence data. However, we still handle completion
          // status below since that uses a separate endpoint.
          if (!task.recurring) {
            // Update task fields (don't include is_completed - must use close/reopen endpoints)
            await this.todoist.updateTask(todoistId, {
              content: task.description,
              description: task.details || '',
              priority: this.mapLocalPriorityToTodoist(task.priority),
              due_date: task.dueDate || undefined,
              labels: task.labels || [],
            });
          }

          // Handle completion status separately using close/reopen endpoints
          // This works for both regular and recurring tasks
          const storedTodoistChecksum = metadata.todoistChecksums?.[task.id];
          const storedTodoistTask = storedTodoistChecksum
            ? JSON.parse(storedTodoistChecksum)
            : null;
          const wasCompleted = storedTodoistTask?.is_completed || false;

          if (task.completed && !wasCompleted) {
            // Mark as completed
            await this.todoist.completeTask(todoistId);
          } else if (!task.completed && wasCompleted) {
            // Mark as not completed
            await this.todoist.reopenTask(todoistId);
          }

          // Fetch updated task to get final state
          // Note: For recurring tasks after completion, Todoist creates a new instance
          // so getTask may return different data or 404 for completed recurring tasks
          let finalTodoistTask = null;
          try {
            finalTodoistTask = await this.todoist.getTask(todoistId);
          } catch {
            // Task may no longer exist if it was a recurring task that was completed
            // Todoist handles recurring task completion by creating the next occurrence
          }

          // Store checksums after successful push
          metadata.localChecksums[task.id] = this.generateChecksum(task);
          if (finalTodoistTask) {
            metadata.todoistChecksums[task.id] =
              this.generateTodoistTaskChecksum(finalTodoistTask);
          }
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
          delete metadata.localChecksums[deletion.localId];
          delete metadata.todoistChecksums[deletion.localId];
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
      // Note: Only fetch active tasks. Todoist is used for creating new tasks only.
      // All updates/completions should be managed locally to avoid sync conflicts.
      const remoteTasks = await this.todoist.getAllTasks();
      const remoteChanges = {
        created: [],
        updated: [],
        deleted: [],
      };

      remoteTasks.forEach((todoistTask) => {
        // Find corresponding local task
        let localTask = null;
        let localTaskId = null;

        for (const [lId, tId] of Object.entries(metadata.taskMappings)) {
          if (tId === todoistTask.id) {
            localTask = localTasks.find((t) => t.id === lId);
            localTaskId = lId;
            break;
          }
        }

        if (!localTask) {
          // Remote task doesn't exist locally - it's new from Todoist
          remoteChanges.created.push(todoistTask);
        } else {
          // Check if remote task was updated using checksum comparison
          // Since Todoist API doesn't reliably return updated_at, we compare content
          const remoteChecksum = this.generateTodoistTaskChecksum(todoistTask);
          const storedTodoistChecksum =
            metadata.todoistChecksums?.[localTaskId];

          // Detect change if:
          // 1. We have no previous checksum (first sync/migration), OR
          // 2. The Todoist content has changed
          if (
            !storedTodoistChecksum ||
            storedTodoistChecksum !== remoteChecksum
          ) {
            remoteChanges.updated.push(todoistTask);
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
          // Store both checksums: local (what we have now) and todoist (what we pulled)
          metadata.localChecksums[newLocalTask.id] =
            this.generateChecksum(newLocalTask);
          metadata.todoistChecksums[newLocalTask.id] =
            this.generateTodoistTaskChecksum(todoistTask);
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
              // Store both checksums after pulling update
              metadata.localChecksums[localTaskId] =
                this.generateChecksum(updated);
              metadata.todoistChecksums[localTaskId] =
                this.generateTodoistTaskChecksum(todoistTask);
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

    // Check if task is recurring
    // Note: Todoist API v2 doesn't provide recurrence pattern details,
    // so we default to "daily" if is_recurring is true
    const isRecurring = todoistTask.due?.is_recurring || false;
    const recurring = isRecurring ? 'daily' : null;

    return {
      id: localId,
      description: todoistTask.content,
      dueDate: todoistTask.due ? todoistTask.due.date : null,
      dueTime: null,
      priority: this.mapTodoistPriorityToLocal(todoistTask.priority),
      recurring,
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
