# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
