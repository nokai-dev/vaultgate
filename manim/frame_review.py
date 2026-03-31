#!/usr/bin/env python3
"""
frame_review.py — Automated frame-by-frame quality review for VaultGate pitch video.
Runs after each render to catch rendering bugs before human review.

Usage:
    python3 frame_review.py /path/to/video.mp4

Output:
    JSON report with frame analysis, bugs found, and severity ratings.
    Bug categories: CLIP, ZORDER, TYPO, ARTIFACT, DEAD_FRAMES, MISSING_ELEMENT
"""
import subprocess
import sys
import os
import json
import tempfile
import hashlib

FRAME_TIMESTAMPS = [
    # Scene 1 - Horror (0-5s)
    (0, "title", "Title card - clean text, no clipping"),
    (3, "title_anim", "Title animation mid-flight"),
    # Scene 2 - Incident (5-14s)
    (5,  "incident1_start", "First incident badge visible"),
    (8,  "inbox_red", "Emails turning red"),
    (10, "incident1_text", "Meta safety director text"),
    (12, "db_incident", "Database incident"),
    # Scene 3 - Pattern (14-17s)
    (15, "pattern", "The Common Thread"),
    # Scene 4 - Question (17-25s)
    (18, "old_question", "THE OLD QUESTION vs RIGHT QUESTION"),
    (20, "highlight", "Green highlight on right"),
    (22, "its_about_when", "It's about WHEN"),
    # Scene 5 - VaultGate (25-28s)
    (26, "vaultgate_intro", "VaultGate logo + shield"),
    # Scene 6 - Architecture (28-34s)
    (29, "architecture", "Architecture diagram - all nodes visible"),
    (31, "phone_approval", "Phone showing CIBA approval"),
    (33, "token_minted", "Token minted text"),
    # Scene 7 - Magic Moment (34-39s)
    (35, "magic_moment", "The Magic Moment - CIBA pending"),
    (37, "phone_buzz", "Phone buzzing"),
    (39, "approval_done", "Approved - green flash"),
    # Scene 8 - Why VaultGate Wins (39-50s)
    (40, "comparison_table", "Comparison table"),
    (43, "table_animated", "Table fully populated"),
    (45, "every_one", "Every one had valid OAuth text"),
    (47, "vaultgate_does", "VaultGate does"),
    # Scene 9 - Future (44-50s)
    (49, "futureRoadmap", "NOW/NEXT/FUTURE roadmap"),
    # Scene 10 - Outro (50-53s)
    (51, "outro_logo", "Final logo + shield"),
    (52, "outro_end", "Fade out or final frame"),
]

BUG_SEVERITY = {
    "CRITICAL": "Must fix before submission",
    "WARNING":  "Should fix if easy",
    "MINOR":    "Nice to fix",
    "INFO":     "Not a bug, just observation",
}

def extract_frame(video_path, timestamp, output_path):
    """Extract a single frame at given timestamp."""
    cmd = [
        "ffmpeg", "-y", "-ss", str(timestamp),
        "-i", video_path,
        "-frames:v", "1",
        "-q:v", "2",
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0

def get_file_hash(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

def analyze_frame(image_path, timestamp, expected_scene, check_notes):
    """Analyze a single frame using the model's vision capability."""
    # Read the image as bytes for analysis
    with open(image_path, "rb") as f:
        img_data = f.read()

    size = len(img_data)
    md5 = hashlib.md5(img_data).hexdigest()

    return {
        "timestamp": timestamp,
        "scene": expected_scene,
        "notes": check_notes,
        "file_size": size,
        "md5": md5,
        "path": image_path,
        "bugs": [],
        "status": "needs_review",
    }

def run_review(video_path, output_dir=None):
    """Run full frame review on a video."""
    if not os.path.exists(video_path):
        print(f"ERROR: Video not found: {video_path}")
        return None

    if output_dir is None:
        output_dir = tempfile.mkdtemp(prefix="frame_review_")

    os.makedirs(output_dir, exist_ok=True)

    results = {
        "video": video_path,
        "video_md5": get_file_hash(video_path),
        "frames": [],
        "bugs": [],
        "summary": {"critical": 0, "warning": 0, "minor": 0, "info": 0},
    }

    print(f"Reviewing: {video_path}")
    print(f"Output dir: {output_dir}")
    print(f"Frames to check: {len(FRAME_TIMESTAMPS)}")
    print("-" * 60)

    for i, (ts, scene, notes) in enumerate(FRAME_TIMESTAMPS):
        frame_path = os.path.join(output_dir, f"frame_{i:03d}_{ts}s_{scene}.jpg")

        success = extract_frame(video_path, ts, frame_path)
        if not success:
            print(f"  [FAIL] t={ts}s ({scene}) - extraction failed")
            results["bugs"].append({
                "timestamp": ts, "scene": scene,
                "bug_type": "EXTRACTION_FAILED",
                "severity": "CRITICAL",
                "description": f"ffmpeg failed to extract frame at t={ts}s"
            })
            results["summary"]["critical"] += 1
            continue

        analysis = analyze_frame(frame_path, ts, scene, notes)
        analysis["frame_path"] = f"frame_{i:03d}_{ts}s_{scene}.jpg"
        results["frames"].append(analysis)

        size_kb = os.path.getsize(frame_path) / 1024
        print(f"  [{i+1}/{len(FRAME_TIMESTAMPS)}] t={ts}s ({scene}) - {size_kb:.1f}KB - {notes}")

    # Save raw results for model analysis
    report_path = os.path.join(output_dir, "frame_report.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)

    print("-" * 60)
    print(f"Frame extraction complete. Report: {report_path}")
    print(f"Run model analysis on: {output_dir}")
    print()
    print("Next step: Feed this directory to the frame analysis model prompt:")
    print(f"  python3 -c \"import json; r=json.load(open('{report_path}')); print([f['frame_path'] for f in r['frames']])\"")

    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nUsage: python3 frame_review.py /path/to/video.mp4 [output_dir]")
        sys.exit(1)

    video = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else None

    run_review(video, out_dir)
