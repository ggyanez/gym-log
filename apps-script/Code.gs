/**
 * Backend de Google Apps Script para la app "Registro de Entrenamientos".
 * Pegar este código en Extensiones > Apps Script del Google Sheet, y
 * seguir los pasos de apps-script/README.md para configurarlo y publicarlo.
 */

var SHEET_REGISTROS = "Registros";
var SHEET_EJERCICIOS = "Ejercicios";
var SHEET_GRUPOS = "Grupos";

function doPost(e) {
  var result;
  try {
    var body = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty("APP_TOKEN");
    if (!expected) {
      throw new Error(
        "APP_TOKEN no configurado. Andá a Configuración del proyecto > Propiedades del script y agregalo."
      );
    }
    if (body.token !== expected) {
      return respond({ ok: false, error: "UNAUTHORIZED" });
    }
    var data = route(body.action, body.payload || {});
    result = { ok: true, data: data };
  } catch (err) {
    result = { ok: false, error: String((err && err.message) || err) };
  }
  return respond(result);
}

function doGet(e) {
  return respond({ ok: true, data: { status: "gym-log API activa" } });
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function route(action, payload) {
  switch (action) {
    case "verify":
      return { verified: true };
    case "getCatalogo":
      return getCatalogo();
    case "getUltimo":
      return getUltimo(payload.ejercicio);
    case "getHoy":
      return getHoy();
    case "addRegistro":
      return addRegistro(payload);
    case "editRegistro":
      return editRegistro(payload);
    case "deleteRegistro":
      return deleteRegistro(payload.row);
    case "addEjercicio":
      return addEjercicio(payload);
    case "updateEjercicio":
      return updateEjercicio(payload);
    case "deleteEjercicio":
      return deleteEjercicio(payload.nombre);
    case "addGrupo":
      return addGrupo(payload);
    case "updateGrupo":
      return updateGrupo(payload);
    case "deleteGrupo":
      return deleteGrupo(payload.nombre);
    default:
      throw new Error("Acción desconocida: " + action);
  }
}

// ---------- helpers ----------

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}
function sheetRegistros() {
  var sh = ss().getSheetByName(SHEET_REGISTROS);
  if (!sh) throw new Error("No existe la hoja '" + SHEET_REGISTROS + "'");
  return sh;
}
function sheetEjercicios() {
  var sh = ss().getSheetByName(SHEET_EJERCICIOS);
  if (!sh) throw new Error("No existe la hoja '" + SHEET_EJERCICIOS + "'");
  return sh;
}
function sheetGrupos() {
  var sh = ss().getSheetByName(SHEET_GRUPOS);
  if (!sh) throw new Error("No existe la hoja '" + SHEET_GRUPOS + "'");
  return sh;
}

function formatFecha(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, ss().getSpreadsheetTimeZone(), "d/M/yyyy");
  }
  return String(value);
}

function findEjercicio(nombre) {
  var values = sheetEjercicios().getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(nombre).trim()) {
      return {
        rowIndex: i + 1,
        nombre: String(values[i][0]),
        grupo: String(values[i][1]),
        sinPeso: values[i][2] === true || values[i][2] === "TRUE",
      };
    }
  }
  return null;
}

function findGrupo(nombre) {
  var values = sheetGrupos().getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(nombre).trim()) return i + 1;
  }
  return null;
}

// ---------- catálogo ----------

function getCatalogo() {
  var ejValues = sheetEjercicios().getDataRange().getValues();
  var ejercicios = [];
  for (var i = 1; i < ejValues.length; i++) {
    if (!ejValues[i][0]) continue;
    ejercicios.push({
      nombre: String(ejValues[i][0]),
      grupo: String(ejValues[i][1]),
      sinPeso: ejValues[i][2] === true || ejValues[i][2] === "TRUE",
    });
  }
  var grValues = sheetGrupos().getDataRange().getValues();
  var grupos = [];
  for (var j = 1; j < grValues.length; j++) {
    if (grValues[j][0]) grupos.push(String(grValues[j][0]));
  }
  return { grupos: grupos, ejercicios: ejercicios };
}

// ---------- registros ----------

