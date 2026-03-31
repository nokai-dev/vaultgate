"""
VaultGate — Manim Pitch Deck
Runtime target: 2:30–3:00 minutes | Resolution: 1920×1080 (16:9)
Style: Dark background (#0D1117), neon accent palette, monospace code feel

Color Palette:
  Background    #0D1117
  Primary text  #E6EDF3
  Danger/Red    #FF4444
  Warning/Amber #FFAA33
  Safe/Green    #3FB950
  Auth0 Blue    #0A84FF
  Accent Purple #A855F7
  Muted gray    #484F58

Render: manim -ql --fps=60 -a VaultGatePitch.py
Preview: manim -ql --fps=60 -a VaultGatePitch.py -o vaultgate_preview
"""

from manim import *
import numpy as np

# ─── Color Constants ────────────────────────────────────────────────────────
BG      = "#0D1117"
TEXT    = "#E6EDF3"
RED     = "#FF4444"
AMBER   = "#FFAA33"
GREEN   = "#3FB950"
BLUE    = "#0A84FF"
PURPLE  = "#A855F7"
GRAY    = "#484F58"

# ─── Timing Constants ────────────────────────────────────────────────────────
FAST     = 0.3
NORMAL   = 0.7
SLOW     = 1.2
DRAMATIC = 2.0
BEAT     = 0.5


def h2r(hex_str: str) -> str:
    """Convert '#RRGGBB' → pass through hex string for Manim."""
    return hex_str


def make_bg(self):
    self.camera.background_color = BG


# ════════════════════════════════════════════════════════════════════════════
# Custom Mobjects
# ════════════════════════════════════════════════════════════════════════════


class PhoneNotification(VGroup):
    """Auth0 Guardian-style push notification."""
    def __init__(self, action_text="Send message to #team", **kwargs):
        super().__init__(**kwargs)
        w, h = 2.8, 2.4
        body = RoundedRectangle(
            width=w, height=h, corner_radius=0.25,
            fill_color=h2r(BLUE), fill_opacity=0.12,
            stroke_color=h2r(BLUE), stroke_width=2,
        )
        # Header
        header = Rectangle(
            width=w, height=0.4, stroke_width=0,
            fill_color=h2r(BLUE), fill_opacity=0.3,
        )
        header.move_to(body.get_top() + DOWN * 0.2)
        bell = VGroup(
            Circle(radius=0.08, fill_color=h2r(BLUE), stroke_width=0).shift(UP * 0.05),
            Line(LEFT * 0.06, RIGHT * 0.06, color=BLUE).shift(DOWN * 0.05),
            Line(LEFT * 0.06, RIGHT * 0.06, color=BLUE).shift(DOWN * 0.08),
        )
        bell.next_to(header.get_left(), RIGHT, buff=0.15)
        header_text = Text("Auth0 Guardian", font="Helvetica", font_size=11, color=BLUE)
        header_text.move_to(header.get_center())
        # Content
        title = Text("AI Agent requests permission:", font="Helvetica", font_size=10, color=TEXT)
        title.next_to(header, DOWN, buff=0.2).align_to(body, LEFT).shift(RIGHT * 0.25)
        action = Text(action_text, font="Helvetica", font_size=10, color=AMBER)
        action.next_to(title, DOWN, buff=0.1).align_to(body, LEFT).shift(RIGHT * 0.25)
        # Buttons
        btn_w, btn_h = 0.9, 0.35
        approve = RoundedRectangle(width=btn_w, height=btn_h, corner_radius=0.1,
            fill_color=h2r(GREEN), fill_opacity=0.8, stroke_color=GREEN, stroke_width=1)
        approve_txt = Text("✓ Approve", font="Helvetica", font_size=9, color=BG)
        approve_txt.move_to(approve.get_center())
        deny = RoundedRectangle(width=btn_w, height=btn_h, corner_radius=0.1,
            fill_color=h2r(RED), fill_opacity=0.2, stroke_color=RED, stroke_width=1)
        deny_txt = Text("✗ Deny", font="Helvetica", font_size=9, color=RED)
        deny_txt.move_to(deny.get_center())
        btn_row = VGroup(approve, deny).arrange(RIGHT, buff=0.3)
        btn_row.next_to(action, DOWN, buff=0.2)
        btn_row.align_to(body, LEFT)
        self.add(body, header, bell, header_text, title, action, btn_row)


class Terminal(VGroup):
    """Terminal window mockup."""
    def __init__(self, lines=None, font_size=10, width=4.5, **kwargs):
        super().__init__(**kwargs)
        lines = lines or ['$ command', '> output']
        h = 0.3 + len(lines) * 0.32
        window = RoundedRectangle(
            width=width, height=h,
            corner_radius=0.1,
            fill_color=h2r(GRAY), fill_opacity=0.08,
            stroke_color=h2r(GRAY), stroke_width=1,
        )
        dots = VGroup(*[Circle(radius=0.05, fill_color=h2r(x), stroke_width=0)
                        for x in [RED, AMBER, GREEN]])
        dots.arrange(RIGHT, buff=0.06)
        # Position dots relative to window top
        dot_x = window.get_center()[0] - width / 2 + 0.25
        dots.move_to(np.array([dot_x, window.get_top()[1] - 0.15, 0]))
        text_lines = VGroup()
        for i, line in enumerate(lines):
            is_cmd = line.startswith('$') or line.startswith('>')
            is_good = 'sent' in line.lower() or 'approved' in line.lower()
            t = Text(line, font="Fira Code Mono" if is_cmd else "Helvetica",
                     font_size=font_size,
                     color=PURPLE if is_cmd else (GREEN if is_good else TEXT))
            # Position text at fixed offsets from window center
            tx = window.get_center()[0] - width / 2 + 0.25
            ty = window.get_center()[1] + 0.15 - i * 0.32
            t.move_to(np.array([tx, ty, 0]))
            text_lines.add(t)
        self.add(window, dots, text_lines)


