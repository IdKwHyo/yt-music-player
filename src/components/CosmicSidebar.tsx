import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, Sparkles, ListMusic, Heart, Clock, Plus, Settings } from "lucide-react";
import logo from "@/assets/logo-planet.png";
import { usePlayer } from "@/lib/player-context";
import { useState } from "react";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/discover", icon: Sparkles, label: "Discover" },
  { to: "/playlists", icon: ListMusic, label: "Playlists" },
  { to: "/liked", icon: Heart, label: "Liked Songs" },
  { to: "/history", icon: Clock, label: "History" },
];

export function CosmicSidebar({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (key: string) => void;
}) {
  const { playlists, createPlaylist } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col glass-panel rounded-2xl m-3 mr-0 overflow-hidden">
      <div className="flex flex-col items-center pt-6 pb-4 border-b border-border/50">
        <img src={logo} alt="Interstellar" width={48} height={48} className="opacity-90" />
        <div className="mt-2 text-center">
          <div className="display text-lg tracking-[0.3em] text-glow">INTERSTELLAR</div>
          <div className="text-[10px] tracking-[0.4em] text-muted-foreground">MUSIC PLAYER</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = active === item.label.toLowerCase().split(" ")[0];
            return (
              <li key={item.to}>
                <button
                  onClick={() => onNavigate(item.label.toLowerCase().split(" ")[0])}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <div className="flex items-center justify-between px-3 mb-3">
            <span className="text-[10px] font-semibold tracking-[0.25em] text-muted-foreground">
              YOUR PLAYLISTS
            </span>
            <button
              onClick={() => setCreating(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Create playlist"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {creating && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) {
                  createPlaylist(name.trim());
                  setName("");
                  setCreating(false);
                }
              }}
              className="px-3 pb-2"
            >
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setCreating(false)}
                placeholder="Playlist name"
                className="w-full bg-input border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </form>
          )}
          <ul className="space-y-1">
            {playlists.length === 0 && (
              <li className="px-3 text-xs text-muted-foreground/70 italic">
                No playlists yet
              </li>
            )}
            {playlists.map((pl) => (
              <li key={pl.id}>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40">
                  <ListMusic className="h-4 w-4 opacity-60" />
                  <span className="truncate">{pl.name}</span>
                  <span className="ml-auto text-[10px] opacity-60">{pl.tracks.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="border-t border-border/50 p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-nebula to-stardust" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">StarGazer</div>
          <div className="text-[10px] tracking-[0.2em] text-muted-foreground">PREMIUM</div>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