function getUltimo(ejercicio) {
  if (!ejercicio) throw new Error("Falta ejercicio");
  var sh = sheetRegistros();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  var values = sh.getRange(2, 1, lastRow - 1, 6).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    if (String(row[2]).trim() === String(ejercicio).trim()) {
      var pesoRaw = row[4];
      return {
        fecha: formatFecha(row[0]),
        reps: row[3] === "" ? null : Number(row[3]),
        peso: pesoRaw === "" || pesoRaw === "-" ? null : Number(pesoRaw),
        notas: String(row[5] || ""),
      };
    }
  }
  return null;
}

function getHoy() {
  var sh = sheetRegistros();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var tz = ss().getSpreadsheetTimeZone();
  var hoy = Utilities.formatDate(new Date(), tz, "d/M/yyyy");
  var values = sh.getRange(2, 1, lastRow - 1, 6).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (formatFecha(row[0]) === hoy) {
      out.push({
        row: i + 2,
        grupo: String(row[1]),
        ejercicio: String(row[2]),
        reps: row[3],
        peso: row[4],
        notas: String(row[5] || ""),
      });
    }
  }
  out.reverse();
  return out;
}

function addRegistro(payload) {
  var ejercicio = payload.ejercicio;
  if (!ejercicio) throw new Error("Falta ejercicio");
  var info = findEjercicio(ejercicio);
  if (!info) throw new Error("Ejercicio no encontrado en el catálogo: " + ejercicio);

  var reps = payload.reps;
  if (reps === undefined || reps === null || reps === "") {
    throw new Error("Faltan las repeticiones");
  }

  var pesoOut = info.sinPeso ? "-" : payload.peso;
  if (!info.sinPeso && (pesoOut === undefined || pesoOut === null || pesoOut === "")) {
    throw new Error("Falta el peso");
  }

  var notas = payload.notas || "";
  var tz = ss().getSpreadsheetTimeZone();
  var fecha = Utilities.formatDate(new Date(), tz, "d/M/yyyy");

  var sh = sheetRegistros();
  sh.appendRow([fecha, info.grupo, ejercicio, Number(reps), pesoOut === "-" ? "-" : Number(pesoOut), notas]);
  var row = sh.getLastRow();
  return { row: row, fecha: fecha, grupo: info.grupo, sinPeso: info.sinPeso };
}

function editRegistro(payload) {
  var row = payload.row;
  if (!row || row < 2) throw new Error("Fila inválida");
  var sh = sheetRegistros();
  sh.getRange(row, 4).setValue(Number(payload.reps));
  var currentPeso = sh.getRange(row, 5).getValue();
  if (String(currentPeso) !== "-") {
    sh.getRange(row, 5).setValue(Number(payload.peso));
  }
  sh.getRange(row, 6).setValue(payload.notas || "");
  return { row: row };
}

function deleteRegistro(row) {
  if (!row || row < 2) throw new Error("Fila inválida");
  sheetRegistros().deleteRow(row);
  return { deleted: row };
}

// ---------- ejercicios (ABM) ----------

function addEjercicio(payload) {
  var nombre = (payload.nombre || "").trim();
  var grupo = (payload.grupo || "").trim();
  if (!nombre || !grupo) throw new Error("Nombre y grupo son obligatorios");
  if (findEjercicio(nombre)) throw new Error("Ya existe un ejercicio con ese nombre");
  if (!findGrupo(grupo)) throw new Error("El grupo no existe");
  sheetEjercicios().appendRow([nombre, grupo, !!payload.sinPeso]);
  return { nombre: nombre };
}

function updateEjercicio(payload) {
  var original = findEjercicio(payload.nombreOriginal);
  if (!original) throw new Error("Ejercicio no encontrado");
  var nombre = (payload.nombre || "").trim();
  var grupo = (payload.grupo || "").trim();
  if (!nombre || !grupo) throw new Error("Nombre y grupo son obligatorios");
  if (!findGrupo(grupo)) throw new Error("El grupo no existe");
  var sh = sheetEjercicios();
  sh.getRange(original.rowIndex, 1).setValue(nombre);
  sh.getRange(original.rowIndex, 2).setValue(grupo);
  sh.getRange(original.rowIndex, 3).setValue(!!payload.sinPeso);
  return { nombre: nombre };
}

