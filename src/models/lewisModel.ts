export interface LewisParams {
  /** Initial surplus rural labor fraction (0.45 to 0.85) */
  initialRuralShare: number;
  /** Capitalist profit reinvestment propensity (0.2 to 0.9) */
  reinvestmentRate: number;
  /** Modern sector TFP growth rate (0.005 to 0.04) */
  modernTfpGrowth: number;
  /** Subsistence wage floor in agriculture (0.8 to 1.6) */
  subsistenceWage: number;
}

export interface LewisStep {
  t: number;
  year: number;
  ruralLaborShare: number;
  modernLaborShare: number;
  capitalStock: number;
  modernWage: number;
  ruralWage: number;
  profitShareOfModern: number;
  migrationFlow: number; // % of labor force moving rural -> urban this step
  passedTurningPoint: boolean;
}

export const DEFAULT_LEWIS_PARAMS: LewisParams = {
  initialRuralShare: 0.78,
  reinvestmentRate: 0.65,
  modernTfpGrowth: 0.02,
  subsistenceWage: 1.0,
};

export function simulateLewis(params: LewisParams, totalSteps = 45): {
  steps: LewisStep[];
  turningPointStep: number | null;
} {
  const steps: LewisStep[] = [];
  const {
    initialRuralShare,
    reinvestmentRate,
    modernTfpGrowth,
    subsistenceWage,
  } = params;

  const alpha = 0.42; // capital share in modern Cobb-Douglas: Y_M = A_M * K^alpha * L_M^(1-alpha)
  const wBar = subsistenceWage * 1.18; // institutional urban wage = subsistence + urban premium
  const minRuralCore = 0.14; // core commercialized agriculture floor where MPL rises sharply

  let capital = 0.22;
  let turningPointStep: number | null = null;
  let prevModernShare = 1 - initialRuralShare;

  for (let t = 0; t <= totalSteps; t++) {
    const aM = 1.65 * Math.exp(modernTfpGrowth * t);
    // Demand for modern labor at institutional wage wBar:
    // MPL_M = (1 - alpha) * aM * (K / L_M)^alpha = wBar
    // => L_M_demand = K * ((1 - alpha) * aM / wBar)^(1 / alpha)
    const desiredModernLabor =
      capital * Math.pow(((1 - alpha) * aM) / wBar, 1 / alpha);

    const maxAvailableModern = 1 - minRuralCore;
    let modernLaborShare = Math.min(0.86, Math.max(0.12, desiredModernLabor));
    let passedTurningPoint = false;
    let modernWage = wBar;
    let ruralWage = subsistenceWage;

    if (desiredModernLabor >= maxAvailableModern) {
      passedTurningPoint = true;
      if (turningPointStep === null) turningPointStep = t;
      // Surplus labor exhausted! Modern wage rises along marginal product of labor
      const excessDemand = desiredModernLabor - maxAvailableModern;
      modernLaborShare = Math.min(0.88, maxAvailableModern + excessDemand * 0.08);
      modernWage =
        (1 - alpha) * aM * Math.pow(capital / modernLaborShare, alpha);
      ruralWage = modernWage / 1.18;
    }

    const ruralLaborShare = 1 - modernLaborShare;
    const outputModern =
      aM * Math.pow(capital, alpha) * Math.pow(modernLaborShare, 1 - alpha);
    const wageBill = modernWage * modernLaborShare;
    const profits = Math.max(0, outputModern - wageBill);
    const profitShareOfModern = outputModern > 0 ? profits / outputModern : 0;

    const migrationFlow =
      t === 0 ? 0 : Math.max(0, (modernLaborShare - prevModernShare) * 100);
    prevModernShare = modernLaborShare;

    steps.push({
      t,
      year: 1960 + t,
      ruralLaborShare,
      modernLaborShare,
      capitalStock: capital,
      modernWage,
      ruralWage,
      profitShareOfModern,
      migrationFlow,
      passedTurningPoint,
    });

    // Capital accumulation: K_{t+1} = (1 - delta) * K_t + s * profits
    capital = capital * 0.94 + reinvestmentRate * profits * 0.52;
  }

  return { steps, turningPointStep };
}
