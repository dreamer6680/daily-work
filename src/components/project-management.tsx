"use client";

import { FormEvent, useMemo, useState } from "react";
import { Archive, FolderKanban, Pencil, Plus, Save, X } from "lucide-react";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  color: string | null;
  status?: "IN_PROGRESS" | "PAUSED" | "DONE";
  taskCount?: number;
  completedCount?: number;
  createdAt?: string;
};
type Todo = {
  id: string;
  title: string;
  status: string;
  priority: string;
  project: { id: string; name: string; color: string | null } | null;
  assignees: { user: { id: string; name: string | null; email: string | null } }[];
};

const STATUS_LABEL: Record<Project["status"], string> = {
  IN_PROGRESS: "进行中",
  PAUSED: "已暂停",
  DONE: "已完成",
};
const COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#e11d48", "#64748b"];

export default function ProjectManagement({
  projects,
  todos,
  readOnly,
  onChanged,
  onOpenTasks,
}: {
  projects: Project[];
  todos: Todo[];
  readOnly: boolean;
  onChanged: () => void;
  onOpenTasks: (projectId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [status, setStatus] = useState<Project["status"]>("IN_PROGRESS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = projects.find((project) => project.id === selectedId) ?? null;
  const selectedTodos = useMemo(() => todos.filter((todo) => todo.project?.id === selectedId), [todos, selectedId]);

  function startCreate() {
    setEditingId(null); setName(""); setDescription(""); setColor(COLORS[0]); setStatus("IN_PROGRESS");
    setError(""); setFormOpen(true);
  }

  function startEdit(project: Project) {
    setEditingId(project.id); setName(project.name); setDescription(project.description ?? "");
    setColor(project.color ?? COLORS[0]); setStatus(project.status); setError(""); setFormOpen(true);
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(editingId ? `/api/projects/${editingId}` : "/api/projects", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color, ...(editingId ? { status } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存项目失败");
      setFormOpen(false);
      setSelectedId(result.data.id);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存项目失败");
    } finally { setSaving(false); }
  }

  async function archiveProject(project: Project) {
    if (!window.confirm(`确定归档项目「${project.name}」吗？项目任务和历史记录会保留。`)) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "归档项目失败");
      setSelectedId(null);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "归档项目失败");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">项目管理</h1>
          <p className="mt-1 text-sm text-slate-500">按项目组织任务，集中查看工作进度和项目基本信息。</p>
        </div>
        {!readOnly && <button type="button" onClick={startCreate} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700"><Plus size={16} />新建项目</button>}
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      {formOpen && (
        <form onSubmit={saveProject} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{editingId ? "编辑项目" : "创建项目"}</h2>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded p-1 text-slate-400 hover:bg-white"><X size={16} /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">项目名称
              <input required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：每日待办系统" className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400" />
            </label>
            <label className="text-xs font-medium text-slate-600">项目状态
              <select value={status} onChange={(event) => setStatus(event.target.value as Project["status"])} disabled={!editingId} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100">
                <option value="IN_PROGRESS">进行中</option><option value="PAUSED">已暂停</option><option value="DONE">已完成</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600 md:col-span-2">项目描述
              <textarea rows={2} maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="项目目标、范围或补充说明" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </label>
            <div className="md:col-span-2">
              <div className="mb-2 text-xs font-medium text-slate-600">项目颜色</div>
              <div className="flex items-center gap-2">{COLORS.map((value) => <button key={value} type="button" aria-label={`选择颜色 ${value}`} onClick={() => setColor(value)} className={`h-6 w-6 rounded-full border-2 ${color === value ? "border-slate-800 ring-2 ring-white" : "border-white"}`} style={{ backgroundColor: value }} />)}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600">取消</button>
            <button disabled={saving || !name.trim()} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white disabled:opacity-50"><Save size={14} />{saving ? "保存中..." : "保存项目"}</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const projectTodos = todos.filter((todo) => todo.project?.id === project.id);
            const done = projectTodos.filter((todo) => todo.status === "DONE").length;
            const progress = projectTodos.length ? Math.round(done / projectTodos.length * 100) : 0;
            return (
              <button key={project.id} type="button" onClick={() => { setSelectedId(project.id); setFormOpen(false); }}
                className={`rounded-xl border p-4 text-left transition hover:border-blue-300 hover:shadow-sm ${selectedId === project.id ? "border-blue-400 bg-blue-50/40" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: project.color ?? "#64748b" }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-800">{project.name}</span><span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{STATUS_LABEL[project.status ?? "IN_PROGRESS"]}</span></div>
                    <p className="mt-1 min-h-10 line-clamp-2 text-xs leading-5 text-slate-500">{project.description || "暂无项目描述"}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{projectTodos.length} 个任务</span><span>{done} 个已完成</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} /></div>
                  </div>
                </div>
              </button>
            );
          })}
          {projects.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center sm:col-span-2"><FolderKanban className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-medium text-slate-600">还没有项目</p><p className="mt-1 text-xs text-slate-400">创建项目后，可以将待办任务归入对应项目。</p></div>}
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white">
          {selected ? (
            <>
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-start gap-2"><span className="mt-1 h-8 w-1 rounded-full" style={{ backgroundColor: selected.color ?? "#64748b" }} /><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-800">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">{selected.description || "暂无描述"}</p></div></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onOpenTasks(selected.id)} className="h-8 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700">查看项目任务</button>
                  {!readOnly && <button type="button" onClick={() => startEdit(selected)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs text-slate-600 hover:bg-slate-50"><Pencil size={12} />编辑</button>}
                  {!readOnly && <button type="button" disabled={saving} onClick={() => void archiveProject(selected)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs text-slate-500 hover:border-rose-200 hover:text-rose-600"><Archive size={12} />归档</button>}
                </div>
              </div>
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-semibold text-slate-600">项目任务</h3><span className="text-xs text-slate-400">{selectedTodos.length} 项</span></div>
                <div className="space-y-2">
                  {selectedTodos.slice(0, 8).map((todo) => <div key={todo.id} className="rounded-lg bg-slate-50 px-3 py-2"><div className="text-sm text-slate-700">{todo.title}</div><div className="mt-1 flex items-center justify-between text-[11px] text-slate-400"><span>{todo.status === "DONE" ? "已完成" : todo.status === "IN_PROGRESS" ? "进行中" : todo.status === "PAUSED" ? "已暂停" : "待办"}</span><span>{todo.assignees.map((item) => item.user.name || item.user.email).filter(Boolean).join("、") || "未分配"}</span></div></div>)}
                  {selectedTodos.length === 0 && <p className="py-6 text-center text-xs text-slate-400">该项目还没有关联任务</p>}
                  {selectedTodos.length > 8 && <p className="pt-1 text-center text-xs text-slate-400">还有 {selectedTodos.length - 8} 项任务</p>}
                </div>
              </div>
            </>
          ) : <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><FolderKanban size={26} className="text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">选择一个项目</p><p className="mt-1 text-xs text-slate-400">查看项目说明、进度和关联任务</p></div>}
        </aside>
      </div>
    </div>
  );
}
