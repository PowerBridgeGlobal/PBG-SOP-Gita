/**
 * PBG GEETA — Bootstrap.gs
 * Run setupGeeta() ONCE from the Apps Script editor. It:
 *   1. Creates the PBG_Geeta spreadsheet (first run) and remembers its ID.
 *   2. Creates every tab with its header row (the schema).
 *   3. Seeds the 7 roles (policy facts only — no job-description content).
 *   4. Seeds the v1.1 Versions row.
 * It is safe to run again: it never duplicates tabs, headers or seed rows.
 */
function setupGeeta() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(GEETA.PROP_SHEET_ID);
  var ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create(GEETA.SHEET_NAME);
    id = ss.getId();
    props.setProperty(GEETA.PROP_SHEET_ID, id);
  }

  // Tabs + headers
  Object.keys(SCHEMA).forEach(function (tab) {
    var sh = ss.getSheetByName(tab) || ss.insertSheet(tab);
    var lastCol = Math.max(1, sh.getLastColumn());
    var firstRow = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    if (firstRow.join('') === '') {
      var headers = SCHEMA[tab];
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });

  // Drop the default empty "Sheet1" if present
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  reseedRoles_();
  seedVersionRowOnce_();

  Logger.log('PBG_Geeta ready.');
  Logger.log('Sheet ID : ' + id);
  Logger.log('Sheet URL: ' + ss.getUrl());
  return id;
}

/** Insert any missing roles from ROLE_SEED (never overwrites existing rows). */
function reseedRoles_() {
  var have = {};
  readTable_('Roles').forEach(function (r) { have[r.role_id] = true; });
  var now = new Date();
  var sys = { EmpID: 'system-seed', RoleID: 'SYSTEM' };
  ROLE_SEED.forEach(function (r) {
    if (have[r[0]]) return;
    appendRow_('Roles', {
      role_id: r[0], role_name: r[1], person: r[2], emp_id: r[3], reports_to: r[4],
      responsibilities_en: '', responsibilities_te: '', measured_by_en: '', measured_by_te: '',
      helper_mode: r[5], customer_contact_allowed: r[6],
      created_at: now, updated_at: now
    }, sys);
  });
}

function seedVersionRowOnce_() {
  if (readTable_('Versions').length) return;
  appendRow_('Versions', {
    version: '1.1', date: '2026-11-23',
    summary: 'Initial handbook from approved SOP Master v1.1 (content to be loaded).',
    approved_by: 'Founder'
  }, { EmpID: 'system-seed', RoleID: 'SYSTEM' });
}
