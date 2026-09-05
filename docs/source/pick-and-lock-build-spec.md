# Pick & Lock — Build Spec

**For:** an AI coding agent implementing this end to end.
**Context:** 24-hour hackathon build (Midnight Moonshot, presented by SpacetimeDB). Core loop must be alive and testable with two clients as early as possible.

---

## 1. What we are building

**One-line pitch:** Pick & Lock helps friends turn "maybe" messages into one confirmed group plan.

**Locked scope:** a group activity that needs a minimum number of friends — bowling, escape room, game night. One narrow product. Not a general planner.

**The problem:** group plans die in the chat. People say "maybe", nobody knows if the activity can actually happen, one person chases everyone, and when someone drops out at the last minute nobody realises the plan is now dead.

**The wedge (why this is not a poll or an RSVP page):** an activity becomes real only when enough eligible people accept it, exactly one activity can be locked at a time, and **the plan automatically reopens if a required person drops out after lock**. Polls tally and stop. RSVP pages record intent. Neither enforces feasibility or survives a dropout.

**Demo story (this is the acceptance test):**
Six friends, Saturday. Three options: Bowling ₹400 needs 4, Escape room ₹600 needs 5, Game night free needs 3.
Everyone opens one link, answers in / out / conditional. The app shows which activities are possible right now.
Someone presses **Propose bowling**. The needed people press **I agree**. Bowling becomes **LOCKED**.
Then one required friend presses **I can't come**. Every screen changes at the same instant from "Bowling is locked" to "Bowling needs a new decision — only 3 of 4 remain."

---

## 2. Stack

- **Server module:** SpacetimeDB, Rust, deployed to Maincloud. All shared state and all rules live here.
- **Client:** TypeScript + React + Vite, SpacetimeDB TypeScript client SDK, typed bindings via `spacetime generate`.
- **Styling:** any utility CSS. Mobile-first, must work on a phone.
- **No other backend.** No REST API, no separate server, no external database.

Setup:
```
brew install clockworklabs/tap/spacetime
spacetime publish --server maincloud <db-name>
spacetime generate --lang typescript --out-dir client/src/module_bindings --project-path server
```
Client connects to `https://maincloud.spacetimedb.com` with the database name.

**Rule for the agent:** every state transition goes through a reducer. The client never computes authoritative results and never writes derived state. Feasibility is computed in the module and stored, or derived client-side purely for display from subscribed rows — never used to gate an action.

---

## 3. Data model

All tables public unless noted. Identity comes from the SpacetimeDB connection identity.

```
plan
  id: u32 (primary key, auto_inc)
  title: String
  date_label: String            // free text, e.g. "Saturday"
  status: String                // "open" | "locked"
  locked_activity_id: Option<u32>
  version: u64                  // bump on every lock/reopen, for animation + ordering

activity
  id: u32 (primary key, auto_inc)
  plan_id: u32
  name: String
  price: u32                    // in rupees, 0 = free
  min_people: u32

friend
  id: u32 (primary key, auto_inc)
  plan_id: u32
  identity: Identity (unique)
  name: String
  online: bool                  // presence
  joined_at: Timestamp

answer
  id: u32 (primary key, auto_inc)
  plan_id: u32
  friend_id: u32
  activity_id: u32
  state: String                 // "in" | "out" | "conditional"
  max_price: Option<u32>        // set only when state == "conditional"
  // unique constraint intent: one answer per (friend_id, activity_id)

proposal
  id: u32 (primary key, auto_inc)
  plan_id: u32
  activity_id: u32
  proposed_by: u32              // friend_id
  status: String                // "pending" | "locked" | "cancelled" | "reopened"
  created_at: Timestamp

acceptance
  id: u32 (primary key, auto_inc)
  proposal_id: u32
  friend_id: u32
  accepted_at: Timestamp
  // unique constraint intent: one acceptance per (proposal_id, friend_id)

event_log
  id: u64 (primary key, auto_inc)
  plan_id: u32
  kind: String                  // "joined" | "answered" | "proposed" | "accepted" | "locked" | "dropped" | "reopened"
  friend_id: Option<u32>
  activity_id: Option<u32>
  message: String               // human-readable, rendered directly in the activity feed
  at: Timestamp
```

**Derived concept — eligibility.** A friend is *eligible* for an activity if their answer is `in`, or `conditional` with `max_price >= activity.price`. `out` and no-answer are not eligible. An activity is *possible* when its eligible count >= `min_people`.

---

## 4. Reducers (the rules live here)

```rust
init()                                   // seed one demo plan + 3 activities
join(plan_id: u32, name: String)
set_answer(activity_id: u32, state: String, max_price: Option<u32>)
propose(activity_id: u32)
accept(proposal_id: u32)
cancel_proposal(proposal_id: u32)
drop_out()                               // "I can't come" — the reopen trigger
leave()                                  // presence only, optional
```

### Invariants — each of these must be enforced in the reducer and must reject cleanly

