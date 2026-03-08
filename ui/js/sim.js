// ─── WebSocket connection to Python sim server on Render ──────────────────────

const SIM_URL = 'wss://surfware-sim.onrender.com';

let simWS = null;
let simThrottle = 0;

function simConnect() {
  simWS = new WebSocket(SIM_URL);

  simWS.onopen = () => {
    console.log('Sim connected');
  };

  simWS.onmessage = (event) => {
    const data = JSON.parse(event.data);
    simUpdateUI(data);
  };

  simWS.onclose = () => {
    console.log('Sim disconnected — retrying in 2s');
    setTimeout(simConnect, 2000);
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

  if (simWS && simWS.readyState === WebSocket.OPEN) {
    simWS.send(JSON.stringify({ throttle: simThrottle }));
  }
}

// ─── Update gauges from server state ─────────────────────────────────────────

function simUpdateUI(data) {
  const speed = data.speed;
  const rpm   = data.rpm;

  // Speed value + meter fill (0–60 mph range)
  const speedValEl = document.querySelector('.speed-gauge .gauge-value');
  if (speedValEl) speedValEl.innerHTML = speed.toFixed(1) + ' <span>MPH</span>';
  const speedFill = document.querySelector('.speed-fill');
  if (speedFill) speedFill.style.width = Math.min(100, (speed / 60) * 100) + '%';

  // RPM value + meter fill (0–8000 rpm range)
  document.querySelectorAll('.gauge').forEach(g => {
    if (g.querySelector('.rpm-fill')) {
      const valEl = g.querySelector('.gauge-value');
      if (valEl) valEl.innerHTML = rpm.toLocaleString() + ' <span>RPM</span>';
    }
  });
  const rpmFill = document.querySelector('.rpm-fill');
  if (rpmFill) rpmFill.style.width = Math.min(100, (rpm / 8000) * 100) + '%';
}

// ─── Start ────────────────────────────────────────────────────────────────────

simConnect();
