import { AlertCircle, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";

type TodoStatsProps = {
  stats: { total: number; inProgress: number; done: number; paused: number };
};

export default function TodoStats({ stats }: TodoStatsProps) {
  const cards = [
    { label: "全部任务", value: stats.total, Icon: CalendarDays },
    { label: "进行中", value: stats.inProgress, Icon: Clock3 },
    { label: "已完成", value: stats.done, Icon: CheckCircle2 },
    { label: "已暂停", value: stats.paused, Icon: AlertCircle },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, Icon }) => (
        <div key={label} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            {label}
            <Icon size={15} />
          </div>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
      ))}
    </div>
  );
}