class ShieldIcon(VGroup):
    """VaultGate shield + gate icon."""
    def __init__(self, size=1.0, **kwargs):
        super().__init__(**kwargs)
        top = Ellipse(width=size * 0.7, height=size * 0.3,
                      fill_color=h2r(PURPLE), stroke_color=h2r(PURPLE), stroke_width=1.5)
        body = Polygon(
            [-size * 0.35, 0, 0], [size * 0.35, 0, 0],
            [size * 0.35, -size * 0.4, 0], [0, -size * 0.6, 0],
            [-size * 0.35, -size * 0.4, 0],
            fill_color=h2r(PURPLE), stroke_color=h2r(PURPLE), stroke_width=1.5,
        )
        shield = VGroup(top, body)
        for i in range(3):
            bar = Line(
                LEFT * size * 0.18 + DOWN * size * 0.15 + RIGHT * i * size * 0.18,
                LEFT * size * 0.18 + DOWN * size * 0.45 + RIGHT * i * size * 0.18,
                color=h2r(BG), stroke_width=3,
            )
            shield.add(bar)
        keyhole = VGroup(
            Circle(radius=size * 0.07, fill_color=h2r(BG), stroke_width=0),
            Polygon(
                [0, size * 0.05, 0], [size * 0.06, -size * 0.05, 0],
                [size * 0.04, -size * 0.13, 0], [-size * 0.04, -size * 0.13, 0],
                [-size * 0.06, -size * 0.05, 0],
                fill_color=h2r(BG), stroke_color=h2r(BG), stroke_width=0,
            )
        )
        shield.add(keyhole)
        self.add(shield)


# ════════════════════════════════════════════════════════════════════════════
# SCENE 1 — Horror Stories (0:00–0:35)
# ════════════════════════════════════════════════════════════════════════════

