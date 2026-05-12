const sql = require('mssql');

// Uses managed identity when deployed to Azure — no credentials in config.
// Set SQL_SERVER and SQL_DATABASE in Azure Static Web Apps environment settings.
const config = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  authentication: {
    type: 'azure-active-directory-managed-identity'
  },
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

let pool;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

module.exports = { getPool, sql };
