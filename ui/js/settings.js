const DEALER_PIN = '9191';

const setDefaults = {
  shallow: 8,
  inspectionMode: false,
  model: 'Ri245',
  ampm: 'PM',
  hour: 12,
  minute: 0,
};

let setState = { ...setDefaults };
let setAdjTimer = null;
let setAdjInterval = null;
let setPinEntry = '';

// ─── Persist / load ────────────────────────────────────────────────────────────

function setLoad() {
  try {
    const saved = JSON.parse(localStorage.getItem('surf_settings') || '{}');
    setState = { ...setDefaults, ...saved };
  } catch (e) {
    setState = { ...setDefaults };
  }
}

function setPersist() {
  localStorage.setItem('surf_settings', JSON.stringify(setState));
}

// ─── Overlay load ──────────────────────────────────────────────────────────────

function loadSettingsOverlay() {
  const container = document.getElementById('settings-container');
  if (!container || container.dataset.loaded) return;
  fetch('../pages/settings.html')
    .then(r => r.text())
    .then(html => {
      container.innerHTML = html;
      container.dataset.loaded = 'true';
      setLoad();
      _setApplyState();
    });
}

function _setApplyState() {
  // Shallow alarm
  const shallowEl = document.getElementById('set-shallow-val');
  if (shallowEl) shallowEl.textContent = setState.shallow;

  // Inspection toggle
  const chk = document.getElementById('set-inspection-chk');
  if (chk) chk.checked = setState.inspectionMode;

  // Clock display
  const clockDisplay = document.getElementById('set-clock-display');
  if (clockDisplay) clockDisplay.textContent = `${setState.hour}:${String(setState.minute).padStart(2,'0')} ${setState.ampm}`;

  // Model
  ['RI230', 'Ri245', 'RI265'].forEach(m => {
    const btn = document.getElementById(`set-model-${m}`);
    if (btn) btn.classList.toggle('active', m === setState.model);
  });
}

// ─── Open / close ──────────────────────────────────────────────────────────────

function openSettings() {
  closeBallast();
  closeSurf();
  closeSwitches();
  closeProfiles();
  closeMusic();
  loadSettingsOverlay();
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.classList.add('active');
    setShowMain();
  }
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.classList.remove('active');
  setCloseDiag();
}

// ─── View switching ────────────────────────────────────────────────────────────

function _setShowView(id) {
  ['set-main-view', 'set-user-view', 'set-dealer-pin-view', 'set-dealer-view'].forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = v === id ? 'flex' : 'none';
  });
}

function setShowMain() {
  _setShowView('set-main-view');
  setPinEntry = '';
  _setPinRender();
}

function setShowUser() {
  _setShowView('set-user-view');
}

function setShowDealerPin() {
  setPinEntry = '';
  const errEl = document.getElementById('set-pin-error');
  if (errEl) errEl.textContent = '';
  _setPinRender();
  _setShowView('set-dealer-pin-view');
}

function setShowDealer() {
  _setShowView('set-dealer-view');
  _setApplyState();
}

// ─── Diagnostics popup ────────────────────────────────────────────────────────

function setOpenDiag() {
  const el = document.getElementById('set-diag-overlay');
  if (el) el.classList.add('active');
}

function setCloseDiag() {
  const el = document.getElementById('set-diag-overlay');
  if (el) el.classList.remove('active');
}

// ─── Inspection mode ──────────────────────────────────────────────────────────

function setToggleInspection(checked) {
  setState.inspectionMode = checked;
  setPersist();
}

// ─── Shallow water alarm (hold-to-repeat) ─────────────────────────────────────

function setStartAdj(key, dir, e) {
  _setDoAdj(key, dir);
  setAdjTimer = setTimeout(() => {
    setAdjInterval = setInterval(() => _setDoAdj(key, dir), 80);
  }, 400);
}

function setStopAdj() {
  clearTimeout(setAdjTimer);
  clearInterval(setAdjInterval);
}

