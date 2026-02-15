# Task Import JSON Schema

Use this reference to generate import-ready JSON files for the Local Task Manager.

## Format

```json
{
  "project": "Project Name Here",
  "tasks": [
    {
      "description": "Task title (REQUIRED)",
      ...optional fields
    }
  ]
}
```

## Fields

### Required
| Field | Type | Example |
|-------|------|---------|
| `description` | string | `"Design homepage mockup"` |

### Optional — Common
| Field | Type | Default | Example |
|-------|------|---------|---------|
| `priority` | `"low"` \| `"medium"` \| `"high"` | `"medium"` | `"high"` |
| `dueDate` | `"YYYY-MM-DD"` | `null` | `"2026-03-02"` |
| `dueTime` | `"HH:MM"` (24h) | `null` | `"14:00"` |
| `details` | string | `null` | `"Detailed notes..."` |
| `links` | string[] | `[]` | `["https://example.com"]` |

### Optional — Scheduling
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `plannedStartTime` | `"HH:MM"` (24h) | `null` | When to start working (shown on clock view) |
| `plannedDuration` | number (minutes) | `60` | Common: 15, 30, 45, 60, 90, 120, 180, 240 |

### Optional — Recurring
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `recurring` | `"daily"` \| `"weekly"` | `null` | Task repeats automatically |
| `workingDaysOnly` | boolean | `false` | Skip weekends (only applies when `recurring: "daily"`) |

### Optional — Appointments
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `isAppointment` | boolean | `false` | Marks as time-sensitive calendar item |
| `reminderMinutes` | number | `30` | Only active when `isAppointment: true`. Values: 15, 30, 60, 120, 1440 |

### Optional — Pomodoro
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `pomodoroMode` | boolean | `false` | Enable pomodoro timer |
| `pomodoroInterval` | number (minutes) | `25` | Common: 25, 45, 65 |

## Auto-generated (do NOT include)

The backend generates these automatically: `id`, `createdAt`, `updatedAt`, `completed`, `archived`, `inProgress`, `startedAt`, `timeSpent`, `completedAt`, `clockRing`, `project` (set from top-level `project` field).

## Behaviour

- **Additive**: Imported tasks are added alongside existing tasks, nothing is replaced
- **Project badge**: If `project` is set, a colored badge appears on each task in the UI
- **Import via**: Settings > Backup tab > "Import Tasks" section

## Example — Minimal

```json
{
  "project": "Personal",
  "tasks": [
    { "description": "Buy groceries", "priority": "low" },
    { "description": "Book dentist appointment", "dueDate": "2026-03-10" }
  ]
}
```

## Example — Full-featured

```json
{
  "project": "Acme Corp Website",
  "tasks": [
    {
      "description": "Client kickoff meeting",
      "priority": "high",
      "dueDate": "2026-03-02",
      "dueTime": "10:00",
      "isAppointment": true,
      "reminderMinutes": 30,
      "details": "Zoom call with the Acme team. Agenda: scope, timeline, deliverables.",
      "plannedStartTime": "10:00",
      "plannedDuration": 60,
      "links": ["https://zoom.us/j/123456"]
    },
    {
      "description": "Daily standup",
      "priority": "medium",
      "dueDate": "2026-03-03",
      "dueTime": "09:00",
      "recurring": "daily",
      "workingDaysOnly": true,
      "isAppointment": true,
      "reminderMinutes": 15,
      "plannedStartTime": "09:00",
      "plannedDuration": 15
    },
    {
      "description": "Design homepage mockup",
      "priority": "high",
      "dueDate": "2026-03-04",
      "details": "Create wireframes and high-fidelity visual design for the homepage.",
      "plannedStartTime": "09:00",
      "plannedDuration": 120,
      "pomodoroMode": true,
      "pomodoroInterval": 45
    },
    {
      "description": "Weekly progress report",
      "priority": "low",
      "dueDate": "2026-03-06",
      "dueTime": "16:00",
      "recurring": "weekly",
      "details": "Summarise what shipped, what's in progress, any blockers.",
      "plannedStartTime": "16:00",
      "plannedDuration": 30
    }
  ]
}
```
