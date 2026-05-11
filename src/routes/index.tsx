import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CosmicSidebar } from "@/components/CosmicSidebar";
import { NowPlayingStage } from "@/components/NowPlayingStage";
import { QueuePanel } from "@/components/QueuePanel";
import { usePlayer } from "@/lib/player-context";
import { thumbFor } from "@/lib/tracks";
import { Heart, Play } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [view, setView] = useState("home");
  const { setPlayerEl } = usePlayer();

  return (
    <div className="h-screen w-full flex overflow-hidden">
      <CosmicSidebar active={view} onNavigate={setView} />

      <div className="flex-1 flex min-w-0">
        {view === "home" && <NowPlayingStage />}
        {view === "search" && <BrowseView title="Search" filter />}
        {view === "discover" && <BrowseView title="Discover" />}
        {view === "playlists" && <PlaylistsView />}
        {view === "liked" && <LikedView />}
        {view === "history" && <HistoryView />}

        <QueuePanel />
      </div>

      {/* Hidden YouTube player */}
      <div className="absolute -left-[9999px] top-0" aria-hidden>
        <div ref={setPlayerEl} />
      </div>
    </div>
  );
}

function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex-1 glass-panel rounded-2xl m-3 p-6 overflow-y-auto relative">
      <div className="absolute inset-0 starfield pointer-events-none opacity-30" />
      <div className="relative z-10">
        <h1 className="display text-3xl text-glow mb-6">{title}</h1>
        {children}
      </div>
    </section>
  );
}

function BrowseView({ title, filter = false }: { title: string; filter?: boolean }) {
  const { library, playTrack, toggleLike, liked } = usePlayer();
  const [q, setQ] = useState("");
  const filtered = filter
    ? library.filter(
        (t) =>
          t.title.toLowerCase().includes(q.toLowerCase()) ||
          t.artist.toLowerCase().includes(q.toLowerCase())
      )
    : library;

  return (
    <PanelShell title={title}>
      {filter && (
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your library…"
          className="w-full bg-input/50 border border-border rounded-full px-5 py-2.5 text-sm mb-6 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}
      <TrackGrid tracks={filtered} onPlay={(t) => playTrack(t, filtered)} liked={liked} onLike={toggleLike} />
    </PanelShell>
  );
}

function LikedView() {
  const { library, liked, playTrack, toggleLike } = usePlayer();
  const tracks = library.filter((t) => liked.includes(t.id));
  return (
    <PanelShell title="Liked Songs">
      {tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No liked songs yet. Tap the heart on any track.</p>
      ) : (
        <TrackGrid tracks={tracks} onPlay={(t) => playTrack(t, tracks)} liked={liked} onLike={toggleLike} />
      )}
    </PanelShell>
  );
}

function HistoryView() {
  const { history, playTrack, toggleLike, liked } = usePlayer();
  return (
    <PanelShell title="Recently Played">
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history yet.</p>
      ) : (
        <TrackGrid tracks={history} onPlay={(t) => playTrack(t, history)} liked={liked} onLike={toggleLike} />
      )}
    </PanelShell>
  );
}

function PlaylistsView() {
  const { playlists, playQueue } = usePlayer();
  return (
    <PanelShell title="Your Playlists">
      {playlists.length === 0 ? (
        <p className="text-sm text-muted-foreground">No playlists yet. Create one from the sidebar.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => pl.tracks.length && playQueue(pl.tracks, 0)}
              className="text-left glass-panel rounded-xl p-4 hover:scale-[1.02] transition-transform"
            >
              <div className="aspect-square rounded-lg bg-gradient-to-br from-nebula to-stardust mb-3 opacity-80" />
              <div className="font-medium">{pl.name}</div>
              <div className="text-xs text-muted-foreground">{pl.tracks.length} songs</div>
            </button>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

function TrackGrid({
  tracks,
  onPlay,
  liked,
  onLike,
}: {
  tracks: { id: string; title: string; artist: string; album?: string }[];
  onPlay: (t: any) => void;
  liked: string[];
  onLike: (id: string) => void;
}) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {tracks.map((t) => (
        <li key={t.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-accent/40 transition-colors">
          <div className="relative">
            <img src={thumbFor(t.id)} alt="" className="h-12 w-12 rounded object-cover" />
            <button
              onClick={() => onPlay(t)}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded transition-opacity"
              aria-label="Play"
            >
              <Play className="h-5 w-5 fill-current" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{t.title}</div>
            <div className="text-xs text-muted-foreground truncate">{t.artist}</div>
          </div>
          <button
            onClick={() => onLike(t.id)}
            className="text-muted-foreground hover:text-nebula"
            aria-label="Like"
          >
            <Heart className={`h-4 w-4 ${liked.includes(t.id) ? "fill-nebula text-nebula" : ""}`} />
          </button>
        </li>
      ))}
    </ul>
  );
}
