# First-Iteration Acceptance Matrix

Every row must have a passing proof before the public demo. A failing row returns work to its listed owner; it does not create a parallel workaround.

| Requirement                                                                       | Owner  | Proof                                                                           | Failure state                       |
| --------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------- | ----------------------------------- |
| `/r/SATURDAY` resolves one seeded room.                                           | Server | Unknown, missing, and duplicate-code test; UI remains read-only until resolved. | Error screen, no reducer call.      |
| A new person joins with only a name.                                              | Server | Reducer test and fresh-browser check.                                           | Short reducer error.                |
| Existing active identity reconnects without duplicate friend.                     | Server | Connect/disconnect/rejoin test.                                                 | One row and presence update only.   |
| Dropped identity remains dropped after refresh.                                   | Server | Drop, reconnect, and retry-join test.                                           | `You are marked out for this plan`. |
| In/out/conditional price eligibility is exact.                                    | Server | Pure-rule table tests at price boundary.                                        | Invalid answer rejects.             |
| Counts update in another client without refresh.                                  | Server | Two-browser E2E subscription test.                                              | Realtime gate fails.                |
| Only one pending proposal exists.                                                 | Server | Concurrent-propose integration test.                                            | One success; one sender error.      |
| Only eligible people accept.                                                      | Server | Reducer test for ineligible and duplicate accepts.                              | Short sender error.                 |
| Threshold acceptance locks atomically once.                                       | Server | Parallel final-accept test plus table assertions.                               | Race gate fails.                    |
| Accepting dropout reopens once; non-accepting dropout does not.                   | Server | Two separate dropout E2E tests.                                                 | Dropout gate fails.                 |
| UI renders Join, Choices, Live Group, Locked, and reopened states from fixtures.  | UI     | Component tests at 390px viewport.                                              | UI lane defect.                     |
| UI calls only `RoomActions`; no binding types in components.                      | UI     | Import-boundary review and TypeScript build.                                    | Contract gate fails.                |
| One `App.tsx` mount swaps fixtures for bridge.                                    | UI     | Small diff review and live two-browser path.                                    | Integration gate fails.             |
| Room entry works without email in under 30 seconds.                               | UI     | Timed fresh-device checklist.                                                   | Onboarding gate fails.              |
| Email is optional, same-origin, validated, canonical, and non-persistent.         | Server | API tests plus real preview email.                                              | Email/deployment gate fails.        |
| Mobile UI has visible focus, text status, 44px controls, and reopen announcement. | UI     | Manual mobile accessibility checklist.                                          | UI lane defect.                     |
| Maincloud and Vercel preview pass lock/reopen and email.                          | Both   | Six-tab rehearsal and fresh-phone run.                                          | Do not deploy production.           |

## Handoff checklist

Each owner gives the other one commit SHA, files changed, test/build command output, contract impact, and exactly one requested integration action. If the requested action changes a non-owned path other than the UI-owned `App.tsx` mount, stop at the contract gate.
