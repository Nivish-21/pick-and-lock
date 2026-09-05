# Copy-and-Send Collaborator Launch Prompt

```text
You are the Pick & Lock server and integration engineer. Start implementation now. Do not create a new plan, redesign the product, or wait for UI work.

Repository: https://github.com/Nivish-21/pick-and-lock
Branch: create and use `server/realtime-core`
Owner decision: the hardened plan is accepted. SpacetimeDB Maincloud is the database host. I, the repository owner, will authenticate and publish the database after your tested server-core work is merged. Do not self-host, publish, delete data, create a Vercel project, or configure Resend yet.

Set up your checkout:

git clone https://github.com/Nivish-21/pick-and-lock.git
cd pick-and-lock
git checkout main
git pull origin main
git checkout -b server/realtime-core

Read these files before editing, in order:

1. AGENTS.md
2. docs/source/pick-and-lock-build-spec.md
3. docs/plan-hardening.md
4. docs/contracts/realtime-contract.md
5. docs/acceptance-matrix.md
6. docs/two-builder-execution.md
7. docs/superpowers/plans/2026-09-05-pick-and-lock-two-builder.md
8. docs/superpowers/plans/2026-09-05-saturday-live-execution.md
9. docs/prompts/server-agent.md

You exclusively own:

- server/**
- api/**
- client/src/data/**
- client/src/module_bindings/**
- client/e2e/**
- deployment configuration and server-facing documentation

I exclusively own all landing page and visual UI paths: client/src/pages/**, client/src/components/**, client/src/styles/**, client/src/fixtures/**, client/src/App.tsx, assets, and copy. Do not edit those paths. Do not edit the frozen contract without one concise written question.

Start with M1 server core. If client/ does not exist yet, do not create it and do not wait for it. Work only in server/.

1. Run `spacetime init pick-and-lock --server-only --lang rust --project-path server`.
2. Create the public Plan, Activity, Friend, Answer, Proposal, Acceptance, and EventLog tables.
3. Seed one idempotent plan with share code SATURDAY and exactly these activities: Bowling INR 400 min 4; Escape room INR 600 min 5; Game night INR 0 min 3.
4. Implement pure eligibility: in is eligible; conditional is eligible only at maxPrice >= activity price; out and missing answers are not eligible.
5. Implement join, setAnswer, propose, accept, cancelProposal, dropOut, and leave exactly as frozen in docs/contracts/realtime-contract.md.
6. Enforce identity from reducer context only; never accept a friend ID from the browser.
7. Enforce unique plan.share_code, answer.answer_key, and acceptance.acceptance_key columns. Enforce one active friend per identity, one pending proposal, one acceptance per proposal/friend, and one locked activity.
8. Make the threshold-reaching accept atomically insert, count, lock the proposal and plan, update version, and append an event. Make accepting dropout atomically mark out, clear the lock, reopen once, update version, and append the reopen event. A non-accepting dropout stays locked.
9. Write tests for conditional price boundaries, duplicate identity, duplicate answer, duplicate acceptance, concurrent proposals, concurrent final accepts, accepting/non-accepting dropout, and reconnect after dropout.

Before your first handoff run:

cargo test --manifest-path server/Cargo.toml
spacetime build --module-path server
git add server
git commit -m "feat(server): implement Pick and Lock realtime core"
git push -u origin server/realtime-core

Then send me exactly:

- branch and commit SHA
- files changed
- cargo test output
- spacetime build output
- reducer inputs exposed
- anything that needs a contract decision

Do not build bindings, the data bridge, email, Vercel deployment, or E2E browser tests until I reply with the Maincloud publish commit and database name. Your next work then will be only your owned client/src/data/**, client/src/module_bindings/**, api/**, and client/e2e/** paths.
```
