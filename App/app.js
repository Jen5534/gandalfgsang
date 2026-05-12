// ── State ──────────────────────────────────────────────────────────────────
let currentUser = null;
let allUsers = [];
let bookWeekStart = null;
let selectedBookDate = null;
let selectedBookFloor = 'ground';
let selectedNeighbourhood = '';
let bookingForUserId      = null;
let whosInDate = null;

// ── Office location — update lat/lng to your actual office coordinates ──────
const OFFICE_LAT = 51.5074;
const OFFICE_LNG = -0.1278;
const OFFICE_RADIUS_M = 300;

const ADMIN_SETTINGS_KEY = 'mdb_admin_settings';

function loadOfficeSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || 'null');
    return { name: 'London HQ', lat: OFFICE_LAT, lng: OFFICE_LNG, radiusM: OFFICE_RADIUS_M, ...s?.office };
  } catch { return { name: 'London HQ', lat: OFFICE_LAT, lng: OFFICE_LNG, radiusM: OFFICE_RADIUS_M }; }
}

function loadAutoBookAdminSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || 'null');
    return { enableOnScan: true, enableOnProximity: true, proximityRadiusM: 300, ...s?.autoBook };
  } catch { return { enableOnScan: true, enableOnProximity: true, proximityRadiusM: 300 }; }
}

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

// ── Feedback store ─────────────────────────────────────────────────────────

const FEEDBACK_KEY = 'mdb_feedback';

function loadFeedback() {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]'); } catch { return []; }
}
function saveFeedback(items) { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items)); }

function submitFeedback({ type, subject, message, rating, anonymous }) {
  const items = loadFeedback();
  items.push({
    id:          generateId(),
    userId:      currentUser.id,
    userName:    anonymous ? 'Anonymous' : currentUser.fullName,
    userTeam:    anonymous ? null : currentUser.team,
    type,
    subject:     subject.trim(),
    message:     message.trim(),
    rating:      rating || null,
    submittedAt: new Date().toISOString(),
    status:      'new',
  });
  saveFeedback(items);
}

// ── Separation rules (shared key with admin.js) ────────────────────────────

const SEPARATION_RULES_KEY = 'mdb_separation_rules';

function loadSeparationRules() {
  try { return JSON.parse(localStorage.getItem(SEPARATION_RULES_KEY) || '[]'); } catch { return []; }
}

// ── User profile preferences ───────────────────────────────────────────────

const PROFILES_KEY = 'mdb_profiles';

function loadProfilePrefs(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
    return all[userId] || {};
  } catch { return {}; }
}

function saveProfilePrefs(userId, prefs) {
  try {
    const all = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
    all[userId] = prefs;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
  } catch {}
}

function profileSetPref(key, value) {
  const prefs = loadProfilePrefs(currentUser.id);
  prefs[key] = value;
  saveProfilePrefs(currentUser.id, prefs);
  if (key === 'darkMode') {
    const isDark = document.documentElement.dataset.theme === 'dark';
    if (value !== isDark) cycleTheme();
  }
}

// ── Local bookings store (localStorage) ───────────────────────────────────

const BOOKINGS_KEY = 'findMyDesk_bookings';

function loadBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]'); } catch { return []; }
}

function saveBookings(bookings) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

// ── Delegates store ────────────────────────────────────────────────────────

const DELEGATES_KEY = 'mdb_delegates';

function loadDelegates() {
  try { return JSON.parse(localStorage.getItem(DELEGATES_KEY) || '{}'); } catch { return {}; }
}
function saveDelegates(d) { localStorage.setItem(DELEGATES_KEY, JSON.stringify(d)); }

function getMyDelegates() {
  const ids = loadDelegates()[currentUser.id] || [];
  return ids.map(id => allUsers.find(u => u.id === id)).filter(Boolean);
}

function getICanBookFor() {
  const d = loadDelegates();
  return allUsers.filter(u => u.id !== currentUser.id && (d[u.id] || []).includes(currentUser.id));
}

function addDelegate(delegateUserId) {
  const d = loadDelegates();
  if (!d[currentUser.id]) d[currentUser.id] = [];
  if (!d[currentUser.id].includes(delegateUserId)) d[currentUser.id].push(delegateUserId);
  saveDelegates(d);
}

function removeDelegate(delegateUserId) {
  const d = loadDelegates();
  if (d[currentUser.id]) d[currentUser.id] = d[currentUser.id].filter(id => id !== delegateUserId);
  saveDelegates(d);
}

function getBookingForUser() {
  if (!bookingForUserId) return currentUser;
  return allUsers.find(u => u.id === bookingForUserId) || currentUser;
}

