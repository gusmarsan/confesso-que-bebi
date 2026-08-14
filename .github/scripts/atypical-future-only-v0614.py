from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)

index_path = Path("index.html")
dash_path = Path("app-dashboard-v06.js")
sw_path = Path("sw.js")

index = index_path.read_text(encoding="utf-8")
dash = dash_path.read_text(encoding="utf-8")
sw = sw_path.read_text(encoding="utf-8")

# Version and cache-bust.
index = replace_once(index, '>v0.6.13</span>', '>v0.6.14</span>', "visible version")
index = replace_once(index, 'app-dashboard-v06.js?v=0.6.13', 'app-dashboard-v06.js?v=0.6.14', "dashboard cache bust")

# Base app average must no longer exclude atypical weeks/days.
index = replace_once(
    index,
    'return groups.filter(week=>!week.atypical&&week.end<now);',
    'return groups.filter(week=>week.end<now);',
    "base average includes atypical",
)

# Dashboard average: atypical days are stored/painted, but never alter the total used in averages.
old_adjusted = '''      const adjustedDoses = weekEntries\n        .filter(item => !atypicalDays.has(String(item.datetime).slice(0, 10)))\n        .reduce((sum, item) => sum + Number(item.doses || 0), 0);'''
dash = replace_once(
    dash,
    old_adjusted,
    '      const adjustedDoses = actualDoses;',
    "atypical doses no longer adjusted",
)

dash = replace_once(
    dash,
    'averageGroups.reduce((sum, week) => sum + week.adjustedDoses, 0)',
    'averageGroups.reduce((sum, week) => sum + week.actualDoses, 0)',
    "average uses actual doses",
)

old_note = '''    const mainNoteParts = [];\n    if (markedCount) {\n      mainNoteParts.push(`${markedCount} ${markedCount === 1 ? "dia atípico desconsiderado" : "dias atípicos desconsiderados"}`);\n    }\n\n    const historyNoteParts = [...mainNoteParts];'''
dash = replace_once(
    dash,
    old_note,
    '''    const mainNoteParts = [];\n    const historyNoteParts = [];''',
    "remove atypical exclusion note",
)

# Put Hoje and Dia atípico together on the right side of the day section header.
style_anchor = '''      #dayGrid .day{cursor:pointer}\n      .cqb-hero-metrics{'''
style_replacement = '''      #dayGrid .day{cursor:pointer}\n      .cqb-day-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap}\n      .cqb-day-actions .atypical-control{justify-content:flex-start;margin:0;padding:0}\n      .cqb-day-actions .link-button{padding:0}\n      .cqb-hero-metrics{'''
dash = replace_once(dash, style_anchor, style_replacement, "day actions styles")

function_anchor = '''  function installHeroMetrics() {'''
function_insert = '''  function installAtypicalControlPosition() {\n    const today = $("#todayLink");\n    const control = $("#atypicalControl");\n    const head = today?.closest(".section-head");\n    if (!today || !control || !head) return;\n\n    let actions = head.querySelector(".cqb-day-actions");\n    if (!actions) {\n      actions = document.createElement("div");\n      actions.className = "cqb-day-actions";\n      head.appendChild(actions);\n    }\n\n    if (today.parentElement !== actions) actions.appendChild(today);\n    if (control.parentElement !== actions) actions.appendChild(control);\n  }\n\n  function installHeroMetrics() {'''
dash = replace_once(dash, function_anchor, function_insert, "install atypical position function")

refresh_anchor = '''  function refresh() {\n    injectStyles();\n    installWeekNavigationGuard();'''
refresh_replacement = '''  function refresh() {\n    injectStyles();\n    installAtypicalControlPosition();\n    installWeekNavigationGuard();'''
dash = replace_once(dash, refresh_anchor, refresh_replacement, "refresh atypical position")

init_anchor = '''  async function init() {\n    injectStyles();\n    installWeekNavigationGuard();'''
init_replacement = '''  async function init() {\n    injectStyles();\n    installAtypicalControlPosition();\n    installWeekNavigationGuard();'''
dash = replace_once(dash, init_anchor, init_replacement, "init atypical position")

sw = replace_once(
    sw,
    'const CACHE_NAME = "confesso-que-bebi-pwa-v10";',
    'const CACHE_NAME = "confesso-que-bebi-pwa-v11";',
    "service worker cache",
)

index_path.write_text(index, encoding="utf-8")
dash_path.write_text(dash, encoding="utf-8")
sw_path.write_text(sw, encoding="utf-8")
Path("version.txt").write_text("0.6.14\n", encoding="utf-8")
