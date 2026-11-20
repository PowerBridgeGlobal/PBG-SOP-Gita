# PBG SOP Gita — inside PB1 Core (Handbook section)

The handbook lives in **two places from one content source**: the standalone
app (the repo root) and a **Handbook section inside PB1 Core**. Both are the
*same app* and the *same `PBG_Geeta` data* — Core just embeds it, so there is
nothing to keep in sync and no second login.

## How it works

1. A staff member is already logged into PB1 Core.
2. Core shows a **Handbook** menu item (gated by RolePermissions, below).
3. Opening it shows the handbook **embedded in an iframe**, told who the user
   is. Core passes the user's **Employee ID** and a shared **token**; the Geeta
   backend mints a normal, own-role-scoped session (`coreLogin`) — **no PIN
   asked again**.
4. The user lands on **their own role**: today's checklist, responsibilities,
   their SOPs, this month's training — and **Covering today** if they're
   covering for an absent colleague. Founder / Admin / Satish can switch to any
   role.

The token only ever unlocks **handbook content** — never pricing, financial
data or the attendance grace value (those stay server-side gated regardless).

## Setup (3 steps, done once)

**1. Set the shared token** in the *Geeta* Apps Script
(Project Settings ▸ Script Properties):
```
GEETA_CORE_TOKEN =  (a long random string you choose)
```

**2. Give roles the Handbook menu.** In the PB1 Core **SYSTEM** sheet,
`Roles_Permissions` tab, append one row per role (continue the `RPRM####`
numbering; columns are `PermRowID | Role | MenuKey | CanView | CanCreate |
CanEdit | CanApprove | UpdatedBy | UpdatedAt`):

| Role | MenuKey | CanView | CanCreate | CanEdit | CanApprove |
|---|---|---|---|---|---|
| CEO | handbook | TRUE | TRUE | TRUE | TRUE |
| DIRECTOR | handbook | TRUE | FALSE | FALSE | FALSE |
| ADMIN | handbook | TRUE | TRUE | TRUE | FALSE |
| MANAGER | handbook | TRUE | FALSE | FALSE | FALSE |
| ACCOUNTS | handbook | TRUE | FALSE | FALSE | FALSE |
| SALES EXECUTIVE | handbook | TRUE | FALSE | FALSE | FALSE |
| STORE | handbook | TRUE | FALSE | FALSE | FALSE |
| HR | handbook | TRUE | FALSE | FALSE | FALSE |

(Everyone gets `CanView`; editing handbook content happens in the sheet or via
the Phase-3 approval flow, not here.)

**3. Add the Handbook screen** in the Core frontend. Wherever Core renders a
section for a `MenuKey`, render this for `handbook` (replace the three
`{{...}}` with Core's real values):

```html
<iframe
  title="PBG SOP Gita"
  style="width:100%;height:100%;min-height:80vh;border:0;border-radius:12px"
  src="https://powerbridgeglobal.github.io/PBG-SOP-Gita/index.html?embed=1&emp={{CURRENT_EMPLOYEE_ID}}&token={{GEETA_CORE_TOKEN}}&api={{GEETA_EXEC_URL}}">
</iframe>
```

- `{{CURRENT_EMPLOYEE_ID}}` — the logged-in employee's ID (e.g. `PBG-EMP0007`).
- `{{GEETA_CORE_TOKEN}}` — the same token from step 1.
- `{{GEETA_EXEC_URL}}` — the Geeta web-app `/exec` URL.

That's the whole Core change: one permission row per role and one iframe.

### More-secure option (optional)
If you'd rather the token never appear in the page, have Core's **own Apps
Script** hold `GEETA_CORE_TOKEN`, call `coreLogin` server-side, and pass only
the short-lived session token to the iframe. The embed accepts a `token=` that
is a Geeta session token too, so no app change is needed — only where Core gets
the value. Ask and I'll provide the Core `.gs` proxy snippet.

## Testing the embed (preview, no setup)

Open the app with embed parameters, e.g.:
`…/index.html?embed=1&emp=PBG-EMP0007`
In preview mode it opens straight into the Store Helper handbook with no login
(simulating what Core will show Arjun).
