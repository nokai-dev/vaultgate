# Architecture Diagram Guide — VaultGate / ManimGL

## Core Principle

Architecture diagrams are communication tools, not technical准确性 exercises. If a diagram needs explanation, it has already failed. Every design decision below serves comprehension first.

---

## Labels & Text

- **Every box must have ONE clear human-readable label.** No raw IDs, hex codes, UUIDs, emoji codepoints, or internal identifiers visible on the diagram.
- If internal IDs are needed for traceability, put them in a small subtitle or footnote — never as the primary label.
- Font sizes must establish hierarchy: the central/core component gets the largest label; peripheral services get smaller ones.
- Emoji is acceptable as an icon prefix ONLY when it is universally understood (e.g., 🤖 for AI Agent, 🛡 for VaultGate, 💬 for Slack). Do NOT use emoji as the sole identifier.

---

## Legend & Color

- **ALWAYS include a legend box** in a corner explaining every color, line style (solid, dashed, dotted), and arrow shape used.
- Use at most 3–4 distinct colors. Each color maps to exactly one semantic meaning:
  - `SAFE` (#3FB950, green) = read-only / passes through freely
  - `WARN` (#FFAA33, orange) = requires human approval / blocked
  - `ACCENT` (#A855F7, purple) = core component / VaultGate
  - `MUTED` (#484F58, gray) = secondary / AI Agent
- Never rely on color alone — pair color with line style or label (e.g., dashed + "write" vs. solid + "read").

---

## Layout & Flow

- **Primary flow direction must be consistent:** either left-to-right or top-to-bottom. Never mix directions in the same diagram.
- **Avoid arrow overlap.** If two paths share a segment, offset them visually (parallel lines with a small gap) so each path is independently traceable.
- **The most important component (gateway, router, core service) should be visually dominant:** larger box, centered position, or heavier border.
- Peripheral services (Slack, GitHub, Google) should be smaller and grouped together on one side.
- The phone/notification element should be positioned BELOW the gateway, NOT floating to the side, so the approval flow reads top-to-bottom.

---

## Arrow Rules

- **Every arrow must have a label** or be explained by the legend. Unlabeled arrows are forbidden.
- Annotations (like "requires approval" or "passes through") must be placed close to the arrow they describe, with a clear visual association.
- Arrow direction must match the data/control flow: agent → gateway, gateway → services.
- The GATE element should emit a distinct arrow to the phone showing the approval request path.

---

## Gate / Decision Points

- Any conditional routing (approve/deny, read vs. write, auth check) must be represented as a **distinct shape** — a diamond, hexagon, or a visually distinct barrier/wall element — not just a label on a line.
- The GATE in VaultGate's architecture is a critical decision point. It must be a first-class visual element, not a tiny "GATE" label squeezed between lines.
- Show BOTH paths clearly:
  - The "happy path" (solid green arrow, passes through)
  - The "blocked/deferred path" (orange dashed arrow, requires approval)
- The phone receiving the CIBA push should be directly below the GATE, with a clear downward arrow.

---

## Anti-Patterns to Avoid

- ❌ Raw IDs or codepoints as labels (e.g., "01F6E1")
- ❌ Unlabeled arrows
- ❌ Color used without a legend
- ❌ Overlapping arrows that can't be individually traced
- ❌ Critical concepts (gates, decision points) rendered as small inline text
- ❌ All boxes the same size regardless of importance
- ❌ Annotations floating far from the element they describe
- ❌ Phone/approval element placed to the LEFT of the gateway (implies wrong flow direction)
- ❌ Diagonal arrows crossing main flow paths
- ❌ Emoji as the sole label for any component

---

## Layout Template for VaultGate Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────┐         ┌──────────┐                              │
│   │  🤖     │         │   🛡     │         💬 Slack            │
│   │ AI Agent│────────▶│ VaultGate│────────▶  📂 GitHub         │
│   │ (MUTED) │         │ (ACCENT) │  read:*  📧 Google          │
│   └─────────┘         └─────┬────┘                              │
│                             │ write:*                           │
│                             │ (orange solid, requires approval) │
│                             ▼                                   │
│                       ┌──────────┐                              │
│                       │  GATE    │  ← diamond or hexagon shape  │
│                       └────┬─────┘                              │
│                    denied  │ approved (orange dashed)           │
│                    path    │         ┌──────────┐              │
│                            └────────▶│  📱     │              │
│                                      │  Phone   │              │
│                                      │  CIBA    │              │
│                                      └──────────┘              │
│                                                                 │
│  ┌─────────────────┐                                            │
│  │ LEGEND          │                                            │
│  │ ─── green = read│                                            │
│  │ ─── orange = req│                                            │
│  │ approval        │                                            │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ManimGL Implementation Notes

- Use `node(name, emoji, color, width, height)` helper for service boxes
- Use `Arrow(source.get_right(), target.get_left(), buff=0.2)` for directional arrows
- Group related elements (services: Slack, GitHub, Google) with `VGroup` and position together
- The GATE line should be a distinct `Line` object with a thicker stroke, not just text
- The phone notification approval should be rendered as a distinct card appearing on the phone screen
- Always add a legend box in the lower-left corner using `RoundedRectangle` + `Text`
