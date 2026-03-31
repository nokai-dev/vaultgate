# VaultGate Architecture Diagram — Visual Standards

_Last updated: 2026-04-01 — based on judge/readability critique_

---

## The 5 Laws (never violate)

### 1. ONE human-readable label per box
- No raw IDs, hex codes, UUIDs, emoji codepoints (e.g. "01F4AC"), or internal identifiers as the primary label.
- Internal traceability IDs go in a footnote, never as the main label.

### 2. Legend is mandatory
- Every diagram must have a legend box in a corner explaining **every** color, line style, and arrow shape.
- Color pairs with line style (e.g. solid green = read, dashed orange = write+approval) so accessibility holds even without color.

### 3. No unlabeled arrows
- Every arrow gets a label OR is explained by the legend.
- Annotations (e.g. "requires approval") placed close to the arrow with clear visual association.

### 4. Gate = distinct shape, first-class element
- Any conditional routing (approve/deny, read vs. write, auth check) is a **hexagon** (or diamond). Never inline text squeezed between lines.
- Both paths (happy and blocked/deferred) shown and labeled.

### 5. Dominant core, peripheral services
- The core gateway/router component is visually dominant: larger box, centered, heavier border.
- Peripheral services are smaller. Hierarchy is immediately readable from font size and box dimensions alone.

---

## Color & Line Semantic Map

| Color | Hex | Meaning |
|-------|-----|---------|
| Green (SAFE) | `#3FB950` | Read path — auto-approved, no human needed |
| Orange (WARN) | `#FFAA33` | Write path — requires human approval via CIBA |
| Purple (ACCENT) | `#A855F7` | VaultGate core component |
| Gray (MUTED) | `#484F58` | AI Agent (initiator), structural elements |
| Blue (AUTH0) | `#0A84FF` | Notification card background |
| Dark box | `#161B22` | Component background |
| Border | `#30363D` | Component border |

## Line Styles

| Style | Meaning |
|-------|---------|
| Solid arrow | Data flow |
| Dashed line | Write/approval path |
| Thick line (stroke 5) | Primary path |
| Thin line (stroke 2–3) | Secondary/annotation path |

## Shape Map

| Shape | Meaning |
|-------|---------|
| Rounded rectangle | Standard component (AI Agent, Slack, GitHub, etc.) |
| Hexagon | GATE — decision point, conditional routing |
| Rectangle (terminal) | Terminal/card output |
| Circle | Dot indicator (not used in architecture scene) |

---

## Layout Rules

### Primary flow: left → right
- Agent far left → VaultGate center → services far right
- Read path: horizontal green arrows from VaultGate to services
- Write path: vertical drop from VaultGate → GATE (hexagon) → phone below

### Phone position
- Below the main row, offset to the LEFT side of center
- CIBA push arrow goes DOWN-LEFT from GATE to phone

### GATE prominence
- Hexagon radius ≥ 2.0 units (visually dominant)
- GATE centered below main flow, not squeezed between arrows
- "write:*" and "requires approval" labels below the horizontal write path continuation

### Service node sizing
- VaultGate: 3.0 × 1.3 (dominant)
- AI Agent: 2.4 × 1.1 (initiator, slightly smaller)
- Services (Slack/GitHub/Google): 1.8 × 0.95 (peripheral)

### Annotations near arrows
- "read:*" label at top of read-path row
- "write:* requires approval" label below write path continuation
- Per-service labels ("messages", "repos", "contacts") above each arrow to that service

---

## Anti-Patterns (instant rejection criteria)

- ❌ Raw IDs or codepoints as labels (e.g. "01F 6E1")
- ❌ Unlabeled arrows
- ❌ Color used without a legend
- ❌ Overlapping arrows that can't be individually traced
- ❌ Critical concepts rendered as small inline text
- ❌ All boxes the same size regardless of importance
- ❌ Annotations floating far from the element they describe
- ❌ GATE as a text label instead of a hexagon shape
- ❌ Mixed primary flow directions (left-right AND top-bottom for same path)

---

## Code Standards

- Helper `node_clean(label, icon, color, w, h)` — no codepoint label, box+icon+label only
- Helper `hex_gate(label, color, size)` — RegularPolygon(n=6) with label inside
- All text uses `font="Helvetica"` for clean rendering
- `buff` values on arrows prevent label overlap
- Legend: minimum 3.2 × 1.9 units, lower-left corner, 4-row layout
