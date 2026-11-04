"use client";

import { Pencil } from "lucide-react";

type TodoStatus = "TODO" | "IN_PROGRESS" | "PAUSED" | "DONE" | "CANCELED";
type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  currentProgressTitle: string | null;
  currentProgressNote: string | null;
  updatedAt: string;
  project: { id: string; name: string; color: string | null } | null;
  assignees: { user: { id: string; name: string | null; email: string | null } }[];
};

const COLUMNS: { status: TodoStatus; label: string; tone: string }[] = [
  { status: "TODO", label: "待办", tone: "border-slate-300" },
  { status: "IN_PROGRESS", label: "进行中", tone: "border-blue-400" },
  { status: "PAUSED", label: "已暂停", tone: "border-amber-400" },
  { status: "DONE", label: "已完成", tone: "border-emerald-400" },
  { status: "CANCELED", label: "已取消", tone: "border-rose-300" },
];
const PRIORITY: Record<Todo["priority"], string> = { LOW: "低", NORMAL: "普通", HIGH: "高", URGENT: "紧急" };
const STATUS_TONE: Record<TodoStatus, string> = {
  TODO: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  PAUSED: "bg-amber-50 text-amber-700",
  DONE: "bg-emerald-50 text-emerald-700",
  CANCELED: "bg-rose-50 text-rose-700",
};
const personLabel = (person: { name: string | null; email: string | null }) => person.name?.trim() || person.email || "未知成员";

export default function TodoKanbanBoard({
  todos,
  loading,
  readOnly,
  onOpenDetails,
  onOpenEdit,
  onChangeStatus,
}: {
  todos: Todo[];
  loading: boolean;
  readOnly: boolean;
  onOpenDetails: (todo: Todo) => void;
  onOpenEdit: (todo: Todo) => void;
  onChangeStatus: (todo: Todo, status: TodoStatus) => void;
}) {
  if (loading) return <div className="rounded-lg border border-slate-200 px-4 py-16 text-center text-sm text-slate-400">正在加载任务...</div>;
  return (
    <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-2 xl:grid-cols-5">
      {COLUMNS.map((column) => {
        const items = todos.filter((todo) => todo.status === column.status);
        return (
          <section key={column.status} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70">
            <header className={`flex items-center justify-between border-t-2 ${column.tone} px-3 py-3`}>
              <h3 className="text-sm font-semibold text-slate-700">{column.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{items.length}</span>
            </header>
            <div className="space-y-2 px-2 pb-2">
              {items.map((todo) => (
                <article key={todo.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => onOpenDetails(todo)} className="min-w-0 text-left text-sm font-medium leading-5 text-slate-800 hover:text-blue-700">{todo.title}</button>
                    {!readOnly && <button type="button" onClick={() => onOpenEdit(todo)} title="编辑任务" className="shrink-0 rounded p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-700"><Pencil size={13}/></button>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${STATUS_TONE[todo.status]}`}>{column.label}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{PRIORITY[todo.priority]}优先级</span>
                  </div>
                  {todo.project && <div className="mt-2 truncate text-xs text-slate-400">{todo.project.name}</div>}
                  {todo.currentProgressTitle && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{todo.currentProgressTitle}</p>}
                  {todo.assignees.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{todo.assignees.slice(0,3).map(({user})=><span key={user.id} className="max-w-full truncate rounded-full bg-indigo-50 px-2 py-1 text-[10px] text-indigo-700">{personLabel(user)}</span>)}</div>}
                  <div className="mt-3 border-t border-slate-100 pt-2">
                    <select aria-label={`更新「${todo.title}」状态`} disabled={readOnly} value={todo.status} onChange={(event) => onChangeStatus(todo,event.target.value as TodoStatus)} className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 disabled:bg-slate-50">
                      {COLUMNS.map((option)=><option key={option.status} value={option.status}>{option.label}</option>)}
                    </select>
                  </div>
                </article>
              ))}
              {items.length === 0 && <div className="rounded-md border border-dashed border-slate-200 px-2 py-8 text-center text-xs text-slate-400">暂无任务</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
