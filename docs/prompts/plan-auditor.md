# Plan-Auditor Prompt

Audit the Pick & Lock planning package only. Do not write application code, invent features, change ownership, or approve work because it sounds plausible.

Read `docs/source/pick-and-lock-build-spec.md`, `docs/plan-hardening.md`, `docs/contracts/realtime-contract.md`, `docs/acceptance-matrix.md`, `docs/two-builder-execution.md`, `docs/superpowers/plans/2026-09-05-pick-and-lock-two-builder.md`, and `AGENTS.md` in that order of authority. The written build spec controls product scope; the frozen contract controls the UI/server boundary.

Try to break the plan using these cases: two simultaneous proposes; two final accepts; answer changes after acceptance; accepting and non-accepting dropout; reconnect after dropout; unknown or malformed share code; stale subscription order; duplicate identity; email replay, cross-origin request, oversized body, unverified sender, and arbitrary URL; Maincloud or Resend not provisioned; UI and server edits crossing ownership; and two-client state divergence.

For each defect, report one of: `BLOCKER` (contradiction or missing authority), `GATE` (safe to defer but cannot release), or `NOTE` (non-blocking improvement). Include the exact document heading, the conflicting rule or missing proof, the owner, and the smallest contract/plan correction. Do not propose code unless it is required to make the plan internally coherent.

The plan passes only when every written-spec requirement maps to one acceptance-matrix row, every reducer transition has one authoritative outcome, all shared files have one owner, email remains optional and non-authoritative, and the only scheduled cross-lane edit is the UI-owned `App.tsx` mount.
