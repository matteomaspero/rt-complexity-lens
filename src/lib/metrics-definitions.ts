// Centralized metric definitions for UCoMX complexity metrics

export type MetricCategory = 'primary' | 'secondary' | 'accuracy' | 'deliverability' | 'delivery';

export interface MetricDefinition {
  key: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  formula?: string; // LaTeX formula (optional)
  unit: string | null;
  category: MetricCategory;
  reference?: string;
  doi?: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ============================================================================
  // LEVEL 1: PLAN-LEVEL OVERVIEW (First impression metrics)
  // ============================================================================
  MCS: {
    key: 'MCS',
    name: 'Modulation Complexity Score',
    shortDescription: 'Overall plan modulation indicator',
    fullDescription: 'Combines LSV and AAV to quantify overall plan complexity. Values closer to 1 indicate less modulation (simpler plans), while values closer to 0 indicate higher modulation.',
    formula: 'MCS = LSV \\times AAV',
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
    formula: 'LSV = \\frac{\\sum_{j} pos_{max,j} - \\sum_{j}|pos_{A,j} - pos_{B,j}|}{\\sum_{j} pos_{max,j}}',
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
    formula: 'AAV = 1 - \\frac{1}{N-1}\\sum_{i=1}^{N-1}\\left|\\frac{A_{i+1} - A_i}{A_{max}}\\right|',
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
    formula: 'MFA = \\frac{1}{N}\\sum_{i=1}^{N} A_i',
    unit: 'cm²',
    category: 'primary',
  },

  // ============================================================================
  // LEVEL 2: BEAM-LEVEL COMPLEXITY (Detailed modulation analysis)
  // ============================================================================
  LT: {
    key: 'LT',
    name: 'Leaf Travel',
    shortDescription: 'Total MLC leaf movement',
    fullDescription: 'Sum of all individual leaf movements throughout the beam delivery. Higher leaf travel may indicate increased mechanical wear and potential for MLC errors.',
    formula: 'LT = \\sum_{i=1}^{N-1}\\sum_{j=1}^{L}|pos_{j,i+1} - pos_{j,i}|',
    unit: 'mm',
    category: 'secondary',
  },
  
  LTMCS: {
    key: 'LTMCS',
    name: 'Leaf Travel-weighted MCS',
    shortDescription: 'Combined complexity and leaf travel metric',
    fullDescription: 'A composite metric that incorporates both modulation complexity and total leaf travel to provide a more comprehensive complexity assessment.',
    formula: 'LTMCS = \\frac{LT}{MCS}',
    unit: null,
    category: 'secondary',
  },
  
  SAS5: {
    key: 'SAS5',
    name: 'Small Aperture Score (5mm)',
    shortDescription: 'Fraction of small gaps',
    fullDescription: 'The fraction of control points with any leaf gap smaller than 5mm. Higher values indicate more small, complex apertures.',
    unit: null,
    category: 'secondary',
    reference: 'Crowe et al., 2014',
    doi: '10.1007/s13246-014-0274-9',
  },
  
  SAS10: {
    key: 'SAS10',
    name: 'Small Aperture Score (10mm)',
    shortDescription: 'Fraction of moderate gaps',
    fullDescription: 'The fraction of control points with any leaf gap smaller than 10mm. Complementary to SAS5 for aperture complexity assessment.',
    unit: null,
    category: 'secondary',
    reference: 'Crowe et al., 2014',
    doi: '10.1007/s13246-014-0274-9',
  },

  // ============================================================================
  // LEVEL 3: ACCURACY CONCERNS (QA & dosimetric accuracy)
  // ============================================================================
  MAD: {
    key: 'MAD',
    name: 'Mean Asymmetry Distance',
    shortDescription: 'Aperture asymmetry from central axis',
    fullDescription: 'Measures the average deviation of aperture centers from the central axis. Higher values indicate asymmetric field shapes.',
    unit: 'mm',
    category: 'accuracy',
    reference: 'UCoMX v1.1',
  },
  
  LG: {
    key: 'LG',
    name: 'Leaf Gap',
    shortDescription: 'Average gap between opposing leaves',
    fullDescription: 'The mean distance between opposing MLC leaf pairs. Smaller gaps indicate more modulated, higher-risk apertures.',
    unit: 'mm',
    category: 'accuracy',
    reference: 'UCoMX v1.1',
  },
  
