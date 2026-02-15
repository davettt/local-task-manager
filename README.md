# Local Task Manager

A lightweight, single-focused task management application with an integrated timer system and analog clock view. Built with Node.js, Express, and Vanilla JavaScript.

## Features

- **Analog Clock Panel**: Interactive clock view with task arcs, routine blocks, mini preview clocks, and day navigation
- **Status Bar**: Terminal-style prompt showing contextual action feedback (task created, timer started, etc.)
- **Customizable Settings**: Configure timezone, date format, time format, font size, daily routine items, and cleanup defaults
- **Timezone Auto-Detection**: Automatically detects browser timezone with change prompts when traveling
- **Date/Time Localization**: Support for multiple date formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD) and time formats (12h/24h)
- **Customizable Daily Routine**: Create up to 10 personalized daily checklist items that reset each day
- **Task Management**: Create, edit, delete, and complete tasks
- **Active Task Timer**: Single-task focus with live timer display
- **Timer Persistence**: Timer state survives browser refresh
- **Pomodoro Timer (Optional)**: Enable flexible pomodoro intervals (25, 45, or 65 minutes) on any task with automatic break reminders, countdown display, and visual progress bar
- **Focus Mode**: Immersive full-screen mode that activates automatically when Pomodoro is enabled, hiding distractions and highlighting your current task
- **Task Archive**: View completed tasks with time tracking
- **Sound Alerts**: Audio notification when tasks are completed
- **Calendar Appointments**: Mark tasks as time-critical appointments with customizable reminders
- **Appointment Reminders**: In-app alerts (15 min to 1 day before) with sound notification
- **Recurring Tasks**: Create daily or weekly recurring tasks
- **Working Days Only**: Daily recurring tasks can skip weekends (Saturday/Sunday)
- **Gamification**: Streak counter for completing 3+ tasks per day with celebration notifications
- **Project Categories**: Assign tasks to projects (e.g. "Personal", "Acme Corp") with auto-colored badges and searchable project names
- **Task Import**: Import tasks from LLM-generated JSON files alongside existing tasks (additive, not replacing)
- **Backup Export/Import**: Download a full JSON backup of all tasks and settings, or restore from a previous backup with preview and confirmation
- **Archive Management**: Clean old archived tasks with configurable cutoff period
- **Data Persistence**: All tasks and settings saved to local JSON files
- **Responsive Design**: Clean, narrow panel UI with flexible layout
- **Server Reliability**: Single instance protection prevents data corruption from concurrent server processes
- **Smart Port Detection**: Automatically finds available port if default (3000) is in use
- **Todoist Sync (Optional)**: Bidirectional sync with Todoist for managing tasks across platforms

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
   - Click "+ NEW" button in the header
   - Fill in the task description (required)
   - Optionally add due date, time, priority, details, and links
   - Click "Save Task"

2.1 **Create a Calendar Appointment** (Optional)

- When adding or editing a task with a due date and time
- Check the "Calendar Appointment (time-sensitive)" checkbox
- Select reminder time (15 min, 30 min, 1 hour, 2 hours, or 1 day before)
- When the reminder time arrives, an alert will appear with appointment details and sound notification
- Auto-dismisses after 10 seconds or click "Dismiss"
- Reminder settings carry over to recurring appointments

  2.2 **Create Recurring Tasks** (Optional)

- Select "Daily" or "Weekly" from the Recurring dropdown
- For daily recurring tasks, optionally check "Weekdays only (skip weekends)"
- When a recurring task is completed, a new instance is automatically created for the next occurrence
- Daily weekday-only tasks skip Saturday and Sunday, with the next instance appearing on Monday
- All task properties carry over to recurring instances

3. **Track Your Streak**
   - Complete 3 or more tasks in a single day to start building a streak
   - The streak counter appears in the header bar next to the terminal prompt
   - Each day you complete 3+ tasks, your streak continues
   - Miss a day and your streak resets

4. **Start Working**
   - Expand a task by clicking on it, then click the "START" button
   - The timer will appear at the top with live display
   - Only one task can be active at a time

4.1 **Use Pomodoro Timer** (Optional)
   - While timer is running, you can enable pomodoro mode for flexible work intervals
   - Select your preferred interval: 25 min (classic), 45 min, or 65 min (deep work)
   - Check the "Enable Pomodoro" checkbox in the active task section
   - Timer runs normally until the selected interval completes
   - When interval ends: timer auto-pauses and a break modal appears with 5-minute countdown
   - During break: choose to "Skip Break" (resume immediately) or "Continue Working" (auto-start next pomodoro)
   - You can enable/disable pomodoro or change the interval anytime while timer is running
   - Pomodoro is fully optional — you can mix normal and pomodoro timers across different tasks
   - Pomodoro settings are saved per-task and restored when you restart the same task

