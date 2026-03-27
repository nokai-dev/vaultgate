# VaultGate — Auth0 Setup Guide

This guide walks you through getting every credential VaultGate needs to run in **real mode** (not demo mode). Estimated time: 30–45 minutes if you already have a Slack workspace.

---

## What VaultGate Is and Why It Exists

**The problem:** AI agents need to call external APIs (Slack, Google, GitHub) on your behalf. If you give them your actual API keys, they can do anything forever — no oversight, no revoke button.

**The solution:** VaultGate sits between the AI agent and external APIs. When the agent wants to do something:
- **Read actions** (list Slack channels) → token fetched immediately, no interrupt
- **Write actions** (post a message) → you get a push notification on your phone via Auth0 Guardian. You approve or deny. The agent waits.

**The architecture:**
```
AI Agent → VaultGate (port 18792) → Auth0 Token Vault → Slack API
                                        ↓
                              CIBA push to phone
                              (approve / deny)
```

---

## What VaultGate Needs From You

There are 6 credentials/config values. Here's what each is and where to find it.

| Variable | What it is | Where to get it |
|---|---|---|
| `AUTH0_DOMAIN` | Your Auth0 tenant domain | Auth0 Dashboard → Settings |
| `AUTH0_CLIENT_ID` | Machine-to-machine app client ID | Auth0 Dashboard → Applications |
| `AUTH0_CLIENT_SECRET` | Machine-to-machine app secret | Auth0 Dashboard → Applications |
| `AUTH0_TOKEN_VAULT_CONNECTION_ID` | The external connection (e.g. Slack) ID | Auth0 Dashboard → Connections |
| `CIBA_LOGIN_HINT` | Your Auth0 user email (used to push the approval request) | Your Auth0 account email |
| `VAULTGATE_MODE` | `demo` or `real` | You set this (real = live CIBA) |

---

## Step 1 — Create a Machine-to-Machine Application in Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com) and log in
2. In the left sidebar: **Applications** → **Create Application**
3. Choose **Machine-to-Machine** (not "Regular Web App" or "SPA")
4. Name it: `VaultGate`
5. In "Select an API" — look for `Auth0 Token Vault` in the dropdown
   - If it's not there, go to **Applications → APIs** and register a new API with identifier: `https://auth0.com/ai/`
6. Under **Permissions**, grant these:
   - `create:token_vault_tokens` (needed to create scoped tokens)
   - `read:token_vault_tokens` (needed to fetch tokens)
   - `delete:token_vault_tokens` (needed to revoke)
   - `read:connected_accounts` (needed to list connected accounts)
   - `create:connected_accounts` (needed to link a new connected account)
7. Click **Create**

After creation, go to the **Settings** tab of your new app and copy:
- **Domain** → `AUTH0_DOMAIN` (format: `dev-xxxxx.auth0.com`)
- **Client ID** → `AUTH0_CLIENT_ID`
- **Client Secret** → `AUTH0_CLIENT_SECRET`

---

## Step 2 — Enable and Configure the Token Vault Connection (e.g. Slack)

VaultGate uses Token Vault's "Connected Accounts" feature. You need to connect at least one external service. Let's use Slack as the example since VaultGate ships with Slack scopes preconfigured.

### 2a — Create a Slack App (if you don't have one)

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it `VaultGate Bot` and pick your workspace
3. In **Basic Information**, copy the **App Token (xoxp-...)** — this is `SLACK_APP_TOKEN` (not strictly needed for VaultGate but good to have)
4. In **OAuth & Permissions**, scroll to **Bot Token Scopes** and add:
   - `chat:write`
   - `channels:read`
   - `groups:read`
   - `im:read`
   - `im:write`
   - `mpim:read`
5. In **Install to Workspace**, click **Allow** — copy the **Bot User OAuth Token** (starts with `xoxb-`) — call this `SLACK_BOT_TOKEN`

### 2b — Connect Slack to Auth0 as a Token Vault Connection

This is the confusing part Auth0's dashboard makes hard to find.

1. In Auth0 Dashboard: **Connections** → **Social** (or **Enterprise** depending on the connection type)
2. Find **Slack** and click it (or add it if not present)
3. For the connection you want to use with Token Vault:
   - Under **Purpose**, set it to: **"Connected Accounts"** (not "Login" or both — Token Vault specifically needs "Connected Accounts")
   - Or if you're on a newer Auth0 dashboard: look for a **"Use with Token Vault"** toggle and enable it
4. In **Permissions**, add the Slack scopes VaultGate needs:
   - `channels:read`
   - `chat:write`
   - `groups:read`
   - `im:read`
   - `im:write`
5. Click **Save**

Now you need the **Connection ID** for `AUTH0_TOKEN_VAULT_CONNECTION_ID`:

1. While in the connection settings, look at the URL in your browser — it will look like:
   `https://manage.auth0.com/dashboard/instances/conn_1234567890/...`
2. The `conn_1234567890` part is the connection ID
3. Or go to **Connections → Database/Social** and the ID should be visible in the connection list

