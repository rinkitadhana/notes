const pad = (n: number) => String(n).padStart(2, "0");

export const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromYMD = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => toYMD(new Date());

export const addDays = (ymd: string, n: number) => {
  const d = fromYMD(ymd);
  d.setDate(d.getDate() + n);
  return toYMD(d);
};

export const diffDays = (a: string, b: string) =>
  Math.round((fromYMD(a).getTime() - fromYMD(b).getTime()) / 86_400_000);

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Human label for a due date relative to today. */
export function dueLabel(ymd: string) {
  const diff = diffDays(ymd, today());
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const d = fromYMD(ymd);
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function relativeTime(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Parses quick-add text like "pay rent tomorrow !1" into a title, due date and priority.
 * Supports: today, tod, tomorrow, tmr, tmrw, weekday names (mon..sun), "next week", !1 !2 !3.
 */
export function parseQuickAdd(input: string) {
  let text = ` ${input} `;
  let due: string | null = null;
  let priority = 0;
  const t = today();

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = text.match(re);
    if (m) {
      fn(m);
      text = text.replace(re, " ");
    }
  };

  take(/\s!([1-3])(?=\s)/, (m) => (priority = 4 - Number(m[1])));
  take(/\snext week(?=\s)/i, () => (due = addDays(t, 7)));
  take(/\s(today|tod)(?=\s)/i, () => (due = t));
  take(/\s(tomorrow|tmrw?|tmr)(?=\s)/i, () => (due = addDays(t, 1)));
  take(/\s(?:on\s)?(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday)?(?=\s)/i, (m) => {
    const idx = WEEKDAYS.findIndex((w) => w.startsWith(m[1].toLowerCase().slice(0, 3)));
    const cur = new Date().getDay();
    const delta = (idx - cur + 7) % 7 || 7;
    due = addDays(t, delta);
  });

  return { title: text.replace(/\s+/g, " ").trim(), due: due as string | null, priority };
}