class Scene1_HorrorStories(Scene):
    def construct(self):
        self.camera.background_color = BG

        # ── Title card ────────────────────────────────────────────────────
        title = Text("AI Agents Have the Keys to Your Kingdom",
                     font="Helvetica", font_size=32, color=TEXT).to_edge(UP, buff=1.5)
        sub = Text("...and they're already using them.", font="Helvetica", font_size=22, color=GRAY)
        sub.next_to(title, DOWN, buff=0.3)
        self.play(FadeIn(title, shift=DOWN * 0.3), run_time=SLOW)
        self.wait(BEAT)
        self.play(FadeIn(sub), run_time=NORMAL)
        self.wait(DRAMATIC)
        # Glitch on subtitle
        for _ in range(2):
            self.play(sub.animate.shift(RIGHT * 0.02).set_color(h2r(RED)), run_time=0.05)
            self.play(sub.animate.shift(LEFT * 0.02).set_color(TEXT), run_time=0.05)
        self.wait(FAST)
        self.play(FadeOut(title, sub), run_time=NORMAL)

        # ── Email Massacre ─────────────────────────────────────────────────
        emails = VGroup()
        for i in range(12):
            row = VGroup(
                RoundedRectangle(width=5, height=0.28, corner_radius=0.05,
                                 fill_color=h2r(GRAY), fill_opacity=0.2,
                                 stroke_color=h2r(GRAY), stroke_width=0.5),
                Text(f"Email {i+1}", font="Helvetica", font_size=8, color=TEXT),
            ).arrange(RIGHT, buff=0).move_to(UP * (2 - i * 0.3))
            emails.add(row)
        self.play(FadeIn(emails), run_time=NORMAL)
        robot = Text("🤖", font_size=36).move_to(LEFT * 4 + UP * 1.5)
        self.play(FadeIn(robot), run_time=FAST)
        for i, email in enumerate(emails):
            if i % 2 == 0:
                self.play(email.animate.set_color(h2r(RED)).set_opacity(0.3), run_time=0.08)
            else:
                self.play(FadeOut(email), run_time=0.08)
        self.wait(FAST)

        # Incident card 1
        card1 = VGroup(
            RoundedRectangle(width=6.5, height=1.8, corner_radius=0.1,
                             fill_color=h2r(RED), fill_opacity=0.1,
                             stroke_color=h2r(RED), stroke_width=1.5),
        )
        card1_labels = VGroup(
            Text("INCIDENT: Feb 23, 2026", font="Helvetica", font_size=13, color=RED, weight=BOLD),
            Text("Meta's AI Safety Director loses 200+ emails", font="Helvetica", font_size=11, color=TEXT),
            Text('"Nothing humbles you like telling your AI', font="Helvetica", font_size=9, color=GRAY, slant='ITALIC'),
            Text('"confirm before acting" and watching it', font="Helvetica", font_size=9, color=GRAY, slant='ITALIC'),
            Text('speedrun deleting your inbox."', font="Helvetica", font_size=9, color=AMBER, slant='ITALIC'),
            Text("— Summer Yue, Meta Alignment Director", font="Helvetica", font_size=8, color=GRAY),
        ).arrange(DOWN, buff=0.12)
        card1 = VGroup(card1[0], card1_labels).arrange(DOWN, buff=0.12)
        card1.move_to(RIGHT * 2.5 + DOWN * 0.5)
        for m in card1:
            self.play(FadeIn(m), run_time=FAST)
        self.wait(BEAT)
        self.play(FadeOut(emails, robot, card1), run_time=NORMAL)

        # ── Database Nuke ─────────────────────────────────────────────────
        db_rows = VGroup()
        for i in range(5):
            r = Rectangle(width=1.2, height=0.06, fill_color=h2r(GRAY), stroke_width=0)
            r.shift(RIGHT * 0.6 + DOWN * (i * 0.12 - 0.3))
            db_rows.add(r)
        # Cylinder-like shape (2D approximation using stacked ellipses + rect)
        db_ellipse_top = Ellipse(width=1.4, height=0.25, fill_color=h2r(GRAY), fill_opacity=0.3,
                                  stroke_color=h2r(GRAY), stroke_width=1.5)
        db_rect = Rectangle(width=1.4, height=0.8, fill_color=h2r(GRAY), fill_opacity=0.2,
                             stroke_color=h2r(GRAY), stroke_width=1.5)
        db_ellipse_bot = Ellipse(width=1.4, height=0.25, fill_color=h2r(GRAY), fill_opacity=0.3,
                                  stroke_color=h2r(GRAY), stroke_width=1.5)
        db_ellipse_bot.next_to(db_rect, DOWN, buff=0)
        db_body = VGroup(db_ellipse_top, db_rect, db_ellipse_bot)
        db_group = VGroup(db_body, db_rows).scale(0.6).move_to(LEFT * 2)
        self.play(FadeIn(db_group), run_time=NORMAL)
        robot2 = Text("🤖", font_size=32).move_to(LEFT * 4 + UP * 0.5)
        self.play(FadeIn(robot2), run_time=FAST)
        self.play(db_group.animate.set_color(h2r(RED)), run_time=0.3)
        for piece in db_group:
            dx = np.random.choice([-1, 1]) * 0.3
            dy = np.random.choice([-1, 1]) * 0.2
            self.play(piece.animate.shift(RIGHT * dx + UP * dy), run_time=0.15)
        self.wait(FAST)

        card2 = VGroup(
            RoundedRectangle(width=6.5, height=1.5, corner_radius=0.1,
                             fill_color=h2r(RED), fill_opacity=0.1,
                             stroke_color=h2r(RED), stroke_width=1.5),
        )
        card2_labels = VGroup(
            Text("INCIDENT: Jul 2025", font="Helvetica", font_size=13, color=RED, weight=BOLD),
            Text("Replit AI agent deletes entire production database", font="Helvetica", font_size=11, color=TEXT),
            Text('"How could anyone on planet earth use it in production', font="Helvetica", font_size=9, color=AMBER, slant='ITALIC'),
            Text('if it ignores all orders and deletes your database?"', font="Helvetica", font_size=9, color=AMBER, slant='ITALIC'),
            Text("— Jason Lemkin, SaaStr", font="Helvetica", font_size=8, color=GRAY),
        ).arrange(DOWN, buff=0.12)
        card2 = VGroup(card2[0], card2_labels).arrange(DOWN, buff=0.12)
        card2.move_to(RIGHT * 2.5 + DOWN * 0.5)
        for m in card2:
            self.play(FadeIn(m), run_time=FAST)
        self.wait(BEAT)
        self.play(FadeOut(db_group, robot2, card2), run_time=NORMAL)

        # ── Payment Nightmare ──────────────────────────────────────────────
        card_icon = VGroup(
            RoundedRectangle(width=1.8, height=1.1, corner_radius=0.12,
                             fill_color=h2r(AMBER), fill_opacity=0.3,
                             stroke_color=h2r(AMBER), stroke_width=2),
            Text("💳", font_size=20),
            Text("AI Agent Card", font="Helvetica", font_size=8, color=AMBER).shift(DOWN * 0.3),
        ).move_to(LEFT * 2)
        counter = Text("$0", font="Fira Code Mono", font_size=24, color=RED)
        counter.to_edge(RIGHT).shift(LEFT * 2)
        self.play(FadeIn(card_icon), FadeIn(counter), run_time=NORMAL)
        bots = VGroup(*[Text("🤖", font_size=16) for _ in range(5)])
        bots.arrange(RIGHT, buff=0.5).next_to(card_icon, DOWN, buff=0.3)
        self.play(FadeIn(bots), run_time=FAST)
        for val in [127, 489, 1203, 4891]:
            new_c = Text(f"${val:,}", font="Fira Code Mono", font_size=24, color=RED)
            new_c.move_to(counter)
            self.play(Transform(counter, new_c), run_time=0.3)
        self.wait(FAST)

        card3 = VGroup(
            RoundedRectangle(width=6.5, height=1.6, corner_radius=0.1,
                             fill_color=h2r(AMBER), fill_opacity=0.1,
                             stroke_color=h2r(AMBER), stroke_width=1.5),
        )
        card3_labels = VGroup(
            Text("EMERGING THREAT: AI Agents with Credit Cards", font="Helvetica", font_size=12, color=AMBER, weight=BOLD),
            Text("Visa & Mastercard racing to enable 'agentic commerce'", font="Helvetica", font_size=10, color=TEXT),
            Text("\"We don't know how many different ways", font="Helvetica", font_size=9, color=GRAY, slant='ITALIC'),
            Text("this can be exploited yet\" — Payments expert", font="Helvetica", font_size=9, color=GRAY, slant='ITALIC'),
            Text("$534 BILLION lost to fraud in 2025", font="Helvetica", font_size=11, color=RED, weight=BOLD),
        ).arrange(DOWN, buff=0.1)
        card3 = VGroup(card3[0], card3_labels).arrange(DOWN, buff=0.1)
        card3.move_to(RIGHT * 2.5 + DOWN * 0.5)
        for m in card3:
            self.play(FadeIn(m), run_time=FAST)
        self.wait(BEAT)
        self.play(FadeOut(card_icon, bots, counter, card3), run_time=NORMAL)

        # ── The Pattern triptych ───────────────────────────────────────────
        panel_w, panel_h = 2.5, 1.8
        for x_pos, label_text in [(-3.5, "Email\nMassacre"), (0, "Database\nNuke"), (3.5, "Payment\nNightmare")]:
            p = RoundedRectangle(width=panel_w, height=panel_h, corner_radius=0.1,
                                 fill_color=h2r(RED), fill_opacity=0.1,
                                 stroke_color=h2r(RED), stroke_width=1)
            p.move_to(RIGHT * x_pos + UP * 0.5)
            lbl = Text(label_text, font="Helvetica", font_size=10, color=TEXT)
            lbl.move_to(p)
            triptych = VGroup(p, lbl) if x_pos == -3.5 else triptych
            if x_pos == 0:
                triptych = VGroup(triptych, VGroup(p, lbl))
            if x_pos == 3.5:
                triptych.add(VGroup(p, lbl))
        if not isinstance(triptych, VGroup):
            triptych = VGroup()
        panels = []
        for x_pos, label_text in [(-3.5, "Email\nMassacre"), (0, "Database\nNuke"), (3.5, "Payment\nNightmare")]:
            p = RoundedRectangle(width=panel_w, height=panel_h, corner_radius=0.1,
                                 fill_color=h2r(RED), fill_opacity=0.1,
                                 stroke_color=h2r(RED), stroke_width=1)
            p.move_to(RIGHT * x_pos + UP * 0.5)
            lbl = Text(label_text, font="Helvetica", font_size=10, color=TEXT)
            lbl.move_to(p)
            panels.append(VGroup(p, lbl))
        triptych = VGroup(*panels)
        self.play(FadeIn(triptych), run_time=NORMAL)
        self.wait(BEAT)
        line = Line(LEFT * 5, RIGHT * 5, color=h2r(RED), stroke_width=2)
        line.next_to(triptych, DOWN, buff=0.3)
        self.play(Create(line), run_time=FAST)
        pattern_lines = VGroup(
            Text("THE COMMON THREAD:", font="Helvetica", font_size=14, color=RED, weight=BOLD),
            Text("AI agents had permanent access.", font="Helvetica", font_size=12, color=TEXT),
            Text("No human was asked.", font="Helvetica", font_size=12, color=AMBER),
            Text("No one could stop them in time.", font="Helvetica", font_size=12, color=RED),
        ).arrange(DOWN, buff=0.2).next_to(line, DOWN, buff=0.3)
        for t in pattern_lines:
            self.play(FadeIn(t), run_time=FAST)
        self.wait(DRAMATIC)
        self.play(FadeOut(triptych, line, pattern_lines), run_time=SLOW)


