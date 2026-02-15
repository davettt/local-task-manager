# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.12.1] - 2026-02-15

### Fixed

- **Todoist Sync — API v1 Migration** — Todoist deprecated their REST API v2 on 2026-02-10 (all endpoints return HTTP 410 Gone). Migrated to the new API v1.
  - Base URL updated from `rest/v2` to `api/v1`
  - Added cursor-based pagination for all list endpoints (`getAllTasks`, `getProjects`, `getSections`, `getLabels`)
  - Task completion field changed from `is_completed` to `checked`
  - Task completion timestamp now uses Todoist's `completed_at` field
  - Task IDs changed from numeric strings to alphanumeric strings (existing mappings handled gracefully)

### Migration Required (Todoist Sync Users)

If you use Todoist sync and are upgrading from v1.12.0 or earlier, you **must** reset your sync metadata after updating:

1. Stop the server
2. Replace `local_data/todoist-metadata.json` with:
   ```json
   { "lastSync": null, "taskMappings": {}, "localChecksums": {}, "todoistChecksums": {} }
   ```
3. Restart the server
4. Run a sync (`POST /api/todoist/sync`) — this will re-establish all task mappings with the new Todoist IDs
5. **Check for duplicates** — the first sync after reset may create duplicate tasks (one local copy + one pulled from Todoist). Review and delete any duplicates manually.

### Files Modified

- `src/todoist-client.js` — Base URL, `_fetchAllPages()` pagination helper, all list methods updated
- `src/sync-manager.js` — `is_completed` → `checked` in checksum generation, completion detection, and task conversion

---

## [1.12.0] - 2026-02-15

### Added

- **Project Categories** — Tasks can now be assigned to a project (e.g. "Personal", "Acme Corp", "Portfolio Site")
  - Colored badge/tag displayed on each task, auto-colored from an 8-color solarized palette based on project name
  - Project field in task form with datalist auto-populated from existing project names
  - Project badge shown in task list, archived tasks, and clock view info panel
  - Search bar filters by project name as well as task description
- **Task Import (Additive)** — New "Import Tasks" section in Settings > Backup tab
  - Import tasks from a JSON file alongside existing tasks (does not replace)
  - LLM-friendly format: only `description` required per task, all other fields optional with sensible defaults
  - Preview panel shows project name, task count, and priority breakdown before confirming
  - Supports all task fields: priority, due date/time, recurring, appointments, pomodoro, planned times, links
  - `IMPORT-SCHEMA.md` reference doc for generating import files in new LLM sessions
- **Task Import API** — `POST /api/tasks/import` endpoint accepting `{ project, tasks[] }` format
- **`project` field** added to task data model with auto-migration (existing tasks default to `null`)

### Changed

- **Import Backup** section renamed to "Import Backup (Full Replace)" to distinguish from additive task import

### Files Modified

- `src/routes/api.js` — `project` field in task create/update, new `/api/tasks/import` endpoint
- `src/utils/fileManager.js` — `project: null` auto-migration in `migrateTaskFields()`
- `public/index.html` — Project field in task form (with datalist), Import Tasks UI in backup tab
- `public/js/ui.js` — Project badge rendering, `getProjectColor()` hash function, form data handling
- `public/js/settings.js` — Import tasks file selection, preview, and confirmation handlers
- `public/js/app.js` — Project name search filtering, datalist population from existing tasks
- `public/js/clockView.js` — Project badge in clock info panel
- `public/css/style.css` — `.project-badge` styles, `.task-title` flex layout for right-aligned badge

---

## [1.11.0] - 2026-02-14

### Added

- **Backup Export/Import** — New "Backup" tab in Settings modal (TC-238)
  - Export downloads a single `taskmanager-backup-YYYYMMDD.json` file containing all active tasks, archived tasks, archive-file tasks, and full config/settings
  - Import via file picker with preview showing task counts and backup date
  - Confirmation dialog before overwriting existing data
  - Import correctly restores archive-file tasks back to their respective `archive_*.json` files
  - Status bar feedback on export and import actions
- **Archive Files API** — `GET /api/tasks/archive-files` endpoint to read tasks from `archive_*.json` files
- **Backup Import API** — `POST /api/backup/import` endpoint to restore tasks and config from backup

