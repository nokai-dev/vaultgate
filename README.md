# VaultGate 🔐

**Secure gateway agent for Auth0 Token Vault — CIBA-powered human-in-the-loop auth for AI agents**

> "Authorized to Act" — Auth0 for AI Agents Hackathon Project

## The Problem

AI agents need credentials to do useful work. But storing credentials locally = security nightmare:

- Credentials never expire
- No human oversight on sensitive actions
- If agent is compromised, attacker has full access
- No audit trail of what the agent did

## The Solution: VaultGate

VaultGate is a local gateway that intercepts AI agent tool calls and routes them through **Auth0 Token Vault**:

```
OpenClaw (or any AI agent) → VaultGate → Auth0 Token Vault → Slack/Google/etc.
                                     ↓
                              No credentials
                              on machine
```

**Key security properties:**
1. **Zero credentials on machine** — Agent has no secrets stored
2. **CIBA step-up auth** — Write operations require human approval via Auth0 Guardian
3. **Ephemeral tokens** — Scoped, short-lived tokens auto-expire after use
4. **Minimum privilege** — Each action gets only the scope it needs

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
git clone <repo-url>
cd vaultgate
npm install
```

### Start VaultGate Server

```bash
npm run dev
```

Server runs on `http://localhost:18792`

### Use the CLI

```bash
# Send a Slack message (triggers CIBA)
node cli/index.ts send "#design" "Design Review Friday 2pm"

# Check vault status
node cli/index.ts status

# Revoke all tokens
node cli/index.ts revoke
```

## Auth0 Setup (Required for Production)

To connect to real Auth0 Token Vault, configure these environment variables:

```bash
export AUTH0_DOMAIN=your-domain.auth0.com
export AUTH0_CLIENT_ID=your-client-id
export AUTH0_CLIENT_SECRET=your-client-secret
export AUTH0_TOKEN_VAULT_CONNECTION_ID=slack-connection-id
```

### Step-by-Step Auth0 Configuration

1. **Create Auth0 Account**
   - Sign up at [auth0.com](https://auth0.com)
   - Enable "Token Vault for AI Agents" feature

2. **Create an Application**
   - Go to Applications → Create Application
   - Choose "Machine to Machine" or "AI Agent" app type
   - Note your Client ID and Client Secret

3. **Configure Token Vault**
   - Go to AI Agents → Token Vault
   - Create a new Token Vault connection
   - Add your Slack account (pre-authorize)

4. **Enable CIBA (Step-Up Auth)**
   - Go to AI Agents → CIBA Settings
   - Enable "Push" notification via Auth0 Guardian
   - Set polling interval (default: 2000ms)
   - Set timeout (default: 60000ms)

5. **Get Connection ID**
   - In Token Vault → Connections
   - Copy the Slack connection ID
   - Use as `AUTH0_TOKEN_VAULT_CONNECTION_ID`

## Demo Mode

Without Auth0 credentials, VaultGate runs in **Demo Mode**:

```
🔓 [VAULT] Running in DEMO MODE — no real Auth0 credentials
```

Demo mode simulates:
- CIBA poll loop (3 polls before simulated approval)
- Token lifecycle (issue → active → auto-revoke)
- All terminal output visible for judging

## Architecture

```
vaultgate/
├── src/
│   ├── index.ts        # HTTP server (port 18792)
│   ├── vaultgate.ts    # Main VaultGate class
│   ├── tokenVault.ts   # Auth0 Token Vault integration
│   ├── ciba.ts         # CIBA flow handling
│   ├── scopes.ts       # Action-to-scope mapper
│   └── types.ts        # TypeScript types
├── cli/
│   └── index.ts        # CLI client
├── demo/
│   └── demo.sh         # Demo script
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/action` | Execute an action (triggers CIBA for writes) |
| GET | `/status` | Get vault status and active tokens |
| POST | `/revoke` | Revoke all active tokens |
| GET | `/health` | Health check |

### Action Request

```json
POST /action
{
  "service": "slack",
  "action": "write",
  "target": "#design",
  "body": "Design Review Friday 2pm"
}
```

### Action Response

```json
{
  "success": true,
  "requestId": "req_123456_abc",
  "service": "slack",
  "action": "write",
  "status": "executed",
  "tokenState": {
    "tokenId": "tok_123456_xyz",
    "scope": "slack.messages.write",
    "ttlSeconds": 600,
    "status": "active"
  },
  "result": {
    "message": "Successfully posted to #design"
  }
}
```

## Scope Mapping

| Service | Action | Scope |
|---------|--------|-------|
| slack | read | `slack.messages.read` |
| slack | write | `slack.messages.write` |
| slack | delete | `slack.messages.write` |
| slack | admin | `slack.admin` |
| google | read | `google.gmail.readonly` |
| google | write | `google.gmail.send` |
| github | read | `github.repo.read` |
| github | write | `github.repo.write` |

## CIBA Flow (The Demo Moment)

The CIBA (Consumer-Initiated Backchannel Authentication) flow is what judges see:

1. User runs `vaultgate send "#design" "message"`
2. VaultGate identifies as WRITE action
3. CIBA handler triggers:
   ```
   ╔══════════════════════════════════════════════════════════════╗
   ║  [CIBA] REQUESTING STEP-UP AUTHENTICATION                   ║
   ╠══════════════════════════════════════════════════════════════╣
   ║  📱 Push sent to Auth0 Guardian — check your phone!          ║
   ╠══════════════════════════════════════════════════════════════╣
   ║  BINDING MESSAGE: Post to SLACK #design: "message"           ║
   ╚══════════════════════════════════════════════════════════════╝
   ```
4. Poll loop visible in terminal:
   ```
   ║  [1] ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 60s left  ║
   ║  [2] ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 58s left  ║
   ║  [3] ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 56s left  ║
   ╠══════════════════════════════════════════════════════════════╣
   ║  ✅ APPROVED! User granted consent on Auth0 Guardian         ║
   ╚══════════════════════════════════════════════════════════════╝
   ```
5. Token issued, action executed, token auto-revoked

## Running the Demo

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run demo script
./demo/demo.sh
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH0_DOMAIN` | - | Auth0 domain (required for production) |
| `AUTH0_CLIENT_ID` | - | Auth0 client ID (required for production) |
| `AUTH0_CLIENT_SECRET` | - | Auth0 client secret (required for production) |
| `AUTH0_TOKEN_VAULT_CONNECTION_ID` | `slack` | Token Vault connection ID |
| `VAULTGATE_PORT` | `18792` | HTTP server port |
| `VAULTGATE_HOST` | `localhost` | HTTP server host |

## License

MIT
