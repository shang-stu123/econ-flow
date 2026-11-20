import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { CommonsView } from './components/CommonsView';
import { CountryComparison } from './components/CountryComparison';
import { GlobalMap2D } from './components/GlobalMap2D';
import { LewisView } from './components/LewisView';
import { MechanismWalkthrough } from './components/MechanismWalkthrough';
import { RodrikCharts } from './components/RodrikCharts';
import { RodrikFieldCanvas } from './components/RodrikFieldCanvas';
import { SchellingView } from './components/SchellingView';
import {
  DEFAULT_RODRIK_PARAMS,
  diagnoseRodrikState,
  RODRIK_ARCHETYPES,
  RODRIK_MECHANISMS,
  simulateRodrik,
} from './models/rodrikModel';
import {
  AppView,
  Language,
  ModelId,
  RodrikParams,
  RodrikPresetId,
} from './types/simulation';

interface SliderControlProps {
  label: string;
  valueDisplay: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
  minLabel: string;
  maxLabel: string;
  note?: string;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  valueDisplay,
  min,
  max,
  step,
  value,
  onChange,
  minLabel,
  maxLabel,
  note,
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="font-medium text-slate-800">{label}</span>
      <span className="font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap shrink-0">
        {valueDisplay}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full sim-slider"
    />
    <div className="flex items-center justify-between text-[10.5px] text-slate-400">
      <span>{minLabel}</span>
      {note && <span className="text-slate-500">{note}</span>}
      <span>{maxLabel}</span>
    </div>
  </div>
);

