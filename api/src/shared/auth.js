const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Validates Entra ID bearer tokens issued for this app.
// Set AZURE_TENANT_ID and AZURE_CLIENT_ID in environment settings.
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 600000
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function validateToken(authHeader) {
  return new Promise((resolve, reject) => {
    if (!authHeader?.startsWith('Bearer ')) {
      return reject(Object.assign(new Error('Missing or malformed Authorization header'), { status: 401 }));
    }
    const token = authHeader.slice(7);
    jwt.verify(
      token,
      getSigningKey,
      {
        audience: process.env.AZURE_CLIENT_ID,
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`
      },
      (err, claims) => {
        if (err) return reject(Object.assign(err, { status: 401 }));
        resolve(claims);
      }
    );
  });
}

module.exports = { validateToken };
