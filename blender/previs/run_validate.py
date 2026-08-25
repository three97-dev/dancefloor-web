"""CLI entry point: blender --background --python blender/previs/run_validate.py -- <out_dir>"""
import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__))))
import validate  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out = argv[0] if argv else "/tmp/previs"
written = validate.run(out, extra_anchors=("HERO", "OBSERVATORY"))
print(f"PREVIS_DONE {len(written)} files -> {out}")
