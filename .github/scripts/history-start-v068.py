from pathlib import Path

index_path = Path('index.html')
text = index_path.read_text(encoding='utf-8')

old = '    const STANDARD_GRAMS=10;\n    const ALCOHOL_DENSITY=0.789;'
new = '    const STANDARD_GRAMS=10;\n    const ALCOHOL_DENSITY=0.789;\n    const HISTORY_START=startOfWeek(new Date(2026,6,27));'
assert old in text, 'constants anchor not found'
text = text.replace(old, new, 1)

old = '      const first=startOfWeek(firstEntry.datetime);\n      const current=startOfWeek(new Date());'
new = '      const firstEntryWeek=startOfWeek(firstEntry.datetime);\n      const first=firstEntryWeek<HISTORY_START?new Date(HISTORY_START):firstEntryWeek;\n      const current=startOfWeek(new Date());'
assert old in text, 'groupCalendarWeeks anchor not found'
text = text.replace(old, new, 1)

old = '''    function moveWeek(offset){\n      const next=addDays(selectedWeekStart,offset*7);\n      const current=startOfWeek(new Date());\n      if(next>current)return;\n      selectedWeekStart=startOfWeek(next);\n      renderDashboard();\n    }\n\n    function openWeek(start){\n      selectedWeekStart=startOfWeek(start);\n      switchView("dashboard");\n      renderDashboard();\n    }'''
new = '''    function moveWeek(offset){\n      const next=startOfWeek(addDays(selectedWeekStart,offset*7));\n      const current=startOfWeek(new Date());\n      if(next>current||next<HISTORY_START)return;\n      selectedWeekStart=next;\n      renderDashboard();\n    }\n\n    function openWeek(start){\n      const target=startOfWeek(start);\n      selectedWeekStart=target<HISTORY_START?new Date(HISTORY_START):target;\n      switchView("dashboard");\n      renderDashboard();\n    }'''
assert old in text, 'navigation anchor not found'
text = text.replace(old, new, 1)

old = '      el.nextWeek.disabled=current;'
new = '      el.nextWeek.disabled=current;\n      el.previousWeek.disabled=weekKey(selectedWeekStart)===weekKey(HISTORY_START);'
assert old in text, 'renderDashboard button anchor not found'
text = text.replace(old, new, 1)

index_path.write_text(text, encoding='utf-8')

Path('version.txt').write_text('0.6.8\n', encoding='utf-8')

sw = Path('sw.js')
if sw.exists():
    sw_text = sw.read_text(encoding='utf-8')
    sw_text = sw_text.replace('confesso-que-bebi-pwa-v4', 'confesso-que-bebi-pwa-v5')
    sw.write_text(sw_text, encoding='utf-8')
