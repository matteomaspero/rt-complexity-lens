import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { SessionPlan } from '@/lib/dicom/types';

export type DemoCategory = 'vmat' | 'imrt' | 'monaco' | 'elements' | 'pinnacle' | 'viewray' | 'tg119';

export interface DemoFile {
  name: string;
  file: string;
  category: DemoCategory;
  description?: string;
}

export const DEMO_FILES: DemoFile[] = [
  // --- RayStation VMAT (complex multi-arc) ---
  {
    name: 'RayStation VMAT',
    file: 'RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm',
    category: 'vmat',
    description: 'Complex VMAT plan — RayStation, multiple arcs',
  },

  // --- Eclipse TG-119 VMAT (2-arc) ---
  {
    name: 'Eclipse CS 2A (ETH)',
    file: 'RP.TG119.CS_ETH_2A_#1.dcm',
    category: 'vmat',
    description: 'TG-119 C-Shape, 2-arc VMAT — Eclipse ETH',
  },
  {
    name: 'Eclipse CS 2A (TB)',
    file: 'RP.TG119.CS_TB_2A_#1.dcm',
    category: 'vmat',
    description: 'TG-119 C-Shape, 2-arc VMAT — Eclipse TrueBeam',
  },
  {
    name: 'Eclipse HN 2A',
    file: 'RP.TG119.HN_ETH_2A_#1.dcm',
    category: 'vmat',
    description: 'TG-119 Head & Neck, 2-arc VMAT — Eclipse ETH',
  },
  {
    name: 'Eclipse MT 2A',
    file: 'RP.TG119.MT_ETH_2A_#1.dcm',
    category: 'vmat',
    description: 'TG-119 Multi-Target, 2-arc VMAT — Eclipse ETH',
  },
  {
    name: 'Eclipse PR 2A (ETH)',
    file: 'RP.TG119.PR_ETH_2A_2.dcm',
    category: 'vmat',
    description: 'TG-119 Prostate, 2-arc VMAT — Eclipse ETH',
  },
  {
    name: 'Eclipse PR 2A (UN)',
    file: 'RP.TG119.PR_UN_2A_#1.dcm',
    category: 'vmat',
    description: 'TG-119 Prostate, 2-arc VMAT — Eclipse University',
  },

  // --- Eclipse TG-119 IMRT (fixed-field) ---
  {
    name: 'Eclipse CS 9F',
    file: 'RP.TG119.CS_ETH_9F.dcm',
    category: 'imrt',
    description: 'TG-119 C-Shape, 9-field IMRT — Eclipse ETH',
  },
  {
    name: 'Eclipse HN 7F (ETH)',
    file: 'RP.TG119.HN_ETH_7F.dcm',
    category: 'imrt',
    description: 'TG-119 Head & Neck, 7-field IMRT — Eclipse ETH',
  },
  {
    name: 'Eclipse HN 7F (TB)',
    file: 'RP.TG119.HN_TB_7F.dcm',
    category: 'imrt',
    description: 'TG-119 Head & Neck, 7-field IMRT — Eclipse TrueBeam',
  },
  {
    name: 'Eclipse MT 7F',
    file: 'RP.TG119.MT_ETH_7F.dcm',
    category: 'imrt',
    description: 'TG-119 Multi-Target, 7-field IMRT — Eclipse ETH',
  },
  {
    name: 'Eclipse PR 7F (ETH)',
    file: 'RP.TG119.PR_ETH_7F.dcm',
    category: 'imrt',
    description: 'TG-119 Prostate, 7-field IMRT — Eclipse ETH',
  },
  {
    name: 'Eclipse PR 7F (UN)',
    file: 'RP.TG119.PR_UN_7F.dcm',
    category: 'imrt',
    description: 'TG-119 Prostate, 7-field IMRT — Eclipse University',
  },

  // --- Monaco (Elekta) ---
  {
    name: 'Monaco PT 01',
    file: 'RTPLAN_MO_PT_01.dcm',
    category: 'monaco',
    description: 'Monaco plan — patient 1',
  },
  {
    name: 'Monaco PT 02',
    file: 'RTPLAN_MO_PT_02.dcm',
    category: 'monaco',
    description: 'Monaco plan — patient 2',
  },
  {
    name: 'Monaco PT 03',
    file: 'RTPLAN_MO_PT_03.dcm',
    category: 'monaco',
    description: 'Monaco plan — patient 3',
  },
  {
    name: 'Monaco PT 04',
    file: 'RTPLAN_MO_PT_04.dcm',
    category: 'monaco',
    description: 'Monaco plan — patient 4',
  },

  // --- Elements (Brainlab) ---
  {
    name: 'Elements PT 01',
    file: 'RTPLAN_EL_PT_01.dcm',
    category: 'elements',
    description: 'Elements plan — patient 1',
  },
  {
    name: 'Elements PT 03',
    file: 'RTPLAN_EL_PT_03.dcm',
    category: 'elements',
    description: 'Elements plan — patient 3',
  },

  // --- Pinnacle (Philips) ---
  {
    name: 'Pinnacle PT 01',
    file: 'RTPLAN_PI_PT_01.dcm',
    category: 'pinnacle',
    description: 'Pinnacle plan — patient 1',
  },
  {
    name: 'Pinnacle PT 03',
    file: 'RTPLAN_PI_PT_03.dcm',
    category: 'pinnacle',
    description: 'Pinnacle plan — patient 3',
  },

  // --- ViewRay MRIdian (MR-Linac) ---
  {
    name: 'MRIdian Penalty 01',
    file: 'RTPLAN_MR_PT_01_PENALTY.dcm',
    category: 'viewray',
    description: 'ViewRay MRIdian — penalty optimisation',
  },
  {
    name: 'MRIdian Penalty 02',
    file: 'RTPLAN_MR_PT_02_PENALTY.dcm',
    category: 'viewray',
    description: 'ViewRay MRIdian — penalty optimisation, patient 2',
  },
  {
    name: 'MRIdian O&C',
    file: 'RTPLAN_MR_PT_03_O&C.dcm',
    category: 'viewray',
    description: 'ViewRay MRIdian — open & close optimisation',
  },
  {
    name: 'MRIdian A3i',
    file: 'RTPLAN_MR_PT_05_A3i.dcm',
    category: 'viewray',
    description: 'ViewRay MRIdian — A3i optimisation',
  },
];

