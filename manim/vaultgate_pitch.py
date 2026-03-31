"""
VaultGate — Manim Pitch Deck
Render: manim render -qh vaultgate_pitch.py VaultGatePitch
(use -ql for quick preview, -qk for 4K)
Requires: Manim Community Edition >= 0.18
"""
from manim import *
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

# ── Timing ───────────────────────────────────────────────────────────
FAST     = 0.35
NORMAL   = 0.6
SLOW     = 1.0
DRAMATIC = 1.5
BEAT     = 0.6

# ── Helpers ──────────────────────────────────────────────────────────
def heading(text, color=TEXT, font_size=56):
    return Text(text, color=color, font_size=font_size, weight=BOLD)

def body(text, color=TEXT, font_size=28):
    return Text(text, color=color, font_size=font_size)

def code_text(text, font_size=22, color=TEXT):
    return Text(text, font="Monospace", font_size=font_size, color=color)

def card_box(width=10, height=5.5, fill_color=DARK_BOX, stroke_color=BORDER):
    return RoundedRectangle(
        corner_radius=0.15,
        width=width, height=height,
        fill_color=fill_color, fill_opacity=0.95,
        stroke_color=stroke_color, stroke_width=1.5,
    )

def badge(label, color=DANGER, font_size=18):
    txt = Text(label, font_size=font_size, color=BLACK, weight=BOLD)
    bg  = RoundedRectangle(
        corner_radius=0.1,
        width=txt.width + 0.4, height=txt.height + 0.25,
        fill_color=color, fill_opacity=1,
        stroke_width=0,
    )
    return VGroup(bg, txt)

def phone_frame():
    """Returns (full_phone, screen_content_area)."""
    outer = RoundedRectangle(
        corner_radius=0.3, width=2.6, height=4.8,
        stroke_color=MUTED, stroke_width=2,
        fill_color="#000000", fill_opacity=0.9,
    )
    screen = RoundedRectangle(
        corner_radius=0.15, width=2.3, height=4.0,
        stroke_color=BORDER, stroke_width=1,
        fill_color=DARK_BOX, fill_opacity=1,
    )
    screen.move_to(outer).shift(UP * 0.15)
    notch = RoundedRectangle(
        corner_radius=0.05, width=0.8, height=0.12,
        fill_color=MUTED, fill_opacity=1, stroke_width=0,
    ).next_to(screen, UP, buff=0.08)
    return VGroup(outer, screen, notch), screen

def email_row(width=4.5, label="email@example.com"):
    row = RoundedRectangle(
        corner_radius=0.06, width=width, height=0.35,
        fill_color="#1C2128", fill_opacity=1,
        stroke_color=BORDER, stroke_width=0.8,
    )
    txt = Text(label, font_size=14, color=MUTED).move_to(row)
    return VGroup(row, txt)

def node_box(label, icon_char, color=ACCENT, w=2.4, h=1.2):
    box  = RoundedRectangle(
        corner_radius=0.12, width=w, height=h,
        fill_color=DARK_BOX, fill_opacity=1,
        stroke_color=color, stroke_width=2,
    )
    icon = Text(icon_char, font_size=28, color=color).move_to(box).shift(UP * 0.15)
    lbl  = Text(label, font_size=16, color=TEXT, weight=BOLD).next_to(icon, DOWN, buff=0.1)
    return VGroup(box, icon, lbl)

def arrow_between(a, b, color=MUTED, buff=0.1):
    return Arrow(
        a.get_right() + RIGHT * buff,
        b.get_left()  + LEFT  * buff,
        color=color, stroke_width=2.5, tip_length=0.2, buff=0,
    )


