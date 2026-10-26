import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/** Iso-plane mm -> scene metres at the MLC plane (0.45 m from source, SAD 1 m). */
export const MLC_PLANE_SCALE = 0.00045;
const LEAF_LENGTH_MM = 150;
const LEAF_HEIGHT = 0.03;

interface MlcLeaves3DProps {
  bankA: number[];
  bankB: number[];
  leafWidths: number[];
  colorA: string;
  colorB: string;
}

export function MlcLeaves3D({ bankA, bankB, leafWidths, colorA, colorB }: MlcLeaves3DProps) {
  const n = Math.min(bankA.length, bankB.length);
  const refA = useRef<THREE.InstancedMesh>(null);
  const refB = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const offsets = useMemo(() => {
    const total = leafWidths.slice(0, n).reduce((s, w) => s + w, 0) || n * 5;
    let y = -total / 2;
    return Array.from({ length: n }, (_, i) => {
      const w = leafWidths[i] || 5;
      const c = y + w / 2;
      y += w;
      return { c, w };
    });
  }, [leafWidths, n]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const s = MLC_PLANE_SCALE;
    offsets.forEach(({ c, w }, i) => {
      // Leaf pair index runs along IEC Y (toward the gantry = scene -z).
      const z = -c * s;
      const depth = Math.max(w - 0.4, 0.5) * s;
      const ax = (bankA[i] - LEAF_LENGTH_MM / 2) * s;
      m.compose(new THREE.Vector3(ax, 0, z), new THREE.Quaternion(), new THREE.Vector3(LEAF_LENGTH_MM * s, LEAF_HEIGHT, depth));
      refA.current?.setMatrixAt(i, m);
      const bx = (bankB[i] + LEAF_LENGTH_MM / 2) * s;
      m.compose(new THREE.Vector3(bx, 0, z), new THREE.Quaternion(), new THREE.Vector3(LEAF_LENGTH_MM * s, LEAF_HEIGHT, depth));
      refB.current?.setMatrixAt(i, m);
    });
    if (refA.current) refA.current.instanceMatrix.needsUpdate = true;
    if (refB.current) refB.current.instanceMatrix.needsUpdate = true;
  }, [bankA, bankB, offsets]);

  if (n === 0) return null;
  return (
    <>
      <instancedMesh key={`a${n}`} ref={refA} args={[geometry, undefined, n]}>
        <meshStandardMaterial color={colorA} metalness={0.5} roughness={0.4} />
      </instancedMesh>
      <instancedMesh key={`b${n}`} ref={refB} args={[geometry, undefined, n]}>
        <meshStandardMaterial color={colorB} metalness={0.5} roughness={0.4} />
      </instancedMesh>
    </>
  );
}
