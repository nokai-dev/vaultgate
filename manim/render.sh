#!/usr/bin/env bash
# Render the VaultGate Manim pitch deck
# Usage: bash render.sh [scene] [quality]
#   scene:   VaultGatePitch (default), Scene1_HorrorStories, etc.
#   quality: ql (480p), qm (720p), h (1080p), k (2K) — default: ql

set -e

SCENE="${1:-VaultGatePitch}"
QUALITY="${2:-ql}"
FPS="${3:-60}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "VaultGate Manim Pitch Deck Renderer"
echo "========================================"
echo "Scene:   $SCENE"
echo "Quality: $QUALITY"
echo "FPS:     $FPS"
echo ""

# Check for manim
if ! command -v manim &> /dev/null; then
    echo "ERROR: manim not found in PATH"
    echo ""
    echo "Install with:"
    echo "  pip install manim"
    echo "  # OR on macOS with Homebrew:"
    echo "  brew install manim"
    echo "  # OR use the Docker image:"
    echo "  docker run --rm -v \"\$PWD:/app\" manimproject/manim:latest"
    echo ""
    echo "For system dependencies (Linux):"
    echo "  sudo apt-get install libpangocairo-1.0-0 libpango-1.0-0 libcairo2"
    exit 1
fi

# Render
OUTPUT=$(manim -ql --fps="$FPS" -a "$SCRIPT_DIR/VaultGatePitch.py" "$SCENE" 2>&1)
echo "$OUTPUT"

# Find output file
MEDIA_DIR="$SCRIPT_DIR/media"
if [ -d "$MEDIA_DIR" ]; then
    echo ""
    echo "========================================"
    echo "Output files:"
    find "$MEDIA_DIR" -name "*.mp4" -o -name "*.png" 2>/dev/null | head -20
fi
