# Pick & Lock Team Workboard

## Dependency rule

Do not start a lane's integration work until the previous milestone is verified with two clients. UI can use static fixtures while the module is being built, but it must not be wired to invented server contracts.

## Suggested 24-hour ownership

| Window | Owner from deck  | Deliverable                                                        | Exit check                                                          |
| ------ | ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 0-4h   | Dhanraj          | Rust schema, reducers, local module live                           | Two CLI-driven joins create distinct friend rows.                   |
| 4-10h  | Dhanraj          | Eligibility, proposal race, automatic lock/reopen                  | Server race test proves one proposal winner and one lock.           |
| 4-10h  | Nivish           | Mobile React shell, join, choices, live/locked views with fixtures | Phone viewport is usable; all four states render.                   |
| 10-16h | Nivish + Dhanraj | Generated bindings and real subscriptions                          | Two browsers update with no refresh for join, answer, lock, reopen. |
| 16-21h | Pranav           | Six/ten-client QA, accessibility, demo polish                      | Acceptance checklist has recorded evidence.                         |
| 21-24h | All              | Rehearsal, deployment, submission buffer                           | Fresh-device demo works from one public link.                       |

## Work hand-offs

1. Server owner publishes a versioned reducer contract and regenerated bindings before client integration.
2. Client owner owns no database rules; report contract gaps as issues rather than adding browser guards.
3. QA owner maintains the six-tab script and captures the failing reducer/action, not just a screenshot.
4. Every merged change has a focused commit, passing local checks, and an updated task checkbox in the implementation plan.

## Cut order if time runs short

1. Replace conditional answers with `in` / `out` only, preserving lock and reopen.
2. Keep `event_log` storage but remove its feed UI.
3. Remove presence dots.

Never cut automatic atomic lock, automatic reopen, two-client proposal race handling, real-time updates, or the fresh-device mobile path.
