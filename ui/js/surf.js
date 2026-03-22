// Load surf overlay HTML on page load
function loadSurfOverlay() {
  fetch('../pages/surf.html')
    .then(response => response.text())
    .then(html => {
      const surfContainer = document.getElementById('surf-container');
      if (surfContainer) {
        surfContainer.innerHTML = html;
        initSurfControls();
      }
    })
    .catch(error => console.error('Error loading surf overlay:', error));
}

// Surf values
let surfTabValue = 45;
let centerTabValue = 35;
let speedValue = 11.5;

// QuickSurf: null = off, 'left' or 'right' = on
let currentSurfSide = null;

// Hold-to-repeat state
let adjustInterval = null;
let adjustTimeout = null;

function initSurfControls() {
  updateSurfDisplay();
  updateSurfStatus();
  updateSurfTabIndicator();
  updateHomeQuickSurfDisplay();
}

function updateHomeQuickSurfDisplay() {
  const offEl = document.getElementById('quicksurf-off');
  const btnsEl = document.getElementById('quicksurf-side-btns');
  const leftBtn = document.getElementById('quicksurf-left-btn');
  const rightBtn = document.getElementById('quicksurf-right-btn');
  if (offEl) offEl.style.display = currentSurfSide ? 'none' : '';
  if (btnsEl) btnsEl.style.display = currentSurfSide ? 'flex' : 'none';
  if (leftBtn) leftBtn.classList.toggle('active', currentSurfSide === 'left');
  if (rightBtn) rightBtn.classList.toggle('active', currentSurfSide === 'right');
}

function setSurfFromProfile(profile) {
  if (!profile) return;
  currentSurfSide = profile.qs === 'off' ? null : profile.qs;
  if (currentSurfSide && typeof setQuickLaunchOff === 'function') setQuickLaunchOff();
  if (typeof profile.surftab === 'number') surfTabValue = Math.max(0, Math.min(100, profile.surftab));
  if (typeof profile.speed === 'number') speedValue = Math.max(0, Math.min(50, profile.speed));
  updateSurfDisplay();
  updateSurfStatus();
  updateSurfTabIndicator();
  updateHomeQuickSurfDisplay();
  const leftBtn = document.getElementById('surf-left-btn');
  const rightBtn = document.getElementById('surf-right-btn');
  if (leftBtn) leftBtn.classList.toggle('active', currentSurfSide === 'left');
  if (rightBtn) rightBtn.classList.toggle('active', currentSurfSide === 'right');
}

function updateSurfTabIndicator() {
  const indicator = document.getElementById('surf-tab-indicator');
  if (indicator) {
    if (currentSurfSide === 'right') indicator.textContent = 'port';
    else if (currentSurfSide === 'left') indicator.textContent = 'stbd';
    else indicator.textContent = '—';
  }
}

function updateSurfDisplay() {
  const surfTabEl = document.getElementById('surf-tab-value');
  const centerTabEl = document.getElementById('center-tab-value');
  const speedEl = document.getElementById('speed-value');
  if (surfTabEl) surfTabEl.textContent = surfTabValue;
  if (centerTabEl) centerTabEl.textContent = centerTabValue;
  if (speedEl) speedEl.textContent = speedValue.toFixed(1);
}

function selectSurfSide(side) {
  const turningOn = currentSurfSide !== side;
  if (turningOn && typeof isQuickLaunchOn === 'function' && isQuickLaunchOn()) {
    if (typeof showConflictPopup === 'function') {
      showConflictPopup('qs', () => {
        if (typeof setQuickLaunchOff === 'function') setQuickLaunchOff();
        applySurfSide(side);
      });
      return;
    }
  }
  applySurfSide(currentSurfSide === side ? null : side);
}

function applySurfSide(side) {
  currentSurfSide = side;
  const leftBtn = document.getElementById('surf-left-btn');
  const rightBtn = document.getElementById('surf-right-btn');
  if (leftBtn) leftBtn.classList.toggle('active', currentSurfSide === 'left');
  if (rightBtn) rightBtn.classList.toggle('active', currentSurfSide === 'right');
  updateSurfStatus();
  updateSurfTabIndicator();
  updateHomeQuickSurfDisplay();
}

function updateSurfStatus() {
  const status = document.getElementById('surf-status');
  if (status) {
    if (currentSurfSide) {
      status.textContent = 'QuickSurf ON';
      status.classList.add('active');
    } else {
      status.textContent = 'QuickSurf OFF';
      status.classList.remove('active');
    }
  }
}

function startAdjust(control, delta, e) {
  if (e) e.preventDefault();
  doAdjust(control, delta);
  adjustTimeout = setTimeout(() => {
    let speed = 100;
    const run = () => {
      doAdjust(control, delta);
      adjustInterval = setTimeout(run, speed);
      if (speed > 40) speed = Math.max(40, speed - 5);
    };
    adjustInterval = setTimeout(run, speed);
  }, 450);
}

function stopAdjust() {
  if (adjustTimeout) {
    clearTimeout(adjustTimeout);
    adjustTimeout = null;
  }
  if (adjustInterval) {
    clearTimeout(adjustInterval);
    adjustInterval = null;
  }
}

function doAdjust(control, delta) {
  if (control === 'surf-tab') {
    surfTabValue = Math.max(0, Math.min(100, surfTabValue + delta * 5));
  } else if (control === 'center-tab') {
    centerTabValue = Math.max(0, Math.min(100, centerTabValue + delta * 5));
  } else if (control === 'speed') {
    speedValue = Math.max(0, Math.round((speedValue + delta * 0.1) * 10) / 10);
  }
  updateSurfDisplay();
}

function openProfilePopup() {
  const popup = document.getElementById('profile-popup');
  if (popup) popup.classList.add('active');
}

function closeProfilePopup() {
  const popup = document.getElementById('profile-popup');
  if (popup) popup.classList.remove('active');
}

function surfInit() {
  updateHomeQuickSurfDisplay();
  loadSurfOverlay();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', surfInit);
} else {
  surfInit();
}
