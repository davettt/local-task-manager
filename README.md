# Local Task Manager

A lightweight, single-focused task management application with an integrated timer system. Built with Node.js, Express, and Vanilla JavaScript.

## Features

- **Terminal Mantra**: High-agency problem-solving framework displayed as terminal prompt at the top
- **Customizable Settings**: Configure timezone, date format, time format, daily routine items, terminal prompt, and cleanup defaults
- **Timezone Auto-Detection**: Automatically detects browser timezone with change prompts when traveling
- **Date/Time Localization**: Support for multiple date formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD) and time formats (12h/24h)
- **Customizable Daily Routine**: Create up to 10 personalized daily checklist items that reset each day
- **Task Management**: Create, edit, delete, and complete tasks
- **Active Task Timer**: Single-task focus with live timer display
- **Timer Persistence**: Timer state survives browser refresh
- **Pomodoro Timer (Optional)**: Enable flexible pomodoro intervals (25, 45, or 65 minutes) on any task with automatic break reminders and countdown
- **Task Archive**: View completed tasks with time tracking
- **Sound Alerts**: Audio notification when tasks are completed
- **Calendar Appointments**: Mark tasks as time-critical appointments with customizable reminders
- **Appointment Reminders**: In-app alerts (15 min to 1 day before) with bell icon and sound notification
- **Recurring Tasks**: Create daily or weekly recurring tasks
- **Working Days Only**: Daily recurring tasks can skip weekends (Saturday/Sunday)
- **Gamification**: Streak counter for completing 3+ tasks per day with celebration notifications
- **Archive Management**: Clean old archived tasks with configurable cutoff period
- **Data Persistence**: All tasks and settings saved to local JSON files
- **Responsive Design**: Clean, narrow panel UI (300-500px width)
- **Server Reliability**: Single instance protection prevents data corruption from concurrent server processes
- **Smart Port Detection**: Automatically finds available port if default (3000) is in use

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
   - Optionally add due date, time, priority, details, and links
   - Click "Save Task"

2.1 **Create a Calendar Appointment** (Optional)
   - When adding or editing a task with a due date and time
   - Check the "Calendar Appointment (time-sensitive)" checkbox
   - Select reminder time (15 min, 30 min, 1 hour, 2 hours, or 1 day before)
   - When the reminder time arrives, an alert will appear in the top-right corner with:
     - Bell icon (🔔) and appointment details
     - Sound notification
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
   - The streak counter appears in the header with a fire emoji (🔥)
   - Each day you complete 3+ tasks, your streak continues
   - Miss a day and your streak resets
   - Celebrate each task completion with an ASCII modal and matrix-themed sound effects

4. **Start Working**
   - Click the "▶️ START" button next to any task
   - The timer will appear at the top with live countdown
   - Only one task can be active at a time

4.1 **Use Pomodoro Timer** (Optional)
   - While timer is running, you can enable pomodoro mode for flexible work intervals
   - Check the "Enable Pomodoro" checkbox in the active task section
   - Select your preferred interval: 25 min (classic), 45 min, or 65 min (deep work)
   - Timer runs normally until the selected interval completes
   - When interval ends: timer auto-pauses and a break modal appears with 5-minute countdown
   - During break: choose to "Skip Break" (resume immediately) or "Continue Working" (auto-start next pomodoro)
   - You can enable/disable pomodoro or change the interval anytime while timer is running
   - Pomodoro is fully optional - you can mix normal and pomodoro timers across different tasks

5. **Stop or Complete**
   - Click "⏹️ STOP" to pause the timer (task returns to list)
   - Click "✅ COMPLETE" to finish the task (moves to archive)

6. **View Completed Tasks**
   - Click "✓ Completed" to expand/collapse completed tasks
   - See time spent and completion date/time
   - Click "↩️" to restore a task back to active list
   - Click "🗑️" to permanently delete a task
   - Completed tasks stay in the Completed section until moved to archive files

