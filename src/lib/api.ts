import type { Track } from "@/lib/tracks";

const KEY = "ip:apiBase";

export function getApiBase(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:499";
  return (
    window.localStorage.getItem(KEY) ||
    (import.meta as any).env?.VITE_BACKEND_URL ||
    "http://127.0.0.1:499"
  );
}

export function setApiBase(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, url.replace(/\/$/, ""));
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => getJSON<{ status: string }>("/api/mobile/health"),
  search: (q: string) =>
    getJSON<Track[]>(`/api/mobile/search?q=${encodeURIComponent(q)}`),
  chart: () => getJSON<Track[]>("/api/mobile/chart"),
  upNext: (songId: string, limit = 10) =>
    getJSON<(Track & { reason?: string })[]>(
      `/api/mobile/up_next?song_id=${encodeURIComponent(songId)}&limit=${limit}`
    ),
  play: (t: Track, previousId?: string) =>
    getJSON<{ source: string; url: string; error?: string }>(
      `/api/mobile/play?id=${encodeURIComponent(t.id)}&artist=${encodeURIComponent(
        t.artist
      )}&title=${encodeURIComponent(t.title)}${
        previousId ? `&previous_song_id=${encodeURIComponent(previousId)}` : ""
      }`
    ),
};
