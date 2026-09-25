/**
 * Backup periódico de la base de datos de "Registro de Entrenamientos".
 * Vive pegado al Sheet de backup. Una vez por día, tira los datos desde
 * /api/export y los vuelca acá en pestañas legibles.
 * Ver README.md de esta carpeta para el setup paso a paso.
 */

var EXPORT_URL = "https://gym-log-amber.vercel.app/api/export";
var TZ = "America/Argentina/Buenos_Aires";

function sync() {
  var token = PropertiesService.getScriptProperties().getProperty("APP_PIN");
  if (!token) {
    throw new Error(
      "APP_PIN no configurado. Configuración del proyecto > Propiedades del script."
    );
  }

  var res = UrlFetchApp.fetch(EXPORT_URL + "?token=" + encodeURIComponent(token), {
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error("Export falló: HTTP " + res.getResponseCode() + " " + res.getContentText());
  }
  var data = JSON.parse(res.getContentText());
  if (!data.ok) throw new Error("Export falló: " + (data.error || "desconocido"));

  writeGrupos(data.grupos);
  writeEjercicios(data.ejercicios);
  writeSesiones(data.sesiones);
  writeRegistros(data.series);
  writeInfo(data.generatedAt);

  Logger.log(
    "Backup OK: " + data.series.length + " series, " + data.ejercicios.length + " ejercicios."
  );
}

// ---------- helpers ----------

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(nombre) {
  var sh = ss().getSheetByName(nombre);
  if (!sh) sh = ss().insertSheet(nombre);
  return sh;
}

function writeSheet(nombre, headers, rows) {
  var sh = getOrCreateSheet(nombre);
  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (rows.length > 0) {
    sh.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  sh.setFrozenRows(1);
}

function fmt(iso) {
  if (!iso) return "";
  return Utilities.formatDate(new Date(iso), TZ, "dd/MM/yyyy HH:mm");
}

// ---------- pestañas ----------

function writeGrupos(grupos) {
  writeSheet(
    "Grupos",
    ["ID", "Nombre"],
    grupos.map(function (g) {
      return [g.id, g.nombre];
    })
  );
}

function writeEjercicios(ejercicios) {
  writeSheet(
    "Ejercicios",
    ["ID", "Nombre", "Grupo", "SinPeso"],
    ejercicios.map(function (e) {
      return [e.id, e.nombre, e.grupo, e.sinPeso];
    })
  );
}

function writeSesiones(sesiones) {
  writeSheet(
    "Sesiones",
    ["ID", "Inicio", "Fin"],
    sesiones.map(function (s) {
      return [s.id, fmt(s.inicio), fmt(s.fin)];
    })
  );
}

function writeRegistros(series) {
  writeSheet(
    "Registros",
    ["ID", "Sesión", "Fecha", "Grupo Muscular", "Ejercicio", "Reps", "Peso", "Notas"],
    series.map(function (s) {
      return [
        s.id,
        s.sesionId,
        fmt(s.fecha),
        s.grupo,
        s.ejercicio,
        s.reps,
        s.peso === null ? "-" : s.peso,
        s.notas,
      ];
    })
  );
}

function writeInfo(generatedAt) {
  var sh = getOrCreateSheet("Info");
  sh.clearContents();
  sh.getRange(1, 1, 2, 2).setValues([
    ["Backup de", "https://gym-log-amber.vercel.app"],
    ["Última sincronización", fmt(generatedAt)],
  ]);
  sh.setColumnWidth(1, 220);
}

// ---------- setup (ejecutar una sola vez a mano) ----------

function crearTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sync") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sync").timeBased().everyDays(1).atHour(6).create();
  Logger.log("Trigger diario creado (corre una vez por día, alrededor de las 6am).");
}
