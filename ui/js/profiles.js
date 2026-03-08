// ─── Persistence ──────────────────────────────────────────────────────────────

function profLoad() {
  try {
    const raw = localStorage.getItem('surf_profiles');
    profState.profiles = raw ? JSON.parse(raw) : [];
    profState.activeId = localStorage.getItem('surf_activeProfileId') || null;
    _profUpdateActiveLabel();
  } catch (e) {
    profState.profiles = [];
    profState.activeId = null;
  }
}

function profPersist() {
  localStorage.setItem('surf_profiles', JSON.stringify(profState.profiles));
  localStorage.setItem('surf_activeProfileId', profState.activeId || '');
  _profUpdateActiveLabel();
}

function _profUpdateActiveLabel() {
  const label = document.getElementById('profiles-active-label');
  if (!label) return;
  const active = profState.profiles.find(p => p.id === profState.activeId);
  if (active) {
    label.textContent = `Active: ${active.name}`;
    label.classList.add('visible');
  } else {
    label.textContent = '';
    label.classList.remove('visible');
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

const profState = {
  profiles:    [],
  activeId:    null,
  viewingId:   null,
  isEditing:   false,

  // form values
  speed:       11.5,
  cats:        0,
  qs:          'off',
  surftab:     45,
  ballast: {
    ramfillPort: 0,
    ramfillStbd: 0,
    center:      0,
    portPnp:     0,
    stbdPnp:     0,
    bowPnp:      0,
    transomPnp:  0,
  },
};

const BALLAST_TANKS = [
  { key: 'ramfillPort', label: 'Ramfill P'   },
  { key: 'ramfillStbd', label: 'Ramfill S'   },
  { key: 'center',      label: 'Center'      },
  { key: 'portPnp',     label: 'Port PNP'    },
  { key: 'stbdPnp',     label: 'Stbd PNP'    },
  { key: 'bowPnp',      label: 'Bow PNP'     },
  { key: 'transomPnp',  label: 'Transom PNP' },
];

// ─── View switching ───────────────────────────────────────────────────────────

function profShowList() {
  _profSetView('prof-list-view');
  _profRenderList();
}

function profShowForm(editId) {
  profState.isEditing = !!editId;
  profState.viewingId = editId || null;

  if (editId) {
    const p = profState.profiles.find(p => p.id === editId);
    if (p) _profFillForm(p);
  } else {
    _profResetForm();
  }

  document.getElementById('prof-form-title').textContent =
    profState.isEditing ? 'Edit Profile' : 'Add Profile';

  _profSetView('prof-form-view');
}

function profShowDetail(profileId) {
  profState.viewingId = profileId;
  _profSetView('prof-detail-view');
  _profRenderDetail(profileId);
}

function _profSetView(activeId) {
  ['prof-list-view', 'prof-form-view', 'prof-detail-view'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = id === activeId ? 'flex' : 'none';
  });
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function _profResetForm() {
  profState.speed   = 11.5;
  profState.cats    = 0;
  profState.qs      = 'off';
  profState.surftab = 45;
  profState.ballast = { ramfillPort:0, ramfillStbd:0, center:0, portPnp:0, stbdPnp:0, bowPnp:0, transomPnp:0 };

  const nameEl = document.getElementById('prof-name-input');
  if (nameEl) nameEl.value = '';

  _profUpdateFormDisplay();
}

function _profFillForm(p) {
  profState.speed   = p.speed;
  profState.cats    = p.cats;
  profState.qs      = p.qs;
  profState.surftab = p.surftab;
  profState.ballast = { ...p.ballast };

  const nameEl = document.getElementById('prof-name-input');
  if (nameEl) nameEl.value = p.name;

  _profUpdateFormDisplay();
}

function _profUpdateFormDisplay() {
  const s = profState;

  _setText('prof-speed-val',   s.speed.toFixed(1));
  _setText('prof-cats-val',    (s.cats >= 0 ? '+' : '') + s.cats);
  _setText('prof-surftab-val', s.surftab);

  // QS button highlights
  ['left', 'right', 'off'].forEach(side => {
    const btn = document.getElementById('prof-qs-' + side);
    if (btn) btn.classList.toggle('active', s.qs === side);
  });

  // Slide in/out surf tab inline next to QS buttons
  const qsInner = document.getElementById('prof-qs-inner');
  if (qsInner) qsInner.classList.toggle('has-tab', s.qs !== 'off');

  // Ballast values
  BALLAST_TANKS.forEach(({ key }) => {
    _setText('prof-' + key + '-val', s.ballast[key] + '%');
  });
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── QuickSurf selection ──────────────────────────────────────────────────────

function profSetQS(side) {
  profState.qs = side;
  _profUpdateFormDisplay();
}

// ─── Hold-to-repeat adjust ────────────────────────────────────────────────────

let _adjTimeout  = null;
let _adjInterval = null;

function profStartAdj(field, delta, e) {
  if (e) e.preventDefault();
  _profDoAdj(field, delta);
  _adjTimeout = setTimeout(() => {
    let delay = 120;
    const run = () => {
      _profDoAdj(field, delta);
      _adjInterval = setTimeout(run, delay);
      if (delay > 50) delay = Math.max(50, delay - 8);
    };
    _adjInterval = setTimeout(run, delay);
  }, 420);
}

function profStopAdj() {
  clearTimeout(_adjTimeout);
  clearTimeout(_adjInterval);
  _adjTimeout = _adjInterval = null;
}

function _profDoAdj(field, delta) {
  const s = profState;
  if (field === 'speed') {
    s.speed = Math.round(Math.max(0, Math.min(50, s.speed + delta * 0.1)) * 10) / 10;
  } else if (field === 'cats') {
    s.cats = Math.max(-50, Math.min(50, s.cats + delta));
  } else if (field === 'surftab') {
    s.surftab = Math.max(0, Math.min(100, s.surftab + delta * 5));
  } else if (field in s.ballast) {
    s.ballast[field] = Math.max(0, Math.min(100, s.ballast[field] + delta * 5));
  }
  _profUpdateFormDisplay();
}

// ─── Save profile ─────────────────────────────────────────────────────────────

function profSave() {
  const nameEl = document.getElementById('prof-name-input');
  const name = nameEl ? nameEl.value.trim() : '';

  if (!name) {
    if (nameEl) {
      nameEl.focus();
      nameEl.style.borderColor = '#c41e1e';
      setTimeout(() => { nameEl.style.borderColor = ''; }, 1500);
    }
    return;
  }

  const s = profState;
  const profileData = {
    name,
    speed:   s.speed,
    cats:    s.cats,
    qs:      s.qs,
    surftab: s.surftab,
    ballast: { ...s.ballast },
  };

  if (s.isEditing && s.viewingId) {
    const idx = s.profiles.findIndex(p => p.id === s.viewingId);
    if (idx >= 0) s.profiles[idx] = { ...s.profiles[idx], ...profileData };
  } else {
    s.profiles.push({ id: Date.now().toString(), ...profileData });
  }

  profPersist();
  profShowList();
}

// ─── Activate / Deactivate ────────────────────────────────────────────────────

function profToggleActivate() {
  if (!profState.viewingId) return;

  if (profState.activeId === profState.viewingId) {
    profState.activeId = null;
    _profSetCruise(false, 0);
  } else {
    profState.activeId = profState.viewingId;
    const p = profState.profiles.find(p => p.id === profState.viewingId);
    if (p) _profSetCruise(true, p.speed);
  }

  profPersist();
  _profRenderDetail(profState.viewingId);
}

function _profSetCruise(on, speed) {
  const btn = document.querySelector('.cruise-button');
  const controls = document.querySelector('.cruise-controls');
  const wrapper = document.querySelector('.cruise-toggle-wrapper');
  const setVal = document.querySelector('.cruise-set-value span');
  if (!btn) return;

  const isActive = btn.classList.contains('active');

  if (on && !isActive) {
    btn.classList.add('active');
    if (controls) controls.classList.remove('hidden');
    if (wrapper) wrapper.classList.add('active');
  } else if (!on && isActive) {
    btn.classList.remove('active');
    if (controls) controls.classList.add('hidden');
    if (wrapper) wrapper.classList.remove('active');
  }

  if (setVal) setVal.textContent = speed.toFixed(1);
  if (typeof cruiseSpeed !== 'undefined') cruiseSpeed = speed;
}

// ─── Edit current ─────────────────────────────────────────────────────────────

function profEditCurrent() {
  if (profState.viewingId) profShowForm(profState.viewingId);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function profDeleteCurrent() {
  if (!profState.viewingId) return;
  const p = profState.profiles.find(p => p.id === profState.viewingId);
  if (!p) return;
  const nameEl = document.getElementById('prof-delete-name');
  if (nameEl) nameEl.textContent = p.name;
  const overlay = document.getElementById('prof-delete-overlay');
  if (overlay) overlay.classList.add('active');
}

function profCancelDelete() {
  const overlay = document.getElementById('prof-delete-overlay');
  if (overlay) overlay.classList.remove('active');
}

function profConfirmDelete() {
  if (!profState.viewingId) return;
  profState.profiles = profState.profiles.filter(p => p.id !== profState.viewingId);
  if (profState.activeId === profState.viewingId) profState.activeId = null;
  profState.viewingId = null;
  profPersist();
  profCancelDelete();
  profShowList();
}

// ─── Render: list ─────────────────────────────────────────────────────────────

function _profRenderList() {
  const listEl = document.getElementById('prof-list');
  if (!listEl) return;

  if (profState.profiles.length === 0) {
    listEl.innerHTML = '<div class="prof-list-empty">No profiles yet. Tap "+ Add Profile" to create one.</div>';
    return;
  }

  listEl.innerHTML = profState.profiles.map(p => {
    const isActive = profState.activeId === p.id;
    const qsLabel  = p.qs === 'off' ? 'Off' : p.qs.charAt(0).toUpperCase() + p.qs.slice(1);
    return `
      <div class="prof-list-item${isActive ? ' is-active' : ''}" onclick="profShowDetail('${p.id}')">
        <div class="prof-list-item-info">
          <div class="prof-list-item-name">${_esc(p.name)}</div>
          <div class="prof-list-item-meta">${p.speed} mph &middot; QuickSurf ${qsLabel} &middot; CATS ${p.cats >= 0 ? '+' : ''}${p.cats}</div>
        </div>
        ${isActive ? '<div class="prof-list-badge">ACTIVE</div>' : ''}
        <div class="prof-list-arrow">›</div>
      </div>`;
  }).join('');
}

// ─── Render: detail ───────────────────────────────────────────────────────────

function _profRenderDetail(profileId) {
  const p = profState.profiles.find(pr => pr.id === profileId);
  if (!p) { profShowList(); return; }

  _setText('prof-detail-name', p.name);

  const activateBtn = document.getElementById('prof-activate-btn');
  if (activateBtn) {
    const isActive = profState.activeId === p.id;
    activateBtn.textContent = isActive ? 'Deactivate' : 'Activate';
    activateBtn.classList.toggle('is-deactivate', isActive);
  }

  _setText('prof-detail-speed', p.speed.toFixed(1) + ' mph');
  _setText('prof-detail-cats',  (p.cats >= 0 ? '+' : '') + p.cats);

  const qsLabel = p.qs === 'off' ? 'Off' : p.qs.charAt(0).toUpperCase() + p.qs.slice(1);
  _setText('prof-detail-qs', qsLabel);

  const tabItem = document.getElementById('prof-detail-tab-item');
  if (tabItem) {
    tabItem.style.display = p.qs !== 'off' ? 'flex' : 'none';
    _setText('prof-detail-tab', p.surftab);
  }

  const ballastEl = document.getElementById('prof-detail-ballast');
  if (ballastEl) {
    ballastEl.innerHTML = BALLAST_TANKS.map(t => `
      <div class="prof-dtank">
        <div class="prof-dtank-label">${t.label}</div>
        <div class="prof-dtank-val">${p.ballast[t.key]}%</div>
      </div>`).join('');
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function _esc(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Overlay load ─────────────────────────────────────────────────────────────

function loadProfilesOverlay() {
  fetch('../pages/profiles.html')
    .then(r => r.text())
    .then(html => {
      const container = document.getElementById('profiles-container');
      if (!container) return;
      container.innerHTML = html;
      profLoad();
    })
    .catch(e => console.error('Error loading profiles overlay:', e));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadProfilesOverlay);
} else {
  loadProfilesOverlay();
}
