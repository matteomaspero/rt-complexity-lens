export { 
  calculateExtendedStatistics, 
  getBoxPlotData, 
  formatExtendedStat,
  type ExtendedStatistics,
  type BoxPlotData,
} from './extended-statistics';

export { 
  assignCluster, 
  generateClusters, 
  getClusterPlans,
  getClusterPercentages,
  CLUSTER_DIMENSIONS,
  type ClusterDimension,
  type ClusterDimensionInfo,
  type ClusterGroup,
} from './clustering';

export { 
  calculateCorrelationMatrix, 
  getCorrelationColor,
  getMetricDisplayName,
  interpretCorrelation,
  type CorrelationMatrix,
  type CorrelationResult,
} from './correlation';
