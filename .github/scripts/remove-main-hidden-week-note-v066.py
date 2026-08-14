from pathlib import Path

path = Path('app-dashboard-v06.js')
text = path.read_text(encoding='utf-8')
old = '''    const noteParts = [];
    if (markedCount) {
      noteParts.push(`${markedCount} ${markedCount === 1 ? "dia atípico desconsiderado" : "dias atípicos desconsiderados"}`);
    }
    if (hiddenCount) {
      noteParts.push(`${hiddenCount} ${hiddenCount === 1 ? "semana vazia excluída" : "semanas vazias excluídas"}`);
    }

    const note = $("#averageExclusionNote");
    const noteText = noteParts.join(" · ");
    if (note && note.textContent !== noteText) note.textContent = noteText;

    const historyDetail = $("#historyAverageDetail");
    if (historyDetail) {
      const detailText = visibleGroups.length
        ? `${visibleGroups.length} ${visibleGroups.length === 1 ? "semana considerada" : "semanas consideradas"} na média${noteParts.length ? ` · ${noteParts.join(" · ")}` : ""}`
        : "Nenhuma semana registrada";
      if (historyDetail.textContent !== detailText) historyDetail.textContent = detailText;
    }
'''
new = '''    const mainNoteParts = [];
    if (markedCount) {
      mainNoteParts.push(`${markedCount} ${markedCount === 1 ? "dia atípico desconsiderado" : "dias atípicos desconsiderados"}`);
    }

    const historyNoteParts = [...mainNoteParts];
    if (hiddenCount) {
      historyNoteParts.push(`${hiddenCount} ${hiddenCount === 1 ? "semana vazia excluída" : "semanas vazias excluídas"}`);
    }

    const note = $("#averageExclusionNote");
    const noteText = mainNoteParts.join(" · ");
    if (note && note.textContent !== noteText) note.textContent = noteText;

    const historyDetail = $("#historyAverageDetail");
    if (historyDetail) {
      const detailText = visibleGroups.length
        ? `${visibleGroups.length} ${visibleGroups.length === 1 ? "semana considerada" : "semanas consideradas"} na média${historyNoteParts.length ? ` · ${historyNoteParts.join(" · ")}` : ""}`
        : "Nenhuma semana registrada";
      if (historyDetail.textContent !== detailText) historyDetail.textContent = detailText;
    }
'''
if old not in text:
    raise SystemExit('Expected v0.6.5 note block not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')

index = Path('index.html')
html = index.read_text(encoding='utf-8')
html = html.replace('app-dashboard-v06.js?v=0.6.5', 'app-dashboard-v06.js?v=0.6.6')
index.write_text(html, encoding='utf-8')
Path('version.txt').write_text('0.6.6\n', encoding='utf-8')
