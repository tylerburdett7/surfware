// ─── WebSocket connection to Python sim server on Render ──────────────────────

const SIM_URL = 'wss://surfware-sim.onrender.com';
const SIM_HEALTH_URL = 'https://surfware-sim.onrender.com/health';

let simWS = null;
let simThrottle = 0;
let simActiveCodes = [];
let simStoredCodes = [];
let simLocalOverheatRunning = false;
let simLocalOverheatInterval = null;
let simLocalEtemp = null;

function simSetStatus(status) {
  const el = document.getElementById('sim-status');
  if (!el) return;
  el.className = 'sim-status sim-status--' + status;
  const label = el.querySelector('.sim-status-label');
  if (label) {
    const map = {
      connecting: 'Connecting…',
      connected:  'Connected',
      offline:    'Offline',
    };
    label.textContent = map[status] || status;
  }
}

function simWakeServer() {
  setSimStatus('connecting');
  fetch(SIM_HEALTH_URL, { mode: 'no-cors' }).catch(() => {});
}

function setSimStatus(s) { simSetStatus(s); }

function simConnect() {
  simSetStatus('connecting');
  simWS = new WebSocket(SIM_URL);

  simWS.onopen = () => {
    console.log('Sim connected');
    simSetStatus('connected');
    simSendState();
  };

  simWS.onmessage = (event) => {
    const data = JSON.parse(event.data);
    simUpdateUI(data);
  };

  simWS.onclose = () => {
    console.log('Sim disconnected — retrying in 3s');
    simSetStatus('offline');
    simStopCruiseSync();
    setTimeout(simConnect, 3000);
  };

  simWS.onerror = () => {
    simWS.close();
  };
}

// ─── Throttle input ───────────────────────────────────────────────────────────

function simSetThrottle(val) {
  simThrottle = parseInt(val);

  const pctEl = document.getElementById('throttle-pct');
  if (pctEl) pctEl.textContent = simThrottle + '%';

  simSendState();
}

function simSendCruise() {
  simSendState();
}

let simCruiseInterval = null;

function simStartCruiseSync() {
  if (simCruiseInterval) return;
  simCruiseInterval = setInterval(simSendState, 200);
}

function simStopCruiseSync() {
  if (simCruiseInterval) {
    clearInterval(simCruiseInterval);
    simCruiseInterval = null;
  }
}

function simSendState() {
  if (!simWS || simWS.readyState !== WebSocket.OPEN) return;

  const cruiseBtn = document.querySelector('.cruise-button');
  const cruiseOn  = cruiseBtn && cruiseBtn.classList.contains('active');
  const cruiseSpd = typeof cruiseSpeed !== 'undefined' ? cruiseSpeed : 0;

  const payload = {
    throttle:    simThrottle,
    cruise_on:   cruiseOn,
    cruise_speed: cruiseSpd,
  };
  simWS.send(JSON.stringify(payload));

  if (cruiseOn) simStartCruiseSync();
  else simStopCruiseSync();
}

function simStartErrorSim() {
  if (simLocalOverheatRunning) return;
  simLocalOverheatRunning = true;
  const btn = document.getElementById('error-sim-btn');
  if (btn) btn.disabled = true;

  if (simWS && simWS.readyState === WebSocket.OPEN) {
    simWS.send(JSON.stringify({ start_error_sim: 'overheat' }));
  }

  const etempEl = document.getElementById('diag-etemp');
  let etemp = simLocalEtemp != null ? simLocalEtemp : (etempEl ? parseFloat(etempEl.textContent) || 140 : 140);
  const startTemp = etemp;
  const targetTemp = 220;
  const durationMs = 20000;
  const startTime = Date.now();

  function tick() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    etemp = startTemp + (targetTemp - startTemp) * progress;
    simLocalEtemp = etemp;

    if (etempEl) etempEl.textContent = Math.round(etemp) + '°';

    if (etemp > 210) {
      const codeId = 'P0217';
      if (!simActiveCodes.some(c => c.code === codeId)) {
        simActiveCodes.push({
          code: codeId,
          desc: 'Engine Coolant Over Temperature',
          severity: 'Do not operate. Take to dealer immediately.',
          severity_class: 'critical',
        });
        simRefreshDiagDisplay();
      }
    }

    if (progress >= 1) {
      clearInterval(simLocalOverheatInterval);
      simLocalOverheatInterval = null;
      /* leave simLocalOverheatRunning true, temp high, until codes cleared */
    }
  }

  simLocalOverheatInterval = setInterval(tick, 100);
  tick();
}

// ─── Update gauges from server state ─────────────────────────────────────────

