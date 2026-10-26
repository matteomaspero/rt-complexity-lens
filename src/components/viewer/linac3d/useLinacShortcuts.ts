import { useCallback, type KeyboardEvent } from 'react';

export type MlcMode = 'plan' | 'open' | 'closed';
export type CameraView = 'room' | 'top' | 'foot';

export interface LinacShortcutHandlers {
  togglePlay: () => void;
  stepCP: (delta: number) => void;
  jumpCP: (where: 'first' | 'last') => void;
  nudge: (axis: 'gantry' | 'collimator' | 'couch', delta: number) => void;
  cycleMlc: () => void;
  setView: (view: CameraView) => void;
  toggleHelp: () => void;
}

export const LINAC_SHORTCUTS: Array<[string, string]> = [
  ['Space', 'Play / pause'],
  ['← / →', 'Previous / next CP (Shift ×10)'],
  ['Home / End', 'First / last CP'],
  ['G / Shift+G', 'Gantry +1° / −1° (Alt ×10)'],
  ['C / Shift+C', 'Collimator +1° / −1°'],
  ['T / Shift+T', 'Couch +1° / −1°'],
  ['L', 'MLC: plan / open / closed'],
  ['1 / 2 / 3 / R', 'Room / top / foot view / reset'],
  ['?', 'Toggle this help'],
];

/** Keyboard handler for the focused 3D panel; ignores keys typed into inputs. */
export function useLinacShortcuts(h: LinacShortcutHandlers) {
  return useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const step = e.altKey ? 10 : 1;
      const sign = e.shiftKey ? -1 : 1;
      const key = e.key.toLowerCase();
      const actions: Record<string, () => void> = {
        ' ': h.togglePlay,
        arrowright: () => h.stepCP(e.shiftKey ? 10 : 1),
        arrowleft: () => h.stepCP(e.shiftKey ? -10 : -1),
        home: () => h.jumpCP('first'),
        end: () => h.jumpCP('last'),
        g: () => h.nudge('gantry', sign * step),
        c: () => h.nudge('collimator', sign * step),
        t: () => h.nudge('couch', sign * step),
        l: h.cycleMlc,
        '1': () => h.setView('room'),
        r: () => h.setView('room'),
        '2': () => h.setView('top'),
        '3': () => h.setView('foot'),
        '?': h.toggleHelp,
      };
      const action = actions[key];
      if (!action) return;
      e.preventDefault();
      e.stopPropagation();
      action();
    },
    [h]
  );
}
