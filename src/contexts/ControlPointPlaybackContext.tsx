import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

export interface ControlPointTrack {
  index: number;
  totalPoints: number;
  setIndex: (index: number) => void;
  label?: string;
}

export interface ControlPointPlayback {
  currentIndex: number;
  totalPoints: number;
  isPlaying: boolean;
  setIndex: (index: number) => void;
  togglePlay: () => void;
  /** Optional second track (e.g. Plan B under independent navigation). */
  secondary?: ControlPointTrack;
}

const ControlPointPlaybackContext = createContext<ControlPointPlayback | null>(null);

/** Returns null outside a provider so shared charts stay unaffected. */
export function useControlPointPlayback(): ControlPointPlayback | null {
  return useContext(ControlPointPlaybackContext);
}

interface ProviderProps extends ControlPointPlayback {
  /** Playback frame interval in ms. */
  intervalMs?: number;
  /** Called when playback reaches the last control point. */
  onPlaybackEnd: () => void;
  children: ReactNode;
}

export function ControlPointPlaybackProvider({
  currentIndex,
  totalPoints,
  isPlaying,
  setIndex,
  togglePlay,
  secondary,
  intervalMs = 100,
  onPlaybackEnd,
  children,
}: ProviderProps) {
  const stateRef = useRef({ currentIndex, totalPoints, setIndex, onPlaybackEnd });
  stateRef.current = { currentIndex, totalPoints, setIndex, onPlaybackEnd };

  // Single timer drives every panel, so nothing can drift out of sync.
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const { currentIndex: i, totalPoints: n, setIndex: set, onPlaybackEnd: end } = stateRef.current;
      if (i >= n - 1) {
        end();
        return;
      }
      set(i + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [isPlaying, intervalMs]);

  const value = useMemo<ControlPointPlayback>(
    () => ({ currentIndex, totalPoints, isPlaying, setIndex, togglePlay, secondary }),
    [currentIndex, totalPoints, isPlaying, setIndex, togglePlay, secondary]
  );

  return (
    <ControlPointPlaybackContext.Provider value={value}>
      {children}
    </ControlPointPlaybackContext.Provider>
  );
}
