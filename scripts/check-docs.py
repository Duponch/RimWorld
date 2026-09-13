from pathlib import Path
import re
import json
import hashlib
import unicodedata
from urllib.parse import unquote

root = Path(__file__).resolve().parents[1]
def slug(text):
    text = re.sub(r'[`*_]', '', text).strip().lower()
    return ''.join(c for c in text if c in ' -_' or not unicodedata.category(c).startswith(('P', 'S'))).replace(' ', '-')

files = ['AGENTS.md', 'README.md'] + [str(p.relative_to(root)) for p in (root / 'docs').rglob('*.md')]
errors = []
links = 0
for name in files:
    source = root / name
    contents = source.read_text(encoding='utf-8')
    for target in re.findall(r'\]\(([^\n)]+)\)', contents):
        target = target.strip('<>')
        if re.match(r'^[a-zA-Z]+://', target):
            continue
        pathpart, _, anchor = target.partition('#')
        dest = source.parent / unquote(pathpart) if pathpart else source
        links += 1
        if not dest.exists():
            errors.append(f'{name}: missing {target}')
        elif anchor and dest.suffix == '.md':
            headings = re.findall(r'^#{1,6}\s+(.+)$', dest.read_text(encoding='utf-8'), flags=re.M)
            if unquote(anchor) not in [slug(h) for h in headings]:
                errors.append(f'{name}: missing anchor {target}')

matrix = (root / 'docs/gameplay/systems-matrix.md').read_text(encoding='utf-8')
rows = re.findall(r'^\| (S\d{2}) \|.*$', matrix, flags=re.M)
assert rows == [f'S{i:02}' for i in range(25)], rows
families = re.findall(r'^\| (F\d) —', matrix, flags=re.M)
assert families == [f'F{i}' for i in range(1,6)], families
print(f'{len(files)} documents; {links} local links checked; 25 domain IDs and 5 validation families preserved.')
for error in errors:
    print(error)
if errors:
    raise SystemExit(1)
for entry in json.loads((root/'docs/reference/originals/manifest.json').read_text(encoding='utf-8')):
    source=root/'docs/reference/originals'/entry['file']
    assert source.stat().st_size == entry['bytes'], source
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['sha256'], source
print('Documentation checks passed; three original sources byte-identical.')
