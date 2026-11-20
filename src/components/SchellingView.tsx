import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import {
  computeSchellingMetrics,
  createSchellingGrid,
  DEFAULT_SCHELLING_PARAMS,
  evaluateHappiness,
  SchellingCell,
  SchellingMetrics,
  SchellingParams,
  stepSchellingGrid,
} from '../models/schellingModel';
import { Language } from '../types/simulation';

interface SchellingViewProps {
  lang: Language;
}

export const SchellingView: React.FC<SchellingViewProps> = ({ lang }) => {
  const [params, setParams] = useState<SchellingParams>(DEFAULT_SCHELLING_PARAMS);
  const [grid, setGrid] = useState<SchellingCell[][]>(() =>
    createSchellingGrid(DEFAULT_SCHELLING_PARAMS)
  );
  const [history, setHistory] = useState<SchellingMetrics[]>(() => [
    computeSchellingMetrics(createSchellingGrid(DEFAULT_SCHELLING_PARAMS), 0, 0),
  ]);
  const [isPlaying, setIsPlaying] = useState(false);

  const resetGrid = (nextParams: SchellingParams = params) => {
    setIsPlaying(false);
    const fresh = createSchellingGrid(nextParams);
    setGrid(fresh);
    setHistory([computeSchellingMetrics(fresh, 0, 0)]);
  };

  const advanceStep = () => {
    setGrid((prevGrid) => {
      const { nextGrid, moves } = stepSchellingGrid(prevGrid, params.tolerance);
      setHistory((prevHist) => {
        const nextStep = prevHist.length;
        const metrics = computeSchellingMetrics(nextGrid, nextStep, moves);
        if (moves === 0) setIsPlaying(false);
        return [...prevHist.slice(-60), metrics];
      });
      return nextGrid;
    });
  };

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(advanceStep, 320);
    return () => window.clearInterval(id);
  }, [isPlaying, params.tolerance]);

  const handleToleranceChange = (tol: number) => {
    const next = { ...params, tolerance: tol };
    setParams(next);
    setGrid((prev) => evaluateHappiness(prev, tol));
  };

  const latest = history[history.length - 1];
  const cellPx = 19;
  const sizePx = params.gridSize * cellPx;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Dominant Spatial Field */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">
                {lang === 'zh'
                  ? 'Schelling (1971) 城市居住空间场域'
                  : 'Schelling (1971) Urban Spatial Field'}
              </strong>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>
                {lang === 'zh'
                  ? '虚线箭头表示个体迁徙方向，红框表示当前不满意个体'
                  : 'Arrows show household relocation vectors; rings show dissatisfied agents'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-sky-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? (lang === 'zh' ? '暂停' : 'Pause') : lang === 'zh' ? '开始演化' : 'Run'}
              </button>
              <button
                type="button"
                onClick={advanceStep}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <StepForward className="w-3.5 h-3.5" />
                {lang === 'zh' ? '单步' : 'Step'}
              </button>
              <button
                type="button"
                onClick={() => resetGrid()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {lang === 'zh' ? '洗牌重置' : 'Reset'}
              </button>
            </div>
          </div>

          <div className="p-5 flex flex-col md:flex-row items-center justify-center gap-6 field-grid-bg">
            {/* Spatial Grid + Migration Vectors SVG */}
            <svg
              viewBox={`0 0 ${sizePx} ${sizePx}`}
              className="w-full max-w-[420px] aspect-square bg-white border border-slate-200 rounded-lg shadow-xs"
            >
              <defs>
                <marker
                  id="moveArrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="#0f172a" fillOpacity="0.65" />
                </marker>
              </defs>

              {grid.map((row) =>
                row.map((cell) => {
                  const x = cell.col * cellPx;
                  const y = cell.row * cellPx;
                  const fill =
                    cell.group === 0
                      ? '#f8fafc'
                      : cell.group === 1
                      ? '#0284c7'
                      : '#d97706';
                  return (
                    <g key={`${cell.row}-${cell.col}`}>
                      <rect
                        x={x + 1.5}
                        y={y + 1.5}
                        width={cellPx - 3}
                        height={cellPx - 3}
                        rx={3.5}
                        fill={fill}
                        fillOpacity={cell.group === 0 ? 0.5 : cell.happy ? 0.92 : 0.55}
                        stroke={!cell.happy && cell.group !== 0 ? '#dc2626' : '#e2e8f0'}
                        strokeWidth={!cell.happy && cell.group !== 0 ? 1.5 : 0.6}
                      />
                    </g>
                  );
                })
              )}

              {/* Migration Vectors for agents that moved this step */}
              {grid.map((row) =>
                row.map((cell) => {
                  if (!cell.lastMovedFrom) return null;
                  const x1 = cell.lastMovedFrom.col * cellPx + cellPx / 2;
                  const y1 = cell.lastMovedFrom.row * cellPx + cellPx / 2;
                  const x2 = cell.col * cellPx + cellPx / 2;
                  const y2 = cell.row * cellPx + cellPx / 2;
                  return (
                    <line
                      key={`vec-${cell.row}-${cell.col}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#0f172a"
                      strokeOpacity={0.55}
                      strokeWidth={1.25}
                      strokeDasharray="2 2"
                      markerEnd="url(#moveArrow)"
                    />
                  );
                })
              )}
            </svg>

            {/* Live Metrics + Segregation Curve */}
            <div className="flex flex-col gap-4 w-full max-w-[260px]">
              <div className="bg-white border border-slate-200 rounded-xl p-4 tabular-nums">
                <div className="text-xs text-slate-500">
                  {lang === 'zh' ? '宏观隔离指数（同质邻里比）' : 'Macro Segregation Index'}
                </div>
                <div className="text-2xl font-semibold font-mono text-slate-900 mt-1">
                  {(latest.segregationIndex * 100).toFixed(1)}%
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-slate-400">{lang === 'zh' ? '步数' : 'Step'}</div>
                    <div className="font-mono font-semibold text-slate-900">{latest.step}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">{lang === 'zh' ? '不满意占比' : 'Unhappy'}</div>
                    <div className="font-mono font-semibold text-rose-700">
                      {(latest.unhappyPct * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-900 mb-2">
                  {lang === 'zh' ? '隔离度涌现曲线' : 'Segregation Emergence'}
                </div>
                <svg viewBox="0 0 220 90" className="w-full h-auto">
                  <line x1="20" y1="75" x2="210" y2="75" stroke="#e2e8f0" />
                  <line x1="20" y1="15" x2="210" y2="15" stroke="#e2e8f0" strokeDasharray="2 2" />
                  <path
                    d={history
                      .map((h, i) => {
                        const x = 20 + (i / Math.max(1, history.length - 1)) * 188;
                        const y = 75 - Math.max(0, Math.min(1, h.segregationIndex)) * 60;
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={2.2}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Parameter & Sociological Mechanism Deck */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <div className="text-xs text-slate-500">
              {lang === 'zh' ? '社会学涌现机制' : 'Sociological Emergence'}
            </div>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5">
              {lang === 'zh'
                ? '温和个体偏好如何酿成高度宏观隔离？'
                : 'How Mild Micro-Preferences Create Macro Segregation'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
              {lang === 'zh'
                ? '即便每个个体完全不排斥异质邻居——仅仅希望周围至少有 33% 的同类（阈值=33%）——个体迁徙的连锁反应也会把整个城市推向 75% 以上的高度隔离稳态。'
                : 'Even when individuals tolerate a diverse neighborhood—only wanting 33% similar neighbors—sequential relocation cascades push the entire city past 75% segregation.'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  {lang === 'zh' ? '同类邻里容忍阈值 (τ)' : 'Same-Group Threshold (τ)'}
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(params.tolerance * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.15}
                max={0.75}
                step={0.05}
                value={params.tolerance}
                onChange={(e) => handleToleranceChange(Number(e.target.value))}
                className="w-full sim-slider"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>15% ({lang === 'zh' ? '极高包容' : 'Highly Tolerant'})</span>
                <span>75% ({lang === 'zh' ? '强同质偏好' : 'Homophily'})</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-700">
                  {lang === 'zh' ? '城市居住密度' : 'Urban Occupancy Density'}
                </span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(params.density * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.55}
                max={0.92}
                step={0.02}
                value={params.density}
                onChange={(e) => {
                  const next = { ...params, density: Number(e.target.value) };
                  setParams(next);
                  resetGrid(next);
                }}
                className="w-full sim-slider"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
