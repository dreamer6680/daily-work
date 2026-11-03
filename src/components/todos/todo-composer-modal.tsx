"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { X } from "lucide-react";
import AssigneeMentionPicker from "@/components/todos/assignee-mention-picker";
import { PRIORITY_LABEL, STATUS_META } from "@/lib/todo-constants";
import type { Project, Todo, TodoForm, TodoStatus, WorkspaceMember } from "@/types/todo";

type TodoComposerModalProps = {
  open: boolean;
  editingTodo: Todo | null;
  form: TodoForm;
  setForm: Dispatch<SetStateAction<TodoForm>>;
  projects: Project[];
  members: WorkspaceMember[];
  readOnly: boolean;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export default function TodoComposerModal({
  open, editingTodo, form, setForm, projects, members, readOnly, saving, onSubmit, onClose,
}: TodoComposerModalProps) {
  if (!open) return null;
  return (
            {open && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
                <form onSubmit={onSubmit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-semibold">{editingTodo ? "编辑待办" : "新建待办"}</h2>
                    <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
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
      
                    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-800">负责人 / 协作成员</div>
                          <p className="mt-0.5 text-xs text-slate-500">使用 @ 搜索工作空间成员，可添加多位成员</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">已选 {form.assigneeIds.length} 人</span>
                      </div>
                      <AssigneeMentionPicker
                        members={members}
                        selectedIds={form.assigneeIds}
                        onChange={(assigneeIds) => setForm((current) => ({ ...current, assigneeIds }))}
                        disabled={readOnly}
                      />
                    </section>
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
  );
}