### Security

- Fixed qs low severity vulnerability (GHSA-w7fw-mjwx-w883) via `npm audit fix`

### Files Modified

- `public/index.html` — Backup tab in settings modal with export button, file picker, preview/confirm UI
- `public/css/style.css` — Backup section styles (file input, preview panel, warning text, error display)
- `public/js/settings.js` — Export/import logic (fetch, Blob download, file validation, preview, confirm)
- `src/routes/api.js` — Backup import endpoint, archive-files endpoint
- `src/utils/fileManager.js` — `clearAllArchiveFiles()` utility

---

## [1.10.0] - 2026-02-11

### Added

- **Analog Clock Panel** — Interactive clock view with day navigation and task visualization
  - Large analog clock with hour/minute/second hands
  - Tasks rendered as arc blocks on the clock face based on scheduled time
  - Daily routine blocks shown as colored arcs
  - Mini preview clocks showing upcoming days (clickable to navigate)
  - Forward/back day navigation with "Today" reset button
  - Digital time display moves to clock panel when active
  - Draggable clock interaction support (`clockDrag.js`)
- **Status Bar** — Terminal prompt now shows contextual action feedback
  - Displays messages like "task created: ...", "task deleted: ...", "timer started: ..." after each action
  - Replaces the static terminal mantra with dynamic, useful status updates
- **DELETE in Edit Modal** — Delete button now accessible only from the task edit modal (left-aligned, red)

### Changed

- **Header Decluttered** — Merged terminal bar + header controls into a single responsive flex row
  - Search, +NEW, Routine dropdown, Settings, Clock, and time all in one row
  - Streak display integrated into left side with terminal prompt
  - `flex-wrap` for responsive layout on smaller screens
  - Unified `.header-btn` style for Settings, Clock, and Routine buttons
- **Daily Routine → Dropdown** — Moved from full-width section to compact header dropdown with close-on-outside-click
- **Priority: Colored Left Border** — Replaced floating priority icons with colored left borders on task items
  - High = red, Medium = yellow, Low = cyan
- **Action Buttons Inside Details** — START, DONE, EDIT buttons only appear when a task is expanded (no longer always visible)
- **Appointment Badge in Meta Line** — Moved appointment indicator into the date/time meta line instead of floating separately
- **Focus Mode Polish** — Removed emoji from all buttons, removed glow/shadow effects, outlined button style, green left border, simplified 4px progress bar
- **Pomodoro UX** — Interval select is always enabled (no longer disabled until checkbox is checked); checkbox state properly synced per task
- **Active Task Priority Colors** — High/medium/low priority now show distinct colors (was all yellow)
- **Settings: Removed Terminal Mantra Tab** — Settings reduced from 4 tabs to 3 (General, Daily Routine, Cleanup)
- **Font Size Setting** — Added configurable font size option in General settings

### Fixed

- Active task priority display: high and medium were showing the same color
- Pomodoro checkbox retaining state from previous tasks
- Recurring badge in active task sharing wrong CSS class with priority
- Mini preview clocks not updating when navigating days on the clock panel
- Duplicate `.search-input:focus` CSS blocks merged

### Security

- Fixed axios high severity vulnerability (GHSA-43fc-jf86-j433) via `npm audit fix`

### Files Modified

- `public/index.html` — Header restructure, status bar, modal delete button, clock panel time display, focus mode button cleanup
- `public/css/style.css` — Header bar, priority borders, status bar, routine dropdown, clock panel, focus mode polish
- `public/js/ui.js` — Actions in details, showStatus(), priority border class, appointment in meta, dropdown toggle, modal delete visibility
- `public/js/app.js` — Wire modal delete, call showStatus() from handlers, pomodoro sync, focus mode priority colors
- `public/js/settings.js` — Remove mantra tab, sync clock-time display, font size setting
- `public/js/clockView.js` — New: analog clock rendering, day navigation, preview clocks, routine blocks
- `public/js/clockMath.js` — New: clock geometry calculations
- `public/js/clockDrag.js` — New: clock drag interaction
- `src/routes/api.js` — Font size setting support
- `src/utils/fileManager.js` — Font size in default settings

---

## [1.9.1] - 2026-01-31

### Security

