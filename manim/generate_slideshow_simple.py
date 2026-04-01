#!/usr/bin/env python3
"""
Generate an interactive HTML slideshow from a directory of frame images.
No frame_report.json needed — just scans for *.jpg files.
"""

import os
import sys
import json
from pathlib import Path
from datetime import timedelta

def generate_slideshow_from_frames(frames_dir: str, output_html: str = "frame_slideshow.html"):
    """Generate interactive HTML slideshow from a directory of frame images."""
    
    frames_path = Path(frames_dir)
    if not frames_path.exists():
        print(f"Error: Frames directory not found: {frames_dir}")
        sys.exit(1)
    
    # Find all jpg files
    frame_files = sorted(frames_path.glob("*.jpg"))
    if not frame_files:
        print(f"Error: No .jpg files found in {frames_dir}")
        sys.exit(1)
    
    print(f"📊 Found {len(frame_files)} frames")
    
    # Try to load frame_report.json for descriptions (optional)
    report_path = frames_path / "frame_report.json"
    frame_reports = {}
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
        frames_list = report.get("frames", []) if isinstance(report, dict) else report
        for frame in frames_list:
            path = frame.get("frame_path") or frame.get("path", "")
            if path:
                frame_reports[Path(path).name] = frame
    
    # Generate frame data
    frame_data = []
    for i, frame_path in enumerate(frame_files):
        # Parse timestamp from filename if possible (e.g., frame_011_29s_architecture.jpg)
        name = frame_path.stem
        timestamp = 0
        description = f"Frame {i+1}"
        
        # Try to extract timestamp from filename
        import re
        match = re.search(r'_(\d+)s_', name)
        if match:
            timestamp = int(match.group(1))
        
        # Try to extract description from filename
        parts = name.split('_')
        if len(parts) > 3:
            description = ' '.join(parts[3:]).replace('_', ' ').title()
        
        # Check if we have report data for this frame
        bugs = []
        if frame_path.name in frame_reports:
            report_frame = frame_reports[frame_path.name]
            bugs = report_frame.get("bugs", [])
            if "notes" in report_frame:
                description = report_frame["notes"]
        
        ts_formatted = str(timedelta(seconds=timestamp))
        
        frame_data.append({
            "index": i,
            "timestamp": ts_formatted,
            "timestamp_raw": timestamp,
            "description": description,
            "filename": frame_path.name,
            "bugs": bugs
        })
    
    # Copy frames to output directory
    output_dir = frames_path.parent / "slideshow"
    output_dir.mkdir(exist_ok=True)
    
    import shutil
    for frame in frame_data:
        src = frames_path / frame["filename"]
        dest = output_dir / frame["filename"]
        shutil.copy(src, dest)
    
    # Generate HTML
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VaultGate Pitch — Frame Review Slideshow</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a; color: #fff; min-height: 100vh;
            display: flex; flex-direction: column;
        }}
        header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }}
        header h1 {{ font-size: 24px; font-weight: 600; margin-bottom: 8px; }}
        header p {{ opacity: 0.9; font-size: 14px; }}
        .slideshow-container {{
            flex: 1; display: flex; flex-direction: column;
            align-items: center; justify-content: center; padding: 40px;
        }}
        .frame-display {{
            background: #1a1a1a; border-radius: 12px; padding: 20px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.4); max-width: 1400px; width: 100%;
        }}
        .frame-image-container {{
            position: relative; background: #000; border-radius: 8px;
            overflow: hidden; aspect-ratio: 16/9; margin-bottom: 20px;
        }}
        .frame-image {{
            width: 100%; height: 100%; object-fit: contain; display: block;
        }}
        .frame-info {{
            display: flex; justify-content: space-between; align-items: center;
            padding: 15px 0; border-top: 1px solid #333;
        }}
        .frame-timestamp {{
            font-size: 32px; font-weight: 700; color: #667eea;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
        }}
        .frame-description {{
            font-size: 18px; color: #aaa; flex: 1; margin-left: 30px;
        }}
        .frame-counter {{
            font-size: 14px; color: #666;
            font-family: 'SF Mono', Monaco, Consolas, monospace;
        }}
        .navigation {{
            display: flex; gap: 20px; margin-top: 30px; justify-content: center;
        }}
        .nav-btn {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none; color: white; padding: 15px 40px; font-size: 16px;
            font-weight: 600; border-radius: 8px; cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .nav-btn:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }}
        .nav-btn:disabled {{ opacity: 0.3; cursor: not-allowed; transform: none; }}
        .bug-indicator {{
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;
            margin-left: 15px;
        }}
        .bug-none {{ background: #059669; color: #fff; }}
        .bug-critical {{ background: #dc2626; color: #fff; }}
        .bug-warning {{ background: #d97706; color: #fff; }}
        .bug-minor {{ background: #2563eb; color: #fff; }}
        .thumbnails {{
            display: flex; gap: 8px; padding: 20px 0; overflow-x: auto;
            max-width: 1400px; margin-top: 20px;
        }}
        .thumbnail {{
            width: 120px; height: 68px; border-radius: 4px; cursor: pointer;
            opacity: 0.5; transition: opacity 0.2s, transform 0.2s;
            border: 2px solid transparent; object-fit: cover;
        }}
        .thumbnail:hover {{ opacity: 0.8; transform: scale(1.05); }}
        .thumbnail.active {{ opacity: 1; border-color: #667eea; }}
        .bug-details {{
            background: #1a1a1a; border-radius: 8px; padding: 15px;
            margin-top: 15px; display: none;
        }}
        .bug-details.show {{ display: block; }}
        .bug-details h4 {{
            font-size: 14px; color: #888; margin-bottom: 10px;
            text-transform: uppercase; letter-spacing: 0.5px;
        }}
        .bug-item {{
            background: #252525; border-left: 3px solid #dc2626;
            padding: 10px 15px; margin-bottom: 8px; border-radius: 0 6px 6px 0;
        }}
        .bug-item.critical {{ border-color: #dc2626; }}
        .bug-item.warning {{ border-color: #d97706; }}
        .bug-item.minor {{ border-color: #2563eb; }}
        .bug-type {{
            font-weight: 700; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;
        }}
        .bug-desc {{ font-size: 13px; color: #ccc; }}
        .keyboard-hint {{
            text-align: center; color: #666; font-size: 12px; margin-top: 15px;
        }}
        .keyboard-hint kbd {{
            background: #333; padding: 3px 8px; border-radius: 4px;
            font-family: 'SF Mono', Monaco, Consolas, monospace; margin: 0 3px;
        }}
    </style>
</head>
<body>
    <header>
        <h1>🎬 VaultGate Pitch — Frame Review</h1>
        <p>Interactive slideshow • {len(frame_data)} frames • Manual QA checklist</p>
    </header>
    <div class="slideshow-container">
        <div class="frame-display">
            <div class="frame-image-container">
                <img src="{frame_data[0]['filename']}" alt="Frame 1" class="frame-image" id="currentFrame">
            </div>
            <div class="frame-info">
                <div>
                    <div class="frame-timestamp" id="timestamp">{frame_data[0]['timestamp']}</div>
                    <div class="frame-description" id="description">{frame_data[0]['description']}</div>
                </div>
                <div style="display: flex; align-items: center;">
                    <div class="frame-counter" id="counter">Frame 1 / {len(frame_data)}</div>
                    <div class="bug-indicator bug-none" id="bugIndicator">✓ No bugs</div>
                </div>
            </div>
            <div class="bug-details" id="bugDetails">
                <h4>Detected Issues</h4>
                <div id="bugList"></div>
            </div>
            <div class="navigation">
                <button class="nav-btn" id="prevBtn" onclick="prevFrame()">← Previous</button>
                <button class="nav-btn" id="nextBtn" onclick="nextFrame()">Next →</button>
            </div>
            <div class="keyboard-hint">
                <kbd>←</kbd> Previous • <kbd>→</kbd> Next • <kbd>Home</kbd> First • <kbd>End</kbd> Last
            </div>
        </div>
        <div class="thumbnails" id="thumbnails"></div>
    </div>
    <script>
        const frames = {json.dumps(frame_data)};
        let currentIndex = 0;
        function updateDisplay() {{
            const frame = frames[currentIndex];
            document.getElementById('currentFrame').src = frame.filename;
            document.getElementById('timestamp').textContent = frame.timestamp;
            document.getElementById('description').textContent = frame.description;
            document.getElementById('counter').textContent = `Frame ${{currentIndex + 1}} / ${{frames.length}}`;
            const bugIndicator = document.getElementById('bugIndicator');
            const bugDetails = document.getElementById('bugDetails');
            const bugList = document.getElementById('bugList');
            if (frame.bugs && frame.bugs.length > 0) {{
                const hasCritical = frame.bugs.some(b => b.severity === 'CRITICAL');
                const hasWarning = frame.bugs.some(b => b.severity === 'WARNING');
                if (hasCritical) {{
                    bugIndicator.className = 'bug-indicator bug-critical';
                    bugIndicator.textContent = `⚠ ${{frame.bugs.length}} bug(s)`;
                }} else if (hasWarning) {{
                    bugIndicator.className = 'bug-indicator bug-warning';
                    bugIndicator.textContent = `⚡ ${{frame.bugs.length}} issue(s)`;
                }} else {{
                    bugIndicator.className = 'bug-indicator bug-minor';
                    bugIndicator.textContent = `ℹ️ ${{frame.bugs.length}} note(s)`;
                }}
                bugDetails.classList.add('show');
                bugList.innerHTML = frame.bugs.map(bug => `
                    <div class="bug-item ${{bug.severity.toLowerCase()}}">
                        <div class="bug-type">${{bug.type}} — ${{bug.severity}}</div>
                        <div class="bug-desc">${{bug.description}}</div>
                    </div>
                `).join('');
            }} else {{
                bugIndicator.className = 'bug-indicator bug-none';
                bugIndicator.textContent = '✓ No bugs';
                bugDetails.classList.remove('show');
            }}
            document.querySelectorAll('.thumbnail').forEach((thumb, i) => {{
                thumb.classList.toggle('active', i === currentIndex);
            }});
            document.getElementById('prevBtn').disabled = currentIndex === 0;
            document.getElementById('nextBtn').disabled = currentIndex === frames.length - 1;
        }}
        function prevFrame() {{
            if (currentIndex > 0) {{ currentIndex--; updateDisplay(); }}
        }}
        function nextFrame() {{
            if (currentIndex < frames.length - 1) {{ currentIndex++; updateDisplay(); }}
        }}
        function goToFrame(index) {{
            currentIndex = index; updateDisplay();
        }}
        document.addEventListener('keydown', (e) => {{
            if (e.key === 'ArrowLeft') prevFrame();
            if (e.key === 'ArrowRight') nextFrame();
            if (e.key === 'Home') {{ currentIndex = 0; updateDisplay(); }}
            if (e.key === 'End') {{ currentIndex = frames.length - 1; updateDisplay(); }}
        }});
        const thumbnailsContainer = document.getElementById('thumbnails');
        frames.forEach((frame, i) => {{
            const thumb = document.createElement('img');
            thumb.src = frame.filename;
            thumb.className = 'thumbnail' + (i === 0 ? ' active' : '');
            thumb.onclick = () => goToFrame(i);
            thumbnailsContainer.appendChild(thumb);
        }});
        updateDisplay();
    </script>
</body>
</html>
"""
    
    # Write HTML
    html_path = output_dir / output_html
    with open(html_path, 'w') as f:
        f.write(html)
    
    print(f"✅ Slideshow generated: {html_path}")
    print(f"📁 Open in browser: file://{html_path.absolute()}")
    print(f"📊 Frames included: {len(frame_data)}")
    
    return str(html_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 generate_slideshow_simple.py <frames_directory>")
        print("Example: python3 generate_slideshow_simple.py /data/.openclaw/workspace/vaultgate/frames")
        sys.exit(1)
    
    generate_slideshow_from_frames(sys.argv[1])
