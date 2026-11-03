import type { Priority, TodoForm, TodoStatus } from "@/types/todo";

export const EMPTY_FORM: TodoForm = {
  title: "",
  description: "",
  projectId: "",
  status: "TODO",
  priority: "NORMAL",
  currentProgressTitle: "",
  currentProgressNote: "",
  assigneeIds: [],
};

export const STATUS_META: Record<TodoStatus, { label: string; className: string }> = {
  TODO: { label: "待办", className: "bg-slate-100 text-slate-600" },
  IN_PROGRESS: { label: "进行中", className: "bg-blue-50 text-blue-700" },
  PAUSED: { label: "已暂停", className: "bg-amber-50 text-amber-700" },
  DONE: { label: "已完成", className: "bg-green-50 text-green-700" },
  CANCELED: { label: "已取消", className: "bg-rose-50 text-rose-700" },
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "低",
  NORMAL: "普通",
  HIGH: "高",
  URGENT: "紧急",
};