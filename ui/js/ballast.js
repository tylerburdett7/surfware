// ─── Ballast state ────────────────────────────────────────────────────────────

const TANK_KEYS = ['bow', 'center', 'ramfillPort', 'ramfillStbd', 'portPnp', 'stbdPnp', 'transom'];
const RAMFILL_KEYS = ['ramfillPort', 'ramfillStbd'];
const RAMFILL_MIN_SPEED = 10;
const RAMFILL_MAX_SPEED = 15;

const TANK_NAME_TO_KEY = {
  'Bow':                'bow',
  'Center':             'center',
  'Ramfill Port':       'ramfillPort',
  'Ramfill Starboard':  'ramfillStbd',
  'Port PNP':           'portPnp',
  'Starboard PNP':      'stbdPnp',
  'Transom':            'transom',
};

const TANK_KEY_TO_ID = {
  bow:        'tank-bow',
  center:     'tank-center',
  ramfillPort: 'tank-ramfill-port',
  ramfillStbd: 'tank-ramfill-stbd',
  portPnp:    'tank-port-pnp',
  stbdPnp:    'tank-stbd-pnp',
  transom:    'tank-transom',
};

let ballastState = {};
let ballastTimes = {};
let ballastFilling = new Set();
let ballastDraining = new Set();
let ballastTargets = {};  // optional target % per tank when filling/draining to profile levels
let ballastInterval = null;
let currentSelectedTank = null;

const TICK_MS = 80;
const DEFAULT_FILL_SEC = 240;
const DEFAULT_DRAIN_SEC = 180;

// ─── Ballast times (from settings) ────────────────────────────────────────────

function ballastLoadTimes() {
  try {
    const raw = localStorage.getItem('surf_ballast_times');
    if (raw) ballastTimes = JSON.parse(raw);
  } catch (e) {}
  TANK_KEYS.forEach(k => {
    if (!ballastTimes[k]) ballastTimes[k] = { fill: DEFAULT_FILL_SEC, drain: DEFAULT_DRAIN_SEC };
  });
}

function ballastGetFillRate(key) {
  const t = ballastTimes[key] || { fill: DEFAULT_FILL_SEC };
  const sec = Math.max(10, t.fill);
  return (100 / sec) * (TICK_MS / 1000);
}

function ballastGetDrainRate(key) {
  const t = ballastTimes[key] || { drain: DEFAULT_DRAIN_SEC };
  const sec = Math.max(10, t.drain);
  return (100 / sec) * (TICK_MS / 1000);
}

// ─── Init state ───────────────────────────────────────────────────────────────

function ballastInitState() {
  TANK_KEYS.forEach(k => { ballastState[k] = 0; });
  ballastLoadTimes();
}

// ─── Render tank levels ───────────────────────────────────────────────────────

function ballastRender() {
  TANK_KEYS.forEach(key => {
    const pct = Math.round(ballastState[key] ?? 0);
    const el = document.querySelector('.' + TANK_KEY_TO_ID[key]);
    if (el) el.textContent = pct;
    const homeEl = document.querySelector(`#trip-carousel [data-ballast-key="${key}"]`);
    if (homeEl) homeEl.textContent = pct + '%';
  });
}

// ─── Tick: update filling/draining tanks ───────────────────────────────────────

function _ramfillSpeedOk() {
  const spd = typeof simCurrentSpeed !== 'undefined' ? simCurrentSpeed : 0;
  return spd >= RAMFILL_MIN_SPEED && spd <= RAMFILL_MAX_SPEED;
}

function _ramfillActive() {
  for (const k of RAMFILL_KEYS) {
    if (ballastFilling.has(k) || ballastDraining.has(k)) return true;
  }
  return false;
}

function _ramfillUpdateStatus() {
  const statusWrap = document.querySelector('.ramfill-status');
  if (!statusWrap) return;

  if (!_ramfillActive()) {
    statusWrap.style.display = 'none';
    return;
  }

  statusWrap.style.display = 'flex';
  const textEl = statusWrap.querySelector('.status-text');
  if (!textEl) return;

  const spd = typeof simCurrentSpeed !== 'undefined' ? simCurrentSpeed : 0;
  if (spd < RAMFILL_MIN_SPEED) {
    textEl.textContent = 'increase speed';
    textEl.style.color = '#c41e1e';
  } else if (spd > RAMFILL_MAX_SPEED) {
    textEl.textContent = 'decrease speed';
    textEl.style.color = '#c41e1e';
  } else {
    textEl.textContent = 'okay';
    textEl.style.color = '#2ecc40';
  }
}

