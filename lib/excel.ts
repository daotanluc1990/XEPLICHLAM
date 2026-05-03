import { Assignment, Employee, ImportedScheduleRow, Position, POSITIONS, RuleSet, WEEKDAYS } from "./types";
import { durationHours } from "./time";

function normalizePosition(value: unknown): Position | string {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";
  if (text.includes("trưởng")) return "Trưởng ca";
  if (text.includes("bán")) return "Bán hàng";
  if (text.includes("phụ bếp") && text.includes("bếp nướng")) return "Phụ bếp/Bếp nướng";
  if (text.includes("bếp nướng")) return "Bếp nướng";
  if (text.includes("phụ bếp")) return "Phụ bếp";
  return String(value);
}

function excelSerialToDate(serial: number): string {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}


function parseCompactSheetDate(token: string, year: number): Date | null {
  const digits = token.replace(/\D/g, "");
  if (digits.length < 2 || digits.length > 4) return null;
  let day = 0;
  let month = 0;
  if (digits.length === 4) {
    day = Number(digits.slice(0, 2));
    month = Number(digits.slice(2));
  } else if (digits.length === 3) {
    day = Number(digits.slice(0, 2));
    month = Number(digits.slice(2));
  } else {
    day = Number(digits.slice(0, 1));
    month = Number(digits.slice(1));
  }
  if (!day || !month || day > 31 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function parseDateRangeFromSheetName(sheetName: string, referenceYear: number): { start: Date; end: Date } | null {
  const match = sheetName.match(/(\d{2,4})\s*-\s*(\d{2,4})/);
  if (!match) return null;
  const start = parseCompactSheetDate(match[1], referenceYear);
  const endRaw = parseCompactSheetDate(match[2], referenceYear);
  if (!start || !endRaw) return null;
  const end = new Date(endRaw);
  if (end.getTime() < start.getTime()) end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

function dateDiffDays(a: string, b: Date): number {
  const da = new Date(`${a}T00:00:00Z`);
  return Math.round(Math.abs(da.getTime() - b.getTime()) / 86400000);
}

function excelTimeToHHMM(value: unknown): string {
  if (typeof value === "number") {
    const total = Math.round(value * 24 * 60);
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    const match = value.match(/(\d{1,2})(?::|h)?(\d{0,2})/);
    if (!match) return "";
    const h = Number(match[1]);
    const m = Number(match[2] || 0);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return "";
}

export async function importExcelTemplate(file: File): Promise<{ rows: ImportedScheduleRow[]; notices: string[] }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const notices: string[] = [];
  const rows: ImportedScheduleRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false });
    const titleRowIndex = aoa.findIndex((row) => row.some((cell) => String(cell ?? "").includes("LỊCH LÀM VIỆC - CƠM TẤM LÀNG")));
    if (titleRowIndex < 0) continue;

    const headerRowIndex = titleRowIndex + 1;
    const dateRowIndex = titleRowIndex + 2;
    const startRow = titleRowIndex + 4;
    const dateColumns = [3, 5, 7, 9, 11, 13, 15];
    const dates = dateColumns.map((col) => {
      const raw = aoa[dateRowIndex]?.[col];
      if (typeof raw === "number") return excelSerialToDate(raw);
      return String(raw ?? WEEKDAYS[(col - 3) / 2]);
    });

    const firstDateYear = /^\d{4}-\d{2}-\d{2}$/.test(dates[0]) ? Number(dates[0].slice(0, 4)) : new Date().getFullYear();
    const guessedRange = parseDateRangeFromSheetName(sheetName, firstDateYear);
    if (guessedRange && /^\d{4}-\d{2}-\d{2}$/.test(dates[0])) {
      const firstDiff = dateDiffDays(dates[0], guessedRange.start);
      const lastDiff = dateDiffDays(dates[6], guessedRange.end);
      if (firstDiff > 1 || lastDiff > 1) {
        notices.push(`Cảnh báo: sheet "${sheetName}" có tên tuần khác với ngày trong bảng. Tên sheet gợi ý ${guessedRange.start.toISOString().slice(0, 10)} đến ${guessedRange.end.toISOString().slice(0, 10)}, nhưng ô ngày đang là ${dates[0]} đến ${dates[6]}.`);
      }
    }

    for (let r = startRow; r < Math.min(aoa.length, startRow + 30); r += 1) {
      const row = aoa[r] ?? [];
      const position = normalizePosition(row[1]);
      const name = String(row[2] ?? "").trim();
      if (!name || !position) continue;
      const item: ImportedScheduleRow = { position, name, dates: {} };
      dateColumns.forEach((col, i) => {
        const start = excelTimeToHHMM(row[col]);
        const end = excelTimeToHHMM(row[col + 1]);
        item.dates[dates[i]] = start && end ? { start, end } : null;
      });
      rows.push(item);
    }
    notices.push(`Đã đọc sheet "${sheetName}" với ${rows.length} dòng lịch.`);
  }

  if (rows.length === 0) notices.push("Chưa tìm thấy block 'LỊCH LÀM VIỆC - CƠM TẤM LÀNG'. Hãy kiểm tra file mẫu hoặc tên sheet.");
  return { rows, notices };
}

export async function exportScheduleToExcel(params: { assignments: Assignment[]; employees: Employee[]; rules: RuleSet; weekStartISO: string; warnings: string[] }) {
  const XLSX = await import("xlsx");
  const { assignments, employees, weekStartISO, warnings } = params;
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name || "THIẾU NGƯỜI";
  const dates = WEEKDAYS.map((_, i) => {
    const d = new Date(`${weekStartISO}T00:00:00`);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  const uniqueRows = assignments.map((a) => ({ key: a.id, position: a.position, name: nameOf(a.employeeId), date: a.date, start: a.start, end: a.end, warning: a.warning }));
  const rowKeys = Array.from(new Set(uniqueRows.map((r) => `${r.position}|${r.name}|${r.key}`)));
  const table: unknown[][] = [];
  table.push(["LỊCH LÀM VIỆC - CƠM TẤM LÀNG"]);
  table.push(["Tuần bắt đầu", weekStartISO, "Ghi chú", "Xuất từ web app"]);
  table.push(["Vị trí", "Họ và Tên", ...WEEKDAYS.flatMap((d) => [d, ""]), "Tổng giờ", "Cảnh báo"]);
  table.push(["", "", ...dates.flatMap((d) => [d, ""]), "", ""]);

  for (const rowKey of rowKeys) {
    const [position, name] = rowKey.split("|");
    const cells: unknown[] = [position, name];
    let total = 0;
    const rowWarnings: string[] = [];
    dates.forEach((date) => {
      const found = uniqueRows.find((r) => `${r.position}|${r.name}|${r.key}` === rowKey && r.date === date);
      if (found) {
        cells.push(found.start, found.end);
        total += durationHours(found.start, found.end);
        if (found.warning) rowWarnings.push(`${date}: ${found.warning}`);
      } else {
        cells.push("", "");
      }
    });
    cells.push(total, rowWarnings.join("; "));
    table.push(cells);
  }

  table.push([]);
  table.push(["CẢNH BÁO THIẾU NGƯỜI"]);
  warnings.forEach((warning) => table.push([warning]));

  const ws = XLSX.utils.aoa_to_sheet(table);
  ws["!cols"] = [
    { wch: 20 },
    { wch: 18 },
    ...Array.from({ length: 14 }, () => ({ wch: 10 })),
    { wch: 10 },
    { wch: 32 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lịch làm việc");
  XLSX.writeFile(wb, `LICH_LAM_VIEC_COM_TAM_LANG_${weekStartISO}.xlsx`);
}