function simUpdateUI(data) {
  const speed = data.speed;
  const rpm   = data.rpm;

  const speedValEl = document.querySelector('.speed-gauge .gauge-value');
  if (speedValEl) speedValEl.innerHTML = speed.toFixed(1) + ' <span>MPH</span>';
  const speedFill = document.querySelector('.speed-fill');
  if (speedFill) speedFill.style.width = Math.min(100, (speed / 60) * 100) + '%';

  document.querySelectorAll('.gauge').forEach(g => {
    if (g.querySelector('.rpm-fill')) {
      const valEl = g.querySelector('.gauge-value');
      if (valEl) valEl.innerHTML = rpm.toLocaleString() + ' <span>RPM</span>';
    }
  });
  const rpmFill = document.querySelector('.rpm-fill');
  if (rpmFill) rpmFill.style.width = Math.min(100, (rpm / 8000) * 100) + '%';

  // Oil pressure
  if (data.oil_psi !== undefined) {
    const oilEl = document.getElementById('diag-oil');
    if (oilEl) oilEl.textContent = Math.round(data.oil_psi) + ' PSI';
  }

  // Engine temp (skip if local overheat is running)
  if (data.etemp !== undefined && !simLocalOverheatRunning) {
    simLocalEtemp = data.etemp;
    const etempEl = document.getElementById('diag-etemp');
    if (etempEl) etempEl.textContent = Math.round(data.etemp) + '°';
  }

  // Diagnostic codes from server
  if (Array.isArray(data.codes) && !simLocalOverheatRunning) {
    simActiveCodes = data.codes;
    simRefreshDiagDisplay();
  }
}

function simUpdateCheckEngineLight() {
  const el = document.getElementById('check-engine-light');
  if (!el) return;
  el.style.display = simActiveCodes.length > 0 ? '' : 'none';
}

function simRefreshDiagDisplay() {
  const tab = document.querySelector('.set-diag-tab.active');
  const view = tab && tab.dataset.view === 'stored' ? 'stored' : 'active';
  const codes = view === 'stored' ? simStoredCodes : simActiveCodes;
  const emptyText = view === 'stored' ? 'No stored codes' : 'No active codes';
  simUpdateDiagCodes(codes, emptyText, view);
  simUpdateCheckEngineLight();
}

function simUpdateDiagCodes(codes, emptyText, view) {
  const emptyEl = document.getElementById('set-diag-empty');
  const codesEl = document.getElementById('set-diag-codes');
  if (!emptyEl || !codesEl) return;
  if (!codes || codes.length === 0) {
    emptyEl.style.display = '';
    emptyEl.textContent = emptyText || 'No active codes';
    codesEl.style.display = 'none';
    codesEl.innerHTML = '';
    return;
  }
  emptyEl.style.display = 'none';
  codesEl.style.display = 'flex';
  const showRemove = view === 'stored';
  codesEl.innerHTML = codes.map(c => {
    const codeEsc = (c.code || '').replace(/</g, '&lt;');
    const descEsc = (c.desc || '').replace(/</g, '&lt;');
    const sevEsc = (c.severity || '').replace(/</g, '&lt;');
    const codeAttr = (c.code || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const removeBtn = showRemove ? `<button class="set-diag-code-remove" onclick="simRemoveStoredCode(this.dataset.code)" data-code="${codeAttr}" title="Remove">×</button>` : '';
    return `<div class="set-diag-code set-diag-code--${c.severity_class || 'info'}">
      ${removeBtn}
      <div class="set-diag-code-id">${codeEsc}</div>
      <div class="set-diag-code-desc">${descEsc}</div>
      <div class="set-diag-code-severity">${sevEsc}</div>
    </div>`;
  }).join('');
}

function simRemoveStoredCode(codeId) {
  simStoredCodes = simStoredCodes.filter(c => c.code !== codeId);
  try { localStorage.setItem('surf_stored_codes', JSON.stringify(simStoredCodes)); } catch (_) {}
  simRefreshDiagDisplay();
}

function simClearActiveCodes() {
  simActiveCodes = [];
  if (simWS && simWS.readyState === WebSocket.OPEN) {
    simWS.send(JSON.stringify({ clear_codes: true }));
  }
  /* end local overheat sim: reset temp, re-enable run button */
  if (simLocalOverheatRunning) {
    simLocalOverheatRunning = false;
    simLocalEtemp = 140;
    const etempEl = document.getElementById('diag-etemp');
    if (etempEl) etempEl.textContent = '140°';
    const btn = document.getElementById('error-sim-btn');
    if (btn) btn.disabled = false;
  }
  simRefreshDiagDisplay();
}

function simStoreCodes() {
  const existing = new Set(simStoredCodes.map(c => c.code));
  for (const c of simActiveCodes) {
    if (c.code && !existing.has(c.code)) {
      simStoredCodes.push(c);
      existing.add(c.code);
    }
  }
  try { localStorage.setItem('surf_stored_codes', JSON.stringify(simStoredCodes)); } catch (_) {}
}

function simLoadStoredCodes() {
  try {
    const raw = localStorage.getItem('surf_stored_codes');
    simStoredCodes = raw ? JSON.parse(raw) : [];
  } catch (_) { simStoredCodes = []; }
}

// ─── Start ────────────────────────────────────────────────────────────────────

simWakeServer();
simConnect();
