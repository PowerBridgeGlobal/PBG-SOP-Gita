# PBG SOP Gita — the living handbook

PowerBridge Global's daily handbook: each person's role, daily checklist and the
SOPs that apply to them, in **English and Telugu**. Same stack as the rest of PBG
— a Google Apps Script backend with a Google Sheet (`PBG_Geeta`) for data, and a
lightweight installable web app served by GitHub Pages.

## What's in this repo
- **`index.html`, `manifest.webmanifest`, `sw.js`, `icons/`** — the phone app
  (PWA). Login with Employee ID + your PB1 Core PIN, English/Telugu toggle,
  role-scoped checklist + SOPs + search, "Read and understood" sign-off, and a
  picture-first **Helper Mode** with Telugu voice notes.
- **`backend/`** — the Geeta Apps Script (`Config`, `Lib`, `Bootstrap`, `Api`,
  `Seed_v11`, `Seed_StoreHelper`). A separate script from PB1 Core, with its own
  `PBG_Geeta` sheet. Security is enforced server-side; nothing is hard-deleted.
- **`core/README-core.md`** — how to show the same handbook inside PB1 Core.
- **`GO-LIVE-CHECKLIST.md`** — step-by-step to launch (target 23 Nov 2026).

## Quick start
1. Deploy the backend — see **“One-time setup”** below.
2. Put your deployed `/exec` URL into the one `API_URL` line at the top of the
   `<script>` in `index.html`. (Blank = sample preview mode, no backend needed.)
3. Turn on Pages: **Settings → Pages → Branch `main` / root**. The app is then at
   **`https://powerbridgeglobal.github.io/PBG-SOP-Gita/`**.

## One-time backend setup (~10 min, no developer)
1. **script.google.com → New project**, name it **PBG Geeta**.
2. Add each file in `backend/` as a script of the same name (delete the default
   `Code.gs`).
3. **Run → `setupGeeta`** once (creates the `PBG_Geeta` sheet, tabs and roles).
4. **Run → `seedV11`** once (training calendar, 24-SOP register, Store Helper
   content in English).
5. **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access*
   **Anyone** → copy the **`/exec`** URL into `index.html` (step 2 above).
6. In **Project Settings → Script Properties**, set `GEETA_CORE_TOKEN` (random)
   if you'll embed in PB1 Core, and `GEETA_GRACE_MINUTES` (Founder-only; never
   shown to staff) if you use an attendance grace. Remove `GEETA_ALLOW_DEV_LOGIN`
   before real use.

After any backend code change: **Deploy → Manage deployments → New version**.

## Status
Live: Store Helper role (English), training calendar, 24-SOP register skeleton.
Pending your content: Telugu, real photos/voice, the other roles, and SOP bodies.
