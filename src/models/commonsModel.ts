export interface CommonsParams {
  regenRate: number; // natural resource regeneration r (0.15 to 0.75)
  socialSanction: number; // peer reputation / social norm penalty against over-extraction (0 to 1.0)
  policyMonitoring: number; // formal institutional fine / governance (0 to 1.0)
  marketTemptation: number; // external price multiplier tempting over-extraction (0.8 to 2.0)
}

export interface CommonsStep {
  t: number;
  resourceStock: number; // 0 to 1 (carrying capacity = 1)
  cooperatorShare: number; // 0 to 1
  totalExtraction: number;
  socialTrust: number; // 0 to 1
  status: 'sustainable' | 'stressed' | 'collapsed';
}

export const DEFAULT_COMMONS_PARAMS: CommonsParams = {
  regenRate: 0.42,
  socialSanction: 0.38,
  policyMonitoring: 0.25,
  marketTemptation: 1.25,
};

export function simulateCommons(params: CommonsParams, totalSteps = 50): CommonsStep[] {
  const steps: CommonsStep[] = [];
  let R = 0.78;
  let coop = 0.55;
  let trust = 0.50;

  const { regenRate, socialSanction, policyMonitoring, marketTemptation } = params;

  for (let t = 0; t <= totalSteps; t++) {
    const coopExtractRate = 0.22;
    const defectExtractRate = 0.62 * marketTemptation;
    const avgExtract = coop * coopExtractRate + (1 - coop) * defectExtractRate;
    const totalExtraction = avgExtract * R;

    const status: CommonsStep['status'] =
      R < 0.16 ? 'collapsed' : R < 0.45 ? 'stressed' : 'sustainable';

    steps.push({
      t,
      resourceStock: R,
      cooperatorShare: coop,
      totalExtraction,
      socialTrust: trust,
      status,
    });

    // Payoffs for Cooperator vs Defector
    const payoffCoop = coopExtractRate * R * marketTemptation + 0.08 * trust;
    const normPenalty = socialSanction * (0.25 + 0.75 * trust) * 0.42;
    const policyPenalty = policyMonitoring * 0.36;
    const payoffDefect =
      defectExtractRate * R * marketTemptation - normPenalty - policyPenalty;

    // Replicator dynamics (social imitation)
    const diff = payoffCoop - payoffDefect;
    const nextCoop = coop + 0.45 * coop * (1 - coop) * diff;
    coop = Math.max(0.02, Math.min(0.98, nextCoop));

    // Social trust evolves with cooperator share and resource health
    trust = Math.max(0.05, Math.min(0.98, trust * 0.85 + 0.15 * (0.65 * coop + 0.35 * R)));

    // Natural ecological stock logistic growth minus extraction
    const growth = regenRate * R * (1 - R);
    const nextR = R + growth - totalExtraction * 0.48;
    R = Math.max(0.02, Math.min(1.0, nextR));
  }

  return steps;
}
