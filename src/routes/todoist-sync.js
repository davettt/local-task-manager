/**
 * Todoist Sync Routes
 * Endpoints for configuring and triggering Todoist synchronization
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const TodoistClient = require('../todoist-client');
const SyncManager = require('../sync-manager');

const router = express.Router();

// Middleware to check if Todoist is configured
const checkTodoistConfig = (req, res, next) => {
  const token = process.env.TODOIST_API_TOKEN;
  if (!token) {
    return res.status(400).json({
      error:
        'Todoist API token not configured. Please set TODOIST_API_TOKEN in .env file.',
    });
  }
  req.todoistToken = token;
  next();
};

/**
 * Setup/Configure Todoist API token
 * POST /api/todoist/setup
 * Body: { token: "..." }
 */
router.post('/setup', (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.trim() === '') {
      return res.status(400).json({
        error: 'Invalid token provided',
      });
    }

    // Update .env file
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      // Replace or add TODOIST_API_TOKEN
      if (envContent.includes('TODOIST_API_TOKEN=')) {
        envContent = envContent.replace(
          /TODOIST_API_TOKEN=.*/,
          `TODOIST_API_TOKEN=${token}`
        );
      } else {
        envContent += `\nTODOIST_API_TOKEN=${token}`;
      }
    } else {
      envContent = `TODOIST_API_TOKEN=${token}`;
    }

    fs.writeFileSync(envPath, envContent);

    // Update process.env for current session
    process.env.TODOIST_API_TOKEN = token;

    res.json({
      success: true,
      message: 'Todoist API token configured successfully',
      note: 'Please restart the server for changes to take full effect',
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({
      error: 'Failed to configure Todoist',
    });
  }
});

/**
 * Check Todoist connection status
 * GET /api/todoist/status
 */
router.get('/status', checkTodoistConfig, async (req, res) => {
  try {
    const todoist = new TodoistClient(req.todoistToken);
    const isValid = await todoist.validateToken();

    if (!isValid) {
      return res.status(401).json({
        connected: false,
        error: 'Invalid Todoist API token',
      });
    }

    const projects = await todoist.getProjects();
    const lastSync = new SyncManager(
      todoist,
      process.env.DATA_DIR || './local_data'
    ).getLastSyncTime();

    res.json({
      connected: true,
      projects: projects.length,
      lastSync,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      connected: false,
      error: 'Failed to check Todoist status',
    });
  }
});

/**
 * Trigger manual bidirectional sync
 * POST /api/todoist/sync
 */
router.post('/sync', checkTodoistConfig, async (req, res) => {
  try {
    const todoist = new TodoistClient(req.todoistToken);
    const dataDir = process.env.DATA_DIR || './local_data';
    const syncManager = new SyncManager(todoist, dataDir);

    const syncReport = await syncManager.bidirectionalSync();

    res.json({
      success: syncReport.status === 'success',
      report: syncReport,
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform sync',
      message: error.message,
    });
  }
});

/**
 * Get sync history/status
 * GET /api/todoist/sync-status
 */
router.get('/sync-status', checkTodoistConfig, (req, res) => {
  try {
    const dataDir = process.env.DATA_DIR || './local_data';
    const metadataPath = path.join(dataDir, 'todoist-metadata.json');

    let metadata = {
      lastSync: null,
      taskMappings: {},
      checksums: {},
    };

    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }

    res.json({
      lastSync: metadata.lastSync,
      taskCount: Object.keys(metadata.taskMappings).length,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
    });
  }
});

/**
 * Get Todoist projects (for UI display)
 * GET /api/todoist/projects
 */
router.get('/projects', checkTodoistConfig, async (req, res) => {
  try {
    const todoist = new TodoistClient(req.todoistToken);
    const projects = await todoist.getProjects();

    res.json({
      projects,
    });
  } catch (error) {
    console.error('Projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch Todoist projects',
    });
  }
});

module.exports = router;
