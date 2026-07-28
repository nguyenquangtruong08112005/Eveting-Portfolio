import { MAX_SEATS_PER_PERFORMANCE } from '../../types/seat.ts';
import type { SeatLayout, SeatLayoutRow, SeatLayoutSection } from '../../types/seat.ts';

export interface SeatLayoutValidation {
  seatCount: number;
  errors: string[];
}

function alphaLabel(index: number): string {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function safeIdPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function countLayoutSeats(layout: SeatLayout): number {
  return layout.sections.reduce(
    (sectionTotal, section) =>
      sectionTotal + section.rows.reduce((rowTotal, row) => rowTotal + row.seats.length, 0),
    0
  );
}

export function resizeSection(
  section: SeatLayoutSection,
  rowCount: number,
  columnCount: number
): SeatLayoutSection {
  const rows = Math.max(1, Math.floor(rowCount));
  const columns = Math.max(1, Math.floor(columnCount));
  const sectionId = safeIdPart(section.id || section.name) || 'section';

  const nextRows: SeatLayoutRow[] = Array.from({ length: rows }, (_, rowIndex) => {
    const currentRow = section.rows[rowIndex];
    const rowLabel = currentRow?.label || alphaLabel(rowIndex);
    const rowId = currentRow?.id || `${sectionId}-row-${rowIndex + 1}`;
    const seats = Array.from({ length: columns }, (_, columnIndex) => {
      const currentSeat = currentRow?.seats[columnIndex];
      return (
        currentSeat || {
          id: `${rowId}-seat-${columnIndex + 1}`,
          label: `${rowLabel}${columnIndex + 1}`,
          column: columnIndex + 1,
          blocked: false,
        }
      );
    });

    return { id: rowId, label: rowLabel, seats };
  });

  return { ...section, rows: nextRows };
}

/** Returns null when a resize would exceed the per-performance seat limit. */
export function resizeLayoutSection(
  layout: SeatLayout,
  sectionId: string,
  rowCount: number,
  columnCount: number
): SeatLayout | null {
  const sections = layout.sections.map((section) =>
    section.id === sectionId ? resizeSection(section, rowCount, columnCount) : section
  );
  const nextLayout = { ...layout, sections };
  return countLayoutSeats(nextLayout) <= MAX_SEATS_PER_PERFORMANCE ? nextLayout : null;
}

export function createSeatSection(index: number): SeatLayoutSection {
  return resizeSection(
    {
      id: `section-${index + 1}`,
      name: `Section ${index + 1}`,
      rows: [],
    },
    5,
    10
  );
}

export function validateSeatLayout(layout: SeatLayout): SeatLayoutValidation {
  const errors: string[] = [];
  const seatCount = countLayoutSeats(layout);
  const sectionIds = new Set<string>();
  const seatIds = new Set<string>();

  if (layout.sections.length === 0) {
    errors.push('LAYOUT_REQUIRES_SECTION');
  }
  if (seatCount > MAX_SEATS_PER_PERFORMANCE) {
    errors.push('LAYOUT_SEAT_LIMIT_EXCEEDED');
  }

  for (const section of layout.sections) {
    if (!section.id.trim() || sectionIds.has(section.id)) {
      errors.push('LAYOUT_SECTION_ID_INVALID');
    }
    sectionIds.add(section.id);
    if (!section.name.trim()) errors.push('LAYOUT_SECTION_NAME_REQUIRED');
    if (section.rows.length === 0) errors.push('LAYOUT_REQUIRES_ROW');

    const rowLabels = new Set<string>();
    for (const row of section.rows) {
      const normalizedRowLabel = row.label.trim().toLowerCase();
      if (!normalizedRowLabel || rowLabels.has(normalizedRowLabel)) {
        errors.push('LAYOUT_ROW_LABEL_INVALID');
      }
      rowLabels.add(normalizedRowLabel);
      if (row.seats.length === 0) errors.push('LAYOUT_REQUIRES_SEAT');

      const labels = new Set<string>();
      for (const seat of row.seats) {
        const normalizedSeatLabel = seat.label.trim().toLowerCase();
        if (!seat.id.trim() || seatIds.has(seat.id)) errors.push('LAYOUT_SEAT_ID_INVALID');
        if (!normalizedSeatLabel || labels.has(normalizedSeatLabel)) {
          errors.push('LAYOUT_SEAT_LABEL_INVALID');
        }
        seatIds.add(seat.id);
        labels.add(normalizedSeatLabel);
      }
    }
  }

  return { seatCount, errors: [...new Set(errors)] };
}
