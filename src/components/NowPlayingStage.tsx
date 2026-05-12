import { usePlayer } from "@/lib/player-context";
import { formatTime, thumbFor, type Track } from "@/lib/tracks";
import { api } from "@/lib/api";
import { Heart, Loader2, MoreHorizontal, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import vinylImg from "@/assets/cosmic-vinyl.jpg";
import { Slider } from "@/components/ui/slider";
import { useEffect, useRef, useState } from "react";

export function NowPlayingStage() {
  const {
    current, isPlaying, isLoadingTrack, position, duration, togglePlay, next, prev,
    seek, shuffle, repeat, toggleShuffle, cycleRepeat,
    liked, toggleLike, volume, setVolume, muted, toggleMute,
    playTrack, addToLibrary,
  } = usePlayer();

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .search(term)
        .then((r) => {
          setResults(r.slice(0, 8));
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isLiked = current ? liked.includes(current.id) : false;
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <section className="flex-1 glass-panel rounded-2xl m-3 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 starfield pointer-events-none" />

      {/* Top search */}
      <div className="relative z-10 p-4 border-b border-border/30">
        <div className="max-w-xl mx-auto relative" ref={wrapRef}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Search for songs, albums, artists…"
            className="w-full bg-input/50 border border-border rounded-full px-5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {open && (results.length > 0 || searching) && (
            <div className="absolute left-0 right-0 top-full mt-2 glass-panel rounded-xl p-2 z-20 max-h-96 overflow-y-auto">
              {searching && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                </div>
              )}
              {results.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    addToLibrary(t);
                    playTrack(t, results);
                    setOpen(false);
                    setQ("");
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent/40 text-left"
                >
                  <img src={thumbFor(t)} alt="" className="h-9 w-9 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.artist}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-4 min-h-0">
        {/* Vinyl */}
        <div className="relative aspect-square w-full max-w-md flex-shrink min-h-0 my-2">
          <div
            className={`absolute inset-0 rounded-full bg-cover bg-center shadow-glow ${
              isPlaying ? "animate-spin-slow" : ""
            }`}
            style={{
              backgroundImage: `url(${vinylImg})`,
              maskImage: "radial-gradient(circle, black 60%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(circle, black 60%, transparent 75%)",
            }}
          />
          {current && (
            <img
              src={thumbFor(current)}
              alt=""
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 aspect-square rounded-full object-cover ring-2 ring-border"
            />
          )}
          {isLoadingTrack && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-foreground/80" />
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-center mt-4 mb-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => current && toggleLike(current.id)}
              className="text-muted-foreground hover:text-nebula transition-colors"
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-nebula text-nebula" : ""}`} />
            </button>
            <h2 className="display text-2xl text-glow">
              {current?.title ?? "Nothing playing"}
            </h2>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {current?.artist ?? "Pick a track from your library"}
          </p>
          {current?.album && (
            <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{current.album}</p>
          )}
        </div>

        {/* Waveform-ish */}
        <div className="w-full max-w-2xl flex items-end justify-center gap-[2px] h-10 mb-2 opacity-70">
          {Array.from({ length: 80 }).map((_, i) => {
            const center = 40;
            const dist = Math.abs(i - center);
            const baseHeight = Math.max(8, 100 - dist * 2.5 + Math.sin(i) * 15);
            return (
              <span
                key={i}
                className="w-[2px] bg-foreground/80 rounded-full"
                style={{
                  height: `${baseHeight}%`,
                  animation: isPlaying
                    ? `wave 1.${(i % 9) + 1}s ease-in-out infinite ${i * 0.02}s`
                    : "none",
                }}
              />
            );
          })}
        </div>

        {/* Progress */}
        <div className="w-full max-w-2xl flex items-center gap-3 text-xs text-muted-foreground">
          <span className="tabular-nums w-10 text-right">{formatTime(position)}</span>
          <Slider
            value={[position]}
            max={duration || 100}
            step={1}
            onValueChange={(v) => seek(v[0])}
            className="flex-1"
          />
          <span className="tabular-nums w-10">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-5">
          <button
            onClick={toggleShuffle}
            className={`transition-colors ${shuffle ? "text-nebula" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Shuffle"
          >
            <Shuffle className="h-5 w-5" />
          </button>
          <button onClick={prev} className="text-foreground/90 hover:text-foreground" aria-label="Previous">
            <SkipBack className="h-6 w-6 fill-current" />
          </button>
          <button
            onClick={togglePlay}
            className="h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform shadow-glow"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
          </button>
          <button onClick={next} className="text-foreground/90 hover:text-foreground" aria-label="Next">
            <SkipForward className="h-6 w-6 fill-current" />
          </button>
          <button
            onClick={cycleRepeat}
            className={`transition-colors ${repeat !== "off" ? "text-nebula" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Repeat"
          >
            <RepeatIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 mt-4 w-full max-w-xs">
          <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground" aria-label="Mute">
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <Slider
            value={[muted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={(v) => setVolume(v[0])}
            className="flex-1"
          />
        </div>
      </div>
    </section>
  );
}
