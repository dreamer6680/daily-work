import type { ElementType } from "react";

type NavItemProps = {
  icon: ElementType;
  label: string;
  active?: boolean;
};

export default function NavItem({ icon: Icon, label, active = false }: NavItemProps) {
  return (
    <div
      className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm ${
        active
          ? "bg-blue-50 font-medium text-blue-700"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon size={16} strokeWidth={1.8} />
      <span>{label}</span>
    </div>
  );
}