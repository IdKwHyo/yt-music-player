import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TRACKS, type Track } from "@/lib/tracks";
import { storage } from "@/lib/storage";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

type RepeatMode = "off" | "all" | "one";

type PlayerCtx = {
  // library
  library: Track[];
  liked: string[];
  history: Track[];
  playlists: { id: string; name: string; tracks: Track[] }[];

  // playback
  queue: Track[];
  currentIndex: number;
  current: Track | null;
  isPlaying: boolean;
  isReady: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;

  // actions
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
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  createPlaylist: (name: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  setPlayerEl: (el: HTMLDivElement | null) => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export const usePlayer = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be used within PlayerProvider");
  return v;
};

let apiLoading: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiLoading) return apiLoading;
  apiLoading = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return apiLoading;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<Track[]>(() =>
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
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => storage.get("ip:volume", 70));
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  const playerRef = useRef<any>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const tickRef = useRef<number | null>(null);

  const current = currentIndex >= 0 ? queue[currentIndex] ?? null : null;

  // persist
  useEffect(() => storage.set("ip:library", library), [library]);
  useEffect(() => storage.set("ip:liked", liked), [liked]);
  useEffect(() => storage.set("ip:history", history.slice(0, 50)), [history]);
  useEffect(() => storage.set("ip:playlists", playlists), [playlists]);
  useEffect(() => storage.set("ip:volume", volume), [volume]);

  const setPlayerEl = useCallback((el: HTMLDivElement | null) => {
    elRef.current = el;
  }, []);

  // init player when element available
  useEffect(() => {
    let mounted = true;
    if (!elRef.current) return;
    loadYouTubeAPI().then(() => {
      if (!mounted || !elRef.current) return;
      playerRef.current = new window.YT.Player(elRef.current, {
        height: "0",
        width: "0",
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            setIsReady(true);
            playerRef.current?.setVolume(volume);
          },
          onStateChange: (e: any) => {
            const YT = window.YT;
            if (e.data === YT.PlayerState.PLAYING) setIsPlaying(true);
            else if (e.data === YT.PlayerState.PAUSED) setIsPlaying(false);
            else if (e.data === YT.PlayerState.ENDED) handleEnded();
          },
          onError: () => {
            // skip on unplayable
            handleEnded();
          },
        },
      });
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elRef.current]);

  // ticking position
  useEffect(() => {
    if (!isPlaying) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => {
      try {
        const p = playerRef.current?.getCurrentTime?.() ?? 0;
        const d = playerRef.current?.getDuration?.() ?? 0;
        setPosition(p);
        setDuration(d);
      } catch {
        /* ignore */
      }
    }, 500);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [isPlaying]);

  const loadAndPlay = useCallback((videoId: string) => {
    if (!playerRef.current?.loadVideoById) return;
    playerRef.current.loadVideoById(videoId);
    setIsPlaying(true);
  }, []);

  const playQueue = useCallback(
    (q: Track[], startIndex = 0) => {
      if (q.length === 0) return;
      setQueue(q);
      setCurrentIndex(startIndex);
      const t = q[startIndex];
      if (t) {
        loadAndPlay(t.id);
        setHistory((h) => [t, ...h.filter((x) => x.id !== t.id)]);
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
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [isPlaying]);

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
      setIsPlaying(false);
      return;
    }
    setCurrentIndex(n);
    const t = queue[n];
    if (t) {
      loadAndPlay(t.id);
      setHistory((h) => [t, ...h.filter((x) => x.id !== t.id)]);
    }
  }, [pickNextIndex, queue, loadAndPlay]);

  const prev = useCallback(() => {
    if (position > 3 && playerRef.current?.seekTo) {
      playerRef.current.seekTo(0, true);
      return;
    }
    if (currentIndex <= 0) {
      playerRef.current?.seekTo?.(0, true);
      return;
    }
    const n = currentIndex - 1;
    setCurrentIndex(n);
    const t = queue[n];
    if (t) loadAndPlay(t.id);
  }, [position, currentIndex, queue, loadAndPlay]);

  const handleEnded = useCallback(() => {
    if (repeat === "one" && current) {
      playerRef.current?.seekTo?.(0, true);
      playerRef.current?.playVideo?.();
      return;
    }
    next();
  }, [repeat, current, next]);

  const seek = useCallback((s: number) => {
    playerRef.current?.seekTo?.(s, true);
    setPosition(s);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    playerRef.current?.setVolume?.(v);
    if (v > 0 && muted) {
      playerRef.current?.unMute?.();
      setMuted(false);
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    if (muted) {
      playerRef.current?.unMute?.();
      setMuted(false);
    } else {
      playerRef.current?.mute?.();
      setMuted(true);
    }
  }, [muted]);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(
    () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
    []
  );

  const toggleLike = useCallback((id: string) => {
    setLiked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [id, ...l]));
  }, []);

  const addToLibrary = useCallback((track: Track) => {
    setLibrary((l) => (l.some((t) => t.id === track.id) ? l : [track, ...l]));
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((q) => [...q, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => {
      const next = q.filter((_, i) => i !== index);
      return next;
    });
    setCurrentIndex((ci) => (index < ci ? ci - 1 : ci));
  }, []);

  const createPlaylist = useCallback((name: string) => {
    setPlaylists((p) => [
      ...p,
      { id: crypto.randomUUID(), name, tracks: [] },
    ]);
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

  const value = useMemo<PlayerCtx>(
    () => ({
      library, liked, history, playlists,
      queue, currentIndex, current,
      isPlaying, isReady, position, duration,
      volume, muted, shuffle, repeat,
      playTrack, playQueue, togglePlay, next, prev, seek,
      setVolume, toggleMute, toggleShuffle, cycleRepeat,
      toggleLike, addToLibrary, addToQueue, removeFromQueue,
      createPlaylist, addToPlaylist, setPlayerEl,
    }),
    [
      library, liked, history, playlists, queue, currentIndex, current,
      isPlaying, isReady, position, duration, volume, muted, shuffle, repeat,
      playTrack, playQueue, togglePlay, next, prev, seek, setVolume, toggleMute,
      toggleShuffle, cycleRepeat, toggleLike, addToLibrary, addToQueue,
      removeFromQueue, createPlaylist, addToPlaylist, setPlayerEl,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
