"""
VaultGate — ManimGL Pitch Deck
Render: PYGLET_HEADLESS=1 python3 -m manimgl vaultgategl.py VaultGatePitch -ql -s
"""
from manimlib import *
import random

# ── Palette ──────────────────────────────────────────────────────────
BG       = "#0D1117"
TEXT     = "#E6EDF3"
MUTED    = "#484F58"
DANGER   = "#FF4444"
WARN     = "#FFAA33"
SAFE     = "#3FB950"
AUTH0    = "#0A84FF"
ACCENT   = "#A855F7"
DARK_BOX = "#161B22"
BORDER   = "#30363D"
BLACK    = "#000000"
WHITE    = "#FFFFFF"


# ── Helpers ──────────────────────────────────────────────────────────
def heading(text, color=WHITE, size=56, weight=BOLD):
    return Text(text, color=color, font_size=size, weight=weight, font="Helvetica")

def body_text(text, color=TEXT, size=28, weight=NORMAL):
    return Text(text, color=color, font_size=size, font="Helvetica", weight=weight)

def code(text, size=20, color=TEXT):
    return Text(text, font_size=size, color=color, font="Courier")

def card(w=8, h=4, fill=DARK_BOX, stroke=BORDER):
    r = Rectangle(width=w, height=h, fill_color=fill, stroke_color=stroke, stroke_width=1.5)
    return r

def node(label, icon, color=ACCENT, w=2.2, h=1.0):
    box = RoundedRectangle(corner_radius=0.1, width=w, height=h, fill_color=DARK_BOX, stroke_color=color, stroke_width=2)
    i   = Text(icon, font_size=28, color=color).move_to(box.get_center()).shift(UP * 0.1)
    l   = Text(label, font_size=14, color=TEXT, weight=BOLD).next_to(i, DOWN, buff=0.05)
    return VGroup(box, i, l)

def badge(label, color=DANGER):
    txt = Text(label, font_size=14, color=BLACK, weight=BOLD)
    bg  = RoundedRectangle(corner_radius=0.08, width=3.5, height=0.45, fill_color=color, stroke_width=0)
    bg.set_x(txt.get_x()).set_y(txt.get_y())
    return VGroup(bg, txt)

def hex_gate(label="GATE", color=WARN, size=1.2):
    """Draw a hexagon shape for decision points (approve/deny gate)."""
    h = RegularPolygon(n=6, radius=size * 0.6, stroke_color=color, stroke_width=2, fill_opacity=0)
    t = Text(label, font_size=11, color=color, weight=BOLD).move_to(h)
    return VGroup(h, t)


