import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FolderKanban,
  Inbox,
  Plus,
  Search,
  Settings2,
  Users,
} from "lucide-react";

const tasks = [
  {
    name: "开发登录功能",
    project: "合同系统",
    status: "进行中",
    statusClass: "bg-blue-50 text-blue-700",
    progress: "本地网络问题导致卡顿",
    owner: "D",
    priority: "高",
    updated: "16:20",
  },
  {
    name: "合同 PDF 预览",
    project: "合同系统",
    status: "待办",
    statusClass: "bg-slate-100 text-slate-600",
    progress: "等待确定预览方案",
    owner: "D",
    priority: "普通",
    updated: "14:35",
  },
  {
    name: "官网首页动效",
    project: "官网",
    status: "已完成",
    statusClass: "bg-green-50 text-green-700",
    progress: "首页动效已完成",
    owner: "L",
    priority: "普通",
    updated: "11:10",
  },
  {
    name: "本地模型运行环境",
    project: "AI Agent",
    status: "已暂停",
    statusClass: "bg-amber-50 text-amber-700",
    progress: "等待模型兼容性验证",
    owner: "D",
    priority: "高",
    updated: "昨天",
  },
];

function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
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

export default function Home() {
  return (
    <main className="flex min-h-screen bg-white text-slate-800">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-[#fafafa] p-3 md:block">
        <div className="mb-7 flex items-center gap-2 px-2 pt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            D
          </div>
          <div>
            <div className="text-sm font-semibold">Daily Work</div>
            <div className="text-xs text-slate-400">开发工作台</div>
          </div>
          <ChevronDown className="ml-auto text-slate-400" size={15} />
        </div>

        <div className="mb-2 px-3 text-xs font-medium text-slate-400">
          工作空间
        </div>
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
          <NavItem icon={FolderKanban} label="合同系统" />
          <NavItem icon={FolderKanban} label="官网" />
          <NavItem icon={FolderKanban} label="AI Agent" />
        </nav>

        <div className="mb-2 mt-8 px-3 text-xs font-medium text-slate-400">
          管理
        </div>
        <nav className="space-y-1">
          <NavItem icon={CircleHelp} label="问题管理" />
          <NavItem icon={Settings2} label="工作空间设置" />
        </nav>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
          <div className="text-sm text-slate-500">
            工作空间 <span className="px-1">/</span>
            <span className="font-medium text-slate-800">今日待办</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 sm:flex">
              <Search size={14} />
              搜索
              <span className="text-slate-400">⌘ K</span>
            </button>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-medium">
              D
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">今日待办</h1>
              <p className="mt-1 text-sm text-slate-500">
                查看今天计划处理的任务和最新进展
              </p>
            </div>
            <button className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
              <Plus size={16} />
              新建待办
            </button>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["今日任务", "8", "CalendarDays"],
              ["进行中", "3", "Clock3"],
              ["已完成", "4", "CheckCircle2"],
              ["阻塞问题", "1", "AlertCircle"],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 border-b border-slate-200">
              <button className="border-b-2 border-blue-600 px-3 py-2 text-sm font-medium text-blue-700">
                <span className="mr-2">▦</span>表格视图
              </button>
              <button className="px-3 py-2 text-sm text-slate-500">看板视图</button>
              <button className="px-3 py-2 text-sm text-slate-500">时间线</button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button className="rounded-md border border-slate-200 px-3 py-2">筛选</button>
              <button className="rounded-md border border-slate-200 px-3 py-2">排序</button>
              <button className="rounded-md border border-slate-200 px-3 py-2">字段设置</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  {["任务名称", "项目", "状态", "当前进展", "负责人", "优先级", "更新时间"].map((head) => (
                    <th key={head} className="border-b border-r border-slate-200 px-3 py-3 font-medium last:border-r-0">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.name} className="hover:bg-slate-50">
                    <td className="border-b border-r border-slate-100 px-3 py-3 font-medium text-slate-800">
                      {task.name}
                    </td>
                    <td className="border-b border-r border-slate-100 px-3 py-3 text-slate-500">
                      {task.project}
                    </td>
                    <td className="border-b border-r border-slate-100 px-3 py-3">
                      <span className={`rounded px-2 py-1 text-xs ${task.statusClass}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="max-w-64 truncate border-b border-r border-slate-100 px-3 py-3 text-slate-600">
                      {task.progress}
                    </td>
                    <td className="border-b border-r border-slate-100 px-3 py-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs">
                        {task.owner}
                      </span>
                    </td>
                    <td className="border-b border-r border-slate-100 px-3 py-3 text-slate-600">
                      {task.priority}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-500">
                      {task.updated}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={14} />
            当前为第一阶段静态界面，后续接入 PostgreSQL 数据。
          </div>
        </div>
      </section>
    </main>
  );
}
