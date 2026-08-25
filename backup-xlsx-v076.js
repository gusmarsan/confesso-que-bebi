(() => {
  if (window.__cqbExportCsvLoaded) return;
  window.__cqbExportCsvLoaded = true;

  const FIREBASE_VERSION = "12.16.0";
  const $ = selector => document.querySelector(selector);
  const DRINK_TYPES = [
    ["cerveja", "Cerveja"],
    ["vinho-tinto", "Vinho tinto"],
    ["vinho-branco", "Vinho branco"],
    ["espumante", "Espumante"],
    ["cachaca", "Cachaça"],
    ["vodka", "Vodka"],
    ["whisky", "Whisky"],
    ["gin", "Gin"],
    ["campari", "Campari"],
    ["xeque-mate", "Xeque-Mate"],
    ["bebida-estranha", "Bebida estranha"],
    ["outro", "Outro"]
  ];

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

  function parseDateTime(value) {
    const text = String(value || "").trim();
    let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}`;
    match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
    return "";
  }

  function formatNumber(value, maximumFractionDigits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return number.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits
    });
  }

  function parseNumber(value) {
    const text = String(value ?? "").trim().replace(/\s/g, "");
    if (!text) return 0;
    const normalized = text.includes(",")
      ? text.replace(/\./g, "").replace(",", ".")
      : text;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");
  }

  function drinkTypeFromName(name) {
    const normalized = normalizeText(name);
    return DRINK_TYPES.find(([, label]) => normalizeText(label) === normalized)?.[0] || "outro";
  }

  function csvCell(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function detectDelimiter(text) {
    const firstLine = String(text || "").split(/\r?\n/, 1)[0] || "";
    let semicolons = 0;
    let commas = 0;
    let quoted = false;
    for (let index = 0; index < firstLine.length; index += 1) {
      const char = firstLine[index];
      if (char === '"') {
        if (quoted && firstLine[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && char === ";") semicolons += 1;
      else if (!quoted && char === ",") commas += 1;
    }
    return semicolons >= commas ? ";" : ",";
  }

  function parseCsv(text) {
    const source = String(text || "").replace(/^\uFEFF/, "");
    const delimiter = detectDelimiter(source);
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === delimiter) {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    if (cell.length || row.length) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
    }
    return rows.filter(item => item.some(value => String(value).trim()));
  }

  function rowsFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) return [];

    const headers = rows[0].map(value => normalizeText(value));
    const column = (...names) => names
      .map(name => headers.indexOf(normalizeText(name)))
      .find(index => index >= 0) ?? -1;

    const indexes = {
      datetime: column("Data e hora", "Data/hora", "Data"),
      beverage: column("Bebida"),
      volume: column("Volume (ml)", "Volume"),
      abv: column("Teor alcoólico (%)", "Teor alcoólico", "ABV"),
      count: column("Quantidade"),
      grams: column("Álcool (g)", "Alcool (g)"),
      doses: column("Doses"),
      id: column("ID")
    };

    if (indexes.datetime < 0 || indexes.beverage < 0 || indexes.volume < 0 || indexes.abv < 0 || indexes.count < 0) {
      throw new Error("A planilha não tem as colunas esperadas do Confesso que bebi.");
    }

    return rows.slice(1).map(values => {
      const datetime = parseDateTime(values[indexes.datetime]);
      const typeName = String(values[indexes.beverage] || "Outro").trim() || "Outro";
      const volume = parseNumber(values[indexes.volume]);
      const abv = parseNumber(values[indexes.abv]);
      const count = parseNumber(values[indexes.count]);
      const calculatedGrams = volume * count * (abv / 100) * 0.789;
      const grams = indexes.grams >= 0 ? parseNumber(values[indexes.grams]) : calculatedGrams;
      const doses = indexes.doses >= 0 ? parseNumber(values[indexes.doses]) : grams / 10;
      return {
        id: indexes.id >= 0 ? String(values[indexes.id] || "").trim() : "",
        datetime,
        type: drinkTypeFromName(typeName),
        typeName,
        volume,
        abv,
        count,
        grams,
        doses
      };
    }).filter(item => item.datetime && item.volume > 0 && item.abv >= 0 && item.count > 0);
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

  async function restoreCsv(file) {
    if (!file) return;
    const input = $("#cqbCsvRestoreInput");

    try {
      const text = await file.text();
      const rows = rowsFromCsv(text);
      if (!rows.length) throw new Error("Nenhum registro válido foi encontrado na planilha.");

      const { auth, db, firestoreModule } = await getFirebase();
      const user = auth.currentUser;
      if (!user) throw new Error("Entre na conta antes de enviar a planilha.");

      const accepted = confirm(
        `Restaurar ${rows.length} ${rows.length === 1 ? "registro" : "registros"} desta planilha?\n\n` +
        "Registros com o mesmo ID serão atualizados. Os demais dados da conta serão mantidos."
      );
      if (!accepted) return;

      showToast("Restaurando registros…", 6000);
      const collectionRef = firestoreModule.collection(db, "users", user.uid, "drinkEntries");

      for (let index = 0; index < rows.length; index += 400) {
        const batch = firestoreModule.writeBatch(db);
        rows.slice(index, index + 400).forEach(item => {
          const reference = item.id
            ? firestoreModule.doc(collectionRef, item.id)
            : firestoreModule.doc(collectionRef);
          batch.set(reference, {
            datetime: item.datetime,
            type: item.type,
            typeName: item.typeName,
            volume: item.volume,
            abv: item.abv,
            count: item.count,
            grams: item.grams,
            doses: item.doses,
            createdAt: Date.now(),
            updatedAt: firestoreModule.serverTimestamp()
          }, { merge: true });
        });
        await batch.commit();
      }

      showToast(`Planilha restaurada: ${rows.length} registros.`, 4200);
    } catch (error) {
      console.error("Falha ao restaurar CSV", error);
      showToast(error?.message || "Não foi possível restaurar a planilha.", 4200);
    } finally {
      if (input) input.value = "";
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

    let restoreButton = $("#restoreCsv");
    if (!restoreButton) {
      restoreButton = document.createElement("button");
      restoreButton.id = "restoreCsv";
      restoreButton.type = "button";
      restoreButton.className = "hero-action";
      restoreButton.textContent = "Enviar planilha";
      restoreButton.setAttribute("aria-label", "Enviar CSV para restaurar registros");
      exportButton.insertAdjacentElement("afterend", restoreButton);
    }

    let input = $("#cqbCsvRestoreInput");
    if (!input) {
      input = document.createElement("input");
      input.id = "cqbCsvRestoreInput";
      input.type = "file";
      input.accept = ".csv,text/csv";
      input.hidden = true;
      document.body.appendChild(input);
    }

    restoreButton.addEventListener("click", () => input.click());
    input.addEventListener("change", () => restoreCsv(input.files?.[0]));

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
