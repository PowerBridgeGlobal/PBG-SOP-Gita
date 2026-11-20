# Deploy the PBG SOP Gita backend — step by step (~10 min)

You'll create one small Google Apps Script, run two buttons, publish it, and
send me the resulting link. No coding. Do it on a laptop (easier than phone).

---

## Part 1 — Create the script project
1. Go to **https://script.google.com** (sign in as **info@powerbridgeglobal.co.in**).
2. Click **+ New project** (top left).
3. Rename it: click the title "Untitled project" (top left) → type **PBG Geeta** → OK.

## Part 2 — Add the 6 code files
The code lives in your repo here:
**https://github.com/PowerBridgeGlobal/PBG-SOP-Gita/tree/main/backend**

Do this for **each** of the 6 files — `Config.gs`, `Lib.gs`, `Bootstrap.gs`,
`Api.gs`, `Seed_v11.gs`, `Seed_StoreHelper.gs`:

4. In GitHub, click the file name → click the **Copy raw file** button (top-right
   of the file, the two-squares icon) to copy all its text.
5. Back in Apps Script, click the **+** next to "Files" → **Script**.
6. Type the file name **exactly** (e.g. `Config` — Apps Script adds `.gs` itself).
7. Select everything already in that new file (Ctrl/Cmd+A) and **paste** over it.
8. Repeat 4–7 for all 6 files.
9. Delete the default file: hover **`Code.gs`** → three dots → **Delete**.
10. Click the **Save** icon (floppy disk) 💾.

> Order doesn't matter, but all 6 must be present before you run anything.

## Part 3 — Build the sheet + load content (two runs)
11. At the top, in the **function dropdown** (says something like `doGet`),
    choose **`setupGeeta`** → click **▶ Run**.
12. A permission popup appears → **Review permissions** → pick your account →
    you'll see *"Google hasn't verified this app"* (normal — it's your own
    script) → **Advanced** → **Go to PBG Geeta (unsafe)** → **Allow**.
13. Wait for "Execution completed". Open **Execution log** (bottom) — it prints
    the new **PBG_Geeta** sheet's link. (A new sheet now exists in your Drive.)
14. Choose **`seedV11`** in the dropdown → **▶ Run**. This loads the training
    calendar, the 24-SOP register, and the Store Helper content.

## Part 4 — Publish it as a web app
15. Top right: **Deploy** → **New deployment**.
16. Click the gear ⚙️ next to "Select type" → choose **Web app**.
17. Set:
    - **Description:** `PBG SOP Gita`
    - **Execute as:** **Me**
    - **Who has access:** **Anyone**
18. Click **Deploy** → approve if asked again.
19. **Copy the Web app URL** — it ends in **`/exec`**. That's the link I need.

## Part 5 — Send it to me
20. Paste that **`/exec` URL** here in the chat. I'll put it into the app, push,
    and the live link starts showing real data from your sheet.

---

## Good to know
- **Don't** set `GEETA_ALLOW_DEV_LOGIN` (that's only a no-PIN test switch).
- Optional, later: in **Project Settings → Script Properties**, add
  `GEETA_GRACE_MINUTES` (attendance grace, Founder-only, never shown to staff)
  and `GEETA_CORE_TOKEN` (only if you embed the handbook inside PB1 Core).
- If you ever change the code later: **Deploy → Manage deployments → New version**
  (saving alone doesn't publish).
- Everyone signs in with their **Employee ID + their existing PB1 Core PIN** —
  nothing new to remember.

## Quick self-test after step 19 (optional)
Paste your `/exec` URL in a browser with `?action=ping` on the end — you should
see `{"ok":true,...}`. If you do, the backend is live.