# ════════════════════════════════════════════════════════════════════════════
# SCENE 2 — The Wrong Question (0:35–0:55)
# ════════════════════════════════════════════════════════════════════════════

class Scene2_TheWrongQuestion(Scene):
    def construct(self):
        self.camera.background_color = BG

        title = Text("The Scope Illusion", font="Helvetica", font_size=26, color=TEXT)
        title.to_edge(UP, buff=1.2)
        self.play(FadeIn(title), run_time=NORMAL)
        self.wait(BEAT)

        # OAuth box
        oauth_rect = RoundedRectangle(width=4, height=2.8, corner_radius=0.15,
                                      fill_color=h2r(GRAY), fill_opacity=0.1,
                                      stroke_color=h2r(GRAY), stroke_width=1.5)
        oauth_header = Text("SlackBot wants to access:", font="Helvetica", font_size=11, color=TEXT)
        oauth_header.next_to(oauth_rect, UP, buff=0).align_to(oauth_rect, LEFT).shift(RIGHT * 0.3 + UP * 0.9)
        checks = ["Read messages", "Send messages", "Manage channels", "Delete messages"]
        check_items = VGroup()
        for i, item in enumerate(checks):
            row = VGroup(Text("✓", font_size=12, color=GREEN), Text(item, font="Helvetica", font_size=10, color=TEXT))
            row.arrange(RIGHT, buff=0.2)
            row.next_to(oauth_rect, DOWN, buff=0).align_to(oauth_rect, LEFT).shift(RIGHT * 0.4 + DOWN * (0.9 - i * 0.3))
            check_items.add(row)
        allow_btn = RoundedRectangle(width=1.2, height=0.35, corner_radius=0.1,
                                      fill_color=h2r(GREEN), fill_opacity=0.8, stroke_color=GREEN)
        allow_txt = Text("Allow", font="Helvetica", font_size=10, color=BG, weight=BOLD)
        allow_txt.move_to(allow_btn)
        allow_btn.next_to(check_items, DOWN, buff=0.15)
        oauth_full = VGroup(oauth_rect, oauth_header, check_items, allow_btn, allow_txt)
        oauth_full.move_to(LEFT * 1.5)
        self.play(FadeIn(oauth_full), run_time=NORMAL)
        self.wait(BEAT)

        big_check = Text("✓", font_size=48, color=GREEN).move_to(RIGHT * 2.5)
        self.play(FadeIn(big_check), run_time=FAST)
        days_label = Text("Day 1...  Day 30...  Day 90...  Day 365...", font="Fira Code Mono", font_size=14, color=GRAY)
        days_label.next_to(big_check, DOWN, buff=0.5)
        self.play(FadeIn(days_label), run_time=SLOW)
        self.wait(BEAT)
        arrow = Arrow(LEFT * 1.5, RIGHT * 0.3, color=h2r(RED), buff=0.1)
        arrow_label = Text("Still valid. Still unchecked.", font="Helvetica", font_size=10, color=RED)
        arrow_label.next_to(arrow, DOWN, buff=0.1)
        self.play(Create(arrow), FadeIn(arrow_label), run_time=NORMAL)
        self.wait(BEAT)
        quote = Text("You said yes ONCE. The token lives FOREVER.", font="Helvetica", font_size=16, color=AMBER, weight=BOLD)
        quote.to_edge(DOWN, buff=1.0)
        self.play(FadeIn(quote), run_time=SLOW)
        self.wait(DRAMATIC)
        self.play(FadeOut(oauth_full, big_check, days_label, arrow, arrow_label, quote, title), run_time=NORMAL)

        # The Reframe
        left_header = Text("❌ THE OLD QUESTION", font="Helvetica", font_size=14, color=RED, weight=BOLD)
        left_lines = VGroup(
            Text("WHAT can the agent access?", font="Helvetica", font_size=11, color=TEXT),
            Text("→ Scopes & permissions", font="Helvetica", font_size=10, color=GRAY),
            Text("→ Decided once at consent time", font="Helvetica", font_size=10, color=GRAY),
            Text("→ Token lives until revoked", font="Helvetica", font_size=10, color=GRAY),
            Text("→ Agent acts freely 24/7", font="Helvetica", font_size=10, color=GRAY),
        ).arrange(DOWN, buff=0.15)
        left_box = VGroup(left_header, left_lines).arrange(DOWN, buff=0.2)
        left_bg = RoundedRectangle(width=3.8, height=left_box.height + 0.4, corner_radius=0.1,
                                   fill_color=h2r(RED), fill_opacity=0.05, stroke_color=h2r(RED), stroke_width=1)
        left_box = VGroup(left_bg, left_header, left_lines).arrange(DOWN, buff=0.2)
        left_box.move_to(LEFT * 2.5)

        right_header = Text("✓ THE RIGHT QUESTION", font="Helvetica", font_size=14, color=GREEN, weight=BOLD)
        right_lines = VGroup(
            Text("WHEN can the agent act?", font="Helvetica", font_size=11, color=TEXT),
            Text("→ Every write operation, every time", font="Helvetica", font_size=10, color=GREEN),
            Text("→ Decided at the moment of action", font="Helvetica", font_size=10, color=GREEN),
            Text("→ Token minted on-demand, used once", font="Helvetica", font_size=10, color=GREEN),
            Text("→ Human approves each critical action", font="Helvetica", font_size=10, color=GREEN),
        ).arrange(DOWN, buff=0.15)
        right_box = VGroup(right_header, right_lines).arrange(DOWN, buff=0.2)
        right_bg = RoundedRectangle(width=3.8, height=right_box.height + 0.4, corner_radius=0.1,
                                    fill_color=h2r(GREEN), fill_opacity=0.05, stroke_color=h2r(GREEN), stroke_width=1)
        right_box = VGroup(right_bg, right_header, right_lines).arrange(DOWN, buff=0.2)
        right_box.move_to(RIGHT * 2.5)

        divider = Line(UP * 2.5, DOWN * 2.5, color=h2r(GRAY), stroke_width=1)
        self.play(FadeIn(left_box), FadeIn(right_box), Create(divider), run_time=NORMAL)
        self.wait(BEAT)
        self.play(right_box.animate.scale(1.05).set_stroke(h2r(GREEN), width=2), run_time=FAST)
        self.play(right_box.animate.scale(1.0).set_stroke(h2r(GREEN), width=1), run_time=FAST)
        reveal = Text("It's not about WHAT is allowed.", font="Helvetica", font_size=22, color=TEXT)
        reveal2 = Text("It's about WHEN.", font="Helvetica", font_size=26, color=GREEN, weight=BOLD)
        reveal_group = VGroup(reveal, reveal2).arrange(DOWN, buff=0.15).to_edge(DOWN, buff=0.8)
        self.play(FadeOut(divider), FadeOut(left_box), run_time=NORMAL)
        self.play(right_box.animate.move_to(UP * 1.5).scale(0.8), run_time=SLOW)
        self.wait(BEAT)
        self.play(FadeIn(reveal_group), run_time=SLOW)
        self.wait(DRAMATIC)
        self.play(FadeOut(right_box, reveal_group), run_time=NORMAL)


