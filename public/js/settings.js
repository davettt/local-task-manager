/**
 * Settings Manager
 * Handles user settings, preferences, timezone detection, and localization
 */
class SettingsManager {
  constructor() {
    this.modal = document.getElementById('settings-modal');
    this.timezonePromptModal = document.getElementById('timezone-prompt-modal');
    this.currentSettings = null;
    this.isInitializing = true;
    this.timezoneList = this.getTimezoneList();
  }

  /**
   * Initialize settings manager
   */
  async init() {
    try {
      await this.loadSettings();
      this.attachEventListeners();
      this.updateCurrentTimeDisplay();
      this.checkTimezoneChange();

      // Update time display every minute
      setInterval(() => this.updateCurrentTimeDisplay(), 60000);
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  }

  /**
   * Load settings from server
   */
  async loadSettings() {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      this.currentSettings = await response.json();
      this.populateSettingsForm();
      return this.currentSettings;
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use defaults if fetch fails
      this.currentSettings = this.getDefaultSettings();
      return this.currentSettings;
    }
  }

  /**
   * Save settings to server
   */
  async saveSettings(updates = null) {
    try {
      const settingsToSave = updates || this.getCurrentFormValues();
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      const updated = await response.json();
      this.currentSettings = updated;
      this.showNotification('Settings saved successfully');
      return updated;
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Failed to save settings', 'error');
      throw error;
    }
  }

