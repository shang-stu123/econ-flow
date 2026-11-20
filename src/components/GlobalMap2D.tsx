import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { RODRIK_ARCHETYPES, simulateRodrik } from '../models/rodrikModel';
import {
  Language,
  RodrikParams,
  RodrikPresetId,
  RodrikStep,
} from '../types/simulation';
import { CONTINENT_POLYGONS } from '../utils/worldMapGeo';

export type MapLayer = 'all' | 'price' | 'labor' | 'trade';
export type MapRegionId =
  | 'north_america'
  | 'europe'
  | 'east_asia'
  | 'latin_america'
  | 'africa';

interface GlobalMap2DProps {
  params: RodrikParams;
  activePresetId: RodrikPresetId;
  currentIndex: number;
  isPlaying: boolean;
  playbackSpeed: 1 | 2;
  lang: Language;
  onTogglePlay: () => void;
  onResetTimeline: () => void;
  onSeekIndex: (idx: number) => void;
  onChangeSpeed: (spd: 1 | 2) => void;
  onApplyPreset: (presetId: RodrikPresetId, nextParams: RodrikParams) => void;
}

interface RegionConfig {
  id: MapRegionId;
  nx: number;
  ny: number;
  nameZh: string;
  nameEn: string;
  archetypeId: 'advanced' | 'asian_exporter' | 'latam_africa';
}

const REGIONS: RegionConfig[] = [
  {
    id: 'north_america',
    nx: 0.17,
    ny: 0.30,
    nameZh: '北美（大型自主体）',
    nameEn: 'N. America (Large)',
    archetypeId: 'advanced',
  },
  {
    id: 'europe',
    nx: 0.50,
    ny: 0.21,
    nameZh: '西欧（发达工业体）',
    nameEn: 'W. Europe (Large)',
    archetypeId: 'advanced',
  },
  {
    id: 'east_asia',
    nx: 0.83,
    ny: 0.33,
    nameZh: '东亚（开放出口体）',
    nameEn: 'East Asia (Exporter)',
    archetypeId: 'asian_exporter',
  },
  {
    id: 'latin_america',
    nx: 0.23,
    ny: 0.72,
    nameZh: '拉美（开放承压体）',
    nameEn: 'LatAm (Open)',
    archetypeId: 'latam_africa',
  },
  {
    id: 'africa',
    nx: 0.65,
    ny: 0.72,
    nameZh: '非洲（开放资源体）',
    nameEn: 'Africa (Resource)',
    archetypeId: 'latam_africa',
  },
];

// Central Unified World Market Anchor (Mid-World Oceanic Hub)
const WORLD_MARKET = { nx: 0.48, ny: 0.48 };

interface MarketParticle {
  regionIdx: number;
  t: number;
  speed: number;
  offset: number;
  channel: 'goods' | 'price';
}

interface DomesticWorkerParticle {
  regionIdx: number;
  channel: 'MS' | 'MR';
  t: number;
  speed: number;
}

function quadPt(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  t: number
) {
  const mt = 1 - t;
  const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
  const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
  const dx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
  const dy = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
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
  ctx.lineTo(-size * 0.72, -size * 0.56);
  ctx.lineTo(-size * 0.42, 0);
  ctx.lineTo(-size * 0.72, size * 0.56);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHumanDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, -2.5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 2.5, 2.8, Math.PI, 0, false);
  ctx.fill();
  ctx.restore();
}

