"""Keep Playwright reports reviewable; move large world attachments to ignored tmp.

Usage: python scripts/compact-ui-report.py artifacts/ui-report.json
No assertions or error records are removed. Checkpoint hashes retain provenance.
"""
from pathlib import Path
import base64
import hashlib
import json
import re
import sys

root = Path(__file__).resolve().parents[1]
report = (root / sys.argv[1]).resolve()
if not report.is_relative_to(root / 'artifacts') or report.suffix != '.json':
    raise SystemExit('Expected a report inside artifacts/')
data = json.loads(report.read_text(encoding='utf-8-sig'))
folder = root / 'tmp' / (report.stem + '-checkpoints')
count = 0


def visit(value):
    global count
    if isinstance(value, list):
        for entry in value:
            visit(entry)
    elif isinstance(value, dict):
        if str(value.get('name', '')).startswith('hourly-world-') and 'body' in value:
            raw = base64.b64decode(value['body'], validate=True)
            world = json.loads(raw)
            folder.mkdir(parents=True, exist_ok=True)
            name = re.sub(r'[^a-zA-Z0-9_-]', '_', value['name']) + '.json'
            destination = folder / name
            destination.write_bytes(raw)
            del value['body']
            value['localCheckpoint'] = {
                'path': destination.relative_to(root).as_posix(),
                'tick': world['tick'], 'bytes': len(raw),
                'sha256': hashlib.sha256(raw).hexdigest(),
            }
            count += 1
        else:
            for entry in value.values():
                visit(entry)


visit(data)
report.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'{report.name}: {count} checkpoints extracted; errors and results retained.')
