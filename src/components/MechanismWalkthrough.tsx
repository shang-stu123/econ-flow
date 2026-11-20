import React from 'react';
import { ArrowRight } from 'lucide-react';
import { RODRIK_MECHANISMS, simulateRodrik } from '../models/rodrikModel';
import { Language, RodrikParams, RodrikPresetId } from '../types/simulation';

interface MechanismWalkthroughProps {
  lang: Language;
  activePresetId: RodrikPresetId;
  onApplyMechanism: (presetId: RodrikPresetId, params: RodrikParams) => void;
}

export const MechanismWalkthrough: React.FC<MechanismWalkthroughProps> = ({
  lang,
  activePresetId,
  onApplyMechanism,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-xs text-slate-500 mb-1.5">
          {lang === 'zh'
            ? 'Rodrik (2015) · 核心分析框架'
            : 'Rodrik (2015) · Core Analytical Framework'}
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 font-[var(--font-display)] text-balance">
          {lang === 'zh'
            ? '为什么不能只用一个“去工业化”指标？'
            : 'Why Three Manufacturing Shares Must Be Separated'}
        </h2>
        <p className="mt-2.5 text-sm text-slate-600 leading-relaxed max-w-3xl">
          {lang === 'zh'
            ? '论文将“去工业化”拆解为三项可能背离的指标：制造业就业占比、名义增加值占 GDP 比重、实际增加值占 GDP 比重。就业占比下降可能源于劳动节约型技术进步；名义比重下降可能反映制造品相对价格下跌；唯有实际产出占比收缩，才代表制造业实体规模相对于经济总量萎缩。下面四重机制决定这三条曲线如何分化。'
            : 'Premature deindustrialization separates manufacturing employment share, nominal GDP share, and real GDP share. Employment falls with labor-saving productivity; nominal share falls when relative prices drop; only a declining real share signals physical contraction relative to the economy.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {RODRIK_MECHANISMS.map((mech) => {
          const sim = simulateRodrik(mech.params, 40);
          const first = sim[0];
          const last = sim[sim.length - 1];
          const dEmp = (last.empShare - first.empShare) * 100;
          const dNom = (last.nomShare - first.nomShare) * 100;
          const dReal = (last.realShare - first.realShare) * 100;
          const isActive = activePresetId === mech.id;

          return (
            <div
              key={mech.id}
              className={`bg-white border rounded-xl p-6 flex flex-col justify-between gap-5 transition-colors ${
                isActive ? 'border-sky-600 ring-1 ring-sky-600/20' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {lang === 'zh' ? `机制 ${mech.index}` : `Mechanism ${mech.index}`}
                  </span>
                  <span>{lang === 'zh' ? mech.subtitleZh : mech.subtitleEn}</span>
                </div>

                <h3 className="text-lg font-semibold text-slate-900 text-balance">
                  {lang === 'zh' ? mech.titleZh : mech.titleEn}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {lang === 'zh' ? mech.summaryZh : mech.summaryEn}
                </p>

                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-lg font-mono text-xs text-slate-800 overflow-x-auto">
                  {mech.equation}
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-3 border-t border-slate-100">
                {/* 40-year Simulated Outcome Strip */}
                <div className="grid grid-cols-3 gap-3 text-xs tabular-nums">
                  <div>
                    <div className="text-slate-500">
                      {lang === 'zh' ? '就业占比 40年' : 'Emp Share Δ'}
                    </div>
                    <div
                      className={`font-mono font-semibold text-sm mt-0.5 ${
                        dEmp >= -0.5 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {dEmp >= 0 ? '+' : ''}
                      {dEmp.toFixed(1)} pp
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">
                      {lang === 'zh' ? '名义占比 40年' : 'Nominal Δ'}
                    </div>
                    <div
                      className={`font-mono font-semibold text-sm mt-0.5 ${
                        dNom >= -0.5 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {dNom >= 0 ? '+' : ''}
                      {dNom.toFixed(1)} pp
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">
                      {lang === 'zh' ? '实际占比 40年' : 'Real VA Δ'}
                    </div>
                    <div
                      className={`font-mono font-semibold text-sm mt-0.5 ${
                        dReal >= -0.5 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {dReal >= 0 ? '+' : ''}
                      {dReal.toFixed(1)} pp
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-700">
                    {lang === 'zh' ? mech.keyInsightZh : mech.keyInsightEn}
                  </span>
                  <button
                    type="button"
                    onClick={() => onApplyMechanism(mech.id, mech.params)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-sky-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>
                      {lang === 'zh' ? '载入场域动态推演' : 'Run in Field'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
