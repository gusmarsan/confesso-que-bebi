(() => {
  if (window.__cqbHistoryChartsV075Loaded) return;
  window.__cqbHistoryChartsV075Loaded = true;

  const FIREBASE_VERSION = "12.16.0";
  let entries = [];
  let unsubscribeEntries = null;
  let versionObserver = null;

  const $ = selector => document.querySelector(selector);
  const pad = value => String(value).padStart(2, "0");

  function parseDateKey(value) {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  function formatShortDateKey(key) {
    const date = parseDateKey(key);
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  }

  function formatNumber(value, digits = 2) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(Number(value) || 0);
  }

  function installVersionLabel() {
    const current = $("#appVersion");
    if (!current) return;
    if (current.textContent !== "v0.7.5") current.textContent = "v0.7.5";
    current.dataset.cqbV075 = "1";
    current.setAttribute("aria-label", "Versão do app 0.7.5");

    if (!versionObserver) {
      versionObserver = new MutationObserver(() => {
        const version = $("#appVersion");
        if (version && version.textContent !== "v0.7.5") version.textContent = "v0.7.5";
      });
      versionObserver.observe(current, { childList: true, characterData: true, subtree: true });
    }
  }

  function installStyles() {
    if ($("#cqb-history-day-charts-style")) return;
    const style = document.createElement("style");
    style.id = "cqb-history-day-charts-style";
    style.textContent = `
      .cqb-history-day-charts{margin:22px 0 4px}
      .cqb-history-day-charts-head{margin:0 2px 11px}
      .cqb-history-day-charts-head h2{margin:0;font-size:1rem;letter-spacing:-.025em}
      .cqb-history-day-charts-head p{margin:5px 0 0;color:var(--muted);font-size:.72rem;font-weight:600;line-height:1.4}
      .cqb-history-day-chart-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
      .cqb-history-day-chart-card{min-width:0;padding:14px;border:1px solid var(--line);border-radius:19px;background:var(--card);box-shadow:0 8px 25px rgba(79,49,93,.05)}
      .cqb-history-day-chart-card header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}
      .cqb-history-day-chart-card h3{margin:0;font-size:.82rem;letter-spacing:-.02em}
      .cqb-history-day-chart-card header span{color:var(--muted);font-size:.65rem;font-weight:800;white-space:nowrap}
      .cqb-history-chart-scroll{overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:3px;scrollbar-width:thin;scrollbar-color:#c9bbcf transparent}
      .cqb-history-chart-scroll::-webkit-scrollbar{height:5px}
      .cqb-history-chart-scroll::-webkit-scrollbar-thumb{border-radius:999px;background:#c9bbcf}
      .cqb-history-chart-svg{display:block;height:154px;min-width:100%}
      .cqb-history-chart-empty{min-height:154px;display:grid;place-items:center;padding:14px;color:var(--muted);font-size:.69rem;font-weight:650;line-height:1.45;text-align:center}
      .cqb-history-chart-summary{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-top:7px}
      .cqb-history-chart-summary strong{font-size:.84rem;color:var(--ink)}
      .cqb-history-chart-summary small{color:var(--muted);font-size:.64rem;font-weight:650}
      @media(max-width:760px){
        .cqb-history-day-chart-grid{grid-template-columns:1fr}
        .cqb-history-day-chart-card{padding:13px}
        .cqb-history-chart-svg{height:150px}
      }
    `;
    document.head.appendChild(style);
  }

  function seriesForDay(dayOfWeek) {
    const totals = new Map();
    entries.forEach(item => {
      const key = String(item.datetime || "").slice(0, 10);
      if (!key) return;
      const date = parseDateKey(key);
      if (date.getDay() !== dayOfWeek) return;
      totals.set(key, (totals.get(key) || 0) + Number(item.doses || 0));
    });
    return [...totals.entries()]
      .map(([key, doses]) => ({ key, doses }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  function lineChartSvg(points, color, title) {
    const width = Math.max(292, 52 + points.length * 58);
    const height = 154;
    const left = 32;
    const right = 12;
    const top = 14;
    const bottom = 28;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxDose = Math.max(1, ...points.map(point => Number(point.doses || 0)));
    const yMax = Math.max(1, Math.ceil(maxDose * 1.14));
    const xAt = index => points.length === 1 ? left + plotWidth / 2 : left + (index / (points.length - 1)) * plotWidth;
    const yAt = value => top + plotHeight - (Number(value || 0) / yMax) * plotHeight;
    const path = points.map((point, index) => `${index ? "L" : "M"}${xAt(index).toFixed(1)},${yAt(point.doses).toFixed(1)}`).join(" ");

    const grid = [0, .5, 1].map(fraction => {
      const y = top + plotHeight * fraction;
      const label = formatNumber(yMax * (1 - fraction), 1);
      return `<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#eee5ed" stroke-width="1"/><text x="${left-6}" y="${y+3}" text-anchor="end" fill="#625a70" font-size="9" font-weight="700">${label}</text>`;
    }).join("");

    const dots = points.map((point, index) => {
      const x = xAt(index);
      const y = yAt(point.doses);
      return `<g><circle cx="${x}" cy="${y}" r="4.2" fill="${color}" stroke="#FFFDFC" stroke-width="2"><title>${formatShortDateKey(point.key)} · ${formatNumber(point.doses, 2)} doses</title></circle><text x="${x}" y="${height-8}" text-anchor="middle" fill="#625a70" font-size="9" font-weight="700">${formatShortDateKey(point.key)}</text></g>`;
    }).join("");

    return `<svg class="cqb-history-chart-svg" viewBox="0 0 ${width} ${height}" width="${width}" role="img" aria-label="${title}: evolução das doses registradas"><path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${grid}${dots}</svg>`;
  }

  function ensureSection() {
    const historyHero = $(".history-hero");
    if (!historyHero) return null;
    let section = $("#cqbHistoryDayCharts");
    if (!section) {
      section = document.createElement("section");
      section.id = "cqbHistoryDayCharts";
      section.className = "cqb-history-day-charts";
      historyHero.insertAdjacentElement("afterend", section);
    }
    return section;
  }

  function render() {
    installVersionLabel();
    installStyles();
    const section = ensureSection();
    if (!section) return;

    const definitions = [
      { day: 5, title: "Sextas-feiras", color: "#E8644A" },
      { day: 6, title: "Sábados", color: "#344C73" },
      { day: 0, title: "Domingos", color: "#4BA9B8" }
    ];

    const cards = definitions.map(definition => {
      const points = seriesForDay(definition.day);
      if (!points.length) {
        return `<article class="cqb-history-day-chart-card"><header><h3>${definition.title}</h3><span>0 dias</span></header><div class="cqb-history-chart-empty">Nenhum dia registrado ainda.</div></article>`;
      }
      const latest = points.at(-1);
      const countLabel = `${points.length} ${points.length === 1 ? "dia" : "dias"}`;
      return `<article class="cqb-history-day-chart-card"><header><h3>${definition.title}</h3><span>${countLabel}</span></header><div class="cqb-history-chart-scroll">${lineChartSvg(points, definition.color, definition.title)}</div><div class="cqb-history-chart-summary"><strong>${formatNumber(latest.doses, 2)} doses</strong><small>último · ${formatShortDateKey(latest.key)}</small></div></article>`;
    }).join("");

    section.innerHTML = `<div class="cqb-history-day-charts-head"><h2>Por dia da semana</h2><p>Evolução das doses registradas em sextas, sábados e domingos</p></div><div class="cqb-history-day-chart-grid">${cards}</div>`;
  }

  async function waitForFirebaseApp(appModule) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        return appModule.getApp();
      } catch {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    throw new Error("Firebase app não inicializado");
  }

  async function init() {
    installVersionLabel();
    installStyles();
    render();

    const appModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
    const authModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    const firestoreModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);
    const app = await waitForFirebaseApp(appModule);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);

    authModule.onAuthStateChanged(auth, user => {
      unsubscribeEntries?.();
      unsubscribeEntries = null;
      entries = [];
      render();
      if (!user) return;

      unsubscribeEntries = firestoreModule.onSnapshot(
        firestoreModule.collection(db, "users", user.uid, "drinkEntries"),
        snapshot => {
          entries = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
          render();
        },
        error => console.error("Não foi possível carregar os gráficos do histórico", error)
      );
    });
  }

  init().catch(error => console.error("Falha ao carregar gráficos do histórico v0.7.5", error));
})();
