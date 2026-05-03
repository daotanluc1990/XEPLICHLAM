import { WEEKDAYS, Weekday } from "./types";

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function durationHours(start: string, end: string): number {
  let s = toMinutes(start);
  let e = toMinutes(end);
  if (e < s) e += 1440;
  return (e - s) / 60;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  let a1 = toMinutes(aStart);
  let a2 = toMinutes(aEnd);
  let b1 = toMinutes(bStart);
  let b2 = toMinutes(bEnd);
  if (a2 <= a1) a2 += 1440;
  if (b2 <= b1) b2 += 1440;
  return a1 < b2 && b1 < a2;
}

export function containsRange(outerStart: string, outerEnd: string, innerStart: string, innerEnd: string): boolean {
  let o1 = toMinutes(outerStart);
  let o2 = toMinutes(outerEnd);
  let i1 = toMinutes(innerStart);
  let i2 = toMinutes(innerEnd);
  if (o2 <= o1) o2 += 1440;
  if (i2 <= i1) i2 += 1440;
  return o1 <= i1 && o2 >= i2;
}

export function getWeekDates(mondayISO: string): { date: string; weekday: Weekday }[] {
  const base = new Date(`${mondayISO}T00:00:00`);
  return WEEKDAYS.map((weekday, index) => {
    const d = new Date(base);
    d.setDate(base.getDate() + index);
    return { date: d.toISOString().slice(0, 10), weekday };
  });
}

export function getMondayISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function parseTimeRange(text: string): { start: string; end: string } | null {
  const normalized = text
    .toLowerCase()
    .replace(/h/g, ":")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
  const match = normalized.match(/(\d{1,2})(?::(\d{1,2}))?\s*-\s*(\d{1,2})(?::(\d{1,2}))?/);
  if (!match) return null;
  const h1 = Number(match[1]);
  const m1 = Number(match[2] ?? 0);
  const h2 = Number(match[3]);
  const m2 = Number(match[4] ?? 0);
  if ([h1, m1, h2, m2].some(Number.isNaN)) return null;
  return { start: `${String(h1).padStart(2, "0")}:${String(m1).padStart(2, "0")}`, end: `${String(h2).padStart(2, "0")}:${String(m2).padStart(2, "0")}` };
}
