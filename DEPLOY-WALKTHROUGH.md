# Deploy the PBG SOP Gita backend — step by step (~5 min)

You paste ONE file, press two buttons, publish, and send me the link. No coding.
Best on a laptop. The only part only you can do is clicking Google's **Allow**
and **Deploy** — Google requires the account owner to approve that in person.

---

## Part 1 — Create the project
1. Go to **https://script.google.com** (signed in as info@powerbridgeglobal.co.in).
2. Click **+ New project**.
3. Rename it: click the title "Untitled project" (top-left) → type **PBG Geeta**.

## Part 2 — Paste the code (just one file)
All the backend is in a single file in your repo:
**https://github.com/PowerBridgeGlobal/PBG-SOP-Gita/blob/main/backend/PBG-Geeta-ALL-IN-ONE.gs**

4. Open that link → click **Copy raw file** (the two-squares icon, top-right of
   the code) to copy everything.
5. In Apps Script, click inside the **`Code.gs`** editor → select all
   (Ctrl/Cmd + A) → delete → **paste** the copied code.
6. Click **Save** 💾.

## Part 3 — Run two buttons
7. In the function dropdown at the top, choose **`setupGeeta`** → click **▶ Run**.
8. Approve the popup: **Review permissions** → your account → *"Google hasn't
   verified this app"* (normal — it's your own code) → **Advanced** → **Go to
   PBG Geeta (unsafe)** → **Allow**.
9. Wait for "Execution completed". (Your **PBG_Geeta** sheet now exists in Drive —
   its link is printed in the **Execution log** at the bottom.)
10. Choose **`seedV11`** in the dropdown → **▶ Run**. (Loads the roles, training
    calendar, 24-SOP register, and the Store Helper content.)

## Part 4 — Publish as a web app
11. Top-right: **Deploy → New deployment**.
12. Click the gear ⚙️ → choose **Web app**.
13. Set **Execute as: Me**, **Who has access: Anyone** → **Deploy**
    (approve again if asked).
14. **Copy the Web app URL** — it ends in **`/exec`**.

## Part 5 — Send it to me
15. Paste that **`/exec` URL** here in the chat. I'll wire it into the app, push,
    and the live link starts showing real data from your sheet.

---

**Quick test (optional):** paste your `/exec` URL in a browser with `?action=ping`
on the end → you should see `{"ok":true,...}`.

**Notes**
- Don't set `GEETA_ALLOW_DEV_LOGIN` (that's only a no-PIN test switch).
- Everyone signs in with their **Employee ID + existing PB1 Core PIN**.
- If you change code later: **Deploy → Manage deployments → New version**.
