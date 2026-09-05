# Public decision stories and create-room CTA

## Outcome

Private v2 rooms remain invite-only by default. A creator may explicitly publish a **read-only decision story** at `/share/<publicRoomId>`. Anyone may view that deliberately limited story and use the product CTA to create an independent room. A public URL never grants membership, voting, chat, or access to the private room route.

## Conversation decision record

This specification records the product decisions made in this conversation:

1. Group rooms need privacy by default because schedules, plans, and member discussion are not inherently public.
2. A creator should be able to show others what the group decided when that is useful for a presentation or social sharing.
3. Visitors need an obvious next step rather than an empty read-only page: **“Have a decision to make? Make it together.”** and **“Create your own room”**.
4. Sharing must not expose participant identity, chat, raw votes, price limits, invite data, or preferences. The creator chooses whether the schedule is visible.
5. The current v1 rooms are already public. This feature applies only to the new private v2 system and must not pretend to secure v1 retrospectively.

## Product modes

| Mode         | URL                     | Who can read                    | Who can write                      | Content                               |
| ------------ | ----------------------- | ------------------------------- | ---------------------------------- | ------------------------------------- |
| Private room | `/r/<publicRoomId>`     | Active members only             | Active members under reducer rules | Full member room                      |
| Invite entry | `#/invite/<secret>`     | Invite holder before acceptance | `join_with_invite` only            | No room metadata before join          |
| Public story | `/share/<publicRoomId>` | Anyone                          | Nobody                             | Creator-approved read-only projection |

## Public projection contract

`shared_room_story` is a public SpacetimeDB view. It emits zero rows until the creator publishes. A row contains only:

- `public_room_id`, `title`, optional `summary`, lifecycle `status`, `published_at`, and `updated_at`;
- a read-only list of choice labels and, after lock, the selected choice label;
- aggregate `decision_count` without identities or individual vote records;
- optional `starts_at` and `timezone` only when `show_schedule` is true.

It must not contain a member ID or name, identity, invite token or hash, vote, price limit, chat message, event message, preference, raw duration, or any other private table row. `unpublish_room` makes the view empty immediately. The public room ID is an opaque URL identifier, never a credential.

## Creator controls

After room creation, the creator sees a sharing panel with a default-off **Publish a public decision story** control; a separate default-off **Show schedule publicly** control; a preview; a copyable `/share/<publicRoomId>` link and QR code while published; and **Unpublish story**. Only `creator_identity` may use these SpacetimeDB reducers. Sharing settings never alter membership or invitation access.

## Public page

`/share/<publicRoomId>` is an accessible read-only page. It handles loading, absent/unpublished, open, locked, and closed stories. It has no join form, member list, vote controls, chat, or private-room navigation. Its footer CTA is exactly:

> Have a decision to make? Make it together.

The CTA button is labelled **Create your own room** and links to `/`. Copying a public story URL copies `/share/<publicRoomId>`, never `/r/<publicRoomId>`.

## Security and acceptance proof

1. A fresh identity querying `/r/<id>` and all `my_*` views before invite acceptance receives no private rows.
2. A fresh identity querying the published story sees only the public projection fields; member names, messages, individual answers, invite fields, and preferences are absent.
3. A non-creator cannot publish, change schedule visibility, or unpublish.
4. A public visitor cannot vote, join, propose, accept, close, or subscribe to member-only data.
5. Publishing then unpublishing makes a fresh public subscription receive zero story rows while active members retain room access.
6. The public page shows the exact CTA and navigating it starts a new room flow without coupling it to the source room.

## Non-goals

- No search directory, public discovery feed, anonymous comments, public voting, external analytics, accounts, or social-network integration.
- No automatic publication on room creation or decision lock.
- No change to the live public v1 tables or routes.
