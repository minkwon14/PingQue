export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function timeAgo(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 5) return "방금";
  if (sec < 60) return `${sec}초 전`;
  return `${Math.floor(sec / 60)}분 전`;
}

export function groupedCode(code: string): string {
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  return code;
}
