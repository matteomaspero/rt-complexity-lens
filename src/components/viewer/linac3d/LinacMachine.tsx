import { MlcLeaves3D, MLC_PLANE_SCALE } from './MlcLeaves3D';

export interface LinacPose {
  /** Continuous gantry angle (deg), within the mechanical limits. */
  gantry: number;
  collimator: number;
  couch: number;
  bankA: number[];
  bankB: number[];
  jaws: { x1: number; x2: number; y1: number; y2: number };
}

export interface LinacPalette {
  shell: string;
  trim: string;
  metal: string;
  floor: string;
  wall: string;
  patient: string;
  bankA: string;
  bankB: string;
  beam: string;
}

const DEG = Math.PI / 180;
const FLOOR_Y = -1.25;

interface LinacMachineProps {
  pose: LinacPose;
  leafWidths: number[];
  palette: LinacPalette;
  showBeam: boolean;
}

function Gantry({ pose, leafWidths, palette, showBeam }: LinacMachineProps) {
  const s = MLC_PLANE_SCALE;
  const { jaws } = pose;
  return (
    // IEC 61217: gantry rotates about the longitudinal axis, CW seen from the couch foot (+z).
    <group rotation={[0, 0, -pose.gantry * DEG]}>
      {/* Rotating drum face at the stand */}
      <mesh position={[0, 0, -1.55]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.12, 64]} />
        <meshStandardMaterial color={palette.shell} roughness={0.45} />
      </mesh>
      {/* Arm reaching over the isocentre */}
      <mesh position={[0, 1.2, -0.95]}>
        <boxGeometry args={[0.7, 0.45, 1.2]} />
        <meshStandardMaterial color={palette.shell} roughness={0.4} />
      </mesh>
      {/* Treatment head */}
      <mesh position={[0, 0.98, -0.1]}>
        <boxGeometry args={[0.62, 0.5, 0.6]} />
        <meshStandardMaterial color={palette.shell} roughness={0.4} />
      </mesh>
      {/* Counterweight / imager panel opposite the head */}
      <mesh position={[0, -0.75, -0.95]}>
        <boxGeometry args={[0.55, 0.12, 0.5]} />
        <meshStandardMaterial color={palette.trim} roughness={0.5} />
      </mesh>
      {/* Collimator assembly rotates about the beam axis */}
      <group position={[0, 0.55, 0]} rotation={[0, -pose.collimator * DEG, 0]}>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.24, 0.27, 0.16, 40]} />
          <meshStandardMaterial color={palette.trim} roughness={0.35} metalness={0.3} />
        </mesh>
        <MlcLeaves3D bankA={pose.bankA} bankB={pose.bankB} leafWidths={leafWidths} colorA={palette.bankA} colorB={palette.bankB} />
        {/* Jaws: X pair along leaf travel, Y pair along leaf stack */}
        <mesh position={[(jaws.x1 - 50) * s, 0.05, 0]}>
          <boxGeometry args={[100 * s, 0.03, 0.2]} />
          <meshStandardMaterial color={palette.metal} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[(jaws.x2 + 50) * s, 0.05, 0]}>
          <boxGeometry args={[100 * s, 0.03, 0.2]} />
          <meshStandardMaterial color={palette.metal} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.085, -(jaws.y2 + 50) * s]}>
          <boxGeometry args={[0.2, 0.03, 100 * s]} />
          <meshStandardMaterial color={palette.metal} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.085, -(jaws.y1 - 50) * s]}>
          <boxGeometry args={[0.2, 0.03, 100 * s]} />
          <meshStandardMaterial color={palette.metal} metalness={0.7} roughness={0.3} />
        </mesh>
        {showBeam && <BeamFrustum jaws={jaws} color={palette.beam} />}
      </group>
    </group>
  );
}

/** Divergent field from the source (0.45 m above the MLC plane) down to the isocentre. */
function BeamFrustum({ jaws, color }: { jaws: LinacPose['jaws']; color: string }) {
  const w = Math.max((jaws.x2 - jaws.x1) / 1000, 0.002);
  const h = Math.max((jaws.y2 - jaws.y1) / 1000, 0.002);
  const cx = (jaws.x1 + jaws.x2) / 2000;
  const cz = -(jaws.y1 + jaws.y2) / 2000;
  return (
    <mesh position={[cx * 0.5, -0.275, cz * 0.5]} scale={[w, 0.55, h]} rotation={[0, Math.PI / 4, 0]}>
      <cylinderGeometry args={[0.32, 0.71, 1, 4, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
    </mesh>
  );
}

function CouchAndPatient({ couch, palette }: { couch: number; palette: LinacPalette }) {
  return (
    // Couch rotates about the vertical axis through the isocentre.
    <group rotation={[0, couch * DEG, 0]}>
      <mesh position={[0, -0.12, 0.7]}>
        <boxGeometry args={[0.52, 0.05, 2.1]} />
        <meshStandardMaterial color={palette.trim} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.7, 1.15]}>
        <boxGeometry args={[0.35, 1.05, 0.5]} />
        <meshStandardMaterial color={palette.shell} roughness={0.5} />
      </mesh>
      <mesh position={[0, FLOOR_Y + 0.02, 1.15]}>
        <boxGeometry args={[0.7, 0.04, 0.9]} />
        <meshStandardMaterial color={palette.metal} roughness={0.5} />
      </mesh>
      {/* Head-first supine patient: head toward the gantry (-z) */}
      <mesh position={[0, 0.02, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.65, 6, 16]} />
        <meshStandardMaterial color={palette.patient} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.02, -0.33]}>
        <sphereGeometry args={[0.1, 20, 16]} />
        <meshStandardMaterial color={palette.patient} roughness={0.85} />
      </mesh>
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.08, 0.0, 1.15]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.065, 0.7, 4, 12]} />
          <meshStandardMaterial color={palette.patient} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Room({ palette }: { palette: LinacPalette }) {
  return (
    <>
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color={palette.floor} roughness={0.9} />
      </mesh>
      {/* Plain back wall behind the gantry stand */}
      <mesh position={[0, 0.25, -2.4]}>
        <planeGeometry args={[8, 3]} />
        <meshStandardMaterial color={palette.wall} roughness={0.9} />
      </mesh>
      {/* Static gantry stand */}
      <mesh position={[0, -0.1, -1.95]}>
        <boxGeometry args={[2.3, 2.3, 0.7]} />
        <meshStandardMaterial color={palette.shell} roughness={0.5} />
      </mesh>
    </>
  );
}

export function LinacMachine(props: LinacMachineProps) {
  return (
    <>
      <Room palette={props.palette} />
      <Gantry {...props} />
      <CouchAndPatient couch={props.pose.couch} palette={props.palette} />
    </>
  );
}
