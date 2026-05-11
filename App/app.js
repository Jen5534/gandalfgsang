// ── State ──────────────────────────────────────────────────────────────────
let currentUser = null;
let allUsers = [];
let bookWeekStart = null;
let selectedBookDate = null;
let selectedBookFloor = 'ground';
let selectedNeighbourhood = '';
let whosInDate = null;

// ── Office location — update lat/lng to your actual office coordinates ──────
const OFFICE_LAT = 51.5074;
const OFFICE_LNG = -0.1278;
const OFFICE_RADIUS_M = 300;

// ── Desk data ──────────────────────────────────────────────────────────────

const DESKS = [
  { id: 'G-W1', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'dual-monitor'],          env: ['bright', 'cool', 'fresh-air'] },
  { id: 'G-W2', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'standing-desk'],         env: ['bright', 'cool', 'fresh-air'] },
  { id: 'G-W3', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat'],                          env: ['bright', 'cool'] },
  { id: 'G-W4', floor: 'ground', neighbourhood: 'Window Bank',       features: ['window-seat', 'quiet-area'],            env: ['bright', 'cool', 'quiet'] },
  { id: 'G-Q1', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'dual-monitor'],           env: ['quiet', 'dim'] },
  { id: 'G-Q2', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area'],                           env: ['quiet', 'dim'] },
  { id: 'G-Q3', floor: 'ground', neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'standing-desk'],          env: ['quiet', 'dim', 'cool'] },
  { id: 'G-C1', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['dual-monitor'],                         env: ['warm'] },
  { id: 'G-C2', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['dual-monitor', 'standing-desk'],        env: ['warm'] },
  { id: 'G-C3', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['accessible-desk', 'dual-monitor'],      env: [] },
  { id: 'G-C4', floor: 'ground', neighbourhood: 'Core Desk Area',    features: [],                                       env: ['warm', 'aircon-vent'] },
  { id: 'G-C5', floor: 'ground', neighbourhood: 'Core Desk Area',    features: ['standing-desk'],                        env: ['cool', 'aircon-vent'] },
  { id: 'G-L1', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team', 'dual-monitor'],            env: ['lively', 'warm'] },
  { id: 'G-L2', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team'],                            env: ['lively', 'warm'] },
  { id: 'G-L3', floor: 'ground', neighbourhood: 'Collaboration Zone',features: ['near-team', 'standing-desk'],           env: ['lively'] },
  { id: 'F-W1', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat', 'dual-monitor'],          env: ['bright', 'cool', 'fresh-air'] },
  { id: 'F-W2', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat'],                          env: ['bright', 'cool'] },
  { id: 'F-W3', floor: 'first',  neighbourhood: 'Window Bank',       features: ['window-seat', 'standing-desk'],         env: ['bright', 'cool', 'fresh-air'] },
  { id: 'F-Q1', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'dual-monitor'],           env: ['quiet', 'dim'] },
  { id: 'F-Q2', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area', 'standing-desk'],          env: ['quiet', 'dim', 'cool'] },
  { id: 'F-Q3', floor: 'first',  neighbourhood: 'Quiet Zone',        features: ['quiet-area'],                           env: ['quiet', 'dim'] },
  { id: 'F-C1', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['dual-monitor'],                         env: ['warm'] },
  { id: 'F-C2', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['accessible-desk'],                      env: [] },
  { id: 'F-C3', floor: 'first',  neighbourhood: 'Core Desk Area',    features: ['standing-desk', 'dual-monitor'],        env: ['cool', 'aircon-vent'] },
  { id: 'F-C4', floor: 'first',  neighbourhood: 'Core Desk Area',    features: [],                                       env: ['warm'] },
  { id: 'F-L1', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team'],                            env: ['lively', 'bright'] },
  { id: 'F-L2', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team', 'dual-monitor'],            env: ['lively', 'warm'] },
  { id: 'F-L3', floor: 'first',  neighbourhood: 'Collaboration Zone',features: ['near-team', 'standing-desk'],           env: ['lively'] },
];

// ── Local bookings store (localStorage) ───────────────────────────────────

const BOOKINGS_KEY = 'findMyDesk_bookings';

function loadBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]'); } catch { return []; }
}

function saveBookings(bookings) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

function generateId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function enrichBooking(b) {
  const user = allUsers.find(u => u.id === b.userId) || null;
  const desk = DESKS.find(d => d.id === b.deskId) || null;
  return { ...b, user, desk };
}

// ── Data access ────────────────────────────────────────────────────────────

async function fetchUsers() {
  return USERS_DATA;
}

function getBookings({ userId, date, upcoming } = {}) {
  let list = loadBookings();
  if (userId) list = list.filter(b => b.userId === userId);
  if (date)   list = list.filter(b => b.date === date);
  if (upcoming) list = list.filter(b => b.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  return list.map(enrichBooking);
}

function createBooking({ userId, deskId, date, slot }) {
  const bookings = loadBookings();
  const conflicts = bookings.filter(b => b.deskId === deskId && b.date === date);
  for (const c of conflicts) {
    if (slotsConflict(c.slot || 'full', slot)) throw new Error('That desk slot is already booked');
  }
  const booking = { id: generateId(), userId, deskId, date, slot, checkedIn: false, checkedInAt: null };
  bookings.push(booking);
  saveBookings(bookings);
  return enrichBooking(booking);
}

function deleteBooking(id) {
  saveBookings(loadBookings().filter(b => b.id !== id));
  return { success: true };
}

function checkInBookingLocal(id) {
  const bookings = loadBookings();
  const b = bookings.find(b => b.id === id);
  if (!b) throw new Error('Booking not found');
  b.checkedIn = true;
  b.checkedInAt = new Date().toISOString();
  saveBookings(bookings);
  return enrichBooking(b);
}

function getDesks({ floor, date } = {}) {
  const dayBookings = date ? loadBookings().filter(b => b.date === date) : [];
  return DESKS
    .filter(d => !floor || d.floor === floor)
    .map(d => {
      const db = dayBookings.filter(b => b.deskId === d.id);
      const amBooked = db.some(b => slotsConflict(b.slot || 'full', 'am'));
      const pmBooked = db.some(b => slotsConflict(b.slot || 'full', 'pm'));
      return { ...d, amAvailable: !amBooked, pmAvailable: !pmBooked, available: !amBooked || !pmBooked };
    });
}

// ── Utilities ──────────────────────────────────────────────────────────────

function toDateStr(d) { return d.toISOString().slice(0, 10); }
function today() { return toDateStr(new Date()); }

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function displayDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function displayShortDate(dateStr) {
  return parseDate(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function weekMonday(dateStr) {
  const d = parseDate(dateStr);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  return toDateStr(m);
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function getWeekDates(mondayStr) {
  return Array.from({ length: 5 }, (_, i) => addDays(mondayStr, i));
}

function dayKey(dateStr) {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][parseDate(dateStr).getDay()];
}

function getWorkingStatus(user, dateStr) {
  return user.defaultWorkingPattern?.[dayKey(dateStr)] || 'remote';
}

function isAnchorDay(user, dateStr) {
  const name = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parseDate(dateStr).getDay()];
  return (user.anchorDays || []).includes(name);
}

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function strHash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return Math.abs(h);
}

function avatarColor(name) {
  const cols = ['#1d4ed8','#0891b2','#7c3aed','#be185d','#b45309','#16a34a','#dc2626','#0369a1'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return cols[Math.abs(h) % cols.length];
}

function scoreDesk(desk, user) {
  let s = 0;
  if (desk.neighbourhood === user.preferredNeighbourhood) s += 3;
  for (const f of desk.features) if ((user.deskPreferences || []).includes(f)) s += 1;
  if (user.accessibilityNeeds && desk.features.includes('accessible-desk')) s += 2;
  const ep = loadEnvPrefs();
  if (ep.temp  && (desk.env || []).includes(ep.temp))  s += 1;
  if (ep.light && (desk.env || []).includes(ep.light)) s += 1;
  if (ep.noise && (desk.env || []).includes(ep.noise)) s += 1;
  return s;
}

function nbClass(nb) { return 'nb-' + nb.replace(/\s+/g, ''); }

function featureLabel(f) {
  return { 'window-seat':'Window Seat','quiet-area':'Quiet Area','standing-desk':'Standing',
           'dual-monitor':'Dual Monitor','near-team':'Near Team','accessible-desk':'Accessible' }[f] || f;
}

function slotLabel(slot) {
  return slot === 'am' ? 'AM (until 1pm)' : slot === 'pm' ? 'PM (from 1pm)' : 'Full Day';
}

function slotShort(slot) {
  return slot === 'am' ? 'AM' : slot === 'pm' ? 'PM' : 'Full Day';
}

function slotsConflict(a, b) {
  if (a === 'full' || b === 'full') return true;
  return a === b;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Toast ──────────────────────────────────────────────────────────────────

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal ──────────────────────────────────────────────────────────────────

function showModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function hideModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Navigation ─────────────────────────────────────────────────────────────

function navigate(view) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  if (view === 'dashboard') renderDashboard();
  else if (view === 'book') initBookView();
  else if (view === 'my-bookings') renderMyBookings();
  else if (view === 'whos-in') renderWhosIn();
  else if (view === 'floorplan') renderFloorPlan();
  else if (view === 'team-bookings') renderTeamBookings();
}

// ── Login ──────────────────────────────────────────────────────────────────

async function initLogin() {
  allUsers = await fetchUsers();
  allUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function loginAs(user) {
  currentUser = user;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  const av = document.getElementById('sidebar-avatar');
  av.textContent = initials(user.fullName);
  av.style.background = avatarColor(user.fullName);
  document.getElementById('sidebar-name').textContent = user.fullName;
  document.getElementById('sidebar-role').textContent = `${user.role} · ${user.team}`;

  // Show Team Bookings nav only for line managers
  document.querySelectorAll('.nav-item-manager').forEach(el => {
    el.style.display = user.isLineManager ? '' : 'none';
  });

  navigate('dashboard');
}

async function ssoLogin() {
  const msg = document.getElementById('sso-message');
  const spinner = document.getElementById('sso-spinner');
  const signinBtn = document.getElementById('sso-signin-btn');
  spinner.style.display = 'block';
  signinBtn.style.display = 'none';
  msg.textContent = 'Authenticating with SSO…';
  try {
    if (allUsers.length === 0) await initLogin();
    msg.textContent = 'Signing you in…';
    await new Promise(r => setTimeout(r, 600));
    loginAs(allUsers[0]);
  } catch (e) {
    spinner.style.display = 'none';
    msg.textContent = 'Authentication failed. Please try again.';
    signinBtn.style.display = 'block';
  }
}

function logout() {
  currentUser = null;
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  const msg = document.getElementById('sso-message');
  const spinner = document.getElementById('sso-spinner');
  const signinBtn = document.getElementById('sso-signin-btn');
  spinner.style.display = 'none';
  msg.textContent = 'You have been signed out.';
  signinBtn.style.display = 'block';
}

function switchAccount() {
  showModal(`
    <div class="modal-title">Switch Account</div>
    <div class="modal-desc">Select an account to sign in as:</div>
    <div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
      ${allUsers.map(u => `
        <button class="switch-user-btn" onclick="switchUser('${u.id}')">
          <div class="user-avatar" style="background:${avatarColor(u.fullName)};width:30px;height:30px;font-size:12px;flex-shrink:0">${initials(u.fullName)}</div>
          <div style="text-align:left">
            <div style="font-weight:600;font-size:13px">${u.fullName}</div>
            <div style="font-size:12px;color:var(--text-secondary)">${u.role} &middot; ${u.team}</div>
          </div>
        </button>`).join('')}
    </div>
    <button class="btn btn-secondary" style="width:100%;margin-top:12px" onclick="hideModal()">Cancel</button>
  `);
}

function switchUser(userId) {
  hideModal();
  const user = allUsers.find(u => u.id === userId);
  if (user) loginAs(user);
}

// ── Geolocation auto check-in ──────────────────────────────────────────────

async function tryAutoCheckIn() {
  if (!navigator.geolocation) return;

  const bookings = getBookings({ userId: currentUser.id, date: today() });
  const unchecked = bookings.filter(b => !b.checkedIn);
  if (unchecked.length === 0) return;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
      if (dist <= OFFICE_RADIUS_M) {
        for (const b of unchecked) {
          checkInBookingLocal(b.id);
        }
        toast('Location verified — checked in automatically', 'success');
        renderDashboard();
      }
    },
    () => {}
  );
}

async function checkInBooking(bookingId) {
  try {
    checkInBookingLocal(bookingId);
    toast('Checked in successfully', 'success');
    renderDashboard();
    const mbView = document.getElementById('view-my-bookings');
    if (!mbView.classList.contains('hidden')) renderMyBookings();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Arrival Confidence ────────────────────────────────────────────────────

const DAY_OCCUPANCY = { monday:0.78, tuesday:0.48, wednesday:0.72, thursday:0.52, friday:0.38 };
const NB_PRESSURE   = { 'Window Bank':0.06, 'Quiet Zone':0.04, 'Core Desk Area':0, 'Collaboration Zone':-0.04 };
// Fraction of daily occupancy physically present at each arrival window
const ARRIVAL_FACTOR = { '7am': 0.05, '8am': 0.10, '9am': 0.50, '10am': 1.0 };

function calculateConfidence(dateStr) {
  const day          = dayKey(dateStr);
  const baseOcc      = DAY_OCCUPANCY[day] ?? 0.55;
  const anchorBump   = isAnchorDay(currentUser, dateStr) ? 0.12 : 0;
  const bookings     = getBookings({ date: dateStr });

  // Arrival time scales the simulated occupancy — earlier = fewer people present yet
  const ep           = loadEnvPrefs();
  const arrivalKey   = ep.arrival || null;
  const arrivalFactor = arrivalKey ? (ARRIVAL_FACTOR[arrivalKey] ?? 1.0) : 1.0;
  const simBase      = (baseOcc + anchorBump) * arrivalFactor;

  // Per-neighbourhood scores
  const neighbourhoodScores = {};
  const nbs = ['Window Bank','Quiet Zone','Core Desk Area','Collaboration Zone'];
  for (const nb of nbs) {
    const nbDesks  = DESKS.filter(d => d.neighbourhood === nb);
    const nbBooked = bookings.filter(b => nbDesks.find(d => d.id === b.deskId)).length;
    const actual   = nbBooked / Math.max(nbDesks.length, 1);
    const sim      = simBase + (NB_PRESSURE[nb] ?? 0);
    const occ      = Math.min(0.97, Math.max(actual, sim));
    neighbourhoodScores[nb] = Math.round((1 - occ) * 100);
  }

  const prefNb    = currentUser.preferredNeighbourhood;
  const nbScore   = neighbourhoodScores[prefNb] ?? 50;
  const globalOcc = Math.min(0.97, Math.max(simBase, bookings.length / Math.max(DESKS.length, 1)));
  const score     = Math.round(nbScore * 0.65 + (1 - globalOcc) * 100 * 0.35);
  const clamped   = Math.max(4, Math.min(96, score));

  let level, label, colour;
  if (clamped >= 85) { level='very-high'; label='Very High'; colour='#006A4D'; }
  else if (clamped >= 70) { level='high';     label='High';      colour='#16a34a'; }
  else if (clamped >= 50) { level='medium';   label='Medium';    colour='#D97706'; }
  else if (clamped >= 30) { level='low';      label='Low';       colour='#EA580C'; }
  else                    { level='very-low'; label='Very Low';  colour='#DC2626'; }

  const dayName = day.charAt(0).toUpperCase() + day.slice(1);
  const reasons = [];

  // Arrival time reason — shown first as it's a direct user input
  if (arrivalKey === '7am')  reasons.push('Arriving before 7am — you\'ll have the office almost to yourself');
  else if (arrivalKey === '8am')  reasons.push('Arriving by 8am — well ahead of the peak rush');
  else if (arrivalKey === '9am')  reasons.push('Arriving by 9am — busy period, more competition for desks');
  else if (arrivalKey === '10am') reasons.push('Arriving after 10am — most colleagues settled in by then');

  if (isAnchorDay(currentUser, dateStr)) reasons.push(`${dayName} is your anchor day — higher turnout expected`);
  if (baseOcc >= 0.70) reasons.push(`${dayName}s are typically a busy office day`);
  else if (baseOcc <= 0.45) reasons.push(`${dayName}s tend to be quieter`);
  if (nbScore < 50) reasons.push(`${prefNb} is likely to be in high demand`);
  else if (nbScore >= 75) reasons.push(`${prefNb} (your preferred zone) looks well available`);

  const suggestions = [];
  if (clamped < 50) {
    const best = Object.entries(neighbourhoodScores).filter(([nb]) => nb !== prefNb).sort((a,b) => b[1]-a[1])[0];
    if (best && best[1] > clamped + 10)
      suggestions.push({ icon:'📍', text:`Try <strong>${best[0]}</strong> instead — ${best[1]}% confidence there` });
    suggestions.push({ icon:'🔒', text:'<strong>Book now</strong> to guarantee your spot before you travel' });
    if (!arrivalKey || arrivalKey === '10am')
      suggestions.push({ icon:'⏰', text:'<strong>Arrive earlier</strong> — by 8am confidence rises significantly' });
  }
  if (clamped < 35) {
    const quieter = Object.entries(DAY_OCCUPANCY).filter(([d]) => d !== day && DAY_OCCUPANCY[d] < baseOcc).sort((a,b) => a[1]-b[1]);
    if (quieter.length) {
      const qd = quieter[0][0];
      suggestions.push({ icon:'📅', text:`<strong>${qd.charAt(0).toUpperCase()+qd.slice(1)}</strong> is usually quieter if you can flex your day` });
    }
  }

  return { score: clamped, level, label, colour, reasons, suggestions, neighbourhoodScores, arrivalKey };
}

function renderConfidenceWidget(dateStr) {
  const c = calculateConfidence(dateStr);
  const isToday = dateStr === today();
  const weekDates = getWeekDates(weekMonday(dateStr));

  const weekMini = weekDates.filter(d => d >= today()).map(d => {
    const wc = calculateConfidence(d);
    return `<div style="flex:1;text-align:center">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">${parseDate(d).toLocaleDateString('en-GB',{weekday:'short'})}</div>
      <div style="width:32px;height:32px;border-radius:50%;background:${wc.colour}22;border:2px solid ${wc.colour};color:${wc.colour};font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto">${wc.score}%</div>
      <div style="font-size:9px;margin-top:3px;color:${wc.colour};font-weight:600">${wc.label}</div>
    </div>`;
  }).join('');

  const suggestionsHtml = c.suggestions.length ? `
    <div class="confidence-suggestions">
      <div class="confidence-suggest-title">Suggestions</div>
      ${c.suggestions.map(s => `<div class="confidence-suggest"><span class="confidence-suggest-icon">${s.icon}</span><span>${s.text}</span></div>`).join('')}
    </div>` : '';

  return `
    <div class="card one-col confidence-card">
      <div class="card-header">
        <span class="card-title">Arrival Confidence${isToday?' — Today':' — '+displayShortDate(dateStr)}</span>
        <div style="display:flex;align-items:center;gap:8px">
          ${c.arrivalKey ? `<span style="font-size:11.5px;color:var(--text-muted)">arriving ${{  '7am':'by 7am','8am':'by 8am','9am':'by 9am','10am':'after 10am'}[c.arrivalKey]}</span>` : ''}
          <span class="confidence-pill" style="background:${c.colour}22;color:${c.colour};border:1px solid ${c.colour}44">${c.label}</span>
        </div>
      </div>
      <div class="card-body" style="padding:16px 20px">
        <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px">
          <div class="confidence-ring" style="--conf-colour:${c.colour};--conf-pct:${c.score}">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="${c.colour}22" stroke-width="8"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke="${c.colour}" stroke-width="8"
                stroke-dasharray="${2*Math.PI*32}" stroke-dashoffset="${2*Math.PI*32*(1-c.score/100)}"
                stroke-linecap="round" transform="rotate(-90 40 40)"/>
            </svg>
            <div class="confidence-ring-label" style="color:${c.colour}">${c.score}%</div>
          </div>
          <div style="flex:1">
            <div style="font-size:18px;font-weight:700;color:${c.colour};margin-bottom:4px">${c.label} confidence</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px">of finding a desk in <strong>${currentUser.preferredNeighbourhood}</strong></div>
            ${c.reasons.map(r => `<div style="font-size:12.5px;color:var(--text-secondary);margin-bottom:4px;display:flex;gap:6px"><span style="color:${c.colour}">•</span>${r}</div>`).join('')}
          </div>
        </div>

        ${suggestionsHtml}

        <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:${c.suggestions.length?'14px':'0'}">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:10px">Week outlook</div>
          <div style="display:flex;gap:6px">${weekMini}</div>
        </div>
      </div>
    </div>`;
}

// ── Routine Detection & Soft Holds ────────────────────────────────────────
// Soft holds are created in the background the night before an office day.
// They block others from booking the desk until the grace period expires
// (usual arrival time + 1 hour). When the colleague scans in, the hold
// converts to a confirmed booking automatically.

const SOFT_HOLDS_KEY = 'mdb_soft_holds';
const WORKDAYS = ['monday','tuesday','wednesday','thursday','friday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri' };

function loadSoftHolds() {
  try { return JSON.parse(localStorage.getItem(SOFT_HOLDS_KEY) || '[]'); } catch { return []; }
}
function saveSoftHolds(h) { localStorage.setItem(SOFT_HOLDS_KEY, JSON.stringify(h)); }

function getHistoricPattern(userId, day) {
  return HISTORIC_PATTERNS.find(p => p.userId === userId)?.patterns.find(p => p.day === day) || null;
}

function addGraceHour(arrivalTime) {
  const [h, m] = arrivalTime.split(':').map(Number);
  return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isHoldExpired(date, expiryTime) {
  if (date > today()) return false;
  if (date < today()) return true;
  // For today: check actual clock
  const now = new Date();
  const [h, m] = expiryTime.split(':').map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

// Background process — runs silently on login/dashboard render.
// Simulates a nightly calendar check: generates soft holds for the next
// working day only (one day in advance). Idempotent.
function generateAllSoftHolds() {
  // Find the next working day (skip weekends)
  let offset = 1;
  let nextDate, nextDay;
  do {
    nextDate = addDays(today(), offset++);
    nextDay = dayKey(nextDate);
  } while (!WORKDAYS.includes(nextDay));

  // Purge any holds beyond the next working day (stale data from old runs)
  // and any that are expired or for past dates
  let holds = loadSoftHolds().filter(h =>
    h.date <= nextDate &&
    h.date >= today()
  );

  const existingKeys = new Set(
    holds.filter(h => h.status !== 'released').map(h => `${h.userId}|${h.date}`)
  );
  const bookings = loadBookings();
  const bookedKeys = new Set(bookings.map(b => `${b.userId}|${b.date}`));

  for (const userPattern of HISTORIC_PATTERNS) {
    const pat = userPattern.patterns.find(p => p.day === nextDay);
    if (!pat) continue;
    const key = `${userPattern.userId}|${nextDate}`;
    if (existingKeys.has(key) || bookedKeys.has(key)) continue;

    const expiryTime = addGraceHour(pat.arrivalTime);
    holds.push({
      id: generateId(),
      userId: userPattern.userId,
      userName: userPattern.name,
      deskId: pat.deskId,
      date: nextDate,
      arrivalTime: pat.arrivalTime,
      expiryTime,
      consistency: pat.consistency,
      status: 'active',
      source: 'routine',
      createdAt: new Date().toISOString(),
    });
    existingKeys.add(key);
  }
  saveSoftHolds(holds); // always save to flush purged stale entries
}

// Returns the active soft hold for a desk on a date (blocks booking by others)
function getDeskSoftHold(deskId, date) {
  return loadSoftHolds().find(h =>
    h.deskId === deskId &&
    h.date === date &&
    h.status === 'active' &&
    !isHoldExpired(date, h.expiryTime)
  ) || null;
}

// Returns current user's own hold for a date (informational)
function getMyHoldForDate(date) {
  return loadSoftHolds().find(h =>
    h.userId === currentUser.id &&
    h.date === date &&
    h.status === 'active'
  ) || null;
}

// Scan-in: converts hold to a real booking
function checkInViaHold(holdId) {
  const holds = loadSoftHolds();
  const hold  = holds.find(h => h.id === holdId);
  if (!hold) return;
  try {
    createBooking({ userId: hold.userId, deskId: hold.deskId, date: hold.date, slot: 'full' });
    hold.status = 'checked-in';
    saveSoftHolds(holds);
    toast(`Checked in — ${hold.deskId} confirmed`, 'success');
    renderDashboard();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// User says they won't be in — releases the desk for others
function releaseHold(holdId) {
  const holds = loadSoftHolds();
  const hold  = holds.find(h => h.id === holdId);
  if (hold) { hold.status = 'released'; saveSoftHolds(holds); }
  toast('Hold released — desk is now free for others', 'info');
  renderMyBookings();
}

function renderRoutineCard() {
  generateAllSoftHolds(); // background only — no UI
  return '';
}

// ── Environmental Comfort ─────────────────────────────────────────────────

const ENV_PREFS_KEY   = 'mdb_env_prefs';
const ENV_RATINGS_KEY = 'mdb_env_ratings';

const ENV_TAG_META = {
  'bright':     { icon: '☀️',  label: 'Bright' },
  'dim':        { icon: '🔅',  label: 'Low light' },
  'cool':       { icon: '🌬️', label: 'Cool' },
  'warm':       { icon: '🌡️', label: 'Warm' },
  'quiet':      { icon: '🔇',  label: 'Quiet' },
  'lively':     { icon: '🗣️', label: 'Lively' },
  'fresh-air':  { icon: '💨',  label: 'Airy' },
  'aircon-vent':{ icon: '❄️',  label: 'A/C vent' },
  'stuffy':     { icon: '😮‍💨', label: 'Stuffy' },
};

function loadEnvPrefs() {
  try { return JSON.parse(localStorage.getItem(ENV_PREFS_KEY) || 'null') || {}; } catch { return {}; }
}
function saveEnvPrefs(p) { localStorage.setItem(ENV_PREFS_KEY, JSON.stringify(p)); }

function loadEnvRatings() {
  try { return JSON.parse(localStorage.getItem(ENV_RATINGS_KEY) || '{}'); } catch { return {}; }
}
function addEnvRating(deskId, tag) {
  const r = loadEnvRatings();
  if (!r[deskId]) r[deskId] = {};
  r[deskId][tag] = (r[deskId][tag] || 0) + 1;
  localStorage.setItem(ENV_RATINGS_KEY, JSON.stringify(r));
}

function toggleEnvPref(key, value) {
  const p = loadEnvPrefs();
  if (value) p[key] = value; else delete p[key];
  saveEnvPrefs(p);
  renderDashboard();
}

let _pendingEnvTags = new Set();

function toggleEnvRateTag(tag) {
  if (_pendingEnvTags.has(tag)) _pendingEnvTags.delete(tag);
  else _pendingEnvTags.add(tag);
  document.querySelectorAll('.env-rate-btn').forEach(b => {
    b.classList.toggle('active', _pendingEnvTags.has(b.dataset.tag));
  });
}

function submitEnvRating(deskId) {
  for (const tag of _pendingEnvTags) addEnvRating(deskId, tag);
  hideModal();
  if (_pendingEnvTags.size > 0) toast('Thanks — your feedback helps others choose wisely', 'success');
  _pendingEnvTags = new Set();
}

function showEnvRatingModal(deskId) {
  _pendingEnvTags = new Set();
  const ratable = ['bright','dim','cool','warm','quiet','lively','fresh-air','stuffy'];
  showModal(`
    <div class="modal-title">Rate Environment</div>
    <div class="modal-desc">Desk <strong>${deskId}</strong> — tap anything that stood out. Your signal helps colleagues find the right spot.</div>
    <div class="env-rating-grid">
      ${ratable.map(tag => {
        const m = ENV_TAG_META[tag];
        return `<button class="env-rate-btn" data-tag="${tag}" onclick="toggleEnvRateTag('${tag}')">${m.icon} ${m.label}</button>`;
      }).join('')}
    </div>
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-secondary" onclick="hideModal()">Skip</button>
      <button class="btn btn-primary" onclick="submitEnvRating('${deskId}')">Submit</button>
    </div>
  `);
}

function renderComfortProfile() {
  const p = loadEnvPrefs();
  const hasPrefs = p.temp || p.light || p.noise || p.arrival;
  const rows = [
    { key: 'arrival', label: 'Arrival',     opts: [['7am','🌅 By 7am'],['8am','🕗 By 8am'],['9am','🕘 By 9am'],['10am','🕙 10am+']], noAny: true },
    { key: 'temp',    label: 'Temperature', opts: [['cool','🌬️ Cool'],['warm','🌡️ Warm']] },
    { key: 'light',   label: 'Light',       opts: [['bright','☀️ Bright'],['dim','🔅 Low light']] },
    { key: 'noise',   label: 'Noise',       opts: [['quiet','🔇 Quiet'],['lively','🗣️ Lively']] },
  ];
  return `<div class="card one-col">
    <div class="card-header">
      <span class="card-title">Comfort Profile</span>
      <span class="pill ${hasPrefs?'pill-blue':'pill-amber'}" style="font-size:11px">${hasPrefs?'Personalised':'Not set'}</span>
    </div>
    <div class="card-body" style="padding:14px 20px">
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">Your preferences shape desk recommendations — no forms, just a tap.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${rows.map(({ key, label, opts, noAny }) => `
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="width:88px;font-size:12.5px;font-weight:600;color:var(--text-secondary);flex-shrink:0">${label}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${opts.map(([val, lbl]) => `<button class="env-pref-btn${p[key]===val?' active':''}" onclick="toggleEnvPref('${key}','${val}')">${lbl}</button>`).join('')}
              ${noAny ? '' : `<button class="env-pref-btn${!p[key]?' active':''}" onclick="toggleEnvPref('${key}','')">Any</button>`}
            </div>
          </div>`).join('')}
      </div>
      ${hasPrefs ? `<p style="font-size:12px;color:var(--text-muted);margin-top:14px">Desks matching your preferences are highlighted when booking.</p>` : ''}
    </div>
  </div>`;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

async function renderDashboard() {
  const container = document.getElementById('view-dashboard');
  container.innerHTML = '<div style="color:#94a3b8;padding:20px">Loading...</div>';

  const allUpcoming  = getBookings({ userId: currentUser.id, upcoming: true });
  const todayBookings = getBookings({ date: today() });

  const myTodayBookings = allUpcoming.filter(b => b.date === today());
  const todayStatus = getWorkingStatus(currentUser, today());
  const todayAnchor = isAnchorDay(currentUser, today());
  const teamInToday = todayBookings.filter(b => b.user?.team === currentUser.team && b.userId !== currentUser.id);

  const dayLabel = parseDate(today()).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });

  let suggestions = [];
  if (myTodayBookings.length === 0 && (todayStatus === 'office' || todayAnchor)) {
    const desks = getDesks({ date: today() });
    suggestions = desks.filter(d => d.available)
      .map(d => ({ ...d, score: scoreDesk(d, currentUser) }))
      .sort((a, b) => b.score - a.score).slice(0, 3);
  }

  const checkinBanner = (() => {
    if (myTodayBookings.length === 0) return '';
    const allCheckedIn = myTodayBookings.every(b => b.checkedIn);
    if (allCheckedIn) {
      const t = formatTime(myTodayBookings[0].checkedInAt);
      return `<div class="checkin-banner checkin-banner-done">
        <span>Checked in${t ? ' at ' + t : ''} — your desk is confirmed.</span>
      </div>`;
    }
    const ids = myTodayBookings.filter(b => !b.checkedIn).map(b => `'${b.id}'`).join(',');
    return `<div class="checkin-banner checkin-banner-pending">
      <span>You have a desk today but haven't checked in yet. Auto-detecting your location&hellip;</span>
      <button class="btn btn-sm btn-primary" onclick="manualCheckInAll([${ids}])">Check In Now</button>
    </div>`;
  })();

  container.innerHTML = `
    <div class="page-header">
      <h1>Good ${greetingTime()}, ${currentUser.fullName.split(' ')[0]}</h1>
      <p>${dayLabel} &mdash; ${currentUser.location} office</p>
    </div>

    ${checkinBanner}

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Today</div>
        <div class="stat-value">${todayStatus === 'office' ? 'Office' : 'Remote'}</div>
        <div class="stat-sub">${todayAnchor ? 'Anchor day' : 'Default pattern'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Upcoming Bookings</div>
        <div class="stat-value">${allUpcoming.length}</div>
        <div class="stat-sub">${allUpcoming.length === 0 ? 'None scheduled' : 'Next: ' + displayShortDate(allUpcoming[0].date)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Team In Today</div>
        <div class="stat-value">${teamInToday.length}</div>
        <div class="stat-sub">${currentUser.team}</div>
      </div>
    </div>

    ${renderRoutineCard()}

    ${renderConfidenceWidget(today())}

    ${renderComfortProfile()}

    ${suggestions.length > 0 ? `
    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">Smart Suggestions for Today</span>
        <span class="pill pill-amber">Office day — no desk booked yet</span>
      </div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">Based on your preferences (${currentUser.preferredNeighbourhood}).</p>
        <div class="suggestion-cards">
          ${suggestions.map(desk => `
            <div class="suggestion-card" onclick="quickBook('${desk.id}','${today()}')">
              <div class="suggestion-label">Recommended</div>
              <div class="desk-id">${desk.id}</div>
              <div class="desk-neighbourhood ${nbClass(desk.neighbourhood)}" style="margin:4px 0">${desk.neighbourhood}</div>
              <div class="slot-bar" style="margin-top:6px">
                <div class="slot-badge ${desk.amAvailable?'slot-free':'slot-taken'}">AM</div>
                <div class="slot-badge ${desk.pmAvailable?'slot-free':'slot-taken'}">PM</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    ` : myTodayBookings.length > 0 ? `
    <div class="card one-col">
      <div class="card-header"><span class="card-title">Today's Desks</span></div>
      <div class="card-body" style="padding:12px 16px">
        ${myTodayBookings.map(b => renderBookingItem(b, false)).join('')}
      </div>
    </div>
    ` : ''}

    <div class="two-col">
      <div class="card">
        <div class="card-header"><span class="card-title">Your Working Pattern</span></div>
        <div class="card-body" style="padding:12px 16px">${renderWeekPatternMini()}</div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Team In Today</span>
          <span class="pill pill-blue">${currentUser.team}</span>
        </div>
        <div class="card-body" style="padding:12px 16px">
          ${teamInToday.length === 0
            ? '<p style="color:var(--text-muted);font-size:13px">No team members with bookings today.</p>'
            : teamInToday.slice(0, 4).map(b => `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                <div class="user-avatar" style="background:${avatarColor(b.user.fullName)};width:28px;height:28px;font-size:11px;flex-shrink:0">${initials(b.user.fullName)}</div>
                <div>
                  <div style="font-size:13px;font-weight:600">${b.user.fullName}</div>
                  <div style="font-size:12px;color:var(--text-secondary)">${b.desk?.id || '–'} · <span class="slot-badge-inline">${slotShort(b.slot||'full')}</span></div>
                </div>
              </div>`).join('')}
        </div>
      </div>
    </div>

    ${allUpcoming.length > 0 ? `
    <div class="card one-col">
      <div class="card-header">
        <span class="card-title">Upcoming Bookings</span>
        <a href="#" class="btn btn-sm btn-secondary" onclick="navigate('my-bookings');return false">View all</a>
      </div>
      <div class="card-body" style="padding:12px 16px">
        <div class="booking-list">${allUpcoming.slice(0, 3).map(b => renderBookingItem(b, false)).join('')}</div>
      </div>
    </div>` : ''}
  `;

  tryAutoCheckIn();
}

function greetingTime() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

function renderWeekPatternMini() {
  const days = ['monday','tuesday','wednesday','thursday','friday'];
  const labels = ['Mon','Tue','Wed','Thu','Fri'];
  const pattern = currentUser.defaultWorkingPattern || {};
  const anchors = (currentUser.anchorDays || []).map(d => d.toLowerCase());
  return `<div style="display:flex;gap:6px">
    ${days.map((d, i) => {
      const s = pattern[d] || 'remote';
      const a = anchors.includes(d);
      const bg   = a ? '#FEF3C7'  : s==='office' ? '#E6F2EE' : '#F2F5F4';
      const bd   = a ? '#FDE68A'  : s==='office' ? '#A7D7C5' : '#D4E2DE';
      const col  = a ? '#92400E'  : s==='office' ? '#006A4D' : '#94A3B8';
      const label = a ? 'Anchor' : s==='office' ? 'Office' : 'Remote';
      return `<div style="flex:1;text-align:center;padding:8px 4px;border-radius:6px;background:${bg};border:1.5px solid ${bd}">
        <div style="font-size:10px;font-weight:600;color:#4A5A7A;text-transform:uppercase;letter-spacing:0.05em">${labels[i]}</div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:0.05em;color:${col};margin-top:3px">${label}</div>
      </div>`;
    }).join('')}
  </div>`;
}

async function manualCheckInAll(ids) {
  for (const id of ids) await checkInBooking(id);
}

function quickBook(deskId, date) {
  showModal(`
    <div class="modal-title">Book ${deskId}</div>
    <div class="modal-desc">How long do you need the desk on <strong>${displayShortDate(date)}</strong>?</div>
    <div class="slot-picker">
      <button class="slot-pick-btn" onclick="doBook('${deskId}','${date}','am')">
        AM Only<br><small>Until 1:00pm</small>
      </button>
      <button class="slot-pick-btn" onclick="doBook('${deskId}','${date}','pm')">
        PM Only<br><small>From 1:00pm</small>
      </button>
      <button class="slot-pick-btn slot-pick-full" onclick="doBook('${deskId}','${date}','full')">
        Full Day<br><small>All day</small>
      </button>
    </div>
    <button class="btn btn-secondary" style="width:100%;margin-top:10px" onclick="hideModal()">Cancel</button>
  `);
}

// ── Book a Desk ────────────────────────────────────────────────────────────

function initBookView() {
  bookWeekStart = weekMonday(today());
  selectedBookDate = today();
  renderBookView();
}

async function renderBookView() {
  const container = document.getElementById('view-book');

  const weekDates = getWeekDates(bookWeekStart);
  const weekLabel = (() => {
    const s = parseDate(weekDates[0]).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
    const e = parseDate(weekDates[4]).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    return `${s} – ${e}`;
  })();

  const allUpcoming = getBookings({ userId: currentUser.id, upcoming: true });
  const desks = selectedBookDate ? getDesks({ floor: selectedBookFloor, date: selectedBookDate }) : [];

  const userBookingDates = new Set(allUpcoming.map(b => b.date));
  const myBookingsForDate = allUpcoming.filter(b => b.date === selectedBookDate);
  const mySlots = myBookingsForDate.map(b => b.slot || 'full');

  const filteredDesks = selectedNeighbourhood ? desks.filter(d => d.neighbourhood === selectedNeighbourhood) : desks;
  const grouped = {};
  for (const d of filteredDesks) {
    if (!grouped[d.neighbourhood]) grouped[d.neighbourhood] = [];
    grouped[d.neighbourhood].push(d);
  }

  const totalAvailSlots = desks.reduce((n, d) => n + (d.amAvailable?1:0) + (d.pmAvailable?1:0), 0);
  const totalSlots = desks.length * 2;

  const myDeskSummary = myBookingsForDate.map(b => `${b.desk?.id} (${slotShort(b.slot||'full')})`).join(', ');

  const nbOptions = ['Window Bank','Quiet Zone','Core Desk Area','Collaboration Zone'];

  container.innerHTML = `
    <div class="page-header">
      <h1>Book a Desk</h1>
      <p>Find and reserve your workspace</p>
    </div>

    <div class="card one-col">
      <div class="card-body">
        <div class="week-nav">
          <div class="week-nav-title">${weekLabel}</div>
          <div class="week-nav-btns">
            <button class="btn btn-sm btn-secondary btn-icon" id="prev-week-btn">&#8592;</button>
            <button class="btn btn-sm btn-secondary" id="today-btn">Today</button>
            <button class="btn btn-sm btn-secondary btn-icon" id="next-week-btn">&#8594;</button>
          </div>
        </div>
        <div class="week-strip">
          ${weekDates.filter(dateStr => dateStr >= today()).map(dateStr => {
            const dObj = parseDate(dateStr);
            const dayName = dObj.toLocaleDateString('en-GB', { weekday: 'short' });
            const dayNum = dObj.getDate();
            const status = getWorkingStatus(currentUser, dateStr);
            const anchor = isAnchorDay(currentUser, dateStr);
            const isSelected = dateStr === selectedBookDate;
            const isToday_ = dateStr === today();
            const hasBooking = userBookingDates.has(dateStr);
            const wc = calculateConfidence(dateStr);
            return `<div class="week-day${isSelected?' selected':''}${isToday_?' today':''}"
              onclick="selectBookDate('${dateStr}')">
              ${hasBooking ? '<div class="day-booking-dot"></div>' : ''}
              <div class="day-name">${dayName}</div>
              <div class="day-num">${dayNum}</div>
              <div class="day-status ${anchor?'anchor':status}">${anchor?'Anchor':status==='office'?'Office':'Remote'}</div>
              <div style="font-size:9px;font-weight:700;color:${wc.colour};margin-top:3px;letter-spacing:0.02em">${wc.score}%</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    ${selectedBookDate ? `
    <div style="margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div>
        <span style="font-size:15px;font-weight:600">${displayDate(selectedBookDate)}</span>
        ${myDeskSummary ? `<span class="pill pill-blue" style="margin-left:8px;font-size:12px">You: ${myDeskSummary}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="floor-tabs">
          <button class="floor-tab${selectedBookFloor==='ground'?' active':''}" onclick="selectFloor('ground')">Ground Floor</button>
          <button class="floor-tab${selectedBookFloor==='first'?' active':''}" onclick="selectFloor('first')">First Floor</button>
        </div>
        <select onchange="selectNeighbourhood(this.value)" style="padding:7px 28px 7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:white;appearance:none;-webkit-appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 10px center;cursor:pointer">
          <option value="">All Neighbourhoods</option>
          ${nbOptions.map(n => `<option value="${n}"${selectedNeighbourhood===n?' selected':''}>${n}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="avail-bar">
      <span class="avail-count-available">${totalAvailSlots}</span> slot${totalAvailSlots !== 1 ? 's' : ''} available
      &nbsp;·&nbsp;
      <span class="avail-count-booked">${totalSlots - totalAvailSlots}</span> booked
      &nbsp;on ${selectedBookFloor === 'ground' ? 'Ground' : 'First'} Floor
    </div>

    ${Object.entries(grouped).map(([nb, nbDesks]) => `
      <div class="section-header">${nb}</div>
      <div class="desk-grid" style="margin-bottom:8px">
        ${nbDesks.map(desk => renderDeskCard(desk, myBookingsForDate, mySlots, selectedBookDate)).join('')}
      </div>
    `).join('')}

    ${Object.keys(grouped).length === 0 ? `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
        <h3>No desks found</h3>
        <p>Try a different floor or remove the neighbourhood filter.</p>
      </div>
    ` : ''}
    ` : ''}
  `;

  document.getElementById('prev-week-btn')?.addEventListener('click', () => { bookWeekStart = addDays(bookWeekStart, -7); renderBookView(); });
  document.getElementById('next-week-btn')?.addEventListener('click', () => { bookWeekStart = addDays(bookWeekStart, 7); renderBookView(); });
  document.getElementById('today-btn')?.addEventListener('click', () => { bookWeekStart = weekMonday(today()); selectedBookDate = today(); renderBookView(); });
}

function renderDeskCard(desk, myBookingsForDate, mySlots, date) {
  const myDeskBooking = myBookingsForDate.find(b => b.deskId === desk.id);
  const isMyDesk = !!myDeskBooking;

  const canBookAm = desk.amAvailable && !mySlots.some(s => slotsConflict(s, 'am'));
  const canBookPm = desk.pmAvailable && !mySlots.some(s => slotsConflict(s, 'pm'));
  const canBookFull = desk.amAvailable && desk.pmAvailable && mySlots.length === 0;
  const canBookAnything = canBookAm || canBookPm;
  const isFuture = date >= today();

  const score = scoreDesk(desk, currentUser);
  const isRecommended = score >= 3 && !isMyDesk && canBookAnything;

  // Soft holds block the desk silently — treated as booked for card display
  const activeSoftHold = isFuture ? getDeskSoftHold(desk.id, date) : null;
  const blockedBySoftHold = activeSoftHold && activeSoftHold.userId !== currentUser.id;

  let cardClass = 'desk-card';
  if (isMyDesk) cardClass += ' my-desk';
  else if (blockedBySoftHold) cardClass += ' booked';
  else if (!desk.amAvailable && !desk.pmAvailable) cardClass += ' booked';
  else cardClass += ' available';
  if (isRecommended && !blockedBySoftHold) cardClass += ' recommended';

  const ep = loadEnvPrefs();
  const allRatings = loadEnvRatings();
  const deskRatings = allRatings[desk.id] || {};
  const topPeerSignals = Object.entries(deskRatings).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const envMatchCount = (desk.env || []).filter(tag =>
    tag === ep.temp || tag === ep.light || tag === ep.noise
  ).length;
  const showEnvMatch = envMatchCount > 0 && (ep.temp || ep.light || ep.noise);

  const envTagsHtml = (desk.env || []).length ? `
    <div class="desk-env">
      ${(desk.env || []).map(tag => {
        const m = ENV_TAG_META[tag];
        const isMatch = tag === ep.temp || tag === ep.light || tag === ep.noise;
        return `<span class="env-tag${isMatch ? ' env-match' : ''}" title="${m?.label || tag}">${m?.icon || ''} ${m?.label || tag}</span>`;
      }).join('')}
    </div>` : '';

  const peerSignalsHtml = topPeerSignals.length ? `
    <div class="env-peers">
      ${topPeerSignals.map(([tag, count]) => {
        const m = ENV_TAG_META[tag];
        return `<span class="env-peer-tag">${m?.icon || ''} ${count} ${count === 1 ? 'person' : 'people'} say ${m?.label?.toLowerCase() || tag}</span>`;
      }).join('')}
    </div>` : '';

  return `
    <div class="${cardClass}">
      ${isRecommended ? '<div class="desk-recommended-badge">Recommended</div>' : ''}
      ${showEnvMatch && !blockedBySoftHold ? `<div class="env-match-badge">${envMatchCount === 3 ? 'Perfect' : 'Good'} env match</div>` : ''}
      <div class="desk-id">${desk.id}</div>
      <div class="desk-neighbourhood ${nbClass(desk.neighbourhood)}">${desk.neighbourhood}</div>
      <div class="desk-features">
        ${desk.features.map(f => `<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`).join('')}
        ${desk.features.length === 0 ? '<span style="font-size:12px;color:var(--text-muted)">Standard desk</span>' : ''}
      </div>
      ${envTagsHtml}
      ${peerSignalsHtml}
      <div class="slot-bar">
        <span class="slot-badge ${(desk.amAvailable && !blockedBySoftHold) ? 'slot-free' : 'slot-taken'}">AM</span>
        <span class="slot-badge ${(desk.pmAvailable && !blockedBySoftHold) ? 'slot-free' : 'slot-taken'}">PM</span>
        ${myDeskBooking ? `<span class="slot-badge slot-mine">${slotShort(myDeskBooking.slot||'full')} — You</span>` : ''}
      </div>
      ${isFuture ? `<div class="desk-actions">
        ${!blockedBySoftHold && canBookFull  ? `<button class="btn btn-primary btn-sm" onclick="confirmBook('${desk.id}','${date}','full')">Full Day</button>` : ''}
        ${!blockedBySoftHold && canBookAm && !canBookFull ? `<button class="btn btn-primary btn-sm" onclick="confirmBook('${desk.id}','${date}','am')">Book AM</button>` : ''}
        ${!blockedBySoftHold && canBookPm && !canBookFull ? `<button class="btn btn-secondary btn-sm" onclick="confirmBook('${desk.id}','${date}','pm')">Book PM</button>` : ''}
        ${myDeskBooking ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelBookingById('${myDeskBooking.id}')">Cancel</button>` : ''}
        ${myDeskBooking ? `<button class="btn btn-sm btn-secondary" style="font-size:11.5px" onclick="showEnvRatingModal('${desk.id}')">Rate env</button>` : ''}
      </div>` : ''}
    </div>
  `;
}

function selectBookDate(dateStr) {
  if (dateStr < today()) return;
  selectedBookDate = dateStr;
  renderBookView();
}

function selectFloor(floor) {
  selectedBookFloor = floor;
  renderBookView();
}

function selectNeighbourhood(value) {
  selectedNeighbourhood = value;
  renderBookView();
}

function confirmBook(deskId, date, slot) {
  showModal(`
    <div class="modal-title">Confirm Booking</div>
    <div class="modal-desc">
      Book desk <strong>${deskId}</strong> &mdash; <strong>${slotLabel(slot)}</strong><br>
      on <strong>${displayDate(date)}</strong>?
      ${slot !== 'full' ? `<br><span style="font-size:12px;color:var(--text-muted)">The other half of the day will stay available for others.</span>` : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doBook('${deskId}','${date}','${slot}')">Confirm</button>
    </div>
  `);
}

async function doBook(deskId, date, slot) {
  hideModal();
  try {
    createBooking({ userId: currentUser.id, deskId, date, slot });
    toast(`${deskId} booked — ${slotLabel(slot)} on ${displayShortDate(date)}`, 'success');
    renderBookView();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function cancelBookingById(bookingId) {
  try {
    deleteBooking(bookingId);
    toast('Booking cancelled', 'info');
    renderBookView();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── My Bookings ────────────────────────────────────────────────────────────

async function renderMyBookings() {
  const container = document.getElementById('view-my-bookings');
  container.innerHTML = '<div style="color:#94a3b8;padding:20px">Loading...</div>';

  generateAllSoftHolds(); // ensure holds are fresh before reading

  const bookings = getBookings({ userId: currentUser.id, upcoming: true });

  // Pull in active soft holds for this user (background holds not yet converted to bookings)
  const myHolds = loadSoftHolds().filter(h =>
    h.userId === currentUser.id &&
    h.status === 'active' &&
    h.date >= today() &&
    !isHoldExpired(h.date, h.expiryTime) &&
    !bookings.some(b => b.date === h.date && b.deskId === h.deskId)
  );

  // Merge and sort by date
  const combined = [
    ...bookings.map(b => ({ type: 'booking', data: b })),
    ...myHolds.map(h => ({ type: 'hold', data: h })),
  ].sort((a, b) => a.data.date.localeCompare(b.data.date));

  container.innerHTML = `
    <div class="page-header">
      <h1>My Bookings</h1>
      <p>Your upcoming desk reservations</p>
    </div>
    ${combined.length === 0 ? `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <h3>No upcoming bookings</h3>
        <p>You don't have any desk reservations. Head to Book a Desk to get started.</p>
        <button class="btn btn-primary" onclick="navigate('book')">Book a Desk</button>
      </div>
    ` : `<div class="booking-list">${combined.map(item =>
        item.type === 'booking'
          ? renderBookingItem(item.data, true)
          : renderSoftHoldItem(item.data)
      ).join('')}</div>`}
  `;
}

function renderSoftHoldItem(hold) {
  const d = parseDate(hold.date);
  const month = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const desk = DESKS.find(dk => dk.id === hold.deskId);
  const floor = desk?.floor === 'ground' ? 'Ground Floor' : 'First Floor';

  return `
    <div class="booking-item booking-item-hold">
      <div class="booking-info">
        <div class="booking-date-block">
          <div class="bdate-month">${month}</div>
          <div class="bdate-day">${day}</div>
        </div>
        <div class="booking-details">
          <div class="booking-desk">
            ${hold.deskId}
            <span class="slot-badge slot-hold" style="margin-left:6px;font-size:11px">Auto-reserved</span>
          </div>
          <div class="booking-meta">${weekday} · ${floor} · ${desk?.neighbourhood || '–'}</div>
          <div style="margin-top:5px;font-size:11.5px;color:var(--text-muted)">
            Based on your usual pattern · held until ${hold.expiryTime}
          </div>
        </div>
      </div>
      <div class="booking-actions">
        <button class="btn btn-sm btn-secondary" style="color:var(--danger);border-color:var(--danger)"
          onclick="confirmReleaseHold('${hold.id}','${hold.deskId}','${hold.date}')">Release</button>
      </div>
    </div>
  `;
}

function renderBookingItem(booking, showActions) {
  const d = parseDate(booking.date);
  const month = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const floor = booking.desk?.floor === 'ground' ? 'Ground Floor' : 'First Floor';
  const slot = booking.slot || 'full';
  const isToday_ = booking.date === today();

  const checkinHtml = (() => {
    if (!isToday_) return '';
    if (booking.checkedIn) {
      return `<span class="checkin-status checkin-done">Checked in${booking.checkedInAt ? ' ' + formatTime(booking.checkedInAt) : ''}</span>`;
    }
    return `<span class="checkin-status checkin-pending">Not checked in</span>`;
  })();

  return `
    <div class="booking-item">
      <div class="booking-info">
        <div class="booking-date-block">
          <div class="bdate-month">${month}</div>
          <div class="bdate-day">${day}</div>
        </div>
        <div class="booking-details">
          <div class="booking-desk">
            ${booking.desk?.id || '–'}
            <span class="slot-badge slot-${slot === 'full' ? 'full' : slot}" style="margin-left:6px;font-size:11px">${slotShort(slot)}</span>
          </div>
          <div class="booking-meta">${weekday} · ${floor} · ${booking.desk?.neighbourhood || '–'}</div>
          ${booking.desk?.features?.length > 0
            ? `<div class="desk-features" style="margin-top:4px">${booking.desk.features.map(f=>`<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`).join('')}</div>`
            : ''}
          ${checkinHtml ? `<div style="margin-top:6px">${checkinHtml}</div>` : ''}
        </div>
      </div>
      ${showActions ? `
        <div class="booking-actions">
          ${isToday_ && !booking.checkedIn
            ? `<button class="btn btn-sm btn-primary" onclick="checkInBooking('${booking.id}')">Check In</button>`
            : ''}
          <button class="btn btn-sm btn-secondary" style="color:var(--danger);border-color:var(--danger)"
            onclick="promptCancel('${booking.id}','${booking.desk?.id}','${booking.date}')">Cancel</button>
        </div>` : ''}
    </div>
  `;
}

function confirmReleaseHold(holdId, deskId, date) {
  showModal(`
    <div class="modal-title">Release Hold</div>
    <div class="modal-desc">
      Release the auto-reserved hold on desk <strong>${deskId}</strong> on <strong>${displayDate(date)}</strong>?<br>
      <span style="font-size:12.5px;color:var(--text-muted)">The desk will become available for others to book.</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Keep it</button>
      <button class="btn btn-danger" onclick="hideModal();releaseHold('${holdId}')">Release</button>
    </div>
  `);
}

function promptCancel(bookingId, deskId, date) {
  showModal(`
    <div class="modal-title">Cancel Booking</div>
    <div class="modal-desc">
      Cancel your booking for desk <strong>${deskId}</strong> on <strong>${displayDate(date)}</strong>?
      This cannot be undone.
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Keep it</button>
      <button class="btn btn-danger" onclick="doCancel('${bookingId}','${deskId}')">Cancel booking</button>
    </div>
  `);
}

async function doCancel(bookingId, label) {
  hideModal();
  try {
    deleteBooking(bookingId);
    toast(`Booking cancelled: ${label}`, 'info');
    renderMyBookings();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Who's In ───────────────────────────────────────────────────────────────

async function renderWhosIn() {
  const container = document.getElementById('view-whos-in');
  if (!whosInDate) whosInDate = today();

  container.innerHTML = `
    <div class="page-header">
      <h1>Who's In</h1>
      <p>See who has a desk booked for any day</p>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Date:</label>
      <input type="date" id="whos-in-date" value="${whosInDate}" onchange="whosInDate=this.value;loadWhosIn()">
    </div>
    <div id="whos-in-content"><div style="color:#94a3b8">Loading...</div></div>
  `;
  loadWhosIn();
}

async function loadWhosIn() {
  const date = whosInDate || today();
  const content = document.getElementById('whos-in-content');
  if (!content) return;
  content.innerHTML = '<div style="color:#94a3b8">Loading...</div>';

  const bookings = getBookings({ date });

  if (bookings.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <h3>Nobody in yet</h3>
        <p>No desk bookings for ${displayDate(date)}.</p>
      </div>`;
    return;
  }

  const grouped = {};
  for (const b of bookings) {
    const nb = b.desk?.neighbourhood || 'Unknown';
    if (!grouped[nb]) grouped[nb] = [];
    grouped[nb].push(b);
  }

  content.innerHTML = `
    <div class="alert alert-info" style="margin-bottom:20px">
      <strong>${bookings.length}</strong> booking${bookings.length !== 1 ? 's' : ''} on ${displayDate(date)}.
    </div>
    ${Object.entries(grouped).map(([nb, bks]) => `
      <div class="section-header">${nb}</div>
      <div class="people-grid">
        ${bks.map(b => `
          <div class="person-card">
            <div class="person-avatar" style="background:${avatarColor(b.user?.fullName||'?')}">${initials(b.user?.fullName||'?')}</div>
            <div class="person-info">
              <div class="person-name">${b.user?.fullName || 'Unknown'}</div>
              <div class="person-sub">${b.user?.role || ''} &middot; ${b.user?.team || ''}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
                <span class="pill pill-grey" style="font-size:11px">${b.desk?.id || '–'}</span>
                <span class="slot-badge slot-${b.slot||'full'}">${slotShort(b.slot||'full')}</span>
                ${b.checkedIn ? '<span class="checkin-status checkin-done" style="font-size:10px">In</span>' : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;
}

// ── Floor Plan ────────────────────────────────────────────────────────────

let floorPlanDate = null;
let floorPlanFloor = 'ground';

const DESK_COORDS = {
  // Ground floor — percentage positions {x, y} on the floor plan image
  'G-W1': { x: 7,  y: 12 }, 'G-W2': { x: 13, y: 12 },
  'G-W3': { x: 7,  y: 21 }, 'G-W4': { x: 13, y: 21 },
  'G-Q1': { x: 78, y: 10 }, 'G-Q2': { x: 84, y: 10 },
  'G-Q3': { x: 78, y: 19 },
  'G-C1': { x: 75, y: 50 }, 'G-C2': { x: 81, y: 50 },
  'G-C3': { x: 75, y: 59 }, 'G-C4': { x: 81, y: 59 },
  'G-C5': { x: 87, y: 54 },
  'G-L1': { x: 8,  y: 51 }, 'G-L2': { x: 15, y: 51 },
  'G-L3': { x: 8,  y: 60 },
  // First floor
  'F-W1': { x: 7,  y: 12 }, 'F-W2': { x: 13, y: 12 },
  'F-W3': { x: 7,  y: 21 },
  'F-Q1': { x: 78, y: 10 }, 'F-Q2': { x: 84, y: 10 },
  'F-Q3': { x: 78, y: 19 },
  'F-C1': { x: 75, y: 50 }, 'F-C2': { x: 81, y: 50 },
  'F-C3': { x: 75, y: 59 }, 'F-C4': { x: 81, y: 59 },
  'F-L1': { x: 8,  y: 51 }, 'F-L2': { x: 15, y: 51 },
  'F-L3': { x: 8,  y: 60 },
};

function renderFloorPlan() {
  if (!floorPlanDate) floorPlanDate = today();
  const container = document.getElementById('view-floorplan');

  const bookings = getBookings({ date: floorPlanDate });
  const floorBookings = bookings.filter(b => b.desk?.floor === floorPlanFloor);
  const bookedDeskIds = new Set(floorBookings.map(b => b.deskId));
  const floorDesks = DESKS.filter(d => d.floor === floorPlanFloor);
  const imgSrc = floorPlanFloor === 'ground' ? '../floorplans/ground.png' : '../floorplans/first.png';

  const markers = floorDesks.map(desk => {
    const coords = DESK_COORDS[desk.id];
    if (!coords) return '';
    const booking = floorBookings.find(b => b.deskId === desk.id);
    const isMe = booking?.userId === currentUser.id;

    if (booking?.user) {
      const u = booking.user;
      return `
        <div class="fp-marker fp-marker-booked${isMe ? ' fp-marker-me' : ''}"
             style="left:${coords.x}%;top:${coords.y}%"
             onclick="fpShowDetail('${desk.id}','${floorPlanDate}')">
          <div class="fp-avatar" style="background:${avatarColor(u.fullName)}">${initials(u.fullName)}</div>
          <div class="fp-label">${u.fullName}</div>
        </div>`;
    }
    return `
      <div class="fp-marker fp-marker-empty"
           style="left:${coords.x}%;top:${coords.y}%"
           onclick="fpShowDetail('${desk.id}','${floorPlanDate}')">
        <div class="fp-dot"></div>
        <div class="fp-label fp-label-desk">${desk.id}</div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="page-header">
      <h1>Floor Plan</h1>
      <p>See who's sitting where</p>
    </div>

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div class="floor-tabs" style="margin-bottom:0">
        <button class="floor-tab${floorPlanFloor==='ground'?' active':''}" onclick="fpSetFloor('ground')">Ground Floor</button>
        <button class="floor-tab${floorPlanFloor==='first'?' active':''}" onclick="fpSetFloor('first')">First Floor</button>
      </div>
      <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Date:</label>
      <input type="date" value="${floorPlanDate}" onchange="fpSetDate(this.value)">
      <div style="display:flex;align-items:center;gap:14px;margin-left:auto;font-size:12px;color:var(--text-secondary)">
        <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:50%;background:var(--primary);display:inline-block"></span> Booked</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:50%;background:#e2e8f0;border:1.5px solid #cbd5e1;display:inline-block"></span> Available</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;border-radius:50%;background:#FFB800;display:inline-block"></span> Your desk</span>
      </div>
    </div>

    <div class="fp-wrap">
      <img src="${imgSrc}" class="fp-img" alt="${floorPlanFloor} floor plan">
      ${markers}
      <div style="position:absolute;bottom:8px;right:10px;font-size:11px;color:#94a3b8;background:rgba(255,255,255,0.85);padding:2px 6px;border-radius:4px">
        ${floorBookings.length} booked · ${floorDesks.length - bookedDeskIds.size} available
      </div>
    </div>
  `;
}

function fpSetFloor(floor) {
  floorPlanFloor = floor;
  renderFloorPlan();
}

function fpSetDate(date) {
  floorPlanDate = date;
  renderFloorPlan();
}

function fpShowDetail(deskId, date) {
  const desk = DESKS.find(d => d.id === deskId);
  const bookings = getBookings({ date }).filter(b => b.deskId === deskId);
  const booking = bookings[0];

  showModal(`
    <div class="modal-title">${deskId}</div>
    <div style="margin-bottom:16px">
      <span class="desk-neighbourhood nb-${desk.neighbourhood.replace(/\s+/g,'')}">${desk.neighbourhood}</span>
      <span style="margin-left:8px;font-size:12px;color:var(--text-secondary)">${desk.floor === 'ground' ? 'Ground' : 'First'} Floor</span>
    </div>
    <div class="desk-features" style="margin-bottom:16px">
      ${desk.features.map(f => `<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`).join('') || '<span style="color:var(--text-muted);font-size:12px">Standard desk</span>'}
    </div>
    ${booking ? `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border-radius:var(--radius);margin-bottom:16px">
        <div class="user-avatar" style="background:${avatarColor(booking.user.fullName)};width:36px;height:36px;font-size:14px">${initials(booking.user.fullName)}</div>
        <div>
          <div style="font-weight:600;font-size:14px">${booking.user.fullName}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${booking.user.role} · ${booking.user.team}</div>
          <div style="font-size:12px;margin-top:2px"><span class="slot-badge slot-${booking.slot||'full'}">${slotLabel(booking.slot||'full')}</span></div>
        </div>
      </div>` : `
      <div style="padding:12px;background:var(--primary-light);border-radius:var(--radius);margin-bottom:16px;color:var(--primary);font-size:13px;font-weight:500">
        This desk is available on ${displayShortDate(date)}
      </div>`}
    <div class="modal-actions">
      ${!booking ? `<button class="btn btn-primary" onclick="hideModal();navigate('book')">Book this desk</button>` : ''}
      <button class="btn btn-secondary" onclick="hideModal()">Close</button>
    </div>
  `);
}

// ── Team Bookings ──────────────────────────────────────────────────────────

// Pre-approved team meetings — in a real system these would come from a
// facilities/HR approval API. Only these meetings unlock team desk booking.
const APPROVED_MEETINGS = [
  {
    id: 'mtg-001',
    title: 'Mac Team Sprint Review',
    team: 'Mac',
    date: '2026-05-13',
    floor: 'ground',
    organiser: 'James Brown',
    approvalRef: 'WP-2026-0388',
    approvedBy: 'Workplace & Facilities',
    maxDesks: 8,
    notes: 'End-of-sprint demo and retrospective — full team expected.'
  },
  {
    id: 'mtg-002',
    title: 'Mac Team Quarterly Planning',
    team: 'Mac',
    date: '2026-05-20',
    floor: 'ground',
    organiser: 'James Brown',
    approvalRef: 'WP-2026-0412',
    approvedBy: 'Workplace & Facilities',
    maxDesks: 8,
    notes: 'Q2 roadmap review and prioritisation session.'
  },
  {
    id: 'mtg-003',
    title: 'Mac Tech Roadmap Workshop',
    team: 'Mac',
    date: '2026-05-28',
    floor: 'first',
    organiser: 'James Brown',
    approvalRef: 'WP-2026-0441',
    approvedBy: 'Workplace & Facilities',
    maxDesks: 6,
    notes: 'Architecture deep-dive — invite relevant engineers only.'
  },
  {
    id: 'mtg-004',
    title: 'Data Team Weekly Sync',
    team: 'Data',
    date: '2026-05-13',
    floor: 'ground',
    organiser: 'Daniel Wilson',
    approvalRef: 'WP-2026-0391',
    approvedBy: 'Workplace & Facilities',
    maxDesks: 6,
    notes: 'Weekly cross-Data team alignment — bring your sprint updates.'
  },
  {
    id: 'mtg-005',
    title: 'Data Platform Review',
    team: 'Data',
    date: '2026-05-21',
    floor: 'first',
    organiser: 'Daniel Wilson',
    approvalRef: 'WP-2026-0419',
    approvedBy: 'Workplace & Facilities',
    maxDesks: 6,
    notes: 'Review of data platform performance and upcoming migrations.'
  },
  {
    id: 'mtg-006',
    title: 'Data & Analytics Strategy Day',
    team: 'Data',
    date: '2026-05-27',
    floor: 'first',
    organiser: 'Daniel Wilson',
    approvalRef: 'WP-2026-0455',
    approvedBy: 'Workplace & Facilities',
    maxDesks: 8,
    notes: 'Full-day session covering H2 data strategy and tooling decisions.'
  },
];

const TEAM_BOOKINGS_KEY = 'perch_team_bookings';

function loadTeamBookings() {
  try { return JSON.parse(localStorage.getItem(TEAM_BOOKINGS_KEY) || '[]'); } catch { return []; }
}
function saveTeamBookings(tb) { localStorage.setItem(TEAM_BOOKINGS_KEY, JSON.stringify(tb)); }

function getTeamBookingForMeeting(meetingId) {
  return loadTeamBookings().find(tb => tb.meetingId === meetingId) || null;
}

async function renderTeamBookings() {
  if (!currentUser?.isLineManager) return;
  const container = document.getElementById('view-team-bookings');

  const reports = (currentUser.directReports || [])
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean);

  const myMeetings = APPROVED_MEETINGS.filter(m => m.team === currentUser.team);

  const meetingCards = myMeetings.map(mtg => {
    const d = parseDate(mtg.date);
    const isPast = mtg.date < today();
    const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const existing = getTeamBookingForMeeting(mtg.id);
    const floorLabel = mtg.floor === 'ground' ? 'Ground Floor' : 'First Floor';

    let statusHtml, actionHtml;
    if (existing) {
      const bookedNames = existing.slots.map(s => {
        const u = allUsers.find(u => u.id === s.userId);
        return u ? u.fullName.split(' ')[0] : '?';
      }).join(', ');
      statusHtml = `<div class="tb-status tb-status-booked">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        ${existing.slots.length} desk${existing.slots.length !== 1 ? 's' : ''} booked — ${bookedNames}
      </div>`;
      actionHtml = `<button class="btn btn-sm btn-secondary" onclick="cancelTeamBooking('${mtg.id}')">Cancel all</button>`;
    } else if (isPast) {
      statusHtml = `<div class="tb-status tb-status-past">Meeting passed</div>`;
      actionHtml = '';
    } else {
      statusHtml = `<div class="tb-status tb-status-pending">Desks not yet booked</div>`;
      actionHtml = `<button class="btn btn-sm btn-primary" onclick="showTeamBookingModal('${mtg.id}')">Book team desks</button>`;
    }

    return `
      <div class="card tb-meeting-card ${isPast ? 'tb-past' : ''} ${existing ? 'tb-booked' : ''}">
        <div class="tb-meeting-header">
          <div class="tb-date-block">
            <div class="tb-date-month">${d.toLocaleDateString('en-GB',{month:'short'}).toUpperCase()}</div>
            <div class="tb-date-day">${d.getDate()}</div>
            <div class="tb-date-wd">${weekday.slice(0,3)}</div>
          </div>
          <div class="tb-meeting-info">
            <div class="tb-meeting-title">${mtg.title}</div>
            <div class="tb-meeting-meta">${dateStr} · ${floorLabel}</div>
            <div class="tb-meeting-meta" style="margin-top:2px">
              <span class="tb-approval-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Approved · ${mtg.approvalRef}
              </span>
            </div>
          </div>
          <div class="tb-meeting-actions">${actionHtml}</div>
        </div>
        ${mtg.notes ? `<div class="tb-meeting-notes">${mtg.notes}</div>` : ''}
        ${statusHtml}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="page-header">
      <h1>Team Bookings</h1>
      <p>Book desks for your team against pre-approved building meetings</p>
    </div>
    <div class="tb-explainer card one-col" style="margin-bottom:20px">
      <div class="card-body" style="padding:14px 20px;display:flex;align-items:center;gap:12px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div>
          <div style="font-weight:600;font-size:13.5px">Manager-only feature</div>
          <div style="font-size:12.5px;color:var(--text-secondary);margin-top:1px">
            Team desk bookings are only permitted for pre-approved meetings. Your direct reports are shown below each meeting for selection.
          </div>
        </div>
      </div>
    </div>
    ${myMeetings.length === 0
      ? `<div class="empty-state"><h3>No approved meetings</h3><p>There are no pre-approved building meetings for your team yet. Contact Workplace &amp; Facilities to request approval.</p></div>`
      : `<div class="tb-meeting-list">${meetingCards}</div>`}
  `;
}

function showTeamBookingModal(meetingId) {
  const mtg = APPROVED_MEETINGS.find(m => m.id === meetingId);
  if (!mtg) return;

  const reports = (currentUser.directReports || [])
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean);

  const desksAvail = getDesks({ floor: mtg.floor, date: mtg.date })
    .filter(d => d.available && !getDeskSoftHold(d.id, mtg.date)).length;

  const reportRows = reports.map(u => `
    <label class="tb-member-row">
      <input type="checkbox" class="tb-member-cb" value="${u.id}" checked>
      <div class="user-avatar" style="background:${avatarColor(u.fullName)};width:30px;height:30px;font-size:12px;flex-shrink:0">${initials(u.fullName)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px">${u.fullName}</div>
        <div style="font-size:11.5px;color:var(--text-secondary)">${u.role} · ${u.team}</div>
      </div>
    </label>
  `).join('');

  const d = parseDate(mtg.date);
  const dateStr = d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });

  showModal(`
    <div class="modal-title">Book Team Desks</div>
    <div style="background:var(--primary-light);border-radius:var(--radius);padding:10px 14px;margin-bottom:16px">
      <div style="font-weight:600;font-size:13.5px;color:var(--primary)">${mtg.title}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${dateStr}</div>
      <div style="font-size:11.5px;margin-top:4px">
        <span class="tb-approval-badge">Ref: ${mtg.approvalRef}</span>
        <span style="margin-left:8px;color:var(--text-muted)">${desksAvail} desk${desksAvail!==1?'s':''} available on this floor</span>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">Select team members (${reports.length})</div>
    <div id="tb-member-list" style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;margin-bottom:16px">
      ${reportRows}
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Desks will be auto-assigned on the ${mtg.floor === 'ground' ? 'Ground' : 'First'} Floor based on team preferences.</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="doTeamBook('${mtg.id}')">Confirm bookings</button>
    </div>
  `);
}

function doTeamBook(meetingId) {
  const mtg = APPROVED_MEETINGS.find(m => m.id === meetingId);
  if (!mtg) return;

  const checked = [...document.querySelectorAll('.tb-member-cb:checked')].map(cb => cb.value);
  if (checked.length === 0) { toast('Select at least one team member', 'error'); return; }
  if (checked.length > mtg.maxDesks) { toast(`This meeting allows a maximum of ${mtg.maxDesks} desks`, 'error'); return; }

  const availableDesks = getDesks({ floor: mtg.floor, date: mtg.date })
    .filter(d => d.available && !getDeskSoftHold(d.id, mtg.date))
    .sort((a, b) => scoreDesk(b, currentUser) - scoreDesk(a, currentUser));

  if (availableDesks.length < checked.length) {
    toast(`Only ${availableDesks.length} desks available — reduce team size`, 'error');
    return;
  }

  const slots = [];
  const errors = [];

  checked.forEach((userId, i) => {
    const desk = availableDesks[i];
    try {
      const booking = createBooking({ userId, deskId: desk.id, date: mtg.date, slot: 'full' });
      slots.push({ userId, deskId: desk.id, bookingId: booking.id });
    } catch (e) {
      errors.push(e.message);
    }
  });

  if (slots.length > 0) {
    const tb = loadTeamBookings();
    tb.push({ id: generateId(), meetingId, managerId: currentUser.id, date: mtg.date, slots, createdAt: new Date().toISOString() });
    saveTeamBookings(tb);
  }

  hideModal();
  if (errors.length > 0) {
    toast(`${slots.length} booked, ${errors.length} failed: ${errors[0]}`, 'error');
  } else {
    toast(`${slots.length} desk${slots.length !== 1 ? 's' : ''} booked for ${mtg.title}`, 'success');
  }
  renderTeamBookings();
}

function cancelTeamBooking(meetingId) {
  const mtg = APPROVED_MEETINGS.find(m => m.id === meetingId);
  const tb = getTeamBookingForMeeting(meetingId);
  if (!tb) return;

  showModal(`
    <div class="modal-title">Cancel Team Booking</div>
    <div class="modal-desc">
      Cancel all ${tb.slots.length} desk booking${tb.slots.length !== 1 ? 's' : ''} for <strong>${mtg?.title}</strong>?
      <br><span style="font-size:12.5px;color:var(--text-muted)">This will release all desks back to the pool.</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Keep bookings</button>
      <button class="btn btn-danger" onclick="confirmCancelTeamBooking('${meetingId}')">Cancel all desks</button>
    </div>
  `);
}

function confirmCancelTeamBooking(meetingId) {
  const tb = getTeamBookingForMeeting(meetingId);
  if (tb) {
    tb.slots.forEach(s => { try { deleteBooking(s.bookingId); } catch {} });
    saveTeamBookings(loadTeamBookings().filter(t => t.meetingId !== meetingId));
  }
  hideModal();
  toast('Team booking cancelled — desks released', 'info');
  renderTeamBookings();
}

// ── Agent ──────────────────────────────────────────────────────────────────

let _agentOpen = false;
let _agentInited = false;
let _agentHistory = [];
let _agentPending = null; // { type: 'AWAIT_SLOT'|'AWAIT_DESK'|'AWAIT_CONFIRM_CANCEL', data: {} }

function toggleAgent() {
  _agentOpen = !_agentOpen;
  const panel = document.getElementById('agent-panel');
  const trigger = document.querySelector('.agent-trigger');
  panel.classList.toggle('hidden', !_agentOpen);
  trigger.classList.toggle('active', _agentOpen);
  if (_agentOpen && !_agentInited) {
    _agentInited = true;
    agentGreet();
  }
  if (_agentOpen) {
    setTimeout(() => document.getElementById('agent-input').focus(), 100);
  }
}

function agentGreet() {
  const name = currentUser ? currentUser.fullName.split(' ')[0] : 'there';
  const hold = getMyHoldForDate(today());
  let greeting = `Hi ${name}! I can help you book desks, check availability, or see who's in.`;
  if (hold && !hold.checkedIn && !hold.released) {
    const desk = DESKS.find(d => d.id === hold.deskId);
    greeting += `<br><br>You have a soft hold on <strong>${hold.deskId}</strong>${desk ? ` (${desk.neighbourhood})` : ''} today until ${hold.expiryTime}.`;
  }
  addAgentMsg('bot', greeting, ['Book a desk', "Who's in today?", 'My bookings', 'How busy this week?']);
}

function addAgentMsg(role, html, chips = []) {
  _agentHistory.push({ role, html, chips });
  renderAgentMsgs();
  updateAgentChips(chips);
}

function renderAgentMsgs() {
  const container = document.getElementById('agent-messages');
  container.innerHTML = _agentHistory.map(m => {
    if (m.role === 'bot') {
      return `<div class="agent-msg agent-msg-bot">
        <div class="agent-avatar-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </div>
        <div class="agent-bubble agent-bubble-bot">${m.html}</div>
      </div>`;
    } else {
      return `<div class="agent-msg agent-msg-user">
        <div class="agent-bubble agent-bubble-user">${m.html}</div>
      </div>`;
    }
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function updateAgentChips(chips) {
  const el = document.getElementById('agent-chips');
  el.innerHTML = chips.map(c =>
    `<button class="agent-chip" onclick="agentChipClick(${JSON.stringify(c)})">${c}</button>`
  ).join('');
}

function agentChipClick(text) {
  document.getElementById('agent-input').value = text;
  sendAgentMessage();
}

function sendAgentMessage() {
  const input = document.getElementById('agent-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  updateAgentChips([]);
  addAgentMsg('user', text);
  setTimeout(() => {
    const reply = _agentPending ? handleAgentPending(text) : processAgentInput(text);
    addAgentMsg('bot', reply.html, reply.chips || []);
  }, 200);
}

// ── NLP helpers ────────────────────────────────────────────────────────────

const DAY_MAP = { mon: 1, monday: 1, tue: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5 };

function agentParseDate(text) {
  const t = text.toLowerCase();
  if (t.includes('today')) return today();
  if (t.includes('tomorrow')) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
    return toDateStr(d);
  }
  for (const [name, dow] of Object.entries(DAY_MAP)) {
    if (t.includes(name)) {
      const d = new Date();
      const diff = (dow - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return toDateStr(d);
    }
  }
  const iso = text.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  return null;
}

function agentParseSlot(text) {
  const t = text.toLowerCase();
  if (t.includes('morning') || t.includes(' am') || t.includes('half day am')) return 'am';
  if (t.includes('afternoon') || t.includes(' pm') || t.includes('half day pm')) return 'pm';
  if (t.includes('full') || t.includes('all day') || t.includes('whole')) return 'full';
  return null;
}

function agentParseDeskId(text) {
  const m = text.toUpperCase().match(/\b([GF]-[WQCL]\d)\b/);
  return m ? m[1] : null;
}

function agentFormatDate(dateStr) {
  if (!dateStr) return '';
  if (dateStr === today()) return 'today';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
}

// ── Multi-turn pending handler ─────────────────────────────────────────────

function handleAgentPending(text) {
  const pending = _agentPending;

  if (pending.type === 'AWAIT_SLOT') {
    const slot = agentParseSlot(text) || (text.toLowerCase().includes('full') ? 'full' : null);
    if (!slot) {
      return { html: 'Sorry, I didn\'t catch that. Do you want the <strong>full day</strong>, <strong>morning (AM)</strong>, or <strong>afternoon (PM)</strong>?', chips: ['Full day', 'Morning', 'Afternoon'] };
    }
    _agentPending = null;
    return agentExecuteBook({ ...pending.data, slot });
  }

  if (pending.type === 'AWAIT_DESK') {
    const deskId = agentParseDeskId(text);
    const nb = text.toLowerCase();
    let resolvedDesk = deskId;
    if (!resolvedDesk) {
      const desk = DESKS.find(d => d.neighbourhood.toLowerCase().includes(nb) || nb.includes(d.neighbourhood.toLowerCase()));
      if (desk) resolvedDesk = desk.id;
    }
    if (!resolvedDesk) {
      _agentPending = null;
      return { html: 'I couldn\'t find that desk. Try something like <strong>G-W1</strong> or say a neighbourhood name.', chips: ['Window Bank', 'Quiet Zone', 'Collaboration Zone'] };
    }
    _agentPending = null;
    return agentExecuteBook({ ...pending.data, deskId: resolvedDesk });
  }

  if (pending.type === 'AWAIT_CONFIRM_CANCEL') {
    const yes = /yes|yep|ok|confirm|sure|cancel it/i.test(text);
    const no  = /no|nope|keep|don't|dont/i.test(text);
    if (yes) {
      const b = pending.data.booking;
      deleteBooking(b.id);
      _agentPending = null;
      if (document.getElementById('view-my-bookings').classList.contains('')) renderMyBookings();
      return { html: `Done — your booking for <strong>${b.deskId}</strong> on <strong>${agentFormatDate(b.date)}</strong> has been cancelled.`, chips: ['Book a desk', 'My bookings'] };
    }
    if (no) {
      _agentPending = null;
      return { html: 'No problem, I\'ve kept your booking.', chips: ['My bookings'] };
    }
    return { html: 'Please confirm: cancel this booking? (<strong>yes</strong> / <strong>no</strong>)', chips: ['Yes, cancel it', 'No, keep it'] };
  }

  _agentPending = null;
  return processAgentInput(text);
}

// ── Intent handlers ────────────────────────────────────────────────────────

function agentExecuteBook({ date, slot, deskId }) {
  const desks = getDesks({ date });
  let target = deskId ? desks.find(d => d.id === deskId) : null;

  if (!deskId) {
    const ep = loadEnvPrefs();
    const scored = desks
      .filter(d => slot === 'am' ? d.amAvailable : slot === 'pm' ? d.pmAvailable : d.available)
      .filter(d => !getDeskSoftHold(d.id, date) || getDeskSoftHold(d.id, date)?.userId === currentUser.id)
      .sort((a, b) => scoreDesk(b, currentUser) - scoreDesk(a, currentUser));
    target = scored[0] || null;
  }

  if (!target) {
    return { html: `Sorry, I couldn't find an available desk for <strong>${agentFormatDate(date)}</strong>.`, chips: ['Try another day', 'Show floor plan'] };
  }

  const slotConflict = slot === 'am' ? !target.amAvailable : slot === 'pm' ? !target.pmAvailable : !target.available;
  if (slotConflict) {
    return { html: `<strong>${target.id}</strong> isn't available ${slot === 'full' ? 'all day' : slot === 'am' ? 'this morning' : 'this afternoon'} on <strong>${agentFormatDate(date)}</strong>. Want me to find another desk?`, chips: ['Find me another desk', 'Choose a different day'] };
  }

  try {
    const booking = createBooking({ userId: currentUser.id, deskId: target.id, date, slot: slot || 'full' });
    renderDashboard();
    return {
      html: `Booked! <strong>${booking.deskId}</strong> (${booking.desk?.neighbourhood}) on <strong>${agentFormatDate(date)}</strong> — ${slotLabel(slot || 'full')}.`,
      chips: ['My bookings', 'Book another desk']
    };
  } catch (e) {
    return { html: `Couldn't book: ${e.message}`, chips: ['Try another desk'] };
  }
}

function agentHandleBook(text) {
  let date = agentParseDate(text);
  let slot = agentParseSlot(text) || 'full';
  let deskId = agentParseDeskId(text);

  if (!date) {
    _agentPending = { type: 'AWAIT_SLOT', data: {} };
    _agentPending = null;
    return { html: 'Which day would you like to book?', chips: ['Today', 'Tomorrow', 'Monday', 'Wednesday', 'Thursday'] };
  }

  if (deskId) {
    return agentExecuteBook({ date, slot, deskId });
  }

  return agentExecuteBook({ date, slot, deskId: null });
}

function agentHandleCancel(text) {
  const date = agentParseDate(text);
  const deskId = agentParseDeskId(text);
  const bookings = getBookings({ userId: currentUser.id, upcoming: true }).map(b => enrichBooking(b));

  let candidates = bookings;
  if (date) candidates = candidates.filter(b => b.date === date);
  if (deskId) candidates = candidates.filter(b => b.deskId === deskId);

  if (candidates.length === 0) {
    return { html: 'I couldn\'t find a matching upcoming booking to cancel.', chips: ['My bookings'] };
  }
  if (candidates.length > 1) {
    const list = candidates.map(b => `<li><strong>${b.deskId}</strong> on ${agentFormatDate(b.date)}</li>`).join('');
    return { html: `You have multiple bookings. Which one do you want to cancel?<ul>${list}</ul>Please be more specific (e.g. "cancel G-W1 on Monday").`, chips: [] };
  }

  const b = candidates[0];
  _agentPending = { type: 'AWAIT_CONFIRM_CANCEL', data: { booking: b } };
  return { html: `Cancel <strong>${b.deskId}</strong> on <strong>${agentFormatDate(b.date)}</strong>? (${slotLabel(b.slot || 'full')})`, chips: ['Yes, cancel it', 'No, keep it'] };
}

function agentHandleAvail(text) {
  const date = agentParseDate(text) || today();
  const desks = getDesks({ date });
  const free = desks.filter(d => d.available && (!getDeskSoftHold(d.id, date) || getDeskSoftHold(d.id, date)?.userId === currentUser.id));
  const byNb = {};
  for (const d of free) {
    byNb[d.neighbourhood] = (byNb[d.neighbourhood] || 0) + 1;
  }
  const lines = Object.entries(byNb).map(([nb, n]) => `<li><strong>${nb}</strong>: ${n} desk${n>1?'s':''} free</li>`).join('');
  return {
    html: `On <strong>${agentFormatDate(date)}</strong>, ${free.length} desk${free.length!==1?'s are':' is'} available:<ul>${lines}</ul>`,
    chips: [`Book a desk for ${agentFormatDate(date)}`, 'See floor plan']
  };
}

function agentHandleWhosIn(text) {
  const date = agentParseDate(text) || today();
  const bookings = loadBookings().filter(b => b.date === date);
  const enriched = bookings.map(b => enrichBooking(b)).filter(b => b.user);
  if (enriched.length === 0) {
    return { html: `No bookings found for <strong>${agentFormatDate(date)}</strong>.`, chips: ["Who's in tomorrow?", 'Book a desk'] };
  }
  const names = enriched.slice(0, 8).map(b => `<li>${b.user.fullName} — ${b.deskId}</li>`).join('');
  const more = enriched.length > 8 ? `<li>…and ${enriched.length - 8} more</li>` : '';
  return {
    html: `<strong>${enriched.length} colleague${enriched.length!==1?'s':''}</strong> booked in on <strong>${agentFormatDate(date)}</strong>:<ul>${names}${more}</ul>`,
    chips: ['Book my desk too', 'View Who\'s In']
  };
}

function agentHandleMyBookings() {
  const bookings = getBookings({ userId: currentUser.id, upcoming: true }).map(b => enrichBooking(b));
  if (bookings.length === 0) {
    return { html: 'You have no upcoming bookings.', chips: ['Book a desk'] };
  }
  const lines = bookings.slice(0, 5).map(b => `<li><strong>${b.deskId}</strong> on ${agentFormatDate(b.date)} (${slotLabel(b.slot || 'full')})</li>`).join('');
  return { html: `Your upcoming bookings:<ul>${lines}</ul>`, chips: ['Cancel a booking', 'Book another desk'] };
}

function agentHandleConfidence(text) {
  const date = agentParseDate(text) || today();
  const wc = calculateConfidence(date);
  let advice = '';
  if (wc.score >= 80) advice = 'Plenty of space — you should easily find a good desk.';
  else if (wc.score >= 60) advice = 'Moderate occupancy — book early to get your preferred spot.';
  else advice = 'It\'s going to be busy. I\'d recommend booking now.';
  return {
    html: `Arrival confidence for <strong>${agentFormatDate(date)}</strong>: <strong style="color:${wc.colour}">${wc.score}%</strong><br>${advice}`,
    chips: ['Book a desk', 'Check another day']
  };
}

function agentHandleRoutine() {
  const pat = (typeof HISTORIC_PATTERNS !== 'undefined' ? HISTORIC_PATTERNS : []).find(p => p.userId === currentUser?.id);
  if (!pat) {
    return { html: 'I don\'t have a recorded routine for you yet. Your patterns will build up over time as you use the office.', chips: ['Book a desk'] };
  }
  const days = pat.patterns.map(p => `<li><strong>${p.day.charAt(0).toUpperCase()+p.day.slice(1)}</strong> — ${p.deskId} at ${p.arrivalTime} (${Math.round(p.consistency*100)}% consistent)</li>`).join('');
  return { html: `Your usual pattern:<ul>${days}</ul>`, chips: ['Book my usual desk', 'Dashboard'] };
}

function agentHandleNavigate(text) {
  const t = text.toLowerCase();
  let view = null;
  if (t.includes('floor') || t.includes('map') || t.includes('plan')) view = 'floorplan';
  else if (t.includes('book')) view = 'book';
  else if (t.includes('my booking') || t.includes('reserv')) view = 'my-bookings';
  else if (t.includes('who') || t.includes('team')) view = 'whos-in';
  else if (t.includes('dash')) view = 'dashboard';
  if (view) {
    navigate(view);
    toggleAgent();
    return { html: `Opening ${view.replace('-', ' ')}…`, chips: [] };
  }
  return { html: 'Where would you like to go? I can open Dashboard, Book a Desk, My Bookings, Who\'s In, or Floor Plan.', chips: ['Dashboard', 'Book a Desk', 'Floor Plan'] };
}

function agentHandleHelp() {
  return {
    html: `Here's what I can do:<ul>
      <li><strong>Book a desk</strong> — "Book a desk for Monday" or "Reserve G-W1 tomorrow"</li>
      <li><strong>Cancel</strong> — "Cancel my booking on Thursday"</li>
      <li><strong>Availability</strong> — "What's free on Friday?"</li>
      <li><strong>Who's in</strong> — "Who's in today?"</li>
      <li><strong>My bookings</strong> — "Show my bookings"</li>
      <li><strong>Confidence</strong> — "How busy is Wednesday?"</li>
      <li><strong>Routine</strong> — "What's my usual desk?"</li>
      <li><strong>Navigate</strong> — "Show the floor plan"</li>
    </ul>`,
    chips: ['Book a desk', "Who's in today?", 'My bookings']
  };
}

function processAgentInput(text) {
  const t = text.toLowerCase();

  if (/\b(help|what can you do|what do you do)\b/.test(t)) return agentHandleHelp();

  if (/\b(book|reserve|grab|get me|need a desk)\b/.test(t)) return agentHandleBook(text);

  if (/\b(cancel|remove|delete|drop)\b.*(booking|desk|reservation)/.test(t) ||
      /\b(cancel)\b/.test(t) && /\b(my|the)\b/.test(t)) return agentHandleCancel(text);

  if (/\b(free|available|availab|spaces|any desks|what('s| is) (free|open|available))\b/.test(t)) return agentHandleAvail(text);

  if (/\b(who('s| is) in|who comes in|team in|colleagues in|people in)\b/.test(t)) return agentHandleWhosIn(text);

  if (/\b(my bookings?|my reservations?|show bookings?|upcoming)\b/.test(t)) return agentHandleMyBookings();

  if (/\b(busy|quiet|confidence|occupancy|how busy|how full|how packed)\b/.test(t)) return agentHandleConfidence(text);

  if (/\b(routine|usual desk|my desk|normally sit|always sit|pattern)\b/.test(t)) return agentHandleRoutine();

  if (/\b(go to|open|show|take me to|navigate|floor plan|floorplan|dashboard)\b/.test(t)) return agentHandleNavigate(text);

  return {
    html: 'I\'m not sure I understood that. Try asking me to book a desk, check availability, or see who\'s in.',
    chips: ['Book a desk', "Who's in today?", 'Help']
  };
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('switch-btn').addEventListener('click', switchAccount);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideModal();
  });
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.view); });
  });
  ssoLogin();
}

document.addEventListener('DOMContentLoaded', init);
