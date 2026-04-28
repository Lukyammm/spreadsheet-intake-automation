/** =========================
 *  SHEET INTAKE WEBAPP
 *  Backend – Code.gs
 *  Suporta CSV / XLS / XLSX
 *  ========================= */

const APP = {
  LOG_SHEET_NAME: "LOG_IMPORT",
  MAX_CELLS_PER_WRITE: 50000,
  DESTINATIONS_KEY: "destinations_v1",
  RULES_KEY: "rules_v1",
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
  const destinations = getDestinations_();
  const selectedSpreadsheetId = (destinations[0] && destinations[0].spreadsheetId) || SpreadsheetApp.getActiveSpreadsheet().getId();

  return {
    ok: true,
    rules: loadRules_(),
    prefs: getUserPrefs_(),
    destinations,
    sheets: getSheetsBySpreadsheetId_(selectedSpreadsheetId),
    ts: new Date().toISOString(),
  };
}

function api_listSheets(spreadsheetId) {
  if (!spreadsheetId) throw new Error("Spreadsheet ID é obrigatório.");
  return {
    ok: true,
    sheets: getSheetsBySpreadsheetId_(spreadsheetId),
  };
}

function api_saveDestination(payload) {
  const name = String(payload?.name || "").trim();
  const spreadsheetId = String(payload?.spreadsheetId || "").trim();
  if (!name || !spreadsheetId) {
    throw new Error("Nome e Spreadsheet ID são obrigatórios.");
  }

  const ss = openSpreadsheet_(spreadsheetId);
  const destinations = getDestinations_().filter(d => d.spreadsheetId !== spreadsheetId);
  destinations.push({
    id: Utilities.getUuid(),
    name,
    spreadsheetId,
    spreadsheetName: ss.getName(),
  });
  saveDestinations_(destinations);

  return { ok: true, destinations };
}

function api_deleteDestination(payload) {
  const spreadsheetId = String(payload?.spreadsheetId || "").trim();
  if (!spreadsheetId) throw new Error("Spreadsheet ID é obrigatório.");

  const destinations = getDestinations_().filter(d => d.spreadsheetId !== spreadsheetId);
  saveDestinations_(destinations);

  const rules = loadRules_().filter(r => r.targetSpreadsheetId !== spreadsheetId);
  saveRules_(rules);

  return { ok: true, destinations, rules };
}

function api_saveRule(payload) {
  const key = String(payload?.key || "").trim();
  const keywords = String(payload?.keywords || "")
    .split(";")
    .map(s => s.trim())
    .filter(Boolean);
  const targetSpreadsheetId = String(payload?.targetSpreadsheetId || "").trim();
  const targetSheet = String(payload?.targetSheet || "").trim();
  const mode = String(payload?.mode || "APPEND").toUpperCase();

  if (!key || !keywords.length || !targetSpreadsheetId || !targetSheet) {
    throw new Error("Preencha chave, palavras-chave, planilha e aba.");
  }
  if (!["APPEND", "REPLACE"].includes(mode)) {
    throw new Error("Modo inválido.");
  }

  const targetSs = openSpreadsheet_(targetSpreadsheetId);
  if (!targetSs.getSheetByName(targetSheet)) {
    throw new Error("A aba informada não existe na planilha destino.");
  }

  const rules = loadRules_().filter(r => r.key !== key);
  rules.push({
    key,
    keywords,
    targetSpreadsheetId,
    targetSheet,
    mode,
  });
  saveRules_(rules);
  return { ok: true, rules };
}

function api_deleteRule(payload) {
  const key = String(payload?.key || "").trim();
  if (!key) throw new Error("Chave da regra é obrigatória.");

  const rules = loadRules_().filter(r => r.key !== key);
  saveRules_(rules);
  return { ok: true, rules };
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
  let inputSize = Number(payload.size || 0);

  try {
    if (payload.values && Array.isArray(payload.values)) {
      values = payload.values;
      meta.sourceType = String(payload.sourceType || "XLSX");
    } else if (isCsv_(fileName, mime)) {
      const bytes = Utilities.base64Decode(payload.base64);
      inputSize = bytes.length;
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
    file: { name: fileName, size: inputSize },
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
  const targetSpreadsheetId = String(route.targetSpreadsheetId || ss.getId());
  const targetSs = openSpreadsheet_(targetSpreadsheetId);
  let sh = targetSs.getSheetByName(route.targetSheetName);

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
    targetSpreadsheetId: targetSs.getId(),
    targetSheetName: sh.getName(),
    mode: route.mode,
    standardize: JSON.stringify(req.standardize || {}),
    ms: Date.now() - start,
  });

  return {
    ok: true,
    wrote: { rows: values.length, cols: values[0].length },
    target: { spreadsheetId: targetSs.getId(), sheetName: sh.getName() },
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
  const raw = PropertiesService.getScriptProperties().getProperty(APP.RULES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(r => ({
      key: String(r.key || "").trim(),
      keywords: Array.isArray(r.keywords) ? r.keywords.map(k => String(k).trim()).filter(Boolean) : [],
      targetSpreadsheetId: String(r.targetSpreadsheetId || "").trim(),
      targetSheet: String(r.targetSheet || "").trim(),
      mode: String(r.mode || "APPEND").toUpperCase(),
    })).filter(r => r.key && r.keywords.length && r.targetSpreadsheetId && r.targetSheet);
  } catch (e) {
    return [];
  }
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
          targetSpreadsheetId: best.targetSpreadsheetId,
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
  if (!ss.getSheetByName(APP.LOG_SHEET_NAME)) {
    const sh = ss.insertSheet(APP.LOG_SHEET_NAME);
    sh.appendRow(["when", "fileName", "rows", "cols", "targetSpreadsheetId", "targetSheetName", "mode", "standardize", "ms"]);
  }
}

/* =========================
 * BASE SHEETS
 * ========================= */
function getBaseSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets().map(sh => sh.getName());
}

function getSheetsBySpreadsheetId_(spreadsheetId) {
  return openSpreadsheet_(spreadsheetId).getSheets().map(sh => sh.getName());
}

function getDestinations_() {
  const raw = PropertiesService.getScriptProperties().getProperty(APP.DESTINATIONS_KEY);
  if (!raw) return seedDestinations_();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return seedDestinations_();
    return parsed;
  } catch (e) {
    return seedDestinations_();
  }
}

function saveDestinations_(destinations) {
  PropertiesService.getScriptProperties().setProperty(APP.DESTINATIONS_KEY, JSON.stringify(destinations));
}

function saveRules_(rules) {
  PropertiesService.getScriptProperties().setProperty(APP.RULES_KEY, JSON.stringify(rules));
}

function openSpreadsheet_(spreadsheetId) {
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    throw new Error("Não foi possível abrir a planilha destino. Verifique o ID e permissões.");
  }
}

function seedDestinations_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  const seed = [{
    id: Utilities.getUuid(),
    name: "Planilha atual",
    spreadsheetId: active.getId(),
    spreadsheetName: active.getName(),
  }];
  saveDestinations_(seed);
  return seed;
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
