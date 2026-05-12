// ── Constants ──────────────────────────────────────────────────────────────

const ADMIN_PIN = '1234';
const BOOKINGS_KEY = 'findMyDesk_bookings';
const ADMIN_SETTINGS_KEY = 'mdb_admin_settings';

let overviewTeam  = '';
let occupancyTeam = '';
let noShowsTeam   = '';
let nbEditId      = null;

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
    disabledDesks: [],
    buildings: ['London HQ'],
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
      disabledDesks:  s.disabledDesks  || [],
      buildings:      s.buildings      || d.buildings,
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

function doAdminLogin() {
  const pin = document.getElementById('pin-input').value.trim();
  if (pin === ADMIN_PIN) {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    navigate('overview');
  } else {
    document.getElementById('pin-error').style.display = 'block';
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-input').focus();
  }
}

function adminLogout() {
  document.getElementById('admin-app').classList.add('hidden');
  document.getElementById('admin-login').classList.remove('hidden');
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-error').style.display = 'none';
}

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
    aianalysis:     renderAiAnalysis,
    rules:          renderRules,
    deskconfig:     renderDeskConfig,
    officesettings: renderOfficeSettings,
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
  const s = loadSettings();
  s.bookingRules = {
    maxDaysInAdvance:        parseInt(document.getElementById('s-maxDaysInAdvance').value) || 14,
    maxBookingsPerWeek:      parseInt(document.getElementById('s-maxBookingsPerWeek').value) || 5,
    cancellationCutoffHours: parseInt(document.getElementById('s-cancellationCutoffHours').value) || 0,
    autoReleaseMinutes:      parseInt(document.getElementById('s-autoReleaseMinutes').value) || 30,
    allowHalfDays:           document.getElementById('s-allowHalfDays').checked,
    requireCheckIn:          document.getElementById('s-requireCheckIn').checked,
  };
  saveSettings(s);
  toast('Booking rules saved');
}

// ── Settings: Desk Config ──────────────────────────────────────────────────

function renderDeskConfig() {
  const settings = loadSettings();

  document.getElementById('view-deskconfig').innerHTML = `
    <div class="page-header">
      <h1>Desk Configuration</h1>
      <p>Enable, disable, or inspect individual desks</p>
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
                  <span class="nb-dot ${NB_COLOURS[desk.neighbourhood]?.dot || ''}"></span>
                  ${desk.neighbourhood}
                </td>
                <td>
                  <div style="display:flex;gap:3px;flex-wrap:wrap">
                    ${desk.features.map(f => `<span style="font-size:10px;padding:2px 5px;background:var(--bg);border:1px solid var(--border);border-radius:3px">${featureLabel(f)}</span>`).join('')}
                    ${desk.features.length === 0 ? '<span style="font-size:11px;color:var(--text-muted)">Standard</span>' : ''}
                  </div>
                </td>
                <td><span class="desk-status-badge ${disabled ? 'desk-status-disabled' : 'desk-status-active'}">${disabled ? 'Disabled' : 'Active'}</span></td>
                <td>
                  ${disabled
                    ? `<button class="btn-table btn-table-success" onclick="toggleDesk('${desk.id}', false)">Enable</button>`
                    : `<button class="btn-table btn-table-danger" onclick="toggleDesk('${desk.id}', true)">Disable</button>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

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
});
