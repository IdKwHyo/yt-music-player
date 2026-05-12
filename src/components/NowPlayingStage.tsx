// src/components/NowPlayingStage.tsx
import { useEffect, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { cn } from '../lib/utils';

// This component will only render on the client
function ClientOnlyWaveform() {
  const { currentTime, duration, isPlaying } = usePlayerStore();
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    // Generate fake waveform bars (or use real audio data if available)
    const generateBars = () => {
      const count = 64;
      return Array.from({ length: count }, () => Math.random() * 80 + 20);
    };
    setBars(generateBars());

    // Optional: update bars periodically with audio data
    const interval = setInterval(() => {
      if (isPlaying) {
        setBars(prev => prev.map(() => Math.random() * 80 + 20));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="waveform-container flex items-end justify-center gap-[2px] h-20 w-full">
      {bars.map((height, i) => (
        <span
          key={i}
          className="w-[2px] bg-foreground/80 rounded-full transition-all duration-75"
          style={{ height: `${height.toFixed(3)}%` }} // Rounded to 3 decimals
        />
      ))}
    </div>
  );
}

export function NowPlayingStage() {
  const { currentTrack, isPlaying, currentTime, duration } = usePlayerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!currentTrack) {
    return (
      <section className="flex-1 glass-panel rounded-2xl p-6 flex flex-col items-center justify-center">
        <p className="text-muted-foreground">No track playing</p>
      </section>
    );
  }

  const progress = (currentTime / duration) * 100 || 0;

  return (
    <section className="flex-1 glass-panel rounded-2xl p-6 flex flex-col">
      {/* Artwork */}
      <div className="relative aspect-square w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-glow">
        {currentTrack.cover ? (
          <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-nebula/30 to-stardust/30 flex items-center justify-center">
            <span className="text-4xl">🎵</span>
          </div>
        )}
      </div>

      {/* Title & Artist */}
      <div className="text-center mt-6">
        <h2 className="text-2xl font-display font-semibold">{currentTrack.title}</h2>
        <p className="text-muted-foreground">{currentTrack.artist}</p>
      </div>

      {/* Progress bar */}
      <div className="mt-6 w-full">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* CLIENT-ONLY WAVEFORM - fixes hydration mismatch */}
      {mounted && <ClientOnlyWaveform />}

      {/* Controls (Play/Pause/Next/Prev) */}
      <div className="mt-6 flex justify-center gap-4">
        <ControlButton type="prev" />
        <ControlButton type="play" isPlaying={isPlaying} />
        <ControlButton type="next" />
      </div>
    </section>
  );
}

// Helper components
function ControlButton({ type, isPlaying }: { type: 'prev' | 'play' | 'next'; isPlaying?: boolean }) {
  const { togglePlay, nextTrack, prevTrack } = usePlayerStore();

  const icons = {
    prev: '⏮',
    play: isPlaying ? '⏸' : '▶',
    next: '⏭',
  };

  const actions = {
    prev: prevTrack,
    play: togglePlay,
    next: nextTrack,
  };

  return (
    <button
      onClick={actions[type]}
      className="w-12 h-12 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-foreground transition-all"
    >
      {icons[type]}
    </button>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
