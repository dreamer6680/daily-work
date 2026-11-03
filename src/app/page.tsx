"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DailyPlanPanel from "@/components/daily-plan-panel";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FolderKanban,
  Inbox,
  History,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";

type TodoStatus = "TODO" | "IN_PROGRESS" | "PAUSED" | "DONE" | "CANCELED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type Project = { id: string; name: string; color: string | null };
type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: Priority;
  currentProgressTitle: string | null;
  currentProgressNote: string | null;
  updatedAt: string;
  project: Project | null;
};

type ProgressLog = {
  id: string;
  eventType: string;
  fromStatus: TodoStatus | null;
  toStatus: TodoStatus | null;
  progressTitle: string | null;
  progressNote: string | null;
  createdAt: string;
  author: { id: string; name: string | null; email: string | null };
};

type TodoDetail = Todo & { progressLogs: ProgressLog[] };

type TodoForm = {
  title: string;
  description: string;
  projectId: string;
  status: TodoStatus;
  priority: Priority;
  currentProgressTitle: string;
  currentProgressNote: string;
};

const EMPTY_FORM: TodoForm = {
  title: "",
  description: "",
  projectId: "",
  status: "TODO",
  priority: "NORMAL",
  currentProgressTitle: "",
  currentProgressNote: "",
};

const STATUS_META: Record<TodoStatus, { label: string; className: string }> = {
  TODO: { label: "待办", className: "bg-slate-100 text-slate-600" },
  IN_PROGRESS: { label: "进行中", className: "bg-blue-50 text-blue-700" },
  PAUSED: { label: "已暂停", className: "bg-amber-50 text-amber-700" },
  DONE: { label: "已完成", className: "bg-green-50 text-green-700" },
  CANCELED: { label: "已取消", className: "bg-rose-50 text-rose-700" },
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "低",
  NORMAL: "普通",
  HIGH: "高",
  URGENT: "紧急",
};

