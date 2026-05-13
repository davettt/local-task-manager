/**
 * Custom time input widget — replaces native <input type="time">
 * with hour, minute, and AM/PM fields.
 */
class TimeWidget {
  static initAll() {
    document.querySelectorAll('.custom-time-input').forEach((widget) => {
      TimeWidget.init(widget);
    });
  }

  static init(widget) {
    const hourInput = widget.querySelector('.time-hour');
    const minuteInput = widget.querySelector('.time-minute');
    const periodSelect = widget.querySelector('.time-period');
    const clearBtn = widget.querySelector('.time-clear-btn');
    const hiddenInput = widget
      .closest('.form-group')
      .querySelector('input[type="hidden"]');

    function syncHidden() {
      const h = hourInput.value;
      const m = minuteInput.value;
      const p = periodSelect.value;
      if (!h || !p) {
        hiddenInput.value = '';
        return;
      }
      let hour24 = parseInt(h, 10);
      if (p === 'AM' && hour24 === 12) hour24 = 0;
      if (p === 'PM' && hour24 !== 12) hour24 += 12;
      hiddenInput.value = `${String(hour24).padStart(2, '0')}:${m || '00'}`;
    }

    hourInput.addEventListener('keydown', (e) => {
      if (
        !/^\d$/.test(e.key) &&
        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(
          e.key
        )
      ) {
        e.preventDefault();
        return;
      }

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        const current = hourInput.value;

        if (current === '') {
          if (parseInt(e.key, 10) >= 2) {
            hourInput.value = e.key;
            minuteInput.value = '00';
            if (!periodSelect.value) periodSelect.value = 'AM';
            syncHidden();
            minuteInput.focus();
            minuteInput.select();
          } else {
            hourInput.value = e.key;
          }
        } else if (current.length === 1) {
          const full = current + e.key;
          const num = parseInt(full, 10);
          if (num >= 1 && num <= 12) {
            hourInput.value = full;
          } else {
            hourInput.value = e.key;
          }
          minuteInput.value = '00';
          if (!periodSelect.value) periodSelect.value = 'AM';
          syncHidden();
          minuteInput.focus();
          minuteInput.select();
        }
      }
    });

    minuteInput.addEventListener('keydown', (e) => {
      if (
        !/^\d$/.test(e.key) &&
        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(
          e.key
        )
      ) {
        e.preventDefault();
        return;
      }

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        const current = minuteInput.value;

        if (current === '' || current === '00') {
          if (parseInt(e.key, 10) >= 6) {
            minuteInput.value = '0' + e.key;
            syncHidden();
            periodSelect.focus();
          } else {
            minuteInput.value = e.key;
          }
        } else if (current.length === 1) {
          const full = current + e.key;
          minuteInput.value = full;
          syncHidden();
          periodSelect.focus();
        } else {
          minuteInput.value = e.key;
        }
      }
    });

    hourInput.addEventListener('blur', () => {
      if (hourInput.value && !periodSelect.value) {
        periodSelect.value = 'AM';
      }
      syncHidden();
    });

    minuteInput.addEventListener('blur', () => {
      const v = minuteInput.value;
      if (v && v.length === 1) {
        minuteInput.value = '0' + v;
      }
      syncHidden();
    });

    minuteInput.addEventListener('focus', () => {
      if (minuteInput.value === '00') {
        minuteInput.select();
      }
    });

    hourInput.addEventListener('focus', () => {
      hourInput.select();
    });

    periodSelect.addEventListener('change', () => {
      syncHidden();
    });

    clearBtn.addEventListener('click', () => {
      hourInput.value = '';
      minuteInput.value = '';
      periodSelect.value = '';
      hiddenInput.value = '';
    });

    widget._syncFromHidden = function () {
      const val = hiddenInput.value;
      if (!val) {
        hourInput.value = '';
        minuteInput.value = '';
        periodSelect.value = '';
        return;
      }
      const [hStr, mStr] = val.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr || '00';
      let period = 'AM';
      if (h === 0) {
        h = 12;
        period = 'AM';
      } else if (h === 12) {
        period = 'PM';
      } else if (h > 12) {
        h -= 12;
        period = 'PM';
      }
      hourInput.value = String(h);
      minuteInput.value = m;
      periodSelect.value = period;
    };
  }

  static syncFromHidden(widgetId) {
    const widget = document.getElementById(widgetId);
    if (widget && widget._syncFromHidden) {
      widget._syncFromHidden();
    }
  }
}
