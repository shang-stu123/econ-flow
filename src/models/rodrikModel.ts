import {
  CountryArchetype,
  Language,
  MechanismCardInfo,
  RodrikParams,
  RodrikPresetId,
  RodrikStep,
} from '../types/simulation';

export const DEFAULT_RODRIK_PARAMS: RodrikParams = {
  openness: 0.15,
  mfgTfpGrowth: 0.032,
  svcTfpGrowth: 0.008,
  worldPriceShock: -0.22,
  comparativeAdvantage: 1.02,
  serviceDemandShare: 0.78,
  resourceBoom: 0.0,
  elasticitySigma: 0.50,
};

export const RODRIK_ARCHETYPES: CountryArchetype[] = [
  {
    id: 'advanced',
    titleZh: '发达经济体',
    titleEn: 'Advanced Economies',
    regionTagZh: '北美 · 西欧 · 日本等大型经济体',
    regionTagEn: 'North America · W. Europe · Japan',
    empTrend: 'down',
    nomTrend: 'down',
    realTrend: 'stable_up',
    mechanismMixZh:
      '经济体量较大且具备一定定价影响（低价格接受度），制造业全要素生产率快速增长叠加需求替代弹性 σ < 1，引发劳动节约型结构转型：工人持续流向服务业，相对价格下跌压低名义占比，但实际制造业产出占比保持稳健。',
    mechanismMixEn:
      'Large economies with faster manufacturing productivity growth and inelastic demand (σ < 1): labor steadily exits factories toward services and falling relative prices pull down nominal share, while real manufacturing output share stays resilient.',
    empiricalNoteZh: '就业占比 ▼ · 名义产出 ▼ · 实际产出 ▬/▲',
    empiricalNoteEn: 'Employment ▼ · Nominal VA ▼ · Real VA ▬/▲',
    params: {
      openness: 0.15,
      mfgTfpGrowth: 0.032,
      svcTfpGrowth: 0.008,
      worldPriceShock: -0.22,
      comparativeAdvantage: 1.02,
      serviceDemandShare: 0.78,
      resourceBoom: 0.0,
      elasticitySigma: 0.50,
    },
  },
  {
    id: 'asian_exporter',
    titleZh: '制造品出口型发展中经济体',
    titleEn: 'Mfg-Exporting Developing',
    regionTagZh: '东亚与东南亚制造出口组',
    regionTagEn: 'East & SE Asian Mfg Exporters',
    empTrend: 'flat',
    nomTrend: 'flat_down',
    realTrend: 'resilient',
    mechanismMixZh:
      '虽为小型开放经济体并面对世界制造品相对价格下行，但本国在给定世界价格下具有持续出口的制造品比较优势与较高生产率增速，贸易顺差吸收剩余产能，成功抵御就业与实际产出份额过早萎缩。',
    mechanismMixEn:
      'Despite world price headwinds as small open economies, strong comparative advantage and rapid domestic manufacturing TFP generate net export surpluses that insulate both employment and real output shares.',
    empiricalNoteZh: '就业占比 ▬ · 名义产出 ▼/▬ · 实际产出 ▲',
    empiricalNoteEn: 'Employment ▬ · Nominal VA ▼/▬ · Real VA ▲',
    params: {
      openness: 0.88,
      mfgTfpGrowth: 0.036,
      svcTfpGrowth: 0.010,
      worldPriceShock: -0.18,
      comparativeAdvantage: 1.18,
      serviceDemandShare: 0.71,
      resourceBoom: 0.0,
      elasticitySigma: 0.55,
    },
  },
  {
    id: 'latam_africa',
    titleZh: '其他发展中经济体（非出口/资源型）',
    titleEn: 'Non-Exporting & Resource Developing',
    regionTagZh: '部分拉美 · 撒哈拉以南非洲（剔除毛里求斯）',
    regionTagEn: 'Latin America · Sub-Saharan Africa (excl. Mauritius)',
    empTrend: 'down_sharp',
    nomTrend: 'down_sharp',
    realTrend: 'down_sharp',
    mechanismMixZh:
      '贸易开放后直接按世界价格交易，同时承受三重叠加压力：制造品比较优势偏弱下的进口竞争、全球制造品相对价格下跌输入、以及初级资源繁荣抬高非制造部门吸引力——三项份额在较低收入水平上同步萎缩。',
    mechanismMixEn:
      'Price-taking small open economies lacking manufacturing comparative advantage face import competition, falling global manufacturing prices, and primary resource booms—depressing employment, nominal, and real shares simultaneously.',
    empiricalNoteZh: '就业占比 ▼▼ · 名义产出 ▼▼ · 实际产出 ▼▼',
    empiricalNoteEn: 'Employment ▼▼ · Nominal VA ▼▼ · Real VA ▼▼',
    params: {
      openness: 0.90,
      mfgTfpGrowth: 0.008,
      svcTfpGrowth: 0.010,
      worldPriceShock: -0.26,
      comparativeAdvantage: 0.82,
      serviceDemandShare: 0.75,
      resourceBoom: 0.62,
      elasticitySigma: 0.55,
    },
  },
];

