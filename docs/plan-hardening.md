# Pick & Lock Plan Hardening

## Purpose

This document closes the gaps that would otherwise cause implementation ping-pong, race-condition bugs, or a late integration failure. It adds constraints and tests to the written build spec; it does not expand product scope.

## Decision order

1. `docs/source/pick-and-lock-build-spec.md` controls the product scope.
2. This document resolves omitted lifecycle, security, dependency, and handoff behaviour.
3. `docs/contracts/realtime-contract.md` is the frozen UI/server interface.
4. `AGENTS.md` controls agent ownership and workflow.
5. The two-builder execution plan controls task order.
6. The PDF deck informs pitch and visual tone only.

## Resolved weaknesses

| Risk                                                            | Resolution                                                                                                                                                                                   | Owner        | Proof gate                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| A route has a share code but reducers need a plan ID.           | Subscribe to the unique `plan.share_code` first, resolve one plan ID, then subscribe all plan-scoped rows.                                                                                   | Server agent | Unknown/missing/duplicate share code stays on an error state and sends no reducer.     |
| Concurrent proposals or accepts create contradictory state.     | Each reducer is one SpacetimeDB transaction; unique keys guard answer/acceptance pairs; all lock writes occur inside `accept`.                                                               | Server agent | Two proposal and two final-accept races leave one valid result.                        |
| An accepter changes their answer before a later person accepts. | Count only active, currently eligible acceptances; block `setAnswer` after lock.                                                                                                             | Server agent | Change to `out` before final accept prevents lock; post-lock answer change rejects.    |
| A dropped person refreshes and silently returns.                | `dropped_at` is durable. Existing active identity only restores presence; a dropped identity receives `You are marked out for this plan`.                                                    | Server agent | Reconnect after dropout remains out and never reopens a second time.                   |
| Proposer status is unclear.                                     | Proposing does not accept. The proposer presses `I agree` like every eligible friend.                                                                                                        | UI + server  | Proposal begins at `0 / min_people` unless someone explicitly accepts.                 |
| Email endpoint becomes an open relay.                           | Accept only same-origin `POST` JSON under 8 KiB; validate email; accept `shareCode`, not arbitrary URL; derive canonical URL from a server environment variable; use verified Resend sender. | Server agent | Invalid method/body/email/share code rejects; email contains only canonical room link. |
| Email blocks no-login onboarding.                               | Email capture appears after successful join, has a visible Skip action, and failure leaves the user in the room.                                                                             | UI owner     | Fresh device joins in under 30 seconds with no email.                                  |
| Email violates no-other-backend rule.                           | Vercel Function is outbound email only. It cannot read/write plan tables and no product state is stored outside SpacetimeDB.                                                                 | Server agent | Code review verifies no plan mutation endpoint exists.                                 |
| UI and backend edit the same files.                             | UI uses fixtures and owns visual paths; server owns module/data/bindings. The only shared action is one UI-owned `App.tsx` mount of the bridge.                                              | Both         | `git diff --name-only` for each lane stays inside owned paths.                         |
| Generated bindings drift from the module.                       | Generate bindings immediately after every published schema/reducer change; commit them with the server change; never hand-edit them.                                                         | Server agent | Client build uses generated bindings at the same commit as module contract.            |
| Public tables accidentally hold email or secrets.               | Email never enters SpacetimeDB. All event messages are server-generated plain text; names are length-limited text rendered by React.                                                         | Both         | Database inspection shows no email field; UI does not use HTML injection.              |
| Deployment is treated as final instead of testable.             | Preview validates Maincloud connection, two-client updates, and real email before production. Production deploy follows all acceptance gates.                                                | Both         | Fresh phone passes demo URL before release tag.                                        |

## State-machine rules: no loops

```text
OPEN, no proposal --propose--> OPEN, pending
OPEN, pending --accept below threshold--> OPEN, pending
OPEN, pending --accept at threshold--> LOCKED
OPEN, pending --cancel--> OPEN, no proposal
LOCKED --accepting friend drops out--> OPEN, old proposal reopened
LOCKED --non-accepting friend drops out--> LOCKED
```

There is no reducer path from `reopened` back to `locked`. A reopened proposal is terminal. The next decision always creates a new proposal. There is no path that can create two pending proposals, two locked activities, or a lock outside `accept`.

