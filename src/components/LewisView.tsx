import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { DEFAULT_LEWIS_PARAMS, LewisParams, simulateLewis } from '../models/lewisModel';
import { Language } from '../types/simulation';

interface LewisViewProps {
  lang: Language;
}

export const LewisView: React.FC<LewisViewProps> = ({ lang }) => {
  const [params, setParams] = useState<LewisParams>(DEFAULT_LEWIS_PARAMS);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const { steps, turningPointStep } = useMemo(() => simulateLewis(params, 45), [params]);
  const current = steps[Math.min(stepIdx, steps.length - 1)];

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setStepIdx((prev) => (prev >= steps.length - 1 ? 0 : prev + 1));
    }, 280);
    return () => window.clearInterval(id);
  }, [isPlaying, steps.length]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ current, lang, isPlaying });
  stateRef.current = { current, lang, isPlaying };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = Array.from({ length: 16 }, (_, i) => ({
      progress: i / 16,
      speed: 0.25 + (i % 4) * 0.05,
      offset: ((i % 5) - 2) * 4,
    }));

    let animId = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { current: st, lang: L, isPlaying: playing } = stateRef.current;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const ruralPos = { x: w * 0.23, y: h * 0.52 };
      const urbanPos = { x: w * 0.76, y: h * 0.48 };
      const capPos = { x: w * 0.76, y: h * 0.17 };

      const ruralR = 36 + st.ruralLaborShare * 62;
      const urbanR = 36 + st.modernLaborShare * 62;

      // Migration corridor Rural -> Urban
      const migRate = Math.max(0.15, Math.min(1.6, st.migrationFlow * 0.65 + 0.2));
      ctx.save();
      ctx.strokeStyle = st.passedTurningPoint ? 'rgba(217,119,6,0.28)' : 'rgba(2,132,199,0.25)';
      ctx.lineWidth = 4 + st.migrationFlow * 2.5;
      ctx.beginPath();
      ctx.moveTo(ruralPos.x + ruralR, ruralPos.y);
      ctx.quadraticCurveTo(w * 0.5, h * 0.36, urbanPos.x - urbanR, urbanPos.y);
      ctx.stroke();
      ctx.restore();

      particles.forEach((p) => {
        if (playing) {
          p.progress = (p.progress + p.speed * migRate * dt) % 1;
        }
        const t = p.progress;
        const mt = 1 - t;
        const x =
          mt * mt * (ruralPos.x + ruralR) +
          2 * mt * t * (w * 0.5) +
          t * t * (urbanPos.x - urbanR);
        const y =
          mt * mt * ruralPos.y +
          2 * mt * t * (h * 0.36) +
          t * t * urbanPos.y +
          p.offset;

        ctx.fillStyle = st.passedTurningPoint ? '#d97706' : '#0284c7';
        ctx.beginPath();
        ctx.arc(x, y - 3, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y + 3, 3.2, Math.PI, 0);
        ctx.fill();
      });

      // Capital Reinvestment Loop Urban -> Capital -> Urban
      ctx.save();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(urbanPos.x, (urbanPos.y + capPos.y) / 2, 48, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.restore();

      // Rural Sector Circle
      ctx.save();
      ctx.fillStyle = '#f0fdfa';
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ruralPos.x, ruralPos.y, ruralR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#134e4a';
      ctx.textAlign = 'center';
      ctx.font = '600 13px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(L === 'zh' ? '传统农业部门' : 'Rural Subsistence', ruralPos.x, ruralPos.y - 8);
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      ctx.fillText(`${(st.ruralLaborShare * 100).toFixed(1)}%`, ruralPos.x, ruralPos.y + 12);
      ctx.restore();

      // Urban Modern Sector Circle
      ctx.save();
      ctx.fillStyle = '#f0f9ff';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(urbanPos.x, urbanPos.y, urbanR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0c4a6e';
      ctx.textAlign = 'center';
      ctx.font = '600 13px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(L === 'zh' ? '现代工业部门' : 'Modern Urban Sector', urbanPos.x, urbanPos.y - 10);
      ctx.font = '600 13px "IBM Plex Mono", monospace';
      ctx.fillText(`${(st.modernLaborShare * 100).toFixed(1)}%`, urbanPos.x, urbanPos.y + 9);
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.fillStyle = st.passedTurningPoint ? '#b45309' : '#334155';
      ctx.fillText(
        `w = ${st.modernWage.toFixed(2)}`,
        urbanPos.x,
        urbanPos.y + 26
      );
      ctx.restore();

      // Capital Stock Pill-free box
      ctx.save();
      ctx.fillStyle = '#ecfdf5';
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(capPos.x - 86, capPos.y - 20, 172, 40, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#065f46';
      ctx.textAlign = 'center';
      ctx.font = '600 11.5px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(
        `${L === 'zh' ? '资本存量 K' : 'Capital K'}: ${st.capitalStock.toFixed(2)}`,
        capPos.x,
        capPos.y + 4
      );
      ctx.restore();

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">
                {lang === 'zh'
                  ? 'Lewis (1954) 二元经济与刘易斯拐点'
                  : 'Lewis (1954) Dual-Sector & Turning Point'}
              </strong>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono">{current.year}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-sky-700 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? (lang === 'zh' ? '暂停' : 'Pause') : lang === 'zh' ? '播放' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => setStepIdx(0)}
                className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-4 field-grid-bg">
            <canvas ref={canvasRef} width={680} height={310} className="w-full h-auto block" />
          </div>

          <div className="px-4 py-3 bg-slate-900 text-slate-100 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={stepIdx}
              onChange={(e) => setStepIdx(Number(e.target.value))}
              className="flex-1 accent-sky-500 cursor-pointer"
            />
            <span className="text-xs font-mono tabular-nums whitespace-nowrap shrink-0">
              {current.passedTurningPoint
                ? lang === 'zh'
                  ? '▲ 已跨越刘易斯拐点：工资加速上涨'
                  : '▲ Past Turning Point: Wages Surge'
                : lang === 'zh'
                ? '● 剩余劳动力阶段：工资水平稳定'
                : '● Surplus Labor Phase: Flat Wage'}
            </span>
          </div>
        </div>

        {/* Wage & Labor Share Trajectory */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-900">
              {lang === 'zh' ? '现代部门工资与剩余劳动力拐点轨迹' : 'Urban Wage Kink & Modern Employment'}
            </h4>
            {turningPointStep !== null && (
              <span className="text-xs font-mono text-amber-700">
                {lang === 'zh' ? '拐点年份' : 'Turning Point'}: {1960 + turningPointStep}
              </span>
            )}
          </div>
          <svg viewBox="0 0 560 150" className="w-full h-auto">
            {turningPointStep !== null && (
              <line
                x1={40 + (turningPointStep / (steps.length - 1)) * 500}
                y1={12}
                x2={40 + (turningPointStep / (steps.length - 1)) * 500}
                y2={125}
                stroke="#d97706"
                strokeDasharray="4 3"
              />
            )}
            <path
              d={steps
                .map((s, i) => {
                  const x = 40 + (i / (steps.length - 1)) * 500;
                  const y = 125 - Math.min(1, s.modernLaborShare) * 105;
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="#0284c7"
              strokeWidth={2.2}
            />
            <path
              d={steps
                .map((s, i) => {
                  const x = 40 + (i / (steps.length - 1)) * 500;
                  const y = 125 - Math.min(1, (s.modernWage - 0.8) / 2.2) * 105;
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="#d97706"
              strokeWidth={2.2}
            />
          </svg>
        </div>
      </div>

      {/* Right Parameter Controls */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
        <div>
          <div className="text-xs text-slate-500">
            {lang === 'zh' ? '发展经济学与人口迁移' : 'Development & Migration'}
          </div>
          <h3 className="text-base font-semibold text-slate-900 mt-0.5">
            {lang === 'zh' ? '利润再投资如何吸干农村剩余劳动力？' : 'How Profit Reinvestment Exhausts Surplus Labor'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
            {lang === 'zh'
              ? '工业部门以固定生存工资吸纳农村剩余劳动力，把利润再投资转化为资本积累；当剩余劳动力被吸纳殆尽，经济跨越“刘易斯拐点”，工资曲线陡然上扬。'
              : 'Modern factories absorb surplus rural labor at a fixed subsistence wage and reinvest profits into capital until surplus labor vanishes—triggering a sharp upward wage kink.'}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">
                {lang === 'zh' ? '资本利润再投资率' : 'Profit Reinvestment Rate'}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {Math.round(params.reinvestmentRate * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.25}
              max={0.9}
              step={0.05}
              value={params.reinvestmentRate}
              onChange={(e) => setParams({ ...params, reinvestmentRate: Number(e.target.value) })}
              className="w-full sim-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">
                {lang === 'zh' ? '现代部门 TFP 增速' : 'Modern Sector TFP Growth'}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                +{(params.modernTfpGrowth * 100).toFixed(1)}%/yr
              </span>
            </div>
            <input
              type="range"
              min={0.005}
              max={0.04}
              step={0.005}
              value={params.modernTfpGrowth}
              onChange={(e) => setParams({ ...params, modernTfpGrowth: Number(e.target.value) })}
              className="w-full sim-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">
                {lang === 'zh' ? '农村生存工资基线' : 'Subsistence Wage Floor'}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {params.subsistenceWage.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.5}
              step={0.05}
              value={params.subsistenceWage}
              onChange={(e) => setParams({ ...params, subsistenceWage: Number(e.target.value) })}
              className="w-full sim-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
