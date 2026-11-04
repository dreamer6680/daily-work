"use client";

import { Clock3, History, Pencil } from "lucide-react";
import { formatUpdatedAt, memberLabel } from "@/lib/member-utils";

type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "PAUSED" | "DONE" | "CANCELED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  currentProgressTitle: string | null;
  currentProgressNote: string | null;
  updatedAt: string;
  project: { id: string; name: string; color: string | null } | null;
  assignees: { user: { id: string; name: string | null; email: string | null } }[];
};
const STATUS: Record<Todo["status"], { label: string; tone: string }> = {
  TODO: { label: "待办", tone: "bg-slate-100 text-slate-600" },
  IN_PROGRESS: { label: "进行中", tone: "bg-blue-50 text-blue-700" },
  PAUSED: { label: "已暂停", tone: "bg-amber-50 text-amber-700" },
  DONE: { label: "已完成", tone: "bg-emerald-50 text-emerald-700" },
  CANCELED: { label: "已取消", tone: "bg-rose-50 text-rose-700" },
};
const PRIORITY: Record<Todo["priority"], string> = { LOW: "低", NORMAL: "普通", HIGH: "高", URGENT: "紧急" };

export default function TodoTimeline({ todos, loading, readOnly, onOpenDetails, onOpenEdit }: {
  todos: Todo[];
  loading: boolean;
  readOnly: boolean;
  onOpenDetails: (todo: Todo) => void;
  onOpenEdit: (todo: Todo) => void;
}) {
  if (loading) return <div className="rounded-lg border border-slate-200 px-4 py-16 text-center text-sm text-slate-400">正在加载任务...</div>;
  const sorted = [...todos].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime());
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 md:p-6">
      {sorted.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">暂无符合条件的任务</div> :
        <ol className="space-y-0">
          {sorted.map((todo,index)=><li key={todo.id} className="relative flex gap-3 pb-6 last:pb-0">
            <div className="flex w-5 shrink-0 flex-col items-center"><span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Clock3 size={11}/></span>{index!==sorted.length-1&&<span className="mt-1 w-px flex-1 bg-slate-200"/>}</div>
            <article className="min-w-0 flex-1 rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1"><button type="button" onClick={()=>onOpenDetails(todo)} className="text-left text-sm font-semibold text-slate-800 hover:text-blue-700">{todo.title}</button><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400"><time>{formatUpdatedAt(todo.updatedAt)}</time>{todo.project&&<span>{todo.project.name}</span>}</div></div>
                <div className="flex items-center gap-2"><span className={`rounded px-2 py-1 text-[11px] ${STATUS[todo.status].tone}`}>{STATUS[todo.status].label}</span>{!readOnly&&<button type="button" onClick={()=>onOpenEdit(todo)} title="编辑任务" className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-700"><Pencil size={14}/></button>}</div>
              </div>
              {todo.currentProgressTitle&&<p className="mt-2 text-sm text-slate-700">{todo.currentProgressTitle}</p>}
              {todo.currentProgressNote&&<p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-500">{todo.currentProgressNote}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400"><span>优先级：{PRIORITY[todo.priority]}</span>{todo.assignees.length>0&&<span>负责人：{todo.assignees.map(({user})=>memberLabel(user)).join("、")}</span>}</div>
              <button type="button" onClick={()=>onOpenDetails(todo)} className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"><History size={13}/>查看进展历史</button>
            </article>
          </li>)}
        </ol>}
    </div>
  );
}
