"use client";

import { AlertCircle, CalendarDays, CircleHelp, Clock3, FolderKanban, Inbox, Plus, Users } from "lucide-react";
import WorkspaceControls from "@/components/workspace-controls";
import NavItem from "@/components/nav-item";
import type { Project } from "@/types/todo";

export default function WorkspaceSidebar({ projects }: { projects: Project[] }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-[#fafafa] p-3 md:block">
      <div className="mb-7 flex items-center gap-2 px-2 pt-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">D</div>
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
  );
}