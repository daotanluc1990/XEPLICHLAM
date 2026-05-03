export const POSITIONS = [
  "Trưởng ca",
  "Bán hàng",
  "Phụ bếp/Bếp nướng",
  "Bếp nướng",
  "Phụ bếp"
] as const;

export type Position = (typeof POSITIONS)[number];

export const WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type ShiftKey = "morning" | "afternoon";

export type EmployeeType = "fulltime" | "parttime";

export interface Employee {
  id: string;
  name: string;
  type: EmployeeType;
  positions: Position[];
  skill: number;
  desiredHoursPerWeek?: number;
  notes?: string;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface AvailabilityEntry {
  id: string;
  employeeName: string;
  date?: string;
  weekday?: Weekday;
  available: TimeRange[];
  unavailable: TimeRange[];
  note?: string;
  confidence: number;
  source: "manual" | "ocr" | "paste" | "excel";
}

export interface ShiftRule {
  label: string;
  start: string;
  end: string;
}

export type StaffNeed = Record<Weekday, Record<ShiftKey, Record<Position, number>>>;

export interface RuleSet {
  morning: ShiftRule;
  afternoon: ShiftRule;
  maxHoursPerDay: number;
  maxHoursPerWeek: number;
  fulltimeNames: string[];
  positionPriority: Position[];
  staffNeed: StaffNeed;
}

export interface Assignment {
  id: string;
  date: string;
  weekday: Weekday;
  shift: ShiftKey;
  position: Position;
  employeeId: string;
  start: string;
  end: string;
  locked?: boolean;
  warning?: string;
}

export interface ScheduleResult {
  assignments: Assignment[];
  warnings: string[];
}

export interface ImportedScheduleRow {
  position: Position | string;
  name: string;
  dates: Record<string, TimeRange | null>;
}
