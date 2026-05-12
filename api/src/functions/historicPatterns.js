const { app } = require('@azure/functions');
const { getPool, sql } = require('../shared/db');
const { validateToken } = require('../shared/auth');

// GET /api/historic-patterns?userId=
// Returns all patterns, or filtered to a single user.
app.http('listHistoricPatterns', {
  methods: ['GET'],
  route: 'historic-patterns',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      await validateToken(request.headers.get('authorization'));
      const pool = await getPool();
      const req = pool.request();

      let query = 'SELECT * FROM historic_patterns';
      const userId = request.query.get('userId');

      if (userId) {
        query += ' WHERE user_id = @userId';
        req.input('userId', sql.NVarChar(50), userId);
      }

      const result = await req.query(query);

      // Group by userId to match the shape of the existing HISTORIC_PATTERNS constant
      const grouped = result.recordset.reduce((acc, row) => {
        let entry = acc.find(e => e.userId === row.user_id);
        if (!entry) {
          entry = { userId: row.user_id, patterns: [] };
          acc.push(entry);
        }
        entry.patterns.push({
          day: row.day,
          arrivalTime: row.arrival_time,
          deskId: row.desk_id,
          consistency: row.consistency
        });
        return acc;
      }, []);

      return { jsonBody: grouped };
    } catch (err) {
      if (err.status === 401) return { status: 401, jsonBody: { error: err.message } };
      context.error(err);
      return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
  }
});
