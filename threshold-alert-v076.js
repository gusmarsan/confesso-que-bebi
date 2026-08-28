(() => {
  if (window.__cqbThresholdAlertV076Loaded) return;
  window.__cqbThresholdAlertV076Loaded = true;

  const FIREBASE_VERSION = "12.16.0";
  const THRESHOLD_RATIO = 0.7;
  const DAY_LIMITS = {
    0: 15,
    5: 12,
    6: 17
  };

  let entries = [];
  let snapshotReady = false;
  let unsubscribeEntries = null;
  const firedDates = new Set();

  const $ = selector => document.querySelector(selector);

  function parseDateKey(value) {
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  function totalDosesForDay(items, key) {
    return items
      .filter(item => String(item.datetime || "").slice(0, 10) === key)
      .reduce((sum, item) => sum + Number(item.doses || 0), 0);
  }

  function installStyles() {
    if ($("#cqb-threshold-alert-style")) return;
    const style = document.createElement("style");
    style.id = "cqb-threshold-alert-style";
    style.textContent = `
      .cqb-threshold-alert{
        position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;
        padding:28px max(22px,env(safe-area-inset-right)) max(28px,env(safe-area-inset-bottom)) max(22px,env(safe-area-inset-left));
        background:#F3E4D6;color:#2d2540;text-align:center;
      }
      .cqb-threshold-alert.show{display:flex}
      .cqb-threshold-alert-card{width:min(100%,420px);display:flex;flex-direction:column;align-items:center}
      .cqb-threshold-alert-dot{
        width:76px;height:76px;margin-bottom:28px;border-radius:50%;background:#E8644A;
        box-shadow:0 12px 34px rgba(232,100,74,.22);
      }
      .cqb-threshold-alert h2{
        max-width:360px;margin:0;font-size:clamp(1.8rem,7vw,2.45rem);line-height:1.04;letter-spacing:-.055em;
      }
      .cqb-threshold-alert-detail{
        max-width:330px;margin:16px 0 0;color:#625A70;font-size:.88rem;font-weight:650;line-height:1.5;
      }
      .cqb-threshold-alert button{
        width:min(100%,280px);min-height:50px;margin-top:34px;border:0;border-radius:15px;background:#344C73;color:#fff;
        font:inherit;font-weight:850;cursor:pointer;
      }
      .cqb-threshold-alert button:focus-visible{outline:3px solid rgba(52,76,115,.25);outline-offset:4px}
      body.cqb-threshold-alert-open{overflow:hidden}
    `;
    document.head.appendChild(style);
  }

  function ensureAlert() {
    let alert = $("#cqbThresholdAlert");
    if (alert) return alert;

    alert = document.createElement("section");
    alert.id = "cqbThresholdAlert";
    alert.className = "cqb-threshold-alert";
    alert.setAttribute("role", "alertdialog");
    alert.setAttribute("aria-modal", "true");
    alert.setAttribute("aria-labelledby", "cqbThresholdAlertTitle");
    alert.innerHTML = `
      <div class="cqb-threshold-alert-card">
        <div class="cqb-threshold-alert-dot" aria-hidden="true"></div>
        <h2 id="cqbThresholdAlertTitle">Você ultrapassou 70% do consumo.</h2>
        <p id="cqbThresholdAlertDetail" class="cqb-threshold-alert-detail"></p>
        <button id="cqbThresholdAlertClose" type="button">Entendi</button>
      </div>
    `;
    document.body.appendChild(alert);

    const close = () => {
      alert.classList.remove("show");
      document.body.classList.remove("cqb-threshold-alert-open");
    };
    alert.querySelector("#cqbThresholdAlertClose")?.addEventListener("click", close);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && alert.classList.contains("show")) close();
    });
    return alert;
  }

  function hideLegacyThresholdToast() {
    const toast = $("#toast");
    if (!toast) return;
    if (toast.textContent?.includes("70%")) toast.classList.remove("show");
  }

  function installLegacyToastGuard() {
    const toast = $("#toast");
    if (!toast || window.__cqbThresholdToastObserver) return;
    window.__cqbThresholdToastObserver = new MutationObserver(hideLegacyThresholdToast);
    window.__cqbThresholdToastObserver.observe(toast, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  function showThresholdAlert(key, after, limit) {
    installStyles();
    installLegacyToastGuard();
    hideLegacyThresholdToast();

    const alert = ensureAlert();
    const day = parseDateKey(key);
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(day);
    const percentage = Math.round((after / limit) * 100);
    const detail = alert.querySelector("#cqbThresholdAlertDetail");
    if (detail) {
      detail.textContent = `Neste check-in, ${weekday}, você chegou a ${percentage}% do limite de ${limit} doses.`;
    }

    document.body.classList.add("cqb-threshold-alert-open");
    alert.classList.add("show");
    requestAnimationFrame(() => alert.querySelector("#cqbThresholdAlertClose")?.focus());
  }

  function checkThreshold(previousEntries, nextEntries, changedKeys) {
    for (const key of changedKeys) {
      if (!key || firedDates.has(key)) continue;
      const day = parseDateKey(key);
      const limit = DAY_LIMITS[day.getDay()];
      if (!limit) continue;

      const before = totalDosesForDay(previousEntries, key);
      const after = totalDosesForDay(nextEntries, key);
      const threshold = limit * THRESHOLD_RATIO;

      if (before < threshold && after >= threshold) {
        firedDates.add(key);
        showThresholdAlert(key, after, limit);
        return;
      }
    }
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
    installStyles();
    installLegacyToastGuard();

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
      snapshotReady = false;
      firedDates.clear();
      if (!user) return;

      unsubscribeEntries = firestoreModule.onSnapshot(
        firestoreModule.collection(db, "users", user.uid, "drinkEntries"),
        snapshot => {
          const previousEntries = entries;
          const nextEntries = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));

          if (snapshotReady) {
            const changedKeys = new Set();
            snapshot.docChanges().forEach(change => {
              const nextKey = String(change.doc.data()?.datetime || "").slice(0, 10);
              if (nextKey) changedKeys.add(nextKey);

              const previousItem = previousEntries.find(item => item.id === change.doc.id);
              const previousKey = String(previousItem?.datetime || "").slice(0, 10);
              if (previousKey) changedKeys.add(previousKey);
            });
            checkThreshold(previousEntries, nextEntries, changedKeys);
          }

          entries = nextEntries;
          snapshotReady = true;
        },
        error => console.error("Não foi possível acompanhar o alerta de 70%", error)
      );
    });
  }

  init().catch(error => console.error("Falha ao carregar alerta de 70%", error));
})();
