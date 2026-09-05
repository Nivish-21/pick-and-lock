# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, and Vite client. Rust SpacetimeDB module on Maincloud.

## Users

Friends coordinating one shared Saturday activity from a link. They need to answer quickly on a phone without an account or password.

## Product Purpose

Pick & Lock turns group-chat uncertainty into one feasible, confirmed activity. Success is a group visibly locking an activity only after enough eligible people agree, then automatically reopening when a required person drops out.

## Positioning

This is not a poll or RSVP page. The shared SpacetimeDB state enforces eligibility, an atomic lock, and an automatic reopen.

## Operating Context

Six friends use the same Saturday room. Bowling costs INR 400 and needs four people; Escape room costs INR 600 and needs five; Game night is free and needs three.

## Capabilities and Constraints

- Join by link with a display name only.
- Answer in, out, or conditional with a maximum price.
- Show live feasibility, presence, undecided friends, proposals, acceptances, events, lock, and reopen.
- The React client is a read-only projection of SpacetimeDB reducer-owned state.
- Email is optional after join and cannot block room entry.
- No chat, authentication, payments, maps, bookings, generic scoring, AI suggestions, or extra product backend.

## Brand Commitments

The product name is Pick & Lock. Voice is direct, social, and concrete. The UI must make the lock and reopen state change unmistakable across two phones or browser tabs.

## Evidence on Hand

Authoritative product requirements live in `docs/source/pick-and-lock-build-spec.md`. The design deck is in `docs/source/the-plan-deck.pdf`. There are no approved logos, testimonials, customer claims, or photography assets.

## Product Principles

- Make the feasible choice obvious.
- Make shared state changes immediate and legible.
- Require no account or explanation to join.
- Never imply certainty before reducer authority confirms it.

## Accessibility & Inclusion

Mobile-first web UI. Keyboard focus, text equivalents for status colour, 44px minimum touch controls, reduced motion, and screen-reader announcement of a reopen are required.

## Planned expansion — consented decision assistance

After the live hosted version is proven, Pick & Lock may add participant-controlled preference memory and a non-authoritative decision assistant. The assistant can identify trade-offs in consented, room-scoped data, but it never votes, locks, closes, or mutates a room. See `docs/project-handoff.md` for the privacy boundary and implementation sequence.

## Planned expansion — private custom rooms

The next product version replaces fixed public demo rooms with private, invite-only decision rooms. A creator supplies the purpose, schedule, timezone, and choices; only members who accept an invite can see them. The locked choice can be exported to a calendar file. See `docs/private-rooms-and-scheduling-spec.md`.

## Planned extension — public decision stories

A private-room creator may explicitly publish a read-only decision story for a wider audience. It has no members, chats, individual votes, invite data, or preferences, and it can hide the schedule. The public page invites visitors to **“Have a decision to make? Make it together.”** and create an independent room. See `docs/public-sharing-and-cta-spec.md`.