1. **Own answer only.** `set_answer` writes only the row for the caller's `friend_id`. Reject any attempt to write another friend's answer.
2. **One live proposal per plan.** `propose` aborts if a `pending` proposal already exists for the plan, or if the plan is already `locked`. Two friends proposing different activities at the same instant: the first transaction to commit wins, the second gets a clean rejection. **This is the concurrency race the judges will test.**
3. **Accept requires eligibility.** `accept` aborts if the caller is not eligible for the proposed activity (not `in`, or `conditional` with `max_price < price`).
4. **No double accept.** `accept` aborts if an acceptance already exists for (proposal, friend).
5. **Lock is automatic and atomic.** Inside `accept`, after inserting the acceptance, count acceptances. If `count >= activity.min_people`, in the same transaction: set `proposal.status = "locked"`, set `plan.status = "locked"`, set `plan.locked_activity_id`, bump `plan.version`, write a `locked` event. Never lock in a separate call — it must be one atomic transaction.
6. **One locked activity.** A plan can never have two activities locked. Guarded by rule 2 plus the plan status check.
7. **Reopen on drop.** `drop_out` sets the caller's answer to `out` for all activities and marks them dropped. If the plan is `locked` **and** the caller had accepted the locked proposal, then in the same transaction: set `proposal.status = "reopened"`, set `plan.status = "open"`, clear `locked_activity_id`, bump `plan.version`, write a `reopened` event with the message "needs a new decision — only N of M remain". Every subscribed client sees this at once.
8. **Reject, never silently ignore.** Every rejection returns `Err` with a short human-readable reason; the client surfaces it as a toast.

### Subscriptions

Each client subscribes to all rows for its `plan_id`: `plan`, `activity`, `friend`, `answer`, `proposal`, `acceptance`, `event_log`. All screens render from subscribed state. **No screen may require a refresh to be correct.**

---

## 5. Screens

Mobile-first. Four screens, no more.

**1. Join** — name field, join button. No account, no password, no email. Reached by link or room code. Under 30 seconds from link to inside.

**2. Choices** — one card per activity showing name, price, min people. Buttons: `I'm in`, `I'm out`, `Only if under ₹___`. Selected state is obvious. Answer saves instantly and appears on everyone's screen.

**3. Live group** — the main screen:
- per activity: eligible count vs min people (e.g. "4 / 4 — possible"), and a clear possible / not-possible state
- who has answered and who is still undecided, with presence dots
- the pending proposal with its accept progress, and an `I agree` button for eligible friends
- a live event feed from `event_log`

**4. Locked plan** — big confirmation "Bowling is locked", who accepted, a line stating what happens if someone leaves, and an `I can't come` button. On reopen, this screen visibly transitions back to the live group screen with the reason shown.

**Design notes:** the lock and the reopen are the two emotional beats — give both a visible transition (colour change, count animation) so a judge watching two tabs cannot miss it.

---

## 6. Build order

Do these in order. Do not start a step before the previous one is verified with two clients.

1. Create the SpacetimeDB module, define all tables, publish to Maincloud, confirm it is live.
2. `init` seeds one demo plan with the three activities from the demo story.
3. Join-by-link screen and `join` reducer. Two browsers, both appear in each other's friend list.
4. Activity cards and `set_answer`. Two browsers, an answer in one appears instantly in the other.
5. Eligibility and possible / not-possible counts rendering live.
6. `propose` → `accept` → automatic lock. Verify the lock lands on both screens with no refresh.
7. `drop_out` → automatic reopen. Verify the screen flips on both at once.
8. **Race test:** two clients call `propose` for different activities simultaneously — exactly one succeeds, the other gets a clean rejection toast.
9. **Six-tab test:** run the full demo story with six browser sessions.
10. Reconnect test: refresh a client mid-plan, state rehydrates correctly from the module.
11. Only now: polish, empty states, transitions, mobile pass.

---

## 7. Tests that must pass before we call it done

1. **Two-client race** — simultaneous `propose` (and simultaneous `accept` on the final slot): exactly one succeeds, the other is cleanly rejected, no double lock.
2. **Reconnect** — refresh or disconnect a client, state rehydrates from the module, no local-only state lost.
3. **Ten-client** — ten browser sessions in one plan, all receive the lock and the reopen update.
4. **Stranger task** — a new person opens the link and completes join → answer → accept with no verbal explanation, in under 3 minutes.
5. **No-refresh rule** — at every step, tab two updates without a refresh. If it ever needs one, stop and fix that before anything else.

---

## 8. Event qualifiers to satisfy (do not skip)

- Opens and runs on a phone; live URL works on a fresh device.
- Module live on Maincloud; repo created inside the event window; nothing pushed after code freeze.
- A stranger gets in within 30 seconds, no password wall.
- Onboarding: a first-time user is shown what to do on the join and choices screens.
- Email capture that actually sends an email on signup.
- One-liner on the product: who it's for and what it does.
- Seed the demo plan so an empty room never looks broken.
- Keep the Maincloud database warm before demoing (free tier auto-pauses on inactivity).

---

## 9. Explicit cuts

Do not build: chat, maps, activity or restaurant search, payments, calendar sync, group profiles, AI suggestions, real bookings, notifications, multiple plans per user, plan history, editing activities in-app, auth.

**Cuttable if behind schedule (in this order):**
1. Conditional answers (`Only if under ₹___`) — fall back to in / out only. This is the most likely time sink.
2. The event feed — keep the log table, drop the UI.
3. Presence dots.

**Never cut:** the atomic lock (invariant 5) and the automatic reopen (invariant 7). Those two are the entire product.

---

## 10. Definition of done

Six tabs, one link. Everyone answers. Someone proposes, the needed people accept, it locks on every screen at once. One required person drops out and every screen reopens the decision at the same instant. Two simultaneous proposals resolve to exactly one winner. No refresh needed anywhere, on a phone.
