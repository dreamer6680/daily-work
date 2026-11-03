"use client";

import {
  CheckCircle2,
  History,
  Pencil,
  Trash2,
  Users,
  UserRound,
} from "lucide-react";
import AssigneeMentionPicker from "@/components/todos/assignee-mention-picker";
import { PRIORITY_LABEL, STATUS_META } from "@/lib/todo-constants";
import { formatUpdatedAt, memberInitial, memberLabel } from "@/lib/todo-utils";
import type { Todo, TodoStatus, WorkspaceMember } from "@/types/todo";

type TodoTableProps = {
  todos: Todo[];
  visibleTodos: Todo[];
  members: WorkspaceMember[];
  loading: boolean;
  readOnly: boolean;
  statusFilter: "ALL" | TodoStatus;
  onStatusFilterChange: (value: "ALL" | TodoStatus) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (value: string) => void;
  onRefresh: () => void;
  onOpenDetails: (todo: Todo) => void;
  onOpenEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onChangeStatus: (todo: Todo, status: TodoStatus) => void;
  editingAssigneesTodoId: string | null;
  assigneeDraftIds: string[];
  onAssigneeDraftChange: (ids: string[]) => void;
  assigneeSavingTodoId: string | null;
  onStartAssigneeEdit: (todo: Todo) => void;
  onSaveAssignees: (todo: Todo) => void;
  onCancelAssigneeEdit: () => void;
};

export default function TodoTable({
  todos, visibleTodos, members, loading, readOnly,
  statusFilter, onStatusFilterChange,
  assigneeFilter, onAssigneeFilterChange, onRefresh,
  onOpenDetails, onOpenEdit, onDelete, onChangeStatus,
  editingAssigneesTodoId, assigneeDraftIds, onAssigneeDraftChange,
  assigneeSavingTodoId, onStartAssigneeEdit, onSaveAssignees,
  onCancelAssigneeEdit,
}: TodoTableProps) {
  return (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 border-b border-slate-200">
                <span className="border-b-2 border-blue-600 px-3 py-2 text-sm font-medium text-blue-700">
                  <span className="mr-2">▦</span>表格视图
                </span>
                <span className="px-3 py-2 text-sm text-slate-400">看板视图</span>
                <span className="px-3 py-2 text-sm text-slate-400">时间线</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
                  <Users size={14} />
                  <select aria-label="按成员筛选" value={assigneeFilter} onChange={(event) => onAssigneeFilterChange(event.target.value)} className="max-w-36 bg-transparent text-sm text-slate-700 outline-none">
                    <option value="ALL">全部成员</option>
                    <option value="UNASSIGNED">未分配</option>
                    {members.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}
                  </select>
                </label>
                <select
                  value={statusFilter}
                  onChange={(event) => onStatusFilterChange(event.target.value as "ALL" | TodoStatus)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-300"
                >
                  <option value="ALL">全部状态</option>
                  {Object.entries(STATUS_META).map(([value, meta]) => (
                    <option key={value} value={value}>{meta.label}</option>
                  ))}
                </select>
                <button onClick={onRefresh} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50">
                  刷新
                </button>
              </div>
            </div>
  
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
                          <button onClick={() => onOpenDetails(todo)} className="text-left hover:text-blue-700 hover:underline">{todo.title}</button>
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
                                onChange={onAssigneeDraftChange}
                                disabled={readOnly || assigneeSavingTodoId === todo.id}
                                compact
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={onCancelAssigneeEdit}
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
                            onChange={(event) => onChangeStatus(todo, event.target.value as TodoStatus)}
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
                            <button onClick={() => onOpenDetails(todo)} title="详情与进展" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                              <History size={15} />
                            </button>
                            <button onClick={() => onOpenEdit(todo)} disabled={readOnly} title="编辑" className="rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => onDelete(todo)} disabled={readOnly} title="删除" className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
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
  );
}
