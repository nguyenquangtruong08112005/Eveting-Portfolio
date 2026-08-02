import { describe, it, expect } from 'vitest'
import {
  countLayoutSeats,
  createSeatSection,
  resizeLayoutSection,
  resizeSection,
  validateSeatLayout,
} from './seat-layout'

describe('createSeatSection / countLayoutSeats', () => {
  it('creates a section with 50 seats (5 rows x 10 cols)', () => {
    const section = createSeatSection(0)
    expect(countLayoutSeats({ version: 1, sections: [section] })).toBe(50)
  })
})

describe('resizeSection', () => {
  it('preserves blocked and label when resizing existing seats', () => {
    const section = createSeatSection(0)
    section.rows[0].seats[0].blocked = true
    section.rows[0].seats[0].label = 'VIP-1'
    const resized = resizeSection(section, 6, 12)
    expect(resized.rows[0].seats[0].blocked).toBe(true)
    expect(resized.rows[0].seats[0].label).toBe('VIP-1')
    expect(resized.rows).toHaveLength(6)
    expect(resized.rows[0].seats).toHaveLength(12)
  })
})

describe('validateSeatLayout', () => {
  it('returns no errors for a valid layout', () => {
    const section = createSeatSection(0)
    expect(validateSeatLayout({ version: 1, sections: [section] }).errors).toEqual([])
  })

  it('detects seat limit exceeded when over 500', () => {
    const oversized = resizeSection(createSeatSection(1), 25, 21)
    const overLimit = validateSeatLayout({ version: 1, sections: [oversized] })
    expect(overLimit.seatCount).toBe(525)
    expect(overLimit.errors).toContain('LAYOUT_SEAT_LIMIT_EXCEEDED')
  })

  it('detects duplicate seat labels', () => {
    const duplicateLabels = resizeSection(createSeatSection(2), 1, 2)
    duplicateLabels.rows[0].seats[1].label = duplicateLabels.rows[0].seats[0].label
    expect(
      validateSeatLayout({ version: 1, sections: [duplicateLabels] }).errors,
    ).toContain('LAYOUT_SEAT_LABEL_INVALID')
  })
})

describe('resizeLayoutSection', () => {
  it('rejects resize that exceeds 500 total seats (null) and preserves original', () => {
    const layout = { version: 1 as const, sections: [createSeatSection(3)] }
    expect(
      resizeLayoutSection(layout, layout.sections[0].id, 25, 21),
    ).toBeNull()
    expect(countLayoutSeats(layout)).toBe(50)
  })
})
