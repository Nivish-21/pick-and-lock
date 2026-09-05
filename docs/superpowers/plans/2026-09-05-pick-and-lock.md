# Pick & Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile web room where a friend group reaches one feasible activity decision, locks it atomically, and automatically reopens it when a required accepter drops out.

**Architecture:** A Rust SpacetimeDB module is the single authority for shared data and every state transition. A React + Vite client renders subscribed rows and invokes typed reducers. One Vercel Function, backed by the provisioned Resend integration, sends an optional join confirmation email; it has no authority over plan state.

**Tech Stack:** Rust, SpacetimeDB Maincloud, TypeScript, React, Vite, CSS custom properties, generated SpacetimeDB TypeScript bindings, Vitest, Playwright, Vercel, Resend Marketplace integration.

**Spec:** `docs/source/pick-and-lock-build-spec.md` and `docs/source/the-plan-deck.pdf`

## Global Constraints

- Build the feasibility-and-acceptance product in the written build spec; do not implement the deck's generic weighted poll.
- All shared-state writes use SpacetimeDB reducers; clients never gate actions from local derived state.
- Deploy the module to Maincloud and the client to a public HTTPS URL; the TypeScript client connects through `wss://maincloud.spacetimedb.com`.
- No chat, authentication, payments, bookings, maps, search, calendar sync, notifications, multiple plans, history, or activity editing.
- The seeded demo has Bowling (INR 400, 4), Escape room (INR 600, 5), and Game night (INR 0, 3).
- The join flow must work in under 30 seconds without a password or email requirement.
- Email is optional. It sends a real confirmation without storing plan state outside SpacetimeDB.
- Every rejected action becomes a short toast. Never silently ignore invalid input.

---

## Proposed file structure

| Path                                    | Responsibility                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `server/src/lib.rs`                     | SpacetimeDB table definitions, lifecycle reducers, public reducers, seed data.                 |
| `server/src/rules.rs`                   | Pure eligibility, feasibility, and lock/reopen support functions.                              |
| `server/src/rules_test.rs`              | Unit tests for pure eligibility and count logic.                                               |
| `client/src/lib/connection.ts`          | Maincloud connection builder, token persistence, typed subscriptions.                          |
| `client/src/lib/plan-selectors.ts`      | Pure `PlanView` derived from subscribed rows.                                                  |
| `client/src/lib/plan-selectors.test.ts` | Selector tests for possible, locked, and reopened states.                                      |
| `client/src/lib/validation.ts`          | Input limits and email/name validators shared by UI controls.                                  |
| `client/src/components/*`               | Small presentational components for activity, proposal, feed, presence, toast, and QR sharing. |
| `client/src/screens/*`                  | Join, Choices, Live Group, and Locked Plan composition.                                        |
| `client/src/styles/*`                   | Mobile-first tokens, layout, transition, and accessibility styles.                             |
| `client/e2e/realtime.spec.ts`           | Two-client lock/reopen/no-refresh browser tests.                                               |
| `client/e2e/race.spec.ts`               | Simultaneous proposal and final-accept race coverage.                                          |
| `api/capture-email.ts`                  | Server-only optional email handler using Resend environment variables.                         |
| `vercel.ts`                             | Typed Vercel client build and function configuration.                                          |
| `docs/demo-script.md`                   | Repeatable six-tab judge demo and warm-up steps.                                               |

## Domain interfaces

```rust
enum AnswerState { In, Out, Conditional }
enum PlanStatus { Open, Locked }
enum ProposalStatus { Pending, Locked, Cancelled, Reopened }

fn is_eligible(answer: &Answer, activity: &Activity) -> bool;
fn eligible_friend_ids(plan_id: u32, activity_id: u32, db: &Local) -> Vec<u32>;
fn is_possible(plan_id: u32, activity_id: u32, db: &Local) -> bool;
fn active_acceptance_count(proposal_id: u32, db: &Local) -> u32;
```

```ts
type ActivityView = {
  activityId: number;
  eligibleCount: number;
  minPeople: number;
  possible: boolean;
  callerAnswer: "in" | "out" | "conditional" | null;
};

type PlanView = {
  status: "open" | "locked";
  version: bigint;
  activities: ActivityView[];
  pendingProposal: ProposalView | null;
  lockedActivity: ActivityView | null;
  latestEvent: EventLog | null;
};

function buildPlanView(
  rows: SubscribedPlanRows,
  callerIdentity: Identity,
): PlanView;
```

