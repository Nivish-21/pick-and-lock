# Pick & Lock

Pick & Lock is a real-time group decision room. A group shares a link, answers what works, proposes a feasible choice, and locks it only when enough eligible members agree. If a required accepter drops out, the decision automatically reopens.

## Live demo

- App: <https://pick-and-lock.vercel.app>
- Clean presenter room: <https://pick-and-lock.vercel.app/r/XATWU1XNQB>

The live demo is version 1 and uses public share-code rooms. Do not put private information in a v1 room.

## What is working

- React/Vite client hosted on Vercel.
- Rust SpacetimeDB module on Maincloud.
- Real-time room join, answers, proposal, atomic agreement, lock/reopen, copyable room links, and QR codes.
- Live presence distinguishes people currently here from people still in the room, and updates without refresh.
- Root room creation flow for the current public v1 demo.

## What is being built now

Version 2 introduces private custom rooms: creator-defined purpose, schedule/timezone, choices, invite-only membership, and calendar export. It keeps v1 running while the private system is built beside it.

The active parallel lanes are:

| Issue                                                       | Status  | Scope                                                                                               |
| ----------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| [#2](https://github.com/Nivish-21/pick-and-lock/issues/2)   | Merged  | Private SpacetimeDB room access core; private votes/history remain next                             |
| [#3](https://github.com/Nivish-21/pick-and-lock/issues/3)   | Merged  | Fixture-driven public decision-story UI; [PR #7](https://github.com/Nivish-21/pick-and-lock/pull/7) |
| [#6](https://github.com/Nivish-21/pick-and-lock/issues/6)   | Review  | Calendar-event helper; [PR #8](https://github.com/Nivish-21/pick-and-lock/pull/8)                   |
| [#10](https://github.com/Nivish-21/pick-and-lock/issues/10) | Ready   | Private decision engine, history, and metrics                                                       |
| [#1](https://github.com/Nivish-21/pick-and-lock/issues/1)   | Blocked | Creator-controlled public-story projection; waits for #10                                           |
| [#4](https://github.com/Nivish-21/pick-and-lock/issues/4)   | Blocked | Public route and bridge; waits for #1 and #3                                                        |
| [#5](https://github.com/Nivish-21/pick-and-lock/issues/5)   | Blocked | Two-identity privacy proof; waits for #4                                                            |

Private rooms are invite-only by default. A creator may later publish a separate, read-only decision story at `/share/<publicRoomId>`. It never exposes member names, chats, individual votes, invite data, preferences, or price limits. Its CTA is:

> Have a decision to make? Make it together.

## Architecture

| Layer              | Technology               | Authority                                                  |
| ------------------ | ------------------------ | ---------------------------------------------------------- |
| Client             | React, TypeScript, Vite  | Renders subscribed state and calls typed reducers          |
| Real-time database | SpacetimeDB Maincloud    | Owns room data, membership, votes, decisions, and reducers |
| Hosting            | Vercel                   | Serves the client and SPA routes                           |
| Calendar           | Browser-generated `.ics` | Local download only; no calendar OAuth                     |

SpacetimeDB is the only source of truth for shared state. Browser state is never authoritative.

## Local development

```bash
npm ci --prefix client
npm run dev --prefix client
```

Quality checks:

```bash
npm run test --prefix client -- --run
npm run lint --prefix client
npm run build --prefix client
cargo fmt --check --manifest-path server/spacetimedb/Cargo.toml
cargo test --manifest-path server/spacetimedb/Cargo.toml
spacetime build --module-path server/spacetimedb
```

Do not publish Maincloud or deploy production without the repository owner’s explicit confirmation. Never commit API keys, invite tokens, environment files, or raw private-room data.

## Collaboration

GitHub Issues are the live work queue. Every agent claims one `ready` issue, works in an isolated branch/worktree, opens a focused pull request, and then claims the next unblocked issue. This removes the need for manual task relays.

Read these before changing code:

1. [Project handoff](docs/project-handoff.md)
2. [Agent collaboration protocol](docs/agent-collaboration-protocol.md)
3. [Private rooms v2 specification](docs/private-rooms-and-scheduling-spec.md)
4. [Public sharing specification](docs/public-sharing-and-cta-spec.md)
5. [Current public-sharing execution plan](docs/superpowers/plans/2026-09-05-public-sharing-and-agent-collaboration.md)
6. [Contributor contract](AGENTS.md)

The docs index is at [docs/README.md](docs/README.md).
