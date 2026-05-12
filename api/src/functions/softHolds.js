const { app } = require('@azure/functions');
const { getPool, sql } = require('../shared/db');
const { validateToken } = require('../shared/auth');

// GET /api/soft-holds?date=YYYY-MM-DD
app.http('listSoftHolds', {
  methods: ['GET'],
  route: 'soft-holds',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      await validateToken(request.headers.get('authorization'));
      const pool = await getPool();
      const req = pool.request();

      let query = 'SELECT * FROM soft_holds WHERE 1=1';
      const date = request.query.get('date');

      if (date) {
        query += ' AND date = @date';
        req.input('date', sql.Date, new Date(date));
      }

      const result = await req.query(query);
      return { jsonBody: result.recordset };
    } catch (err) {
      return authOrServerError(err, context);
    }
  }
});

// POST /api/soft-holds  { userId, deskId, date, expiryTime }
app.http('createSoftHold', {
  methods: ['POST'],
  route: 'soft-holds',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      await validateToken(request.headers.get('authorization'));
      const { userId, deskId, date, expiryTime } = await request.json();

      if (!userId || !deskId || !date || !expiryTime) {
        return { status: 400, jsonBody: { error: 'userId, deskId, date, and expiryTime are required' } };
      }

      const pool = await getPool();
      const result = await pool.request()
        .input('userId', sql.NVarChar(50), userId)
        .input('deskId', sql.NVarChar(10), deskId)
        .input('date', sql.Date, new Date(date))
        .input('expiryTime', sql.NVarChar(5), expiryTime)
        .query(`
          INSERT INTO soft_holds (user_id, desk_id, date, expiry_time)
          OUTPUT INSERTED.*
          VALUES (@userId, @deskId, @date, @expiryTime)
        `);

      return { status: 201, jsonBody: result.recordset[0] };
    } catch (err) {
      return authOrServerError(err, context);
    }
  }
});

// DELETE /api/soft-holds/{id}
app.http('deleteSoftHold', {
  methods: ['DELETE'],
  route: 'soft-holds/{id}',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const claims = await validateToken(request.headers.get('authorization'));
      const { id } = request.params;
      const pool = await getPool();

      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('userId', sql.NVarChar(50), claims.oid)
        .query('DELETE FROM soft_holds WHERE id = @id AND user_id = @userId');

      if (result.rowsAffected[0] === 0) {
        return { status: 404, jsonBody: { error: 'Soft hold not found or not yours' } };
      }
      return { status: 204 };
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
