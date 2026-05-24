// ── Constants ──────────────────────────────────────────────────────────────

window.ADMIN_PIN = '1234';

// Safe early globals: lightweight fallback so inline onclicks don't throw
if (!window.doAdminLogin) {
  window.doAdminLogin = function() {
    const t = window.toast || ((m,ty) => console.log('[toast]', ty, m));
    const pinEl = document.getElementById('pin-input');
    const pin = pinEl?.value?.trim?.() || '';
    if (pin === window.ADMIN_PIN) {
      // login success (no debug toast)
      const loginEl = document.getElementById('admin-login');
      const appEl = document.getElementById('admin-app');
      if (loginEl) loginEl.classList.add('hidden');
      if (appEl) appEl.classList.remove('hidden');
      try { if (typeof navigate === 'function') navigate('overview'); } catch (e) { /* ignore */ }
    } else {
      const errEl = document.getElementById('pin-error');
      if (errEl) errEl.style.display = 'block';
      if (pinEl) { pinEl.value = ''; pinEl.focus(); }
    }
  };
}

if (!window.adminLogout) {
  window.adminLogout = function() {
    const appEl = document.getElementById('admin-app');
    const loginEl = document.getElementById('admin-login');
    if (appEl) appEl.classList.add('hidden');
    if (loginEl) loginEl.classList.remove('hidden');
    const pinEl = document.getElementById('pin-input');
    if (pinEl) pinEl.value = '';
    const errEl = document.getElementById('pin-error');
    if (errEl) errEl.style.display = 'none';
  };
}
const BOOKINGS_KEY = 'findMyDesk_bookings';
const ADMIN_SETTINGS_KEY = 'mdb_admin_settings';

let overviewTeam  = '';
let occupancyTeam = '';
let noShowsTeam   = '';
let nbEditId      = null;
let fpEditId      = null;

