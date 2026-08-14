from pathlib import Path

js_path = Path("app-dashboard-v06.js")
js = js_path.read_text(encoding="utf-8")

old = '''  function formatDayLabel(key) {
    const date = parseDateKey(key);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit"
    }).format(date);
  }'''
new = '''  function formatDayLabel(key) {
    const date = parseDateKey(key);
    const formatted = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
    return formatted.charAt(0).toLocaleUpperCase("pt-BR") + formatted.slice(1);
  }'''
if old not in js:
    raise SystemExit("formatDayLabel block not found")
js = js.replace(old, new, 1)

old = '''      .cqb-hero-metrics{
        display:flex;align-items:flex-start;gap:18px;
      }
      .cqb-hero-metrics>div{min-width:76px}'''
new = '''      .cqb-hero-metrics{
        display:grid;grid-template-columns:72px 82px 104px 104px;
        align-items:start;gap:14px;flex:1;min-width:0;
      }
      .cqb-hero-metrics>div{min-width:0}
      .cqb-hero-metrics span{display:inline-block;line-height:1.18}'''
if old not in js:
    raise SystemExit("hero metrics CSS block not found")
js = js.replace(old, new, 1)

old = '''      @media(max-width:520px){
        .hero-foot{flex-wrap:wrap;align-items:flex-end}
        .hero-actions{width:100%;justify-content:flex-end}
      }'''
new = '''      @media(max-width:520px){
        .hero-foot{flex-wrap:wrap;align-items:flex-end}
        .cqb-hero-metrics{width:100%;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px}
        .hero-actions{width:100%;justify-content:flex-end}
      }'''
if old not in js:
    raise SystemExit("mobile hero CSS block not found")
js = js.replace(old, new, 1)

old = '''    const weekBlock = document.createElement("div");
    weekBlock.innerHTML = '<span>Doses na semana</span><br><b id="cqbWeekDoses">0 doses</b>';
    metrics.appendChild(weekBlock);'''
new = '''    const weekBlock = document.createElement("div");
    weekBlock.innerHTML = '<span>Doses na semana</span><br><b id="cqbWeekDoses">0 doses</b>';
    metrics.appendChild(weekBlock);

    const previousWeekBlock = document.createElement("div");
    previousWeekBlock.innerHTML = '<span>Doses da semana passada</span><br><b id="cqbPreviousWeekDoses">0 doses</b>';
    metrics.appendChild(previousWeekBlock);

    const twoWeeksAgoBlock = document.createElement("div");
    twoWeeksAgoBlock.innerHTML = '<span>Doses da semana retrasada</span><br><b id="cqbTwoWeeksAgoDoses">0 doses</b>';
    metrics.appendChild(twoWeeksAgoBlock);'''
if old not in js:
    raise SystemExit("installHeroMetrics block not found")
js = js.replace(old, new, 1)

old = '''    const dayEntries = entriesForDay(key);
    const weekEntries = entriesForWeek(start);
    const dayDoses = dayEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const weekDoses = weekEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const weekGrams = weekEntries.reduce((sum, item) => sum + Number(item.grams || 0), 0);'''
new = '''    const dayEntries = entriesForDay(key);
    const weekEntries = entriesForWeek(start);
    const previousWeekEntries = entriesForWeek(addDays(start, -7));
    const twoWeeksAgoEntries = entriesForWeek(addDays(start, -14));
    const dayDoses = dayEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const weekDoses = weekEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const previousWeekDoses = previousWeekEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const twoWeeksAgoDoses = twoWeeksAgoEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const weekGrams = weekEntries.reduce((sum, item) => sum + Number(item.grams || 0), 0);'''
if old not in js:
    raise SystemExit("updateHero calculation block not found")
js = js.replace(old, new, 1)

old = '''    const weekTotal = $("#cqbWeekDoses");
    if (weekTotal) weekTotal.textContent = `${formatNumber(weekDoses, 2)} doses`;
  }'''
new = '''    const weekTotal = $("#cqbWeekDoses");
    if (weekTotal) weekTotal.textContent = `${formatNumber(weekDoses, 2)} doses`;

    const previousWeekTotal = $("#cqbPreviousWeekDoses");
    if (previousWeekTotal) previousWeekTotal.textContent = `${formatNumber(previousWeekDoses, 2)} doses`;

    const twoWeeksAgoTotal = $("#cqbTwoWeeksAgoDoses");
    if (twoWeeksAgoTotal) twoWeeksAgoTotal.textContent = `${formatNumber(twoWeeksAgoDoses, 2)} doses`;
  }'''
if old not in js:
    raise SystemExit("updateHero output block not found")
js = js.replace(old, new, 1)

js = js.replace('dashboard v0.6", error', 'dashboard v0.6.2", error', 1)
js_path.write_text(js, encoding="utf-8")

index_path = Path("index.html")
index = index_path.read_text(encoding="utf-8")
old_src = 'src="./app-dashboard-v06.js?v=0.6"'
new_src = 'src="./app-dashboard-v06.js?v=0.6.2"'
if index.count(old_src) != 1:
    raise SystemExit(f"Expected exactly one dashboard script reference, found {index.count(old_src)}")
index = index.replace(old_src, new_src, 1)
index_path.write_text(index, encoding="utf-8")

Path("version.txt").write_text("0.6.2\n", encoding="utf-8")
