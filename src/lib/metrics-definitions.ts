// Centralized metric definitions for UCoMX complexity metrics

export type MetricCategory = 'primary' | 'secondary' | 'delivery';

export interface MetricDefinition {
  key: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  unit: string | null;
  category: MetricCategory;
  reference?: string;
  doi?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  MCS: {
    key: 'MCS',
    name: 'Modulation Complexity Score',
    shortDescription: 'Overall plan modulation indicator',
    fullDescription: 'Combines LSV and AAV to quantify overall plan complexity. Values closer to 1 indicate less modulation (simpler plans), while values closer to 0 indicate higher modulation.',
    unit: null,
    category: 'primary',
    reference: 'McNiven et al., 2010',
    doi: '10.1118/1.3276775',
  },
  LSV: {
    key: 'LSV',
    name: 'Leaf Sequence Variability',
    shortDescription: 'Variability in leaf positions',
    fullDescription: 'Measures the variation in MLC leaf positions between adjacent leaves. Higher values indicate more uniform apertures; lower values suggest more irregular shapes.',
    unit: null,
    category: 'primary',
    reference: 'Masi et al., 2013',
    doi: '10.1118/1.4810969',
  },
  AAV: {
    key: 'AAV',
    name: 'Aperture Area Variability',
    shortDescription: 'Changes in aperture area between control points',
    fullDescription: 'Quantifies the relative change in aperture area across control points. Higher variability indicates more dynamic aperture changes during delivery.',
    unit: null,
    category: 'primary',
    reference: 'Masi et al., 2013',
    doi: '10.1118/1.4810969',
  },
  MFA: {
    key: 'MFA',
    name: 'Mean Field Area',
    shortDescription: 'Average aperture size',
    fullDescription: 'The average area of the MLC aperture across all control points. Smaller apertures are generally associated with higher complexity and delivery challenges.',
    unit: 'cm²',
    category: 'primary',
  },
  LT: {
    key: 'LT',
    name: 'Leaf Travel',
    shortDescription: 'Total MLC leaf movement',
    fullDescription: 'Sum of all individual leaf movements throughout the beam delivery. Higher leaf travel may indicate increased mechanical wear and potential for MLC errors.',
    unit: 'mm',
    category: 'secondary',
  },
  LTMCS: {
    key: 'LTMCS',
    name: 'Leaf Travel-weighted MCS',
    shortDescription: 'Combined complexity and leaf travel metric',
    fullDescription: 'A composite metric that incorporates both modulation complexity and total leaf travel to provide a more comprehensive complexity assessment.',
    unit: null,
    category: 'secondary',
  },
  totalMU: {
    key: 'totalMU',
    name: 'Total Monitor Units',
    shortDescription: 'Total radiation output',
    fullDescription: 'The sum of monitor units across all beams. Higher MU per fraction may indicate more modulated plans.',
    unit: 'MU',
    category: 'delivery',
  },
  beamMU: {
    key: 'beamMU',
    name: 'Beam Monitor Units',
    shortDescription: 'Beam radiation output',
    fullDescription: 'The monitor units for a specific beam. Represents the relative dose contribution of this beam to the total plan.',
    unit: 'MU',
    category: 'delivery',
  },
  arcLength: {
    key: 'arcLength',
    name: 'Arc Length',
    shortDescription: 'Gantry rotation span',
    fullDescription: 'The total angular distance traveled by the gantry during arc delivery. Longer arcs may provide better dose conformity but require more precise delivery.',
    unit: '°',
    category: 'delivery',
  },
  numberOfControlPoints: {
    key: 'numberOfControlPoints',
    name: 'Control Points',
    shortDescription: 'Number of delivery segments',
    fullDescription: 'The number of discrete control points in the beam. More control points allow finer modulation but increase delivery complexity.',
    unit: null,
    category: 'delivery',
  },
  // Delivery time metrics
  estimatedDeliveryTime: {
    key: 'estimatedDeliveryTime',
    name: 'Est. Delivery Time',
    shortDescription: 'Estimated beam-on time',
    fullDescription: 'Estimated beam delivery time based on MU, gantry speed, and MLC speed limits. Calculated per beam using machine parameters.',
    unit: 's',
    category: 'delivery',
    reference: 'Park et al., 2015',
    doi: '10.1259/bjr.20150040',
  },
  totalDeliveryTime: {
    key: 'totalDeliveryTime',
    name: 'Total Delivery Time',
    shortDescription: 'Sum of beam delivery times',
    fullDescription: 'The sum of estimated delivery times across all beams in the plan.',
    unit: 's',
    category: 'delivery',
  },
  MUperDegree: {
    key: 'MUperDegree',
    name: 'MU per Degree',
    shortDescription: 'Average MU per degree of arc',
    fullDescription: 'The average monitor units delivered per degree of gantry rotation. Higher values indicate more modulation per angular segment.',
    unit: 'MU/°',
    category: 'delivery',
    reference: 'Miura et al., 2014',
  },
  avgDoseRate: {
    key: 'avgDoseRate',
    name: 'Avg Dose Rate',
    shortDescription: 'Average delivery dose rate',
    fullDescription: 'The average dose rate during beam delivery, considering gantry speed and MLC limitations.',
    unit: 'MU/min',
    category: 'delivery',
  },
  avgMLCSpeed: {
    key: 'avgMLCSpeed',
    name: 'Avg MLC Speed',
    shortDescription: 'Average leaf movement speed',
    fullDescription: 'The average MLC leaf speed during delivery. Higher speeds may affect positional accuracy.',
    unit: 'mm/s',
    category: 'delivery',
  },
  collimatorAngle: {
    key: 'collimatorAngle',
    name: 'Collimator Angle',
    shortDescription: 'Beam limiting device angle',
    fullDescription: 'The rotation angle of the collimator (beam limiting device) following IEC 61217. 0° = leaves perpendicular to gantry rotation axis.',
    unit: '°',
    category: 'delivery',
  },
  // Additional complexity metrics
  SAS5: {
    key: 'SAS5',
    name: 'Small Aperture Score (5mm)',
    shortDescription: 'Fraction of small gaps',
    fullDescription: 'The fraction of control points with any leaf gap smaller than 5mm. Higher values indicate more small, complex apertures.',
    unit: null,
    category: 'secondary',
    reference: 'Crowe et al., 2014',
    doi: '10.1007/s13246-014-0271-5',
  },
  SAS10: {
    key: 'SAS10',
    name: 'Small Aperture Score (10mm)',
    shortDescription: 'Fraction of moderate gaps',
    fullDescription: 'The fraction of control points with any leaf gap smaller than 10mm. Complementary to SAS5 for aperture complexity assessment.',
    unit: null,
    category: 'secondary',
    reference: 'Crowe et al., 2014',
    doi: '10.1007/s13246-014-0271-5',
  },
  EM: {
    key: 'EM',
    name: 'Edge Metric',
    shortDescription: 'Aperture edge irregularity',
    fullDescription: 'The ratio of MLC edge length to aperture area. Higher values indicate more irregular, jagged aperture boundaries.',
    unit: 'mm⁻¹',
    category: 'secondary',
    reference: 'Younge et al., 2016',
    doi: '10.1120/jacmp.v17i4.6241',
  },
  PI: {
    key: 'PI',
    name: 'Plan Irregularity',
    shortDescription: 'Deviation from circular aperture',
    fullDescription: 'MU-weighted average deviation of apertures from a circular shape. PI = 1 for perfect circles; higher values indicate more irregular shapes.',
    unit: null,
    category: 'secondary',
    reference: 'Du et al., 2014',
    doi: '10.1118/1.4861821',
  },
};

export const METRIC_CATEGORIES: Record<MetricCategory, { label: string; description: string }> = {
  primary: {
    label: 'Primary Complexity',
    description: 'Core UCoMX modulation metrics',
  },
  secondary: {
    label: 'Secondary Metrics',
    description: 'Derived and aperture-based complexity metrics',
  },
  delivery: {
    label: 'Delivery Parameters',
    description: 'MU, timing, and delivery characteristics',
  },
};

export function getMetricsByCategory(category: MetricCategory): MetricDefinition[] {
  return Object.values(METRIC_DEFINITIONS).filter((m) => m.category === category);
}

export function getAllMetricKeys(): string[] {
  return Object.keys(METRIC_DEFINITIONS);
}
