import { usePlayer } from "@/lib/player-context";
import { thumbFor, type Track } from "@/lib/tracks";
import { Activity, GripVertical, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function QueuePanel() {
  const {
    current, queue, currentIndex, library, addToLibrary,
    playTrack, removeFromQueue, addToQueue,
  } = usePlayer();
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);

  const upNext = queue.slice(currentIndex + 1);

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
        .then((r) => setResults(r.slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <aside className="w-80 shrink-0 hidden lg:flex flex-col gap-3 m-3 ml-0">
      {/* Now playing card */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-3">NOW PLAYING</div>
        {current ? (
          <div className="flex items-center gap-3">
            <img src={thumbFor(current)} alt="" className="h-12 w-12 rounded-md object-cover" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{current.title}</div>
              <div className="text-xs text-muted-foreground truncate">{current.artist}</div>
            </div>
            <Activity className="h-4 w-4 text-nebula animate-pulse-glow" />
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Nothing playing</div>
        )}
      </div>

      {/* Up next */}
      <div className="glass-panel rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground">UP NEXT</div>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Add track"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showAdd && (
          <div className="mb-3 space-y-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search to add a song…"
              className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searching && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching…
              </div>
            )}
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {results.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => {
                      addToLibrary(t);
                      addToQueue(t);
                      setQ("");
                      setResults([]);
                      setShowAdd(false);
                    }}
                    className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/40 text-left"
                  >
                    <img src={thumbFor(t)} alt="" className="h-7 w-7 rounded object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{t.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{t.artist}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="space-y-1 overflow-y-auto flex-1 -mx-1 pr-1">
          {upNext.length === 0 && (
            <li className="text-xs text-muted-foreground/70 italic px-2 py-4 text-center">
              Queue is empty. Play something to get suggestions.
            </li>
          )}
          {upNext.map((t, i) => {
            const realIndex = currentIndex + 1 + i;
            return (
              <li key={`${t.id}-${realIndex}`} className="group">
                <div className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/40 transition-colors">
                  <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                  <img src={thumbFor(t)} alt="" className="h-9 w-9 rounded object-cover" />
                  <button onClick={() => playTrack(t, queue)} className="flex-1 min-w-0 text-left">
                    <div className="text-sm truncate">{t.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.artist}</div>
                  </button>
                  <button
                    onClick={() => removeFromQueue(realIndex)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
              </li>
            );
          })}
        </ul>

        {/* Library quick browse */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-2">FROM LIBRARY</div>
          <ul className="space-y-1 max-h-40 overflow-y-auto -mx-1 pr-1">
            {library.slice(0, 20).map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => playTrack(t, library)}
                  className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/40 text-left"
                >
                  <img src={thumbFor(t)} alt="" className="h-7 w-7 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{t.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{t.artist}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