### Task 1: Bootstrap the implementation workspace

**Files:**

- Create: `server/Cargo.toml`, `server/src/lib.rs`, `server/src/rules.rs`, `client/package.json`, `client/src/main.tsx`, `client/src/App.tsx`, `client/.env.example`, `vercel.ts`.
- Modify: `.gitignore`.
- Test: `server/src/rules_test.rs`, `client/src/App.test.tsx`.

**Produces:** A Rust module and Vite client with separate install/build commands and no copied app scaffold.

- [ ] **Step 1: Create the Rust module from the current SpacetimeDB Rust template.**

  Run: `spacetime init pick-and-lock --server-only --lang rust --project-path server`

  Expected: `server/Cargo.toml` and `server/src/lib.rs` exist; no client is created by this command.

- [ ] **Step 2: Create the Vite React TypeScript client under `client/`.**

  Run: `npm create vite@latest client -- --template react-ts`

  Expected: the client is isolated from the module, with no server framework or REST API.

- [ ] **Step 3: Add the SpacetimeDB TypeScript SDK and test tools to the client.**

  Run: `npm install spacetimedb qrcode.react && npm install -D vitest @testing-library/react @testing-library/jest-dom @playwright/test`

  Expected: client dependencies are locked in `client/package-lock.json`.

- [ ] **Step 4: Add explicit environment names.**

  Put this in `client/.env.example`:

  ```dotenv
  VITE_SPACETIMEDB_HOST=wss://maincloud.spacetimedb.com
  VITE_SPACETIMEDB_DATABASE=pick-and-lock
  ```

- [ ] **Step 5: Verify clean boots.**

  Run: `cargo check --manifest-path server/Cargo.toml` and `npm run build --prefix client`

  Expected: both commands exit 0 before feature work begins.

- [ ] **Step 6: Commit the bootstrap.**

  ```bash
  git add server client vercel.ts .gitignore
  git commit -m "chore: bootstrap Pick and Lock module and client"
  ```

### Task 2: Define typed schema and seed the demo room

**Files:**

- Modify: `server/src/lib.rs`.
- Create: `server/src/rules.rs`, `server/src/rules_test.rs`.
- Test: `server/src/rules_test.rs`.

**Consumes:** The server crate from Task 1.

**Produces:** Public `plan`, `activity`, `friend`, `answer`, `proposal`, `acceptance`, and `event_log` tables, plus idempotent demo data.

- [ ] **Step 1: Write the failing seed test.**

  Assert that the seed factory returns exactly one open plan, share code `SATURDAY`, and the three activity tuples `(Bowling, 400, 4)`, `(Escape room, 600, 5)`, and `(Game night, 0, 3)`.

- [ ] **Step 2: Define domain enums and table rows.**

  Implement typed `AnswerState`, `PlanStatus`, and `ProposalStatus`; add `share_code` and `dropped_at` as documented in `docs/architecture.md`; make every table public for subscriptions.

- [ ] **Step 3: Implement `init`.**

  `init` must first check for the demo plan's share code and return without inserting duplicate rows when the module is republished without data deletion.

- [ ] **Step 4: Run the unit test and module build.**

  Run: `cargo test --manifest-path server/Cargo.toml` and `spacetime build --module-path server`

  Expected: the schema compiles and repeated seed evaluation preserves one plan.

- [ ] **Step 5: Commit the schema.**

  ```bash
  git add server/src/lib.rs server/src/rules.rs server/src/rules_test.rs
  git commit -m "feat: define Pick and Lock schema and demo seed"
  ```

### Task 3: Implement validation and eligibility rules

**Files:**

- Modify: `server/src/rules.rs`, `server/src/rules_test.rs`.
- Create: `client/src/lib/validation.ts`, `client/src/lib/validation.test.ts`.
- Test: `server/src/rules_test.rs`, `client/src/lib/validation.test.ts`.

**Produces:** Shared, deterministic validation limits and pure feasibility logic used by reducers and display selectors.

- [ ] **Step 1: Add failing eligibility cases.**

  Cover `in`, `out`, `conditional` above price, `conditional` equal to price, `conditional` below price, and no answer. Assert that only `in` and sufficient `conditional` answers are eligible.

- [ ] **Step 2: Implement the server helpers.**

  ```rust
  pub fn is_eligible(answer: Option<&Answer>, activity: &Activity) -> bool {
      matches!(answer.map(|row| &row.state), Some(AnswerState::In))
          || matches!(answer, Some(row) if row.state == AnswerState::Conditional
              && row.max_price.is_some_and(|price| price >= activity.price))
  }
  ```

