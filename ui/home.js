let isMuted = false;

function toggleCruise(event) {
  const button = event.currentTarget;
  const speedGauge = button.closest('.speed-gauge');
  const cruiseControls = speedGauge.querySelector('.cruise-controls');
  const cruiseWrapper = speedGauge.querySelector('.cruise-toggle-wrapper');
  
  button.classList.toggle('active');
  cruiseControls.classList.toggle('hidden');
  cruiseWrapper.classList.toggle('active');
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

document.querySelector('.volume-slider').addEventListener('input', function() {
  if (isMuted) {
    isMuted = false;
    const icon = document.querySelector('.volume-icon');
    const slider = document.querySelector('.volume-slider');
    icon.src = '../images/audio-icon.png';
    icon.classList.remove('muted');
    slider.classList.remove('muted');
  }
});

function openBallast() {
  const overlay = document.getElementById('ballast-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
}

function closeBallast() {
  const overlay = document.getElementById('ballast-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  deselectTank();
}