# ═════════════════════════════════════════════════════════════════════
class VaultGatePitch(Scene):
    def construct(self):
        self.camera.background_color = BG
        self.scene_1_horror()
        self.scene_2_reframe()
        self.scene_3_vaultgate()
        self.scene_4_demo()
        self.scene_5_wins()
        self.scene_6_future()
        self.scene_7_cta()

    # ── wipe ──────────────────────────────────────────────────────────
    def wipe(self, run_time=0.4):
        if self.mobjects:
            self.play(*[FadeOut(m) for m in self.mobjects], run_time=run_time)

    # ═════════════════════════════════════════════════════════════════
    def scene_1_horror(self):
        # Title
        t1 = heading("AI Agents Have the Keys", size=52).shift(UP * 1.5)
        t2 = heading("to Your Kingdom", size=52).next_to(t1, DOWN, buff=0.1)
        t  = VGroup(t1, t2).center()
        sub = body_text("...and they're already using them.", size=30, color=WARN).next_to(t, DOWN, buff=0.8)
        self.play(Write(t), run_time=1.0)
        self.play(FadeIn(sub), run_time=0.8)
        self.wait(1.5)
        self.wipe()

        # Incident cards
        inc1 = badge("INCIDENT · Feb 2026", DANGER).to_corner(UL, buff=0.5)
        # Simulated inbox
        inbox_bg = RoundedRectangle(corner_radius=0.1, width=4.5, height=4.5, fill_color="#1C2128", stroke_color=BORDER, stroke_width=1)
        inbox_label = body_text("Inbox (847)", size=18, color=MUTED).next_to(inbox_bg, UP, buff=0.15).align_to(inbox_bg, LEFT).shift(RIGHT * 0.3)
        inbox = VGroup(inbox_bg, inbox_label)
        rows = []
        for i in range(10):
            r = Rectangle(width=4, height=0.3, fill_color="#252C35", stroke_width=0)
            t = body_text(random.choice(["Re: Q4 Budget","Meeting 10am","PR #412 merged","Invoice #8837","Slack reminder"]), size=12, color=MUTED).move_to(r)
            rows.append(VGroup(r, t))
        rows_v = VGroup(*rows).arrange(DOWN, buff=0.08).move_to(inbox_bg).shift(DOWN * 0.3)
        inbox.add(rows_v)

        info = VGroup(*[
            body_text(line, size=20, color=TEXT if i < 2 else (DANGER if any(w in line for w in ["STOP","RUN","physically"]) else MUTED))
            for i, line in enumerate([
                "Meta AI Safety Director",
                "loses 200+ emails", "",
                "OpenClaw ignored STOP commands",
                "Bulk-deleted at machine speed", "",
                "She had to physically RUN",
                "to her Mac Mini to kill it", "",
            ])
        ]).arrange(DOWN, buff=0.1, aligned_edge=LEFT).shift(RIGHT * 2.5 + UP * 0.5)

        quote = Text("\"Turns out alignment researchers\n aren't immune to misalignment.\"", font_size=18, color=WARN, slant=ITALIC).shift(RIGHT * 2.5 + DOWN * 1.8)
        attr  = body_text("— Summer Yue, Meta", size=14, color=MUTED).next_to(quote, DOWN, buff=0.1)

        self.play(FadeIn(inc1), run_time=0.3)
        self.play(Write(inbox), run_time=0.8)
        self.play(Write(info), run_time=0.8)

        # Emails turn red and vanish
        for r in rows_v:
            self.play(r.animate.set_color(DANGER), run_time=0.15)
        self.play(FadeOut(rows_v, shift=RIGHT * 0.3), run_time=0.5)
        self.play(FadeIn(quote), FadeIn(attr), run_time=0.5)
        self.wait(2)
        self.wipe()

        # Database incident
        inc2 = badge("INCIDENT · Jul 2025", DANGER).to_corner(UL, buff=0.5)
        db_body = Rectangle(width=2, height=2.5, fill_color="#1C2128", stroke_color=AUTH0, stroke_width=2)
        db_top  = Ellipse(width=2, height=0.4, fill_color="#1C2128", stroke_color=AUTH0, stroke_width=2).next_to(db_body, UP, buff=-0.02)
        db_lbl  = body_text("Production DB", size=14, color=AUTH0).next_to(db_body, DOWN, buff=0.15)
        db_stat = body_text("1,206 executives\n1,196 companies", size=13, color=MUTED).move_to(db_body)
        db = VGroup(db_body, db_top, db_lbl, db_stat).shift(LEFT * 3)

        info2 = VGroup(*[
            body_text(line, size=20, color=DANGER if any(w in line for w in ["FREEZE","CAPS","LIED","PROD","MONTHS","RECOVERY"]) else TEXT)
            for line in [
                "Replit AI agent deletes entire production DB",
                "(during active CODE FREEZE)",
                "",
                'Agent admitted: "catastrophic failure... destroyed months"',
                "",
                "Then LIED about recovery",
            ]
        ]).arrange(DOWN, buff=0.1, aligned_edge=LEFT).shift(RIGHT * 2.2 + UP * 0.5)

        self.play(Write(inc2), Write(db), Write(info2), run_time=0.8)
        self.wait(0.5)
        self.play(db.animate.set_color(DANGER).set_fill(DANGER, opacity=0.5), run_time=0.8)
        self.wait(1.5)
        self.wipe()

        # The Pattern
        pt = heading("The Common Thread", color=DANGER, size=52).shift(UP * 2)
        lines = VGroup(*[
            body_text(t, size=32, color=c)
            for t, c in [
                ("AI agents had permanent access.", TEXT),
                ("No human was asked.", TEXT),
                ("No one could stop them in time.", DANGER),
            ]
        ]).arrange(DOWN, buff=0.5).next_to(pt, DOWN, buff=0.8)
        self.play(Write(pt), run_time=0.5)
        for l in lines:
            self.play(FadeIn(l), run_time=0.4)
        self.wait(2)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    def scene_2_reframe(self):
        # Divider
        div = Line(UP * 3, DOWN * 3, color=BORDER, stroke_width=2)

        left_h  = heading("THE OLD QUESTION",  size=28, color=DANGER).shift(LEFT * 3.5 + UP * 2.5)
        left_x  = Text("✕", font_size=36, color=DANGER).next_to(left_h, LEFT, buff=0.2)
        left_q  = body_text("WHAT can the\nagent access?", size=28).shift(LEFT * 3.5 + UP * 1.0)
        left_i  = VGroup(*[body_text(t, size=17, color=MUTED) for t in [
            "→ Scopes & permissions",
            "→ Decided once at consent",
            "→ Token lives until revoked",
            "→ Agent acts freely 24/7",
        ]]).arrange(DOWN, buff=0.15, aligned_edge=LEFT).shift(LEFT * 3.5 + DOWN * 0.3)
        left = VGroup(left_x, left_h, left_q, left_i)

        right_h = heading("THE RIGHT QUESTION", size=28, color=SAFE).shift(RIGHT * 3.5 + UP * 2.5)
        right_x = Text("✓", font_size=36, color=SAFE).next_to(right_h, LEFT, buff=0.2)
        right_q = body_text("WHEN can the\nagent act?", size=28).shift(RIGHT * 3.5 + UP * 1.0)
        right_i = VGroup(*[body_text(t, size=17, color=c) for t, c in [
            ("→ Every write, every time", SAFE),
            ("→ Decided at moment of action", MUTED),
            ("→ Token minted on-demand, once", MUTED),
            ("→ Human approves each action", MUTED),
        ]]).arrange(DOWN, buff=0.15, aligned_edge=LEFT).shift(RIGHT * 3.5 + DOWN * 0.3)
        right = VGroup(right_x, right_h, right_q, right_i)

        self.play(Write(div), run_time=0.2)
        self.play(Write(left), run_time=0.8)
        self.play(Write(right), run_time=0.8)
        self.wait(1)

        hl = SurroundingRectangle(right, color=SAFE, stroke_width=3, buff=0.3)
        self.play(ShowCreation(hl), run_time=0.5)
        self.wait(0.5)

        self.play(FadeOut(left), FadeOut(div), FadeOut(hl), right.animate.set_opacity(0.15), run_time=0.8)

        l1  = body_text("It's not about", size=48).shift(UP * 0.8)
        w1  = heading("WHAT", size=60, color=DANGER).next_to(l1, RIGHT, buff=0.2)
        l2  = body_text("It's about", size=48).next_to(l1, DOWN, buff=1.0).align_to(l1, LEFT)
        w2  = heading("WHEN.", size=60, color=SAFE).next_to(l2, RIGHT, buff=0.2)

        self.play(Write(VGroup(l1, w1)), run_time=0.8)
        self.wait(0.3)
        self.play(Write(VGroup(l2, w2)), run_time=0.8)
        self.wait(2)
        self.wipe()

    def node_clean(self, label, icon, color=ACCENT, w=2.2, h=1.0):
        """Clean node: box + icon + label, NO codepoint label."""
        box = RoundedRectangle(corner_radius=0.12, width=w, height=h,
                               fill_color=DARK_BOX, stroke_color=color, stroke_width=2.5)
        i   = Text(icon, font_size=32, color=color).move_to(box.get_center()).shift(UP * 0.15)
        l   = Text(label, font_size=15, color=TEXT, weight=BOLD).next_to(i, DOWN, buff=0.08)
        return VGroup(box, i, l)

    def scene_3_vaultgate(self):
        # ── Title — compact, top band ─────────────────────────────────────
        shield = Text("🛡", font_size=48).shift(UP * 3.5)
        logo   = heading("VaultGate", size=42, color=ACCENT).next_to(shield, RIGHT, buff=0.3).shift(UP * 3.5)
        tag    = body_text("Human-in-the-Loop Access for AI Agents", size=17, color=MUTED).next_to(logo, DOWN, buff=0.1)
        self.play(FadeIn(shield, scale=0.5), run_time=0.6)
        self.play(Write(VGroup(logo, tag)), run_time=0.5)
        self.wait(1.5)
        self.wipe()

        # ── Main row Y = 0 — Agent left, VaultGate center ─────────────────
        agent   = self.node_clean("AI Agent",  "🤖",  MUTED,  2.2, 1.0).shift(LEFT * 5.0)
        vaultgw = self.node_clean("VaultGate", "🛡", ACCENT, 3.2, 1.4).shift(LEFT * 0.5)

        self.play(Write(agent),   run_time=0.4)
        self.play(Write(vaultgw), run_time=0.4)
        self.play(GrowArrow(Arrow(agent.get_right(), vaultgw.get_left(), buff=0.5, color=MUTED, stroke_width=5)), run_time=0.4)

        # ── READ PATH — Y = +2.2 and Y = +0.5 ─────────────────────────────
        # Staggered Y levels so fan-out arrows have distinct exit points from vaultgw
        slack  = self.node_clean("Slack",   "💬", SAFE, 1.7, 0.9).shift(RIGHT * 3.8 + UP * 2.2)
        github = self.node_clean("GitHub", "📂", SAFE, 1.7, 0.9).shift(RIGHT * 6.2 + UP * 2.2)
        google = self.node_clean("Google", "📧", SAFE, 1.7, 0.9).shift(RIGHT * 3.8 + UP * 0.5)
        drive  = self.node_clean("Drive",   "📁", SAFE, 1.7, 0.9).shift(RIGHT * 6.2 + UP * 0.5)

        self.play(Write(slack), Write(github), Write(google), Write(drive), run_time=0.5)

        # Vaultgw right edge X (used as origin for all read arrows)
        vg_right = vaultgw.get_right()

        # ── Row 1 (Y = +2.2): Slack and GitHub — arrows go RIGHT then DOWN
        # Slack arrow: horizontal segment then drop to slack's Y
        slack_origin = vg_right + RIGHT * 0.1 + UP * 2.2
        slack_arr = Arrow(slack_origin, slack.get_left(), buff=0.3, color=SAFE, stroke_width=3)
        # "read: msg" label directly ON the arrow, mid-point
        slack_lbl = body_text("msg", size=12, color=SAFE)
        slack_lbl.move_to(midpoint(slack_origin, slack.get_left())).shift(DOWN * 0.35)
        self.play(GrowArrow(slack_arr), run_time=0.3)
        self.play(Write(slack_lbl), run_time=0.2)

        github_origin = vg_right + RIGHT * 0.1 + UP * 2.2
        github_arr = Arrow(github_origin, github.get_left(), buff=0.3, color=SAFE, stroke_width=3)
        github_lbl = body_text("repos", size=12, color=SAFE)
        github_lbl.move_to(midpoint(github_origin, github.get_left())).shift(DOWN * 0.35)
        self.play(GrowArrow(github_arr), run_time=0.3)
        self.play(Write(github_lbl), run_time=0.2)

        # "read:*" path label — on the horizontal bus segment (Y = +2.2)
        rl = body_text("read:*", size=14, color=SAFE).next_to(vg_right, UP, buff=1.5)
        self.play(Write(rl), run_time=0.2)

        # ── Row 2 (Y = +0.5): Google and Drive — arrows go RIGHT then UP
        google_origin = vg_right + RIGHT * 0.1 + UP * 0.5
        google_arr = Arrow(google_origin, google.get_left(), buff=0.3, color=SAFE, stroke_width=3)
        google_lbl = body_text("files", size=12, color=SAFE)
        google_lbl.move_to(midpoint(google_origin, google.get_left())).shift(UP * 0.35)
        self.play(GrowArrow(google_arr), run_time=0.3)
        self.play(Write(google_lbl), run_time=0.2)

        drive_origin = vg_right + RIGHT * 0.1 + UP * 0.5
        drive_arr = Arrow(drive_origin, drive.get_left(), buff=0.3, color=SAFE, stroke_width=3)
        drive_lbl = body_text("docs", size=12, color=SAFE)
        drive_lbl.move_to(midpoint(drive_origin, drive.get_left())).shift(UP * 0.35)
        self.play(GrowArrow(drive_arr), run_time=0.3)
        self.play(Write(drive_lbl), run_time=0.2)

        # ── WRITE PATH — Y = -1.8, below main row ─────────────────────────
        # T-junction: short rightward connector → drop → GATE → phone
        conn_end = vaultgw.get_right() + RIGHT * 0.7
        vline = Line(vaultgw.get_right() + RIGHT * 0.5, conn_end + DOWN * 1.8, color=WARN, stroke_width=5)
        gate_center = vline.get_bottom() + LEFT * 1.2
        gate = hex_gate("GATE", WARN, 2.5).move_to(gate_center)

        # Write path continuation: right from gate
        write_h = Line(gate_center + RIGHT * 1.25, conn_end, color=WARN, stroke_width=5)
        # "write:*" label below the horizontal line, well spaced
        wl = body_text("write:*", size=22, color=WARN).next_to(write_h, DOWN, buff=0.4)
        wp = body_text("requires approval", size=15, color=WARN).next_to(wl, DOWN, buff=0.1)

        self.play(Write(vline),  run_time=0.3)
        self.play(Write(write_h), run_time=0.3)
        self.play(Write(gate),   run_time=0.5)
        self.play(Write(VGroup(wl, wp)), run_time=0.3)

        # ── PHONE — bottom center-left, not crowded ─────────────────────────
        phone_bg = RoundedRectangle(corner_radius=0.25, width=2.2, height=4.2, fill_color="#000000", stroke_color=MUTED, stroke_width=2)
        phone_sc = RoundedRectangle(corner_radius=0.1,  width=1.9, height=3.4, fill_color=DARK_BOX, stroke_color=BORDER, stroke_width=1).move_to(phone_bg).shift(UP * 0.25)
        notch    = Rectangle(width=0.7, height=0.12, fill_color=MUTED).next_to(phone_sc, UP, buff=0.1)
        phone    = VGroup(phone_bg, phone_sc, notch).shift(LEFT * 2.8 + DOWN * 4.0).scale(0.7)

        # Arrow from GATE down to phone — annotation directly on arrow
        gate_btm = gate_center + DOWN * 1.25
        phone_top = phone.get_top() + UP * 0.1
        ciba_arr = Arrow(gate_btm, phone_top, buff=0.2, color=WARN, stroke_width=3)
        self.play(Write(phone), run_time=0.3)
        self.play(GrowArrow(ciba_arr), run_time=0.4)
        # Label directly on arrow — midpoint, to the LEFT
        cl = body_text("CIBA Push", size=14, color=WARN)
        cl.move_to(midpoint(gate_btm, phone_top)).shift(LEFT * 0.5)
        self.play(Write(cl), run_time=0.3)

        # GATE entry/exit labels — shown near the hexagon edges
        gate_in  = body_text("write:*", size=13, color=WARN).move_to(gate_center + LEFT * 2.0 + DOWN * 0.2)
        gate_out = body_text("denied", size=13, color=DANGER).move_to(gate_center + RIGHT * 2.2 + DOWN * 0.2)
        self.play(Write(gate_in), run_time=0.2)
        self.play(Write(gate_out), run_time=0.2)

        # Notification card — spaced inside phone
        nb = RoundedRectangle(corner_radius=0.1, width=1.6, height=1.1, fill_color=AUTH0, stroke_width=0).move_to(phone_sc).shift(UP * 0.9)
        nt = Text("Allow this\naction?", font_size=14, color=WHITE, weight=BOLD).move_to(nb)
        notif = VGroup(nb, nt)
        self.play(FadeIn(notif), run_time=0.4)
        self.wait(0.5)
        self.play(nb.animate.set_fill(SAFE), run_time=0.4)

        # ── LEGEND — bottom right, spacious ────────────────────────────────
        legend_bg = RoundedRectangle(corner_radius=0.12, width=3.6, height=2.1,
                                     fill_color=DARK_BOX, stroke_color=BORDER, stroke_width=1.5).to_corner(DR, buff=0.4)
        leg_items = VGroup()

        def legend_row(shape, label):
            row = VGroup(shape, Text(label, font_size=12, color=TEXT))
            leg_items.add(row)

        # Row 1: solid green = read
        r1_line = Line(LEFT * 0.5, RIGHT * 0.5, color=SAFE, stroke_width=4)
        legend_row(r1_line, "Solid green = read (auto)")

        # Row 2: dashed orange = write
        r2_line = DashedLine(LEFT * 0.5, RIGHT * 0.5, color=WARN, stroke_width=4)
        legend_row(r2_line, "Dashed orange = write (approval)")

        # Row 3: hexagon = GATE
        r3_hex = RegularPolygon(n=6, radius=0.25, stroke_color=WARN, stroke_width=2, fill_opacity=0)
        legend_row(r3_hex, "Hexagon = GATE (decision)")

        # Row 4: arrow = data flow
        r4_arr = Arrow(LEFT * 0.4, RIGHT * 0.4, buff=0, color=TEXT, stroke_width=3)
        legend_row(r4_arr, "Arrow = data flow")

        leg_items.arrange(DOWN, buff=0.25).move_to(legend_bg)
        self.play(Write(VGroup(legend_bg, leg_items)), run_time=0.5)

        # Bottom token summary — spaced from everything
        tok = body_text("Token minted → used once → revoked", size=17, color=SAFE).to_edge(DOWN, buff=0.5)
        self.play(Write(tok), run_time=0.4)
        self.wait(2)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    def scene_4_demo(self):
        title = heading("The Magic Moment", size=44, color=ACCENT).to_corner(UL, buff=0.5)
        self.play(Write(title), run_time=0.3)

        # Terminal
        term = card(5, 5, fill="#0D1117", stroke=BORDER).shift(LEFT * 2.5)
        dots = VGroup(*[Circle(radius=0.05, fill_color=c) for c in [DANGER, WARN, SAFE]]).arrange(RIGHT, buff=0.1).next_to(term, UP, buff=0.15).align_to(term, LEFT).shift(RIGHT * 0.2)
        t_lbl = body_text("Terminal", size=13, color=MUTED).next_to(dots, LEFT, buff=0.1)

        req = VGroup(*[code(l, size=14, color=SAFE if l.startswith("$") else MUTED) for l in [
            "$ POST /action",
            '  service: "slack"',
            '  action: "send_message"',
            '  channel: "#engineering"',
            '  text: "Deploy v2.1"',
        ]]).arrange(DOWN, buff=0.1).move_to(term).shift(UP * 0.8).align_to(term, LEFT).shift(RIGHT * 0.3)

        pend = VGroup(*[code(l, size=14, color=WARN) for l in [
            "→ status: pending_approval",
            '  auth_req_id: "ciba_8f3k2..."',
            "  Awaiting human approval...",
        ]]).arrange(DOWN, buff=0.1).next_to(req, DOWN, buff=0.25).align_to(req, LEFT)

        appr = VGroup(*[code(l, size=14, color=SAFE) for l in [
            "→ status: approved",
            "  token: [single-use, ephemeral]",
            '  result: "Message sent ✓"',
        ]]).arrange(DOWN, buff=0.1).next_to(pend, DOWN, buff=0.25).align_to(req, LEFT)

        self.play(Write(term), Write(dots), Write(t_lbl), run_time=0.3)
        for r in req:
            self.play(Write(r), run_time=0.1)
        self.play(Write(pend), run_time=0.3)

        # Phone
        p_bg  = RoundedRectangle(corner_radius=0.25, width=2, height=3.8, fill_color="#000000", stroke_color=MUTED, stroke_width=2)
        p_sc  = RoundedRectangle(corner_radius=0.1, width=1.7, height=3.1, fill_color=DARK_BOX, stroke_color=BORDER).move_to(p_bg).shift(UP * 0.2)
        notch = Rectangle(width=0.6, height=0.1, fill_color=MUTED).next_to(p_sc, UP, buff=0.08)
        phone = VGroup(p_bg, p_sc, notch).scale(0.6)

        nb = RoundedRectangle(corner_radius=0.08, width=1.5, height=1.4, fill_color=AUTH0, stroke_width=0).move_to(p_sc).shift(UP * 0.3)
        nh = body_text("Auth0 Guardian", size=11, color=WHITE).move_to(nb).shift(UP * 0.25)
        na = VGroup(*[code(l, size=10, color=MUTED) for l in [
            "Action: send_message",
            "Target: #engineering",
            'Content: "Deploy v2.1"',
        ]]).arrange(DOWN, buff=0.06).move_to(nb).shift(DOWN * 0.15)
        approve = Rectangle(width=0.65, height=0.3, fill_color=SAFE).move_to(nb).shift(DOWN * 0.5 + LEFT * 0.2)
        deny    = Rectangle(width=0.65, height=0.3, fill_color=DANGER, opacity=0.3).move_to(nb).shift(DOWN * 0.5 + RIGHT * 0.2)
        at = body_text("Approve", size=10, color=BLACK, weight=BOLD).move_to(approve)
        dt = body_text("Deny", size=10, color=DANGER).move_to(deny)
        notif_g = VGroup(nb, nh, na, approve, deny, at, dt)

        phone.shift(RIGHT * 3 + DOWN * 0.5)
        self.play(Write(phone), Write(notif_g), run_time=0.5)

        # Buzz
        for _ in range(3):
            self.play(phone.animate.shift(RIGHT * 0.05), run_time=0.05)
            self.play(phone.animate.shift(LEFT * 0.1), run_time=0.05)
            self.play(phone.animate.shift(RIGHT * 0.05), run_time=0.05)
        self.wait(0.8)

        # Tap approve
        self.play(approve.animate.set_fill(SAFE, opacity=0.5), run_time=0.3)
        self.play(Write(appr), run_time=0.3)

        # Green flash
        flash = Rectangle(width=14, height=8, fill_color=SAFE, opacity=0.1, stroke_width=0)
        self.play(FadeIn(flash), run_time=0.15)
        self.play(FadeOut(flash), run_time=0.3)

        ctrl = body_text("You were in control the entire time.", size=28, color=SAFE, weight=BOLD).to_edge(DOWN, buff=0.4)
        self.play(Write(ctrl), run_time=0.5)
        self.wait(2)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    def scene_5_wins(self):
        title = heading("Why VaultGate Wins", size=48, color=ACCENT).to_corner(UL, buff=0.5)
        self.play(Write(title), run_time=0.3)

        cols = ["", "Traditional\nOAuth", "API Keys", "VaultGate\n+ CIBA"]
        rows = [
            ["Token lifetime", "Long-lived", "Long-lived", "Single-use"],
            ["Human approval", "Once", "Never", "Every write"],
            ["Revocation", "Manual", "Manual", "Automatic"],
            ["Leaked risk", "HIGH", "HIGH", "ZERO"],
            ["Rogue agent", "No stop", "No stop", "Denied"],
        ]
        x_pos = [-4.5, -2.0, 0.5, 3.0]

        for i, (h, x) in enumerate(zip(cols, x_pos)):
            c = ACCENT if i == 3 else MUTED
            t = heading(h, size=18, color=c).move_to(RIGHT * x + UP * 1.8)
            self.play(Write(t), run_time=0.2)

        hline = Line(LEFT * 5.5 + UP * 1.3, RIGHT * 5.5 + UP * 1.3, color=BORDER)
        self.play(ShowCreation(hline), run_time=0.2)

        for r_i, row in enumerate(rows):
            y = 0.8 - r_i * 0.75
            for c_i, (cell, x) in enumerate(zip(row, x_pos)):
                col = WHITE if c_i == 0 else (SAFE if c_i == 3 else (DANGER if cell in ["HIGH","No stop","Never","Long-lived"] else MUTED))
                w   = BOLD if c_i == 3 else NORMAL
                t = body_text(cell, size=17, color=col).move_to(RIGHT * x + UP * y)
                self.play(Write(t), run_time=0.15)
            self.wait(0.2)

        stats = VGroup(*[body_text(s, size=17, color=SAFE) for s in ["227 tests", "100% coverage", "OCI on GHCR", "Full CIBA"]]).arrange(RIGHT, buff=0.8).shift(DOWN * 2.8)
        self.play(Write(body_text("Technical Credibility", size=18, color=MUTED).shift(DOWN * 2.4)), run_time=0.2)
        self.play(*[Write(s) for s in stats], run_time=0.5)
        self.wait(2)
        self.wipe()

        cb = VGroup(*[
            body_text(t, size=26, color=c)
            for t, c in [
                ("Every one had valid OAuth tokens.", TEXT),
                ("Every one had proper scopes.", TEXT),
                ('None asked: "Should I do this RIGHT NOW?"', WARN),
                ("VaultGate does.", SAFE),
            ]
        ]).arrange(DOWN, buff=0.5)
        for c in cb:
            self.play(Write(c), run_time=0.4)
        self.wait(2)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    def scene_6_future(self):
        title = heading("What's Next", size=48, color=ACCENT).to_corner(UL, buff=0.5)
        self.play(Write(title), run_time=0.3)

        cols = [
            ("NOW ✅", SAFE,  ["CIBA for all writes", "Read vs write mapping", "Auth0 Token Vault"]),
            ("NEXT 🔜", WARN, ["Policy engine", "Audit trail UI", "Rate limiting"]),
            ("FUTURE 🔮", ACCENT, ["Multi-tenant", "Action binding", "Agent trust scores"]),
        ]

        for c_i, (hdr, col, items) in enumerate(cols):
            x = -4 + c_i * 4
            h = heading(hdr, size=22, color=col).move_to(RIGHT * x + UP * 1.8)
            self.play(Write(h), run_time=0.3)
            for i_i, item in enumerate(items):
                bx = RoundedRectangle(corner_radius=0.08, width=3, height=0.9, fill_color=DARK_BOX, stroke_color=col, stroke_width=1.5)
                tx = body_text(item, size=14, color=TEXT).move_to(bx)
                grp = VGroup(bx, tx).move_to(RIGHT * x + DOWN * (i_i * 1.1 - 0.2))
                self.play(Write(grp), run_time=0.2)
            self.wait(0.2)
        self.wait(2)
        self.wipe()

        v = VGroup(*[
            body_text(t, size=38, color=c)
            for t, c in [
                ("AI agents should be able to", TEXT),
                ("ACT on your behalf.", ACCENT),
                ("But you should", TEXT),
                ("ALWAYS be in control.", SAFE),
            ]
        ]).arrange(DOWN, buff=0.5)
        for c in v:
            self.play(Write(c), run_time=0.4)
        self.wait(2)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    def scene_7_cta(self):
        shield = Text("🛡", font_size=90).shift(UP * 1.5)
        logo   = heading("VaultGate", size=80, color=ACCENT).next_to(shield, DOWN, buff=0.2)
        div    = Line(LEFT * 3.5, RIGHT * 3.5, color=BORDER).next_to(logo, DOWN, buff=0.4)
        tag    = body_text("The Human-in-the-Loop Gateway for AI Agents", size=22, color=MUTED).next_to(div, DOWN, buff=0.3)
        tech   = body_text("Express · Auth0 Token Vault · CIBA · Auth0 Guardian", size=16, color=MUTED).next_to(tag, DOWN, buff=0.4)
        st     = body_text("227 tests · 100% coverage · OCI on GHCR", size=16, color=SAFE).next_to(tech, DOWN, buff=0.15)
        hack   = body_text('Built for the Auth0 "Authorized to Act" Hackathon', size=18, color=AUTH0).next_to(st, DOWN, buff=0.5)

        self.play(FadeIn(shield, scale=0.5), run_time=1.0)
        self.play(Write(logo), run_time=0.5)
        self.play(ShowCreation(div), run_time=0.3)
        self.play(Write(tag), Write(tech), Write(st), Write(hack), run_time=0.5)
        self.wait(4)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=1.0)
