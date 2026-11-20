/**
 * PBG SOP Gita — COMPLETE BACKEND (all files in one).
 * Paste this whole file into the default Code.gs of a new Apps Script
 * project, then Run setupGeeta, Run seedV11, and Deploy as a Web app.
 * (This is Config + Lib + Bootstrap + Api + Seed_v11 + Seed_StoreHelper
 *  concatenated — Apps Script runs all files as one, so order is fine.)
 */

// =====================================================================
// ===== Config.gs
// =====================================================================
/**
 * PBG GEETA — Config.gs
 * -------------------------------------------------------------------------
 * The ONLY backend for the PBG Geeta handbook. This is a SEPARATE Google
 * Apps Script project from PB1 Core (your decision), with its own data sheet
 * "PBG_Geeta". Nothing here writes to Core.
 *
 * Follows PB1 Core conventions: read/write by HEADER name (never column
 * number), every write goes to AuditLog, and NOTHING is ever hard-deleted
 * (content is archived with status = Archived).
 *
 * Script Properties used (Project Settings ▸ Script Properties):
 *   GEETA_SHEET_ID         -> set automatically by setupGeeta() the first time
 *   GEETA_ALLOW_DEV_LOGIN  -> "TRUE" only while testing before PIN login exists
 *   GEETA_GRACE_MINUTES    -> Founder-only. The attendance grace value.
 *                             NEVER read by any endpoint and NEVER returned to
 *                             any screen, export or API response.
 * -------------------------------------------------------------------------
 */
var GEETA = {
  PROP_SHEET_ID:        'GEETA_SHEET_ID',
  PROP_ALLOW_DEV_LOGIN: 'GEETA_ALLOW_DEV_LOGIN',
  PROP_GRACE_MINUTES:   'GEETA_GRACE_MINUTES',
  PROP_CORE_TOKEN:      'GEETA_CORE_TOKEN',   // shared secret so PB1 Core can embed the handbook without a second login
  SHEET_NAME:           'PBG_Geeta',
  SESSION_TTL_MIN:      720          // 12 hours
};

// Roles allowed to view ALL roles/SOPs (everyone else sees only their own).
var VIEW_ALL_ROLES = ['FOUNDER', 'ADMIN', 'SATISH'];
// Roles allowed to see Pricing (PRICE-001). Enforced server-side.
var PRICING_ROLES  = ['FOUNDER', 'SATISH'];

// PB1 Core web-app URL used to verify the EmpID + PIN at login (same PIN as
// Core). Override by setting Script Property GEETA_CORE_API_URL. The default
// is PBG's existing Core/Quote endpoint.
var DEFAULT_CORE_API_URL = 'https://script.google.com/macros/s/AKfycbz3HqtrB6fF38MxzSzdLSc7_ORUamrGuvG0j5o1jVWeHpN5muhJ1eADNYgM0P0SkbiB/exec';

/**
 * The PBG_Geeta sheet schema. One key per tab; the array is the header row.
 * Phase 1 + Phase 2 + Phase 3 tabs are all created up-front so the structure
 * is ready, even though Phase 2/3 features are switched on later.
 */
