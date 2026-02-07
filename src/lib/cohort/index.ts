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
  generateMultiDimensionalClusters,
  getClusterPlans,
  getClusterPercentages,
  getParentClusters,
  CLUSTER_DIMENSIONS,
  type ClusterDimension,
  type ClusterDimensionInfo,
  type ClusterGroup,
  type ClusterMode,
} from './clustering';

export { 
  calculateCorrelationMatrix, 
  getCorrelationColor,
  getMetricDisplayName,
  interpretCorrelation,
  type CorrelationMatrix,
  type CorrelationResult,
} from './correlation';

export {
  METRIC_GROUPS,
  METRIC_DEFINITIONS,
  getAllMetrics,
  getMetricsForGroup,
  extractMetricValue,
  extractMetricValues,
  getMetricInfo,
  formatMetricValue,
  getMetricColor,
  METRIC_COLORS,
  type MetricGroup,
  type MetricKey,
  type MetricInfo,
} from './metric-utils';
