(() => {
  if (window.__cqbBackupXlsxV076Loaded) return;
  window.__cqbBackupXlsxV076Loaded = true;

  const FIREBASE_VERSION = "12.16.0";
  const APP_VERSION = "0.7.6";
  const BACKUP_TYPE = "confesso-que-bebi-backup";
  const BACKUP_FORMAT_VERSION = 1;
  const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  const ENTRY_COLLECTION = "drinkEntries";
  const SETTINGS_COLLECTION = "atypicalWeeks";
  const $ = selector => document.querySelector(selector);

  let xlsxPromise = null;

  function showToast(message, duration = 3200) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__cqbBackupXlsxToastTimer);
    window.__cqbBackupXlsxToastTimer = setTimeout(() => toast.classList.remove("show"), duration);
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

  function parseDateTime(value) {
    const text = String(value || "").trim();
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}`;
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
    return text;
  }

  function asNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const text = String(value ?? "").trim().replace(/\s/g, "");
    if (!text) return 0;
    const normalized = text.includes(",")
      ? text.replace(/\./g, "").replace(",", ".")
      : text;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  }

  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxPromise) return xlsxPromise;

    xlsxPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = XLSX_URL;
      script.async = true;
      script.onload = () => window.XLSX
        ? resolve(window.XLSX)
        : reject(new Error("A biblioteca do Excel não foi carregada."));
      script.onerror = () => reject(new Error("Não foi possível carregar o recurso necessário para gerar o Excel."));
      document.head.appendChild(script);
    });

    return xlsxPromise;
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

  function serializeValue(value) {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    if (value instanceof Date) return { __cqbType: "date", value: value.toISOString() };
    if (typeof value?.toDate === "function") {
      try {
        return { __cqbType: "timestamp", value: value.toDate().toISOString() };
      } catch {
        return null;
      }
    }
    if (Array.isArray(value)) return value.map(serializeValue);
    if (typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeValue(item)]));
    }
    return String(value);
  }

  function deserializeValue(value, firestoreModule) {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(item => deserializeValue(item, firestoreModule));
    if (typeof value === "object") {
      if (value.__cqbType === "timestamp" && value.value) {
        const date = new Date(value.value);
        return Number.isNaN(date.getTime()) ? null : firestoreModule.Timestamp.fromDate(date);
      }
      if (value.__cqbType === "date" && value.value) {
        const date = new Date(value.value);
        return Number.isNaN(date.getTime()) ? null : date;
      }
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deserializeValue(item, firestoreModule)]));
    }
    return value;
  }

  function recoveryJson(data) {
    return JSON.stringify(serializeValue(data));
  }

  function parseRecoveryJson(value, firestoreModule) {
    const text = String(value || "").trim();
    if (!text) return null;
    try {
      return deserializeValue(JSON.parse(text), firestoreModule);
    } catch {
      throw new Error("O arquivo contém uma linha de recuperação inválida.");
    }
  }

  function buildEntriesSheet(XLSX, docs) {
    const header = [
      "ID",
      "Data e hora",
      "Data ISO",
      "Bebida",
      "Tipo",
      "Volume (ml)",
      "Teor alcoólico (%)",
      "Quantidade",
      "Álcool (g)",
      "Doses",
      "Dados de recuperação"
    ];

    const rows = docs.map(({ id, data }) => [
      id,
      formatDateTime(data.datetime),
      String(data.datetime || ""),
      data.typeName || data.type || "",
      data.type || "",
      asNumber(data.volume),
      asNumber(data.abv),
      asNumber(data.count),
      asNumber(data.grams),
      asNumber(data.doses),
      recoveryJson(data)
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    sheet["!cols"] = [
      { wch: 24 }, { wch: 18 }, { wch: 19 }, { wch: 22 }, { wch: 18 },
      { wch: 13 }, { wch: 19 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 3, hidden: true }
    ];
    sheet["!autofilter"] = { ref: `A1:K${Math.max(1, rows.length + 1)}` };
    return sheet;
  }

  function buildSettingsSheet(XLSX, docs) {
    const header = [
      "ID",
      "Chave",
      "Tipo",
      "Dia atípico",
      "Semana oculta",
      "Dados de recuperação"
    ];

    const rows = docs.map(({ id, data }) => [
      id,
      data.key || "",
      data.kind || (id.startsWith("day-") ? "day" : id.startsWith("hidden-week-") ? "hidden-week" : "setting"),
      data.atypical === true ? "Sim" : data.atypical === false ? "Não" : "",
      data.hidden === true ? "Sim" : data.hidden === false ? "Não" : "",
      recoveryJson(data)
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    sheet["!cols"] = [
      { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 3, hidden: true }
    ];
    sheet["!autofilter"] = { ref: `A1:F${Math.max(1, rows.length + 1)}` };
    return sheet;
  }

  function buildMetadataSheet(XLSX, user, entriesCount, settingsCount) {
    const rows = [
      ["Campo", "Valor"],
      ["Formato", BACKUP_TYPE],
      ["Versão do formato", BACKUP_FORMAT_VERSION],
      ["Versão do app", APP_VERSION],
      ["Gerado em", new Date().toISOString()],
      ["Conta", user.email || ""],
      ["Registros", entriesCount],
      ["Ajustes", settingsCount],
      ["Observação", "As colunas visíveis são para consulta. A coluna oculta 'Dados de recuperação' preserva o conteúdo necessário para restaurar o app."]
    ];

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 24 }, { wch: 92 }];
    return sheet;
  }

  async function exportXlsx() {
    const button = $("#weekReport");
    const originalText = button?.textContent || "Backup Excel";

    if (button) {
      button.disabled = true;
      button.textContent = "Gerando Excel…";
    }

    try {
      const [XLSX, firebase] = await Promise.all([loadXlsx(), getFirebase()]);
      const { auth, db, firestoreModule } = firebase;
      const user = auth.currentUser;
      if (!user) throw new Error("Entre na conta antes de gerar o backup.");

      const [entriesSnapshot, settingsSnapshot] = await Promise.all([
        firestoreModule.getDocs(firestoreModule.collection(db, "users", user.uid, ENTRY_COLLECTION)),
        firestoreModule.getDocs(firestoreModule.collection(db, "users", user.uid, SETTINGS_COLLECTION))
      ]);

      const entries = entriesSnapshot.docs
        .map(item => ({ id: item.id, data: item.data() }))
        .sort((a, b) => String(a.data.datetime || "").localeCompare(String(b.data.datetime || "")));
      const settings = settingsSnapshot.docs
        .map(item => ({ id: item.id, data: item.data() }))
        .sort((a, b) => a.id.localeCompare(b.id));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, buildEntriesSheet(XLSX, entries), "Registros");
      XLSX.utils.book_append_sheet(workbook, buildSettingsSheet(XLSX, settings), "Ajustes");
      XLSX.utils.book_append_sheet(workbook, buildMetadataSheet(XLSX, user, entries.length, settings.length), "Metadados");

      XLSX.writeFile(workbook, `confesso-que-bebi_backup_${formatFileStamp()}.xlsx`, {
        compression: true,
        bookType: "xlsx"
      });

      showToast(`Backup Excel criado: ${entries.length} registros.`);
    } catch (error) {
      console.error("Falha ao gerar backup Excel", error);
      showToast(error?.message || "Não foi possível gerar o backup Excel.", 4200);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function sheetRows(XLSX, workbook, name) {
    const sheet = workbook.Sheets[name];
    return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true }) : [];
  }

  function readMetadata(XLSX, workbook) {
    const sheet = workbook.Sheets.Metadados;
    if (!sheet) return {};
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
    return Object.fromEntries(rows.slice(1).filter(row => row[0]).map(row => [String(row[0]), row[1]]));
  }

  function entryFromRow(row, firestoreModule) {
    const restored = parseRecoveryJson(row["Dados de recuperação"], firestoreModule);
    const data = restored || {
      datetime: parseDateTime(row["Data ISO"] || row["Data e hora"]),
      typeName: String(row.Bebida || "Outro"),
      type: String(row.Tipo || "outro"),
      volume: asNumber(row["Volume (ml)"]),
      abv: asNumber(row["Teor alcoólico (%)"]),
      count: asNumber(row.Quantidade),
      grams: asNumber(row["Álcool (g)"]),
      doses: asNumber(row.Doses),
      createdAt: Date.now()
    };

    const datetime = String(data?.datetime || "").trim();
    if (!datetime) return null;
    return { id: String(row.ID || "").trim(), data: { ...data, datetime } };
  }

  function settingFromRow(row, firestoreModule) {
    const restored = parseRecoveryJson(row["Dados de recuperação"], firestoreModule);
    if (restored) return { id: String(row.ID || "").trim(), data: restored };

    const id = String(row.ID || "").trim();
    const key = String(row.Chave || "").trim();
    if (!id && !key) return null;

    const data = { key };
    if (String(row["Dia atípico"] || "").toLocaleLowerCase("pt-BR") === "sim") data.atypical = true;
    if (String(row["Semana oculta"] || "").toLocaleLowerCase("pt-BR") === "sim") data.hidden = true;
    if (row.Tipo) data.kind = String(row.Tipo);
    return { id, data };
  }

  async function writeDocsInBatches({ db, firestoreModule, user, collectionName, docs }) {
    const collectionRef = firestoreModule.collection(db, "users", user.uid, collectionName);

    for (let index = 0; index < docs.length; index += 400) {
      const batch = firestoreModule.writeBatch(db);
      docs.slice(index, index + 400).forEach(item => {
        const reference = item.id
          ? firestoreModule.doc(collectionRef, item.id)
          : firestoreModule.doc(collectionRef);
        const data = { ...item.data, updatedAt: firestoreModule.serverTimestamp() };
        batch.set(reference, data);
      });
      await batch.commit();
    }
  }

  async function restoreXlsx(file) {
    if (!file) return;
    const input = $("#cqbBackupRestoreInput");
    const restoreButton = $("#restoreBackupExcel");
    const originalText = restoreButton?.textContent || "Restaurar backup Excel";

    if (restoreButton) {
      restoreButton.disabled = true;
      restoreButton.textContent = "Lendo backup…";
    }

    try {
      const [XLSX, firebase, buffer] = await Promise.all([loadXlsx(), getFirebase(), file.arrayBuffer()]);
      const { auth, db, firestoreModule } = firebase;
      const user = auth.currentUser;
      if (!user) throw new Error("Entre na conta antes de restaurar um backup.");

      const workbook = XLSX.read(buffer, { type: "array" });
      const metadata = readMetadata(XLSX, workbook);
      if (metadata.Formato && metadata.Formato !== BACKUP_TYPE) {
        throw new Error("Este arquivo não é um backup válido do Confesso que bebi.");
      }

      const rawEntries = sheetRows(XLSX, workbook, "Registros");
      const rawSettings = sheetRows(XLSX, workbook, "Ajustes");
      if (!rawEntries.length && !workbook.Sheets.Registros) {
        throw new Error("A aba Registros não foi encontrada no backup.");
      }

      const entries = rawEntries.map(row => entryFromRow(row, firestoreModule)).filter(Boolean);
      const settings = rawSettings.map(row => settingFromRow(row, firestoreModule)).filter(Boolean);
      if (!entries.length && !settings.length) throw new Error("Nenhum dado válido foi encontrado no backup.");

      const accepted = confirm(
        `Restaurar ${entries.length} ${entries.length === 1 ? "registro" : "registros"}` +
        `${settings.length ? ` e ${settings.length} ${settings.length === 1 ? "ajuste" : "ajustes"}` : ""}?\n\n` +
        "Itens com o mesmo ID serão substituídos pelo conteúdo do backup. Os demais dados da conta serão mantidos e nada que não esteja no arquivo será apagado."
      );
      if (!accepted) return;

      if (restoreButton) restoreButton.textContent = "Restaurando…";
      showToast("Restaurando backup Excel…", 8000);

      await writeDocsInBatches({ db, firestoreModule, user, collectionName: ENTRY_COLLECTION, docs: entries });
      await writeDocsInBatches({ db, firestoreModule, user, collectionName: SETTINGS_COLLECTION, docs: settings });

      showToast(`Backup restaurado: ${entries.length} registros.`, 4600);
    } catch (error) {
      console.error("Falha ao restaurar backup Excel", error);
      showToast(error?.message || "Não foi possível restaurar o backup Excel.", 4600);
    } finally {
      if (restoreButton) {
        restoreButton.disabled = false;
        restoreButton.textContent = originalText;
      }
      if (input) input.value = "";
    }
  }

  function injectStyles() {
    if ($("#cqb-backup-xlsx-style")) return;
    const style = document.createElement("style");
    style.id = "cqb-backup-xlsx-style";
    style.textContent = `
      .cqb-backup-restore-row{
        display:flex;justify-content:flex-end;margin:10px 0 2px;
      }
      .cqb-backup-restore-row .secondary{
        min-height:40px;padding:0 13px;font-size:.68rem;
      }
      @media(max-width:520px){
        .cqb-backup-restore-row .secondary{width:100%}
      }
    `;
    document.head.appendChild(style);
  }

  function installUi() {
    const exportButton = $("#weekReport");
    if (!exportButton) return false;
    if (exportButton.dataset.cqbBackupXlsx === "1") return true;

    injectStyles();
    exportButton.dataset.cqbBackupXlsx = "1";
    exportButton.onclick = null;
    exportButton.textContent = "Backup Excel";
    exportButton.setAttribute("aria-label", "Baixar backup Excel com todos os registros");
    exportButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportXlsx();
    }, true);

    $("#restoreCsv")?.remove();
    $("#cqbCsvRestoreInput")?.remove();

    const historyHero = $("#history .history-hero");
    if (historyHero && !$("#cqbBackupRestoreRow")) {
      const row = document.createElement("div");
      row.id = "cqbBackupRestoreRow";
      row.className = "cqb-backup-restore-row";

      const restoreButton = document.createElement("button");
      restoreButton.id = "restoreBackupExcel";
      restoreButton.type = "button";
      restoreButton.className = "secondary";
      restoreButton.textContent = "Restaurar backup Excel";
      restoreButton.setAttribute("aria-label", "Restaurar dados de um backup Excel");
      row.appendChild(restoreButton);
      historyHero.insertAdjacentElement("afterend", row);

      const input = document.createElement("input");
      input.id = "cqbBackupRestoreInput";
      input.type = "file";
      input.accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      input.hidden = true;
      document.body.appendChild(input);

      restoreButton.addEventListener("click", () => input.click());
      input.addEventListener("change", () => restoreXlsx(input.files?.[0]));
    }

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
