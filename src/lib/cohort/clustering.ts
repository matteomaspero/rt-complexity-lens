/**
 * Clustering logic for cohort analysis
 * Groups plans by various dimensions with support for multidimensional clustering
 */

import type { BatchPlan } from '@/contexts/BatchContext';

export type ClusterDimension = 
  | 'technique' 
  | 'beamCount' 
  | 'controlPoints' 
  | 'deliveryTime' 
  | 'complexity' 
  | 'totalMU' 
  | 'machine'
  | 'energy';

export type ClusterMode = 'single' | 'combined';

export interface ClusterDimensionInfo {
  id: ClusterDimension;
  name: string;
  description: string;
}

export const CLUSTER_DIMENSIONS: ClusterDimensionInfo[] = [
  { id: 'technique', name: 'Technique', description: 'VMAT, IMRT, Conformal, etc.' },
  { id: 'beamCount', name: 'Beam Count', description: '1, 2, 3-4, or 5+ beams' },
  { id: 'controlPoints', name: 'Control Points', description: 'Low (<50), Medium (50-100), High (>100)' },
  { id: 'deliveryTime', name: 'Delivery Time', description: 'Short (<3min), Medium (3-6min), Long (>6min)' },
  { id: 'complexity', name: 'Complexity (MCS)', description: 'Low (>0.4), Medium (0.2-0.4), High (<0.2)' },
  { id: 'totalMU', name: 'Total MU', description: 'Low (<500), Medium (500-1000), High (>1000)' },
  { id: 'machine', name: 'Treatment Machine', description: 'Group by machine name' },
  { id: 'energy', name: 'Beam Energy', description: 'Group by radiation energy (6X, 10FFF, etc.)' },
];

export interface ClusterGroup {
  id: string;
  name: string;
  description: string;
  planIds: string[];
  color: string;
  // Multidimensional clustering support
  dimensions?: Partial<Record<ClusterDimension, string>>;
  parentCluster?: string;
}

// Color palette for clusters (using HSL values matching the theme)
const CLUSTER_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 55%)',
  'hsl(280, 65%, 60%)',
  'hsl(45, 85%, 55%)',
  'hsl(160, 60%, 50%)',
  'hsl(340, 70%, 55%)',
  'hsl(90, 60%, 45%)',
  'hsl(15, 75%, 55%)',
];

/**
 * Assign a plan to a cluster based on the given dimension
 */
export function assignCluster(plan: BatchPlan, dimension: ClusterDimension): string {
  switch (dimension) {
    case 'technique':
      return plan.plan.technique || 'UNKNOWN';

    case 'beamCount': {
      const beams = plan.plan.beams?.length ?? 0;
      if (beams === 1) return '1 beam';
      if (beams === 2) return '2 beams';
      if (beams <= 4) return '3-4 beams';
      return '5+ beams';
    }

    case 'controlPoints': {
      const totalCPs = plan.plan.beams?.reduce(
        (sum, b) => sum + (b.numberOfControlPoints || b.controlPoints?.length || 0), 
        0
      ) ?? 0;
      if (totalCPs < 50) return 'Low (<50 CPs)';
      if (totalCPs < 100) return 'Medium (50-100 CPs)';
      return 'High (>100 CPs)';
    }

    case 'deliveryTime': {
      const deliveryTime = plan.metrics?.totalDeliveryTime ?? 0;
      const minutes = deliveryTime / 60;
      if (minutes < 3) return 'Short (<3 min)';
      if (minutes < 6) return 'Medium (3-6 min)';
      return 'Long (>6 min)';
    }

    case 'complexity': {
      const mcs = plan.metrics?.MCS ?? 0;
      if (mcs > 0.4) return 'Low (MCS > 0.4)';
      if (mcs > 0.2) return 'Medium (0.2 < MCS ≤ 0.4)';
      return 'High (MCS ≤ 0.2)';
    }

    case 'totalMU': {
      const mu = plan.metrics?.totalMU ?? plan.plan.totalMU ?? 0;
      if (mu < 500) return 'Low (<500 MU)';
      if (mu < 1000) return 'Medium (500-1000 MU)';
      return 'High (>1000 MU)';
    }

    case 'machine': {
      // Get machine name from plan metadata
      const machineName = plan.plan.treatmentMachineName || 'Unknown Machine';
      return machineName;
    }

    case 'energy': {
      // Get energy labels from all beams
      const energyLabels = plan.plan.beams
        ?.map(b => b.energyLabel || b.radiationType)
        .filter(Boolean) ?? [];
      const unique = [...new Set(energyLabels)];
      if (unique.length === 0) return 'Unknown';
      if (unique.length === 1) return unique[0]!;
      return 'Mixed';
    }

    default:
      return 'Unknown';
  }
}

