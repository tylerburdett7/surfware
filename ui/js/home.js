let isMuted = false;
let cruiseSpeed = 0.0;
let cruiseAdjTimer = null;
let cruiseAdjInterval = null;
let cruiseAdjCount = 0;

function cruiseStartAdj(dir) {
  cruiseAdjCount = 0;
  _cruiseDoAdj(dir);
  cruiseAdjTimer = setTimeout(() => {
    cruiseAdjInterval = setInterval(() => _cruiseDoAdj(dir), 60);
  }, 400);
}

function cruiseStopAdj() {
  clearTimeout(cruiseAdjTimer);
  clearInterval(cruiseAdjInterval);
  cruiseAdjCount = 0;
}

function _cruiseDoAdj(dir) {
  cruiseAdjCount++;
  const step = cruiseAdjCount > 15 ? 0.5 : 0.1;
  cruiseSpeed = Math.round(Math.min(50, Math.max(0, cruiseSpeed + dir * step)) * 10) / 10;
  const el = document.getElementById('cruise-set-val');
  if (el) el.textContent = cruiseSpeed.toFixed(1);
  if (typeof simSendCruise === 'function') simSendCruise();
}

function toggleCruise(event) {
  const button = event.currentTarget;
  const speedGauge = button.closest('.speed-gauge');
  const cruiseControls = speedGauge.querySelector('.cruise-controls');
  const cruiseWrapper = speedGauge.querySelector('.cruise-toggle-wrapper');
  
  const turningOn = !button.classList.contains('active');
  button.classList.toggle('active');
  cruiseControls.classList.toggle('hidden');
  cruiseWrapper.classList.toggle('active');

  if (turningOn) {
    cruiseSpeed = 11.0;
    const el = document.getElementById('cruise-set-val');
    if (el) el.textContent = '11.0';
  }
  if (typeof simSendCruise === 'function') simSendCruise();
}

function toggleMute() {
  const icon = document.querySelector('.volume-icon');
  const slider = document.querySelector('.volume-slider');
  
  isMuted = !isMuted;
  
  if (isMuted) {
    icon.src = '../images/audio-mute-icon.png';
    icon.classList.add('muted');
    slider.classList.add('muted');
  } else {
    icon.src = '../images/audio-icon.png';
    icon.classList.remove('muted');
    slider.classList.remove('muted');
  }
}

