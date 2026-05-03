import { Assignment, AvailabilityEntry, Employee, Position, RuleSet, ScheduleResult, ShiftKey, TimeRange, WEEKDAYS, Weekday } from "./types";
import { containsRange, durationHours, getWeekDates, overlaps } from "./time";

function normalizeName(name: string) {
  return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function canDoPosition(employee: Employee, position: Position): boolean {
  if (employee.positions.includes(position)) return true;
  if (position === "Bếp nướng" && employee.positions.includes("Phụ bếp/Bếp nướng")) return true;
  if (position === "Phụ bếp" && employee.positions.includes("Phụ bếp/Bếp nướng")) return true;
  if (position === "Phụ bếp/Bếp nướng" && (employee.positions.includes("Bếp nướng") || employee.positions.includes("Phụ bếp"))) return true;
  return false;
}

function hasAvailability(employee: Employee, entries: AvailabilityEntry[], date: string, weekday: Weekday, range: TimeRange): boolean {
  const nameKey = normalizeName(employee.name);
  const relevant = entries.filter((e) => normalizeName(e.employeeName) === nameKey && (e.date === date || e.weekday === weekday || (!e.date && !e.weekday)));

  // Full-time được xem là có thể làm nếu không báo bận. Part-time phải có lịch rảnh rõ ràng.
  const unavailableConflict = relevant.some((entry) => entry.unavailable.some((u) => overlaps(u.start, u.end, range.start, range.end)));
  if (unavailableConflict) return false;

  const availableRanges = relevant.flatMap((entry) => entry.available);
  if (employee.type === "fulltime" && availableRanges.length === 0) return true;
  if (availableRanges.length === 0) return false;
  return availableRanges.some((a) => containsRange(a.start, a.end, range.start, range.end) || overlaps(a.start, a.end, range.start, range.end));
}

function assignmentHoursFor(assignments: Assignment[], employeeId: string, date?: string) {
  return assignments
    .filter((a) => a.employeeId === employeeId && (!date || a.date === date))
    .reduce((sum, a) => sum + durationHours(a.start, a.end), 0);
}

function hasOverlapAssignment(assignments: Assignment[], employeeId: string, date: string, range: TimeRange) {
  return assignments.some((a) => a.employeeId === employeeId && a.date === date && overlaps(a.start, a.end, range.start, range.end));
}

function scoreCandidate(employee: Employee, position: Position, assignments: Assignment[], rules: RuleSet): number {
  const weekHours = assignmentHoursFor(assignments, employee.id);
  const priorityIndex = rules.positionPriority.indexOf(position);
  const exact = employee.positions.includes(position) ? 80 : 40;
  const fulltimeBoost = employee.type === "fulltime" ? 20 : 0;
  const criticalBoost = priorityIndex >= 0 && priorityIndex <= 3 ? 20 : 0;
  const fairness = Math.max(0, 70 - weekHours);
  return exact + fulltimeBoost + criticalBoost + employee.skill * 5 + fairness;
}

export function generateSchedule(params: {
  weekStartISO: string;
  employees: Employee[];
  availability: AvailabilityEntry[];
  rules: RuleSet;
}): ScheduleResult {
  const { weekStartISO, employees, availability, rules } = params;
  const warnings: string[] = [];
  const assignments: Assignment[] = [];
  const days = getWeekDates(weekStartISO);

  for (const day of days) {
    for (const shift of ["morning", "afternoon"] as ShiftKey[]) {
      const shiftRule = shift === "morning" ? rules.morning : rules.afternoon;
      const range = { start: shiftRule.start, end: shiftRule.end };
      const positions = [...rules.positionPriority];

      for (const position of positions) {
        const required = rules.staffNeed[day.weekday][shift][position] ?? 0;
        for (let slot = 0; slot < required; slot += 1) {
          const candidates = employees
            .filter((employee) => canDoPosition(employee, position))
            .filter((employee) => hasAvailability(employee, availability, day.date, day.weekday, range))
            .filter((employee) => !hasOverlapAssignment(assignments, employee.id, day.date, range))
            .filter((employee) => assignmentHoursFor(assignments, employee.id, day.date) + durationHours(range.start, range.end) <= rules.maxHoursPerDay)
            .filter((employee) => assignmentHoursFor(assignments, employee.id) + durationHours(range.start, range.end) <= rules.maxHoursPerWeek)
            .sort((a, b) => scoreCandidate(b, position, assignments, rules) - scoreCandidate(a, position, assignments, rules));

          const selected = candidates[0];
          if (!selected) {
            warnings.push(`${day.weekday} ${day.date} - ${shiftRule.label}: thiếu ${position} slot ${slot + 1}/${required}`);
            assignments.push({
              id: `${day.date}-${shift}-${position}-${slot}-missing`,
              date: day.date,
              weekday: day.weekday,
              shift,
              position,
              employeeId: "",
              start: range.start,
              end: range.end,
              warning: "Thiếu người"
            });
          } else {
            assignments.push({
              id: `${day.date}-${shift}-${position}-${slot}-${selected.id}`,
              date: day.date,
              weekday: day.weekday,
              shift,
              position,
              employeeId: selected.id,
              start: range.start,
              end: range.end
            });
          }
        }
      }
    }
  }

  return { assignments, warnings };
}

export function countCoverage(assignments: Assignment[], rules: RuleSet) {
  const result: Record<string, Record<ShiftKey, Record<Position, { required: number; actual: number }>>> = {};
  for (const assignment of assignments) {
    result[assignment.date] ||= { morning: {} as Record<Position, { required: number; actual: number }>, afternoon: {} as Record<Position, { required: number; actual: number }> };
    const bucket = result[assignment.date][assignment.shift];
    bucket[assignment.position] ||= { required: 0, actual: 0 };
    bucket[assignment.position].actual += assignment.employeeId ? 1 : 0;
    bucket[assignment.position].required = rules.staffNeed[assignment.weekday][assignment.shift][assignment.position];
  }
  return result;
}

export function scheduleToZaloText(assignments: Assignment[], employees: Employee[]) {
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name || "THIẾU NGƯỜI";
  const grouped = new Map<string, Assignment[]>();
  assignments.forEach((a) => {
    const key = `${a.weekday} ${a.date}`;
    grouped.set(key, [...(grouped.get(key) ?? []), a]);
  });
  return [...grouped.entries()]
    .map(([day, rows]) => {
      const lines = rows.map((a) => `- ${a.position}: ${nameOf(a.employeeId)} (${a.start}-${a.end})${a.warning ? " ⚠ " + a.warning : ""}`);
      return `${day}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}
