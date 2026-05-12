const { app } = require('@azure/functions');
const { getPool, sql } = require('../shared/db');
const { validateToken } = require('../shared/auth');

// Desk metadata is static config — defined here rather than in the DB.
// Only availability (who has booked what on a given date) is dynamic.
const DESKS = [
  { id: 'G-W1', floor: 'ground', neighbourhood: 'Window Bank',        features: ['window-seat', 'dual-monitor'],         env: ['bright', 'cool', 'fresh-air'] },
  { id: 'G-W2', floor: 'ground', neighbourhood: 'Window Bank',        features: ['window-seat', 'standing-desk'],        env: ['bright', 'cool', 'fresh-air'] },
  { id: 'G-W3', floor: 'ground', neighbourhood: 'Window Bank',        features: ['window-seat'],                         env: ['bright', 'cool'] },
  { id: 'G-W4', floor: 'ground', neighbourhood: 'Window Bank',        features: ['window-seat', 'quiet-area'],           env: ['bright', 'cool', 'quiet'] },
  { id: 'G-Q1', floor: 'ground', neighbourhood: 'Quiet Zone',         features: ['quiet-area', 'dual-monitor'],          env: ['quiet', 'dim'] },
  { id: 'G-Q2', floor: 'ground', neighbourhood: 'Quiet Zone',         features: ['quiet-area'],                          env: ['quiet', 'dim'] },
  { id: 'G-Q3', floor: 'ground', neighbourhood: 'Quiet Zone',         features: ['quiet-area', 'standing-desk'],         env: ['quiet', 'dim', 'cool'] },
  { id: 'G-C1', floor: 'ground', neighbourhood: 'Core Desk Area',     features: ['dual-monitor'],                        env: ['warm'] },
  { id: 'G-C2', floor: 'ground', neighbourhood: 'Core Desk Area',     features: ['dual-monitor', 'standing-desk'],       env: ['warm'] },
  { id: 'G-C3', floor: 'ground', neighbourhood: 'Core Desk Area',     features: ['accessible-desk', 'dual-monitor'],     env: [] },
  { id: 'G-C4', floor: 'ground', neighbourhood: 'Core Desk Area',     features: [],                                      env: ['warm', 'aircon-vent'] },
  { id: 'G-C5', floor: 'ground', neighbourhood: 'Core Desk Area',     features: ['standing-desk'],                       env: ['cool', 'aircon-vent'] },
  { id: 'G-L1', floor: 'ground', neighbourhood: 'Collaboration Zone', features: ['near-team', 'dual-monitor'],           env: ['lively', 'warm'] },
  { id: 'G-L2', floor: 'ground', neighbourhood: 'Collaboration Zone', features: ['near-team'],                           env: ['lively', 'warm'] },
  { id: 'G-L3', floor: 'ground', neighbourhood: 'Collaboration Zone', features: ['near-team', 'standing-desk'],          env: ['lively'] },
  { id: 'F-W1', floor: 'first',  neighbourhood: 'Window Bank',        features: ['window-seat', 'dual-monitor'],         env: ['bright', 'cool', 'fresh-air'] },
  { id: 'F-W2', floor: 'first',  neighbourhood: 'Window Bank',        features: ['window-seat'],                         env: ['bright', 'cool'] },
  { id: 'F-W3', floor: 'first',  neighbourhood: 'Window Bank',        features: ['window-seat', 'standing-desk'],        env: ['bright', 'cool', 'fresh-air'] },
  { id: 'F-Q1', floor: 'first',  neighbourhood: 'Quiet Zone',         features: ['quiet-area', 'dual-monitor'],          env: ['quiet', 'dim'] },
  { id: 'F-Q2', floor: 'first',  neighbourhood: 'Quiet Zone',         features: ['quiet-area', 'standing-desk'],         env: ['quiet', 'dim', 'cool'] },
  { id: 'F-Q3', floor: 'first',  neighbourhood: 'Quiet Zone',         features: ['quiet-area'],                          env: ['quiet', 'dim'] },
  { id: 'F-C1', floor: 'first',  neighbourhood: 'Core Desk Area',     features: ['dual-monitor'],                        env: ['warm'] },
  { id: 'F-C2', floor: 'first',  neighbourhood: 'Core Desk Area',     features: ['accessible-desk'],                     env: [] },
  { id: 'F-C3', floor: 'first',  neighbourhood: 'Core Desk Area',     features: ['standing-desk', 'dual-monitor'],       env: ['cool', 'aircon-vent'] },
  { id: 'F-C4', floor: 'first',  neighbourhood: 'Core Desk Area',     features: [],                                      env: ['warm'] },
  { id: 'F-L1', floor: 'first',  neighbourhood: 'Collaboration Zone', features: ['near-team'],                           env: ['lively', 'bright'] },
  { id: 'F-L2', floor: 'first',  neighbourhood: 'Collaboration Zone', features: ['near-team', 'dual-monitor'],           env: ['lively', 'warm'] },
  { id: 'F-L3', floor: 'first',  neighbourhood: 'Collaboration Zone', features: ['near-team', 'standing-desk'],          env: ['lively'] },
];

// GET /api/desks?floor=ground&date=YYYY-MM-DD
// Returns desks annotated with booked slots for the requested date.
app.http('listDesks', {
  methods: ['GET'],
  route: 'desks',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      await validateToken(request.headers.get('authorization'));

      const floor = request.query.get('floor');
      const date = request.query.get('date');

      let desks = floor ? DESKS.filter(d => d.floor === floor) : DESKS;

      if (date) {
        const pool = await getPool();
        const result = await pool.request()
          .input('date', sql.Date, new Date(date))
          .query('SELECT desk_id, slot, user_id FROM bookings WHERE date = @date');

        const bookingsByDesk = result.recordset.reduce((acc, row) => {
          if (!acc[row.desk_id]) acc[row.desk_id] = [];
          acc[row.desk_id].push({ slot: row.slot, userId: row.user_id });
          return acc;
        }, {});

        desks = desks.map(d => ({
          ...d,
          bookings: bookingsByDesk[d.id] || []
        }));
      }

      return { jsonBody: desks };
    } catch (err) {
      if (err.status === 401) return { status: 401, jsonBody: { error: err.message } };
      context.error(err);
      return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
  }
});