export const DEMO_CATEGORIES = [
  { id: 'all', label: 'All Plans', count: DEMO_FILES.length },
  { id: 'vmat', label: 'VMAT', count: DEMO_FILES.filter(f => f.category === 'vmat').length },
  { id: 'imrt', label: 'IMRT', count: DEMO_FILES.filter(f => f.category === 'imrt').length },
  { id: 'monaco', label: 'Monaco', count: DEMO_FILES.filter(f => f.category === 'monaco').length },
  { id: 'elements', label: 'Elements', count: DEMO_FILES.filter(f => f.category === 'elements').length },
  { id: 'pinnacle', label: 'Pinnacle', count: DEMO_FILES.filter(f => f.category === 'pinnacle').length },
  { id: 'viewray', label: 'ViewRay', count: DEMO_FILES.filter(f => f.category === 'viewray').length },
] as const;

export async function fetchDemoBuffer(filename: string): Promise<ArrayBuffer> {
  const response = await fetch(`/test-data/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch demo file: ${response.status}`);
  }
  return response.arrayBuffer();
}

export async function loadDemoFile(demoFile: DemoFile): Promise<SessionPlan> {
  const arrayBuffer = await fetchDemoBuffer(demoFile.file);
  const plan = parseRTPlan(arrayBuffer, demoFile.file);
  const metrics = calculatePlanMetrics(plan);

  return {
    id: crypto.randomUUID(),
    fileName: demoFile.file,
    uploadTime: new Date(),
    plan,
    metrics,
  };
}

export async function loadMultipleDemoFiles(
  files: DemoFile[],
  onProgress?: (loaded: number, total: number) => void
): Promise<SessionPlan[]> {
  const results: SessionPlan[] = [];
  for (let i = 0; i < files.length; i++) {
    const plan = await loadDemoFile(files[i]);
    results.push(plan);
    onProgress?.(i + 1, files.length);
  }
  return results;
}

export function getDemoFilesByCategory(category: DemoFile['category'] | 'all'): DemoFile[] {
  if (category === 'all') return DEMO_FILES;
  return DEMO_FILES.filter(f => f.category === category);
}

export function getDemoFileByName(name: string): DemoFile | undefined {
  return DEMO_FILES.find(f => f.name === name || f.file === name);
}
