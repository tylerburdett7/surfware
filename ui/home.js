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
