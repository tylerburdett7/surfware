// ─── WebSocket connection to Python sim server on Render ──────────────────────

const SIM_URL = 'wss://surfware-sim.onrender.com';
const SIM_HEALTH_URL = 'https://surfware-sim.onrender.com/health';

let simWS = null;
let simThrottle = 0;

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
  };

  simWS.onmessage = (event) => {
    const data = JSON.parse(event.data);
    simUpdateUI(data);
  };

  simWS.onclose = () => {
    console.log('Sim disconnected — retrying in 3s');
    simSetStatus('offline');
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

function simSendState() {
  if (!simWS || simWS.readyState !== WebSocket.OPEN) return;

  const cruiseBtn = document.querySelector('.cruise-button');
  const cruiseOn  = cruiseBtn && cruiseBtn.classList.contains('active');
  const cruiseSpd = typeof cruiseSpeed !== 'undefined' ? cruiseSpeed : 0;

  simWS.send(JSON.stringify({
    throttle:    simThrottle,
    cruise_on:   cruiseOn,
    cruise_speed: cruiseSpd,
  }));
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

  // Engine temp
  if (data.etemp !== undefined) {
    const etempEl = document.getElementById('diag-etemp');
    if (etempEl) etempEl.textContent = Math.round(data.etemp) + '°';
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

simWakeServer();
simConnect();
