"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Plus, RefreshCw, Send, ShieldAlert, X } from "lucide-react";

type Member = { id: string; name: string | null; email: string | null };
type Todo = { id: string; title: string; status: string };
type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type Status = "OPEN" | "INVESTIGATING" | "WAITING" | "RESOLVED" | "CLOSED";
type Event = {
  id: string;
  eventType: string;
  fromStatus: Status | null;
  toStatus: Status | null;
  content: string | null;
  createdAt: string;
  actor: Member;
};
type Blocker = {
  id: string;
  title: string;
  description: string | null;
  cause: string | null;
  impact: string | null;
  severity: Severity;
  status: Status;
  detectedAt: string;
  updatedAt: string;
  reportedBy: Member;
  owner: Member | null;
  todoLinks: { todo: Todo }[];
  events: Event[];
};

const SEVERITY: Record<Severity, { label: string; className: string }> = {
  LOW: { label: "低", className: "bg-slate-100 text-slate-600" },
  MEDIUM: { label: "中", className: "bg-blue-50 text-blue-700" },
  HIGH: { label: "高", className: "bg-amber-50 text-amber-700" },
  CRITICAL: { label: "紧急", className: "bg-rose-50 text-rose-700" },
};
const STATUS: Record<Status, { label: string; className: string }> = {
  OPEN: { label: "待处理", className: "bg-rose-50 text-rose-700" },
  INVESTIGATING: { label: "处理中", className: "bg-blue-50 text-blue-700" },
  WAITING: { label: "等待中", className: "bg-amber-50 text-amber-700" },
  RESOLVED: { label: "已解决", className: "bg-emerald-50 text-emerald-700" },
  CLOSED: { label: "已关闭", className: "bg-slate-100 text-slate-500" },
};
const labelOf = (person: Member | null) => person?.name?.trim() || person?.email || "未分配";
const dateOf = (value: string) => new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export default function BlockerManagement({ members, todos, readOnly }: { members: Member[]; todos: Todo[]; readOnly: boolean }) {
  const [items, setItems] = useState<Blocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Status>("ALL");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | Severity>("ALL");
  const [composerOpen, setComposerOpen] = useState(false);
  const [selected, setSelected] = useState<Blocker | null>(null);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", cause: "", impact: "", severity: "MEDIUM" as Severity, ownerId: "", todoIds: [] as string[] });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/blockers", { cache: "no-store" });
      if (response.status === 401) { window.location.assign("/login"); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "读取阻塞问题失败");
      setItems(result.data);
      setSelected((current) => current ? result.data.find((item: Blocker) => item.id === current.id) ?? null : null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取阻塞问题失败");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => items.filter((item) =>
    (statusFilter === "ALL" || item.status === statusFilter) &&
    (severityFilter === "ALL" || item.severity === severityFilter)
  ), [items, statusFilter, severityFilter]);

  const counts = useMemo(() => ({
    active: items.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status)).length,
    critical: items.filter((item) => item.severity === "CRITICAL" && !["RESOLVED", "CLOSED"].includes(item.status)).length,
    resolved: items.filter((item) => item.status === "RESOLVED").length,
  }), [items]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/blockers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), ownerId: form.ownerId || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "创建阻塞问题失败");
      setItems((current) => [result.data, ...current]);
      setSelected(result.data);
      setComposerOpen(false);
      setForm({ title: "", description: "", cause: "", impact: "", severity: "MEDIUM", ownerId: "", todoIds: [] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "创建阻塞问题失败"); }
    finally { setSaving(false); }
  }

  async function update(id: string, patch: Record<string, unknown>) {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/blockers/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "更新阻塞问题失败");
      setItems((current) => current.map((item) => item.id === id ? result.data : item));
      setSelected(result.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "更新阻塞问题失败"); }
    finally { setSaving(false); }
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    setCommentSaving(true); setError("");
    try {
      const response = await fetch(`/api/blockers/${selected.id}/events`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: comment.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "添加处理记录失败");
      setSelected((current) => current ? { ...current, events: [result.data, ...current.events] } : current);
      setItems((current) => current.map((item) => item.id === selected.id ? { ...item, events: [result.data, ...item.events] } : item));
      setComment("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "添加处理记录失败"); }
    finally { setCommentSaving(false); }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">阻塞问题</h1>
          <p className="mt-1 text-sm text-slate-500">集中跟踪风险、处理负责人、关联任务和解决过程</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50"><RefreshCw size={14} />刷新</button>
          <button type="button" disabled={readOnly} onClick={() => setComposerOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Plus size={15} />登记阻塞</button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-xs text-slate-500">未解决</div><div className="mt-2 text-2xl font-semibold">{counts.active}</div></div>
        <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4"><div className="text-xs text-rose-700">紧急阻塞</div><div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-rose-700"><ShieldAlert size={20}/>{counts.critical}</div></div>
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-xs text-slate-500">已解决</div><div className="mt-2 flex items-center gap-2 text-2xl font-semibold"><CheckCircle2 size={20} className="text-emerald-600"/>{counts.resolved}</div></div>
      </div>

      {error && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <select aria-label="按状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | Status)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">全部状态</option>{Object.entries(STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </select>
          <select aria-label="按严重程度筛选" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as "ALL" | Severity)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">全部级别</option>{Object.entries(SEVERITY).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </select>
        </div>
        <span className="text-xs text-slate-400">共 {visible.length} 条</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? <div className="px-4 py-16 text-center text-sm text-slate-400">正在加载阻塞问题...</div> :
          visible.length === 0 ? <div className="px-4 py-16 text-center"><AlertTriangle className="mx-auto mb-3 text-slate-300" size={24}/><div className="text-sm text-slate-500">当前没有符合条件的阻塞问题</div><div className="mt-1 text-xs text-slate-400">发现影响任务推进的问题时，可以在这里登记</div></div> :
          <div className="divide-y divide-slate-100">
            {visible.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium text-slate-800">{item.title}</span><span className={`rounded px-2 py-0.5 text-[11px] ${SEVERITY[item.severity].className}`}>{SEVERITY[item.severity].label}优先级</span><span className={`rounded px-2 py-0.5 text-[11px] ${STATUS[item.status].className}`}>{STATUS[item.status].label}</span></div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400"><span>提出人：{labelOf(item.reportedBy)}</span><span>负责人：{labelOf(item.owner)}</span><span>更新于 {dateOf(item.updatedAt)}</span></div>
                {item.todoLinks.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{item.todoLinks.map(({todo}) => <span key={todo.id} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600">{todo.title}</span>)}</div>}
              </div>
              <span className="text-xs text-slate-400">{item.events.length} 条记录</span>
            </button>)}
          </div>}
      </div>

      {composerOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4">
        <form onSubmit={create} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-base font-semibold">登记阻塞问题</h2><p className="mt-1 text-xs text-slate-400">记录问题背景、影响范围和处理责任人</p></div><button type="button" onClick={() => setComposerOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div>
          <div className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-medium">问题标题 *</span><input required maxLength={200} autoFocus value={form.title} onChange={(event) => setForm({...form,title:event.target.value})} placeholder="简要描述遇到的阻塞" className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"/></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium">问题描述</span><textarea rows={2} value={form.description} onChange={(event) => setForm({...form,description:event.target.value})} placeholder="补充现象、复现条件和上下文" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"/></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-sm font-medium">阻塞原因</span><textarea rows={2} value={form.cause} onChange={(event) => setForm({...form,cause:event.target.value})} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"/></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium">影响范围</span><textarea rows={2} value={form.impact} onChange={(event) => setForm({...form,impact:event.target.value})} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"/></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1.5 block text-sm font-medium">严重程度</span><select value={form.severity} onChange={(event) => setForm({...form,severity:event.target.value as Severity})} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{Object.entries(SEVERITY).map(([value,meta])=><option key={value} value={value}>{meta.label}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium">处理负责人</span><select value={form.ownerId} onChange={(event) => setForm({...form,ownerId:event.target.value})} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">暂未分配</option>{members.map((member)=><option key={member.id} value={member.id}>{labelOf(member)}</option>)}</select></label>
            </div>
            <div><div className="mb-2 text-sm font-medium">关联任务</div><div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">{todos.length ? todos.map((todo)=><label key={todo.id} className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.todoIds.includes(todo.id)} onChange={(event)=>setForm({...form,todoIds:event.target.checked?[...form.todoIds,todo.id]:form.todoIds.filter((id)=>id!==todo.id)})}/><span className="min-w-0 flex-1 truncate">{todo.title}</span><span className="text-xs text-slate-400">{todo.status}</span></label>) : <p className="text-xs text-slate-400">当前工作空间暂无任务</p>}</div></div>
          </div>
          <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setComposerOpen(false)} className="h-9 rounded-md border border-slate-200 px-4 text-sm text-slate-600">取消</button><button type="submit" disabled={saving} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50">{saving ? "保存中..." : "创建阻塞"}</button></div>
        </form>
      </div>}

      {selected && <div className="fixed inset-0 z-[65] flex justify-end bg-slate-900/40">
        <section className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div className="min-w-0"><div className="text-xs text-slate-400">阻塞详情</div><h2 className="mt-1 truncate text-lg font-semibold">{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} className="rounded p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></header>
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <div className="flex flex-wrap gap-2"><span className={`rounded px-2.5 py-1 text-xs ${SEVERITY[selected.severity].className}`}>{SEVERITY[selected.severity].label}优先级</span><span className={`rounded px-2.5 py-1 text-xs ${STATUS[selected.status].className}`}>{STATUS[selected.status].label}</span></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block text-xs text-slate-400">处理状态</span><select disabled={readOnly || saving} value={selected.status} onChange={(event)=>void update(selected.id,{status:event.target.value})} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{Object.entries(STATUS).map(([value,meta])=><option key={value} value={value}>{meta.label}</option>)}</select></label>
              <label className="block"><span className="mb-1 block text-xs text-slate-400">处理负责人</span><select disabled={readOnly || saving} value={selected.owner?.id ?? ""} onChange={(event)=>void update(selected.id,{ownerId:event.target.value || null})} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">暂未分配</option>{members.map((member)=><option key={member.id} value={member.id}>{labelOf(member)}</option>)}</select></label>
              <label className="block sm:col-span-2"><span className="mb-1 block text-xs text-slate-400">严重程度</span><select disabled={readOnly || saving} value={selected.severity} onChange={(event)=>void update(selected.id,{severity:event.target.value})} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm">{Object.entries(SEVERITY).map(([value,meta])=><option key={value} value={value}>{meta.label}</option>)}</select></label>
            </div>
            {selected.description && <section><h3 className="mb-1 text-sm font-semibold">问题描述</h3><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.description}</p></section>}
            {selected.cause && <section><h3 className="mb-1 text-sm font-semibold">阻塞原因</h3><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.cause}</p></section>}
            {selected.impact && <section><h3 className="mb-1 text-sm font-semibold">影响范围</h3><p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.impact}</p></section>}
            <section><h3 className="mb-2 text-sm font-semibold">关联任务</h3><div className="flex flex-wrap gap-2">{selected.todoLinks.length ? selected.todoLinks.map(({todo})=><span key={todo.id} className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600">{todo.title}</span>) : <span className="text-xs text-slate-400">未关联任务</span>}</div></section>
            <section><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock3 size={15}/>处理记录</h3>
              {!readOnly && <form onSubmit={addComment} className="mb-4 flex gap-2"><textarea rows={2} value={comment} onChange={(event)=>setComment(event.target.value)} placeholder="记录排查过程、沟通结论或下一步动作" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"/><button type="submit" disabled={commentSaving || !comment.trim()} className="self-end rounded-md bg-blue-600 p-2.5 text-white disabled:opacity-50"><Send size={15}/></button></form>}
              {selected.events.length ? <ol className="space-y-3">{selected.events.map((entry)=><li key={entry.id} className="border-l-2 border-slate-200 pl-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-slate-700">{entry.eventType==="CREATED"?"创建问题":entry.eventType==="COMMENT"?"处理记录":entry.eventType==="OWNER_CHANGED"?"变更负责人":entry.eventType==="RESOLVED"?"解决问题":entry.eventType==="REOPENED"?"重新打开":"变更状态"}</span><time className="text-[11px] text-slate-400">{dateOf(entry.createdAt)}</time></div>{entry.content && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.content}</p>}{entry.fromStatus && entry.toStatus && <p className="mt-1 text-xs text-slate-400">{STATUS[entry.fromStatus].label} → {STATUS[entry.toStatus].label}</p>}<p className="mt-1 text-[11px] text-slate-400">{labelOf(entry.actor)}</p></li>)}</ol> : <p className="text-xs text-slate-400">暂无处理记录</p>}
            </section>
          </div>
          <footer className="flex justify-between border-t border-slate-200 px-5 py-3"><span className="text-xs text-slate-400">提出人：{labelOf(selected.reportedBy)} · {dateOf(selected.detectedAt)}</span><button type="button" onClick={() => setSelected(null)} className="h-9 rounded-md border border-slate-200 px-4 text-sm text-slate-600">关闭</button></footer>
        </section>
      </div>}
    </div>
  );
}