  EFS: {
    key: 'EFS',
    name: 'Equivalent Field Size',
    shortDescription: 'Equivalent square field size',
    fullDescription: 'The equivalent square field size calculated using Sterling\'s formula (4 × Area / Perimeter). Useful for scatter factor estimation.',
    formula: 'EFS = \\frac{4 \\times Area}{Perimeter}',
    unit: 'mm',
    category: 'accuracy',
    reference: 'Sterling et al.',
  },
  
  psmall: {
    key: 'psmall',
    name: 'Percentage Small Fields',
    shortDescription: 'Fraction of small apertures',
    fullDescription: 'The fraction of control points with aperture area below 4 cm². Higher values indicate more small-field dosimetry challenges.',
    formula: 'p_{small} = \\frac{N_{A < 4cm^2}}{N_{total}}',
    unit: null,
    category: 'accuracy',
    reference: 'UCoMX v1.1',
  },
  
  PI: {
    key: 'PI',
    name: 'Plan Irregularity',
    shortDescription: 'Deviation from circular aperture',
    fullDescription: 'MU-weighted average deviation of apertures from a circular shape. PI = 1 for perfect circles; higher values indicate more irregular shapes.',
    formula: 'PI = \\frac{Perimeter^2}{4\\pi \\times Area}',
    unit: null,
    category: 'accuracy',
    reference: 'Du et al., 2014',
    doi: '10.1118/1.4861821',
  },
  
  EM: {
    key: 'EM',
    name: 'Edge Metric',
    shortDescription: 'Aperture edge irregularity',
    fullDescription: 'The ratio of MLC edge length to aperture area. Higher values indicate more irregular, jagged aperture boundaries.',
    formula: 'EM = \\frac{Perimeter}{Area}',
    unit: 'mm⁻¹',
    category: 'accuracy',
    reference: 'Younge et al., 2016',
    doi: '10.1120/jacmp.v17i4.6241',
  },
  
  TG: {
    key: 'TG',
    name: 'Tongue-and-Groove Index',
    shortDescription: 'T&G effect exposure',
    fullDescription: 'The fraction of the aperture affected by tongue-and-groove underdosage. Based on adjacent leaf position relationships.',
    unit: null,
    category: 'accuracy',
    reference: 'Deng et al., 2001',
    doi: '10.1088/0031-9155/46/4/313',
  },

