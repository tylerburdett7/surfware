// Load ballast overlay HTML on page load
function loadBallastOverlay() {
  fetch('../pages/ballast.html')
    .then(response => response.text())
    .then(html => {
      const ballastContainer = document.getElementById('ballast-container');
      ballastContainer.innerHTML = html;
    })
    .catch(error => console.error('Error loading ballast overlay:', error));
}

// Load ballast overlay when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadBallastOverlay);
} else {
  loadBallastOverlay();
}

let currentSelectedTank = null;

function selectTank(tankName, event) {
  event.stopPropagation();
  
  const boatWrapper = document.getElementById('boat-wrapper');
  const controlPanel = document.getElementById('tank-control-panel');
  const tankPanelName = document.getElementById('tank-panel-name');
  
  // If clicking the same tank, toggle it closed
  if (currentSelectedTank === tankName) {
    boatWrapper.classList.remove('shifted');
    controlPanel.classList.remove('active');
    currentSelectedTank = null;
  } else {
    // Different tank, open it
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
