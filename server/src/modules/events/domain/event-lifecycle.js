const LIFECYCLE = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

const STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

const VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  PRIVATE: 'private',
  UNLISTED: 'unlisted',
});

const VALID_CANONICAL_STATUSES = Object.freeze(Object.values(LIFECYCLE));
const VALID_LEGACY_STATUSES = Object.freeze(Object.values(STATUS));
const VALID_VISIBILITIES = Object.freeze(Object.values(VISIBILITY));

const CANONICAL_TO_LEGACY_STATUS = Object.freeze({
  [LIFECYCLE.DRAFT]: STATUS.PENDING,
  [LIFECYCLE.SUBMITTED]: STATUS.PENDING,
  [LIFECYCLE.APPROVED]: STATUS.ACTIVE,
  [LIFECYCLE.PUBLISHED]: STATUS.ACTIVE,
  [LIFECYCLE.REJECTED]: STATUS.REJECTED,
  [LIFECYCLE.CANCELLED]: STATUS.CANCELLED,
});

const LEGACY_TO_CANONICAL_STATUS = Object.freeze({
  [STATUS.PENDING]: LIFECYCLE.DRAFT,
  [STATUS.ACTIVE]: LIFECYCLE.PUBLISHED,
  [STATUS.REJECTED]: LIFECYCLE.REJECTED,
  [STATUS.CANCELLED]: LIFECYCLE.CANCELLED,
});

const CANONICAL_TO_VISIBILITY = Object.freeze({
  [LIFECYCLE.DRAFT]: VISIBILITY.PRIVATE,
  [LIFECYCLE.SUBMITTED]: VISIBILITY.PRIVATE,
  [LIFECYCLE.APPROVED]: VISIBILITY.PUBLIC,
  [LIFECYCLE.PUBLISHED]: VISIBILITY.PUBLIC,
  [LIFECYCLE.REJECTED]: VISIBILITY.PRIVATE,
  [LIFECYCLE.CANCELLED]: VISIBILITY.PRIVATE,
});

const TRANSITIONS = Object.freeze({
  [LIFECYCLE.DRAFT]: Object.freeze([LIFECYCLE.SUBMITTED]),
  [LIFECYCLE.SUBMITTED]: Object.freeze([LIFECYCLE.APPROVED, LIFECYCLE.REJECTED]),
  [LIFECYCLE.APPROVED]: Object.freeze([LIFECYCLE.PUBLISHED]),
  [LIFECYCLE.PUBLISHED]: Object.freeze([LIFECYCLE.CANCELLED]),
  [LIFECYCLE.REJECTED]: Object.freeze([]),
  [LIFECYCLE.CANCELLED]: Object.freeze([]),
});

function canonicalToLegacyStatus(canonical) {
  return CANONICAL_TO_LEGACY_STATUS[canonical] || STATUS.PENDING;
}

function legacyToCanonicalStatus(legacy) {
  return LEGACY_TO_CANONICAL_STATUS[legacy] || LIFECYCLE.DRAFT;
}

function canonicalToVisibility(canonical) {
  return CANONICAL_TO_VISIBILITY[canonical] || VISIBILITY.PRIVATE;
}

function isTransitionAllowed(fromStatus, toStatus) {
  const allowed = TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

function isPublicDetailVisible(status, visibility) {
  if (status === STATUS.CANCELLED) return false;
  return visibility === VISIBILITY.PUBLIC;
}

function isPublicListingVisible(status, visibility) {
  return status === STATUS.ACTIVE && visibility === VISIBILITY.PUBLIC;
}

function isSearchable(status, visibility) {
  return isPublicListingVisible(status, visibility);
}

function isValidCanonicalStatus(value) {
  return VALID_CANONICAL_STATUSES.includes(value);
}

function isValidLegacyStatus(value) {
  return VALID_LEGACY_STATUSES.includes(value);
}

function isValidVisibility(value) {
  return VALID_VISIBILITIES.includes(value);
}

module.exports = {
  LIFECYCLE,
  STATUS,
  VISIBILITY,
  VALID_CANONICAL_STATUSES,
  VALID_LEGACY_STATUSES,
  VALID_VISIBILITIES,
  CANONICAL_TO_LEGACY_STATUS,
  LEGACY_TO_CANONICAL_STATUS,
  CANONICAL_TO_VISIBILITY,
  TRANSITIONS,
  canonicalToLegacyStatus,
  legacyToCanonicalStatus,
  canonicalToVisibility,
  isTransitionAllowed,
  isPublicDetailVisible,
  isPublicListingVisible,
  isSearchable,
  isValidCanonicalStatus,
  isValidLegacyStatus,
  isValidVisibility,
};
