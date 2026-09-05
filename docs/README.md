# Pick & Lock Planning Pack

Start with [the product brief](product-brief.md), then read [the architecture contract](architecture.md) and [the implementation plan](superpowers/plans/2026-09-05-pick-and-lock.md).

| Document                                                             | Purpose                                                                                |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Product brief](product-brief.md)                                    | Product scope, source precedence, requirements reconciliation, and definition of done. |
| [Architecture contract](architecture.md)                             | Server authority, data model, reducer contract, client state, deployment boundary.     |
| [Implementation plan](superpowers/plans/2026-09-05-pick-and-lock.md) | Ordered, testable engineering tasks with exact proposed files and commands.            |
| [Team workboard](team-workboard.md)                                  | Parallel work lanes, hand-offs, cut order, and 24-hour ownership.                      |
| [Build spec](source/pick-and-lock-build-spec.md)                     | Original implementation authority.                                                     |
| [Plan deck](source/the-plan-deck.pdf)                                | Original pitch deck and event presentation context.                                    |

The written build spec wins whenever it conflicts with the deck. No implementation files are included in this planning commit.

## Current repository truth

Start with the root [README](../README.md), then [project handoff](project-handoff.md). The root README records the live demo, working version-1 behaviour, active v2 issue lanes, local quality checks, and the required collaboration workflow.

For v2 work, read these before opening a task branch:

| Document                                                                                                | Purpose                                                            |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Private rooms v2 specification](private-rooms-and-scheduling-spec.md)                                  | Invite-only rooms, schedule, custom choices, and privacy boundary. |
| [Public sharing specification](public-sharing-and-cta-spec.md)                                          | Creator-authorised read-only public stories and CTA boundary.      |
| [Agent collaboration protocol](agent-collaboration-protocol.md)                                         | GitHub issue claim, worktree, PR handoff, and dependency rules.    |
| [Public-sharing execution plan](superpowers/plans/2026-09-05-public-sharing-and-agent-collaboration.md) | Current task order and acceptance checks.                          |

## Current execution documents

The current plan supersedes the earlier single-lane schedule:

| Document                                                                                     | Purpose                                                            |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Two-builder execution model](two-builder-execution.md)                                      | Independent UI and server lanes, milestones, and handoff protocol. |
| [Realtime contract](contracts/realtime-contract.md)                                          | Frozen reducer inputs and `RoomView`/`RoomActions` UI boundary.    |
| [Two-builder implementation plan](superpowers/plans/2026-09-05-pick-and-lock-two-builder.md) | Current task-by-task first-iteration plan.                         |
| [Contributor contract](../AGENTS.md)                                                         | Instructions and file ownership for the collaborator's agent.      |

| [Plan hardening](plan-hardening.md) | Resolved risks, no-loop state machine, external-service gates, and audit process. |
| [Acceptance matrix](acceptance-matrix.md) | Requirement-by-requirement owner, proof, and release gate. |
| [Server-agent prompt](prompts/server-agent.md) | Exact starting instruction for the collaborator's agent. |
| [UI-owner prompt](prompts/ui-owner.md) | Exact independent UI lane instruction. |
| [Plan-auditor prompt](prompts/plan-auditor.md) | Read-only red-team check to run before implementation and before release. |
| [Collaborator launch prompt](prompts/collaborator-launch.md) | Copy-and-send instruction that starts the server agent without another planning pass. |
| [Saturday live-execution plan](superpowers/plans/2026-09-05-saturday-live-execution.md) | Exact owner sequence, database handoff, and milestone evidence. |
| [Maincloud owner runbook](maincloud-owner-runbook.md) | Exact commands for the account owner to create the Maincloud database after server-core merge. |
