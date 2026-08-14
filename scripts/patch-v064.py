from pathlib import Path

path = Path('app-dashboard-v06.js')
text = path.read_text(encoding='utf-8')

old = '''    const weeklyAverage = $("#weeklyAverage");
    if (weeklyAverage) weeklyAverage.textContent = `${formatNumber(average, 2)} doses`;

    const historyAverage = $("#historyAverage");
    if (historyAverage) historyAverage.textContent = `${formatNumber(average, 2)} doses`;

    const weeksCount = $("#weeksCount");
    if (weeksCount) weeksCount.textContent = String(visibleGroups.length);
'''
new = '''    const weeklyAverage = $("#weeklyAverage");
    const averageText = `${formatNumber(average, 2)} doses`;
    if (weeklyAverage && weeklyAverage.textContent !== averageText) weeklyAverage.textContent = averageText;

    const historyAverage = $("#historyAverage");
    if (historyAverage && historyAverage.textContent !== averageText) historyAverage.textContent = averageText;

    const weeksCount = $("#weeksCount");
    const weeksCountText = String(visibleGroups.length);
    if (weeksCount && weeksCount.textContent !== weeksCountText) weeksCount.textContent = weeksCountText;
'''
if old not in text:
    raise SystemExit('average block not found')
text = text.replace(old, new, 1)

old = '''    const note = $("#averageExclusionNote");
    if (note) note.textContent = noteParts.join(" · ");

    const historyDetail = $("#historyAverageDetail");
    if (historyDetail) {
      historyDetail.textContent = visibleGroups.length
        ? `${visibleGroups.length} ${visibleGroups.length === 1 ? "semana considerada" : "semanas consideradas"} na média${noteParts.length ? ` · ${noteParts.join(" · ")}` : ""}`
        : "Nenhuma semana registrada";
    }
'''
new = '''    const note = $("#averageExclusionNote");
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
if old not in text:
    raise SystemExit('note block not found')
text = text.replace(old, new, 1)

old = '''      card.dataset.cqbWeekKey = week.key;
      card.hidden = week.hidden;
      card.setAttribute("aria-hidden", week.hidden ? "true" : "false");
      card.querySelectorAll(".cqb-delete-week").forEach(button => button.remove());

      if (week.hidden) return;
'''
new = '''      card.dataset.cqbWeekKey = week.key;
      card.hidden = week.hidden;
      card.setAttribute("aria-hidden", week.hidden ? "true" : "false");
      const existingDeleteButton = card.querySelector(".cqb-delete-week");

      if (week.hidden) return;
'''
if old not in text:
    raise SystemExit('history prelude block not found')
text = text.replace(old, new, 1)

old = '''      if (week.entries.length === 0) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cqb-delete-week";
        button.textContent = "Excluir semana";
        button.setAttribute("aria-label", `Excluir semana vazia de ${formatShortDateKey(week.key)}`);
        button.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          hideEmptyWeek(week.key);
        });
        card.appendChild(button);
      }
'''
new = '''      if (week.entries.length === 0) {
        if (!existingDeleteButton) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "cqb-delete-week";
          button.textContent = "Excluir semana";
          button.setAttribute("aria-label", `Excluir semana vazia de ${formatShortDateKey(week.key)}`);
          button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            hideEmptyWeek(week.key);
          });
          card.appendChild(button);
        }
      } else if (existingDeleteButton) {
        existingDeleteButton.remove();
      }
'''
if old not in text:
    raise SystemExit('delete button block not found')
text = text.replace(old, new, 1)

old = '''    const average = $("#weeklyAverage");
    if (average) {
      new MutationObserver(scheduleRefresh).observe(average, { childList: true, characterData: true, subtree: true });
    }

'''
if old not in text:
    raise SystemExit('average observer block not found')
text = text.replace(old, '', 1)

path.write_text(text, encoding='utf-8')
print('patched v0.6.4')