function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm ${
        active
          ? "bg-blue-50 font-medium text-blue-700"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon size={16} strokeWidth={1.8} />
      <span>{label}</span>
    </div>
  );
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TodoStatus>("ALL");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [form, setForm] = useState<TodoForm>(EMPTY_FORM);
  const [detail, setDetail] = useState<TodoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [progressSaving, setProgressSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [todoResponse, projectResponse] = await Promise.all([
        fetch("/api/todos", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
      ]);
      if (todoResponse.status === 401 || projectResponse.status === 401) {
        window.location.assign("/login");
        return;
      }
      const [todoJson, projectJson] = await Promise.all([
        todoResponse.json(),
        projectResponse.json(),
      ]);
      if (!todoResponse.ok) throw new Error(todoJson.error ?? "读取待办失败");
      if (!projectResponse.ok) throw new Error(projectJson.error ?? "读取项目失败");
      setTodos(todoJson.data);
      setProjects(projectJson.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleTodos = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return todos.filter((todo) => {
      const matchesStatus = statusFilter === "ALL" || todo.status === statusFilter;
      const matchesKeyword =
        !normalizedKeyword ||
        todo.title.toLowerCase().includes(normalizedKeyword) ||
        (todo.currentProgressTitle ?? "").toLowerCase().includes(normalizedKeyword) ||
        (todo.currentProgressNote ?? "").toLowerCase().includes(normalizedKeyword) ||
        (todo.project?.name ?? "").toLowerCase().includes(normalizedKeyword);
      return matchesStatus && matchesKeyword;
    });
  }, [todos, keyword, statusFilter]);

  const stats = useMemo(
    () => ({
      total: todos.length,
      inProgress: todos.filter((todo) => todo.status === "IN_PROGRESS").length,
      done: todos.filter((todo) => todo.status === "DONE").length,
      paused: todos.filter((todo) => todo.status === "PAUSED").length,
    }),
    [todos],
  );

  async function openDetails(todo: Todo) {
    setDetailLoading(true);
    setDetail(null);
    setProgressTitle("");
    setProgressNote("");
    setError("");
    try {
      const response = await fetch(`/api/todos/${todo.id}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "读取任务详情失败");
      setDetail(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取任务详情失败");
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || (!progressTitle.trim() && !progressNote.trim())) return;
    setProgressSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/todos/${detail.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressTitle, progressNote }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "保存进展失败");
      setDetail((current) => current ? {
        ...current,
        currentProgressTitle: result.data.todo.currentProgressTitle,
        currentProgressNote: result.data.todo.currentProgressNote,
        updatedAt: result.data.todo.updatedAt,
        progressLogs: [result.data.log, ...current.progressLogs],
      } : current);
      setTodos((current) => current.map((item) => item.id === detail.id ? {
        ...item,
        currentProgressTitle: result.data.todo.currentProgressTitle,
        currentProgressNote: result.data.todo.currentProgressNote,
        updatedAt: result.data.todo.updatedAt,
      } : item));
      setProgressTitle("");
      setProgressNote("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存进展失败");
    } finally {
      setProgressSaving(false);
    }
  }

  function openCreate() {
    setEditingTodo(null);
    setForm(EMPTY_FORM);
    setComposerOpen(true);
    setError("");
  }

  function openEdit(todo: Todo) {
    setEditingTodo(todo);
    setForm({
      title: todo.title,
      description: todo.description ?? "",
      projectId: todo.project?.id ?? "",
      status: todo.status,
      priority: todo.priority,
      currentProgressTitle: todo.currentProgressTitle ?? "",
      currentProgressNote: todo.currentProgressNote ?? "",
    });
    setComposerOpen(true);
    setError("");
  }

  async function saveTodo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("请填写任务名称");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        editingTodo ? `/api/todos/${editingTodo.id}` : "/api/todos",
        {
          method: editingTodo ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            title: form.title.trim(),
            projectId: form.projectId || null,
            description: form.description || null,
            currentProgressTitle: form.currentProgressTitle || null,
            currentProgressNote: form.currentProgressNote || null,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "保存失败");
      setComposerOpen(false);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(todo: Todo, status: TodoStatus) {
    setError("");
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "状态更新失败");
      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? result.data : item)),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "状态更新失败");
    }
  }

  async function deleteTodo(todo: Todo) {
    if (!window.confirm(`确定删除「${todo.title}」吗？删除后会从列表隐藏。`)) return;
    setError("");
    try {
      const response = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "删除失败");
      setTodos((current) => current.filter((item) => item.id !== todo.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "删除失败");
    }
  }

  return (
    <main className="flex min-h-screen bg-white text-slate-800">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-[#fafafa] p-3 md:block">
        <div className="mb-7 flex items-center gap-2 px-2 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            D
          </div>
          <div>
            <div className="text-sm font-semibold">Daily Work</div>
            <div className="text-xs text-slate-400">开发工作台</div>
          </div>
          <ChevronDown className="ml-auto text-slate-400" size={15} />
        </div>

        <div className="mb-2 px-3 text-xs font-medium text-slate-400">工作空间</div>
        <nav className="space-y-1">
          <NavItem icon={Inbox} label="全部任务" />
          <NavItem icon={CalendarDays} label="今日待办" active />
          <NavItem icon={Users} label="我负责的" />
          <NavItem icon={Clock3} label="最近更新" />
          <NavItem icon={AlertCircle} label="阻塞任务" />
        </nav>

        <div className="mb-2 mt-8 flex items-center justify-between px-3 text-xs font-medium text-slate-400">
          <span>项目</span>
          <Plus size={14} />
        </div>
        <nav className="space-y-1">
          {projects.map((project) => (
            <div key={project.id} className="flex h-9 items-center gap-2 rounded-md px-3 text-sm text-slate-600">
              <FolderKanban size={16} strokeWidth={1.8} />
              <span className="truncate">{project.name}</span>
            </div>
          ))}
        </nav>

        <div className="mb-2 mt-8 px-3 text-xs font-medium text-slate-400">管理</div>
        <nav className="space-y-1">
          <NavItem icon={CircleHelp} label="问题管理" />
          <NavItem icon={Settings2} label="工作空间设置" />
        </nav>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
          <div className="text-sm text-slate-500">
            工作空间 <span className="px-1">/</span>
            <span className="font-medium text-slate-800">今日待办</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索任务或进展"
                className="h-9 w-56 rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-medium">
              D
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">今日待办</h1>
              <p className="mt-1 text-sm text-slate-500">
                查看今天计划处理的任务和最新进展
              </p>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Plus size={16} />
              新建待办
            </button>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["全部任务", stats.total, CalendarDays],
              ["进行中", stats.inProgress, Clock3],
              ["已完成", stats.done, CheckCircle2],
              ["已暂停", stats.paused, AlertCircle],
            ].map(([label, value, Icon]) => {
              const CardIcon = Icon as typeof CalendarDays;
              return (
                <div key={label as string} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {label as string}
                    <CardIcon size={15} />
                  </div>
                  <div className="mt-2 text-2xl font-semibold">{value as number}</div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <DailyPlanPanel todos={todos} />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 border-b border-slate-200">
              <span className="border-b-2 border-blue-600 px-3 py-2 text-sm font-medium text-blue-700">
                <span className="mr-2">▦</span>表格视图
              </span>
              <span className="px-3 py-2 text-sm text-slate-400">看板视图</span>
              <span className="px-3 py-2 text-sm text-slate-400">时间线</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "ALL" | TodoStatus)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 outline-none"
              >
                <option value="ALL">全部状态</option>
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <option key={value} value={value}>{meta.label}</option>
                ))}
              </select>
              <button onClick={() => void loadData()} className="rounded-md border border-slate-200 px-3 py-2">
                刷新
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {["任务名称", "项目", "状态", "当前进展", "优先级", "更新时间", "操作"].map((head) => (
                    <th key={head} className="border-b border-r border-slate-200 px-3 py-3 font-medium last:border-r-0">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-3 py-12 text-center text-sm text-slate-400">正在加载待办...</td></tr>
                ) : visibleTodos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-sm text-slate-400">
                      {todos.length === 0 ? "还没有待办，点击右上角新建第一条任务。" : "没有符合条件的任务。"}
                    </td>
                  </tr>
                ) : (
                  visibleTodos.map((todo) => (
                    <tr key={todo.id} className="group hover:bg-slate-50">
                      <td className="border-b border-r border-slate-100 px-3 py-3 font-medium text-slate-800">
                        <button onClick={() => void openDetails(todo)} className="text-left hover:text-blue-700 hover:underline">{todo.title}</button>
                        {todo.description && <div className="mt-1 max-w-56 truncate text-xs font-normal text-slate-400">{todo.description}</div>}
                      </td>
                      <td className="border-b border-r border-slate-100 px-3 py-3 text-slate-500">
                        {todo.project?.name ?? "未分配"}
                      </td>
                      <td className="border-b border-r border-slate-100 px-3 py-3">
                        <select
                          value={todo.status}
                          onChange={(event) => void changeStatus(todo, event.target.value as TodoStatus)}
                          className={`rounded px-2 py-1 text-xs outline-none ${STATUS_META[todo.status].className}`}
                        >
                          {Object.entries(STATUS_META).map(([value, meta]) => (
                            <option key={value} value={value}>{meta.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="max-w-64 border-b border-r border-slate-100 px-3 py-3 text-slate-600">
                        <div className="max-w-64 truncate">{todo.currentProgressTitle || "暂无进展"}</div>
                        {todo.currentProgressNote && <div className="mt-1 max-w-64 truncate text-xs text-slate-400">{todo.currentProgressNote}</div>}
                      </td>
                      <td className="border-b border-r border-slate-100 px-3 py-3 text-slate-600">
                        {PRIORITY_LABEL[todo.priority]}
                      </td>
                      <td className="border-b border-r border-slate-100 px-3 py-3 text-slate-500">
                        {formatUpdatedAt(todo.updatedAt)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                          <button onClick={() => void openDetails(todo)} title="详情与进展" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">\n                            <History size={15} />\n                          </button>\n                          <button onClick={() => openEdit(todo)} title="编辑" className="rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => void deleteTodo(todo)} title="删除" className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={14} />
            数据来自 PostgreSQL；新建、编辑、状态变更和软删除均通过服务端 API 完成。
          </div>
        </div>
      </section>

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="rounded-lg bg-white px-6 py-5 text-sm text-slate-500 shadow-xl">正在加载任务详情...</div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <section className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <div className="text-xs text-slate-400">任务详情</div>
                <h2 className="mt-1 text-lg font-semibold">{detail.title}</h2>
              </div>
              <button onClick={() => setDetail(null)} className="rounded p-2 text-slate-400 hover:bg-slate-100" aria-label="关闭详情">
                <X size={18} />
              </button>
            </header>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 text-sm">
                <div>
                  <div className="text-xs text-slate-400">状态</div>
                  <div className="mt-1 font-medium">{STATUS_META[detail.status].label}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">优先级</div>
                  <div className="mt-1 font-medium">{PRIORITY_LABEL[detail.priority]}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">所属项目</div>
                  <div className="mt-1 font-medium">{detail.project?.name ?? "未分配"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">最后更新</div>
                  <div className="mt-1 font-medium">{formatUpdatedAt(detail.updatedAt)}</div>
                </div>
                {detail.description && (
                  <div className="col-span-2 border-t border-slate-100 pt-3">
                    <div className="text-xs text-slate-400">任务描述</div>
                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{detail.description}</p>
                  </div>
                )}
              </div>

              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <History size={16} /> 更新当前进展
                </h3>
                <form onSubmit={submitProgress} className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <input
                    value={progressTitle}
                    onChange={(event) => setProgressTitle(event.target.value)}
                    maxLength={200}
                    placeholder="进展标题，例如：本地网络问题导致卡顿"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
                  />
                  <textarea
                    value={progressNote}
                    onChange={(event) => setProgressNote(event.target.value)}
                    rows={3}
                    placeholder="记录本次进展、遇到的问题、原因和下一步处理方式"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={progressSaving || (!progressTitle.trim() && !progressNote.trim())}
                      className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {progressSaving ? "保存中..." : "记录本次进展"}
                    </button>
                  </div>
                </form>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Clock3 size={16} /> 进展历史
                  </h3>
                  <span className="text-xs text-slate-400">最近 {detail.progressLogs.length} 条</span>
                </div>
                {detail.progressLogs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                    暂无历史记录。更新一次进展后，会在这里留下记录。
                  </div>
                ) : (
                  <ol className="space-y-0">
                    {detail.progressLogs.map((log, index) => (
                      <li key={log.id} className="relative flex gap-3 pb-6 last:pb-0">
                        <div className="flex w-4 shrink-0 flex-col items-center">
                          <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                          {index !== detail.progressLogs.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-200" />}
                        </div>
                        <div className="min-w-0 flex-1 rounded-lg border border-slate-200 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {log.eventType === "CREATED" ? "创建任务" :
                               log.eventType === "COMPLETED" ? "完成任务" :
                               log.eventType === "REOPENED" ? "重新打开任务" :
                               log.eventType === "STATUS_CHANGED" ? "变更状态" :
                               log.eventType === "NOTE" ? "添加备注" : "更新进展"}
                            </span>
                            <time className="text-xs text-slate-400">{formatUpdatedAt(log.createdAt)}</time>
                          </div>
                          {log.progressTitle && <div className="mt-2 text-sm font-medium text-slate-700">{log.progressTitle}</div>}
                          {log.progressNote && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{log.progressNote}</p>}
                          {log.fromStatus !== log.toStatus && log.fromStatus && log.toStatus && (
                            <div className="mt-2 text-xs text-slate-500">
                              状态：{STATUS_META[log.fromStatus].label} → {STATUS_META[log.toStatus].label}
                            </div>
                          )}
                          <div className="mt-3 text-xs text-slate-400">
                            {log.author.name || log.author.email || "未知用户"}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          </section>
        </div>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <form onSubmit={saveTodo} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold">{editingTodo ? "编辑待办" : "新建待办"}</h2>
              <button type="button" onClick={() => setComposerOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">任务名称 <span className="text-rose-500">*</span></span>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  maxLength={200}
                  placeholder="例如：开发登录功能"
                  className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">任务描述</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="补充任务背景或验收要求"
                />
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">所属项目</span>
                  <select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm">
                    <option value="">未分配</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">状态</span>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TodoStatus })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm">
                    {Object.entries(STATUS_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">优先级</span>
                  <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm">
                    {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="mb-3 text-sm font-medium">当前进展</div>
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-xs text-slate-500">进展标题</span>
                  <input
                    value={form.currentProgressTitle}
                    onChange={(event) => setForm({ ...form, currentProgressTitle: event.target.value })}
                    maxLength={200}
                    placeholder="例如：本地网络问题导致卡顿"
                    className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs text-slate-500">进展说明</span>
                  <textarea
                    value={form.currentProgressNote}
                    onChange={(event) => setForm({ ...form, currentProgressNote: event.target.value })}
                    rows={3}
                    placeholder="记录目前做到哪里、遇到什么问题、下一步准备怎么处理"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setComposerOpen(false)} className="h-9 rounded-md border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50">
                取消
              </button>
              <button type="submit" disabled={saving} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
