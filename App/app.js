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

// Called on login and dashboard render — creates holds for all users from
// HISTORIC_PATTERNS for today + next 7 working days. Idempotent.
function generateAllSoftHolds() {
  const holds = loadSoftHolds();
  const existingKeys = new Set(
    holds.filter(h => h.status !== 'released').map(h => `${h.userId}|${h.date}`)
  );
  const bookings = loadBookings();
  const bookedKeys = new Set(bookings.map(b => `${b.userId}|${b.date}`));

  let changed = false;
  let daysChecked = 0, i = 0;

  while (daysChecked <= 7) {
    const date = addDays(today(), i++);
    const day = dayKey(date);
    if (!WORKDAYS.includes(day)) continue;
    daysChecked++;

    for (const userPattern of HISTORIC_PATTERNS) {
      const pat = userPattern.patterns.find(p => p.day === day);
      if (!pat) continue;
      const key = `${userPattern.userId}|${date}`;
      if (existingKeys.has(key) || bookedKeys.has(key)) continue;

      const expiryTime = addGraceHour(pat.arrivalTime);
      holds.push({
        id: generateId(),
        userId: userPattern.userId,
        userName: userPattern.name,
        deskId: pat.deskId,
        date,
        arrivalTime: pat.arrivalTime,
        expiryTime,
        consistency: pat.consistency,
        status: isHoldExpired(date, expiryTime) ? 'expired' : 'active',
        source: 'routine',
        createdAt: new Date().toISOString(),
      });
      existingKeys.add(key);
      changed = true;
    }
  }
  if (changed) saveSoftHolds(holds);
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
  renderDashboard();
}

