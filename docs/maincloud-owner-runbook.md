# Maincloud Database Owner Runbook

Use SpacetimeDB Maincloud. Do not self-host for this build: publishing to Maincloud creates the database and avoids server provisioning, TLS, persistence, monitoring, and public-network setup.

## Do this now

From the repository root on your machine:

```bash
spacetime login
spacetime login show
```

Complete the browser login. Do not send the login token to the collaborator and do not commit it.

## Create the database after server-core merge

Wait until the collaborator's tested server-core branch is merged into `main`. Then run:

```bash
git checkout main
git pull origin main
spacetime publish --server maincloud --module-path server pick-and-lock
spacetime list --server maincloud
```

`spacetime publish` is the create-and-update command. The first successful publish creates the `pick-and-lock` Maincloud database; it is not necessary or useful to create an empty database beforehand. Do not use `--delete-data`.

Send the collaborator only this non-secret configuration:

```text
SpacetimeDB server: maincloud
Database name: pick-and-lock
Database publish commit: <main commit SHA>
```

The collaborator may then generate bindings and implement `client/src/data/**`. Keep authentication tokens, Vercel credentials, and Resend values private.