function deleteEjercicio(nombre) {
  var info = findEjercicio(nombre);
  if (!info) throw new Error("Ejercicio no encontrado");
  sheetEjercicios().deleteRow(info.rowIndex);
  return { deleted: nombre };
}

// ---------- grupos (ABM) ----------

function addGrupo(payload) {
  var nombre = (payload.nombre || "").trim();
  if (!nombre) throw new Error("El nombre es obligatorio");
  if (findGrupo(nombre)) throw new Error("Ya existe ese grupo");
  sheetGrupos().appendRow([nombre]);
  return { nombre: nombre };
}

function updateGrupo(payload) {
  var original = (payload.nombreOriginal || "").trim();
  var nombre = (payload.nombre || "").trim();
  var rowIndex = findGrupo(original);
  if (!rowIndex) throw new Error("Grupo no encontrado");
  if (!nombre) throw new Error("El nombre es obligatorio");
  sheetGrupos().getRange(rowIndex, 1).setValue(nombre);

  // Cascada: renombrar el grupo en los ejercicios que lo usan.
  var ejSh = sheetEjercicios();
  var ejValues = ejSh.getDataRange().getValues();
  for (var i = 1; i < ejValues.length; i++) {
    if (String(ejValues[i][1]).trim() === original) {
      ejSh.getRange(i + 1, 2).setValue(nombre);
    }
  }
  return { nombre: nombre };
}

function deleteGrupo(nombre) {
  var target = String(nombre).trim();
  var ejValues = sheetEjercicios().getDataRange().getValues();
  for (var i = 1; i < ejValues.length; i++) {
    if (String(ejValues[i][1]).trim() === target) {
      throw new Error(
        "Hay ejercicios usando este grupo. Reasigná o borrá esos ejercicios primero."
      );
    }
  }
  var rowIndex = findGrupo(target);
  if (!rowIndex) throw new Error("Grupo no encontrado");
  sheetGrupos().deleteRow(rowIndex);
  return { deleted: target };
}

// ---------- setup inicial (ejecutar una sola vez a mano) ----------

function setupInicial() {
  var spreadsheet = ss();

  var grupos = [
    "Espalda",
    "Pecho",
    "Hombros",
    "Biceps",
    "Triceps",
    "Antebrazos",
    "Abdominales",
    "Piernas",
    "Glúteos",
  ];
  var ejercicios = [
    ["Dominadas asistidas", "Espalda", true],
    ["Press banco inclinado", "Pecho", false],
    ["Remo inclinado", "Espalda", false],
    ["Press banco plano", "Pecho", false],
    ["Curl Supinado", "Biceps", false],
    ["Skull Crusher", "Triceps", false],
    ["Vuelos Laterales", "Hombros", false],
    ["Pájaros", "Hombros", false],
    ["Curl Inverso", "Antebrazos", false],
    ["Crunches (C-Shape)", "Abdominales", true],
    ["Levantamiento de piernas (C-Shape)", "Abdominales", true],
  ];

  var grSheet = spreadsheet.getSheetByName(SHEET_GRUPOS);
  if (!grSheet) grSheet = spreadsheet.insertSheet(SHEET_GRUPOS);
  if (grSheet.getLastRow() === 0) {
    grSheet.appendRow(["Nombre"]);
    grupos.forEach(function (g) {
      grSheet.appendRow([g]);
    });
  }

  var ejSheet = spreadsheet.getSheetByName(SHEET_EJERCICIOS);
  if (!ejSheet) ejSheet = spreadsheet.insertSheet(SHEET_EJERCICIOS);
  if (ejSheet.getLastRow() === 0) {
    ejSheet.appendRow(["Nombre", "Grupo", "SinPeso"]);
    ejercicios.forEach(function (e) {
      ejSheet.appendRow(e);
    });
  }

  var regSheet = spreadsheet.getSheetByName(SHEET_REGISTROS);
  if (!regSheet) {
    Logger.log(
      "ATENCIÓN: no existe una hoja llamada 'Registros'. Renombrá la hoja que ya tiene tus datos (Fecha, Grupo Muscular, Ejercicio, Reps, Peso, Notas) a 'Registros'."
    );
  }

  Logger.log(
    "Setup listo. Grupos: " + (grSheet.getLastRow() - 1) + ", Ejercicios: " + (ejSheet.getLastRow() - 1)
  );
}
