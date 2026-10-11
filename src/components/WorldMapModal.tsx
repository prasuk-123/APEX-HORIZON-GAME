import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveRaceSession,
  CustomTrackPoint,
  LeaderboardEntry,
  RemotePlayerState,
  TelemetryFrame,
  TrackedDestination,
  WorldPointOfInterest,
  WorldRaceEvent,
} from '../types/game';
import { WORLD_POIS, WORLD_RACES } from '../data/vehicles';
import {
  computeRaceRoadPath,
  computeRoadNetworkPath,
  FOREST_SMALL_ROAD_X_COORDS,
  FOREST_SMALL_ROAD_Z_COORDS,
  getMainRiverCenterX,
  MAJOR_GRID_COORDS,
  RIVER_BRIDGE_Z_COORDS,
  SMALL_STREET_COORDS,
  WORLD_ELEVATED_FLYOVERS,
  WORLD_PROCEDURAL_BUILDINGS,
  WORLD_REDWOOD_TREES,
} from '../physics/vehiclePhysics';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Compass,
  Crosshair,
  Flag,
  Flame,
  LocateFixed,
  MapPin,
  Mountain,
  Navigation,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Users,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface WorldMapModalProps {
  telemetry: TelemetryFrame;
  remotePlayers: RemotePlayerState[];
  leaderboard: LeaderboardEntry[];
  customTrackPoints: CustomTrackPoint[];
  trackedDestination: TrackedDestination | null;
  activeRaceSession?: ActiveRaceSession | null;
  completedRaces?: Record<
    string,
    { bestTimeSec: number; bestPosition: number; completions: number }
  >;
  onAddCustomTrackPoint: (point: CustomTrackPoint) => void;
  onRemoveCustomTrackPoint: (id: string) => void;
  onClearCustomTrackPoints: () => void;
  onSetTrackedDestination: (dest: TrackedDestination | null) => void;
  onStartRaceEvent: (race: WorldRaceEvent) => void;
  onFastTravelCoords: (x: number, z: number, heading: number) => void;
  onClose: () => void;
}

const WORLD_HALF_SPAN = 6400; // [-6400m .. +6400m]

let cachedSatelliteMapDataUrl: string | null = null;

/**
 * Generates a high-resolution photorealistic satellite & shaded-relief topographic map
 * inspired by Forza Horizon 5's aerial world map:
 * - West & East/SE ocean coastlines with sandy bays, surf foam & turquoise shallows
 * - NW La Gran Caldera volcano massif with crater lake, basalt ridges & snow rim
 * - NE & North Alpine Glacier snow peaks, gorges & evergreen forests
 * - SW Sahara Red Canyon striated rock formations & golden desert sand dunes
 * - West Emerald Rainforest canopy & South-Central patchwork farmlands / meadows
 * - Winding Grand River with tributaries & 23 ornate bridges
 * - 750+ 3D building footprints & landmarks
 * - Two-tone road network: White/grey paved highways & boulevards + Orange dirt/rally trails
 */
