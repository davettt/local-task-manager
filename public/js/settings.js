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

    // Daily routine items
    this.renderRoutineItems(dailyRoutine);

    // Cleanup days
    document.getElementById('cleanup-days').value = cleanup.defaultCutoffDays;

    // Terminal mantra (loaded from config, not settings)
    this.loadMantraSettings();
  }

  /**
   * Load mantra settings from config
   */
  async loadMantraSettings() {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      const config = await response.json();
      const { mantra } = config;

      document.getElementById('terminal-username').value =
        mantra.username || 'user';
      document.getElementById('terminal-hostname').value =
        mantra.hostname || 'matrix';
      document.getElementById('mantra-text').value = mantra.text;
      document.getElementById('mantra-desc-1').value =
        mantra.descriptions?.nameIt || '';
      document.getElementById('mantra-desc-2').value =
        mantra.descriptions?.traceIt || '';
      document.getElementById('mantra-desc-3').value =
        mantra.descriptions?.fixIt || '';
      document.getElementById('mantra-desc-4').value =
        mantra.descriptions?.shareIt || '';
    } catch (error) {
      console.error('Error loading mantra settings:', error);
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
        '<p style="color: #586e75; text-align: center; padding: 12px">No items yet</p>';
      return;
    }

    items.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'routine-item-editor';
      itemEl.innerHTML = `
        <div class="routine-item-header">
          <label class="routine-item-checkbox">
            <input type="checkbox" ${item.enabled ? 'checked' : ''} class="routine-enable" />
            <span>${item.label}</span>
          </label>
          <button class="routine-item-delete" data-index="${index}">🗑️</button>
        </div>
        <div class="routine-item-fields">
          <input type="text" class="routine-label" value="${item.label}" placeholder="Item label" />
          <input type="text" class="routine-icon" value="${item.icon}" placeholder="Icon" maxlength="2" />
        </div>
      `;

      // Event listeners for this item
      const enableCheckbox = itemEl.querySelector('.routine-enable');
      const labelInput = itemEl.querySelector('.routine-label');
      const iconInput = itemEl.querySelector('.routine-icon');
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
      },
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

      // Save mantra settings separately
      await this.saveMantraSettings();

      this.showNotification('Settings saved. Refreshing app...');

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
   * Save mantra settings to config
   */
  async saveMantraSettings() {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      const config = await response.json();

      config.mantra.username =
        document.getElementById('terminal-username').value;
      config.mantra.hostname =
        document.getElementById('terminal-hostname').value;
      config.mantra.text = document.getElementById('mantra-text').value;
      config.mantra.descriptions = {
        nameIt: document.getElementById('mantra-desc-1').value,
        traceIt: document.getElementById('mantra-desc-2').value,
        fixIt: document.getElementById('mantra-desc-3').value,
        shareIt: document.getElementById('mantra-desc-4').value,
      };

      const saveResponse = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!saveResponse.ok) throw new Error('Failed to save mantra settings');
    } catch (error) {
      console.error('Error saving mantra settings:', error);
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
  }

  /**
   * Format date based on user settings
   * @param {string} dateStr - Date string in YYYY-MM-DD format or ISO format
   * @returns {string} Formatted date
   */
  formatDate(dateStr) {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);
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
      background-color: ${type === 'error' ? '#dc322f' : '#2ecc71'};
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
      },
      dailyRoutine: [
        { id: '1', label: 'Calendar', icon: '📅', enabled: true },
        { id: '2', label: 'Asana', icon: '✓', enabled: true },
        { id: '3', label: 'Email', icon: '✉️', enabled: true },
        { id: '4', label: 'Slack DMs', icon: '💬', enabled: true },
        { id: '5', label: 'Slack channels', icon: '📢', enabled: true },
      ],
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
