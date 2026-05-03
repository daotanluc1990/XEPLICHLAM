"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Download, FileSpreadsheet, Image as ImageIcon, Printer, RotateCcw, Save, Sparkles, Upload } from "lucide-react";
import { AvailabilityEntry, Employee, POSITIONS, Position, RuleSet, ShiftKey, WEEKDAYS, Weekday, Assignment } from "@/lib/types";
import { seedEmployees, seedRules } from "@/lib/seed";
import { generateSchedule, scheduleToZaloText } from "@/lib/scheduler";
import { getMondayISO } from "@/lib/time";
import { loadState, saveState } from "@/lib/storage";
import { importExcelTemplate, exportScheduleToExcel } from "@/lib/excel";
import { parseAvailabilityText, recognizeImage } from "@/lib/ocr";

type TabKey = "input" | "employees" | "rules" | "schedule" | "export";

const STORAGE_KEY = "comtam-lang-scheduler-v1";

const tabs: { key: TabKey; label: string }[] = [
  { key: "input", label: "1. Nhập dữ liệu" },
  { key: "employees", label: "2. Nhân viên" },
  { key: "rules", label: "3. Quy tắc" },
  { key: "schedule", label: "4. Tạo lịch" },
  { key: "export", label: "5. Xuất lịch" }
];

function makeId(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || crypto.randomUUID();
}