## Controlled dependency graph

```text
Frozen docs and contract
        |
        +--> UI lane: client fixtures, landing, screens, styles
        |
        +--> Server lane: module, reducers, race tests, bindings, bridge
                                      |
                                      v
                         UI-owned one-line App mount
                                      |
                                      v
                 two-client proof -> races -> deployment -> demo
```

The foundation documents are already committed. UI and server work can now begin in parallel. The bridge is deliberately one-way: it adapts server rows to the UI contract; it never asks components to know generated binding types.

GitHub is the engineering collaboration system: separate branches, owned paths, reviewable commits, and the stated handoff format. SpacetimeDB is the product's collaboration system: it is the sole real-time authority for room state. Do not use the product database to coordinate implementation work.

The UI bootstrap is the only ordering prerequisite: the UI owner commits the empty Vite `client/` workspace first. The server lane can build and test `server/**` immediately and needs that workspace only later, when it writes its owned bridge and generated-binding directories. This is a scheduled handoff, not a blocker.

## Onboarding strategy

1. Landing page states the one-liner and has one `Open Saturday room` call to action.
2. Join screen says `Pick a name so your friends know who answered` above the name input.
3. After join, Choices displays `Step 1 of 2: tell the group what works for you` and one-line help for conditional price.
4. Live Group displays `Step 2 of 2: propose or agree with a feasible option` only until a proposal exists.
5. Locked Plan explains `If an accepter cannot come, the decision automatically reopens` beside the dropout control.
6. Reopen state announces the reason through visible copy and an `aria-live` region.
7. Email is an explicit optional `Email me this room link` action after joining; it is never an account, login, or gate.

## External-service preflight

Do not build the email endpoint until all items pass:

- [ ] Vercel project is linked to the correct team.
- [ ] Resend is installed through the Vercel Marketplace integration.
- [ ] Sender domain/address is verified in Resend.
- [ ] Environment names are available locally through `vercel env pull --yes`; values are never committed or printed.
- [ ] `PUBLIC_APP_ORIGIN` is set to the deployed client origin.
- [ ] Maincloud login is complete and the `pick-and-lock` database name is reserved.

## Required review gates

| Gate            | Stop condition                                                                   | Exit evidence                                                       |
| --------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Contract gate   | A requested feature needs a field, reducer, or UI prop absent from the contract. | Contract change approved by both owners before code changes.        |
| Server gate     | Any reducer rejects ambiguously or leaves partial rows.                          | Focused test proves rollback and expected error string.             |
| Realtime gate   | A second tab needs reload, polling, or manual state repair.                      | Two-client Playwright assertion observes change without navigation. |
| Race gate       | Any concurrent path produces more than one pending/locked record.                | Parallel test and database assertion pass.                          |
| Onboarding gate | A stranger needs verbal help or takes over 30 seconds to join.                   | Timed fresh-device recording/checklist passes.                      |
| Deployment gate | Preview cannot send email, connect Maincloud, lock, and reopen.                  | Fix before production deploy.                                       |

## Handoff rule

No agent silently broadens the plan. If a task crosses file ownership or contract scope, it stops at the contract gate with one concise written question. This prevents implementation loops and avoids merging competing assumptions.

## Pre-handoff audit

Before sharing the repository, run the acceptance matrix line by line. A missing owner, verification command, or failure state is a plan defect, not something to discover during implementation. Resolve plan defects in this document or the frozen contract before the server agent starts.

## Hardening completion record

- [x] Product-source precedence and the frozen UI/server contract are explicit.
- [x] Every reducer lifecycle transition has one outcome; lock and reopen loops are excluded.
- [x] Identity, share-code, subscription order, and uniqueness invariants have an owner and proof.
- [x] UI and server paths are disjoint except for the UI-owned bridge mount.
- [x] Onboarding, optional email, and outbound-email security have an owner and release gate.
- [x] The agent prompts, acceptance matrix, and red-team audit prompt are present.
- [x] The current Saturday schedule preserves the full first iteration through the Sunday 08:30 freeze.

The package is ready for owner acceptance and collaborator handoff. Implementation remains prohibited until that acceptance is explicit.
