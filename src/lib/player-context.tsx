import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TRACKS, type Track } from "@/lib/tracks";
import { storage } from "@/lib/storage";
import { api } from "@/lib/api";

type RepeatMode = "off" | "all" | "one";

type PlayerCtx = {
  library: Track[];
  liked: string[];
  history: Track[];
  playlists: { id: string; name: string; tracks: Track[] }[];

  queue: Track[];
  currentIndex: number;
  current: Track | null;
  isPlaying: boolean;
  isReady: boolean;
  isLoadingTrack: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;

  playTrack: (track: Track, queue?: Track[]) => void;
  playQueue: (queue: Track[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: (id: string) => void;
  addToLibrary: (track: Track) => void;
  setLibrary: (tracks: Track[]) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export const usePlayer = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be used within PlayerProvider");
  return v;
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibraryState] = useState<Track[]>(() =>
    storage.get("ip:library", DEFAULT_TRACKS)
  );
  const [liked, setLiked] = useState<string[]>(() => storage.get("ip:liked", []));
  const [history, setHistory] = useState<Track[]>(() => storage.get("ip:history", []));
  const [playlists, setPlaylists] = useState<PlayerCtx["playlists"]>(() =>
    storage.get("ip:playlists", [])
  );

  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => storage.get("ip:volume", 70));
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousIdRef = useRef<string | undefined>(undefined);
  const loadTokenRef = useRef(0);

  const current = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  useEffect(() => storage.set("ip:library", library), [library]);
  useEffect(() => storage.set("ip:liked", liked), [liked]);
  useEffect(() => storage.set("ip:history", history.slice(0, 50)), [history]);
  useEffect(() => storage.set("ip:playlists", playlists), [playlists]);
  useEffect(() => storage.set("ip:volume", volume), [volume]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.volume = volume / 100;
    audioRef.current = a;
    setIsReady(true);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setPosition(a.currentTime || 0);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnded = () => handleEndedRef.current?.();
    const onError = () => {
      setError("Audio error — is the backend running?");
      setIsLoadingTrack(false);
    };

    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);

    return () => {
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = (muted ? 0 : volume) / 100;
  }, [volume, muted]);

  const handleEndedRef = useRef<() => void>(() => {});

  const loadAndPlay = useCallback(async (track: Track) => {
    const a = audioRef.current;
    if (!a) return;
    const token = ++loadTokenRef.current;
    setError(null);
    setIsLoadingTrack(true);
    setPosition(0);
    setDuration(0);
    try {
      const resp = await api.play(track, previousIdRef.current);
      if (token !== loadTokenRef.current) return;
      if (!resp?.url) throw new Error(resp?.error || "No stream URL");
      a.src = resp.url;
      previousIdRef.current = track.id;
      try {
        await a.play();
      } catch (e) {
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load track");
    } finally {
      if (token === loadTokenRef.current) setIsLoadingTrack(false);
    }
  }, []);

  const playQueue = useCallback(
    (q: Track[], startIndex = 0) => {
      if (q.length === 0) return;
      setQueue(q);
      setCurrentIndex(startIndex);
      const t = q[startIndex];
      if (t) {
        loadAndPlay(t);
        setHistory((h) => [t, ...h.filter((x) => x.id !== t.id)]);
        api
          .upNext(t.id, 8)
          .then((up) => {
            if (!up?.length) return;
            setQueue((cur) => {
              const existing = new Set(cur.map((x) => x.id));
              const extras = up.filter((x) => !existing.has(x.id));
              return [...cur, ...extras];
            });
          })
          .catch(() => {});
      }
    },
    [loadAndPlay]
  );

  const playTrack = useCallback(
    (track: Track, q?: Track[]) => {
      const newQueue = q ?? [track];
      const idx = newQueue.findIndex((t) => t.id === track.id);
      playQueue(newQueue, Math.max(0, idx));
    },
    [playQueue]
  );

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);

  const pickNextIndex = useCallback(() => {
    if (queue.length === 0) return -1;
    if (shuffle) {
      if (queue.length === 1) return 0;
      let n = currentIndex;
      while (n === currentIndex) n = Math.floor(Math.random() * queue.length);
      return n;
    }
    if (currentIndex + 1 >= queue.length) {
      return repeat === "all" ? 0 : -1;
    }
    return currentIndex + 1;
  }, [currentIndex, queue.length, shuffle, repeat]);

  const next = useCallback(() => {
    const n = pickNextIndex();
    if (n === -1) {
      audioRef.current?.pause();
      return;
    }
    setCurrentIndex(n);
    const t = queue[n];
    if (t) {
      loadAndPlay(t);
      setHistory((h) => [t, ...h.filter((x) => x.id !== t.id)]);
    }
  }, [pickNextIndex, queue, loadAndPlay]);

  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    if (currentIndex <= 0) {
      if (a) a.currentTime = 0;
      return;
    }
    const n = currentIndex - 1;
    setCurrentIndex(n);
    const t = queue[n];
    if (t) loadAndPlay(t);
  }, [currentIndex, queue, loadAndPlay]);

  handleEndedRef.current = () => {
    if (repeat === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    next();
  };

  const seek = useCallback((s: number) => {
    if (audioRef.current) audioRef.current.currentTime = s;
    setPosition(s);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (v > 0 && muted) setMuted(false);
  }, [muted]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(
    () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
    []
  );

  const toggleLike = useCallback((id: string) => {
    setLiked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [id, ...l]));
  }, []);

  const addToLibrary = useCallback((track: Track) => {
    setLibraryState((l) => (l.some((t) => t.id === track.id) ? l : [track, ...l]));
  }, []);

  const setLibrary = useCallback((tracks: Track[]) => setLibraryState(tracks), []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((q) => [...q, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
    setCurrentIndex((ci) => (index < ci ? ci - 1 : ci));
  }, []);

  const createPlaylist = useCallback((name: string) => {
    setPlaylists((p) => [...p, { id: crypto.randomUUID(), name, tracks: [] }]);
  }, []);

  const addToPlaylist = useCallback((playlistId: string, track: Track) => {
    setPlaylists((p) =>
      p.map((pl) =>
        pl.id === playlistId && !pl.tracks.some((t) => t.id === track.id)
          ? { ...pl, tracks: [track, ...pl.tracks] }
          : pl
      )
    );
  }, []);

  useEffect(() => {
    if (library.length === 0) {
      api
        .chart()
        .then((tracks) => {
          if (tracks?.length) setLibraryState(tracks);
        })
        .catch(() => {});
    }
  }, []);

  const value = useMemo<PlayerCtx>(
    () => ({
      library, liked, history, playlists,
      queue, currentIndex, current,
      isPlaying, isReady, isLoadingTrack, position, duration,
      volume, muted, shuffle, repeat, error,
      playTrack, playQueue, togglePlay, next, prev, seek,
      setVolume, toggleMute, toggleShuffle, cycleRepeat,
      toggleLike, addToLibrary, setLibrary, addToQueue, removeFromQueue,
      createPlaylist, addToPlaylist,
    }),
    [
      library, liked, history, playlists, queue, currentIndex, current,
      isPlaying, isReady, isLoadingTrack, position, duration, volume, muted,
      shuffle, repeat, error,
      playTrack, playQueue, togglePlay, next, prev, seek, setVolume, toggleMute,
      toggleShuffle, cycleRepeat, toggleLike, addToLibrary, setLibrary,
      addToQueue, removeFromQueue, createPlaylist, addToPlaylist,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
