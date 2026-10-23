require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes/api');
const { initializeTasksFile, cleanupOldArchives, ensureDataDir } = require('./utils/fileManager');

// CSRF defence for a local app is the Origin check below (project-standards § CSRF Protection):
// there are no cookies or sessions for a token to protect
const app = express(); // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
// Loopback only: the API has no authentication, so it must not be reachable from the network
const HOST = process.env.HOST || '127.0.0.1';
const DATA_DIR = process.env.DATA_DIR || './local_data';
const LOCK_FILE = path.join(DATA_DIR, '.lock');

// ===================================
// Port Availability Functions
// ===================================

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} True if port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, HOST);
  });
}

/**
 * Find next available port starting from a base port
 * @param {number} startPort - Port to start checking from
 * @returns {Promise<number>} First available port
 */
async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < startPort + 10) {
    // Check up to 10 ports
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error(`No available ports found between ${startPort} and ${port - 1}`);
}

// ===================================
// Single Instance Lock
// ===================================

/**
 * Check if a process is running
 * @param {number} pid - Process ID to check
 * @returns {boolean} True if process is running
 */
function isProcessRunning(pid) {
  try {
    // Sending signal 0 checks if process exists without actually sending a signal
    process.kill(pid, 0);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Clean up lock file on exit
 */
function cleanup() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
      // eslint-disable-next-line no-console
      console.log('\nServer stopped, lock file removed.');
    }
  } catch (error) {
    console.error('Error removing lock file:', error.message);
  }
}

// ===================================
// Server Initialization
// ===================================

(async () => {
  try {
    // Ensure data directory exists
    ensureDataDir();

    // Check if another instance is already running
    if (fs.existsSync(LOCK_FILE)) {
      try {
        const lockData = fs.readFileSync(LOCK_FILE, 'utf-8');
        const lockInfo = JSON.parse(lockData);

        // Check if the process is still running
        if (isProcessRunning(lockInfo.pid)) {
          console.error(`
╔════════════════════════════════════════════════╗
║   ⚠️  ERROR: Server Already Running            ║
╠════════════════════════════════════════════════╣
║                                                ║
║  Another instance is already running:          ║
║  PID:       ${String(lockInfo.pid).padEnd(35)} ║
║  Started:   ${new Date(lockInfo.started).toLocaleString().padEnd(35)} ║
║  Port:      ${String(lockInfo.port || 'detecting...').padEnd(35)} ║
║                                                ║
║  To start a new instance:                      ║
║  1. Stop the existing server (Ctrl+C)          ║
║  2. Or manually delete: local_data/.lock       ║
║                                                ║
╚════════════════════════════════════════════════╝
          `);
          process.exit(1);
        } else {
          // Stale lock file - process is no longer running
          // eslint-disable-next-line no-console
          console.log('Removing stale lock file from previous crashed instance...');
          fs.unlinkSync(LOCK_FILE);
        }
      } catch (_error) {
        // Lock file is corrupted, remove it and continue
        console.warn('Lock file corrupted, removing...');
        fs.unlinkSync(LOCK_FILE);
      }
    }

    // Create lock file
    fs.writeFileSync(
      LOCK_FILE,
      JSON.stringify(
        {
          pid: process.pid,
          started: new Date().toISOString(),
          port: null,
        },
        null,
        2
      )
    );

    // Handle various exit scenarios
    process.on('SIGINT', () => {
      // eslint-disable-next-line no-console
      console.log('\n\nReceived SIGINT, shutting down...');
      cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      // eslint-disable-next-line no-console
      console.log('\n\nReceived SIGTERM, shutting down...');
      cleanup();
      process.exit(0);
    });

    process.on('exit', () => {
      cleanup();
    });

    // Initialize data files
    initializeTasksFile();
    // Auto-delete archive files older than 45 days
    cleanupOldArchives();

    // Find available port before middleware, so the Host and Origin checks know it
    const PORT = await findAvailablePort(DEFAULT_PORT);
    const portChanged = PORT !== DEFAULT_PORT;
    const allowedHosts = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
    const allowedOrigins = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);

    app.disable('x-powered-by');

    // Reject foreign Host headers (DNS rebinding) before any route runs
    app.use((req, res, next) => {
      if (!allowedHosts.has(req.headers.host)) {
        return res.status(403).json({ error: 'Invalid host' });
      }
      next();
    });

    // CORS only stops a website reading responses, not sending them, so refuse
    // state-changing requests that carry a foreign Origin
    app.use((req, res, next) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      const origin = req.headers.origin;
      if (origin && !allowedOrigins.has(origin)) {
        return res.status(403).json({ error: 'Cross-site request refused' });
      }
      next();
    });

    app.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: false,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            // index.html and ui.js set inline style attributes; scripts stay external
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            formAction: ["'self'"],
          },
        },
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'no-referrer' },
      })
    );

    // Middleware
    app.use(express.json({ limit: '5mb' }));
    app.use(express.static(path.join(__dirname, '../public')));

    // API Routes
    app.use('/api', apiRoutes);

    // Todoist Sync Routes (optional - only load if TODOIST_API_TOKEN is configured)
    if (process.env.TODOIST_API_TOKEN) {
      const todoistSyncRoutes = require('./routes/todoist-sync');
      app.use('/api/todoist', todoistSyncRoutes);
      // eslint-disable-next-line no-console
      console.log('✓ Todoist sync available at /api/todoist');
    }

    // Serve index.html for root path
    app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Error handling middleware
    app.use((err, _req, res, _next) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // Update lock file with port number
    fs.writeFileSync(
      LOCK_FILE,
      JSON.stringify(
        {
          pid: process.pid,
          started: new Date().toISOString(),
          port: PORT,
        },
        null,
        2
      )
    );

    // Start server
    // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead of throwing
    app.listen(PORT, HOST, (err) => {
      if (err) {
        console.error('Failed to start server:', err.message);
        cleanup();
        process.exit(1);
      }
      // eslint-disable-next-line no-console
      console.log(`
╔════════════════════════════════════════════════╗
║   Task Manager - Server                       ║
╠════════════════════════════════════════════════╣
║  Server:  http://localhost:${PORT}${PORT < 10000 ? '               ' : '              '}║
║  Status:  Running                              ║${
        portChanged
          ? `
║                                                ║
║  ⚠️  Port ${DEFAULT_PORT} was in use                        ║
║  📍 Using port ${PORT} instead                      ║`
          : ''
      }
║                                                ║
║  Press Ctrl+C to stop                          ║
╚════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    cleanup();
    process.exit(1);
  }
})();
