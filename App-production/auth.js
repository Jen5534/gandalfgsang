// MSAL authentication — replaces the simulated ssoLogin() in app.js.
// Load @azure/msal-browser from CDN or npm before this file.
//
// Set AZURE_CLIENT_ID and AZURE_TENANT_ID in your Static Web App environment,
// then replace the placeholders below with window.__env values or build-time substitution.

const msalConfig = {
  auth: {
    clientId: window.__env?.AZURE_CLIENT_ID || 'YOUR_CLIENT_ID',
    authority: `https://login.microsoftonline.com/${window.__env?.AZURE_TENANT_ID || 'YOUR_TENANT_ID'}`,
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'sessionStorage'
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

const DEFAULT_SCOPES = ['User.Read'];

async function ssoLogin() {
  await msalInstance.initialize();
  try {
    // Try silent sign-in first (returns immediately if the user has an active session)
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      const result = await msalInstance.acquireTokenSilent({
        scopes: DEFAULT_SCOPES,
        account: accounts[0]
      });
      return onLoginSuccess(result);
    }
    // Fall back to redirect flow
    await msalInstance.loginRedirect({ scopes: DEFAULT_SCOPES });
  } catch (err) {
    if (err instanceof msal.InteractionRequiredAuthError) {
      await msalInstance.loginRedirect({ scopes: DEFAULT_SCOPES });
    } else {
      throw err;
    }
  }
}

// Call this on every page load to handle the redirect callback
async function handleLoginRedirect() {
  await msalInstance.initialize();
  const result = await msalInstance.handleRedirectPromise();
  if (result) {
    onLoginSuccess(result);
  } else {
    // No redirect result — check for an existing session
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      onLoginSuccess({ account: accounts[0] });
    }
  }
}

function onLoginSuccess(result) {
  const account = result.account;
  // Map the Entra ID account to the user shape the app expects
  const user = {
    id: account.localAccountId,       // oid — stable per-user identifier
    fullName: account.name,
    email: account.username,
  };
  loginAs(user);                      // existing app.js function — no changes needed
}

async function logout() {
  await msalInstance.logoutRedirect();
}

// Returns a bearer token for the given scopes, refreshing silently if needed.
async function getAccessToken(scopes = DEFAULT_SCOPES) {
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) throw new Error('Not signed in');
  const result = await msalInstance.acquireTokenSilent({ scopes, account: accounts[0] });
  return result.accessToken;
}
