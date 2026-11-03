"use client";

import { FormEvent, useState } from "react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, workspaceName, email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "操作失败");
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "请求失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-800">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-7">
          <div className="mb-2 text-sm font-semibold text-blue-600">DAILY WORK</div>
          <h1 className="text-2xl font-semibold">{mode === "login" ? "登录工作台" : "创建账户"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "login" ? "登录后继续管理任务和每日计划。" : "注册后将自动创建你的个人工作空间。"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">姓名</span>
              <input value={name} onChange={e => setName(e.target.value)} required maxLength={100}
                className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">工作空间名称（可选）</span>
              <input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} maxLength={100}
                placeholder="默认：你的姓名 + 工作空间"
                className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" />
            </label>
          </>}
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">邮箱</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={255}
              autoComplete="email" className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">密码（至少 8 位）</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} maxLength={128}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" />
          </label>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button disabled={busy} className="h-11 w-full rounded-lg bg-blue-600 font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? "请稍候..." : mode === "login" ? "登录" : "注册并创建工作空间"}
          </button>
        </form>
        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          className="mt-5 w-full text-sm text-slate-500 hover:text-blue-600">
          {mode === "login" ? "没有账户？注册" : "已有账户？返回登录"}
        </button>
      </section>
    </main>
  );
}
