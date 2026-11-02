import { getRequestHeader } from "@tanstack/react-start/server";

/** Server-derived visitor fingerprint (IP + user agent, hashed). Callers cannot choose it. */
export async function clientHash(salt: string): Promise<string> {
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-real-ip") ?? (getRequestHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";
  const ua = (getRequestHeader("user-agent") ?? "").slice(0, 300);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}|${ip}|${ua}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