export function getWorldSatelliteMapDataUrl(): string {
  if (cachedSatelliteMapDataUrl) {
    return cachedSatelliteMapDataUrl;
  }

  const FINAL_SIZE = 1200;
  const RASTER_SIZE = 600;

  const rasterCanvas = document.createElement('canvas');
  rasterCanvas.width = RASTER_SIZE;
  rasterCanvas.height = RASTER_SIZE;
  const rCtx = rasterCanvas.getContext('2d');
  if (!rCtx) return '';

  const imgData = rCtx.createImageData(RASTER_SIZE, RASTER_SIZE);
  const data = imgData.data;

  // Helper: synthetic topographic height for rich satellite hillshading across the 16km world
  const sampleSatelliteElevation = (wx: number, wz: number): number => {
    // 1. NW Volcanic Caldera Mountain Massif centered around (-3150, -3050)
    const dxVolc = wx - -3150;
    const dzVolc = wz - -3050;
    const rVolc = Math.hypot(dxVolc, dzVolc);
    const angleVolc = Math.atan2(dzVolc, dxVolc);
    const radialRidges =
      Math.sin(angleVolc * 9 + rVolc * 0.002) * 0.18 +
      Math.cos(angleVolc * 15 - rVolc * 0.003) * 0.12;
    let volcHeight = 0;
    if (rVolc < 2500) {
      const normR = rVolc / 2500;
      const cone = Math.pow(Math.max(0, 1 - normR), 1.55) * 95;
      // Central crater depression inside r < 340m
      const craterDip =
        rVolc < 380 ? Math.pow(1 - rVolc / 380, 1.8) * 52 : 0;
      volcHeight = Math.max(0, cone * (1 + radialRidges) - craterDip);
    }

    // 2. NE & North Alpine Glacier Peaks around (2650, -3250) and (200, -4400)
    const rAlp1 = Math.hypot(wx - 2750, wz - -3200);
    const rAlp2 = Math.hypot(wx - -350, wz - -4350);
    const alpRidge =
      Math.sin(wx * 0.0028 + wz * 0.0019) * Math.cos(wx * 0.0017 - wz * 0.0031);
    let alpineHeight = 0;
    if (rAlp1 < 2800) {
      alpineHeight += Math.pow(1 - rAlp1 / 2800, 1.45) * (78 + alpRidge * 28);
    }
    if (rAlp2 < 2300) {
      alpineHeight += Math.pow(1 - rAlp2 / 2300, 1.5) * (64 + alpRidge * 22);
    }

    // 3. SW Red Canyon & Mesa Escarpments around (-3100, 3100)
    const rCanyon = Math.hypot(wx - -3000, wz - 2950);
    let canyonHeight = 0;
    if (rCanyon < 2600) {
      const mesaWave = Math.sin(wx * 0.005 + Math.sin(wz * 0.004) * 2.2);
      const stepMesa = Math.floor((mesaWave + 1) * 2.5) / 5;
      canyonHeight = Math.pow(1 - rCanyon / 2600, 1.2) * (36 + stepMesa * 24);
    }

    // 4. West Rainforest Highland Ridge around (-3500, 150)
    const rForest = Math.hypot(wx - -3400, wz - 200);
    const forestHills =
      rForest < 2400
        ? Math.pow(1 - rForest / 2400, 1.4) *
          (34 + Math.sin(wx * 0.004) * Math.cos(wz * 0.004) * 14)
        : 0;

    // 5. Rolling central & southern hills
    const baseHills =
      (1 + Math.sin(wx * 0.0016) * Math.cos(wz * 0.0016)) * 6.5 +
      (1 + Math.sin((wx + wz) * 0.0038)) * 3.5 +
      (1 + Math.cos((wx * 0.7 - wz) * 0.0075)) * 2.0;

    // Flatten slightly in central Paris basin & river valley
    const distCenter = Math.hypot(wx, wz);
    const basinFactor = Math.min(1, Math.max(0.18, (distCenter - 380) / 1400));

    return (volcHeight + alpineHeight + canyonHeight + forestHills + baseHills) * basinFactor;
  };

  // Precompute elevation grid for fast finite-difference hillshading
  const elevGrid = new Float32Array((RASTER_SIZE + 1) * (RASTER_SIZE + 1));
  for (let py = 0; py <= RASTER_SIZE; py++) {
    const wz = ((py / RASTER_SIZE) * 2 - 1) * WORLD_HALF_SPAN;
    for (let px = 0; px <= RASTER_SIZE; px++) {
      const wx = ((px / RASTER_SIZE) * 2 - 1) * WORLD_HALF_SPAN;
      elevGrid[py * (RASTER_SIZE + 1) + px] = sampleSatelliteElevation(wx, wz);
    }
  }

  for (let py = 0; py < RASTER_SIZE; py++) {
    const wz = ((py / RASTER_SIZE) * 2 - 1) * WORLD_HALF_SPAN;
    for (let px = 0; px < RASTER_SIZE; px++) {
      const wx = ((px / RASTER_SIZE) * 2 - 1) * WORLD_HALF_SPAN;
      const idx = (py * RASTER_SIZE + px) * 4;

      // 1. Check West & East/SE Coastal Ocean Boundaries (like the Forza Horizon 5 map coastlines)
      const westCoastX =
        -5250 +
        Math.sin(wz * 0.00095) * 420 +
        Math.cos(wz * 0.0023) * 220 +
        Math.sin(wz * 0.0052) * 85;
      const eastCoastX =
        5350 -
        Math.max(0, wz - 600) * 0.24 +
        Math.sin(wz * 0.0011) * 380 +
        Math.cos(wz * 0.0026) * 190;

      const dWestOcean = westCoastX - wx; // > 0 means in West Ocean
      const dEastOcean = wx - eastCoastX; // > 0 means in East/SE Ocean
      const oceanDepth = Math.max(dWestOcean, dEastOcean);

      if (oceanDepth > 0) {
        // Ocean water with coastal turquoise shallows & surf foam
        const shallowNorm = Math.min(1, oceanDepth / 520);
        const waveTex = Math.sin(wx * 0.02 + wz * 0.02) * 4;
        if (oceanDepth < 32) {
          // White/turquoise surf line
          data[idx] = 175;
          data[idx + 1] = 228;
          data[idx + 2] = 232;
          data[idx + 3] = 255;
        } else {
          // Interpolate from turquoise lagoon (32, 148, 168) to deep navy ocean (10, 42, 66)
          const r = Math.round(34 * (1 - shallowNorm) + 9 * shallowNorm + waveTex);
          const g = Math.round(148 * (1 - shallowNorm) + 44 * shallowNorm + waveTex);
          const b = Math.round(168 * (1 - shallowNorm) + 72 * shallowNorm + waveTex);
          data[idx] = Math.max(6, Math.min(255, r));
          data[idx + 1] = Math.max(20, Math.min(255, g));
          data[idx + 2] = Math.max(38, Math.min(255, b));
          data[idx + 3] = 255;
        }
        continue;
      }

      // Coastal sandy beach strip near ocean edge (-85 < oceanDepth <= 0)
      const beachFactor = oceanDepth > -95 ? (oceanDepth + 95) / 95 : 0;

      const h = elevGrid[py * (RASTER_SIZE + 1) + px];
      const hRight = elevGrid[py * (RASTER_SIZE + 1) + (px + 1)];
      const hDown = elevGrid[(py + 1) * (RASTER_SIZE + 1) + px];

      // Directional Sun Hillshading from NW (-1, -1)
      const dhx = hRight - h;
      const dhz = hDown - h;
      const shade = Math.max(0.52, Math.min(1.38, 1.0 + (dhx * 0.68 + dhz * 0.68) * 0.16));

      // Fine organic ground noise
      const n1 = Math.sin(wx * 0.013 + wz * 0.011) * Math.cos(wx * 0.009 - wz * 0.015);
      const n2 = Math.sin(wx * 0.037 - wz * 0.029) * 0.5;

      // Determine biome & elevation color blends
      const distVolc = Math.hypot(wx - -3150, wz - -3050);
      const distAlp1 = Math.hypot(wx - 2750, wz - -3200);
      const distAlp2 = Math.hypot(wx - -350, wz - -4350);
      const distCenter = Math.hypot(wx, wz);

      // Base lush subtropical/temperate terrain RGB (olive/emerald/earth)
      let r = 74 + n1 * 14 + n2 * 8;
      let g = 104 + n1 * 16 + n2 * 9;
      let b = 56 + n1 * 9 + n2 * 5;

      // West Emerald Rainforest lush deep jungle green
      if (wx < -800 && wz > -1800 && wz < 2200) {
        const jungleWeight = Math.min(1, (-800 - wx) / 1600) * Math.min(1, (2200 - Math.abs(wz - 200)) / 1600);
        const jR = 42 + n1 * 12;
        const jG = 86 + n1 * 18 + n2 * 10;
        const jB = 40 + n1 * 8;
        r = r * (1 - jungleWeight) + jR * jungleWeight;
        g = g * (1 - jungleWeight) + jG * jungleWeight;
        b = b * (1 - jungleWeight) + jB * jungleWeight;
      }

      // SW & South Sahara Red Canyon & Golden Sand Dunes
      if (wz > 600 || (wx < -1200 && wz > 200)) {
        const desertW = Math.min(
          1,
          Math.max(0, (wz - 500) / 1800 + (wx < -1000 ? (-1000 - wx) / 3200 : 0) * (wz > 0 ? 0.6 : 0))
        );
        if (desertW > 0) {
          // Striated red canyon vs golden sand dunes
          const duneStripe = Math.sin(wx * 0.0045 + Math.cos(wz * 0.0035) * 2.0);
          const isRedRock = wx < -1400 && wz > 1400;
          const dR = isRedRock ? 168 + duneStripe * 22 : 186 + duneStripe * 18;
          const dG = isRedRock ? 98 + duneStripe * 16 : 142 + duneStripe * 15;
          const dB = isRedRock ? 64 + duneStripe * 10 : 88 + duneStripe * 12;
          r = r * (1 - desertW) + dR * desertW;
          g = g * (1 - desertW) + dG * desertW;
          b = b * (1 - desertW) + dB * desertW;
        }
      }

      // South-East & Central Patchwork Farmlands / Lavender Highlands
      if (wz > 400 && wx > -900 && wx < 3600) {
        const farmW = Math.min(0.75, Math.max(0, (wz - 400) / 1800) * Math.max(0, 1 - Math.abs(wx - 1100) / 2600));
        const patchX = Math.floor((wx + 6000) / 340);
        const patchZ = Math.floor((wz + 6000) / 280);
        const patchHash = Math.abs(Math.sin(patchX * 12.9898 + patchZ * 78.233) * 43758.5453) % 1;
        const fR = patchHash > 0.65 ? 146 : patchHash > 0.35 ? 92 : 112;
        const fG = patchHash > 0.65 ? 132 : patchHash > 0.35 ? 118 : 96;
        const fB = patchHash > 0.65 ? 76 : patchHash > 0.35 ? 62 : 98;
        r = r * (1 - farmW) + fR * farmW;
        g = g * (1 - farmW) + fG * farmW;
        b = b * (1 - farmW) + fB * farmW;
      }

      // NW Volcanic Caldera (*La Gran Caldera*) russet basalt, ash & crater lake
      if (distVolc < 2500) {
        const volcW = Math.min(1, Math.pow(1 - distVolc / 2500, 0.85));
        if (distVolc < 210) {
          // Glowing Caldera Crater Lake (deep teal-turquoise & warm volcanic rim)
          const lakeW = 1 - distVolc / 210;
          r = 28 * lakeW + 95 * (1 - lakeW);
          g = 132 * lakeW + 72 * (1 - lakeW);
          b = 152 * lakeW + 58 * (1 - lakeW);
        } else {
          // Russet-brown volcanic slopes with snow/ash highlights on high ridges
          const isHighRim = distVolc > 220 && distVolc < 720 && h > 42;
          const vR = isHighRim ? 198 + n1 * 18 : 118 + n1 * 18;
          const vG = isHighRim ? 186 + n1 * 16 : 82 + n1 * 14;
          const vB = isHighRim ? 178 + n1 * 16 : 64 + n1 * 10;
          r = r * (1 - volcW) + vR * volcW;
          g = g * (1 - volcW) + vG * volcW;
          b = b * (1 - volcW) + vB * volcW;
        }
      }

      // NE & North Alpine Glacier & Snow Peaks
      const minAlpDist = Math.min(distAlp1, distAlp2 * 1.1);
      if (minAlpDist < 2700 || wz < -2400) {
        const alpW = Math.min(
          1,
          Math.max(
            minAlpDist < 2700 ? Math.pow(1 - minAlpDist / 2700, 0.9) : 0,
            wz < -2400 ? Math.min(0.85, (-2400 - wz) / 2200) : 0
          )
        );
        const snowLine = h > 36 ? Math.min(1, (h - 36) / 24) : 0;
        const aR = 72 * (1 - snowLine) + 228 * snowLine;
        const aG = 88 * (1 - snowLine) + 236 * snowLine;
        const aB = 78 * (1 - snowLine) + 245 * snowLine;
        r = r * (1 - alpW) + aR * alpW;
        g = g * (1 - alpW) + aG * alpW;
        b = b * (1 - alpW) + aB * alpW;
      }

      // Central Paris Metropolis warm urban stone ground tint
      if (distCenter < 1650) {
        const cityW = Math.pow(1 - distCenter / 1650, 1.35) * 0.58;
        r = r * (1 - cityW) + 148 * cityW;
        g = g * (1 - cityW) + 142 * cityW;
        b = b * (1 - cityW) + 132 * cityW;
      }

      // Blend sandy coastline beach
      if (beachFactor > 0) {
        r = r * (1 - beachFactor) + 218 * beachFactor;
        g = g * (1 - beachFactor) + 192 * beachFactor;
        b = b * (1 - beachFactor) + 146 * beachFactor;
      }

      // Subtle topographic contour lines every 9m of elevation
      const contourFrac = (h % 9) / 9;
      const contourDarken = contourFrac < 0.065 && h > 11 ? 0.88 : 1.0;

      data[idx] = Math.max(0, Math.min(255, Math.round(r * shade * contourDarken)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(g * shade * contourDarken)));
      data[idx + 2] = Math.max(0, Math.min(255, Math.round(b * shade * contourDarken)));
      data[idx + 3] = 255;
    }
  }

  rCtx.putImageData(imgData, 0, 0);

  // Create final high-resolution 1200x1200 canvas for crisp roads, rivers, buildings & bridges
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = FINAL_SIZE;
  finalCanvas.height = FINAL_SIZE;
  const ctx = finalCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(rasterCanvas, 0, 0, FINAL_SIZE, FINAL_SIZE);

  const toPx = (coord: number) => ((coord + WORLD_HALF_SPAN) / (WORLD_HALF_SPAN * 2)) * FINAL_SIZE;
  const toLen = (meters: number) => (meters / (WORLD_HALF_SPAN * 2)) * FINAL_SIZE;

  // 1. Scenic Open Fields & Lush Parklands
  const openFields = [
    { cx: 165, cz: 5, w: 125, d: 195 },
    { cx: -340, cz: 315, w: 340, d: 350 },
    { cx: 440, cz: 630, w: 460, d: 410 },
    { cx: -530, cz: -1200, w: 520, d: 440 },
    { cx: 630, cz: -630, w: 410, d: 410 },
    { cx: -1200, cz: -345, w: 440, d: 380 },
  ];
  for (const fld of openFields) {
    ctx.fillStyle = 'rgba(72, 148, 68, 0.55)';
    ctx.strokeStyle = 'rgba(42, 98, 44, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(
      toPx(fld.cx - fld.w / 2),
      toPx(fld.cz - fld.d / 2),
      toLen(fld.w),
      toLen(fld.d),
      6
    );
    ctx.fill();
    ctx.stroke();
  }

  // 2. Winding Tributary Streams feeding into the Main River
  const drawRiverPath = (pts: [number, number][], widthPx: number) => {
    if (pts.length < 2) return;
    // Lush green riparian bank halo
    ctx.beginPath();
    ctx.moveTo(toPx(pts[0][0]), toPx(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(toPx(pts[i][0]), toPx(pts[i][1]));
    ctx.strokeStyle = 'rgba(52, 96, 58, 0.55)';
    ctx.lineWidth = widthPx + 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Deep river water
    ctx.strokeStyle = '#0e4d6e';
    ctx.lineWidth = widthPx + 2;
    ctx.stroke();

    // Turquoise-cyan river surface highlight
    ctx.strokeStyle = '#2596be';
    ctx.lineWidth = Math.max(1.5, widthPx - 1.5);
    ctx.stroke();
  };

  // Main Winding North-to-South Grand River
  const mainRiverPts: [number, number][] = [];
  for (let z = -6200; z <= 6200; z += 80) {
    mainRiverPts.push([getMainRiverCenterX(z), z]);
  }
  drawRiverPath(mainRiverPts, 9);

  // NW Volcano Gorge Tributary & NE Alpine Glacier Tributary
  const nwTribPts: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.05) {
    const x = -2950 * (1 - t) + getMainRiverCenterX(-1800) * t;
    const z = -2950 * (1 - t) + -1800 * t + Math.sin(t * Math.PI * 3) * 180;
    nwTribPts.push([x, z]);
  }
  drawRiverPath(nwTribPts, 4.5);

  const neTribPts: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.05) {
    const x = 3200 * (1 - t) + getMainRiverCenterX(-900) * t;
    const z = -2800 * (1 - t) + -900 * t + Math.cos(t * Math.PI * 2.5) * 160;
    neTribPts.push([x, z]);
  }
  drawRiverPath(neTribPts, 4.5);

  // 3. 750+ 3D Building Footprints Across the Map (with subtle drop shadows)
  for (let i = 0; i < WORLD_PROCEDURAL_BUILDINGS.length; i++) {
    const b = WORLD_PROCEDURAL_BUILDINGS[i];
    const bx = toPx(b.x - b.width * 0.5);
    const bz = toPx(b.z - b.depth * 0.5);
    const bw = Math.max(2.2, toLen(b.width));
    const bd = Math.max(2.2, toLen(b.depth));

    // Building shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(bx + 1.2, bz + 1.2, bw, bd);

    // Building rooftop tint by architectural style
    if (b.style === 'haussmann') {
      ctx.fillStyle = '#d6c7b2';
    } else if (b.style === 'skyscraper') {
      ctx.fillStyle = '#7dd3fc';
    } else if (b.style === 'desert_kasbah') {
      ctx.fillStyle = '#d97706';
    } else if (b.style === 'alpine_chalet') {
      ctx.fillStyle = '#e2e8f0';
    } else {
      ctx.fillStyle = '#94a3b8';
    }
    ctx.fillRect(bx, bz, bw, bd);
  }

  // 4. Organic Off-Road Dirt & Rally Switchback Trails (High-Contrast Dark Casing + Bright Orange Trail)
  const drawDirtTrail = (pts: [number, number][], dashed = false) => {
    if (pts.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(toPx(pts[0][0]), toPx(pts[0][1]));
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(toPx(pts[i][0]), toPx(pts[i][1]));
    }
    ctx.strokeStyle = 'rgba(15, 10, 6, 0.88)';
    ctx.lineWidth = 6.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dashed) ctx.setLineDash([7, 5]);
    ctx.stroke();

    ctx.strokeStyle = '#ff6b00'; // Vibrant Rally Orange
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.restore();
  };

  // Volcano Caldera Switchback Climb Trail (NW)
  const volcanoSwitchbacks: [number, number][] = [
    [-1800, -1800],
    [-2150, -1950],
    [-2050, -2300],
    [-2480, -2420],
    [-2380, -2780],
    [-2820, -2850],
    [-2740, -3220],
    [-3150, -3350],
    [-3450, -3100],
    [-3250, -2780],
  ];
  drawDirtTrail(volcanoSwitchbacks);

  // Alpine Glacier Switchback Trail (NE)
  const alpineSwitchbacks: [number, number][] = [
    [1800, -1800],
    [2200, -2050],
    [2050, -2450],
    [2550, -2650],
    [2400, -3050],
    [2900, -3250],
    [3250, -2900],
    [2950, -2400],
  ];
  drawDirtTrail(alpineSwitchbacks);

  // Sahara Red Canyon & Dune Rally Trail (SW)
  const saharaTrail: [number, number][] = [
    [-1800, 1800],
    [-2300, 2050],
    [-2150, 2550],
    [-2750, 2750],
    [-3250, 3150],
    [-2800, 3550],
    [-2100, 3350],
    [-1500, 3600],
    [-900, 3200],
  ];
  drawDirtTrail(saharaTrail);

  // Emerald Rainforest Jungle Canopy Trail (West)
  const jungleTrail: [number, number][] = [
    [-1800, 0],
    [-2350, -380],
    [-2850, -120],
    [-3350, -480],
    [-3850, 120],
    [-3450, 680],
    [-2750, 480],
    [-2200, 900],
  ];
  drawDirtTrail(jungleTrail);

  //Mediterranean Riviera Cliff & Lavender Trail (SE)
  const rivieraTrail: [number, number][] = [
    [1800, 1800],
    [2400, 2150],
    [2950, 1950],
    [3450, 2450],
    [3100, 3150],
    [2450, 3450],
    [1800, 3000],
  ];
  drawDirtTrail(rivieraTrail, true);

  // 5. Small Urban & Country Side Streets (SMALL_STREET_COORDS) + Dense Western Forest Small Roads
  const minSmall = toPx(-4800);
  const maxSmall = toPx(4800);
  ctx.lineCap = 'butt';
  for (const c of SMALL_STREET_COORDS) {
    const p = toPx(c);
    // Deep slate asphalt casing so roads stand out against golden sand
    ctx.strokeStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(p, minSmall);
    ctx.lineTo(p, maxSmall);
    ctx.moveTo(minSmall, p);
    ctx.lineTo(maxSmall, p);
    ctx.stroke();

    // Crisp cool white-slate street fill
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.85)';
    ctx.lineWidth = 1.7;
    ctx.stroke();
  }

  // 5B. Dense Western Forest Small Roads (Filling the Western Forest Biome)
  const fMinZ = toPx(-3600);
  const fMaxZ = toPx(3600);
  const fMinX = toPx(-5800);
  const fMaxX = toPx(-600);
  for (const fx of FOREST_SMALL_ROAD_X_COORDS) {
    const px = toPx(fx);
    ctx.strokeStyle = 'rgba(9, 18, 14, 0.85)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(px, fMinZ);
    ctx.lineTo(px, fMaxZ);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.82)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (const fz of FOREST_SMALL_ROAD_Z_COORDS) {
    const pz = toPx(fz);
    ctx.strokeStyle = 'rgba(9, 18, 14, 0.85)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(fMinX, pz);
    ctx.lineTo(fMaxX, pz);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.82)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 5C. 1,250+ Dense Forest Trees in the Western Forest Biome
  for (let i = 0; i < WORLD_REDWOOD_TREES.length; i++) {
    const tree = WORLD_REDWOOD_TREES[i];
    const px = toPx(tree.x);
    const pz = toPx(tree.z);
    const rad = Math.max(1.4, (tree.scale || 1) * 1.65);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(6, 78, 59, 0.82)' : 'rgba(20, 83, 45, 0.78)';
    ctx.beginPath();
    ctx.arc(px, pz, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 6. 96 Major Grid Boulevards (MAJOR_GRID_COORDS) — with ground road removed below Elevated Highways
  const drawSplitBoulevardOnMap = (axis: 'x' | 'z', fixedCoord: number) => {
    const matchingFlyovers = WORLD_ELEVATED_FLYOVERS.filter(
      (f) => f.axis === axis && f.fixedCoord === fixedCoord
    ).sort((a, b) => a.startCoord - b.startCoord);

    const spans: [number, number][] = [];
    let cursor = -5800;
    for (const f of matchingFlyovers) {
      if (f.startCoord > cursor) {
        spans.push([cursor, f.startCoord]);
      }
      cursor = Math.max(cursor, f.endCoord);
    }
    if (cursor < 5800) {
      spans.push([cursor, 5800]);
    }

    const pFixed = toPx(fixedCoord);
    for (const [s0, s1] of spans) {
      const p0 = toPx(s0);
      const p1 = toPx(s1);
      ctx.strokeStyle = 'rgba(9, 13, 22, 0.94)';
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      if (axis === 'z') {
        ctx.moveTo(pFixed, p0);
        ctx.lineTo(pFixed, p1);
      } else {
        ctx.moveTo(p0, pFixed);
        ctx.lineTo(p1, pFixed);
      }
      ctx.stroke();

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
  };

  for (const c of MAJOR_GRID_COORDS) {
    drawSplitBoulevardOnMap('z', c);
    drawSplitBoulevardOnMap('x', c);
  }

  // 6B. 8 Elevated Highway Flyovers & Viaducts (Outside Main City Center)
  for (const flyover of WORLD_ELEVATED_FLYOVERS) {
    const x1 = flyover.axis === 'x' ? toPx(flyover.startCoord) : toPx(flyover.fixedCoord);
    const y1 = flyover.axis === 'x' ? toPx(flyover.fixedCoord) : toPx(flyover.startCoord);
    const x2 = flyover.axis === 'x' ? toPx(flyover.endCoord) : toPx(flyover.fixedCoord);
    const y2 = flyover.axis === 'x' ? toPx(flyover.fixedCoord) : toPx(flyover.endCoord);

    ctx.strokeStyle = 'rgba(2, 6, 23, 0.98)';
    ctx.lineWidth = 9.0;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4.6;
    ctx.stroke();
  }

  // 7. Big Arterials, Diagonal Highways & 6 Concentric Ring Highways
  const centerPx = toPx(0);
  const ringRadii = [5400, 4200, 3000, 1800, 900, 265];

  // Diagonal Highways casing + fill (starting from 265m Périphérique Ring)
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(9, 13, 22, 0.96)';
  ctx.lineWidth = 10.2;
  ctx.beginPath();
  ctx.moveTo(toPx(-4600), toPx(-4600));
  ctx.lineTo(toPx(-187), toPx(-187));
  ctx.moveTo(toPx(187), toPx(187));
  ctx.lineTo(toPx(4600), toPx(4600));
  ctx.moveTo(toPx(4600), toPx(-4600));
  ctx.lineTo(toPx(187), toPx(-187));
  ctx.moveTo(toPx(-187), toPx(187));
  ctx.lineTo(toPx(-4600), toPx(4600));
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5.6;
  ctx.stroke();

  // 4 Concentric Ring Highways (265m, 900m, 1800m, 4200m)
  for (const rMeters of ringRadii) {
    const rPx = toLen(rMeters);
    ctx.beginPath();
    ctx.arc(centerPx, centerPx, rPx, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(9, 13, 22, 0.96)';
    ctx.lineWidth = rMeters === 4200 ? 11.5 : 9.2;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = rMeters === 4200 ? 6.4 : 5.0;
    ctx.stroke();
  }

  // N-S Autoroute & E-W Trans-Continental Autobahn
  ctx.beginPath();
  ctx.moveTo(centerPx, toPx(-5800));
  ctx.lineTo(centerPx, toPx(5800));
  ctx.moveTo(toPx(-5200), centerPx);
  ctx.lineTo(toPx(5200), centerPx);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.lineWidth = 11.5;
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6.5;
  ctx.stroke();

  // Centralhighway median amber stripe
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 8. 23 Ornate River Bridges spanning the Main River
  for (const bz of RIVER_BRIDGE_Z_COORDS) {
    const rx = getMainRiverCenterX(bz);
    const px = toPx(rx);
    const py = toPx(bz);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(px - 8, py - 3.5, 16, 7);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(px - 7, py - 2.2, 14, 4.4);
  }

  cachedSatelliteMapDataUrl = finalCanvas.toDataURL('image/jpeg', 0.92);
  return cachedSatelliteMapDataUrl;
}

/**
 * Forza Horizon Visual Icon Badge Colors & Shapes by Race Discipline
 */
function getDisciplineBadgeStyle(discipline: WorldRaceEvent['discipline']) {
  switch (discipline) {
    case 'Circuit Race':
    case 'Circuit Sprint':
      return {
        bgGradient: 'from-[#00b4ff] to-[#0051ff]',
        borderHex: '#ffffff',
        glowColor: 'rgba(0, 180, 255, 0.65)',
        categoryLabel: 'APEX ROAD CIRCUIT',
        shapeClass: 'rounded-lg',
        icon: 'circuit' as const,
      };
    case 'Sprint Race':
    case 'Tutorial Qualifier':
      return {
        bgGradient: 'from-[#00e1d9] to-[#0077ff]',
        borderHex: '#ffffff',
        glowColor: 'rgba(0, 225, 217, 0.65)',
        categoryLabel: 'APEX ROAD SPRINT',
        shapeClass: 'rounded-lg',
        icon: 'sprint' as const,
      };
    case 'Off-Road Rally':
      return {
        bgGradient: 'from-[#ff8800] to-[#d93800]',
        borderHex: '#ffffff',
        glowColor: 'rgba(255, 120, 0, 0.7)',
        categoryLabel: 'BAJA CROSS COUNTRY & RALLY',
        shapeClass: 'rounded-lg',
        icon: 'rally' as const,
      };
    case 'Touge Drift':
      return {
        bgGradient: 'from-[#d946ef] to-[#7e22ce]',
        borderHex: '#ffffff',
        glowColor: 'rgba(217, 70, 239, 0.7)',
        categoryLabel: 'STREET & TOUGE DRIFT',
        shapeClass: 'rounded-lg rotate-45',
        icon: 'drift' as const,
      };
    case 'Multiplayer Grand Prix':
      return {
        bgGradient: 'from-[#10b981] to-[#06b6d4]',
        borderHex: '#ffffff',
        glowColor: 'rgba(16, 185, 129, 0.85)',
        categoryLabel: 'MULTIPLAYER GRAND PRIX (NO BOTS)',
        shapeClass: 'rounded-full',
        icon: 'multiplayer' as const,
      };
    case 'Drag Showdown':
    default:
      return {
        bgGradient: 'from-[#ff1e7a] to-[#ff7b00]',
        borderHex: '#fde047',
        glowColor: 'rgba(255, 30, 122, 0.7)',
        categoryLabel: 'PR STUNT & DRAG SHOWDOWN',
        shapeClass: 'rounded-full',
        icon: 'drag' as const,
      };
  }
}

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  telemetry,
  remotePlayers,
  customTrackPoints,
  trackedDestination,
  activeRaceSession = null,
  completedRaces = {},
  onAddCustomTrackPoint,
  onClearCustomTrackPoints,
  onSetTrackedDestination,
  onStartRaceEvent,
  onFastTravelCoords,
  onClose,
}) => {
  const satelliteMapUrl = useMemo(() => getWorldSatelliteMapDataUrl(), []);

  // Visual Icon Filter (All, Multiplayer, Circuit, Sprint, Rally, Drift & Drag, Outposts)
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'multiplayer' | 'circuit' | 'sprint' | 'rally' | 'drift_drag' | 'outposts'
  >('all');

  const ongoingRace =
    activeRaceSession && !activeRaceSession.isCompleted ? activeRaceSession.race : null;

  // Selected Race or Outpost for the compact bottom-left visual card & route spline preview
  const [selectedRace, setSelectedRace] = useState<WorldRaceEvent | null>(
    ongoingRace || WORLD_RACES[0]
  );
  const [selectedPoi, setSelectedPoi] = useState<WorldPointOfInterest | null>(null);
  const [hoveredItemTitle, setHoveredItemTitle] = useState<{
    title: string;
    subtitle: string;
    x: number;
    z: number;
  } | null>(null);

  // Interactive Pan & Zoom State (North-up free pan by default so user can move the map freely anywhere)
  const [zoom, setZoom] = useState<number>(1.35);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [followHeadingUp, setFollowHeadingUp] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
  });
  const didDragMoveRef = useRef(false);

  const clampPanOffset = (nx: number, ny: number, currentZoom = zoom) => {
    const maxPan = Math.max(520, currentZoom * 720);
    return {
      x: Math.max(-maxPan, Math.min(maxPan, nx)),
      y: Math.max(-maxPan, Math.min(maxPan, ny)),
    };
  };

  const nudgePan = (dx: number, dy: number) => {
    setFollowHeadingUp(false);
    setPanOffset((prev) => clampPanOffset(prev.x + dx, prev.y + dy));
  };

  // Target Crosshair World Coordinates (updates as user pans or hovers map)
  const [reticleCoords, setReticleCoords] = useState<{ x: number; z: number }>({
    x: Math.round(telemetry.x),
    z: Math.round(telemetry.z),
  });

  // Coordinate conversions between World [-6400..+6400] and SVG [0..1000] / Percentage [0..100%]
  const toMapPct = (coord: number) => ((coord + WORLD_HALF_SPAN) / (WORLD_HALF_SPAN * 2)) * 100;
  const toSvg = (coord: number) => ((coord + WORLD_HALF_SPAN) / (WORLD_HALF_SPAN * 2)) * 1000;

  const visibleRaces = useMemo(() => {
    if (activeFilter === 'outposts') return [];
    return WORLD_RACES.filter((r) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'multiplayer') {
        return Boolean(r.isMultiplayerRace) || r.discipline === 'Multiplayer Grand Prix';
      }
      if (activeFilter === 'circuit') {
        return r.discipline === 'Circuit Race' || r.discipline === 'Circuit Sprint';
      }
      if (activeFilter === 'sprint') {
        return r.discipline === 'Sprint Race' || r.discipline === 'Tutorial Qualifier';
      }
      if (activeFilter === 'rally') {
        return r.discipline === 'Off-Road Rally';
      }
      if (activeFilter === 'drift_drag') {
        return r.discipline === 'Touge Drift' || r.discipline === 'Drag Showdown';
      }
      return true;
    });
  }, [activeFilter]);

  const visiblePois = useMemo(() => {
    if (activeFilter === 'all' || activeFilter === 'outposts') return WORLD_POIS;
    return [];
  }, [activeFilter]);

  // Keyboard shortcuts inside Map (+/- = Zoom, Arrow Keys / WASD = Pan Map)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '=' || e.key === '+') {
        setZoom((z) => Math.min(5.0, Number((z + 0.35).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((z) => Math.max(0.85, Number((z - 0.35).toFixed(2))));
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        nudgePan(0, 110);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        nudgePan(0, -110);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        nudgePan(110, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        nudgePan(-110, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((prev) => {
      const next = Math.max(0.85, Math.min(5.0, Number((prev + delta).toFixed(2))));
      setPanOffset((p) => clampPanOffset(p.x, p.y, next));
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is not supported on target
    }
    setIsDragging(true);
    didDragMoveRef.current = false;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: panOffset.x,
      panY: panOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate world coordinates under cursor
    const centerX = rect.left + rect.width / 2 + panOffset.x;
    const centerY = rect.top + rect.height / 2 + panOffset.y;
    const mapPixelSpan = Math.min(rect.width, rect.height) * zoom;
    const normX = (e.clientX - centerX) / mapPixelSpan;
    const normZ = (e.clientY - centerY) / mapPixelSpan;
    const wx = Math.max(-WORLD_HALF_SPAN, Math.min(WORLD_HALF_SPAN, Math.round(normX * WORLD_HALF_SPAN * 2)));
    const wz = Math.max(-WORLD_HALF_SPAN, Math.min(WORLD_HALF_SPAN, Math.round(normZ * WORLD_HALF_SPAN * 2)));
    setReticleCoords({ x: wx, z: wz });

    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    if (Math.hypot(dx, dy) > 4) {
      didDragMoveRef.current = true;
      if (followHeadingUp) {
        setFollowHeadingUp(false);
      }
    }
    setPanOffset(
      clampPanOffset(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy, zoom)
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
    setIsDragging(false);
  };

  // Double-click anywhere on the visual terrain map to drop a GPS Waypoint
  const handleMapDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const newPoint: CustomTrackPoint = {
      id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      label: `GPS Waypoint #${customTrackPoints.length + 1}`,
      x: reticleCoords.x,
      z: reticleCoords.z,
    };
    onAddCustomTrackPoint(newPoint);
    onSetTrackedDestination({
      id: newPoint.id,
      label: newPoint.label,
      x: newPoint.x,
      z: newPoint.z,
      category: 'waypoint',
    });
  };

  const centerOnPlayer = () => {
    const nextZoom = Math.max(zoom, 1.75);
    setZoom(nextZoom);
    setFollowHeadingUp(false);
    // Pan map so player's position is centered in the viewport
    const mapSidePx = Math.min(window.innerWidth, window.innerHeight) * 0.96;
    const offsetPxX = -((telemetry.x / (WORLD_HALF_SPAN * 2)) * mapSidePx * nextZoom);
    const offsetPxY = -((telemetry.z / (WORLD_HALF_SPAN * 2)) * mapSidePx * nextZoom);
    setPanOffset(clampPanOffset(offsetPxX, offsetPxY, nextZoom));
  };

  // Race to display on map: during an active race, always display the full active race route!
  const displayedRace = ongoingRace || selectedRace;

  // Full Race Route Polyline on SVG (Follows paved roads for road races!)
  const selectedRacePolyline = useMemo(() => {
    if (!displayedRace) return '';
    const roadPts = computeRaceRoadPath(displayedRace);
    return roadPts.map((pt) => `${toSvg(pt.x)},${toSvg(pt.z)}`).join(' ');
  }, [displayedRace]);

  // Road-Network GPS Route Polyline from Player to Tracked Destination (when not in a race)
  const gpsRoadRoute = useMemo(() => {
    if (!trackedDestination || ongoingRace) return null;
    const res = computeRoadNetworkPath(
      telemetry.x,
      telemetry.z,
      trackedDestination.x,
      trackedDestination.z
    );
    return {
      polyline: res.points.map((pt) => `${toSvg(pt.x)},${toSvg(pt.z)}`).join(' '),
      totalDistanceM: res.totalDistanceM,
    };
  }, [telemetry.x, telemetry.z, trackedDestination, ongoingRace]);

  const completedCount = Object.keys(completedRaces).length;

  // Accurate direction in which the car moves on the 2D map (+X right, +Z down, -Z up)
  const speedMs = Math.hypot(telemetry.vx, telemetry.vz);
  const playerHeadingDeg =
    speedMs > 0.8
      ? (Math.atan2(telemetry.vx, -telemetry.vz) * 180) / Math.PI
      : 180 - (telemetry.heading * 180) / Math.PI;

  // During tracking (or active race), rotate and move the map so the player cursor always faces at the top!
  const isTrackingActive = Boolean(trackedDestination || ongoingRace) && followHeadingUp;
  const playerPctX = toMapPct(telemetry.x);
  const playerPctZ = toMapPct(telemetry.z);

  return (
    <div
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleMapDoubleClick}
      style={{ touchAction: 'none' }}
      className={`fixed inset-0 z-30 w-screen h-screen bg-[#091e2c] overflow-hidden select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* =====================================================================
          1. FULL-SCREEN INTERACTIVE SATELLITE & TOPOGRAPHIC MAP SURFACE
         ===================================================================== */}
      <div className="w-full h-full flex items-center justify-center">
        <div
          style={{
            transform: isTrackingActive
              ? `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom}) rotate(${-playerHeadingDeg}deg) translate3d(${
                  -(playerPctX - 50)
                }%, ${-(playerPctZ - 50)}%, 0)`
              : `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="relative w-[min(96vw,96vh)] h-[min(96vw,96vh)] min-w-[780px] min-h-[780px] rounded-2xl overflow-hidden shadow-[0_0_90px_rgba(0,0,0,0.85)] border border-white/15"
        >
          {/* High-Resolution Satellite & Shaded-Relief Topographic Map Raster */}
          <img
            src={satelliteMapUrl}
            alt="Horizon Open-World Satellite & Topographic Map"
            draggable={false}
            className="w-full h-full object-cover pointer-events-none select-none"
          />

          {/* Subtle Atmospheric Vignette & Compass Rose Watermark */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, transparent 62%, rgba(6, 20, 32, 0.45) 100%)',
            }}
          />

          {/* Subtle Geographic Region Watermarks Embedded Onto Terrain (Non-intrusive Cartography) */}
          <div className="absolute inset-0 pointer-events-none font-display tracking-[0.22em] uppercase text-white/30 font-bold text-[10px]">
            <span className="absolute top-[19%] left-[18%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              LA GRAN CALDERA
            </span>
            <span className="absolute top-[18%] right-[18%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              CHAMONIX GLACIER
            </span>
            <span className="absolute top-[48%] left-[14%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              EMERALD JUNGLE
            </span>
            <span className="absolute top-[46%] left-[44%] text-amber-200/40 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              PARIS METROPOLIS
            </span>
            <span className="absolute top-[48%] right-[14%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              AUTOBAHN MEGAPORT
            </span>
            <span className="absolute bottom-[20%] left-[18%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              SAHARA RED CANYON
            </span>
            <span className="absolute bottom-[16%] left-[44%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              TIERRA PRÓSPERA FIELDS
            </span>
            <span className="absolute bottom-[20%] right-[17%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              CÔTE D&apos;AZUR RIVIERA
            </span>
          </div>

          {/* =====================================================================
              2. SVG VECTOR OVERLAY: FULL RACE SPLINE, CHECKPOINTS & ROAD GPS LINE
             ===================================================================== */}
          <svg
            viewBox="0 0 1000 1000"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {/* Full Race Route Glowing Spline (Always shown for ongoing race or selected race) */}
            {displayedRace && selectedRacePolyline && (
              <>
                <polyline
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.8)"
                  strokeWidth={9 / Math.sqrt(zoom)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={selectedRacePolyline}
                />
                <polyline
                  fill="none"
                  stroke={ongoingRace ? '#fbbf24' : '#00f0ff'}
                  strokeWidth={5 / Math.sqrt(zoom)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={
                    ongoingRace ? undefined : `${10 / Math.sqrt(zoom)} ${6 / Math.sqrt(zoom)}`
                  }
                  points={selectedRacePolyline}
                />
                {displayedRace.checkpoints.map((cp, idx) => (
                  <g
                    key={`${displayedRace.id}_cp_${idx}`}
                    transform={`translate(${toSvg(cp.x)}, ${toSvg(cp.z)})`}
                  >
                    <circle
                      r={6.5 / Math.sqrt(zoom)}
                      fill={
                        ongoingRace && activeRaceSession && idx === activeRaceSession.currentCheckpointIndex
                          ? '#fbbf24'
                          : '#0f172a'
                      }
                      stroke={ongoingRace ? '#fbbf24' : '#00f0ff'}
                      strokeWidth={2 / Math.sqrt(zoom)}
                    />
                  </g>
                ))}
              </>
            )}

            {/* Active Road-Network GPS Route Polyline from Player to Tracked Destination */}
            {gpsRoadRoute && gpsRoadRoute.polyline && (
              <>
                <polyline
                  fill="none"
                  stroke="rgba(0, 240, 255, 0.35)"
                  strokeWidth={9 / Math.sqrt(zoom)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={gpsRoadRoute.polyline}
                />
                <polyline
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth={3.8 / Math.sqrt(zoom)}
                  strokeDasharray={`${8 / Math.sqrt(zoom)} ${5 / Math.sqrt(zoom)}`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={gpsRoadRoute.polyline}
                />
              </>
            )}
          </svg>

          {/* =====================================================================
              3. FORZA HORIZON FESTIVAL OUTPOST & LANDMARK CREST BADGES
             ===================================================================== */}
          {visiblePois.map((poi) => {
            const isSelected = selectedPoi?.id === poi.id;
            return (
              <button
                key={poi.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPoi(poi);
                  setSelectedRace(null);
                  onSetTrackedDestination({
                    id: poi.id,
                    label: poi.name,
                    x: poi.x,
                    z: poi.z,
                    category: 'poi',
                  });
                }}
                onMouseEnter={() =>
                  setHoveredItemTitle({
                    title: poi.name,
                    subtitle: `${poi.biome || 'Horizon Festival'} Outpost`,
                    x: poi.x,
                    z: poi.z,
                  })
                }
                onMouseLeave={() => setHoveredItemTitle(null)}
                style={{
                  left: `${toMapPct(poi.x)}%`,
                  top: `${toMapPct(poi.z)}%`,
                  transform: `translate(-50%, -50%) scale(${
                    (isSelected ? 1.28 : 1.0) / Math.pow(zoom, 0.35)
                  })`,
                }}
                className={`absolute z-20 group cursor-pointer transition-transform ${
                  isSelected ? 'z-30' : ''
                }`}
              >
                {/* Outer Horizon Festival Glow */}
                <span className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-pink-500 to-amber-400 opacity-55 blur-[3px] group-hover:opacity-95" />
                {/* Main Festival Outpost Shield Badge */}
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#ff007f] via-[#ff4d00] to-[#ffae00] border-2 border-white shadow-[0_3px_12px_rgba(0,0,0,0.85)] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white drop-shadow" />
                </div>
              </button>
            );
          })}

          {/* =====================================================================
              4. FORZA HORIZON VISUAL RACE & PR STUNT BADGE ICONS (NO TEXT PILLS!)
             ===================================================================== */}
          {visibleRaces.map((race) => {
            const isSelected = selectedRace?.id === race.id;
            const isCompleted = Boolean(completedRaces[race.id]);
            const style = getDisciplineBadgeStyle(race.discipline);

            return (
              <button
                key={race.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (didDragMoveRef.current) return;
                  setSelectedRace(race);
                  setSelectedPoi(null);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onSetTrackedDestination({
                    id: race.id,
                    label: race.name,
                    x: race.startX,
                    z: race.startZ,
                    category: 'race',
                    raceId: race.id,
                  });
                  onClose();
                }}
                onMouseEnter={() =>
                  setHoveredItemTitle({
                    title: race.name,
                    subtitle: `${race.biome} · Lv.${race.difficultyLevel ?? 2}/4 ${'★'.repeat(
                      race.difficultyLevel ?? 2
                    )}${race.isMultiplayerRace ? ' · MULTIPLAYER (NO BOTS)' : ''}`,
                    x: race.startX,
                    z: race.startZ,
                  })
                }
                onMouseLeave={() => setHoveredItemTitle(null)}
                style={{
                  left: `${toMapPct(race.startX)}%`,
                  top: `${toMapPct(race.startZ)}%`,
                  transform: `translate(-50%, -50%) scale(${
                    (isSelected ? 1.32 : 1.0) / Math.pow(zoom, 0.35)
                  })`,
                }}
                className={`absolute flex flex-col items-center group cursor-pointer transition-transform ${
                  isSelected ? 'z-30' : 'z-20 hover:z-30'
                }`}
              >
                {/* Selection Pulse Halo */}
                {isSelected && (
                  <span className="absolute -inset-2 rounded-full border-2 border-white animate-ping opacity-75 pointer-events-none" />
                )}

                {/* Forza Geometric Shield / Diamond / Hexagon Badge */}
                <div
                  style={{
                    boxShadow: isSelected
                      ? `0 0 18px ${style.glowColor}, 0 4px 10px rgba(0,0,0,0.85)`
                      : '0 3px 8px rgba(0,0,0,0.8)',
                  }}
                  className={`relative w-7 h-7 bg-gradient-to-b ${style.bgGradient} border-[2px] border-white ${style.shapeClass} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <div className={style.icon === 'drift' ? '-rotate-45' : ''}>
                    {style.icon === 'circuit' && (
                      <RotateCcw className="w-3.5 h-3.5 text-white stroke-[2.6]" />
                    )}
                    {style.icon === 'sprint' && (
                      <Flag className="w-3.5 h-3.5 text-white fill-white/25 stroke-[2.4]" />
                    )}
                    {style.icon === 'rally' && (
                      <Mountain className="w-3.5 h-3.5 text-white fill-white/25 stroke-[2.4]" />
                    )}
                    {style.icon === 'drift' && (
                      <Flame className="w-3.5 h-3.5 text-white fill-white/25 stroke-[2.4]" />
                    )}
                    {style.icon === 'drag' && (
                      <Zap className="w-3.5 h-3.5 text-white fill-white stroke-[2.4]" />
                    )}
                    {style.icon === 'multiplayer' && (
                      <Users className="w-3.5 h-3.5 text-white stroke-[2.6]" />
                    )}
                  </div>

                  {/* Gold Completion Badge Star */}
                  {isCompleted && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 border border-slate-950 flex items-center justify-center shadow">
                      <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* 3 Gold Stars under PR Stunt / Drag / Completed Badges (like Forza Horizon PR Stunts) */}
                {(style.icon === 'drag' || isCompleted) && (
                  <div className="flex items-center gap-[1px] -mt-0.5 bg-slate-950/90 px-1 py-[1px] rounded-full border border-amber-400/50 shadow">
                    <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                    <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                    <Star className="w-2 h-2 text-amber-400 fill-amber-400" />
                  </div>
                )}
              </button>
            );
          })}

          {/* Custom GPS Waypoint Pins */}
          {customTrackPoints.map((pt, idx) => (
            <button
              key={pt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetTrackedDestination({
                  id: pt.id,
                  label: pt.label,
                  x: pt.x,
                  z: pt.z,
                  category: 'waypoint',
                });
              }}
              style={{
                left: `${toMapPct(pt.x)}%`,
                top: `${toMapPct(pt.z)}%`,
                transform: `translate(-50%, -50%) scale(${1 / Math.pow(zoom, 0.35)})`,
              }}
              title={`${pt.label} (${pt.x}m, ${pt.z}m)`}
              className="absolute z-25 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 border-2 border-white shadow-[0_0_12px_#00f0ff] flex items-center justify-center font-mono text-[10px] font-bold cursor-pointer"
            >
              {idx + 1}
            </button>
          ))}

          {/* Multiplayer Remote Drivers */}
          {remotePlayers.map((rp) => (
            <div
              key={rp.id}
              style={{
                left: `${toMapPct(rp.x)}%`,
                top: `${toMapPct(rp.z)}%`,
                transform: `translate(-50%, -50%) scale(${1 / Math.pow(zoom, 0.35)})`,
              }}
              className="absolute z-25 pointer-events-none flex flex-col items-center"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md"
                style={{ backgroundColor: rp.paintHex }}
              />
            </div>
          ))}

          {/* =====================================================================
              5. LIVE PLAYER DIRECTIONAL ARROW MARKER (FORZA WHITE NAVIGATION DART)
             ===================================================================== */}
          <div
            style={{
              left: `${toMapPct(telemetry.x)}%`,
              top: `${toMapPct(telemetry.z)}%`,
              transform: `translate(-50%, -50%) scale(${1 / Math.pow(zoom, 0.35)})`,
            }}
            className="absolute z-30 pointer-events-none flex items-center justify-center"
          >
            <span className="absolute w-9 h-9 rounded-full bg-cyan-400/35 animate-ping" />
            <div
              style={{ transform: `rotate(${playerHeadingDeg}deg)` }}
              className="relative w-7 h-7 rounded-full bg-slate-950/90 border-2 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.85)] flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          6. CENTER FORZA HORIZON WHITE TARGET CROSSHAIR RETICLE (LIKE FIGURE)
         ===================================================================== */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center">
        <div className="relative w-12 h-12 rounded-full border-2 border-white/90 shadow-[0_0_12px_rgba(0,0,0,0.65)] flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-white shadow" />
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white" />
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white" />
          <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-2.5 h-0.5 bg-white" />
          <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-2.5 h-0.5 bg-white" />
        </div>
        {hoveredItemTitle && (
          <div className="mt-2 px-3 py-1 rounded-full bg-slate-950/90 border border-white/25 backdrop-blur-md shadow-xl text-center">
            <div className="text-xs font-display font-bold text-white whitespace-nowrap">
              {hoveredItemTitle.title}
            </div>
            <div className="text-[10px] font-mono text-cyan-300 whitespace-nowrap">
              {hoveredItemTitle.subtitle}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          7. TOP-LEFT VISUAL ICON FILTER BAR (PURE ICONIC FILTER TOGGLES)
         ===================================================================== */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className="fixed top-3.5 left-3.5 z-40 flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/15 shadow-2xl"
      >
        {(
          [
            {
              id: 'all',
              label: 'All Icons',
              color: 'from-pink-500 to-amber-400',
              icon: Compass,
              count: WORLD_RACES.length + WORLD_POIS.length,
            },
            {
              id: 'multiplayer',
              label: 'Multiplayer',
              color: 'from-[#10b981] to-[#06b6d4]',
              icon: Users,
              count: WORLD_RACES.filter(
                (r) => r.isMultiplayerRace || r.discipline === 'Multiplayer Grand Prix'
              ).length,
            },
            {
              id: 'circuit',
              label: 'Circuit',
              color: 'from-[#00b4ff] to-[#0051ff]',
              icon: RotateCcw,
              count: WORLD_RACES.filter(
                (r) => r.discipline === 'Circuit Race' || r.discipline === 'Circuit Sprint'
              ).length,
            },
            {
              id: 'sprint',
              label: 'Sprint',
              color: 'from-[#00e1d9] to-[#0077ff]',
              icon: Flag,
              count: WORLD_RACES.filter(
                (r) => r.discipline === 'Sprint Race' || r.discipline === 'Tutorial Qualifier'
              ).length,
            },
            {
              id: 'rally',
              label: 'Dirt Rally',
              color: 'from-[#ff8800] to-[#d93800]',
              icon: Mountain,
              count: WORLD_RACES.filter((r) => r.discipline === 'Off-Road Rally').length,
            },
            {
              id: 'drift_drag',
              label: 'Drift & PR',
              color: 'from-[#d946ef] to-[#7e22ce]',
              icon: Flame,
              count: WORLD_RACES.filter(
                (r) => r.discipline === 'Touge Drift' || r.discipline === 'Drag Showdown'
              ).length,
            },
            {
              id: 'outposts',
              label: 'Outposts',
              color: 'from-[#ff007f] to-[#ff6b00]',
              icon: Sparkles,
              count: WORLD_POIS.length,
            },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activeFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveFilter(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-white text-slate-950 shadow-lg scale-105'
                  : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-md bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-sm`}
              >
                <Icon className="w-3 h-3" />
              </span>
              <span className="hidden sm:inline">{item.label}</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  active ? 'bg-slate-950/15 text-slate-900 font-bold' : 'text-slate-400'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}

        {customTrackPoints.length > 0 && (
          <button
            type="button"
            onClick={onClearCustomTrackPoints}
            title="Clear Marked GPS Points"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 text-red-200 text-xs font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clear GPS ({customTrackPoints.length})</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          8. TOP-RIGHT ZOOM CONTROLS & LITTLE CROSS (X) CLOSE BUTTON
         ===================================================================== */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className="fixed top-3.5 right-3.5 z-50 flex items-center gap-2"
      >
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/20 shadow-2xl">
          <button
            type="button"
            onClick={() => nudgePan(140, 0)}
            title="Pan Map Left (A / Left Arrow)"
            className="w-7 h-7 rounded-full hover:bg-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => nudgePan(0, 140)}
            title="Pan Map Up (W / Up Arrow)"
            className="w-7 h-7 rounded-full hover:bg-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => nudgePan(0, -140)}
            title="Pan Map Down (S / Down Arrow)"
            className="w-7 h-7 rounded-full hover:bg-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => nudgePan(-140, 0)}
            title="Pan Map Right (D / Right Arrow)"
            className="w-7 h-7 rounded-full hover:bg-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <span className="w-px h-4 bg-white/15 mx-0.5" />
          <button
            type="button"
            onClick={() =>
              setZoom((z) => {
                const next = Math.max(0.85, Number((z - 0.35).toFixed(2)));
                setPanOffset((p) => clampPanOffset(p.x, p.y, next));
                return next;
              })
            }
            title="Zoom Out (-)"
            className="w-8 h-8 rounded-full hover:bg-white/15 text-white flex items-center justify-center cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-mono font-bold text-amber-300 tabular-nums">
            {zoom.toFixed(1)}x
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(5.0, Number((z + 0.35).toFixed(2))))}
            title="Zoom In (+)"
            className="w-8 h-8 rounded-full hover:bg-white/15 text-white flex items-center justify-center cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={centerOnPlayer}
            title="Center on My Car"
            className="w-8 h-8 rounded-full hover:bg-cyan-400/25 text-cyan-300 flex items-center justify-center cursor-pointer"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1.25);
              setFollowHeadingUp(false);
              setPanOffset({ x: 0, y: 0 });
            }}
            title="Reset Map View"
            className="w-8 h-8 rounded-full hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Little Cross (X) Button to Close Map Window */}
        <button
          type="button"
          onClick={onClose}
          title="Close World Map (Esc / M)"
          aria-label="Close World Map"
          className="w-9 h-9 rounded-full bg-slate-950/90 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center shadow-2xl transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* =====================================================================
          9. BOTTOM-LEFT FORZA HORIZON BADGE COUNTER & COMPACT VISUAL EVENT CARD
         ===================================================================== */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className="fixed bottom-4 left-4 z-40 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-auto"
      >
        {/* Selected Race Visual Action Card (No Teleport to Race option — Drive via Road GPS or Start when at Gate!) */}
        {selectedRace && (
          <div className="p-3.5 rounded-2xl bg-slate-950/88 backdrop-blur-xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.85)] space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br ${
                    getDisciplineBadgeStyle(selectedRace.discipline).bgGradient
                  } border-2 border-white flex items-center justify-center shadow-md`}
                >
                  <Flag className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 truncate">
                    {selectedRace.biome} · {selectedRace.discipline}
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-white truncate">
                    {selectedRace.name}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-xs font-extrabold">
                  {selectedRace.recommendedClass}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRace(null)}
                  title="Close Race Panel"
                  aria-label="Close Race Panel"
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/80 text-slate-300 hover:text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Difficulty Level 1-4, Laps & Multiplayer Info Badge */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 font-bold">
                Difficulty Level {selectedRace.difficultyLevel ?? 2} / 4 ·{' '}
                {'★'.repeat(selectedRace.difficultyLevel ?? 2)}
                {'☆'.repeat(4 - (selectedRace.difficultyLevel ?? 2))}
              </span>
              {(selectedRace.laps ?? 1) > 1 && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 font-bold">
                  {selectedRace.laps} Laps
                </span>
              )}
              {selectedRace.isMultiplayerRace && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-400/20 border border-emerald-400/50 text-emerald-300 font-bold">
                  2+ Players · Zero AI Bots
                </span>
              )}
            </div>

            {gpsRoadRoute && trackedDestination?.id === selectedRace.id && (
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <span>Road GPS Distance</span>
                <span className="text-cyan-300 font-bold">
                  {gpsRoadRoute.totalDistanceM >= 1000
                    ? `${(gpsRoadRoute.totalDistanceM / 1000).toFixed(2)} km`
                    : `${gpsRoadRoute.totalDistanceM} m`}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onSetTrackedDestination({
                    id: selectedRace.id,
                    label: selectedRace.name,
                    x: selectedRace.startX,
                    z: selectedRace.startZ,
                    category: 'race',
                    raceId: selectedRace.id,
                  });
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display text-xs font-extrabold uppercase tracking-wide cursor-pointer shadow-md"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Set Road GPS Route to Race</span>
              </button>
              <div className="text-[10px] font-mono text-amber-300/90 text-center">
                Drive to the race location — Start option appears at the top on arrival
              </div>
            </div>
          </div>
        )}

        {/* Selected Outpost Visual Action Card */}
        {selectedPoi && (
          <div className="p-3.5 rounded-2xl bg-slate-950/88 backdrop-blur-xl border border-pink-500/50 shadow-[0_12px_40px_rgba(0,0,0,0.85)] space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[#ff007f] to-[#ffae00] border-2 border-white flex items-center justify-center shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-400 truncate">
                    {selectedPoi.biome || 'Horizon Festival'} Outpost
                  </div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-white truncate">
                    {selectedPoi.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoi(null)}
                title="Close Outpost Panel"
                aria-label="Close Outpost Panel"
                className="w-6 h-6 shrink-0 rounded-full bg-white/10 hover:bg-red-500/80 text-slate-300 hover:text-white border border-white/20 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onSetTrackedDestination({
                  id: selectedPoi.id,
                  label: selectedPoi.name,
                  x: selectedPoi.x,
                  z: selectedPoi.z,
                  category: 'poi',
                });
                onClose();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display text-xs font-bold uppercase tracking-wide cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Set Road GPS Route</span>
            </button>
          </div>
        )}

        {/* Forza Horizon Bottom-Left Progress Crest (Matches the "15/28" badge in the reference image) */}
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/15 w-fit shadow-xl">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff007f] to-[#ff8c00] border border-white flex items-center justify-center shadow">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-display text-sm font-black text-white leading-none">
              {completedCount}/{WORLD_RACES.length}
            </div>
            <div className="text-[10px] font-mono text-slate-300 uppercase tracking-wider mt-0.5">
              HORIZON EVENTS
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          10. BOTTOM-RIGHT FORZA HORIZON COMPACT VISUAL CONTROL BAR
         ===================================================================== */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className="fixed bottom-4 right-4 z-40 hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 text-[11px] font-display font-bold uppercase tracking-wider text-slate-200 shadow-2xl"
      >
        <span className="flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>Double-Click: Set Road GPS</span>
        </span>
        <span className="text-white/20">|</span>
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-pink-400" />
          <span>Click Icon: Event Route</span>
        </span>
        <span className="text-white/20">|</span>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
        >
          <span className="px-1.5 py-0.5 rounded bg-white/15 text-white font-mono text-[10px]">
            ESC
          </span>
          <span>Close</span>
        </button>
      </div>
    </div>
  );
};