- [ ] **Step 3: Validate every trust-boundary input.**

  Reject blank or over-40-character names, blank or over-60-character activity labels, invalid answer state/price pairs, unknown plan/activity/proposal IDs, and actions from a caller who has not joined or has dropped out.

- [ ] **Step 4: Add client validation tests.**

  Test display names with trimming, maximum length, and optional email syntax. The email validator returns a user-facing string or `null`; it does not send or store anything.

- [ ] **Step 5: Run checks and commit.**

  Run: `cargo test --manifest-path server/Cargo.toml` and `npm test --prefix client -- validation`

  ```bash
  git add server/src/rules.rs server/src/rules_test.rs client/src/lib/validation.ts client/src/lib/validation.test.ts
  git commit -m "feat: enforce input validation and eligibility"
  ```

### Task 4: Join and presence

**Files:**

- Modify: `server/src/lib.rs`.
- Create: `client/src/lib/connection.ts`, `client/src/lib/connection.test.ts`.
- Test: `client/src/lib/connection.test.ts`.

**Produces:** Identity-bound friend rows and a client connection that subscribes before rendering room state.

- [ ] **Step 1: Write reducer integration assertions.**

  Verify that two connection identities calling `join` create two rows, a repeated `join` from the same identity does not duplicate a row, and a missing/invalid plan is rejected.

- [ ] **Step 2: Implement `join`, `client_connected`, `client_disconnected`, and `leave`.**

  `join` binds `ctx.sender` to the row. Lifecycle reducers change only `online`; `drop_out` is the only reducer that sets `dropped_at`.

- [ ] **Step 3: Build the connection factory.**

  ```ts
  export function createConnection(databaseName: string): DbConnectionBuilder {
    return DbConnection.builder()
      .withUri(import.meta.env.VITE_SPACETIMEDB_HOST)
      .withDatabaseName(databaseName)
      .onConnect((ctx, _identity, token) => {
        localStorage.setItem("pick-and-lock/token", token);
        ctx
          .subscriptionBuilder()
          .subscribe([
            tables.plan,
            tables.activity,
            tables.friend,
            tables.answer,
            tables.proposal,
            tables.acceptance,
            tables.eventLog,
          ]);
      });
  }
  ```

- [ ] **Step 4: Verify two clients locally.**

  Run local SpacetimeDB, open two browser contexts, join as different names, and assert both clients render both participant names without reload.

- [ ] **Step 5: Commit.**

  ```bash
  git add server/src/lib.rs client/src/lib/connection.ts client/src/lib/connection.test.ts
  git commit -m "feat: add identity-bound joining and presence"
  ```

### Task 5: Answers, subscriptions, and display selectors

**Files:**

- Modify: `server/src/lib.rs`.
- Create: `client/src/lib/plan-selectors.ts`, `client/src/lib/plan-selectors.test.ts`.
- Test: `client/src/lib/plan-selectors.test.ts`, `client/e2e/realtime.spec.ts`.

**Produces:** One answer per caller/activity, live eligibility counts, and display-only `PlanView` state.

- [ ] **Step 1: Write selector fixtures.**

  Include four friends answering Bowling: `in`, `in`, `conditional(400)`, and `conditional(399)`. Assert the selector reports `3 / 4` and `possible: false`; changing the fourth value to `400` reports `4 / 4` and `possible: true`.

- [ ] **Step 2: Implement `set_answer` as an identity-scoped upsert.**

  Resolve the caller's friend row from `ctx.sender`, ensure the activity belongs to that plan, update or insert only their unique answer key, and append one `answered` event.

- [ ] **Step 3: Implement `buildPlanView`.**

  The selector receives subscribed rows and caller identity, computes counts and caller-specific button state, and returns no mutation functions.

- [ ] **Step 4: Create the two-browser live-answer test.**

  Client A chooses `I'm in`; client B waits for its activity count to change. The assertion must pass without navigation, reload, or polling.

- [ ] **Step 5: Run and commit.**

  ```bash
  npm test --prefix client -- plan-selectors
  npx playwright test client/e2e/realtime.spec.ts
  git add server/src/lib.rs client/src/lib/plan-selectors.ts client/src/lib/plan-selectors.test.ts client/e2e/realtime.spec.ts
  git commit -m "feat: sync answers and live feasibility"
  ```

### Task 6: Proposals and atomic lock

