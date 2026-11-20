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