function initVolumeSlider() {
  const slider = document.querySelector('.volume-slider');
  if (slider) {
    slider.addEventListener('input', function() {
      if (isMuted) {
        isMuted = false;
        const icon = document.querySelector('.volume-icon');
        const s = document.querySelector('.volume-slider');
        if (icon) icon.src = '../images/audio-icon.png';
        if (icon) icon.classList.remove('muted');
        if (s) s.classList.remove('muted');
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVolumeSlider);
} else {
  initVolumeSlider();
}

function openBallast() {
  closeSurf();
  closeSwitches();
  closeProfiles();
  closeMusic();
  closeSettings();
  const overlay = document.getElementById('ballast-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function closeBallast() {
  const overlay = document.getElementById('ballast-overlay');
  if (overlay) overlay.style.display = 'none';
  if (typeof deselectTank === 'function') deselectTank();
}

function openSurf() {
  closeBallast();
  closeSwitches();
  closeProfiles();
  closeMusic();
  closeSettings();
  const overlay = document.getElementById('surf-overlay');
  if (overlay) overlay.classList.add('active');
  const tabIndicators = document.getElementById('tab-indicators');
  if (tabIndicators) tabIndicators.classList.add('surf-mode');
  const controlScreen = document.querySelector('.control-screen');
  if (controlScreen) controlScreen.classList.add('surf-mode');
}

function closeSurf() {
  const overlay = document.getElementById('surf-overlay');
  if (overlay) overlay.classList.remove('active');
  const profilePopup = document.getElementById('profile-popup');
  if (profilePopup) profilePopup.classList.remove('active');
  const tabIndicators = document.getElementById('tab-indicators');
  if (tabIndicators) tabIndicators.classList.remove('surf-mode');
  const controlScreen = document.querySelector('.control-screen');
  if (controlScreen) controlScreen.classList.remove('surf-mode');
}

function openSwitches() {
  closeBallast();
  closeSurf();
  closeProfiles();
  closeMusic();
  closeSettings();
  const overlay = document.getElementById('switches-overlay');
  if (overlay) overlay.classList.add('active');
}

function closeSwitches() {
  const overlay = document.getElementById('switches-overlay');
  if (overlay) overlay.classList.remove('active');
  const colorPopup = document.getElementById('color-popup');
  if (colorPopup) colorPopup.classList.remove('active');
}

function openProfiles() {
  const overlay = document.getElementById('profiles-overlay');
  if (overlay && overlay.classList.contains('active')) {
    closeProfiles();
    return;
  }
  closeBallast();
  closeSurf();
  closeSwitches();
  closeMusic();
  closeSettings();
  if (overlay) {
    overlay.classList.add('active');
    if (typeof profShowList === 'function') profShowList();
  }
}

function closeProfiles() {
  const overlay = document.getElementById('profiles-overlay');
  if (overlay) overlay.classList.remove('active');
}

function closeAll() {
  closeBallast();
  closeSurf();
  closeSwitches();
  closeProfiles();
  closeMusic();
  closeSettings();
}

// ─── QuickSurf from left screen (toggle + L/R, does NOT open Surf page) ────────

function toggleQuickSurfFromHome(event) {
  if (typeof currentSurfSide === 'undefined') return;
  if (currentSurfSide) {
    if (event && event.target.closest('.quicksurf-side-btn')) return;
    if (typeof applySurfSide === 'function') applySurfSide(null);
    return;
  }
  if (event && event.target.closest('.quicksurf-side-btn')) return;
  if (typeof isQuickLaunchOn === 'function' && isQuickLaunchOn()) {
    showConflictPopup('qs', () => {
      if (typeof setQuickLaunchOff === 'function') setQuickLaunchOff();
      if (typeof applySurfSide === 'function') applySurfSide('left');
    });
    return;
  }
  if (typeof applySurfSide === 'function') applySurfSide('left');
}

function selectSurfSideFromHome(side, event) {
  if (event) event.stopPropagation();
  if (typeof selectSurfSide === 'function') selectSurfSide(side);
}


// ─── QuickLaunch (mutually exclusive with QuickSurf) ───────────────────────────

let quickLaunchOn = false;
let conflictPopupCallback = null;

function isQuickLaunchOn() {
  return quickLaunchOn;
}

function setQuickLaunchOff() {
  quickLaunchOn = false;
  updateQuickLaunchDisplay();
}

function setQuickLaunchOn() {
  quickLaunchOn = true;
  updateQuickLaunchDisplay();
}

function updateQuickLaunchDisplay() {
  const el = document.getElementById('quicklaunch-status-value');
  if (el) el.textContent = quickLaunchOn ? 'ON' : 'OFF';
  const box = document.getElementById('tab-box-quicklaunch');
  if (box) box.classList.toggle('active', quickLaunchOn);
}

function toggleQuickLaunch() {
  if (quickLaunchOn) {
    setQuickLaunchOff();
    return;
  }
  if (typeof currentSurfSide !== 'undefined' && currentSurfSide) {
    showConflictPopup('ql', () => {
      if (typeof selectSurfSide === 'function') selectSurfSide(currentSurfSide);
      setQuickLaunchOn();
    });
    return;
  }
  setQuickLaunchOn();
}

function showConflictPopup(mode, onActivate) {
  const leftPopup = document.getElementById('conflict-popup-left');
  const rightPopup = document.getElementById('conflict-popup-right');
  const leftMsg = document.getElementById('conflict-popup-message-left');
  const rightMsg = document.getElementById('conflict-popup-message-right');
  const app = document.querySelector('.app');
  if (leftPopup) leftPopup.classList.remove('active');
  if (rightPopup) rightPopup.classList.remove('active');
  if (app) app.classList.remove('conflict-popup-right-active');
  conflictPopupCallback = onActivate;
  const text = mode === 'ql' ? 'Activating QuickLaunch will turn off QuickSurf.' : 'Activating QuickSurf will turn off QuickLaunch.';
  if (mode === 'ql' && leftPopup && leftMsg) {
    leftMsg.textContent = text;
    leftPopup.classList.add('active');
  } else if (mode === 'qs' && rightPopup && rightMsg) {
    rightMsg.textContent = text;
    rightPopup.classList.add('active');
    if (app) app.classList.add('conflict-popup-right-active');
  }
}

function cancelConflictPopup() {
  const leftPopup = document.getElementById('conflict-popup-left');
  const rightPopup = document.getElementById('conflict-popup-right');
  const app = document.querySelector('.app');
  if (leftPopup) leftPopup.classList.remove('active');
  if (rightPopup) rightPopup.classList.remove('active');
  if (app) app.classList.remove('conflict-popup-right-active');
  conflictPopupCallback = null;
}

function confirmConflictActivate() {
  const leftPopup = document.getElementById('conflict-popup-left');
  const rightPopup = document.getElementById('conflict-popup-right');
  const app = document.querySelector('.app');
  if (leftPopup) leftPopup.classList.remove('active');
  if (rightPopup) rightPopup.classList.remove('active');
  if (app) app.classList.remove('conflict-popup-right-active');
  if (typeof conflictPopupCallback === 'function') {
    conflictPopupCallback();
    conflictPopupCallback = null;
  }
}

// Trip info carousel functionality
let carouselCurrentSlide = 0;

function goToSlide(index) {
  const carousel = document.getElementById('trip-carousel');
  const slides = carousel.querySelectorAll('.carousel-slide');
  const dots = carousel.querySelectorAll('.dot');
  
  slides.forEach(slide => slide.classList.remove('active'));
  slides[index].classList.add('active');
  
  dots.forEach(dot => dot.classList.remove('active'));
  dots[index].classList.add('active');
  
  carouselCurrentSlide = index;
}

const carousel = document.getElementById('trip-carousel');
let touchStartX = 0;
let touchEndX = 0;

carousel.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

carousel.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleCarouselSwipe();
});

function handleCarouselSwipe() {
  const swipeThreshold = 30;
  const diff = touchStartX - touchEndX;
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      carouselCurrentSlide = (carouselCurrentSlide + 1) % 2;
    } else {
      carouselCurrentSlide = (carouselCurrentSlide - 1 + 2) % 2;
    }
    goToSlide(carouselCurrentSlide);
  }
}