function renderRoutineCard() {
  generateAllSoftHolds();

  const myPattern = HISTORIC_PATTERNS.find(p => p.userId === currentUser.id);
  const myHoldsThisWeek = loadSoftHolds()
    .filter(h => h.userId === currentUser.id && h.status === 'active' && h.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (!myPattern && !myHoldsThisWeek.length) return '';

  const patternHtml = myPattern ? myPattern.patterns.map(p => {
    const desk = DESKS.find(d => d.id === p.deskId);
    return `<div class="routine-day-card">
      <div class="routine-day-label">${DAY_LABELS[p.day]}</div>
      <div class="routine-desk">${p.deskId}</div>
      <div class="routine-nb">${desk?.neighbourhood?.split(' ')[0] || ''}</div>
      <div class="routine-conf">${Math.round(p.consistency * 100)}%</div>
    </div>`;
  }).join('') : '';

  const holdsHtml = myHoldsThisWeek.map(h => {
    const desk = DESKS.find(d => d.id === h.deskId);
    const expired = isHoldExpired(h.date, h.expiryTime);
    const isToday_ = h.date === today();
    return `<div class="soft-hold-row">
      <div class="soft-hold-date-block">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:var(--primary)">${parseDate(h.date).toLocaleDateString('en-GB',{month:'short'})}</div>
        <div style="font-size:18px;font-weight:700;line-height:1;color:var(--primary)">${parseDate(h.date).getDate()}</div>
        <div style="font-size:9px;color:var(--text-muted)">${parseDate(h.date).toLocaleDateString('en-GB',{weekday:'short'})}</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:0.04em">${h.deskId}</span>
          <span class="desk-neighbourhood ${nbClass(desk?.neighbourhood||'')}" style="font-size:10px">${desk?.neighbourhood||''}</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px">
          ${expired ? 'Grace period ended — desk released' : `Reserved · grace until <strong>${h.expiryTime}</strong>`}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
        ${isToday_ && !expired ? `<button class="btn btn-sm btn-primary" onclick="checkInViaHold('${h.id}')">Scan in</button>` : ''}
        ${!expired ? `<button class="btn btn-sm btn-secondary" onclick="releaseHold('${h.id}')">Release</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<div class="card one-col">
    <div class="card-header">
      <span class="card-title">Your Routine</span>
      <span class="pill pill-blue" style="font-size:11px">Background holds active</span>
    </div>
    <div class="card-body" style="padding:14px 20px">
      ${myPattern ? `
        <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">Based on your historic patterns — your usual desks are reserved automatically the night before.</p>
        <div class="routine-pattern" style="margin-bottom:${myHoldsThisWeek.length ? 16 : 0}px">${patternHtml}</div>` : ''}
      ${myHoldsThisWeek.length ? `
        <div style="${myPattern ? 'padding-top:16px;border-top:1px solid var(--border);' : ''}">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:10px">Active reservations — scan in to confirm or release if not coming in</div>
          <div class="soft-hold-list">${holdsHtml}</div>
        </div>` : ''}
    </div>
  </div>`;
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

  // Check for a colleague's active soft hold on this desk
  const activeSoftHold = isFuture ? getDeskSoftHold(desk.id, date) : null;
  const isMyHold = activeSoftHold?.userId === currentUser.id;
  const otherHold = activeSoftHold && !isMyHold ? activeSoftHold : null;

  let cardClass = 'desk-card';
  if (isMyDesk) cardClass += ' my-desk';
  else if (isMyHold) cardClass += ' soft-hold-mine available';
  else if (otherHold) cardClass += ' soft-hold-taken';
  else if (!desk.amAvailable && !desk.pmAvailable) cardClass += ' booked';
  else cardClass += ' available';
  if (isRecommended && !activeSoftHold) cardClass += ' recommended';

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
      ${isMyHold ? '<div class="soft-hold-badge">🔔 Your usual desk</div>' : isRecommended ? '<div class="desk-recommended-badge">Recommended</div>' : ''}
      ${showEnvMatch && !activeSoftHold ? `<div class="env-match-badge">${envMatchCount === 3 ? 'Perfect' : 'Good'} env match</div>` : ''}
      <div class="desk-id">${desk.id}</div>
      <div class="desk-neighbourhood ${nbClass(desk.neighbourhood)}">${desk.neighbourhood}</div>
      <div class="desk-features">
        ${desk.features.map(f => `<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`).join('')}
        ${desk.features.length === 0 ? '<span style="font-size:12px;color:var(--text-muted)">Standard desk</span>' : ''}
      </div>
      ${envTagsHtml}
      ${peerSignalsHtml}
      <div class="slot-bar">
        <span class="slot-badge ${desk.amAvailable ? 'slot-free' : 'slot-taken'}">AM</span>
        <span class="slot-badge ${desk.pmAvailable ? 'slot-free' : 'slot-taken'}">PM</span>
        ${myDeskBooking ? `<span class="slot-badge slot-mine">${slotShort(myDeskBooking.slot||'full')} — You</span>` : ''}
      </div>
      ${otherHold ? `
        <div class="soft-hold-taken-info">
          <span style="font-size:11px;font-weight:600;color:#92400E">Reserved · ${otherHold.userName?.split(' ')[0] || 'Colleague'}</span>
          <span style="font-size:11px;color:#92400E"> · grace until ${otherHold.expiryTime}</span>
        </div>` : ''}
      ${isFuture ? `<div class="desk-actions">
        ${isMyHold ? `
          <button class="btn btn-primary btn-sm" onclick="checkInViaHold('${activeSoftHold.id}')">Scan in</button>
          <button class="btn btn-sm btn-secondary" onclick="releaseHold('${activeSoftHold.id}')">Release</button>` : ''}
        ${!activeSoftHold && canBookFull  ? `<button class="btn btn-primary btn-sm" onclick="confirmBook('${desk.id}','${date}','full')">Full Day</button>` : ''}
        ${!activeSoftHold && canBookAm && !canBookFull ? `<button class="btn btn-primary btn-sm" onclick="confirmBook('${desk.id}','${date}','am')">Book AM</button>` : ''}
        ${!activeSoftHold && canBookPm && !canBookFull ? `<button class="btn btn-secondary btn-sm" onclick="confirmBook('${desk.id}','${date}','pm')">Book PM</button>` : ''}
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

  const bookings = getBookings({ userId: currentUser.id, upcoming: true });

  container.innerHTML = `
    <div class="page-header">
      <h1>My Bookings</h1>
      <p>Your upcoming desk reservations</p>
    </div>
    ${bookings.length === 0 ? `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <h3>No upcoming bookings</h3>
        <p>You don't have any desk reservations. Head to Book a Desk to get started.</p>
        <button class="btn btn-primary" onclick="navigate('book')">Book a Desk</button>
      </div>
    ` : `<div class="booking-list">${bookings.map(b => renderBookingItem(b, true)).join('')}</div>`}
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
