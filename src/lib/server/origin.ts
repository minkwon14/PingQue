/**
 * Origin used for QR codes and join links. `PUBLIC_ORIGIN` (e.g.
 * https://pingque.example.com) overrides the host's address bar; unset or
 * invalid values fall back to it (undefined).
 */
export function getPublicOrigin(env: Record<string, string | undefined>): string | undefined {
  const raw = env.PUBLIC_ORIGIN?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("protocol");
    return url.origin;
  } catch {
    console.warn(`PUBLIC_ORIGIN ignored: "${raw}" is not a valid http(s) URL.`);
    return undefined;
  }
}
