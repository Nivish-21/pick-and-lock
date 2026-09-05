# Decisions

## 2026-09-05 — Selective server-branch integration

The collaborator branch contains the SpacetimeDB module and generated client bindings, but also duplicate tool-instruction files and `server/spacetime.local.json`, which encodes a machine-specific database name. We will selectively integrate product code rather than merging the branch wholesale. This preserves the frozen ownership boundary, avoids repository bloat, and keeps deployment configuration owned by the database account holder.
