from pathlib import Path

index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')

replacements = [
    (
        '    .saved-pill.syncing{border-color:#ffd16666;background:#ffd16620;color:#8a6516}\n',
        '    .version-pill{color:var(--muted);font-size:.58rem;font-weight:850;white-space:nowrap}\n'
        '    .saved-pill.syncing{border-color:#ffd16666;background:#ffd16620;color:#8a6516}\n'
    ),
    (
        '      .saved-pill{padding:6px 8px;font-size:.56rem}\n',
        '      .saved-pill{padding:6px 8px;font-size:.56rem}\n'
        '      .version-pill{font-size:.52rem}\n'
    ),
    (
        '        <div id="syncStatus" class="saved-pill syncing">Conectando</div>\n        <button id="logoutButton" class="logout-button" type="button">Sair</button>',
        '        <div id="syncStatus" class="saved-pill syncing">Conectando</div>\n'
        '        <span id="appVersion" class="version-pill" aria-label="Versão do app">v0.6.10</span>\n'
        '        <button id="logoutButton" class="logout-button" type="button">Sair</button>'
    ),
    (
        '          <h2>Seu histórico</h2>',
        '          <h2>Histórico</h2>'
    ),
    (
        '          <span>Média das semanas desde o primeiro registro</span>',
        '          <span>Média semanal</span>'
    ),
    (
        '      el.historyAverageDetail.textContent=groups.length\n        ?`${eligible.length} ${eligible.length===1?"semana considerada":"semanas consideradas"} na média${excluded?` · ${excluded} ${excluded===1?"atípica excluída":"atípicas excluídas"}`:""}`\n        :"Nenhuma semana registrada";',
        '      el.historyAverageDetail.textContent=groups.length\n        ?`${eligible.length} ${eligible.length===1?"semana considerada":"semanas consideradas"} na média`\n        :"Nenhuma semana registrada";'
    ),
    (
        '<script type="module" src="./app-dashboard-v06.js?v=0.6.9"></script>',
        '<script type="module" src="./app-dashboard-v06.js?v=0.6.10"></script>'
    ),
]

for old, new in replacements:
    if old not in index:
        raise AssertionError(f'index anchor not found: {old[:80]!r}')
    index = index.replace(old, new, 1)

index_path.write_text(index, encoding='utf-8')

dash_path = Path('app-dashboard-v06.js')
dash = dash_path.read_text(encoding='utf-8')

old = '''    const historyNoteParts = [...mainNoteParts];
    if (hiddenCount) {
      historyNoteParts.push(`${hiddenCount} ${hiddenCount === 1 ? "semana vazia excluída" : "semanas vazias excluídas"}`);
    }
'''
new = '''    const historyNoteParts = [...mainNoteParts];
'''
if old not in dash:
    raise AssertionError('history hidden-week note anchor not found')
dash = dash.replace(old, new, 1)

old = '''    const descending = [...allGroups].reverse();
    const visibleAscending = allGroups.filter(week => !week.hidden);
    const currentKey = weekKey(new Date());
'''
new = '''    const descending = [...allGroups].reverse();
    const currentKey = weekKey(new Date());
    const visibleAscending = allGroups.filter(week => !week.hidden && week.key !== currentKey);
    const visibleDescending = [...visibleAscending].reverse();
'''
if old not in dash:
    raise AssertionError('history ordering anchor not found')
dash = dash.replace(old, new, 1)

old = '''      card.dataset.cqbWeekKey = week.key;
      card.hidden = week.hidden;
      card.classList.toggle("cqb-hidden-week", week.hidden);
      if (week.hidden) {
        card.style.setProperty("display", "none", "important");
      } else {
        card.style.removeProperty("display");
      }
      card.setAttribute("aria-hidden", week.hidden ? "true" : "false");
      const existingDeleteButton = card.querySelector(".cqb-delete-week");

      if (week.hidden) return;

      const title = card.querySelector(".week-top b");
      if (title) {
        if (week.key === currentKey) {
          title.textContent = "Semana atual";
        } else {
          const chronologicalIndex = visibleAscending.findIndex(item => item.key === week.key);
          title.textContent = `Semana ${chronologicalIndex + 1}`;
        }
      }
'''
new = '''      card.dataset.cqbWeekKey = week.key;
      const hideFromHistory = week.hidden || week.key === currentKey;
      card.hidden = hideFromHistory;
      card.classList.toggle("cqb-hidden-week", hideFromHistory);
      if (hideFromHistory) {
        card.style.setProperty("display", "none", "important");
      } else {
        card.style.removeProperty("display");
      }
      card.setAttribute("aria-hidden", hideFromHistory ? "true" : "false");
      const existingDeleteButton = card.querySelector(".cqb-delete-week");

      if (hideFromHistory) return;

      const title = card.querySelector(".week-top b");
      if (title) {
        const recentIndex = visibleDescending.findIndex(item => item.key === week.key);
        if (recentIndex === 0) {
          title.textContent = "Fim de semana passado";
        } else if (recentIndex === 1) {
          title.textContent = "Fim de semana retrasado";
        } else {
          const chronologicalIndex = visibleAscending.findIndex(item => item.key === week.key);
          title.textContent = `Semana ${chronologicalIndex + 1}`;
        }
      }
'''
if old not in dash:
    raise AssertionError('history cards anchor not found')
dash = dash.replace(old, new, 1)

dash_path.write_text(dash, encoding='utf-8')

Path('version.txt').write_text('0.6.10\n', encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
if 'confesso-que-bebi-pwa-v6' in sw:
    sw = sw.replace('confesso-que-bebi-pwa-v6', 'confesso-que-bebi-pwa-v7', 1)
elif 'confesso-que-bebi-pwa-v7' not in sw:
    raise AssertionError('unexpected service worker cache version')
sw_path.write_text(sw, encoding='utf-8')