**Files:**

- Modify: `server/src/lib.rs`, `server/src/rules.rs`.
- Create: `client/e2e/race.spec.ts`.
- Modify: `client/src/lib/plan-selectors.ts`.

**Produces:** A single live proposal and a lock that can only occur inside the final `accept` transaction.

- [ ] **Step 1: Write failing proposal race coverage.**

  Prepare a possible Bowling and possible Game night. Fire `propose(bowling)` and `propose(gameNight)` from two eligible identities without awaiting either call. Assert one reducer succeeds, one returns a sender error, and exactly one pending proposal exists.

- [ ] **Step 2: Implement `propose` and `cancel_proposal`.**

  Reject a locked plan, a non-eligible or dropped caller, a non-possible activity, and an existing pending proposal. Only the original proposer may cancel a pending proposal.

- [ ] **Step 3: Write final-accept race coverage.**

  With `min_people - 1` acceptances already present, submit two final `accept` calls at once. Assert one proposal becomes locked, the plan holds that proposal's activity, `version` increments once, and no second locked row exists.

- [ ] **Step 4: Implement `accept`.**

  Insert the unique acceptance, count active acceptances, and when count reaches `min_people`, atomically set `proposal.status = Locked`, `plan.status = Locked`, `plan.locked_activity_id`, increment `plan.version`, and insert the `locked` event.

- [ ] **Step 5: Surface reducer errors as toasts.**

  Add a typed connection/reducer error adapter returning `{ title: 'Action not applied', message }`; render it in the client without changing subscribed rows manually.

- [ ] **Step 6: Run and commit.**

  ```bash
  cargo test --manifest-path server/Cargo.toml
  npx playwright test client/e2e/race.spec.ts
  git add server/src client/e2e/race.spec.ts
  git commit -m "feat: lock one feasible proposal atomically"
  ```

### Task 7: Automatic reopen on dropout

**Files:**

- Modify: `server/src/lib.rs`, `server/src/rules.rs`.
- Modify: `client/src/lib/plan-selectors.ts`, `client/e2e/realtime.spec.ts`.
- Test: `server/src/rules_test.rs`, `client/e2e/realtime.spec.ts`.

**Produces:** The product's key recovery path: a lock reopens when an accepting participant leaves the activity.

- [ ] **Step 1: Write the failing reopening test.**

  Lock Bowling with four accepting friends. Have one accepter call `drop_out`. Assert that every one of their answers is `out`, their `dropped_at` is set, plan status returns to `Open`, `locked_activity_id` is empty, proposal status becomes `Reopened`, and `version` increments once.

- [ ] **Step 2: Implement `drop_out`.**

  Execute all changes in the reducer transaction. If the caller accepted the locked proposal, count remaining active acceptances and create `needs a new decision - only N of M remain`, where `M` is the activity minimum and `N` is the post-dropout active acceptance count.

- [ ] **Step 3: Test non-accepter dropout.**

  A dropped friend who did not accept a locked proposal has answers set to `out` but leaves the lock intact.

- [ ] **Step 4: Add the visible recovery transition.**

  Key the lock/return animation to `plan.version`; announce the reopening reason in an `aria-live="polite"` region; route the Locked Plan screen back to Live Group when subscribed status changes.

- [ ] **Step 5: Verify and commit.**

  ```bash
  cargo test --manifest-path server/Cargo.toml
  npx playwright test client/e2e/realtime.spec.ts --grep "reopens"
  git add server/src client/src client/e2e/realtime.spec.ts
  git commit -m "feat: reopen locked plans when an accepter drops out"
  ```

### Task 8: Build the four mobile screens

**Files:**

- Create: `client/src/screens/JoinScreen.tsx`, `client/src/screens/ChoicesScreen.tsx`, `client/src/screens/LiveGroupScreen.tsx`, `client/src/screens/LockedPlanScreen.tsx`.
- Create: `client/src/components/ActivityCard.tsx`, `ProposalCard.tsx`, `EventFeed.tsx`, `PresenceList.tsx`, `ShareLink.tsx`, `ToastRegion.tsx`.
- Create: `client/src/styles/tokens.css`, `layout.css`, `motion.css`.
- Modify: `client/src/App.tsx`.
- Test: `client/src/screens/*.test.tsx`.

**Produces:** A phone-first, accessible UI for all subscribed plan states.