const DESKS = [
  { id: 'G-W1', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'dual-monitor'] },
  { id: 'G-W2', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'standing-desk'] },
  { id: 'G-W3', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat'] },
  { id: 'G-W4', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'quiet-area'] },
  { id: 'G-Q1', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'dual-monitor'] },
  { id: 'G-Q2', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area'] },
  { id: 'G-Q3', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'standing-desk'] },
  { id: 'G-C1', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['dual-monitor'] },
  { id: 'G-C2', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['dual-monitor', 'standing-desk'] },
  { id: 'G-C3', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['accessible-desk', 'dual-monitor'] },
  { id: 'G-C4', floor: 'ground', neighbourhood: 'Core Desk Area',    features: [] },
  { id: 'G-C5', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['standing-desk'] },
  { id: 'G-L1', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team', 'dual-monitor'] },
  { id: 'G-L2', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team'] },
  { id: 'G-L3', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team', 'standing-desk'] },
  { id: 'F-W1', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat', 'dual-monitor'] },
  { id: 'F-W2', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat'] },
  { id: 'F-W3', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat', 'standing-desk'] },
  { id: 'F-Q1', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'dual-monitor'] },
  { id: 'F-Q2', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'standing-desk'] },
  { id: 'F-Q3', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area'] },
  { id: 'F-C1', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['dual-monitor'] },
  { id: 'F-C2', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['accessible-desk'] },
  { id: 'F-C3', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['standing-desk', 'dual-monitor'] },
  { id: 'F-C4', floor: 'first',  neighbourhood: 'Core Desk Area',    features: [] },
  { id: 'F-L1', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team'] },
  { id: 'F-L2', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team', 'dual-monitor'] },
  { id: 'F-L3', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team', 'standing-desk'] },
];

const DAY_OCC = { 1: 0.78, 2: 0.48, 3: 0.72, 4: 0.52, 5: 0.38 };
const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const NB_COLOURS = {
  'Window Bank':       { dot: 'nb-dot-window', bar: '#0891b2' },
  'Quiet Zone':        { dot: 'nb-dot-quiet',  bar: '#7c3aed' },
  'Core Desk Area':    { dot: 'nb-dot-core',   bar: '#1d4ed8' },
  'Collaboration Zone':{ dot: 'nb-dot-collab', bar: '#16a34a' },
};

// ── Settings ───────────────────────────────────────────────────────────────

function defaultSettings() {
  return {
    bookingRules: {
      maxDaysInAdvance: 14,
      maxBookingsPerWeek: 5,
      cancellationCutoffHours: 2,
      autoReleaseMinutes: 30,
      allowHalfDays: true,
      requireCheckIn: true,
    },
    capacity: {
      groundFloorMaxPct: 100,
      firstFloorMaxPct: 100,
    },
    office: {
      name: 'London HQ',
      lat: 51.5074,
      lng: -0.1278,
      radiusM: 300,
    },
    autoBook: {
      enableOnScan: true,
      enableOnProximity: true,
      proximityRadiusM: 300,
    },
    deskFeatureOverrides: {},
    disabledDesks: [],
    teams: [...new Set(USERS_DATA.map(u => u.team))].sort(),
    anchorDayConfig: { bySite: {}, byTeam: {} },
    buildings: ['London HQ'],
    floorPlans: [
      { id:'fp-ground', name:'Ground Floor', building:'London HQ', floorKey:'ground', assignedTeams:[], imageUrl:'/floorplans/ground.png' },
      { id:'fp-first',  name:'First Floor',  building:'London HQ', floorKey:'first',  assignedTeams:[], imageUrl:'/floorplans/first.png'  },
    ],
    neighbourhoods: [
      { id:'nb-window', name:'Window Bank',        building:'London HQ', color:'#0891b2',
        deskIds:['G-W1','G-W2','G-W3','G-W4','F-W1','F-W2','F-W3'], assignedTeams:[] },
      { id:'nb-quiet',  name:'Quiet Zone',         building:'London HQ', color:'#7c3aed',
        deskIds:['G-Q1','G-Q2','G-Q3','F-Q1','F-Q2','F-Q3'], assignedTeams:[] },
      { id:'nb-core',   name:'Core Desk Area',     building:'London HQ', color:'#1d4ed8',
        deskIds:['G-C1','G-C2','G-C3','G-C4','G-C5','F-C1','F-C2','F-C3','F-C4'], assignedTeams:[] },
      { id:'nb-collab', name:'Collaboration Zone', building:'London HQ', color:'#16a34a',
        deskIds:['G-L1','G-L2','G-L3','F-L1','F-L2','F-L3'], assignedTeams:[] },
    ],
  };
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || 'null');
    if (!s) return defaultSettings();
    const d = defaultSettings();
    return {
      bookingRules: { ...d.bookingRules, ...s.bookingRules },
      capacity:     { ...d.capacity,     ...s.capacity },
      office:       { ...d.office,       ...s.office },
      autoBook:     { ...d.autoBook,     ...s.autoBook },
      deskFeatureOverrides: s.deskFeatureOverrides || {},
      disabledDesks:   s.disabledDesks  || [],
      teams:            s.teams          || d.teams,
      anchorDayConfig: s.anchorDayConfig
        ? { bySite: { ...s.anchorDayConfig.bySite }, byTeam: { ...s.anchorDayConfig.byTeam } }
        : d.anchorDayConfig,
      buildings:      s.buildings      || d.buildings,
      floorPlans:     s.floorPlans     || d.floorPlans,
      neighbourhoods: s.neighbourhoods || d.neighbourhoods,
    };
  } catch { return defaultSettings(); }
}

function saveSettings(s) {
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(s));
}

// ── Historical data (loaded from dummy-bookings.js) ───────────────────────

function getSyntheticBookings() {
  return typeof DUMMY_BOOKINGS !== 'undefined' ? DUMMY_BOOKINGS : [];
}

function allBookings() {
  let live = [];
  try { live = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]'); } catch {}
  return [...getSyntheticBookings(), ...live];
}

function bookingsInRange(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return allBookings().filter(b => b.date >= cutoffStr);
}

// ── Utilities ──────────────────────────────────────────────────────────────

function toDateStr(d)   { return d.toISOString().slice(0, 10); }
function today()        { return toDateStr(new Date()); }
function parseDate(str) { const [y,m,d] = str.split('-').map(Number); return new Date(y, m-1, d); }
function dayOfWeek(str) { return parseDate(str).getDay(); }

function pct(n, total) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

function deskInfo(id)  { return DESKS.find(d => d.id === id) || null; }
function userInfo(id)  { return USERS_DATA.find(u => u.id === id) || null; }
function getDeskFeatures(deskId) {
  const s = loadSettings();
  const override = s.deskFeatureOverrides?.[deskId];
  if (Array.isArray(override)) return override;
  const desk = deskInfo(deskId);
  return desk ? desk.features : [];
}
function saveDeskFeatures(deskId, features) {
  const s = loadSettings();
  s.deskFeatureOverrides = { ...s.deskFeatureOverrides, [deskId]: features };
  saveSettings(s);
}

function initials(name) { return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2); }
function avatarColor(name) {
  const cols = ['#1d4ed8','#0891b2','#7c3aed','#be185d','#b45309','#16a34a','#dc2626','#0369a1'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return cols[Math.abs(h) % cols.length];
}

function featureLabel(f) {
  return { 'window-seat':'Window Seat','quiet-area':'Quiet Area','standing-desk':'Standing',
           'dual-monitor':'Dual Monitor','near-team':'Near Team','accessible-desk':'Accessible' }[f] || f;
}

function utilColor(pct) {
  if (pct >= 80) return '#DC2626';
  if (pct >= 60) return '#D97706';
  if (pct >= 30) return '#16a34a';
  return '#94a3b8';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Auth ───────────────────────────────────────────────────────────────────

window.doAdminLogin = function() {
  const pinEl = document.getElementById('pin-input');
  const pin = pinEl?.value?.trim?.() || '';
  console.log('doAdminLogin attempt, pin length:', pin.length);
  if (pin === window.ADMIN_PIN) {
    // successful login
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    navigate('overview');
  } else {
    console.warn('Admin login failed for pin length', pin.length);
    document.getElementById('pin-error').style.display = 'block';
    pinEl.value = '';
    pinEl.focus();
  }
};

window.adminLogout = function() {
  document.getElementById('admin-app').classList.add('hidden');
  document.getElementById('admin-login').classList.remove('hidden');
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-error').style.display = 'none';
};

// ── Navigation ─────────────────────────────────────────────────────────────

function navigate(view) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');

  const renderers = {
    overview:       renderOverview,
    occupancy:      renderOccupancy,
    noshows:        renderNoShows,
    deskreport:     renderDeskReport,
    teamreport:     renderTeamReport,
    neighbourhoods: renderNeighbourhoods,
    feedback:       renderAdminFeedback,
    aianalysis:     renderAiAnalysis,
    allocations:    renderAllocations,
    rules:          renderRules,
    seatingrules:   renderSeatingRules,
    anchordays:     renderAnchorDays,
    deskconfig:     renderDeskConfig,
    floorplans:     renderFloorPlans,
    officesettings: renderOfficeSettings,
    teamsettings:   renderTeamSettings,
  };
  try {
    renderers[view]?.();
  } catch (err) {
    document.getElementById(`view-${view}`).innerHTML =
      `<div style="padding:32px;color:var(--danger);font-family:monospace;font-size:13px;background:var(--danger-light);border-radius:8px;margin:24px">
        <strong>Render error in ${view}:</strong><br><br>${err.message}<br><br>
        <pre style="white-space:pre-wrap;font-size:11px">${err.stack || ''}</pre>
      </div>`;
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('.desk-edit-features');
  if (!button) return;
  event.preventDefault();
  const deskId = button.dataset.deskId;
  if (!deskId) return;
  toast(`Opening editor for ${deskId}`);
  showDeskFeatureEditor(deskId);
});

// ── Shared helpers ─────────────────────────────────────────────────────────

function teamFilterHTML(stateVar, allTeams, current, setterFn) {
  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Filter by team:</label>
      <select onchange="${setterFn}(this.value)"
        style="padding:7px 28px 7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:white;appearance:none;-webkit-appearance:none;
               background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%227%22 viewBox=%220 0 12 8%22%3E%3Cpath d=%22M1 1l5 5 5-5%22 stroke=%2294a3b8%22 stroke-width=%221.5%22 fill=%22none%22 stroke-linecap=%22round%22/%3E%3C/svg%3E');
               background-repeat:no-repeat;background-position:right 10px center;cursor:pointer">
        <option value="" ${!current ? 'selected' : ''}>All Teams</option>
        ${allTeams.map(t => `<option value="${t}" ${current === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
      ${current ? `<button onclick="${setterFn}('')" style="font-size:12px;color:var(--text-muted);background:none;border:none;cursor:pointer;text-decoration:underline">Clear</button>` : ''}
    </div>`;
}

// ── Overview ───────────────────────────────────────────────────────────────

function setOverviewTeam(team) {
  overviewTeam = team;
  renderOverview();
}

function renderOverview() {
  const allTeams = [...new Set(USERS_DATA.map(u => u.team))].sort();

  // If a team is selected, restrict bookings to users in that team
  const teamUids = overviewTeam
    ? new Set(USERS_DATA.filter(u => u.team === overviewTeam).map(u => u.id))
    : null;

  const filter = b => !teamUids || teamUids.has(b.userId);
  const b30 = bookingsInRange(30).filter(filter);
  const b7  = bookingsInRange(7).filter(filter);
  const totalDesks = DESKS.length;

  const workdays30 = countWorkdays(30);
  const workdays7  = countWorkdays(7);

  const avgOcc30 = pct(b30.length, workdays30 * totalDesks);
  const avgOcc7  = pct(b7.length,  workdays7  * totalDesks);
  const occTrend = avgOcc7 - avgOcc30;

  const noShows30 = b30.filter(b => !b.checkedIn).length;
  const noShowRate = pct(noShows30, b30.length);

  const activeUsers = overviewTeam
    ? USERS_DATA.filter(u => u.team === overviewTeam).length
    : USERS_DATA.length;

  const byDay = [1,2,3,4,5].map(dow => {
    const day = b30.filter(b => dayOfWeek(b.date) === dow);
    const days = countWorkdaysByDow(30, dow);
    return { dow, label: DAY_NAMES[dow], occ: pct(day.length, days * totalDesks) };
  });
  const busiest = byDay.reduce((a,b) => b.occ > a.occ ? b : a, byDay[0]);
  const quietest = byDay.reduce((a,b) => b.occ < a.occ ? b : a, byDay[0]);

  const teamsToShow = overviewTeam ? [overviewTeam] : allTeams;
  const teamStats = teamsToShow.map(team => {
    const users = USERS_DATA.filter(u => u.team === team);
    const uids  = new Set(users.map(u => u.id));
    const tb    = bookingsInRange(30).filter(b => uids.has(b.userId));
    return { team, bookings: tb.length, users: users.length };
  }).sort((a,b) => b.bookings - a.bookings);

  document.getElementById('view-overview').innerHTML = `
    <div class="page-header">
      <h1>Admin Overview</h1>
      <p>Last 30 days · ${totalDesks} desks across 2 floors</p>
    </div>

    ${teamFilterHTML('overviewTeam', allTeams, overviewTeam, 'setOverviewTeam')}

    <div class="admin-stats">
      <div class="admin-stat">
        <div class="admin-stat-value">${b30.length.toLocaleString()}</div>
        <div class="admin-stat-label">Total Bookings</div>
        <div class="admin-stat-sub">Last 30 days${overviewTeam ? ' · ' + overviewTeam : ''}</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${avgOcc30}%</div>
        <div class="admin-stat-label">Avg Occupancy</div>
        <div class="admin-stat-sub ${occTrend >= 0 ? 'admin-stat-up' : 'admin-stat-down'}">
          ${occTrend >= 0 ? '▲' : '▼'} ${Math.abs(occTrend)}% vs last week
        </div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${noShowRate}%</div>
        <div class="admin-stat-label">No-show Rate</div>
        <div class="admin-stat-sub">${noShows30} missed check-ins</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${activeUsers}</div>
        <div class="admin-stat-label">${overviewTeam ? 'Team Members' : 'Active Users'}</div>
        <div class="admin-stat-sub">${overviewTeam ? overviewTeam : allTeams.length + ' teams'}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">Bookings by Day of Week</span><span style="font-size:12px;color:var(--text-muted)">30-day avg${overviewTeam ? ' · ' + overviewTeam : ''}</span></div>
        <div class="card-body" style="padding:16px 20px">
          ${renderBarChart(byDay.map(d => ({ label: d.label, value: d.occ, color: d.dow === busiest.dow ? 'var(--primary)' : '#A7D7C5' })))}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Quick Stats</span></div>
        <div class="card-body" style="padding:12px 20px">
          <div class="toggle-row" style="padding:10px 0">
            <div class="toggle-info">
              <div class="toggle-label">Busiest day</div>
              <div class="toggle-desc">Most bookings in period</div>
            </div>
            <span style="font-weight:700;color:var(--primary)">${busiest.label} · ${busiest.occ}%</span>
          </div>
          <div class="toggle-row" style="padding:10px 0">
            <div class="toggle-info">
              <div class="toggle-label">Quietest day</div>
              <div class="toggle-desc">Fewest bookings in period</div>
            </div>
            <span style="font-weight:700;color:var(--text-muted)">${quietest.label} · ${quietest.occ}%</span>
          </div>
          <div class="toggle-row" style="padding:10px 0">
            <div class="toggle-info">
              <div class="toggle-label">Check-in rate</div>
              <div class="toggle-desc">Bookings with confirmed check-in</div>
            </div>
            <span style="font-weight:700;color:var(--text)">${100 - noShowRate}%</span>
          </div>
          ${!overviewTeam ? `<div class="toggle-row" style="padding:10px 0">
            <div class="toggle-info">
              <div class="toggle-label">Most active team</div>
              <div class="toggle-desc">By total bookings (30d)</div>
            </div>
            <span style="font-weight:700;color:var(--text)">${teamStats[0]?.team}</span>
          </div>` : ''}
        </div>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">${overviewTeam ? overviewTeam + ' — Bookings' : 'Bookings by Team'}</span>
        <span style="font-size:12px;color:var(--text-muted)">Last 30 days</span>
      </div>
      <div class="card-body" style="padding:12px 20px">
        <table class="admin-table">
          <thead><tr>
            <th>Team</th><th>Bookings</th><th>Users</th><th>Avg / user</th><th>Utilisation</th>
          </tr></thead>
          <tbody>
            ${teamStats.map(t => {
              const avg = t.users ? (t.bookings / t.users).toFixed(1) : '–';
              const u = pct(t.bookings, countWorkdays(30) * t.users);
              return `<tr>
                <td style="font-weight:500">${t.team}</td>
                <td>${t.bookings}</td>
                <td>${t.users}</td>
                <td>${avg}</td>
                <td>
                  <div class="util-bar-wrap">
                    <div class="util-bar-bg"><div class="util-bar-fill" style="width:${Math.min(u,100)}%;background:${utilColor(u)}"></div></div>
                    <span style="font-size:12px;font-weight:600;color:${utilColor(u)};min-width:32px;text-align:right">${u}%</span>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Desk Config ───────────────────────────────────────────────────────────

function renderDeskConfig() {
  const settings = loadSettings();

  document.getElementById('view-deskconfig').innerHTML = `
    <div class="page-header">
      <h1>Desk Configuration</h1>
      <p>Set equipment, attributes, and accessibility flags per desk</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="card" style="padding:14px 18px;display:flex;align-items:center;gap:12px">
        <div style="font-size:26px;font-weight:700;color:var(--primary)">${DESKS.length - settings.disabledDesks.length}</div>
        <div>
          <div style="font-weight:600;font-size:13px">Active Desks</div>
          <div style="font-size:12px;color:var(--text-muted)">Available to book</div>
        </div>
      </div>
      <div class="card" style="padding:14px 18px;display:flex;align-items:center;gap:12px">
        <div style="font-size:26px;font-weight:700;color:var(--danger)">${settings.disabledDesks.length}</div>
        <div>
          <div style="font-weight:600;font-size:13px">Disabled Desks</div>
          <div style="font-size:12px;color:var(--text-muted)">Not bookable</div>
        </div>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">All Desks</span>
        <div class="card-header-actions">
          <button class="btn btn-sm btn-secondary" onclick="enableAllDesks()">Enable all</button>
        </div>
      </div>
      <div class="card-body" style="padding:12px 20px">
        <table class="admin-table">
          <thead><tr>
            <th>Desk ID</th><th>Floor</th><th>Neighbourhood</th><th>Features</th><th>Status</th><th>Action</th>
          </tr></thead>
          <tbody>
            ${DESKS.map(desk => {
              const disabled = settings.disabledDesks.includes(desk.id);
              return `<tr style="${disabled ? 'opacity:0.6' : ''}">
                <td style="font-weight:600;font-family:monospace">${desk.id}</td>
                <td style="color:var(--text-secondary)">${desk.floor === 'ground' ? 'Ground' : 'First'}</td>
                <td>
                  <span class="nb-dot ${NB_COLOURS?.[desk.neighbourhood]?.dot || ''}"></span>
                  ${desk.neighbourhood}
                </td>
                <td>
                  <div style="display:flex;gap:3px;flex-wrap:wrap">
                    ${getDeskFeatures(desk.id).map(f => `<span style="font-size:10px;padding:2px 5px;background:var(--bg);border:1px solid var(--border);border-radius:3px">${featureLabel(f)}</span>`).join('')}
                    ${getDeskFeatures(desk.id).length === 0 ? '<span style="font-size:11px;color:var(--text-muted)">Standard</span>' : ''}
                  </div>
                </td>
                <td><span class="desk-status-badge ${disabled ? 'desk-status-disabled' : 'desk-status-active'}">${disabled ? 'Disabled' : 'Active'}</span></td>
                <td>
                  <button type="button" class="btn-table btn-table-secondary desk-edit-features" data-desk-id="${desk.id}" onclick="showDeskFeatureEditor('${desk.id}')">Edit features</button>
                  ${disabled
                    ? `<button class="btn-table btn-table-success" onclick="toggleDesk('${desk.id}', false)">Enable</button>`
                    : `<button class="btn-table btn-table-danger" onclick="toggleDesk('${desk.id}', true)">Disable</button>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        <div id="desk-feature-editor-container"></div>
      </div>
    </div>
  `;

  // attach any needed listeners
  document.querySelectorAll('#view-deskconfig .desk-edit-features').forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      showDeskFeatureEditor(button.dataset.deskId);
    });
  });
}

// ── Occupancy Report ───────────────────────────────────────────────────────

function setOccupancyTeam(team) {
  occupancyTeam = team;
  renderOccupancy();
}

function renderOccupancy() {
  const allTeams = [...new Set(USERS_DATA.map(u => u.team))].sort();
  const teamUids = occupancyTeam
    ? new Set(USERS_DATA.filter(u => u.team === occupancyTeam).map(u => u.id))
    : null;
  const filter = b => !teamUids || teamUids.has(b.userId);

  const b30 = bookingsInRange(30).filter(filter);
  const totalDesks = DESKS.length;

  const byDay = [1,2,3,4,5].map(dow => {
    const days = countWorkdaysByDow(30, dow);
    const count = b30.filter(b => dayOfWeek(b.date) === dow).length;
    return { label: DAY_NAMES[dow], value: pct(count, days * totalDesks), color: 'var(--primary)' };
  });

  const byNb = Object.keys(NB_COLOURS).map(nb => {
    const nbDesks = DESKS.filter(d => d.neighbourhood === nb);
    const count = b30.filter(b => nbDesks.find(d => d.id === b.deskId)).length;
    const possible = countWorkdays(30) * nbDesks.length;
    return { nb, count, possible, occ: pct(count, possible), color: NB_COLOURS[nb].bar };
  });

  const weeks = buildWeeklyOccupancy(teamUids);

  const teamFilterBar = teamFilterHTML('occupancyTeam', allTeams, occupancyTeam, 'setOccupancyTeam');

  document.getElementById('view-occupancy').innerHTML = `
    <div class="page-header">
      <h1>Occupancy Report</h1>
      <p>Desk utilisation across floors and zones · last 30 days${occupancyTeam ? ' · ' + occupancyTeam : ''}</p>
    </div>

    ${teamFilterBar}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">Average by Day of Week</span></div>
        <div class="card-body" style="padding:16px 20px">
          ${renderBarChart(byDay)}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">By Neighbourhood</span></div>
        <div class="card-body" style="padding:16px 20px">
          ${renderBarChart(byNb.map(n => ({ label: n.nb.replace(' Zone','').replace(' Area','').replace(' Bank',''), value: n.occ, color: n.color })))}
        </div>
      </div>
    </div>

    <div class="card one-col" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">Weekly Heatmap</span><span style="font-size:12px;color:var(--text-muted)">Occupancy % per day${occupancyTeam ? ' · ' + occupancyTeam : ''}</span></div>
      <div class="card-body" style="padding:16px 20px">
        ${renderHeatmap(weeks)}
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header"><span class="card-title">Neighbourhood Breakdown</span></div>
      <div class="card-body" style="padding:12px 20px">
        <table class="admin-table">
          <thead><tr><th>Neighbourhood</th><th>Desks</th><th>Total Bookings</th><th>Possible Slots</th><th>Utilisation</th></tr></thead>
          <tbody>
            ${byNb.map(n => `<tr>
              <td>
                <span class="nb-dot ${NB_COLOURS[n.nb].dot}"></span>
                <span style="font-weight:500">${n.nb}</span>
              </td>
              <td>${DESKS.filter(d => d.neighbourhood === n.nb).length}</td>
              <td>${n.count}</td>
              <td>${n.possible}</td>
              <td>
                <div class="util-bar-wrap">
                  <div class="util-bar-bg"><div class="util-bar-fill" style="width:${n.occ}%;background:${n.color}"></div></div>
                  <span style="font-size:12px;font-weight:600;min-width:32px;text-align:right">${n.occ}%</span>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function buildWeeklyOccupancy(uids) {
  const totalDesks = DESKS.length;
  const weeks = [];
  for (let w = 3; w >= 0; w--) {
    const weekData = [];
    for (let dow = 1; dow <= 5; dow++) {
      const d = new Date();
      const dayOffset = (d.getDay() === 0 ? -6 : 1 - d.getDay()); // start of this week Mon
      d.setDate(d.getDate() + dayOffset - (w * 7) + (dow - 1));
      const dateStr = toDateStr(d);
      if (dateStr > today()) { weekData.push({ dateStr, occ: null }); continue; }
      const count = allBookings().filter(b => b.date === dateStr && (!uids || uids.has(b.userId))).length;
      weekData.push({ dateStr, occ: pct(count, totalDesks) });
    }
    weeks.push({ label: `W-${w === 0 ? 'now' : w}`, days: weekData });
  }
  return weeks;
}

// ── No-shows ───────────────────────────────────────────────────────────────

function setNoShowsTeam(team) {
  noShowsTeam = team;
  renderNoShows();
}

function renderNoShows() {
  const allTeams = [...new Set(USERS_DATA.map(u => u.team))].sort();
  const teamUids = noShowsTeam
    ? new Set(USERS_DATA.filter(u => u.team === noShowsTeam).map(u => u.id))
    : null;
  const filter = b => !teamUids || teamUids.has(b.userId);

  const b30 = bookingsInRange(30).filter(filter);
  const noShows = b30.filter(b => !b.checkedIn);
  const rate = pct(noShows.length, b30.length);

  const byDow = [1,2,3,4,5].map(dow => {
    const total  = b30.filter(b => dayOfWeek(b.date) === dow);
    const missed = total.filter(b => !b.checkedIn);
    return { label: DAY_NAMES[dow], total: total.length, missed: missed.length, rate: pct(missed.length, total.length) };
  });

  const teamsForBreakdown = noShowsTeam ? [noShowsTeam] : allTeams;
  const byTeam = teamsForBreakdown.map(team => {
    const uids  = new Set(USERS_DATA.filter(u => u.team === team).map(u => u.id));
    const total  = bookingsInRange(30).filter(b => uids.has(b.userId));
    const missed = total.filter(b => !b.checkedIn);
    return { team, total: total.length, missed: missed.length, rate: pct(missed.length, total.length) };
  }).sort((a,b) => b.rate - a.rate);

  const usersInScope = noShowsTeam
    ? USERS_DATA.filter(u => u.team === noShowsTeam)
    : USERS_DATA;

  const byUser = usersInScope.map(u => {
    const total  = b30.filter(b => b.userId === u.id);
    const missed = total.filter(b => !b.checkedIn);
    return { user: u, total: total.length, missed: missed.length, rate: pct(missed.length, total.length) };
  }).filter(x => x.total >= 3).sort((a,b) => b.rate - a.rate).slice(0, 10);

  const teamFilterBar = teamFilterHTML('noShowsTeam', allTeams, noShowsTeam, 'setNoShowsTeam');
  const worstDay = byDow.reduce((a,b) => b.rate > a.rate ? b : a, byDow[0]);

  document.getElementById('view-noshows').innerHTML = `
    <div class="page-header">
      <h1>No-show Report</h1>
      <p>Bookings made but desk not checked into · last 30 days${noShowsTeam ? ' · ' + noShowsTeam : ''}</p>
    </div>

    ${teamFilterBar}

    <div class="admin-stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="admin-stat">
        <div class="admin-stat-value">${noShows.length}</div>
        <div class="admin-stat-label">Total No-shows</div>
        <div class="admin-stat-sub">Last 30 days${noShowsTeam ? ' · ' + noShowsTeam : ''}</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${rate}%</div>
        <div class="admin-stat-label">No-show Rate</div>
        <div class="admin-stat-sub">Industry avg ~10–15%</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${worstDay.label}</div>
        <div class="admin-stat-label">Worst Day</div>
        <div class="admin-stat-sub">Highest no-show rate</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">No-show Rate by Day</span></div>
        <div class="card-body" style="padding:16px 20px">
          ${renderBarChart(byDow.map(d => ({
            label: d.label,
            value: d.rate,
            color: d.rate >= 15 ? '#DC2626' : d.rate >= 10 ? '#D97706' : '#16a34a'
          })))}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">${noShowsTeam ? noShowsTeam + ' — No-show Rate' : 'No-show Rate by Team'}</span></div>
        <div class="card-body" style="padding:12px 20px">
          ${byTeam.map(t => `
            <div class="compliance-row">
              <div class="compliance-team">${t.team}</div>
              <div class="compliance-bar-bg">
                <div class="compliance-bar-fill" style="width:${Math.min(t.rate,100)}%;background:${t.rate>=15?'#DC2626':t.rate>=10?'#D97706':'#16a34a'}"></div>
              </div>
              <div class="compliance-pct">${t.rate}%</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">${noShowsTeam ? noShowsTeam + ' — Top Offenders' : 'Top Offenders'}</span>
        <span style="font-size:12px;color:var(--text-muted)">Min. 3 bookings in period</span>
      </div>
      <div class="card-body" style="padding:12px 20px">
        <table class="admin-table">
          <thead><tr><th>#</th><th>Name</th><th>Team</th><th>Bookings</th><th>No-shows</th><th>Rate</th></tr></thead>
          <tbody>
            ${byUser.length === 0
              ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No users with 3+ bookings in this period</td></tr>`
              : byUser.map((x, i) => `<tr>
                <td><span class="rank-badge${i < 3 ? ' rank-'+(i+1) : ''}">${i+1}</span></td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="user-avatar" style="background:${avatarColor(x.user.fullName)};width:26px;height:26px;font-size:10px;flex-shrink:0">${initials(x.user.fullName)}</div>
                    <span style="font-weight:500">${x.user.fullName}</span>
                  </div>
                </td>
                <td style="color:var(--text-secondary)">${x.user.team}</td>
                <td>${x.total}</td>
                <td>${x.missed}</td>
                <td><span style="font-weight:600;color:${x.rate>=15?'#DC2626':x.rate>=10?'#D97706':'#16a34a'}">${x.rate}%</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Desk Usage Report ──────────────────────────────────────────────────────

function renderDeskReport() {
  const b30 = bookingsInRange(30);
  const workdays = countWorkdays(30);
  const settings = loadSettings();

  const deskStats = DESKS.map(desk => {
    const db = b30.filter(b => b.deskId === desk.id);
    const noShows = db.filter(b => !b.checkedIn).length;
    const util = pct(db.length, workdays);
    const disabled = settings.disabledDesks.includes(desk.id);
    return { desk, count: db.length, noShows, util, disabled };
  }).sort((a,b) => b.count - a.count);

  const mostUsed  = deskStats[0];
  const leastUsed = deskStats.filter(d => !d.disabled).slice(-1)[0];
  const avgUtil   = pct(b30.length, workdays * DESKS.length);

  document.getElementById('view-deskreport').innerHTML = `
    <div class="page-header">
      <h1>Desk Usage Report</h1>
      <p>Per-desk booking and utilisation data · last 30 days</p>
    </div>

    <div class="admin-stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="admin-stat">
        <div class="admin-stat-value">${avgUtil}%</div>
        <div class="admin-stat-label">Avg Desk Utilisation</div>
        <div class="admin-stat-sub">Across all ${DESKS.length} desks</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${mostUsed.desk.id}</div>
        <div class="admin-stat-label">Most Booked</div>
        <div class="admin-stat-sub">${mostUsed.count} bookings · ${mostUsed.util}% util</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${leastUsed?.desk.id}</div>
        <div class="admin-stat-label">Least Booked</div>
        <div class="admin-stat-sub">${leastUsed?.count} bookings · ${leastUsed?.util}% util</div>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header"><span class="card-title">All Desks</span><span style="font-size:12px;color:var(--text-muted)">Sorted by utilisation</span></div>
      <div class="card-body" style="padding:12px 20px">
        <table class="admin-table">
          <thead><tr>
            <th>#</th><th>Desk</th><th>Floor</th><th>Neighbourhood</th><th>Features</th>
            <th>Bookings</th><th>No-shows</th><th>Utilisation</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${deskStats.map((s, i) => `<tr style="${s.disabled ? 'opacity:0.55' : ''}">
              <td><span class="rank-badge${i<3?' rank-'+(i+1):''}">${i+1}</span></td>
              <td style="font-weight:600;font-family:monospace">${s.desk.id}</td>
              <td style="color:var(--text-secondary)">${s.desk.floor === 'ground' ? 'Ground' : 'First'}</td>
              <td>
                <span class="nb-dot ${NB_COLOURS[s.desk.neighbourhood]?.dot || ''}"></span>
                ${s.desk.neighbourhood}
              </td>
              <td style="max-width:160px">
                <div style="display:flex;gap:3px;flex-wrap:wrap">
                  ${s.desk.features.map(f => `<span style="font-size:10px;padding:2px 5px;background:var(--bg);border:1px solid var(--border);border-radius:3px;white-space:nowrap">${featureLabel(f)}</span>`).join('')}
                  ${s.desk.features.length === 0 ? '<span style="font-size:11px;color:var(--text-muted)">Standard</span>' : ''}
                </div>
              </td>
              <td>${s.count}</td>
              <td>${s.noShows > 0 ? `<span style="color:#D97706">${s.noShows}</span>` : '0'}</td>
              <td>
                <div class="util-bar-wrap">
                  <div class="util-bar-bg"><div class="util-bar-fill" style="width:${Math.min(s.util,100)}%;background:${utilColor(s.util)}"></div></div>
                  <span style="font-size:12px;font-weight:600;min-width:32px;text-align:right;color:${utilColor(s.util)}">${s.util}%</span>
                </div>
              </td>
              <td><span class="desk-status-badge ${s.disabled ? 'desk-status-disabled' : 'desk-status-active'}">${s.disabled ? 'Disabled' : 'Active'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Team Report ────────────────────────────────────────────────────────────

function renderTeamReport() {
  const b30 = bookingsInRange(30);
  const workdays = countWorkdays(30);
  const teams = [...new Set(USERS_DATA.map(u => u.team))].sort();

  const teamStats = teams.map(team => {
    const users  = USERS_DATA.filter(u => u.team === team);
    const uids   = new Set(users.map(u => u.id));
    const tb     = b30.filter(b => uids.has(b.userId));
    const noShow = tb.filter(b => !b.checkedIn).length;

    // anchor day compliance: count bookings on anchor days vs expected
    let anchorExpected = 0, anchorBooked = 0;
    for (const u of users) {
      const anchors = (u.anchorDays || []).map(d => d.toLowerCase());
      const anchorDows = anchors.map(a =>
        ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(a));
      for (let i = 30; i >= 1; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        if (anchorDows.includes(d.getDay())) {
          anchorExpected++;
          const dateStr = toDateStr(d);
          if (tb.find(b => b.userId === u.id && b.date === dateStr)) anchorBooked++;
        }
      }
    }

    return {
      team,
      users: users.length,
      bookings: tb.length,
      noShowRate: pct(noShow, tb.length),
      avgPerUser: tb.length ? (tb.length / users.length).toFixed(1) : '0',
      anchorCompliance: pct(anchorBooked, anchorExpected),
      anchorExpected,
      anchorBooked,
    };
  }).sort((a,b) => b.bookings - a.bookings);

  document.getElementById('view-teamreport').innerHTML = `
    <div class="page-header">
      <h1>Team Report</h1>
      <p>Attendance, no-shows, and anchor day compliance by team · last 30 days</p>
    </div>

    <div class="card one-col" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">Team Summary</span></div>
      <div class="card-body" style="padding:12px 20px">
        <table class="admin-table">
          <thead><tr>
            <th>Team</th><th>Users</th><th>Bookings</th><th>Avg / user</th>
            <th>No-show rate</th><th>Anchor compliance</th>
          </tr></thead>
          <tbody>
            ${teamStats.map(t => `<tr>
              <td style="font-weight:600">${t.team}</td>
              <td>${t.users}</td>
              <td>${t.bookings}</td>
              <td>${t.avgPerUser}</td>
              <td><span style="font-weight:600;color:${t.noShowRate>=15?'#DC2626':t.noShowRate>=10?'#D97706':'#16a34a'}">${t.noShowRate}%</span></td>
              <td>
                <div class="util-bar-wrap">
                  <div class="util-bar-bg"><div class="compliance-bar-fill" style="width:${t.anchorCompliance}%"></div></div>
                  <span style="font-size:12px;font-weight:600;min-width:36px;text-align:right">${t.anchorCompliance}%</span>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">Anchor Day Compliance</span></div>
        <div class="card-body" style="padding:12px 20px">
          ${teamStats.map(t => `
            <div class="compliance-row">
              <div class="compliance-team">${t.team}</div>
              <div class="compliance-bar-bg">
                <div class="compliance-bar-fill" style="width:${t.anchorCompliance}%;background:${t.anchorCompliance>=80?'var(--primary)':t.anchorCompliance>=60?'#D97706':'#DC2626'}"></div>
              </div>
              <div class="compliance-pct">${t.anchorCompliance}%</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">No-show Rate by Team</span></div>
        <div class="card-body" style="padding:12px 20px">
          ${[...teamStats].sort((a,b) => b.noShowRate - a.noShowRate).map(t => `
            <div class="compliance-row">
              <div class="compliance-team">${t.team}</div>
              <div class="compliance-bar-bg">
                <div class="compliance-bar-fill" style="width:${t.noShowRate}%;background:${t.noShowRate>=15?'#DC2626':t.noShowRate>=10?'#D97706':'#16a34a'}"></div>
              </div>
              <div class="compliance-pct">${t.noShowRate}%</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── Settings: Booking Rules ────────────────────────────────────────────────

function renderRules() {
  const s = loadSettings();
  const r = s.bookingRules;

  document.getElementById('view-rules').innerHTML = `
    <div class="page-header">
      <h1>Booking Rules</h1>
      <p>Control how and when users can make desk bookings</p>
    </div>
    <div class="card one-col">
      <div class="card-body" style="padding:24px">

        <div class="settings-section">
          <div class="settings-section-title">Advance Booking</div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Max days bookable in advance</label>
              <input type="number" class="field-input" id="s-maxDaysInAdvance" value="${r.maxDaysInAdvance}" min="1" max="90">
              <div class="field-hint">Users cannot book more than this many days ahead</div>
            </div>
            <div class="field-group">
              <label class="field-label">Max bookings per week per person</label>
              <input type="number" class="field-input" id="s-maxBookingsPerWeek" value="${r.maxBookingsPerWeek}" min="1" max="10">
              <div class="field-hint">Prevents desk hoarding across the week</div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Cancellations &amp; Check-in</div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Cancellation cutoff (hours before)</label>
              <input type="number" class="field-input" id="s-cancellationCutoffHours" value="${r.cancellationCutoffHours}" min="0" max="48">
              <div class="field-hint">0 = cancel any time up to the booking start</div>
            </div>
            <div class="field-group">
              <label class="field-label">Auto-release after no check-in (minutes)</label>
              <input type="number" class="field-input" id="s-autoReleaseMinutes" value="${r.autoReleaseMinutes}" min="0" max="240">
              <div class="field-hint">0 = never auto-release; desk stays reserved all day</div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Features</div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Allow half-day bookings (AM / PM)</div>
              <div class="toggle-desc">Users can book AM only or PM only, sharing the desk across the day</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="s-allowHalfDays" ${r.allowHalfDays ? 'checked' : ''}>
              <div class="toggle-track"></div>
            </label>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Require check-in to confirm booking</div>
              <div class="toggle-desc">Bookings without a check-in are flagged as no-shows in reports</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="s-requireCheckIn" ${r.requireCheckIn ? 'checked' : ''}>
              <div class="toggle-track"></div>
            </label>
          </div>
        </div>

        <div class="settings-save-bar">
          <button class="btn btn-secondary" onclick="renderRules()">Discard</button>
          <button class="btn btn-primary" onclick="saveRules()">Save Changes</button>
        </div>
      </div>
    </div>
  `;
}

function saveRules() {
  try {
    const nameEl = document.getElementById('nf-name');
    if (!nameEl) { toast('Neighbourhood form not found (nf-name)', 'error'); console.error('nf-name element missing'); return; }
    const name = nameEl.value.trim();
    if (!name) { toast('Please enter a neighbourhood name', 'error'); return; }

    const buildingEl = document.getElementById('nf-building');
    const colorEl = document.getElementById('nf-color');
    if (!buildingEl || !colorEl) { toast('Neighbourhood form fields missing', 'error'); console.error('nf-building or nf-color missing', { buildingEl, colorEl }); return; }

    const building      = buildingEl.value;
    const color         = colorEl.value;
    const assignedTeams = [...document.querySelectorAll('.nb-team-cb:checked')].map(cb => cb.value);
    const deskIds       = [...document.querySelectorAll('.nb-desk-cb:checked')].map(cb => cb.value);

    const s = loadSettings();

    if (editId === 'new') {
      s.neighbourhoods.push({ id: 'nb-' + Date.now(), name, building, color, deskIds, assignedTeams });
      toast('Neighbourhood added');
    } else {
      const i = s.neighbourhoods.findIndex(n => n.id === editId);
      if (i !== -1) s.neighbourhoods[i] = { ...s.neighbourhoods[i], name, building, color, deskIds, assignedTeams };
      toast('Neighbourhood updated');
    }

    saveSettings(s);
    nbEditId = null;
    renderNeighbourhoods();
  } catch (err) {
    console.error('Error in saveNb', err);
    toast('Error saving neighbourhood: ' + (err.message || ''), 'error');
  }
}

function closeDeskFeatureEditor() {
  const modal = document.getElementById('desk-feature-editor-modal');
  if (modal) modal.remove();
  const editorRow = document.querySelector('.desk-feature-editor-panel');
  if (editorRow) editorRow.remove();
  const editorContainer = document.getElementById('desk-feature-editor-container');
  if (editorContainer) editorContainer.innerHTML = '';
}

function showDeskFeatureEditor(deskId) {
  const desk = deskInfo(deskId);
  if (!desk) return;
  closeDeskFeatureEditor();
  const currentFeatures = getDeskFeatures(deskId);
  const options = ['window-seat','quiet-area','standing-desk','dual-monitor','near-team','accessible-desk'];
  const editorHtml = `
    <tr class="desk-feature-editor-panel">
      <td colspan="6" style="padding:0;border:none">
        <div class="card one-col" style="margin:16px 0 0 0">
          <div class="card-header">
            <span class="card-title">Edit ${desk.id} Features</span>
          </div>
          <div class="card-body" style="padding:20px">
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px">
              ${options.map(feature => `
                <label style="display:inline-flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:${currentFeatures.includes(feature) ? 'rgba(16,185,129,0.08)' : 'transparent'};">
                  <input type="checkbox" name="desk-feature" value="${feature}" ${currentFeatures.includes(feature) ? 'checked' : ''}>
                  ${featureLabel(feature)}
                </label>
              `).join('')}
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="saveDeskFeatureChanges('${desk.id}')">Save features</button>
              <button class="btn btn-secondary" onclick="closeDeskFeatureEditor();renderDeskConfig()">Cancel</button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;

  const row = document.querySelector(`#view-deskconfig .desk-edit-features[data-desk-id="${deskId}"]`)?.closest('tr');
  if (row) {
    row.insertAdjacentHTML('afterend', editorHtml);
    return;
  }

  const editorContainer = document.getElementById('desk-feature-editor-container');
  if (editorContainer) {
    editorContainer.innerHTML = editorHtml;
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'desk-feature-editor-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.35);z-index:10000';
  modal.innerHTML = `
    <div style="width:100%;max-width:760px;">
      <table style="width:100%;border-collapse:collapse"><tbody>${editorHtml}</tbody></table>
    </div>
  `;
  modal.addEventListener('click', event => {
    if (event.target === modal) closeDeskFeatureEditor();
  });
  document.body.appendChild(modal);
}

function saveDeskFeatureChanges(deskId) {
  const selected = Array.from(document.querySelectorAll('.desk-feature-editor-panel input[name="desk-feature"]:checked, #desk-feature-editor-container input[name="desk-feature"]:checked, #desk-feature-editor-modal input[name="desk-feature"]:checked'))
    .map(el => el.value);
  saveDeskFeatures(deskId, selected);
  closeDeskFeatureEditor();
  toast(`Features saved for ${deskId}`);
  renderDeskConfig();
}

window.showDeskFeatureEditor = showDeskFeatureEditor;
window.saveDeskFeatureChanges = saveDeskFeatureChanges;

function toggleDesk(deskId, disable) {
  const s = loadSettings();
  if (disable) {
    if (!s.disabledDesks.includes(deskId)) s.disabledDesks.push(deskId);
  } else {
    s.disabledDesks = s.disabledDesks.filter(id => id !== deskId);
  }
  saveSettings(s);
  toast(`${deskId} ${disable ? 'disabled' : 'enabled'}`);
  renderDeskConfig();
}

function enableAllDesks() {
  const s = loadSettings();
  s.disabledDesks = [];
  saveSettings(s);
  toast('All desks enabled');
  renderDeskConfig();
}

// ── Settings: Office & Location ────────────────────────────────────────────

function renderOfficeSettings() {
  const s = loadSettings();
  const o = s.office;
  const c = s.capacity;

  document.getElementById('view-officesettings').innerHTML = `
    <div class="page-header">
      <h1>Office &amp; Location Settings</h1>
      <p>Configure the office location used for geolocation check-in</p>
    </div>

    <div class="card one-col" style="margin-bottom:16px">
      <div class="card-body" style="padding:24px">

        <div class="settings-section">
          <div class="settings-section-title">Office Details</div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Office Name</label>
              <input type="text" class="field-input" id="o-name" value="${o.name}">
            </div>
          </div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Latitude</label>
              <input type="number" class="field-input" id="o-lat" value="${o.lat}" step="0.0001">
            </div>
            <div class="field-group">
              <label class="field-label">Longitude</label>
              <input type="number" class="field-input" id="o-lng" value="${o.lng}" step="0.0001">
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Check-in radius (metres)</label>
            <div class="range-row">
              <input type="range" id="o-radius" min="50" max="1000" step="50" value="${o.radiusM}"
                oninput="document.getElementById('o-radius-val').textContent=this.value+'m'">
              <div class="range-value" id="o-radius-val">${o.radiusM}m</div>
            </div>
            <div class="field-hint">Users must be within this distance of the office coordinates to auto check-in</div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Walk-in Auto-booking</div>
          <div class="field-hint" style="margin-bottom:16px">When enabled, Perch will automatically find and offer a suitable desk to users who arrive without a booking.</div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Auto-book on building scan-in</div>
              <div class="toggle-desc">Triggered when a user's access card is scanned at the entrance</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="ab-enableOnScan" ${s.autoBook.enableOnScan ? 'checked' : ''}>
              <div class="toggle-track"></div>
            </label>
          </div>
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">Auto-book on proximity detection</div>
              <div class="toggle-desc">Triggered when the user's phone detects they are near the office</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="ab-enableOnProximity" ${s.autoBook.enableOnProximity ? 'checked' : ''}>
              <div class="toggle-track"></div>
            </label>
          </div>
          <div class="field-group" style="margin-top:12px">
            <label class="field-label">Proximity detection radius (metres)</label>
            <div class="range-row">
              <input type="range" id="ab-proximityRadiusM" min="50" max="2000" step="50" value="${s.autoBook.proximityRadiusM}"
                oninput="document.getElementById('ab-radius-val').textContent=this.value+'m'">
              <div class="range-value" id="ab-radius-val">${s.autoBook.proximityRadiusM}m</div>
            </div>
            <div class="field-hint">How close to the office a user needs to be to trigger proximity auto-booking (independent of the check-in radius above)</div>
          </div>
        </div>

        <div class="settings-save-bar">
          <button class="btn btn-secondary" onclick="renderOfficeSettings()">Discard</button>
          <button class="btn btn-primary" onclick="saveOfficeSettings()">Save Changes</button>
        </div>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-body" style="padding:24px">
        <div class="settings-section">
          <div class="settings-section-title">Daily Capacity Limits</div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Ground Floor max capacity (%)</label>
              <div class="range-row">
                <input type="range" id="c-ground" min="10" max="100" step="5" value="${c.groundFloorMaxPct}"
                  oninput="document.getElementById('c-ground-val').textContent=this.value+'%'">
                <div class="range-value" id="c-ground-val">${c.groundFloorMaxPct}%</div>
              </div>
              <div class="field-hint">Max ${Math.round(DESKS.filter(d=>d.floor==='ground').length * c.groundFloorMaxPct / 100)} of ${DESKS.filter(d=>d.floor==='ground').length} ground floor desks bookable per day</div>
            </div>
            <div class="field-group">
              <label class="field-label">First Floor max capacity (%)</label>
              <div class="range-row">
                <input type="range" id="c-first" min="10" max="100" step="5" value="${c.firstFloorMaxPct}"
                  oninput="document.getElementById('c-first-val').textContent=this.value+'%'">
                <div class="range-value" id="c-first-val">${c.firstFloorMaxPct}%</div>
              </div>
              <div class="field-hint">Max ${Math.round(DESKS.filter(d=>d.floor==='first').length * c.firstFloorMaxPct / 100)} of ${DESKS.filter(d=>d.floor==='first').length} first floor desks bookable per day</div>
            </div>
          </div>
        </div>
        <div class="settings-save-bar">
          <button class="btn btn-secondary" onclick="renderOfficeSettings()">Discard</button>
          <button class="btn btn-primary" onclick="saveCapacitySettings()">Save Changes</button>
        </div>
      </div>
    </div>
  `;
}

function saveOfficeSettings() {
  const s = loadSettings();
  s.office = {
    name:    document.getElementById('o-name').value.trim() || 'Office',
    lat:     parseFloat(document.getElementById('o-lat').value)  || 51.5074,
    lng:     parseFloat(document.getElementById('o-lng').value)  || -0.1278,
    radiusM: parseInt(document.getElementById('o-radius').value) || 300,
  };
  s.autoBook = {
    enableOnScan:      document.getElementById('ab-enableOnScan').checked,
    enableOnProximity: document.getElementById('ab-enableOnProximity').checked,
    proximityRadiusM:  parseInt(document.getElementById('ab-proximityRadiusM').value) || 300,
  };
  saveSettings(s);
  toast('Office settings saved');
}

function saveCapacitySettings() {
  const s = loadSettings();
  s.capacity = {
    groundFloorMaxPct: parseInt(document.getElementById('c-ground').value) || 100,
    firstFloorMaxPct:  parseInt(document.getElementById('c-first').value)  || 100,
  };
  saveSettings(s);
  toast('Capacity settings saved');
  renderOfficeSettings();
}

function renderTeamSettings() {
  const s = loadSettings();
  const teams = s.teams || [];
  document.getElementById('view-teamsettings').innerHTML = `
    <div class="page-header">
      <h1>Team Management</h1>
      <p>Create, rename, or delete team names used in the reporting and desk assignment experience.</p>
    </div>

    <div class="card one-col" style="margin-bottom:16px">
      <div class="card-body" style="padding:24px">
        <div class="settings-section">
          <div class="settings-section-title">Add a new team</div>
          <div class="field-row" style="align-items:flex-end;gap:12px;flex-wrap:wrap">
            <div class="field-group" style="flex:1;min-width:220px">
              <label class="field-label">Team name</label>
              <input id="ts-new-team" class="field-input" type="text" placeholder="Enter team name">
            </div>
            <button class="btn btn-primary" style="height:40px" onclick="addTeam()">Add team</button>
          </div>
          <div class="field-hint">Team names are used for reporting and workspace assignment labels.</div>
        </div>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header"><span class="card-title">Existing teams</span></div>
      <div class="card-body" style="padding:20px">
        ${teams.length === 0 ? '<div style="color:var(--text-muted)">No teams have been defined yet.</div>' : teams.map((team, idx) => `
          <div class="settings-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
            <div style="font-weight:600">${escHtml(team)}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-sm btn-secondary" onclick="editTeam(${idx})">Rename</button>
              <button class="btn btn-sm btn-danger" onclick="deleteTeam(${idx})">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function saveTeamSettings(teams) {
  const s = loadSettings();
  s.teams = teams;
  saveSettings(s);
  toast('Team roster saved');
}

function addTeam() {
  const input = document.getElementById('ts-new-team');
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    toast('Enter a team name first', 'danger');
    return;
  }
  const s = loadSettings();
  const teams = s.teams || [];
  if (teams.includes(name)) {
    toast('That team already exists', 'danger');
    return;
  }
  teams.push(name);
  teams.sort();
  saveTeamSettings(teams);
  input.value = '';
  renderTeamSettings();
}

function editTeam(index) {
  const s = loadSettings();
  const teams = s.teams || [];
  const currentName = teams[index];
  if (!currentName) return;
  const nextName = window.prompt('Rename team', currentName)?.trim();
  if (!nextName || nextName === currentName) return;
  if (teams.includes(nextName)) {
    toast('A team with that name already exists', 'danger');
    return;
  }
  teams[index] = nextName;
  teams.sort();
  saveTeamSettings(teams);
  renderTeamSettings();
}

function deleteTeam(index) {
  const s = loadSettings();
  const teams = s.teams || [];
  const team = teams[index];
  if (!team) return;
  if (!window.confirm(`Delete the team '${team}'? This cannot be undone.`)) return;
  teams.splice(index, 1);
  saveTeamSettings(teams);
  renderTeamSettings();
}

// ── Chart helpers ──────────────────────────────────────────────────────────

function renderBarChart(items) {
  const max = Math.max(...items.map(i => i.value), 1);
  return `
    <div class="bar-chart">
      ${items.map(item => `
        <div class="bar-col">
          <div class="bar-value-label">${item.value}%</div>
          <div class="bar-fill-wrap">
            <div class="bar-fill" style="height:${(item.value/max)*100}%;background:${item.color || 'var(--primary)'}"></div>
          </div>
          <div class="bar-day-label">${item.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderHeatmap(weeks) {
  const days = ['Mon','Tue','Wed','Thu','Fri'];

  function heatColor(occ) {
    if (occ === null) return '#f1f5f9';
    if (occ >= 80) return '#006A4D';
    if (occ >= 60) return '#16a34a';
    if (occ >= 40) return '#86efac';
    if (occ >= 20) return '#bbf7d0';
    return '#f0fdf4';
  }

  function textColor(occ) {
    if (occ === null) return '#94a3b8';
    if (occ >= 60) return 'white';
    return '#1a1a1a';
  }

  return `
    <div class="heatmap-col-labels">
      ${days.map(d => `<div class="heatmap-col-label">${d}</div>`).join('')}
    </div>
    <div class="heatmap">
      ${weeks.map(week => `
        <div class="heatmap-row">
          <div class="heatmap-label">${week.label}</div>
          ${week.days.map(day => `
            <div class="heatmap-cell" style="background:${heatColor(day.occ)};color:${textColor(day.occ)}"
              title="${day.dateStr}${day.occ !== null ? ' · ' + day.occ + '%' : ' · future'}">
              ${day.occ !== null ? day.occ + '%' : '–'}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:11px;color:var(--text-muted)">
      <span>Low</span>
      ${['#f0fdf4','#bbf7d0','#86efac','#16a34a','#006A4D'].map(c =>
        `<div style="width:18px;height:18px;border-radius:3px;background:${c}"></div>`).join('')}
      <span>High</span>
    </div>
  `;
}

// ── Workday helpers ────────────────────────────────────────────────────────

function countWorkdays(daysBack) {
  let count = 0;
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

function countWorkdaysByDow(daysBack, targetDow) {
  let count = 0;
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (d.getDay() === targetDow) count++;
  }
  return count;
}

// ── Neighbourhoods ─────────────────────────────────────────────────────────

const NB_PALETTE = ['#006A4D','#0891b2','#7c3aed','#1d4ed8','#16a34a','#be185d','#b45309','#dc2626','#0369a1','#374151'];

function renderNeighbourhoods() {
  const s        = loadSettings();
  const nbs      = s.neighbourhoods;
  const buildings = s.buildings;
  const allTeams  = [...new Set(USERS_DATA.map(u => u.team))].sort();

  const editBlock = nbEditId !== null ? nbFormHtml(nbEditId, s, allTeams) : '';

  document.getElementById('view-neighbourhoods').innerHTML = `
    <div class="page-header">
      <h1>Neighbourhoods</h1>
      <p>Group desks into areas, assign them to one or more buildings, and align teams. Teams can span multiple neighbourhoods and buildings.</p>
    </div>

    <div class="card one-col" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title">Buildings &amp; Areas</span>
        <div class="card-header-actions">
          <input type="text" id="new-building-input" class="field-input"
            placeholder="Building name…" style="width:200px;padding:6px 10px;font-size:13px"
            onkeydown="if(event.key==='Enter')addBuilding()">
          <button class="btn btn-sm btn-secondary" onclick="addBuilding()">Add</button>
        </div>
      </div>
      <div class="card-body" style="padding:14px 20px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${buildings.map(b => `
            <span class="building-chip">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              ${escHtml(b)}
              ${buildings.length > 1
                ? `<button class="chip-remove" onclick="removeBuilding(${JSON.stringify(b)})" title="Remove">×</button>`
                : ''}
            </span>
          `).join('')}
        </div>
      </div>
    </div>

    ${editBlock}

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:14px;font-weight:600;color:var(--text)">
        Neighbourhoods
        <span style="font-size:12px;font-weight:400;color:var(--text-muted);margin-left:6px">${nbs.length} defined</span>
      </div>
      ${nbEditId === null
        ? `<button class="btn btn-primary btn-sm" onclick="startAddNb()">+ Add Neighbourhood</button>`
        : ''}
    </div>

    ${nbs.length === 0 ? `
      <div style="text-align:center;padding:48px 24px;color:var(--text-muted)">
        No neighbourhoods defined yet.
        <br><button class="btn btn-primary" onclick="startAddNb()" style="margin-top:14px">Add your first neighbourhood</button>
      </div>
    ` : `
      <div class="nb-grid">
        ${nbs.map(nb => nbCardHtml(nb, allTeams)).join('')}
      </div>
    `}
  `;
}

function nbCardHtml(nb, allTeams) {
  const floors = [...new Set(
    nb.deskIds.map(id => { const d = DESKS.find(x => x.id === id); return d?.floor === 'ground' ? 'G' : d?.floor === 'first' ? 'F' : null; }).filter(Boolean)
  )].sort().join('/');
  const floorLabel = floors ? ` · ${floors} floor` : '';

  const teamChips = nb.assignedTeams.length
    ? nb.assignedTeams.map(t => `<span class="nb-team-chip">${escHtml(t)}</span>`).join('')
    : `<span style="font-size:12px;color:var(--text-muted)">No teams assigned</span>`;

  const deskTags = nb.deskIds.map(id =>
    `<span class="nb-desk-tag">${escHtml(id)}</span>`).join('');

  return `
    <div class="nb-card ${nbEditId === nb.id ? 'nb-card-editing' : ''}">
      <div class="nb-card-accent" style="background:${nb.color}"></div>
      <div class="nb-card-content">
        <div class="nb-card-top">
          <div>
            <div class="nb-card-name">${escHtml(nb.name)}</div>
            <div class="nb-card-meta">${escHtml(nb.building)}${floorLabel} · ${nb.deskIds.length} desk${nb.deskIds.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="nb-card-actions">
            <button class="btn-table" onclick="startEditNb(${JSON.stringify(nb.id)})">Edit</button>
            <button class="btn-table btn-table-danger" onclick="deleteNb(${JSON.stringify(nb.id)})">Remove</button>
          </div>
        </div>
        <div class="nb-card-teams">${teamChips}</div>
        ${nb.deskIds.length ? `<div class="nb-desk-tags">${deskTags}</div>` : ''}
      </div>
    </div>
  `;
}

function nbFormHtml(editId, s, allTeams) {
  const isNew = editId === 'new';
  const nb = isNew
    ? { name:'', building: s.buildings[0] || '', color:'#006A4D', deskIds:[], assignedTeams:[] }
    : (s.neighbourhoods.find(n => n.id === editId) || { name:'', building:'', color:'#006A4D', deskIds:[], assignedTeams:[] });

  const floorGroups = [
    { label:'Ground Floor', desks: DESKS.filter(d => d.floor === 'ground') },
    { label:'First Floor',  desks: DESKS.filter(d => d.floor === 'first')  },
  ];

  return `
    <div class="nb-form-panel">
      <div class="nb-form-header">
        <span style="font-size:15px;font-weight:600">${isNew ? 'Add Neighbourhood' : 'Edit — ' + escHtml(nb.name)}</span>
        <button class="agent-close-btn" onclick="cancelNbEdit()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="nb-form-body">

        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Name</label>
            <input type="text" class="field-input" id="nf-name" value="${escHtml(nb.name)}" placeholder="e.g. Window Bank">
          </div>
          <div class="field-group">
            <label class="field-label">Building</label>
            <select class="field-input" id="nf-building">
              ${s.buildings.map(b => `<option value="${escHtml(b)}" ${nb.building === b ? 'selected' : ''}>${escHtml(b)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Colour</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
            ${NB_PALETTE.map(c => `
              <button type="button" class="color-swatch ${nb.color === c ? 'color-swatch-selected' : ''}"
                style="background:${c}" onclick="selectNbColor(this,'${c}')" data-color="${c}"></button>
            `).join('')}
          </div>
          <input type="hidden" id="nf-color" value="${escHtml(nb.color)}">
        </div>

        <div class="field-group">
          <label class="field-label">
            Assign Teams
            <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);font-size:11px;margin-left:6px">Teams can appear in multiple neighbourhoods and buildings</span>
          </label>
          <div class="nb-checkbox-grid" id="nf-teams">
            ${allTeams.map(t => `
              <label class="nb-checkbox-item">
                <input type="checkbox" class="nb-team-cb" value="${escHtml(t)}" ${nb.assignedTeams.includes(t) ? 'checked' : ''}>
                <span>${escHtml(t)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Desks in this Neighbourhood</label>
          ${floorGroups.map(fg => `
            <div style="margin-bottom:14px">
              <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">${fg.label}</div>
              <div class="nb-checkbox-grid nb-desk-grid">
                ${fg.desks.map(d => `
                  <label class="nb-checkbox-item nb-desk-item ${nb.deskIds.includes(d.id) ? 'nb-desk-item-selected' : ''}">
                    <input type="checkbox" class="nb-desk-cb" value="${d.id}"
                      ${nb.deskIds.includes(d.id) ? 'checked' : ''}
                      onchange="this.closest('label').classList.toggle('nb-desk-item-selected',this.checked)">
                    <span style="font-family:monospace;font-size:12px">${d.id}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

      </div>
      <div class="settings-save-bar">
        <button class="btn btn-secondary" onclick="cancelNbEdit()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNb(${JSON.stringify(editId)})">${isNew ? 'Add Neighbourhood' : 'Save Changes'}</button>
      </div>
    </div>
  `;
}

function startAddNb()    { nbEditId = 'new'; renderNeighbourhoods(); scrollToForm(); }
function startEditNb(id) { nbEditId = id;    renderNeighbourhoods(); scrollToForm(); }
function cancelNbEdit()  { nbEditId = null;  renderNeighbourhoods(); }

function scrollToForm() {
  setTimeout(() => document.querySelector('.nb-form-panel')?.scrollIntoView({ behavior:'smooth', block:'start' }), 50);
}

function selectNbColor(el, color) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('color-swatch-selected'));
  el.classList.add('color-swatch-selected');
  document.getElementById('nf-color').value = color;
}

function saveNb(editId) {
  const name = document.getElementById('nf-name').value.trim();
  if (!name) { toast('Please enter a neighbourhood name', 'error'); return; }

  // saving neighbourhood

  const building      = document.getElementById('nf-building').value;
  const color         = document.getElementById('nf-color').value;
  const assignedTeams = [...document.querySelectorAll('.nb-team-cb:checked')].map(cb => cb.value);
  const deskIds       = [...document.querySelectorAll('.nb-desk-cb:checked')].map(cb => cb.value);

  const s = loadSettings();

  if (editId === 'new') {
    s.neighbourhoods.push({ id: 'nb-' + Date.now(), name, building, color, deskIds, assignedTeams });
    toast('Neighbourhood added');
  } else {
    const i = s.neighbourhoods.findIndex(n => n.id === editId);
    if (i !== -1) s.neighbourhoods[i] = { ...s.neighbourhoods[i], name, building, color, deskIds, assignedTeams };
    toast('Neighbourhood updated');
  }

  saveSettings(s);
  nbEditId = null;
  renderNeighbourhoods();
}

function deleteNb(id) {
  const s = loadSettings();
  const nb = s.neighbourhoods.find(n => n.id === id);
  if (!nb) return;
  if (!confirm(`Remove neighbourhood "${nb.name}"?`)) return;
  s.neighbourhoods = s.neighbourhoods.filter(n => n.id !== id);
  saveSettings(s);
  if (nbEditId === id) nbEditId = null;
  toast('Neighbourhood removed');
  renderNeighbourhoods();
}

function addBuilding() {
  const input = document.getElementById('new-building-input');
  const name  = input.value.trim();
  if (!name) return;
  const s = loadSettings();
  if (s.buildings.includes(name)) { toast('Building already exists', 'error'); return; }
  s.buildings.push(name);
  saveSettings(s);
  toast(`"${name}" added`);
  renderNeighbourhoods();
}

function removeBuilding(name) {
  const s = loadSettings();
  if (s.buildings.length <= 1) { toast('Cannot remove the only building', 'error'); return; }
  s.buildings = s.buildings.filter(b => b !== name);
  saveSettings(s);
  toast('Building removed');
  renderNeighbourhoods();
}

// ── Anchor Days ───────────────────────────────────────────────────────────

const ANCHOR_DAYS    = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const ANCHOR_DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri' };

function renderAnchorDays() {
  const s        = loadSettings();
  const cfg      = s.anchorDayConfig;
  const allTeams = [...new Set(USERS_DATA.map(u => u.team))].sort();
  const allSites = [...new Set(USERS_DATA.map(u => u.location))].sort();

  function dayPickerHtml(scopeId, selectedDays) {
    return `<div class="day-picker">` + ANCHOR_DAYS.map(d => `
      <label class="day-pick-btn${(selectedDays||[]).includes(d) ? ' active' : ''}">
        <input type="checkbox" value="${d}" data-scopeid="${escHtml(scopeId)}" ${(selectedDays||[]).includes(d) ? 'checked' : ''}
               onchange="anchorDayToggle(this.dataset.scopeid, this.value, this.checked, this)">
        ${ANCHOR_DAY_SHORT[d]}
      </label>`).join('') + `</div>`;
  }

  document.getElementById('view-anchordays').innerHTML = `
    <div class="page-header">
      <h1>Anchor Days</h1>
      <p>Set which days each site and team are expected in the office. Team days and site days both apply — the effective anchor days for a user are the union of their personal, team, and site settings.</p>
    </div>

    <div class="card one-col" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title">By Site</span>
        <span style="font-size:12px;color:var(--text-muted)">Applies to all staff at each location</span>
      </div>
      <div class="card-body" style="padding:0">
        <table class="admin-table">
          <thead><tr>
            <th>Location</th><th>Staff</th><th>Anchor Days</th>
          </tr></thead>
          <tbody>
            ${allSites.map(site => {
              const count = USERS_DATA.filter(u => u.location === site).length;
              return `<tr>
                <td style="font-weight:600">${escHtml(site)}</td>
                <td style="color:var(--text-secondary)">${count}</td>
                <td>${dayPickerHtml('site:' + site, cfg.bySite[site])}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">By Team</span>
        <span style="font-size:12px;color:var(--text-muted)">Added on top of site anchor days</span>
      </div>
      <div class="card-body" style="padding:0">
        <table class="admin-table">
          <thead><tr>
            <th>Team</th><th>Members</th><th>Team Anchor Days</th><th>Also from site</th>
          </tr></thead>
          <tbody>
            ${allTeams.map(team => {
              const members  = USERS_DATA.filter(u => u.team === team);
              const siteDays = [...new Set(
                members.flatMap(u => cfg.bySite[u.location] || [])
              )];
              const siteLabel = siteDays.length
                ? siteDays.map(d => `<span class="anchor-day-tag">${ANCHOR_DAY_SHORT[d]||d}</span>`).join('')
                : `<span style="font-size:12px;color:var(--text-muted)">None configured</span>`;
              return `<tr>
                <td style="font-weight:600">${escHtml(team)}</td>
                <td style="color:var(--text-secondary)">${members.length}</td>
                <td>${dayPickerHtml('team:' + team, cfg.byTeam[team])}</td>
                <td>${siteLabel}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function anchorDayToggle(scopeId, day, checked, checkboxEl) {
  const s   = loadSettings();
  const cfg = s.anchorDayConfig;

  if (scopeId.startsWith('site:')) {
    const site = scopeId.slice(5);
    const days = new Set(cfg.bySite[site] || []);
    checked ? days.add(day) : days.delete(day);
    cfg.bySite[site] = [...days];
  } else if (scopeId.startsWith('team:')) {
    const team = scopeId.slice(5);
    const days = new Set(cfg.byTeam[team] || []);
    checked ? days.add(day) : days.delete(day);
    cfg.byTeam[team] = [...days];
  }

  s.anchorDayConfig = cfg;
  saveSettings(s);

  checkboxEl?.closest('label')?.classList.toggle('active', checked);

  // Refresh the "Also from site" column live when a site row changes
  if (scopeId.startsWith('site:')) renderAnchorDays();
}

// ── Floor Plan Management ─────────────────────────────────────────────────

function renderFloorPlans() {
  const s        = loadSettings();
  const plans    = s.floorPlans;
  const buildings = s.buildings;
  const allTeams  = [...new Set(USERS_DATA.map(u => u.team))].sort();

  const formBlock = fpEditId !== null ? fpFormHtml(fpEditId, s, allTeams) : '';

  const grouped = buildings.map(b => ({
    building: b,
    plans: plans.filter(p => p.building === b),
  }));
  const unassigned = plans.filter(p => !buildings.includes(p.building));
  if (unassigned.length) grouped.push({ building: 'Other', plans: unassigned });

  document.getElementById('view-floorplans').innerHTML = `
    <div class="page-header">
      <h1>Floor Plans</h1>
      <p>Upload floor plan images for each building floor. Assign plans to teams so users see their relevant floors first.</p>
    </div>

    ${formBlock}

    ${fpEditId === null ? `
      <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-primary btn-sm" onclick="startAddFp()">+ Add Floor Plan</button>
      </div>` : ''}

    ${grouped.map(g => g.plans.length === 0 ? '' : `
      <div style="margin-bottom:28px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          <span style="font-size:14px;font-weight:700;color:var(--text)">${escHtml(g.building)}</span>
          <span style="font-size:12px;color:var(--text-muted)">${g.plans.length} floor${g.plans.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="fp-admin-grid">
          ${g.plans.map(p => fpCardHtml(p)).join('')}
        </div>
      </div>
    `).join('')}

    ${plans.length === 0 ? `
      <div style="text-align:center;padding:64px 24px;color:var(--text-muted)">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3;margin-bottom:12px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <div style="font-size:14px;margin-top:4px">No floor plans yet</div>
        <button class="btn btn-primary" onclick="startAddFp()" style="margin-top:16px">Upload your first floor plan</button>
      </div>
    ` : ''}
  `;
}

function fpCardHtml(plan) {
  const deskCount = DESKS.filter(d => d.floor === plan.floorKey).length;
  const teamChips = plan.assignedTeams.length
    ? plan.assignedTeams.map(t => `<span class="nb-team-chip">${escHtml(t)}</span>`).join('')
    : `<span style="font-size:12px;color:var(--text-muted)">All teams</span>`;

  return `
    <div class="fp-admin-card ${fpEditId === plan.id ? 'fp-admin-card-editing' : ''}">
      <div class="fp-admin-thumb">
        ${plan.imageUrl
          ? `<img src="${plan.imageUrl}" alt="${escHtml(plan.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <div class="fp-admin-thumb-placeholder" style="${plan.imageUrl ? 'display:none' : ''}">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          <span>No image</span>
        </div>
      </div>
      <div class="fp-admin-info">
        <div class="fp-admin-name">${escHtml(plan.name)}</div>
        <div class="fp-admin-meta">
          <span>${escHtml(plan.building)}</span>
          <span style="color:var(--border)">·</span>
          <span>Key: <code>${escHtml(plan.floorKey)}</code></span>
          <span style="color:var(--border)">·</span>
          <span>${deskCount} desk${deskCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="fp-admin-teams">${teamChips}</div>
        <div class="fp-admin-actions">
          <button class="btn-table" onclick="startEditFp(${JSON.stringify(plan.id)})">Edit</button>
          <button class="btn-table btn-table-danger" onclick="deleteFp(${JSON.stringify(plan.id)})">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function fpFormHtml(editId, s, allTeams) {
  const isNew = editId === 'new';
  const plan = isNew
    ? { name:'', building: s.buildings[0] || '', floorKey:'', assignedTeams:[], imageUrl:'' }
    : (s.floorPlans.find(p => p.id === editId) || { name:'', building:'', floorKey:'', assignedTeams:[], imageUrl:'' });

  return `
    <div class="nb-form-panel" style="margin-bottom:20px">
      <div class="nb-form-header">
        <span style="font-size:15px;font-weight:600">${isNew ? 'Add Floor Plan' : 'Edit — ' + escHtml(plan.name)}</span>
        <button class="agent-close-btn" onclick="cancelFpEdit()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="nb-form-body">

        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Floor Plan Name</label>
            <input type="text" class="field-input" id="fp-name" value="${escHtml(plan.name)}" placeholder="e.g. Ground Floor">
          </div>
          <div class="field-group">
            <label class="field-label">Building</label>
            <select class="field-input" id="fp-building">
              ${s.buildings.map(b => `<option value="${escHtml(b)}" ${plan.building === b ? 'selected' : ''}>${escHtml(b)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field-group">
            <label class="field-label">
              Floor Key
              <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);font-size:11px;margin-left:4px">matches desk.floor in the data (e.g. ground, first, basement)</span>
            </label>
            <input type="text" class="field-input" id="fp-floorkey" value="${escHtml(plan.floorKey)}" placeholder="e.g. ground">
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Floor Plan Image</label>
          <div class="fp-upload-area" id="fp-upload-area" onclick="document.getElementById('fp-file-input').click()">
            ${plan.imageUrl
              ? `<img id="fp-preview-img" src="${plan.imageUrl}" style="max-height:160px;max-width:100%;border-radius:6px;object-fit:contain" alt="preview">`
              : `<div id="fp-upload-placeholder" style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--text-muted)">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span style="font-size:13px">Click to upload image</span>
                  <span style="font-size:11px">PNG, JPG, SVG — stored in-browser</span>
                </div>`}
          </div>
          <input type="file" id="fp-file-input" accept="image/*" style="display:none" onchange="fpHandleImageUpload(this)">
          <input type="hidden" id="fp-image-url" value="${escHtml(plan.imageUrl)}">
          ${plan.imageUrl ? `<button type="button" style="margin-top:6px;font-size:12px;color:var(--danger);background:none;border:none;cursor:pointer;padding:0" onclick="fpClearImage()">Remove image</button>` : ''}
        </div>

        <div class="field-group">
          <label class="field-label">
            Assign Teams
            <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-muted);font-size:11px;margin-left:6px">Leave unchecked to show to all teams</span>
          </label>
          <div class="nb-checkbox-grid" id="fp-teams">
            ${allTeams.map(t => `
              <label class="nb-checkbox-item">
                <input type="checkbox" class="fp-team-cb" value="${escHtml(t)}" ${plan.assignedTeams.includes(t) ? 'checked' : ''}>
                <span>${escHtml(t)}</span>
              </label>
            `).join('')}
          </div>
        </div>

      </div>
      <div class="settings-save-bar">
        <button class="btn btn-secondary" onclick="cancelFpEdit()">Cancel</button>
        <button class="btn btn-primary" onclick="saveFp(${JSON.stringify(editId)})">${isNew ? 'Add Floor Plan' : 'Save Changes'}</button>
      </div>
    </div>
  `;
}

function startAddFp() {
  fpEditId = 'new';
  renderFloorPlans();
  setTimeout(() => document.querySelector('.nb-form-panel')?.scrollIntoView({ behavior:'smooth', block:'start' }), 50);
}

function startEditFp(id) {
  fpEditId = id;
  renderFloorPlans();
  setTimeout(() => document.querySelector('.nb-form-panel')?.scrollIntoView({ behavior:'smooth', block:'start' }), 50);
}

function cancelFpEdit() {
  fpEditId = null;
  renderFloorPlans();
}

function fpHandleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    document.getElementById('fp-image-url').value = dataUrl;
    const area = document.getElementById('fp-upload-area');
    area.innerHTML = `<img id="fp-preview-img" src="${dataUrl}" style="max-height:160px;max-width:100%;border-radius:6px;object-fit:contain" alt="preview">`;
  };
  reader.readAsDataURL(file);
}

function fpClearImage() {
  document.getElementById('fp-image-url').value = '';
  const area = document.getElementById('fp-upload-area');
  area.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;color:var(--text-muted)">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    <span style="font-size:13px">Click to upload image</span>
    <span style="font-size:11px">PNG, JPG, SVG — stored in-browser</span>
  </div>`;
}

function saveFp(editId) {
  const name     = document.getElementById('fp-name').value.trim();
  const building = document.getElementById('fp-building').value;
  const floorKey = document.getElementById('fp-floorkey').value.trim();
  const imageUrl = document.getElementById('fp-image-url').value;
  const assignedTeams = [...document.querySelectorAll('.fp-team-cb:checked')].map(cb => cb.value);

  if (!name)     { toast('Please enter a floor plan name', 'error'); return; }
  if (!floorKey) { toast('Please enter a floor key', 'error'); return; }

  const s = loadSettings();

  if (editId === 'new') {
    s.floorPlans.push({ id: 'fp-' + Date.now(), name, building, floorKey, assignedTeams, imageUrl });
    toast('Floor plan added');
  } else {
    const i = s.floorPlans.findIndex(p => p.id === editId);
    if (i !== -1) s.floorPlans[i] = { ...s.floorPlans[i], name, building, floorKey, assignedTeams, imageUrl };
    toast('Floor plan updated');
  }

  saveSettings(s);
  fpEditId = null;
  renderFloorPlans();
}

function deleteFp(id) {
  const s    = loadSettings();
  const plan = s.floorPlans.find(p => p.id === id);
  if (!plan) return;
  if (!confirm(`Delete floor plan "${plan.name}"? This does not affect existing bookings.`)) return;
  s.floorPlans = s.floorPlans.filter(p => p.id !== id);
  saveSettings(s);
  if (fpEditId === id) fpEditId = null;
  toast('Floor plan deleted');
  renderFloorPlans();
}

// ── Feedback (admin) ──────────────────────────────────────────────────────

const FEEDBACK_KEY = 'mdb_feedback';

function loadAllFeedback() {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]'); } catch { return []; }
}

function setFeedbackStatus(id, status) {
  const items = loadAllFeedback();
  const item  = items.find(f => f.id === id);
  if (item) { item.status = status; localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items)); }
  renderAdminFeedback();
  toast(`Marked as ${status}`);
}

function renderAdminFeedback() {
  const all   = loadAllFeedback().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const total = all.length;
  const newCount       = all.filter(f => f.status === 'new').length;
  const reviewedCount  = all.filter(f => f.status === 'reviewed').length;
  const actionedCount  = all.filter(f => f.status === 'actioned').length;

  const typeConfig = {
    suggestion: { label: 'Suggestion', color: '#0891b2', bg: '#E0F2FE' },
    bug:        { label: 'Bug / Issue', color: '#DC2626', bg: '#FEE2E2' },
    compliment: { label: 'Compliment', color: '#16a34a', bg: '#F0FDF4' },
    other:      { label: 'Other',      color: '#7c3aed', bg: '#F3E8FF' },
  };

  const statusBadge = s => {
    const map = { new: ['#D97706','#FEF3C7','New'], reviewed: ['#0891b2','#E0F2FE','Reviewed'], actioned: ['#16a34a','#F0FDF4','Actioned'] };
    const [c, bg, label] = map[s] || map.new;
    return `<span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:99px;background:${bg};color:${c}">${label}</span>`;
  };

  const byCat = Object.entries(typeConfig).map(([k, cfg]) => ({
    ...cfg, count: all.filter(f => f.type === k).length,
  }));

  const avgRating = (() => {
    const rated = all.filter(f => f.rating);
    if (!rated.length) return null;
    return (rated.reduce((s, f) => s + f.rating, 0) / rated.length).toFixed(1);
  })();

  document.getElementById('view-feedback').innerHTML = `
    <div class="page-header">
      <h1>User Feedback</h1>
      <p>${total} submission${total !== 1 ? 's' : ''} from users · manage and track progress</p>
    </div>

    <div class="admin-stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="admin-stat">
        <div class="admin-stat-value">${total}</div>
        <div class="admin-stat-label">Total</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value" style="color:#D97706">${newCount}</div>
        <div class="admin-stat-label">New</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${actionedCount}</div>
        <div class="admin-stat-label">Actioned</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${avgRating ? avgRating + ' ★' : '–'}</div>
        <div class="admin-stat-label">Avg Rating</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:16px;align-items:start">
      <div class="card">
        <div class="card-header"><span class="card-title">By Category</span></div>
        <div class="card-body" style="padding:8px 16px 16px">
          ${byCat.map(c => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:12.5px;font-weight:600;padding:2px 9px;border-radius:99px;background:${c.bg};color:${c.color}">${c.label}</span>
              <span style="font-size:15px;font-weight:700;color:var(--text)">${c.count}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Submissions</span>
          ${newCount > 0 ? `<span class="pill pill-amber">${newCount} unreviewed</span>` : ''}
        </div>
        <div class="card-body" style="padding:0">
          ${total === 0
            ? `<p style="padding:20px;font-size:13px;color:var(--text-muted)">No feedback submitted yet.</p>`
            : all.map(f => {
                const cfg = typeConfig[f.type] || typeConfig.other;
                const d   = new Date(f.submittedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
                const t   = new Date(f.submittedAt).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
                const stars = f.rating ? `<span style="color:#D97706;letter-spacing:1px;font-size:11px">${'★'.repeat(f.rating)}${'☆'.repeat(5-f.rating)}</span>` : '';
                return `
                  <div class="feedback-admin-row">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                      <span style="font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:99px;background:${cfg.bg};color:${cfg.color}">${cfg.label}</span>
                      ${statusBadge(f.status)}
                      ${stars}
                      <span style="font-size:11.5px;color:var(--text-muted);margin-left:auto">${d} ${t}</span>
                    </div>
                    <div style="font-size:13.5px;font-weight:600;color:var(--text);margin-bottom:3px">${escHtml(f.subject || '(no subject)')}</div>
                    <div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:6px">${escHtml(f.message)}</div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span style="font-size:11.5px;color:var(--text-muted)">From: <strong>${escHtml(f.userName)}${f.userTeam ? ' · ' + escHtml(f.userTeam) : ''}</strong></span>
                      <div style="margin-left:auto;display:flex;gap:6px">
                        ${f.status === 'new'      ? `<button class="btn btn-sm btn-secondary" onclick="setFeedbackStatus('${f.id}','reviewed')">Mark reviewed</button>` : ''}
                        ${f.status !== 'actioned' ? `<button class="btn btn-sm btn-primary"   onclick="setFeedbackStatus('${f.id}','actioned')">Mark actioned</button>` : ''}
                      </div>
                    </div>
                  </div>`;
              }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ── AI Analysis ───────────────────────────────────────────────────────────

const AI_KEY_KEY = 'mdb_ai_api_key';

function compileAnalysisData() {
  const b30      = bookingsInRange(30);
  const b7       = bookingsInRange(7);
  const wd30     = countWorkdays(30);
  const wd7      = countWorkdays(7);
  const totalDesks = DESKS.length;
  const settings = loadSettings();

  const avgOcc30   = pct(b30.length, wd30 * totalDesks);
  const avgOcc7    = pct(b7.length,  wd7  * totalDesks);
  const noShows30  = b30.filter(b => !b.checkedIn).length;
  const noShowR30  = pct(noShows30, b30.length || 1);
  const noShows7   = b7.filter(b => !b.checkedIn).length;
  const noShowR7   = pct(noShows7,  b7.length  || 1);

  const byDay = [1,2,3,4,5].map(dow => {
    const days  = countWorkdaysByDow(30, dow);
    const count = b30.filter(b => dayOfWeek(b.date) === dow).length;
    return { day: DAY_NAMES[dow], occupancyPct: pct(count, days * totalDesks) };
  });

  const byNb = Object.keys(NB_COLOURS).map(nb => {
    const nbDesks  = DESKS.filter(d => d.neighbourhood === nb);
    const count    = b30.filter(b => nbDesks.find(d => d.id === b.deskId)).length;
    const possible = countWorkdays(30) * nbDesks.length;
    const noShows  = b30.filter(b => nbDesks.find(d => d.id === b.deskId) && !b.checkedIn).length;
    return {
      neighbourhood:  nb,
      desks:          nbDesks.length,
      utilisationPct: pct(count, possible),
      noShowRatePct:  pct(noShows, count || 1),
    };
  });

  const teams = [...new Set(USERS_DATA.map(u => u.team))].sort();
  const teamStats = teams.map(team => {
    const users   = USERS_DATA.filter(u => u.team === team);
    const uids    = new Set(users.map(u => u.id));
    const tb      = b30.filter(b => uids.has(b.userId));
    const noShows = tb.filter(b => !b.checkedIn).length;
    return {
      team,
      users:         users.length,
      bookings30d:   tb.length,
      avgPerUser:    users.length ? +(tb.length / users.length).toFixed(1) : 0,
      noShowRatePct: pct(noShows, tb.length || 1),
    };
  });

  const deskStats = DESKS.map(desk => {
    const db = b30.filter(b => b.deskId === desk.id);
    return { id: desk.id, neighbourhood: desk.neighbourhood, utilisationPct: pct(db.length, wd30) };
  });
  const topDesks    = [...deskStats].sort((a,b) => b.utilisationPct - a.utilisationPct).slice(0, 3);
  const bottomDesks = [...deskStats].sort((a,b) => a.utilisationPct - b.utilisationPct).slice(0, 3);

  const anchorCompliance = (() => {
    const users = USERS_DATA.filter(u => u.anchorDays?.length > 0);
    if (!users.length) return null;
    const DAY_IDX = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    let met = 0, total = 0;
    users.forEach(u => {
      u.anchorDays.forEach(dayName => {
        const dow     = DAY_IDX.indexOf(dayName);
        const possible = countWorkdaysByDow(30, dow);
        if (!possible) return;
        const count = b30.filter(b => b.userId === u.id && dayOfWeek(b.date) === dow).length;
        total++;
        if (count >= Math.ceil(possible * 0.5)) met++;
      });
    });
    return { metPct: pct(met, total), usersWithAnchorDays: users.length };
  })();

  return {
    officeName:           settings.office.name,
    totalDesks,
    totalRegisteredUsers: USERS_DATA.length,
    analysisPeriod:       '30 days',
    occupancy: {
      last30dAvgPct: avgOcc30,
      last7dAvgPct:  avgOcc7,
      trendVs30d:    avgOcc7 - avgOcc30,
      totalBookings: b30.length,
    },
    noShows: {
      rate30dPct: noShowR30,
      rate7dPct:  noShowR7,
      count30d:   noShows30,
    },
    bookingsByDayOfWeek: byDay,
    neighbourhoodStats:  byNb,
    teamStats,
    topDesks,
    underutilisedDesks:  bottomDesks,
    anchorDayCompliance: anchorCompliance,
    bookingRules:        settings.bookingRules,
  };
}

async function runAiAnalysis() {
  const keyInput = document.getElementById('ai-api-key');
  const key = keyInput?.value.trim();
  if (!key) { toast('Please enter an Anthropic API key', 'error'); return; }
  localStorage.setItem(AI_KEY_KEY, key);

  const btn      = document.getElementById('ai-run-btn');
  const resultEl = document.getElementById('ai-result');
  if (btn) { btn.disabled = true; btn.textContent = 'Analysing…'; }
  resultEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;padding:40px 24px;color:var(--text-secondary)">
      <div class="ai-spinner"></div>
      <div>
        <div style="font-weight:500;margin-bottom:2px">Claude is analysing your data…</div>
        <div style="font-size:12px">Reviewing occupancy, no-shows, team patterns and desk utilisation</div>
      </div>
    </div>`;

  const data = compileAnalysisData();

  const prompt = `You are analysing 30-day usage data from Perch, a hot-desking booking system at ${data.officeName}.

DATA:
${JSON.stringify(data, null, 2)}

Return ONLY a valid JSON object (no markdown fences, no preamble — raw JSON only) with this exact structure:
{
  "summary": "2-3 sentence executive summary of the overall picture",
  "working_well": [
    {"title": "Short title", "detail": "Specific supporting detail citing numbers from the data"}
  ],
  "concerns": [
    {"title": "Short title", "detail": "Specific issue with data evidence and why it matters"}
  ],
  "recommendations": [
    {"title": "Action title", "detail": "Specific actionable step with expected outcome", "priority": "high"}
  ],
  "prediction": "1-2 sentence forward-looking observation based on the trends in the data"
}

Rules: working_well = 2-3 items; concerns = 2-3 items; recommendations = 3-4 items; priority must be "high", "medium" or "low". Cite actual numbers. Keep each item to 1-2 sentences.`;

  try {
    const resp = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${resp.status}`);
    }

    const json   = await resp.json();
    const raw    = (json.content[0]?.text || '').trim();
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
    renderAnalysisResult(JSON.parse(cleaned));
  } catch (e) {
    resultEl.innerHTML = `
      <div style="padding:16px 20px;background:var(--danger-light);border:1px solid var(--danger);border-radius:8px;color:var(--danger);font-size:13px">
        <strong>Analysis failed:</strong> ${escHtml(e.message)}
      </div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Generate Analysis'; }
  }
}

function renderAnalysisResult(a) {
  const priorityBadge = p => {
    const map = { high: ['#DC2626','#FEE2E2'], medium: ['#D97706','#FEF3C7'], low: ['#16a34a','#F0FDF4'] };
    const [color, bg] = map[p] || map.medium;
    return `<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:2px 8px;border-radius:99px;background:${bg};color:${color};flex-shrink:0">${p}</span>`;
  };

  document.getElementById('ai-result').innerHTML = `
    <div class="ai-summary-box">${escHtml(a.summary)}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-header">
          <span class="card-title" style="display:flex;align-items:center;gap:7px">
            <span style="color:#16a34a">✓</span> What's working well
          </span>
        </div>
        <div class="card-body" style="padding:4px 16px 12px">
          ${(a.working_well || []).map(item => `
            <div class="ai-finding-item ai-finding-good">
              <div class="ai-finding-title">${escHtml(item.title)}</div>
              <div class="ai-finding-detail">${escHtml(item.detail)}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title" style="display:flex;align-items:center;gap:7px">
            <span style="color:#D97706">⚠</span> Areas of concern
          </span>
        </div>
        <div class="card-body" style="padding:4px 16px 12px">
          ${(a.concerns || []).map(item => `
            <div class="ai-finding-item ai-finding-concern">
              <div class="ai-finding-title">${escHtml(item.title)}</div>
              <div class="ai-finding-detail">${escHtml(item.detail)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="card one-col" style="margin-bottom:16px">
      <div class="card-header">
        <span class="card-title" style="display:flex;align-items:center;gap:7px">
          <span style="color:var(--primary)">→</span> Recommendations
        </span>
      </div>
      <div class="card-body" style="padding:4px 16px 12px">
        ${(a.recommendations || []).map(item => `
          <div class="ai-finding-item ai-finding-rec">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
              <div class="ai-finding-title" style="margin:0;flex:1">${escHtml(item.title)}</div>
              ${priorityBadge(item.priority)}
            </div>
            <div class="ai-finding-detail">${escHtml(item.detail)}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header">
        <span class="card-title" style="display:flex;align-items:center;gap:7px">
          <span style="color:#7c3aed">◈</span> Outlook
        </span>
      </div>
      <div class="card-body" style="padding:14px 20px">
        <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.65;margin:0">${escHtml(a.prediction)}</p>
      </div>
    </div>
  `;
}

function renderAiAnalysis() {
  const savedKey = localStorage.getItem(AI_KEY_KEY) || '';
  document.getElementById('view-aianalysis').innerHTML = `
    <div class="page-header">
      <h1>AI Analysis</h1>
      <p>Claude reviews your usage data and identifies what's working, what isn't, and what to do about it</p>
    </div>

    <div class="card one-col" style="margin-bottom:20px">
      <div class="card-body" style="padding:20px 24px">
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <label class="field-label">Anthropic API Key</label>
            <input type="password" id="ai-api-key" class="field-input" placeholder="sk-ant-…"
              value="${escHtml(savedKey)}"
              onkeydown="if(event.key==='Enter')runAiAnalysis()">
            <div class="field-hint">Stored in your browser only — never sent anywhere except the Anthropic API</div>
          </div>
          <button id="ai-run-btn" class="btn btn-primary" onclick="runAiAnalysis()" style="padding:10px 24px;flex-shrink:0">
            Generate Analysis
          </button>
        </div>
      </div>
    </div>

    <div id="ai-result">
      <div style="padding:48px 24px;text-align:center;color:var(--text-muted);font-size:13.5px">
        Enter your API key above and click <strong>Generate Analysis</strong> to get started.
      </div>
    </div>
  `;
}

// ── Allocation Engine (standalone — does not depend on app.js) ────────────────

function _aLoadAllocations()  { try { return JSON.parse(localStorage.getItem('mdb_allocations')||'[]'); } catch { return []; } }
function _aSaveAllocations(a) { localStorage.setItem('mdb_allocations', JSON.stringify(a)); }
function _aLoadDeclarations() { try { return JSON.parse(localStorage.getItem('mdb_declarations')||'[]'); } catch { return []; } }
function _aLoadPowerBlocks()  { try { return JSON.parse(localStorage.getItem('mdb_power_blocks')||'[]'); } catch { return []; } }
function _aGetPowerBlocksForDate(date) { return _aLoadPowerBlocks().filter(pb => pb.date === date && pb.status !== 'cancelled'); }
function _aLoadNoshowRecords(){ try { return JSON.parse(localStorage.getItem('mdb_noshow_records')||'{}'); } catch { return {}; } }
function _aNoshowPriority(userId) {
  const rec = _aLoadNoshowRecords()[userId] || {};
  const month = new Date().toISOString().slice(0, 7);
  if (!rec.month || rec.month !== month) return 1.0;
  return rec.count >= 3 ? 0.7 : rec.count >= 2 ? 0.85 : 1.0;
}
function _aLoadExtPrefs(userId) { try { return JSON.parse(localStorage.getItem('mdb_user_ext_prefs_' + userId)||'null') || {}; } catch { return {}; } }
function _aLoadAllocSettings(){ try { return JSON.parse(localStorage.getItem('mdb_alloc_settings')||'null') || { walkInPoolPct: 20 }; } catch { return { walkInPoolPct: 20 }; } }
function _aLoadAllocLogs()    { try { return JSON.parse(localStorage.getItem('mdb_alloc_logs')||'[]'); } catch { return []; } }
function _aSaveAllocLogs(l)   { localStorage.setItem('mdb_alloc_logs', JSON.stringify(l)); }
function _aLoadBookings()     { try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)||'[]'); } catch { return []; } }
function _aGenId() { return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2); }
function _aDayKey(str) { return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][parseDate(str).getDay()]; }
function _aScoreDesk(desk, user) {
  let s = 0;
  if (desk.neighbourhood === user.preferredNeighbourhood) s += 3;
  for (const f of desk.features) if ((user.deskPreferences || []).includes(f)) s += 1;
  if (user.accessibilityNeeds && desk.features.includes('accessible-desk')) s += 2;
  const ep = _aLoadExtPrefs(user.id);
  if ((ep.favoriteDeskIds || []).includes(desk.id)) s += 4;
  return s;
}

function runAllocationEngine(date) {
  const bookings = _aLoadBookings();
  const existingAllocs = _aLoadAllocations().filter(a => a.date !== date);

  const decls = _aLoadDeclarations().filter(d => d.date === date && (d.status === 'yes' || d.status === 'maybe'));
  decls.sort((a, b) => a.status !== b.status ? (a.status === 'yes' ? -1 : 1) : (a.createdAt || '').localeCompare(b.createdAt || ''));

  const powerBlocks = _aGetPowerBlocksForDate(date);
  const assignedDesks = new Set();
  bookings.filter(b => b.date === date).forEach(b => assignedDesks.add(b.deskId));
  powerBlocks.forEach(pb => (pb.deskIds || []).forEach(id => assignedDesks.add(id)));

  const settings = _aLoadAllocSettings();
  let adminS = null;
  try { adminS = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || 'null'); } catch { adminS = null; }
  const disabledDesks = adminS?.disabledDesks || [];
  const enabledDesks = DESKS.filter(d => !disabledDesks.includes(d.id));
  const walkInCount = Math.max(1, Math.round(enabledDesks.length * (settings.walkInPoolPct || 20) / 100));
  const walkInPool = new Set(enabledDesks.slice(-walkInCount).map(d => d.id));

  const allocations = [];
  const runLog = { date, runAt: new Date().toISOString(), allocations: [], walkInPool: [...walkInPool] };

  for (const decl of decls) {
    const user = USERS_DATA.find(u => u.id === decl.userId);
    if (!user) continue;
    if (bookings.some(b => b.userId === user.id && b.date === date)) continue;
    if (allocations.some(a => a.userId === user.id)) continue;

    const nsp = _aNoshowPriority(user.id);
    const available = enabledDesks.filter(d =>
      !assignedDesks.has(d.id) && !walkInPool.has(d.id) && !allocations.some(a => a.deskId === d.id)
    );
    if (available.length === 0) break;

    const ep = _aLoadExtPrefs(user.id);
    const favDesks = ep.favoriteDeskIds || user.favoriteDeskIds || [];
    const teamAllocDesks = allocations.filter(a => (USERS_DATA.find(u => u.id === a.userId))?.team === user.team).map(a => a.deskId);

    const scored = available.map(d => {
      let score = _aScoreDesk(d, user) * nsp;
      const teamNbs = [...new Set(teamAllocDesks.map(id => DESKS.find(dk => dk.id === id)?.neighbourhood).filter(Boolean))];
      if (teamNbs.includes(d.neighbourhood)) score += 5;
      if (favDesks.includes(d.id)) score += 4;
      if (ep.flexMode) score -= 3;
      return { ...d, score };
    }).sort((a, b) => b.score - a.score);

    const chosen = scored[0];
    if (!chosen) continue;

    const teamNbs = [...new Set(teamAllocDesks.map(id => DESKS.find(dk => dk.id === id)?.neighbourhood).filter(Boolean))];
    const reasons = [];
    if (_aScoreDesk(chosen, user) >= 3) reasons.push('Matches desk preferences');
    if (teamNbs.includes(chosen.neighbourhood)) reasons.push('Near your team');
    if (favDesks.includes(chosen.id)) reasons.push('One of your favourites');

    allocations.push({
      id: _aGenId(), userId: user.id, deskId: chosen.id, date,
      type: decl.status === 'yes' ? 'soft' : 'soft-maybe',
      status: 'pending',
      reasonFactors: reasons.length ? reasons : ['Best available match'],
      declarationStatus: decl.status,
      allocatedAt: new Date().toISOString(),
    });
    assignedDesks.add(chosen.id);
  }

  _aSaveAllocations([...existingAllocs, ...allocations]);
  const logs = _aLoadAllocLogs();
  logs.unshift({ ...runLog, allocations: allocations.map(a => ({ userId: a.userId, deskId: a.deskId, reason: a.reasonFactors, type: a.type })) });
  _aSaveAllocLogs(logs.slice(0, 30));

  return { count: allocations.length, walkInCount, allocations };
}

// ── Allocation Engine Admin ────────────────────────────────────────────────

function renderAllocations() {
  const container = document.getElementById('view-allocations');
  if (!container) return;

  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();
  const todayStr = (() => { return new Date().toISOString().slice(0,10); })();
  const logs = (() => { try { return JSON.parse(localStorage.getItem('mdb_alloc_logs')||'[]'); } catch { return []; } })();
  const allocs = (() => { try { return JSON.parse(localStorage.getItem('mdb_allocations')||'[]'); } catch { return []; } })();
  const allocSettings = (() => { try { return JSON.parse(localStorage.getItem('mdb_alloc_settings')||'null') || {walkInPoolPct:20}; } catch { return {walkInPoolPct:20}; } })();

  const tomorrowAllocs = allocs.filter(a => a.date === tomorrow && a.status !== 'released');
  const todayAllocs = allocs.filter(a => a.date === todayStr && a.status !== 'released');

  const walkInCount = Math.max(1, Math.round(28 * (allocSettings.walkInPoolPct||20) / 100));

  container.innerHTML = `
    <div class="page-header">
      <h1>Allocation Engine</h1>
      <p>Smart desk allocation — run nightly, visible here</p>
    </div>

    <div class="admin-stats" style="margin-bottom:24px">
      <div class="admin-stat">
        <div class="admin-stat-value">${tomorrowAllocs.length}</div>
        <div class="admin-stat-label">Tomorrow's Allocations</div>
        <div class="admin-stat-sub">${tomorrowAllocs.filter(a=>a.status==='confirmed').length} confirmed</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${walkInCount}</div>
        <div class="admin-stat-label">Walk-in Pool</div>
        <div class="admin-stat-sub">${allocSettings.walkInPoolPct||20}% of desks</div>
      </div>
      <div class="admin-stat">
        <div class="admin-stat-value">${logs.length}</div>
        <div class="admin-stat-label">Engine Runs</div>
        <div class="admin-stat-sub">${logs[0] ? 'Last: ' + parseDate(logs[0].date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'Never run'}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div class="card">
        <div class="card-header"><span class="card-title">Run Allocation Engine</span><span class="pill pill-amber">Demo</span></div>
        <div class="card-body" style="padding:16px 18px">
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">
            Allocates desks for tomorrow based on attendance declarations. In production, this runs automatically at 6pm each day.
          </p>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Walk-in pool %:</label>
              <input type="number" id="walkin-pct" value="${allocSettings.walkInPoolPct||20}" min="5" max="50" style="width:70px;padding:6px;border:1px solid var(--border);border-radius:6px;font-size:13px">
              <button class="btn btn-sm btn-secondary" onclick="adminSaveAllocSettings()">Save</button>
            </div>
            <button class="btn btn-primary btn-full" onclick="adminRunAllocation('${tomorrow}')">
              &#9654; Run Tonight's Allocation (for ${parseDate(tomorrow).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})})
            </button>
            <button class="btn btn-secondary btn-full" onclick="adminRunAllocation('${tomorrow}',true)">
              &#x1F504; Re-run (overwrite existing)
            </button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Engine Log</span></div>
        <div class="card-body" style="padding:8px 16px;max-height:220px;overflow-y:auto">
          ${logs.length === 0 ? '<p style="font-size:13px;color:var(--text-muted);padding:8px 0">No runs yet.</p>' :
            logs.map(log => `
              <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:600">${parseDate(log.date).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</div>
                  <div style="font-size:11.5px;color:var(--text-muted)">${log.allocations?.length || 0} allocations &middot; Walk-in: ${log.walkInPool?.length || 0} desks &middot; Run at ${new Date(log.runAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">Tomorrow's Allocations (${parseDate(tomorrow).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})})</span>
        <span class="pill pill-blue">${tomorrowAllocs.length} allocated</span>
      </div>
      <div class="card-body" style="padding:0">
        ${tomorrowAllocs.length === 0 ? '<p style="font-size:13px;color:var(--text-muted);padding:16px 20px">No allocations yet — run the engine above.</p>' :
          `<table class="admin-table">
            <thead><tr><th>User</th><th>Desk</th><th>Type</th><th>Status</th><th>Reason</th></tr></thead>
            <tbody>
              ${tomorrowAllocs.map(a => {
                const user = userInfo(a.userId);
                return `<tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="user-avatar" style="background:${avatarColor(user?.fullName||'?')};width:24px;height:24px;font-size:10px;flex-shrink:0">${initials(user?.fullName||'?')}</div>
                      ${escHtml(user?.fullName || a.userId)}
                    </div>
                  </td>
                  <td><strong>${escHtml(a.deskId)}</strong></td>
                  <td><span class="pill ${a.type==='power-block'?'pill-blue':a.type==='walk-in'?'pill-green':'pill-amber'}" style="font-size:11px">${escHtml(a.type||'soft')}</span></td>
                  <td><span class="pill ${a.status==='confirmed'?'pill-blue':'pill-grey'}" style="font-size:11px">${escHtml(a.status)}</span></td>
                  <td style="font-size:12px;color:var(--text-muted)">${escHtml((a.reasonFactors||[]).join(', '))}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`}
      </div>
    </div>
  `;
}

function adminRunAllocation(date, overwrite) {
  if (overwrite) {
    _aSaveAllocations(_aLoadAllocations().filter(a => a.date !== date));
  }
  const result = runAllocationEngine(date);
  toast('Allocation complete — ' + result.count + ' desks allocated, ' + result.walkInCount + ' held for walk-ins', 'success');
  renderAllocations();
}

function adminSaveAllocSettings() {
  const pct = parseInt(document.getElementById('walkin-pct')?.value) || 20;
  localStorage.setItem('mdb_alloc_settings', JSON.stringify({ walkInPoolPct: Math.max(5, Math.min(50, pct)) }));
  toast('Walk-in pool setting saved', 'success');
  renderAllocations();
}

// ── Seating Rules ──────────────────────────────────────────────────────────

const SEPARATION_RULES_KEY = 'mdb_separation_rules';

function loadSeparationRules() {
  try { return JSON.parse(localStorage.getItem(SEPARATION_RULES_KEY) || '[]'); } catch { return []; }
}
function saveSeparationRules(rules) {
  localStorage.setItem(SEPARATION_RULES_KEY, JSON.stringify(rules));
}

function renderSeatingRules() {
  const rules = loadSeparationRules();
  const users = [...USERS_DATA].sort((a, b) => a.fullName.localeCompare(b.fullName));

  const userOptions = users.map(u =>
    `<option value="${escHtml(u.id)}">${escHtml(u.fullName)} — ${escHtml(u.team)}</option>`
  ).join('');

  const ruleRows = rules.length ? rules.map(r => {
    const uA = users.find(u => u.id === r.userAId);
    const uB = users.find(u => u.id === r.userBId);
    if (!uA || !uB) return '';
    return `
      <div class="sep-rule-row" id="sep-${escHtml(r.id)}">
        <div class="sep-rule-pair">
          <div class="sep-person">
            <div class="user-avatar" style="width:32px;height:32px;font-size:12px;background:${avatarColor(uA.fullName)}">${initials(uA.fullName)}</div>
            <div>
              <div style="font-weight:600;font-size:13px">${escHtml(uA.fullName)}</div>
              <div style="font-size:11px;color:var(--text-muted)">${escHtml(uA.team)}</div>
            </div>
          </div>
          <div class="sep-rule-divider">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="12 19 5 12 12 5"/><line x1="19" y1="12" x2="5" y2="12"/></svg>
          </div>
          <div class="sep-person">
            <div class="user-avatar" style="width:32px;height:32px;font-size:12px;background:${avatarColor(uB.fullName)}">${initials(uB.fullName)}</div>
            <div>
              <div style="font-weight:600;font-size:13px">${escHtml(uB.fullName)}</div>
              <div style="font-size:11px;color:var(--text-muted)">${escHtml(uB.team)}</div>
            </div>
          </div>
        </div>
        ${r.reason ? `<div class="sep-rule-reason">${escHtml(r.reason)}</div>` : ''}
        <button class="btn btn-sm btn-secondary" style="color:var(--danger);border-color:var(--danger);flex-shrink:0"
                onclick="deleteSeparationRule('${escHtml(r.id)}')">Remove</button>
      </div>`;
  }).join('') : `<p style="color:var(--text-muted);font-size:13px;padding:16px 0">No seating rules configured yet.</p>`;

  document.getElementById('view-seatingrules').innerHTML = `
    <div class="page-header">
      <h1>Seating Rules</h1>
      <p>Prevent specified colleagues from being allocated desks in the same neighbourhood</p>
    </div>

    <div class="card one-col" style="margin-bottom:20px">
      <div class="card-header">
        <span class="card-title">Add New Rule</span>
      </div>
      <div class="card-body" style="padding:20px">
        <div class="field-row" style="margin-bottom:14px">
          <div class="field-group" style="margin-bottom:0">
            <label class="field-label">Person A</label>
            <select id="sep-userA" class="field-input">
              <option value="">— Select person —</option>
              ${userOptions}
            </select>
          </div>
          <div class="field-group" style="margin-bottom:0">
            <label class="field-label">Person B</label>
            <select id="sep-userB" class="field-input">
              <option value="">— Select person —</option>
              ${userOptions}
            </select>
          </div>
        </div>
        <div class="field-group" style="margin-bottom:16px">
          <label class="field-label">Reason <span style="font-weight:400;color:var(--text-muted)">(optional — visible to admins only)</span></label>
          <select id="sep-reason-select" class="field-input" onchange="toggleSepReasonOther(this.value)">
            <option value="">— Select reason —</option>
            <option>Team & Collaboration</option>
            <option>Personality & Interpersonal Conflicts</option>
            <option>Disability & Physical Accessibility</option>
            <option>Mental Health & Sensory Needs</option>
            <option>Health & Medical Conditions</option>
            <option>Productivity & Work Style</option>
            <option>Personal Comfort & Convenience</option>
            <option>Life Circumstances</option>
            <option>Practical & Logistical</option>
            <option value="other">Other</option>
          </select>
          <input type="text" id="sep-reason-other" class="field-input" placeholder="Enter custom reason" maxlength="200" style="display:none;margin-top:10px">
        </div>
        <button class="btn btn-primary" onclick="addSeparationRule()">Add Rule</button>
      </div>
    </div>

    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">Current Rules</span>
        <span style="font-size:12px;color:var(--text-muted)">${rules.length} rule${rules.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="card-body" style="padding:${rules.length ? '0' : '20px'}">
        <div id="sep-rules-list" style="${rules.length ? 'padding:0 20px' : ''}">
          ${ruleRows}
        </div>
      </div>
    </div>
  `;
}

function addSeparationRule() {
  const userAId = document.getElementById('sep-userA').value;
  const userBId = document.getElementById('sep-userB').value;
  const selectedReason = document.getElementById('sep-reason-select').value;
  const otherReason = document.getElementById('sep-reason-other').value.trim();
  const reason = selectedReason === 'other' ? otherReason : selectedReason;

  if (!userAId || !userBId) { toast('Please select both people', 'error'); return; }
  if (userAId === userBId)  { toast('Cannot add a rule between the same person', 'error'); return; }
  if (selectedReason === 'other' && !otherReason) { toast('Please enter a custom reason for Other', 'error'); return; }

  const existing = loadSeparationRules();
  const dupe = existing.some(r =>
    (r.userAId === userAId && r.userBId === userBId) ||
    (r.userAId === userBId && r.userBId === userAId)
  );
  if (dupe) { toast('A rule for this pair already exists', 'error'); return; }

  const uA = USERS_DATA.find(u => u.id === userAId);
  const uB = USERS_DATA.find(u => u.id === userBId);
  existing.push({
    id: 'sr-' + Date.now(),
    userAId, userBId, reason,
    createdAt: new Date().toISOString(),
  });
  saveSeparationRules(existing);
  toast(`Rule added: ${uA?.fullName} ↔ ${uB?.fullName}`);
  renderSeatingRules();
}

function deleteSeparationRule(id) {
  const rules = loadSeparationRules().filter(r => r.id !== id);
  saveSeparationRules(rules);
  toast('Rule removed', 'success');
  renderSeatingRules();
}

function toggleSepReasonOther(value) {
  const otherInput = document.getElementById('sep-reason-other');
  if (!otherInput) return;
  otherInput.style.display = value === 'other' ? 'block' : 'none';
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pin-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doAdminLogin();
  });

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.view);
    });
  });

  // diagnostic listener removed
});

// Global error handlers to surface runtime errors in the admin UI for debugging
window.addEventListener('error', event => {
  console.error('Global error caught', event.error || event.message, event);
  const target = document.getElementById('admin-app') || document.body;
  const msg = (event.error && event.error.stack) ? event.error.stack : (event.message || 'Unknown error');
  const el = document.createElement('div');
  el.style.cssText = 'padding:20px;background:#fff6f6;border:1px solid #ffcccc;color:#7f1d1d;font-family:monospace;white-space:pre-wrap;position:fixed;top:80px;left:20px;right:20px;z-index:100000;border-radius:6px';
  el.textContent = 'Runtime error: ' + msg;
  document.body.appendChild(el);
});

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled rejection', event.reason);
  const el = document.createElement('div');
  el.style.cssText = 'padding:20px;background:#fff6f6;border:1px solid #ffcccc;color:#7f1d1d;font-family:monospace;white-space:pre-wrap;position:fixed;top:80px;left:20px;right:20px;z-index:100000;border-radius:6px';
  el.textContent = 'Unhandled promise rejection: ' + (event.reason && event.reason.stack ? event.reason.stack : String(event.reason));
  document.body.appendChild(el);
});
