"use client";

import { LogOut, Search } from "lucide-react";

type HomeHeaderProps = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  logoutLoading: boolean;
  onLogout: () => void;
};

export default function HomeHeader({ keyword, onKeywordChange, logoutLoading, onLogout }: HomeHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
      <div className="text-sm text-slate-500">
        工作空间 <span className="px-1">/</span>
        <span className="font-medium text-slate-800">今日待办</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索任务或进展"
            className="h-9 w-56 rounded-md border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400"
          />
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutLoading}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <LogOut size={14} />
          {logoutLoading ? "退出中..." : "退出登录"}
        </button>
      </div>
    </header>
  );
}