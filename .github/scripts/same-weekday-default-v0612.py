from pathlib import Path

# Dashboard: when browsing a past week, default the hero to the same weekday as today.
dash_path = Path('app-dashboard-v06.js')
dash = dash_path.read_text(encoding='utf-8')

old = '''    const weekEntries = entriesForWeek(start)\n      .filter(item => typeof item.datetime === "string")\n      .sort((a, b) => b.datetime.localeCompare(a.datetime));\n\n    selectedDayKey = weekEntries.length\n      ? String(weekEntries[0].datetime).slice(0, 10)\n      : dateKey(start);\n    return selectedDayKey;'''

new = '''    const weekdayOffset = (today.getDay() + 6) % 7; // segunda = 0 ... domingo = 6\n    selectedDayKey = dateKey(addDays(start, weekdayOffset));\n    return selectedDayKey;'''

assert old in dash, 'ensureSelectedDay fallback anchor not found'
dash = dash.replace(old, new, 1)
dash_path.write_text(dash, encoding='utf-8')

# Visible version + cache-busted dashboard script.
index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
assert 'v0.6.11' in index, 'v0.6.11 not found in index'
index = index.replace('v0.6.11', 'v0.6.12')
index_path.write_text(index, encoding='utf-8')

Path('version.txt').write_text('0.6.12\n', encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
assert 'confesso-que-bebi-pwa-v8' in sw, 'expected service worker cache v8 not found'
sw = sw.replace('confesso-que-bebi-pwa-v8', 'confesso-que-bebi-pwa-v9', 1)
sw_path.write_text(sw, encoding='utf-8')
