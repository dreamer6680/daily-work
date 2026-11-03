"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";

type TodoOption = { id: string; title: string; status: string; project: { name: string } | null };
type DailyPlan = {
  id: string; todoId: string; planDate: string; planNote: string | null; actualNote: string | null;
  plannedMinutes: number | null; actualMinutes: number | null; todo: TodoOption;
};
type PlanForm = { todoId: string; planNote: string; actualNote: string; plannedMinutes: string; actualMinutes: string };
const EMPTY: PlanForm = { todoId: "", planNote: "", actualNote: "", plannedMinutes: "", actualMinutes: "" };

function localDateString() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function minutesLabel(value: number | null) {
  if (value === null) return "未记录";
  if (value < 60) return value + " 分钟";
  return Math.floor(value / 60) + " 小时" + (value % 60 ? " " + value % 60 + " 分钟" : "");
}

export default function DailyPlanPanel({ todos, readOnly = false }: { todos: TodoOption[]; readOnly?: boolean }) {
  const [date, setDate] = useState(localDateString);
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY);
  const plannedIds = useMemo(() => new Set(plans.map((item) => item.todoId)), [plans]);
  const available = todos.filter((todo) => !plannedIds.has(todo.id) || todo.id === editing?.todoId);
  const plannedTotal = plans.reduce((sum, item) => sum + (item.plannedMinutes ?? 0), 0);
  const actualTotal = plans.reduce((sum, item) => sum + (item.actualMinutes ?? 0), 0);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/daily-plans?date=" + date, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "读取每日计划失败");
      setPlans(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取每日计划失败");
    } finally { setLoading(false); }
  }, [date]);
  useEffect(() => { void load(); }, [load]);

  function createPlan() {
    setEditing(null); setForm({ ...EMPTY, todoId: available[0]?.id ?? "" }); setOpen(true); setError("");
  }
  function editPlan(item: DailyPlan) {
    setEditing(item);
    setForm({
      todoId: item.todoId, planNote: item.planNote ?? "", actualNote: item.actualNote ?? "",
      plannedMinutes: item.plannedMinutes?.toString() ?? "", actualMinutes: item.actualMinutes?.toString() ?? ""
    });
    setOpen(true); setError("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.todoId) { setError("请选择关联任务"); return; }
    const planned = form.plannedMinutes.trim() ? Number(form.plannedMinutes) : null;
    const actual = form.actualMinutes.trim() ? Number(form.actualMinutes) : null;
    if ([planned, actual].some((value) => value !== null && (!Number.isInteger(value) || value < 0 || value > 1440))) {
      setError("耗时必须是 0–1440 的整数分钟"); return;
    }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/daily-plans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ todoId: form.todoId, planDate: date, planNote: form.planNote, actualNote: form.actualNote, plannedMinutes: planned, actualMinutes: actual })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "保存每日计划失败");
      setOpen(false); setEditing(null); setForm(EMPTY); await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存每日计划失败");
    } finally { setSaving(false); }
  }
  async function remove(item: DailyPlan) {
    if (!window.confirm("从当天计划中移除「" + item.todo.title + "」？任务本身不会删除。")) return;
    try {
      const response = await fetch("/api/daily-plans/" + item.id, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "移除计划失败");
      setPlans((current) => current.filter((plan) => plan.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "移除计划失败");
    }
  }

  return <section className="mb-6 rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div><h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16} />每日计划</h2>
        <p className="mt-1 text-xs text-slate-500">按日期安排持续任务，记录计划内容、实际进展和耗时</p></div>
      <div className="flex items-center gap-2">
        <input aria-label="计划日期" type="date" value={date} onChange={(event) => { setDate(event.target.value); setOpen(false); }} className="h-9 rounded-md border border-slate-200 px-2 text-sm" />
        <button onClick={createPlan} disabled={readOnly || !available.length} className="inline-flex h-9 items-center gap-1 rounded-md bg-blue-600 px-3 text-sm text-white hover:bg-blue-700 disabled:opacity-50"><Plus size={15} />添加任务</button>
      </div>
    </div>
    {error && <div className="mx-4 mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    <div className="grid grid-cols-3 gap-3 border-b border-slate-100 px-4 py-3">
      <div><div className="text-xs text-slate-500">计划任务</div><div className="mt-1 text-lg font-semibold">{plans.length}</div></div>
      <div><div className="text-xs text-slate-500">计划耗时</div><div className="mt-1 text-lg font-semibold">{minutesLabel(plannedTotal)}</div></div>
      <div><div className="text-xs text-slate-500">实际耗时</div><div className="mt-1 text-lg font-semibold">{minutesLabel(actualTotal)}</div></div>
    </div>
    {loading ? <div className="px-4 py-8 text-center text-sm text-slate-400">正在加载每日计划...</div> :
      plans.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-400">当天还没有安排任务。</div> :
      <div className="divide-y divide-slate-100">{plans.map((item) => <article key={item.id} className="px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="font-medium">{item.todo.title}</div><div className="mt-1 text-xs text-slate-400">{item.todo.project?.name ?? "未分配项目"} · {item.todo.status}</div></div>
          <div className="flex items-center gap-3 text-xs text-slate-500"><span><Clock3 size={13} className="mr-1 inline" />计划 {minutesLabel(item.plannedMinutes)}</span><span><Clock3 size={13} className="mr-1 inline" />实际 {minutesLabel(item.actualMinutes)}</span>
            <button onClick={() => editPlan(item)} disabled={readOnly} aria-label="编辑计划" className="rounded p-1 hover:bg-slate-100"><Pencil size={14} /></button>
            <button onClick={() => void remove(item)} disabled={readOnly} aria-label="移除计划" className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div>
        </div>
        {(item.planNote || item.actualNote) && <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {item.planNote && <div><div className="mb-1 text-xs font-medium text-slate-400">计划内容</div><p className="whitespace-pre-wrap text-slate-600">{item.planNote}</p></div>}
          {item.actualNote && <div><div className="mb-1 text-xs font-medium text-slate-400">实际进展 / 备注</div><p className="whitespace-pre-wrap text-slate-600">{item.actualNote}</p></div>}
        </div>}
      </article>)}</div>}
    {open && !readOnly && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 p-4">
      <form onSubmit={save} className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between"><div><h3 className="text-base font-semibold">{editing ? "编辑每日计划" : "添加每日计划"}</h3><p className="mt-1 text-xs text-slate-500">{date}</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="关闭" className="rounded p-1 text-slate-400"><X size={18} /></button></div>
        <div className="space-y-4">
          <label className="block text-sm"><span className="mb-1.5 block font-medium">关联任务</span>
            <select value={form.todoId} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, todoId: event.target.value })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 disabled:bg-slate-50">
              <option value="">请选择任务</option>{available.map((todo) => <option key={todo.id} value={todo.id}>{todo.title}</option>)}</select></label>
          <label className="block text-sm"><span className="mb-1.5 block font-medium">今日计划内容</span>
            <textarea rows={3} maxLength={10000} value={form.planNote} onChange={(event) => setForm({ ...form, planNote: event.target.value })} placeholder="今天准备完成什么、预期交付什么？" className="w-full rounded-md border border-slate-200 px-3 py-2" /></label>
          <label className="block text-sm"><span className="mb-1.5 block font-medium">实际进展 / 备注</span>
            <textarea rows={3} maxLength={10000} value={form.actualNote} onChange={(event) => setForm({ ...form, actualNote: event.target.value })} placeholder="实际完成情况、遇到的问题或未完成原因" className="w-full rounded-md border border-slate-200 px-3 py-2" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm"><span className="mb-1.5 block font-medium">计划耗时（分钟）</span><input type="number" min="0" max="1440" step="1" value={form.plannedMinutes} onChange={(event) => setForm({ ...form, plannedMinutes: event.target.value })} className="h-10 w-full rounded-md border border-slate-200 px-3" /></label>
            <label className="block text-sm"><span className="mb-1.5 block font-medium">实际耗时（分钟）</span><input type="number" min="0" max="1440" step="1" value={form.actualMinutes} onChange={(event) => setForm({ ...form, actualMinutes: event.target.value })} className="h-10 w-full rounded-md border border-slate-200 px-3" /></label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border border-slate-200 px-4 text-sm">取消</button>
          <button type="submit" disabled={saving} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? "保存中..." : "保存计划"}</button></div>
      </form>
    </div>}
  </section>;
}
