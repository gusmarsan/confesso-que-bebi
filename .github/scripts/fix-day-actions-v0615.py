from pathlib import Path

index_path = Path('index.html')
sw_path = Path('sw.js')
index = index_path.read_text(encoding='utf-8')
sw = sw_path.read_text(encoding='utf-8')

old_control = '''        <label id="atypicalControl" class="atypical-control">\n          <input id="atypicalWeek" type="checkbox">\n          <span>Semana atípica</span>\n        </label>\n\n'''
if old_control not in index:
    raise SystemExit('old atypical control block not found')
index = index.replace(old_control, '', 1)

old_head = '''        <div class="section-head">\n          <div><h2>De segunda a domingo</h2><p>Como as doses se distribuíram na semana</p></div>\n          <a id="todayLink" class="link-button" href="#dashboard">Hoje</a>\n        </div>'''
new_head = '''        <div class="section-head">\n          <div><h2>De segunda a domingo</h2><p>Como as doses se distribuíram na semana</p></div>\n          <div class="cqb-day-actions">\n            <a id="todayLink" class="link-button" href="#dashboard">Hoje</a>\n            <label id="atypicalControl" class="atypical-control">\n              <input id="atypicalWeek" type="checkbox">\n              <span>Dia atípico</span>\n            </label>\n          </div>\n        </div>'''
if old_head not in index:
    raise SystemExit('day section head not found')
index = index.replace(old_head, new_head, 1)

css_anchor = '    .link-button{border:0;background:none;color:var(--pink-dark);font-size:.69rem;font-weight:850}\n'
css_add = '''    .link-button{border:0;background:none;color:var(--pink-dark);font-size:.69rem;font-weight:850}\n    .cqb-day-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:nowrap;white-space:nowrap}\n    .cqb-day-actions .atypical-control{display:flex;align-items:center;justify-content:flex-start;gap:6px;margin:0;padding:0}\n    .cqb-day-actions .link-button{padding:0}\n'''
if css_anchor not in index:
    raise SystemExit('css anchor not found')
index = index.replace(css_anchor, css_add, 1)

index = index.replace('>v0.6.14</span>', '>v0.6.15</span>', 1)
index = index.replace('app-dashboard-v06.js?v=0.6.14', 'app-dashboard-v06.js?v=0.6.15', 1)

if 'confesso-que-bebi-pwa-v11' in sw:
    sw = sw.replace('confesso-que-bebi-pwa-v11', 'confesso-que-bebi-pwa-v12', 1)
elif 'confesso-que-bebi-pwa-v10' in sw:
    sw = sw.replace('confesso-que-bebi-pwa-v10', 'confesso-que-bebi-pwa-v12', 1)
else:
    raise SystemExit('service worker cache version not found')

index_path.write_text(index, encoding='utf-8')
sw_path.write_text(sw, encoding='utf-8')
Path('version.txt').write_text('0.6.15\n', encoding='utf-8')