4.2 **Focus Mode** (Auto-activated with Pomodoro)
   - When you enable Pomodoro and start the timer, Focus Mode activates automatically
   - Full-screen overlay with dark background and your current task displayed prominently
   - Large timer display with Pomodoro countdown and progress bar
   - STOP, EDIT, PAUSE/RESUME, and DONE buttons available
   - Press `Esc` key to exit Focus Mode at any time
   - Break modal appears within Focus Mode when a Pomodoro interval completes

5. **Stop or Complete**
   - Click "STOP" to pause the timer (task returns to list)
   - Click "DONE" to finish the task (moves to archive)

6. **View Completed Tasks**
   - Click "Completed" to expand/collapse completed tasks
   - See time spent and completion date/time
   - Restore a task back to active list or permanently delete it
   - Completed tasks stay in the Completed section until moved to archive files

6.1 **Archive Management** (Optional)

- Click "CLEAN" button next to Completed section header
- Select a cutoff date to move completed tasks to archive files
- Tasks will be saved to daily archive files: `local_data/archive_YYYYMMDD.json`
- Archive files older than 45 days are automatically deleted on server startup

7. **Use the Clock Panel** (Optional)
   - Click the "Clock" button in the header to toggle the analog clock view
   - Tasks with scheduled times appear as colored arcs on the clock face
   - Daily routine items are shown as blocks on the clock
   - Mini preview clocks show upcoming days — click them to navigate
   - Use forward/back arrows to browse days, or click "Today" to reset
   - Digital time display moves to the clock panel when it's active

