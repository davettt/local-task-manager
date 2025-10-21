# Local Task Manager

A lightweight, single-focused task management application with an integrated timer system. Built with Node.js, Express, and Vanilla JavaScript.

## Features

- **Task Management**: Create, edit, delete, and complete tasks
- **Active Task Timer**: Single-task focus with live timer display
- **Timer Persistence**: Timer state survives browser refresh
- **Task Archive**: View completed tasks with time tracking
- **Sound Alerts**: Audio notification when tasks are completed
- **Data Persistence**: All tasks saved to local JSON file
- **Responsive Design**: Clean, narrow panel UI (300-500px width)

## User Workflow

```
Add Task → Start Timer → [Work] → Stop/Complete → Archive → Restore (optional)
```

## Installation

### Prerequisites

- Node.js v18 or higher
- npm or yarn package manager

### Setup Steps

```bash
# 1. Clone or navigate to the project directory
cd local-task-manager

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.template .env

# 4. Start the development server
npm run dev
```

**Note:** Git hooks (Husky) are automatically installed when you run `npm install` via the `prepare` script. These hooks run code quality checks before each commit.

## Usage

1. **Open the Application**
   - Navigate to `http://localhost:3000` in your browser

2. **Add a Task**
   - Click "➕ Add New Task" button
   - Fill in the task description (required)
   - Optionally add due date, time, priority, and links
   - Click "Save Task"

3. **Start Working**
   - Click the "▶️ START" button next to any task
   - The timer will appear at the top with live countdown
   - Only one task can be active at a time

4. **Stop or Complete**
   - Click "⏹️ STOP" to pause the timer (task returns to list)
   - Click "✅ COMPLETE" to finish the task (moves to archive)

5. **View Archive**
   - Click "📦 Archive" to expand/collapse completed tasks
   - See time spent and completion date/time
   - Click "↩️" to restore a task back to active list
   - Click "🗑️" to permanently delete a task

## Development

### Scripts

```bash
# Development server with auto-reload
npm run dev

# Production server
npm start

# Run code quality checks
npm run quality

# ESLint only
npm run lint
npm run lint:fix

# Prettier formatting
npm run format
npm run format:check

# Security audit
npm run audit:security
```

### Project Structure

```
local-task-manager/
├── src/
│   ├── server.js           # Express server
│   ├── routes/
│   │   └── api.js          # API endpoints
│   └── utils/
│       └── fileManager.js  # JSON file operations
├── public/
│   ├── index.html          # Main page
│   ├── css/
│   │   └── style.css       # Styling
│   └── js/
│       ├── app.js          # Main app logic
│       ├── timer.js        # Timer functionality
│       ├── taskManager.js  # API client
│       └── ui.js           # UI components
├── local_data/
│   └── tasks.json          # Task storage
└── .claude/
    └── specs/              # Specifications
```

## API Endpoints

### GET /api/tasks
Returns all active (non-archived) tasks

### GET /api/tasks/archived
Returns all archived (completed) tasks

### POST /api/tasks
Create or update a task

### POST /api/tasks/:id/start
Start task timer

### POST /api/tasks/:id/stop
Stop task timer (pause)

### POST /api/tasks/:id/complete
Complete and archive task

### POST /api/tasks/:id/restore
Restore task from archive

### DELETE /api/tasks/:id
Permanently delete task

## Task Data Model

Each task contains:

```json
{
  "id": "timestamp_based_id",
  "description": "Task description",
  "dueDate": "YYYY-MM-DD or null",
  "dueTime": "HH:MM or null",
  "priority": "high|medium|low",
  "completed": false,
  "archived": false,
  "inProgress": false,
  "startedAt": "ISO_timestamp or null",
  "timeSpent": 0,
  "completedAt": "ISO_timestamp or null",
  "links": ["https://example.com"],
  "createdAt": "ISO_timestamp",
  "updatedAt": "ISO_timestamp"
}
```

## Code Quality

This project follows strict code quality standards:

- **ESLint**: JavaScript linting with security plugin
- **Prettier**: Consistent code formatting
- **Pre-commit Hooks**: Automated quality checks on commit
- **npm audit**: Dependency security scanning

Run `npm run quality` before committing changes.

## Browser Persistence

The application automatically resumes an active timer even after:
- Browser refresh
- Page navigation
- Server restart

The timer state is maintained server-side in the tasks.json file for reliability.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with Web Audio API support

## Troubleshooting

### Timer not persisting across refresh
- Check browser console for errors
- Verify local_data/tasks.json file exists and is valid JSON
- Restart the server: `npm run dev`

### Port already in use
- Change port in .env file
- Or kill process using port 3000

### No sound on task completion
- Check browser audio is enabled
- Verify Web Audio API is supported
- Check browser console for warnings

## Development Standards

This project uses:

- **Node.js** runtime with CommonJS modules
- **Express.js** for HTTP server
- **Vanilla JavaScript** (no framework dependencies)
- **File-based storage** (no database required)

## Future Enhancements

Potential features for future versions:

- Task categories/tags
- Bulk task operations
- Export/import functionality
- Keyboard shortcuts
- Dark/light theme toggle
- Time tracking analytics
- Calendar integration
- Multiple timer support

## License

MIT

## Support

For issues, questions, or feedback about the development, check the `.claude/` directory for project specifications and workflow documentation.