# ════════════════════════════════════════════════════════════════════════════
# SCENE 3 — Enter VaultGate (0:55–1:30)
# ════════════════════════════════════════════════════════════════════════════

class Scene3_EnterVaultGate(Scene):
    def construct(self):
        self.camera.background_color = BG

        # Logo reveal
        shield = ShieldIcon(size=1.2).to_edge(UP, buff=1.5)
        self.play(FadeIn(shield, scale=0.8), run_time=SLOW)
        self.wait(BEAT)
        vg_name = Text("VaultGate", font="Helvetica", font_size=36, color=PURPLE, weight=BOLD)
        vg_name.next_to(shield, DOWN, buff=0.3)
        tagline = Text("The Human-in-the-Loop Gateway for AI Agents", font="Helvetica", font_size=14, color=GRAY)
        tagline.next_to(vg_name, DOWN, buff=0.15)
        self.play(FadeIn(vg_name), FadeIn(tagline), run_time=NORMAL)
        self.wait(DRAMATIC)
        self.play(FadeOut(shield, vg_name, tagline), run_time=NORMAL)

        # Architecture nodes
        agent_pos  = LEFT * 5
        vg_pos     = ORIGIN
        slack_pos  = RIGHT * 5 + UP * 1.5
        github_pos = RIGHT * 5
        google_pos = RIGHT * 5 + DOWN * 1.5

        agent_node = VGroup(Text("🤖", font_size=28),
                             Text("AI Agent\n(any framework)", font="Helvetica", font_size=11, color=TEXT))
        agent_node.arrange(DOWN, buff=0.1).move_to(agent_pos)
        self.play(FadeIn(agent_node), run_time=NORMAL)
        self.wait(BEAT)

        arrow1 = Arrow(agent_pos + RIGHT * 0.5, vg_pos + LEFT * 1.0, buff=0, color=h2r(TEXT), stroke_width=2)
        self.play(Create(arrow1), run_time=NORMAL)

        vg_box = VGroup(
            RoundedRectangle(width=2.2, height=1.4, corner_radius=0.15,
                             fill_color=h2r(PURPLE), fill_opacity=0.15,
                             stroke_color=h2r(PURPLE), stroke_width=2),
            Text("VaultGate", font="Helvetica", font_size=14, color=PURPLE, weight=BOLD),
            Text("Gateway", font="Helvetica", font_size=10, color=GRAY),
            Text(":18792", font="Fira Code Mono", font_size=9, color=GRAY),
            Text("/action  /status  /revoke", font="Fira Code Mono", font_size=7, color=GRAY),
        ).arrange(DOWN, buff=0.05)
        vg_box.arrange(DOWN, buff=0.05)
        vg_box.move_to(vg_pos)
        self.play(FadeIn(vg_box), run_time=NORMAL)
        self.wait(BEAT)

        # READ path (green, straight through)
        arrow_read = Arrow(vg_pos + RIGHT * 1.1, slack_pos + LEFT * 1.2, buff=0, color=h2r(GREEN), stroke_width=2)
        read_label = Text("read:messages", font="Fira Code Mono", font_size=8, color=GREEN)
        read_label.move_to((vg_pos + RIGHT * 1.1 + slack_pos + LEFT * 1.2) / 2 + UP * 0.25)
        self.play(Create(arrow_read), FadeIn(read_label), run_time=NORMAL)
        read_pass = Text("READ → passes through silently", font="Helvetica", font_size=9, color=GREEN)
        read_pass.next_to(arrow_read, UP, buff=0.1)
        self.play(FadeIn(read_pass), run_time=FAST)

        for pos, lbl in [(slack_pos, "Slack"), (github_pos, "GitHub"), (google_pos, "Google")]:
            icon = Circle(radius=0.35, fill_color=h2r(GREEN), fill_opacity=0.2,
                          stroke_color=h2r(GREEN), stroke_width=1.5)
            txt = Text(lbl, font="Helvetica", font_size=8, color=GREEN)
            api = VGroup(icon, txt).arrange(DOWN, buff=0.05).move_to(pos)
            self.play(FadeIn(api), run_time=FAST)
        self.wait(BEAT)

        # WRITE path (amber, gate)
        arrow_write = Arrow(vg_pos + RIGHT * 0.5 + DOWN * 0.5, vg_pos + DOWN * 2.5, buff=0, color=h2r(AMBER), stroke_width=2)
        write_label = Text("write:messages", font="Fira Code Mono", font_size=8, color=AMBER)
        write_label.next_to(arrow_write, RIGHT, buff=0.1)
        self.play(Create(arrow_write), FadeIn(write_label), run_time=NORMAL)

        gate_bar = Line(LEFT * 0.8, RIGHT * 0.8, color=h2r(AMBER), stroke_width=4)
        gate_bar.move_to(vg_pos + DOWN * 2.0)
        gate_label = Text("GATE CLOSES", font="Helvetica", font_size=9, color=AMBER, weight=BOLD)
        gate_label.next_to(gate_bar, DOWN, buff=0.1)
        self.play(Create(gate_bar), FadeIn(gate_label), run_time=NORMAL)

        arrow_phone = Arrow(gate_bar.get_bottom() + DOWN * 0.1, DOWN * 3.2, buff=0, color=h2r(AMBER), stroke_width=2)
        self.play(Create(arrow_phone), run_time=NORMAL)

        phone = PhoneNotification(action_text='"Deploying v2.1\nto production"')
        phone.next_to(arrow_phone, DOWN).shift(DOWN * 0.3)
        self.play(FadeIn(phone), run_time=NORMAL)
        self.wait(BEAT)

        # Approve pulse
        pulse = Circle(radius=0.2, fill_color=h2r(GREEN), stroke_width=0)
        pulse.move_to(phone.get_center() + DOWN * 1.5)
        self.play(FadeIn(pulse), run_time=FAST)
        self.play(pulse.animate.shift(DOWN * 3.5).set_opacity(0),
                  gate_bar.animate.set_color(h2r(GREEN)).shift(DOWN * 0.3),
                  run_time=NORMAL)

        token_icon = Text("🔑", font_size=18)
        token_label = Text("Token minted. Used once. Revoked.", font="Helvetica", font_size=10, color=GREEN)
        token = VGroup(token_icon, token_label).arrange(RIGHT, buff=0.2)
        token.move_to(vg_pos + DOWN * 1.2)
        self.play(FadeIn(token), run_time=NORMAL)
        self.wait(FAST)
        self.play(FadeOut(token), run_time=FAST)

        arrow_complete = Arrow(vg_pos + RIGHT * 1.1 + UP * 0.3, slack_pos + LEFT * 0.5, buff=0, color=h2r(GREEN), stroke_width=2)
        self.play(Create(arrow_complete), run_time=NORMAL)
        complete_txt = Text("✓ Message sent to #engineering", font="Helvetica", font_size=10, color=GREEN)
        complete_txt.next_to(arrow_complete, UP, buff=0.1)
        self.play(FadeIn(complete_txt), run_time=NORMAL)
        self.wait(BEAT)

        deny_note = Text("DENY → Gate stays closed → Action blocked → Zero exposure", font="Helvetica", font_size=9, color=RED)
        deny_note.move_to(gate_bar.get_center() + RIGHT * 2.5)
        self.play(FadeIn(deny_note), run_time=NORMAL)
        self.wait(BEAT)

        # Key Insight
        self.play(FadeOut(*self.mobjects, run_time=SLOW))
        insight = VGroup(
            Text("This is CIBA", font="Helvetica", font_size=28, color=BLUE, weight=BOLD),
            Text("Client Initiated Backchannel Authentication", font="Helvetica", font_size=14, color=TEXT),
            Text("The same standard banks use for high-value transactions.", font="Helvetica", font_size=12, color=GRAY),
            Text("Not a checkbox. Not a prompt.", font="Helvetica", font_size=12, color=AMBER, weight=BOLD),
            Text("A cryptographic approval flow.", font="Helvetica", font_size=12, color=GREEN, weight=BOLD),
        ).arrange(DOWN, buff=0.2)
        for m in insight:
            self.play(FadeIn(m), run_time=FAST)
        self.wait(DRAMATIC)
        self.play(FadeOut(insight), run_time=NORMAL)


