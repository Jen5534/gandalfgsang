// Production data layer — drop-in replacement for the localStorage functions in app.js.
//
// To wire this in, load this script INSTEAD OF the localStorage-backed sections of app.js,
// or include it after app.js and let these declarations shadow the originals via module
// pattern / bundler tree-shaking.
//
// Requires msal-browser to be initialised first and `getAccessToken()` to be available
// (see auth.js). All functions mirror the signatures used in app.js so the rest of the
// UI code requires no changes.

const API_BASE = '/api';

async function authHeaders() {
  const token = await getAccessToken();   // provided by auth.js / MSAL
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...await authHeaders(), ...(options.headers || {}) }
  });
  if (res.status === 204) return null;
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API error ${res.status}`);
  return body;
}

// ── Bookings ────────────────────────────────────────────────────────────────

async function loadBookings(filters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null)
  );
  return apiFetch(`/bookings${params.size ? '?' + params : ''}`);
}

async function getBookings({ userId, date, upcoming } = {}) {
  return loadBookings({ userId, date, upcoming: upcoming ? 'true' : undefined });
}

async function createBooking({ userId, deskId, date, slot }) {
  return apiFetch('/bookings', {
    method: 'POST',
    body: JSON.stringify({ userId, deskId, date, slot })
  });
}

async function deleteBooking(id) {
  await apiFetch(`/bookings/${id}`, { method: 'DELETE' });
  return { success: true };
}

async function checkInBooking(bookingId) {
  return apiFetch(`/bookings/${bookingId}/checkin`, { method: 'PATCH' });
}

// ── Soft holds ───────────────────────────────────────────────────────────────

async function loadSoftHolds(date) {
  return apiFetch(`/soft-holds${date ? '?date=' + date : ''}`);
}

async function saveSoftHold({ userId, deskId, date, expiryTime }) {
  return apiFetch('/soft-holds', {
    method: 'POST',
    body: JSON.stringify({ userId, deskId, date, expiryTime })
  });
}

async function deleteSoftHold(id) {
  await apiFetch(`/soft-holds/${id}`, { method: 'DELETE' });
}

// ── Users ────────────────────────────────────────────────────────────────────
// User profiles come from Microsoft Graph rather than a local data file.

async function fetchUsers() {
  const token = await getAccessToken(['https://graph.microsoft.com/User.Read.All']);
  const res = await fetch('https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,department,jobTitle', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch users from Graph');
  const { value } = await res.json();

  // Normalise Graph shape to match the USERS_DATA shape the app expects
  return value.map(u => ({
    id: u.id,
    fullName: u.displayName,
    email: u.mail,
    team: u.department,
    role: u.jobTitle
  }));
}

// ── Historic patterns ────────────────────────────────────────────────────────

async function fetchHistoricPatterns(userId) {
  return apiFetch(`/historic-patterns${userId ? '?userId=' + userId : ''}`);
}

// ── Desks ────────────────────────────────────────────────────────────────────

async function fetchDesks({ floor, date } = {}) {
  const params = new URLSearchParams(
    Object.entries({ floor, date }).filter(([, v]) => v)
  );
  return apiFetch(`/desks${params.size ? '?' + params : ''}`);
}
