# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