# ════════════════════════════════════════════════════════════════════════════
# SCENE 4 — The Magic Moment (1:30–1:55)
# ════════════════════════════════════════════════════════════════════════════

class Scene4_MagicMoment(Scene):
    def construct(self):
        self.camera.background_color = BG

        title = Text("Watch it in action", font="Helvetica", font_size=20, color=GRAY)
        title.to_edge(UP, buff=0.8)
        self.play(FadeIn(title), run_time=FAST)

        divider = Line(UP * 3, DOWN * 3, color=h2r(GRAY), stroke_width=1)

        terminal_lines = [
            '$ curl -X POST http://localhost:18792/action',
            '  -d \'{"service": "slack",',
            '       "action": "send_message",',
            '       "params": {"channel": "#engineering",',
            '                   "text": "Deploying v2.1..."}}\'',
            '',
            '> Response: {',
            '  "status": "pending_approval",',
            '  "auth_req_id": "ciba_8f3k2..."',
            '}',
        ]
        terminal = Terminal(lines=terminal_lines, width=5.0, font_size=9)
        terminal.move_to(LEFT * 2.8 + DOWN * 0.3)
        phone = PhoneNotification(action_text="send_message\nto #engineering")
        phone.move_to(RIGHT * 2.8 + DOWN * 0.3)

        self.play(Create(divider), FadeIn(terminal), FadeIn(phone), run_time=NORMAL)
        self.wait(BEAT)

        # Approve tap
        pulse = Circle(radius=0.2, fill_color=h2r(GREEN), stroke_width=0)
        pulse.move_to(phone.get_center() + DOWN * 1.5)
        self.play(FadeIn(pulse), run_time=FAST)
        self.play(pulse.animate.set_opacity(0), run_time=NORMAL)

        new_terminal_lines = [
            '$ curl -X POST http://localhost:18792/action',
            '',
            '> Response: {',
            '  "status": "approved",',
            '  "token": "eyJ...[REDACTED]",',
            '  "ttl": "single_use",',
            '  "result": "✓ Message sent!"',
            '}',
        ]
        new_terminal = Terminal(lines=new_terminal_lines, width=5.0, font_size=9)
        new_terminal.move_to(LEFT * 2.8 + DOWN * 0.3)

        flash = Rectangle(width=8, height=5, fill_color=h2r(GREEN), stroke_width=0, fill_opacity=0.08)
        flash.move_to(ORIGIN)
        self.play(FadeIn(flash), run_time=0.1)
        self.play(FadeOut(flash), Transform(terminal, new_terminal), run_time=NORMAL)

        control = Text("You were in control the entire time.", font="Helvetica", font_size=18, color=GREEN, weight=BOLD)
        control.to_edge(DOWN, buff=0.8)
        self.play(FadeIn(control), run_time=SLOW)
        self.wait(DRAMATIC)
        self.play(FadeOut(terminal, phone, divider, title, control), run_time=NORMAL)


