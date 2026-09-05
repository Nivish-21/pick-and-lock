# UI Execution Log

This is the resumable UI-owner task queue. Each completed task is committed and pushed before the next begins.

- [ ] U1: create the Vite client, install only needed UI dependencies, and establish design tokens.
- [ ] U2: define fixtures and the frozen presentational contract.
- [ ] U3: build the mobile-first landing page and name-only join route.
- [ ] U4: build Choices, Live Group, Locked, and reopened fixture states.
- [ ] U5: add UI tests, accessibility checks, and production build verification.
- [ ] U6: mount the server-owned bridge after its tested handoff.

The server agent independently owns all `server/**`, bindings, data bridge, email API, and end-to-end paths. The UI owner never waits for server work before U6.

## Completed

- [x] U1 completed: Vite client bootstrapped, default starter screen replaced, shared semantic tokens added, and lint/build passed.
- [x] U2 completed: `RoomView`, `RoomActions`, and Saturday open, pending, locked, and reopened fixtures now mirror the frozen realtime contract.
