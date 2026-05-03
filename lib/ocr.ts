import { AvailabilityEntry, WEEKDAYS, Weekday } from "./types";
import { parseTimeRange } from "./time";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractWeekday(text: string): Weekday | undefined {
  const normalized = text.toLowerCase();
  for (const day of WEEKDAYS) {
    const short = day === "Chủ nhật" ? "cn" : day.replace("Thứ ", "t").toLowerCase();
    if (normalized.includes(day.toLowerCase()) || normalized.includes(short)) return day;
  }
  return undefined;
}

function cleanName(value: string) {
  return value
    .replace(/\b(thứ|thu|t[2-7]|cn|chủ nhật|chu nhat)\b/gi, "")
    .replace(/\d{1,2}[:h]\d{0,2}\s*[-–—]\s*\d{1,2}[:h]?\d{0,2}/g, "")
    .replace(/off|nghỉ|bận|rảnh|lịch học|ca/gi, "")
    .replace(/[|:;]+/g, " ")
    .trim();
}

export function parseAvailabilityText(rawText: string, source: "ocr" | "paste" = "paste"): AvailabilityEntry[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results: AvailabilityEntry[] = [];
  let currentName = "";

  for (const line of lines) {
    const range = parseTimeRange(line);
    const weekday = extractWeekday(line);
    const isOff = /\b(off|nghỉ|nghi|bận|ban)\b/i.test(line);
    const possibleName = cleanName(line);

    if (possibleName && !/^[\d\s:\-–—h]+$/.test(possibleName) && possibleName.length >= 2) {
      // Nếu dòng có tên + giờ, dùng tên của dòng đó. Nếu dòng chỉ là tên, lưu làm tên hiện tại.
      currentName = possibleName.length <= 30 ? possibleName : currentName;
    }

    if (!range && !isOff) continue;
    const employeeName = currentName || possibleName || "Chưa rõ tên";

    results.push({
      id: makeId(source),
      employeeName,
      weekday,
      available: isOff ? [] : range ? [range] : [],
      unavailable: isOff ? (range ? [range] : [{ start: "00:00", end: "23:59" }]) : [],
      note: line,
      confidence: source === "ocr" ? 0.65 : 0.9,
      source
    });
  }

  return results;
}

export async function recognizeImage(file: File): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("vie+eng");
  const result = await worker.recognize(file);
  await worker.terminate();
  return result.data.text;
}
