# Perch — API Reference

## Overview

| | Hackathon build | Production target |
|---|---|---|
| Data layer | `localStorage` (browser) | Azure SQL via Azure Functions |
| Auth | Mock SSO (auto sign-in) | Entra ID — Bearer JWT (OIDC) |
| Base URL | `http://localhost:3000` | `https://api.perch.<tenant>.com/v1` |
| Live HTTP endpoints | `/api/claude` only | All endpoints below |

All production endpoints require an `Authorization: Bearer <entra-id-token>` header.  
Admin-only endpoints additionally require the caller's JWT to carry the `perch.admin` app role.

---

## Live endpoint (hackathon)

### `POST /api/claude`
Proxies requests to the Anthropic API. Keeps the API key server-side.

**Request**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "messages": [{ "role": "user", "content": "..." }]
}
```

**Response** — Anthropic `/v1/messages` response, forwarded verbatim.

**Headers required:** `x-api-key: <anthropic-key>` (set by the server; client sends none).

---

## Bookings

### `GET /bookings`
Returns bookings visible to the caller. Regular users see their own; managers see their team's.

| Query param | Type | Description |
|---|---|---|
| `userId` | string | Filter by user (managers only) |
| `date` | `YYYY-MM-DD` | Filter by date |
| `upcoming` | boolean | Only future bookings |

**Response**
```json
[{
  "id": "string",
  "userId": "string",
  "deskId": "string",
  "date": "YYYY-MM-DD",
  "slot": "full | am | pm",
  "checkedIn": false,
  "bookedByUserId": "string | null",
  "createdAt": "ISO8601"
}]
```

### `POST /bookings`
Create a booking. Enforces booking rules (advance window, weekly cap, slot conflicts).

```json
{ "deskId": "G-W1", "date": "2026-05-20", "slot": "full", "userId": "string" }
```

### `DELETE /bookings/{id}`
Cancel a booking. Respects cancellation cutoff hours from booking rules.

### `POST /bookings/{id}/checkin`
Mark the user as checked in. Records timestamp; triggers no-show clearance.

### `POST /bookings/{id}/swap-desk`
Move an existing booking to a different desk on the same date.

```json
{ "newDeskId": "F-Q2" }
```

### `POST /bookings/{id}/handover`
Transfer a booking to another user.

```json
{ "targetUserId": "string" }
```

---

## Declarations

Declarations signal a user's intent to come into the office. The allocation engine reads these each evening.

### `GET /declarations`
Returns the caller's declarations. Admins/managers may pass `?userId=`.

### `PUT /declarations/{date}`
Idempotent — create or update a declaration for the given date.

```json
{ "status": "yes | no | maybe" }
```

### `DELETE /declarations/{date}`
Remove a declaration.

---

## Allocations

The allocation engine runs nightly and assigns desks to users who have declared `yes` for the next working day.

### `GET /allocations`
Returns the caller's current and upcoming allocations.

**Response**
```json
[{
  "id": "string",
  "userId": "string",
  "deskId": "string",
  "date": "YYYY-MM-DD",
  "type": "soft | soft-maybe | confirmed | walk-in | power-block",
  "status": "pending | confirmed | released",
  "reasonFactors": ["Near your team", "Matches your desk preferences"],
  "allocatedAt": "ISO8601"
}]
```

### `POST /allocations/{id}/confirm`
Confirm a pending allocation (locks the desk, creates a booking).

### `POST /allocations/{id}/release`
Release an allocation back to the walk-in pool.

### `POST /allocations/walkin`
Assign the best available desk to a walk-in user on arrival.

```json
{ "userId": "string" }
```

### `POST /admin/allocations/run` *(admin)*
Manually trigger the allocation engine for a given date.

```json
{ "date": "YYYY-MM-DD", "overwrite": false }
```

---

## Desks

### `GET /desks`
Returns all desks with floor, neighbourhood, features, and current enabled status.

**Response**
```json
[{
  "id": "G-W1",
  "floor": "ground | first",
  "neighbourhood": "Window Bank",
  "features": ["window-seat", "dual-monitor"],
  "env": ["bright", "cool"],
  "enabled": true
}]
```

### `GET /desks/{id}/availability`

| Query param | Required | Description |
|---|---|---|
| `date` | yes | `YYYY-MM-DD` |

Returns whether the desk is available, and for which slots.

### `PATCH /admin/desks/{id}` *(admin)*
Enable or disable a desk.

```json
{ "enabled": false }
```

---

## Users

### `GET /users/me`
Returns the authenticated user's full profile including team, role, anchor days, and working pattern.

### `GET /users`
Returns all users. Used for who's-in views and manager tools.

### `GET /users/{id}`
Returns a single user.

---

## User Profiles (Preferences)

Per-user desk and display preferences stored against the user's identity.

### `GET /users/me/profile`

```json
{
  "preferredArea": "Window Bank",
  "preferredFloor": "ground",
  "quietDesk": false,
  "standingDesk": true,
  "dualMonitor": true,
  "nearKitchen": false,
  "nearToilets": false,
  "awayFromKieran": true,
  "darkMode": false
}
```

### `PATCH /users/me/profile`
Partial update — send only the fields to change.

---

## Floor Plans

### `GET /floor-plans`
Returns configured floor plans with image URLs and assigned teams.

### `POST /admin/floor-plans` *(admin)*

```json
{
  "name": "Ground Floor",
  "building": "London HQ",
  "floorKey": "ground",
  "assignedTeams": [],
  "imageUrl": "https://..."
}
```

### `PUT /admin/floor-plans/{id}` *(admin)*
Update an existing floor plan (including image upload via base64 or URL).

### `DELETE /admin/floor-plans/{id}` *(admin)*

---

## Seating Rules

Prevent two colleagues from being allocated desks in the same neighbourhood.

### `GET /admin/seating-rules` *(admin)*

```json
[{
  "id": "sr-001",
  "userAId": "string",
  "userBId": "string",
  "reason": "Ongoing conflict",
  "createdAt": "ISO8601"
}]
```

### `POST /admin/seating-rules` *(admin)*

```json
{ "userAId": "string", "userBId": "string", "reason": "string" }
```

### `DELETE /admin/seating-rules/{id}` *(admin)*

---

## Feedback

### `POST /feedback`

```json
{
  "type": "idea | issue | praise | other",
  "subject": "string",
  "message": "string",
  "rating": 1,
  "anonymous": false
}
```

### `GET /admin/feedback` *(admin)*
Returns all feedback with status and submitter info.

### `PATCH /admin/feedback/{id}` *(admin)*

```json
{ "status": "new | in-progress | resolved | dismissed" }
```

---

## Admin Settings

All settings endpoints are admin-only.

### `GET /admin/settings`
Returns the full settings object (booking rules, capacity, office location, anchor days, neighbourhoods).

### `PATCH /admin/settings/booking-rules`

```json
{
  "maxDaysInAdvance": 14,
  "maxBookingsPerWeek": 5,
  "cancellationCutoffHours": 2,
  "autoReleaseMinutes": 30,
  "allowHalfDays": true,
  "requireCheckIn": true
}
```

### `PATCH /admin/settings/office`

```json
{
  "name": "London HQ",
  "lat": 51.5074,
  "lng": -0.1278,
  "radiusM": 300
}
```

### `PATCH /admin/settings/capacity`

```json
{ "groundFloorMaxPct": 80, "firstFloorMaxPct": 80 }
```

### `PATCH /admin/settings/allocation`

```json
{ "walkInPoolPct": 20 }
```

---

## Error responses

All endpoints return standard error shapes:

```json
{ "error": { "code": "DESK_NOT_AVAILABLE", "message": "Desk G-W1 is already booked for 2026-05-20 (full day)." } }
```

| HTTP status | When |
|---|---|
| `400` | Validation error (missing field, rule violation) |
| `401` | Missing or expired token |
| `403` | Insufficient role (e.g. non-admin calling an admin endpoint) |
| `404` | Resource not found |
| `409` | Conflict (duplicate booking, duplicate seating rule) |
| `500` | Internal server error |
