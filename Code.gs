/** =========================
 *  SHEET INTAKE WEBAPP
 *  Backend – Code.gs
 *  Suporta CSV / XLS / XLSX
 *  ========================= */

const APP = {
  CONFIG_SHEET_NAME: "CONFIG",
  LOG_SHEET_NAME: "LOG_IMPORT",
  MAX_CELLS_PER_WRITE: 50000,
};

/* =========================
 * ENTRY
 * ========================= */
function doGet() {
  ensureBootstrap_();
  return HtmlService.createTemplateFromFile("index")
    .evaluate()
    .setTitle("Sheet Intake");
}

function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* =========================
 * BOOT
 * ========================= */
function api_getBoot() {
  ensureBootstrap_();
  return {
    ok: true,
    rules: loadRules_(),
    prefs: getUserPrefs_(),
    sheets: getBaseSheets_(),
    ts: new Date().toISOString(),
  };
}

/* =========================
 * INGEST FILE
 * ========================= */
function api_ingestFile(payload) {
  if (!payload?.name || (!payload?.base64 && !payload?.values)) {
    throw new Error("Arquivo inválido.");
  }

  ensureBootstrap_();

  const fileName = String(payload.name);
  const mime = String(payload.mime || "");

  let values;
  let meta = {};

  try {
    if (payload.values && Array.isArray(payload.values)) {
      values = payload.values;
      meta.sourceType = String(payload.sourceType || "XLSX");
    } else if (isCsv_(fileName, mime)) {
      const bytes = Utilities.base64Decode(payload.base64);
      const text = Utilities.newBlob(bytes).getDataAsString("UTF-8");
      values = Utilities.parseCsv(text);
      meta.sourceType = "CSV";
    } else if (isExcel_(fileName, mime)) {
      throw new Error("Formato Excel inválido no upload. Recarregue o arquivo.");
    } else {
      throw new Error("Formato não suportado. Use CSV.");
    }

  } catch (e) {
    throw new Error("Erro ao processar arquivo: " + e.message);
  }

  const suggestion = suggestRoute_(fileName, values);
  const preview = buildPreview_(values);

  return {
    ok: true,
    file: { name: fileName, size: payload.size || bytes.length },
    meta,
    suggestion,
    preview,
  };
}

/* =========================
 * COMMIT
 * ========================= */
function api_commitImport(req) {
  if (!req?.values || !req?.route) {
    throw new Error("Payload inválido.");
  }

  const start = Date.now();
  let values = standardizeValues_(req.values, req.standardize || {});

  const route = req.route;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sh = ss.getSheetByName(route.targetSheetName);

  if (!sh) {
    throw new Error("Aba destino não existe.");
  }

  if (route.mode === "REPLACE") {
    sh.clearContents();
    sh.getRange(1, 1, values.length, values[0].length).setValues(values);
  } else {
    appendChunked_(sh, values);
  }

  if (req.remember?.dontAskAgain) {
    saveUserPrefs_({
      lastRoute: route,
      lastStandardize: req.standardize,
    });
  }

  logImport_({
    when: new Date(),
    fileName: req.fileName,
    rows: values.length,
    cols: values[0].length,
    targetSpreadsheetId: ss.getId(),
    targetSheetName: sh.getName(),
    mode: route.mode,
    standardize: JSON.stringify(req.standardize || {}),
    ms: Date.now() - start,
  });

  return {
    ok: true,
    wrote: { rows: values.length, cols: values[0].length },
    target: { spreadsheetId: ss.getId(), sheetName: sh.getName() },
    tookMs: Date.now() - start,
  };
}

/* =========================
 * FORMAT DETECTION
 * ========================= */
function isCsv_(name, mime) {
  const n = String(name).toLowerCase();
  return n.endsWith(".csv") || (mime && mime.includes("csv"));
}

function isExcel_(name, mime) {
  const n = String(name).toLowerCase();
  return (
    n.endsWith(".xls") ||
    n.endsWith(".xlsx") ||
    (mime && (mime.includes("excel") || mime.includes("spreadsheetml")))
  );
}

