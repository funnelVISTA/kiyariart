/**
 * Event time helpers.
 *
 * Event times are stored as human-readable 12-hour strings that ALWAYS
 * include AM/PM (e.g. "7:00 PM" or "6:00 PM — 9:00 PM"). A bare "7" is
 * ambiguous, so the admin form blocks it and display normalises legacy
 * values that are missing minutes.
 */
export type TimeParts = { hour: string; minute: string; meridiem: "AM" | "PM" | "" };

export const EMPTY_TIME: TimeParts = { hour: "", minute: "", meridiem: "" };

/** True when a parts object is a complete 12-hour time including AM/PM. */
export function isCompleteTime(p: TimeParts): boolean {
  const h = Number(p.hour);
  const m = Number(p.minute);
  return (
    p.hour !== "" &&
    p.minute !== "" &&
    (p.meridiem === "AM" || p.meridiem === "PM") &&
    h >= 1 &&
    h <= 12 &&
    m >= 0 &&
    m <= 59
  );
}

export function partsToString(p: TimeParts): string {
  if (!isCompleteTime(p)) return "";
  return `${Number(p.hour)}:${String(Number(p.minute)).padStart(2, "0")} ${p.meridiem}`;
}

const TIME_RE = /(\d{1,2})(?::(\d{2}))?\s*([APap]\.?[Mm]\.?)?/g;

/** Parse a stored string back into start/end parts for the admin picker. */
export function parseTimeText(value?: string | null): { start: TimeParts; end: TimeParts } {
  const out: TimeParts[] = [];
  if (value) {
    for (const m of value.matchAll(TIME_RE)) {
      const mer = m[3] ? (m[3][0].toUpperCase() === "A" ? "AM" : "PM") : "";
      out.push({
        hour: String(Number(m[1])),
        minute: m[2] ?? "00",
        meridiem: mer as TimeParts["meridiem"],
      });
      if (out.length === 2) break;
    }
  }
  return { start: out[0] ?? { ...EMPTY_TIME }, end: out[1] ?? { ...EMPTY_TIME } };
}

/** Join start/end into one stored string. */
export function buildTimeText(start: TimeParts, end: TimeParts): string {
  const s = partsToString(start);
  const e = partsToString(end);
  if (s && e) return `${s} — ${e}`;
  return s;
}

/**
 * Display formatter: guarantees minutes and an AM/PM marker for legacy
 * values (a bare hour is treated as PM, matching evening event times).
 */
export function formatEventTime(value?: string | null): string {
  if (!value) return "";
  const raw = value.trim();
  if (!raw) return "";
  const found = [...raw.matchAll(TIME_RE)].filter((m) => m[0].trim() !== "");
  if (found.length === 0) return raw;
  const pieces = found.slice(0, 2).map((m) => {
    const hour = String(Number(m[1]));
    const minute = m[2] ?? "00";
    const mer = m[3] ? (m[3][0].toUpperCase() === "A" ? "AM" : "PM") : "PM";
    return `${hour}:${minute} ${mer}`;
  });
  return pieces.join(" — ");
}
