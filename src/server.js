require('dotenv').config();

const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');
const {
  initializeTasksFile,
  cleanupOldArchives,
} = require('./utils/fileManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize data files
initializeTasksFile();
// Auto-delete archive files older than 45 days
cleanupOldArchives();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api', apiRoutes);

// Serve index.html for root path
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Task Manager server running on http://localhost:${PORT}`);
});
