# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
