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
main_tag = '  <script type="module" src="./app-enhancements.js?v=0.6"></script>'

# Remove any previous occurrence, including one accidentally placed inside the report template.
text = text.replace(script_tag + "\n", "")
text = text.replace(script_tag, "")

if main_tag not in text:
    raise SystemExit("Could not find the main app-enhancements script tag")

text = text.replace(main_tag, main_tag + "\n" + script_tag, 1)

if text.count(script_tag) != 1:
    raise SystemExit("Dashboard script must appear exactly once")

# The dashboard script must be in the final document tail, after the main enhancement script.
tail = text[-700:]
if script_tag not in tail or tail.index(script_tag) < tail.index(main_tag):
    raise SystemExit("Dashboard script is not wired in the final page tail")

path.write_text(text, encoding="utf-8")
