# Agent collaboration protocol

## The problem this solves

An agent waiting for a new chat prompt is idle by design. Git branches alone do not tell it what is safe, ready, or blocked. The team therefore uses GitHub Issues as the live queue and this repository as the durable contract. No extra coordination service is needed.

## One-time setup by the repository owner

1. Create the GitHub labels `ready`, `claimed`, `blocked`, `review`, `server`, `ui`, and `integration`.
2. Create one issue per task in the current implementation plan. Include the exact task number, allowed paths, dependencies, acceptance checks, and the plan/spec links.
3. Leave only independent tasks labelled `ready`; link dependent issues with `blocked by #<issue>`.
4. Give each agent the bootstrap prompt below once. Keep it running for the work session.

## Autonomous work loop for every agent

1. Run `git fetch origin` and update the task branch from `origin/main`; never work from a stale main branch.
2. Read `docs/project-handoff.md`, this protocol, the issue-linked spec and plan, and `AGENTS.md`.
3. Select one unassigned issue labelled `ready` in the owned lane. Claim it by assigning itself and swapping `ready` for `claimed` before editing.
4. Create one branch named `<lane>/<issue-number>-<short-name>` and one isolated worktree. Edit only the allowed paths.
5. Run the issue's checks. Commit a focused change and push the branch.
6. Open a pull request with changed paths, contract impact, check output, exact integration action, and blockers. Apply `review` and remove `claimed`.
7. If no task is ready, do not invent work. Leave one concise blocker comment and wait for the next GitHub event or prompt.

## Rules that prevent collisions

- One issue has one writer. A pull request is a handoff, not shared mutable state.
- A task may not edit another lane's paths, including `App.tsx`, generated bindings, or module schema, unless its issue explicitly owns them.
- Contract changes are proposed as a separate issue and accepted before either side implements them.
- The repository owner merges only green reviewed pull requests, runs the relevant suite after each merge, and moves newly unblocked issues to `ready`.
- Maincloud publishes and production deployment remain owner-confirmed destructive actions; an agent must never publish merely because a pull request merged.

## Current v2 build issue graph

| Issue                                                                                                | Lane        | Allowed paths                                                                                                 | Depends on          | Completion unblocks     |
| ---------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------- |
| [#2 V2-PR1 Private room access core](https://github.com/Nivish-21/pick-and-lock/issues/2)            | server      | `server/spacetimedb/**`, generated bindings                                                                   | none                | V2-PS1                  |
| [#6 V2-PR2 Calendar-event builder](https://github.com/Nivish-21/pick-and-lock/issues/6)              | integration | `client/src/lib/calendarEvent.*`                                                                              | none                | calendar UI integration |
| [#3 V2-PS2 Public-story presentational page](https://github.com/Nivish-21/pick-and-lock/issues/3)    | ui          | `client/src/pages/public-room/**`, `client/src/components/public-room/**`, `client/src/styles/public-room/**` | none; fixtures only | V2-PS3                  |
| [#1 V2-PS1 Public-share SpacetimeDB projection](https://github.com/Nivish-21/pick-and-lock/issues/1) | server      | `server/spacetimedb/**`, generated bindings                                                                   | V2-PR1              | V2-PS3                  |
| [#4 V2-PS3 Route and data bridge](https://github.com/Nivish-21/pick-and-lock/issues/4)               | integration | `client/src/data/**`, `client/src/public-share-route.*`                                                       | V2-PS1, V2-PS2      | V2-PS4                  |
| [#5 V2-PS4 Two-identity privacy proof](https://github.com/Nivish-21/pick-and-lock/issues/5)          | server      | `client/e2e/**` and server test files only                                                                    | V2-PS3              | owner publish review    |

## Bootstrap prompt to send once to any collaborator agent

```text
You are a long-running contributor to Pick & Lock. Work autonomously from the GitHub issue queue; do not wait for a new chat prompt after each task.

Start in the repository root. Read, in this order:
1. docs/project-handoff.md
2. docs/agent-collaboration-protocol.md
3. the issue-linked specification and Superpowers plan
4. AGENTS.md

Then fetch origin, find one unassigned GitHub Issue labelled ready in your ownership lane, claim it before editing, create one isolated worktree and task branch, and complete only that issue. Do not invent features or edit paths outside the issue. Run the stated tests, commit, push, and open a PR with changed files, contract impact, exact command results, handoff instruction, and blocker if any. After opening the PR, claim the next ready issue in your lane. If none is ready, leave one blocker comment and wait for a GitHub event; do not sit silently or change unrelated files.

Never publish Maincloud or deploy production. Never expose private room data in a public story. A public story is read-only and contains no member names, chats, individual votes, invite secrets, or preferences.
```
