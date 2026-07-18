# Archived: legacy app folder names (2026-07-18)

## What changed

Long course-style folder names were retired. Canonical monorepo layout:

| Old name (archived) | New name (live) |
|---|---|
| `Server-2025-Eventing/` | **`server/`** |
| `web-2025-eventing/` | **`web/`** |
| `Mobile-2025-Eventing/` | **`mobile-attendee/`** |
| `Mobile-2025-Eventing-Organizer/` | **`mobile-organizer/`** |

Each app remains its **own git repository** (not submodules of the monorepo root). The rename is filesystem + docs only.

## Git freeze tags (code “old version” before remake)

On each app repo:

```text
pre-remake-2026-07-18
```

Restore later if needed:

```bash
cd server   # or web / mobile-attendee / mobile-organizer
git checkout pre-remake-2026-07-18
```

Or create a branch from the tag:

```bash
git switch -c restore-pre-remake pre-remake-2026-07-18
```

## Why archive this way

- Full copies of `node_modules` / Android `build` are huge and not useful as docs.
- The **real** old version is the **git tag** on each app.
- This folder holds the **naming map** + any accidental leftover files from the rename process.

## Leftover folder

`leftover-Mobile-2025-Eventing/` may contain residual build artifacts (e.g. `.gradle`) that could not be deleted mid-move. Safe to delete locally; not source of truth.

## Next product steps

1. Bug bash on mobile (you report → we fix)  
2. Remake **web**  
3. Redesign **mobile** UI  

See monorepo `NAMING.md` and `START_HERE.md`.
