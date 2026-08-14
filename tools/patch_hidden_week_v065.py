from pathlib import Path

js_path = Path('app-dashboard-v06.js')
text = js_path.read_text(encoding='utf-8')

old = '''      card.hidden = week.hidden;\n      card.setAttribute("aria-hidden", week.hidden ? "true" : "false");'''
new = '''      card.hidden = week.hidden;\n      card.classList.toggle("cqb-hidden-week", week.hidden);\n      if (week.hidden) {\n        card.style.setProperty("display", "none", "important");\n      } else {\n        card.style.removeProperty("display");\n      }\n      card.setAttribute("aria-hidden", week.hidden ? "true" : "false");'''

if old not in text:
    raise SystemExit('Hidden-week card block not found')
text = text.replace(old, new, 1)

css_anchor = '''      .cqb-delete-week{\n        align-self:flex-start;margin-top:9px;padding:3px 0;border:0;background:none;'''
css_new = '''      .week-card.cqb-hidden-week{display:none!important}\n      .cqb-delete-week{\n        align-self:flex-start;margin-top:9px;padding:3px 0;border:0;background:none;'''
if css_anchor not in text:
    raise SystemExit('CSS anchor not found')
text = text.replace(css_anchor, css_new, 1)

js_path.write_text(text, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
index = index.replace('app-dashboard-v06.js?v=0.6.4', 'app-dashboard-v06.js?v=0.6.5')
index = index.replace('app-dashboard-v06.js?v=0.6.3', 'app-dashboard-v06.js?v=0.6.5')
index = index.replace('app-dashboard-v06.js?v=0.6.2', 'app-dashboard-v06.js?v=0.6.5')
index_path.write_text(index, encoding='utf-8')

Path('version.txt').write_text('0.6.5\n', encoding='utf-8')
