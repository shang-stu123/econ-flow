export type Language = 'zh' | 'en';

export type ModelId = 'rodrik' | 'schelling' | 'commons' | 'lewis';

export type AppView = 'field' | 'mechanisms' | 'compare' | 'library';

export type RodrikPresetId =
  | 'custom'
  | 'advanced'
  | 'asian_exporter'
  | 'latam_africa'
  | 'mech1_closed_tfp'
  | 'mech2_open_price'
  | 'mech3_demand_shift'
  | 'mech4_resource_boom';

export interface RodrikParams {
  /** 0 = Large/Closed Economy (domestic market clearing), 1 = Small Open Economy (world price taker) */
  openness: number;
  /** Annual manufacturing productivity growth rate relative to base (e.g., 0.03 = +3%/yr) */
  mfgTfpGrowth: number;
  /** Annual services productivity growth rate (e.g., 0.008 = +0.8%/yr) */
  svcTfpGrowth: number;
  /** Cumulative world manufacturing relative price shock by t=40 (e.g., -0.25 = -25%) */
  worldPriceShock: number;
  /** Initial / structural manufacturing comparative advantage (1.0 = neutral, >1 = strong exporter) */
  comparativeAdvantage: number;
  /** Target long-run service expenditure share (0.50 to 0.82) */
  serviceDemandShare: number;
  /** Primary resource boom intensity (0 = none, 1 = intense resource boom pulling labor & raising non-mfg attractiveness) */
  resourceBoom: number;
  /** Elasticity of substitution between manufactures and services (< 1 means inelastic / complements) */
  elasticitySigma: number;
}

export interface RodrikStep {
  t: number;
  year: number;
  /** Manufacturing productivity index */
  A_M: number;
  /** Services productivity index */
  A_S: number;
  /** World manufacturing relative price */
  p_M_world: number;
  /** Effective domestic manufacturing relative price (p_M / p_S) */
  p_M_rel: number;
  /** Resource/Non-mfg pull factor */
  resourcePull: number;
  /** Share of employment in manufacturing (0-1) */
  empShare: number;
  /** Share of employment in services (0-1) */
  svcEmpShare: number;
  /** Share of employment in primary resources (0-1) */
  resEmpShare: number;
  /** Nominal manufacturing value-added share of GDP (0-1) */
  nomShare: number;
  /** Real manufacturing value-added share of GDP at t=0 constant prices (0-1) */
  realShare: number;
  /** Net manufacturing trade balance as % of GDP (positive = net exporter, negative = net importer) */
  tradeBalance: number;
  /** Real manufacturing output index (t=0 = 100) */
  realMfgOutput: number;
  /** Real GDP index (t=0 = 100) */
  realGdp: number;
  /** Instantaneous labor flow rate into (+) or out of (-) manufacturing (percentage points/yr) */
  laborFlowToMfg: number;
}

export interface MechanismCardInfo {
  id: RodrikPresetId;
  index: string;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  summaryZh: string;
  summaryEn: string;
  keyInsightZh: string;
  keyInsightEn: string;
  equation: string;
  highlightNode: 'mfg' | 'world' | 'demand' | 'resource' | 'all';
  params: RodrikParams;
}

export interface CountryArchetype {
  id: 'advanced' | 'asian_exporter' | 'latam_africa';
  titleZh: string;
  titleEn: string;
  regionTagZh: string;
  regionTagEn: string;
  empTrend: 'down' | 'flat' | 'down_sharp';
  nomTrend: 'down' | 'flat_down' | 'down_sharp';
  realTrend: 'stable_up' | 'resilient' | 'down_sharp';
  mechanismMixZh: string;
  mechanismMixEn: string;
  empiricalNoteZh: string;
  empiricalNoteEn: string;
  params: RodrikParams;
}
