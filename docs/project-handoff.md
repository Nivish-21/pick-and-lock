# Pick & Lock — Project Handoff

**Last updated:** 2026-09-05

## What we are building

Pick & Lock is a mobile-first shared decision room. A creator gets a public room link such as `/r/SATURDAY`, shares it or its QR code, and participants join with a display name. They declare availability, propose a viable choice, and lock it only when enough eligible people accept. The room updates live through SpacetimeDB and automatically reopens if an accepting participant drops out.

The product is broader than an outing planner: a room represents any small group decision. The current first-version activity data is deliberately seeded and fixed; arbitrary custom choices are a later schema/product change, not a hidden assumption in the current implementation.

## Architecture

| Layer | Choice | Responsibility |
| --- | --- | --- |
| Public client | React + TypeScript + Vite | UI, share route, QR display, and a read-only projection of live state |
| Public hosting | Vercel | Serves the static Vite application and rewrites `/r/<shareCode>` to the SPA entry point |
| Realtime authority | SpacetimeDB Maincloud | Room rows, reducers, subscriptions, presence, decisions, metrics, chat, and lifecycle authority |
| Authoritative database | Maincloud database `pick-and-lock` | Already published with seeded `SATURDAY` room data |
| Optional email | Vercel function + Resend HTTP API | Sends a derived room link after entry; it never gates entry or mutates room state |
| Future assistant | Server-side provider adapter | Reads only consented room/preferences context and produces non-authoritative suggestions |

No secret belongs in client code, Git, browser storage, screenshots, prompts, or chat. The client receives only public configuration such as `VITE_SPACETIMEDB_HOST` and `VITE_SPACETIMEDB_DATABASE`; provider API keys remain server-only environment variables.

## What has happened

| Area | State | Evidence |
| --- | --- | --- |
| Repository and plans | Complete | Main branch includes contracts, plans, ownership rules, decisions, status, and changelog. |
| UI foundation | Complete, fixture-backed | Landing, name join, activity answers, proposal, lock/reopen, share copy, responsive/accessibility checks. |
| Maincloud server core | Published | `pick-and-lock` exists with `SATURDAY`, room-scoped members, answers, proposals, acceptances, events, and reducer authority. |
| Generated client bindings | Complete for current schema | `client/src/module_bindings/**` is committed and must be regenerated after each server schema change. |
| Real-time bridge | In progress by collaborator | Owns `client/src/data/**`; it will resolve share code first, then map room-scoped subscriptions to the UI facade. |
| Metrics, chat, close schema | Blocked for migration correction | `server/room-insights` commit `3ee5a58` passed local gates but cannot publish because it alters existing `plan` rows incompatibly. See `docs/maincloud-migration-safety.md`. |
| Share route | Ready for review | `origin/ui/room-route`, commit `4b7804032129e1c2a7c9f516fdfd14b3821db193`. |
| QR component | Ready for review | `origin/ui/room-qr`, commit `3a0227d41ee976aae960fdeb18c20374c9266957`. |
| Vercel SPA configuration | Ready for review | `origin/deploy/vercel-static`, commit `b5725762416e59c3393eabc134b5c49270f6abfc`. |
| Create-room UI | Assigned externally | It owns only the new page, test, and stylesheet on `ui/create-room`. |
| Email endpoint | Planned, not started | U8; must use server-side provider configuration only. |

## Work happening now

1. **Metrics schema lane** adds immutable decision rows, one room-summary row, short chat messages, lifecycle timestamps, and creator-only closing. It will regenerate bindings but will not publish the schema.
2. **Data-bridge lane** maps current tables into `RoomView` and actions under `client/src/data/**`. It first pushes a bridge checkpoint, then rebases on the metrics bindings and adds insights/chat/close support.
3. **External create-room lane** builds a presentational creation form only. It does not connect to the database or route.

## Exact integration order

1. Review and merge the ready route, QR, and Vercel configuration commits one at a time; run the client test, lint, build, and `git diff --check` after each merge.
2. Rework the metrics branch to the safe `room_lifecycle`-table design in `docs/maincloud-migration-safety.md`; run Rust format/build, regenerate bindings, and run client checks. Do not merge or deploy `3ee5a58` as-is.
3. Have the bridge agent rebase on the merged bindings and finish its room-specific subscriptions/actions.
4. Mount the bridge and the create-room page in `App.tsx`; render the QR component from the canonical route URL.
5. Test two browser contexts against Maincloud: joining, answers, proposal/accept, lock, reopening, decision metrics, chat, and creator-only close.
6. Obtain explicit confirmation before publishing the corrected Maincloud schema update. Publish without `--delete-data`, then verify rows with read-only queries.
7. Link Vercel to the client project, set public SpacetimeDB variables, deploy, and test a direct `/r/<shareCode>` visit plus QR scan.
8. Add the optional email endpoint only after the core hosted proof passes.

## Definition of done for version 1