function Card({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-stone-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Button({ children, onClick, type = "button", variant = "primary", disabled = false }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; variant?: "primary" | "secondary" | "danger"; disabled?: boolean }) {
  const cls = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-stone-100 text-stone-800 hover:bg-stone-200",
    danger: "bg-red-600 text-white hover:bg-red-700"
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${cls} disabled:cursor-not-allowed disabled:opacity-50`}>
      {children}
    </button>
  );
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>("input");
  const [employees, setEmployees] = useState<Employee[]>(seedEmployees);
  const [rules, setRules] = useState<RuleSet>(seedRules);
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [weekStartISO, setWeekStartISO] = useState(getMondayISO());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rawText, setRawText] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Employee>({ id: "", name: "", type: "parttime", positions: ["Bán hàng"], skill: 3, desiredHoursPerWeek: 28 });

  useEffect(() => {
    const saved = loadState(STORAGE_KEY, null as null | {
      employees: Employee[];
      rules: RuleSet;
      availability: AvailabilityEntry[];
      weekStartISO: string;
      assignments: Assignment[];
      warnings: string[];
    });
    if (saved) {
      setEmployees(saved.employees ?? seedEmployees);
      setRules(saved.rules ?? seedRules);
      setAvailability(saved.availability ?? []);
      setWeekStartISO(saved.weekStartISO ?? getMondayISO());
      setAssignments(saved.assignments ?? []);
      setWarnings(saved.warnings ?? []);
    }
  }, []);

  useEffect(() => {
    saveState(STORAGE_KEY, { employees, rules, availability, weekStartISO, assignments, warnings });
  }, [employees, rules, availability, weekStartISO, assignments, warnings]);

  const employeeById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  function handleGenerate() {
    const result = generateSchedule({ weekStartISO, employees, availability, rules });
    setAssignments(result.assignments);
    setWarnings(result.warnings);
    setTab("schedule");
  }

  async function handleExcelUpload(file?: File) {
    if (!file) return;
    const result = await importExcelTemplate(file);
    setNotices(result.notices);
    const importedNames = new Set(result.rows.map((r) => r.name).filter(Boolean));
    const nextEmployees = [...employees];
    importedNames.forEach((name) => {
      if (!nextEmployees.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
        nextEmployees.push({ id: makeId(name), name, type: rules.fulltimeNames.includes(name) ? "fulltime" : "parttime", positions: ["Bán hàng"], skill: 3, desiredHoursPerWeek: 28 });
      }
    });
    setEmployees(nextEmployees);
  }

  async function handleImageUpload(file?: File) {
    if (!file) return;
    setOcrLoading(true);
    try {
      const text = await recognizeImage(file);
      setRawText(text);
      const parsed = parseAvailabilityText(text, "ocr");
      setAvailability((prev) => [...prev, ...parsed]);
      setNotices([`OCR đọc được ${parsed.length} dòng lịch. Anh cần kiểm tra lại vì ảnh Zalo/bảng học có thể bị sai ký tự.`]);
    } catch (error) {
      setNotices([`Không OCR được ảnh: ${error instanceof Error ? error.message : "lỗi không xác định"}`]);
    } finally {
      setOcrLoading(false);
    }
  }

  function handlePasteParse() {
    const parsed = parseAvailabilityText(rawText, "paste");
    setAvailability((prev) => [...prev, ...parsed]);
    setNotices([`Đã tách ${parsed.length} dòng lịch từ nội dung copy/dán. Hãy kiểm tra tên nhân viên và thứ trước khi tạo lịch.`]);
  }

  function updateEmployee(id: string, patch: Partial<Employee>) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function updateAssignment(id: string, patch: Partial<Assignment>) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function updateNeed(day: Weekday, shift: ShiftKey, position: Position, value: number) {
    setRules((prev) => ({
      ...prev,
      staffNeed: {
        ...prev.staffNeed,
        [day]: {
          ...prev.staffNeed[day],
          [shift]: {
            ...prev.staffNeed[day][shift],
            [position]: Math.max(0, value)
          }
        }
      }
    }));
  }

  function addEmployee() {
    if (!newEmployee.name.trim()) return;
    const id = makeId(newEmployee.name);
    setEmployees((prev) => [...prev, { ...newEmployee, id }]);
    setNewEmployee({ id: "", name: "", type: "parttime", positions: ["Bán hàng"], skill: 3, desiredHoursPerWeek: 28 });
  }

  async function copyZalo() {
    await navigator.clipboard.writeText(scheduleToZaloText(assignments, employees));
    setNotices(["Đã copy lịch dạng tin nhắn để gửi Zalo."]);
  }

  async function exportExcel() {
    await exportScheduleToExcel({ assignments, employees, rules, weekStartISO, warnings });
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    setEmployees(seedEmployees);
    setRules(seedRules);
    setAvailability([]);
    setAssignments([]);
    setWarnings([]);
    setNotices(["Đã khôi phục dữ liệu mẫu ban đầu."]);
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl bg-gradient-to-r from-brand-900 to-brand-600 p-6 text-white shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-orange-100">CƠM TẤM LÀNG</p>
              <h1 className="mt-1 text-2xl font-black md:text-4xl">Web app sắp lịch làm việc tự động</h1>
              <p className="mt-2 max-w-3xl text-sm text-orange-50">Đọc file Excel mẫu, nhận lịch học/lịch bận từ Zalo, sắp ca theo 5 vị trí chuẩn, cảnh báo thiếu người và xuất lịch giống format vận hành của quán.</p>
            </div>
            <div className="no-print flex gap-2">
              <Button variant="secondary" onClick={resetAll}><RotateCcw size={16} /> Reset</Button>
              <Button onClick={handleGenerate}><Sparkles size={16} /> Tạo lịch</Button>
            </div>
          </div>
        </header>

        <nav className="no-print mb-5 flex flex-wrap gap-2 rounded-2xl border border-orange-100 bg-white p-2 shadow-sm">
          {tabs.map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === item.key ? "bg-brand-600 text-white" : "text-stone-700 hover:bg-orange-50"}`}>
              {item.label}
            </button>
          ))}
        </nav>

        {notices.length > 0 ? (
          <div className="no-print mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {notices.map((n, i) => <div key={i}>• {n}</div>)}
          </div>
        ) : null}

        {tab === "input" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Upload file Excel mẫu" subtitle="App đọc block 'LỊCH LÀM VIỆC - CƠM TẤM LÀNG', danh sách nhân viên và format giờ vào/ra.">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-8 text-center hover:bg-orange-100">
                <FileSpreadsheet className="mb-3 text-brand-700" size={36} />
                <span className="font-bold">Chọn file Excel lịch mẫu</span>
                <span className="mt-1 text-sm text-stone-600">.xlsx từ lịch làm việc hiện tại</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => handleExcelUpload(e.target.files?.[0])} />
              </label>
            </Card>

            <Card title="Upload ảnh Zalo/lịch học" subtitle="OCR chỉ dùng để đọc nháp. Trước khi tạo lịch, anh kiểm tra lại bảng đã tách ở dưới.">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 p-8 text-center hover:bg-orange-100">
                <ImageIcon className="mb-3 text-brand-700" size={36} />
                <span className="font-bold">Chọn ảnh chụp từ Zalo</span>
                <span className="mt-1 text-sm text-stone-600">Ảnh bảng lịch học, giờ vào một ô, giờ ra một ô</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
              </label>
              {ocrLoading ? <p className="mt-3 text-sm font-semibold text-brand-700">Đang OCR ảnh, vui lòng chờ trình duyệt xử lý...</p> : null}
            </Card>

            <Card title="Dán nội dung copy từ Zalo/Excel" subtitle="Cách này ổn định hơn OCR nếu anh copy được bảng hoặc tin nhắn văn bản.">
              <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Ví dụ: Huyền - Thứ 2: 18:00-22:00, Thứ 4 off..." className="h-56 w-full rounded-2xl border border-stone-200 p-3 text-sm outline-none focus:border-brand-500" />
              <div className="mt-3 flex gap-2">
                <Button onClick={handlePasteParse}><Upload size={16} /> Tách lịch đăng ký</Button>
                <Button variant="secondary" onClick={() => setRawText("")}>Xóa nội dung</Button>
              </div>
            </Card>

            <Card title="Bảng lịch đăng ký đã đọc" subtitle="Dòng nào confidence thấp hoặc sai tên thì sửa/xóa trước khi tạo lịch.">
              <div className="max-h-80 overflow-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-stone-100 text-left">
                    <tr><th className="p-2">Tên</th><th>Thứ/ngày</th><th>Rảnh</th><th>Bận/off</th><th>Ghi chú</th><th>Nguồn</th><th></th></tr>
                  </thead>
                  <tbody>
                    {availability.map((a) => (
                      <tr key={a.id} className="border-t border-stone-100">
                        <td className="p-2"><input className="w-28 rounded border p-1" value={a.employeeName} onChange={(e) => setAvailability((prev) => prev.map((x) => x.id === a.id ? { ...x, employeeName: e.target.value } : x))} /></td>
                        <td><input className="w-24 rounded border p-1" value={a.weekday ?? a.date ?? ""} onChange={(e) => setAvailability((prev) => prev.map((x) => x.id === a.id ? { ...x, weekday: e.target.value as Weekday } : x))} /></td>
                        <td>{a.available.map((r) => `${r.start}-${r.end}`).join(", ") || "-"}</td>
                        <td>{a.unavailable.map((r) => `${r.start}-${r.end}`).join(", ") || "-"}</td>
                        <td className="max-w-[240px] truncate">{a.note}</td>
                        <td>{a.source} / {Math.round(a.confidence * 100)}%</td>
                        <td><button className="text-red-600" onClick={() => setAvailability((prev) => prev.filter((x) => x.id !== a.id))}>Xóa</button></td>
                      </tr>
                    ))}
                    {availability.length === 0 ? <tr><td colSpan={7} className="p-4 text-center text-stone-500">Chưa có lịch đăng ký.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === "employees" && (
          <div className="space-y-5">
            <Card title="Danh sách nhân viên" subtitle="Full-time được phép xoay ca: Linh, Nhân, Thắng, Tuấn, Danh. Còn lại là part-time.">
              <div className="overflow-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-stone-100 text-left"><tr><th className="p-2">Tên</th><th>Loại</th><th>Vị trí làm được</th><th>Kỹ năng</th><th>Giờ mong muốn/tuần</th><th>Ghi chú</th><th></th></tr></thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id} className="border-t border-stone-100 align-top">
                        <td className="p-2"><input className="w-28 rounded border p-1" value={employee.name} onChange={(e) => updateEmployee(employee.id, { name: e.target.value })} /></td>
                        <td><select className="rounded border p-1" value={employee.type} onChange={(e) => updateEmployee(employee.id, { type: e.target.value as Employee["type"] })}><option value="fulltime">Full-time</option><option value="parttime">Part-time</option></select></td>
                        <td className="grid grid-cols-2 gap-1 py-2">
                          {POSITIONS.map((p) => <label key={p} className="flex items-center gap-1"><input type="checkbox" checked={employee.positions.includes(p)} onChange={(e) => updateEmployee(employee.id, { positions: e.target.checked ? [...employee.positions, p] : employee.positions.filter((x) => x !== p) })} /> {p}</label>)}
                        </td>
                        <td><input type="number" min={1} max={5} className="w-16 rounded border p-1" value={employee.skill} onChange={(e) => updateEmployee(employee.id, { skill: Number(e.target.value) })} /></td>
                        <td><input type="number" className="w-20 rounded border p-1" value={employee.desiredHoursPerWeek ?? 0} onChange={(e) => updateEmployee(employee.id, { desiredHoursPerWeek: Number(e.target.value) })} /></td>
                        <td><input className="w-52 rounded border p-1" value={employee.notes ?? ""} onChange={(e) => updateEmployee(employee.id, { notes: e.target.value })} /></td>
                        <td><button className="text-red-600" onClick={() => setEmployees((prev) => prev.filter((x) => x.id !== employee.id))}>Xóa</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Thêm nhân viên nhanh">
              <div className="grid gap-3 md:grid-cols-6">
                <input className="rounded-xl border p-2 md:col-span-2" placeholder="Tên nhân viên" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} />
                <select className="rounded-xl border p-2" value={newEmployee.type} onChange={(e) => setNewEmployee({ ...newEmployee, type: e.target.value as Employee["type"] })}><option value="parttime">Part-time</option><option value="fulltime">Full-time</option></select>
                <select className="rounded-xl border p-2" value={newEmployee.positions[0]} onChange={(e) => setNewEmployee({ ...newEmployee, positions: [e.target.value as Position] })}>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select>
                <input type="number" className="rounded-xl border p-2" value={newEmployee.desiredHoursPerWeek ?? 28} onChange={(e) => setNewEmployee({ ...newEmployee, desiredHoursPerWeek: Number(e.target.value) })} />
                <Button onClick={addEmployee}><Save size={16} /> Thêm</Button>
              </div>
            </Card>
          </div>
        )}

        {tab === "rules" && (
          <div className="space-y-5">
            <Card title="Quy tắc nền" subtitle="Đã chốt theo yêu cầu: ca sáng 5:30–14:30, tối đa 12 tiếng/ngày và 70 tiếng/tuần.">
              <div className="grid gap-3 md:grid-cols-4">
                <label className="text-sm font-semibold">Ca sáng vào<input className="mt-1 w-full rounded-xl border p-2" value={rules.morning.start} onChange={(e) => setRules({ ...rules, morning: { ...rules.morning, start: e.target.value } })} /></label>
                <label className="text-sm font-semibold">Ca sáng ra<input className="mt-1 w-full rounded-xl border p-2" value={rules.morning.end} onChange={(e) => setRules({ ...rules, morning: { ...rules.morning, end: e.target.value } })} /></label>
                <label className="text-sm font-semibold">Ca chiều vào<input className="mt-1 w-full rounded-xl border p-2" value={rules.afternoon.start} onChange={(e) => setRules({ ...rules, afternoon: { ...rules.afternoon, start: e.target.value } })} /></label>
                <label className="text-sm font-semibold">Ca chiều ra<input className="mt-1 w-full rounded-xl border p-2" value={rules.afternoon.end} onChange={(e) => setRules({ ...rules, afternoon: { ...rules.afternoon, end: e.target.value } })} /></label>
                <label className="text-sm font-semibold">Tối đa giờ/ngày<input type="number" className="mt-1 w-full rounded-xl border p-2" value={rules.maxHoursPerDay} onChange={(e) => setRules({ ...rules, maxHoursPerDay: Number(e.target.value) })} /></label>
                <label className="text-sm font-semibold">Tối đa giờ/tuần<input type="number" className="mt-1 w-full rounded-xl border p-2" value={rules.maxHoursPerWeek} onChange={(e) => setRules({ ...rules, maxHoursPerWeek: Number(e.target.value) })} /></label>
              </div>
            </Card>

            <Card title="Định mức nhân sự theo thứ / ca / vị trí" subtitle="Mặc định lấy từ tổng hợp 2 tháng gần nhất. Anh chỉnh số ô này nếu tuần tới cần tăng/giảm người.">
              <div className="overflow-auto rounded-xl border border-stone-200">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-stone-100"><tr><th className="p-2 text-left">Thứ</th><th>Ca</th>{POSITIONS.map((p) => <th key={p}>{p}</th>)}</tr></thead>
                  <tbody>
                    {WEEKDAYS.flatMap((day) => (["morning", "afternoon"] as ShiftKey[]).map((shift) => (
                      <tr key={`${day}-${shift}`} className="border-t border-stone-100">
                        <td className="p-2 font-semibold">{day}</td>
                        <td>{shift === "morning" ? "Ca sáng" : "Ca chiều"}</td>
                        {POSITIONS.map((p) => <td key={p} className="p-1 text-center"><input type="number" min={0} className="w-16 rounded border p-1 text-center" value={rules.staffNeed[day][shift][p]} onChange={(e) => updateNeed(day, shift, p, Number(e.target.value))} /></td>)}
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === "schedule" && (
          <div className="space-y-5">
            <Card title="Tạo lịch tự động" subtitle="Ưu tiên đủ vị trí quan trọng trước, sau đó mới cân bằng giờ làm.">
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <label className="text-sm font-semibold">Ngày thứ 2 đầu tuần<input type="date" className="mt-1 rounded-xl border p-2" value={weekStartISO} onChange={(e) => setWeekStartISO(e.target.value)} /></label>
                <Button onClick={handleGenerate}><Sparkles size={16} /> Tạo lịch</Button>
                <Button variant="secondary" onClick={() => setTab("rules")}>Sửa định mức</Button>
              </div>
            </Card>

            {warnings.length > 0 ? (
              <Card title="Cảnh báo thiếu người" subtitle="Những dòng này cần anh bổ sung nhân sự, giảm định mức hoặc chỉnh tay lịch.">
                <div className="grid gap-2 md:grid-cols-2">
                  {warnings.map((warning, index) => <div key={index} className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={16} /> {warning}</div>)}
                </div>
              </Card>
            ) : null}

            <Card title="Lịch nháp có thể chỉnh tay" subtitle="Có thể đổi tên nhân viên, giờ vào, giờ ra ngay trên bảng trước khi xuất Excel.">
              <div className="overflow-auto rounded-xl border border-stone-200 print-page">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-stone-100 text-left"><tr><th className="p-2">Ngày</th><th>Ca</th><th>Vị trí</th><th>Nhân viên</th><th>Giờ vào</th><th>Giờ ra</th><th>Cảnh báo</th></tr></thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.id} className={`border-t border-stone-100 ${a.warning ? "bg-red-50" : ""}`}>
                        <td className="p-2 font-semibold">{a.weekday}<br /><span className="font-normal text-stone-500">{a.date}</span></td>
                        <td>{a.shift === "morning" ? "Ca sáng" : "Ca chiều"}</td>
                        <td>{a.position}</td>
                        <td><select className="w-44 rounded border p-1" value={a.employeeId} onChange={(e) => updateAssignment(a.id, { employeeId: e.target.value, warning: e.target.value ? undefined : "Thiếu người" })}><option value="">THIẾU NGƯỜI</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></td>
                        <td><input className="w-24 rounded border p-1" value={a.start} onChange={(e) => updateAssignment(a.id, { start: e.target.value })} /></td>
                        <td><input className="w-24 rounded border p-1" value={a.end} onChange={(e) => updateAssignment(a.id, { end: e.target.value })} /></td>
                        <td className="text-red-700">{a.warning || (employeeById[a.employeeId]?.type === "parttime" ? "PT" : "")}</td>
                      </tr>
                    ))}
                    {assignments.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-stone-500">Chưa tạo lịch. Bấm “Tạo lịch”.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === "export" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Xuất lịch" subtitle="Xuất Excel dạng 'LỊCH LÀM VIỆC - CƠM TẤM LÀNG', in A4 hoặc copy gửi Zalo.">
              <div className="flex flex-wrap gap-3">
                <Button onClick={exportExcel}><Download size={16} /> Xuất Excel</Button>
                <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> In A4</Button>
                <Button variant="secondary" onClick={copyZalo}><CalendarDays size={16} /> Copy gửi Zalo</Button>
              </div>
              <p className="mt-4 text-sm text-stone-600">Bản xuất Excel hiện ưu tiên đúng dữ liệu và bố cục giờ vào/giờ ra. Nếu cần giống màu sắc/merge cell 100% như file gốc, nâng cấp tiếp bằng API server dùng ExcelJS template.</p>
            </Card>

            <Card title="Tóm tắt tình trạng lịch">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-orange-50 p-4"><div className="text-stone-500">Nhân viên</div><div className="text-2xl font-black">{employees.length}</div></div>
                <div className="rounded-2xl bg-orange-50 p-4"><div className="text-stone-500">Lịch đăng ký</div><div className="text-2xl font-black">{availability.length}</div></div>
                <div className="rounded-2xl bg-orange-50 p-4"><div className="text-stone-500">Dòng lịch</div><div className="text-2xl font-black">{assignments.length}</div></div>
                <div className="rounded-2xl bg-red-50 p-4"><div className="text-stone-500">Cảnh báo</div><div className="text-2xl font-black text-red-700">{warnings.length}</div></div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
