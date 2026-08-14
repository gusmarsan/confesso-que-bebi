from pathlib import Path

js_path = Path('app-dashboard-v06.js')
index_path = Path('index.html')
version_path = Path('version.txt')

js = js_path.read_text(encoding='utf-8')

old_globals = '''  let stopSettings = null;\n  let refreshTimer = null;\n'''
new_globals = '''  let stopSettings = null;\n  let refreshTimer = null;\n  let hiddenWeekNavigationDirection = -1;\n  let skippingHiddenWeek = false;\n'''
if old_globals not in js:
    raise SystemExit('globals anchor not found')
js = js.replace(old_globals, new_globals, 1)

old_success = '''      await setDoc(\n        doc(collection(db, "users", currentUser.uid, SETTINGS_COLLECTION), `${HIDDEN_WEEK_PREFIX}${key}`),\n        { key, hidden: true, atypical: false, kind: "hidden-week", updatedAt: serverTimestamp() },\n        { merge: true }\n      );\n      showToast("Semana vazia excluída.");\n'''
new_success = '''      await setDoc(\n        doc(collection(db, "users", currentUser.uid, SETTINGS_COLLECTION), `${HIDDEN_WEEK_PREFIX}${key}`),\n        { key, hidden: true, atypical: false, kind: "hidden-week", updatedAt: serverTimestamp() },\n        { merge: true }\n      );\n      hiddenWeeks.add(key);\n      hiddenWeekNavigationDirection = -1;\n      scheduleRefresh();\n      showToast("Semana vazia excluída.");\n'''
if old_success not in js:
    raise SystemExit('hide success anchor not found')
js = js.replace(old_success, new_success, 1)

old_refresh = '''  function refresh() {\n    injectStyles();\n    installHeroMetrics();\n    updateHero();\n    updateDayCards();\n    updateAveragesAndCounts();\n    updateHistoryCards();\n  }\n'''
new_refresh = '''  function installWeekNavigationGuard() {\n    const previous = $("#previousWeek");\n    const next = $("#nextWeek");\n\n    if (previous && previous.dataset.cqbHiddenWeekGuard !== "1") {\n      previous.dataset.cqbHiddenWeekGuard = "1";\n      previous.addEventListener("click", () => {\n        if (!skippingHiddenWeek) hiddenWeekNavigationDirection = -1;\n      }, true);\n    }\n\n    if (next && next.dataset.cqbHiddenWeekGuard !== "1") {\n      next.dataset.cqbHiddenWeekGuard = "1";\n      next.addEventListener("click", () => {\n        if (!skippingHiddenWeek) hiddenWeekNavigationDirection = 1;\n      }, true);\n    }\n  }\n\n  function ensureSelectedWeekVisible() {\n    const selectedKey = weekKey(selectedWeekStart());\n    if (!hiddenWeeks.has(selectedKey)) return false;\n    if (skippingHiddenWeek) return true;\n\n    let direction = hiddenWeekNavigationDirection || -1;\n    let button = direction > 0 ? $("#nextWeek") : $("#previousWeek");\n\n    if ((!button || button.disabled) && direction > 0) {\n      direction = -1;\n      button = $("#previousWeek");\n    } else if ((!button || button.disabled) && direction < 0) {\n      direction = 1;\n      button = $("#nextWeek");\n    }\n\n    if (!button || button.disabled) return false;\n\n    hiddenWeekNavigationDirection = direction;\n    skippingHiddenWeek = true;\n    selectedDayKey = null;\n    setTimeout(() => {\n      button.click();\n      skippingHiddenWeek = false;\n      scheduleRefresh();\n    }, 0);\n    return true;\n  }\n\n  function refresh() {\n    injectStyles();\n    installWeekNavigationGuard();\n    if (ensureSelectedWeekVisible()) return;\n    installHeroMetrics();\n    updateHero();\n    updateDayCards();\n    updateAveragesAndCounts();\n    updateHistoryCards();\n  }\n'''
if old_refresh not in js:
    raise SystemExit('refresh anchor not found')
js = js.replace(old_refresh, new_refresh, 1)

old_init = '''    injectStyles();\n    installHeroMetrics();\n    installDaySelection();\n'''
new_init = '''    injectStyles();\n    installWeekNavigationGuard();\n    installHeroMetrics();\n    installDaySelection();\n'''
if old_init not in js:
    raise SystemExit('init anchor not found')
js = js.replace(old_init, new_init, 1)

js_path.write_text(js, encoding='utf-8')

index = index_path.read_text(encoding='utf-8')
if 'app-dashboard-v06.js?v=0.6.6' not in index:
    raise SystemExit('index version anchor not found')
index = index.replace('app-dashboard-v06.js?v=0.6.6', 'app-dashboard-v06.js?v=0.6.7', 1)
index_path.write_text(index, encoding='utf-8')
version_path.write_text('0.6.7\n', encoding='utf-8')
