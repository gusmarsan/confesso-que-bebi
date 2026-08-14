(() => {
  if (window.__cqbDashboardV06Loaded) return;
  window.__cqbDashboardV06Loaded = true;

  const FIREBASE_VERSION = "12.16.0";
  const SETTINGS_COLLECTION = "atypicalWeeks";
  const DAY_PREFIX = "day-";
  const HIDDEN_WEEK_PREFIX = "hidden-week-";

  let auth;
  let db;
  let firestoreApi;
  let currentUser = null;
  let entries = [];
  let atypicalDays = new Set();
  let hiddenWeeks = new Set();
  let selectedDayKey = null;
  let selectedDayIsExplicit = false;
  let stopEntries = null;
  let stopSettings = null;
  let refreshTimer = null;
  let hiddenWeekNavigationDirection = -1;
  let skippingHiddenWeek = false;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const pad = value => String(value).padStart(2, "0");

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDateKey(value) {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function startOfWeek(value) {
    const date = value instanceof Date ? new Date(value) : parseDateKey(value);
    date.setHours(0, 0, 0, 0);
    const offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset);
    return date;
  }

  function weekKey(value) {
    return dateKey(startOfWeek(value));
  }

  function formatNumber(value, digits = 2) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(Number(value) || 0);
  }

  function formatShortDateKey(key) {
    const date = parseDateKey(key);
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
  }

  function formatDayLabel(key) {
    const date = parseDateKey(key);
    const formatted = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
    return formatted.charAt(0).toLocaleUpperCase("pt-BR") + formatted.slice(1);
  }

  function selectedWeekStart() {
    const text = $("#selectedWeekDates")?.textContent?.trim() || "";
    const match = text.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (!match) return startOfWeek(new Date());
    const [, day, month, rawYear] = match;
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    return startOfWeek(new Date(year, Number(month) - 1, Number(day)));
  }

  function entriesForWeek(start) {
    const end = addDays(start, 6);
    return entries.filter(item => {
      if (typeof item.datetime !== "string") return false;
      const date = parseDateKey(item.datetime);
      return date >= start && date <= end;
    });
  }

  function entriesForDay(key) {
    return entries.filter(item => String(item.datetime || "").slice(0, 10) === key);
  }

  function markedDaysForWeek(start) {
    const end = addDays(start, 6);
    return [...atypicalDays]
      .filter(key => {
        const date = parseDateKey(key);
        return date >= start && date <= end;
      })
      .sort();
  }

  function allCalendarWeeks() {
    const validEntries = entries
      .filter(item => typeof item.datetime === "string")
      .sort((a, b) => a.datetime.localeCompare(b.datetime));
    if (!validEntries.length) return [];

    const first = startOfWeek(validEntries[0].datetime);
    const current = startOfWeek(new Date());
    const lastEntryWeek = startOfWeek(validEntries.at(-1).datetime);
    const end = lastEntryWeek > current ? lastEntryWeek : current;
    const groups = [];

    for (let cursor = new Date(first); cursor <= end; cursor = addDays(cursor, 7)) {
      const start = new Date(cursor);
      const key = weekKey(start);
      const weekEntries = entriesForWeek(start);
      const actualDoses = weekEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
      const actualGrams = weekEntries.reduce((sum, item) => sum + Number(item.grams || 0), 0);
      const adjustedDoses = weekEntries
        .filter(item => !atypicalDays.has(String(item.datetime).slice(0, 10)))
        .reduce((sum, item) => sum + Number(item.doses || 0), 0);
      const hidden = hiddenWeeks.has(key) && weekEntries.length === 0;

      groups.push({
        key,
        start,
        entries: weekEntries,
        actualDoses,
        actualGrams,
        adjustedDoses,
        markedDays: markedDaysForWeek(start),
        hidden
      });
    }

    return groups;
  }

  function injectStyles() {
    if ($("#cqb-dashboard-v06-style")) return;
    const style = document.createElement("style");
    style.id = "cqb-dashboard-v06-style";
    style.textContent = `
      .day.cqb-atypical-day{
        border-color:#ff7b9b70!important;
        background:linear-gradient(145deg,#fff,#fff3f7)!important;
      }
      .day.cqb-atypical-day::before{
        background:linear-gradient(180deg,rgba(255,183,198,.42),rgba(255,95,122,.62))!important;
      }
      .day.cqb-atypical-day::after{
        background:var(--pink)!important;
      }
      .day.cqb-selected-day{
        outline:3px solid rgba(255,95,122,.20);
        outline-offset:2px;
        cursor:pointer;
      }
      #dayGrid .day{cursor:pointer}
      .cqb-hero-metrics{
        display:grid;grid-template-columns:72px 82px 104px 104px;
        align-items:start;gap:14px;flex:1;min-width:0;
      }
      .cqb-hero-metrics>div{min-width:0}
      .cqb-hero-metrics span{display:inline-block;line-height:1.18}
      .week-card.cqb-hidden-week{display:none!important}
      .cqb-delete-week{
        align-self:flex-start;margin-top:9px;padding:3px 0;border:0;background:none;
        color:#a69bab;font:inherit;font-size:.56rem;font-weight:800;text-decoration:underline;
        text-underline-offset:2px;cursor:pointer;
      }
      @media(max-width:520px){
        .hero-foot{flex-wrap:wrap;align-items:flex-end}
        .cqb-hero-metrics{width:100%;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px}
        .hero-actions{width:100%;justify-content:flex-end}
      }
    `;
    document.head.appendChild(style);
  }

  function installHeroMetrics() {
    const foot = $(".hero-foot");
    if (!foot || $("#cqbWeekDoses")) return;

    const actions = foot.querySelector(".hero-actions");
    const gramsBlock = [...foot.children].find(child => child !== actions);
    if (!gramsBlock || !actions) return;

    const metrics = document.createElement("div");
    metrics.className = "cqb-hero-metrics";
    foot.insertBefore(metrics, actions);
    metrics.appendChild(gramsBlock);

    const weekBlock = document.createElement("div");
    weekBlock.innerHTML = '<span>Doses na semana</span><br><b id="cqbWeekDoses">0 doses</b>';
    metrics.appendChild(weekBlock);

    const previousWeekBlock = document.createElement("div");
    previousWeekBlock.innerHTML = '<span>Doses da semana passada</span><br><b id="cqbPreviousWeekDoses">0 doses</b>';
    metrics.appendChild(previousWeekBlock);

    const twoWeeksAgoBlock = document.createElement("div");
    twoWeeksAgoBlock.innerHTML = '<span>Doses da semana retrasada</span><br><b id="cqbTwoWeeksAgoDoses">0 doses</b>';
    metrics.appendChild(twoWeeksAgoBlock);
  }

  function ensureSelectedDay() {
    const start = selectedWeekStart();
    const end = addDays(start, 6);

    if (selectedDayKey) {
      const selected = parseDateKey(selectedDayKey);
      if (selected >= start && selected <= end) return selectedDayKey;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (today >= start && today <= end) {
      selectedDayKey = dateKey(today);
      return selectedDayKey;
    }

    const weekEntries = entriesForWeek(start)
      .filter(item => typeof item.datetime === "string")
      .sort((a, b) => b.datetime.localeCompare(a.datetime));

    selectedDayKey = weekEntries.length
      ? String(weekEntries[0].datetime).slice(0, 10)
      : dateKey(start);
    return selectedDayKey;
  }

  function updateHero() {
    installHeroMetrics();
    const start = selectedWeekStart();
    const key = ensureSelectedDay();
    const dayEntries = entriesForDay(key);
    const weekEntries = entriesForWeek(start);
    const previousWeekEntries = entriesForWeek(addDays(start, -7));
    const twoWeeksAgoEntries = entriesForWeek(addDays(start, -14));
    const dayDoses = dayEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const weekDoses = weekEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const previousWeekDoses = previousWeekEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const twoWeeksAgoDoses = twoWeeksAgoEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
    const weekGrams = weekEntries.reduce((sum, item) => sum + Number(item.grams || 0), 0);

    const label = $(".hero-label");
    if (label) label.textContent = "Doses neste dia";

    const range = $("#currentWeekRange");
    if (range) range.textContent = formatDayLabel(key);

    const big = $("#currentWeekDoses");
    if (big) big.textContent = formatNumber(dayDoses, 2);

    const grams = $("#currentWeekGrams");
    if (grams) grams.textContent = `${formatNumber(weekGrams, 1)} g`;

    const weekTotal = $("#cqbWeekDoses");
    if (weekTotal) weekTotal.textContent = `${formatNumber(weekDoses, 2)} doses`;

    const previousWeekTotal = $("#cqbPreviousWeekDoses");
    if (previousWeekTotal) previousWeekTotal.textContent = `${formatNumber(previousWeekDoses, 2)} doses`;

    const twoWeeksAgoTotal = $("#cqbTwoWeeksAgoDoses");
    if (twoWeeksAgoTotal) twoWeeksAgoTotal.textContent = `${formatNumber(twoWeeksAgoDoses, 2)} doses`;
  }

  function installDaySelection() {
    const grid = $("#dayGrid");
    if (!grid || grid.dataset.cqbDaySelection === "1") return;
    grid.dataset.cqbDaySelection = "1";

    const selectCard = card => {
      const key = card?.dataset?.cqbDate;
      if (!key) return;
      selectedDayKey = key;
      selectedDayIsExplicit = true;
      scheduleRefresh();
    };

    grid.addEventListener("click", event => {
      selectCard(event.target.closest(".day"));
    });

    grid.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest(".day");
      if (!card) return;
      event.preventDefault();
      selectCard(card);
    });
  }

  function updateDayCards() {
    installDaySelection();
    const cards = $$("#dayGrid .day");
    if (!cards.length) return;
    const start = selectedWeekStart();
    const selected = ensureSelectedDay();
    const isCurrentWeek = weekKey(start) === weekKey(new Date());
    const showSelection = isCurrentWeek || selectedDayIsExplicit;

    cards.forEach((card, index) => {
      const key = dateKey(addDays(start, index));
      card.dataset.cqbDate = key;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Conferir doses de ${formatShortDateKey(key)}`);
      card.classList.toggle("cqb-selected-day", showSelection && key === selected);
    });
  }

  function updateAveragesAndCounts() {
    const allGroups = allCalendarWeeks();
    const visibleGroups = allGroups.filter(week => !week.hidden);
    const average = visibleGroups.length
      ? visibleGroups.reduce((sum, week) => sum + week.adjustedDoses, 0) / visibleGroups.length
      : 0;
    const markedCount = visibleGroups.reduce((sum, week) => sum + week.markedDays.length, 0);
    const hiddenCount = allGroups.filter(week => week.hidden).length;

    const weeklyAverage = $("#weeklyAverage");
    const averageText = `${formatNumber(average, 2)} doses`;
    if (weeklyAverage && weeklyAverage.textContent !== averageText) weeklyAverage.textContent = averageText;

    const historyAverage = $("#historyAverage");
    if (historyAverage && historyAverage.textContent !== averageText) historyAverage.textContent = averageText;

    const weeksCount = $("#weeksCount");
    const weeksCountText = String(visibleGroups.length);
    if (weeksCount && weeksCount.textContent !== weeksCountText) weeksCount.textContent = weeksCountText;

    const mainNoteParts = [];
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
  }

  async function hideEmptyWeek(key) {
    if (!currentUser || !firestoreApi) return;
    const group = allCalendarWeeks().find(week => week.key === key);
    if (!group || group.entries.length) return;

    const confirmed = window.confirm("Excluir esta semana vazia do histórico e da média?");
    if (!confirmed) return;

    const { collection, doc, setDoc, serverTimestamp } = firestoreApi;
    try {
      await setDoc(
        doc(collection(db, "users", currentUser.uid, SETTINGS_COLLECTION), `${HIDDEN_WEEK_PREFIX}${key}`),
        { key, hidden: true, atypical: false, kind: "hidden-week", updatedAt: serverTimestamp() },
        { merge: true }
      );
      hiddenWeeks.add(key);
      hiddenWeekNavigationDirection = -1;
      scheduleRefresh();
      showToast("Semana vazia excluída.");
    } catch (error) {
      console.error("Não foi possível excluir a semana vazia", error);
      showToast("Não foi possível excluir a semana.");
    }
  }

  function updateHistoryCards() {
    const cards = $$("#weekList .week-card");
    const allGroups = allCalendarWeeks();
    if (!cards.length || !allGroups.length) return;

    const descending = [...allGroups].reverse();
    const visibleAscending = allGroups.filter(week => !week.hidden);
    const currentKey = weekKey(new Date());

    cards.forEach((card, index) => {
      const week = descending[index];
      if (!week) return;

      card.dataset.cqbWeekKey = week.key;
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

      if (week.entries.length === 0) {
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
    });
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__cqbDashboardToastTimer);
    window.__cqbDashboardToastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function installWeekNavigationGuard() {
    const previous = $("#previousWeek");
    const next = $("#nextWeek");

    if (previous && previous.dataset.cqbHiddenWeekGuard !== "1") {
      previous.dataset.cqbHiddenWeekGuard = "1";
      previous.addEventListener("click", () => {
        if (!skippingHiddenWeek) hiddenWeekNavigationDirection = -1;
      }, true);
    }

    if (next && next.dataset.cqbHiddenWeekGuard !== "1") {
      next.dataset.cqbHiddenWeekGuard = "1";
      next.addEventListener("click", () => {
        if (!skippingHiddenWeek) hiddenWeekNavigationDirection = 1;
      }, true);
    }
  }

  function ensureSelectedWeekVisible() {
    const selectedKey = weekKey(selectedWeekStart());
    if (!hiddenWeeks.has(selectedKey)) return false;
    if (skippingHiddenWeek) return true;

    let direction = hiddenWeekNavigationDirection || -1;
    let button = direction > 0 ? $("#nextWeek") : $("#previousWeek");

    if ((!button || button.disabled) && direction > 0) {
      direction = -1;
      button = $("#previousWeek");
    } else if ((!button || button.disabled) && direction < 0) {
      direction = 1;
      button = $("#nextWeek");
    }

    if (!button || button.disabled) return false;

    hiddenWeekNavigationDirection = direction;
    skippingHiddenWeek = true;
    selectedDayKey = null;
    setTimeout(() => {
      button.click();
      skippingHiddenWeek = false;
      scheduleRefresh();
    }, 0);
    return true;
  }

  function refresh() {
    injectStyles();
    installWeekNavigationGuard();
    if (ensureSelectedWeekVisible()) return;
    installHeroMetrics();
    updateHero();
    updateDayCards();
    updateAveragesAndCounts();
    updateHistoryCards();
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 70);
  }

  function stopListeners() {
    stopEntries?.();
    stopSettings?.();
    stopEntries = null;
    stopSettings = null;
    entries = [];
    atypicalDays = new Set();
    hiddenWeeks = new Set();
    selectedDayKey = null;
    selectedDayIsExplicit = false;
  }

  async function startListeners(user) {
    stopListeners();
    currentUser = user;

    const { collection, onSnapshot } = firestoreApi;

    stopEntries = onSnapshot(collection(db, "users", user.uid, "drinkEntries"), snapshot => {
      entries = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      scheduleRefresh();
    });

    stopSettings = onSnapshot(collection(db, "users", user.uid, SETTINGS_COLLECTION), snapshot => {
      atypicalDays = new Set(
        snapshot.docs
          .filter(item => item.id.startsWith(DAY_PREFIX) && item.data()?.atypical !== false)
          .map(item => item.id.slice(DAY_PREFIX.length))
      );
      hiddenWeeks = new Set(
        snapshot.docs
          .filter(item => item.id.startsWith(HIDDEN_WEEK_PREFIX) && item.data()?.hidden !== false)
          .map(item => item.id.slice(HIDDEN_WEEK_PREFIX.length))
      );
      scheduleRefresh();
    });
  }

  async function init() {
    injectStyles();
    installWeekNavigationGuard();
    installHeroMetrics();
    installDaySelection();

    const appModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
    const authModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    firestoreApi = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);

    const app = appModule.getApp();
    auth = authModule.getAuth(app);
    db = firestoreApi.getFirestore(app);

    authModule.onAuthStateChanged(auth, user => {
      if (user) startListeners(user);
      else {
        currentUser = null;
        stopListeners();
        scheduleRefresh();
      }
    });

    const selectedWeekDates = $("#selectedWeekDates");
    if (selectedWeekDates) {
      new MutationObserver(() => {
        selectedDayKey = null;
        selectedDayIsExplicit = false;
        scheduleRefresh();
      }).observe(selectedWeekDates, { childList: true, characterData: true, subtree: true });
    }

    const dayGrid = $("#dayGrid");
    if (dayGrid) {
      new MutationObserver(scheduleRefresh).observe(dayGrid, { childList: true });
    }

    const weekList = $("#weekList");
    if (weekList) {
      new MutationObserver(scheduleRefresh).observe(weekList, { childList: true });
    }

    scheduleRefresh();
  }

  init().catch(error => console.error("Falha ao carregar dashboard v0.6.2", error));
})();