function ballastTick() {
  let changed = false;
  const ramfillOk = _ramfillSpeedOk();

  ballastFilling.forEach(key => {
    if (RAMFILL_KEYS.includes(key) && !ramfillOk) return;
    const target = ballastTargets[key] ?? 100;
    if (ballastState[key] < target) {
      const rate = ballastGetFillRate(key);
      ballastState[key] = Math.min(target, ballastState[key] + rate);
      ballastDraining.delete(key);
      changed = true;
    } else {
      ballastFilling.delete(key);
      delete ballastTargets[key];
    }
  });

  ballastDraining.forEach(key => {
    if (RAMFILL_KEYS.includes(key) && !ramfillOk) return;
    const target = ballastTargets[key] ?? 0;
    if (ballastState[key] > target) {
      const rate = ballastGetDrainRate(key);
      ballastState[key] = Math.max(target, ballastState[key] - rate);
      ballastFilling.delete(key);
      changed = true;
    } else {
      ballastDraining.delete(key);
      delete ballastTargets[key];
    }
  });

  _ramfillUpdateStatus();
  if (changed) ballastRender();
  if (ballastFilling.size === 0 && ballastDraining.size === 0) ballastStopInterval();
}

function ballastStartInterval() {
  ballastLoadTimes();
  if (ballastInterval) return;
  ballastInterval = setInterval(ballastTick, TICK_MS);
}

