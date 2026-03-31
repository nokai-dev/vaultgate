#!/bin/bash
# Render VaultGate ManimGL pitch deck
# Usage: ./render_gl.sh [quality]  (l=480p, m=720p, hd=1080p)
Q=${1:-m}
ANIM_DURATION=53   # animation ends at ~52.8s, trim dead frames
export GLCONTEXT_BACKEND=egl
export PYGLET_HEADLESS=1
export EGL_PLATFORM=offscreen
export LIBGL_ALWAYS_SOFTWARE=1
cd "$(dirname "$0")"

/usr/bin/python3 /usr/local/bin/manimgl -w --${Q} --fps=60 vaultgategl.py VaultGatePitch

# Trim to actual animation length (animation ends at ~52.8s)
if [ -f videos/VaultGatePitch.mp4 ]; then
  ffmpeg -i videos/VaultGatePitch.mp4 -t $ANIM_DURATION -c copy -f mp4 /tmp/vg_trim.mp4 2>/dev/null && \
    mv /tmp/vg_trim.mp4 videos/VaultGatePitch.mp4 && \
    echo "Trimmed to ${ANIM_DURATION}s" || \
    echo "Trim skipped (ffmpeg failed, keeping original)"
fi