var SCHEMA = {
  // ---- Phase 1: handbook content ----
  SOPs:            ['SopID','code','title_en','title_te','department','version','effective_date','body_en','body_te','status','owner_role','created_at','updated_at','archived'],
  Roles:           ['role_id','role_name','person','emp_id','reports_to','responsibilities_en','responsibilities_te','measured_by_en','measured_by_te','helper_mode','customer_contact_allowed','created_at','updated_at'],
  Checklists:      ['ChecklistID','role_id','order','item_en','item_te','time_block','frequency','sop_code','image_url','audio_url','created_at','updated_at'],
  RoleSOPs:        ['role_id','sop_code'],
  Cover:           ['absent_role_id','covering_role_id','tasks','created_at'],
  Pricing:         ['category','quote_margin','satish_limit','floor'],   // Founder/Satish only
  Training:        ['month','sop_topics','technical_topic','questions_en','questions_te','answers'],
  Versions:        ['version','date','summary','approved_by'],
  Acknowledgements:['AckID','person','role_id','version','sop_codes','method','date'],

  // ---- Phase 2: feedback + outcome signals (read-only aggregates) ----
  Feedback:        ['FeedbackID','sop_code','checklist_item','type','text','audio_url','photo_url','submitted_by','show_name','created_at','status','founder_note','linked_proposal_id'],
  OutcomeSignals:  ['metric','period','value','source','computed_at'],

  // ---- Phase 3: learning loop (plumbing now, switched on later) ----
  ChangeProposals: ['ProposalID','sop_code','current_text','proposed_en','proposed_te','reason','evidence','expected_benefit','risk','status','founder_note','trial_until','created_at','updated_at'],
  BestPractices:   ['BPID','sop_code','title_en','title_te','body_en','body_te','credited_to','created_at'],

  // ---- System ----
  Sessions:        ['Token','EmpID','RoleID','Name','AccessAll','PricingOK','CreatedAt','ExpiresAt'],
  AuditLog:        ['Timestamp','User','Role','Device','Entity','Action','RecordID','PreviousValue','NewValue'],
  AccessDenials:   ['Timestamp','User','RoleID','Entity','Operation','Reason']
};

/**
 * Role seed. role_name / person / helper_mode / customer_contact_allowed are
 * POLICY facts from the approved spec and are safe to seed. The job-description
 * content (responsibilities_*, measured_by_*) is left BLANK on purpose — it
 * will be filled word-for-word from the v1.1 SOP master when you paste it.
 * reports_to is a sensible default — please confirm the reporting lines.
 * emp_id links the role to the PB1 Core Employee ID so login can reuse the
 * same PIN as PB1 Core. Nagender and Srinivas Sarma are blank until you
 * register them in Core.
 * Columns: role_id, role_name, person, emp_id, reports_to, helper_mode, customer_contact_allowed
 */
var ROLE_SEED = [
  ['FOUNDER',  'Founder / Admin',                 'Founder',          'PBG-EMP0001', '',        'N', 'Y'],
  ['SATISH',   'Sales & Operations Manager',      'Satish',           'PBG-EMP0008', 'FOUNDER', 'N', 'Y'],
  ['LATHA',    'Sales & Customer Coordinator',    'Latha',            'PBG-EMP0005', 'SATISH',  'N', 'Y'],
  ['RADHIKA',  'Accounts Executive',              'Radhika',          'PBG-EMP0006', 'FOUNDER', 'N', 'N'],
  ['ARJUN',    'Senior Store Helper',             'Arjun',            'PBG-EMP0007', 'SATISH',  'Y', 'N'],
  ['NAGENDER', 'Store Helper & Vehicle In-charge','Nagender',         'PBG-EMP0010',            'SATISH',  'Y', 'N'],
  ['FATHER',   'Collections & Audit Supervisor',  'Srinivas Sarma K',   'PBG-EMP0009',            'FOUNDER', 'N', 'N']
];

// =====================================================================
// ===== Lib.gs
// =====================================================================
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

