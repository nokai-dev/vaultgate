# VaultGate Manim Pitch Deck

Animated pitch deck for VaultGate, built with [Manim](https://docs.manim.community/).

**Runtime:** 2:30–3:00 minutes | **Resolution:** 1920×1080 (16:9) | **FPS:** 60

---

## Scenes

| # | Scene | Duration | Content |
|---|-------|----------|---------|
| 1 | Horror Stories | 0:00–0:35 | Real AI agent disasters (Meta email nuke, Replit DB nuke, agent credit cards) |
| 2 | The Wrong Question | 0:35–0:55 | Reframe: not WHAT but WHEN agents can act |
| 3 | Enter VaultGate | 0:55–1:30 | Architecture animation, CIBA flow, approval/denial paths |
| 4 | The Magic Moment | 1:30–1:55 | Split-screen demo: terminal request → Guardian push → approval |
| 5 | Why This Wins | 1:55–2:20 | Comparison table, stats bar, incident callback |
| 6 | The Future | 2:20–2:40 | Roadmap timeline (Now / Next / Future) |
| 7 | Call to Action | 2:40–2:55 | Logo, links, hackathon attribution, fade to black |

---

## Prerequisites

### macOS / Linux
```bash
pip install manim
```

**System dependencies** (Linux):
```bash
sudo apt-get install libpangocairo-1.0-0 libpango-1.0-0 libcairo2
```

### Docker (any OS)
```bash
docker run --rm -v "$PWD:/app" manimproject/manim:latest \
  manim -ql --fps=60 -a /app/VaultGatePitch.py VaultGatePitch
```

### Homebrew (macOS)
```bash
brew install manim
```

---

## Render

### Preview (480p, fast)
```bash
bash render.sh
```

### High Quality (1080p60)
```bash
bash render.sh VaultGatePitch h 60
```

### Individual Scenes
```bash
manim -ql --fps=60 -a VaultGatePitch.py Scene1_HorrorStories
manim -ql --fps=60 -a VaultGatePitch.py Scene2_TheWrongQuestion
manim -ql --fps=60 -a VaultGatePitch.py Scene3_EnterVaultGate
manim -ql --fps=60 -a VaultGatePitch.py Scene4_MagicMoment
manim -ql --fps=60 -a VaultGatePitch.py Scene5_WhyThisWins
manim -ql --fps=60 -a VaultGatePitch.py Scene6_TheFuture
manim -ql --fps=60 -a VaultGatePitch.py Scene7_CallToAction
```

---

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#0D1117` | All scenes |
| Primary text | `#E6EDF3` | Headers, body |
| Danger/Red | `#FF4444` | Incidents, threats, denied actions |
| Warning/Amber | `#FFAA33` | Alerts, CIBA push notifications |
| Safe/Green | `#3FB950` | Approved actions, VaultGate shield |
| Auth0 Blue | `#0A84FF` | Auth0 branding, Token Vault |
| Accent Purple | `#A855F7` | VaultGate brand, gateway node |
| Muted gray | `#484F58` | Secondary text |

---

## Voiceover Markers

| Timestamp | Cue |
|-----------|-----|
| 0:00 | "AI agents have the keys to your kingdom." |
| 0:05 | "In February 2026, Meta's own AI safety director watched helplessly..." |
| 0:15 | "A month earlier, a Replit agent nuked an entire production database..." |
| 0:25 | "And right now, Visa and Mastercard are giving AI agents their own credit cards." |
| 0:32 | "The pattern is clear: permanent access, no human asked, no way to stop them." |
| 0:38 | "But here's the thing — the industry is asking the wrong question." |
| 0:42 | "Everyone's focused on WHAT agents can access — OAuth scopes, permissions." |
| 0:48 | "The real question is WHEN. When should an agent be allowed to act?" |
| 0:55 | "VaultGate answers that question." |
| 1:00 | "Every read operation passes through silently. But every write..." |
| 1:08 | "...triggers a CIBA push to your phone. Auth0 Guardian asks: allow this action?" |
| 1:15 | "You approve. A token is minted, used once, and destroyed." |
| 1:20 | "You deny. No token is ever created. Zero exposure." |
| 1:30 | "Watch it in action..." |
| 1:55 | "This isn't a wrapper. This is CIBA — the same standard banks use." |
| 2:20 | "And we're just getting started..." |
| 2:40 | "VaultGate. Because AI agents should act on your behalf — but you should always be in control." |

---

## Incident Sources

- **Meta email deletion (Feb 23, 2026):** 404 Media, Fast Company, SF Standard, Windows Central — Summer Yue, Meta Director of AI Safety & Alignment
- **Replit database deletion (Jul 2025):** Fortune, The Register, eWeek, Fast Company — Jason Lemkin, SaaStr founder
- **AI agent payment risks (2025–2026):** Payments Dive, The Financial Brand, BlockEden.xyz, Group-IB — Visa Intelligent Commerce, Mastercard Agent Pay

---

## Project Structure

```
manim/
├── VaultGatePitch.py   # Main scene code (all 7 scenes + combined)
├── render.sh           # Render script
└── README.md           # This file
```
