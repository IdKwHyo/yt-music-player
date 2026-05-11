import { usePlayer } from "@/lib/player-context";
import { formatTime, thumbFor, type Track } from "@/lib/tracks";
import { Activity, GripVertical, Plus, X } from "lucide-react";
import { useState } from "react";

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return match?.[1] ?? null;
}

export function QueuePanel() {
  const {
    current, queue, currentIndex, library, addToLibrary,
    playTrack, removeFromQueue, addToQueue,
  } = usePlayer();
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const upNext = queue.slice(currentIndex + 1);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractYouTubeId(url);
    if (!id) return;
    const track: Track = {
      id,
      title: title.trim() || "Untitled",
      artist: "Unknown",
    };
    addToLibrary(track);
    addToQueue(track);
    setUrl("");
    setTitle("");
    setShowAdd(false);
  };

  return (
    <aside className="w-80 shrink-0 hidden lg:flex flex-col gap-3 m-3 ml-0">
      {/* Now playing card */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground mb-3">NOW PLAYING</div>
        {current ? (
          <div className="flex items-center gap-3">
            <img
              src={thumbFor(current.id)}
              alt=""
              className="h-12 w-12 rounded-md object-cover"
            />
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
          <form onSubmit={handleAdd} className="mb-3 space-y-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube URL or video ID"
              className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Track title (optional)"
              className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="submit"
              className="w-full bg-foreground text-background rounded-md py-1.5 text-xs font-medium"
            >
              Add to queue
            </button>
          </form>
        )}

        <ul className="space-y-1 overflow-y-auto flex-1 -mx-1 pr-1">
          {upNext.length === 0 && (
            <li className="text-xs text-muted-foreground/70 italic px-2 py-4 text-center">
              Queue is empty. Add tracks or play from your library.
            </li>
          )}
          {upNext.map((t, i) => {
            const realIndex = currentIndex + 1 + i;
            return (
              <li key={`${t.id}-${realIndex}`} className="group">
                <div className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/40 transition-colors">
                  <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                  <img src={thumbFor(t.id)} alt="" className="h-9 w-9 rounded object-cover" />
                  <button
                    onClick={() => playTrack(t, queue)}
                    className="flex-1 min-w-0 text-left"
                  >
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
                  <img src={thumbFor(t.id)} alt="" className="h-7 w-7 rounded object-cover" />
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