  /**
   * Attach event listeners to settings UI
   */
  attachEventListeners() {
    // Modal controls
    document
      .getElementById('settings-btn')
      .addEventListener('click', () => this.openModal());
    document
      .getElementById('settings-modal-close')
      .addEventListener('click', () => this.closeModal());
    document
      .getElementById('settings-save-btn')
      .addEventListener('click', () => this.handleSaveSettings());
    document
      .getElementById('settings-reset-btn')
      .addEventListener('click', () => this.handleResetSettings());

    // Tab switching
    document.querySelectorAll('.settings-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) =>
        this.switchTab(e.target.dataset.tab)
      );
    });

    // Add routine item button
    document
      .getElementById('add-routine-item-btn')
      .addEventListener('click', () => this.addRoutineItem());

    // Timezone prompt buttons
    document
      .getElementById('tz-prompt-update-btn')
      .addEventListener('click', () => this.handleTimezoneUpdate());
    document
      .getElementById('tz-prompt-keep-btn')
      .addEventListener('click', () => this.handleKeepCurrentTimezone());

    // Close modal on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    this.timezonePromptModal.addEventListener('click', (e) => {
      if (e.target === this.timezonePromptModal) this.closeTimezonePrompt();
    });

    // Backup event listeners
    document
      .getElementById('backup-export-btn')
      .addEventListener('click', () => this.handleExportBackup());

    document
      .getElementById('backup-file-input')
      .addEventListener('change', (e) => this.handleBackupFileSelect(e));

    document
      .getElementById('backup-import-confirm-btn')
      .addEventListener('click', () => this.handleImportBackup());

    document
      .getElementById('backup-import-cancel-btn')
      .addEventListener('click', () => this.clearBackupPreview());

    // Import Tasks event listeners
    document
      .getElementById('import-tasks-file-input')
      .addEventListener('change', (e) => this.handleImportTasksFileSelect(e));

    document
      .getElementById('import-tasks-confirm-btn')
      .addEventListener('click', () => this.handleImportTasks());

    document
      .getElementById('import-tasks-cancel-btn')
      .addEventListener('click', () => this.clearImportTasksPreview());

    this.pendingBackupData = null;
    this.pendingImportData = null;
    this.isInitializing = false;
  }

  /**
   * Populate settings form with current values
   */
  populateSettingsForm() {
    if (!this.currentSettings) return;

    const { localization, dailyRoutine, cleanup } = this.currentSettings;

    // Timezone - use browser-detected timezone for display
    const browserTz = this.detectBrowserTimezone();
    const tzSelect = document.getElementById('timezone-select');
    tzSelect.innerHTML = '';
    this.timezoneList.forEach((tz) => {
      const opt = document.createElement('option');
      opt.value = tz;
      opt.textContent = tz;
      if (tz === browserTz) opt.selected = true;
      tzSelect.appendChild(opt);
    });

    // Date format - use browser locale + timezone to detect appropriate format
    const browserLocale = navigator.language || 'en-US';
    let detectedDateFormat = 'MM/DD/YYYY'; // default

    // Check browser locale first
    if (
      browserLocale.startsWith('en-GB') ||
      browserLocale.startsWith('en-AU') ||
      browserLocale.startsWith('en-NZ') ||
      browserLocale.startsWith('de-') ||
      browserLocale.startsWith('fr-') ||
      browserLocale.startsWith('es-') ||
      browserLocale.startsWith('it-')
    ) {
      detectedDateFormat = 'DD/MM/YYYY';
    } else if (browserTz) {
      // If browser locale is generic, use timezone to infer region
      const tzString = browserTz.toLowerCase();
      if (
        tzString.includes('australia') ||
        tzString.includes('sydney') ||
        tzString.includes('melbourne') ||
        tzString.includes('brisbane') ||
        tzString.includes('perth') ||
        tzString.includes('adelaide') ||
        tzString.includes('hobart') ||
        tzString.includes('london') ||
        tzString.includes('europe') ||
        tzString.includes('paris') ||
        tzString.includes('berlin')
      ) {
        detectedDateFormat = 'DD/MM/YYYY';
      }
    }
    document.getElementById('date-format-select').value =
      localization.dateFormat === 'MM/DD/YYYY' ||
      localization.dateFormat === 'DD/MM/YYYY' ||
      localization.dateFormat === 'YYYY-MM-DD'
        ? localization.dateFormat
        : detectedDateFormat;

    // Time format
    document.getElementById('time-format-select').value =
      localization.timeFormat;

    // Font size
    const fontSizeSelect = document.getElementById('font-size-select');
    if (fontSizeSelect) {
      fontSizeSelect.value = localization.fontSize || 'small';
    }
    this.applyFontSize(localization.fontSize || 'small');

    // Streaks toggle
    const streaksCheckbox = document.getElementById('streaks-enabled');
    if (streaksCheckbox) {
      const streaksEnabled =
        this.currentSettings.streaksEnabled !== undefined
          ? this.currentSettings.streaksEnabled
          : true;
      streaksCheckbox.checked = streaksEnabled;
    }

    // Daily routine items
    this.renderRoutineItems(dailyRoutine);

    // Cleanup days
    document.getElementById('cleanup-days').value = cleanup.defaultCutoffDays;

    // Terminal username/hostname (loaded from config)
    this.loadTerminalPromptSettings();
  }

  /**
   * Load terminal prompt settings from config
   */
  async loadTerminalPromptSettings() {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) return;
      const config = await response.json();
      const usernameInput = document.getElementById('terminal-username');
      const hostnameInput = document.getElementById('terminal-hostname');
      if (usernameInput)
        usernameInput.value = config.mantra?.username || 'user';
      if (hostnameInput)
        hostnameInput.value = config.mantra?.hostname || 'matrix';
    } catch (error) {
      console.error('Error loading terminal prompt settings:', error);
    }
  }

  /**
   * Save terminal prompt settings to config
   */
  async saveTerminalPromptSettings() {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) return;
      const config = await response.json();

      const usernameInput = document.getElementById('terminal-username');
      const hostnameInput = document.getElementById('terminal-hostname');
      config.mantra.username = usernameInput ? usernameInput.value : 'user';
      config.mantra.hostname = hostnameInput ? hostnameInput.value : 'matrix';

      const saveResponse = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!saveResponse.ok) throw new Error('Failed to save prompt settings');
    } catch (error) {
      console.error('Error saving terminal prompt settings:', error);
    }
  }

  /**
   * Render daily routine items in settings
   */
  renderRoutineItems(items) {
    const container = document.getElementById('routine-items-list');
    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML =
        '<p style="color: var(--color-text-muted); text-align: center; padding: 12px">No items yet</p>';
      return;
    }

    items.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'routine-item-editor';
      const daysHtml = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
        .map(
          (d) =>
            `<label class="routine-day-label"><input type="checkbox" class="routine-day" data-day="${d}" ${(item.days || ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).includes(d) ? 'checked' : ''} />${d.charAt(0).toUpperCase()}</label>`
        )
        .join('');

      const safeLabel = UI.escapeHtml(item.label);
      const safeIcon = UI.escapeHtml(item.icon);
      itemEl.innerHTML = `
        <div class="routine-item-header">
          <label class="routine-item-checkbox">
            <input type="checkbox" ${item.enabled ? 'checked' : ''} class="routine-enable" />
            <span>${safeLabel}</span>
          </label>
          <button class="routine-item-delete" data-index="${index}">🗑️</button>
        </div>
        <div class="routine-item-fields">
          <input type="text" class="routine-label" value="${safeLabel}" placeholder="Item label" />
          <input type="text" class="routine-icon" value="${safeIcon}" placeholder="Icon" maxlength="2" />
        </div>
        <div class="routine-item-time-fields">
          <div class="routine-time-group">
            <label>Time</label>
            <input type="time" class="routine-start-time" value="${item.startTime || ''}" />
          </div>
          <div class="routine-time-group">
            <label>Duration (min)</label>
            <input type="number" class="routine-duration" value="${item.duration || 0}" min="0" max="1440" step="5" />
          </div>
        </div>
        <div class="routine-item-days">${daysHtml}</div>
      `;

      // Event listeners for this item
      const enableCheckbox = itemEl.querySelector('.routine-enable');
      const labelInput = itemEl.querySelector('.routine-label');
      const iconInput = itemEl.querySelector('.routine-icon');
      const startTimeInput = itemEl.querySelector('.routine-start-time');
      const durationInput = itemEl.querySelector('.routine-duration');
      const dayCheckboxes = itemEl.querySelectorAll('.routine-day');
      const deleteBtn = itemEl.querySelector('.routine-item-delete');

      enableCheckbox.addEventListener('change', () => {
        items[index].enabled = enableCheckbox.checked;
      });

      labelInput.addEventListener('change', () => {
        items[index].label = labelInput.value || `Item ${index + 1}`;
      });

      iconInput.addEventListener('change', () => {
        items[index].icon = iconInput.value || '◦';
      });

      startTimeInput.addEventListener('change', () => {
        items[index].startTime = startTimeInput.value || null;
      });

      durationInput.addEventListener('change', () => {
        items[index].duration = parseInt(durationInput.value, 10) || 0;
      });

      dayCheckboxes.forEach((cb) => {
        cb.addEventListener('change', () => {
          const checkedDays = [];
          dayCheckboxes.forEach((dcb) => {
            if (dcb.checked) checkedDays.push(dcb.dataset.day);
          });
          items[index].days = checkedDays;
        });
      });

      deleteBtn.addEventListener('click', () => {
        items.splice(index, 1);
        this.renderRoutineItems(items);
      });

      container.appendChild(itemEl);
    });
  }

  /**
   * Add new routine item
   */
  addRoutineItem() {
    const newItem = {
      id: Date.now().toString(),
      label: `New Item`,
      icon: '○',
      enabled: true,
      startTime: null,
      duration: 0,
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    };

    if (!this.currentSettings.dailyRoutine) {
      this.currentSettings.dailyRoutine = [];
    }

    if (this.currentSettings.dailyRoutine.length < 10) {
      this.currentSettings.dailyRoutine.push(newItem);
      this.renderRoutineItems(this.currentSettings.dailyRoutine);
    } else {
      this.showNotification('Maximum 10 items allowed', 'error');
    }
  }

  /**
   * Get current form values
   */
  getCurrentFormValues() {
    const updates = {
      timezone: {
        current: document.getElementById('timezone-select').value,
      },
      localization: {
        dateFormat: document.getElementById('date-format-select').value,
        timeFormat: document.getElementById('time-format-select').value,
        fontSize: document.getElementById('font-size-select').value,
      },
      streaksEnabled: document.getElementById('streaks-enabled').checked,
      dailyRoutine: this.currentSettings.dailyRoutine,
      cleanup: {
        defaultCutoffDays: parseInt(
          document.getElementById('cleanup-days').value,
          10
        ),
      },
    };

    return updates;
  }

  /**
   * Handle save settings button
   */
  async handleSaveSettings() {
    try {
      const updates = this.getCurrentFormValues();
      await this.saveSettings(updates);

      // Save terminal prompt settings to config
      await this.saveTerminalPromptSettings();

      this.showNotification('Settings saved. Refreshing app...');
      UI.showStatus('settings saved');

      // Reload config to update UI
      if (window.app && window.app.loadConfig) {
        await window.app.loadConfig();
      }

      // Update daily routine if it changed
      if (window.ui && window.ui.initDailyChecklist) {
        await window.ui.initDailyChecklist();
      }

      // Close modal and refresh page to apply all changes
      this.closeModal();
      setTimeout(() => {
        location.reload();
      }, 300);
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Error saving settings', 'error');
    }
  }

  /**
   * Handle reset to defaults
   */
  async handleResetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    try {
      const defaults = this.getDefaultSettings();
      await this.saveSettings(defaults);
      this.currentSettings = defaults;
      this.populateSettingsForm();
    } catch (error) {
      console.error('Error resetting settings:', error);
    }
  }

  /**
   * Switch settings tab
   */
  switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.settings-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update active tab content
    document.querySelectorAll('.settings-tab-content').forEach((content) => {
      content.classList.remove('active');
    });

    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent) {
      tabContent.classList.add('active');
    }
  }

  /**
   * Detect and handle timezone changes
   */
  checkTimezoneChange() {
    const browserTz = this.detectBrowserTimezone();
    const savedTz = this.currentSettings?.timezone?.current;

    if (savedTz && browserTz !== savedTz) {
      this.showTimezonePrompt(savedTz, browserTz);
    }
  }

  /**
   * Detect browser timezone
   */
  detectBrowserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.error('Error detecting timezone:', error);
      return 'UTC';
    }
  }

  /**
   * Show timezone change prompt
   */
  showTimezonePrompt(oldTz, newTz) {
    const promptText = document.getElementById('timezone-prompt-text');
    promptText.textContent = `Your timezone has changed from ${oldTz} to ${newTz}. Would you like to update your existing tasks?`;

    this.timezonePromptModal.classList.remove('hidden');
    this.timezonePromptModal.dataset.oldTz = oldTz;
    this.timezonePromptModal.dataset.newTz = newTz;
  }

  /**
   * Close timezone prompt
   */
  closeTimezonePrompt() {
    this.timezonePromptModal.classList.add('hidden');
  }

  /**
   * Handle timezone update
   */
  async handleTimezoneUpdate() {
    const newTz = this.timezonePromptModal.dataset.newTz;

    try {
      // Update timezone in settings
      const updates = {
        timezone: {
          current: newTz,
          lastDetected: new Date().toISOString(),
        },
      };

      await this.saveSettings(updates);
      this.closeTimezonePrompt();
      this.showNotification(`Timezone updated to ${newTz}`);

      // Update all task dates (would require recalculating task times)
      if (window.ui && window.ui.refreshTaskList) {
        window.ui.refreshTaskList();
      }
    } catch (error) {
      console.error('Error updating timezone:', error);
      this.showNotification('Failed to update timezone', 'error');
    }
  }

  /**
   * Handle keep current timezone (saves browser-detected timezone)
   */
  async handleKeepCurrentTimezone() {
    const newTz = this.timezonePromptModal.dataset.newTz;

    try {
      // Infer date format from timezone
      let dateFormat = 'MM/DD/YYYY';
      const tzString = newTz.toLowerCase();
      if (
        tzString.includes('australia') ||
        tzString.includes('sydney') ||
        tzString.includes('melbourne') ||
        tzString.includes('brisbane') ||
        tzString.includes('perth') ||
        tzString.includes('adelaide') ||
        tzString.includes('hobart') ||
        tzString.includes('london') ||
        tzString.includes('europe') ||
        tzString.includes('paris') ||
        tzString.includes('berlin')
      ) {
        dateFormat = 'DD/MM/YYYY';
      }

      // Update timezone and date format in settings
      const updates = {
        timezone: {
          current: newTz,
          lastDetected: new Date().toISOString(),
        },
        localization: {
          dateFormat,
        },
      };

      await this.saveSettings(updates);
      this.closeTimezonePrompt();
      this.showNotification(`Timezone set to ${newTz}, format: ${dateFormat}`);

      // Reload settings form to show updated values
      setTimeout(() => {
        this.loadSettings().then(() => this.populateSettingsForm());
      }, 300);
    } catch (error) {
      console.error('Error setting timezone:', error);
      this.showNotification('Failed to set timezone', 'error');
    }
  }

  /**
   * Update current time display
   */
  updateCurrentTimeDisplay() {
    const timeEl = document.getElementById('current-time');
    if (!timeEl) return;

    const now = new Date();
    const timeFormat = this.currentSettings?.localization?.timeFormat || '12h';

    let timeStr;
    if (timeFormat === '24h') {
      timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } else {
      timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    timeEl.textContent = timeStr;

    // Also update clock panel time
    const clockTimeEl = document.getElementById('clock-time');
    if (clockTimeEl) {
      clockTimeEl.textContent = timeStr;
    }
  }

  /**
   * Format date based on user settings
   * @param {string} dateStr - Date string in YYYY-MM-DD format or ISO format
   * @returns {string} Formatted date
   */
  formatDate(dateStr) {
    if (!dateStr) return '';

    try {
      const date = dateStr.match(/^\d{4}-\d{2}-\d{2}$/)
        ? new Date(dateStr + 'T00:00:00')
        : new Date(dateStr);
      const format =
        this.currentSettings?.localization?.dateFormat || 'MM/DD/YYYY';

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      if (format === 'DD/MM/YYYY') {
        return `${day}/${month}/${year}`;
      } else if (format === 'YYYY-MM-DD') {
        return `${year}-${month}-${day}`;
      }
      // MM/DD/YYYY (default)
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  }

  /**
   * Format time based on user settings
   * @param {string} timeStr - Time string in HH:mm format
   * @returns {string} Formatted time
   */
  formatTime(timeStr) {
    if (!timeStr) return '';

    try {
      const format = this.currentSettings?.localization?.timeFormat || '12h';
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const min = minutes;

      if (format === '24h') {
        return `${String(hour).padStart(2, '0')}:${min}`;
      }
      // 12h format
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${String(hour12).padStart(2, '0')}:${min} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeStr;
    }
  }

  /**
   * Apply font size setting to body
   */
  applyFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    if (size && size !== 'small') {
      document.body.classList.add(`font-${size}`);
    }
  }

  /**
   * Open settings modal
   */
  openModal() {
    this.modal.classList.remove('hidden');
    this.switchTab('general'); // Show general tab by default
  }

  /**
   * Close settings modal
   */
  closeModal() {
    this.modal.classList.add('hidden');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background-color: ${type === 'error' ? 'var(--color-error)' : 'var(--color-success)'};
      color: white;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Handle export backup
   */
  async handleExportBackup() {
    try {
      const [activeRes, archivedRes, archiveFilesRes, configRes] =
        await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/tasks/archived'),
          fetch('/api/tasks/archive-files'),
          fetch('/api/config'),
        ]);

      if (
        !activeRes.ok ||
        !archivedRes.ok ||
        !archiveFilesRes.ok ||
        !configRes.ok
      ) {
        throw new Error('Failed to fetch data for backup');
      }

      const activeTasks = await activeRes.json();
      const archivedTasks = await archivedRes.json();
      const archiveFileTasks = await archiveFilesRes.json();

      // Combine all tasks: active + archived in tasks.json + archived in archive files
      const allTasks = [...activeTasks, ...archivedTasks, ...archiveFileTasks];
      const config = await configRes.json();

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        tasks: allTasks,
        config: config,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const filename = `taskmanager-backup-${dateStr}.json`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      UI.showStatus('backup exported');
      this.showNotification(`Backup exported: ${filename}`);
    } catch (error) {
      console.error('Error exporting backup:', error);
      this.showNotification('Failed to export backup', 'error');
    }
  }

  /**
   * Handle backup file selection
   */
  handleBackupFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const errorEl = document.getElementById('backup-error');
    const previewEl = document.getElementById('backup-preview');
    const previewContentEl = document.getElementById('backup-preview-content');

    // Reset state
    errorEl.classList.add('hidden');
    previewEl.classList.add('hidden');
    this.pendingBackupData = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Validate structure
        if (!data.tasks || !Array.isArray(data.tasks)) {
          throw new Error('Invalid backup file: missing tasks array');
        }
        if (!data.config || typeof data.config !== 'object') {
          throw new Error('Invalid backup file: missing config object');
        }

        this.pendingBackupData = data;

        const activeTasks = data.tasks.filter((t) => !t.archived);
        const archivedTasks = data.tasks.filter((t) => t.archived);
        const exportDate = data.exportedAt
          ? new Date(data.exportedAt).toLocaleString()
          : 'Unknown';

        previewContentEl.innerHTML = `
          <p><strong>Backup date:</strong> ${exportDate}</p>
          <p><strong>Active tasks:</strong> ${activeTasks.length}</p>
          <p><strong>Archived tasks:</strong> ${archivedTasks.length}</p>
          <p><strong>Settings:</strong> included</p>
          <p class="backup-warning">This will replace all current tasks and settings.</p>
        `;
        previewEl.classList.remove('hidden');
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    };

    reader.onerror = () => {
      errorEl.textContent = 'Failed to read file';
      errorEl.classList.remove('hidden');
    };

    reader.readAsText(file);
  }

  /**
   * Handle import backup confirmation
   */
  async handleImportBackup() {
    if (!this.pendingBackupData) return;

    try {
      const response = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: this.pendingBackupData.tasks,
          config: this.pendingBackupData.config,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Import failed');
      }

      const result = await response.json();
      UI.showStatus(`backup imported: ${result.taskCount} tasks`);
      this.showNotification(`Backup imported: ${result.taskCount} tasks`);

      this.clearBackupPreview();

      // Reload page to reflect imported data
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      console.error('Error importing backup:', error);
      const errorEl = document.getElementById('backup-error');
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }

  /**
   * Clear backup preview state
   */
  clearBackupPreview() {
    this.pendingBackupData = null;
    document.getElementById('backup-preview').classList.add('hidden');
    document.getElementById('backup-error').classList.add('hidden');
    document.getElementById('backup-file-input').value = '';
  }

  /**
   * Handle import tasks file selection
   */
  handleImportTasksFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const errorEl = document.getElementById('import-tasks-error');
    const previewEl = document.getElementById('import-tasks-preview');
    const previewContentEl = document.getElementById(
      'import-tasks-preview-content'
    );

    errorEl.classList.add('hidden');
    previewEl.classList.add('hidden');
    this.pendingImportData = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (
          !data.tasks ||
          !Array.isArray(data.tasks) ||
          data.tasks.length === 0
        ) {
          throw new Error(
            'Invalid import file: must contain a non-empty "tasks" array'
          );
        }

        // Validate each task has a description
        for (let i = 0; i < data.tasks.length; i++) {
          if (!data.tasks[i].description || !data.tasks[i].description.trim()) {
            throw new Error(`Task at index ${i} is missing a description`);
          }
        }

        this.pendingImportData = data;

        const projectName = data.project || 'No project';
        const taskCount = data.tasks.length;
        const priorities = { high: 0, medium: 0, low: 0 };
        data.tasks.forEach((t) => {
          const p = t.priority || 'medium';
          if (priorities[p] !== undefined) priorities[p]++;
        });

        previewContentEl.innerHTML = `
          <p><strong>Project:</strong> ${UI.escapeHtml(projectName)}</p>
          <p><strong>Tasks to import:</strong> ${taskCount}</p>
          <p><strong>Priorities:</strong> ${priorities.high} high, ${priorities.medium} medium, ${priorities.low} low</p>
          <p style="color: var(--color-accent-green);">Tasks will be added alongside your existing tasks.</p>
        `;
        previewEl.classList.remove('hidden');
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove('hidden');
      }
    };

    reader.onerror = () => {
      errorEl.textContent = 'Failed to read file';
      errorEl.classList.remove('hidden');
    };

    reader.readAsText(file);
  }

  /**
   * Handle import tasks confirmation
   */
  async handleImportTasks() {
    if (!this.pendingImportData) return;

    try {
      const response = await fetch('/api/tasks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: this.pendingImportData.project || null,
          tasks: this.pendingImportData.tasks,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Import failed');
      }

      const result = await response.json();
      UI.showStatus(`imported ${result.imported} tasks`);
      this.showNotification(result.message);

      this.clearImportTasksPreview();

      setTimeout(() => location.reload(), 500);
    } catch (error) {
      console.error('Error importing tasks:', error);
      const errorEl = document.getElementById('import-tasks-error');
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  }

  /**
   * Clear import tasks preview state
   */
  clearImportTasksPreview() {
    this.pendingImportData = null;
    document.getElementById('import-tasks-preview').classList.add('hidden');
    document.getElementById('import-tasks-error').classList.add('hidden');
    document.getElementById('import-tasks-file-input').value = '';
  }

  /**
   * Get default settings structure
   */
  getDefaultSettings() {
    return {
      timezone: {
        current: this.detectBrowserTimezone(),
        autoDetect: true,
        lastDetected: new Date().toISOString(),
      },
      localization: {
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        firstDayOfWeek: 0,
        fontSize: 'small',
      },
      dailyRoutine: [
        { id: '1', label: 'Calendar', icon: '📅', enabled: true },
        { id: '2', label: 'Asana', icon: '✓', enabled: true },
        { id: '3', label: 'Email', icon: '✉️', enabled: true },
        { id: '4', label: 'Slack DMs', icon: '💬', enabled: true },
        { id: '5', label: 'Slack channels', icon: '📢', enabled: true },
      ],
      streaksEnabled: true,
      cleanup: {
        defaultCutoffDays: 30,
        lastCleanup: null,
      },
    };
  }

  /**
   * Get list of timezones
   */
  getTimezoneList() {
    // Common timezones - can be expanded
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Moscow',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Hong_Kong',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Pacific/Auckland',
    ];
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
    window.settingsManager.init();
  });
} else {
  window.settingsManager = new SettingsManager();
  window.settingsManager.init();
}