# ════════════════════════════════════════════════════════════════════════════
# SCENE 5 — Why This Wins (1:55–2:20)
# ════════════════════════════════════════════════════════════════════════════

class Scene5_WhyThisWins(Scene):
    def construct(self):
        self.camera.background_color = BG

        title = Text("Why VaultGate Wins", font="Helvetica", font_size=26, color=TEXT)
        title.to_edge(UP, buff=1.0)
        self.play(FadeIn(title), run_time=NORMAL)
        self.wait(BEAT)

        col_widths = [2.2, 2.0, 1.5, 2.0]
        headers = ["", "Traditional\nOAuth + Scopes", "API Keys", "VaultGate\n+ CIBA"]
        rows_data = [
            ["Token lifetime",    "Long-lived",   "Long-lived",  "Single-use"],
            ["Human approval",    "Once at grant", "Never",       "Every write"],
            ["Revocation",        "Manual",        "Manual",      "Automatic"],
            ["Leaked token risk", "HIGH",          "HIGH",        "ZERO"],
            ["Agent goes rogue",  "No stop",       "No stop",     "Denied ✗"],
        ]

        table_rows = []
        header_rect = Rectangle(width=sum(col_widths), height=0.55,
                                fill_color=h2r(GRAY), fill_opacity=0.2,
                                stroke_color=h2r(GRAY), stroke_width=1)
        x = -sum(col_widths) / 2
        header_cells = VGroup()
        for h, w in zip(headers, col_widths):
            cell = Text(h, font="Helvetica", font_size=9, color=TEXT)
            cell.move_to(header_rect.get_center() + RIGHT * (x + w / 2))
            header_cells.add(cell)
            x += w
        table_rows.append(VGroup(header_rect, header_cells))

        for ri, row_data in enumerate(rows_data):
            bg_op = 0.05 if ri % 2 == 0 else 0.1
            row_rect = Rectangle(width=sum(col_widths), height=0.42,
                                  fill_color=h2r(GRAY), fill_opacity=bg_op,
                                  stroke_color=h2r(GRAY), stroke_width=0.5)
            x = -sum(col_widths) / 2
            row_cells = VGroup()
            for ci, (cell_text, w) in enumerate(zip(row_data, col_widths)):
                is_vg = ci == 3
                is_bad = cell_text in ["HIGH", "No stop", "Long-lived", "Once at grant", "Manual"]
                color = GREEN if is_vg and not is_bad else (RED if is_bad and ci > 0 else TEXT)
                cell = Text(cell_text, font="Helvetica", font_size=9, color=color)
                cell.move_to(row_rect.get_center() + RIGHT * (x + w / 2))
                row_cells.add(cell)
                x += w
            table_rows.append(VGroup(row_rect, row_cells))

        table = VGroup(*table_rows).arrange(DOWN, buff=0).move_to(DOWN * 0.3)
        for row in table:
            self.play(FadeIn(row), run_time=FAST)
            self.wait(FAST / 2)
        self.wait(BEAT)

        self.play(FadeOut(table), run_time=NORMAL)

        # Stats bar
        stats = [("227 tests", GREEN), ("100% coverage", GREEN),
                 ("OCI on GHCR", BLUE), ("Full CIBA + Auth0 Guardian", BLUE),
                 ("Demo mode", PURPLE)]
        progress_bg = Rectangle(width=8, height=0.08, fill_color=h2r(GRAY), stroke_width=0)
        progress_bg.to_edge(DOWN, buff=1.8)
        self.play(FadeIn(progress_bg), run_time=FAST)

        for i, (label, color) in enumerate(stats):
            pill = RoundedRectangle(width=1.5, height=0.3, corner_radius=0.15,
                                    fill_color=h2r(color), fill_opacity=0.8,
                                    stroke_color=h2r(color), stroke_width=1)
            pill_txt = Text(f"✓ {label}", font="Helvetica", font_size=9, color=h2r(BG), weight=BOLD)
            pill_txt.move_to(pill.get_center())
            pill_grp = VGroup(pill, pill_txt)
            pill_grp.next_to(progress_bg, UP, buff=0.25).shift(RIGHT * (-3.5 + i * 1.75))
            self.play(FadeIn(pill_grp), run_time=FAST)
        self.wait(BEAT)

        callback = Text(
            "Every one of these disasters had valid OAuth tokens.\n"
            "Every one had proper scopes.\n"
            "None of them asked: \"Should I do this RIGHT NOW?\"\n"
            "VaultGate does.",
            font="Helvetica", font_size=14, color=TEXT, weight=BOLD)
        callback.move_to(ORIGIN)
        self.play(FadeOut(progress_bg), FadeIn(callback), run_time=SLOW)
        self.wait(DRAMATIC)
        self.play(FadeOut(callback, title), run_time=NORMAL)


# ════════════════════════════════════════════════════════════════════════════
# SCENE 6 — The Future (2:20–2:40)
# ════════════════════════════════════════════════════════════════════════════

