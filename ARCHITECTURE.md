# Local Task Manager — Architecture

## Module Dependency & Data Flow

```mermaid
flowchart TD
    subgraph Browser["Browser (Vanilla JS)"]
        APP["app.js\nApp — orchestrator"]
        TM["taskManager.js\nTaskManager — API client"]
        TIMER["timer.js\nTaskTimer — Pomodoro/timer"]
        UI["ui.js\nUI — DOM rendering"]
        CLOCK["clockView.js\nClockView — analog clock"]
        CLOCKMATH["clockMath.js\nclockMath — arc geometry"]
        CLOCKDRAG["clockDrag.js\nClockDrag — drag interaction"]
        APPT["appointmentReminder.js\nappointmentReminder — polling"]
        GAME["gamification.js\ngamification — streaks"]
        SETTINGS["settings.js\nSettings — settings panel"]

        APP -->|"fetch wrappers"| TM
        APP -->|"timer control"| TIMER
        APP -->|"render calls"| UI
        APP -->|"init / onTaskSelected"| CLOCK
        APP -->|"init / onDragEnd"| CLOCKDRAG
        CLOCK -->|"arc geometry"| CLOCKMATH
        CLOCKDRAG -->|"geometry helpers"| CLOCKMATH
        CLOCKDRAG -->|"updates view"| CLOCK
        APPT -->|"fetch /api/tasks"| TM
        GAME -->|"DOM writes"| UI
        SETTINGS -->|"fetch /api/config\n/api/settings"| TM
    end

    subgraph Server["Node.js / Express Server (server.js)"]
        SRV["server.js\nExpress app\nport detection\nlock file\nmiddleware"]
        API["routes/api.js\nAll REST endpoints"]
        TODO["routes/todoist-sync.js\n(optional — env-gated)"]
        FM["utils/fileManager.js\nAll JSON file I/O"]

        SRV -->|"app.use('/api')"| API
        SRV -->|"if TODOIST_API_TOKEN"| TODO
        API -->|"read / write / archive"| FM
        TODO -->|"read / write tasks"| FM
    end

    subgraph Data["local_data/ (gitignored)"]
        TASKS["tasks.json\nactive + completed tasks\ntimer state"]
        CONFIG["config.json\napp + prompt config"]
        SETTINGS_F["settings.json\ntimezone / locale\ndaily routine"]
        ARCHIVE["archive_YYYYMMDD.json\ndaily archive files"]
        LOCK[".lock\nsingle-instance lock"]
    end

    subgraph External["External (optional)"]
        TODOIST["Todoist REST API v1\n(axios)"]
    end

    TM -->|"HTTP fetch /api/*"| API
    SETTINGS -->|"HTTP fetch /api/config\n/api/settings"| API

    FM -->|"fs read/write"| TASKS
    FM -->|"fs read/write"| CONFIG
    FM -->|"fs read/write"| SETTINGS_F
    FM -->|"fs write"| ARCHIVE
    SRV -->|"fs read/write"| LOCK

    TODO -->|"axios"| TODOIST
```

## Key Architectural Notes

| Concern | Decision |
|---|---|
| **Module system** | CommonJS (`require`) — no ESM |
| **Frontend** | Vanilla JS, no bundler, no framework — served as static assets |
| **State** | Timer state persisted server-side in `tasks.json`; survives browser refresh |
| **Single instance** | `local_data/.lock` (PID + port) — checked on startup, cleaned on exit |
| **Port** | Defaults to 3000, auto-increments up to 10 ports if in use |
| **External calls** | Only Todoist sync via axios; gated on `TODOIST_API_TOKEN` env var |
| **File I/O** | All reads/writes go through `fileManager.js` — no direct `fs` calls elsewhere |
| **No build step** | Changes to `public/js/*.js` take effect immediately on server restart |