function setBookingFor(userId) {
  bookingForUserId = userId;
  renderBookView();
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

function getBookings({ userId, date, upcoming, bookedBy } = {}) {
  let list = loadBookings();
  if (userId)   list = list.filter(b => b.userId === userId);
  if (date)     list = list.filter(b => b.date === date);
  if (bookedBy) list = list.filter(b => b.bookedByUserId === bookedBy);
  if (upcoming) list = list.filter(b => b.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  return list.map(enrichBooking);
}

function createBooking({ userId, deskId, date, slot, bookedByUserId }) {
  const bookings = loadBookings();
  const conflicts = bookings.filter(b => b.deskId === deskId && b.date === date);
  for (const c of conflicts) {
    if (slotsConflict(c.slot || 'full', slot)) throw new Error('That desk slot is already booked');
  }
  const booking = { id: generateId(), userId, deskId, date, slot, checkedIn: false, checkedInAt: null,
    ...(bookedByUserId && bookedByUserId !== userId ? { bookedByUserId } : {}) };
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
function today() {
  const n = new Date();
  return [n.getFullYear(), String(n.getMonth()+1).padStart(2,'0'), String(n.getDate()).padStart(2,'0')].join('-');
}

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
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
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

function loadAnchorDayConfig() {
  try {
    const s = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || 'null');
    return s?.anchorDayConfig || null;
  } catch { return null; }
}

function getEffectiveAnchorDays(user) {
  const config = loadAnchorDayConfig();
  const days = new Set(user.anchorDays || []);
  if (config) {
    (config.byTeam?.[user.team]     || []).forEach(d => days.add(d));
    (config.bySite?.[user.location] || []).forEach(d => days.add(d));
  }
  return [...days];
}

function isAnchorDay(user, dateStr) {
  const name = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parseDate(dateStr).getDay()];
  return getEffectiveAnchorDays(user).includes(name);
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
  // Extended prefs: favourite desks bonus
  if (typeof loadUserExtPrefs === 'function' && currentUser && user.id === currentUser.id) {
    const extPrefs = loadUserExtPrefs(user.id);
    if ((extPrefs.favoriteDeskIds || []).includes(desk.id)) s += 4;
  }
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

function toggleMobileSidebar(forceClose) {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('mobile-open');
  const newOpen = forceClose ? false : !isOpen;
  sidebar.classList.toggle('mobile-open', newOpen);
  if (overlay) overlay.classList.toggle('visible', newOpen);
}

const VIEW_LABELS = {
  dashboard: 'Dashboard', 'my-bookings': 'My Bookings', 'whos-in': "Who's In",
  floorplan: 'Floor Plan', feedback: 'Feedback', 'team-bookings': 'Team Bookings',
  declare: 'Declare', 'my-allocation': 'My Allocation', profile: 'Profile'
};

function navigate(view) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  const lbl = document.getElementById('mobile-top-view');
  if (lbl) lbl.textContent = VIEW_LABELS[view] || view;
  toggleMobileSidebar(true);
  if (view === 'dashboard') renderDashboard();
  else if (view === 'book') renderDeclareView(); // manual booking removed — redirect to declare
  else if (view === 'my-bookings') renderMyBookings();
  else if (view === 'whos-in') renderWhosIn();
  else if (view === 'floorplan') renderFloorPlan();
  else if (view === 'team-bookings') renderTeamBookings();
  else if (view === 'feedback') renderFeedback();
  else if (view === 'declare') renderDeclareView();
  else if (view === 'my-allocation') renderMyAllocationView();
  else if (view === 'profile') renderProfileView();
}

// ── Login ──────────────────────────────────────────────────────────────────

async function initLogin() {
  allUsers = await fetchUsers();
  allUsers.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function loginAs(user) {
  currentUser = user;
  autoBookTriggeredThisSession = false;
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
  requestNotificationPermission();
  startProximityWatch();
  setTimeout(checkAnchorDayNotifications, 1200);
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
  stopProximityWatch();
  autoBookTriggeredThisSession = false;
  anchorNotifFiredThisSession  = false;
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
      const office = loadOfficeSettings();
      const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, office.lat, office.lng);
      if (dist <= office.radiusM) {
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
  </div>
  ${typeof renderExtPrefsSection === 'function' ? renderExtPrefsSection() : ''}`;
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

  const walkInBanner = (() => {
    if (myTodayBookings.length > 0) return '';
    const todayAlloc_ = getAllocationForUser(currentUser.id, today());
    if (todayAlloc_ && todayAlloc_.status !== 'released') {
      return `<div class="checkin-banner checkin-banner-walkin">
        <span>You have a soft allocation for today: <strong>${todayAlloc_.deskId}</strong>. Tap when you arrive to confirm it.</span>
        <button class="btn btn-sm btn-primary" onclick="simulateBuildingScanIn()">I've arrived</button>
      </div>`;
    }
    if (!loadAutoBookAdminSettings().enableOnScan) return '';
    return `<div class="checkin-banner checkin-banner-walkin">
      <span>No desk allocated today. Tap <strong>I've arrived</strong> at the building entrance for instant walk-in assignment.</span>
      <button class="btn btn-sm btn-primary" onclick="simulateBuildingScanIn()">I've arrived</button>
    </div>`;
  })();

  // ── New allocation/declaration dashboard cards ─────────────────────────
  const myDecls = loadDeclarations().filter(d => {
    const mon = weekMonday(today());
    return d.userId === currentUser.id && d.date >= mon && d.date <= addDays(mon, 4);
  });
  const todayAlloc = getAllocationForUser(currentUser.id, today());
  const tomorrowAlloc = getAllocationForUser(currentUser.id, addDays(today(), 1));
  const noShowWarn = getNoShowWarning(currentUser.id);

  const declCard = myDecls.length === 0 ? `
    <div class="card one-col" style="margin-bottom:16px;border:1.5px solid #FDE68A;background:#FFFBEB">
      <div class="card-body" style="padding:14px 18px;display:flex;align-items:center;gap:12px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px;color:#92400E">No office days declared this week</div>
          <div style="font-size:12px;color:#B45309">Declare your office days so the engine can allocate your desk in advance — no rushing needed.</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="navigate('declare')">Declare</button>
      </div>
    </div>` : '';

  const allocCard = tomorrowAlloc && tomorrowAlloc.status === 'pending' ? `
    <div class="card one-col" style="margin-bottom:16px;border:1.5px solid #A7D7C5;background:#E6F2EE">
      <div class="card-body" style="padding:14px 18px;display:flex;align-items:center;gap:12px">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#006A4D" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px;color:#006A4D">Desk allocated for tomorrow: ${tomorrowAlloc.deskId}</div>
          <div style="font-size:12px;color:#16a34a">${(tomorrowAlloc.reasonFactors || []).join(' · ')} · Confirm by 8am to lock it</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="confirmAllocation('${tomorrowAlloc.id}')">Confirm</button>
        <button class="btn btn-sm btn-secondary" onclick="navigate('my-allocation')">View</button>
      </div>
    </div>` : '';

  const noShowCard = noShowWarn.show ? `
    <div class="card one-col" style="margin-bottom:16px;border:1.5px solid ${noShowWarn.level === 'penalty' ? 'var(--danger)' : '#FDE68A'};background:${noShowWarn.level === 'penalty' ? '#FEF2F2' : '#FFFBEB'}">
      <div class="card-body" style="padding:12px 18px;font-size:13px;color:${noShowWarn.level === 'penalty' ? 'var(--danger)' : '#92400E'}">
        &#9888;&#65039; ${noShowWarn.msg}
      </div>
    </div>` : '';
  // ── End new cards ───────────────────────────────────────────────────────


  container.innerHTML = `
    <div class="page-header">
      <h1>Good ${greetingTime()}, ${currentUser.fullName.split(' ')[0]}</h1>
      <p>${dayLabel} &mdash; ${currentUser.location} office</p>
    </div>

    ${checkinBanner}
    ${walkInBanner}
    ${declCard}
    ${allocCard}
    ${noShowCard}

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

    ${myTodayBookings.length > 0 ? `
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

  const bookableFor = getICanBookFor();
  const targetUser  = getBookingForUser();
  const allUpcoming = getBookings({ userId: targetUser.id, upcoming: true });
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

    ${bookableFor.length > 0 ? `
    <div class="delegate-bar">
      <span class="delegate-bar-label">Booking for</span>
      <div class="delegate-options">
        <button class="delegate-opt ${!bookingForUserId ? 'delegate-opt-active' : ''}" onclick="setBookingFor(null)">
          <div class="user-avatar" style="background:${avatarColor(currentUser.fullName)};width:22px;height:22px;font-size:9px;flex-shrink:0">${initials(currentUser.fullName)}</div>
          Me
        </button>
        ${bookableFor.map(u => `
          <button class="delegate-opt ${bookingForUserId === u.id ? 'delegate-opt-active' : ''}" onclick="setBookingFor('${u.id}')">
            <div class="user-avatar" style="background:${avatarColor(u.fullName)};width:22px;height:22px;font-size:9px;flex-shrink:0">${initials(u.fullName)}</div>
            ${u.fullName.split(' ')[0]}
          </button>
        `).join('')}
      </div>
    </div>
    ` : ''}

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
        ${myDeskSummary ? `<span class="pill pill-blue" style="margin-left:8px;font-size:12px">${targetUser.id !== currentUser.id ? targetUser.fullName.split(' ')[0] : 'You'}: ${myDeskSummary}</span>` : ''}
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
        ${nbDesks.map(desk => renderDeskCard(desk, myBookingsForDate, mySlots, selectedBookDate, targetUser)).join('')}
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

function renderDeskCard(desk, myBookingsForDate, mySlots, date, bookingUser) {
  const user = bookingUser || currentUser;
  const myDeskBooking = myBookingsForDate.find(b => b.deskId === desk.id);
  const isMyDesk = !!myDeskBooking;

  const canBookAm = desk.amAvailable && !mySlots.some(s => slotsConflict(s, 'am'));
  const canBookPm = desk.pmAvailable && !mySlots.some(s => slotsConflict(s, 'pm'));
  const canBookFull = desk.amAvailable && desk.pmAvailable && mySlots.length === 0;
  const canBookAnything = canBookAm || canBookPm;
  const isFuture = date >= today();

  const score = scoreDesk(desk, user);
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
  const target = getBookingForUser();
  const forLine = target.id !== currentUser.id
    ? `<br><span style="font-size:13px;color:var(--primary)">Booking on behalf of <strong>${target.fullName}</strong></span>` : '';
  showModal(`
    <div class="modal-title">Confirm Booking</div>
    <div class="modal-desc">
      Book desk <strong>${deskId}</strong> &mdash; <strong>${slotLabel(slot)}</strong><br>
      on <strong>${displayDate(date)}</strong>${forLine}
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
  const target = getBookingForUser();
  try {
    createBooking({ userId: target.id, deskId, date, slot,
      ...(target.id !== currentUser.id ? { bookedByUserId: currentUser.id } : {}) });
    const forStr = target.id !== currentUser.id ? ` for ${target.fullName}` : '';
    toast(`${deskId} booked${forStr} — ${slotLabel(slot)} on ${displayShortDate(date)}`, 'success');
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

  const bookings        = getBookings({ userId: currentUser.id, upcoming: true });
  const madeForOthers   = getBookings({ bookedBy: currentUser.id, upcoming: true })
    .filter(b => b.userId !== currentUser.id);

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
        <p>Your desk will be allocated automatically the night before you declare an office day.</p>
        <button class="btn btn-primary" onclick="navigate('declare')">Declare office days</button>
      </div>
    ` : `<div class="booking-list">${combined.map(item =>
        item.type === 'booking'
          ? renderBookingItem(item.data, true)
          : renderSoftHoldItem(item.data)
      ).join('')}</div>`}

    ${madeForOthers.length > 0 ? `
    <div style="margin-top:28px">
      <div class="page-header" style="margin-bottom:12px">
        <h2 style="font-size:16px;font-weight:700;margin:0">Booked on behalf of others</h2>
        <p style="margin:2px 0 0">Desks you've reserved as a delegate</p>
      </div>
      <div class="booking-list">${madeForOthers.map(b => renderBookingItem(b, true)).join('')}</div>
    </div>
    ` : ''}
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
          ${booking.userId !== currentUser.id ? `
            <div class="booking-delegate-tag">
              <div class="user-avatar" style="background:${avatarColor(booking.user?.fullName||'?')};width:16px;height:16px;font-size:7px;flex-shrink:0">${initials(booking.user?.fullName||'?')}</div>
              For: ${booking.user?.fullName || 'Unknown'}
            </div>` : booking.bookedByUserId ? `
            <div class="booking-delegate-tag">Booked by ${allUsers.find(u => u.id === booking.bookedByUserId)?.fullName || 'a delegate'}</div>` : ''}
          ${checkinHtml ? `<div style="margin-top:6px">${checkinHtml}</div>` : ''}
        </div>
      </div>
      ${showActions ? `
        <div class="booking-actions">
          ${isToday_ && !booking.checkedIn
            ? `<button class="btn btn-sm btn-primary" onclick="checkInBooking('${booking.id}')">Check In</button>`
            : ''}
          <button class="btn btn-sm btn-secondary" onclick="showManageBookingModal('${booking.id}')">Manage</button>
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
    toast(`Booking cancelled — ${label} is back in the pool`, 'info');
    renderMyBookings();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Friction-Free Change ───────────────────────────────────────────────────

function showManageBookingModal(bookingId) {
  const allMine = [
    ...getBookings({ userId: currentUser.id, upcoming: true }),
    ...getBookings({ bookedBy: currentUser.id, upcoming: true }),
  ];
  const booking = allMine.find(b => b.id === bookingId);
  if (!booking) return;

  const slot    = booking.slot || 'full';
  const deskId  = booking.desk?.id || booking.deskId;
  const dateStr = booking.date;
  const isToday_ = dateStr === today();

  const shortenHtml = slot === 'full' ? `
    <div class="manage-section">
      <div class="manage-section-title">Shorten</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-secondary" onclick="shortenBooking('${bookingId}','am')">
          <div style="font-weight:600">Keep Morning</div>
          <div style="font-size:11px;color:var(--text-muted)">Free up PM slot</div>
        </button>
        <button class="btn btn-secondary" onclick="shortenBooking('${bookingId}','pm')">
          <div style="font-weight:600">Keep Afternoon</div>
          <div style="font-size:11px;color:var(--text-muted)">Free up AM slot</div>
        </button>
      </div>
    </div>` : '';

  const teammates = allUsers.filter(u =>
    u.team === currentUser.team &&
    u.id !== currentUser.id &&
    u.location === currentUser.location
  );

  const handoverHtml = teammates.length > 0 ? `
    <div class="manage-section">
      <div class="manage-section-title">Hand over to teammate</div>
      <div class="handover-list">
        ${teammates.map(u => `
          <button class="handover-btn" onclick="doHandOver('${bookingId}','${u.id}')">
            <div class="user-avatar" style="background:${avatarColor(u.fullName)};width:30px;height:30px;font-size:11px;flex-shrink:0">${initials(u.fullName)}</div>
            <div style="min-width:0">
              <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.fullName}</div>
              <div style="font-size:11.5px;color:var(--text-muted)">${u.role}</div>
            </div>
          </button>`).join('')}
      </div>
    </div>` : '';

  showModal(`
    <div class="modal-title">Manage Booking</div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:16px">
      <div style="font-weight:700;font-size:15px;color:var(--text)">${deskId}</div>
      <div style="font-size:12.5px;color:var(--text-secondary);margin-top:2px">${displayDate(dateStr)} &middot; ${slotLabel(slot)}</div>
    </div>
    ${shortenHtml}
    <div class="manage-section">
      <div class="manage-section-title">Swap desk</div>
      <button class="btn btn-secondary btn-full" onclick="showSwapDeskModal('${bookingId}')">Find a different desk &rarr;</button>
    </div>
    ${handoverHtml}
    <div class="manage-section" style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px">
      <button class="btn btn-full" style="background:var(--danger-light);color:var(--danger);border:1.5px solid var(--danger)"
        onclick="promptCancelFromManage('${bookingId}','${deskId}','${dateStr}')">Cancel booking</button>
    </div>
    <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="hideModal()">Close</button>
  `);
}

function shortenBooking(bookingId, keepSlot) {
  hideModal();
  const bookings = loadBookings();
  const b = bookings.find(b => b.id === bookingId);
  if (!b) { toast('Booking not found', 'error'); return; }
  const freedLabel = keepSlot === 'am' ? 'PM' : 'AM';
  b.slot = keepSlot;
  saveBookings(bookings);
  toast(`Booking shortened — ${freedLabel} slot is back in the pool`, 'success');
  renderMyBookings();
}

function showSwapDeskModal(bookingId) {
  const booking = getBookings({ userId: currentUser.id, upcoming: true }).find(b => b.id === bookingId)
    || getBookings({ bookedBy: currentUser.id, upcoming: true }).find(b => b.id === bookingId);
  if (!booking) return;

  const slot = booking.slot || 'full';
  const date = booking.date;

  const available = getDesks({ date }).filter(d => {
    if (d.id === booking.deskId) return false;
    return slot === 'am' ? d.amAvailable : slot === 'pm' ? d.pmAvailable : d.available;
  });

  const scored = available
    .map(d => ({ ...d, score: scoreDesk(d, currentUser) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (scored.length === 0) {
    toast('No other desks available for that date and slot', 'info');
    return;
  }

  showModal(`
    <div class="modal-title">Swap Desk</div>
    <div class="modal-desc" style="margin-bottom:12px">Pick a replacement for ${displayShortDate(date)} &middot; ${slotLabel(slot)}</div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto">
      ${scored.map(d => `
        <button class="swap-desk-btn" onclick="doSwapDesk('${bookingId}','${d.id}')">
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:700;font-size:14px">${d.id}</span>
              <span class="desk-neighbourhood ${nbClass(d.neighbourhood)}">${d.neighbourhood}</span>
            </div>
            <span class="pill pill-grey">${d.floor === 'ground' ? 'Ground' : 'First'}</span>
          </div>
          ${d.features.length > 0 ? `<div class="desk-features" style="margin-top:5px">${d.features.map(f=>`<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`).join('')}</div>` : ''}
        </button>`).join('')}
    </div>
    <button class="btn btn-ghost btn-full" style="margin-top:12px" onclick="showManageBookingModal('${bookingId}')">&larr; Back</button>
  `);
}

function doSwapDesk(bookingId, newDeskId) {
  hideModal();
  const raw = loadBookings();
  const b   = raw.find(b => b.id === bookingId);
  if (!b) { toast('Booking not found', 'error'); return; }
  const { userId, deskId: oldDeskId, date, slot } = { ...b, slot: b.slot || 'full' };
  try {
    deleteBooking(bookingId);
    createBooking({ userId, deskId: newDeskId, date, slot });
    toast(`Swapped to ${newDeskId} — ${oldDeskId} is back in the pool`, 'success');
    renderMyBookings();
  } catch (e) {
    try { createBooking({ userId, deskId: oldDeskId, date, slot }); } catch {}
    toast(e.message || 'Swap failed — original booking restored', 'error');
    renderMyBookings();
  }
}

function doHandOver(bookingId, targetUserId) {
  hideModal();
  const raw = loadBookings();
  const b   = raw.find(b => b.id === bookingId);
  if (!b) { toast('Booking not found', 'error'); return; }
  const target = allUsers.find(u => u.id === targetUserId);
  if (!target) return;
  const slot = b.slot || 'full';

  const conflicts = getBookings({ userId: targetUserId, date: b.date });
  if (conflicts.some(tb => slotsConflict(tb.slot || 'full', slot))) {
    toast(`${target.fullName} already has a ${slotShort(slot)} booking that day`, 'error');
    return;
  }

  try {
    deleteBooking(bookingId);
    createBooking({ userId: targetUserId, deskId: b.deskId, date: b.date, slot, bookedByUserId: currentUser.id });
    sendPerchNotification(
      'Desk handed to you',
      `${currentUser.fullName} passed desk ${b.deskId} to you for ${displayShortDate(b.date)}`
    );
    toast(`Desk ${b.deskId} handed to ${target.fullName.split(' ')[0]}`, 'success');
    renderMyBookings();
  } catch (e) {
    try { createBooking({ userId: currentUser.id, deskId: b.deskId, date: b.date, slot }); } catch {}
    toast(e.message || 'Hand-over failed — booking restored', 'error');
    renderMyBookings();
  }
}

function promptCancelFromManage(bookingId, deskId, date) {
  showModal(`
    <div class="modal-title">Cancel Booking</div>
    <div class="modal-desc">
      Cancel your booking for desk <strong>${deskId}</strong> on <strong>${displayDate(date)}</strong>?<br>
      <span style="font-size:12.5px;color:var(--text-muted)">The slot returns to the pool immediately.</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="showManageBookingModal('${bookingId}')">&larr; Back</button>
      <button class="btn btn-danger" onclick="doCancel('${bookingId}','${deskId}')">Yes, cancel it</button>
    </div>
  `);
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

function loadFloorPlans() {
  const defaults = [
    { id:'fp-ground', name:'Ground Floor', building:'London HQ', floorKey:'ground', assignedTeams:[] },
    { id:'fp-first',  name:'First Floor',  building:'London HQ', floorKey:'first',  assignedTeams:[] },
  ];
  try {
    const s = JSON.parse(localStorage.getItem('mdb_admin_settings') || 'null');
    if (s?.floorPlans?.length) return s.floorPlans;
  } catch { /* fall through */ }
  return defaults;
}

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

function generateFloorPlanSVG(floorKey) {
  const isFirst = floorKey === 'first';
  const zones = [
    { label: 'Window Bank',        x: 1,    y: 5,  w: 19,   h: 29,  fill: '#dbeafe', stroke: '#93c5fd' },
    { label: 'Quiet Zone',         x: 70,   y: 5,  w: 28.5, h: 27,  fill: '#f0fdf4', stroke: '#86efac' },
    { label: 'Core Desk Area',     x: 68,   y: 44, w: 30.5, h: 24,  fill: '#fef9c3', stroke: '#fde047' },
    { label: 'Collaboration Zone', x: 1,    y: 44, w: 21,   h: 24,  fill: '#fdf4ff', stroke: '#d8b4fe' },
  ];

  const zoneRects = zones.map(z => `
    <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="1.5"
          fill="${z.fill}" stroke="${z.stroke}" stroke-width="0.5"/>
    <text x="${z.x + z.w / 2}" y="${z.y + 3.5}" text-anchor="middle"
          font-size="2.8" fill="#64748b" font-family="system-ui,sans-serif">${z.label}</text>`).join('');

  const corridorLines = `
    <line x1="22" y1="2" x2="22" y2="98" stroke="#e2e8f0" stroke-width="0.4"/>
    <line x1="67" y1="2" x2="67" y2="98" stroke="#e2e8f0" stroke-width="0.4"/>
    <line x1="1" y1="36" x2="99" y2="36" stroke="#e2e8f0" stroke-width="0.4"/>
    <rect x="1" y="1" width="98" height="98" rx="2" fill="none" stroke="#cbd5e1" stroke-width="0.6"/>`;

  const floorLabel = `<text x="50" y="99" text-anchor="middle" font-size="2.2" fill="#94a3b8"
    font-family="system-ui,sans-serif">${isFirst ? 'First Floor' : 'Ground Floor'} — London HQ</text>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="background:#f8fafc">${corridorLines}${zoneRects}${floorLabel}</svg>`
  )}`;
}

function renderFloorPlan() {
  if (!floorPlanDate) floorPlanDate = today();
  const container = document.getElementById('view-floorplan');

  const plans = loadFloorPlans();
  if (!plans.find(p => p.floorKey === floorPlanFloor)) {
    floorPlanFloor = plans[0]?.floorKey || 'ground';
  }
  const activePlan = plans.find(p => p.floorKey === floorPlanFloor) || plans[0];
  const floorKey   = activePlan?.floorKey || floorPlanFloor;

  const bookings     = getBookings({ date: floorPlanDate });
  const floorBookings = bookings.filter(b => b.desk?.floor === floorKey);
  const floorDesks   = DESKS.filter(d => d.floor === floorKey);
  const available    = floorDesks.length - floorBookings.length;

  // Always load from the floorplans folder — imageUrl in settings only used for
  // admin-uploaded overrides (base64). For path-based URLs always rebuild from floorKey.
  const storedUrl = activePlan?.imageUrl || '';
  const imgSrc = storedUrl.startsWith('data:') ? storedUrl : `/floorplans/${floorKey}.png`;

  const tabs = plans.map(p => `
    <button class="floor-tab${floorKey === p.floorKey ? ' active' : ''}"
            onclick="fpSetFloor('${p.floorKey}')">
      ${p.name}${p.building !== plans[0]?.building ? ` <span style="font-size:10px;opacity:0.7">(${p.building})</span>` : ''}
    </button>`).join('');

  const bookingRows = floorBookings.length
    ? floorBookings.map(b => {
        const isMe = b.userId === currentUser.id;
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                      background:${isMe ? 'var(--primary-bg,#f0fdf4)' : 'var(--card-bg,#fff)'};
                      border:1px solid ${isMe ? 'var(--primary)' : 'var(--border)'};
                      border-radius:8px;cursor:pointer;transition:box-shadow 0.15s"
               onmouseenter="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'"
               onmouseleave="this.style.boxShadow=''"
               onclick="fpShowDetail('${b.deskId}','${floorPlanDate}')">
            <div class="fp-avatar" style="background:${avatarColor(b.user.fullName)}">${initials(b.user.fullName)}</div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${b.user.fullName}${isMe ? ' <span style="color:var(--primary);font-weight:500">(you)</span>' : ''}</div>
              <div style="font-size:11px;color:var(--text-secondary)">${b.deskId}${b.desk?.neighbourhood ? ' · ' + b.desk.neighbourhood : ''}</div>
            </div>
          </div>`;
      }).join('')
    : `<p style="color:var(--text-secondary);font-size:14px;padding:8px 0">No desks booked on this floor for ${floorPlanDate}.</p>`;

  container.innerHTML = `
    <div class="page-header">
      <h1>Floor Plan</h1>
      <p>See who's sitting where</p>
    </div>

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div class="floor-tabs" style="margin-bottom:0">${tabs}</div>
      <label style="font-size:13px;font-weight:500;color:var(--text-secondary)">Date:</label>
      <input type="date" value="${floorPlanDate}" onchange="fpSetDate(this.value)">
      <span style="margin-left:auto;font-size:12px;color:var(--text-secondary)">
        ${floorBookings.length} booked &nbsp;·&nbsp; ${available} available
      </span>
    </div>

    <div class="fp-wrap">
      <img src="${imgSrc}" class="fp-img" alt="${activePlan?.name || 'Floor plan'}"
           onerror="this.onerror=null;this.src=generateFloorPlanSVG('${floorKey}')">
      ${floorDesks.map(desk => {
        const coords = DESK_COORDS[desk.id];
        if (!coords) return '';
        const booking = floorBookings.find(b => b.deskId === desk.id && (!b.slot || b.slot === 'full'));
        const amBook  = floorBookings.find(b => b.deskId === desk.id && b.slot === 'am');
        const pmBook  = floorBookings.find(b => b.deskId === desk.id && b.slot === 'pm');
        const anyBook = booking || amBook || pmBook;
        const isMe    = anyBook?.userId === currentUser.id || amBook?.userId === currentUser.id || pmBook?.userId === currentUser.id;
        const mainBook = booking || amBook || pmBook;
        if (mainBook?.user) {
          const u = mainBook.user;
          return `<div class="fp-marker fp-marker-booked${isMe ? ' fp-marker-me' : ''}"
               style="left:${coords.x}%;top:${coords.y}%"
               onclick="fpShowDetail('${desk.id}','${floorPlanDate}')">
            <div class="fp-avatar" style="background:${avatarColor(u.fullName)}">${initials(u.fullName)}</div>
            <div class="fp-label">${desk.id}</div>
          </div>`;
        }
        return `<div class="fp-marker fp-marker-empty"
             style="left:${coords.x}%;top:${coords.y}%"
             onclick="fpShowDetail('${desk.id}','${floorPlanDate}')">
          <div class="fp-dot"></div>
          <div class="fp-label fp-label-desk">${desk.id}</div>
        </div>`;
      }).join('')}
    </div>

    <div style="margin-top:20px">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;
                  color:var(--text-secondary);margin-bottom:10px">
        ${activePlan?.name || 'Floor'} — bookings for ${floorPlanDate}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">
        ${bookingRows}
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
  const desk     = DESKS.find(d => d.id === deskId);
  const bookings = getBookings({ date }).filter(b => b.deskId === deskId);
  const fullBook = bookings.find(b => !b.slot || b.slot === 'full');
  const amBook   = bookings.find(b => b.slot === 'am');
  const pmBook   = bookings.find(b => b.slot === 'pm');

  const canBookFull = !fullBook && !amBook && !pmBook;
  const canBookAm   = !fullBook && !amBook;
  const canBookPm   = !fullBook && !pmBook;

  const myFull = fullBook?.userId === currentUser.id ? fullBook : null;
  const myAm   = amBook?.userId   === currentUser.id ? amBook   : null;
  const myPm   = pmBook?.userId   === currentUser.id ? pmBook   : null;

  const bookingRows = [fullBook, amBook, pmBook].filter(Boolean).map(b => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg);border-radius:var(--radius);margin-bottom:8px">
      <div class="user-avatar" style="background:${avatarColor(b.user.fullName)};width:32px;height:32px;font-size:13px">${initials(b.user.fullName)}</div>
      <div>
        <div style="font-weight:600;font-size:13px">${b.user.fullName}${b.userId === currentUser.id ? ' <span style="color:var(--primary)">(you)</span>' : ''}</div>
        <div style="font-size:11px;color:var(--text-secondary)">${b.user.role} · <span class="slot-badge slot-${b.slot||'full'}">${slotLabel(b.slot||'full')}</span></div>
      </div>
    </div>`).join('');

  const bookBtns = [
    canBookFull ? `<button class="btn btn-primary btn-sm" onclick="hideModal();confirmBook('${deskId}','${date}','full')">Book Full Day</button>` : '',
    !canBookFull && canBookAm ? `<button class="btn btn-primary btn-sm" onclick="hideModal();confirmBook('${deskId}','${date}','am')">Book AM</button>` : '',
    !canBookFull && canBookPm ? `<button class="btn btn-secondary btn-sm" onclick="hideModal();confirmBook('${deskId}','${date}','pm')">Book PM</button>` : '',
    myFull ? `<button class="btn btn-sm" style="border:1px solid var(--danger);color:var(--danger)" onclick="hideModal();fpCancelBooking('${myFull.id}')">Cancel My Booking</button>` : '',
    myAm   ? `<button class="btn btn-sm" style="border:1px solid var(--danger);color:var(--danger)" onclick="hideModal();fpCancelBooking('${myAm.id}')">Cancel My AM</button>` : '',
    myPm   ? `<button class="btn btn-sm" style="border:1px solid var(--danger);color:var(--danger)" onclick="hideModal();fpCancelBooking('${myPm.id}')">Cancel My PM</button>` : '',
  ].filter(Boolean).join('');

  showModal(`
    <div class="modal-title">${deskId}</div>
    <div style="margin-bottom:12px">
      <span class="desk-neighbourhood nb-${desk.neighbourhood.replace(/\s+/g,'')}">${desk.neighbourhood}</span>
      <span style="margin-left:8px;font-size:12px;color:var(--text-secondary)">${desk.floor === 'ground' ? 'Ground' : 'First'} Floor</span>
    </div>
    <div class="desk-features" style="margin-bottom:14px">
      ${desk.features.map(f => `<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`).join('') || '<span style="color:var(--text-muted);font-size:12px">Standard desk</span>'}
    </div>
    ${bookingRows || `<div style="padding:10px 12px;background:var(--primary-light);border-radius:var(--radius);margin-bottom:12px;color:var(--primary);font-size:13px;font-weight:500">Available on ${displayShortDate(date)}</div>`}
    <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn-secondary" onclick="hideModal()">Close</button>
      ${bookBtns}
    </div>
  `);
}

function fpCancelBooking(bookingId) {
  deleteBooking(bookingId);
  toast('Booking cancelled', 'info');
  renderFloorPlan();
}

// ── Team Bookings ──────────────────────────────────────────────────────────

// ── Team Booking Requests ──────────────────────────────────────────────────
// Requests flow: pending → approved (desks booked) | cancelled
// In production, approval would come from a Workplace & Facilities portal.
// In this prototype, managers can simulate approval for demo purposes.

const TEAM_REQUESTS_KEY = 'perch_team_requests';

function loadTeamRequests() {
  try { return JSON.parse(localStorage.getItem(TEAM_REQUESTS_KEY) || '[]'); } catch { return []; }
}
function saveTeamRequests(r) { localStorage.setItem(TEAM_REQUESTS_KEY, JSON.stringify(r)); }

function getTeamRequestForDate(date) {
  return loadTeamRequests().find(r => r.date === date && r.managerId === currentUser.id && r.status !== 'cancelled') || null;
}

function generateApprovalRef() {
  return `WP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function getMonday(dateStr) {
  const d = parseDate(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return toDateStr(d);
}

async function renderTeamBookings() {
  if (!currentUser?.isLineManager) return;
  const container = document.getElementById('view-team-bookings');

  const weekStart = getMonday(today());
  const weeks = Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 5 }, (_, d) => addDays(weekStart, w * 7 + d))
  );

  const firstDate = parseDate(weeks[0][0]);
  const lastDate  = parseDate(weeks[3][4]);
  const monthLabel = firstDate.getMonth() === lastDate.getMonth()
    ? firstDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : `${firstDate.toLocaleDateString('en-GB', { month: 'long' })} – ${lastDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

  const calendarRows = weeks.map(days => {
    const cells = days.map(date => {
      const isPast   = date < today();
      const isToday_ = date === today();
      const req      = getTeamRequestForDate(date);
      const d        = parseDate(date);
      const dayNum   = d.getDate();
      const monthStr = d.toLocaleDateString('en-GB', { month: 'short' });

      let cls = 'tb-cal-cell';
      if (isPast)                       cls += ' tb-cal-past';
      if (isToday_)                     cls += ' tb-cal-today';
      if (req?.status === 'approved')   cls += ' tb-cal-booked';
      else if (req?.status === 'pending') cls += ' tb-cal-meeting';

      const dateLabel = `
        <div class="tb-cal-date-label">
          <span class="tb-cal-day-num${isToday_ ? ' tb-cal-today-num' : ''}">${dayNum}</span>
          <span class="tb-cal-mon-str">${monthStr}</span>
        </div>`;

      let body = '';

      if (req?.status === 'approved') {
        const names = req.deskSlots
          .map(s => allUsers.find(u => u.id === s.userId)?.fullName.split(' ')[0] || '?')
          .join(', ');
        body = `
          <div class="tb-cal-meeting-pill">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
            ${req.title}
          </div>
          <div class="tb-cal-ref">${req.approvalRef}</div>
          <div class="tb-cal-names">${names}</div>
          <button class="tb-cal-action tb-cal-action-cancel" onclick="promptCancelTeamRequest('${req.id}')">Cancel</button>`;

      } else if (req?.status === 'pending') {
        body = `
          <div class="tb-cal-meeting-pill tb-cal-pill-pending">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            ${req.title}
          </div>
          <div class="tb-cal-avail" style="color:#92400E">Awaiting approval</div>
          <div style="display:flex;gap:4px;margin-top:auto">
            <button class="tb-cal-action tb-cal-action-approve" onclick="approveTeamRequest('${req.id}')">Approve ✓</button>
            <button class="tb-cal-action tb-cal-action-withdraw" onclick="withdrawTeamRequest('${req.id}')">Withdraw</button>
          </div>`;

      } else if (!isPast) {
        body = `<button class="tb-cal-action tb-cal-action-request" onclick="showRequestTeamModal('${date}')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Request desks
        </button>`;
      }

      return `<div class="${cls}">${dateLabel}${body}</div>`;
    }).join('');

    return `<div class="tb-cal-row">${cells}</div>`;
  }).join('');

  const activePBs = loadPowerBlocks().filter(pb =>
    pb.managerId === currentUser.id && pb.status !== 'cancelled' && pb.date >= today()
  ).sort((a, b) => a.date.localeCompare(b.date));

  const powerBlocksSection = `
    <div class="card one-col" style="margin-bottom:20px">
      <div class="card-header">
        <span class="card-title">Team Days (Power Blocks)</span>
        <button class="btn btn-sm btn-primary" onclick="showCreateTeamDayModal('${addDays(today(), 7)}')">+ Create Team Day</button>
      </div>
      <div class="card-body" style="padding:${activePBs.length === 0 ? '16px 18px' : '0'}">
        ${activePBs.length === 0 ? `
          <p style="font-size:13px;color:var(--text-secondary);margin:0">No team days scheduled. Create one to reserve a zone for your whole team.</p>
        ` : `
          <table class="admin-table">
            <thead><tr><th>Title</th><th>Date</th><th>Zone</th><th>Members</th><th>Action</th></tr></thead>
            <tbody>
              ${activePBs.map(pb => `
                <tr>
                  <td><strong>${pb.title}</strong></td>
                  <td>${parseDate(pb.date).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</td>
                  <td><span class="pill pill-blue" style="font-size:11px">${pb.zone}</span></td>
                  <td>${pb.memberIds.length} member${pb.memberIds.length !== 1 ? 's' : ''}</td>
                  <td><button class="btn btn-sm btn-secondary" style="color:var(--danger);border-color:var(--danger)" onclick="cancelPowerBlock('${pb.id}')">Cancel</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="page-header">
      <h1>Team Bookings</h1>
      <p>Request desks for your team on any day up to 4 weeks ahead — each request is sent for Workplace &amp; Facilities approval</p>
    </div>
    ${powerBlocksSection}
    <div class="tb-legend">
      <span class="tb-legend-item"><span class="tb-legend-dot tb-legend-dot-empty"></span>Available — click to request</span>
      <span class="tb-legend-item"><span class="tb-legend-dot tb-legend-dot-meeting"></span>Pending approval</span>
      <span class="tb-legend-item"><span class="tb-legend-dot tb-legend-dot-booked"></span>Approved &amp; booked</span>
    </div>
    <div class="tb-calendar">
      <div class="tb-cal-header-row">
        <div class="tb-cal-hcell">Mon</div>
        <div class="tb-cal-hcell">Tue</div>
        <div class="tb-cal-hcell">Wed</div>
        <div class="tb-cal-hcell">Thu</div>
        <div class="tb-cal-hcell">Fri</div>
      </div>
      <div class="tb-cal-month-label">${monthLabel}</div>
      ${calendarRows}
    </div>
  `;
}

function showRequestTeamModal(date) {
  const reports = (currentUser.directReports || [])
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean);

  const d = parseDate(date);
  const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const reportRows = reports.map(u => `
    <label class="tb-member-row">
      <input type="checkbox" class="tb-member-cb" value="${u.id}" checked>
      <div class="user-avatar" style="background:${avatarColor(u.fullName)};width:30px;height:30px;font-size:12px;flex-shrink:0">${initials(u.fullName)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px">${u.fullName}</div>
        <div style="font-size:11.5px;color:var(--text-secondary)">${u.role} · ${u.team}</div>
      </div>
    </label>`).join('');

  showModal(`
    <div class="modal-title">Request Team Desks</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">${dateStr}</div>
    <div style="margin-bottom:14px">
      <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:5px">Meeting title</label>
      <input id="tb-req-title" type="text" placeholder="e.g. Data Team Sprint Review"
        style="width:100%;border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;font-size:13px;font-family:inherit;outline:none">
    </div>
    <div style="display:flex;gap:12px;margin-bottom:14px">
      <div style="flex:1">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:5px">Floor</label>
        <select id="tb-req-floor" style="width:100%;border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;font-size:13px;font-family:inherit;outline:none;background:var(--bg)">
          <option value="ground">Ground Floor</option>
          <option value="first">First Floor</option>
        </select>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">Team members</div>
    <div id="tb-member-list" style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;margin-bottom:14px">
      ${reportRows}
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:5px">Notes <span style="font-weight:400;text-transform:none">(optional)</span></label>
      <textarea id="tb-req-notes" rows="2" placeholder="Reason for the booking, any special requirements…"
        style="width:100%;border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;font-size:13px;font-family:inherit;outline:none;resize:none"></textarea>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
      Your request will be sent to Workplace &amp; Facilities for approval. Desks are reserved once approved.
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitTeamRequest('${date}')">Submit request</button>
    </div>
  `);
}

function submitTeamRequest(date) {
  const title   = document.getElementById('tb-req-title').value.trim();
  const floor   = document.getElementById('tb-req-floor').value;
  const notes   = document.getElementById('tb-req-notes').value.trim();
  const members = [...document.querySelectorAll('.tb-member-cb:checked')].map(cb => cb.value);

  if (!title)            { toast('Please enter a meeting title', 'error'); return; }
  if (members.length === 0) { toast('Select at least one team member', 'error'); return; }

  const req = {
    id: generateId(),
    title,
    date,
    floor,
    notes,
    memberIds: members,
    status: 'pending',
    managerId: currentUser.id,
    approvalRef: null,
    deskSlots: [],
    createdAt: new Date().toISOString(),
    approvedAt: null,
  };

  const all = loadTeamRequests();
  all.push(req);
  saveTeamRequests(all);

  hideModal();
  toast('Request submitted — awaiting Workplace & Facilities approval', 'success');
  renderTeamBookings();
}

function approveTeamRequest(requestId) {
  const all = loadTeamRequests();
  const req = all.find(r => r.id === requestId);
  if (!req) return;

  const availableDesks = getDesks({ floor: req.floor, date: req.date })
    .filter(d => d.available && !getDeskSoftHold(d.id, req.date))
    .sort((a, b) => scoreDesk(b, currentUser) - scoreDesk(a, currentUser));

  if (availableDesks.length < req.memberIds.length) {
    toast(`Only ${availableDesks.length} desks available on that floor — edit request to reduce team size`, 'error');
    return;
  }

  const deskSlots = [];
  req.memberIds.forEach((userId, i) => {
    const desk = availableDesks[i];
    try {
      const booking = createBooking({ userId, deskId: desk.id, date: req.date, slot: 'full' });
      deskSlots.push({ userId, deskId: desk.id, bookingId: booking.id });
    } catch {}
  });

  req.status      = 'approved';
  req.approvalRef = generateApprovalRef();
  req.deskSlots   = deskSlots;
  req.approvedAt  = new Date().toISOString();
  saveTeamRequests(all);

  toast(`Approved — ${deskSlots.length} desk${deskSlots.length !== 1 ? 's' : ''} booked · Ref ${req.approvalRef}`, 'success');
  renderTeamBookings();
}

function withdrawTeamRequest(requestId) {
  const all = loadTeamRequests();
  const req = all.find(r => r.id === requestId);
  if (!req) return;
  req.status = 'cancelled';
  saveTeamRequests(all);
  toast('Request withdrawn', 'info');
  renderTeamBookings();
}

function promptCancelTeamRequest(requestId) {
  const req = loadTeamRequests().find(r => r.id === requestId);
  if (!req) return;
  showModal(`
    <div class="modal-title">Cancel Team Booking</div>
    <div class="modal-desc">
      Cancel all ${req.deskSlots.length} desk booking${req.deskSlots.length !== 1 ? 's' : ''} for <strong>${req.title}</strong>?
      <br><span style="font-size:12.5px;color:var(--text-muted)">Desks will be released back to the pool.</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Keep bookings</button>
      <button class="btn btn-danger" onclick="confirmCancelTeamRequest('${requestId}')">Cancel all desks</button>
    </div>
  `);
}

function confirmCancelTeamRequest(requestId) {
  const all = loadTeamRequests();
  const req = all.find(r => r.id === requestId);
  if (req) {
    req.deskSlots.forEach(s => { try { deleteBooking(s.bookingId); } catch {} });
    req.status = 'cancelled';
    saveTeamRequests(all);
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
  el.innerHTML = chips.map(c => {
    const safe = c.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return `<button class="agent-chip" data-chip="${safe}" onclick="agentChipClick(this.dataset.chip)">${c}</button>`;
  }).join('');
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
  return { html: 'Where would you like to go? I can open Dashboard, Declare, My Allocation, My Bookings, Who\'s In, or Floor Plan.', chips: ['Dashboard', 'Declare', 'My Allocation', 'Floor Plan'] };
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

// ── Delegate management UI ─────────────────────────────────────────────────

function showDelegatesModal() {
  renderDelegatesModal();
}

function renderDelegatesModal() {
  const myDelegates = getMyDelegates();
  const iCanBookFor  = getICanBookFor();
  const available    = allUsers.filter(u => u.id !== currentUser.id && !myDelegates.find(d => d.id === u.id));

  showModal(`
    <div class="modal-title">Delegate Access</div>
    <div class="modal-desc">Allow colleagues to book desks on your behalf.</div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">
      People who can book for you
    </div>
    ${myDelegates.length === 0
      ? `<p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">No delegates added yet.</p>`
      : myDelegates.map(u => `
          <div class="delegate-modal-row">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="user-avatar" style="background:${avatarColor(u.fullName)};width:28px;height:28px;font-size:11px;flex-shrink:0">${initials(u.fullName)}</div>
              <div>
                <div style="font-size:13px;font-weight:500">${u.fullName}</div>
                <div style="font-size:12px;color:var(--text-muted)">${u.role} &middot; ${u.team}</div>
              </div>
            </div>
            <button class="btn btn-sm btn-secondary" style="color:var(--danger);border-color:var(--danger)"
              onclick="removeDelegateAndRefresh('${u.id}')">Remove</button>
          </div>`).join('')}

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin:16px 0 8px">
      Add a delegate
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <select id="delegate-select" style="flex:1;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius);font-size:13px;font-family:inherit;background:white;color:var(--text)">
        <option value="">Select a colleague…</option>
        ${available.map(u => `<option value="${u.id}">${u.fullName} — ${u.team}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="addDelegateAndRefresh()">Add</button>
    </div>

    ${iCanBookFor.length > 0 ? `
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:14px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">
          You can book on behalf of
        </div>
        ${iCanBookFor.map(u => `
          <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
            <div class="user-avatar" style="background:${avatarColor(u.fullName)};width:22px;height:22px;font-size:9px;flex-shrink:0">${initials(u.fullName)}</div>
            <span style="font-size:13px;font-weight:500">${u.fullName}</span>
            <span style="font-size:12px;color:var(--text-muted)">&middot; ${u.team}</span>
          </div>`).join('')}
      </div>` : ''}

    <button class="btn btn-secondary" style="width:100%" onclick="hideModal()">Done</button>
  `);
}

function addDelegateAndRefresh() {
  const sel = document.getElementById('delegate-select');
  if (!sel?.value) { toast('Please select a colleague', 'error'); return; }
  addDelegate(sel.value);
  const name = allUsers.find(u => u.id === sel.value)?.fullName;
  toast(`${name} can now book on your behalf`, 'success');
  renderDelegatesModal();
}

function removeDelegateAndRefresh(userId) {
  removeDelegate(userId);
  renderDelegatesModal();
}

// ── Feedback view ─────────────────────────────────────────────────────────

function renderFeedback() {
  const container = document.getElementById('view-feedback');
  const myPast = loadFeedback()
    .filter(f => f.userId === currentUser.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 5);

  const typeConfig = {
    suggestion: { label: 'Suggestion',   color: '#0891b2', bg: '#E0F2FE' },
    bug:        { label: 'Bug / Issue',  color: '#DC2626', bg: '#FEE2E2' },
    compliment: { label: 'Compliment',   color: '#16a34a', bg: '#F0FDF4' },
    other:      { label: 'Other',        color: '#7c3aed', bg: '#F3E8FF' },
  };

  container.innerHTML = `
    <div class="page-header">
      <h1>Feedback</h1>
      <p>Help us improve Perch — your suggestions go straight to the facilities team</p>
    </div>

    <div class="two-col" style="align-items:start">
      <div class="card">
        <div class="card-header"><span class="card-title">Share your thoughts</span></div>
        <div class="card-body" style="padding:20px">

          <div style="margin-bottom:18px">
            <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:8px">Type</div>
            <div class="feedback-type-row">
              ${Object.entries(typeConfig).map(([val, cfg]) => `
                <label class="feedback-type-btn">
                  <input type="radio" name="fb-type" value="${val}" ${val === 'suggestion' ? 'checked' : ''} onchange="updateFeedbackTypeUI()">
                  <span>${cfg.label}</span>
                </label>`).join('')}
            </div>
          </div>

          <div style="margin-bottom:18px">
            <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:8px">Overall satisfaction</div>
            <div class="star-rating" id="star-rating">
              ${[1,2,3,4,5].map(n => `
                <button class="star-btn" data-val="${n}" onclick="setFeedbackRating(${n})" type="button">★</button>`).join('')}
            </div>
            <input type="hidden" id="fb-rating" value="">
          </div>

          <div style="margin-bottom:18px;display:flex;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:120px">
              <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:8px">Temperature</div>
              <div style="display:flex;gap:8px">
                <button type="button" class="env-rate-btn" id="fb-temp-hot" onclick="setEnvRating('temp','hot')">🔥 Hot</button>
                <button type="button" class="env-rate-btn" id="fb-temp-cold" onclick="setEnvRating('temp','cold')">🧊 Cold</button>
              </div>
              <input type="hidden" id="fb-temp" value="">
            </div>
            <div style="flex:1;min-width:120px">
              <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:8px">Noise Level</div>
              <div style="display:flex;gap:8px">
                <button type="button" class="env-rate-btn" id="fb-noise-quiet" onclick="setEnvRating('noise','quiet')">🔇 Quiet</button>
                <button type="button" class="env-rate-btn" id="fb-noise-loud" onclick="setEnvRating('noise','loud')">📢 Loud</button>
              </div>
              <input type="hidden" id="fb-noise" value="">
            </div>
          </div>

          <div style="margin-bottom:14px">
            <label style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);display:block;margin-bottom:6px">Subject</label>
            <input type="text" id="fb-subject" class="field-input" placeholder="Brief summary…" maxlength="80">
          </div>

          <div style="margin-bottom:18px">
            <label style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);display:block;margin-bottom:6px">Details</label>
            <textarea id="fb-message" class="field-input" rows="5" placeholder="Tell us more…" style="resize:vertical;min-height:100px"></textarea>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
            <label style="display:flex;align-items:center;gap:7px;font-size:13px;color:var(--text-secondary);cursor:pointer">
              <input type="checkbox" id="fb-anon"> Submit anonymously
            </label>
            <button class="btn btn-primary" onclick="doSubmitFeedback()">Submit Feedback</button>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-header"><span class="card-title">Your recent submissions</span></div>
          <div class="card-body" style="padding:8px 16px 16px">
            ${myPast.length === 0
              ? `<p style="font-size:13px;color:var(--text-muted);padding:8px 0">No submissions yet.</p>`
              : myPast.map(f => {
                  const cfg = typeConfig[f.type] || typeConfig.other;
                  const d = new Date(f.submittedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
                  const stars = f.rating ? '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating) : '';
                  return `<div style="padding:10px 0;border-bottom:1px solid var(--border)">
                    <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">
                      <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:${cfg.bg};color:${cfg.color}">${cfg.label}</span>
                      ${stars ? `<span style="font-size:11px;color:#D97706;letter-spacing:1px">${stars}</span>` : ''}
                      <span style="font-size:11px;color:var(--text-muted);margin-left:auto">${d}</span>
                    </div>
                    <div style="font-size:13px;font-weight:600;color:var(--text)">${f.subject || '(no subject)'}</div>
                  </div>`;
                }).join('')}
          </div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="card-body" style="padding:16px 18px">
            <div style="font-size:13px;font-weight:600;margin-bottom:4px">How feedback is used</div>
            <ul style="font-size:12.5px;color:var(--text-secondary);padding-left:16px;line-height:1.8;margin:0">
              <li>Suggestions are reviewed weekly by the facilities team</li>
              <li>Bug reports are triaged within 48 hours</li>
              <li>You'll be updated via your team if your idea is taken forward</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(updateFeedbackTypeUI);
}

function updateFeedbackTypeUI() {
  document.querySelectorAll('.feedback-type-btn').forEach(label => {
    const radio = label.querySelector('input[type=radio]');
    label.classList.toggle('active', radio && radio.checked);
  });
}

function setFeedbackRating(val) {
  document.getElementById('fb-rating').value = val;
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.classList.toggle('star-active', parseInt(btn.dataset.val) <= val);
  });
}

function setEnvRating(type, val) {
  document.getElementById(`fb-${type}`).value = val;
  document.querySelectorAll(`.env-rate-btn[id^="fb-${type}-"]`).forEach(btn => {
    btn.classList.toggle('env-rate-active', btn.id === `fb-${type}-${val}`);
  });
}

function doSubmitFeedback() {
  const type    = document.querySelector('input[name="fb-type"]:checked')?.value || 'other';
  const subject = document.getElementById('fb-subject').value.trim();
  const message = document.getElementById('fb-message').value.trim();
  const rating  = parseInt(document.getElementById('fb-rating').value) || null;
  const anon    = document.getElementById('fb-anon').checked;
  const temp    = document.getElementById('fb-temp')?.value || null;
  const noise   = document.getElementById('fb-noise')?.value || null;

  if (!subject) { toast('Please add a subject', 'error'); return; }
  if (!message) { toast('Please add some detail', 'error'); return; }

  submitFeedback({ type, subject, message, rating, anonymous: anon, temperature: temp, noiseLevel: noise });
  toast('Thank you — your feedback has been submitted', 'success');
  renderFeedback();
}

// ── Walk-in auto-booking ───────────────────────────────────────────────────

const AUTO_BOOK_DISMISSED_KEY = 'mdb_auto_book_dismissed';
let proximityWatchId = null;
let autoBookTriggeredThisSession  = false;
let anchorNotifFiredThisSession   = false;

function hasBookingToday(userId) {
  return getBookings({ userId, date: today() }).length > 0;
}

function wasAutoBookDismissedToday() {
  try {
    const dates = JSON.parse(localStorage.getItem(AUTO_BOOK_DISMISSED_KEY) || '[]');
    return dates.includes(today());
  } catch { return false; }
}

function markAutoBookDismissedToday() {
  try {
    const dates = JSON.parse(localStorage.getItem(AUTO_BOOK_DISMISSED_KEY) || '[]').filter(d => d >= today());
    if (!dates.includes(today())) dates.push(today());
    localStorage.setItem(AUTO_BOOK_DISMISSED_KEY, JSON.stringify(dates));
  } catch {}
}

function findBestAutoBookDesk(date) {
  const available = getDesks({ date }).filter(d => d.available);
  if (available.length === 0) return null;
  const todayBookings = getBookings({ date });
  const teammateNbs = [...new Set(
    todayBookings
      .filter(b => b.user?.team === currentUser.team && b.userId !== currentUser.id)
      .map(b => DESKS.find(d => d.id === b.deskId)?.neighbourhood)
      .filter(Boolean)
  )];
  return available
    .map(d => ({ ...d, autoScore: scoreDesk(d, currentUser) + (teammateNbs.includes(d.neighbourhood) ? 10 : 0) }))
    .sort((a, b) => b.autoScore - a.autoScore)[0];
}

function getAutoBookNearbyTeammates(deskId, date) {
  const desk = DESKS.find(d => d.id === deskId);
  if (!desk) return [];
  return getBookings({ date })
    .filter(b => {
      const bd = DESKS.find(d => d.id === b.deskId);
      return bd?.neighbourhood === desk.neighbourhood && b.user?.team === currentUser.team && b.userId !== currentUser.id;
    })
    .map(b => b.user).filter(Boolean);
}

function triggerAutoBook(trigger) {
  if (!currentUser) return;
  if (hasBookingToday(currentUser.id)) return;
  if (wasAutoBookDismissedToday()) return;
  autoBookTriggeredThisSession = true;

  const desk = findBestAutoBookDesk(today());
  if (!desk) {
    toast('No desk available — the office may be at capacity', 'error');
    return;
  }

  const teammates = getAutoBookNearbyTeammates(desk.id, today());
  const office = loadOfficeSettings();
  const triggerMsg = trigger === 'scan'
    ? `Your scan-in at <strong>${office.name}</strong> was recognised`
    : `You're near <strong>${office.name}</strong>`;

  const featureTags = desk.features
    .map(f => `<span class="feature-tag ft-${f}">${featureLabel(f)}</span>`)
    .join('');

  showModal(`
    <div style="text-align:center;padding:8px 0 4px">
      <div style="font-size:36px;margin-bottom:10px">📍</div>
      <h3 style="font-size:17px;font-weight:700;margin-bottom:6px;color:var(--text)">No desk booked — we've found one for you</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;line-height:1.5">${triggerMsg}. You don't have a desk booked for today.</p>
    </div>
    <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:22px;font-weight:700;color:var(--text)">${desk.id}</span>
        <span class="pill pill-green">${desk.floor === 'ground' ? 'Ground' : 'First'} Floor</span>
      </div>
      <div class="desk-neighbourhood ${nbClass(desk.neighbourhood)}" style="display:inline-block;margin-bottom:${desk.features.length > 0 || teammates.length > 0 ? '10' : '0'}px">${desk.neighbourhood}</div>
      ${desk.features.length > 0 ? `<div class="desk-features" style="margin-bottom:${teammates.length > 0 ? '10' : '0'}px">${featureTags}</div>` : ''}
      ${teammates.length > 0 ? `<div style="font-size:12px;color:var(--text-secondary);padding-top:8px;border-top:1px solid var(--border)">
        <span style="font-weight:600;color:var(--primary)">Near your team:</span>
        ${teammates.slice(0, 3).map(u => u.fullName.split(' ')[0]).join(', ')}${teammates.length > 3 ? ` +${teammates.length - 3} more` : ''}
      </div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <button class="btn btn-primary btn-full" onclick="confirmAutoBook('${desk.id}','${today()}')">Book Desk ${desk.id} for Today</button>
      <button class="btn btn-secondary btn-full" onclick="hideModal();navigate('book')">Choose a Different Desk</button>
      <button class="btn btn-ghost btn-full" onclick="dismissAutoBook()">Not today</button>
    </div>
  `);
}

function confirmAutoBook(deskId, date) {
  hideModal();
  try {
    createBooking({ userId: currentUser.id, deskId, date, slot: 'full' });
    sendPerchNotification('Desk booked', `Desk ${deskId} booked for you at ${loadOfficeSettings().name} — full day`);
    toast(`Desk ${deskId} booked for today`, 'success');
    renderDashboard();
  } catch (e) {
    toast(e.message || 'Could not book desk', 'error');
  }
}

function dismissAutoBook() {
  hideModal();
  markAutoBookDismissedToday();
}

// ── Building scan-in trigger ───────────────────────────────────────────────
// In production this function is called via a webhook from the access-control
// system when the user's badge is scanned at the entrance.

function simulateBuildingScanIn() {
  const abSettings = loadAutoBookAdminSettings();
  if (!abSettings.enableOnScan) { toast('Walk-in auto-booking is disabled by admin', 'info'); return; }
  hardBookOnArrival('scan');
}

function hardBookOnArrival(trigger) {
  if (!currentUser) return;

  // If already booked and checked in, nothing to do
  if (hasBookingToday(currentUser.id)) {
    const existing = getBookings({ userId: currentUser.id, date: today() }).find(b => !b.checkedIn);
    if (existing) { checkInBooking(existing.id); }
    else { toast('Already checked in for today', 'info'); }
    return;
  }

  // Confirm soft allocation if one exists
  const alloc = getAllocationForUser(currentUser.id, today());
  if (alloc && alloc.status !== 'released' && alloc.status !== 'confirmed') {
    try {
      createBooking({ userId: currentUser.id, deskId: alloc.deskId, date: today(), slot: 'full' });
      const allocs = loadAllocations();
      const a = allocs.find(a => a.id === alloc.id);
      if (a) { a.status = 'confirmed'; a.confirmedAt = new Date().toISOString(); }
      saveAllocations(allocs);
      checkInBookingLocal(loadBookings().filter(b => b.userId === currentUser.id && b.date === today()).slice(-1)[0]?.id);
      const office = loadOfficeSettings();
      const msg = trigger === 'scan'
        ? `Badge scanned at ${office.name}`
        : `Near ${office.name}`;
      sendPerchNotification('Desk confirmed', `${alloc.deskId} is yours today — ${msg}`);
      toast(`Welcome! ${alloc.deskId} confirmed from your allocation`, 'success');
      renderDashboard();
    } catch (e) {
      toast(e.message || 'Could not confirm allocation', 'error');
    }
    return;
  }

  // No allocation — walk-in pool assignment
  processWalkIn(currentUser.id);
}

// ── Proximity detection ────────────────────────────────────────────────────

function startProximityWatch() {
  if (!navigator.geolocation) return;
  if (!loadAutoBookAdminSettings().enableOnProximity) return;
  if (proximityWatchId !== null) navigator.geolocation.clearWatch(proximityWatchId);
  proximityWatchId = navigator.geolocation.watchPosition(
    pos => checkProximityAutoBook(pos),
    () => {},
    { enableHighAccuracy: false, maximumAge: 60000, timeout: 30000 }
  );
}

function checkProximityAutoBook(pos) {
  if (autoBookTriggeredThisSession || !currentUser) return;
  if (hasBookingToday(currentUser.id) || wasAutoBookDismissedToday()) return;
  const abSettings = loadAutoBookAdminSettings();
  if (!abSettings.enableOnProximity) return;
  const office = loadOfficeSettings();
  const radius = abSettings.proximityRadiusM ?? office.radiusM ?? 300;
  if (distanceMeters(pos.coords.latitude, pos.coords.longitude, office.lat, office.lng) <= radius) {
    autoBookTriggeredThisSession = true;
    hardBookOnArrival('proximity');
  }
}

function stopProximityWatch() {
  if (proximityWatchId !== null) {
    navigator.geolocation.clearWatch(proximityWatchId);
    proximityWatchId = null;
  }
}

// ── Push notifications ─────────────────────────────────────────────────────

function getUnbookedAnchorDays(lookaheadDays = 7) {
  const bookedDates = new Set(
    getBookings({ userId: currentUser.id, upcoming: true }).map(b => b.date)
  );
  const result = [];
  for (let i = 1; i <= lookaheadDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = d.toISOString().slice(0, 10);
    if (isAnchorDay(currentUser, dateStr) && !bookedDates.has(dateStr)) {
      result.push(dateStr);
    }
  }
  return result;
}

function checkAnchorDayNotifications() {
  if (anchorNotifFiredThisSession) return;
  const unbooked = getUnbookedAnchorDays(14);
  if (unbooked.length === 0) return;
  anchorNotifFiredThisSession = true;
  const dayList = unbooked.slice(0, 3).map(d =>
    parseDate(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  ).join(', ');
  const extra = unbooked.length > 3 ? ` +${unbooked.length - 3} more` : '';
  sendPerchNotification(
    `${unbooked.length} anchor day${unbooked.length > 1 ? 's' : ''} without a desk booked`,
    `Book your desk for: ${dayList}${extra}`
  );
}

function navigateToBookDate(dateStr) {
  navigate('declare');
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendPerchNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: 'perchlogo.png', tag: 'perch-auto-book' });
  }
}

// ── Mobile Preview ────────────────────────────────────────────────────────

const MOBILE_DEVICES = {
  iphone14: { w: 390,  h: 844,  label: 'iPhone 14',  hasNotch: true,  hasHomeBtn: false, radius: 48 },
  iphoneSE: { w: 375,  h: 667,  label: 'iPhone SE',  hasNotch: false, hasHomeBtn: true,  radius: 40 },
  pixel7:   { w: 412,  h: 915,  label: 'Pixel 7',    hasNotch: true,  hasHomeBtn: false, radius: 44 },
  ipad:     { w: 820,  h: 1180, label: 'iPad Air',   hasNotch: false, hasHomeBtn: false, radius: 24 },
};

let mobilePreviewOpen   = false;
let currentMobileDevice = 'iphone14';
let mobileOrientation   = 'portrait';

function toggleMobilePreview() {
  mobilePreviewOpen = !mobilePreviewOpen;
  const overlay  = document.getElementById('mobile-preview-overlay');
  const trigger  = document.getElementById('mobile-preview-trigger');
  if (!overlay) return;
  overlay.classList.toggle('hidden', !mobilePreviewOpen);
  trigger?.classList.toggle('active', mobilePreviewOpen);
  if (mobilePreviewOpen) updateMobileFrame();
}

function setMobileDevice(key) {
  currentMobileDevice = key;
  document.querySelectorAll('.mobile-dev-tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.device === key));
  updateMobileFrame();
}

function toggleMobileOrientation() {
  mobileOrientation = mobileOrientation === 'portrait' ? 'landscape' : 'portrait';
  updateMobileFrame();
}

function setMobilePage(page) {
  document.querySelectorAll('.mobile-page-tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.page === page));
  const iframe = document.getElementById('mobile-preview-iframe');
  if (iframe) iframe.src = page + '?preview=1';
}

function updateMobileFrame() {
  const device   = MOBILE_DEVICES[currentMobileDevice];
  const portrait = mobileOrientation === 'portrait';
  const cw = portrait ? device.w : device.h;
  const ch = portrait ? device.h : device.w;

  const iframe   = document.getElementById('mobile-preview-iframe');
  const screen   = document.getElementById('mobile-screen-wrap');
  const frame    = document.getElementById('mobile-device-frame');
  const wrapper  = document.getElementById('mobile-frame-wrapper');
  const label    = document.getElementById('mobile-device-label');
  const notch    = document.getElementById('mobile-notch');
  const homeBar  = document.getElementById('mobile-home-bar');
  const homeBtn  = document.getElementById('mobile-home-btn');
  if (!frame || !screen || !iframe || !wrapper) return;

  // Screen + iframe sizing
  iframe.style.width  = cw + 'px';
  iframe.style.height = ch + 'px';
  screen.style.width  = cw + 'px';
  screen.style.height = ch + 'px';

  // Frame border-radius (tighter in landscape)
  const fr = portrait ? device.radius : Math.round(device.radius * 0.7);
  frame.style.borderRadius  = fr + 'px';
  screen.style.borderRadius = Math.max(fr - 12, 8) + 'px';

  // Notch / home indicator
  if (notch)   notch.style.display   = device.hasNotch   && portrait ? 'block' : 'none';
  if (homeBar) homeBar.style.display = !device.hasHomeBtn && !portrait ? 'none'
    : device.hasHomeBtn ? 'none' : 'block';
  if (homeBtn) homeBtn.style.display = device.hasHomeBtn ? 'block' : 'none';

  // Scale to fit the available viewport space
  const pad    = 32; // frame padding each side (16×2)
  const frameW = cw + pad;
  const frameH = ch + pad;
  const availW = Math.min(window.innerWidth  - 120, 900);
  const availH = window.innerHeight - 180;
  const scale  = Math.min(availW / frameW, availH / frameH, 1);

  frame.style.transform       = `scale(${scale})`;
  frame.style.transformOrigin = 'top center';
  wrapper.style.width  = (frameW * scale) + 'px';
  wrapper.style.height = (frameH * scale) + 'px';

  if (label) label.innerHTML = `${device.label} &mdash; ${cw}&times;${ch}`;
}

window.addEventListener('resize', () => { if (mobilePreviewOpen) updateMobileFrame(); });

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  initAccessibility();
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

// ══════════════════════════════════════════════════════════════════════════
// FEATURE 1: Attendance Declaration
// ══════════════════════════════════════════════════════════════════════════

const DECLARATIONS_KEY = 'mdb_declarations';
function loadDeclarations() { try { return JSON.parse(localStorage.getItem(DECLARATIONS_KEY)||'[]'); } catch { return []; } }
function saveDeclarations(d) { localStorage.setItem(DECLARATIONS_KEY, JSON.stringify(d)); }

function getDeclaration(userId, date) {
  return loadDeclarations().find(d => d.userId === userId && d.date === date) || null;
}

function setDeclaration(userId, date, status, source) {
  source = source || 'manual';
  const all = loadDeclarations().filter(d => !(d.userId === userId && d.date === date));
  if (status !== 'none') {
    all.push({ id: generateId(), userId, date, status, source, createdAt: new Date().toISOString() });
  }
  saveDeclarations(all);
}

function renderDeclareView() {
  const container = document.getElementById('view-declare');
  if (!container) return;

  const todayStr = today();
  const isMonday = parseDate(todayStr).getDay() === 1;

  // Show next 14 weekdays
  const dates = [];
  let offset = 1;
  while (dates.length < 14) {
    const next = addDays(todayStr, offset++);
    const dow = new Date(next + 'T00:00:00Z').getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(next);
  }

  const calConfig = loadCalendarConfig();

  const nudge = isMonday ? `
    <div class="checkin-banner checkin-banner-pending" style="margin-bottom:20px">
      <span>&#128075; Monday nudge &mdash; declare your office days for this week so the system can allocate your desk in advance.</span>
    </div>` : '';

  const allDecls = loadDeclarations().filter(d => d.userId === currentUser.id);
  const mon = weekMonday(today());
  const thisWeekYes = allDecls.filter(d =>
    d.date >= mon && d.date <= addDays(mon, 4) && d.status === 'yes'
  ).length;

  const noShowWarn = getNoShowWarning(currentUser.id);
  const noShowBanner = noShowWarn.show ? `
    <div class="card one-col" style="margin-bottom:16px;border:1.5px solid ${noShowWarn.level === 'penalty' ? 'var(--danger)' : '#FDE68A'};background:${noShowWarn.level === 'penalty' ? '#FEF2F2' : '#FFFBEB'}">
      <div class="card-body" style="padding:12px 18px;font-size:13px;color:${noShowWarn.level === 'penalty' ? 'var(--danger)' : '#92400E'}">
        &#9888;&#65039; ${noShowWarn.msg}
      </div>
    </div>` : '';

  container.innerHTML = `
    <div class="page-header">
      <h1>Attendance Declaration</h1>
      <p>Tell us when you're planning to come in — no desk booking required</p>
    </div>
    ${nudge}
    ${noShowBanner}
    <div class="two-col" style="gap:16px;align-items:start">
      <div>
        <div class="card one-col" style="margin-bottom:16px">
          <div class="card-header">
            <span class="card-title">Declare your office days</span>
            <span class="pill pill-blue declare-week-pill" style="font-size:11px">${thisWeekYes} day${thisWeekYes !== 1 ? 's' : ''} this week</span>
          </div>
          <div class="card-body" style="padding:12px 16px">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
              The system uses your declarations &mdash; not desk grabs &mdash; to allocate desks the night before. No rushing on Friday.
            </p>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${dates.map(dateStr => {
                const decl = getDeclaration(currentUser.id, dateStr);
                const isPast = dateStr < today();
                const dObj = parseDate(dateStr);
                const hasBooking = loadBookings().some(b => b.userId === currentUser.id && b.date === dateStr);
                const alloc = getAllocationForUser(currentUser.id, dateStr);
                const weekLabel = dObj.toLocaleDateString('en-GB', {weekday:'long'});
                const dateLabel = dObj.toLocaleDateString('en-GB', {day:'numeric', month:'short'});
                const isWeekSep = dObj.getDay() === 1;

                return `
                  ${isWeekSep ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);padding:6px 0 2px">
                    ${dObj.toLocaleDateString('en-GB', {day:'numeric', month:'long'})} week
                  </div>` : ''}
                  <div data-declare-row="${dateStr}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;background:${decl?.status === 'yes' ? '#E6F2EE' : decl?.status === 'no' ? '#FEE2E2' : decl?.status === 'maybe' ? '#FEF3C7' : 'var(--bg)'};border:1px solid ${decl?.status === 'yes' ? '#A7D7C5' : decl?.status === 'no' ? '#FECACA' : decl?.status === 'maybe' ? '#FDE68A' : 'var(--border)'}">
                    <div style="min-width:110px">
                      <div style="font-weight:600;font-size:13px">${weekLabel}</div>
                      <div style="font-size:12px;color:var(--text-muted)">${dateLabel}</div>
                    </div>
                    ${hasBooking ? '<span class="pill pill-blue" style="font-size:10px;margin-right:4px">Desk booked</span>' : ''}
                    ${alloc ? '<span class="pill" style="font-size:10px;margin-right:4px;background:#E6F2EE;color:#006A4D;border:1px solid #A7D7C5">Allocated: ' + alloc.deskId + '</span>' : ''}
                    ${decl?.source === 'calendar' ? '<span class="pill pill-blue" style="font-size:10px;margin-right:4px">From calendar</span>' : ''}
                    <div style="display:flex;gap:6px;margin-left:auto">
                      ${isPast ? '<span style="font-size:12px;color:var(--text-muted)">Past</span>' : `
                        <button class="btn btn-sm ${decl?.status==='yes' ? 'btn-primary' : 'btn-secondary'}"
                          data-declare-btn="${dateStr}-yes"
                          onclick="declareDay('${dateStr}','yes')" style="min-width:44px">Yes</button>
                        <button class="btn btn-sm ${decl?.status==='maybe' ? 'btn-primary' : 'btn-secondary'}"
                          data-declare-btn="${dateStr}-maybe"
                          onclick="declareDay('${dateStr}','maybe')" style="min-width:52px">Maybe</button>
                        <button class="btn btn-sm ${decl?.status==='no' ? '' : 'btn-secondary'}"
                          data-declare-btn="${dateStr}-no"
                          style="${decl?.status==='no' ? 'background:var(--danger);color:white;border-color:var(--danger)' : ''};min-width:44px"
                          onclick="declareDay('${dateStr}','no')">No</button>
                      `}
                    </div>
                  </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><span class="card-title">Calendar Integration</span>
            ${calConfig.connected ? '<span class="pill pill-blue" style="font-size:11px">Connected</span>' : ''}
          </div>
          <div class="card-body" style="padding:16px 18px">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">
              Connect your calendar and Perch will automatically detect office attendance from:<br>
              <ul style="font-size:12.5px;margin:8px 0 0 0;padding-left:16px;color:var(--text-secondary);line-height:2">
                <li>All-day events with "office" or "in office" in the title or location</li>
                <li>3 or more in-person meetings on the same day</li>
              </ul>
            </p>
            ${calConfig.connected ? `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
                <span style="font-size:18px">${calConfig.provider === 'microsoft' ? '&#x1F535;' : '&#x1F534;'}</span>
                <div>
                  <div style="font-weight:600;font-size:13px">${calConfig.provider === 'microsoft' ? 'Microsoft 365' : 'Google Calendar'} connected</div>
                  <div style="font-size:12px;color:var(--text-muted)">${calConfig.email || 'Calendar synced'}</div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="disconnectCalendar()" style="margin-left:auto">Disconnect</button>
              </div>
              <button class="btn btn-primary btn-full" onclick="syncCalendarDeclarations()">Sync now</button>
            ` : `
              <div style="display:flex;flex-direction:column;gap:8px">
                <button class="btn btn-primary btn-full" onclick="showCalendarConnectModal()">
                  Connect calendar
                </button>
                <button class="btn btn-secondary btn-full" onclick="simulateCalendarSync()">Demo: simulate calendar sync</button>
              </div>
            `}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">How it works</span></div>
          <div class="card-body" style="padding:14px 18px">
            <div style="font-size:13px;color:var(--text-secondary);line-height:1.8">
              <div style="margin-bottom:8px"><strong style="color:var(--text)">Yes</strong> &rarr; High priority in allocation. You'll get your preferred desk.</div>
              <div style="margin-bottom:8px"><strong style="color:var(--text)">Maybe</strong> &rarr; Deprioritised. You may get a desk but Yes declarations go first.</div>
              <div style="margin-bottom:8px"><strong style="color:var(--text)">No</strong> &rarr; Keeps your desk free for others. No allocation made.</div>
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)">
                Allocations are sent the evening before. You'll be notified by 7pm.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function declareDay(date, status) {
  const container = document.getElementById('view-declare');
  const scrollTop = container ? container.scrollTop : 0;
  const existing = getDeclaration(currentUser.id, date);
  if (existing?.status === status) {
    setDeclaration(currentUser.id, date, 'none');
    toast('Declaration cleared', 'info');
  } else {
    setDeclaration(currentUser.id, date, status);
    const labels = { yes: 'office day', no: 'working from home', maybe: 'maybe in office' };
    toast(parseDate(date).toLocaleDateString('en-GB', { weekday: 'long' }) + ' — ' + labels[status], 'success');
  }
  renderDeclareView();
  if (container) container.scrollTop = scrollTop;
}

// ══════════════════════════════════════════════════════════════════════════
// FEATURE 2: Smart Allocation Engine
// ══════════════════════════════════════════════════════════════════════════

const ALLOCATIONS_KEY = 'mdb_allocations';
function loadAllocations() { try { return JSON.parse(localStorage.getItem(ALLOCATIONS_KEY)||'[]'); } catch { return []; } }
function saveAllocations(a) { localStorage.setItem(ALLOCATIONS_KEY, JSON.stringify(a)); }

function getAllocationForUser(userId, date) {
  return loadAllocations().find(a => a.userId === userId && a.date === date && a.status !== 'released') || null;
}

const ALLOC_SETTINGS_KEY = 'mdb_alloc_settings';
function loadAllocSettings() { try { return JSON.parse(localStorage.getItem(ALLOC_SETTINGS_KEY)||'null') || { walkInPoolPct: 20 }; } catch { return { walkInPoolPct: 20 }; } }
function saveAllocSettings(s) { localStorage.setItem(ALLOC_SETTINGS_KEY, JSON.stringify(s)); }

const ALLOC_LOGS_KEY = 'mdb_alloc_logs';
function loadAllocLogs() { try { return JSON.parse(localStorage.getItem(ALLOC_LOGS_KEY)||'[]'); } catch { return []; } }
function saveAllocLogs(l) { localStorage.setItem(ALLOC_LOGS_KEY, JSON.stringify(l)); }

function runAllocationEngine(date) {
  const bookings = loadBookings();
  const existingAllocs = loadAllocations().filter(a => a.date !== date);

  const decls = loadDeclarations().filter(d => d.date === date && (d.status === 'yes' || d.status === 'maybe'));
  decls.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'yes' ? -1 : 1;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const powerBlocks = getPowerBlocksForDate(date);

  const assignedDesks = new Set();
  bookings.filter(b => b.date === date).forEach(b => assignedDesks.add(b.deskId));
  powerBlocks.forEach(pb => (pb.deskIds || []).forEach(id => assignedDesks.add(id)));

  const settings = loadAllocSettings();
  const walkInPct = settings.walkInPoolPct != null ? settings.walkInPoolPct : 20;
  const adminS = JSON.parse(localStorage.getItem(ADMIN_SETTINGS_KEY) || 'null');
  const disabledDesks = adminS?.disabledDesks || [];
  const enabledDesks = DESKS.filter(d => !disabledDesks.includes(d.id));
  const walkInCount = Math.max(1, Math.round(enabledDesks.length * walkInPct / 100));
  const walkInPool = new Set(enabledDesks.slice(-walkInCount).map(d => d.id));

  const allocations = [];
  const runLog = { date, runAt: new Date().toISOString(), allocations: [], walkInPool: [...walkInPool] };

  for (const decl of decls) {
    const user = allUsers.find(u => u.id === decl.userId);
    if (!user) continue;
    if (bookings.some(b => b.userId === user.id && b.date === date)) continue;
    if (allocations.some(a => a.userId === user.id)) continue;

    const nsp = getUserNoshowPriority(user.id);

    const available = enabledDesks.filter(d =>
      !assignedDesks.has(d.id) &&
      !walkInPool.has(d.id) &&
      !allocations.some(a => a.deskId === d.id)
    );

    if (available.length === 0) break;

    const pat = (typeof HISTORIC_PATTERNS !== 'undefined' ? HISTORIC_PATTERNS : [])
      .find(p => p.userId === user.id)?.patterns.find(p => p.day === dayKey(date));
    let chosen = null;
    let reasonFactors = [];

    if (pat && available.find(d => d.id === pat.deskId)) {
      chosen = available.find(d => d.id === pat.deskId);
      reasonFactors = ['Your usual desk (' + Math.round(pat.consistency * 100) + '% consistency)'];
    } else {
      const teamAllocDesks = allocations.filter(a => {
        const u = allUsers.find(u => u.id === a.userId);
        return u?.team === user.team;
      }).map(a => a.deskId);

      const extPrefs = loadUserExtPrefs(user.id);
      const favDesks = extPrefs.favoriteDeskIds || user.favoriteDeskIds || [];

      const sepRules = loadSeparationRules();
      const sepUserIds = sepRules
        .filter(r => r.userAId === user.id || r.userBId === user.id)
        .map(r => r.userAId === user.id ? r.userBId : r.userAId);
      const sepNbs = allocations
        .filter(a => sepUserIds.includes(a.userId))
        .map(a => DESKS.find(dk => dk.id === a.deskId)?.neighbourhood)
        .filter(Boolean);

      const scored = available.map(d => {
        let score = scoreDesk(d, user) * nsp;
        const teamNbs = [...new Set(teamAllocDesks.map(id => DESKS.find(dk => dk.id === id)?.neighbourhood).filter(Boolean))];
        if (teamNbs.includes(d.neighbourhood)) score += 5;
        if (sepNbs.includes(d.neighbourhood)) score -= 15;
        const userPattern = (typeof HISTORIC_PATTERNS !== 'undefined' ? HISTORIC_PATTERNS : []).find(p => p.userId === user.id);
        if (userPattern) {
          const usualNb = DESKS.find(dk => dk.id === userPattern.patterns[0]?.deskId)?.neighbourhood;
          if (usualNb && d.neighbourhood === usualNb) score += 2;
        }
        if (favDesks.includes(d.id)) score += 4;
        if (user.flexMode || extPrefs.flexMode) score -= 3;
        return { ...d, score };
      }).sort((a, b) => b.score - a.score);

      chosen = scored[0];
      if (chosen) {
        const reasons = [];
        if (scoreDesk(chosen, user) >= 3) reasons.push('Matches your desk preferences');
        const teamNbs = [...new Set(teamAllocDesks.map(id => DESKS.find(dk => dk.id === id)?.neighbourhood).filter(Boolean))];
        if (teamNbs.includes(chosen.neighbourhood)) reasons.push('Near your team');
        if (favDesks.includes(chosen.id)) reasons.push('One of your favourites');
        if (sepNbs.length) reasons.push('Separated from flagged colleague');
        reasonFactors = reasons.length ? reasons : ['Best available match'];
      }
    }

    if (!chosen) continue;

    const alloc = {
      id: generateId(),
      userId: user.id,
      deskId: chosen.id,
      date,
      type: decl.status === 'yes' ? 'soft' : 'soft-maybe',
      status: 'pending',
      reasonFactors,
      declarationStatus: decl.status,
      allocatedAt: new Date().toISOString(),
    };
    allocations.push(alloc);
    assignedDesks.add(chosen.id);
  }

  saveAllocations([...existingAllocs, ...allocations]);

  const logs = loadAllocLogs();
  logs.unshift({ ...runLog, allocations: allocations.map(a => ({userId: a.userId, deskId: a.deskId, reason: a.reasonFactors, type: a.type})) });
  saveAllocLogs(logs.slice(0, 30));

  return { count: allocations.length, walkInCount, allocations };
}

// ══════════════════════════════════════════════════════════════════════════
// FEATURE 3: My Allocation View
// ══════════════════════════════════════════════════════════════════════════

function renderMyAllocationView() {
  const container = document.getElementById('view-my-allocation');
  if (!container) return;

  autoReleaseAllocations();

  const myAllocs = loadAllocations().filter(a =>
    a.userId === currentUser.id &&
    a.date >= today() &&
    a.status !== 'released'
  ).sort((a, b) => a.date.localeCompare(b.date));

  const noShowWarn = getNoShowWarning(currentUser.id);
  const noShowBanner = noShowWarn.show ? `
    <div class="card one-col" style="margin-bottom:16px;border:1.5px solid ${noShowWarn.level === 'penalty' ? 'var(--danger)' : '#FDE68A'};background:${noShowWarn.level === 'penalty' ? '#FEF2F2' : '#FFFBEB'}">
      <div class="card-body" style="padding:12px 18px;font-size:13px;color:${noShowWarn.level === 'penalty' ? 'var(--danger)' : '#92400E'}">
        &#9888;&#65039; ${noShowWarn.msg}
      </div>
    </div>` : '';

  container.innerHTML = `
    <div class="page-header">
      <h1>My Allocation</h1>
      <p>Desks allocated to you by the smart engine</p>
    </div>
    ${noShowBanner}
    ${myAllocs.length === 0 ? `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <path d="M9 11l3 3L22 4"/>
        </svg>
        <h3>No allocations yet</h3>
        <p>Declare your office days and the engine will allocate a desk for you the evening before.</p>
        <button class="btn btn-primary" onclick="navigate('declare')">Declare office days</button>
      </div>
    ` : `
      <div class="booking-list">
        ${myAllocs.map(alloc => renderAllocationItem(alloc)).join('')}
      </div>
    `}

    <div class="card one-col" style="margin-top:24px">
      <div class="card-header"><span class="card-title">Walk-in today</span></div>
      <div class="card-body" style="padding:16px 18px">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">
          No declaration? Just walk in. Tap below when you arrive and a desk near your team will be assigned in seconds.
        </p>
        <button class="btn btn-primary" onclick="processWalkIn()">I've arrived &mdash; assign me a desk</button>
      </div>
    </div>
  `;
}

function renderAllocationItem(alloc) {
  const d = parseDate(alloc.date);
  const month = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const desk = DESKS.find(dk => dk.id === alloc.deskId);
  const floor = desk?.floor === 'ground' ? 'Ground Floor' : 'First Floor';

  const typeLabels = { 'soft': 'Auto-allocated', 'soft-maybe': 'Tentative', 'confirmed': 'Confirmed', 'power-block': 'Team Day', 'walk-in': 'Walk-in' };
  const typePillClass = alloc.status === 'confirmed' ? 'pill-blue' : alloc.type === 'walk-in' ? 'pill-green' : 'pill-amber';

  return `
    <div class="booking-item ${alloc.status === 'confirmed' ? '' : 'booking-item-hold'}">
      <div class="booking-info">
        <div class="booking-date-block">
          <div class="bdate-month">${month}</div>
          <div class="bdate-day">${day}</div>
        </div>
        <div class="booking-details">
          <div class="booking-desk">
            ${alloc.deskId}
            <span class="pill ${typePillClass}" style="margin-left:6px;font-size:11px">${typeLabels[alloc.type] || alloc.type}</span>
            ${alloc.status === 'confirmed' ? '<span class="checkin-status checkin-done" style="margin-left:6px">Confirmed</span>' : ''}
          </div>
          <div class="booking-meta">${weekday} &middot; ${floor} &middot; ${desk?.neighbourhood || '&ndash;'}</div>
          <div style="margin-top:5px;font-size:11.5px;color:var(--text-muted)">
            ${(alloc.reasonFactors || []).join(' &middot; ')}
          </div>
          ${alloc.status !== 'confirmed' ? `<div style="margin-top:4px;font-size:11.5px;color:var(--text-muted)">Confirm by 8am to lock your desk. Unconfirmed allocations are released to the walk-in pool.</div>` : ''}
        </div>
      </div>
      <div class="booking-actions">
        ${alloc.status !== 'confirmed' ? `<button class="btn btn-sm btn-primary" onclick="confirmAllocation('${alloc.id}')">Confirm</button>` : ''}
        <button class="btn btn-sm btn-secondary" style="color:var(--danger);border-color:var(--danger)" onclick="releaseAllocation('${alloc.id}')">Release</button>
      </div>
    </div>
  `;
}

function confirmAllocation(allocId) {
  const allocs = loadAllocations();
  const alloc = allocs.find(a => a.id === allocId);
  if (!alloc) return;
  try {
    createBooking({ userId: alloc.userId, deskId: alloc.deskId, date: alloc.date, slot: 'full' });
    alloc.status = 'confirmed';
    alloc.confirmedAt = new Date().toISOString();
    saveAllocations(allocs);
    toast(alloc.deskId + ' confirmed for ' + displayShortDate(alloc.date), 'success');
    renderMyAllocationView();
  } catch (e) {
    toast(e.message || 'Could not confirm allocation', 'error');
  }
}

function releaseAllocation(allocId) {
  const allocs = loadAllocations();
  const alloc = allocs.find(a => a.id === allocId);
  if (!alloc) return;
  alloc.status = 'released';
  saveAllocations(allocs);
  toast('Allocation released — desk returned to pool', 'info');
  renderMyAllocationView();
}

function autoReleaseAllocations() {
  const now = new Date();
  if (now.getHours() < 8) return;
  const allocs = loadAllocations();
  let changed = false;
  for (const a of allocs) {
    if (a.date === today() && a.status === 'pending') {
      a.status = 'released';
      changed = true;
    }
  }
  if (changed) saveAllocations(allocs);
}

function processWalkIn(userId) {
  const uid = userId || currentUser?.id;
  if (!uid) return;
  const user = allUsers.find(u => u.id === uid) || currentUser;
  const date = today();

  if (loadBookings().some(b => b.userId === uid && b.date === date)) {
    toast('You already have a desk today', 'info');
    return;
  }

  const settings = loadAllocSettings();
  const walkInPct = settings.walkInPoolPct != null ? settings.walkInPoolPct : 20;
  const enabledDesks = DESKS;
  const walkInCount = Math.max(1, Math.round(enabledDesks.length * walkInPct / 100));
  const walkInPool = enabledDesks.slice(-walkInCount);

  const bookedIds = new Set(loadBookings().filter(b => b.date === date).map(b => b.deskId));
  const allocIds = new Set(loadAllocations().filter(a => a.date === date && a.status !== 'released').map(a => a.deskId));

  const available = walkInPool.filter(d => !bookedIds.has(d.id) && !allocIds.has(d.id));
  if (available.length === 0) {
    toast('No walk-in desks available right now', 'error');
    return;
  }

  const todayBookings = getBookings({ date });
  const teamNbs = [...new Set(
    todayBookings.filter(b => b.user?.team === user.team).map(b => DESKS.find(d => d.id === b.deskId)?.neighbourhood).filter(Boolean)
  )];

  const scored = available.map(d => ({
    ...d,
    score: scoreDesk(d, user) + (teamNbs.includes(d.neighbourhood) ? 8 : 0)
  })).sort((a, b) => b.score - a.score);

  const desk = scored[0];

  showModal(`
    <div style="text-align:center;padding:8px 0 4px">
      <div style="font-size:36px;margin-bottom:10px">&#x1F6B6;</div>
      <h3 style="font-size:17px;font-weight:700;margin-bottom:8px">Welcome in!</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px">Here's your desk for today:</p>
    </div>
    <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:var(--primary)">${desk.id}</div>
      <div class="desk-neighbourhood ${nbClass(desk.neighbourhood)}" style="display:inline-block;margin:6px 0">${desk.neighbourhood}</div>
      <div style="font-size:12px;color:var(--text-secondary)">${desk.floor === 'ground' ? 'Ground' : 'First'} Floor</div>
      ${teamNbs.includes(desk.neighbourhood) ? '<div style="font-size:12px;color:var(--primary);font-weight:600;margin-top:6px">Near your team members</div>' : ''}
    </div>
    <button class="btn btn-primary btn-full" onclick="confirmWalkIn('${desk.id}','${date}')">Head to ${desk.id}</button>
    <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="hideModal()">Cancel</button>
  `);
}

function confirmWalkIn(deskId, date) {
  hideModal();
  try {
    createBooking({ userId: currentUser.id, deskId, date, slot: 'full' });
    const alloc = {
      id: generateId(),
      userId: currentUser.id,
      deskId,
      date,
      type: 'walk-in',
      status: 'confirmed',
      reasonFactors: ['Walk-in assignment'],
      allocatedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };
    saveAllocations([...loadAllocations(), alloc]);
    toast('Welcome! ' + deskId + ' is yours for today', 'success');
    renderDashboard();
  } catch (e) {
    toast(e.message || 'Could not assign desk', 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// FEATURE 4: No-Show Priority Tracking
// ══════════════════════════════════════════════════════════════════════════

const NOSHOW_RECORD_KEY = 'mdb_noshow_records';
function loadNoshowRecords() { try { return JSON.parse(localStorage.getItem(NOSHOW_RECORD_KEY)||'{}'); } catch { return {}; } }
function saveNoshowRecords(r) { localStorage.setItem(NOSHOW_RECORD_KEY, JSON.stringify(r)); }

function getUserNoshowPriority(userId) {
  const records = loadNoshowRecords();
  const monthKey = new Date().toISOString().slice(0, 7);
  const userRecord = records[userId] || {};
  if (!userRecord.month || userRecord.month !== monthKey) return 1.0;
  const count = userRecord.count || 0;
  if (count >= 3) return 0.7;
  if (count >= 2) return 0.85;
  return 1.0;
}

function recordNoShow(userId) {
  const records = loadNoshowRecords();
  const monthKey = new Date().toISOString().slice(0, 7);
  if (!records[userId] || records[userId].month !== monthKey) {
    records[userId] = { month: monthKey, count: 0 };
  }
  records[userId].count++;
  saveNoshowRecords(records);
}

function getNoShowWarning(userId) {
  const records = loadNoshowRecords();
  const monthKey = new Date().toISOString().slice(0, 7);
  const count = records[userId]?.month === monthKey ? records[userId].count : 0;
  if (count >= 3) return { show: true, count, level: 'penalty', msg: 'You have ' + count + ' no-shows this month. Your allocation priority has been reduced until next month.' };
  if (count >= 2) return { show: true, count, level: 'warning', msg: 'You have ' + count + ' no-shows this month. One more and your allocation priority will be reduced.' };
  return { show: false };
}

// ══════════════════════════════════════════════════════════════════════════
// FEATURE 5: Power Blocks / Team Day
// ══════════════════════════════════════════════════════════════════════════

const POWER_BLOCKS_KEY = 'mdb_power_blocks';
function loadPowerBlocks() { try { return JSON.parse(localStorage.getItem(POWER_BLOCKS_KEY)||'[]'); } catch { return []; } }
function savePowerBlocks(pb) { localStorage.setItem(POWER_BLOCKS_KEY, JSON.stringify(pb)); }
function getPowerBlocksForDate(date) { return loadPowerBlocks().filter(pb => pb.date === date && pb.status !== 'cancelled'); }

function cancelPowerBlock(pbId) {
  const pbs = loadPowerBlocks();
  const pb = pbs.find(p => p.id === pbId);
  if (!pb) return;
  pb.status = 'cancelled';
  savePowerBlocks(pbs);
  toast('Team Day cancelled', 'info');
  renderTeamBookings();
}

function showCreateTeamDayModal(date) {
  const reports = (currentUser.directReports || []).map(id => allUsers.find(u => u.id === id)).filter(Boolean);
  const zones = ['Window Bank', 'Quiet Zone', 'Core Desk Area', 'Collaboration Zone'];

  showModal(`
    <div class="modal-title">Create Team Day</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Reserve a zone for your team &mdash; confirmed weeks in advance</div>

    <div style="margin-bottom:14px">
      <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:5px">Title</label>
      <input id="td-title" type="text" class="field-input" placeholder="e.g. Quarterly Planning" value="">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:5px">Date</label>
        <input id="td-date" type="date" class="field-input" value="${date || addDays(today(), 7)}">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:5px">Zone</label>
        <select id="td-zone" class="field-input" style="background:var(--bg)">
          ${zones.map(z => '<option value="' + z + '">' + z + '</option>').join('')}
        </select>
      </div>
    </div>

    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:8px">Team members &amp; desk pinning</div>
    <div style="max-height:240px;overflow-y:auto;margin-bottom:14px;display:flex;flex-direction:column;gap:6px">
      ${reports.length === 0 ? '<p style="font-size:13px;color:var(--text-muted)">No direct reports configured.</p>' : reports.map(u => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg);border-radius:6px">
          <input type="checkbox" class="td-member-cb" value="${u.id}" checked style="flex-shrink:0">
          <div class="user-avatar" style="background:${avatarColor(u.fullName)};width:26px;height:26px;font-size:11px;flex-shrink:0">${initials(u.fullName)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600">${u.fullName}</div>
          </div>
          <select class="td-pin-desk" data-uid="${u.id}" style="font-size:12px;border:1px solid var(--border);border-radius:6px;padding:4px 8px;background:var(--bg);color:var(--text)">
            <option value="">Auto</option>
            ${DESKS.map(d => '<option value="' + d.id + '">' + d.id + ' (' + d.neighbourhood + ')</option>').join('')}
          </select>
        </div>
      `).join('')}
    </div>

    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="createTeamDay()">Reserve zone</button>
    </div>
  `);
}

function createTeamDay() {
  const title = document.getElementById('td-title').value.trim();
  const date = document.getElementById('td-date').value;
  const zone = document.getElementById('td-zone').value;
  const members = [...document.querySelectorAll('.td-member-cb:checked')].map(cb => cb.value);

  if (!title) { toast('Enter a title', 'error'); return; }
  if (!date || date < today()) { toast('Pick a future date', 'error'); return; }
  if (members.length === 0) { toast('Select at least one member', 'error'); return; }

  const pins = {};
  document.querySelectorAll('.td-pin-desk').forEach(sel => {
    if (sel.value) pins[sel.dataset.uid] = sel.value;
  });

  const zoneDesks = DESKS.filter(d => d.neighbourhood === zone);
  if (zoneDesks.length < members.length) {
    toast('Only ' + zoneDesks.length + ' desks in ' + zone + ' — reduce team size', 'error');
    return;
  }

  const bookedDeskIds = new Set(loadBookings().filter(b => b.date === date).map(b => b.deskId));
  const memberAllocations = [];

  for (const userId of members) {
    const pinnedDesk = pins[userId];
    let desk = null;
    if (pinnedDesk) {
      desk = zoneDesks.find(d => d.id === pinnedDesk && !bookedDeskIds.has(d.id));
    }
    if (!desk) {
      desk = zoneDesks.find(d => !bookedDeskIds.has(d.id) && !memberAllocations.find(ma => ma.deskId === d.id));
    }
    if (!desk) { toast('Not enough free desks in that zone for this date', 'error'); return; }
    memberAllocations.push({ userId, deskId: desk.id });
    bookedDeskIds.add(desk.id);
  }

  const pb = {
    id: generateId(),
    managerId: currentUser.id,
    title,
    date,
    zone,
    memberIds: members,
    deskIds: memberAllocations.map(ma => ma.deskId),
    memberAllocations,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  savePowerBlocks([...loadPowerBlocks(), pb]);

  memberAllocations.forEach(({ userId, deskId }) => {
    try { createBooking({ userId, deskId, date, slot: 'full' }); } catch {}
  });

  const allocs = loadAllocations();
  memberAllocations.forEach(({ userId, deskId }) => {
    allocs.push({
      id: generateId(),
      userId,
      deskId,
      date,
      type: 'power-block',
      status: 'confirmed',
      reasonFactors: ['Team Day: ' + title, 'Manager reserved zone: ' + zone],
      allocatedAt: new Date().toISOString(),
    });
  });
  saveAllocations(allocs);

  hideModal();
  toast('Team Day created — ' + memberAllocations.length + ' desks reserved in ' + zone, 'success');
  renderTeamBookings();
}

// ══════════════════════════════════════════════════════════════════════════
// FEATURE 6: Extended Preference Profile
// ══════════════════════════════════════════════════════════════════════════

function loadUserExtPrefs(userId) {
  try { return JSON.parse(localStorage.getItem('mdb_user_ext_prefs_' + userId) || 'null') || {}; } catch { return {}; }
}
function saveUserExtPrefs(userId, p) { localStorage.setItem('mdb_user_ext_prefs_' + userId, JSON.stringify(p)); }

function renderExtPrefsSection() {
  const prefs = loadUserExtPrefs(currentUser.id);
  const favDesks = prefs.favoriteDeskIds || [];
  const crossTeams = prefs.crossTeamProximity || [];
  const flexMode = prefs.flexMode || false;
  const allTeams = [...new Set(allUsers.map(u => u.team))].sort();

  return `
    <div class="card one-col" style="margin-top:16px">
      <div class="card-header">
        <span class="card-title">Desk Preferences</span>
        <span class="pill pill-blue" style="font-size:11px">Allocation engine</span>
      </div>
      <div class="card-body" style="padding:16px 20px">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">These preferences influence your smart allocation — the engine tries to honour them when assigning your desk.</p>

        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Favourite Desks (up to 3)</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${[0,1,2].map(i => `
              <select class="fav-desk-sel" data-idx="${i}" onchange="saveExtPrefFavDesk()"
                style="border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px;background:var(--bg);color:var(--text)">
                <option value="">None</option>
                ${DESKS.map(d => '<option value="' + d.id + '"' + (favDesks[i] === d.id ? ' selected' : '') + '>' + d.id + ' &mdash; ' + d.neighbourhood + '</option>').join('')}
              </select>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Sit Near Teams</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${allTeams.filter(t => t !== currentUser.team).map(t => `
              <button class="env-pref-btn${crossTeams.includes(t) ? ' active' : ''}" onclick="toggleCrossTeam('${t}')">${t}</button>
            `).join('')}
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">Flex Mode</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">I don't mind where I sit &mdash; I'll fill in gaps</div>
          </div>
          <button class="btn btn-sm ${flexMode ? 'btn-primary' : 'btn-secondary'}" onclick="toggleFlexMode()">${flexMode ? 'On' : 'Off'}</button>
        </div>
      </div>
    </div>
  `;
}

function saveExtPrefFavDesk() {
  const prefs = loadUserExtPrefs(currentUser.id);
  prefs.favoriteDeskIds = [...document.querySelectorAll('.fav-desk-sel')]
    .map(s => s.value).filter(Boolean);
  saveUserExtPrefs(currentUser.id, prefs);
  toast('Favourite desks saved', 'success');
}

function toggleCrossTeam(team) {
  const prefs = loadUserExtPrefs(currentUser.id);
  const teams = prefs.crossTeamProximity || [];
  if (teams.includes(team)) {
    prefs.crossTeamProximity = teams.filter(t => t !== team);
  } else {
    prefs.crossTeamProximity = [...teams, team];
  }
  saveUserExtPrefs(currentUser.id, prefs);
  const btn = [...document.querySelectorAll('.env-pref-btn')].find(b => b.textContent.trim() === team);
  if (btn) btn.classList.toggle('active', prefs.crossTeamProximity.includes(team));
  toast('Cross-team preference updated', 'success');
}

function toggleFlexMode() {
  const prefs = loadUserExtPrefs(currentUser.id);
  prefs.flexMode = !prefs.flexMode;
  saveUserExtPrefs(currentUser.id, prefs);
  toast('Flex mode ' + (prefs.flexMode ? 'enabled' : 'disabled'), 'success');
  renderDashboard();
}

// ══════════════════════════════════════════════════════════════════════════
// CALENDAR INTEGRATION
// ══════════════════════════════════════════════════════════════════════════

const CALENDAR_CONFIG_KEY = 'mdb_calendar_config';
function loadCalendarConfig() { try { return JSON.parse(localStorage.getItem(CALENDAR_CONFIG_KEY)||'null') || {}; } catch { return {}; } }
function saveCalendarConfig(c) { localStorage.setItem(CALENDAR_CONFIG_KEY, JSON.stringify(c)); }

function showCalendarConnectModal() {
  showModal(`
    <div class="modal-title">Connect Calendar</div>
    <div class="modal-desc" style="margin-bottom:20px">Choose your calendar provider to auto-detect office days.</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn btn-primary btn-full" onclick="connectMicrosoftCalendar()">
        &#x1F535; Connect Microsoft 365 / Outlook
      </button>
      <button class="btn btn-secondary btn-full" onclick="connectGoogleCalendar()">
        &#x1F534; Connect Google Calendar
      </button>
    </div>
    <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:8px;font-size:12px;color:var(--text-muted)">
      <strong>Privacy:</strong> Perch only reads event titles, locations, and dates to detect office attendance. Event content is never stored.
    </div>
    <button class="btn btn-ghost btn-full" style="margin-top:8px" onclick="hideModal()">Cancel</button>
  `);
}

function connectMicrosoftCalendar() {
  hideModal();
  const clientId = loadCalendarConfig().msClientId || '';
  if (typeof msal !== 'undefined' && clientId) {
    _connectMSAL(clientId);
  } else {
    showModal(`
      <div class="modal-title">Microsoft 365 Setup</div>
      <div class="modal-desc">Enter your Azure AD application (client) ID to enable calendar sync.</div>
      <div style="margin-bottom:14px">
        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:5px">Azure AD Client ID</label>
        <input id="ms-client-id" type="text" class="field-input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value="${loadCalendarConfig().msClientId || ''}">
        <div style="font-size:11px;color:var(--text-muted);margin-top:5px">Found in Azure Portal &rarr; App registrations &rarr; your app &rarr; Application (client) ID</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveMsClientIdAndConnect()">Connect</button>
      </div>
    `);
  }
}

function saveMsClientIdAndConnect() {
  const clientId = document.getElementById('ms-client-id')?.value.trim();
  if (!clientId) { toast('Enter a client ID', 'error'); return; }
  const cfg = loadCalendarConfig();
  cfg.msClientId = clientId;
  saveCalendarConfig(cfg);
  hideModal();
  _connectMSAL(clientId);
}

async function _connectMSAL(clientId) {
  if (typeof msal === 'undefined') {
    toast('MSAL library not loaded — add it to index.html', 'error');
    return;
  }
  try {
    const msalApp = new msal.PublicClientApplication({
      auth: { clientId, redirectUri: location.origin + location.pathname }
    });
    const request = { scopes: ['User.Read', 'Calendars.Read'] };
    let result;
    try {
      result = await msalApp.acquireTokenSilent({ ...request, account: msalApp.getAllAccounts()[0] });
    } catch {
      result = await msalApp.loginPopup(request);
    }
    const cfg = loadCalendarConfig();
    cfg.connected = true;
    cfg.provider = 'microsoft';
    cfg.accessToken = result.accessToken;
    cfg.email = result.account?.username;
    cfg.expiresAt = result.expiresOn?.toISOString();
    saveCalendarConfig(cfg);
    toast('Microsoft 365 calendar connected!', 'success');
    syncCalendarDeclarations();
  } catch (e) {
    toast('Microsoft connection failed: ' + e.message, 'error');
  }
}

function connectGoogleCalendar() {
  hideModal();
  const clientId = loadCalendarConfig().googleClientId || '';
  showModal(`
    <div class="modal-title">Google Calendar Setup</div>
    <div class="modal-desc">Enter your Google OAuth 2.0 client ID to enable calendar sync.</div>
    <div style="margin-bottom:14px">
      <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);display:block;margin-bottom:5px">Google OAuth Client ID</label>
      <input id="google-client-id" type="text" class="field-input" placeholder="xxxx.apps.googleusercontent.com"
        value="${clientId}">
      <div style="font-size:11px;color:var(--text-muted);margin-top:5px">Google Cloud Console &rarr; Credentials &rarr; OAuth 2.0 Client IDs</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveGoogleClientIdAndConnect()">Connect</button>
    </div>
  `);
}

function saveGoogleClientIdAndConnect() {
  const clientId = document.getElementById('google-client-id')?.value.trim();
  if (!clientId) { toast('Enter a client ID', 'error'); return; }
  const cfg = loadCalendarConfig();
  cfg.googleClientId = clientId;
  saveCalendarConfig(cfg);
  hideModal();
  _connectGoogle(clientId);
}

async function _connectGoogle(clientId) {
  if (typeof google === 'undefined' || !google.accounts) {
    toast('Google Identity Services not loaded', 'error');
    return;
  }
  google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/calendar.events.readonly',
    callback: async (response) => {
      if (response.error) { toast('Google connection failed: ' + response.error, 'error'); return; }
      const cfg = loadCalendarConfig();
      cfg.connected = true;
      cfg.provider = 'google';
      cfg.accessToken = response.access_token;
      cfg.expiresAt = new Date(Date.now() + response.expires_in * 1000).toISOString();
      saveCalendarConfig(cfg);
      toast('Google Calendar connected!', 'success');
      syncCalendarDeclarations();
    }
  }).requestAccessToken();
}

function disconnectCalendar() {
  saveCalendarConfig({});
  toast('Calendar disconnected', 'info');
  renderDeclareView();
}

async function syncCalendarDeclarations() {
  const cfg = loadCalendarConfig();
  if (!cfg.connected || !cfg.accessToken) {
    toast('No calendar connected', 'error');
    return;
  }
  try {
    const events = cfg.provider === 'microsoft'
      ? await fetchMicrosoftCalendarEvents(cfg.accessToken)
      : await fetchGoogleCalendarEvents(cfg.accessToken);
    const suggestions = parseCalendarForAttendance(events);
    if (suggestions.length === 0) {
      toast('No office attendance signals found in your next 14 days', 'info');
      return;
    }
    showCalendarSuggestions(suggestions);
  } catch (e) {
    toast('Calendar sync failed: ' + e.message, 'error');
    if (e.message.includes('401') || e.message.includes('403')) {
      const cfg2 = loadCalendarConfig();
      cfg2.connected = false;
      saveCalendarConfig(cfg2);
    }
  }
}

async function fetchMicrosoftCalendarEvents(token) {
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 14 * 86400000).toISOString();
  const url = 'https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=' + start + '&endDateTime=' + end + '&$select=subject,start,end,location,isAllDay,isOnlineMeeting,bodyPreview&$top=100';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Graph API error: ' + res.status);
  const data = await res.json();
  return (data.value || []).map(e => ({
    title: e.subject,
    date: e.start.dateTime ? e.start.dateTime.slice(0,10) : e.start.date,
    isAllDay: e.isAllDay,
    location: e.location?.displayName || '',
    isOnlineMeeting: e.isOnlineMeeting || false,
  }));
}

async function fetchGoogleCalendarEvents(token) {
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 14 * 86400000).toISOString();
  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' + start + '&timeMax=' + end + '&singleEvents=true&orderBy=startTime&fields=items(summary,start,end,location,status)';
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Calendar API error: ' + res.status);
  const data = await res.json();
  return (data.items || []).filter(e => e.status !== 'cancelled').map(e => ({
    title: e.summary || '',
    date: e.start.date || e.start.dateTime?.slice(0,10),
    isAllDay: !!e.start.date,
    location: e.location || '',
    isOnlineMeeting: false,
  }));
}

function parseCalendarForAttendance(events) {
  const officePattern = /\b(in.?office|office.?day|in the office|working from office|at hq|at the office)\b/i;
  const suggestions = [];

  for (const ev of events) {
    if (ev.isAllDay && (officePattern.test(ev.title) || officePattern.test(ev.location))) {
      const existing = getDeclaration(currentUser.id, ev.date);
      if (!existing) {
        suggestions.push({ date: ev.date, status: 'yes', reason: 'All-day event: "' + ev.title + '"', source: 'calendar' });
      }
    }
  }

  const byDay = {};
  for (const ev of events) {
    if (!ev.isAllDay && !ev.isOnlineMeeting) {
      if (!byDay[ev.date]) byDay[ev.date] = [];
      byDay[ev.date].push(ev);
    }
  }
  for (const [date, evs] of Object.entries(byDay)) {
    if (evs.length >= 3) {
      const existing = getDeclaration(currentUser.id, date);
      if (!existing && !suggestions.find(s => s.date === date)) {
        suggestions.push({ date, status: 'maybe', reason: evs.length + ' in-person meetings detected', source: 'calendar' });
      }
    }
  }

  return suggestions.filter(s => s.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
}

function showCalendarSuggestions(suggestions) {
  showModal(`
    <div class="modal-title">Calendar Attendance Signals</div>
    <div class="modal-desc">Perch detected these office days in your calendar. Accept or dismiss each one.</div>
    <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;margin:14px 0">
      ${suggestions.map((s, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:8px">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${parseDate(s.date).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})}</div>
            <div style="font-size:11.5px;color:var(--text-muted)">${s.reason}</div>
          </div>
          <span class="pill ${s.status === 'yes' ? 'pill-blue' : 'pill-amber'}">${s.status}</span>
          <input type="checkbox" class="cal-sugg-cb" value="${i}" checked>
        </div>
      `).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="hideModal()">Dismiss all</button>
      <button class="btn btn-primary" onclick="acceptCalendarSuggestions(${JSON.stringify(suggestions).replace(/"/g,'&quot;')})">Accept selected</button>
    </div>
  `);
}

function acceptCalendarSuggestions(suggestions) {
  const checked = [...document.querySelectorAll('.cal-sugg-cb:checked')].map(cb => parseInt(cb.value));
  let count = 0;
  for (const idx of checked) {
    const s = suggestions[idx];
    if (s) { setDeclaration(currentUser.id, s.date, s.status, 'calendar'); count++; }
  }
  hideModal();
  toast(count + ' calendar day' + (count !== 1 ? 's' : '') + ' declared', 'success');
  renderDeclareView();
}

function simulateCalendarSync() {
  const fakeDates = Array.from({length: 10}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  }).filter(d => d.getDay() !== 0 && d.getDay() !== 6);

  const events = [];
  fakeDates.forEach((d, i) => {
    const date = toDateStr(d);
    if (i % 3 === 0) {
      events.push({ title: 'Office Day', date, isAllDay: true, location: 'London HQ', isOnlineMeeting: false });
    } else if (i % 3 === 1) {
      ['Team standup', 'Design review', '1:1 with manager'].forEach(title => {
        events.push({ title, date, isAllDay: false, location: 'Meeting Room A', isOnlineMeeting: false });
      });
    }
  });

  const suggestions = parseCalendarForAttendance(events);
  if (suggestions.length === 0) {
    toast('No new signals to import', 'info');
    return;
  }
  showCalendarSuggestions(suggestions);
}

// ── Accessibility ────────────────────────────────────────────────────────────

// ── Profile ────────────────────────────────────────────────────────────────

function renderProfileView() {
  const container = document.getElementById('view-profile');
  if (!container) return;

  const prefs  = loadProfilePrefs(currentUser.id);
  const isDark = document.documentElement.dataset.theme === 'dark';

  const AREAS = ['', 'Window Bank', 'Quiet Zone', 'Core Desk Area', 'Collaboration Zone'];
  const areaOptions = AREAS.map(a =>
    `<option value="${a}"${prefs.preferredArea === a ? ' selected' : ''}>${a || 'No preference'}</option>`
  ).join('');

  const floorOptions = [
    { value: '', label: 'No preference' },
    { value: 'ground', label: 'Ground Floor' },
    { value: 'first',  label: 'First Floor'  },
  ].map(f =>
    `<option value="${f.value}"${prefs.preferredFloor === f.value ? ' selected' : ''}>${f.label}</option>`
  ).join('');

  const toggleRow = (key, label, desc, checked) => `
    <div class="pref-toggle-row">
      <div>
        <div class="pref-toggle-label">${label}</div>
        ${desc ? `<div class="pref-toggle-desc">${desc}</div>` : ''}
      </div>
      <label class="toggle-switch" aria-label="${label}">
        <input type="checkbox"${checked ? ' checked' : ''} onchange="profileSetPref('${key}', this.checked)">
        <span class="toggle-slider"></span>
      </label>
    </div>`;

  container.innerHTML = `
    <div class="page-header">
      <h1>Profile</h1>
      <p>Your preferences and display settings</p>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="profile-hero">
        <div class="user-avatar" style="width:52px;height:52px;font-size:1.8rem;background:${avatarColor(currentUser.fullName)};flex-shrink:0">${initials(currentUser.fullName)}</div>
        <div class="profile-hero-info">
          <div class="profile-hero-name">${currentUser.fullName}</div>
          <div class="profile-hero-role">${currentUser.role} &middot; ${currentUser.team}</div>
          <div class="profile-hero-email">${currentUser.email}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">Preferred Desk &amp; Area</span></div>
      <div class="card-body" style="padding:0 20px">
        <div class="pref-toggle-row">
          <div>
            <div class="pref-toggle-label">Area</div>
            <div class="pref-toggle-desc">Which neighbourhood suits you best?</div>
          </div>
          <select class="pref-select" onchange="profileSetPref('preferredArea', this.value)">${areaOptions}</select>
        </div>
        <div class="pref-toggle-row">
          <div>
            <div class="pref-toggle-label">Floor</div>
            <div class="pref-toggle-desc">Ground or first?</div>
          </div>
          <select class="pref-select" onchange="profileSetPref('preferredFloor', this.value)">${floorOptions}</select>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">Desk Requirements</span></div>
      <div class="card-body" style="padding:0 20px">
        ${toggleRow('quietDesk',     'Quiet Desk',     'Prefer a desk away from noisy areas',  prefs.quietDesk)}
        ${toggleRow('standingDesk',  'Standing Desk',  'Height-adjustable desk',               prefs.standingDesk)}
        ${toggleRow('dualMonitor',   'Dual Monitor',   'Two screens to work at your best',     prefs.dualMonitor)}
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title">Location Preferences</span></div>
      <div class="card-body" style="padding:0 20px">
        ${toggleRow('nearKitchen',    'Near Kitchen',          'Handy for coffee runs',                        prefs.nearKitchen)}
        ${toggleRow('nearToilets',    'Near Toilets',          '',                                             prefs.nearToilets)}
        ${toggleRow('awayFromKieran', 'Well Away from Kieran', "We all know why &nbsp;&#128578;",              prefs.awayFromKieran)}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">Display</span></div>
      <div class="card-body" style="padding:0 20px">
        ${toggleRow('darkMode', 'Dark Mode', 'Switch to a darker colour scheme', isDark)}
      </div>
    </div>
  `;
}

const THEMES = ['light', 'dark', 'blue', 'purple', 'warm', 'contrast'];
const THEME_LABELS = { light: '☀️ Light', dark: '🌙 Dark', blue: '💙 Blue', purple: '💜 Purple', warm: '🟠 Warm', contrast: '⬛ Contrast' };

function cycleTheme() {
  const current = document.documentElement.dataset.theme || 'light';
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  document.documentElement.dataset.theme = next;
  document.documentElement.classList.remove('dark-mode');
  localStorage.setItem('perch_theme', next);
  const btn = document.getElementById('a11y-theme-btn');
  if (btn) {
    const lbl = btn.querySelector('.a11y-theme-label');
    if (lbl) lbl.textContent = THEME_LABELS[next] || next;
  }
}

function cycleFontSize() {
  const sizes = ['xs', 'normal', 'large', 'larger', 'largest'];
  const labels = { xs: 'A−', normal: 'A', large: 'A+', larger: 'A++', largest: 'A+++' };
  const current = document.documentElement.dataset.fontSize || 'normal';
  const next = sizes[(sizes.indexOf(current) + 1) % sizes.length];
  document.documentElement.dataset.fontSize = next;
  localStorage.setItem('perch_fontsize', next);
  const btn = document.getElementById('a11y-font-btn');
  if (btn) {
    btn.title = `Font size: ${next}`;
    const lbl = btn.querySelector('.a11y-font-label');
    if (lbl) lbl.textContent = labels[next];
  }
}

function initAccessibility() {
  const stored = localStorage.getItem('perch_theme') || 'light';
  const theme = THEMES.includes(stored) ? stored : (stored === 'dark' ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  const fontSize = localStorage.getItem('perch_fontsize');
  if (fontSize) document.documentElement.dataset.fontSize = fontSize;
}

document.addEventListener('DOMContentLoaded', init);