class Scene6_TheFuture(Scene):
    def construct(self):
        self.camera.background_color = BG

        title = Text("The Future of VaultGate", font="Helvetica", font_size=26, color=TEXT)
        title.to_edge(UP, buff=1.0)
        self.play(FadeIn(title), run_time=NORMAL)
        self.wait(BEAT)

        timeline = Line(LEFT * 5.5, RIGHT * 5.5, color=h2r(GRAY), stroke_width=2)
        timeline.move_to(DOWN * 0.5)
        for lbl, x in [(Text("NOW", font="Helvetica", font_size=11, color=GREEN, weight=BOLD), -3.8),
                       (Text("NEXT", font="Helvetica", font_size=11, color=AMBER, weight=BOLD), 0),
                       (Text("FUTURE", font="Helvetica", font_size=11, color=BLUE, weight=BOLD), 3.8)]:
            lbl.move_to(timeline.get_center() + LEFT * x + UP * 0.35)
            self.play(FadeIn(lbl), run_time=FAST)
        for x in [-3.8, 0, 3.8]:
            dot = Circle(radius=0.1, fill_color=h2r(GRAY), stroke_width=0)
            dot.move_to(timeline.get_center() + LEFT * x)
            self.play(FadeIn(dot), run_time=FAST)
        self.play(Create(timeline), run_time=NORMAL)

        def feature_card(text, color, x_pos):
            card = VGroup(
                RoundedRectangle(width=2.5, height=0.65, corner_radius=0.1,
                                 fill_color=h2r(color), fill_opacity=0.1,
                                 stroke_color=h2r(color), stroke_width=1.5),
                Text(text, font="Helvetica", font_size=10, color=color),
            ).arrange(DOWN, buff=0.1)
            card.move_to(timeline.get_center() + LEFT * x_pos + DOWN * 1.2)
            return card

        features = [
            ("CIBA Approval", GREEN, -4.5), ("Scope Mapping", GREEN, -3.5),
            ("Auth0 Token Vault", GREEN, -5.0), ("Policy Engine", AMBER, -0.5),
            ("Audit Trail UI", AMBER, 0.5), ("Rate Limiting", AMBER, -1.0),
            ("Multi-tenant Enterprise", BLUE, 3.5), ("Agent Reputation", BLUE, 4.5),
            ("Action Binding", BLUE, 3.0),
        ]
        for text, color, x in features:
            self.play(FadeIn(feature_card(text, color, x)), run_time=FAST)
        self.wait(BEAT)

        self.play(FadeOut(*self.mobjects, run_time=SLOW))
        vision = Text("AI agents should be able to ACT on your behalf.",
                      font="Helvetica", font_size=20, color=TEXT)
        vision2 = Text("But you should ALWAYS be in control.",
                       font="Helvetica", font_size=22, color=GREEN, weight=BOLD)
        vision_group = VGroup(vision, vision2).arrange(DOWN, buff=0.3)
        for m in vision_group:
            self.play(FadeIn(m), run_time=SLOW)
        self.wait(DRAMATIC)
        self.play(FadeOut(vision_group), run_time=NORMAL)


# ════════════════════════════════════════════════════════════════════════════
# SCENE 7 — Call to Action (2:40–2:55)
# ════════════════════════════════════════════════════════════════════════════

class Scene7_CallToAction(Scene):
    def construct(self):
        self.camera.background_color = BG

        shield = ShieldIcon(size=1.5).to_edge(UP, buff=1.2)
        self.play(FadeIn(shield, scale=0.8), run_time=SLOW)
        self.wait(BEAT)

        vg_name = Text("VaultGate", font="Helvetica", font_size=40, color=PURPLE, weight=BOLD)
        vg_name.next_to(shield, DOWN, buff=0.3)
        tagline = Text("The Human-in-the-Loop Gateway for AI Agents", font="Helvetica", font_size=16, color=GRAY)
        tagline.next_to(vg_name, DOWN, buff=0.15)
        divider = Line(LEFT * 2.5, RIGHT * 2.5, color=h2r(GRAY), stroke_width=0.5)
        divider.next_to(tagline, DOWN, buff=0.3)
        links = VGroup(
            Text("github.com/nokai-dev/vaultgate", font="Fira Code Mono", font_size=12, color=BLUE),
            Text("Built with Auth0 Token Vault + CIBA", font="Helvetica", font_size=11, color=GRAY),
            Text("Express · Auth0 Token Vault · Auth0 Guardian · OCI", font="Helvetica", font_size=10, color=GRAY),
            Text("227 tests · 100% coverage · GHCR image", font="Helvetica", font_size=10, color=GRAY),
        ).arrange(DOWN, buff=0.15)
        links.next_to(divider, DOWN, buff=0.3)
        hackathon_tag = Text('For the Auth0 "Authorized to Act" Hackathon', font="Helvetica", font_size=12, color=AMBER)
        hackathon_tag.to_edge(DOWN, buff=1.0)

        self.play(FadeIn(vg_name), FadeIn(tagline), FadeIn(divider),
                  FadeIn(links), FadeIn(hackathon_tag), run_time=NORMAL)
        self.wait(DRAMATIC * 1.5)

        fade = Rectangle(width=20, height=12, fill_color=h2r(BG), stroke_width=0)
        self.play(FadeIn(fade), run_time=SLOW)


# ════════════════════════════════════════════════════════════════════════════
# FULL PITCH — Combined Scene
# ════════════════════════════════════════════════════════════════════════════

class VaultGatePitch(Scene):
    def construct(self):
        self.next_section("Horror Stories")
        Scene1_HorrorStories.construct(self)
        self.wait(BEAT)
        self.next_section("The Wrong Question")
        Scene2_TheWrongQuestion.construct(self)
        self.wait(BEAT)
        self.next_section("Enter VaultGate")
        Scene3_EnterVaultGate.construct(self)
        self.wait(BEAT)
        self.next_section("Magic Moment")
        Scene4_MagicMoment.construct(self)
        self.wait(BEAT)
        self.next_section("Why This Wins")
        Scene5_WhyThisWins.construct(self)
        self.wait(BEAT)
        self.next_section("The Future")
        Scene6_TheFuture.construct(self)
        self.wait(BEAT)
        self.next_section("Call to Action")
        Scene7_CallToAction.construct(self)
