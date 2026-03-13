// ─── Ballast state ────────────────────────────────────────────────────────────

const TANK_KEYS = ['bow', 'center', 'ramfillPort', 'ramfillStbd', 'portPnp', 'stbdPnp', 'transom'];

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
    const el = document.querySelector('.' + TANK_KEY_TO_ID[key]);
    if (el) el.textContent = Math.round(ballastState[key]);
  });
}

// ─── Tick: update filling/draining tanks ───────────────────────────────────────

function ballastTick() {
  let changed = false;

  ballastFilling.forEach(key => {
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
}

function ballastDrain(key) {
  ballastFilling.delete(key);
  ballastDraining.add(key);
  ballastStartInterval();
}

function ballastStop(key) {
  ballastFilling.delete(key);
  ballastDraining.delete(key);
  if (ballastFilling.size === 0 && ballastDraining.size === 0) ballastStopInterval();
}

function ballastFillAll() {
  TANK_KEYS.forEach(k => ballastFill(k));
}

function ballastDrainAll() {
  TANK_KEYS.forEach(k => ballastDrain(k));
}

function ballastStopAll() {
  ballastFilling.clear();
  ballastDraining.clear();
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

// ─── Panel button handlers ────────────────────────────────────────────────────

function ballastOnFill() {
  if (!currentSelectedTank) return;
  const key = TANK_NAME_TO_KEY[currentSelectedTank];
  if (key) ballastFill(key);
}

function ballastOnStop() {
  if (currentSelectedTank) {
    const key = TANK_NAME_TO_KEY[currentSelectedTank];
    if (key) ballastStop(key);
  } else {
    ballastStopAll();
  }
}

function ballastOnDrain() {
  if (!currentSelectedTank) return;
  const key = TANK_NAME_TO_KEY[currentSelectedTank];
  if (key) ballastDrain(key);
}

// ─── Load overlay & wire UI ───────────────────────────────────────────────────

function loadBallastOverlay() {
  fetch('../pages/ballast.html')
    .then(r => r.text())
    .then(html => {
      const container = document.getElementById('ballast-container');
      container.innerHTML = html;
      ballastInitState();
      ballastRender();
      ballastWireButtons();
    })
    .catch(e => console.error('Error loading ballast overlay:', e));
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
  document.addEventListener('DOMContentLoaded', loadBallastOverlay);
} else {
  loadBallastOverlay();
}

// ─── Selection (unchanged) ────────────────────────────────────────────────────

function selectTank(tankName, event) {
  event.stopPropagation();

  const boatWrapper = document.getElementById('boat-wrapper');
  const controlPanel = document.getElementById('tank-control-panel');
  const tankPanelName = document.getElementById('tank-panel-name');

  if (currentSelectedTank === tankName) {
    boatWrapper.classList.remove('shifted');
    controlPanel.classList.remove('active');
    currentSelectedTank = null;
  } else {
    boatWrapper.classList.add('shifted');
    tankPanelName.textContent = tankName;
    controlPanel.classList.add('active');
    currentSelectedTank = tankName;
  }
}

function deselectTank() {
  const boatWrapper = document.getElementById('boat-wrapper');
  const controlPanel = document.getElementById('tank-control-panel');

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
