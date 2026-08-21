(() => {
  if (window.__cqbEnhancementsLoaded) return;
  window.__cqbEnhancementsLoaded = true;

  const FIREBASE_VERSION = "12.16.0";
  const DAY_COLLECTION = "atypicalWeeks";
  const DAY_PREFIX = "day-";
  const EXPECTED_DAY_DOSES = {
    0: 13,
    5: 12,
    6: 25
  };

  let auth;
  let db;
  let currentUser = null;
  let entries = [];
  let entriesSnapshotReady = false;
  let atypicalDays = new Set();
  let stopEntries = null;
  let stopDays = null;
  let refreshTimer = null;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const pad = value => String(value).padStart(2, "0");

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDateKey(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  function addDays(date, amount) {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
  }

  function startOfWeek(value) {
    const date = value instanceof Date ? new Date(value) : parseDateKey(String(value).slice(0, 10));
    date.setHours(0, 0, 0, 0);
    const offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset);
    return date;
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

  function selectedWeekStart() {
    const text = $("#selectedWeekDates")?.textContent?.trim() || "";
    const match = text.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (!match) return startOfWeek(new Date());
    const [, day, month, rawYear] = match;
    const year = rawYear.length === 2 ? 2000 + Number(rawYear) : Number(rawYear);
    return startOfWeek(new Date(year, Number(month) - 1, Number(day)));
  }

  function daysForWeek(start) {
    const end = addDays(start, 6);
    return [...atypicalDays]
      .filter(key => {
        const date = parseDateKey(key);
        return date >= start && date <= end;
      })
      .sort();
  }

  function injectStyles() {
    if ($("#cqb-enhancements-style")) return;
    const style = document.createElement("style");
    style.id = "cqb-enhancements-style";
    style.textContent = `
      #atypicalControl{display:none!important}
      .cqb-atypical-day-row{
        display:flex;justify-content:flex-end;margin:0;
      }
      .cqb-atypical-day-control{
        min-height:44px;display:inline-flex;align-items:center;gap:7px;padding:0 7px;border:0;
        border-radius:11px;background:none;color:var(--muted);font:inherit;font-size:.69rem;font-weight:750;cursor:pointer;
      }
      .cqb-atypical-day-control::before{
        content:"";width:13px;height:13px;border:1.5px solid currentColor;border-radius:4px;
        box-sizing:border-box;
      }
      .cqb-atypical-day-control.active{color:var(--purple)}
      .cqb-atypical-day-control:focus-visible{outline:3px solid color-mix(in srgb,var(--focus) 34%,transparent);outline-offset:3px}
      @media(hover:hover) and (pointer:fine){.cqb-atypical-day-control:hover{background:#f4efff;color:var(--purple)}}
      .cqb-atypical-day-control.active::before{
        background:var(--purple);box-shadow:inset 0 0 0 3px var(--paper);
      }
      .cqb-atypical-day-picker{
        position:fixed;left:50%;bottom:12px;width:1px;height:1px;opacity:.01;
        pointer-events:none;border:0;padding:0;
      }
      .day.cqb-atypical-day{
        box-shadow:inset 0 0 0 2px #344C7366;
      }
      .day.cqb-atypical-day::after{
        content:"";position:absolute;z-index:4;top:5px;right:5px;width:6px;height:6px;
        border-radius:50%;background:var(--purple);
      }
      .cqb-atypical-day-tag{
        display:inline-flex;padding:5px 8px;border-radius:999px;background:#344C7312;
        color:var(--purple);font-size:.69rem;font-weight:850;
      }
    `;
    document.head.appendChild(style);
  }

  function installControl() {
    const oldControl = $("#atypicalControl");
    if (!oldControl || $("#atypicalDayControl")) return;

    const row = document.createElement("div");
    row.className = "cqb-atypical-day-row";

    const button = document.createElement("button");
    button.id = "atypicalDayControl";
    button.className = "cqb-atypical-day-control";
    button.type = "button";
    button.textContent = "Dia atípico";

    const picker = document.createElement("input");
    picker.id = "atypicalDayPicker";
    picker.className = "cqb-atypical-day-picker";
    picker.type = "date";
    picker.setAttribute("aria-label", "Escolher dia atípico");

    row.append(button, picker);
    oldControl.insertAdjacentElement("afterend", row);

    button.addEventListener("click", () => {
      const start = selectedWeekStart();
      const end = addDays(start, 6);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const max = end > today ? today : end;
      const weekDays = daysForWeek(start);

      picker.min = dateKey(start);
      picker.max = dateKey(max);
      picker.value = weekDays[0] || (today >= start && today <= end ? dateKey(today) : dateKey(start));

      try {
        if (typeof picker.showPicker === "function") picker.showPicker();
        else picker.click();
      } catch {
        picker.click();
      }
    });

    picker.addEventListener("change", async () => {
      const key = picker.value;
      if (!key || !currentUser) return;

      const { collection, doc, setDoc, deleteDoc, serverTimestamp } = await import(
        `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
      );
      const reference = doc(collection(db, "users", currentUser.uid, DAY_COLLECTION), `${DAY_PREFIX}${key}`);
      const alreadyMarked = atypicalDays.has(key);

      try {
        if (alreadyMarked) {
          await deleteDoc(reference);
          showToast(`Dia ${formatShortDateKey(key)} voltou a contar na média.`);
        } else {
          await setDoc(reference, { key, atypical: true, kind: "day", updatedAt: serverTimestamp() }, { merge: true });
          showToast(`Dia ${formatShortDateKey(key)} marcado como atípico.`);
        }
      } catch (error) {
        console.error("Não foi possível atualizar o dia atípico", error);
        showToast("Não foi possível atualizar o dia atípico.");
      }
    });
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__cqbEnhancementToastTimer);
    window.__cqbEnhancementToastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function totalDosesForDay(items, key) {
    return items
      .filter(item => String(item.datetime || "").slice(0, 10) === key)
      .reduce((sum, item) => sum + Number(item.doses || 0), 0);
  }

  function checkExpectedConsumptionThreshold(previousEntries, nextEntries, changedKeys) {
    for (const key of changedKeys) {
      if (!key) continue;
      const day = parseDateKey(key);
      const expected = EXPECTED_DAY_DOSES[day.getDay()];
      if (!expected) continue;

      const before = totalDosesForDay(previousEntries, key);
      const after = totalDosesForDay(nextEntries, key);
      const threshold = expected * 0.7;

      if (before < threshold && after >= threshold) {
        const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(day);
        showToast(`Você chegou a 70% do consumo esperado para ${weekday}.`);
        return;
      }
    }
  }

  function enforceVersionLabel() {
    const version = $("#appVersion");
    if (version && version.textContent !== "v0.7.3") version.textContent = "v0.7.3";
  }

  function updateControl() {
    const button = $("#atypicalDayControl");
    if (!button) return;
    const marked = daysForWeek(selectedWeekStart());
    button.classList.toggle("active", marked.length > 0);
    if (!marked.length) {
      button.textContent = "Dia atípico";
    } else if (marked.length === 1) {
      button.textContent = `Dia atípico · ${formatShortDateKey(marked[0])}`;
    } else {
      button.textContent = `${marked.length} dias atípicos`;
    }
  }

  function calendarWeeks() {
    if (!entries.length) return [];

    const validEntries = entries
      .filter(item => typeof item.datetime === "string")
      .sort((a, b) => a.datetime.localeCompare(b.datetime));
    if (!validEntries.length) return [];

    const first = startOfWeek(validEntries[0].datetime);
    const current = startOfWeek(new Date());
    const groups = [];

    for (let cursor = new Date(first); cursor <= current; cursor = addDays(cursor, 7)) {
      const start = new Date(cursor);
      const end = addDays(start, 6);
      const weekEntries = validEntries.filter(item => {
        const date = parseDateKey(item.datetime.slice(0, 10));
        return date >= start && date <= end;
      });
      const actualDoses = weekEntries.reduce((sum, item) => sum + Number(item.doses || 0), 0);
      const adjustedDoses = weekEntries
        .filter(item => !atypicalDays.has(item.datetime.slice(0, 10)))
        .reduce((sum, item) => sum + Number(item.doses || 0), 0);
      const markedDays = daysForWeek(start);

      groups.push({ start, end, actualDoses, adjustedDoses, markedDays });
    }

    return groups;
  }

  function updateAveragesAndHistory() {
    const groups = calendarWeeks();
    const average = groups.length
      ? groups.reduce((sum, week) => sum + week.adjustedDoses, 0) / groups.length
      : 0;
    const markedCount = groups.reduce((sum, week) => sum + week.markedDays.length, 0);

    const weeklyAverage = $("#weeklyAverage");
    if (weeklyAverage) {
      const text = `${formatNumber(average, 2)} doses`;
      if (weeklyAverage.textContent !== text) weeklyAverage.textContent = text;
    }

    const note = $("#averageExclusionNote");
    if (note) {
      const text = markedCount
        ? `${markedCount} ${markedCount === 1 ? "dia atípico desconsiderado" : "dias atípicos desconsiderados"}`
        : "";
      if (note.textContent !== text) note.textContent = text;
    }

    const historyAverage = $("#historyAverage");
    if (historyAverage) {
      const text = `${formatNumber(average, 2)} doses`;
      if (historyAverage.textContent !== text) historyAverage.textContent = text;
    }

    const historyDetail = $("#historyAverageDetail");
    if (historyDetail && groups.length) {
      const text = `${groups.length} ${groups.length === 1 ? "semana considerada" : "semanas consideradas"} na média${
        markedCount ? ` · ${markedCount} ${markedCount === 1 ? "dia atípico" : "dias atípicos"} fora do cálculo` : ""
      }`;
      if (historyDetail.textContent !== text) historyDetail.textContent = text;
    }

    updateHistoryBadges(groups);
  }

  function updateSelectedWeekDays() {
    const cards = $$("#dayGrid .day");
    if (!cards.length) return;
    const start = selectedWeekStart();
    cards.forEach((card, index) => {
      const key = dateKey(addDays(start, index));
      const marked = atypicalDays.has(key);
      card.classList.toggle("cqb-atypical-day", marked);
      if (marked) card.title = `Dia ${formatShortDateKey(key)} marcado como atípico`;
      else card.removeAttribute("title");
    });
  }

  function updateHistoryBadges(groups) {
    const cards = $$("#weekList .week-card");
    if (!cards.length || !groups.length) return;
    const descending = [...groups].reverse();

    cards.forEach((card, index) => {
      card.classList.remove("atypical");
      card.querySelectorAll(".atypical-tag,.cqb-atypical-day-tag").forEach(tag => tag.remove());
      const week = descending[index];
      if (!week || !week.markedDays.length) return;

      let breakdown = card.querySelector(".week-breakdown");
      if (!breakdown) {
        breakdown = document.createElement("div");
        breakdown.className = "week-breakdown";
        card.appendChild(breakdown);
      }

      const tag = document.createElement("span");
      tag.className = "cqb-atypical-day-tag";
      tag.textContent = week.markedDays.length === 1
        ? `Dia atípico · ${formatShortDateKey(week.markedDays[0])}`
        : `${week.markedDays.length} dias atípicos`;
      breakdown.appendChild(tag);
    });
  }

  function refresh() {
    enforceVersionLabel();
    installControl();
    updateControl();
    updateSelectedWeekDays();
    updateAveragesAndHistory();
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 30);
  }

  function stopListeners() {
    stopEntries?.();
    stopDays?.();
    stopEntries = null;
    stopDays = null;
    entries = [];
    entriesSnapshotReady = false;
    atypicalDays = new Set();
  }

  async function startListeners(user) {
    stopListeners();
    currentUser = user;

    const { collection, onSnapshot } = await import(
      `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
    );

    stopEntries = onSnapshot(collection(db, "users", user.uid, "drinkEntries"), snapshot => {
      const previousEntries = entries;
      const nextEntries = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));

      if (entriesSnapshotReady) {
        const changedKeys = new Set();
        snapshot.docChanges().forEach(change => {
          const nextKey = String(change.doc.data()?.datetime || "").slice(0, 10);
          if (nextKey) changedKeys.add(nextKey);

          const previousItem = previousEntries.find(item => item.id === change.doc.id);
          const previousKey = String(previousItem?.datetime || "").slice(0, 10);
          if (previousKey) changedKeys.add(previousKey);
        });
        checkExpectedConsumptionThreshold(previousEntries, nextEntries, changedKeys);
      }

      entries = nextEntries;
      entriesSnapshotReady = true;
      scheduleRefresh();
    });

    stopDays = onSnapshot(collection(db, "users", user.uid, DAY_COLLECTION), snapshot => {
      atypicalDays = new Set(
        snapshot.docs
          .filter(item => item.id.startsWith(DAY_PREFIX) && item.data()?.atypical !== false)
          .map(item => item.id.slice(DAY_PREFIX.length))
      );
      scheduleRefresh();
    });
  }

  async function init() {
    injectStyles();
    installControl();
    enforceVersionLabel();
    setTimeout(enforceVersionLabel, 300);
    setTimeout(enforceVersionLabel, 1200);

    const appModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
    const authModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    const firestoreModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);

    const app = appModule.getApp();
    auth = authModule.getAuth(app);
    db = firestoreModule.getFirestore(app);

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
      new MutationObserver(scheduleRefresh).observe(selectedWeekDates, {
        childList: true,
        characterData: true,
        subtree: true
      });
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

  init().catch(error => console.error("Falha ao carregar melhorias do Confesso que bebi", error));
})();