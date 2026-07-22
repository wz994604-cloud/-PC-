export function parseIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatCambodiaTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Phnom_Penh", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(value));
}

export function formatSourceDrawTime(openTime: string | null, rawOpenTime: string | null): string {
  if (openTime) return formatCambodiaTime(openTime);
  if (!rawOpenTime) return "—";
  const sourceTime = new Date(rawOpenTime).getTime();
  if (!Number.isFinite(sourceTime)) return "—";
  // The live source is consistently one hour ahead of its verified draw target.
  return formatCambodiaTime(new Date(sourceTime - 60 * 60 * 1000).toISOString()).split(" ").at(-1) ?? "—";
}

export function countdownParts(target: string | null, now = Date.now()) {
  if (!target) return null;
  const remaining = Math.max(0, new Date(target).getTime() - now);
  if (!Number.isFinite(remaining)) return null;
  return { total: remaining, minutes: Math.floor(remaining / 60000), seconds: Math.floor((remaining % 60000) / 1000) };
}
