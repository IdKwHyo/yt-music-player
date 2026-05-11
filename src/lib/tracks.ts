export type Track = {
  id: string; // YouTube video ID
  title: string;
  artist: string;
  album?: string;
};

// Curated cosmic-themed default playlist (royalty-friendly / well-known soundtracks).
export const DEFAULT_TRACKS: Track[] = [
  { id: "UDVtMYqUAyw", title: "Cornfield Chase", artist: "Hans Zimmer", album: "Interstellar OST" },
  { id: "RUuMd4D6stQ", title: "No Time For Caution", artist: "Hans Zimmer", album: "Interstellar OST" },
  { id: "8xZ41hsYYUE", title: "Stay", artist: "Hans Zimmer", album: "Interstellar OST" },
  { id: "RbHvxRcFm-c", title: "Mountains", artist: "Hans Zimmer", album: "Interstellar OST" },
  { id: "8aB1m9tIqCE", title: "S.T.A.Y.", artist: "Hans Zimmer", album: "Interstellar OST" },
  { id: "j8KL63r9Zcw", title: "Day One", artist: "Hans Zimmer", album: "Interstellar OST" },
  { id: "u32u8wjyTL8", title: "First Step", artist: "Hans Zimmer", album: "Interstellar OST" },
  { id: "5w7VcKM_re8", title: "Detach", artist: "Hans Zimmer", album: "Interstellar OST" },
  { id: "H3v9unphfi0", title: "Time", artist: "Hans Zimmer", album: "Inception OST" },
  { id: "YoHD9XEInc0", title: "Hoppípolla", artist: "Sigur Rós" },
];

export const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const thumbFor = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
