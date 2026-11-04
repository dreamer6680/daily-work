"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Clock3, History, X } from "lucide-react";
import { formatUpdatedAt } from "@/lib/member-utils";

type TodoStatus = "TODO" | "IN_PROGRESS" | "PAUSED" | "DONE" | "CANCELED";
type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type TodoDetail = {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: Priority;
  updatedAt: string;
  project: { id: string; name: string; color: string | null } | null;
  progressLogs: {
    id: string;
    eventType: string;
    fromStatus: TodoStatus | null;
    toStatus: TodoStatus | null;
    progressTitle: string | null;
    progressNote: string | null;
    createdAt: string;
    author: { id: string; name: string | null; email: string | null };
  }[];
};

const STATUS_META: Record<TodoStatus, { label: string }> = {
  TODO: { label: "待办" },
  IN_PROGRESS: { label: "进行中" },
  PAUSED: { label: "已暂停" },
  DONE: { label: "已完成" },
  CANCELED: { label: "已取消" },
};
const PRIORITY_LABEL: Record<Priority, string> = { LOW: "低", NORMAL: "普通", HIGH: "高", URGENT: "紧急" };

export default function TodoDetailDrawer({
  detail,
  detailLoading,
  readOnly,
  progressTitle,
  setProgressTitle,
  progressNote,
  setProgressNote,
  progressSaving,
  onClose,
  onSubmitProgress,
}: {
  detail: TodoDetail | null;
  detailLoading: boolean;
  readOnly: boolean;
  progressTitle: string;
  setProgressTitle: Dispatch<SetStateAction<string>>;
  progressNote: string;
  setProgressNote: Dispatch<SetStateAction<string>>;
  progressSaving: boolean;
  onClose: () => void;
  onSubmitProgress: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
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
                    <button onClick={onClose} className="rounded p-2 text-slate-400 hover:bg-slate-100" aria-label="关闭详情">
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
                      <form onSubmit={onSubmitProgress} className="space-y-3 rounded-lg border border-slate-200 p-4">
                        <input
                          value={progressTitle}
                          disabled={readOnly}
                          onChange={(event) => setProgressTitle(event.target.value)}
                          maxLength={200}
                          placeholder="进展标题，例如：本地网络问题导致卡顿"
                          className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
                        />
                        <textarea
                          value={progressNote}
                          disabled={readOnly}
                          onChange={(event) => setProgressNote(event.target.value)}
                          rows={3}
                          placeholder="记录本次进展、遇到的问题、原因和下一步处理方式"
                          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={readOnly || progressSaving || (!progressTitle.trim() && !progressNote.trim())}
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
    </>
  );
}
