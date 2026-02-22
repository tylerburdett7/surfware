// Load switches overlay HTML on page load
function loadSwitchesOverlay() {
  fetch('../pages/switches.html')
    .then(response => response.text())
    .then(html => {
      const container = document.getElementById('switches-container');
      if (container) {
        container.innerHTML = html;
        initSwitches();
      }
    })
    .catch(error => console.error('Error loading switches overlay:', error));
}

const switchState = {};
const rgbColors = { speaker: '#d4a533', interior: '#ffffff', underwater: '#00aaff' };
const RGB_LIGHTS = ['speaker', 'interior', 'underwater'];
let currentColorTarget = null;
let colorHue = 180;
let colorSat = 100;
let colorLight = 50;

function initSwitches() {
  const presets = document.querySelectorAll('.color-preset');
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.dataset.color;
      if (currentColorTarget && hex) {
        setRgbColor(currentColorTarget, hex);
        updateColorPickerFromHex(hex);
      }
    });
  });

  initColorWheel();
  initColorSlBox();
  updateSwitchDisplay();
  updateAllRgbSwatch();
}

const SWITCH_IDS = ['master-rgb', 'speaker', 'interior', 'underwater', 'exterior', 'tower', 'nav', 'anchor', 'bilge', 'heater-fan', 'seat-heater'];

function toggleSwitch(id, e) {
  if (e) e.stopPropagation();
  switchState[id] = !switchState[id];

  if (id === 'master-rgb') {
    RGB_LIGHTS.forEach(light => {
      switchState[light] = switchState[id];
    });
  }

  updateSwitchDisplay();
}

function updateSwitchDisplay() {
  SWITCH_IDS.forEach(id => {
    const toggle = document.getElementById(`toggle-${id}`);
    if (toggle) {
      toggle.classList.toggle('on', !!switchState[id]);
    }
  });
}

function setRgbColor(lightId, hex) {
  if (lightId === 'master-rgb') {
    RGB_LIGHTS.forEach(light => {
      rgbColors[light] = hex;
      const strip = document.getElementById(`color-${light}`);
      if (strip) strip.style.backgroundColor = hex;
    });
  } else {
    rgbColors[lightId] = hex;
    const strip = document.getElementById(`color-${lightId}`);
    if (strip) strip.style.backgroundColor = hex;
  }
  updateAllRgbSwatch();
}

function updateAllRgbSwatch() {
  const swatch = document.getElementById('color-master-rgb');
  if (!swatch) return;
  const allMatch = RGB_LIGHTS.every(light => rgbColors[light] === rgbColors[RGB_LIGHTS[0]]);
  if (allMatch && rgbColors[RGB_LIGHTS[0]]) {
    swatch.style.backgroundColor = rgbColors[RGB_LIGHTS[0]];
    swatch.classList.remove('color-slot-empty');
  } else {
    swatch.style.backgroundColor = 'transparent';
    swatch.classList.add('color-slot-empty');
  }
}

function openColorPopup(lightId, e) {
  e?.stopPropagation();
  currentColorTarget = lightId;
  const popup = document.getElementById('color-popup');
  const title = document.getElementById('color-popup-title');
  const titleText = lightId === 'master-rgb' ? 'All RGB Color' : lightId.charAt(0).toUpperCase() + lightId.slice(1) + ' Color';
  if (title) title.textContent = titleText;
  const startColor = lightId === 'master-rgb'
    ? (rgbColors.speaker === rgbColors.interior && rgbColors.interior === rgbColors.underwater ? rgbColors.speaker : '#ffffff')
    : (rgbColors[lightId] || '#ffffff');
  updateColorPickerFromHex(startColor);
  if (popup) popup.classList.add('active');
}

function closeColorPopup() {
  document.getElementById('color-popup')?.classList.remove('active');
  currentColorTarget = null;
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function updateColorPickerFromHex(hex) {
  const { h, s, l } = hexToHsl(hex);
  colorHue = h;
  colorSat = s;
  colorLight = l;
  updateColorPickerUI();
}

function updateColorPickerUI() {
  const marker = document.getElementById('color-wheel-marker');
  const slBox = document.getElementById('color-sl-box');
  const slMarker = document.getElementById('color-sl-marker');

  if (marker) {
    const angle = (colorHue - 90) * Math.PI / 180;
    const r = 42;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    marker.style.left = x + '%';
    marker.style.top = y + '%';
  }
  if (slBox && slMarker) {
    slMarker.style.left = colorSat + '%';
    slMarker.style.top = (100 - colorLight) + '%';
    slBox.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${colorHue}, 100%, 50%))`;
  }
}

function initColorWheel() {
  const wheel = document.getElementById('color-wheel');
  if (!wheel) return;

  wheel.addEventListener('click', e => {
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    colorHue = ((angle * 180 / Math.PI) + 90 + 360) % 360;
    applyColorFromPicker();
    updateColorPickerUI();
  });
}

function initColorSlBox() {
  const box = document.getElementById('color-sl-box');
  if (!box) return;

  box.addEventListener('click', e => {
    const rect = box.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 100;
    const y = (e.clientY - rect.top) / rect.height * 100;
    colorSat = Math.max(0, Math.min(100, x));
    colorLight = Math.max(0, Math.min(100, 100 - y));
    applyColorFromPicker();
    updateColorPickerUI();
  });
}

function applyColorFromPicker() {
  const hex = hslToHex(colorHue, colorSat, colorLight);
  if (currentColorTarget) {
    setRgbColor(currentColorTarget, hex);
  }
}

// Load overlay
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSwitchesOverlay);
} else {
  loadSwitchesOverlay();
}
