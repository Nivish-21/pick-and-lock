# Two-Builder Execution Model

## Reality check

The hackathon's original code-freeze was 08:30 Sunday. We are past that window, so the plan is no longer hour-by-hour theatre. It is an ordered first iteration that produces the core demo before optional polish.

## Ownership split

| Lane                    | Owner                          | Starts immediately                                                                                                             | Never edits                                     |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| UI and landing          | You                            | `client/` bootstrap, landing page, room screens, fixtures, components, styles, accessibility, QR/share UI, email form UI.      | `server/**`, `api/**`, bindings, data adapter.  |
| Realtime engine         | Collaborator agent             | `server/` bootstrap, schema, reducers, local tests, Maincloud module, bindings, data adapter, email endpoint, E2E concurrency. | Landing page, UI components, styles, `App.tsx`. |
| One integration handoff | Both, after each lane is green | UI owner mounts the adapter supplied by the server lane.                                                                       | All other files remain owned.                   |

There is one unavoidable dependency: real data cannot be mounted until the server contract exists. It is not a build blocker because UI work uses the frozen `RoomView` fixtures and server work uses the same contract without importing UI code.

## First iteration scope

The first iteration covers every non-cut feature in the written build spec:

- seeded Saturday plan and share link;
- passwordless name-only join and presence;
- in/out/conditional answers with price ceiling;
- live feasible counts and undecided list;
- proposal, eligibility-gated accept, atomic lock, and one locked activity;
- automatic reopen if an accepter drops out;
- event feed, error toast, reconnect behaviour, six/ten-client checks;
- mobile landing page and room screens;
- optional real confirmation email and public deployment.

Do not add create-room, add-activity, generic weighted voting, chat, accounts, search, maps, payments, calendar sync, notifications, or history.

## Milestones

### M1: Two independent working lanes

**UI exit check:** The landing page, Join, Choices, Live Group, and Locked Plan render from `client/src/fixtures/saturdayRoom.ts`. Every interactive control calls a stub matching `RoomActions`; the page is usable at 390px wide.

**Server exit check:** `init`, `join`, `setAnswer`, `propose`, `accept`, `dropOut`, and presence lifecycle reducers compile and pass reducer/race tests against the seeded plan.

### M2: Contract integration

**Server agent supplies:** generated bindings, `client/src/data/spacetime.ts`, and `client/src/data/RoomDataBridge.tsx`. It translates subscriptions into the exact `RoomView` object and reducers into `RoomActions`.

**UI owner performs:** one small mount change in `client/src/App.tsx`, replacing the fixture provider with `RoomDataBridge`. All existing screen/component props remain unchanged.

**Exit check:** Two browser contexts join and see each other; one answer changes the other context with no refresh.

### M3: Core proof

Run the complete Bowling path: four eligible acceptances lock it, then one accepting dropout reopens it everywhere. Run simultaneous competing proposals. Do not start polish before both pass.

### M4: Public demo readiness

Deploy Maincloud and Vercel, provision Resend, run the six-tab and fresh-phone scripts, warm the database, and rehearse a 60-second story.

## Handoff protocol

1. Work from feature branches, never by copying files between local directories.
2. Keep commits scoped to one owned path and one milestone.
3. Each handoff posts the commit SHA, command output, contract impact, and integration action.
4. Contract changes require explicit agreement before either lane edits code.
5. A failed real-time or race check stops polish and returns work to the server lane.

## Schedule correction — 2026-09-05, 17:46 IST

The earlier statement that the team was past the Sunday code-freeze was wrong and is withdrawn. At 17:46 Saturday, 14 hours 44 minutes remain before the 08:30 Sunday freeze. The 17:00 core-loop checkpoint is 46 minutes late, not a reason to cut the first iteration.

| By (IST)       | Required state                                                              | Owner                      |
| -------------- | --------------------------------------------------------------------------- | -------------------------- |
| 18:00 Saturday | UI Vite workspace committed; server module initialised; both lanes started. | Both                       |
| 21:00 Saturday | M1 green: complete fixture UI and tested server core.                       | UI + server                |
| 22:00 Saturday | M2 green: bridge mounted and two-client updates pass.                       | UI + server                |
| 00:00 Sunday   | M3 green: lock/reopen and both race proofs pass.                            | Server with UI observation |
| 06:00 Sunday   | Preview, real email, six-tab rehearsal, and fresh-phone test pass.          | Both                       |
| 08:00 Sunday   | Code freeze; only demo rehearsal and recovery remain.                       | Both                       |

The first response to a missed checkpoint is to remove only optional polish. Do not cut reducer authority, atomic lock/reopen, subscription proof, or the real email requirement.
