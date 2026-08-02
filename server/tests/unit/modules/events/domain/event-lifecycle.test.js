const {
  LIFECYCLE, STATUS, VISIBILITY,
  VALID_CANONICAL_STATUSES, VALID_LEGACY_STATUSES, VALID_VISIBILITIES,
  canonicalToLegacyStatus, legacyToCanonicalStatus, canonicalToVisibility,
  isTransitionAllowed, isPublicDetailVisible, isPublicListingVisible,
  isSearchable, isValidCanonicalStatus, isValidLegacyStatus, isValidVisibility,
} = require('@/modules/events/domain/event-lifecycle');

describe('constants', () => {
  it('LIFECYCLE has all states', () => {
    expect(LIFECYCLE.DRAFT).toBe('draft');
    expect(LIFECYCLE.SUBMITTED).toBe('submitted');
    expect(LIFECYCLE.APPROVED).toBe('approved');
    expect(LIFECYCLE.PUBLISHED).toBe('published');
    expect(LIFECYCLE.REJECTED).toBe('rejected');
    expect(LIFECYCLE.CANCELLED).toBe('cancelled');
  });

  it('STATUS has all legacy states', () => {
    expect(STATUS.PENDING).toBe('pending');
    expect(STATUS.ACTIVE).toBe('active');
    expect(STATUS.REJECTED).toBe('rejected');
    expect(STATUS.CANCELLED).toBe('cancelled');
  });

  it('VISIBILITY has all values', () => {
    expect(VISIBILITY.PUBLIC).toBe('public');
    expect(VISIBILITY.PRIVATE).toBe('private');
    expect(VISIBILITY.UNLISTED).toBe('unlisted');
  });

  it('VALID_CANONICAL_STATUSES includes all lifecycle values', () => {
    expect(VALID_CANONICAL_STATUSES).toEqual(Object.values(LIFECYCLE));
  });

  it('VALID_VISIBILITIES includes all visibility values', () => {
    expect(VALID_VISIBILITIES).toEqual(Object.values(VISIBILITY));
  });
});

describe('canonicalToLegacyStatus', () => {
  it('maps each canonical status', () => {
    expect(canonicalToLegacyStatus(LIFECYCLE.DRAFT)).toBe(STATUS.PENDING);
    expect(canonicalToLegacyStatus(LIFECYCLE.SUBMITTED)).toBe(STATUS.PENDING);
    expect(canonicalToLegacyStatus(LIFECYCLE.APPROVED)).toBe(STATUS.ACTIVE);
    expect(canonicalToLegacyStatus(LIFECYCLE.PUBLISHED)).toBe(STATUS.ACTIVE);
    expect(canonicalToLegacyStatus(LIFECYCLE.REJECTED)).toBe(STATUS.REJECTED);
    expect(canonicalToLegacyStatus(LIFECYCLE.CANCELLED)).toBe(STATUS.CANCELLED);
  });

  it('defaults to PENDING for unknown values', () => {
    expect(canonicalToLegacyStatus('unknown')).toBe(STATUS.PENDING);
  });
});

describe('legacyToCanonicalStatus', () => {
  it('maps each legacy status', () => {
    expect(legacyToCanonicalStatus(STATUS.PENDING)).toBe(LIFECYCLE.DRAFT);
    expect(legacyToCanonicalStatus(STATUS.ACTIVE)).toBe(LIFECYCLE.PUBLISHED);
    expect(legacyToCanonicalStatus(STATUS.REJECTED)).toBe(LIFECYCLE.REJECTED);
    expect(legacyToCanonicalStatus(STATUS.CANCELLED)).toBe(LIFECYCLE.CANCELLED);
  });

  it('defaults to DRAFT for unknown', () => {
    expect(legacyToCanonicalStatus('unknown')).toBe(LIFECYCLE.DRAFT);
  });
});

describe('canonicalToVisibility', () => {
  it('maps draft/submitted to PRIVATE', () => {
    expect(canonicalToVisibility(LIFECYCLE.DRAFT)).toBe(VISIBILITY.PRIVATE);
    expect(canonicalToVisibility(LIFECYCLE.SUBMITTED)).toBe(VISIBILITY.PRIVATE);
  });

  it('maps approved/published to PUBLIC', () => {
    expect(canonicalToVisibility(LIFECYCLE.APPROVED)).toBe(VISIBILITY.PUBLIC);
    expect(canonicalToVisibility(LIFECYCLE.PUBLISHED)).toBe(VISIBILITY.PUBLIC);
  });

  it('maps rejected/cancelled to PRIVATE', () => {
    expect(canonicalToVisibility(LIFECYCLE.REJECTED)).toBe(VISIBILITY.PRIVATE);
    expect(canonicalToVisibility(LIFECYCLE.CANCELLED)).toBe(VISIBILITY.PRIVATE);
  });

  it('defaults to PRIVATE', () => {
    expect(canonicalToVisibility('unknown')).toBe(VISIBILITY.PRIVATE);
  });
});

