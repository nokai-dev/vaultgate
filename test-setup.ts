/**
 * Vitest Setup — forces demo mode for all tests
 * Must be imported before any other module that reads env vars
 */

// Force demo mode for all tests (no real Auth0 calls)
process.env.VAULTGATE_DEMO_MODE = 'true';
process.env.VAULTGATE_QUIET = '1';

// Clear Auth0 credentials so app detects "no credentials = demo mode"
// (empty string is falsy, triggering the `!process.env.X` branch)
process.env.AUTH0_DOMAIN = '';
process.env.AUTH0_CLIENT_ID = '';
process.env.AUTH0_CLIENT_SECRET = '';
process.env.AUTH0_TOKEN_VAULT_API = '';
process.env.AUTH0_TOKEN_VAULT_CONNECTION_ID = '';
process.env.CIBA_LOGIN_HINT = '';
process.env.SLACK_BOT_TOKEN = '';
