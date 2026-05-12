export type Track = {
  id: string; // iTunes trackId from Daydreamin backend
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  cover_xl?: string;
  duration?: number;
  genre?: string;
  artist_id?: number;
};

// Empty by default — library is now populated from the backend chart on first load.
export const DEFAULT_TRACKS: Track[] = [];

export const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const FALLBACK_COVER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23111'/><circle cx='32' cy='32' r='12' fill='%23333'/></svg>`
  );

export const thumbFor = (t: Track | string) => {
  if (typeof t === "string") return FALLBACK_COVER;
  return t.cover_xl || t.cover || FALLBACK_COVER;
};