- [ ] **Step 1: Write screen tests from `PlanView` fixtures.**

  Assert Join exposes a labelled display-name input and join button; Choices exposes three answer controls per activity; Live Group shows `eligible / min`, pending proposal progress, and event feed; Locked Plan shows the activity, acceptors, and `I can't come`.

- [ ] **Step 2: Implement Join and Choices.**

  Join validates a trimmed name before calling `join`. Choices calls `set_answer` immediately. Conditional answers show a numeric INR maximum only after that selection.

- [ ] **Step 3: Implement Live Group and proposal actions.**

  Each activity card renders possible/not-possible text, count, and caller state. Pending proposal cards show acceptance count and an `I agree` button only for display-eligible callers; reducer rejection remains authoritative.

- [ ] **Step 4: Implement Locked Plan and recovery.**

  Render the locked activity and accepting names. The dropout control calls `drop_out`; subscription state, not a click handler, changes the screen.

- [ ] **Step 5: Add responsive and accessible styling.**

  Use a single-column layout below 640px, 44px minimum controls, visible focus rings, colour plus text for status, reduced-motion fallback, and semantic headings/buttons.

- [ ] **Step 6: Run component checks and commit.**

  ```bash
  npm test --prefix client
  npm run lint --prefix client
  git add client/src
  git commit -m "feat: add mobile decision-room screens"
  ```

### Task 9: Add share link, QR code, and optional real email capture

**Files:**

- Create: `client/src/components/ShareLink.tsx`, `api/capture-email.ts`, `client/src/lib/email.ts`.
- Modify: `client/src/screens/JoinScreen.tsx`, `vercel.ts`.
- Test: `client/src/components/ShareLink.test.tsx`, `client/src/lib/email.test.ts`, `api/capture-email.test.ts`.

**Consumes:** The Vercel Marketplace discovery result `resend/resend-email`.

**Produces:** Shareable `/r/SATURDAY` URL and a non-blocking, real email confirmation route.

- [ ] **Step 1: Provision the email integration before writing the handler.**

  Run: `vercel integration add resend/resend-email --yes --no-claim`

  If Vercel opens a browser claim flow, stop and have the repository owner complete it. Pull environment names only afterwards with `vercel env pull --yes`; never print secret values.

- [ ] **Step 2: Write failing API tests.**

  Assert an invalid email returns HTTP 400, a valid email calls the Resend send method with the plan link, and provider failure returns HTTP 502 without exposing provider details.

- [ ] **Step 3: Implement the handler.**

  `POST /api/capture-email` accepts `{ email, planUrl }`, repeats server-side validation, sends a concise confirmation email, and returns `{ sent: true }`. It does not persist an email or touch SpacetimeDB tables.

- [ ] **Step 4: Add the optional Join UI.**

  After `join` succeeds, let the participant enter an email or skip. A send failure shows a retry notice while retaining access to the room.

- [ ] **Step 5: Implement sharing.**

  `ShareLink` displays the canonical room URL, copy button, and QR code whose encoded value is exactly that URL. Test the QR payload and copy feedback.

- [ ] **Step 6: Verify and commit.**

  ```bash
  npm test --prefix client
  npm run build --prefix client
  git add client api vercel.ts
  git commit -m "feat: add room sharing and optional email confirmation"
  ```

### Task 10: Deploy, generate bindings, and configure the public client

**Files:**

- Create: `docs/deployment.md`.
- Modify: `client/.env.example`, `vercel.ts`, generated `client/src/module_bindings/*`.
- Test: `client/e2e/realtime.spec.ts` against the production URL.

**Produces:** Maincloud module, public Vercel URL, and reproducible deployment instructions.

- [ ] **Step 1: Publish the module.**

  Run: `spacetime publish --module-path server --server maincloud pick-and-lock`

  Record the database identity and deployment timestamp in `docs/deployment.md`; do not commit credentials.

- [ ] **Step 2: Generate typed client bindings.**

  Run: `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server`

  Run `npm run format --prefix client`, then commit generated bindings with the server revision that produced them.

- [ ] **Step 3: Configure Vercel.**

  Link the project with `vercel link`, then set `VITE_SPACETIMEDB_HOST=wss://maincloud.spacetimedb.com` and `VITE_SPACETIMEDB_DATABASE=pick-and-lock` through `vercel env add`. The Resend key remains server-only.

- [ ] **Step 4: Deploy preview then production.**

  Run: `vercel` and verify email, join, answer, lock, and reopen on the preview URL. Then run `vercel --prod` only after the acceptance suite passes.