8. **Customize Settings** (Optional)
   - Click the "Settings" button in the header
   - Choose from 3 tabs to customize your experience:

   **8.1 General Tab**
   - **Timezone**: Select your timezone (auto-detected from browser)
     - When you travel, the app detects timezone changes and prompts you to update
   - **Date Format**: Choose how dates are displayed (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
   - **Time Format**: Choose between 12-hour (AM/PM) or 24-hour display
   - **Font Size**: Adjust the UI font size
   - Changes apply to all task dates/times throughout the app

   **8.2 Daily Routine Tab**
   - Create up to 10 customizable daily checklist items
   - Each item has: label, emoji icon, and enabled/disabled toggle
   - Add new items with "+ Add Item", delete with the "x" button
   - Items reset daily and help track your daily workflow

   **8.3 Cleanup Tab**
   - **Default Cleanup Period**: Set how many days old completed tasks should be before the "CLEAN" button can move them to archive files
   - Default is 30 days
   - Archived tasks are preserved in daily archive files

9. **Delete a Task**
   - Open a task for editing (click EDIT when task is expanded)
   - Click the "DELETE" button (red, left side of modal) to delete

10. **Save and Reset Settings**
   - Click "Save Settings" to apply all changes (app will refresh automatically)
   - Click "Reset All to Defaults" to restore all settings to their original values
   - Settings are saved server-side in `local_data/config.json` and persist across sessions

## UI Design

- **Header Bar**: Single responsive row with terminal prompt, status feedback, streak, search, +NEW, Routine dropdown, Settings, Clock, and time display
- **Priority Indicators**: Colored left border on task items (red = high, yellow = medium, cyan = low)
- **Project Badges**: Colored pill badges on tasks showing their project name, right-aligned in the title row
- **Task Actions**: START, DONE, and EDIT buttons appear only when a task is expanded
- **Status Bar**: Terminal prompt shows feedback after actions (e.g., "task created: Review PR")
- **Daily Routine**: Accessible via "Routine" dropdown in the header

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
│       ├── ui.js           # UI components
│       ├── clockView.js    # Analog clock rendering and navigation
│       ├── clockMath.js    # Clock geometry calculations
│       ├── clockDrag.js    # Clock drag interaction
│       ├── appointmentReminder.js # Calendar appointment reminders
│       ├── gamification.js # Streak counter and celebrations
│       └── settings.js     # Settings manager
├── local_data/
│   └── tasks.json          # Task storage
└── .claude/
    └── specs/              # Specifications
```

## API Endpoints

### GET /api/tasks

Returns all active (non-archived) tasks

### GET /api/tasks/archived

Returns all completed (archived) tasks that are still in the active task list

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

### POST /api/archive/cleanup

Move completed tasks to daily archive files. Tasks completed before the specified date are moved from `tasks.json` to organized archive files by completion date.

**Request body:**

```json
{
  "cutoffDate": "YYYY-MM-DD"
}
```

**Response:**

```json
{
  "success": true,
  "moved": 5,
  "message": "Moved 5 archived tasks to archive files"
}
```

### GET /api/config

Returns application configuration including terminal prompt settings.

### GET /api/settings

Returns user settings including timezone, localization, daily routine, and cleanup preferences.

### PUT /api/settings

Update user settings (partial or full update).

### PUT /api/settings/timezone

Update timezone settings specifically.

### PUT /api/settings/daily-routine

Update daily routine items (validated to maximum 10 items).

### POST /api/tasks/import

Import tasks additively (merges with existing tasks). Accepts LLM-friendly format.

**Request body:**

```json
{
  "project": "Project Name",
  "tasks": [
    { "description": "Task title", "priority": "high", "dueDate": "2026-03-01" }
  ]
}
```

See `IMPORT-SCHEMA.md` for full field reference.

### PUT /api/config

Update application configuration.

## Task Data Model

Each task contains:

```json
{
  "id": "timestamp_based_id",
  "description": "Task description",
  "dueDate": "YYYY-MM-DD or null",
  "dueTime": "HH:MM or null",
  "priority": "high|medium|low",
  "isAppointment": false,
  "reminderMinutes": 30,
  "recurring": "daily|weekly or null",
  "workingDaysOnly": false,
  "completed": false,
  "archived": false,
  "archivedToFile": false,
  "inProgress": false,
  "startedAt": "ISO_timestamp or null",
  "timeSpent": 0,
  "completedAt": "ISO_timestamp or null",
  "links": ["https://example.com"],
  "details": "Optional additional notes",
  "pomodoroMode": false,
  "pomodoroInterval": 25,
  "project": "Project name or null",
  "createdAt": "ISO_timestamp",
  "updatedAt": "ISO_timestamp"
}
```

### Field Descriptions

- **archived**: Set to true when task is completed (moved to Completed section)
- **archivedToFile**: Set to true when task has been moved to a daily archive file by cleanup operation
- **recurring**: Set to "daily" or "weekly" for tasks that repeat
- **workingDaysOnly**: When true and recurring is "daily", skips Saturday and Sunday
- **isAppointment**: When true, enables reminder notifications at specified time before due date
- **reminderMinutes**: How many minutes before the due date/time to trigger the appointment reminder
- **pomodoroMode**: When true, Pomodoro timer is enabled for this task
- **pomodoroInterval**: Pomodoro interval duration in minutes (25, 45, or 65)
- **project**: Project/category name for grouping tasks (displayed as colored badge)

## Code Quality

This project follows strict code quality standards:

- **ESLint**: JavaScript linting with security plugin (flat config format)
- **Prettier**: Consistent code formatting
- **Pre-commit Hooks**: Automated quality checks on commit (Husky)
- **npm audit**: Dependency security scanning
- **Dependabot**: Automated dependency vulnerability monitoring

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

- The server automatically detects if port 3000 is in use and finds the next available port
- A warning message will be displayed showing which port is being used
- Alternatively, you can change the default port in .env file: `PORT=3001`

### No sound on task completion

- Check browser audio is enabled
- Verify Web Audio API is supported
- Check browser console for warnings

### Server already running error

- Only one instance of the server can run at a time to prevent data corruption
- Stop the existing server (Ctrl+C) before starting a new instance
- If the server crashed and left a stale lock file, the new instance will automatically clean it up
- To manually remove a stale lock file: `rm local_data/.lock`

## Development Standards

This project uses:

- **Node.js** runtime with CommonJS modules
- **Express.js** for HTTP server
- **Vanilla JavaScript** (no framework dependencies)
- **File-based storage** (no database required)

## Customization

All settings can be customized through the Settings UI (Settings button in the header) or by directly editing `local_data/config.json`.

### Timezone and Localization

Customize timezone, date format, and time format via Settings UI (General tab). Settings auto-sync with browser timezone detection for travel scenarios.

### Daily Routine

Create up to 10 customizable daily checklist items via Settings UI (Daily Routine tab). Items appear in a dropdown accessible from the "Routine" button in the header.

### Cleanup Configuration

Set default cleanup period (days) via Settings UI (Cleanup tab).

### Todoist Sync (Optional)

Enable bidirectional sync with Todoist to manage tasks across platforms:

1. Get your API token from [Todoist Integrations](https://todoist.com/app/settings/integrations/developer)
2. Add it to your `.env` file:
   ```
   TODOIST_API_TOKEN=your_api_token_here
   ```
3. Restart the server - sync endpoints become available at `/api/todoist`

When enabled, tasks sync between Local Task Manager and Todoist. Leave `TODOIST_API_TOKEN` empty to disable.

## Future Enhancements

Potential features for future versions:

- Bulk task operations
- Keyboard shortcuts
- Dark/light theme toggle
- Time tracking analytics
- Calendar grid view
- Multiple simultaneous timers
- Email/Slack notifications for appointments

## License

MIT

## Support

For issues, questions, or feedback about the development, check the `.claude/` directory for project specifications and workflow documentation.
