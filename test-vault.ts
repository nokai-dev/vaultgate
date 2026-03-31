import 'dotenv/config';
import { TokenVault } from './src/tokenVault.js';

const vault = new TokenVault({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  tokenVaultApiId: process.env.AUTH0_TOKEN_VAULT_API,
  connectionId: process.env.AUTH0_TOKEN_VAULT_CONNECTION_ID,
  slackBotToken: process.env.SLACK_BOT_TOKEN
});

vault.requestToken('slack', 'read', '#engineering').then(r => {
  console.log('SUCCESS');
  console.log('Token:', r.token ? r.token.substring(0, 50) + '...' : 'none');
  console.log('Status:', r.tokenState.status);
}).catch(err => {
  console.log('ERROR:', err.message);
});
