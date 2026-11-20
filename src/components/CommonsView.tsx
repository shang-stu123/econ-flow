import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import {
  CommonsParams,
  DEFAULT_COMMONS_PARAMS,
  simulateCommons,
} from '../models/commonsModel';
import { Language } from '../types/simulation';

interface CommonsViewProps {
  lang: Language;
}

export const CommonsView: React.FC<CommonsViewProps> = ({ lang }) => {
  const [params, setParams] = useState<CommonsParams>(DEFAULT_COMMONS_PARAMS);
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = useMemo(() => simulateCommons(params, 50), [params]);
  const current = steps[Math.min(stepIdx, steps.length - 1)];

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setStepIdx((prev) => (prev >= steps.length - 1 ? 0 : prev + 1));
    }, 240);
    return () => window.clearInterval(id);
  }, [isPlaying, steps.length]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ current, params, lang, isPlaying });
  stateRef.current = { current, params, lang, isPlaying };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let phase = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { current: st, params: p, lang: L, isPlaying: playing } = stateRef.current;
      if (playing) phase = (phase + dt * 0.7) % 1;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;

      // Outer Social Trust Halo
      const haloR = 135;
      ctx.save();
      ctx.strokeStyle = `rgba(2, 132, 199, ${0.15 + st.socialTrust * 0.45})`;
      ctx.lineWidth = 2 + st.socialTrust * 5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Central Natural Resource Pool
      const poolR = 26 + st.resourceStock * 54;
      const poolColor =
        st.status === 'collapsed'
          ? '#dc2626'
          : st.status === 'stressed'
          ? '#d97706'
          : '#059669';
      const poolBg =
        st.status === 'collapsed'
          ? '#fef2f2'
          : st.status === 'stressed'
          ? '#fffbeb'
          : '#ecfdf5';

      ctx.save();
      ctx.fillStyle = poolBg;
      ctx.strokeStyle = poolColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, poolR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = '600 12px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(L === 'zh' ? '自然公共资源池' : 'Natural Commons', cx, cy - 6);
      ctx.font = '600 14px "IBM Plex Mono", monospace';
      ctx.fillStyle = poolColor;
      ctx.fillText(`${Math.round(st.resourceStock * 100)}%`, cx, cy + 14);
      ctx.restore();

      // 24 Human Agents arranged in a ring around the commons
      const numAgents = 24;
      const numCoop = Math.round(st.cooperatorShare * numAgents);
      for (let i = 0; i < numAgents; i++) {
        const angle = (i / numAgents) * Math.PI * 2 - Math.PI / 2;
        const ax = cx + Math.cos(angle) * 124;
        const ay = cy + Math.sin(angle) * 124;
        const isCoop = i < numCoop;

        // Extraction flow arrow inward (defectors draw thick red, cooperators draw thin teal)
        const startX = cx + Math.cos(angle) * 112;
        const startY = cy + Math.sin(angle) * 112;
        const endX = cx + Math.cos(angle) * (poolR + 6);
        const endY = cy + Math.sin(angle) * (poolR + 6);

        ctx.save();
        ctx.strokeStyle = isCoop ? 'rgba(13,148,136,0.35)' : 'rgba(220,38,38,0.55)';
        ctx.lineWidth = isCoop ? 1.4 : 2.8;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Moving extraction pulse from pool -> agent
        const pt = isCoop ? phase : (phase * 1.4) % 1;
        const px = endX + (startX - endX) * pt;
        const py = endY + (startY - endY) * pt;
        ctx.fillStyle = isCoop ? '#0d9488' : '#dc2626';
        ctx.beginPath();
        ctx.arc(px, py, isCoop ? 2.1 : 3.1, 0, Math.PI * 2);
        ctx.fill();

        // Agent node
        ctx.fillStyle = isCoop ? '#0d9488' : '#dc2626';
        ctx.beginPath();
        ctx.arc(ax, ay, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Legend tags inside canvas corners
      ctx.save();
      ctx.font = '600 11px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillStyle = '#0d9488';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${L === 'zh' ? '克制合作者' : 'Cooperators'}: ${Math.round(st.cooperatorShare * 100)}%`,
        16,
        24
      );
      ctx.fillStyle = '#dc2626';
      ctx.fillText(
        `${L === 'zh' ? '过度索取者' : 'Free-Riders'}: ${Math.round((1 - st.cooperatorShare) * 100)}%`,
        16,
        42
      );
      ctx.fillStyle = '#0284c7';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${L === 'zh' ? '社会信任规范强度' : 'Social Trust'}: ${Math.round(st.socialTrust * 100)}%`,
        w - 16,
        24
      );
      ctx.fillStyle = '#475569';
      ctx.fillText(
        `${L === 'zh' ? '生态再生' : 'Regen'} r=${p.regenRate.toFixed(2)}`,
        w - 16,
        42
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
                  ? 'Ostrom (1990) 公共池塘资源 · 人的行动、社会规范与自然环境演化'
                  : 'Ostrom (1990) Socio-Ecological Commons & Social Norms'}
              </strong>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-mono">t = {current.t}</span>
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

          <div className="p-4 field-grid-bg flex justify-center">
            <canvas ref={canvasRef} width={640} height={320} className="w-full max-w-[640px] h-auto block" />
          </div>

          <div className="px-4 py-3 bg-slate-900 text-slate-100 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={stepIdx}
              onChange={(e) => setStepIdx(Number(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-mono tabular-nums whitespace-nowrap shrink-0">
              {current.status === 'collapsed'
                ? lang === 'zh'
                  ? '▲ 公地悲剧：资源枯竭'
                  : '▲ Tragedy: Resource Collapsed'
                : current.status === 'stressed'
                ? lang === 'zh'
                  ? '● 生态承压警告'
                  : '● Ecosystem Stressed'
                : lang === 'zh'
                ? '● 自主治理稳态'
                : '● Self-Governing Sustainable'}
            </span>
          </div>
        </div>

        {/* Ecological Stock & Cooperation Trajectory */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">
            {lang === 'zh'
              ? '自然资源存量与克制合作者比例演化'
              : 'Resource Stock & Cooperator Share Over Time'}
          </h4>
          <svg viewBox="0 0 560 150" className="w-full h-auto">
            <path
              d={steps
                .map((s, i) => {
                  const x = 32 + (i / (steps.length - 1)) * 505;
                  const y = 130 - s.resourceStock * 110;
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="#059669"
              strokeWidth={2.4}
            />
            <path
              d={steps
                .map((s, i) => {
                  const x = 32 + (i / (steps.length - 1)) * 505;
                  const y = 130 - s.cooperatorShare * 110;
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="#0284c7"
              strokeWidth={2.1}
              strokeDasharray="4 2"
            />
          </svg>
        </div>
      </div>

      {/* Right Social & Natural Parameter Controls */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
        <div>
          <div className="text-xs text-slate-500">
            {lang === 'zh' ? '社会学 · 制度 · 自然生态耦合' : 'Sociology · Institutions · Ecology'}
          </div>
          <h3 className="text-base font-semibold text-slate-900 mt-0.5">
            {lang === 'zh'
              ? '社会规范与政策如何扭转“公地悲剧”？'
              : 'Can Social Norms & Policy Prevent Ecological Collapse?'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
            {lang === 'zh'
              ? '当外部市场诱因上升时，个体理性倾向于过度开采自然资源；唯有足够强的社区声誉制裁与制度监管形成正反馈，才能维持生态与合作的长期共生。'
              : 'Rising market temptation rewards over-extraction; only strong community norms and institutional monitoring tip human imitation back toward ecological sustainability.'}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">
                {lang === 'zh' ? '社会规范与声誉惩罚' : 'Social Norm Sanction'}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {Math.round(params.socialSanction * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={params.socialSanction}
              onChange={(e) => setParams({ ...params, socialSanction: Number(e.target.value) })}
              className="w-full sim-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">
                {lang === 'zh' ? '政策制度监管力度' : 'Policy Monitoring Penalty'}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {Math.round(params.policyMonitoring * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={params.policyMonitoring}
              onChange={(e) => setParams({ ...params, policyMonitoring: Number(e.target.value) })}
              className="w-full sim-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">
                {lang === 'zh' ? '自然环境生态再生率 (r)' : 'Ecological Regeneration (r)'}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {params.regenRate.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0.15}
              max={0.75}
              step={0.03}
              value={params.regenRate}
              onChange={(e) => setParams({ ...params, regenRate: Number(e.target.value) })}
              className="w-full sim-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-slate-700">
                {lang === 'zh' ? '外部市场套利诱因' : 'Market Price Temptation'}
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {params.marketTemptation.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.9}
              step={0.05}
              value={params.marketTemptation}
              onChange={(e) => setParams({ ...params, marketTemptation: Number(e.target.value) })}
              className="w-full sim-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
