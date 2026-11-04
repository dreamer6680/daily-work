"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { memberInitial, memberLabel } from "@/lib/member-utils";

type WorkspaceMember = { id: string; name: string | null; email: string | null; role: string };

export default function AssigneeMentionPicker({
  members,
  selectedIds,
  onChange,
  disabled,
  compact = false,
}: {
  members: WorkspaceMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = inputValue.startsWith("@") ? inputValue.slice(1).trim().toLowerCase() : null;
  const candidates = query === null ? [] : members.filter((member) => {
    if (selectedIds.includes(member.id)) return false;
    const name = member.name?.toLowerCase() ?? "";
    const email = member.email?.toLowerCase() ?? "";
    return !query || name.includes(query) || email.includes(query);
  });
  const selectedMembers = members.filter((member) => selectedIds.includes(member.id));

  function addMember(member: WorkspaceMember) {
    if (!selectedIds.includes(member.id)) onChange([...selectedIds, member.id]);
    setInputValue("");
    setOpen(false);
    setActiveIndex(0);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || candidates.length === 0) {
      if (event.key === "Backspace" && !inputValue && selectedIds.length > 0 && !disabled) {
        onChange(selectedIds.slice(0, -1));
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % candidates.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + candidates.length) % candidates.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      addMember(candidates[activeIndex] ?? candidates[0]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 ${compact ? "min-h-9" : "min-h-11"}`}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedMembers.map((member) => (
          <span key={member.id} className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 py-1 pl-1 pr-1.5 text-xs font-medium text-blue-700">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">{memberInitial(member)}</span>
            {memberLabel(member)}
            {!disabled && (
              <button type="button" onClick={(event) => { event.stopPropagation(); onChange(selectedIds.filter((id) => id !== member.id)); }} className="rounded text-blue-400 hover:text-rose-600" aria-label={"移除" + memberLabel(member)}>
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          autoFocus={compact}
          value={inputValue}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;
            setInputValue(value);
            setOpen(value.startsWith("@"));
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(inputValue.startsWith("@"))}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder={selectedIds.length ? "继续输入 @ 添加成员" : "输入 @ 搜索并添加负责人"}
          className="h-7 min-w-24 flex-1 border-0 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />
        {selectedIds.length > 0 && !disabled && (
          <button type="button" onClick={() => onChange([])} className="px-1 text-xs text-slate-400 hover:text-rose-600">清空</button>
        )}
      </div>
      {open && query !== null && (
        <div className={compact ? "relative z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl" : "absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl"}>
          {candidates.length ? candidates.map((member, index) => (
            <button
              key={member.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addMember(member)}
              className={"flex w-full items-center gap-3 px-3 py-2 text-left " + (index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50")}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{memberInitial(member)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-700">{memberLabel(member)}</span>
                <span className="block truncate text-xs text-slate-400">{member.email || "未设置邮箱"}</span>
              </span>
              <span className="text-xs text-slate-400">@ 添加</span>
            </button>
          )) : (
            <div className="px-3 py-5 text-center text-sm text-slate-400">没有匹配的工作空间成员</div>
          )}
        </div>
      )}
      {!compact && <p className="mt-2 text-xs text-slate-400">{disabled ? "只读成员无法调整任务分配" : "输入 @ 后选择成员；可连续添加多位成员"}</p>}
    </div>
  );
}
