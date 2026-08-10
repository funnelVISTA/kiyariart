/**
 * Calendar-date helpers.
 *
 * Event dates are plain calendar dates ("YYYY-MM-DD") with no timezone.
 * `new Date("2027-01-15")` parses as UTC midnight, which renders as
 * 2027-01-14 in any negative-offset timezone — the classic off-by-one.
 * Always parse through `parseCalendarDate` (local noon) so the day the
 * admin picked is the day everyone sees.
 */
export function parseCalendarDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Today as a timezone-agnostic "YYYY-MM-DD" string (local calendar day). */
export function todayCalendarDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatCalendarDate(
  value?: string | null,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
  locale?: string,
): string {
  const d = parseCalendarDate(value);
  if (!d) return value ?? "TBD";
  return d.toLocaleDateString(locale, opts);
}