6.1 **Archive Management** (Optional)
   - Click "🧹 CLEAN" button next to Completed section header
   - Select a cutoff date to move completed tasks to archive files
   - Click "Move to Archive Files" to proceed
   - Tasks will be saved to daily archive files: `local_data/archive_YYYYMMDD.json`
   - Archive files older than 45 days are automatically deleted on server startup
   - No data is lost - all completed tasks are preserved in archive files or can be restored

7. **Customize Settings** (Optional)
   - Click the "⚙️" settings button in the top-right corner
   - Choose from 4 tabs to customize your experience:

   **7.1 General Tab**
   - **Timezone**: Select your timezone (auto-detected from browser)
     - When you travel, the app detects timezone changes and prompts you to update
     - Choose "Keep Current" to save the detected timezone with auto-detected date format
     - Choose "Update All" to shift existing task times to the new timezone
   - **Date Format**: Choose how dates are displayed
     - MM/DD/YYYY (US format)
     - DD/MM/YYYY (EU/UK format)
     - YYYY-MM-DD (ISO format)
   - **Time Format**: Choose between 12-hour (AM/PM) or 24-hour display
   - Changes apply to all task dates/times throughout the app

   **7.2 Daily Routine Tab**
   - Create up to 10 customizable daily checklist items
   - Each item has: label, emoji icon, and enabled/disabled toggle
   - Add new items with the "+ Add Item" button
   - Delete items with the "×" button
   - Delete old items with the "×" button
   - These items reset daily and help you track your daily workflow

   **7.3 Terminal Mantra Tab**
   - **Terminal Username**: Customize the username in the terminal prompt (default: "user")
   - **Terminal Hostname**: Customize the hostname in the terminal prompt (default: "matrix")
   - **Mantra Text**: Customize the main problem-solving framework displayed at the top
   - **Mantra Descriptions**: Add detailed hover tooltips for each part of your mantra
   - Example: Terminal shows `user@matrix:~$ Name it. Trace it. Fix it. Share it.`

   **7.4 Cleanup Tab**
   - **Default Cleanup Period**: Set how many days old completed tasks should be before the "CLEAN" button can move them to archive files
   - Default is 30 days
   - Helps keep your active task list focused on recent work
   - Archived tasks are never deleted - they're preserved in daily archive files

8. **Save and Reset Settings**
   - Click "Save Settings" to apply all changes (app will refresh automatically)
   - Click "Reset All to Defaults" to restore all settings to their original values
   - Settings are saved server-side in `local_data/config.json` and persist across sessions

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
│       ├── appointmentReminder.js # Calendar appointment reminders
│       ├── gamification.js # Streak counter and celebration modals
│       └── settings.js     # Settings manager and customization
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

**Behavior:**
- Tasks completed before the cutoff date are moved to `local_data/archive_YYYYMMDD.json` files
- Each task is marked with `archivedToFile: true` when moved
- Archive files older than 45 days are automatically deleted on server startup
- Moved tasks can still be viewed and restored from the Completed section

### GET /api/config
Returns application configuration including the terminal mantra settings.

**Response:**
```json
{
  "mantra": {
    "enabled": true,
    "text": "Name it. Trace it. Fix it. Share it.",
    "descriptions": {
      "nameIt": "What's the issue?",
      "traceIt": "Why is it happening?",
      "fixIt": "What's the solution + execute it",
      "shareIt": "Keep people in the loop"
    }
  }
}
```

### GET /api/settings
Returns user settings including timezone, localization, daily routine, and cleanup preferences.

**Response:**
```json
{
  "timezone": {
    "current": "Australia/Sydney",
    "autoDetect": true,
    "lastDetected": "ISO_timestamp"
  },
  "localization": {
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "24h",
    "firstDayOfWeek": 0
  },
  "dailyRoutine": [
    { "id": "1", "label": "Calendar", "icon": "📅", "enabled": true },
    { "id": "2", "label": "Asana", "icon": "✓", "enabled": true }
  ],
  "cleanup": {
    "defaultCutoffDays": 30,
    "lastCleanup": "ISO_timestamp or null"
  }
}
```

