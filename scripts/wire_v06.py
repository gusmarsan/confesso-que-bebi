from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")

text = re.sub(
    r'(<script type="module" src="\./app-enhancements\.js\?v=)[^"]+("\s*></script>)',
    r'\g<1>0.6\2',
    text,
    count=1,
)

script_tag = '  <script type="module" src="./app-dashboard-v06.js?v=0.6"></script>'
if script_tag not in text:
    marker = '</body>'
    if marker not in text:
        raise SystemExit("Could not find </body> in index.html")
    text = text.replace(marker, f'{script_tag}\n{marker}', 1)

path.write_text(text, encoding="utf-8")
