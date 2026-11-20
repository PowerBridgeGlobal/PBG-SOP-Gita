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
