"use client";

import type { Dispatch, SetStateAction } from "react";
import { History, Pencil, Trash2, UserRound } from "lucide-react";
import AssigneeMentionPicker from "@/components/assignee-mention-picker";
import { formatUpdatedAt, memberInitial, memberLabel } from "@/lib/member-utils";

type TodoStatus = "TODO" | "IN_PROGRESS" | "PAUSED" | "DONE" | "CANCELED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type Member = { id: string; name: string | null; email: string | null; role: string };
type Todo = {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: Priority;
  currentProgressTitle: string | null;
  currentProgressNote: string | null;
  updatedAt: string;
  project: { id: string; name: string; color: string | null } | null;
  assignees: { user: { id: string; name: string | null; email: string | null } }[];
};

const STATUS_META: Record<TodoStatus, { label: string; className: string }> = {
  TODO: { label: "待办", className: "bg-slate-100 text-slate-600" },
  IN_PROGRESS: { label: "进行中", className: "bg-blue-50 text-blue-700" },
  PAUSED: { label: "已暂停", className: "bg-amber-50 text-amber-700" },
  DONE: { label: "已完成", className: "bg-green-50 text-green-700" },
  CANCELED: { label: "已取消", className: "bg-rose-50 text-rose-700" },
};
const PRIORITY_LABEL: Record<Priority, string> = { LOW: "低", NORMAL: "普通", HIGH: "高", URGENT: "紧急" };

export default function TodoTable({
  loading,
  todos,
  visibleTodos,
  members,
  readOnly,
  editingAssigneesTodoId,
  assigneeDraftIds,
  setAssigneeDraftIds,
  assigneeSavingTodoId,
  onStartAssigneeEdit,
  onCancelAssigneeEdit,
  onSaveAssignees,
  onChangeStatus,
  onOpenDetails,
  onOpenEdit,
  onDelete,
}: {
  loading: boolean;
  todos: Todo[];
  visibleTodos: Todo[];
  members: Member[];
  readOnly: boolean;
  editingAssigneesTodoId: string | null;
  assigneeDraftIds: string[];
  setAssigneeDraftIds: Dispatch<SetStateAction<string[]>>;
  assigneeSavingTodoId: string | null;
  onStartAssigneeEdit: (todo: Todo) => void;
  onCancelAssigneeEdit: () => void;
  onSaveAssignees: (todo: Todo) => void;
  onChangeStatus: (todo: Todo, status: TodoStatus) => void;
  onOpenDetails: (todo: Todo) => void;
  onOpenEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}) {
  return (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        {["任务名称", "项目", "负责人", "状态", "当前进展", "优先级", "更新时间", "操作"].map((head) => (
                          <th key={head} className="border-b border-r border-slate-200 px-3 py-3 font-medium last:border-r-0">
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={8} className="px-3 py-12 text-center text-sm text-slate-400">正在加载待办...</td></tr>
                      ) : visibleTodos.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-12 text-center text-sm text-slate-400">
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
                            <td className="border-b border-r border-slate-100 px-3 py-2">
                              {editingAssigneesTodoId === todo.id ? (
                                <div className="min-w-56 space-y-2">
                                  <AssigneeMentionPicker
                                    members={members}
                                    selectedIds={assigneeDraftIds}
                                    onChange={setAssigneeDraftIds}
                                    disabled={readOnly || assigneeSavingTodoId === todo.id}
                                    compact
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => { setEditingAssigneesTodoId(null); setAssigneeDraftIds([]); }}
                                      disabled={assigneeSavingTodoId === todo.id}
                                      className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                    >
                                      取消
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void saveAssignees(todo)}
                                      disabled={assigneeSavingTodoId === todo.id}
                                      className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {assigneeSavingTodoId === todo.id ? "保存中" : "保存"}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startAssigneeEdit(todo)}
                                  disabled={readOnly}
                                  title={readOnly ? "只读成员无法修改负责人" : "点击后输入 @ 添加或移除负责人"}
                                  className="flex min-h-9 min-w-32 items-center gap-2 rounded-md px-1.5 py-1 text-left transition hover:bg-blue-50 disabled:cursor-default disabled:hover:bg-transparent"
                                >
                                  {todo.assignees.length ? (
                                    <>
                                      <span className="flex -space-x-2">
                                        {todo.assignees.slice(0, 3).map((item) => (
                                          <span key={item.user.id} title={memberLabel(item.user)} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                                            {memberInitial(item.user)}
                                          </span>
                                        ))}
                                      </span>
                                      <span className="max-w-24 truncate text-xs text-slate-600">
                                        {todo.assignees.length === 1 ? memberLabel(todo.assignees[0].user) : memberLabel(todo.assignees[0].user) + " 等 " + todo.assignees.length + " 人"}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-400">
                                      <UserRound size={12} /> + @ 添加负责人
                                    </span>
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="border-b border-r border-slate-100 px-3 py-3">
                              <select
                                value={todo.status}
                                disabled={readOnly}
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
                                <button onClick={() => void openDetails(todo)} title="详情与进展" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">\n                            <History size={15} />\n                          </button>\n                          <button onClick={() => openEdit(todo)} disabled={readOnly} title="编辑" className="rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                                  <Pencil size={15} />
                                </button>
                                <button onClick={() => void deleteTodo(todo)} disabled={readOnly} title="删除" className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
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
  );
}
