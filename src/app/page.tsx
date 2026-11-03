"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DailyPlanPanel from "@/components/daily-plan-panel";
import WorkspaceControls from "@/components/workspace-controls";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FolderKanban,
  Inbox,
  LogOut,
  Plus,
  Search,
  X,
} from "lucide-react";
import TodoTable from "@/components/todos/todo-table";
import TodoDetailDrawer from "@/components/todos/todo-detail-drawer";
import TodoComposerModal from "@/components/todos/todo-composer-modal";
import NavItem from "@/components/nav-item";
import { EMPTY_FORM, PRIORITY_LABEL, STATUS_META } from "@/lib/todo-constants";
import { formatUpdatedAt, memberInitial, memberLabel } from "@/lib/todo-utils";
import type { Todo, TodoDetail, TodoForm, TodoStatus, Project, WorkspaceMember } from "@/types/todo";


export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TodoStatus>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [form, setForm] = useState<TodoForm>(EMPTY_FORM);
  const [detail, setDetail] = useState<TodoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [progressSaving, setProgressSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [editingAssigneesTodoId, setEditingAssigneesTodoId] = useState<string | null>(null);
  const [assigneeDraftIds, setAssigneeDraftIds] = useState<string[]>([]);
  const [assigneeSavingTodoId, setAssigneeSavingTodoId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [todoResponse, projectResponse, meResponse, membersResponse] = await Promise.all([
        fetch("/api/todos", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/workspaces/members", { cache: "no-store" }),
      ]);
      if (todoResponse.status === 401 || projectResponse.status === 401 || meResponse.status === 401) {
        window.location.assign("/login");
        return;
      }
      const [todoJson, projectJson, meJson, membersJson] = await Promise.all([
        todoResponse.json(),
        projectResponse.json(),
        meResponse.json(),
        membersResponse.json(),
      ]);
      if (!todoResponse.ok) throw new Error(todoJson.error ?? "读取待办失败");
      if (!projectResponse.ok) throw new Error(projectJson.error ?? "读取项目失败");
      if (!meResponse.ok) throw new Error(meJson.error ?? "读取用户信息失败");
      if (!membersResponse.ok) throw new Error(membersJson.error ?? "读取工作空间成员失败");
      setReadOnly(meJson.data.role === "VIEWER");
      setTodos(todoJson.data);
      setProjects(projectJson.data);
      setMembers(membersJson.data.members);
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
      const matchesAssignee = assigneeFilter === "ALL" || (assigneeFilter === "UNASSIGNED" ? todo.assignees.length === 0 : todo.assignees.some((item) => item.user.id === assigneeFilter));
      const matchesKeyword =
        !normalizedKeyword ||
        todo.title.toLowerCase().includes(normalizedKeyword) ||
        (todo.currentProgressTitle ?? "").toLowerCase().includes(normalizedKeyword) ||
        (todo.currentProgressNote ?? "").toLowerCase().includes(normalizedKeyword) ||
        (todo.project?.name ?? "").toLowerCase().includes(normalizedKeyword);
      return matchesStatus && matchesAssignee && matchesKeyword;
    });
  }, [todos, keyword, statusFilter, assigneeFilter]);

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

  async function handleLogout() {
    setLogoutLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "退出登录失败");
      window.location.assign("/login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "退出登录失败");
      setLogoutLoading(false);
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
      assigneeIds: todo.assignees.map((item) => item.user.id),
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
            assigneeIds: form.assigneeIds,
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

  function startAssigneeEdit(todo: Todo) {
    if (readOnly) return;
    setEditingAssigneesTodoId(todo.id);
    setAssigneeDraftIds(todo.assignees.map((item) => item.user.id));
    setError("");
  }

  async function saveAssignees(todo: Todo) {
    setAssigneeSavingTodoId(todo.id);
    setError("");
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds: assigneeDraftIds }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "负责人更新失败");
      setTodos((current) => current.map((item) => item.id === todo.id ? result.data : item));
      setEditingAssigneesTodoId(null);
      setAssigneeDraftIds([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "负责人更新失败");
    } finally {
      setAssigneeSavingTodoId(null);
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

        </div>

        <WorkspaceControls />
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
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={logoutLoading}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <LogOut size={14} />
              {logoutLoading ? "退出中..." : "退出登录"}
            </button>
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
              disabled={readOnly}
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

          <DailyPlanPanel todos={todos} readOnly={readOnly} />

          <TodoTable
            todos={todos}
            visibleTodos={visibleTodos}
            members={members}
            loading={loading}
            readOnly={readOnly}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            assigneeFilter={assigneeFilter}
            onAssigneeFilterChange={setAssigneeFilter}
            onRefresh={() => void loadData()}
            onOpenDetails={(todo) => void openDetails(todo)}
            onOpenEdit={openEdit}
            onDelete={(todo) => void deleteTodo(todo)}
            onChangeStatus={(todo, status) => void changeStatus(todo, status)}
            editingAssigneesTodoId={editingAssigneesTodoId}
            assigneeDraftIds={assigneeDraftIds}
            onAssigneeDraftChange={setAssigneeDraftIds}
            assigneeSavingTodoId={assigneeSavingTodoId}
            onStartAssigneeEdit={startAssigneeEdit}
            onSaveAssignees={(todo) => void saveAssignees(todo)}
            onCancelAssigneeEdit={() => { setEditingAssigneesTodoId(null); setAssigneeDraftIds([]); }}
          />
        </div>
      </section>

      <TodoDetailDrawer
        loading={detailLoading}
        detail={detail}
        readOnly={readOnly}
        progressTitle={progressTitle}
        progressNote={progressNote}
        progressSaving={progressSaving}
        onClose={() => setDetail(null)}
        onProgressTitleChange={setProgressTitle}
        onProgressNoteChange={setProgressNote}
        onSubmitProgress={submitProgress}
      />

      <TodoComposerModal
        open={composerOpen}
        editingTodo={editingTodo}
        form={form}
        setForm={setForm}
        projects={projects}
        members={members}
        readOnly={readOnly}
        saving={saving}
        onSubmit={saveTodo}
        onClose={() => setComposerOpen(false)}
      />
    </main>
  );
}