### PUT /api/settings
Update user settings (partial or full update).

**Request body:**
```json
{
  "timezone": { "current": "Australia/Sydney" },
  "localization": { "dateFormat": "DD/MM/YYYY", "timeFormat": "24h" },
  "dailyRoutine": [...],
  "cleanup": { "defaultCutoffDays": 45 }
}
```

### PUT /api/settings/timezone
Update timezone settings specifically.

**Request body:**
```json
{
  "current": "Australia/Sydney",
  "autoDetect": true
}
```

### PUT /api/settings/daily-routine
Update daily routine items (validated to maximum 10 items).

**Request body:**
```json
[
  { "id": "1", "label": "Calendar", "icon": "📅", "enabled": true },
  { "id": "2", "label": "Email", "icon": "✉️", "enabled": true }
]
```

### PUT /api/config
Update application configuration (terminal mantra, username, hostname).

**Request body:**
```json
{
  "mantra": {
    "enabled": true,
    "username": "user",
    "hostname": "matrix",
    "text": "Name it. Trace it. Fix it. Share it.",
    "descriptions": {
      "nameIt": "What's the issue?",
      "traceIt": "Why is it happening?",
      "fixIt": "What's the solution + execute it",
      "shareIt": "Keep people in the loop"
    }
  }
}
```

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

All settings can be customized through the Settings UI (⚙️ button in the top-right corner) or by directly editing `local_data/config.json`.

### Terminal Mantra

The terminal mantra at the top of the interface displays a high-agency problem-solving framework. Customize via the Settings UI (Terminal Mantra tab) or by editing `local_data/config.json`:

```json
{
  "mantra": {
    "enabled": true,
    "username": "user",
    "hostname": "matrix",
    "text": "Name it. Trace it. Fix it. Share it.",
    "descriptions": {
      "nameIt": "What's the issue?",
      "traceIt": "Why is it happening?",
      "fixIt": "What's the solution + execute it",
      "shareIt": "Keep people in the loop"
    }
  }
}
```

- **enabled**: Set to `false` to hide the mantra
- **username**: Username displayed in terminal prompt (default: "user")
- **hostname**: Hostname displayed in terminal prompt (default: "matrix")
- **text**: The main mantra text displayed in the terminal prompt
- **descriptions**: Detailed explanations shown in the hover tooltip

Restart the server after manual file edits to see updates. Settings saved via UI apply immediately.

### Timezone and Localization

Customize timezone, date format, and time format via Settings UI (General tab). Settings auto-sync with browser timezone detection for travel scenarios:

```json
{
  "userSettings": {
    "timezone": {
      "current": "Australia/Sydney",
      "autoDetect": true,
      "lastDetected": "2025-11-29T12:00:00Z"
    },
    "localization": {
      "dateFormat": "DD/MM/YYYY",
      "timeFormat": "24h",
      "firstDayOfWeek": 0
    }
  }
}
```

### Daily Routine

Create up to 10 customizable daily checklist items via Settings UI (Daily Routine tab):

```json
{
  "userSettings": {
    "dailyRoutine": [
      { "id": "1", "label": "Calendar", "icon": "📅", "enabled": true },
      { "id": "2", "label": "Asana", "icon": "✓", "enabled": true },
      { "id": "3", "label": "Email", "icon": "✉️", "enabled": true }
    ]
  }
}
```

### Cleanup Configuration

Set default cleanup period (days) via Settings UI (Cleanup tab):

```json
{
  "userSettings": {
    "cleanup": {
      "defaultCutoffDays": 30,
      "lastCleanup": null
    }
  }
}
```

## Future Enhancements

Potential features for future versions:

- Task categories/tags
- Bulk task operations
- Export/import functionality
- Keyboard shortcuts
- Dark/light theme toggle
- Time tracking analytics
- Calendar grid view
- Multiple simultaneous timers
- Email/Slack notifications for appointments
- Auto-delete archived tasks after specified period

## License

MIT

## Support

For issues, questions, or feedback about the development, check the `.claude/` directory for project specifications and workflow documentation.