/**
 * Generate cluster groups from plans based on a single dimension
 */
export function generateClusters(
  plans: BatchPlan[], 
  dimension: ClusterDimension
): ClusterGroup[] {
  const clusterMap = new Map<string, string[]>();

  // Assign each plan to a cluster
  for (const plan of plans) {
    if (plan.status !== 'success') continue;
    
    const clusterId = assignCluster(plan, dimension);
    const existing = clusterMap.get(clusterId) || [];
    existing.push(plan.id);
    clusterMap.set(clusterId, existing);
  }

  // Convert to ClusterGroup array
  const clusters: ClusterGroup[] = [];
  let colorIndex = 0;

  // Sort clusters for consistent ordering
  const sortedEntries = Array.from(clusterMap.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );

  for (const [id, planIds] of sortedEntries) {
    clusters.push({
      id,
      name: id,
      description: `${planIds.length} plan${planIds.length !== 1 ? 's' : ''}`,
      planIds,
      color: CLUSTER_COLORS[colorIndex % CLUSTER_COLORS.length],
      dimensions: { [dimension]: id },
    });
    colorIndex++;
  }

  return clusters;
}

/**
 * Generate multidimensional cluster groups by combining two dimensions
 */
export function generateMultiDimensionalClusters(
  plans: BatchPlan[],
  primaryDimension: ClusterDimension,
  secondaryDimension: ClusterDimension
): ClusterGroup[] {
  const clusterMap = new Map<string, { planIds: string[]; dimensions: Partial<Record<ClusterDimension, string>> }>();

  // Assign each plan to a compound cluster
  for (const plan of plans) {
    if (plan.status !== 'success') continue;
    
    const primaryValue = assignCluster(plan, primaryDimension);
    const secondaryValue = assignCluster(plan, secondaryDimension);
    const compoundId = `${primaryValue} + ${secondaryValue}`;
    
    const existing = clusterMap.get(compoundId) || { 
      planIds: [], 
      dimensions: { 
        [primaryDimension]: primaryValue, 
        [secondaryDimension]: secondaryValue 
      } 
    };
    existing.planIds.push(plan.id);
    clusterMap.set(compoundId, existing);
  }

  // Convert to ClusterGroup array
  const clusters: ClusterGroup[] = [];
  let colorIndex = 0;

  // Sort by primary dimension first, then secondary
  const sortedEntries = Array.from(clusterMap.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );

  for (const [id, { planIds, dimensions }] of sortedEntries) {
    const primaryValue = dimensions[primaryDimension];
    clusters.push({
      id,
      name: id,
      description: `${planIds.length} plan${planIds.length !== 1 ? 's' : ''}`,
      planIds,
      color: CLUSTER_COLORS[colorIndex % CLUSTER_COLORS.length],
      dimensions,
      parentCluster: primaryValue,
    });
    colorIndex++;
  }

  return clusters;
}

/**
 * Get plans belonging to a specific cluster
 */
export function getClusterPlans(
  plans: BatchPlan[], 
  cluster: ClusterGroup
): BatchPlan[] {
  return plans.filter(p => cluster.planIds.includes(p.id));
}

/**
 * Calculate cluster percentages
 */
export function getClusterPercentages(
  clusters: ClusterGroup[], 
  totalPlans: number
): Map<string, number> {
  const percentages = new Map<string, number>();
  
  for (const cluster of clusters) {
    const percentage = totalPlans > 0 
      ? (cluster.planIds.length / totalPlans) * 100 
      : 0;
    percentages.set(cluster.id, percentage);
  }
  
  return percentages;
}

/**
 * Get unique parent clusters (for hierarchical display)
 */
export function getParentClusters(clusters: ClusterGroup[]): string[] {
  const parents = new Set<string>();
  for (const cluster of clusters) {
    if (cluster.parentCluster) {
      parents.add(cluster.parentCluster);
    }
  }
  return Array.from(parents).sort();
}
