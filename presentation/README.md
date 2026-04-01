# VaultGate — Presentation Assets

**Last updated:** 2026-04-02

This folder contains the final presentation materials for VaultGate, built for the Auth0 "Authorized to Act" Hackathon.

## Files

| File | Description | Size |
|------|-------------|------|
| `vaultgategl.py` | ManimGL presentation code (7 scenes) | 24 KB |
| `vaultgate_slides_final.tar.gz` | Interactive HTML slide deck | 1.7 MB |
| `vaultgate_pitch_slides.mp4` | Full video render (1080p60) | 2.3 MB |
| `VaultGatePitch.json` | Slide configuration | 4 KB |

## Interactive HTML Slide Deck

**Extract and present:**
```bash
tar -xzf vaultgate_slides_final.tar.gz
# Open vaultgate_final.html in browser
```

**Controls:**
- Press **→** or **Space** to START video on current slide
- Video plays through automatically
- Press **→** or **Space** again to advance to next slide

**Slides (7 total):**
1. AI Agents Have the Keys (15.2s)
2. The Right Question (5.4s)
3. VaultGate Architecture (6.7s)
4. The Magic Moment (8.5s)
5. Why VaultGate Wins (8.4s)
6. What's Next (8.9s)
7. CTA (1.4s)

**Total duration:** ~54 seconds

## Technical Details

**Built with:**
- [ManimGL](https://github.com/3b1b/manim) — Animation engine
- [manim-slides](https://github.com/jeertmans/manim-slides) — Slide presentation system
- Custom ManimGL fix: [PR #614](https://github.com/jeertmans/manim-slides/pull/614)

**Render command:**
```bash
manim-slides render --GL vaultgategl.py VaultGatePitch
manim-slides convert VaultGatePitch vaultgate_final.html --to=html
```

## Hackathon Context

**Auth0 "Authorized to Act" Hackathon**

VaultGate implements the Client-Initiated Backchannel Authentication (CIBA) flow to ensure AI agents never act without explicit human approval for write operations.

**Key features:**
- Single-use, ephemeral tokens
- Human-in-the-loop for every write operation
- Auth0 Token Vault integration
- 227 tests, 100% coverage
- OCI image on GHCR

---

*Generated for hackathon submission — 2026-04-02*
