export function memberLabel(member: { name: string | null; email: string | null }) {
  return member.name?.trim() || member.email || "未知成员";
}

export function memberInitial(member: { name: string | null; email: string | null }) {
  return memberLabel(member).slice(0, 1).toUpperCase();
}

export function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
