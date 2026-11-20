import React from 'react';
import { ArrowRight } from 'lucide-react';
import { RODRIK_ARCHETYPES, simulateRodrik } from '../models/rodrikModel';
import { Language, RodrikParams, RodrikPresetId } from '../types/simulation';

interface CountryComparisonProps {
  lang: Language;
  onLoadArchetype: (id: RodrikPresetId, params: RodrikParams) => void;
}

export const CountryComparison: React.FC<CountryComparisonProps> = ({
  lang,
  onLoadArchetype,
}) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-xs text-slate-500 mb-1.5">
          {lang === 'zh'
            ? '国别比较 · 体制差异决定机制传导方向'
            : 'Cross-Country Comparison · Regime Shapes Transmission'}
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 font-[var(--font-display)] text-balance">
          {lang === 'zh'
            ? '三类国家 40 年演化轨迹对比'
            : 'Three Country Archetypes: 40-Year Divergence'}
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl leading-relaxed">
          {lang === 'zh'
            ? '最准确的概括不是“发达国家靠技术、发展中国家靠价格”，而是：技术进步、世界相对价格、贸易位置、需求转变与资源冲击相互叠加，其对就业与实际产出份额的影响取决于经济体规模与开放程度。'
            : 'Rather than a simple technology-vs-price split, productivity, relative prices, trade position, demand shifts, and resource booms interact—and their impact depends on whether an economy is large/closed or small/open.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {RODRIK_ARCHETYPES.map((arch) => {
          const steps = simulateRodrik(arch.params, 40);
          const first = steps[0];
          const last = steps[steps.length - 1];

          const w = 320;
          const h = 140;
          const pad = { t: 12, r: 12, b: 22, l: 34 };
          const pw = w - pad.l - pad.r;
          const ph = h - pad.t - pad.b;
          const toX = (i: number) => pad.l + (i / 40) * pw;
          const toY = (v: number) => pad.t + (1 - Math.min(0.48, Math.max(0, v)) / 0.48) * ph;

          const mkPath = (acc: (s: typeof steps[number]) => number) =>
            steps.map((s, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(acc(s)).toFixed(1)}`).join(' ');

          return (
            <div
              key={arch.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-2">
                <div className="text-xs text-slate-500">
                  {lang === 'zh' ? arch.regionTagZh : arch.regionTagEn}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {lang === 'zh' ? arch.titleZh : arch.titleEn}
                </h3>
                <div className="text-xs font-mono text-slate-700">
                  {lang === 'zh' ? arch.empiricalNoteZh : arch.empiricalNoteEn}
                </div>
              </div>

              {/* Mini Trajectory SVG */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
                  {[0.1, 0.2, 0.3, 0.4].map((tick) => (
                    <g key={tick}>
                      <line
                        x1={pad.l}
                        y1={toY(tick)}
                        x2={w - pad.r}
                        y2={toY(tick)}
                        stroke="#e2e8f0"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={pad.l - 5}
                        y={toY(tick) + 3}
                        textAnchor="end"
                        className="fill-slate-400 text-[9px] font-mono"
                      >
                        {Math.round(tick * 100)}%
                      </text>
                    </g>
                  ))}
                  {[0, 20, 40].map((idx) => (
                    <text
                      key={idx}
                      x={toX(idx)}
                      y={h - 5}
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      {1975 + idx}
                    </text>
                  ))}
                  <path
                    d={mkPath((s) => s.realShare)}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth={2.2}
                  />
                  <path
                    d={mkPath((s) => s.nomShare)}
                    fill="none"
                    stroke="#d97706"
                    strokeWidth={1.8}
                    strokeDasharray="4 2"
                  />
                  <path
                    d={mkPath((s) => s.empShare)}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={2}
                  />
                </svg>
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1 tabular-nums">
                  <span>
                    {lang === 'zh' ? '就业' : 'Emp'}:{' '}
                    <strong className="font-mono text-sky-700">
                      {(first.empShare * 100).toFixed(0)}%→{(last.empShare * 100).toFixed(0)}%
                    </strong>
                  </span>
                  <span>
                    {lang === 'zh' ? '名义' : 'Nom'}:{' '}
                    <strong className="font-mono text-amber-700">
                      {(first.nomShare * 100).toFixed(0)}%→{(last.nomShare * 100).toFixed(0)}%
                    </strong>
                  </span>
                  <span>
                    {lang === 'zh' ? '实际' : 'Real'}:{' '}
                    <strong className="font-mono text-slate-900">
                      {(first.realShare * 100).toFixed(0)}%→{(last.realShare * 100).toFixed(0)}%
                    </strong>
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'zh' ? arch.mechanismMixZh : arch.mechanismMixEn}
              </p>

              <button
                type="button"
                onClick={() => onLoadArchetype(arch.id, arch.params)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-sky-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>
                  {lang === 'zh' ? '载入此国别情景到动态场域' : 'Load into Dynamic Field'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
