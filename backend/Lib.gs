/**
 * PBG GEETA — Lib.gs
 * Sheet helpers. Everything reads/writes by HEADER name, logs to AuditLog,
 * and never hard-deletes.
 */

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty(GEETA.PROP_SHEET_ID);
  if (!id) throw new Error('PBG_Geeta is not set up yet. Run setupGeeta() once.');
  return SpreadsheetApp.openById(id);
}

function sheet_(tab) {
  var sh = ss_().getSheetByName(tab);
  if (!sh) throw new Error('Missing tab "' + tab + '". Run setupGeeta() to (re)create it.');
  return sh;
}

/** Read a whole tab as an array of {header: value} objects (blank rows skipped). */
function readTable_(tab) {
  var sh = sheet_(tab);
  var vals = sh.getDataRange().getValues();
  if (vals.length < 2) return [];
  var headers = vals[0];
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    if (vals[i].join('') === '') continue;
    var o = {};
    for (var c = 0; c < headers.length; c++) o[headers[c]] = vals[i][c];
    out.push(o);
  }
  return out;
}

/** Append one object as a row, matched to the tab's headers, and audit it. */
function appendRow_(tab, obj, user) {
  var sh = sheet_(tab);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var row = headers.map(function (h) { return obj[h] !== undefined && obj[h] !== null ? obj[h] : ''; });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); sh.appendRow(row); } finally { try { lock.releaseLock(); } catch (e) {} }
  audit_(user, tab, 'create', obj[headers[0]] || '', '', obj);
}

/** Write to AuditLog. Never throws (logging must not break a request). */
function audit_(user, entity, action, recordId, prev, next) {
  try {
    sheet_('AuditLog').appendRow([
      new Date(),
      (user && user.EmpID) || 'system',
      (user && user.RoleID) || '',
      'web', entity, action, recordId,
      JSON.stringify(prev || ''), JSON.stringify(next || '')
    ]);
  } catch (e) { /* ignore */ }
}

/** Log a blocked access attempt (mirrors PB1 Core's "Access Denials"). */
function denial_(user, entity, op, reason) {
  try {
    sheet_('AccessDenials').appendRow([
      new Date(), (user && user.EmpID) || 'anon', (user && user.RoleID) || '', entity, op, reason
    ]);
  } catch (e) { /* ignore */ }
}

/** Update the first row where keyCol === keyVal with the fields in patch.
 *  Writes only the named columns; records the change in AuditLog. Returns
 *  true if a row was found. (No hard deletes anywhere — we only edit cells.) */
function updateFirst_(tab, keyCol, keyVal, patch, user) {
  var sh = sheet_(tab);
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var kc = headers.indexOf(keyCol);
  if (kc < 0) throw new Error('No column "' + keyCol + '" in ' + tab);
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][kc]) === String(keyVal)) {
      var prev = {}; headers.forEach(function (h, i) { prev[h] = data[r][i]; });
      Object.keys(patch).forEach(function (k) {
        var ci = headers.indexOf(k);
        if (ci >= 0) sh.getRange(r + 1, ci + 1).setValue(patch[k]);
      });
      audit_(user, tab, 'update', keyVal, prev, patch);
      return true;
    }
  }
  return false;
}
