/**
 * Todoist API Client
 * Provides methods to interact with Todoist REST API v2
 * https://developer.todoist.com/rest/v2/
 */

const axios = require('axios');

class TodoistClient {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error('Todoist API token is required');
    }

    this.apiToken = apiToken;
    this.baseUrl = 'https://api.todoist.com/rest/v2';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all active tasks from Todoist
   * @returns {Promise<Array>} Array of task objects
   */
  async getAllTasks() {
    try {
      const response = await this.client.get('/tasks');
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }
  }

  /**
   * Get a single task by ID
   * @param {string} taskId - Todoist task ID
   * @returns {Promise<Object>} Task object
   */
  async getTask(taskId) {
    try {
      const response = await this.client.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch task ${taskId}: ${error.message}`);
    }
  }

  /**
   * Create a new task in Todoist
   * @param {Object} taskData - Task data
   * @param {string} taskData.content - Task title (required)
   * @param {string} taskData.description - Task description
   * @param {number} taskData.priority - Priority level (1-4, 4 is highest)
   * @param {string} taskData.due_date - Due date (e.g., "tomorrow", "2024-12-25")
   * @param {string} taskData.due_datetime - Due datetime (e.g., "2024-12-25T10:30:00")
   * @param {string} taskData.project_id - Project ID
   * @param {string} taskData.section_id - Section ID
   * @param {Array} taskData.labels - Array of label names
   * @returns {Promise<Object>} Created task object
   */
  async createTask(taskData) {
    try {
      const response = await this.client.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  /**
   * Update an existing task
   * @param {string} taskId - Todoist task ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated task object
   */
  async updateTask(taskId, updates) {
    try {
      const response = await this.client.post(`/tasks/${taskId}`, updates);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update task ${taskId}: ${error.message}`);
    }
  }

  /**
   * Complete a task (mark as done)
   * @param {string} taskId - Todoist task ID
   * @returns {Promise<void>}
   */
  async completeTask(taskId) {
    try {
      await this.client.post(`/tasks/${taskId}/close`);
    } catch (error) {
      throw new Error(`Failed to complete task ${taskId}: ${error.message}`);
    }
  }

  /**
   * Reopen a task (mark as not done)
   * @param {string} taskId - Todoist task ID
   * @returns {Promise<void>}
   */
  async reopenTask(taskId) {
    try {
      await this.client.post(`/tasks/${taskId}/reopen`);
    } catch (error) {
      throw new Error(`Failed to reopen task ${taskId}: ${error.message}`);
    }
  }

  /**
   * Delete a task
   * @param {string} taskId - Todoist task ID
   * @returns {Promise<void>}
   */
  async deleteTask(taskId) {
    try {
      await this.client.delete(`/tasks/${taskId}`);
    } catch (error) {
      throw new Error(`Failed to delete task ${taskId}: ${error.message}`);
    }
  }

  /**
   * Get all projects
   * @returns {Promise<Array>} Array of project objects
   */
  async getProjects() {
    try {
      const response = await this.client.get('/projects');
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }

  /**
   * Get all sections for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of section objects
   */
  async getSections(projectId) {
    try {
      const response = await this.client.get('/sections', {
        params: { project_id: projectId },
      });
      return response.data || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch sections for project ${projectId}: ${error.message}`
      );
    }
  }

  /**
   * Get all labels
   * @returns {Promise<Array>} Array of label objects
   */
  async getLabels() {
    try {
      const response = await this.client.get('/labels');
      return response.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch labels: ${error.message}`);
    }
  }

  /**
   * Validate API token by making a simple request
   * @returns {Promise<boolean>} True if token is valid
   */
  async validateToken() {
    try {
      await this.getProjects();
      return true;
    } catch (_error) {
      return false;
    }
  }
}

module.exports = TodoistClient;
