import { Employee, POSITIONS, RuleSet, StaffNeed, WEEKDAYS } from "./types";

const emptyNeed = () =>
  Object.fromEntries(
    WEEKDAYS.map((day) => [
      day,
      {
        morning: Object.fromEntries(POSITIONS.map((p) => [p, 0])),
        afternoon: Object.fromEntries(POSITIONS.map((p) => [p, 0]))
      }
    ])
  ) as StaffNeed;

export const seedStaffNeed = (() => {
  const need = emptyNeed();
  const set = (day: (typeof WEEKDAYS)[number], shift: "morning" | "afternoon", values: Partial<Record<(typeof POSITIONS)[number], number>>) => {
    Object.assign(need[day][shift], values);
  };

  // Định mức gợi ý tự tổng hợp từ 2 tháng gần nhất trong file mẫu, đã bỏ các ngày lễ làm lệch số liệu.
  set("Thứ 2", "morning", { "Trưởng ca": 2, "Bán hàng": 3, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 1, "Phụ bếp": 0 });
  set("Thứ 2", "afternoon", { "Trưởng ca": 1, "Bán hàng": 2, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 1, "Phụ bếp": 0 });
  set("Thứ 3", "morning", { "Trưởng ca": 2, "Bán hàng": 1, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 3, "Phụ bếp": 0 });
  set("Thứ 3", "afternoon", { "Trưởng ca": 1, "Bán hàng": 2, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 1, "Phụ bếp": 0 });
  set("Thứ 4", "morning", { "Trưởng ca": 2, "Bán hàng": 2, "Phụ bếp/Bếp nướng": 1, "Bếp nướng": 2, "Phụ bếp": 0 });
  set("Thứ 4", "afternoon", { "Trưởng ca": 1, "Bán hàng": 1, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 1, "Phụ bếp": 0 });
  set("Thứ 5", "morning", { "Trưởng ca": 2, "Bán hàng": 2, "Phụ bếp/Bếp nướng": 0, "Bếp nướng": 2, "Phụ bếp": 0 });
  set("Thứ 5", "afternoon", { "Trưởng ca": 1, "Bán hàng": 1, "Phụ bếp/Bếp nướng": 1, "Bếp nướng": 1, "Phụ bếp": 0 });
  set("Thứ 6", "morning", { "Trưởng ca": 2, "Bán hàng": 3, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 1, "Phụ bếp": 0 });
  set("Thứ 6", "afternoon", { "Trưởng ca": 1, "Bán hàng": 1, "Phụ bếp/Bếp nướng": 1, "Bếp nướng": 1, "Phụ bếp": 0 });
  set("Thứ 7", "morning", { "Trưởng ca": 2, "Bán hàng": 3, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 3, "Phụ bếp": 1 });
  set("Thứ 7", "afternoon", { "Trưởng ca": 1, "Bán hàng": 1, "Phụ bếp/Bếp nướng": 1, "Bếp nướng": 1, "Phụ bếp": 0 });
  set("Chủ nhật", "morning", { "Trưởng ca": 2, "Bán hàng": 3, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 2, "Phụ bếp": 0 });
  set("Chủ nhật", "afternoon", { "Trưởng ca": 1, "Bán hàng": 2, "Phụ bếp/Bếp nướng": 2, "Bếp nướng": 1, "Phụ bếp": 0 });
  return need;
})();

export const seedEmployees: Employee[] = [
  { id: "linh", name: "Linh", type: "fulltime", positions: ["Trưởng ca"], skill: 5, desiredHoursPerWeek: 60 },
  { id: "nhan", name: "Nhân", type: "fulltime", positions: ["Phụ bếp/Bếp nướng", "Phụ bếp", "Bếp nướng"], skill: 5, desiredHoursPerWeek: 60 },
  { id: "thang", name: "Thắng", type: "fulltime", positions: ["Trưởng ca"], skill: 5, desiredHoursPerWeek: 60 },
  { id: "tuan", name: "Tuấn", type: "fulltime", positions: ["Bếp nướng", "Phụ bếp/Bếp nướng"], skill: 5, desiredHoursPerWeek: 60 },
  { id: "danh", name: "Danh", type: "fulltime", positions: ["Phụ bếp/Bếp nướng", "Bán hàng", "Phụ bếp"], skill: 4, desiredHoursPerWeek: 60 },
  { id: "duyen", name: "Duyên", type: "parttime", positions: ["Bán hàng"], skill: 3, desiredHoursPerWeek: 28 },
  { id: "atai", name: "A. Tài", type: "parttime", positions: ["Bán hàng"], skill: 3, desiredHoursPerWeek: 28 },
  { id: "huu", name: "Hữu", type: "parttime", positions: ["Bán hàng"], skill: 3, desiredHoursPerWeek: 28 },
  { id: "huyen", name: "Huyền", type: "parttime", positions: ["Bán hàng"], skill: 3, desiredHoursPerWeek: 28 },
  { id: "lac", name: "Lạc", type: "parttime", positions: ["Bán hàng"], skill: 3, desiredHoursPerWeek: 28 },
  { id: "hieu", name: "Hiếu", type: "parttime", positions: ["Bếp nướng", "Phụ bếp/Bếp nướng"], skill: 4, desiredHoursPerWeek: 32 },
  { id: "tien", name: "Tiến", type: "parttime", positions: ["Phụ bếp", "Bếp nướng"], skill: 4, desiredHoursPerWeek: 32 },
  { id: "dung", name: "Dũng", type: "parttime", positions: ["Bếp nướng", "Phụ bếp/Bếp nướng"], skill: 4, desiredHoursPerWeek: 32 },
  { id: "giang", name: "Giang", type: "parttime", positions: ["Bếp nướng"], skill: 3, desiredHoursPerWeek: 24 }
];

export const seedRules: RuleSet = {
  morning: { label: "Ca sáng", start: "05:30", end: "14:30" },
  afternoon: { label: "Ca chiều", start: "14:00", end: "22:00" },
  maxHoursPerDay: 12,
  maxHoursPerWeek: 70,
  fulltimeNames: ["Linh", "Nhân", "Thắng", "Tuấn", "Danh"],
  positionPriority: ["Trưởng ca", "Bếp nướng", "Phụ bếp/Bếp nướng", "Phụ bếp", "Bán hàng"],
  staffNeed: seedStaffNeed
};