export default function App() {
  const [lang, setLang] = useState<Language>('zh');
  const [activeView, setActiveView] = useState<AppView>('field');
  const [activeModel, setActiveModel] = useState<ModelId>('rodrik');
  const [rodrikViewMode, setRodrikViewMode] = useState<'map' | 'circuit'>('map');

  // Rodrik (2015) simulation state
  const [rodrikParams, setRodrikParams] = useState<RodrikParams>(DEFAULT_RODRIK_PARAMS);
  const [activePresetId, setActivePresetId] = useState<RodrikPresetId>('advanced');
  const [showBaseline, setShowBaseline] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(28);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);

  const steps = useMemo(() => simulateRodrik(rodrikParams, 40), [rodrikParams]);
  const baselineSteps = useMemo(
    () => simulateRodrik(DEFAULT_RODRIK_PARAMS, 40),
    []
  );

  const currentStep = steps[Math.min(currentIndex, steps.length - 1)];

  // Documentary time-lapse evolution playback for Rodrik
  useEffect(() => {
    if (!isPlaying || activeView !== 'field' || activeModel !== 'rodrik') return;
    const intervalMs = playbackSpeed === 2 ? 160 : 320;
    const id = window.setInterval(() => {
      setCurrentIndex((prev) => (prev >= steps.length - 1 ? 0 : prev + 1));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [isPlaying, playbackSpeed, steps.length, activeView, activeModel]);

  const diagnosis = useMemo(
    () => diagnoseRodrikState(rodrikParams, steps, lang),
    [rodrikParams, steps, lang]
  );

  const activeMechHighlight = useMemo(() => {
    const found = RODRIK_MECHANISMS.find((m) => m.id === activePresetId);
    return found ? found.highlightNode : null;
  }, [activePresetId]);

  const updateRodrikParam = <K extends keyof RodrikParams>(
    key: K,
    val: RodrikParams[K]
  ) => {
    setActivePresetId('custom');
    setRodrikParams((prev) => ({ ...prev, [key]: val }));
  };

  const applyPreset = (presetId: RodrikPresetId, nextParams: RodrikParams) => {
    setActiveModel('rodrik');
    setActivePresetId(presetId);
    setRodrikParams(nextParams);
    setCurrentIndex(0);
    setIsPlaying(true);
    setActiveView('field');
  };

  const handleResetAll = () => {
    setActiveModel('rodrik');
    setActivePresetId('advanced');
    setRodrikParams(DEFAULT_RODRIK_PARAMS);
    setCurrentIndex(0);
    setIsPlaying(true);
    setActiveView('field');
  };

  const firstStep = steps[0];
  const mfgJobDropPp = (firstStep.empShare - currentStep.empShare) * 100;
  const lowSkillPressure =
    mfgJobDropPp > 6
      ? lang === 'zh'
        ? '高（低技能工人加速流向服务/非正规部门）'
        : 'High (low-skill labor shifting to services)'
      : mfgJobDropPp > 2
      ? lang === 'zh'
        ? '中等（温和结构性岗位替代）'
        : 'Moderate (gradual structural reallocation)'
      : lang === 'zh'
      ? '低（制造业稳健吸纳就业）'
      : 'Low (manufacturing absorbs labor steadily)';

  const libraryCards: {
    id: ModelId;
    disciplineZh: string;
    disciplineEn: string;
    titleZh: string;
    titleEn: string;
    author: string;
    descZh: string;
    descEn: string;
  }[] = [
    {
      id: 'rodrik',
      disciplineZh: '宏观发展经济学 · 国际贸易 · 社会分层',
      disciplineEn: 'Development Economics · Trade · Social Structure',
      titleZh: '过早去工业化与全球价格传导机制',
      titleEn: 'Premature Deindustrialization & Global Price Transmission',
      author: 'Dani Rodrik (2015)',
      descZh:
        '通过“世界市场—开放闸门—国内制造业/服务业/资源部门”上帝视角场域，推演技术进步、世界相对价格下跌、贸易余额与自然资源繁荣如何使就业、名义与实际产出份额分化。',
      descEn:
        'God’s-eye two-sector open-economy field demonstrating how productivity, global price shocks, trade balances, and resource booms diverge employment, nominal, and real shares.',
    },
    {
      id: 'schelling',
      disciplineZh: '社会学 · 微观行动与空间涌现',
      disciplineEn: 'Sociology · Micro Agency & Spatial Emergence',
      titleZh: '城市居住隔离与阈值连锁反应',
      titleEn: 'Spatial Segregation & Threshold Cascades',
      author: 'Thomas Schelling (1971)',
      descZh:
        '追踪二维城市空间内个体行动者的迁徙向量：即使每个居民仅希望周围 35% 邻居与自己相似，温和的微观偏好仍会经连锁迁徙演变为高度隔离的宏观格局。',
      descEn:
        'Tracks household relocation vectors across a 2D urban grid: mild 35% homophily preferences cascade into deeply segregated neighborhoods.',
    },
    {
      id: 'commons',
      disciplineZh: '制度经济学 · 社会规范 · 自然生态耦合',
      disciplineEn: 'Institutional Economics · Social Norms · Ecology',
      titleZh: '公共池塘资源治理与社会规范演化',
      titleEn: 'Governing the Commons & Socio-Ecological Feedback',
      author: 'Elinor Ostrom (1990)',
      descZh:
        '展示人类行动者、外部市场套利诱因、社区声誉规范、制度监管与自然资源再生率之间的动态博弈：系统何时滑向公地悲剧，何时实现自主可持续治理？',
      descEn:
        'Models human extraction choices, market temptation, peer reputation sanctions, formal policy, and natural ecological carrying capacity.',
    },
    {
      id: 'lewis',
      disciplineZh: '二元经济结构 · 人口迁移 · 资本积累',
      disciplineEn: 'Dual-Sector Economy · Migration · Capital Accumulation',
      titleZh: '农村剩余劳动力吸纳与刘易斯拐点',
      titleEn: 'Surplus Labor Absorption & the Lewis Turning Point',
      author: 'W. Arthur Lewis (1954)',
      descZh:
        '动态演示农民向现代工业部门迁徙、工业利润再投资推动资本积累，以及剩余劳动力耗尽后工资曲线陡然上升的临界转折点。',
      descEn:
        'Animates rural-to-urban worker migration, capitalist profit reinvestment, and the exact tipping point where surplus labor runs out and wages surge.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FA] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('field');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 font-[var(--font-display)] whitespace-nowrap shrink-0"
          >
            {lang === 'zh' ? '机理图谱' : 'Mechanism Atlas'}
          </a>

          {/* Zone 2: 4 Single-line Navigation Links */}
          <nav className="flex items-center gap-5 sm:gap-7 text-sm font-medium overflow-x-auto">
            {(
              [
                { id: 'field', zh: '场域推演', en: 'Field Lab' },
                { id: 'mechanisms', zh: '四重机制', en: 'Mechanisms' },
                { id: 'compare', zh: '国别对照', en: 'Archetypes' },
                { id: 'library', zh: '模型库', en: 'Model Library' },
              ] as { id: AppView; zh: string; en: string }[]
            ).map((tab) => {
              const active = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-sky-600 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {lang === 'zh' ? tab.zh : tab.en}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '重置推演' : 'Reset'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {/* Workspace Context Toolbar (Below Header) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div className="flex flex-col gap-0.5">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>
                {activeModel === 'rodrik'
                  ? 'Rodrik (2015) · Premature Deindustrialization'
                  : activeModel === 'schelling'
                  ? 'Schelling (1971) · Micromotives & Macrobehavior'
                  : activeModel === 'commons'
                  ? 'Ostrom (1990) · Governing the Commons'
                  : 'Lewis (1954) · Economic Development with Unlimited Supplies of Labour'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 font-[var(--font-display)] text-balance">
              {activeModel === 'rodrik'
                ? lang === 'zh'
                  ? '过早去工业化：全球贸易、技术进步与社会结构动态推演'
                  : 'Premature Deindustrialization: Global Price, Tech & Labor Dynamics'
                : activeModel === 'schelling'
                ? lang === 'zh'
                  ? '空间隔离机制：微观个体偏好与宏观涌现'
                  : 'Spatial Segregation: Micro Preferences & Macro Emergence'
                : activeModel === 'commons'
                ? lang === 'zh'
                  ? '公共池塘资源：人的行动、社会规范与自然生态平衡'
                  : 'The Commons: Human Agency, Social Norms & Ecological Capacity'
                : lang === 'zh'
                ? '二元经济结构：农村劳动力转移与刘易斯拐点'
                : 'Dual-Sector Economy: Rural Migration & the Lewis Turning Point'}
            </h1>
          </div>

          {/* Right Workspace Utilities: Model Selector + Map/Circuit Switch + Language Switch */}
          <div className="flex flex-wrap items-center gap-2">
            {activeView === 'field' && activeModel === 'rodrik' && (
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRodrikViewMode('map')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    rodrikViewMode === 'map'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'zh' ? '全球地图视角' : 'World Map'}
                </button>
                <button
                  type="button"
                  onClick={() => setRodrikViewMode('circuit')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    rodrikViewMode === 'circuit'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'zh' ? '单国部门流图' : 'Sector Circuit'}
                </button>
              </div>
            )}

            {activeView === 'field' && (
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                {(
                  [
                    { id: 'rodrik', zh: 'Rodrik 去工业化', en: 'Rodrik (2015)' },
                    { id: 'schelling', zh: 'Schelling 隔离', en: 'Schelling' },
                    { id: 'commons', zh: 'Ostrom 公地生态', en: 'Commons' },
                    { id: 'lewis', zh: 'Lewis 拐点', en: 'Lewis' },
                  ] as { id: ModelId; zh: string; en: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveModel(m.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeModel === m.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'zh' ? m.zh : m.en}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center p-1 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setLang('zh')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'zh' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                中文
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  lang === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* VIEW 1: FIELD LAB */}
        {activeView === 'field' && (
          <>
            {activeModel === 'rodrik' && (
              <div className="flex flex-col gap-5">
                {/* Country Archetype & Mechanism Preset Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 mr-1">
                      {lang === 'zh' ? '国家情景预设：' : 'Country Presets:'}
                    </span>
                    {RODRIK_ARCHETYPES.map((arch) => (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => applyPreset(arch.id, arch.params)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          activePresetId === arch.id
                            ? 'bg-sky-50 border-sky-600 text-sky-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {lang === 'zh' ? arch.titleZh : arch.titleEn}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBaseline((b) => !b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      showBaseline
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'zh'
                      ? showBaseline
                        ? '已叠加发达经济体虚线对照'
                        : '显示基准对照线'
                      : showBaseline
                      ? 'Baseline Ghost On'
                      : 'Show Baseline Ghost'}
                  </button>
                </div>

                {/* Two-Zone Sandbox Layout: Left Dominant Visual Stage + Right Parameter & Causal Deck */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left / Top Stage (66%) */}
                  <div className="lg:col-span-8 flex flex-col gap-4">
                    {rodrikViewMode === 'map' ? (
                      <GlobalMap2D
                        params={rodrikParams}
                        activePresetId={activePresetId}
                        currentIndex={currentIndex}
                        isPlaying={isPlaying}
                        playbackSpeed={playbackSpeed}
                        lang={lang}
                        onTogglePlay={() => setIsPlaying((p) => !p)}
                        onResetTimeline={() => {
                          setCurrentIndex(0);
                          setIsPlaying(true);
                        }}
                        onSeekIndex={(idx) => {
                          setIsPlaying(false);
                          setCurrentIndex(idx);
                        }}
                        onChangeSpeed={setPlaybackSpeed}
                        onApplyPreset={applyPreset}
                      />
                    ) : (
                      <RodrikFieldCanvas
                        params={rodrikParams}
                        currentStep={currentStep}
                        currentIndex={currentIndex}
                        totalSteps={steps.length - 1}
                        isPlaying={isPlaying}
                        playbackSpeed={playbackSpeed}
                        onTogglePlay={() => setIsPlaying((p) => !p)}
                        onResetTimeline={() => {
                          setCurrentIndex(0);
                          setIsPlaying(true);
                        }}
                        onSeekIndex={(idx) => {
                          setIsPlaying(false);
                          setCurrentIndex(idx);
                        }}
                        onChangeSpeed={setPlaybackSpeed}
                        lang={lang}
                        highlightNode={activeMechHighlight}
                      />
                    )}

                    <RodrikCharts
                      steps={steps}
                      baselineSteps={showBaseline ? baselineSteps : undefined}
                      currentIndex={currentIndex}
                      onSelectIndex={(idx) => {
                        setIsPlaying(false);
                        setCurrentIndex(idx);
                      }}
                      lang={lang}
                    />
                  </div>

                  {/* Right Control & Causal Deduction Deck (34%) */}
                  <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Live Causal Diagnosis Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-2.5">
                      <div className="text-xs font-medium text-sky-700">
                        {diagnosis.regimeLabel}
                      </div>
                      <h2 className="text-base font-semibold text-slate-900 leading-snug">
                        {diagnosis.headline}
                      </h2>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {diagnosis.detail}
                      </p>

                      {/* Sociological & Labor Stratification Readout */}
                      <div className="mt-1 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">
                            {lang === 'zh' ? '低技能就业挤压与社会流动' : 'Low-Skill Labor Pressure'}
                          </span>
                        </div>
                        <div className="font-medium text-slate-800">{lowSkillPressure}</div>
                      </div>
                    </div>

                    {/* Interactive Parameter Sliders */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {lang === 'zh' ? '机制变量实时调节' : 'Mechanism Parameters'}
                        </h3>
                        <span className="text-[11px] text-slate-500">
                          {lang === 'zh' ? '拖动即时重算场域' : 'Live equilibrium'}
                        </span>
                      </div>

                      <SliderControl
                        label={
                          lang === 'zh'
                            ? '1. 贸易开放度 / 价格接受权重 (τ)'
                            : '1. Trade Openness / Price-Taking (τ)'
                        }
                        valueDisplay={`${Math.round(rodrikParams.openness * 100)}%`}
                        min={0}
                        max={1}
                        step={0.02}
                        value={rodrikParams.openness}
                        onChange={(v) => updateRodrikParam('openness', v)}
                        minLabel={lang === 'zh' ? '0% 封闭/大型' : '0% Closed/Large'}
                        maxLabel={lang === 'zh' ? '100% 小型开放' : '100% Small Open'}
                      />

                      <SliderControl
                        label={
                          lang === 'zh'
                            ? '2. 制造业技术进步率 (g_M)'
                            : '2. Mfg Productivity Growth (g_M)'
                        }
                        valueDisplay={`+${(rodrikParams.mfgTfpGrowth * 100).toFixed(1)}%/yr`}
                        min={0}
                        max={0.045}
                        step={0.002}
                        value={rodrikParams.mfgTfpGrowth}
                        onChange={(v) => updateRodrikParam('mfgTfpGrowth', v)}
                        minLabel="0.0%"
                        maxLabel="+4.5%/yr"
                      />

                      <SliderControl
                        label={
                          lang === 'zh'
                            ? '3. 世界制造品相对价格冲击 (Δp_M*)'
                            : '3. World Mfg Price Shock (Δp_M*)'
                        }
                        valueDisplay={`${rodrikParams.worldPriceShock >= 0 ? '+' : ''}${Math.round(
                          rodrikParams.worldPriceShock * 100
                        )}%`}
                        min={-0.4}
                        max={0.2}
                        step={0.02}
                        value={rodrikParams.worldPriceShock}
                        onChange={(v) => updateRodrikParam('worldPriceShock', v)}
                        minLabel="-40%"
                        maxLabel="+20%"
                      />

                      <SliderControl
                        label={
                          lang === 'zh'
                            ? '4. 制造业出口比较优势 (A_M0)'
                            : '4. Mfg Comparative Advantage'
                        }
                        valueDisplay={rodrikParams.comparativeAdvantage.toFixed(2)}
                        min={0.55}
                        max={1.6}
                        step={0.02}
                        value={rodrikParams.comparativeAdvantage}
                        onChange={(v) => updateRodrikParam('comparativeAdvantage', v)}
                        minLabel={lang === 'zh' ? '0.55 弱优势' : '0.55 Weak'}
                        maxLabel={lang === 'zh' ? '1.60 强出口' : '1.60 Strong'}
                      />

                      <SliderControl
                        label={
                          lang === 'zh'
                            ? '5. 社会消费向服务业转移 (θ_S)'
                            : '5. Demand Shift to Services (θ_S)'
                        }
                        valueDisplay={`${Math.round(rodrikParams.serviceDemandShare * 100)}%`}
                        min={0.5}
                        max={0.82}
                        step={0.02}
                        value={rodrikParams.serviceDemandShare}
                        onChange={(v) => updateRodrikParam('serviceDemandShare', v)}
                        minLabel="50%"
                        maxLabel="82%"
                      />

                      <SliderControl
                        label={
                          lang === 'zh'
                            ? '6. 初级自然资源繁荣度 (B_R)'
                            : '6. Primary Resource Boom (B_R)'
                        }
                        valueDisplay={`${Math.round(rodrikParams.resourceBoom * 100)}%`}
                        min={0}
                        max={1}
                        step={0.05}
                        value={rodrikParams.resourceBoom}
                        onChange={(v) => updateRodrikParam('resourceBoom', v)}
                        minLabel={lang === 'zh' ? '0% 无繁荣' : '0% None'}
                        maxLabel={lang === 'zh' ? '100% 强荷兰病' : '100% Boom'}
                      />

                      <SliderControl
                        label={
                          lang === 'zh'
                            ? '7. 产品需求替代弹性 (σ)'
                            : '7. Elasticity of Substitution (σ)'
                        }
                        valueDisplay={rodrikParams.elasticitySigma.toFixed(2)}
                        min={0.3}
                        max={1.3}
                        step={0.05}
                        value={rodrikParams.elasticitySigma}
                        onChange={(v) => updateRodrikParam('elasticitySigma', v)}
                        minLabel="0.30"
                        note={
                          rodrikParams.elasticitySigma < 1
                            ? lang === 'zh'
                              ? 'σ < 1 互补品'
                              : 'σ < 1 inelastic'
                            : lang === 'zh'
                            ? 'σ ≥ 1 替代品'
                            : 'σ ≥ 1 elastic'
                        }
                        maxLabel="1.30"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeModel === 'schelling' && <SchellingView lang={lang} />}
            {activeModel === 'commons' && <CommonsView lang={lang} />}
            {activeModel === 'lewis' && <LewisView lang={lang} />}
          </>
        )}

        {/* VIEW 2: FOUR MECHANISMS STEPPER */}
        {activeView === 'mechanisms' && (
          <MechanismWalkthrough
            lang={lang}
            activePresetId={activePresetId}
            onApplyMechanism={applyPreset}
          />
        )}

        {/* VIEW 3: COUNTRY ARCHETYPES COMPARISON */}
        {activeView === 'compare' && (
          <CountryComparison lang={lang} onLoadArchetype={applyPreset} />
        )}

        {/* VIEW 4: SOCIAL SCIENCE MECHANISM LIBRARY */}
        {activeView === 'library' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="text-xs text-slate-500 mb-1">
                {lang === 'zh'
                  ? '跨学科机制模型库 · 经济学 × 社会学 × 生态环境'
                  : 'Cross-Disciplinary Library · Economics × Sociology × Ecology'}
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 font-[var(--font-display)] text-balance">
                {lang === 'zh'
                  ? '把论文底层的抽象逻辑转化为可推演的动态场域'
                  : 'Turn Abstract Social Science Mechanisms Into Living Spatial Fields'}
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
                {lang === 'zh'
                  ? '选择一个经典理论模型，系统将切换至对应的上帝视角场域，通过人流、资金、价格波纹与环境反馈展示微观行动如何涌现为宏观结果。'
                  : 'Select a foundational theory to inspect its dynamic field, directional actor/capital flows, and real-time parameter sensitivities.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {libraryCards.map((card) => {
                const isSelected = activeModel === card.id;
                return (
                  <div
                    key={card.id}
                    className={`bg-white border rounded-xl p-6 flex flex-col justify-between gap-4 transition-colors ${
                      isSelected ? 'border-sky-600 ring-1 ring-sky-600/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{lang === 'zh' ? card.disciplineZh : card.disciplineEn}</span>
                        <span className="font-mono text-slate-700">{card.author}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {lang === 'zh' ? card.titleZh : card.titleEn}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {lang === 'zh' ? card.descZh : card.descEn}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveModel(card.id);
                          setActiveView('field');
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-sky-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>
                          {lang === 'zh' ? '进入上帝视角推演' : 'Open Field Simulation'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
