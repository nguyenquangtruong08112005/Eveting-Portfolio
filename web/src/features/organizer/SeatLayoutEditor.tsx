'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  Grid3X3,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { OrganizerShell } from '@/components/organizer/OrganizerShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HttpError } from '@/services/apiClient';
import { SeatService } from '@/services/seat.service';
import {
  MAX_SEATS_PER_PERFORMANCE,
  type SeatLayout,
  type SeatLayoutSection,
} from '@/types/seat';
import {
  countLayoutSeats,
  createSeatSection,
  resizeLayoutSection,
  validateSeatLayout,
} from '@/components/seating/seat-layout';

interface SeatSelection {
  sectionId: string;
  rowId: string;
  seatId: string;
}

const EMPTY_LAYOUT: SeatLayout = { version: 1, sections: [] };

export function SeatLayoutEditorView() {
  const t = useTranslations('seat_layout_editor');
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = String(params?.id || '');
  const initialPerformanceId = searchParams.get('performanceId') || '';
  const [performanceInput, setPerformanceInput] = useState(initialPerformanceId);
  const [activePerformanceId, setActivePerformanceId] = useState(initialPerformanceId);
  const [layout, setLayout] = useState<SeatLayout>(EMPTY_LAYOUT);
  const [selection, setSelection] = useState<SeatSelection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isNewLayout, setIsNewLayout] = useState(false);

  const validation = useMemo(() => validateSeatLayout(layout), [layout]);
  const blockedCount = useMemo(
    () =>
      layout.sections.reduce(
        (sectionTotal, section) =>
          sectionTotal +
          section.rows.reduce(
            (rowTotal, row) => rowTotal + row.seats.filter((seat) => seat.blocked).length,
            0
          ),
        0
      ),
    [layout]
  );

  const loadLayout = useCallback(
    async (performanceId: string) => {
      if (!eventId || !performanceId.trim()) return;
      setLoading(true);
      setLoadError(null);
      setSelection(null);
      try {
        const response = await SeatService.getOrganizerLayout(eventId, performanceId.trim());
        setLayout(response.layout);
        setActivePerformanceId(response.performanceId || performanceId.trim());
        setPerformanceInput(response.performanceId || performanceId.trim());
        setIsNewLayout(false);
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          setLayout(EMPTY_LAYOUT);
          setActivePerformanceId(performanceId.trim());
          setIsNewLayout(true);
        } else {
          setLayout(EMPTY_LAYOUT);
          setLoadError(error instanceof Error ? error.message : t('load_error'));
        }
      } finally {
        setLoading(false);
      }
    },
    [eventId, t]
  );

  useEffect(() => {
    if (!eventId) return;
    if (initialPerformanceId) {
      void loadLayout(initialPerformanceId);
      return;
    }

    let cancelled = false;
    setLoading(true);
    SeatService.getAvailability(eventId)
      .then((availability) => {
        if (cancelled) return;
        setPerformanceInput(availability.performanceId);
        void loadLayout(availability.performanceId);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        setLoadError(error instanceof Error ? error.message : t('load_error'));
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, initialPerformanceId, loadLayout, t]);

  const updateSection = (sectionId: string, update: (section: SeatLayoutSection) => SeatLayoutSection) => {
    setLayout((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? update(section) : section
      ),
    }));
  };

  const addSection = () => {
    const existingIds = new Set(layout.sections.map((section) => section.id));
    let sectionIndex = layout.sections.length;
    while (existingIds.has(`section-${sectionIndex + 1}`)) sectionIndex += 1;
    const next = createSeatSection(sectionIndex);
    const nextCount = countLayoutSeats(layout) + countLayoutSeats({ version: 1, sections: [next] });
    if (nextCount > MAX_SEATS_PER_PERFORMANCE) {
      toast.error(t('seat_limit', { count: MAX_SEATS_PER_PERFORMANCE }));
      return;
    }
    next.name = t('default_section', { number: sectionIndex + 1 });
    setLayout((current) => ({ ...current, sections: [...current.sections, next] }));
  };

  const removeSection = (sectionId: string) => {
    setLayout((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== sectionId),
    }));
    if (selection?.sectionId === sectionId) setSelection(null);
  };

  const resizeLayoutSectionWithinLimit = (
    sectionId: string,
    rowCount: number,
    columnCount: number
  ) => {
    setLayout((current) => {
      const next = resizeLayoutSection(current, sectionId, rowCount, columnCount);
      if (next) return next;
      toast.error(t('seat_limit', { count: MAX_SEATS_PER_PERFORMANCE }));
      return current;
    });
  };

  const updateSelectedRowLabel = (value: string) => {
    if (!selection) return;
    updateSection(selection.sectionId, (section) => ({
      ...section,
      rows: section.rows.map((row) =>
        row.id === selection.rowId ? { ...row, label: value } : row
      ),
    }));
  };

  const updateSelectedSeatLabel = (value: string) => {
    if (!selection) return;
    updateSection(selection.sectionId, (section) => ({
      ...section,
      rows: section.rows.map((row) =>
        row.id === selection.rowId
          ? {
              ...row,
              seats: row.seats.map((seat) =>
                seat.id === selection.seatId ? { ...seat, label: value } : seat
              ),
            }
          : row
      ),
    }));
  };

  const toggleBlockedSeat = (nextSelection: SeatSelection) => {
    setSelection(nextSelection);
    updateSection(nextSelection.sectionId, (section) => ({
      ...section,
      rows: section.rows.map((row) =>
        row.id === nextSelection.rowId
          ? {
              ...row,
              seats: row.seats.map((seat) =>
                seat.id === nextSelection.seatId ? { ...seat, blocked: !seat.blocked } : seat
              ),
            }
          : row
      ),
    }));
  };

  const selectedRow = selection
    ? layout.sections
        .find((section) => section.id === selection.sectionId)
        ?.rows.find((row) => row.id === selection.rowId)
    : undefined;
  const selectedSeat = selectedRow?.seats.find((seat) => seat.id === selection?.seatId);

  const handleSave = async () => {
    if (validation.errors.length > 0) {
      toast.error(t(validation.errors[0].toLowerCase()));
      return;
    }
    setSaving(true);
    try {
      const response = await SeatService.saveOrganizerLayout(
        eventId,
        activePerformanceId,
        layout
      );
      setLayout(response.layout);
      setIsNewLayout(false);
      toast.success(t('save_success'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('save_error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OrganizerShell>
      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        <Link
          href={`/organizer/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="size-3.5" />
          {t('back_to_event')}
        </Link>

        <PageHeader
          title={t('title')}
          description={t('performance', { id: activePerformanceId })}
          icon={<Grid3X3 className="size-5" />}
          actions={
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || saving || validation.errors.length > 0}
              className="gap-2 btn-primary-gradient text-[var(--on-primary)]"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {t('save')}
            </Button>
          }
        />

        <section className="grid gap-4 border-y border-[var(--surface-border)] py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="performance-id">{t('performance_id')}</Label>
            <Input
              id="performance-id"
              value={performanceInput}
              onChange={(event) => setPerformanceInput(event.target.value)}
              disabled={loading || saving}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadLayout(performanceInput)}
            disabled={!performanceInput.trim() || loading || saving}
            className="gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {t('load')}
          </Button>
        </section>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-[var(--text-secondary)]">
          <span>{t('seat_count', { count: validation.seatCount })}</span>
          <span>{t('blocked_count', { count: blockedCount })}</span>
          <span>{t('seat_limit', { count: MAX_SEATS_PER_PERFORMANCE })}</span>
          {isNewLayout ? (
            <span className="text-[var(--warning)]">{t('new_layout')}</span>
          ) : null}
        </div>

        {loadError ? (
          <div
            role="alert"
            className="rounded-md border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-sm text-[var(--error)]"
          >
            {loadError}
          </div>
        ) : null}

        {validation.errors.length > 0 && !loading ? (
          <div
            role="alert"
            className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-xs text-[var(--warning)]"
          >
            {validation.errors.map((error) => t(error.toLowerCase())).join(' ')}
          </div>
        ) : null}

        {!loading ? (
          <div className="space-y-5">
            {layout.sections.map((section) => {
              const columnCount = section.rows[0]?.seats.length || 1;
              return (
                <section
                  key={section.id}
                  className="space-y-5 rounded-md border border-[var(--surface-border)] bg-[var(--surface)] p-5"
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_8rem_8rem_auto] lg:items-end">
                    <div className="space-y-2">
                      <Label htmlFor={`${section.id}-name`}>{t('section_name')}</Label>
                      <Input
                        id={`${section.id}-name`}
                        value={section.name}
                        onChange={(event) =>
                          updateSection(section.id, (current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${section.id}-rows`}>{t('rows')}</Label>
                      <Input
                        id={`${section.id}-rows`}
                        type="number"
                        min={1}
                        max={50}
                        value={section.rows.length}
                        onChange={(event) =>
                          resizeLayoutSectionWithinLimit(
                            section.id,
                            Number(event.target.value),
                            columnCount
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${section.id}-columns`}>{t('columns')}</Label>
                      <Input
                        id={`${section.id}-columns`}
                        type="number"
                        min={1}
                        max={50}
                        value={columnCount}
                        onChange={(event) =>
                          resizeLayoutSectionWithinLimit(
                            section.id,
                            section.rows.length,
                            Number(event.target.value)
                          )
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(section.id)}
                      title={t('remove_section')}
                      aria-label={t('remove_section')}
                      className="text-[var(--error)]"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="overflow-x-auto pb-2">
                    <div className="min-w-max space-y-2">
                      {section.rows.map((row) => (
                        <div key={row.id} className="flex items-center gap-2">
                          <span className="w-8 text-right text-xs font-bold text-[var(--text-muted)]">
                            {row.label}
                          </span>
                          <div
                            className="grid gap-2"
                            style={{
                              gridTemplateColumns: `repeat(${row.seats.length}, minmax(2.5rem, 2.5rem))`,
                            }}
                          >
                            {row.seats.map((seat) => {
                              const isSelected = selection?.seatId === seat.id;
                              return (
                                <button
                                  key={seat.id}
                                  type="button"
                                  aria-pressed={seat.blocked}
                                  aria-label={`${seat.label}, ${
                                    seat.blocked ? t('blocked') : t('available')
                                  }`}
                                  title={seat.blocked ? t('unblock') : t('block')}
                                  onClick={() =>
                                    toggleBlockedSeat({
                                      sectionId: section.id,
                                      rowId: row.id,
                                      seatId: seat.id,
                                    })
                                  }
                                  className={`flex size-10 items-center justify-center rounded-md border text-[10px] font-bold transition-colors ${
                                    seat.blocked
                                      ? 'border-[var(--error)]/40 bg-[var(--error)]/15 text-[var(--error)]'
                                      : 'border-[var(--surface-border)] bg-[var(--background)] text-[var(--text-secondary)] hover:border-[var(--primary)]'
                                  } ${isSelected ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]' : ''}`}
                                >
                                  {seat.blocked ? <Ban className="size-3.5" /> : seat.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}

            <Button type="button" variant="outline" onClick={addSection} className="gap-2">
              <Plus className="size-4" />
              {t('add_section')}
            </Button>
          </div>
        ) : (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="size-9 animate-spin text-[var(--primary)]" />
          </div>
        )}

        {selectedRow && selectedSeat ? (
          <section className="sticky bottom-4 grid gap-4 rounded-md border border-[var(--primary)]/30 bg-[var(--surface)] p-4 shadow-lg sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="selected-row-label">{t('row_label')}</Label>
              <Input
                id="selected-row-label"
                value={selectedRow.label}
                onChange={(event) => updateSelectedRowLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selected-seat-label">{t('seat_label')}</Label>
              <Input
                id="selected-seat-label"
                value={selectedSeat.label}
                onChange={(event) => updateSelectedSeatLabel(event.target.value)}
              />
            </div>
          </section>
        ) : null}
      </main>
    </OrganizerShell>
  );
}