> ⚠️ **Auth0 dashboard garbage issue:** If you can't find the connection ID easily, try:
> - Open **Connections** → click the **"..."** menu on the Slack row → **Settings**
> - Or use the **Auth0 Management API** instead (see Step 5 for how to get it via API)

---

## Step 3 — Connect Your Personal Slack Account (Link the Connected Account)

Before VaultGate can use your Slack, **you** need to authorize Auth0 to link your Slack account to your Auth0 user profile. This is a one-time step.

1. In Auth0 Dashboard: go to **Users** → find your user (or create a test user with your email)
2. Click your user → **Connected Accounts** tab
3. Click **Add Connection** → select **Slack**
4. You'll be redirected to Slack's OAuth flow — click **Allow**
5. Now your Auth0 user profile has your Slack tokens stored in Token Vault

Alternatively, the **Connect Account flow** can be initiated via the Auth0 API:

```
POST /api/v2/connected-accounts
{
  "connection_id": "conn_xxx",
  "scope": "channels:read chat:write",
  "callback_url": "https://yourapp.com/callback"
}
```

This will return a URL you redirect the user to — once they approve, the connection is linked.

---

## Step 4 — Set CIBA_LOGIN_HINT

`CIBA_LOGIN_HINT` is the email address of your Auth0 user (the one you just linked Slack to). When VaultGate initiates a CIBA request, Auth0 uses this to figure out which user's Guardian app should receive the push notification.

It's just your email string. Set it to whatever email you use to log into Auth0.

---

## Step 5 — (Optional) Get a Management API Token for Debugging

To look up connection IDs, user info, and debug issues, get a Management API token:

1. In Auth0 Dashboard: **Applications** → **APIs** → find **Auth0 Management API**
2. Click **API Explorer** tab (or go to **Machine-to-Machine** and authorize your VaultGate app to use the Management API)
3. Authorize the `VaultGate` application to use the Management API with scope `read:connections`
4. Generate a token and test getting connections:

```bash
curl -s -X GET \
  "https://YOUR_DOMAIN.auth0.com/api/v2/connections" \
  -H "Authorization: Bearer YOUR_MANAGEMENT_TOKEN" | jq '.[] | {name, id, strategy}'
```

Look for your Slack connection ID in the output.

---

## Step 6 — Put It All Together in .env

Create a file `vaultgate/.env` with:

```bash
# Auth0 Application (Machine-to-Machine)
AUTH0_DOMAIN=dev-xxxxxxxx.auth0.com
AUTH0_CLIENT_ID=your_client_id_here
AUTH0_CLIENT_SECRET=your_client_secret_here

# Token Vault Connected Account
AUTH0_TOKEN_VAULT_CONNECTION_ID=conn_xxxxxxxxxxxxx

# CIBA (who gets the push notification)
CIBA_LOGIN_HINT=your@email.com

# Mode: demo (simulated) or real (live CIBA)
VAULTGATE_MODE=real
```

---

## Step 7 — Test It

```bash
cd vaultgate
npm run dev
```

In another terminal:
```bash
# Test a READ action (no CIBA needed)
curl -X POST http://localhost:18792/action \
  -H "Content-Type: application/json" \
  -d '{"service":"slack","action":"read","target":"#general"}'

# Test a WRITE action (this will initiate CIBA — check your phone)
curl -X POST http://localhost:18792/action \
  -H "Content-Type: application/json" \
  -d '{"service":"slack","action":"write","target":"#general","body":"Hello from VaultGate!"}'
```

For the WRITE action, you should get a Guardian push notification on the phone associated with `CIBA_LOGIN_HINT`. Approve it, and VaultGate will post to Slack.

---

## What the Hackathon Judges Actually Need

For submission, you need:
1. ✅ **Repo** — already exists at `github.com/nokai-dev/vaultgate` (private, need to make public or add judges)
2. ✅ **Video** — needs to be recorded showing the CIBA magic moment (phone push)
3. ✅ **Live URL** — OCI image is at `ghcr.io/nokai-dev/vaultgate:latest` but needs a running server (VPS)
4. ✅ **Devpost description** — needs to be written (5,000–10,000 chars, no em-dashes, links in description body)

---

## If the Dashboard Is Really Broken

Try the Auth0 Management API directly:

```bash
# List all social/enterprise connections
curl -s "https://manage.auth0.com/api/v2/connections" \
  -H "Authorization: Bearer $MANAGEMENT_TOKEN" | jq

# Get specific connection details
curl -s "https://manage.auth0.com/api/v2/connections/conn_xxx" \
  -H "Authorization: Bearer $MANAGEMENT_TOKEN" | jq

# List a user's connected accounts
curl -s "https://manage.auth0.com/api/v2/users-by-email/your@email.com" \
  -H "Authorization: Bearer $MANAGEMENT_TOKEN" | jq
```

---

## Still Stuck?

If you hit a wall, jump on the [Auth0 Community Discord](https://community.auth0.com) or the hackathon's Discord channel (check the Devpost page). The Auth0 team is actively supporting this hackathon and can help with dashboard issues.
