export type TodoStatus = "TODO" | "IN_PROGRESS" | "PAUSED" | "DONE" | "CANCELED";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type Project = { id: string; name: string; color: string | null };
export type WorkspaceMember = { id: string; name: string | null; email: string | null; role: string };
export type TodoAssignee = { user: { id: string; name: string | null; email: string | null } };
export type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: Priority;
  currentProgressTitle: string | null;
  currentProgressNote: string | null;
  updatedAt: string;
  project: Project | null;
  assignees: TodoAssignee[];
};
export type ProgressLog = {
  id: string;
  eventType: string;
  fromStatus: TodoStatus | null;
  toStatus: TodoStatus | null;
  progressTitle: string | null;
  progressNote: string | null;
  createdAt: string;
  author: { id: string; name: string | null; email: string | null };
};
export type TodoDetail = Todo & { progressLogs: ProgressLog[] };
export type TodoForm = {
  title: string;
  description: string;
  projectId: string;
  status: TodoStatus;
  priority: Priority;
  currentProgressTitle: string;
  currentProgressNote: string;
  assigneeIds: string[];
};