/* =========================
 * PREVIEW
 * ========================= */
function buildPreview_(values) {
  const maxRows = 15;
  const maxCols = 12;

  const header = (values[0] || []).slice(0, maxCols).map(v => String(v ?? ""));
  const rows = values.slice(1, maxRows + 1).map(r => r.slice(0, maxCols));

  return {
    header,
    rows,
    fullValues: values,
  };
}

/* =========================
 * STANDARDIZATION
 * ========================= */
function standardizeValues_(values, opt) {
  let v = values.map(r => r.map(c => c));

  if (opt.trimCells) {
    v = v.map(r => r.map(c => typeof c === "string" ? c.trim() : c));
  }

  if (opt.removeEmptyRows) {
    v = v.filter(r => r.some(c => String(c ?? "").trim() !== ""));
  }

  if (opt.removeEmptyCols) {
    const cols = Math.max(...v.map(r => r.length));
    const keep = [];
    for (let c = 0; c < cols; c++) {
      if (v.some(r => String(r[c] ?? "").trim() !== "")) keep.push(c);
    }
    v = v.map(r => keep.map(c => r[c] ?? ""));
  }

  if (opt.normalizeHeaders && v.length) {
    v[0] = v[0].map(h =>
      String(h || "COL")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase()
    );
  }

  return v;
}

/* =========================
 * WRITE HELPERS
 * ========================= */
function appendChunked_(sheet, values) {
  const cols = values[0].length;
  const chunkSize = Math.floor(APP.MAX_CELLS_PER_WRITE / cols) || 1;

  let i = 0;
  while (i < values.length) {
    const chunk = values.slice(i, i + chunkSize);
    sheet.getRange(sheet.getLastRow() + 1, 1, chunk.length, cols).setValues(chunk);
    i += chunkSize;
  }
}

/* =========================
 * RULES / CONFIG
 * ========================= */
function loadRules_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(APP.CONFIG_SHEET_NAME);
  const [head, ...rows] = sh.getDataRange().getValues();

  const idx = {};
  head.forEach((h, i) => idx[h] = i);

  return rows
    .filter(r => r[idx.KEY])
    .map(r => ({
      key: r[idx.KEY],
      keywords: String(r[idx.KEYWORDS] || "").split(";").map(s => s.trim()),
      targetSpreadsheetId: r[idx.TARGET_SPREADSHEET_ID],
      targetSheet: r[idx.TARGET_SHEET],
      mode: r[idx.MODE],
    }));
}

function suggestRoute_(fileName, values) {
  const rules = loadRules_();
  const hay = (fileName + " " + (values[0] || []).join(" ")).toLowerCase();

  let best = null;
  let score = 0;

  for (const r of rules) {
    let s = 0;
    r.keywords.forEach(k => {
      if (hay.includes(k.toLowerCase())) s += 10;
    });
    if (s > score) {
      score = s;
      best = r;
    }
  }

  return best
    ? {
        match: best.key,
        score,
        route: {
          targetSheetName: best.targetSheet,
          mode: best.mode,
        }
      }
    : { match: "default", score: 0 };
}

/* =========================
 * BOOTSTRAP CHECK
 * ========================= */
function ensureBootstrap_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(APP.CONFIG_SHEET_NAME)) {
    throw new Error("Planilha base não inicializada. Rode o bootstrap.");
  }
}

/* =========================
 * BASE SHEETS
 * ========================= */
function getBaseSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().map(sh => sh.getName());
}

/* =========================
 * PREFS / LOG
 * ========================= */

function getUserPrefs_() {
  const raw = PropertiesService.getUserProperties().getProperty("prefs");
  return raw ? JSON.parse(raw) : {};
}

function saveUserPrefs_(obj) {
  PropertiesService.getUserProperties().setProperty("prefs", JSON.stringify(obj));
}

function logImport_(row) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APP.LOG_SHEET_NAME);
  sh.appendRow([
    row.when,
    row.fileName,
    row.rows,
    row.cols,
    row.targetSpreadsheetId,
    row.targetSheetName,
    row.mode,
    row.standardize,
    row.ms,
  ]);
}