# ═════════════════════════════════════════════════════════════════════
class VaultGatePitch(Scene):

    def setup(self):
        self.camera.background_color = BG

    def construct(self):
        self.scene_1_horror()
        self.scene_2_reframe()
        self.scene_3_vaultgate()
        self.scene_4_demo()
        self.scene_5_comparison()
        self.scene_6_future()
        self.scene_7_cta()

    # ── wipe helper ──────────────────────────────────────────────────
    def wipe(self, *extra, run_time=FAST):
        anims = [FadeOut(m, shift=DOWN * 0.3) for m in self.mobjects]
        anims += [FadeOut(e, shift=DOWN * 0.3) for e in extra]
        if anims:
            self.play(*anims, run_time=run_time)

    # ═════════════════════════════════════════════════════════════════
    # SCENE 1 — Horror Stories
    # ═════════════════════════════════════════════════════════════════
    def scene_1_horror(self):
        # ── 1a: Title ────────────────────────────────────────────────
        t1 = heading("AI Agents Have the Keys", font_size=52)
        t2 = heading("to Your Kingdom", font_size=52).next_to(t1, DOWN, buff=0.15)
        title_group = VGroup(t1, t2).move_to(UP * 0.5)
        sub = Text(
            "...and they're already using them.",
            font_size=30, color=WARN, slant='ITALIC',
        ).next_to(title_group, DOWN, buff=0.5)
        self.play(FadeIn(title_group, shift=UP * 0.3), run_time=SLOW)
        self.wait(BEAT)
        self.play(FadeIn(sub, shift=UP * 0.2), run_time=NORMAL)
        self.wait(1)
        self.wipe()

        # ── 1b: Email Incident ────────────────────────────────────────
        inc_badge = badge("INCIDENT • Feb 2026", DANGER).to_corner(UL, buff=0.5)

        emails = VGroup(*[
            email_row(label=random.choice([
                "Re: Q4 Budget Review", "Meeting Tomorrow 10am",
                "Invitation: Team Offsite", "PR #412 merged",
                "Flight Confirmation", "Invoice #8837",
                "Slack: @channel reminder", "Welcome to the team!",
                "Your order has shipped", "Weekly digest",
                "1:1 Agenda — Monday", "Action items from sync",
            ]))
            for _ in range(12)
        ]).arrange(DOWN, buff=0.06).scale(0.85).shift(LEFT * 3.2 + DOWN * 0.2)

        inbox_label = Text("Inbox (847)", font_size=20, color=MUTED).next_to(emails, UP, buff=0.25)
        inbox = VGroup(inbox_label, emails)

        info_lines = [
            "Meta's AI Safety Director",
            "loses 200+ emails", "",
            'OpenClaw ignored "STOP" commands',
            "Bulk-deleted inbox at machine speed", "",
            "She had to physically RUN",
            "to her Mac Mini to kill it", "",
            "9.6 million views on X",
        ]
        info = VGroup(*[
            Text(l, font_size=20,
                 color=TEXT if i < 2 else (DANGER if "STOP" in l or "RUN" in l else MUTED))
            for i, l in enumerate(info_lines)
        ]).arrange(DOWN, buff=0.12, aligned_edge=LEFT).shift(RIGHT * 2.5 + UP * 0.8)

        quote = Text(
            '"Turns out alignment researchers\n aren\'t immune to misalignment."',
            font_size=18, color=WARN, slant='ITALIC',
        ).shift(RIGHT * 2.5 + DOWN * 1.8)
        attr = Text("— Summer Yue, Meta", font_size=15, color=MUTED).next_to(quote, DOWN, buff=0.15)

        self.play(FadeIn(inc_badge), run_time=FAST)
        self.play(FadeIn(inbox, shift=UP * 0.3), run_time=NORMAL)
        self.play(FadeIn(info, shift=LEFT * 0.3), run_time=NORMAL)
        self.wait(0.3)

        # Animate deletion
        for em in emails[1:]:
            em[0].set_fill(DANGER, opacity=0.3)
            em[0].set_stroke(DANGER, width=1)
        self.play(*[em.animate.set_opacity(0.3) for em in emails[1:]], run_time=0.8)
        self.play(*[FadeOut(em, shift=RIGHT * 0.5) for em in emails[1:]], run_time=0.6)

        self.play(FadeIn(quote, shift=UP * 0.2), FadeIn(attr, shift=UP * 0.2), run_time=NORMAL)
        self.wait(1.5)
        self.wipe()

        # ── 1c: Database Incident ────────────────────────────────────
        inc_badge2 = badge("INCIDENT • Jul 2025", DANGER).to_corner(UL, buff=0.5)

        db_body = Rectangle(
            width=2.0, height=2.5,
            fill_color="#1C2128", fill_opacity=1,
            stroke_color=AUTH0, stroke_width=2,
        )
        db_top = Ellipse(
            width=2.0, height=0.5,
            fill_color="#1C2128", fill_opacity=1,
            stroke_color=AUTH0, stroke_width=2,
        )
        db_top.next_to(db_body, UP, buff=-0.02)
        db_label = Text("Production DB", font_size=16, color=AUTH0).next_to(db_body, DOWN, buff=0.2)
        db_stats = Text("1,206 executives\n1,196 companies", font_size=14, color=MUTED).move_to(db_body)
        db = VGroup(db_body, db_top, db_label, db_stats).shift(LEFT * 3.2)

        info2_lines = [
            "Replit AI agent deletes",
            "entire production database", "",
            "During active CODE FREEZE",
            "Ignored ALL CAPS instructions", "",
            'Agent admitted: "catastrophic',
            'failure... destroyed months',
            'of work in seconds"', "",
            "Then LIED about recovery",
        ]
        info2 = VGroup(*[
            Text(l, font_size=20,
                 color=TEXT if i < 2 else (DANGER if any(w in l for w in ["FREEZE", "CAPS", "LIED"]) else MUTED))
            for i, l in enumerate(info2_lines)
        ]).arrange(DOWN, buff=0.1, aligned_edge=LEFT).shift(RIGHT * 2.2 + UP * 0.5)

        quote2 = Text(
            '"How could anyone on planet earth\n use it in production if it ignores\n all orders and deletes your database?"',
            font_size=17, color=WARN, slant='ITALIC',
        ).shift(RIGHT * 2.2 + DOWN * 2)
        attr2 = Text("— Jason Lemkin, SaaStr", font_size=15, color=MUTED).next_to(quote2, DOWN, buff=0.12)

        self.play(FadeIn(inc_badge2), FadeIn(db, shift=UP * 0.3), run_time=NORMAL)
        self.play(FadeIn(info2, shift=LEFT * 0.3), run_time=NORMAL)
        self.wait(0.5)

        # Explode DB
        self.play(
            db_body.animate.set_fill(DANGER, opacity=0.5).set_stroke(DANGER),
            db_top.animate.set_fill(DANGER, opacity=0.5).set_stroke(DANGER),
            db_stats.animate.set_color(DANGER),
            Flash(db, color=DANGER, line_length=0.4, num_lines=16, run_time=0.8),
            run_time=0.8,
        )
        self.play(FadeOut(db, scale=1.5, run_time=0.5))
        self.play(FadeIn(quote2), FadeIn(attr2), run_time=NORMAL)
        self.wait(1.5)
        self.wipe()

        # ── 1d: Payment Threat ───────────────────────────────────────
        inc_badge3 = badge("EMERGING THREAT • 2025–2026", WARN).to_corner(UL, buff=0.5)

        card = RoundedRectangle(
            corner_radius=0.15, width=3.5, height=2.2,
            fill_color="#1a1a2e", fill_opacity=1,
            stroke_color=WARN, stroke_width=2,
        ).shift(LEFT * 3)
        chip = RoundedRectangle(
            corner_radius=0.04, width=0.45, height=0.35,
            fill_color=WARN, fill_opacity=0.6, stroke_width=0,
        ).move_to(card).shift(LEFT * 0.9 + UP * 0.3)
        card_txt = Text("•••• •••• •••• 4242", font="Monospace", font_size=18, color=MUTED).move_to(card).shift(DOWN * 0.3)
        card_label = Text("AI Agent Virtual Card", font_size=14, color=WARN).next_to(card, DOWN, buff=0.2)
        card_group = VGroup(card, chip, card_txt, card_label)

        info3_lines = [
            "Visa & Mastercard building",
            '"agentic commerce" — AI agents',
            "with their own credit cards", "",
            "Mastercard Agent Pay: Q2 2026",
            "Visa: 100+ partners, AI-Ready Cards", "",
            "Stolen card + AI agent =",
            "automated fraud at machine speed", "",
            "$534 BILLION lost to fraud (2025)",
        ]
        info3 = VGroup(*[
            Text(l, font_size=20,
                 color=TEXT if i < 3 else (WARN if "$534" in l else (DANGER if "fraud" in l.lower() and i > 5 else MUTED)))
            for i, l in enumerate(info3_lines)
        ]).arrange(DOWN, buff=0.1, aligned_edge=LEFT).shift(RIGHT * 2.2 + UP * 0.3)

        self.play(FadeIn(inc_badge3), FadeIn(card_group, shift=UP * 0.3), run_time=NORMAL)
        self.play(FadeIn(info3, shift=LEFT * 0.3), run_time=NORMAL)

        counter = Text("$0", font="Monospace", font_size=36, color=DANGER).shift(LEFT * 3 + DOWN * 1.8)
        self.play(FadeIn(counter), run_time=FAST)
        for amt in ["$127", "$489", "$1,203", "$4,891", "$12,407"]:
            new_counter = Text(amt, font="Monospace", font_size=36, color=DANGER).move_to(counter)
            self.play(Transform(counter, new_counter), run_time=0.25)

        self.wait(1.5)
        self.wipe()

        # ── 1e: The Pattern ──────────────────────────────────────────
        pattern_title = heading("The Common Thread", color=DANGER, font_size=44).shift(UP * 2)
        lines = VGroup(
            Text("AI agents had permanent access.", font_size=32, color=TEXT),
            Text("No human was asked.",             font_size=32, color=TEXT),
            Text("No one could stop them in time.", font_size=32, color=DANGER),
        ).arrange(DOWN, buff=0.4).next_to(pattern_title, DOWN, buff=0.8)

        self.play(FadeIn(pattern_title, shift=DOWN * 0.3), run_time=NORMAL)
        for line in lines:
            self.play(FadeIn(line, shift=LEFT * 0.3), run_time=NORMAL)
        self.wait(1.2)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    # SCENE 2 — The Wrong Question
    # ═════════════════════════════════════════════════════════════════
    def scene_2_reframe(self):
        # ── 2a: OAuth consent illusion ───────────────────────────────
        consent_box = card_box(5, 4.5).shift(LEFT * 3)
        consent_title = Text("SlackBot wants access:", font_size=22, color=TEXT, weight=BOLD)
        consent_title.next_to(consent_box, direction=ORIGIN).shift(UP * 1.5)

        perms = VGroup(*[
            VGroup(Text("✓", font_size=20, color=SAFE), Text(p, font_size=18, color=TEXT))
            .arrange(RIGHT, buff=0.2)
            for p in ["Read messages", "Send messages", "Manage channels", "Delete messages"]
        ]).arrange(DOWN, buff=0.25, aligned_edge=LEFT).next_to(consent_title, DOWN, buff=0.4)

        allow_btn = RoundedRectangle(
            corner_radius=0.1, width=1.6, height=0.5,
            fill_color=SAFE, fill_opacity=1, stroke_width=0,
        ).next_to(perms, DOWN, buff=0.5).shift(LEFT * 0.5)
        allow_txt = Text("Allow", font_size=18, color=BLACK, weight=BOLD).move_to(allow_btn)
        consent = VGroup(consent_box, consent_title, perms, allow_btn, allow_txt)

        timeline_label = Text("Token lifetime:", font_size=20, color=MUTED).shift(RIGHT * 3 + UP * 2)
        days = ["Day 1", "Day 30", "Day 90", "Day 365"]
        day_texts = VGroup(*[
            Text(d, font="Monospace", font_size=22, color=WARN).shift(RIGHT * 3)
            for d in days
        ])
        forever_text = Text(
            'You said YES once.\nThe token lives FOREVER.',
            font_size=24, color=DANGER, weight=BOLD,
        ).shift(RIGHT * 3 + DOWN * 1)

        self.play(FadeIn(consent, shift=UP * 0.3), run_time=NORMAL)
        self.wait(0.5)
        self.play(Flash(allow_btn, color=SAFE, line_length=0.3, num_lines=8), run_time=0.5)
        self.play(FadeIn(timeline_label), run_time=FAST)

        current_day = day_texts[0].copy().next_to(timeline_label, DOWN, buff=0.4)
        self.play(FadeIn(current_day), run_time=FAST)
        for d_text in day_texts[1:]:
            new_day = d_text.copy().move_to(current_day)
            self.play(Transform(current_day, new_day), run_time=0.4)
            self.wait(0.3)

        self.play(FadeIn(forever_text, shift=UP * 0.2), run_time=NORMAL)
        self.wait(1.2)
        self.wipe()

        # ── 2b: The Reframe ─────────────────────────────────────────
        divider = Line(UP * 3, DOWN * 3, color=BORDER, stroke_width=2)

        left_header  = Text("THE OLD QUESTION",  font_size=22, color=DANGER, weight=BOLD).shift(LEFT * 3.5 + UP * 2.5)
        left_icon   = Text("✕", font_size=36, color=DANGER).next_to(left_header, LEFT, buff=0.2)
        left_q      = Text("WHAT can the\nagent access?", font_size=28, color=TEXT).shift(LEFT * 3.5 + UP * 1.2)
        left_items  = VGroup(*[
            Text(t, font_size=18, color=MUTED)
            for t in ["→ Scopes & permissions", "→ Decided once at consent time",
                      "→ Token lives until revoked", "→ Agent acts freely 24/7"]
        ]).arrange(DOWN, buff=0.2, aligned_edge=LEFT).shift(LEFT * 3.5 + DOWN * 0.5)
        left_side   = VGroup(left_icon, left_header, left_q, left_items)

        right_header = Text("THE RIGHT QUESTION", font_size=22, color=SAFE, weight=BOLD).shift(RIGHT * 3.5 + UP * 2.5)
        right_icon   = Text("✓", font_size=36, color=SAFE).next_to(right_header, LEFT, buff=0.2)
        right_q      = Text("WHEN can the\nagent act?", font_size=28, color=TEXT).shift(RIGHT * 3.5 + UP * 1.2)
        right_items  = VGroup(*[
            Text(t, font_size=18, color=SAFE if "→" in t else MUTED)
            for t in ["→ Every write, every time", "→ Decided at moment of action",
                      "→ Token minted on-demand, once", "→ Human approves each action"]
        ]).arrange(DOWN, buff=0.2, aligned_edge=LEFT).shift(RIGHT * 3.5 + DOWN * 0.5)
        right_side  = VGroup(right_icon, right_header, right_q, right_items)

        self.play(Create(divider), run_time=FAST)
        self.play(FadeIn(left_side, shift=RIGHT * 0.3), run_time=NORMAL)
        self.wait(0.5)
        self.play(FadeIn(right_side, shift=LEFT * 0.3), run_time=NORMAL)
        self.wait(1)

        highlight = SurroundingRectangle(
            right_side, color=SAFE, buff=0.3,
            corner_radius=0.15, stroke_width=2.5,
        )
        self.play(Create(highlight), run_time=NORMAL)
        self.wait(0.5)

        self.play(
            FadeOut(left_side), FadeOut(divider), FadeOut(highlight),
            right_side.animate.set_opacity(0.15),
            run_time=NORMAL,
        )

        big_line1   = Text("It's not about", font_size=44, color=TEXT).shift(UP * 0.8)
        big_what    = Text("WHAT", font_size=56, color=DANGER, weight=BOLD).next_to(big_line1, RIGHT, buff=0.2)
        big_line1_g = VGroup(big_line1, big_what).move_to(UP * 0.8)

        big_line2   = Text("It's about", font_size=44, color=TEXT).shift(DOWN * 0.5)
        big_when    = Text("WHEN.", font_size=56, color=SAFE, weight=BOLD).next_to(big_line2, RIGHT, buff=0.2)
        big_line2_g = VGroup(big_line2, big_when).move_to(DOWN * 0.5)

        self.play(FadeIn(big_line1_g, shift=UP * 0.2), run_time=SLOW)
        self.wait(0.3)
        self.play(FadeIn(big_line2_g, shift=UP * 0.2), run_time=SLOW)
        self.wait(DRAMATIC)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    # SCENE 3 — Enter VaultGate
    # ═════════════════════════════════════════════════════════════════
    def scene_3_vaultgate(self):
        # ── 3a: Logo reveal ──────────────────────────────────────────
        shield    = Text("🛡", font_size=72).shift(UP * 0.3)
        logo_text = Text("VaultGate", font_size=60, color=ACCENT, weight=BOLD).next_to(shield, DOWN, buff=0.3)
        tagline   = Text("The Human-in-the-Loop Gateway for AI Agents", font_size=24, color=MUTED).next_to(logo_text, DOWN, buff=0.3)
        logo      = VGroup(shield, logo_text, tagline)

        self.play(FadeIn(shield, scale=0.5), run_time=SLOW)
        self.play(FadeIn(logo_text, shift=UP * 0.2), FadeIn(tagline, shift=UP * 0.2), run_time=NORMAL)
        self.wait(1)
        self.wipe()

        # ── 3b: Architecture diagram ───────────────────────────────────
        agent   = node_box("AI Agent", "🤖", color=MUTED,   w=2.2, h=1.1).shift(LEFT * 5.5)
        gateway = node_box("VaultGate", "🛡", color=ACCENT, w=2.4, h=1.3).shift(LEFT * 1.5)

        slack_n  = node_box("Slack",  "💬", color=SAFE, w=1.6, h=0.9).shift(RIGHT * 4 + UP * 1.8)
        github_n = node_box("GitHub", "📂", color=SAFE, w=1.6, h=0.9).shift(RIGHT * 4 + UP * 0.2)
        google_n = node_box("Google", "📧", color=SAFE, w=1.6, h=0.9).shift(RIGHT * 4 + DOWN * 1.4)

        phone, phone_screen = phone_frame()
        phone.shift(DOWN * 2.5 + LEFT * 1.5).scale(0.5)

        gw_endpoints = Text("/action /revoke", font="Monospace", font_size=13, color=MUTED).next_to(gateway, DOWN, buff=0.15)

        a1 = arrow_between(agent, gateway, color=MUTED)

        # Read path
        read_label  = Text("read:*",  font="Monospace", font_size=16, color=SAFE).shift(RIGHT * 1.2 + UP * 2.2)
        read_pass   = Text("→ passes through", font_size=14, color=SAFE).next_to(read_label, DOWN, buff=0.1)
        a_read_slack  = Arrow(gateway.get_right(), slack_n.get_left(),  color=SAFE, stroke_width=2, tip_length=0.15, buff=0.1)
        a_read_github = Arrow(gateway.get_right(), github_n.get_left(), color=SAFE, stroke_width=2, tip_length=0.15, buff=0.1)
        a_read_google = Arrow(gateway.get_right(), google_n.get_left(), color=SAFE, stroke_width=2, tip_length=0.15, buff=0.1)

        # Write path
        write_label   = Text("write:*", font="Monospace", font_size=16, color=WARN).shift(RIGHT * 1.2 + DOWN * 1)
        write_approval = Text("→ requires approval", font_size=14, color=WARN).next_to(write_label, DOWN, buff=0.1)

        gate_line  = Line(
            gateway.get_right() + RIGHT * 0.5 + DOWN * 0.3,
            gateway.get_right() + RIGHT * 0.5 + DOWN * 1.3,
            color=WARN, stroke_width=4,
        )
        gate_label = Text("GATE", font_size=12, color=WARN).next_to(gate_line, RIGHT, buff=0.1)

        a_phone   = Arrow(gate_line.get_bottom(), phone.get_top(), color=WARN, stroke_width=2, tip_length=0.15, buff=0.1)
        ciba_label = Text("CIBA Push", font_size=14, color=WARN).next_to(a_phone, RIGHT, buff=0.1)

        # Build step by step
        self.play(FadeIn(agent, shift=RIGHT * 0.3), run_time=NORMAL)
        self.play(Create(a1), FadeIn(gateway, shift=LEFT * 0.3), run_time=NORMAL)
        self.play(FadeIn(gw_endpoints), run_time=FAST)
        self.wait(0.3)

        self.play(
            FadeIn(read_label), FadeIn(read_pass),
            Create(a_read_slack), Create(a_read_github), Create(a_read_google),
            FadeIn(slack_n), FadeIn(github_n), FadeIn(google_n),
            run_time=NORMAL,
        )
        self.wait(0.5)

        self.play(
            FadeIn(write_label), FadeIn(write_approval),
            Create(gate_line), FadeIn(gate_label),
            run_time=NORMAL,
        )
        self.play(
            Create(a_phone), FadeIn(ciba_label), FadeIn(phone, shift=UP * 0.3),
            run_time=NORMAL,
        )
        self.wait(0.3)

        notif_bg  = RoundedRectangle(
            corner_radius=0.08, width=1.1, height=0.8,
            fill_color=AUTH0, fill_opacity=0.9, stroke_width=0,
        ).move_to(phone).shift(UP * 0.1)
        notif_txt = Text("Allow\nthis action?", font_size=9, color=WHITE).move_to(notif_bg)
        notif = VGroup(notif_bg, notif_txt)
        self.play(FadeIn(notif, scale=0.5), run_time=FAST)

        self.wait(0.8)
        self.play(
            Flash(phone, color=SAFE, line_length=0.3, num_lines=8, run_time=0.6),
            notif_bg.animate.set_fill(SAFE),
            run_time=0.6,
        )

        token_text = Text("Token minted → used once → revoked", font_size=18, color=SAFE).to_edge(DOWN, buff=0.5)
        self.play(FadeIn(token_text, shift=UP * 0.2), run_time=NORMAL)
        self.wait(1.5)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    # SCENE 4 — The Magic Moment (Demo)
    # ═════════════════════════════════════════════════════════════════
    def scene_4_demo(self):
        title = Text("The Magic Moment", font_size=40, color=ACCENT, weight=BOLD).to_edge(UP, buff=0.5)
        self.play(FadeIn(title), run_time=FAST)

        # Left — terminal
        term_bg = card_box(6.5, 5, fill_color="#0D1117", stroke_color=BORDER).shift(LEFT * 3.2 + DOWN * 0.3)
        term_title = Text("Terminal", font_size=14, color=MUTED)
        term_title.next_to(term_bg, UP, buff=0.1)
        term_title.align_to(term_bg, LEFT).shift(RIGHT * 0.2)
        term_dots = VGroup(
            Dot(radius=0.06, color=DANGER),
            Dot(radius=0.06, color=WARN),
            Dot(radius=0.06, color=SAFE),
        ).arrange(RIGHT, buff=0.1).next_to(term_title, LEFT, buff=0.2)

        req_lines = [
            '$ POST /action',
            '  service: "slack"',
            '  action: "send_message"',
            '  channel: "#engineering"',
            '  text: "Deploy v2.1"',
        ]
        req_text = VGroup(*[
            Text(l, font="Monospace", font_size=14, color=SAFE if l.startswith('$') else MUTED)
            for l in req_lines
        ]).arrange(DOWN, buff=0.08, aligned_edge=LEFT)
        req_text.move_to(term_bg).shift(UP * 1.2)
        req_text.align_to(term_bg, LEFT).shift(RIGHT * 0.4)

        pending_lines = [
            "→ status: pending_approval",
            '  auth_req_id: "ciba_8f3k2..."',
            "  Awaiting human approval...",
        ]
        pending_text = VGroup(*[
            Text(l, font="Monospace", font_size=14, color=WARN)
            for l in pending_lines
        ]).arrange(DOWN, buff=0.08, aligned_edge=LEFT)
        pending_text.next_to(req_text, DOWN, buff=0.35).align_to(req_text, LEFT)

        approved_lines = [
            "→ status: approved",
            "  token: [single-use, ephemeral]",
            '  result: "Message sent ✓"',
        ]
        approved_text = VGroup(*[
            Text(l, font="Monospace", font_size=14, color=SAFE)
            for l in approved_lines
        ]).arrange(DOWN, buff=0.08, aligned_edge=LEFT)
        approved_text.next_to(pending_text, DOWN, buff=0.35).align_to(req_text, LEFT)

        # Right — phone
        phone, screen = phone_frame()
        phone.shift(RIGHT * 3.5 + DOWN * 0.3).scale(0.85)

        notif_header = Text("Auth0 Guardian", font_size=12, color=AUTH0, weight=BOLD)
        notif_body = VGroup(
            Text("AI Agent requests:", font_size=11, color=TEXT),
            Text("", font_size=6),
            Text("Action: send_message",       font="Monospace", font_size=10, color=MUTED),
            Text("Target: Slack #engineering", font="Monospace", font_size=10, color=MUTED),
            Text('Content: "Deploy v2.1"',     font="Monospace", font_size=10, color=MUTED),
            Text("Scope: write:slack",        font="Monospace", font_size=10, color=MUTED),
        ).arrange(DOWN, buff=0.06, aligned_edge=LEFT)

        approve_btn = RoundedRectangle(corner_radius=0.08, width=0.8, height=0.3,
                                       fill_color=SAFE, fill_opacity=1, stroke_width=0)
        approve_txt = Text("Approve", font_size=10, color=BLACK, weight=BOLD).move_to(approve_btn)
        deny_btn = RoundedRectangle(corner_radius=0.08, width=0.8, height=0.3,
                                    fill_color=DANGER, fill_opacity=0.3, stroke_width=0)
        deny_txt = Text("Deny", font_size=10, color=DANGER).move_to(deny_btn)
        btns = VGroup(
            VGroup(approve_btn, approve_txt),
            VGroup(deny_btn,   deny_txt),
        ).arrange(RIGHT, buff=0.2)
        notif_group = VGroup(notif_header, notif_body, btns).arrange(DOWN, buff=0.15)
        notif_group.scale(0.85).move_to(phone).shift(UP * 0.1)

        # Animate
        self.play(FadeIn(term_bg), FadeIn(term_title), FadeIn(term_dots), run_time=FAST)
        self.play(FadeIn(phone), run_time=FAST)

        for line in req_text:
            self.play(FadeIn(line, shift=RIGHT * 0.2), run_time=0.15)
        self.wait(0.3)
        self.play(FadeIn(pending_text, shift=UP * 0.2), run_time=NORMAL)

        # Phone buzz
        self.play(phone.animate.shift(RIGHT * 0.05), run_time=0.08)
        self.play(phone.animate.shift(LEFT * 0.1),  run_time=0.08)
        self.play(phone.animate.shift(RIGHT * 0.05), run_time=0.08)
        self.play(FadeIn(notif_group, shift=UP * 0.2), run_time=NORMAL)
        self.wait(1)

        # Tap approve
        self.play(
            Flash(approve_btn, color=SAFE, line_length=0.2, num_lines=8, run_time=0.5),
            approve_btn.animate.set_fill(SAFE, opacity=0.5),
            run_time=0.5,
        )
        self.play(FadeIn(approved_text, shift=UP * 0.2), run_time=NORMAL)

        flash_rect = Rectangle(width=14, height=8, fill_color=SAFE, fill_opacity=0.08, stroke_width=0)
        self.play(FadeIn(flash_rect, run_time=0.2))
        self.play(FadeOut(flash_rect, run_time=0.4))

        control_text = Text("You were in control the entire time.", font_size=28, color=SAFE, weight=BOLD).to_edge(DOWN, buff=0.4)
        self.play(FadeIn(control_text, shift=UP * 0.2), run_time=NORMAL)
        self.wait(DRAMATIC)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    # SCENE 5 — Why This Wins
    # ═════════════════════════════════════════════════════════════════
    def scene_5_comparison(self):
        title = heading("Why VaultGate Wins", color=ACCENT, font_size=44).to_edge(UP, buff=0.5)
        self.play(FadeIn(title), run_time=FAST)

        headers   = ["", "Traditional\nOAuth", "API Keys\n+ Scopes", "VaultGate\n+ CIBA"]
        rows      = [
            ["Token lifetime",     "Long-lived",  "Long-lived",  "Single-use"],
            ["Human approval",     "Once",         "Never",       "Every write"],
            ["Revocation",         "Manual",       "Manual",      "Automatic"],
            ["Leaked token risk",  "HIGH",          "HIGH",        "ZERO"],
            ["Agent goes rogue",   "No stop",      "No stop",     "Denied"],
        ]
        col_widths = [2.5, 2.2, 2.2, 2.2]
        x_starts   = [-4.5, -2.0, 0.2, 2.4]

        h_texts = VGroup()
        for i, (h, x) in enumerate(zip(headers, x_starts)):
            t = Text(h, font_size=16, color=ACCENT if i == 3 else MUTED, weight=BOLD)
            t.move_to(RIGHT * (x + col_widths[i] / 2) + UP * 1.5)
            h_texts.add(t)
        self.play(FadeIn(h_texts), run_time=FAST)
        h_line = Line(LEFT * 5.5 + UP * 1.0, RIGHT * 5.5 + UP * 1.0, color=BORDER, stroke_width=1)
        self.play(Create(h_line), run_time=FAST)

        for r_idx, row in enumerate(rows):
            y = 0.4 - r_idx * 0.7
            row_group = VGroup()
            for c_idx, (cell, x) in enumerate(zip(row, x_starts)):
                if c_idx == 0:
                    color = TEXT
                elif c_idx == 3:
                    color = SAFE
                elif cell in ("HIGH", "No stop", "Never"):
                    color = DANGER
                else:
                    color = MUTED
                t = Text(cell, font_size=16, color=color, weight=BOLD if c_idx == 3 else "")
                t.move_to(RIGHT * (x + col_widths[c_idx] / 2) + UP * y)
                row_group.add(t)
            self.play(FadeIn(row_group, shift=LEFT * 0.2), run_time=0.35)
            self.wait(0.5)

        stats_title = Text("Technical Credibility", font_size=20, color=MUTED).shift(DOWN * 2.2)
        stats = VGroup(*[
            Text(s, font_size=18, color=SAFE)
            for s in ["227 tests", "100% coverage", "OCI on GHCR", "Full CIBA flow", "Demo mode"]
        ]).arrange(RIGHT, buff=0.6).shift(DOWN * 2.8)
        self.play(FadeIn(stats_title), run_time=FAST)
        self.play(*[FadeIn(s, shift=UP * 0.2) for s in stats], run_time=NORMAL)
        self.wait(1.5)
        self.wipe()

        cb1 = Text("Every one of these disasters had valid OAuth tokens.", font_size=24, color=TEXT).shift(UP * 1)
        cb2 = Text("Every one had proper scopes.",                       font_size=24, color=TEXT).next_to(cb1, DOWN, buff=0.3)
        cb3 = Text('None of them asked: "Should I do this RIGHT NOW?"', font_size=24, color=WARN).next_to(cb2, DOWN, buff=0.5)
        cb4 = Text("VaultGate does.", font_size=36, color=SAFE, weight=BOLD).next_to(cb3, DOWN, buff=0.6)
        self.play(FadeIn(cb1, shift=UP * 0.2), run_time=NORMAL)
        self.play(FadeIn(cb2, shift=UP * 0.2), run_time=NORMAL)
        self.wait(0.3)
        self.play(FadeIn(cb3, shift=UP * 0.2), run_time=NORMAL)
        self.wait(0.3)
        self.play(FadeIn(cb4, shift=UP * 0.2), run_time=SLOW)
        self.wait(DRAMATIC)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    # SCENE 6 — The Future
    # ═════════════════════════════════════════════════════════════════
    def scene_6_future(self):
        title = heading("What's Next", color=ACCENT, font_size=44).to_edge(UP, buff=0.5)
        self.play(FadeIn(title), run_time=FAST)

        cols_data = [
            ("NOW ✅",  SAFE,  ["CIBA approval\nfor all writes",    "Scope mapping\nread vs write",    "Auth0 Token\nVault integration"]),
            ("NEXT 🔜", WARN,  ["Policy engine\nauto-approve",    "Audit trail UI\nfull history",   "Rate limiting\nper-agent throttle"]),
            ("FUTURE 🔮", ACCENT, ["Multi-tenant\nenterprise",      "Action binding\ncommitment",      "Agent reputation\ntrust scores"]),
        ]

        all_cols = VGroup()
        for col_idx, (header, color, items) in enumerate(cols_data):
            x = -4 + col_idx * 4
            h = Text(header, font_size=22, color=color, weight=BOLD).move_to(RIGHT * x + UP * 1.5)
            item_group = VGroup()
            for i, item_text in enumerate(items):
                box = RoundedRectangle(
                    corner_radius=0.1, width=3.2, height=1.0,
                    fill_color=DARK_BOX, fill_opacity=1,
                    stroke_color=color, stroke_width=1.5,
                )
                txt = Text(item_text, font_size=14, color=TEXT).move_to(box)
                item = VGroup(box, txt).move_to(RIGHT * x + DOWN * (i * 1.2 - 0.2))
                item_group.add(item)
            col = VGroup(h, item_group)
            all_cols.add(col)

        for col in all_cols:
            self.play(FadeIn(col, shift=UP * 0.3), run_time=NORMAL)
            self.wait(0.3)
        self.wait(1.5)
        self.wipe()

        v1 = Text("AI agents should be able to", font_size=36, color=TEXT).shift(UP * 0.8)
        v2 = Text("ACT on your behalf.", font_size=40, color=ACCENT, weight=BOLD).next_to(v1, DOWN, buff=0.3)
        v3 = Text("But you should", font_size=36, color=TEXT).next_to(v2, DOWN, buff=0.5)
        v4 = Text("ALWAYS be in control.", font_size=40, color=SAFE, weight=BOLD).next_to(v3, DOWN, buff=0.3)
        self.play(FadeIn(v1), run_time=NORMAL)
        self.play(FadeIn(v2, shift=UP * 0.2), run_time=NORMAL)
        self.wait(0.3)
        self.play(FadeIn(v3), run_time=NORMAL)
        self.play(FadeIn(v4, shift=UP * 0.2), run_time=SLOW)
        self.wait(DRAMATIC)
        self.wipe()

    # ═════════════════════════════════════════════════════════════════
    # SCENE 7 — Call to Action
    # ═════════════════════════════════════════════════════════════════
    def scene_7_cta(self):
        shield = Text("🛡", font_size=80).shift(UP * 1.5)
        logo   = Text("VaultGate", font_size=64, color=ACCENT, weight=BOLD).next_to(shield, DOWN, buff=0.3)
        divider = Line(LEFT * 3, RIGHT * 3, color=BORDER, stroke_width=1).next_to(logo, DOWN, buff=0.4)
        tagline   = Text("The Human-in-the-Loop Gateway for AI Agents", font_size=22, color=MUTED).next_to(divider, DOWN, buff=0.3)
        tech      = Text("Express • Auth0 Token Vault • CIBA • Auth0 Guardian", font_size=16, color=MUTED).next_to(tagline, DOWN, buff=0.5)
        stats     = Text("227 tests • 100% coverage • OCI on GHCR", font_size=16, color=SAFE).next_to(tech, DOWN, buff=0.15)
        hackathon = Text('Built for the Auth0 "Authorized to Act" Hackathon', font_size=18, color=AUTH0).next_to(stats, DOWN, buff=0.5)

        self.play(FadeIn(shield, scale=0.5), run_time=SLOW)
        self.play(FadeIn(logo, shift=UP * 0.2), run_time=NORMAL)
        self.play(Create(divider), run_time=FAST)
        self.play(FadeIn(tagline), run_time=NORMAL)
        self.play(FadeIn(tech), FadeIn(stats), run_time=NORMAL)
        self.play(FadeIn(hackathon, shift=UP * 0.2), run_time=NORMAL)
        self.wait(3)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=SLOW)
        self.wait(0.5)