export const RODRIK_MECHANISMS: MechanismCardInfo[] = [
  {
    id: 'mech1_closed_tfp',
    index: '01',
    titleZh: '机制一：制造业生产率提高——就业下降不等于产出下降',
    titleEn: 'Mechanism 1: Mfg Productivity Growth in Large/Closed Economies',
    subtitleZh: '劳动节约型技术进步 · 替代弹性 σ < 1 · 相对价格内生下跌',
    subtitleEn: 'Labor-saving tech progress · Inelastic demand (σ < 1)',
    summaryZh:
      '当封闭或大型经济体中制造业生产率比服务业提高更快时，同样产出只需更少工人。由于制造品需求对相对价格不敏感（σ < 1），价格下跌无法带动足够的需求扩张来吸收富余劳动力，于是工人流向服务业、名义GDP占比下降，但按不变价格衡量的实际产出占比却保持稳定甚至上升。',
    summaryEn:
      'When manufacturing productivity outpaces services in a closed/large economy, fewer workers are needed. With inelastic demand (σ < 1), lower relative prices cannot offset labor savings: employment and nominal shares decline while real manufacturing output share stays stable or rises.',
    keyInsightZh: '封闭经济里，技术进步越快，制造业用工占比越低，但实际产出占比稳健。',
    keyInsightEn: 'In closed economies, faster mfg TFP shrinks mfg jobs while preserving real output share.',
    equation: 'L_M / L_S = (θ_M / θ_S) · (A_M / A_S)^(σ - 1),   σ < 1',
    highlightNode: 'mfg',
    params: {
      openness: 0.08,
      mfgTfpGrowth: 0.036,
      svcTfpGrowth: 0.008,
      worldPriceShock: 0.0,
      comparativeAdvantage: 1.0,
      serviceDemandShare: 0.76,
      resourceBoom: 0.0,
      elasticitySigma: 0.48,
    },
  },
  {
    id: 'mech2_open_price',
    index: '02',
    titleZh: '机制二：贸易开放与世界价格——小型开放经济的传导逆转',
    titleEn: 'Mechanism 2: Trade Openness & World Relative Price Transmission',
    subtitleZh: '价格接受者 · 外部相对价格下跌传入 · 比较优势决定抗压能力',
    subtitleEn: 'Price-taking open economy · Imported global price shock',
    summaryZh:
      '发展中国家近似为小型开放经济体，只能按世界价格交易。此时传导逆转：本国生产率提升反而提高就业与实际产出，但全球技术进步导致的“世界制造品相对价格下跌”会直接输入本国，对缺乏比较优势的本土制造业造成类似负向供给冲击，同步压低就业与实际产出份额。',
    summaryEn:
      'Small open economies take world manufacturing prices as given. Falling global relative prices transmit directly as a negative supply shock to local factories lacking comparative advantage, depressing both employment and real output shares simultaneously.',
    keyInsightZh: '开放经济下，世界相对价格下跌会把“别人的技术进步”变成“本国的去工业化冲击”。',
    keyInsightEn: 'In open economies, global price declines transmit foreign productivity as a local contractionary shock.',
    equation: 'L_M / L_N ∝ ( p_M* · A_M / p_N )^(1 / (1 - α))',
    highlightNode: 'world',
    params: {
      openness: 0.94,
      mfgTfpGrowth: 0.010,
      svcTfpGrowth: 0.010,
      worldPriceShock: -0.32,
      comparativeAdvantage: 0.82,
      serviceDemandShare: 0.74,
      resourceBoom: 0.0,
      elasticitySigma: 0.55,
    },
  },
  {
    id: 'mech3_demand_shift',
    index: '03',
    titleZh: '机制三：需求转变与制造品贸易余额',
    titleEn: 'Mechanism 3: Demand Shifts & Manufacturing Trade Balance',
    subtitleZh: '消费向服务业转移 · 国际市场能否吸收剩余产能',
    subtitleEn: 'Shift toward services · Trade balance absorbs or amplifies',
    summaryZh:
      '若居民需求从制造品转向服务业，封闭经济中的本土制造业会随之收缩；但在小型开放经济中，单纯的本国需求服务化未必压垮制造业，因为厂商可以将多余制成品出口到世界市场（贸易余额改善）。相反，若贸易余额恶化（净进口扩大），则会直接挤出本土制造业份额。',
    summaryEn:
      'A domestic demand shift toward services shrinks manufacturing in a closed economy, but in a small open economy surplus manufactures can be exported abroad—so outcomes hinge on the manufacturing trade balance rather than domestic consumption alone.',
    keyInsightZh: '开放条件下，国内“爱买服务”不必然导致去工业化，关键看贸易余额能否出口剩余产出。',
    keyInsightEn: 'In open economies, domestic service shifts need not shrink factories if exports absorb surplus.',
    equation: 'NX_M = Y_M(p_M*, A_M) − C_M(θ_M, p_M*)',
    highlightNode: 'demand',
    params: {
      openness: 0.85,
      mfgTfpGrowth: 0.030,
      svcTfpGrowth: 0.009,
      worldPriceShock: -0.14,
      comparativeAdvantage: 1.20,
      serviceDemandShare: 0.81,
      resourceBoom: 0.0,
      elasticitySigma: 0.55,
    },
  },
  {
    id: 'mech4_resource_boom',
    index: '04',
    titleZh: '机制四：资源繁荣抬高非制造业相对吸引力',
    titleEn: 'Mechanism 4: Primary Resource Boom & Factor Reallocation',
    subtitleZh: '初级产品价格/生产率上升 · 拉走劳动力与经济活动 · 与贸易冲击叠加',
    subtitleEn: 'Primary commodity boom pulls labor out of manufacturing',
    summaryZh:
      '初级产品繁荣抬高了资源部门及其他非制造部门的相对价格与回报，推动劳动力和资本流出制造业、流向资源与伴生服务部门。若一国原本制造业比较优势较弱，资源繁荣会与全球制成品价格下跌相互叠加，进一步加剧过早去工业化。',
    summaryEn:
      'A primary commodity boom raises relative returns in resource and non-manufacturing sectors, pulling labor out of factories. Combined with weak manufacturing competitiveness and trade shocks, it deepens premature deindustrialization.',
    keyInsightZh: '资源繁荣未必证明在回归中被单独识别，但在机制上会与贸易竞争叠加抽血制造业。',
    keyInsightEn: 'Resource booms pull labor toward non-manufacturing, compounding import competition pressures.',
    equation: 'p_R · A_R ↑  ⇒  w_non-mfg ↑  ⇒  L_M ↓,  Y_M / Y ↓',
    highlightNode: 'resource',
    params: {
      openness: 0.90,
      mfgTfpGrowth: 0.012,
      svcTfpGrowth: 0.010,
      worldPriceShock: -0.22,
      comparativeAdvantage: 0.84,
      serviceDemandShare: 0.74,
      resourceBoom: 0.85,
      elasticitySigma: 0.55,
    },
  },
];

