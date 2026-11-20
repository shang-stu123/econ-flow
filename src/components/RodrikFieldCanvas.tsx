import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Language, RodrikParams, RodrikStep } from '../types/simulation';

export type FieldLayer = 'all' | 'social' | 'trade' | 'environment';

interface RodrikFieldCanvasProps {
  params: RodrikParams;
  currentStep: RodrikStep;
  currentIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  playbackSpeed: 1 | 2;
  onTogglePlay: () => void;
  onResetTimeline: () => void;
  onSeekIndex: (idx: number) => void;
  onChangeSpeed: (speed: 1 | 2) => void;
  lang: Language;
  highlightNode?: 'mfg' | 'world' | 'demand' | 'resource' | 'all' | null;
}

type InspectableNode = 'world' | 'gate' | 'mfg' | 'svc' | 'res' | 'demand';

interface Particle {
  channel: 'trade' | 'laborMS' | 'laborMR' | 'demandM' | 'demandS';
  progress: number;
  speed: number;
  offset: number;
}

function quadBezier(
  p0: { x: number; y: number },
  cp: { x: number; y: number },
  p1: { x: number; y: number },
  t: number
): { x: number; y: number; angle: number } {
  const mt = 1 - t;
  const x = mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p1.x;
  const y = mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p1.y;
  const dx = 2 * mt * (cp.x - p0.x) + 2 * t * (p1.x - cp.x);
  const dy = 2 * mt * (cp.y - p0.y) + 2 * t * (p1.y - cp.y);
  return { x, y, angle: Math.atan2(dy, dx) };
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.75, -size * 0.6);
  ctx.lineTo(-size * 0.45, 0);
  ctx.lineTo(-size * 0.75, size * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPersonGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  scale = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  // Head
  ctx.beginPath();
  ctx.arc(0, -3.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Shoulders / torso arc
  ctx.beginPath();
  ctx.arc(0, 3.2, 3.6, Math.PI, 0, false);
  ctx.fill();
  ctx.restore();
}

function drawCrateGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
  size = 4.2
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(-size, -size * 0.75, size * 2, size * 1.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export const RodrikFieldCanvas: React.FC<RodrikFieldCanvasProps> = ({
  params,
  currentStep,
  currentIndex,
  totalSteps,
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onResetTimeline,
  onSeekIndex,
  onChangeSpeed,
  lang,
  highlightNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<InspectableNode | null>(null);
  const [layer, setLayer] = useState<FieldLayer>('all');

  const stateRef = useRef({
    params,
    currentStep,
    isPlaying,
    lang,
    highlightNode,
    selectedNode,
    layer,
    playbackSpeed,
  });
  stateRef.current = {
    params,
    currentStep,
    isPlaying,
    lang,
    highlightNode,
    selectedNode,
    layer,
    playbackSpeed,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    const channels: Particle['channel'][] = ['trade', 'laborMS', 'laborMR', 'demandM', 'demandS'];
    channels.forEach((ch) => {
      const count = ch === 'laborMS' || ch === 'trade' ? 12 : 8;
      for (let i = 0; i < count; i++) {
        particles.push({
          channel: ch,
          progress: i / count,
          speed: 0.24 + (i % 3) * 0.045,
          offset: ((i % 5) - 2) * 3.6,
        });
      }
    });

    let animId = 0;
    let lastTime = performance.now();
    let globeRotation = 0;
    let wavePhase = 0;
    let gearAngle = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(600, Math.floor(rect.width * dpr));
      canvas.height = Math.max(380, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const {
        params: p,
        currentStep: step,
        isPlaying: playing,
        lang: L,
        highlightNode: hl,
        selectedNode: sel,
        layer: activeLayer,
        playbackSpeed: spd,
      } = stateRef.current;

      const w = container.clientWidth || 800;
      const h = container.clientHeight || 420;

      if (!prefersReducedMotion) {
        const motionFactor = (playing ? 1 : 0.35) * (spd === 2 ? 1.55 : 1);
        globeRotation += dt * 0.28 * motionFactor;
        wavePhase = (wavePhase + dt * 0.55 * motionFactor) % 1;
        gearAngle += dt * (0.4 + p.mfgTfpGrowth * 18) * motionFactor;
      }

      ctx.clearRect(0, 0, w, h);

      const globePos = { x: w * 0.15, y: h * 0.48 };
      const globeR = Math.min(w * 0.088, h * 0.19);
      const gateX = w * 0.33;
      const mfgPos = { x: w * 0.56, y: h * 0.29 };
      const svcPos = { x: w * 0.56, y: h * 0.74 };
      const demandPos = { x: w * 0.85, y: h * 0.28 };
      const resPos = { x: w * 0.85, y: h * 0.73 };

      // Domestic Field Boundary
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.10)';
      ctx.lineWidth = 1.25;
      const domX = gateX + 18;
      const domW = w - domX - 18;
      const domY = 16;
      const domH = h - 32;
      ctx.beginPath();
      ctx.roundRect(domX, domY, domW, domH, 14);
      ctx.fill();
      ctx.stroke();

      // Subtle ecological / social backdrop gradient inside Domestic Field when resourceBoom or service shift is active
      if (step.resourcePull > 0.15 && (activeLayer === 'all' || activeLayer === 'environment')) {
        const ecoGrad = ctx.createRadialGradient(
          resPos.x,
          resPos.y,
          10,
          resPos.x,
          resPos.y,
          165
        );
        ecoGrad.addColorStop(0, `rgba(194, 65, 12, ${0.14 * step.resourcePull})`);
        ecoGrad.addColorStop(1, 'rgba(194, 65, 12, 0)');
        ctx.fillStyle = ecoGrad;
        ctx.fillRect(domX, domY, domW, domH);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '600 11px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        L === 'zh'
          ? '本国社会-经济场域 · 行动者、商品与生态约束'
          : 'DOMESTIC SOCIO-ECONOMIC FIELD · AGENTS, TRADE & RESOURCES',
        domX + 16,
        domY + 22
      );
      ctx.restore();

      const showTradeLayer = activeLayer === 'all' || activeLayer === 'trade';
      const showSocialLayer = activeLayer === 'all' || activeLayer === 'social';
      const showEnvLayer = activeLayer === 'all' || activeLayer === 'environment';

      // 1. World Market Price Transmission Waves
      if (showTradeLayer) {
        for (let i = 0; i < 3; i++) {
          const phase = (wavePhase + i / 3) % 1;
          const maxReach = p.openness > 0.35 ? w * 0.42 : gateX - globePos.x - 6;
          const radius = globeR + 8 + phase * maxReach;
          const alpha = (1 - phase) * (0.25 + p.openness * 0.45);
          ctx.save();
          ctx.strokeStyle =
            step.p_M_world < 0.96
              ? `rgba(217, 119, 6, ${alpha})`
              : `rgba(2, 132, 199, ${alpha})`;
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(globePos.x, globePos.y, radius, -0.58, 0.58);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 2. Trade Openness Gate
      const apertureHalf = 14 + p.openness * (h * 0.25);
      const midY = h * 0.48;
      ctx.save();
      ctx.strokeStyle = p.openness < 0.35 ? '#0f172a' : '#94a3b8';
      ctx.lineWidth = p.openness < 0.35 ? 4 : 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gateX, 34);
      ctx.lineTo(gateX, Math.max(42, midY - apertureHalf));
      ctx.moveTo(gateX, Math.min(h - 42, midY + apertureHalf));
      ctx.lineTo(gateX, h - 34);
      ctx.stroke();

      ctx.fillStyle = sel === 'gate' ? '#0284c7' : '#334155';
      ctx.font = '600 11px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        L === 'zh'
          ? `开放度闸门 ${Math.round(p.openness * 100)}%`
          : `Openness ${Math.round(p.openness * 100)}%`,
        gateX,
        h - 14
      );
      ctx.restore();

      // 3. Flow Corridors & Typed Particles
      const tradeVal = step.tradeBalance;
      const laborRate = step.laborFlowToMfg;
      const resPull = step.resourcePull;

      const advanceAndDrawChannel = (
        ch: Particle['channel'],
        p0: { x: number; y: number },
        cp: { x: number; y: number },
        p1: { x: number; y: number },
        color: string,
        lineWidth: number,
        activeSpeed: number,
        reverse: boolean,
        glyphType: 'person' | 'crate' | 'dot',
        opacity = 1,
        dashed = false
      ) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.22 * opacity;
        ctx.lineWidth = lineWidth;
        if (dashed) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y);
        ctx.stroke();
        ctx.restore();

        const arrowT = reverse ? 0.45 : 0.55;
        const mid = quadBezier(p0, cp, p1, arrowT);
        ctx.save();
        ctx.globalAlpha = opacity;
        drawArrowHead(
          ctx,
          mid.x,
          mid.y,
          reverse ? mid.angle + Math.PI : mid.angle,
          Math.max(6, lineWidth * 1.4),
          color
        );
        ctx.restore();

        particles.forEach((pt) => {
          if (pt.channel !== ch) return;
          if (!prefersReducedMotion && activeSpeed > 0.01) {
            const dir = reverse ? -1 : 1;
            const speedScale = (playing ? 1 : 0.35) * (spd === 2 ? 1.5 : 1);
            pt.progress = (pt.progress + dir * pt.speed * activeSpeed * dt * speedScale + 1) % 1;
          }
          const pos = quadBezier(p0, cp, p1, pt.progress);
          const nx = -Math.sin(pos.angle) * pt.offset;
          const ny = Math.cos(pos.angle) * pt.offset;

          ctx.save();
          ctx.globalAlpha = opacity;
          if (glyphType === 'person') {
            drawPersonGlyph(ctx, pos.x + nx, pos.y + ny, color, 0.95);
          } else if (glyphType === 'crate') {
            drawCrateGlyph(ctx, pos.x + nx, pos.y + ny, pos.angle, color, 3.8);
          } else {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pos.x + nx, pos.y + ny, Math.max(2.3, lineWidth * 0.42), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        });
      };

      // Trade Flow (Goods & Capital Crates)
      const tradeMagnitude = Math.min(1, Math.abs(tradeVal) * 14 + p.openness * 0.35);
      const isExporter = tradeVal >= 0;
      const tradeColor = isExporter ? '#059669' : '#dc2626';
      if (p.openness > 0.08) {
        advanceAndDrawChannel(
          'trade',
          { x: globePos.x + globeR + 6, y: globePos.y - 16 },
          { x: gateX, y: mfgPos.y + 18 },
          { x: mfgPos.x - 48, y: mfgPos.y + 6 },
          tradeColor,
          2.2 + tradeMagnitude * 3.5,
          0.35 + tradeMagnitude * 1.1,
          isExporter,
          'crate',
          showTradeLayer ? 1 : 0.14
        );
      }

      // Labor Migration (Human Agents)
      const laborToSvc = laborRate <= 0;
      const laborSpeed = Math.min(1.6, 0.25 + Math.abs(laborRate) * 2.2);
      const laborColor = laborToSvc ? '#0284c7' : '#059669';
      advanceAndDrawChannel(
        'laborMS',
        { x: mfgPos.x - 10, y: mfgPos.y + 48 },
        { x: mfgPos.x - 38, y: (mfgPos.y + svcPos.y) / 2 },
        { x: svcPos.x - 10, y: svcPos.y - 48 },
        laborColor,
        2.5 + Math.min(4.5, Math.abs(laborRate) * 6),
        laborSpeed,
        !laborToSvc,
        'person',
        showSocialLayer ? 1 : 0.14
      );

      // Resource Extraction Pull (Human Agents pulled to Primary Resources)
      if (resPull > 0.08) {
        advanceAndDrawChannel(
          'laborMR',
          { x: mfgPos.x + 36, y: mfgPos.y + 32 },
          { x: (mfgPos.x + resPos.x) / 2 + 12, y: (mfgPos.y + resPos.y) / 2 - 14 },
          { x: resPos.x - 36, y: resPos.y - 24 },
          '#c2410c',
          2 + resPull * 4.5,
          0.4 + resPull * 1.1,
          false,
          'person',
          showEnvLayer || showSocialLayer ? 1 : 0.14
        );
      }

      // Domestic Demand Shifts
      const svcWeight = p.serviceDemandShare;
      const mfgWeight = 1 - svcWeight;
      advanceAndDrawChannel(
        'demandM',
        { x: demandPos.x - 40, y: demandPos.y },
        { x: (demandPos.x + mfgPos.x) / 2, y: mfgPos.y - 18 },
        { x: mfgPos.x + 48, y: mfgPos.y - 4 },
        '#475569',
        1.5 + mfgWeight * 4.5,
        0.4 + mfgWeight * 0.9,
        false,
        'dot',
        showSocialLayer || showTradeLayer ? 0.9 : 0.14,
        true
      );
      advanceAndDrawChannel(
        'demandS',
        { x: demandPos.x - 20, y: demandPos.y + 36 },
        { x: (demandPos.x + svcPos.x) / 2 - 14, y: (demandPos.y + svcPos.y) / 2 },
        { x: svcPos.x + 44, y: svcPos.y - 16 },
        '#0d9488',
        1.8 + svcWeight * 4.8,
        0.4 + svcWeight * 0.9,
        false,
        'dot',
        showSocialLayer ? 0.95 : 0.14,
        true
      );

      // 4. World Market Globe
      ctx.save();
      const isWorldHl = hl === 'world' || sel === 'world';
      ctx.beginPath();
      ctx.arc(globePos.x, globePos.y, globeR, 0, Math.PI * 2);
      const globeGrad = ctx.createRadialGradient(
        globePos.x - globeR * 0.3,
        globePos.y - globeR * 0.3,
        globeR * 0.15,
        globePos.x,
        globePos.y,
        globeR
      );
      globeGrad.addColorStop(0, '#1e293b');
      globeGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = globeGrad;
      ctx.fill();
      ctx.lineWidth = isWorldHl ? 3.5 : 2;
      ctx.strokeStyle = isWorldHl ? '#d97706' : '#334155';
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(globePos.x, globePos.y, globeR - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
      ctx.lineWidth = 1;
      for (let m = 0; m < 3; m++) {
        const ang = globeRotation + (m * Math.PI) / 3;
        const rx = Math.abs(Math.cos(ang)) * globeR;
        ctx.beginPath();
        ctx.ellipse(globePos.x, globePos.y, Math.max(2, rx), globeR, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const lat of [-0.45, 0, 0.45]) {
        const yOff = globePos.y + lat * globeR;
        const halfW = Math.sqrt(Math.max(0, 1 - lat * lat)) * globeR;
        ctx.beginPath();
        ctx.moveTo(globePos.x - halfW, yOff);
        ctx.lineTo(globePos.x + halfW, yOff);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 12px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(L === 'zh' ? '世界市场' : 'World Market', globePos.x, globePos.y - 4);
      ctx.fillStyle = step.p_M_world < 0.96 ? '#fbbf24' : '#7dd3fc';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      const wpPct = ((step.p_M_world - 1) * 100).toFixed(1);
      ctx.fillText(
        `p* ${step.p_M_world >= 1 ? '+' : ''}${wpPct}%`,
        globePos.x,
        globePos.y + 14
      );
      ctx.restore();

      // 5. Sector Nodes with Interior Kinetic Emblems
      const drawSectorNode = (
        pos: { x: number; y: number },
        r: number,
        title: string,
        metricMain: string,
        metricSub: string,
        fillBg: string,
        borderColor: string,
        textColor: string,
        highlighted: boolean,
        interiorEffect?: 'gear' | 'eco' | 'social'
      ) => {
        ctx.save();
        if (highlighted) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = borderColor;
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = 6;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = fillBg;
        ctx.fill();
        ctx.lineWidth = highlighted ? 3 : 2;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        // Subtle animated interior ring
        if (interiorEffect === 'gear') {
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate(gearAngle);
          ctx.strokeStyle = 'rgba(2, 132, 199, 0.16)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (interiorEffect === 'eco' && resPull > 0.15) {
          ctx.save();
          ctx.strokeStyle = `rgba(194, 65, 12, ${0.22 * resPull})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, r - 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.font = '600 12px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
        ctx.fillText(title, pos.x, pos.y - 12);

        ctx.font = '600 13px "IBM Plex Mono", monospace';
        ctx.fillText(metricMain, pos.x, pos.y + 6);

        ctx.fillStyle = '#475569';
        ctx.font = '500 10.5px "IBM Plex Mono", monospace';
        ctx.fillText(metricSub, pos.x, pos.y + 22);
        ctx.restore();
      };

      const mfgR = 40 + step.realShare * 48;
      drawSectorNode(
        mfgPos,
        mfgR,
        L === 'zh' ? '制造业部门 (M)' : 'Manufacturing (M)',
        `${L === 'zh' ? '就业' : 'Emp'} ${(step.empShare * 100).toFixed(1)}%`,
        `${L === 'zh' ? '实际' : 'Real'} ${(step.realShare * 100).toFixed(1)}%`,
        '#f0f9ff',
        '#0284c7',
        '#0c4a6e',
        hl === 'mfg' || sel === 'mfg',
        'gear'
      );

      const svcR = 38 + step.svcEmpShare * 26;
      drawSectorNode(
        svcPos,
        svcR,
        L === 'zh' ? '服务与非正规吸纳 (S)' : 'Services & Urban Absorption',
        `${L === 'zh' ? '就业' : 'Emp'} ${(step.svcEmpShare * 100).toFixed(1)}%`,
        `TFP ${step.A_S.toFixed(2)}x`,
        '#f0fdfa',
        '#0d9488',
        '#134e4a',
        sel === 'svc',
        'social'
      );

      const demandR = 38;
      drawSectorNode(
        demandPos,
        demandR,
        L === 'zh' ? '社会消费偏好' : 'Social Demand',
        `S: ${Math.round(p.serviceDemandShare * 100)}%`,
        `σ = ${p.elasticitySigma.toFixed(2)}`,
        '#f8fafc',
        '#475569',
        '#0f172a',
        hl === 'demand' || sel === 'demand'
      );

      const resR = 32 + resPull * 24;
      drawSectorNode(
        resPos,
        resR,
        L === 'zh' ? '自然资源部门 (R)' : 'Natural Resources (R)',
        `${L === 'zh' ? '就业' : 'Emp'} ${(step.resEmpShare * 100).toFixed(1)}%`,
        `${L === 'zh' ? '繁荣' : 'Boom'} ${Math.round(p.resourceBoom * 100)}%`,
        resPull > 0.15 ? '#fff7ed' : '#f8fafc',
        resPull > 0.15 ? '#c2410c' : '#94a3b8',
        resPull > 0.15 ? '#7c2d12' : '#475569',
        hl === 'resource' || sel === 'res',
        'eco'
      );

      // 6. Crisp Flow Annotation Tags
      const drawFlowTag = (x: number, y: number, text: string, color: string) => {
        ctx.save();
        ctx.font = '600 11px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
        const metrics = ctx.measureText(text);
        const bw = metrics.width + 16;
        const bh = 22;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + 0.5);
        ctx.restore();
      };

      if (showTradeLayer) {
        if (p.openness > 0.08) {
          const tbPct = (tradeVal * 100).toFixed(1);
          const tradeText =
            L === 'zh'
              ? tradeVal >= 0
                ? `制成品净出口 +${tbPct}%`
                : `进口竞争净入超 ${tbPct}%`
              : tradeVal >= 0
              ? `Mfg Net Exports +${tbPct}%`
              : `Import Competition ${tbPct}%`;
          drawFlowTag(w * 0.34, h * 0.27, tradeText, isExporter ? '#047857' : '#b91c1c');
        } else {
          drawFlowTag(
            w * 0.33,
            h * 0.30,
            L === 'zh' ? '封闭自主定价 (p=A_S/A_M)' : 'Closed Market Clearing',
            '#334155'
          );
        }
      }

      if (showSocialLayer) {
        const laborText =
          L === 'zh'
            ? laborToSvc
              ? '工人流向服务业 ▼'
              : '劳动力流入工厂 ▲'
            : laborToSvc
            ? 'Workers → Services ▼'
            : 'Workers → Factories ▲';
        drawFlowTag(mfgPos.x - 78, (mfgPos.y + svcPos.y) / 2, laborText, laborColor);
      }

      if (resPull > 0.15 && (showEnvLayer || showSocialLayer)) {
        drawFlowTag(
          (mfgPos.x + resPos.x) / 2 + 12,
          (mfgPos.y + resPos.y) / 2 - 14,
          L === 'zh' ? '资源繁荣抽血效应' : 'Resource Pull →',
          '#c2410c'
        );
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    const targets: { id: InspectableNode; cx: number; cy: number; r: number }[] = [
      { id: 'world', cx: w * 0.15, cy: h * 0.48, r: 65 },
      { id: 'gate', cx: w * 0.33, cy: h * 0.48, r: 44 },
      { id: 'mfg', cx: w * 0.56, cy: h * 0.29, r: 65 },
      { id: 'svc', cx: w * 0.56, cy: h * 0.74, r: 60 },
      { id: 'demand', cx: w * 0.85, cy: h * 0.28, r: 50 },
      { id: 'res', cx: w * 0.85, cy: h * 0.73, r: 50 },
    ];

    let hit: InspectableNode | null = null;
    for (const t of targets) {
      if (Math.hypot(x - t.cx, y - t.cy) <= t.r) {
        hit = t.id;
        break;
      }
    }
    setSelectedNode((prev) => (prev === hit ? null : hit));
  };

  // Dynamic Documentary Subtitle at year t
  const getDocumentarySubtitle = () => {
    const wpPct = ((currentStep.p_M_world - 1) * 100).toFixed(1);
    const empPct = (currentStep.empShare * 100).toFixed(1);
    const realPct = (currentStep.realShare * 100).toFixed(1);
    if (lang === 'zh') {
      if (currentIndex === 0) {
        return `${currentStep.year} 年基期出发：制造业就业占比 ${empPct}%，实际产出占比 ${realPct}%，点击播放观察各机制如何随时间演化。`;
      }
      if (params.openness < 0.4 && currentStep.laborFlowToMfg < -0.05) {
        return `${currentStep.year} 年演进：本国制造业生产率已提升至 ${currentStep.A_M.toFixed(2)}x，低替代弹性使工人（尤其低技能岗位）流向服务业，实际产出仍稳守 ${realPct}%。`;
      }
      if (params.openness >= 0.5 && currentStep.tradeBalance < -0.015) {
        return `${currentStep.year} 年演进：世界制造品价格变化 ${wpPct}% 直接输入国内，贸易入超 ${(currentStep.tradeBalance * 100).toFixed(1)}%，劳动力加速流出工厂，社会非正规就业压力上升。`;
      }
      if (currentStep.resourcePull > 0.35) {
        return `${currentStep.year} 年演进：初级资源部门繁荣拉动就业至 ${(currentStep.resEmpShare * 100).toFixed(1)}%，高资源回报进一步挤出本土制造工业。`;
      }
      if (currentStep.tradeBalance > 0.02) {
        return `${currentStep.year} 年演进：制造品出口比较优势形成 +${(currentStep.tradeBalance * 100).toFixed(1)}% GDP 净顺差，成功稳住工业就业（${empPct}%）与中产化通道。`;
      }
      return `${currentStep.year} 年演进：制造业就业 ${empPct}% · 名义占比 ${(currentStep.nomShare * 100).toFixed(1)}% · 实际产出 ${realPct}%。`;
    }
    if (currentIndex === 0) {
      return `${currentStep.year} Baseline: Mfg employment ${empPct}%, real VA ${realPct}%. Press Play to watch the dynamic trajectory unfold.`;
    }
    if (params.openness < 0.4 && currentStep.laborFlowToMfg < -0.05) {
      return `${currentStep.year}: Domestic mfg TFP reaches ${currentStep.A_M.toFixed(2)}x; with σ < 1, workers (especially low-skill) move to services while real output holds at ${realPct}%.`;
    }
    if (params.openness >= 0.5 && currentStep.tradeBalance < -0.015) {
      return `${currentStep.year}: World price shift (${wpPct}%) transmits across open borders; trade deficit (${(currentStep.tradeBalance * 100).toFixed(1)}%) pushes labor into informal services.`;
    }
    return `${currentStep.year}: Mfg employment ${empPct}% · Nominal ${(currentStep.nomShare * 100).toFixed(1)}% · Real VA ${realPct}%.`;
  };

  const inspectorDetails: Record<InspectableNode, { title: string; desc: string }> = {
    world: {
      title: lang === 'zh' ? '世界市场与相对价格 (p_M*)' : 'World Market & Relative Price (p_M*)',
      desc:
        lang === 'zh'
          ? `世界制造品相对价格指数 ${currentStep.p_M_world.toFixed(2)}（相对基期 ${((currentStep.p_M_world - 1) * 100).toFixed(1)}%）。`
          : `World manufacturing relative price index ${currentStep.p_M_world.toFixed(2)} (${((currentStep.p_M_world - 1) * 100).toFixed(1)}% vs base).`,
    },
    gate: {
      title: lang === 'zh' ? '经济体规模与贸易开放度闸门 (τ)' : 'Economy Scale & Openness Gate (τ)',
      desc:
        lang === 'zh'
          ? `当前开放度 ${Math.round(params.openness * 100)}%。低开放/大型经济体自主定价；高开放小型经济体接受世界价格。`
          : `Openness ${Math.round(params.openness * 100)}%. Closed/large economies clear domestically; small open economies take world prices.`,
    },
    mfg: {
      title: lang === 'zh' ? '本国制造业部门 (M) · 正规工业岗位' : 'Domestic Manufacturing (M) · Formal Jobs',
      desc:
        lang === 'zh'
          ? `生产率 ${currentStep.A_M.toFixed(2)}x · 比较优势 ${params.comparativeAdvantage.toFixed(2)} · 就业 ${(currentStep.empShare * 100).toFixed(1)}% · 实际产出 ${(currentStep.realShare * 100).toFixed(1)}%。`
          : `TFP ${currentStep.A_M.toFixed(2)}x · Advantage ${params.comparativeAdvantage.toFixed(2)} · Emp ${(currentStep.empShare * 100).toFixed(1)}% · Real ${(currentStep.realShare * 100).toFixed(1)}%.`,
    },
    svc: {
      title: lang === 'zh' ? '服务业与社会吸纳部门 (S)' : 'Services & Social Absorption (S)',
      desc:
        lang === 'zh'
          ? `吸纳全社会 ${(currentStep.svcEmpShare * 100).toFixed(1)}% 就业。过早去工业化时，低技能工人常被迫转入低生产率的城市非正规服务业。`
          : `Absorbs ${(currentStep.svcEmpShare * 100).toFixed(1)}% of workers. Premature deindustrialization often shifts low-skill labor into informal urban services.`,
    },
    demand: {
      title: lang === 'zh' ? '社会消费结构与替代弹性 (θ_S, σ)' : 'Social Demand & Elasticity (θ_S, σ)',
      desc:
        lang === 'zh'
          ? `替代弹性 σ=${params.elasticitySigma.toFixed(2)}；服务支出目标 ${Math.round(params.serviceDemandShare * 100)}%。`
          : `Elasticity σ=${params.elasticitySigma.toFixed(2)}; target service spending share ${Math.round(params.serviceDemandShare * 100)}%.`,
    },
    res: {
      title: lang === 'zh' ? '自然环境与初级资源部门 (R)' : 'Natural Environment & Resources (R)',
      desc:
        lang === 'zh'
          ? `资源繁荣强度 ${Math.round(params.resourceBoom * 100)}%，就业占比 ${(currentStep.resEmpShare * 100).toFixed(1)}%。自然资源价格飙升诱发“荷兰病”效应。`
          : `Resource boom ${Math.round(params.resourceBoom * 100)}%, employing ${(currentStep.resEmpShare * 100).toFixed(1)}% of labor via Dutch-disease factor reallocation.`,
    },
  };

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Stage Top Toolbar: Field Layer Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            {lang === 'zh' ? '上帝视角演化场域' : "God's-Eye Evolutionary Field"}
          </span>
          <span aria-hidden="true">·</span>
          <span className="hidden sm:inline">
            {lang === 'zh' ? '点击部门节点可局部透视' : 'Click nodes to inspect'}
          </span>
        </div>

        {/* Layer Filter Segmented Control */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'all', zh: '全部流动', en: 'All Flows' },
              { id: 'social', zh: '人的行动', en: 'Human Labor' },
              { id: 'trade', zh: '商品与价格', en: 'Trade & Price' },
              { id: 'environment', zh: '资源与环境', en: 'Eco & Resources' },
            ] as { id: FieldLayer; zh: string; en: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLayer(item.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                layer === item.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'zh' ? item.zh : item.en}
            </button>
          ))}
        </div>
      </div>

      {/* Main Kinetic Field Canvas */}
      <div ref={containerRef} className="relative w-full h-[380px] sm:h-[420px] field-grid-bg">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full block cursor-pointer"
        />
      </div>

      {/* Documentary Video-Style Timeline Scrubber & Live Subtitle */}
      <div className="px-4 py-3 bg-slate-900 text-slate-100 flex flex-col gap-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? (lang === 'zh' ? '暂停' : 'Pause') : lang === 'zh' ? '播放演进' : 'Play'}
          </button>

          <button
            type="button"
            onClick={onResetTimeline}
            title={lang === 'zh' ? '回到基期 1975' : 'Restart 1975'}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeSpeed(playbackSpeed === 1 ? 2 : 1)}
            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {playbackSpeed}x
          </button>

          <input
            type="range"
            min={0}
            max={totalSteps}
            value={currentIndex}
            onChange={(e) => onSeekIndex(Number(e.target.value))}
            aria-label={lang === 'zh' ? '时间演进进度' : 'Timeline progress'}
            className="flex-1 accent-sky-500 cursor-pointer"
          />

          <span className="text-xs font-mono tabular-nums text-slate-300 whitespace-nowrap shrink-0">
            {currentStep.year} / 2015
          </span>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed flex items-start justify-between gap-3">
          <span>{getDocumentarySubtitle()}</span>
          {selectedNode && (
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-[11px] text-sky-400 hover:text-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'zh' ? '清除选中' : 'Clear Focus'}
            </button>
          )}
        </div>

        {selectedNode && (
          <div className="pt-2 border-t border-slate-800 text-xs text-slate-200 flex flex-col gap-0.5">
            <span className="font-semibold text-sky-300">
              {inspectorDetails[selectedNode].title}
            </span>
            <span className="text-slate-300">{inspectorDetails[selectedNode].desc}</span>
          </div>
        )}
      </div>
    </div>
  );
};