- **ESLint Vulnerability Fix** - Upgraded ESLint to resolve moderate severity vulnerability
  - Fixed: Stack Overflow when serializing objects with circular references ([GHSA-p5wg-g6qr-c7cg](https://github.com/advisories/GHSA-p5wg-g6qr-c7cg))
  - Upgraded `eslint` from 8.57.1 to 9.39.2
  - Upgraded `eslint-plugin-security` from 1.7.1 to 3.0.1

### Changed

- **ESLint 9 Migration** - Migrated to ESLint flat config format
  - Replaced `.eslintrc.js` with `eslint.config.js` (new flat config)
  - Added `@eslint/js` and `globals` packages for flat config support
  - Updated `no-unused-vars` rule with `caughtErrorsIgnorePattern` for cleaner catch blocks
- **Husky Update** - Fixed deprecation warning
  - Changed prepare script from `husky install` to `husky`

### Fixed

- Fixed 10 lint errors across 5 files (unused catch variables now prefixed with `_`)
- Removed 7 unused eslint-disable directives

### Files Modified

- `package.json` - Updated dependencies and prepare script
- `eslint.config.js` - New flat config (replaced `.eslintrc.js`)
- `public/js/appointmentReminder.js` - Fixed unused catch variables
- `public/js/gamification.js` - Fixed unused catch variables
- `src/server.js` - Fixed unused catch variables, removed unused directives
- `src/sync-manager.js` - Fixed unused catch variables
- `src/todoist-client.js` - Fixed unused catch variables
- `src/routes/api.js` - Removed unused eslint-disable directive
- `src/routes/todoist-sync.js` - Removed unused eslint-disable directives

---

## [1.9.0] - 2026-01-18

### Added

- **Timer Redesign** - Separate timer display showing overall tracked time and Pomodoro countdown with visual progress bar
- **Focus Mode** - New full-screen immersive overlay that auto-activates when Pomodoro is enabled
  - Displays task details prominently (title, description, links)
  - Large Pomodoro countdown timer with "Total: HH:MM:SS" below
  - Edit button to modify task while in focus mode
  - Pause/Resume functionality for both timer and Pomodoro
  - ESC key or STOP button to exit focus mode
- **Persisted Pomodoro Settings** - pomodoroMode and pomodoroInterval now saved per-task
  - Settings persist across sessions
  - Backward compatible (existing tasks default to false/25)
- **Task Time Display** (TC-94) - Total tracked time now visible on task list items
  - Shows `⏱ HH:MM:SS` inline after due date
  - Real-time updates while timer is running
  - Cyan color matching Pomodoro timer theme

### Changed

- Pomodoro timer now more visible with dedicated countdown display
- Timer section redesigned with separate overall time and Pomodoro sections
- Stop button behavior clarified: now stops Pomodoro and timer (exits focus mode)
- Added Pause/Resume buttons for temporary timer pauses

### Technical Details

- New focus mode overlay with z-index 100000 for immersive experience
- Focus mode timer updates synced with main timer display
- Pause/Resume properly preserves Pomodoro remaining time
- Pomodoro progress bar with segmented fill styling
- All new features backward compatible - no breaking changes

### Files Modified

- public/index.html - Timer section redesign, focus mode overlay
- public/css/style.css - Timer styles, focus mode styles, progress bar, task-time styling
- public/js/app.js - Focus mode logic, pause/resume, settings persistence, task time updates
- public/js/timer.js - Progress bar update method
- public/js/ui.js - Task time display in task list items
- src/routes/api.js - Persist pomodoro settings with task data
- README.md - Updated documentation

---

## [1.8.0] - 2025-11-29

### Added

- Comprehensive settings system with configurable UI and persistent storage
  - **Settings Modal**: Accessible via ⚙️ button in header with 4 customizable tabs
  - **General Settings Tab**: Timezone selection with auto-detection and travel prompts
    - Supports timezone auto-detection from browser with change notifications for travelers
    - Intelligent date format auto-detection based on timezone and browser locale
    - Three date format options: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    - Two time format options: 12-hour (AM/PM) and 24-hour display
  - **Daily Routine Tab**: Create up to 10 customizable daily checklist items (previously hardcoded at 5)
    - Add/edit/delete daily routine items with custom labels and emoji icons
    - Enable/disable items without deleting them
    - Items reset daily and help structure user's daily workflow
  - **Terminal Mantra Tab**: Customize the terminal prompt appearance and mantra text
    - Customizable username and hostname in terminal prompt (e.g., `user@matrix:~$`)
    - Editable mantra text and hover tooltip descriptions
    - Live preview of terminal prompt changes
  - **Cleanup Tab**: Configure default cutoff period for archive cleanup operations
    - Set custom default days for the "CLEAN" button (previously hardcoded at 30)
    - Helper text explains archive management and data preservation
- Date/time formatting system applied throughout the app
  - All task dates, times, and timestamps respect user's format preferences
  - Relative date labels (Today, Tomorrow, Overdue) work with all date formats
  - Consistent formatting across active tasks, completed tasks, and appointment reminders
- Timezone change detection and handling
  - Automatic browser timezone detection using Intl API
  - Travel detection: Alerts user when timezone changes from stored value
  - Two-option prompt: "Keep Current" (saves detected timezone + auto-format) or "Update All" (shifts task times)
- Settings persistence and synchronization
  - All settings stored server-side in `config.json` with `userSettings` object
  - Settings auto-apply with page reload on save
  - Backwards compatible with existing configs (auto-migrates missing settings)

### Changed

- Daily checklist now dynamically rendered from user settings instead of hardcoded HTML
- Current time display added to header (updates every 500ms)
- Settings saved via UI now trigger automatic page refresh to apply all changes
- Terminal prompt now supports custom username and hostname
- `config.json` schema extended with `userSettings` object containing timezone, localization, dailyRoutine, and cleanup sections

### Technical Details

- New `SettingsManager` class in `public/js/settings.js` with 40+ methods for settings management
- New API endpoints:
  - `GET /api/settings` - Retrieve user settings
  - `PUT /api/settings` - Update user settings (partial or full)
  - `PUT /api/settings/timezone` - Update timezone specifically
  - `PUT /api/settings/daily-routine` - Update daily routine with validation (max 10 items)
  - `PUT /api/config` - Update application configuration (mantra, username, hostname)
- New utility functions in `fileManager.js`:
  - `getDefaultUserSettings()` - Returns complete default settings structure
  - `updateUserSettings(updates)` - Deep merge settings updates
  - `migrateConfig(config)` - Auto-migrate configs to new schema
- Formatting methods in `SettingsManager`:
  - `formatDate(dateStr)` - Formats dates per user preference
  - `formatTime(timeStr)` - Formats time per user preference (12h/24h)
  - `detectBrowserTimezone()` - Detects timezone using Intl API
  - `checkTimezoneChange()` - Compares stored vs detected timezone
- Updated `TaskManager` methods to use `SettingsManager` formatters:
  - `getRelativeDate()` now uses settings date formatter
  - `formatDateTime()` now uses settings time formatter
- Daily routine rendering integrated with settings via `UI.renderDailyChecklistFromConfig()`

### Fixed

- Date format now auto-detects based on timezone (AU = DD/MM/YYYY, US = MM/DD/YYYY, etc.)
- "Keep Current" timezone prompt button now properly saves detected timezone
- Date/time formatting now applies consistently across all task displays
- Timezone changes while traveling now properly trigger migration prompts

---

## [1.7.0] - 2025-11-04

### Added

- Optional pomodoro timer mode for flexible productivity tracking
  - Enable/disable pomodoro on any task during timer session (opt-in, non-disruptive)
  - Three interval options: 25, 45, or 65 minutes (flexible work sessions)
  - Auto-pause timer when pomodoro interval completes
  - Break modal with 5-minute countdown timer and visual display
  - Two break actions: Skip Break (resume immediately) or Continue Working (auto-start next pomodoro)
  - Pomodoro settings can be changed mid-task without restarting timer
  - Completion sound plays when break starts
  - Hybrid approach: works alongside existing normal timer mode

### Features

- Pomodoro is fully optional per-task - users can mix normal and pomodoro timers
- Existing tasks and users unaffected - zero breaking changes
- When task is stopped/paused, pomodoro settings are preserved for next session
- When recurring task is completed, new instance starts fresh (no pomodoro carryover)
- All pomodoro settings stored in task data structure for persistence

### Technical Details

- Extended `TaskTimer` class with pomodoro-specific properties and methods
- Callback-based architecture for break modal triggering
- Break countdown implemented with 1-second intervals
- Backwards compatible - missing pomodoro fields default to false/inactive

---

## [1.6.0] - 2025-10-27

### Added

- Terminal mantra display with high-agency problem-solving framework
  - Matrix-themed terminal prompt at the top: `user@matrix:~$ Name it. Trace it. Fix it. Share it.`
  - Interactive hover tooltip showing detailed descriptions for each step
  - Configurable via `local_data/config.json` file
  - New `/api/config` endpoint for retrieving application configuration
  - Mantra can be enabled/disabled and fully customized per user preference

### Changed

- Header layout redesigned for cleaner, more compact appearance
  - Search box and "+ NEW" button now share a single row (was 3 separate rows)
  - Button label shortened from "+ NEW TASK" to "+ NEW" for space efficiency
  - Streak display simplified with transparent background and centered text
  - Removed prominent border/background box from streak display
  - Reduced visual clutter by ~25% in header section

### Technical Details

- `config.json` structure for mantra customization with default values
- File manager now includes `readConfig()`, `writeConfig()`, and `initializeConfigFile()` functions
- Config loaded on app initialization with `applyConfig()` method
- Tooltip implemented using CSS `::before` pseudo-element with `attr(data-tooltip)`
- Fixed position tooltip with high z-index (10000) for proper visibility across all UI states

---

## [1.5.0] - 2025-10-27

### Added

- Server instance management system to prevent race conditions and data loss
  - Single instance lock using PID-based lock file (`local_data/.lock`)
  - Automatic detection of already-running server instances
  - Clear error messages with PID, start time, and port information when attempting to run multiple instances
  - Stale lock file cleanup for crashed server instances
  - Graceful shutdown handling (SIGINT/SIGTERM) with automatic lock file cleanup
- Automatic port availability detection
  - Server now checks if default port (3000) is available
  - Automatically finds and uses next available port (up to 10 ports checked)
  - Clear visual indicator when fallback port is used
- Enhanced server startup messages
  - Formatted box-style console output showing server URL, status, and port information
  - Clear warnings when port fallback occurs

### Changed

- Server initialization refactored to async IIFE pattern for better control flow
- Lock file now stores PID, start timestamp, and active port
- Exit handlers now properly clean up lock file on all shutdown scenarios

### Technical Details

- `isPortAvailable()` - Tests port availability by attempting temporary server bind
- `findAvailablePort()` - Iterates through port range to find first available port
- `isProcessRunning()` - Validates lock file PID using signal 0 (non-destructive check)
- Lock file location: `local_data/.lock` (automatically cleaned on graceful shutdown)
- Multiple process protection prevents concurrent writes to `tasks.json`

---

## [1.4.0] - 2025-10-24

### Added

- Archive management system (Closes #8)
  - Daily archive files to prevent unbounded `tasks.json` growth
  - Automatic cleanup of archive files older than 45 days on server startup
  - Manual "Clean" button (🧹) to move completed tasks to archive files
  - Modal dialog for selecting cleanup cutoff date
  - Tasks moved to daily archive files named `archive_YYYYMMDD.json`
  - New `archivedToFile` field indicates when task has been moved to archive file
  - All data is preserved - no tasks are permanently deleted unless archive files age out
  - Non-destructive operation with full data retention

### Changed

- Renamed "Archive" section to "✓ Completed" for better semantic clarity
- Completed tasks now show in "Completed" section until manually moved to archive files
- Archive header now displays as flex container for better button alignment
- Cleanup modal updated with clearer messaging about archive file movement

### Architecture

- **File Organization**: Completed tasks organized by date in separate JSON files
- **Backwards Compatible**: Existing archived tasks in `tasks.json` remain unchanged
- **Automatic Cleanup**: Server auto-deletes archive files older than 45 days
- **Manual Cleanup**: User can trigger cleanup to move old completed tasks from `tasks.json` to archive files
- **Data Integrity**: All moved tasks marked with `archivedToFile: true` for tracking

---

## [1.3.0] - 2025-10-24

### Added

- Working days feature for daily recurring tasks (Closes #7)
  - "Weekdays only (skip weekends)" checkbox for daily recurring tasks
  - Daily recurring tasks now automatically skip Saturday and Sunday
  - Next occurrence moves to Monday when landing on a weekend
  - Setting is preserved across task edits and recurring instances
- Task gamification features
  - Streak counter for completing 3+ tasks per day
  - Fire emoji (🔥) display with day count in header
  - ASCII celebration modal on task completion
  - Streak progress indicator (1/3, 2/3, +STREAK POINT)
  - Matrix-themed sound effects using Web Audio API
  - Streak data persists in localStorage with daily reset
- Improved checkbox styling
  - Checkboxes now display side-by-side with their labels for better UX
  - Consistent cyan color scheme (#2aa198) for checkbox styling

### Fixed

- Fixed `workingDaysOnly` checkbox not persisting when editing daily recurring tasks
  - Form is now cleared before populating with task data to prevent stale values
  - Checkbox state properly restores when editing recurring tasks

---

## [1.2.0] - 2025-10-23

### Added

- Calendar appointment reminder feature (Closes #2)
- Mark tasks as calendar appointments with time-sensitive indicator
- Customizable appointment reminders (15, 30, 60, 120 minutes or 1 day before)
- In-app red alert notification with bell icon and sound when appointment reminder triggers
- Appointment settings persist across page reloads (no duplicate notifications today)
- Appointment settings carried over to recurring task instances
- Bell badge icon (🔔) displays next to appointment tasks

---

## [1.1.0] - 2025-10-22

### Added

- Additional description field for adding more notes (Closes #5)
- Text filter input for searching tasks (Closes #4)
- Indicator for recurring tasks (Closes #1)

### Changed

- Allow editing task description while timer is active (Closes #3)

### Fixed

- Fixed bug where editing a description/task was resetting the timer (Closes #6)
- Daily routine toggle now defaults to closed state

---

## [1.0.0] - 2025-10-21

### Added

- Initial release of Local Task Manager
- Complete task management system with add, edit, delete, and complete functionality
- Active task timer with live display in HH:MM:SS format
- Single-task focus workflow - only one task can be active at a time
- Timer persistence across browser refresh and server restart
- Task archiving system for completed tasks with time tracking
- Task restoration from archive back to active list
- Sound completion alerts using Web Audio API
- Responsive UI design with narrow panel layout (300-500px)
- Task properties including description, due date/time, priority, and links
- File-based JSON storage for all task data
- Express.js backend with RESTful API endpoints
- Vanilla JavaScript frontend with no framework dependencies

### Architecture

- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla JavaScript with dynamic DOM manipulation
- **Storage**: File-based JSON (tasks.json)
- **Communication**: REST API with JSON

### Code Quality

- ESLint configuration with security plugin
- Prettier code formatting
- Pre-commit hooks for automated checks
- npm audit for dependency security

### Features

- **Task Creation**: Modal form for creating tasks with full details
- **Timer System**: Automatic timer that tracks time spent on active task
- **Persistence**: Server-side state management survives refresh
- **Archive**: Move completed tasks to archive with completion metadata
- **Priority Indicators**: Visual icons for task priority levels (high/medium/low)
- **Responsive Design**: Works on mobile and desktop browsers
- **Data Export**: All data stored in accessible JSON format

### Testing

- Manual testing checklist provided in specification
- Verified timer persistence across refresh
- Verified single active task enforcement
- Verified sound notification system
- Verified data persistence and file integrity

### Documentation

- Complete README.md with setup and usage instructions
- API endpoint documentation
- Task data model specification
- Code quality standards documentation
- Development workflow guidelines

---

## Release Notes

### Version 1.0.0

This is the initial release of the Local Task Manager. All core features are complete and fully integrated:

✅ Task management (CRUD operations)
✅ Active task timer with persistence
✅ Archive system with restoration
✅ Sound alerts on completion
✅ Data persistence to JSON file
✅ Responsive UI design
✅ Code quality tooling
✅ Comprehensive documentation

The application is production-ready for personal task management use.

---

**Format**: YYYY-MM-DD

For additional information, see the [README.md](README.md) and specification documents in `.claude/specs/`.
