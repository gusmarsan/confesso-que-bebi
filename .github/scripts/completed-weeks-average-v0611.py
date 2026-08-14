from pathlib import Path

# Main app: make the core weekly average include only finished Monday-Sunday weeks.
index_path = Path('index.html')
index = index_path.read_text(encoding='utf-8')
old = '''    function averageEligibleWeeks(groups=groupCalendarWeeks()){
      return groups.filter(week=>!week.atypical);
    }'''
new = '''    function averageEligibleWeeks(groups=groupCalendarWeeks()){
      const now=new Date();
      return groups.filter(week=>!week.atypical&&week.end<now);
    }'''
assert old in index, 'averageEligibleWeeks anchor not found'
index = index.replace(old, new, 1)
index = index.replace('>v0.6.10</span>', '>v0.6.11</span>', 1)
index = index.replace('app-dashboard-v06.js?v=0.6.10', 'app-dashboard-v06.js?v=0.6.11', 1)
index_path.write_text(index, encoding='utf-8')

# Dashboard enhancement: explicitly separate all visible weeks from weeks eligible for the average.
dash_path = Path('app-dashboard-v06.js')
dash = dash_path.read_text(encoding='utf-8')
old = '''    const allGroups = allCalendarWeeks();
    const visibleGroups = allGroups.filter(week => !week.hidden);
    const average = visibleGroups.length
      ? visibleGroups.reduce((sum, week) => sum + week.adjustedDoses, 0) / visibleGroups.length
      : 0;
    const markedCount = visibleGroups.reduce((sum, week) => sum + week.markedDays.length, 0);'''
new = '''    const allGroups = allCalendarWeeks();
    const visibleGroups = allGroups.filter(week => !week.hidden);
    const now = new Date();
    const averageGroups = visibleGroups.filter(week => addDays(week.start, 7) <= now);
    const average = averageGroups.length
      ? averageGroups.reduce((sum, week) => sum + week.adjustedDoses, 0) / averageGroups.length
      : 0;
    const markedCount = averageGroups.reduce((sum, week) => sum + week.markedDays.length, 0);'''
assert old in dash, 'dashboard average block not found'
dash = dash.replace(old, new, 1)
old = '''      const detailText = visibleGroups.length
        ? `${visibleGroups.length} ${visibleGroups.length === 1 ? "semana considerada" : "semanas consideradas"} na média${historyNoteParts.length ? ` · ${historyNoteParts.join(" · ")}` : ""}`
        : "Nenhuma semana registrada";'''
new = '''      const detailText = averageGroups.length
        ? `${averageGroups.length} ${averageGroups.length === 1 ? "semana considerada" : "semanas consideradas"} na média${historyNoteParts.length ? ` · ${historyNoteParts.join(" · ")}` : ""}`
        : "Nenhuma semana encerrada";'''
assert old in dash, 'history average detail block not found'
dash = dash.replace(old, new, 1)
dash_path.write_text(dash, encoding='utf-8')

Path('version.txt').write_text('0.6.11\n', encoding='utf-8')

sw_path = Path('sw.js')
sw = sw_path.read_text(encoding='utf-8')
sw = sw.replace('confesso-que-bebi-pwa-v7', 'confesso-que-bebi-pwa-v8')
sw_path.write_text(sw, encoding='utf-8')
