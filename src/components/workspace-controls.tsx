"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronDown, Plus, Settings2, Users, X, Trash2 } from "lucide-react";

type Workspace = { id: string; name: string; role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"; memberCount: number };
type Member = { id: string; name: string | null; email: string | null; role: Workspace["role"]; joinedAt: string };
const ROLE_LABEL: Record<Workspace["role"], string> = { OWNER: "所有者", ADMIN: "管理员", MEMBER: "成员", VIEWER: "只读成员" };

export default function WorkspaceControls() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentRole, setCurrentRole] = useState<Workspace["role"]>("VIEWER");
  const [currentUserId, setCurrentUserId] = useState("");
  const [email, setEmail] = useState("");
  const [addRole, setAddRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadWorkspaces() {
    const response = await fetch("/api/workspaces", { cache: "no-store" });
    if (response.status === 401) { window.location.assign("/login"); return; }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "读取工作空间失败");
    setWorkspaces(result.data.workspaces);
    setCurrentId(result.data.currentWorkspaceId);
  }

  async function loadMembers() {
    const response = await fetch("/api/workspaces/members", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "读取成员失败");
    setMembers(result.data.members);
    setCurrentRole(result.data.currentRole);
    setCurrentUserId(result.data.currentUserId);
  }

  useEffect(() => {
    void loadWorkspaces().catch((cause) => setError(cause instanceof Error ? cause.message : "读取工作空间失败"));
  }, []);

  async function switchWorkspace(workspaceId: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "切换工作空间失败");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "切换工作空间失败");
      setBusy(false);
    }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createName.trim()) return;
    setCreating(true); setError("");
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "创建工作空间失败");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建工作空间失败");
      setCreating(false);
    }
  }

  async function openSettings() {
    setSettingsOpen(true); setError("");
    try { await loadMembers(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "读取成员失败"); }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/workspaces/members", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: addRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "添加成员失败");
      setEmail("");
      await loadMembers();
      await loadWorkspaces();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "添加成员失败");
    } finally { setBusy(false); }
  }

  async function updateRole(member: Member, role: "ADMIN" | "MEMBER" | "VIEWER") {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/workspaces/members/${member.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "修改角色失败");
      await loadMembers();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "修改角色失败");
    } finally { setBusy(false); }
  }

  async function removeMember(member: Member) {
    if (!window.confirm(`确定将 ${member.name || member.email || "该成员"} 移出工作空间吗？`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/workspaces/members/${member.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "移除成员失败");
      await loadMembers();
      await loadWorkspaces();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "移除成员失败");
    } finally { setBusy(false); }
  }

  const current = workspaces.find((item) => item.id === currentId);
  const canManage = currentRole === "OWNER" || currentRole === "ADMIN";

  return (
    <>
      <div className="relative mb-3">
        <button type="button" onClick={() => setMenuOpen((value) => !value)}
          className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-slate-700">{current?.name || "工作空间"}</span>
            <span className="block text-xs text-slate-400">{current ? ROLE_LABEL[current.role] : "正在加载..."}</span>
          </span>
          <ChevronDown size={15} className="shrink-0 text-slate-400" />
        </button>
        {menuOpen && <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {workspaces.map((workspace) => <button key={workspace.id} type="button" disabled={busy || workspace.id === currentId}
            onClick={() => void switchWorkspace(workspace.id)}
            className={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-sm hover:bg-slate-50 ${workspace.id === currentId ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
            <span className="truncate">{workspace.name}</span><span className="ml-2 text-xs text-slate-400">{workspace.memberCount} 人</span>
          </button>)}
          <form onSubmit={createWorkspace} className="mt-1 border-t border-slate-100 p-2">
            <input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="新工作空间名称"
              maxLength={100} className="h-8 w-full rounded border border-slate-200 px-2 text-xs outline-none focus:border-blue-400" />
            <button disabled={creating || !createName.trim()} className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1 rounded bg-blue-600 text-xs font-medium text-white disabled:opacity-50">
              <Plus size={13} />{creating ? "创建中..." : "创建工作空间"}
            </button>
          </form>
        </div>}
      </div>
      <button type="button" onClick={() => void openSettings()}
        className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm text-slate-600 hover:bg-slate-100">
        <Users size={16} strokeWidth={1.8} />成员管理
        <span className="ml-auto text-xs text-slate-400">{current?.memberCount ?? ""}</span>
      </button>
      {error && !settingsOpen && <p className="mt-2 px-2 text-xs text-rose-600">{error}</p>}

      {settingsOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
        <section className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div><h2 className="text-base font-semibold">工作空间成员</h2><p className="mt-1 text-xs text-slate-400">{current?.name} · {ROLE_LABEL[currentRole]}</p></div>
            <button type="button" onClick={() => setSettingsOpen(false)} className="rounded p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
          </header>
          <div className="overflow-y-auto p-5">
            {error && <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            {canManage && <form onSubmit={addMember} className="mb-5 rounded-lg border border-slate-200 p-3">
              <div className="mb-2 text-sm font-medium">添加已有账户</div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="成员注册邮箱"
                  className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" />
                <select value={addRole} onChange={(event) => setAddRole(event.target.value as typeof addRole)}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm">
                  {currentRole === "OWNER" && <option value="ADMIN">管理员</option>}
                  <option value="MEMBER">成员</option><option value="VIEWER">只读成员</option>
                </select>
                <button disabled={busy} className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50">添加</button>
              </div>
              <p className="mt-2 text-xs text-slate-400">目前支持添加已注册用户；对方需要先创建 Daily Work 账户。</p>
            </form>}
            <div className="mb-2 text-sm font-medium">成员列表（{members.length}）</div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {members.map((member) => {
                const canEdit = canManage && member.role !== "OWNER" && member.id !== currentUserId && (currentRole === "OWNER" || member.role !== "ADMIN");
                const canRemove = canManage && member.role !== "OWNER" && !(currentRole === "ADMIN" && member.role === "ADMIN");
                return <div key={member.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-700">{member.name || "未设置姓名"}{member.role === "OWNER" && <span className="ml-2 text-xs text-slate-400">工作空间所有者</span>}</div><div className="truncate text-xs text-slate-400">{member.email}</div></div>
                  <div className="flex items-center gap-2">
                    {member.role === "OWNER" ? <span className="text-xs text-slate-500">所有者</span> :
                      <select value={member.role} disabled={!canEdit || busy} onChange={(event) => void updateRole(member, event.target.value as "ADMIN" | "MEMBER" | "VIEWER")}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-50 disabled:text-slate-400">
                        {currentRole === "OWNER" && <option value="ADMIN">管理员</option>}
                        <option value="MEMBER">成员</option><option value="VIEWER">只读成员</option>
                      </select>}
                    {canRemove && <button type="button" disabled={busy} onClick={() => void removeMember(member)} title="移除成员" className="rounded p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Trash2 size={14} /></button>}
                  </div>
                </div>;
              })}
              {members.length === 0 && <div className="px-3 py-8 text-center text-sm text-slate-400">暂无成员</div>}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">所有者拥有完整管理权限；管理员可管理普通成员和只读成员；成员参与协作；只读成员仅用于查看。服务端会再次校验每项操作权限。</p>
          </div>
          <footer className="flex justify-end border-t border-slate-200 px-5 py-3"><button type="button" onClick={() => setSettingsOpen(false)} className="h-9 rounded-md border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50">关闭</button></footer>
        </section>
      </div>}
    </>
  );
}
