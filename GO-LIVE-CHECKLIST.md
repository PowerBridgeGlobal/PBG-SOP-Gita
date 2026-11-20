# PBG SOP Gita — Go-Live Checklist (target: 23 Nov 2026)

Plain-language steps to take the handbook live. The **Store Helper role is
already built and approved in English**, so a realistic launch is: **Store
Helper live for Arjun (and Nagender) on 23 Nov**, with Telugu, photos/voice and
the other roles added after. Nothing below needs a developer.

Legend:  ☐ = to do · (≈time) · ⭐ = must-have for 23 Nov · ➕ = can follow after

---

## 1. Put the backend online  ⭐  (≈15 min, one time — only you can do this)
Full click-by-click steps are in `README.md`.

- ☐ Create a new Apps Script project at **script.google.com**, name it **PBG Geeta**.
- ☐ Paste the 6 backend files from `backend/`: `Config.gs`, `Lib.gs`,
  `Bootstrap.gs`, `Api.gs`, `Seed_v11.gs`, `Seed_StoreHelper.gs` (delete the
  default `Code.gs`).
- ☐ **Run → `setupGeeta`** once, approve the permission prompt. (Creates the
  `PBG_Geeta` sheet + all tabs + the 7 roles. The sheet link is in **View → Logs**.)
- ☐ **Run → `seedV11`** once. (Loads the training calendar, the 24-SOP register,
  and the Store Helper's approved English content.)
- ☐ **Deploy → New deployment → Web app**: *Execute as* **Me**, *Who has access*
  **Anyone** → **Deploy** → copy the **Web app URL** (ends in `/exec`).

## 2. Set the secret values  ⭐  (Project Settings → Script Properties)
- ☐ `GEETA_CORE_TOKEN` = a long random string (used only if you embed in PB1 Core).
- ➕ `GEETA_CORE_API_URL` — leave unset unless login should check a different PB1
  Core URL than the default.
- ☐ `GEETA_GRACE_MINUTES` — the attendance grace value, **if you use one. Founder
  only. It is never shown to staff anywhere** (that's enforced in the code).
- ☐ Make sure `GEETA_ALLOW_DEV_LOGIN` is **not set / removed** before real staff
  use (it's only for testing without a PIN).

## 3. Connect the phone app to the backend  ⭐
- ☐ In `index.html`, set the one line `var API_URL = ""` to your
  `/exec` URL from step 1. (Tell me the URL and I'll do this + commit for you.)
- ☐ **Turn on GitHub Pages**: in this repo, **Settings → Pages → Source: Deploy
  from a branch → Branch: `main` → Folder: `/ (root)` → Save**. The app will be at
  `https://powerbridgeglobal.github.io/PBG-SOP-Gita/` (loads straight into the app).

## 4. People & PINs  ⭐
- ☐ Confirm **Arjun (PBG-EMP0007)** can log in with his existing PB1 Core PIN.
- ☐ **Register Nagender and Srinivas Sarma in PB1 Core** (so they get an Employee
  ID + PIN), then put their Employee IDs into the `PBG_Geeta` → **Roles** tab,
  `emp_id` column (rows NAGENDER and FATHER). (Or tell me the IDs and I'll add
  them to the seed.)
- ☐ Tell each person their Employee ID + remind them it's the **same PIN as PB1
  Core** — nothing new to remember.

## 5. Finish the Store Helper content  (English is already live)
- ➕ **Telugu** for the 9 responsibilities + 13 daily cards → paste it to me, I load it.
- ➕ **Real store photos** → paste links into `PBG_Geeta` → **Checklists** →
  `image_url` (rows CHK-ARJUN-01…13).
- ➕ **Telugu voice notes** (recorded by you/Satish) → links into the `audio_url`
  column of the same rows.

## 6. Other roles & SOP bodies  ➕ (not required for a Store-Helper launch)
- ➕ Paste each role's v1.1 content (responsibilities + checklist) → I load it.
- ➕ Paste each SOP's v1.1 body (EN/TE) → I load it and flip status to **Approved**
  (Draft SOPs are never shown to staff).

## 7. Handbook inside PB1 Core  ➕ (standalone app is enough to launch)
- ➕ Follow `core/README-core.md`: add the `handbook` permission rows +
  one `<iframe>` in Core. Can be done the week after launch.

---

## 8. Launch-day checks (run these on 23 Nov — pass/fail)
Open the app on a real phone and confirm each:

- ☐ **App opens** at the Pages link and installs (Add to Home Screen).
- ☐ **Login works** with a real Employee ID + Core PIN.
- ☐ **Wrong PIN is refused.**
- ☐ **Arjun opens straight into Helper Mode** and sees the **13 tasks in order**
  (opening → closing), big cards.
- ☐ **Language toggle (EN / తె)** switches everything and is remembered; Telugu
  handbook text shows **"Telugu coming soon"** (not blank).
- ☐ **A helper cannot see another role** (a helper opening another role is refused).
- ☐ **Founder / Satish can view all roles.**
- ☐ **Pricing is not visible** to anyone except Founder / Satish.
- ☐ **No attendance grace value** appears anywhere on screen, in search, or in any
  link/response.
- ☐ **"Read and understood"** records a sign-off (a row in the `Acknowledgements` tab).
- ☐ **Covering-today**: add a row in the `Cover` tab → the covering person sees the
  extra tasks.
- ☐ **Offline**: the app shell still opens with no internet (content needs network).

---

## Suggested 3-day run-up (today is 20 Nov)
- **20–21 Nov:** Steps 1–4 (backend live, app connected, Pages on, PINs confirmed).
  Send me the `/exec` URL so I wire it in and publish.
- **22 Nov:** Add Store Helper Telugu + a few real photos if ready; dry-run the
  launch-day checks with Arjun.
- **23 Nov:** Run the launch-day checks (section 8); go live with the Store Helper.

**What only you can do:** steps 1, 2, 4, and the Pages/branch choice in 3.
**What I'll do for you:** set `API_URL`, add Nagender/Srinivas IDs to the seed,
load any content you paste, wire the Core embed, and prepare the branch for Pages.
