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
