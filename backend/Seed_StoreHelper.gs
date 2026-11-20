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
