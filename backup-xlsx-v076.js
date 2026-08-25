(() => {
  if (window.__cqbExportCsvLoaded) return;
  window.__cqbExportCsvLoaded = true;

  const FIREBASE_VERSION = "12.16.0";
  const $ = selector => document.querySelector(selector);

  function showToast(message, duration = 2800) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__cqbExportCsvToastTimer);
    window.__cqbExportCsvToastTimer = setTimeout(() => toast.classList.remove("show"), duration);
  }

  function formatFileStamp(date = new Date()) {
    const pad = value => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
  }

  function formatDateTime(value) {
    const text = String(value || "");
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return text;
    return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
  }

  function formatNumber(value, maximumFractionDigits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return number.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits
    });
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  async function waitForFirebaseApp(appModule) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        return appModule.getApp();
      } catch {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    throw new Error("Firebase não foi inicializado.");
  }

  async function getFirebase() {
    const appModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
    const authModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`);
    const firestoreModule = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`);
    const app = await waitForFirebaseApp(appModule);
    return {
      auth: authModule.getAuth(app),
      db: firestoreModule.getFirestore(app),
      firestoreModule
    };
  }

  function downloadCsv(rows) {
    const header = [
      "Data e hora",
      "Bebida",
      "Volume (ml)",
      "Teor alcoólico (%)",
      "Quantidade",
      "Álcool (g)",
      "Doses",
      "ID"
    ];

    const lines = [header, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF", lines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `confesso-que-bebi_${formatFileStamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportCsv() {
    const button = $("#weekReport");
    const originalText = button?.textContent || "Exportar CSV";

    if (button) {
      button.disabled = true;
      button.textContent = "Gerando CSV…";
    }

    try {
      const { auth, db, firestoreModule } = await getFirebase();
      const user = auth.currentUser;
      if (!user) throw new Error("Entre na conta antes de exportar os dados.");

      const snapshot = await firestoreModule.getDocs(
        firestoreModule.collection(db, "users", user.uid, "drinkEntries")
      );

      const entries = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(b.datetime || "").localeCompare(String(a.datetime || "")));

      const rows = entries.map(item => [
        formatDateTime(item.datetime),
        item.typeName || item.type || "",
        formatNumber(item.volume),
        formatNumber(item.abv),
        formatNumber(item.count),
        formatNumber(item.grams),
        formatNumber(item.doses),
        item.id
      ]);

      downloadCsv(rows);
      showToast(`CSV exportado: ${entries.length} registros.`);
    } catch (error) {
      console.error("Falha ao exportar CSV", error);
      showToast(error?.message || "Não foi possível exportar o CSV.", 3600);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function installUi() {
    const exportButton = $("#weekReport");
    if (!exportButton) return false;
    if (exportButton.dataset.cqbExportCsv === "1") return true;

    exportButton.dataset.cqbExportCsv = "1";
    exportButton.textContent = "Exportar CSV";
    exportButton.setAttribute("aria-label", "Baixar registros em CSV");
    exportButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportCsv();
    }, true);

    $("#restoreBackupExcel")?.remove();
    $("#cqbBackupRestoreInput")?.remove();
    $("#cqb-backup-xlsx-style")?.remove();

    return true;
  }

  function init() {
    if (installUi()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installUi() || attempts >= 100) clearInterval(timer);
    }, 100);
  }

  init();
})();
