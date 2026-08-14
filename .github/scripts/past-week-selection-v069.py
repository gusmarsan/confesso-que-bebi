from pathlib import Path

js_path = Path('app-dashboard-v06.js')
text = js_path.read_text(encoding='utf-8')

old = '  let selectedDayKey = null;\n  let stopEntries = null;'
new = '  let selectedDayKey = null;\n  let selectedDayIsExplicit = false;\n  let stopEntries = null;'
assert old in text, 'selection state anchor not found'
text = text.replace(old, new, 1)

old = '''    const selectCard = card => {\n      const key = card?.dataset?.cqbDate;\n      if (!key) return;\n      selectedDayKey = key;\n      scheduleRefresh();\n    };'''
new = '''    const selectCard = card => {\n      const key = card?.dataset?.cqbDate;\n      if (!key) return;\n      selectedDayKey = key;\n      selectedDayIsExplicit = true;\n      scheduleRefresh();\n    };'''
assert old in text, 'manual selection anchor not found'
text = text.replace(old, new, 1)

old = '''    const start = selectedWeekStart();\n    const selected = ensureSelectedDay();\n\n    cards.forEach((card, index) => {'''
new = '''    const start = selectedWeekStart();\n    const selected = ensureSelectedDay();\n    const isCurrentWeek = weekKey(start) === weekKey(new Date());\n    const showSelection = isCurrentWeek || selectedDayIsExplicit;\n\n    cards.forEach((card, index) => {'''
assert old in text, 'day cards selection anchor not found'
text = text.replace(old, new, 1)

old = '      card.classList.toggle("cqb-selected-day", key === selected);'
new = '      card.classList.toggle("cqb-selected-day", showSelection && key === selected);'
assert old in text, 'outline toggle anchor not found'
text = text.replace(old, new, 1)

old = '''      new MutationObserver(() => {\n        selectedDayKey = null;\n        scheduleRefresh();\n      }).observe(selectedWeekDates, { childList: true, characterData: true, subtree: true });'''
new = '''      new MutationObserver(() => {\n        selectedDayKey = null;\n        selectedDayIsExplicit = false;\n        scheduleRefresh();\n      }).observe(selectedWeekDates, { childList: true, characterData: true, subtree: true });'''
assert old in text, 'week mutation anchor not found'
text = text.replace(old, new, 1)

old = '''    hiddenWeeks = new Set();\n    selectedDayKey = null;'''
new = '''    hiddenWeeks = new Set();\n    selectedDayKey = null;\n    selectedDayIsExplicit = false;'''
assert old in text, 'listener reset anchor not found'
text = text.replace(old, new, 1)

js_path.write_text(text, encoding='utf-8')

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
index = index.replace('./app-dashboard-v06.js?v=0.6.7', './app-dashboard-v06.js?v=0.6.9')
index = index.replace('./app-dashboard-v06.js?v=0.6.8', './app-dashboard-v06.js?v=0.6.9')
index_path.write_text(index, encoding='utf-8')

Path('version.txt').write_text('0.6.9\n', encoding='utf-8')

sw_path = Path('sw.js')
if sw_path.exists():
    sw = sw_path.read_text(encoding='utf-8')
    sw = sw.replace('confesso-que-bebi-pwa-v5', 'confesso-que-bebi-pwa-v6')
    sw_path.write_text(sw, encoding='utf-8')
