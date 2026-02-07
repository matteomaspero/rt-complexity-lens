import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { SessionPlan } from '@/lib/dicom/types';

export interface DemoFile {
  name: string;
  file: string;
  category: 'vmat' | 'monaco' | 'tg119';
  description?: string;
}

export const DEMO_FILES: DemoFile[] = [
  { 
    name: 'VMAT Complex', 
    file: 'RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm', 
    category: 'vmat',
    description: 'Complex VMAT plan with multiple arcs'
  },
  { 
    name: 'Monaco PT 01', 
    file: 'RTPLAN_MO_PT_01.dcm', 
    category: 'monaco',
    description: 'Monaco proton plan sample 1'
  },
  { 
    name: 'Monaco PT 02', 
    file: 'RTPLAN_MO_PT_02.dcm', 
    category: 'monaco',
    description: 'Monaco proton plan sample 2'
  },
  { 
    name: 'Monaco PT 03', 
    file: 'RTPLAN_MO_PT_03.dcm', 
    category: 'monaco',
    description: 'Monaco proton plan sample 3'
  },
  { 
    name: 'Monaco PT 04', 
    file: 'RTPLAN_MO_PT_04.dcm', 
    category: 'monaco',
    description: 'Monaco proton plan sample 4'
  },
  { 
    name: 'Monaco Penalty', 
    file: 'RTPLAN_MR_PT_01_PENALTY.dcm', 
    category: 'monaco',
    description: 'Monaco plan with penalty constraints'
  },
  { 
    name: 'TG-119 7F', 
    file: 'RP.TG119.PR_ETH_7F.dcm', 
    category: 'tg119',
    description: 'TG-119 7-field IMRT test case'
  },
  { 
    name: 'TG-119 2A', 
    file: 'RP.TG119.PR_ETH_2A_2.dcm', 
    category: 'tg119',
    description: 'TG-119 2-arc VMAT test case'
  },
];

export const DEMO_CATEGORIES = [
  { id: 'all', label: 'All', count: DEMO_FILES.length },
  { id: 'monaco', label: 'Monaco', count: DEMO_FILES.filter(f => f.category === 'monaco').length },
  { id: 'tg119', label: 'TG-119', count: DEMO_FILES.filter(f => f.category === 'tg119').length },
  { id: 'vmat', label: 'VMAT', count: DEMO_FILES.filter(f => f.category === 'vmat').length },
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
