# Sorted

Sorted is a real-time group decision room where friends make plans together. A group joins a shared room, proposes activities or venues, votes on what works, and locks a plan when enough people agree. A built-in AI agent reads along passively and helps move decisions forward—suggesting places, drafting polls, answering questions—only speaking up when it's actually useful rather than replying to every message.

## Live demo

- App: <https://pick-and-lock.vercel.app>
- Example room: <https://pick-and-lock.vercel.app/r/XATWU1XNQB>

The demo is a public room where you can try joining, proposing activities, and voting live.

## What Sorted does today

**Core decision loop:**
- Real-time room creation and joining via share links
- Live chat with message history
- Activity proposals with custom activity creation
- Voting on activities (eligible member count per option)
- Atomic decision locking when threshold is reached
- Decision reopening if a required member drops out
- QR code sharing and copy-to-clipboard room links
- Email capture on room join/creation (via Resend)

**AI concierge features:**
- Passively reads room chat and acts only when addressed (e.g., `@sorted`)
- Sends a welcome message and location request when members join
- Suggests nearby venues based on shared location (Google Places API)
- Drafts polls conversationally to help the group narrow options
- Uses a low-cost intent classifier to decide whether engagement is useful rather than replying to every message
- 25-second anti-spam cooldown between actions
- Conversation context limited to the current decision to avoid noise

**Presence and awareness:**
- Live online/offline status (distinguishes "here now" from "still in room")
- Real-time activity count and proposal state
- No-refresh updates across all connected clients

## Architecture

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React, TypeScript, Vite | Renders room state, handles joins/answers/proposals, mounts chat UI |
| **Real-time database** | SpacetimeDB Maincloud | Source of truth for rooms, members, activities, votes, chat, decisions, and reducers |
| **Bot service** | Node.js + TypeScript | Long-running process that subscribes to room events, classifies intent, calls OpenAI + Google Places, records decisions back to SpacetimeDB |
| **Hosting** | Vercel (client), Render (bot service) | Production deployment |

SpacetimeDB is the only source of truth. Browser state is ephemeral; all decisions are persisted server-side.

## Future scope

**Agent as a genuine group member:**
- The AI agent reads conversation context and acts only when it judges the group would benefit (decision is stalled, someone asks for input, a new member needs context) — not on a command-response basis.
- Over time, the agent learns group preferences (where they like to eat, typical budgets, time preferences) to make more targeted suggestions.

**Multi-agent collaboration:**
- When a decision needs outside expertise or coordination, the room's agent could consult specialized agents (a travel planner for multi-city trips, a restaurant expert for group dining, etc.) and synthesize the advice back to the group.
- Groups don't have to leave the chat to research; the agent brings the research in.

**External context ingestion:**
- Drop a link to an article, menu, event page, or venue listing into the chat.
- The agent fetches and understands the content well enough to answer questions about it and incorporate it into recommendations.
- "What's the seating capacity?" or "Does this place have outdoor tables?" answered in-chat without leaving the browser.

**Location-aware and route-aware suggestions:**
- When the group shares their location, combine it with the decision context to suggest routes and order stops intelligently.
- Real-time traffic integration for multi-stop plans (e.g., restaurant → activity → dessert spot) with routing that minimizes travel time or respects group preferences (e.g., "no highways").

## Local development

```bash
npm ci --prefix client
npm run dev --prefix client
```

Quality checks before committing:

```bash
npm run test --prefix client -- --run
npm run lint --prefix client
npm run build --prefix client
cargo fmt --check --manifest-path server/spacetimedb/Cargo.toml
cargo test --manifest-path server/spacetimedb/Cargo.toml
spacetime build --module-path server/spacetimedb
npx tsc --noEmit --prefix api/bot-service
npm run test --prefix api/bot-service -- run
```

Never commit API keys, tokens, environment files, or raw room data. Do not publish to Maincloud or deploy production without the repository owner's explicit confirmation.

## Collaboration

GitHub Issues are the task queue. Read these before working on code:

1. [Project handoff](docs/project-handoff.md) — completed work, active lanes, integration order
2. [Agent collaboration protocol](docs/agent-collaboration-protocol.md) — how agents claim and hand off tasks
3. [Private rooms v2 specification](docs/private-rooms-and-scheduling-spec.md) — the invite-only room system
4. [Public sharing specification](docs/public-sharing-and-cta-spec.md) — read-only decision stories
5. [Contributor contract](AGENTS.md) — responsibilities and review gates

Every agent claims one `ready` issue, works in an isolated branch/worktree, opens a focused pull request, and then claims the next unblocked issue. This removes manual relays and keeps the queue flowing.

The docs index is at [docs/README.md](docs/README.md).
