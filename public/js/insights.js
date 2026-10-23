/* eslint-disable no-unused-vars */
class Insights {
  constructor() {
    this.storageKey = 'insightsState';
    this.tips = [];
    this.state = this.loadState();
  }

  loadState() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch {
      // corrupted state
    }
    return { shownIds: [], lastDailyDate: null, nudgeOpenCount: 0 };
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // storage full or blocked
    }
  }

  async loadTips() {
    try {
      const res = await fetch('/api/insights/tips');
      if (res.ok) {
        const data = await res.json();
        this.tips = data.tips || [];
      }
    } catch {
      this.tips = [];
    }
  }

  pickTip(context) {
    const pool = this.tips.filter((t) => t.contexts.includes(context));
    if (pool.length === 0) return null;

    const unseen = pool.filter((t) => !this.state.shownIds.includes(t.id));
    const candidates = unseen.length > 0 ? unseen : pool;

    if (unseen.length === 0) {
      this.state.shownIds = this.state.shownIds.filter((id) => !pool.some((t) => t.id === id));
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    this.state.shownIds.push(pick.id);
    this.saveState();
    return pick;
  }

  maybeShowDailyInsight(enabled) {
    const card = document.getElementById('daily-insight-card');
    if (!card) return;

    if (!enabled || this.tips.length === 0) {
      card.hidden = true;
      return;
    }

    const today = new Date().toDateString();
    if (this.state.lastDailyDate === today) {
      card.hidden = true;
      return;
    }

    this.state.lastDailyDate = today;
    const tip = this.pickTip('daily');
    if (!tip) {
      card.hidden = true;
      return;
    }

    card.textContent = '';
    const inner = document.createElement('div');
    inner.className = 'insight-card-inner';

    const label = document.createElement('span');
    label.className = 'insight-label';
    label.textContent = 'daily reflection';
    inner.appendChild(label);

    const text = document.createElement('p');
    text.className = 'insight-text';
    text.textContent = tip.text;
    inner.appendChild(text);

    const dismiss = document.createElement('button');
    dismiss.className = 'insight-dismiss';
    dismiss.title = 'Dismiss';
    dismiss.textContent = '×';
    dismiss.addEventListener('click', () => {
      card.hidden = true;
    });
    inner.appendChild(dismiss);

    card.appendChild(inner);
    card.hidden = false;
  }

  maybeShowTaskCreationNudge(enabled, activeTaskCount) {
    const nudge = document.getElementById('insight-nudge');
    if (!nudge) return;

    if (!enabled || activeTaskCount < 5 || this.tips.length === 0) {
      nudge.hidden = true;
      return;
    }

    this.state.nudgeOpenCount++;
    this.saveState();

    if (this.state.nudgeOpenCount % 3 !== 0) {
      nudge.hidden = true;
      return;
    }

    const tip = this.pickTip('creation');
    if (!tip) {
      nudge.hidden = true;
      return;
    }

    nudge.textContent = '';
    const labelEl = document.createElement('span');
    labelEl.className = 'insight-label';
    labelEl.textContent = 'pause';
    nudge.appendChild(labelEl);
    nudge.appendChild(document.createTextNode(' '));
    const textEl = document.createElement('span');
    textEl.className = 'insight-text-inline';
    textEl.textContent = tip.text;
    nudge.appendChild(textEl);
    nudge.hidden = false;
  }

  showPomodoroReflection(enabled) {
    const el = document.getElementById('break-insight-reflection');
    if (!el) return;

    if (!enabled || this.tips.length === 0) {
      el.hidden = true;
      return;
    }

    const tip = this.pickTip('pomodoro');
    if (!tip) {
      el.hidden = true;
      return;
    }

    el.textContent = tip.text;
    el.hidden = false;
  }
}

const insights = new Insights();