- [ ] **Step 5: Commit deployment instructions.**

  ```bash
  git add docs/deployment.md client/.env.example vercel.ts client/src/module_bindings
  git commit -m "docs: add production deployment runbook"
  ```

### Task 11: Verify real-time, concurrency, reconnect, and mobile acceptance

**Files:**

- Modify: `client/e2e/realtime.spec.ts`, `client/e2e/race.spec.ts`, `docs/demo-script.md`.
- Create: `client/e2e/reconnect.spec.ts`, `client/e2e/ten-client.spec.ts`.

**Produces:** Evidence that the product satisfies every event acceptance criterion.

- [ ] **Step 1: Complete the simultaneous proposal and final-accept races.**

  Assert exactly one success and one human-readable toast rejection in each race. Assert the final database state has one locked activity and one `locked` event.

- [ ] **Step 2: Write reconnect coverage.**

  Refresh a participant after answers and after lock. Assert the reconnected client rebuilds the same `PlanView` solely from subscriptions and reads no product state from localStorage beyond its SpacetimeDB token.

- [ ] **Step 3: Write the ten-client subscription check.**

  Connect ten isolated browser contexts to the same seeded link, drive four acceptances to lock then one accepting dropout, and assert all ten contexts observe both state transitions without reload.

- [ ] **Step 4: Run a fresh-phone walkthrough.**

  On a device with no existing app data: open the public URL, join, answer, accept, and observe lock in under three minutes. Record the result in `docs/demo-script.md`.

- [ ] **Step 5: Run the complete quality gate and commit.**

  ```bash
  cargo test --manifest-path server/Cargo.toml
  npm run lint --prefix client
  npm run build --prefix client
  npx playwright test client/e2e
  git add client/e2e docs/demo-script.md
  git commit -m "test: verify realtime decision flow under concurrency"
  ```

### Task 12: Prepare the judge demo and code-freeze handoff

**Files:**

- Create: `docs/demo-script.md`, `docs/release-checklist.md`.
- Modify: `README.md`.

**Produces:** A rehearsed, shareable submission with no undocumented manual steps.

- [ ] **Step 1: Write the exact six-tab demo script.**

  Use the seeded Saturday room. Have six names join, make Bowling possible, propose it, accept with four eligible friends, drop one accepter, and read the reopen event aloud.

- [ ] **Step 2: Add a 60-second product explanation.**

  State: "Pick & Lock helps a friend group turn maybes into one feasible plan, then reopens the decision automatically if a required person drops out."

- [ ] **Step 3: Add the release checklist.**

  Include Maincloud live, public Vercel URL tested on a fresh phone, Resend send verified, database warmed, repo visible to collaborators, all quality gates green, and no pushes after code freeze.

- [ ] **Step 4: Rehearse with people who did not build it.**

  Time link-open-to-join. If it exceeds 30 seconds or anyone needs verbal instruction, fix onboarding before visual polish.

- [ ] **Step 5: Tag the release.**

  ```bash
  git add README.md docs/demo-script.md docs/release-checklist.md
  git commit -m "docs: add demo and release runbook"
  git tag -a v1.0.0-moonshot -m "Pick and Lock hackathon submission"
  git push origin main --follow-tags
  ```

## Coverage review

| Source requirement                          | Plan tasks            |
| ------------------------------------------- | --------------------- |
| Seeded feasibility demo                     | 2, 5, 12              |
| Identity-only join and presence             | 4, 8                  |
| Eligibility and conditional price           | 3, 5, 8               |
| One proposal and atomic lock                | 6                     |
| Reopen after accepter dropout               | 7                     |
| Real-time subscriptions/no refresh          | 4, 5, 11              |
| Mobile UI and visible transitions           | 7, 8                  |
| Public Maincloud + fresh-device URL         | 10, 11, 12            |
| Required email capture                      | 9, 10                 |
| Two-client race, reconnect, ten-client test | 6, 11                 |
| Explicit product cuts                       | Global Constraints, 8 |

## Implementation guardrails

- Use reducer errors for all invalid actions. Do not hide failed actions behind disabled browser controls alone.
- Treat generated bindings as build outputs: regenerate, format, and commit them after module changes; never hand-edit them.
- The `event_log.message` is plain text. React rendering must remain escaped and no HTML must be stored or injected.
- Keep the email endpoint small, rate-limited by the integration/provider configuration, and independent from the decision state.
- If conditional answers threaten the schedule, remove that UI and server enum branch together. Do not weaken lock/reopen behaviour.