// =====================================================================
// ===== Bootstrap.gs
// =====================================================================
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
  readTable_('Roles').forEach(function (r) { have[String(r.role_id).toUpperCase()] = true; });
  var now = new Date();
  var sys = { EmpID: 'system-seed', RoleID: 'SYSTEM' };
  ROLE_SEED.forEach(function (r) {
    var id = r[0];
    if (have[id]) {
      // Row exists: sync identity/policy columns only (never touch content).
      updateFirst_('Roles', 'role_id', id, {
        role_name: r[1], person: r[2], emp_id: r[3], reports_to: r[4],
        helper_mode: r[5], customer_contact_allowed: r[6], updated_at: now
      }, sys);
    } else {
      appendRow_('Roles', {
        role_id: id, role_name: r[1], person: r[2], emp_id: r[3], reports_to: r[4],
        responsibilities_en: '', responsibilities_te: '', measured_by_en: '', measured_by_te: '',
        helper_mode: r[5], customer_contact_allowed: r[6],
        created_at: now, updated_at: now
      }, sys);
    }
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

// =====================================================================
// ===== Api.gs
// =====================================================================
/**
 * PBG GEETA — Api.gs
 * The web endpoint. Uses JSONP (?callback=) like the PBG Quote Builder, so the
 * handbook frontends can call it from GitHub Pages with no CORS trouble.
 *
 * SECURITY (server-side — the real security layer; never trust the UI):
 *   - Every read endpoint requires a valid session token.
 *   - A normal user can see ONLY their own role's material.
 *   - Founder / Admin / Satish can see all roles/SOPs.
 *   - Pricing is served only to Founder / Satish (separate guarded endpoint).
 *   - The attendance grace value is NEVER read or returned by anything here.
 *   - Blocked attempts are written to AccessDenials.
 *
 * Stage A ships read endpoints + a temporary devLogin (guarded by a Script
 * Property) so you can test before the real EmpID+PIN login is built (Stage C).
 */

function doGet(e)  { return handle_(e); }
function doPost(e) { return handle_(e); }

function handle_(e) {
  var p = (e && e.parameter) || {};
  var cb = p.callback || '';
  var out;
  try { out = route_(p.action || 'ping', p); }
  catch (err) { out = { ok: false, error: String((err && err.message) || err) }; }
  return reply_(out, cb);
}

function reply_(obj, cb) {
  var json = JSON.stringify(obj);
  if (cb) return ContentService.createTextOutput(cb + '(' + json + ')')
                 .setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function route_(action, p) {
  switch (action) {
    case 'ping':       return { ok: true, data: { app: 'PBG SOP Gita', time: new Date() } };
    case 'login':      return login_(p);
    case 'coreLogin':  return coreLogin_(p);
    case 'acknowledge':return acknowledge_(requireUser_(p), p.version, p.sop_codes, p.method);
    case 'devLogin':   return devLogin_(p);
    case 'listRoles':  return listRoles_(requireUser_(p));
    case 'getRole':    return getRole_(requireUser_(p), p.role_id);
    case 'getSOP':     return getSOP_(requireUser_(p), p.code);
    case 'searchSOPs': return searchSOPs_(requireUser_(p), p.role_id, p.q);
    case 'getTraining':return getTraining_(requireUser_(p), p.month);
    default:           return { ok: false, error: 'Unknown action: ' + action };
  }
}

/* ---------------- sessions / auth ---------------- */

function requireUser_(p) {
  var token = p.token || '';
  if (!token) throw new Error('Not signed in.');
  var s = readTable_('Sessions').filter(function (r) { return String(r.Token) === String(token); })[0];
  if (!s) throw new Error('Session not found — please sign in again.');
  if (s.ExpiresAt && new Date(s.ExpiresAt) < new Date()) throw new Error('Session expired — please sign in again.');
  return {
    EmpID: s.EmpID, RoleID: String(s.RoleID).toUpperCase(), Name: s.Name,
    AccessAll: String(s.AccessAll).toUpperCase() === 'TRUE',
    PricingOK: String(s.PricingOK).toUpperCase() === 'TRUE'
  };
}

/**
 * Real login: EmpID + PIN. The PIN is the SAME as PB1 Core — we verify it by
 * asking Core's own login endpoint, so there is one source of truth and no PIN
 * is stored in Geeta. The EmpID must be linked to a Geeta role (Roles.emp_id).
 */
function login_(p) {
  var empId = String(p.emp_id || p.employeeId || '').trim();
  var pin = String(p.pin || '').trim();
  if (!empId || !pin) return { ok: false, error: 'Employee ID and PIN are required.' };

  var role = readTable_('Roles').filter(function (r) {
    return String(r.emp_id).trim().toUpperCase() === empId.toUpperCase();
  })[0];
  if (!role) { denial_({ EmpID: empId }, 'login', 'login', 'no Geeta role for Employee ID'); return { ok: false, error: 'This Employee ID is not set up in the handbook yet. Please ask the Founder.' }; }

  var coreUrl = PropertiesService.getScriptProperties().getProperty('GEETA_CORE_API_URL') || DEFAULT_CORE_API_URL;
  var v = verifyWithCore_(coreUrl, empId, pin);
  if (!v.ok) return { ok: false, error: v.error || 'Wrong Employee ID or PIN.' };

  var roleId = String(role.role_id).toUpperCase();
  var now = new Date(), exp = new Date(now.getTime() + GEETA.SESSION_TTL_MIN * 60000);
  var token = Utilities.getUuid();
  var accessAll = VIEW_ALL_ROLES.indexOf(roleId) >= 0;
  var pricingOk = PRICING_ROLES.indexOf(roleId) >= 0;
  appendRow_('Sessions', {
    Token: token, EmpID: empId, RoleID: roleId, Name: v.name || role.person,
    AccessAll: accessAll, PricingOK: pricingOk, CreatedAt: now, ExpiresAt: exp
  }, { EmpID: empId, RoleID: roleId });
  return { ok: true, data: { token: token, role_id: roleId, name: v.name || role.person, accessAll: accessAll, pricingOK: pricingOk, helper_mode: role.helper_mode } };
}

/**
 * Trusted login for the handbook embedded INSIDE PB1 Core. Core has already
 * authenticated the user; it calls this with the shared GEETA_CORE_TOKEN and
 * the user's EmpID, and gets back a normal (own-role-scoped) session — no
 * second PIN. The token only ever unlocks handbook content; pricing, grace and
 * financial data are never returned by handbook endpoints.
 */
function coreLogin_(p) {
  var expected = PropertiesService.getScriptProperties().getProperty(GEETA.PROP_CORE_TOKEN);
  if (!expected) return { ok: false, error: 'Core handbook token not configured (set GEETA_CORE_TOKEN).' };
  if (String(p.core_token || '') !== String(expected)) { denial_({ EmpID: p.emp_id || 'core' }, 'coreLogin', 'coreLogin', 'bad core token'); return { ok: false, error: 'Not authorised.' }; }
  var empId = String(p.emp_id || p.employeeId || '').trim();
  var role = readTable_('Roles').filter(function (r) { return String(r.emp_id).trim().toUpperCase() === empId.toUpperCase(); })[0];
  if (!role) return { ok: false, error: 'This Employee ID is not set up in the handbook yet.' };
  var roleId = String(role.role_id).toUpperCase();
  var now = new Date(), exp = new Date(now.getTime() + GEETA.SESSION_TTL_MIN * 60000);
  var token = Utilities.getUuid();
  var accessAll = VIEW_ALL_ROLES.indexOf(roleId) >= 0, pricingOk = PRICING_ROLES.indexOf(roleId) >= 0;
  appendRow_('Sessions', { Token: token, EmpID: empId, RoleID: roleId, Name: role.person, AccessAll: accessAll, PricingOK: pricingOk, CreatedAt: now, ExpiresAt: exp }, { EmpID: empId, RoleID: roleId });
  return { ok: true, data: { token: token, role_id: roleId, name: role.person, accessAll: accessAll, pricingOK: pricingOk, helper_mode: role.helper_mode } };
}

/** Ask PB1 Core to verify the EmpID + PIN (reuses Core's existing login). */
function verifyWithCore_(url, empId, pin) {
  try {
    var u = url + (url.indexOf('?') >= 0 ? '&' : '?') +
      'action=login&employeeId=' + encodeURIComponent(empId) +
      '&pin=' + encodeURIComponent(pin) + '&callback=__cb';
    var resp = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true });
    var d = JSON.parse(stripJsonp_(resp.getContentText()));
    if (d && d.success) return { ok: true, name: (d.employee && d.employee.name) || '' };
    return { ok: false, error: (d && d.error) || 'Wrong Employee ID or PIN.' };
  } catch (e) {
    return { ok: false, error: 'Could not reach PB1 Core to check your PIN. Please try again.' };
  }
}

/** Pull the JSON out of a "callback({...})" JSONP response. */
function stripJsonp_(t) {
  var m = String(t).match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
  return m ? m[1] : t;
}

/** Record a "Read and understood" (or "Explained to me") sign-off. */
function acknowledge_(user, version, sopCodes, method) {
  if (!version) return { ok: false, error: 'version is required.' };
  var id = 'ACK' + Date.now();
  appendRow_('Acknowledgements', {
    AckID: id, person: user.Name || user.EmpID, role_id: user.RoleID,
    version: version, sop_codes: sopCodes || '', method: method || 'read', date: new Date()
  }, user);
  return { ok: true, data: { AckID: id } };
}

/** TEMPORARY. Dev-only bypass for testing before PINs are set. */
function devLogin_(p) {
  if (PropertiesService.getScriptProperties().getProperty(GEETA.PROP_ALLOW_DEV_LOGIN) !== 'TRUE')
    return { ok: false, error: 'Dev login is off. Set GEETA_ALLOW_DEV_LOGIN = TRUE in Script Properties to test.' };
  var roleId = String(p.role_id || '').toUpperCase();
  var role = readTable_('Roles').filter(function (r) { return r.role_id === roleId; })[0];
  if (!role) return { ok: false, error: 'Unknown role_id: ' + roleId };
  var now = new Date(), exp = new Date(now.getTime() + GEETA.SESSION_TTL_MIN * 60000);
  var token = Utilities.getUuid();
  var accessAll = VIEW_ALL_ROLES.indexOf(roleId) >= 0;
  var pricingOk = PRICING_ROLES.indexOf(roleId) >= 0;
  appendRow_('Sessions', {
    Token: token, EmpID: p.emp_id || ('DEV-' + roleId), RoleID: roleId, Name: role.person || roleId,
    AccessAll: accessAll, PricingOK: pricingOk, CreatedAt: now, ExpiresAt: exp
  }, { EmpID: 'devLogin', RoleID: roleId });
  return { ok: true, data: { token: token, role_id: roleId, name: role.person, accessAll: accessAll, pricingOK: pricingOk } };
}

/* ---------------- read endpoints ---------------- */

function canViewRole_(user, roleId) {
  return user.AccessAll || user.RoleID === String(roleId).toUpperCase();
}

function listRoles_(user) {
  if (!user.AccessAll) { denial_(user, 'role', 'list', 'not view-all'); return { ok: false, error: 'Only Founder / Admin / Satish can list all roles.' }; }
  var roles = readTable_('Roles').map(function (r) {
    return { role_id: r.role_id, role_name: r.role_name, person: r.person, helper_mode: r.helper_mode };
  });
  return { ok: true, data: roles };
}

function getRole_(user, roleId) {
  roleId = String(roleId || '').toUpperCase();
  if (!roleId) return { ok: false, error: 'role_id is required.' };
  if (!canViewRole_(user, roleId)) { denial_(user, 'role', 'get:' + roleId, 'row-scope: own role only'); return { ok: false, error: 'You can only view your own role.' }; }
  var role = readTable_('Roles').filter(function (r) { return r.role_id === roleId; })[0];
  if (!role) return { ok: false, error: 'Role not found.' };
  var checklist = readTable_('Checklists')
    .filter(function (c) { return String(c.role_id).toUpperCase() === roleId; })
    .sort(function (a, b) { return Number(a.order || 0) - Number(b.order || 0); });
  var codes = readTable_('RoleSOPs').filter(function (x) { return String(x.role_id).toUpperCase() === roleId; })
    .map(function (x) { return x.sop_code; });
  var sops = readTable_('SOPs')
    .filter(function (s) { return s.status === 'Approved' && codes.indexOf(s.code) >= 0; })
    .map(function (s) { return { code: s.code, title_en: s.title_en, title_te: s.title_te, version: s.version, effective_date: s.effective_date }; });
  return { ok: true, data: { role: role, checklist: checklist, sops: sops, helper_mode: role.helper_mode, covering: coveringTasksFor_(roleId) } };
}

/** Covering today (HR-001): tasks this role is covering for an absent colleague. */
function coveringTasksFor_(roleId) {
  var nameOf = {};
  readTable_('Roles').forEach(function (r) { nameOf[String(r.role_id).toUpperCase()] = r.person; });
  return readTable_('Cover')
    .filter(function (c) { return String(c.covering_role_id).toUpperCase() === roleId; })
    .map(function (c) {
      var absent = String(c.absent_role_id).toUpperCase();
      var tasks = String(c.tasks || '').split(/\n|;|•/).map(function (s) { return s.trim(); }).filter(function (s) { return s; });
      return { absent_role_id: absent, absent_person: nameOf[absent] || absent, tasks: tasks };
    });
}

function getSOP_(user, code) {
  var s = readTable_('SOPs').filter(function (x) { return x.code === code && x.status === 'Approved'; })[0];
  if (!s) return { ok: false, error: 'SOP not found or not approved.' };
  if (!user.AccessAll) {
    var mine = readTable_('RoleSOPs').filter(function (x) { return String(x.role_id).toUpperCase() === user.RoleID; }).map(function (x) { return x.sop_code; });
    if (mine.indexOf(code) < 0) { denial_(user, 'sop', 'get:' + code, 'not in role SOPs'); return { ok: false, error: 'This SOP is not assigned to your role.' }; }
  }
  return { ok: true, data: s };
}

function searchSOPs_(user, roleId, q) {
  roleId = String(roleId || user.RoleID).toUpperCase();
  if (!canViewRole_(user, roleId)) { denial_(user, 'sop', 'search', 'own role only'); return { ok: false, error: 'You can only search your own role.' }; }
  var codes = readTable_('RoleSOPs').filter(function (x) { return String(x.role_id).toUpperCase() === roleId; }).map(function (x) { return x.sop_code; });
  var needle = String(q || '').toLowerCase();
  var res = readTable_('SOPs')
    .filter(function (s) { return s.status === 'Approved' && codes.indexOf(s.code) >= 0; })
    .filter(function (s) { return !needle || (String(s.title_en) + s.title_te + s.body_en + s.body_te + s.code).toLowerCase().indexOf(needle) >= 0; })
    .map(function (s) { return { code: s.code, title_en: s.title_en, title_te: s.title_te, version: s.version, effective_date: s.effective_date }; });
  return { ok: true, data: res };
}

function getTraining_(user, month) {
  var t = readTable_('Training').filter(function (x) { return !month || String(x.month) === String(month); });
  return { ok: true, data: t };
}

// =====================================================================
// ===== Seed_v11.gs
// =====================================================================
/**
 * PBG SOP Gita — Seed_v11.gs
 * Run seedV11() ONCE after setupGeeta(). It seeds only what the approved spec
 * already defines exactly:
 *   1. The TRN-001 training calendar (12 months, SOP rotation + technical topic).
 *   2. The 24-SOP register skeleton (codes + department), status = Draft.
 *   3. A 15-row Store Helper picture-checklist template (empty slots to fill).
 *
 * It does NOT invent any SOP wording, role responsibilities, checklist text or
 * Telugu — those are loaded word-for-word from the v1.1 master once provided.
 * Draft SOPs are never shown to staff (only Approved is served), so these
 * skeleton rows are a safe fill-in worksheet. Idempotent: re-running skips rows
 * that already exist.
 */
function seedV11() {
  seedTrainingRotation_();
  seedSopRegister_();
  seedHelperCardTemplate_();
  seedStoreHelper_();   // approved Store Helper content (English; Telugu pending)
  Logger.log('Seed v1.1 done: training calendar + 24-SOP register + Store Helper (English, live).');
  Logger.log('Still to load from the approved v1.1 master: the other roles, SOP bodies, and all Telugu.');
}

/** TRN-001 training calendar — exactly as specified. Dec 2026 → Nov 2027. */
function seedTrainingRotation_() {
  // JS month index 0=Jan … 11=Dec
  var tech = { 0:'Cables',1:'Switchgear',2:'Switches',3:'Lighting',4:'Fans',5:'Geysers',
               6:'Earthing',7:'PVC Conduits',8:'Raceways & Cable Trays',9:'Cable Glands & Lugs',
               10:'Electrical Accessories',11:'Wires' };
  var sopGroup = { 0:'Opening / Closing / Vehicle',1:'Inward / Outward',2:'Sales / Quotations / Pricing',
                   3:'Payment Follow-up / Accounts',4:'Audit / Negative Stock / Damaged / Returns',
                   5:'Purchase / Petty Cash / Absence',6:'Opening / Closing / Vehicle',7:'Inward / Outward',
                   8:'Sales / Quotations / Pricing',9:'Payment Follow-up / Accounts',
                   10:'Audit / Negative Stock / Damaged / Returns',11:'Purchase / Petty Cash / Absence' };
  var have = {}; readTable_('Training').forEach(function (r) { have[String(r.month)] = true; });
  var sys = { EmpID: 'system-seed', RoleID: 'SYSTEM' };
  var d = new Date(2026, 11, 1); // December 2026
  for (var i = 0; i < 12; i++) {
    var y = d.getFullYear(), m = d.getMonth();
    var key = y + '-' + ('0' + (m + 1)).slice(-2);
    if (!have[key]) {
      var sop = (key === '2026-12') ? 'Handbook overview (first session)' : sopGroup[m];
      appendRow_('Training', { month: key, sop_topics: sop, technical_topic: tech[m], questions_en: '', questions_te: '', answers: '' }, sys);
    }
    d.setMonth(d.getMonth() + 1);
  }
}

/** The 24 SOP codes + department. Titles/bodies/Telugu come from the v1.1 master. */
function seedSopRegister_() {
  var reg = [
    ['STO-001','Store'], ['STO-003','Store'], ['STO-004','Store'],
    ['VEH-001','Vehicle'], ['VEH-002','Vehicle'],
    ['STOCK-005','Stock'], ['STOCK-006','Stock'], ['STOCK-007','Stock'], ['STOCK-008','Stock'], ['STOCK-009','Stock'],
    ['PUR-001','Purchase'], ['SALES-001','Sales'], ['PRICE-001','Pricing'], ['CUST-001','Customer'],
    ['PAY-001','Payments'], ['CS-001','Customer Service'], ['ACC-001','Accounts'], ['CASH-001','Cash'],
    ['HR-001','HR'], ['HR-002','HR'], ['HR-003','HR'], ['TRN-001','Training'], ['SAFE-001','Safety'], ['IT-001','IT']
  ];
  var have = {}; readTable_('SOPs').forEach(function (r) { have[r.code] = true; });
  var sys = { EmpID: 'system-seed', RoleID: 'SYSTEM' };
  reg.forEach(function (x) {
    if (have[x[0]]) return;
    appendRow_('SOPs', {
      SopID: 'SOP-' + x[0], code: x[0], title_en: '', title_te: '', department: x[1],
      version: '1.1', effective_date: '2026-11-23', body_en: '', body_te: '',
      status: 'Draft', owner_role: '', created_at: new Date(), updated_at: new Date(), archived: ''
    }, sys);
  });
}

/** 15 empty Store Helper picture-card slots (fill with photo + Telugu + audio). */
function seedHelperCardTemplate_() {
  var existing = readTable_('Checklists').filter(function (r) { return String(r.role_id).toUpperCase() === 'ARJUN'; });
  if (existing.length) return;
  var sys = { EmpID: 'system-seed', RoleID: 'SYSTEM' };
  for (var i = 1; i <= 15; i++) {
    appendRow_('Checklists', {
      ChecklistID: 'CHK-ARJUN-' + ('0' + i).slice(-2), role_id: 'ARJUN', order: i,
      item_en: '', item_te: '', time_block: '', frequency: 'daily', sop_code: '',
      image_url: '', audio_url: '', created_at: new Date(), updated_at: new Date()
    }, sys);
  }
}

// =====================================================================
// ===== Seed_StoreHelper.gs
// =====================================================================
/**
 * PBG SOP Gita — Seed_StoreHelper.gs
 * The approved Store Helper (Arjun) content — ENGLISH, approved by the Founder.
 * Telugu is intentionally left blank, so the app shows English with a
 * "Telugu coming soon" note (per spec), until the Telugu is provided.
 *
 * Run is automatic from seedV11(). Idempotent: re-running updates the role's
 * responsibilities and only fills the checklist cards if they are still empty.
 */

var STORE_HELPER_RESP_EN = [
  'Open the store on time and get it ready for business',
  'Mark attendance on the biometric device',
  'Check drinking water; arrange water if it is low',
  'Receive, move, handle and pack stock carefully (no damage)',
  'Help load and dispatch customer orders',
  'Help customers carry/load goods',
  'Keep the store, counters and storage neat and safe',
  'Lock the shutter at closing (when assigned)',
  'Follow all safety rules (SAFE-001)'
];

// [order, time_block, item_en]
var STORE_HELPER_CARDS = [
  [1,  'Store opening', 'Open shutter and main door'],
  [2,  'Store opening', 'Switch on lights and fans'],
  [3,  'Store opening', 'Mark attendance (biometric)'],
  [4,  'Store opening', 'Check drinking water; arrange if low'],
  [5,  'Store opening', 'Quick clean / tidy the store'],
  [6,  'Midday',        'Receive incoming stock; help check against challan'],
  [7,  'Midday',        'Pack orders carefully'],
  [8,  'Midday',        'Help load the vehicle for dispatch'],
  [9,  'Midday',        'Help customers carry goods'],
  [10, 'Evening',       'Tidy counters and storage'],
  [11, 'Evening',       'Check all items are back in place'],
  [12, 'Store closing', 'Switch off lights/fans (as instructed)'],
  [13, 'Store closing', 'Lock shutter (if assigned)']
];

// SOPs that apply to the Store Helper (shown once their v1.1 body is Approved).
var STORE_HELPER_SOPS = ['STO-001', 'STO-003', 'SAFE-001'];

function seedStoreHelper_() {
  var sys = { EmpID: 'system-seed', RoleID: 'SYSTEM' };

  // Role responsibilities (English approved; Telugu pending).
  updateFirst_('Roles', 'role_id', 'ARJUN', {
    responsibilities_en: STORE_HELPER_RESP_EN.join('\n'),
    updated_at: new Date()
  }, sys);

  // Role -> SOP links (idempotent).
  var links = readTable_('RoleSOPs').filter(function (r) { return String(r.role_id).toUpperCase() === 'ARJUN'; })
    .map(function (r) { return r.sop_code; });
  STORE_HELPER_SOPS.forEach(function (code) {
    if (links.indexOf(code) < 0) appendRow_('RoleSOPs', { role_id: 'ARJUN', sop_code: code }, sys);
  });

  // Checklist cards: fill only if the Store Helper has no content yet.
  var hasContent = readTable_('Checklists').filter(function (r) {
    return String(r.role_id).toUpperCase() === 'ARJUN' && String(r.item_en).trim() !== '';
  }).length > 0;
  if (hasContent) return;

  var slots = readTable_('Checklists').filter(function (r) { return String(r.role_id).toUpperCase() === 'ARJUN'; });
  STORE_HELPER_CARDS.forEach(function (c) {
    var id = 'CHK-ARJUN-' + ('0' + c[0]).slice(-2);
    var exists = slots.filter(function (s) { return s.ChecklistID === id; })[0];
    var row = { order: c[0], time_block: c[1], item_en: c[2], item_te: '', frequency: 'daily', updated_at: new Date() };
    if (exists) {
      updateFirst_('Checklists', 'ChecklistID', id, row, sys);
    } else {
      appendRow_('Checklists', {
        ChecklistID: id, role_id: 'ARJUN', order: c[0], item_en: c[2], item_te: '',
        time_block: c[1], frequency: 'daily', sop_code: '', image_url: '', audio_url: '',
        created_at: new Date(), updated_at: new Date()
      }, sys);
    }
  });
}

