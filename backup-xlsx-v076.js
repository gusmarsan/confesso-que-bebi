(() => {
  if (window.__cqbBackupXlsxV076Loaded) return;
  window.__cqbBackupXlsxV076Loaded = true;

  const FIREBASE_VERSION = "12.16.0";
  const APP_VERSION = "0.7.6";
  const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  const BACKUP_TYPE = "confesso-que-bebi-backup";
  const BACKUP_FORMAT_VERSION = "1";
  const COLLECTIONS = [
    { name: "drinkEntries", sheet: "Registros" },
    { name: "atypicalWeeks", sheet: "Ajustes" }
  ];

  const $ = selector => document.querySelector(selector);

  function showToast(message, duration = 2800) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.__cqbBackupToastTimer);
    window.__cqbBackupToastTimer = setTimeout(() => toast.classList.remove("show"), duration);
  }

  function formatFileStamp(date = new Date()) {
    const pad = value => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
  }

  async function loadXlsx() {
    if (window.XLSX) return window.XLSX;
    const existing = document.querySelector(`script[data-cqb-xlsx="${XLSX_URL}"]`);
    if (existing) {
      await new Promise((resolve, reject) => {
        if (window.XLSX) return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
      return window.XLSX;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = XLSX_URL;
      script.async = true;
      script.dataset.cqbXlsx = XLSX_URL;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("Não foi possível carregar o gerador de Excel.")), { once: true });
      document.head.appendChild(script);
    });

    if (!window.XLSX) throw new Error("Biblioteca de Excel indisponível.");
    return window.XLSX;
  }

  function encodePortable(value) {
    if (value === null || value === undefined) return value ?? null;
    if (typeof value !== "object") return value;

    if (typeof value.toDate === "function" && Number.isFinite(value.seconds)) {
      return { __cqbType: "timestamp", iso: value.toDate().toISOString() };
    }

    if (Array.isArray(value)) return value.map(encodePortable);

    const result = {};
    Object.entries(value).forEach(([key, item]) => {
      result[key] = encodePortable(item);
    });
    return result;
  }

  function decodePortable(value, firestoreModule) {
    if (value === null || value === undefined || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(item => decodePortable(item, firestoreModule));

    if (value.__cqbType === "timestamp" && value.iso) {
      return firestoreModule.Timestamp.fromDate(new Date(value.iso));
    }

    const result = {};
    Object.entries(value).forEach(([key, item]) => {
      result[key] = decodePortable(item, firestoreModule);
    });
    return result;
  }

  function readableCell(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
    if (typeof value?.toDate === "function" && Number.isFinite(value.seconds)) return value.toDate().toISOString();
    try {
      return JSON.stringify(encodePortable(value));
    } catch {
      return String(value);
    }
  }

  function docsToRows(docs) {
    const fieldNames = new Set();
    docs.forEach(item => Object.keys(item.data()).forEach(key => fieldNames.add(key)));
    const fields = [...fieldNames].sort((a, b) => a.localeCompare(b, "pt-BR"));

    const rows = docs.map(item => {
      const data = item.data();
      const row = { id: item.id };
      fields.forEach(field => {
        row[field] = readableCell(data[field]);
      });
      row.dados_json = JSON.stringify(encodePortable(data));
      return row;
    });

    return { rows, header: ["id", ...fields, "dados_json"] };
  }

  function setColumnWidths(sheet, header) {
    sheet["!cols"] = header.map(name => {
      if (name === "dados_json") return { wch: 46 };
      if (name === "datetime") return { wch: 24 };
      if (name === "id") return { wch: 24 };
      return { wch: Math.min(28, Math.max(12, String(name).length + 3)) };
    });
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
      authModule,
      firestoreModule,
      auth: authModule.getAuth(app),
      db: firestoreModule.getFirestore(app)
    };
  }

  async function exportBackup() {
    const button = $("#weekReport");
    const originalText = button?.textContent || "Backup Excel";
    if (button) {
      button.disabled = true;
      button.textContent = "Gerando backup…";
    }

    try {
      const XLSX = await loadXlsx();
      const { auth, db, firestoreModule } = await getFirebase();
      const user = auth.currentUser;
      if (!user) throw new Error("Entre na conta antes de gerar o backup.");

      const snapshots = {};
      for (const definition of COLLECTIONS) {
        snapshots[definition.name] = await firestoreModule.getDocs(
          firestoreModule.collection(db, "users", user.uid, definition.name)
        );
      }

      const workbook = XLSX.utils.book_new();
      const metadata = [
        ["chave", "valor"],
        ["tipo", BACKUP_TYPE],
        ["formato", BACKUP_FORMAT_VERSION],
        ["versao_app", APP_VERSION],
        ["criado_em", new Date().toISOString()],
        ["uid", user.uid],
        ["email", user.email || ""],
        ["registros", snapshots.drinkEntries.size],
        ["ajustes", snapshots.atypicalWeeks.size],
        ["observacao", "A coluna dados_json é usada para restauração. Não a edite se quiser manter o backup recuperável."]
      ];
      const metadataSheet = XLSX.utils.aoa_to_sheet(metadata);
      metadataSheet["!cols"] = [{ wch: 20 }, { wch: 72 }];
      XLSX.utils.book_append_sheet(workbook, metadataSheet, "Backup");

      for (const definition of COLLECTIONS) {
        const docs = snapshots[definition.name].docs;
        const { rows, header } = docsToRows(docs);
        const sheet = XLSX.utils.json_to_sheet(rows, { header });
        setColumnWidths(sheet, header);
        XLSX.utils.book_append_sheet(workbook, sheet, definition.sheet);
      }

      const filename = `confesso-que-bebi_backup_${formatFileStamp()}.xlsx`;
      XLSX.writeFile(workbook, filename, { compression: true });
      showToast(`Backup salvo: ${snapshots.drinkEntries.size} registros.`);
    } catch (error) {
      console.error("Falha ao gerar backup Excel", error);
      showToast(error?.message || "Não foi possível gerar o backup Excel.", 3600);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function metadataFromWorkbook(XLSX, workbook) {
    const sheet = workbook.Sheets.Backup;
    if (!sheet) return {};
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const result = {};
    rows.slice(1).forEach(row => {
      const key = String(row[0] || "").trim();
      if (key) result[key] = row[1];
    });
    return result;
  }

  function restoreRows(XLSX, workbook, sheetName) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false })
      .filter(row => String(row.id || "").trim() && String(row.dados_json || "").trim());
  }

  async function commitRows(rows, collectionName, user, db, firestoreModule) {
    const chunkSize = 400;
    let written = 0;

    for (let index = 0; index < rows.length; index += chunkSize) {
      const batch = firestoreModule.writeBatch(db);
      const chunk = rows.slice(index, index + chunkSize);
      chunk.forEach(row => {
        const id = String(row.id).trim();
        const portable = JSON.parse(String(row.dados_json));
        const data = decodePortable(portable, firestoreModule);
        const reference = firestoreModule.doc(
          firestoreModule.collection(db, "users", user.uid, collectionName),
          id
        );
        batch.set(reference, data);
      });
      await batch.commit();
      written += chunk.length;
    }

    return written;
  }

  async function restoreBackup(file) {
    if (!file) return;
    const input = $("#cqbBackupRestoreInput");

    try {
      const XLSX = await loadXlsx();
      const { auth, db, firestoreModule } = await getFirebase();
      const user = auth.currentUser;
      if (!user) throw new Error("Entre na conta antes de restaurar um backup.");

      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: "array" });
      const metadata = metadataFromWorkbook(XLSX, workbook);
      if (metadata.tipo !== BACKUP_TYPE || String(metadata.formato) !== BACKUP_FORMAT_VERSION) {
        throw new Error("Este arquivo não é um backup compatível do Confesso que bebi.");
      }

      const entryRows = restoreRows(XLSX, workbook, "Registros");
      const settingRows = restoreRows(XLSX, workbook, "Ajustes");
      if (!entryRows.length && !settingRows.length) throw new Error("O backup não contém dados para restaurar.");

      const accountWarning = metadata.uid && metadata.uid !== user.uid
        ? "\n\nAtenção: o backup foi criado em outra conta."
        : "";
      const accepted = confirm(
        `Restaurar ${entryRows.length} registros e ${settingRows.length} ajustes?\n\n` +
        "A restauração mescla o backup com a conta atual. IDs iguais serão substituídos; outros dados existentes serão mantidos." +
        accountWarning
      );
      if (!accepted) return;

      showToast("Restaurando backup…", 6000);
      const restoredEntries = await commitRows(entryRows, "drinkEntries", user, db, firestoreModule);
      const restoredSettings = await commitRows(settingRows, "atypicalWeeks", user, db, firestoreModule);
      showToast(`Backup restaurado: ${restoredEntries} registros e ${restoredSettings} ajustes.`, 4200);
      setTimeout(() => location.reload(), 1200);
    } catch (error) {
      console.error("Falha ao restaurar backup Excel", error);
      showToast(error?.message || "Não foi possível restaurar o backup.", 4200);
    } finally {
      if (input) input.value = "";
    }
  }

  function installStyles() {
    if ($("#cqb-backup-xlsx-style")) return;
    const style = document.createElement("style");
    style.id = "cqb-backup-xlsx-style";
    style.textContent = `
      #restoreBackupExcel{white-space:nowrap}
      #cqbBackupRestoreInput{display:none!important}
      @media(max-width:640px){
        .hero-actions{flex-wrap:wrap;justify-content:flex-end}
        #restoreBackupExcel{font-size:.68rem;padding-inline:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function installUi() {
    const exportButton = $("#weekReport");
    if (!exportButton) return false;
    if (exportButton.dataset.cqbBackupXlsx === "1") return true;

    exportButton.dataset.cqbBackupXlsx = "1";
    exportButton.textContent = "Backup Excel";
    exportButton.setAttribute("aria-label", "Baixar backup completo em Excel");
    exportButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportBackup();
    }, true);

    let restoreButton = $("#restoreBackupExcel");
    if (!restoreButton) {
      restoreButton = document.createElement("button");
      restoreButton.id = "restoreBackupExcel";
      restoreButton.type = "button";
      restoreButton.className = "hero-action";
      restoreButton.textContent = "Restaurar backup";
      restoreButton.setAttribute("aria-label", "Restaurar dados de um backup Excel");
      exportButton.insertAdjacentElement("afterend", restoreButton);
    }

    let input = $("#cqbBackupRestoreInput");
    if (!input) {
      input = document.createElement("input");
      input.id = "cqbBackupRestoreInput";
      input.type = "file";
      input.accept = ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
      document.body.appendChild(input);
    }

    restoreButton.addEventListener("click", () => input.click());
    input.addEventListener("change", () => restoreBackup(input.files?.[0]));
    return true;
  }

  function init() {
    installStyles();
    if (installUi()) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installUi() || attempts >= 100) clearInterval(timer);
    }, 100);
  }

  init();
})();
