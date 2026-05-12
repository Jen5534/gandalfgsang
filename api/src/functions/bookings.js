const { app } = require('@azure/functions');
const { getPool, sql } = require('../shared/db');
const { validateToken } = require('../shared/auth');

// GET /api/bookings?userId=&date=&upcoming=true
app.http('listBookings', {
  methods: ['GET'],
  route: 'bookings',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const claims = await validateToken(request.headers.get('authorization'));
      const pool = await getPool();
      const req = pool.request();

      let query = 'SELECT * FROM bookings WHERE 1=1';

      const userId = request.query.get('userId');
      const date = request.query.get('date');
      const upcoming = request.query.get('upcoming');

      if (userId) {
        query += ' AND user_id = @userId';
        req.input('userId', sql.NVarChar(50), userId);
      }
      if (date) {
        query += ' AND date = @date';
        req.input('date', sql.Date, new Date(date));
      }
      if (upcoming === 'true') {
        query += ' AND date >= CAST(GETDATE() AS DATE) ORDER BY date ASC';
      }

      const result = await req.query(query);
      return { jsonBody: result.recordset };
    } catch (err) {
      return authOrServerError(err, context);
    }
  }
});

// POST /api/bookings  { userId, deskId, date, slot }
app.http('createBooking', {
  methods: ['POST'],
  route: 'bookings',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      await validateToken(request.headers.get('authorization'));
      const { userId, deskId, date, slot } = await request.json();

      if (!userId || !deskId || !date || !slot) {
        return { status: 400, jsonBody: { error: 'userId, deskId, date, and slot are required' } };
      }

      const pool = await getPool();
      const result = await pool.request()
        .input('userId', sql.NVarChar(50), userId)
        .input('deskId', sql.NVarChar(10), deskId)
        .input('date', sql.Date, new Date(date))
        .input('slot', sql.NVarChar(10), slot)
        .query(`
          INSERT INTO bookings (user_id, desk_id, date, slot)
          OUTPUT INSERTED.*
          VALUES (@userId, @deskId, @date, @slot)
        `);

      return { status: 201, jsonBody: result.recordset[0] };
    } catch (err) {
      // Unique constraint violation — desk/slot already taken
      if (err.number === 2627 || err.number === 2601) {
        return { status: 409, jsonBody: { error: 'That desk slot is already booked' } };
      }
      return authOrServerError(err, context);
    }
  }
});

// DELETE /api/bookings/{id}
app.http('deleteBooking', {
  methods: ['DELETE'],
  route: 'bookings/{id}',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const claims = await validateToken(request.headers.get('authorization'));
      const { id } = request.params;
      const pool = await getPool();

      // Users can only cancel their own bookings; admins can cancel any.
      const ownerCheck = claims.roles?.includes('Admin')
        ? ''
        : ' AND user_id = @callerId';

      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('callerId', sql.NVarChar(50), claims.oid)
        .query(`DELETE FROM bookings WHERE id = @id${ownerCheck}`);

      if (result.rowsAffected[0] === 0) {
        return { status: 404, jsonBody: { error: 'Booking not found or not yours to cancel' } };
      }
      return { status: 204 };
    } catch (err) {
      return authOrServerError(err, context);
    }
  }
});

// PATCH /api/bookings/{id}/checkin
app.http('checkinBooking', {
  methods: ['PATCH'],
  route: 'bookings/{id}/checkin',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const claims = await validateToken(request.headers.get('authorization'));
      const { id } = request.params;
      const pool = await getPool();

      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('userId', sql.NVarChar(50), claims.oid)
        .query(`
          UPDATE bookings
          SET checked_in = 1, checked_in_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE id = @id AND user_id = @userId
        `);

      if (result.recordset.length === 0) {
        return { status: 404, jsonBody: { error: 'Booking not found or not yours' } };
      }
      return { jsonBody: result.recordset[0] };
    } catch (err) {
      return authOrServerError(err, context);
    }
  }
});

function authOrServerError(err, context) {
  if (err.status === 401) return { status: 401, jsonBody: { error: err.message } };
  context.error(err);
  return { status: 500, jsonBody: { error: 'Internal server error' } };
}
