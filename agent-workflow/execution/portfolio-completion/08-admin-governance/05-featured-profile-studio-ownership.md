# Phase 08 Task 05: Featured Profile Studio Ownership and Approval

## Status

`PLANNED - business model approved, implementation requires Phase 07.1 regression cleanup first`

## Domain model

- **Featured Profile:** the public identity of a person, performer, speaker, collective, or public figure.
- **Profile Studio:** the profile-management workspace owned by that profile's company or authorized representative account.
- **Organizer:** an event host. An organizer is not presumed to be the Featured Profile owner and cannot edit that profile's identity, media, categories, links, or schedule.
- **Event association:** an organizer requests to tag/link an existing Featured Profile to a specific event. The association is distinct from ownership.

## Required workflows

1. A representative/company account submits a Studio activation and profile-ownership request. An organizer cannot submit this ownership request on the profile's behalf.
2. Admin receives an audit-log entry plus email/in-app notification, then approves or rejects the request.
3. Only after approval can the representative manage that Featured Profile Studio and publish profile changes.
4. An organizer may search/select an approved public Featured Profile while creating or editing an event, then submit an event-link request only.
5. The profile representative or an admin accepts/rejects the association according to the final approval policy.
6. The public profile page shows profile-owned information and associated events. It never presents the event organizer as the profile owner.

## Category policy

- A Studio may propose a custom category.
- The proposed category is not globally selectable or public until admin approval.
- Existing approved taxonomy remains selectable without creating a duplicate category.

## Explicit exclusions

- An organizer cannot create, claim, or edit a Featured Profile merely because they host an event.
- Manual activity schedules are not an authoring surface. Public appearances derive from approved event associations.
- Existing legacy organizer-managed Studio data requires a migration/ownership review; it must not be silently reassigned.

## Required contract and verification

- Separate profile-owner, organizer, and admin RBAC checks.
- Event-link request state machine and audit trail.
- Email/in-app admin notification for Studio activation requests.
- Web and Android clients consume profile ownership and association states without exposing unapproved profiles.
- Regression tests prove organizer edits are forbidden and approved representatives can edit only their owned profiles.
