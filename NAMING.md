# Naming convention (AuraEvents monorepo)

## Top-level folders (apps) — **canonical only**

| Folder | Role | Own git? |
|---|---|---|
| `server/` | Node API + Postgres | yes |
| `web/` | Next.js portal | yes |
| `mobile-attendee/` | Android attendee app | yes |
| `mobile-organizer/` | Android organizer / check-in | yes |
| `agent-workflow/` | Docs, DB audit, execution plans | monorepo root |
| `archive/` | Retired layouts / maps (not live apps) | monorepo root |

**Legacy names retired 2026-07-18** (do not create again):

`Server-2025-Eventing`, `web-2025-eventing`, `Mobile-2025-Eventing`, `Mobile-2025-Eventing-Organizer`

Archive map + git tags: [`archive/legacy-folder-names-2026-07/README.md`](archive/legacy-folder-names-2026-07/README.md)

**Rules:** kebab-case · lowercase · no year/course suffix in folder names · one product word when clear.

## Files

| Kind | Pattern |
|---|---|
| Docs | `kebab-case.md` or `NN-topic.md` (numbered series) |
| SQL migrations | `NNN_snake_description.sql` |
| Server scripts | `smoke.<domain>.js`, `seed.<domain>.postgres.js` |
| JS modules | `kebab-case` files / existing module folders |
| Kotlin packages | keep `com.tdtuer.eventing*` (Android id; not renamed) |
| DB columns | `snake_case`; times `*_at` |

## API field aliases

- DB `events.start_at` may still map to JSON `date` for clients until web remake.
- Prefer new client fields `startAt` / `endAt` in redesigns.