function _setDoAdj(key, dir) {
  if (key === 'shallow') {
    setState.shallow = Math.min(25, Math.max(1, setState.shallow + dir));
    const el = document.getElementById('set-shallow-val');
    if (el) el.textContent = setState.shallow;
  }
  setPersist();
}

// ─── Clock numpad ─────────────────────────────────────────────────────────────

let setClockEntry = '';

function setOpenClockPad() {
  setClockEntry = '';
  _setClockRender();
  const ampmBtn = document.getElementById('set-clock-ampm-btn');
  if (ampmBtn) ampmBtn.textContent = setState.ampm;
  const overlay = document.getElementById('set-clock-overlay');
  if (overlay) overlay.classList.add('active');
}

function setCloseClockPad() {
  const overlay = document.getElementById('set-clock-overlay');
  if (overlay) overlay.classList.remove('active');
}

function setClockDigit(d) {
  if (setClockEntry.length >= 4) return;
  setClockEntry += d;
  _setClockRender();
}

function setClockBack() {
  setClockEntry = setClockEntry.slice(0, -1);
  _setClockRender();
}

function _setClockRender() {
  const el = document.getElementById('set-clock-digits');
  if (!el) return;
  const digits = setClockEntry.padEnd(4, '_');
  el.textContent = `${digits[0]}${digits[1]}:${digits[2]}${digits[3]}`;
}

function setClockDone() {
  if (setClockEntry.length < 4) return;
  let h = parseInt(setClockEntry.slice(0, 2));
  let m = parseInt(setClockEntry.slice(2, 4));
  if (isNaN(h) || isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) return;
  setState.hour   = h;
  setState.minute = m;
  setPersist();
  const display = document.getElementById('set-clock-display');
  if (display) display.textContent = `${h}:${String(m).padStart(2, '0')} ${setState.ampm}`;
  const homeDisplay = document.querySelector('.top-time');
  if (homeDisplay) homeDisplay.textContent = `${h}:${String(m).padStart(2, '0')} ${setState.ampm}`;
  setCloseClockPad();
}

function setToggleAmPm() {
  setState.ampm = setState.ampm === 'AM' ? 'PM' : 'AM';
  const btn = document.getElementById('set-clock-ampm-btn');
  if (btn) btn.textContent = setState.ampm;
  const display = document.getElementById('set-clock-display');
  if (display && setClockEntry.length === 0) {
    display.textContent = `${setState.hour}:${String(setState.minute).padStart(2,'0')} ${setState.ampm}`;
  }
  setPersist();
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function setChangeTheme() {
  // Placeholder — cycle body class for future theme support
}

// ─── Dealer PIN ───────────────────────────────────────────────────────────────

function setPinPress(digit) {
  if (setPinEntry.length >= 4) return;
  setPinEntry += digit;
  _setPinRender();
  if (setPinEntry.length === 4) {
    setTimeout(_setPinCheck, 120);
  }
}

function setPinBack() {
  setPinEntry = setPinEntry.slice(0, -1);
  _setPinRender();
  const errEl = document.getElementById('set-pin-error');
  if (errEl) errEl.textContent = '';
}

function _setPinRender() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`set-pin-dot-${i}`);
    if (dot) dot.classList.toggle('filled', i < setPinEntry.length);
  }
}

function _setPinCheck() {
  if (setPinEntry === DEALER_PIN) {
    setPinEntry = '';
    _setPinRender();
    setShowDealer();
  } else {
    const errEl = document.getElementById('set-pin-error');
    if (errEl) errEl.textContent = 'Incorrect code';
    setPinEntry = '';
    _setPinRender();
  }
}

// ─── Dealer: model selection ──────────────────────────────────────────────────

function setSelectModel(model) {
  setState.model = model;
  setPersist();
  ['RI230', 'Ri245', 'RI265'].forEach(m => {
    const btn = document.getElementById(`set-model-${m}`);
    if (btn) btn.classList.toggle('active', m === model);
  });
}
