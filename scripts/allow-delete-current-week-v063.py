from pathlib import Path

path = Path('app-dashboard-v06.js')
text = path.read_text(encoding='utf-8')
old = 'if (week.entries.length === 0 && week.key !== currentKey) {'
new = 'if (week.entries.length === 0) {'
if old not in text:
    raise SystemExit('Target condition not found')
text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
html = html.replace('app-dashboard-v06.js?v=0.6.2', 'app-dashboard-v06.js?v=0.6.3')
index.write_text(html, encoding='utf-8')

Path('version.txt').write_text('0.6.3\n', encoding='utf-8')
