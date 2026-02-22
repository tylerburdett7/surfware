let musIsPlaying = true;
let musMuted = false;

// ─── Overlay load ──────────────────────────────────────────────────────────────

function loadMusicOverlay() {
  const container = document.getElementById('music-container');
  if (!container || container.dataset.loaded) return;
  fetch('../pages/music.html')
    .then(r => r.text())
    .then(html => {
      container.innerHTML = html;
      container.dataset.loaded = 'true';

      const slider = document.getElementById('mus-vol-slider');
      if (slider) {
        slider.addEventListener('input', () => {
          if (musMuted) musToggleMute();
        });
      }

      // Wire zone sliders to show live values
      ['tower','bow','cockpit','sub'].forEach(zone => {
        const el = document.getElementById(`mus-zone-${zone}`);
        if (el) el.addEventListener('input', () => musZoneVal(zone, el.value));
      });
    });
}

// ─── Open / close ──────────────────────────────────────────────────────────────

function openMusic() {
  closeBallast();
  closeSurf();
  closeSwitches();
  closeProfiles();
  closeSettings();
  loadMusicOverlay();
  const overlay = document.getElementById('music-overlay');
  if (overlay) {
    overlay.classList.add('active');
    musShowMain();
  }
}

function closeMusic() {
  const overlay = document.getElementById('music-overlay');
  if (overlay) overlay.classList.remove('active');
  musCloseZone();
}

// ─── View switching ────────────────────────────────────────────────────────────

function musShowMain() {
  const main = document.getElementById('mus-main-view');
  const bt   = document.getElementById('mus-bt-view');
  if (main) main.style.display = 'flex';
  if (bt)   bt.style.display   = 'none';
}

function musShowBT() {
  const main = document.getElementById('mus-main-view');
  const bt   = document.getElementById('mus-bt-view');
  if (main) main.style.display = 'none';
  if (bt)   bt.style.display   = 'flex';
}

// ─── Playback controls ────────────────────────────────────────────────────────

function musTogglePlay() {
  musIsPlaying = !musIsPlaying;
  const btn = document.getElementById('mus-play-btn');
  if (btn) btn.textContent = musIsPlaying ? '⏸' : '▶';
}

function musPrev() { /* hook up to media source */ }
function musNext() { /* hook up to media source */ }

function musSeek(e) {
  const bar  = document.getElementById('mus-progress-bar');
  const fill = document.getElementById('mus-progress-fill');
  if (!bar || !fill) return;
  const rect = bar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  fill.style.width = (pct * 100) + '%';
}

// ─── Volume / mute ────────────────────────────────────────────────────────────

function musToggleMute() {
  musMuted = !musMuted;
  const icon  = document.getElementById('mus-vol-icon');
  const waves = icon && icon.querySelector('.mus-vol-waves');
  if (icon)  icon.style.opacity  = musMuted ? '0.3' : '0.7';
  if (waves) waves.style.display = musMuted ? 'none' : '';
}

// ─── Zone control ─────────────────────────────────────────────────────────────

function musOpenZone() {
  const popup = document.getElementById('mus-zone-popup');
  if (popup) popup.classList.add('active');
}

function musCloseZone() {
  const popup = document.getElementById('mus-zone-popup');
  if (popup) popup.classList.remove('active');
}

function musZoneVal(zone, val) {
  const el = document.getElementById(`mus-zone-${zone}-val`);
  if (el) el.textContent = val;
}

// ─── Bluetooth ────────────────────────────────────────────────────────────────

function musScanBT() {
  const btn = document.querySelector('.mus-bt-scan-btn');
  if (!btn) return;
  btn.textContent = 'Scanning…';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '+ Add New Device';
    btn.disabled = false;
  }, 3000);
}