describe('isTransitionAllowed', () => {
  it('allows DRAFT -> SUBMITTED', () => {
    expect(isTransitionAllowed(LIFECYCLE.DRAFT, LIFECYCLE.SUBMITTED)).toBe(true);
  });

  it('allows SUBMITTED -> APPROVED or REJECTED', () => {
    expect(isTransitionAllowed(LIFECYCLE.SUBMITTED, LIFECYCLE.APPROVED)).toBe(true);
    expect(isTransitionAllowed(LIFECYCLE.SUBMITTED, LIFECYCLE.REJECTED)).toBe(true);
  });

  it('allows APPROVED -> PUBLISHED', () => {
    expect(isTransitionAllowed(LIFECYCLE.APPROVED, LIFECYCLE.PUBLISHED)).toBe(true);
  });

  it('allows PUBLISHED -> CANCELLED', () => {
    expect(isTransitionAllowed(LIFECYCLE.PUBLISHED, LIFECYCLE.CANCELLED)).toBe(true);
  });

  it('disallows direct DRAFT -> PUBLISHED', () => {
    expect(isTransitionAllowed(LIFECYCLE.DRAFT, LIFECYCLE.PUBLISHED)).toBe(false);
  });

  it('disallows REJECTED/CANCELLED -> any', () => {
    expect(isTransitionAllowed(LIFECYCLE.REJECTED, LIFECYCLE.DRAFT)).toBe(false);
    expect(isTransitionAllowed(LIFECYCLE.CANCELLED, LIFECYCLE.DRAFT)).toBe(false);
  });

  it('returns false for unknown fromStatus', () => {
    expect(isTransitionAllowed('unknown', LIFECYCLE.DRAFT)).toBe(false);
  });
});

describe('visibility and search', () => {
  it('isPublicDetailVisible returns false for CANCELLED', () => {
    expect(isPublicDetailVisible(STATUS.CANCELLED, VISIBILITY.PUBLIC)).toBe(false);
  });

  it('isPublicDetailVisible returns true for ACTIVE + PUBLIC', () => {
    expect(isPublicDetailVisible(STATUS.ACTIVE, VISIBILITY.PUBLIC)).toBe(true);
  });

  it('isPublicDetailVisible returns false for ACTIVE + PRIVATE', () => {
    expect(isPublicDetailVisible(STATUS.ACTIVE, VISIBILITY.PRIVATE)).toBe(false);
  });

  it('isPublicListingVisible requires ACTIVE + PUBLIC', () => {
    expect(isPublicListingVisible(STATUS.ACTIVE, VISIBILITY.PUBLIC)).toBe(true);
    expect(isPublicListingVisible(STATUS.PENDING, VISIBILITY.PUBLIC)).toBe(false);
    expect(isPublicListingVisible(STATUS.ACTIVE, VISIBILITY.PRIVATE)).toBe(false);
  });

  it('isSearchable delegates to isPublicListingVisible', () => {
    expect(isSearchable(STATUS.ACTIVE, VISIBILITY.PUBLIC)).toBe(true);
    expect(isSearchable(STATUS.PENDING, VISIBILITY.PUBLIC)).toBe(false);
  });
});

describe('validity checks', () => {
  it('isValidCanonicalStatus checks against all lifecycle values', () => {
    expect(isValidCanonicalStatus('draft')).toBe(true);
    expect(isValidCanonicalStatus('published')).toBe(true);
    expect(isValidCanonicalStatus('unknown')).toBe(false);
  });

  it('isValidLegacyStatus checks against all status values', () => {
    expect(isValidLegacyStatus('active')).toBe(true);
    expect(isValidLegacyStatus('pending')).toBe(true);
    expect(isValidLegacyStatus('unknown')).toBe(false);
  });

  it('isValidVisibility checks against all visibility values', () => {
    expect(isValidVisibility('public')).toBe(true);
    expect(isValidVisibility('private')).toBe(true);
    expect(isValidVisibility('unknown')).toBe(false);
  });
});