export const GlobalMap2D: React.FC<GlobalMap2DProps> = ({
  params,
  activePresetId,
  currentIndex,
  isPlaying,
  playbackSpeed,
  lang,
  onTogglePlay,
  onResetTimeline,
  onSeekIndex,
  onChangeSpeed,
  onApplyPreset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layer, setLayer] = useState<MapLayer>('all');
  const [selectedRegion, setSelectedRegion] = useState<MapRegionId | null>(null);

  const regionData = useMemo(() => {
    const map = {} as Record<
      MapRegionId,
      {
        step: RodrikStep;
        openVal: number;
        techVal: number;
        resVal: number;
        compAdv: number;
      }
    >;

    REGIONS.forEach((reg) => {
      const baseArch =
        RODRIK_ARCHETYPES.find((a) => a.id === reg.archetypeId) ||
        RODRIK_ARCHETYPES[0];

      const isDirect =
        selectedRegion === reg.id ||
        (selectedRegion === null && activePresetId === reg.archetypeId);

      const regParams: RodrikParams = isDirect
        ? params
        : {
            ...baseArch.params,
            worldPriceShock: params.worldPriceShock,
            elasticitySigma: params.elasticitySigma,
            openness:
              reg.archetypeId === 'advanced'
                ? Math.min(0.28, baseArch.params.openness * 0.65 + params.openness * 0.14)
                : Math.max(0.55, params.openness * 0.35 + baseArch.params.openness * 0.65),
            resourceBoom:
              reg.archetypeId === 'latam_africa'
                ? Math.max(0.18, params.resourceBoom)
                : baseArch.params.resourceBoom,
          };

      const sim = simulateRodrik(regParams, 40);
      map[reg.id] = {
        step: sim[Math.min(currentIndex, sim.length - 1)],
        openVal: regParams.openness,
        techVal: regParams.mfgTfpGrowth,
        resVal: regParams.resourceBoom,
        compAdv: regParams.comparativeAdvantage,
      };
    });
    return map;
  }, [params, currentIndex, selectedRegion, activePresetId]);

  const activeStep = useMemo(() => {
    const sim = simulateRodrik(params, 40);
    return sim[Math.min(currentIndex, sim.length - 1)];
  }, [params, currentIndex]);

  const stateRef = useRef({
    params,
    regionData,
    activeStep,
    isPlaying,
    playbackSpeed,
    layer,
    lang,
    selectedRegion,
    activePresetId,
  });
  stateRef.current = {
    params,
    regionData,
    activeStep,
    isPlaying,
    playbackSpeed,
    layer,
    lang,
    selectedRegion,
    activePresetId,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const marketParticles: MarketParticle[] = [];
    REGIONS.forEach((_, rIdx) => {
      for (let k = 0; k < 5; k++) {
        marketParticles.push({
          regionIdx: rIdx,
          t: k / 5,
          speed: 0.25 + (k % 2) * 0.05,
          offset: ((k % 3) - 1) * 2.5,
          channel: 'goods',
        });
        marketParticles.push({
          regionIdx: rIdx,
          t: (k + 0.5) / 5,
          speed: 0.28,
          offset: 0,
          channel: 'price',
        });
      }
    });

    const workerParticles: DomesticWorkerParticle[] = [];
    REGIONS.forEach((_, rIdx) => {
      for (let k = 0; k < 5; k++) {
        workerParticles.push({
          regionIdx: rIdx,
          channel: 'MS',
          t: k / 5,
          speed: 0.34 + (k % 2) * 0.08,
        });
      }
      for (let k = 0; k < 4; k++) {
        workerParticles.push({
          regionIdx: rIdx,
          channel: 'MR',
          t: k / 4,
          speed: 0.32,
        });
      }
    });

    let animId = 0;
    let lastTime = performance.now();
    let wavePhase = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(700, Math.floor(rect.width * dpr));
      canvas.height = Math.max(460, Math.floor(rect.height * dpr));
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
        regionData: rData,
        activeStep: gStep,
        isPlaying: playing,
        playbackSpeed: spd,
        layer: activeLayer,
        lang: L,
        selectedRegion: selReg,
        activePresetId: presetId,
      } = stateRef.current;

      const w = container.clientWidth || 920;
      const h = container.clientHeight || 490;
      const motionMult = (playing ? 1 : 0.3) * (spd === 2 ? 1.55 : 1);

      if (!prefersReducedMotion) {
        wavePhase = (wavePhase + dt * 0.55 * motionMult) % 1;
      }

      ctx.clearRect(0, 0, w, h);

      // 1. Cartographic Ocean + Continents
      ctx.fillStyle = '#eef3f8';
      ctx.fillRect(0, 0, w, h);

      const lonToX = (lon: number) => ((lon + 180) / 360) * w;
      const latToY = (lat: number) => ((84 - lat) / 145) * h;

      ctx.save();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
      ctx.lineWidth = 0.8;
      for (let lon = -150; lon <= 150; lon += 30) {
        const gx = lonToX(lon);
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let lat = -45; lat <= 75; lat += 30) {
        const gy = latToY(lat);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      for (const poly of CONTINENT_POLYGONS) {
        ctx.beginPath();
        poly.forEach(([lon, lat], idx) => {
          const x = lonToX(lon);
          const y = latToY(lat);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
      ctx.restore();

      const cellR = Math.min(w * 0.084, h * 0.155, 72);
      const wmX = WORLD_MARKET.nx * w;
      const wmY = WORLD_MARKET.ny * h;
      const wmR = Math.min(w * 0.068, h * 0.125, 58);

      const getRegionAnchors = (reg: RegionConfig) => {
        const cx = reg.nx * w;
        const cy = reg.ny * h;
        return {
          cx,
          cy,
          M: { x: cx - cellR * 0.34, y: cy - cellR * 0.22 },
          S: { x: cx, y: cy + cellR * 0.42 },
          R: { x: cx + cellR * 0.36, y: cy - cellR * 0.18 },
        };
      };

      const showPriceLayer = activeLayer === 'all' || activeLayer === 'price';
      const showTradeLayer = activeLayer === 'all' || activeLayer === 'trade';
      const showLaborLayer = activeLayer === 'all' || activeLayer === 'labor';

      // 2. Unified World Market Global Price Waves (Law of One Price radiating outward!)
      if (showPriceLayer) {
        const priceDown = gStep.p_M_world < 0.96;
        for (let i = 0; i < 3; i++) {
          const ph = (wavePhase + i / 3) % 1;
          const rad = wmR + ph * (w * 0.36);
          const alpha = (1 - ph) * 0.34;
          ctx.save();
          ctx.strokeStyle = priceDown
            ? `rgba(217, 119, 6, ${alpha})`
            : `rgba(2, 132, 199, ${alpha})`;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(wmX, wmY, rad, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Connections Between Every Nation and the Unified World Market (Price Signal + Goods Trade)
      REGIONS.forEach((reg, rIdx) => {
        const data = rData[reg.id];
        if (!data) return;
        const { step, openVal, resVal } = data;
        const anchors = getRegionAnchors(reg);

        // Edge point on World Market -> Edge point on Country Membrane
        const dx = anchors.cx - wmX;
        const dy = anchors.cy - wmY;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;

        const startX = wmX + ux * (wmR + 4);
        const startY = wmY + uy * (wmR + 4);
        const endX = anchors.cx - ux * (cellR + 4);
        const endY = anchors.cy - uy * (cellR + 4);

        // Curve midpoint offset perpendicular to line
        const perpX = -uy * 22;
        const perpY = ux * 22;
        const ctrlX = (startX + endX) / 2 + perpX;
        const ctrlY = (startY + endY) / 2 + perpY;

        // A) Unified World Price Transmission Line: World Market -> Nation (blocked/weak if Closed!)
        if (showPriceLayer) {
          const isOpen = openVal > 0.42;
          const priceLineColor = isOpen ? '#d97706' : '#94a3b8';
          ctx.save();
          ctx.strokeStyle = priceLineColor;
          ctx.globalAlpha = isOpen ? 0.55 : 0.25;
          ctx.lineWidth = isOpen ? 2.0 : 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.stroke();
          ctx.restore();

          if (isOpen) {
            const pMid = quadPt(startX, startY, ctrlX, ctrlY, endX, endY, 0.55);
            drawArrowHead(ctx, pMid.x, pMid.y, pMid.angle, 5.5, '#d97706');
          }
        }

        // B) Goods / Commodity Trade Corridor: Nation <-> Unified World Market
        if (showTradeLayer && openVal > 0.25) {
          const isExporter = step.tradeBalance >= 0;
          const tradeColor = isExporter
            ? '#059669'
            : resVal > 0.3
            ? '#c2410c'
            : '#dc2626';

          const ctrl2X = (startX + endX) / 2 - perpX;
          const ctrl2Y = (startY + endY) / 2 - perpY;

          ctx.save();
          ctx.strokeStyle = tradeColor;
          ctx.globalAlpha = 0.28 + openVal * 0.45;
          ctx.lineWidth = 1.6 + Math.min(3.0, Math.abs(step.tradeBalance) * 18);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.quadraticCurveTo(ctrl2X, ctrl2Y, startX, startY);
          ctx.stroke();
          ctx.restore();

          // Exporter: arrow points Nation -> World Market; Net Importer: arrow points World Market -> Nation!
          const midG = quadPt(
            endX,
            endY,
            ctrl2X,
            ctrl2Y,
            startX,
            startY,
            isExporter ? 0.55 : 0.45
          );
          drawArrowHead(
            ctx,
            midG.x,
            midG.y,
            isExporter ? midG.angle : midG.angle + Math.PI,
            5.8,
            tradeColor
          );

          // Animate Goods/Price particles along these Unified Market links
          marketParticles.forEach((mp) => {
            if (mp.regionIdx !== rIdx) return;
            if (mp.channel === 'price' && (!showPriceLayer || openVal <= 0.42)) return;
            if (mp.channel === 'goods' && !showTradeLayer) return;

            if (!prefersReducedMotion) {
              const dir =
                mp.channel === 'price' ? 1 : isExporter ? 1 : -1;
              mp.t = (mp.t + dir * dt * mp.speed * motionMult + 1) % 1;
            }

            if (mp.channel === 'price') {
              const pos = quadPt(startX, startY, ctrlX, ctrlY, endX, endY, mp.t);
              ctx.save();
              ctx.fillStyle = '#d97706';
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, 2.7, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            } else {
              const pos = quadPt(endX, endY, ctrl2X, ctrl2Y, startX, startY, mp.t);
              ctx.save();
              ctx.translate(pos.x, pos.y);
              ctx.rotate(pos.angle);
              ctx.fillStyle = tradeColor;
              ctx.fillRect(-3, -2, 6, 4);
              ctx.restore();
            }
          });
        }
      });

      // 4. Draw Central Unified World Market Hub (The Global Price & Clearing Anchor!)
      ctx.save();
      ctx.beginPath();
      ctx.arc(wmX, wmY, wmR, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = gStep.p_M_world < 0.96 ? '#f59e0b' : '#38bdf8';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 9.5px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(L === 'zh' ? '统一世界市场' : 'UNIFIED WORLD MARKET', wmX, wmY - 18);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
      ctx.fillText(L === 'zh' ? '全球制造基准价' : 'World Mfg Price', wmX, wmY - 2);

      const wpDiff = (gStep.p_M_world - 1) * 100;
      ctx.fillStyle = wpDiff < -2 ? '#fbbf24' : '#38bdf8';
      ctx.font = '700 13px "IBM Plex Mono", monospace';
      ctx.fillText(
        `p_M* = ${gStep.p_M_world.toFixed(2)} (${wpDiff >= 0 ? '+' : ''}${wpDiff.toFixed(0)}%)`,
        wmX,
        wmY + 16
      );

      // Resource Price Note inside Unified Market
      const resPrice = 1 + p.resourceBoom * 0.45;
      ctx.fillStyle = p.resourceBoom > 0.2 ? '#fb923c' : '#64748b';
      ctx.font = '500 9.5px "IBM Plex Mono", monospace';
      ctx.fillText(`p_R* = ${resPrice.toFixed(2)}`, wmX, wmY + 32);
      ctx.restore();

      // 5. Draw Each Nation Cell: Pricing Regime Membrane + Local Price vs World Price + Domestic M/S/R Flows
      REGIONS.forEach((reg, rIdx) => {
        const data = rData[reg.id];
        if (!data) return;
        const { step, openVal, techVal, resVal, compAdv } = data;
        const anchors = getRegionAnchors(reg);
        const { cx, cy, M, S, R } = anchors;

        const isSel =
          selReg === reg.id ||
          (selReg === null && presetId === reg.archetypeId);

        // Nation Border Membrane (Solid = Domestic Market Clearing; Dashed = Open World Price-Taker)
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, cellR, 0, Math.PI * 2);
        ctx.fillStyle = isSel
          ? 'rgba(240, 249, 255, 0.94)'
          : 'rgba(255, 255, 255, 0.90)';
        ctx.fill();

        if (openVal > 0.42) {
          ctx.setLineDash([6, 4]);
        }
        ctx.lineWidth = isSel ? 2.6 : openVal <= 0.42 ? 2.6 : 1.6;
        ctx.strokeStyle = isSel
          ? '#0284c7'
          : openVal <= 0.42
          ? '#1e293b'
          : '#d97706';
        ctx.stroke();
        ctx.restore();

        // Country Title & Domestic Pricing Mechanism Tag
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 11.5px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
        ctx.fillStyle = isSel ? '#0369a1' : '#0f172a';
        ctx.fillText(L === 'zh' ? reg.nameZh : reg.nameEn, cx, cy - cellR - 18);

        // Price Regime line directly under title (Explains HOW price connects!)
        ctx.font = '600 10px "IBM Plex Mono", "Noto Sans SC", sans-serif';
        if (openVal <= 0.42) {
          ctx.fillStyle = '#334155';
          ctx.fillText(
            L === 'zh'
              ? `自主定价 p_M=${step.p_M_rel.toFixed(2)} (生产率推力)`
              : `Domestic p_M=${step.p_M_rel.toFixed(2)}`,
            cx,
            cy - cellR - 5
          );
        } else if (step.tradeBalance >= 0) {
          ctx.fillStyle = '#047857';
          ctx.fillText(
            L === 'zh'
              ? `接受 p_M*=${step.p_M_world.toFixed(2)} · 成本<世界价(顺差)`
              : `Takes p_M*=${step.p_M_world.toFixed(2)} · Cost < p*`,
            cx,
            cy - cellR - 5
          );
        } else {
          ctx.fillStyle = '#b91c1c';
          ctx.fillText(
            L === 'zh'
              ? `被迫接受 p_M*=${step.p_M_world.toFixed(2)} · 低于本地成本`
              : `Takes p_M*=${step.p_M_world.toFixed(2)} · Cost > p*`,
            cx,
            cy - cellR - 5
          );
        }
        ctx.restore();

        // Domestic Forces: Tech Productivity Wave (Closed/Export) vs Price Squeeze (Open Weak)
        if (techVal > 0.02) {
          const pr = 12 + wavePhase * 15;
          ctx.save();
          ctx.strokeStyle = `rgba(2, 132, 199, ${(1 - wavePhase) * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(M.x, M.y, pr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Domestic Labor Migration Paths (M <-> S and M -> R)
        const laborOut = step.laborFlowToMfg <= 0;
        const msSpeed = Math.min(1.5, 0.35 + Math.abs(step.laborFlowToMfg) * 2.2);

        if (showLaborLayer) {
          ctx.save();
          ctx.strokeStyle = laborOut ? '#0284c7' : '#059669';
          ctx.globalAlpha = 0.28;
          ctx.lineWidth = 2.0 + Math.min(2.2, Math.abs(step.laborFlowToMfg) * 3);
          ctx.beginPath();
          ctx.moveTo(M.x, M.y);
          ctx.quadraticCurveTo(cx - cellR * 0.42, cy + cellR * 0.12, S.x, S.y);
          ctx.stroke();
          ctx.restore();

          const msMid = quadPt(
            M.x,
            M.y,
            cx - cellR * 0.42,
            cy + cellR * 0.12,
            S.x,
            S.y,
            laborOut ? 0.56 : 0.44
          );
          drawArrowHead(
            ctx,
            msMid.x,
            msMid.y,
            laborOut ? msMid.angle : msMid.angle + Math.PI,
            4.8,
            laborOut ? '#0284c7' : '#059669'
          );

          if (step.resourcePull > 0.12) {
            ctx.save();
            ctx.strokeStyle = '#c2410c';
            ctx.globalAlpha = 0.25 + step.resourcePull * 0.45;
            ctx.lineWidth = 1.6 + step.resourcePull * 2.2;
            ctx.beginPath();
            ctx.moveTo(M.x, M.y);
            ctx.quadraticCurveTo(cx, cy - cellR * 0.34, R.x, R.y);
            ctx.stroke();
            ctx.restore();

            const mrMid = quadPt(M.x, M.y, cx, cy - cellR * 0.34, R.x, R.y, 0.54);
            drawArrowHead(ctx, mrMid.x, mrMid.y, mrMid.angle, 4.8, '#c2410c');
          }

          workerParticles.forEach((wp) => {
            if (wp.regionIdx !== rIdx) return;
            if (wp.channel === 'MR' && step.resourcePull <= 0.12) return;
            if (!prefersReducedMotion) {
              const dir = wp.channel === 'MS' && !laborOut ? -1 : 1;
              const spdScale =
                wp.channel === 'MR' ? 0.5 + step.resourcePull : msSpeed;
              wp.t = (wp.t + dir * dt * wp.speed * spdScale * motionMult + 1) % 1;
            }
            const pos =
              wp.channel === 'MS'
                ? quadPt(M.x, M.y, cx - cellR * 0.42, cy + cellR * 0.12, S.x, S.y, wp.t)
                : quadPt(M.x, M.y, cx, cy - cellR * 0.34, R.x, R.y, wp.t);

            drawHumanDot(
              ctx,
              pos.x,
              pos.y,
              wp.channel === 'MR' ? '#c2410c' : laborOut ? '#0284c7' : '#059669'
            );
          });
        }

        // Domestic 3 Sector Circles (M, S, R)
        const mEmpR = 7.5 + step.empShare * 24;
        const mRealR = 9 + step.realShare * 26;
        ctx.save();
        ctx.beginPath();
        ctx.arc(M.x, M.y, mRealR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.38)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(M.x, M.y, mEmpR, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 9px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(L === 'zh' ? '工' : 'M', M.x, M.y);
        ctx.restore();

        const sR = 8.5 + step.svcEmpShare * 17;
        ctx.save();
        ctx.beginPath();
        ctx.arc(S.x, S.y, sR, 0, Math.PI * 2);
        ctx.fillStyle = '#0d9488';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 9px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(L === 'zh' ? '服' : 'S', S.x, S.y);
        ctx.restore();

        const rR = 6 + step.resEmpShare * 30 + resVal * 4.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(R.x, R.y, rR, 0, Math.PI * 2);
        ctx.fillStyle = resVal > 0.2 ? '#c2410c' : '#94a3b8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 8.5px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(L === 'zh' ? '资' : 'R', R.x, R.y);
        ctx.restore();
      });

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
    const cellR = Math.min(w * 0.084, h * 0.155, 72);

    for (const reg of REGIONS) {
      const dist = Math.hypot(x - reg.nx * w, y - reg.ny * h);
      if (dist <= cellR + 14) {
        setSelectedRegion(reg.id);
        const arch = RODRIK_ARCHETYPES.find((a) => a.id === reg.archetypeId);
        if (arch) {
          onApplyPreset(arch.id, arch.params);
        }
        return;
      }
    }
    setSelectedRegion(null);
  };

  const getSubtitle = () => {
    const wpPct = ((activeStep.p_M_world - 1) * 100).toFixed(1);
    if (lang === 'zh') {
      return `${activeStep.year} 年统一世界市场基准价 p_M* = ${activeStep.p_M_world.toFixed(2)}（${wpPct}%）：实线边界经济体（北美/西欧）按国内生产率自主定价，虚线开放经济体被迫按统一世界价 p_M* 竞争，决定本国工厂扩缩与工人流向。`;
    }
    return `${activeStep.year} Unified World Price p_M* = ${activeStep.p_M_world.toFixed(2)} (${wpPct}%): Solid-border large economies clear prices domestically; dashed-border open economies take world price p_M*, determining factory survival and worker migration.`;
  };

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            {lang === 'zh'
              ? '统一世界市场价格传导与国别流动地图'
              : 'Unified World Market Price & Global Flows Map'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="hidden sm:inline">
            {lang === 'zh'
              ? '实线边框=自主定价 · 虚线边框=接受世界统一价 p_M*'
              : 'Solid border=Domestic pricing · Dashed=World price-taker'}
          </span>
        </div>

        {/* Layer Filter */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg">
          {(
            [
              { id: 'all', zh: '全部机制', en: 'All' },
              { id: 'price', zh: '统一价格传导', en: 'Price Signal' },
              { id: 'trade', zh: '商品与资源流', en: 'Goods & Res' },
              { id: 'labor', zh: '国内人的流动', en: 'Labor Flow' },
            ] as { id: MapLayer; zh: string; en: string }[]
          ).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLayer(l.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                layer === l.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'zh' ? l.zh : l.en}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive 2D Map Canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-[460px] sm:h-[500px] overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full block cursor-pointer"
        />

        {/* Crisp Legend */}
        <div className="absolute bottom-2.5 left-3 right-3 z-10 bg-white/94 border border-slate-200 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10.5px] text-slate-700">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block" />
              {lang === 'zh' ? '工(M)：蓝圈=就业 / 虚线环=实际产出' : 'M: Jobs / Real Output'}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
              {lang === 'zh' ? '服(S)：服务业' : 'S: Services'}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-700 inline-block" />
              {lang === 'zh' ? '资(R)：初级资源' : 'R: Resources'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
            <span className="inline-flex items-center gap-1 text-amber-700">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-600 inline-block" />
              {lang === 'zh' ? '统一世界价 p_M* 传导' : 'World Price p_M*'}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
              {lang === 'zh' ? '净出口供给' : 'Net Exports'}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-700">
              <span className="w-3 h-0.5 bg-rose-600 inline-block" />
              {lang === 'zh' ? '进口挤出' : 'Import Pressure'}
            </span>
          </div>
        </div>
      </div>

      {/* Documentary Timeline Bar */}
      <div className="px-4 py-3 bg-slate-900 text-slate-100 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? (lang === 'zh' ? '暂停' : 'Pause') : lang === 'zh' ? '播放演进' : 'Play'}
          </button>

          <button
            type="button"
            onClick={onResetTimeline}
            title={lang === 'zh' ? '回到基期 1975' : 'Restart 1975'}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onChangeSpeed(playbackSpeed === 1 ? 2 : 1)}
            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 cursor-pointer"
          >
            {playbackSpeed}x
          </button>

          <input
            type="range"
            min={0}
            max={40}
            value={currentIndex}
            onChange={(e) => onSeekIndex(Number(e.target.value))}
            aria-label={lang === 'zh' ? '时间演进进度' : 'Timeline progress'}
            className="flex-1 accent-sky-500 cursor-pointer"
          />

          <span className="text-xs font-mono tabular-nums text-slate-300 whitespace-nowrap shrink-0">
            {activeStep.year} / 2015
          </span>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed">
          {getSubtitle()}
        </div>
      </div>
    </div>
  );
};