  // ============================================================================
  // LEVEL 4: DELIVERY FEASIBILITY (Can the machine deliver this?)
  // ============================================================================
  MUCA: {
    key: 'MUCA',
    name: 'MU per Control Arc',
    shortDescription: 'Average MU per control point',
    fullDescription: 'The average monitor units delivered per control point. Higher values indicate less frequent modulation changes.',
    unit: 'MU/CP',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  LTMU: {
    key: 'LTMU',
    name: 'Leaf Travel per MU',
    shortDescription: 'Leaf movement per MU',
    fullDescription: 'Total leaf travel normalized by monitor units. Indicates MLC activity relative to dose delivered.',
    unit: 'mm/MU',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  LS: {
    key: 'LS',
    name: 'Leaf Speed',
    shortDescription: 'Average MLC leaf speed',
    fullDescription: 'The average MLC leaf movement speed during delivery. Higher speeds may affect positional accuracy.',
    unit: 'mm/s',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  mDRV: {
    key: 'mDRV',
    name: 'Mean Dose Rate Variation',
    shortDescription: 'Average dose rate change',
    fullDescription: 'The mean variation in dose rate between adjacent control points. Higher variation may affect delivery accuracy.',
    unit: 'MU/min',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },

  // ============================================================================
  // LEVEL 5: DELIVERY PARAMETERS (Machine behavior & timing)
  // ============================================================================
  GT: {
    key: 'GT',
    name: 'Gantry Travel',
    shortDescription: 'Total gantry rotation',
    fullDescription: 'The total angular distance traveled by the gantry during arc delivery. Equal to arc length for VMAT beams.',
    unit: '°',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  GS: {
    key: 'GS',
    name: 'Gantry Speed',
    shortDescription: 'Average gantry rotation speed',
    fullDescription: 'The average gantry rotation speed during delivery, calculated as arc length divided by delivery time.',
    unit: 'deg/s',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
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
  
  totalMU: {
    key: 'totalMU',
    name: 'Total Monitor Units',
    shortDescription: 'Total radiation output',
    fullDescription: 'The sum of monitor units across all beams. Higher MU per fraction may indicate more modulated plans.',
    unit: 'MU',
    category: 'delivery',
  },
  
  estimatedDeliveryTime: {
    key: 'estimatedDeliveryTime',
    name: 'Est. Delivery Time',
    shortDescription: 'Estimated beam-on time',
    fullDescription: 'Estimated beam delivery time based on MU, gantry speed, and MLC speed limits. Calculated per beam using machine parameters.',
    unit: 's',
    category: 'delivery',
    reference: 'Park et al., 2014',
    doi: '10.1259/bjr.20140698',
  },

  // ============================================================================
  // LEVEL 6: ADVANCED METRICS (Advanced analysis & research)
  // ============================================================================
  LTNLMU: {
    key: 'LTNLMU',
    name: 'Leaf Travel per Leaf and MU',
    shortDescription: 'Per-leaf movement per MU',
    fullDescription: 'Leaf travel normalized by both number of leaves and MU. Provides machine-independent comparison.',
    unit: 'mm/(leaf·MU)',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  LNA: {
    key: 'LNA',
    name: 'Leaf Travel per Leaf and CA',
    shortDescription: 'Per-leaf movement per CP',
    fullDescription: 'Leaf travel normalized by number of leaves and control points. Indicates average leaf movement per segment.',
    unit: 'mm/(leaf·CP)',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  LTAL: {
    key: 'LTAL',
    name: 'Leaf Travel per Arc Length',
    shortDescription: 'Leaf movement per degree',
    fullDescription: 'Total leaf travel per degree of gantry rotation. Higher values indicate more MLC activity per arc segment.',
    unit: 'mm/°',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  mGSV: {
    key: 'mGSV',
    name: 'Mean Gantry Speed Variation',
    shortDescription: 'Average gantry speed change',
    fullDescription: 'The mean variation in gantry speed between adjacent control points. Higher variation indicates more dynamic delivery.',
    unit: 'deg/s',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  PM: {
    key: 'PM',
    name: 'Plan Modulation',
    shortDescription: 'Degree of modulation',
    fullDescription: 'The complement of MCS (PM = 1 - MCS). Higher values indicate more modulated plans.',
    formula: 'PM = 1 - MCS',
    unit: null,
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  MD: {
    key: 'MD',
    name: 'Modulation Degree',
    shortDescription: 'Fluence-based modulation',
    fullDescription: 'Alternative modulation metric based on fluence variation across the field. Higher values indicate more intensity modulation.',
    unit: null,
    category: 'deliverability',
    reference: 'Heijmen et al.',
  },
  
  MI: {
    key: 'MI',
    name: 'Modulation Index',
    shortDescription: 'Webb modulation index',
    fullDescription: 'Fluence-based modulation metric from Webb 2003. Quantifies the degree of intensity modulation in the treatment plan.',
    unit: null,
    category: 'deliverability',
    reference: 'Webb, 2003',
    doi: '10.1088/0031-9155/48/14/303',
  },
  
  PA: {
    key: 'PA',
    name: 'Plan Area',
    shortDescription: 'Total BEV aperture area',
    fullDescription: 'The total beam\'s eye view aperture area summed across all control points, weighted by meterset.',
    unit: 'cm²',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
  },
  
  JA: {
    key: 'JA',
    name: 'Jaw Area',
    shortDescription: 'Field size defined by jaws',
    fullDescription: 'The field area defined by jaw positions: (X2-X1) × (Y2-Y1). Represents the maximum possible aperture size.',
    unit: 'cm²',
    category: 'deliverability',
    reference: 'UCoMX v1.1',
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
  
  beamMU: {
    key: 'beamMU',
    name: 'Beam Monitor Units',
    shortDescription: 'Beam radiation output',
    fullDescription: 'The monitor units for a specific beam. Represents the relative dose contribution of this beam to the total plan.',
    unit: 'MU',
    category: 'delivery',
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
  
  collimatorAngle: {
    key: 'collimatorAngle',
    name: 'Collimator Angle',
    shortDescription: 'Beam limiting device angle',
    fullDescription: 'The rotation angle of the collimator (beam limiting device) following IEC 61217. 0° = leaves perpendicular to gantry rotation axis.',
    unit: '°',
    category: 'delivery',
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
  accuracy: {
    label: 'Accuracy Metrics',
    description: 'Metrics related to dosimetric accuracy',
  },
  deliverability: {
    label: 'Deliverability Metrics',
    description: 'Metrics related to treatment delivery characteristics',
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
