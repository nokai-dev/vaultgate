#!/bin/bash
# Render VaultGate ManimGL pitch deck
# Usage: ./render_gl.sh [quality]
#   quality: ql (480p), qh (720p), qk (1080p)
Q=${1:-qh}
export GLCONTEXT_BACKEND=egl
export PYGLET_HEADLESS=1
export EGL_PLATFORM=offscreen
export LIBGL_ALWAYS_SOFTWARE=1
cd "$(dirname "$0")"
/usr/bin/python3 /usr/local/bin/manimgl -w --${Q} --fps=60 vaultgategl.py VaultGatePitch
