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

index = replace_once(
    index,
    '''      <div class="account-tools">\n        <div id="syncStatus" class="saved-pill syncing">Conectando</div>\n        <span id="appVersion" class="version-pill" aria-label="Versão do app">v0.6.12</span>\n        <button id="logoutButton" class="logout-button" type="button">Sair</button>\n      </div>''',
    '''      <div class="account-tools">\n        <span id="appVersion" class="version-pill" aria-label="Versão do app">v0.6.13</span>\n        <div id="syncStatus" class="saved-pill syncing">Conectando</div>\n        <button id="logoutButton" class="logout-button" type="button">Sair</button>\n      </div>''',
    "account tools order/version",
)

index = replace_once(
    index,
    '''        <div class="section-head">\n          <div><h2>De segunda a domingo</h2><p>Como as doses se distribuíram na semana</p></div>\n        </div>\n        <div id="dayGrid" class="day-grid"></div>''',
    '''        <div class="section-head">\n          <div><h2>De segunda a domingo</h2><p>Como as doses se distribuíram na semana</p></div>\n          <a id="todayLink" class="link-button" href="#dashboard">Hoje</a>\n        </div>\n        <div id="dayGrid" class="day-grid"></div>''',
    "today link",
)

index = replace_once(
    index,
    '''    el.previousWeek.onclick=()=>moveWeek(-1);\n    el.nextWeek.onclick=()=>moveWeek(1);\n    el.atypicalWeek.onchange=event=>setSelectedWeekAtypical(event.target.checked);''',
    '''    el.previousWeek.onclick=()=>moveWeek(-1);\n    el.nextWeek.onclick=()=>moveWeek(1);\n    $("#todayLink").onclick=event=>{\n      event.preventDefault();\n      selectedWeekStart=startOfWeek(new Date());\n      renderDashboard();\n      window.dispatchEvent(new CustomEvent("cqb:today"));\n    };\n    el.atypicalWeek.onchange=event=>setSelectedWeekAtypical(event.target.checked);''',
    "today behavior",
)

index = replace_once(
    index,
    'src="./app-dashboard-v06.js?v=0.6.12"',
    'src="./app-dashboard-v06.js?v=0.6.13"',
    "dashboard cache bust",
)

# The current week must never inherit an old hidden-week marker.
dash = replace_once(
    dash,
    'const hidden = hiddenWeeks.has(key) && weekEntries.length === 0;',
    'const hidden = key !== weekKey(current) && hiddenWeeks.has(key) && weekEntries.length === 0;',
    "current week hidden override",
)

# Keep the current week visible in History, while keeping the relative labels for completed weeks.
dash = replace_once(
    dash,
    'const hideFromHistory = week.hidden || week.key === currentKey;',
    'const hideFromHistory = week.hidden && week.key !== currentKey;',
    "history visibility",
)

old_title = '''      const title = card.querySelector(".week-top b");\n      if (title) {\n        const recentIndex = visibleDescending.findIndex(item => item.key === week.key);\n        if (recentIndex === 0) {\n          title.textContent = "Fim de semana passado";\n        } else if (recentIndex === 1) {\n          title.textContent = "Fim de semana retrasado";\n        } else {\n          const chronologicalIndex = visibleAscending.findIndex(item => item.key === week.key);\n          title.textContent = `Semana ${chronologicalIndex + 1}`;\n        }\n      }\n\n      if (week.entries.length === 0) {'''
new_title = '''      const title = card.querySelector(".week-top b");\n      if (title) {\n        if (week.key === currentKey) {\n          title.textContent = "Semana atual";\n        } else {\n          const recentIndex = visibleDescending.findIndex(item => item.key === week.key);\n          if (recentIndex === 0) {\n            title.textContent = "Fim de semana passado";\n          } else if (recentIndex === 1) {\n            title.textContent = "Fim de semana retrasado";\n          } else {\n            const chronologicalIndex = visibleAscending.findIndex(item => item.key === week.key);\n            title.textContent = `Semana ${chronologicalIndex + 1}`;\n          }\n        }\n      }\n\n      if (week.entries.length === 0 && week.key !== currentKey) {'''
dash = replace_once(dash, old_title, new_title, "history titles/delete current")

# Old hidden setting must not kick the user away from the current week.
dash = replace_once(
    dash,
    'if (!hiddenWeeks.has(selectedKey)) return false;',
    'if (selectedKey === weekKey(new Date()) || !hiddenWeeks.has(selectedKey)) return false;',
    "current navigation visibility",
)

# Clicking Hoje must also reset a manually selected day to today.
dash = replace_once(
    dash,
    '''    installHeroMetrics();\n    installDaySelection();\n\n    const appModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);''',
    '''    installHeroMetrics();\n    installDaySelection();\n\n    window.addEventListener("cqb:today", () => {\n      selectedDayKey = dateKey(new Date());\n      selectedDayIsExplicit = false;\n      scheduleRefresh();\n    });\n\n    const appModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);''',
    "today selected day reset",
)

sw = replace_once(
    sw,
    'const CACHE_NAME = "confesso-que-bebi-pwa-v9";',
    'const CACHE_NAME = "confesso-que-bebi-pwa-v10";',
    "service worker cache",
)

index_path.write_text(index, encoding="utf-8")
dash_path.write_text(dash, encoding="utf-8")
sw_path.write_text(sw, encoding="utf-8")
Path("version.txt").write_text("0.6.13\n", encoding="utf-8")
