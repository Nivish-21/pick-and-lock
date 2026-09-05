# Private rooms, custom choices, and scheduling — v2 specification

## Outcome

Pick & Lock v2 lets a creator describe what the group is planning, select a real date/time and timezone, define the choices to decide between, and privately invite participants. A participant who has not accepted an invite sees no room title, date, choices, votes, chat, or membership information. Members can add the agreed schedule to their calendar after the decision locks.

This is a new private-room system. It does not retrofit privacy onto the current public v1 rooms; public data already exposed by v1 cannot be made secret after the fact.

## Non-negotiable privacy model

- Canonical v2 room, schedule, choice, vote, message, invite, and membership tables are **private** SpacetimeDB tables.
- Client reads use public, caller-context views that return only data for rooms where `membership.identity == ctx.sender()`.
- Do not use SpacetimeDB experimental RLS. Use views, which are the stable documented mechanism for caller-specific data.
- An invite is a high-entropy, 128-bit-or-stronger secret. Its raw value appears only in the creator's client and a shareable URL fragment: `https://pick-and-lock.vercel.app/#/invite/<token>`.
- The module stores only a SHA-256 token hash in its private invite table; raw tokens are never stored, logged, sent to analytics, or displayed after acceptance.
- `join_with_invite(token, display_name)` validates the token server-side, creates membership for `ctx.sender()`, and is the only bootstrap operation available to a non-member.
- After acceptance, the browser removes the fragment and uses `/r/<publicRoomId>`; that route is an identifier, not a credential. It returns no content for non-members.
- Membership is identity-bound. Browser fingerprints are not used for access, memory, or cross-device identity.

## Private v2 data model

| Private table | Key fields | Purpose |
| --- | --- | --- |
| `private_room` | `id`, `public_room_id`, `creator_identity`, `title`, `created_at`, `status` | Canonical room lifecycle. |
| `room_schedule` | `room_id`, `starts_at`, `ends_at`, `timezone` | One scheduled time range per v2 room. |
| `room_choice` | `room_id`, `label`, `price`, `min_people`, `sort_order` | Creator-defined decision choices. |
| `room_membership` | `room_id`, `identity`, `display_name`, `joined_at`, `role`, `left_at` | Authorised member list and creator role. |
| `room_invite` | `room_id`, `token_hash`, `expires_at`, `max_uses`, `uses`, `revoked_at` | Invite authority and revocation. |
| `room_vote` | `room_id`, `choice_id`, `member_identity`, `state`, `max_price` | One current member answer per choice. |
| `room_proposal` / `room_acceptance` | room/choice/member IDs and server timestamps | Atomic proposal and decision lock. |
| `room_message` | `room_id`, `member_identity`, `body`, `sent_at` | Member-only short chat. |
| `room_decision` / `room_metrics` | completed locks and durations | Member-only history and summary. |

Public views are intentionally narrow: `my_rooms`, `my_room_schedule`, `my_room_choices`, `my_room_members`, `my_room_votes`, `my_room_proposals`, `my_room_messages`, `my_room_decisions`, and `my_room_metrics`. Every view filters by the caller's active membership and projects only display-safe columns.

## Creator flow

1. **Start** — “What are you planning?” (required, 1–60 characters).
2. **Schedule** — date, local start time, duration, and IANA timezone. The browser proposes its timezone; the creator confirms it. Store timestamps in UTC plus the chosen timezone.
3. **Choices** — create 2–6 choices, each with a label, optional price, and required people count. No fixed Bowling/Escape/Game choices.
4. **Privacy** — default to private invite-only. Show a short statement: “Only people who accept this invite can see the room.”
5. **Create and share** — create the private room, generate one invite link, expose Copy and QR actions, and allow the creator to revoke/regenerate the invite.

## Participant flow

1. Open the fragment invite link.
2. See only an invite acceptance screen and a display-name field; do not preload room details.
3. Accept invite; reducer creates identity-bound membership.
4. Route becomes `/r/<publicRoomId>` and subscribes to member-only views.
5. See the schedule, choices, live votes, chat, and decisions; answer/propose/accept as permitted.
6. After lock, use **Add to calendar** to download a local `.ics` event with title, UTC timestamps, timezone, and selected choice. No external calendar OAuth is required in v2.

## UI plan

| Surface | Behaviour |
| --- | --- |
| Root page | Creation wizard, not the hard-coded Saturday landing screen. |
| Invite route | Minimal acceptance screen; no title/date/choice leak before membership. |
| Private room header | Shows title, scheduled local time/timezone, member count, Copy invite, QR, and creator-only invite controls. |
| Choice board | Custom choices; member answers, feasibility, proposal, and atomic lock state. |
| Calendar panel | Shows date/time clearly and exposes `.ics` download after lock. |
| Access denial | “This room is invite-only. Ask the creator for a new link.” No metadata. |
| Mobile | Wizard fields use native `date`, `time`, and `number` inputs; 44px controls and clear timezone text. |

## Migration and coexistence

- Keep all v1 public tables and `/r/SATURDAY` demo routes operating during v2 construction.
- Add v2 private tables, public views, and reducers without changing existing v1 tables. This is an additive Maincloud deployment.
- The existing v1 data bridge remains unchanged. Add a separate `client/src/data/privateRoom/**` bridge for v2 views.
- Switch the root creation flow only after the private bridge passes two-member browser tests.
- Never publish `--delete-data` for this migration.

## Acceptance criteria

1. A non-member with `/r/<publicRoomId>` sees no title, schedule, choices, votes, chat, or member names.
2. A valid invite fragment lets a new identity join once and then load member-only data.
3. A revoked, expired, exhausted, or malformed invite reveals no room metadata and cannot create membership.
4. Two members see real-time custom choices and votes without refresh.
5. Creator can revoke/reissue invite; non-creators cannot.
6. Locked choice generates a valid `.ics` download with the selected date/time and timezone.
7. Existing `/r/SATURDAY` remains live throughout development.