A person can open a deployed room URL or QR code, enter a name, see live group state, make a choice, participate in an atomic decision, and see that decision lock or reopen on every connected client. The room retains its decision history, total decision count, time per decision, total decision time, events, and short chat. Only the creator can close a locked room. A closed room preserves history and rejects further state-changing actions. All public state is from Maincloud; no fixture data is presented as live data.

## Future phase — consented preference memory and decision assistant

This is a later phase. It must not delay the version-1 hosted proof.

### Product behaviour

- A participant may explicitly opt in to a preference profile: for example budget range, activity dislikes, accessibility needs, or stated preferences.
- The participant can see, edit, export, and delete every remembered preference.
- Room sharing has its own consent: a person chooses whether their preferences may inform suggestions for a specific group room.
- Chat can be used as assistant context only when the sender and room policy allow it. The assistant proposes options, trade-offs, and conflict warnings; it never votes, locks, closes, or changes room data.
- A useful warning is specific but privacy-preserving: “One participant’s shared budget preference conflicts with this option.” It must not reveal whose preference it is unless that participant chose identity disclosure.
- Assistant suggestions are visibly labelled as suggestions, include the evidence category (budget, availability, stated preference), and can be dismissed or corrected.

### Identity and privacy boundary

Do **not** use a covert browser fingerprint as a cross-room identity or memory key. It is unstable, hard to revoke, privacy-invasive, and creates a deceptive consent boundary.

Use the existing SpacetimeDB connection identity for an active browser session. For durable cross-device memory, add an explicit account or a user-controlled recovery/link mechanism later. Preference storage must use an explicit `preference_profile` keyed by the consenting identity, not raw canvas/font/device fingerprint data. Preferences need source (`user_stated` or `inferred`), confidence, scope, timestamp, expiry, and deletion state so users can correct or forget them.

### Planned assistant data model

| Future row | Purpose | Required controls |
| --- | --- | --- |
| `preference_profile` | One consent record per identity | consent version, scope, created/updated/revoked timestamps |
| `preference_item` | One inspectable preference | category, value, source, confidence, expiry, visibility, delete action |
| `assistant_memory` | User-visible distilled memory | source references, correction, delete, no hidden raw transcript copy |
| `assistant_suggestion` | Room-scoped recommendation/audit | plan ID, evidence categories, timestamp, dismissal/correction state |

### Provider and key policy

OpenAI, Haven, and any other provider remain unselected implementation details until their API contracts, data retention terms, costs, and request limits are verified. Build one server-side provider adapter; do not spread provider calls across React components or reducers. The adapter receives the least context necessary, never receives raw device fingerprint data, and has a feature flag plus audit events. Keys are configured only as Vercel/Maincloud secrets by the account owner.

## First document an incoming agent should read

1. `docs/project-handoff.md` — current truth, lanes, integration order, and outcome.
2. `docs/room-insights-spec.md` — authoritative metrics/chat/close requirements.
3. `docs/contracts/realtime-contract.md` — current UI/server contract.
4. `docs/superpowers/plans/2026-09-05-room-insights.md` — executable task sequence.
5. `AGENTS.md` — ownership and quality rules.

## Deployment update — 2026-09-05

The version-1 demo is live at **https://pick-and-lock.vercel.app**. A direct visit to **https://pick-and-lock.vercel.app/r/SATURDAY** was verified against Maincloud: the browser joined as `Demo Guest`, saw the existing `Demo Host` and live Bowling count, and received the canonical deployed room URL in its QR component. The server metrics branch remains deliberately excluded until its additive migration correction is complete.

The clean presenter room is **https://pick-and-lock.vercel.app/r/XATWU1XNQB** (`Demo dinner decision`, `Tonight`). It was created and joined through the public production client, so presenters should use this URL rather than the seeded `SATURDAY` smoke-test room.

## Next product version — private custom rooms

The planned v2 replaces the public fixed-choice creation path with an invite-only custom-room wizard: purpose, schedule/timezone, choices, privacy, then QR/invite sharing. It is intentionally a new private system beside v1, not a cosmetic upgrade to public share codes. Read `docs/private-rooms-and-scheduling-spec.md` before touching v2 code.

## Planned v2 extension — public decision story

A private-room creator may later opt in to a separate read-only `/share/<publicRoomId>` page. It is not a room link: it renders only a curated public story and the CTA **“Have a decision to make? Make it together.”** with **“Create your own room”** linking to `/`. It never exposes member names, chats, individual votes, invite data, or preferences. Read `docs/public-sharing-and-cta-spec.md` and the execution plan before implementation.

## Agent coordination now

Use `docs/agent-collaboration-protocol.md` and GitHub Issues as the current task queue. An incoming agent claims one `ready` issue in its owned lane, pushes a focused branch, opens a PR handoff, then claims the next unblocked issue. The repository owner does not need to issue a new chat prompt after every task.
