import React, { useMemo, useState } from 'react';
import { Language, RodrikStep } from '../types/simulation';

interface RodrikChartsProps {
  steps: RodrikStep[];
  baselineSteps?: RodrikStep[];
  currentIndex: number;
  onSelectIndex: (idx: number) => void;
  lang: Language;
}

export const RodrikCharts: React.FC<RodrikChartsProps> = ({
  steps,
  baselineSteps,
  currentIndex,
  onSelectIndex,
  lang,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const activeIdx = hoverIdx !== null ? hoverIdx : currentIndex;
  const activeStep = steps[activeIdx] || steps[0];
  const firstStep = steps[0];

  const width = 560;
  const height = 210;
  const pad = { top: 18, right: 20, bottom: 28, left: 42 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const yMaxShare = 0.45; // 45% max share for crisp legibility

  const toX = (i: number) =>
    pad.left + (i / Math.max(1, steps.length - 1)) * plotW;
  const toYShare = (val: number) =>
    pad.top + (1 - Math.min(yMaxShare, Math.max(0, val)) / yMaxShare) * plotH;

  const buildPath = (
    arr: RodrikStep[],
    accessor: (s: RodrikStep) => number,
    yFn: (v: number) => number
  ) =>
    arr
      .map(
        (s, i) =>
          `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${yFn(accessor(s)).toFixed(1)}`
      )
      .join(' ');

  const paths = useMemo(
    () => ({
      emp: buildPath(steps, (s) => s.empShare, toYShare),
      nom: buildPath(steps, (s) => s.nomShare, toYShare),
      real: buildPath(steps, (s) => s.realShare, toYShare),
      baseEmp: baselineSteps
        ? buildPath(baselineSteps, (s) => s.empShare, toYShare)
        : null,
      baseReal: baselineSteps
        ? buildPath(baselineSteps, (s) => s.realShare, toYShare)
        : null,
    }),
    [steps, baselineSteps]
  );

  // Secondary chart: Trade Balance (-15% to +15%) and Relative Price (0.3 to 1.2)
  const w2 = 420;
  const h2 = 210;
  const pad2 = { top: 18, right: 44, bottom: 28, left: 44 };
  const plotW2 = w2 - pad2.left - pad2.right;
  const plotH2 = h2 - pad2.top - pad2.bottom;
  const toX2 = (i: number) =>
    pad2.left + (i / Math.max(1, steps.length - 1)) * plotW2;
  const toYTrade = (tb: number) => {
    const clamped = Math.max(-0.16, Math.min(0.16, tb));
    return pad2.top + ((0.16 - clamped) / 0.32) * plotH2;
  };
  const toYPrice = (p: number) => {
    const clamped = Math.max(0.25, Math.min(1.15, p));
    return pad2.top + ((1.15 - clamped) / 0.9) * plotH2;
  };

  const tradePath = useMemo(
    () =>
      steps
        .map(
          (s, i) =>
            `${i === 0 ? 'M' : 'L'} ${toX2(i).toFixed(1)} ${toYTrade(s.tradeBalance).toFixed(1)}`
        )
        .join(' '),
    [steps]
  );

  const pricePath = useMemo(
    () =>
      steps
        .map(
          (s, i) =>
            `${i === 0 ? 'M' : 'L'} ${toX2(i).toFixed(1)} ${toYPrice(s.p_M_rel).toFixed(1)}`
        )
        .join(' '),
    [steps]
  );

  const dEmp = (activeStep.empShare - firstStep.empShare) * 100;
  const dNom = (activeStep.nomShare - firstStep.nomShare) * 100;
  const dReal = (activeStep.realShare - firstStep.realShare) * 100;

  const handleSvgMove = (
    e: React.MouseEvent<SVGSVGElement>,
    svgWidth: number,
    leftPad: number,
    innerW: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const norm = Math.max(0, Math.min(1, (x - leftPad) / innerW));
    const idx = Math.round(norm * (steps.length - 1));
    setHoverIdx(idx);
  };

  const handleSvgClick = (
    e: React.MouseEvent<SVGSVGElement>,
    svgWidth: number,
    leftPad: number,
    innerW: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const norm = Math.max(0, Math.min(1, (x - leftPad) / innerW));
    const idx = Math.round(norm * (steps.length - 1));
    onSelectIndex(idx);
  };

  const formatDelta = (val: number) => {
    const sign = val >= 0 ? '▲ +' : '▼ ';
    return `${sign}${val.toFixed(1)} pp`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Live KPI Readout Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>{lang === 'zh' ? '制造业就业占比' : 'Mfg Employment'}</span>
            <span className="w-2.5 h-0.5 bg-sky-600 inline-block" />
          </div>
          <div className="mt-1 flex items-baseline gap-2 tabular-nums">
            <span className="text-xl font-semibold font-mono text-slate-900">
              {(activeStep.empShare * 100).toFixed(1)}%
            </span>
            <span
              className={`text-xs font-mono font-medium ${
                dEmp >= -0.5 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatDelta(dEmp)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>{lang === 'zh' ? '名义GDP占比' : 'Nominal VA Share'}</span>
            <span className="w-2.5 h-0.5 bg-amber-600 inline-block" />
          </div>
          <div className="mt-1 flex items-baseline gap-2 tabular-nums">
            <span className="text-xl font-semibold font-mono text-slate-900">
              {(activeStep.nomShare * 100).toFixed(1)}%
            </span>
            <span
              className={`text-xs font-mono font-medium ${
                dNom >= -0.5 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {formatDelta(dNom)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>{lang === 'zh' ? '实际GDP占比' : 'Real VA Share'}</span>
            <span className="w-2.5 h-0.5 bg-slate-900 inline-block" />
          </div>
          <div className="mt-1 flex items-baseline gap-2 tabular-nums">
            <span className="text-xl font-semibold font-mono text-slate-900">
              {(activeStep.realShare * 100).toFixed(1)}%
            </span>
            <span
              className={`text-xs font-mono font-medium ${
                dReal >= -0.5 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatDelta(dReal)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>{lang === 'zh' ? '制造品贸易余额' : 'Mfg Trade Balance'}</span>
            <span className="text-[11px] font-mono text-slate-400">% GDP</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2 tabular-nums">
            <span
              className={`text-xl font-semibold font-mono ${
                activeStep.tradeBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {activeStep.tradeBalance >= 0 ? '+' : ''}
              {(activeStep.tradeBalance * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              {activeStep.tradeBalance > 0.005
                ? lang === 'zh'
                  ? '净出口'
                  : 'Net Exp'
                : activeStep.tradeBalance < -0.005
                ? lang === 'zh'
                  ? '净进口'
                  : 'Net Imp'
                : lang === 'zh'
                ? '平衡'
                : 'Balanced'}
            </span>
          </div>
        </div>
      </div>

      {/* Dual Synchronized Trajectory Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart A: Three Shares Divergence */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {lang === 'zh'
                  ? '三种份额动态分化轨迹（1975–2015）'
                  : 'Three-Share Divergence Trajectory (1975–2015)'}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 bg-sky-600 inline-block" />
                {lang === 'zh' ? '就业' : 'Emp'}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-600 inline-block" />
                {lang === 'zh' ? '名义' : 'Nom'}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 bg-slate-900 inline-block" />
                {lang === 'zh' ? '实际' : 'Real'}
              </span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto cursor-crosshair select-none"
            onMouseMove={(e) => handleSvgMove(e, width, pad.left, plotW)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={(e) => handleSvgClick(e, width, pad.left, plotW)}
          >
            {/* Horizontal grid lines */}
            {[0, 0.1, 0.2, 0.3, 0.4].map((tick) => {
              const y = toYShare(tick);
              return (
                <g key={tick}>
                  <line
                    x1={pad.left}
                    y1={y}
                    x2={width - pad.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={pad.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {Math.round(tick * 100)}%
                  </text>
                </g>
              );
            })}

            {/* X axis year ticks */}
            {[0, 10, 20, 30, 40].map((idx) => (
              <text
                key={idx}
                x={toX(idx)}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {1975 + idx}
              </text>
            ))}

            {/* Optional Baseline Ghost Lines */}
            {paths.baseEmp && (
              <path
                d={paths.baseEmp}
                fill="none"
                stroke="#0284c7"
                strokeOpacity={0.18}
                strokeWidth={1.5}
                strokeDasharray="2 3"
              />
            )}
            {paths.baseReal && (
              <path
                d={paths.baseReal}
                fill="none"
                stroke="#0f172a"
                strokeOpacity={0.15}
                strokeWidth={1.5}
                strokeDasharray="2 3"
              />
            )}

            {/* Main Curves */}
            <path
              d={paths.real}
              fill="none"
              stroke="#0f172a"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <path
              d={paths.nom}
              fill="none"
              stroke="#d97706"
              strokeWidth={2}
              strokeDasharray="5 3"
              strokeLinecap="round"
            />
            <path
              d={paths.emp}
              fill="none"
              stroke="#0284c7"
              strokeWidth={2.25}
              strokeLinecap="round"
            />

            {/* Active Scrubber Line & Dots */}
            <line
              x1={toX(activeIdx)}
              y1={pad.top}
              x2={toX(activeIdx)}
              y2={height - pad.bottom}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <circle
              cx={toX(activeIdx)}
              cy={toYShare(activeStep.realShare)}
              r={4}
              fill="#0f172a"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <circle
              cx={toX(activeIdx)}
              cy={toYShare(activeStep.nomShare)}
              r={3.8}
              fill="#d97706"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <circle
              cx={toX(activeIdx)}
              cy={toYShare(activeStep.empShare)}
              r={4}
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </svg>
        </div>

        {/* Chart B: Relative Price & Trade Balance */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              {lang === 'zh'
                ? '相对价格与制造品贸易余额'
                : 'Relative Price & Mfg Trade Balance'}
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 bg-amber-600 inline-block" />
                p_M/p_S
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
                NX_M
              </span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${w2} ${h2}`}
            className="w-full h-auto cursor-crosshair select-none"
            onMouseMove={(e) => handleSvgMove(e, w2, pad2.left, plotW2)}
            onMouseLeave={() => setHoverIdx(null)}
            onClick={(e) => handleSvgClick(e, w2, pad2.left, plotW2)}
          >
            {/* Zero trade balance line */}
            <line
              x1={pad2.left}
              y1={toYTrade(0)}
              x2={w2 - pad2.right}
              y2={toYTrade(0)}
              stroke="#cbd5e1"
              strokeDasharray="4 3"
            />
            {[-0.12, 0, 0.12].map((tick) => (
              <text
                key={tick}
                x={pad2.left - 6}
                y={toYTrade(tick) + 3.5}
                textAnchor="end"
                className="fill-emerald-700 text-[10px] font-mono"
              >
                {tick > 0 ? `+${Math.round(tick * 100)}%` : `${Math.round(tick * 100)}%`}
              </text>
            ))}
            {[0.4, 0.7, 1.0].map((tick) => (
              <text
                key={tick}
                x={w2 - pad2.right + 6}
                y={toYPrice(tick) + 3.5}
                textAnchor="start"
                className="fill-amber-700 text-[10px] font-mono"
              >
                {tick.toFixed(1)}
              </text>
            ))}

            {[0, 10, 20, 30, 40].map((idx) => (
              <text
                key={idx}
                x={toX2(idx)}
                y={h2 - 8}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono"
              >
                {1975 + idx}
              </text>
            ))}

            <path
              d={pricePath}
              fill="none"
              stroke="#d97706"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <path
              d={tradePath}
              fill="none"
              stroke="#059669"
              strokeWidth={2.2}
              strokeLinecap="round"
            />

            <line
              x1={toX2(activeIdx)}
              y1={pad2.top}
              x2={toX2(activeIdx)}
              y2={h2 - pad2.bottom}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <circle
              cx={toX2(activeIdx)}
              cy={toYPrice(activeStep.p_M_rel)}
              r={3.8}
              fill="#d97706"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <circle
              cx={toX2(activeIdx)}
              cy={toYTrade(activeStep.tradeBalance)}
              r={4}
              fill="#059669"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