export function simulateRodrik(params: RodrikParams, totalSteps = 40): RodrikStep[] {
  const steps: RodrikStep[] = [];
  const startYear = 1975;

  const {
    openness,
    mfgTfpGrowth,
    svcTfpGrowth,
    worldPriceShock,
    comparativeAdvantage,
    serviceDemandShare,
    resourceBoom,
    elasticitySigma,
  } = params;

  const baseThetaS = 0.75;
  const gFrontier = 0.020;

  for (let t = 0; t <= totalSteps; t++) {
    const phi = t / totalSteps;

    // Productivity trajectories relative to t=0
    const aM = Math.exp(mfgTfpGrowth * t);
    const aS = Math.exp(svcTfpGrowth * t);
    const relProd = aM / aS;

    // World relative price of manufactures (secular frontier trend + global price shock)
    const shockProgress =
      (1 - Math.exp(-2.1 * phi)) / (1 - Math.exp(-2.1));
    const shockFactor = Math.max(0.45, 1 + worldPriceShock * shockProgress);
    const pM_world = Math.max(0.32, Math.exp(-0.0115 * t) * shockFactor);

    // Domestic expenditure share shifting toward services
    const thetaS = baseThetaS + (serviceDemandShare - baseThetaS) * phi;
    const thetaM = Math.max(0.10, 1 - thetaS);

    // Resource boom activation (smooth S-curve peaking in middle-late decades)
    const boomCurve = 1 / (1 + Math.exp(-0.26 * (t - 11)));
    const resourcePull = resourceBoom * boomCurve;

    // --- 1. Closed / Large Economy Equilibrium ---
    // Endogenous domestic relative price clears domestic market
    const pM_dom = 1 / Math.pow(relProd, 0.58);
    // Closed economy employment ratio L_M / L_NM with CES sigma < 1
    const ratioClosed =
      (thetaM / thetaS) *
      Math.pow(relProd, elasticitySigma - 1) *
      (1 / (1 + 0.35 * resourcePull));

    // --- 2. Small Open Economy Equilibrium ---
    // Competitiveness depends on world price shock, comparative advantage, and productivity relative to global frontier
    const relProdVsFrontier = relProd / Math.exp(gFrontier * t);
    const openScore =
      shockFactor *
      comparativeAdvantage *
      Math.pow(relProdVsFrontier, 0.75);
    const nonMfgAttractiveness =
      1 + 0.55 * resourcePull + 0.14 * Math.max(0, thetaS - baseThetaS);
    const ratioOpen =
      0.333 * Math.pow(openScore / nonMfgAttractiveness, 1.25);

    // --- 3. Blended Regime by Trade Openness (0 = Closed/Large, 1 = Small Open) ---
    const ratio = (1 - openness) * ratioClosed + openness * ratioOpen;
    const empShare = Math.min(0.60, Math.max(0.05, ratio / (1 + ratio)));

    // Effective domestic manufacturing relative price
    const pM_rel = (1 - openness) * pM_dom + openness * pM_world;
    const pNM_rel = 1 + 0.25 * resourcePull;

    // Split non-manufacturing employment into Services and Primary Resources
    const nonMfgEmp = 1 - empShare;
    const resFractionWithinNonMfg =
      (0.05 + 0.42 * resourcePull) / (1 + 0.42 * resourcePull);
    const resEmpShare = nonMfgEmp * resFractionWithinNonMfg;
    const svcEmpShare = nonMfgEmp - resEmpShare;

    // Real outputs at t=0 constant prices (p_M,0 = 1, p_NM,0 = 1)
    const effScaleM = 1 + openness * (Math.pow(comparativeAdvantage, 0.25) - 1);
    const yM_real = effScaleM * Math.pow(aM, 0.58) * empShare;
    const yNM_real = Math.pow(aS, 0.58) * (1 + 0.25 * resourcePull) * nonMfgEmp;

    const totalReal = yM_real + yNM_real;
    const realShare = yM_real / totalReal;

    // Nominal GDP shares at current relative prices
    const yM_nom = pM_rel * yM_real;
    const yNM_nom = pNM_rel * yNM_real;
    const nomShare = yM_nom / (yM_nom + yNM_nom);

    // Domestic consumption share of manufactures C_M / Total Nominal Expenditure (CES demand)
    const demandRatio =
      (thetaM / thetaS) * Math.pow(pM_rel / pNM_rel, 1 - elasticitySigma);
    const domMfgSpendShare = demandRatio / (1 + demandRatio);
    // In closed economy (openness = 0), trade balance clears at ~0
    const rawTradeBalance = nomShare - domMfgSpendShare;
    const tradeBalance = openness * rawTradeBalance;

    const prevEmp = steps.length > 0 ? steps[steps.length - 1].empShare : empShare;
    const laborFlowToMfg = (empShare - prevEmp) * 100;

    steps.push({
      t,
      year: startYear + t,
      A_M: aM,
      A_S: aS,
      p_M_world: pM_world,
      p_M_rel: pM_rel,
      resourcePull,
      empShare,
      svcEmpShare,
      resEmpShare,
      nomShare,
      realShare,
      tradeBalance,
      realMfgOutput: (yM_real / (effScaleM * 0.25)) * 100,
      realGdp: (totalReal / 0.85) * 100,
      laborFlowToMfg,
    });
  }

  return steps;
}

