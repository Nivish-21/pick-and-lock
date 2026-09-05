# Pick & Lock Product Brief

## Product

Pick & Lock turns a group chat's "maybe" messages into one feasible, confirmed activity plan.

The demo is six friends deciding Saturday's activity:

| Activity    |   Price | Minimum people |
| ----------- | ------: | -------------: |
| Bowling     | INR 400 |              4 |
| Escape room | INR 600 |              5 |
| Game night  |    Free |              3 |

Every friend joins from one link, marks each activity `in`, `out`, or `conditional` with a maximum price, then sees feasibility update without a refresh. An eligible friend proposes an activity; eligible friends accept it. The module atomically locks the plan once it has the required acceptances. If an accepting friend drops out, the same transaction reopens the plan for everybody.

## Source precedence

`docs/source/pick-and-lock-build-spec.md` is the implementation authority. `docs/source/the-plan-deck.pdf` supplies the pitch, visual direction, team schedule, QR/link sharing, and the event context. Where they conflict, this repository builds the stricter feasibility-and-reopen flow from the build spec, not a generic weighted-vote room.

## Non-negotiable outcomes

- One seeded demo plan, one share link, six tabs.
- Rust SpacetimeDB module on Maincloud; all shared-state writes go through reducers.
- React + TypeScript + Vite client with generated SpacetimeDB bindings.
- Real-time subscriptions update every active client with no refresh.
- Exactly one locked activity at a time.
- Automatic reopen when an accepting participant drops out.
- Mobile-first UI, no account, password, or install barrier.
- Optional email capture sends a real confirmation email but never blocks joining.

## Explicitly out of scope

Chat, maps, search, payments, calendar sync, notifications, authentication, multiple plans per user, plan history, editing activities in-app, AI suggestions, real bookings, and generic score-based polling are not part of the hackathon build.

## Requirements reconciliation

| Topic                                 | Decision                                                                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic score voting in the deck      | Do not build it. Use the spec's eligibility and acceptance model.                                                                                                                                     |
| Create-room and add-option deck flows | Do not build them. Seed the single demo plan and expose it by share link/code.                                                                                                                        |
| Room code                             | Add a `share_code` field to the seeded plan. It supports the deck's link/QR access without a room-creation system.                                                                                    |
| "marks them dropped" without a field  | Add `dropped_at: Option<Timestamp>` to `friend`; `online` remains presence only.                                                                                                                      |
| Email capture vs. no extra backend    | Use a small Vercel Function solely to validate the optional email and send a confirmation through the Resend Vercel Marketplace integration. It has no plan-state authority and no separate database. |

## Done means

Six people join from the same link on phones or browser tabs. They answer, bowling becomes possible, one person proposes bowling, four eligible friends accept, and every screen locks at once. One accepting friend drops out and every screen returns to the live decision with the remaining count. Two simultaneous proposals produce exactly one winner and one visible rejection. No view is corrected by refreshing.
