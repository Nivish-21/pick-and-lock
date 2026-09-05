# Next agent takeover — 2026-09-05

## Read this first

This is the resume point. Do not infer completion from merged UI components or generated bindings: private v2 is not end-to-end complete, nothing new has been published to Maincloud, and the live Vercel demo remains public version 1.

Read next, in order:

1. `README.md`
2. `docs/project-handoff.md`
3. `docs/agent-collaboration-protocol.md`
4. This document
5. The issue-linked spec and Superpowers plan
6. `AGENTS.md`

## Merged baseline

| Commit | State | Evidence |
| --- | --- | --- |
| `9d82753` | Merged | Fixture-only public decision-story UI; no route or database integration. |
| `dcd5ac5` | Merged | Private v2 room, schedule, choice, membership, hash-only invite foundation, and caller-filtered foundational views. |
| `0e1bd3a` | Merged | Accurate README and issue-lane documentation before the active decision-engine worktree began. |

Verified on `main` after `dcd5ac5`: Rust format, 3 module tests, SpacetimeDB build, 23 client tests, client lint, client production build, and `git diff --check` all passed.

## Work that is not complete

- Private v2 vote/proposal/accept/lock/reopen, immutable decision history, and metrics.
- Calendar helper review fix and merge.
- Creator-controlled public projection, `/share/<publicRoomId>` bridge/route, and outsider privacy proof.
- Private-room UI/bridge mount, Maincloud additive publish, Vercel deployment, and two-identity browser verification.

## Exact active work

### Issue #10 — private decision engine

- Issue: <https://github.com/Nivish-21/pick-and-lock/issues/10>
- Branch: `server/private-decision-engine`
- Worktree: `/Users/nivish/development/Moonshot/.worktrees/private-decision-engine`
- Current state: active agent changes are **uncommitted** in `server/spacetimedb/src/lib.rs` (about 415 added lines at this checkpoint).
- Required source: `docs/private-v2-decision-engine-spec.md` and `docs/superpowers/plans/2026-09-05-private-v2-decision-engine.md`.

Takeover procedure:

1. Inspect the existing worktree with `git status --short` and `git diff`; do not reset, clean, or recreate it.
2. Finish Task 1 only in `server/spacetimedb/**` plus generated `client/src/module_bindings/**`.
3. Run Rust format/tests/build, regenerate bindings, then run root client test/lint/build.
4. Commit, push `server/private-decision-engine`, and open a PR for #10.
5. Do not merge, publish Maincloud, or deploy.

### Issue #6 / PR #8 — calendar helper correction

- Issue: <https://github.com/Nivish-21/pick-and-lock/issues/6>
- PR: <https://github.com/Nivish-21/pick-and-lock/pull/8>
- Branch: `integration/calendar-event`
- Allowed paths: `client/src/lib/calendarEvent.ts` and `client/src/lib/calendarEvent.test.ts` only.
- Review finding: fixed offsets such as `+05:30` can be accepted by `Intl`, but are not IANA timezone identifiers. Reject them and add a rejection test.

After the correction, run the client test, lint, build, and whitespace gates. Update PR #8; do not touch routes, UI, packages, server, deploys, or Maincloud.

## Dependency order

1. Review and merge #6 after its fixed-offset correction.
2. Review and merge #10 after all private decision-engine proofs pass.
3. Move #1 to `ready`; build the creator-controlled `shared_room_story` projection.
4. Merge #1, then build #4 public route/data bridge using already-merged #3 presentation.
5. Run #5 with two isolated identities before asking for a Maincloud publish confirmation.

## Non-negotiable boundaries

- v1 public tables/reducers/routes must remain unchanged.
- All v2 canonical rows are private. Every client-visible private row comes through a caller-filtered view derived from `ViewContext.sender()`.
- Invite tokens are fragment-only and SHA-256 hashed before storage. Never log, persist, or expose raw tokens.
- Public stories are default-off, read-only, and never expose member names, identities, chats, raw votes, invite data, preferences, or price limits.
- Do not run `spacetime publish`, deployment commands, destructive migrations, `git reset --hard`, or `git clean` without the owner’s explicit confirmation.

## Fast verification commands

```bash
cargo fmt --check --manifest-path server/spacetimedb/Cargo.toml
cargo test --manifest-path server/spacetimedb/Cargo.toml
spacetime build --module-path server/spacetimedb
npm run test --prefix client -- --run
npm run lint --prefix client
npm run build --prefix client
git diff --check
```
