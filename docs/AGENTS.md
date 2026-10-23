# Agent team: who does what, and who owns which files

The user set up this team on 2026-10-14. **Every agent reads this file before
starting and follows it.** It exists so that two builders can work in one
codebase without overwriting each other.

| Agent | Role | Talks to the user? |
|---|---|---|
| **Agent 1, Mentor** (main chat) | Teaches Aave, coordinates the team, relays notifications | ✅ the only one who does |
| **Agent 2, Builder A** | Builds Aave Pro: shared parts + Deposit/Borrow/Hub/Market/Reserve | ❌ (reports to Agent 1) |
| **Agent 3, Builder B** | Builds Aave Pro: Token, Insights, Changelog, Preferences, Watch address, 404 | ❌ (reports to Agent 1) |
| **Agent 4, Logger/Auditor** | Keeps the process log and status board, and double-checks "DONE" claims | ❌ (reports to Agent 1) |

Scope for everyone: **Aave Pro only** (pro.aave.com), exact UI/UX, **dummy data**.

---

## File ownership (paths are relative to `clone/`)

**Builder A (Agent 2) owns:**
- `src/apps/pro/layout/**`, `src/apps/pro/components/**`, `src/apps/pro/icons.tsx`, `src/apps/pro/ui.tsx`, `src/apps/pro/state.ts`, `src/apps/pro/transactions/**`, `src/apps/pro/routes.tsx`
- Pages: `src/apps/pro/pages/{Explore,Hub,Market,Reserve,ReservePage,Dashboard,Position,Entities,ActivityInsights}.tsx`. `ActivityInsights.tsx` stays with A for **Activity**; Insights moves to B (see below).
- Everything under `src/app/pro/**` **except** the folders listed for Builder B.
- `src/data/mock/**` (existing seeds `pro.ts`, `proLive.ts`, `standard.ts`), plus `src/shared/**`, `src/lib/**`, theme and tokens.
- **The shared chart component** and the search dropdown (part of the shell).
- `docs/PROGRESS.md`, `docs/PRO_CHECKLIST.md`, `docs/PRO_DISCREPANCY_LOG.md`, `docs/PRO_INVENTORY.md`, `docs/ICONS.md`

**Builder B (Agent 3) owns:**
- New page code under `src/apps/pro/pages/token/**`, `src/apps/pro/pages/insights/**`, `src/apps/pro/pages/changelog/**`, `src/apps/pro/pages/preferences/**`, `src/apps/pro/pages/watch-address/**`, `src/apps/pro/pages/notfound/**`
- App-router files:
  - `src/app/pro/explore/token/[symbol]/page.tsx` and `src/app/pro/insights/page.tsx`. Repoint these to B's own components instead of A's `TokenPage` / `ActivityInsights`.
  - New `src/app/pro/changelog/**`, `src/app/pro/preferences/**`, `src/app/pro/watch-address/**`, `src/app/pro/not-found.tsx`
- New mock seed files only: `src/data/mock/seed/proB_*.ts`. B may **import** A's seeds read-only (for consistent numbers), but never edits them.
- `docs/PROGRESS_A3.md`, `docs/PRO_CHECKLIST_A3.md` (same 9 columns), `docs/PRO_DISCREPANCY_LOG_A3.md`
- New tool scripts named `tools/a3-*.mjs`

**Logger (Agent 4) owns:** `docs/PROCESS_LOG.md` and `docs/STATUS_BOARD.md`. It can append to `docs/REQUESTS.md`. It edits **no** source code.

**Shared, append-only for everyone:** `docs/PAGES_DONE.log` and `docs/REQUESTS.md`. Append one line at a time; never rewrite or reorder existing lines.

## Rules
1. **Never edit a file you don't own.** If you need a change in someone else's file (e.g. B needs the shared chart to support bars, or a sidebar link), append a request to `docs/REQUESTS.md`:
   `OPEN | <id e.g. B-3> | from A3 to A2 | <file/component> | <exact change needed>`
   The owner, when it's done:
   `DONE | <same id> | A2 | <what changed>`
   **Builders check REQUESTS.md after every page.**
2. **Import and reuse other agents' components freely, read-only.** Don't copy-and-fork a shared component unless the real page genuinely needs a different one. Log why.
3. **One dev server:** http://localhost:3100 (LAN http://192.168.1.6:3100). Never start another `next dev` and never kill node processes. Agent 1 manages the server.
4. **Only Builder A runs `npm run build`.** Everyone can run `npm run lint`, `npx tsc --noEmit` and the tests.
5. **Page complete** = all 9 checklist categories ✅ (or n/a with a reason), verified by a real-vs-clone comparison at 1440×900 and 390×844, below the fold included. Only then append to `docs/PAGES_DONE.log`:
   `DONE | <page> | http://192.168.1.6:3100/pro/<route> | test: <3-5 things>`
   or `BLOCKED | <page> | <reason>`
6. The guardrails are unchanged:
   - no Aave site logo, plus the small Demo pill;
   - token icons only from open sets (`docs/ICONS.md`);
   - nothing copied from aave/interface or the pro.aave.com bundles;
   - simulated transactions are labelled as simulated;
   - dummy data stays centralised and consistent.
