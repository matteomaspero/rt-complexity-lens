import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { AlertTriangle, Hand, Keyboard, PlayCircle } from 'lucide-react';
import type { Beam } from '@/lib/dicom/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useControlPointPlayback } from '@/contexts/ControlPointPlaybackContext';
import { clampGantry, toIecAngle, unwrapGantryPath } from '@/lib/dicom/gantry-path';
import { LinacMachine, type LinacPalette, type LinacPose } from './LinacMachine';
import { LINAC_SHORTCUTS, useLinacShortcuts, type CameraView, type MlcMode } from './useLinacShortcuts';

interface LinacRoom3DProps {
  beam: Beam;
  currentIndex: number;
  width: number;
  height: number;
}

interface ManualPose {
  gantry: number;
  collimator: number;
  couch: number;
}

const CAMERA_VIEWS: Record<CameraView, [number, number, number]> = {
  room: [3.2, 1.8, 3.4],
  top: [0.01, 5.2, 0.6],
  foot: [0, 0.4, 4.6],
};

function readToken(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v.replace(/\s+/g, ', ')})` : fallback;
}

function usePalette(): LinacPalette {
  return useMemo(
    () => ({
      shell: readToken('--card', '#f4f4f4'),
      trim: readToken('--muted-foreground', '#777'),
      metal: readToken('--secondary-foreground', '#555'),
      floor: readToken('--muted', '#ddd'),
      wall: readToken('--secondary', '#eee'),
      patient: readToken('--accent', '#e6c9a8'),
      bankA: readToken('--mlc-bank-a', '#1b8ac9'),
      bankB: readToken('--mlc-bank-b', '#d9437a'),
      beam: readToken('--primary', '#3b6fd9'),
    }),
    []
  );
}

function CameraRig({ view, nonce }: { view: CameraView; nonce: number }) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    camera.position.set(...CAMERA_VIEWS[view]);
    camera.lookAt(0, 0, 0);
    controls?.target.set(0, 0, 0);
    controls?.update();
  }, [view, nonce, camera, controls]);
  return null;
}

export default function LinacRoom3D({ beam, currentIndex, width, height }: LinacRoom3DProps) {
  const playback = useControlPointPlayback();
  const palette = usePalette();
  const [manual, setManual] = useState<ManualPose | null>(null);
  const [mlcMode, setMlcMode] = useState<MlcMode>('plan');
  const [view, setView] = useState<CameraView>('room');
  const [viewNonce, setViewNonce] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const path = useMemo(
    () =>
      unwrapGantryPath(
        beam.controlPoints.map((cp) => cp.gantryAngle),
        beam.controlPoints.map((cp) => cp.gantryRotationDirection)
      ),
    [beam]
  );

  const cp = beam.controlPoints[Math.min(currentIndex, beam.controlPoints.length - 1)];
  const planPose: ManualPose = {
    gantry: path.angles[currentIndex] ?? 0,
    collimator: cp.beamLimitingDeviceAngle,
    couch: cp.patientSupportAngle ?? 0,
  };
  const active = manual ?? planPose;

  const leaves = useMemo(() => {
    const { bankA, bankB } = cp.mlcPositions;
    if (mlcMode === 'plan') return { bankA, bankB };
    const open = mlcMode === 'open' ? 200 : 0;
    return { bankA: bankA.map(() => -open), bankB: bankB.map(() => open) };
  }, [cp, mlcMode]);

  const pose: LinacPose = { ...active, ...leaves, jaws: cp.jawPositions };

  const total = beam.controlPoints.length;
  const handlers = useMemo(
    () => ({
      togglePlay: () => playback?.togglePlay(),
      stepCP: (d: number) => playback?.setIndex(Math.max(0, Math.min(total - 1, currentIndex + d))),
      jumpCP: (w: 'first' | 'last') => playback?.setIndex(w === 'first' ? 0 : total - 1),
      nudge: (axis: keyof ManualPose, d: number) =>
        setManual((prev) => {
          const base = prev ?? planPose;
          const next = { ...base, [axis]: base[axis] + d };
          next.gantry = clampGantry(next.gantry);
          return next;
        }),
      cycleMlc: () => setMlcMode((m) => (m === 'plan' ? 'open' : m === 'open' ? 'closed' : 'plan')),
      setView: (v: CameraView) => {
        setView(v);
        setViewNonce((n) => n + 1);
      },
      toggleHelp: () => setShowHelp((s) => !s),
    }),
    // planPose is derived from currentIndex/cp; recomputed together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playback, total, currentIndex, cp, path]
  );
  const onKeyDown = useLinacShortcuts(handlers);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={() => containerRef.current?.focus()}
      className="relative overflow-hidden rounded-md border bg-muted/30 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ width, height }}
      aria-label="3D treatment room. Click to focus, press ? for keyboard shortcuts."
    >
      <Canvas camera={{ position: CAMERA_VIEWS.room, fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 6, 4]} intensity={1.6} />
        <Environment resolution={64}>
          <Lightformer intensity={2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
          <Lightformer intensity={0.8} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        </Environment>
        <LinacMachine pose={pose} leafWidths={beam.mlcLeafWidths} palette={palette} showBeam />
        <OrbitControls makeDefault enablePan target={[0, 0, 0]} />
        <CameraRig view={view} nonce={viewNonce} />
      </Canvas>

      <div className="pointer-events-none absolute left-2 top-2 space-y-1 font-mono text-[11px] text-foreground">
        <div className="rounded bg-card/85 px-2 py-1 shadow-sm">
          G {toIecAngle(active.gantry).toFixed(1)}° · C {(((active.collimator % 360) + 360) % 360).toFixed(1)}° · T{' '}
          {(((active.couch % 360) + 360) % 360).toFixed(1)}°
        </div>
        {mlcMode !== 'plan' && <Badge variant="secondary">MLC {mlcMode}</Badge>}
        {path.exceedsLimits && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Gantry path exceeds ±185° travel
          </Badge>
        )}
      </div>

      <div className="absolute right-2 top-2 flex gap-1">
        <Button
          size="sm"
          variant={manual ? 'default' : 'secondary'}
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => setManual(manual ? null : planPose)}
          aria-label={manual ? 'Return to plan pose' : 'Manual control'}
        >
          {manual ? <PlayCircle className="h-3.5 w-3.5" /> : <Hand className="h-3.5 w-3.5" />}
          {manual ? 'Follow plan' : 'Manual'}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          onClick={() => setShowHelp((s) => !s)}
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showHelp && (
        <div className="absolute bottom-8 right-2 rounded-md border bg-card/95 p-2 text-[11px] shadow-md">
          <table>
            <tbody>
              {LINAC_SHORTCUTS.map(([k, d]) => (
                <tr key={k}>
                  <td className="pr-3 font-mono font-semibold">{k}</td>
                  <td className="text-muted-foreground">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-1 left-2 text-[10px] text-muted-foreground">
        Educational schematic, not a validated machine model. Gantry stops at ±185° (no rotation under the couch).
      </p>
    </div>
  );
}
