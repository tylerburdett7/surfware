// ─── Startup video on both screens ────────────────────────────────────────────

function runStartupVideo() {
  const leftOverlay = document.getElementById('startup-video-left');
  const rightOverlay = document.getElementById('startup-video-right');
  const leftVideo = leftOverlay && leftOverlay.querySelector('video');
  const rightVideo = rightOverlay && rightOverlay.querySelector('video');

  if (!leftVideo || !rightVideo) return;

  document.body.classList.add('startup-video-playing');
  let finished = false;
  let fadeStarted = false;

  function startVideoFadeOut() {
    if (fadeStarted) return;
    fadeStarted = true;
    [leftOverlay, rightOverlay].forEach(el => {
      if (el) el.classList.add('startup-video-fade-out');
    });
  }

  function hideOverlays() {
    if (finished) return;
    finished = true;
    startVideoFadeOut();
    setTimeout(() => {
      [leftOverlay, rightOverlay].forEach(el => {
        if (el) el.classList.add('startup-video-fade-black');
      });
      setTimeout(() => {
        [leftOverlay, rightOverlay].forEach(el => {
          if (el) {
            el.classList.add('startup-video-done');
            setTimeout(() => { el.style.display = 'none'; }, 700);
          }
        });
        document.body.classList.remove('startup-video-playing');
      }, 400);
    }, 1100);
  }

  function onVideoNearEnd() {
    const d = leftVideo.duration || rightVideo.duration;
    const t = leftVideo.currentTime || rightVideo.currentTime || 0;
    if (d > 0 && d !== Infinity && d - t <= 1.2) startVideoFadeOut();
  }

  let leftDone = false;
  let rightDone = false;

  function checkBothDone() {
    if (leftDone && rightDone) hideOverlays();
  }

  leftVideo.addEventListener('timeupdate', onVideoNearEnd);
  rightVideo.addEventListener('timeupdate', onVideoNearEnd);
  leftVideo.addEventListener('ended', () => { leftDone = true; checkBothDone(); });
  rightVideo.addEventListener('ended', () => { rightDone = true; checkBothDone(); });
  leftVideo.addEventListener('error', () => { leftDone = true; checkBothDone(); });
  rightVideo.addEventListener('error', () => { rightDone = true; checkBothDone(); });

  setTimeout(() => {
    if (!leftDone || !rightDone) hideOverlays();
  }, 9500);

  const playPromises = [leftVideo.play(), rightVideo.play()];
  Promise.allSettled(playPromises).catch(() => {});
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runStartupVideo);
} else {
  runStartupVideo();
}
