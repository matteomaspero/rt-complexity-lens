"""
Clustering logic for cohort analysis.

Direct translation of src/lib/cohort/clustering.ts
Groups plans by various dimensions.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Tuple

from .types import RTPlan, PlanMetrics


class ClusterDimension(Enum):
    """Dimensions for clustering plans."""
    TECHNIQUE = "technique"
    BEAM_COUNT = "beamCount"
    CONTROL_POINTS = "controlPoints"
    DELIVERY_TIME = "deliveryTime"
    COMPLEXITY = "complexity"
    TOTAL_MU = "totalMU"
    MACHINE = "machine"


@dataclass
class ClusterDimensionInfo:
    """Information about a cluster dimension."""
    id: ClusterDimension
    name: str
    description: str


CLUSTER_DIMENSIONS: List[ClusterDimensionInfo] = [
    ClusterDimensionInfo(
        ClusterDimension.TECHNIQUE, 
        "Technique", 
        "VMAT, IMRT, Conformal, etc."
    ),
    ClusterDimensionInfo(
        ClusterDimension.BEAM_COUNT, 
        "Beam Count", 
        "1, 2, 3-4, or 5+ beams"
    ),
    ClusterDimensionInfo(
        ClusterDimension.CONTROL_POINTS, 
        "Control Points", 
        "Low (<50), Medium (50-100), High (>100)"
    ),
    ClusterDimensionInfo(
        ClusterDimension.DELIVERY_TIME, 
        "Delivery Time", 
        "Short (<3min), Medium (3-6min), Long (>6min)"
    ),
    ClusterDimensionInfo(
        ClusterDimension.COMPLEXITY, 
        "Complexity (MCS)", 
        "Low (>0.4), Medium (0.2-0.4), High (<0.2)"
    ),
    ClusterDimensionInfo(
        ClusterDimension.TOTAL_MU, 
        "Total MU", 
        "Low (<500), Medium (500-1000), High (>1000)"
    ),
    ClusterDimensionInfo(
        ClusterDimension.MACHINE, 
        "Treatment Machine", 
        "Group by machine name"
    ),
]


# Color palette for clusters (CSS color strings for compatibility)
CLUSTER_COLORS = [
    "#8884d8",  # chart-1
    "#82ca9d",  # chart-2
    "#ffc658",  # chart-3
    "#ff7300",  # chart-4
    "#00C49F",  # chart-5
    "#5570cc",  # blue
    "#9966cc",  # purple
    "#ccaa33",  # yellow
]


@dataclass
class ClusterGroup:
    """A group of plans in a cluster."""
    id: str
    name: str
    description: str
    plan_indices: List[int] = field(default_factory=list)
    color: str = "#8884d8"


def assign_cluster(
    plan: RTPlan,
    metrics: PlanMetrics,
    dimension: ClusterDimension
) -> str:
    """Assign a plan to a cluster based on the given dimension."""
    
    if dimension == ClusterDimension.TECHNIQUE:
        return plan.technique.value if plan.technique else "UNKNOWN"
    
    elif dimension == ClusterDimension.BEAM_COUNT:
        n = len(plan.beams)
        if n == 1:
            return "1 beam"
        if n == 2:
            return "2 beams"
        if n <= 4:
            return "3-4 beams"
        return "5+ beams"
    
    elif dimension == ClusterDimension.CONTROL_POINTS:
        total_cps = sum(
            b.number_of_control_points or len(b.control_points) 
            for b in plan.beams
        )
        if total_cps < 50:
            return "Low (<50 CPs)"
        if total_cps < 100:
            return "Medium (50-100 CPs)"
        return "High (>100 CPs)"
    
    elif dimension == ClusterDimension.DELIVERY_TIME:
        delivery_time = metrics.total_delivery_time or 0
        minutes = delivery_time / 60
        if minutes < 3:
            return "Short (<3 min)"
        if minutes < 6:
            return "Medium (3-6 min)"
        return "Long (>6 min)"
    
    elif dimension == ClusterDimension.COMPLEXITY:
        mcs = metrics.MCS
        if mcs > 0.4:
            return "Low (MCS > 0.4)"
        if mcs > 0.2:
            return "Medium (0.2 < MCS ≤ 0.4)"
        return "High (MCS ≤ 0.2)"
    
    elif dimension == ClusterDimension.TOTAL_MU:
        mu = metrics.total_mu or plan.total_mu
        if mu < 500:
            return "Low (<500 MU)"
        if mu < 1000:
            return "Medium (500-1000 MU)"
        return "High (>1000 MU)"
    
    elif dimension == ClusterDimension.MACHINE:
        return plan.treatment_machine_name or "Unknown Machine"
    
    return "Unknown"


def generate_clusters(
    plans_and_metrics: List[Tuple[RTPlan, PlanMetrics]],
    dimension: ClusterDimension
) -> List[ClusterGroup]:
    """
    Generate cluster groups from plans based on a dimension.
    
    Args:
        plans_and_metrics: List of (RTPlan, PlanMetrics) tuples
        dimension: The dimension to cluster by
        
    Returns:
        List of ClusterGroup objects
    """
    cluster_map: dict = {}
    
    # Assign each plan to a cluster
    for idx, (plan, metrics) in enumerate(plans_and_metrics):
        cluster_id = assign_cluster(plan, metrics, dimension)
        if cluster_id not in cluster_map:
            cluster_map[cluster_id] = []
        cluster_map[cluster_id].append(idx)
    
    # Convert to ClusterGroup list
    clusters: List[ClusterGroup] = []
    color_index = 0
    
    # Sort clusters for consistent ordering
    for cluster_id in sorted(cluster_map.keys()):
        plan_indices = cluster_map[cluster_id]
        n_plans = len(plan_indices)
        clusters.append(ClusterGroup(
            id=cluster_id,
            name=cluster_id,
            description=f"{n_plans} plan{'s' if n_plans != 1 else ''}",
            plan_indices=plan_indices,
            color=CLUSTER_COLORS[color_index % len(CLUSTER_COLORS)],
        ))
        color_index += 1
    
    return clusters


def get_cluster_plans(
    plans_and_metrics: List[Tuple[RTPlan, PlanMetrics]],
    cluster: ClusterGroup
) -> List[Tuple[RTPlan, PlanMetrics]]:
    """Get plans belonging to a specific cluster."""
    return [plans_and_metrics[i] for i in cluster.plan_indices]


def get_cluster_percentages(
    clusters: List[ClusterGroup],
    total_plans: int
) -> dict:
    """Calculate cluster percentages."""
    percentages = {}
    for cluster in clusters:
        percentage = (len(cluster.plan_indices) / total_plans * 100) if total_plans > 0 else 0
        percentages[cluster.id] = percentage
    return percentages