export function diagnoseRodrikState(
  params: RodrikParams,
  steps: RodrikStep[],
  lang: Language
): { headline: string; detail: string; regimeLabel: string } {
  const first = steps[0];
  const last = steps[steps.length - 1];

  const dEmp = (last.empShare - first.empShare) * 100;
  const dNom = (last.nomShare - first.nomShare) * 100;
  const dReal = (last.realShare - first.realShare) * 100;

  const isClosed = params.openness < 0.45;
  const regimeLabel = isClosed
    ? lang === 'zh'
      ? '大型 / 封闭定价体制'
      : 'Large / Closed Price Regime'
    : lang === 'zh'
    ? '小型开放价格接受体制'
    : 'Small Open Price-Taking Regime';

  if (isClosed) {
    if (params.mfgTfpGrowth > params.svcTfpGrowth + 0.01 && params.elasticitySigma < 1) {
      return {
        regimeLabel,
        headline:
          lang === 'zh'
            ? '技术进步驱动型去工业化（用工收缩，实际产出稳健）'
            : 'Productivity-Driven Divergence (Jobs Fall, Real Output Holds)',
        detail:
          lang === 'zh'
            ? `由于经济体更接近封闭/自主定价（开放度 ${Math.round(params.openness * 100)}%），制造业高生产率增长与低替代弹性（σ=${params.elasticitySigma.toFixed(2)} < 1）使制成品相对价格内生下跌，工人从工厂流向服务业（就业占比 ${dEmp.toFixed(1)} 个百分点，名义占比 ${dNom.toFixed(1)} 个百分点），但实际产出占比维持在 ${(last.realShare * 100).toFixed(1)}%（${dReal >= 0 ? '+' : ''}${dReal.toFixed(1)} pp）。`
            : `With low price-taking openness (${Math.round(params.openness * 100)}%) and σ=${params.elasticitySigma.toFixed(2)} < 1, faster mfg productivity lowers domestic relative prices. Workers shift to services (employment ${dEmp.toFixed(1)} pp, nominal ${dNom.toFixed(1)} pp), while real output share stays resilient (${dReal >= 0 ? '+' : ''}${dReal.toFixed(1)} pp).`,
      };
    }
    return {
      regimeLabel,
      headline:
        lang === 'zh'
          ? '内需结构主导型演变'
          : 'Domestic Demand & Productivity Balance',
      detail:
        lang === 'zh'
          ? `在封闭定价模式下，国内需求向服务业转移（目标 ${Math.round(params.serviceDemandShare * 100)}%）直接影响本土制造业吸纳能力；制造业就业累计变化 ${dEmp >= 0 ? '+' : ''}${dEmp.toFixed(1)} pp，实际占比变化 ${dReal >= 0 ? '+' : ''}${dReal.toFixed(1)} pp。`
          : `Under domestic market clearing, demand shifting toward services (${Math.round(params.serviceDemandShare * 100)}%) directly shapes factory scale; employment shifts ${dEmp >= 0 ? '+' : ''}${dEmp.toFixed(1)} pp and real share ${dReal >= 0 ? '+' : ''}${dReal.toFixed(1)} pp.`,
    };
  }

  // Small Open Economy diagnostics
  if (params.comparativeAdvantage >= 1.18 && dReal > -1.0) {
    return {
      regimeLabel,
      headline:
        lang === 'zh'
          ? '制造品出口比较优势抵御全球价格下行'
          : 'Export Comparative Advantage Offsets World Price Drop',
      detail:
        lang === 'zh'
          ? `虽然世界制造品相对价格出现 ${Math.round(params.worldPriceShock * 100)}% 冲击，但较高的制造品比较优势（${params.comparativeAdvantage.toFixed(2)}）与本国制造业生产率增速使其在世界价格下仍具竞争力，形成 ${(last.tradeBalance * 100).toFixed(1)}% GDP 的制造品净出口顺差，稳住了就业与实际产出份额。`
          : `Despite a ${Math.round(params.worldPriceShock * 100)}% world price shock, strong comparative advantage (${params.comparativeAdvantage.toFixed(2)}) and domestic TFP sustain a ${(last.tradeBalance * 100).toFixed(1)}% GDP trade surplus, shielding both jobs and real output share.`,
    };
  }

  if (params.resourceBoom >= 0.4) {
    return {
      regimeLabel,
      headline:
        lang === 'zh'
          ? '过早去工业化：外部价格下跌与资源繁荣双重挤压'
          : 'Premature Deindustrialization: Price Shock + Resource Pull',
      detail:
        lang === 'zh'
          ? `作为小型开放经济体，本国一方面被动接受世界制造品价格下跌（${Math.round(params.worldPriceShock * 100)}%），另一方面初级资源繁荣（${Math.round(params.resourceBoom * 100)}%）抬高非制造部门相对回报，双重机制导致劳动力流出制造部门，三项份额同步显著下滑（就业 ${dEmp.toFixed(1)} pp，实际产出 ${dReal.toFixed(1)} pp）。`
          : `As a small open economy, falling world manufacturing prices (${Math.round(params.worldPriceShock * 100)}%) compound with a primary resource boom (${Math.round(params.resourceBoom * 100)}%) that pulls labor into non-manufacturing. Employment (${dEmp.toFixed(1)} pp) and real share (${dReal.toFixed(1)} pp) contract together.`,
    };
  }

  return {
    regimeLabel,
    headline:
      lang === 'zh'
        ? dReal < -2
          ? '小型开放经济体的输入性过早去工业化'
          : '开放贸易下的比较优势竞争平衡'
        : dReal < -2
        ? 'Imported Premature Deindustrialization via Open Trade'
        : 'Open-Economy Competitive Equilibrium',
    detail:
      lang === 'zh'
        ? `在高度开放（${Math.round(params.openness * 100)}%）条件下，世界相对价格冲击（${Math.round(params.worldPriceShock * 100)}%）与比较优势（${params.comparativeAdvantage.toFixed(2)}）共同决定本国制造业存活空间；当前贸易余额占 GDP ${last.tradeBalance >= 0 ? '+' : ''}${(last.tradeBalance * 100).toFixed(1)}%，实际占比变化 ${dReal >= 0 ? '+' : ''}${dReal.toFixed(1)} pp。`
        : `At ${Math.round(params.openness * 100)}% openness, world price shifts (${Math.round(params.worldPriceShock * 100)}%) and comparative advantage (${params.comparativeAdvantage.toFixed(2)}) govern industrial survival; trade balance sits at ${last.tradeBalance >= 0 ? '+' : ''}${(last.tradeBalance * 100).toFixed(1)}% of GDP.`,
  };
}
