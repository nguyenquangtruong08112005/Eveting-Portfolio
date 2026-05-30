# Firebase Migration Tooling (Archived)

This directory contains Firebase-dependent migration and comparison scripts that were used during the transition from Firebase to PostgreSQL.

## Purpose
These scripts are kept for archival and historical reference or for one-off sync/compare tasks. They are **not** part of the live runtime server environment.

## Execution
The migration commands mapped in the root `package.json` point here:
* `npm run db:sync:<entity>`: Syncs data from Firebase to PostgreSQL.
* `npm run db:compare:<entity>`: Compares records between Firebase and PostgreSQL.