function ballastStopInterval() {
  if (ballastInterval) {
    clearInterval(ballastInterval);
    ballastInterval = null;
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function ballastFill(key) {
  ballastDraining.delete(key);
  ballastFilling.add(key);
  ballastStartInterval();
  _ramfillUpdateStatus();
}

function ballastDrain(key) {
  ballastFilling.delete(key);
  ballastDraining.add(key);
  ballastStartInterval();
  _ramfillUpdateStatus();
}

function ballastStop(key) {
  ballastFilling.delete(key);
  ballastDraining.delete(key);
  _ramfillUpdateStatus();
  if (ballastFilling.size === 0 && ballastDraining.size === 0) ballastStopInterval();
}

function ballastFillAll() {
  _ballastResetSetAllBtn();
  TANK_KEYS.forEach(k => ballastFill(k));
}

function ballastDrainAll() {
  _ballastResetSetAllBtn();
  TANK_KEYS.forEach(k => ballastDrain(k));
}

function ballastStopAll() {
  _ballastResetSetAllBtn();
  ballastFilling.clear();
  ballastDraining.clear();
  _ramfillUpdateStatus();
  ballastStopInterval();
}

// Profile ballast keys (from profiles.js) → ballast TANK_KEYS
const PROFILE_TO_BALLAST = {
  ramfillPort: 'ramfillPort',
  ramfillStbd: 'ramfillStbd',
  center:      'center',
  portPnp:     'portPnp',
  stbdPnp:     'stbdPnp',
  bowPnp:      'bow',
  transomPnp:  'transom',
};

function ballastSetLevels(profileBallast) {
  if (!profileBallast) return;
  ballastFilling.clear();
  ballastDraining.clear();
  ballastTargets = {};
  ballastStopInterval();
  Object.entries(PROFILE_TO_BALLAST).forEach(([profKey, ballastKey]) => {
    const target = profileBallast[profKey];
    if (typeof target !== 'number') return;
    const val = Math.max(0, Math.min(100, target));
    const current = ballastState[ballastKey] ?? 0;
    if (current < val) {
      ballastTargets[ballastKey] = val;
      ballastFilling.add(ballastKey);
    } else if (current > val) {
      ballastTargets[ballastKey] = val;
      ballastDraining.add(ballastKey);
    }
  });
  if (ballastFilling.size > 0 || ballastDraining.size > 0) ballastStartInterval();
  ballastRender();
}

// ─── Set All To ──────────────────────────────────────────────────────────────

let setAllValue = 0;
let _setAllTimer = null;
let _setAllInterval = null;
let _setAllCount = 0;

function ballastToggleSetAll() {
  const panel = document.getElementById('set-all-panel');
  if (!panel) return;
  const opening = !panel.classList.contains('open');
  panel.classList.toggle('open');
  if (opening) {
    const el = document.getElementById('set-all-pct');
    if (el) el.textContent = setAllValue + '%';
  }
}

function _ballastCloseSetAllPanel() {
  const panel = document.getElementById('set-all-panel');
  if (panel) panel.classList.remove('open');
}

function ballastSetAllStart(dir) {
  _setAllCount = 0;
  _setAllDoAdj(dir);
  _setAllTimer = setTimeout(() => {
    _setAllInterval = setInterval(() => _setAllDoAdj(dir), 60);
  }, 400);
}

function ballastSetAllStop() {
  clearTimeout(_setAllTimer);
  clearInterval(_setAllInterval);
  _setAllTimer = null;
  _setAllInterval = null;
  _setAllCount = 0;
}

function _setAllDoAdj(dir) {
  _setAllCount++;
  const step = _setAllCount > 20 ? 5 : 1;
  setAllValue = Math.max(0, Math.min(100, setAllValue + dir * step));
  const el = document.getElementById('set-all-pct');
  if (el) el.textContent = setAllValue + '%';
}

function ballastConfirmSetAll() {
  _ballastCloseSetAllPanel();

  const btn = document.getElementById('set-all-btn');
  if (btn) {
    btn.innerHTML = 'SET ALL TO<br>' + setAllValue + '%';
    btn.classList.add('active');
  }

  TANK_KEYS.forEach(key => {
    const current = ballastState[key] ?? 0;
    ballastTargets[key] = setAllValue;
    if (current < setAllValue) {
      ballastDraining.delete(key);
      ballastFilling.add(key);
    } else if (current > setAllValue) {
      ballastFilling.delete(key);
      ballastDraining.add(key);
    } else {
      ballastFilling.delete(key);
      ballastDraining.delete(key);
    }
  });
  if (ballastFilling.size > 0 || ballastDraining.size > 0) ballastStartInterval();
  ballastRender();
}

function _ballastResetSetAllBtn() {
  const btn = document.getElementById('set-all-btn');
  if (btn) {
    btn.innerHTML = 'SET ALL TO';
    btn.classList.remove('active');
  }
  _ballastCloseSetAllPanel();
}

// ─── Individual tank Set To ──────────────────────────────────────────────────

let tankSetValue = 0;
let _tankSetTimer = null;
let _tankSetInterval = null;
let _tankSetCount = 0;

function tankToggleSetTo() {
  const controls = document.getElementById('tank-set-controls');
  if (!controls) return;
  const el = document.getElementById('tank-set-pct');
  if (el) el.textContent = tankSetValue + '%';
  controls.classList.add('open');
}

function _tankCloseSetControls() {
  const controls = document.getElementById('tank-set-controls');
  if (controls) controls.classList.remove('open');
}

function tankSetToStart(dir) {
  _tankSetCount = 0;
  _tankSetDoAdj(dir);
  _tankSetTimer = setTimeout(() => {
    _tankSetInterval = setInterval(() => _tankSetDoAdj(dir), 60);
  }, 400);
}

function tankSetToStop() {
  clearTimeout(_tankSetTimer);
  clearInterval(_tankSetInterval);
  _tankSetTimer = null;
  _tankSetInterval = null;
  _tankSetCount = 0;
}

function _tankSetDoAdj(dir) {
  _tankSetCount++;
  const step = _tankSetCount > 20 ? 5 : 1;
  tankSetValue = Math.max(0, Math.min(100, tankSetValue + dir * step));
  const el = document.getElementById('tank-set-pct');
  if (el) el.textContent = tankSetValue + '%';
}

function tankConfirmSetTo() {
  _tankCloseSetControls();
  if (!currentSelectedTank) return;

  const key = TANK_NAME_TO_KEY[currentSelectedTank];
  if (!key) return;

  const btn = document.getElementById('tank-set-btn');
  if (btn) {
    btn.innerHTML = 'SET TO<br>' + tankSetValue + '%';
    btn.classList.add('active');
  }

  const current = ballastState[key] ?? 0;
  ballastTargets[key] = tankSetValue;
  if (current < tankSetValue) {
    ballastDraining.delete(key);
    ballastFilling.add(key);
  } else if (current > tankSetValue) {
    ballastFilling.delete(key);
    ballastDraining.add(key);
  } else {
    ballastFilling.delete(key);
    ballastDraining.delete(key);
  }
  if (ballastFilling.size > 0 || ballastDraining.size > 0) ballastStartInterval();
  ballastRender();
}

function _tankResetSetBtn() {
  const btn = document.getElementById('tank-set-btn');
  if (btn) {
    btn.innerHTML = 'SET TO';
    btn.classList.remove('active');
  }
  _tankCloseSetControls();
}

// ─── Panel button handlers ────────────────────────────────────────────────────

function ballastOnFill() {
  if (!currentSelectedTank) return;
  _tankResetSetBtn();
  const key = TANK_NAME_TO_KEY[currentSelectedTank];
  if (key) ballastFill(key);
}

function ballastOnStop() {
  _tankResetSetBtn();
  if (currentSelectedTank) {
    const key = TANK_NAME_TO_KEY[currentSelectedTank];
    if (key) ballastStop(key);
  } else {
    ballastStopAll();
  }
}

function ballastOnDrain() {
  if (!currentSelectedTank) return;
  _tankResetSetBtn();
  const key = TANK_NAME_TO_KEY[currentSelectedTank];
  if (key) ballastDrain(key);
}

// ─── Load overlay & wire UI ───────────────────────────────────────────────────

function loadBallastOverlay() {
  fetch('../pages/ballast.html')
    .then(r => r.text())
    .then(html => {
      const container = document.getElementById('ballast-container');
      if (!container) return;
      container.innerHTML = html;
      ballastWireButtons();
      ballastRender();
    })
    .catch(e => console.error('Error loading ballast overlay:', e));
}

function ballastBoot() {
  ballastInitState();
  ballastRender();
  loadBallastOverlay();
}

function ballastWireButtons() {
  const fillAll = document.querySelector('.ballast-action.fill-all');
  const stopAll = document.querySelector('.ballast-action.stop-all');
  const drainAll = document.querySelector('.ballast-action.drain-all');
  const fillBtn = document.querySelector('.tank-panel-btn.fill-btn');
  const stopBtn = document.querySelector('.tank-panel-btn.stop-btn');
  const drainBtn = document.querySelector('.tank-panel-btn.drain-btn');

  if (fillAll) fillAll.onclick = ballastFillAll;
  if (stopAll) stopAll.onclick = ballastStopAll;
  if (drainAll) drainAll.onclick = ballastDrainAll;
  if (fillBtn)  fillBtn.onclick  = ballastOnFill;
  if (stopBtn)  stopBtn.onclick  = ballastOnStop;
  if (drainBtn) drainBtn.onclick = ballastOnDrain;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ballastBoot);
} else {
  ballastBoot();
}

// ─── Selection (unchanged) ────────────────────────────────────────────────────

function selectTank(tankName, event) {
  event.stopPropagation();
  _ballastCloseSetAllPanel();

  const boatWrapper = document.getElementById('boat-wrapper');
  const controlPanel = document.getElementById('tank-control-panel');
  const tankPanelName = document.getElementById('tank-panel-name');

  document.querySelectorAll('.ballast').forEach(el => el.classList.remove('selected'));
  _tankResetSetBtn();

  if (currentSelectedTank === tankName) {
    boatWrapper.classList.remove('shifted');
    controlPanel.classList.remove('active');
    currentSelectedTank = null;
  } else {
    boatWrapper.classList.add('shifted');
    tankPanelName.textContent = tankName;
    controlPanel.classList.add('active');
    currentSelectedTank = tankName;
    const key = TANK_NAME_TO_KEY[tankName];
    if (key) {
      const tankEl = document.querySelector('.' + TANK_KEY_TO_ID[key]);
      if (tankEl) tankEl.classList.add('selected');
    }
  }
}

function deselectTank() {
  const boatWrapper = document.getElementById('boat-wrapper');
  const controlPanel = document.getElementById('tank-control-panel');

  document.querySelectorAll('.ballast').forEach(el => el.classList.remove('selected'));
  _tankResetSetBtn();
  boatWrapper.classList.remove('shifted');
  controlPanel.classList.remove('active');
  currentSelectedTank = null;
}

// ─── Trailer mode popup ───────────────────────────────────────────────────────

function openTrailerModePopup() {
  const popup = document.getElementById('trailer-mode-popup');
  if (popup) popup.classList.add('active');
}

function closeTrailerModePopup() {
  const popup = document.getElementById('trailer-mode-popup');
  if (popup) popup.classList.remove('active');
}

function openFillGates() {
  const el = document.getElementById('fill-gates-status');
  if (el) el.textContent = 'open';
}

function closeFillGates() {
  const el = document.getElementById('fill-gates-status');
  if (el) el.textContent = 'closed';
}

function openDrainGates() {
  const el = document.getElementById('drain-gates-status');
  if (el) el.textContent = 'open';
}

function closeDrainGates() {
  const el = document.getElementById('drain-gates-status');
  if (el) el.textContent = 'closed';
}
