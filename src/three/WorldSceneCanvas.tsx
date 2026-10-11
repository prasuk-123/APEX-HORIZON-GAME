import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ActiveRaceSession,
  CameraMode,
  ConvoyChallenge,
  CustomTrackPoint,
  DynoBenchmark,
  RaceBotState,
  RemotePlayerState,
  TelemetryFrame,
  TrackedDestination,
  VehicleSpec,
  VehicleTune,
} from '../types/game';
import {
  computeRaceRoadPath,
  computeRoadNetworkPath,
  ControlInputState,
  createInitialPhysicsState,
  createRaceBotsForEvent,
  evaluateRawTerrainElevation,
  FOREST_SMALL_ROAD_X_COORDS,
  FOREST_SMALL_ROAD_Z_COORDS,
  getBiomeAtPosition,
  getCheckpointPoseOnRacePath,
  getDynamicWeatherAndDayState,
  getMainRiverCenterX,
  getParisRoamingTraffic,
  getRoadNetworkDistance,
  InternalPhysicsState,
  isPointInOpenField,
  MAJOR_GRID_COORDS,
  RIVER_BRIDGE_Z_COORDS,
  sampleWorldTerrain,
  SMALL_STREET_COORDS,
  stepRaceBotsPhysics,
  stepVehiclePhysics,
  WORLD_ELEVATED_FLYOVERS,
  WORLD_MOUNTAIN_PEAKS,
  WORLD_PROCEDURAL_BUILDINGS,
  WORLD_REDWOOD_TREES,
} from '../physics/vehiclePhysics';
import { VEHICLES, WORLD_RACES } from '../data/vehicles';
import { engineAudio } from '../audio/engineAudio';

export type LightingPreset = 'sunset' | 'daylight' | 'night';

interface WorldSceneCanvasProps {
  activeSpec: VehicleSpec;
  activeTune: VehicleTune;
  benchmark: DynoBenchmark;
  cameraMode: CameraMode;
  lightingPreset: LightingPreset;
  isGarageView: boolean;
  isPaused?: boolean;
  remotePlayers: RemotePlayerState[];
  activeChallenge: ConvoyChallenge | null;
  activeRaceSession: ActiveRaceSession | null;
  trackedDestination: TrackedDestination | null;
  customTrackPoints: CustomTrackPoint[];
  teleportTarget: { x: number; z: number; heading: number; nonce: number } | null;
  onTelemetryUpdate: (frame: TelemetryFrame) => void;
  onNetworkBroadcast: (frame: TelemetryFrame) => void;
  onLeaderboardEvent: (
    zoneType: 'speed_trap' | 'drift_zone' | 'drag_strip' | 'danger_jump',
    zoneTitle: string,
    value: number,
    unit: string
  ) => void;
  onChallengeFinish?: (elapsedSec: number) => void;
  onReachRaceCheckpoint?: () => void;
  onReachCustomTrackPoint?: (id: string) => void;
  onRaceBotsUpdate?: (playerPosition: number, bots: RaceBotState[]) => void;
  onCollectHorizonToken?: () => void;
  externalControlsRef?: React.MutableRefObject<ControlInputState>;
}

interface BuiltCarRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  bodyPaintMaterials: THREE.MeshPhysicalMaterial[];
  rimMaterials: THREE.MeshStandardMaterial[];
  caliperMaterials: THREE.MeshStandardMaterial[];
  rotorMaterials?: THREE.MeshStandardMaterial[];
  wheelMeshes: THREE.Group[]; // [FL, FR, RL, RR]
  frontSteerPivots: THREE.Group[]; // [FL, FR]
  wingGroup: THREE.Group;
  splitterMesh: THREE.Mesh;
  brakeLightMaterial: THREE.MeshStandardMaterial;
  flameLeft: THREE.Mesh;
  flameRight: THREE.Mesh;
  steeringWheelGroup: THREE.Group;
  cockpitHideMeshes: THREE.Object3D[];
  cockpitCamPosLocal: THREE.Vector3;
  cockpitCamLookLocal: THREE.Vector3;
  activeAero?: {
    fl?: THREE.Object3D;
    fr?: THREE.Object3D;
    rl?: THREE.Object3D;
    rr?: THREE.Object3D;
    airbrakeWing?: THREE.Object3D;
    airbrakeBaseY?: number;
    airbrakeBaseRotX?: number;
  };
}

// ============================================================================
// CACHED PROCEDURAL HIGH-DEFINITION TEXTURES (GENERATED ONCE AT STARTUP, ZERO RUNTIME COST)
// ============================================================================
let cachedContactShadowTex: THREE.CanvasTexture | null = null;
let cachedHorizonCoinFaceTex: THREE.CanvasTexture | null = null;

function getHorizonCoinFaceTexture(): THREE.CanvasTexture {
  if (cachedHorizonCoinFaceTex) return cachedHorizonCoinFaceTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);

    // Outer metallic gold gradient disc
    const grad = ctx.createRadialGradient(96, 86, 16, 128, 128, 124);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.45, '#facc15');
    grad.addColorStop(0.82, '#d97706');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.fill();

    // Milled coin rim notches
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.stroke();

    // Inner recessed dark-amber medallion circle
    const innerGrad = ctx.createRadialGradient(128, 128, 10, 128, 128, 92);
    innerGrad.addColorStop(0, '#b45309');
    innerGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.stroke();

    // Bold Embossed 'H' in the center of the coin
    ctx.save();
    ctx.font = '900 132px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#fef08a';
    ctx.fillText('H', 128, 134);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeText('H', 128, 134);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cachedHorizonCoinFaceTex = tex;
  return tex;
}
function getContactShadowTexture(): THREE.CanvasTexture {
  if (cachedContactShadowTex) return cachedContactShadowTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 256);
    ctx.save();
    ctx.translate(64, 128);
    ctx.scale(1, 1.95);
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 62);
    grad.addColorStop(0, 'rgba(2, 6, 18, 0.92)');
    grad.addColorStop(0.55, 'rgba(2, 6, 18, 0.72)');
    grad.addColorStop(0.82, 'rgba(2, 6, 18, 0.28)');
    grad.addColorStop(1, 'rgba(2, 6, 18, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  cachedContactShadowTex = tex;
  return tex;
}

let cachedSkyDomeTex: THREE.CanvasTexture | null = null;
function getHorizonSkyCloudsTexture(): THREE.CanvasTexture {
  if (cachedSkyDomeTex) return cachedSkyDomeTex;
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1024;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Forza Horizon 6 Photorealistic HDR Sky Gradient (Deep Cobalt Zenith -> Azure Mid-Sky -> Warm Golden-White Horizon Scatter)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    skyGrad.addColorStop(0.0, '#0f347c');
    skyGrad.addColorStop(0.18, '#1d56b8');
    skyGrad.addColorStop(0.36, '#3b82f6');
    skyGrad.addColorStop(0.47, '#8cc5fc');
    skyGrad.addColorStop(0.515, '#fff5e4');
    skyGrad.addColorStop(0.56, '#c7def8');
    skyGrad.addColorStop(1.0, '#648ec4');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // High-Altitude Wispy Cirrus Streaks
    for (let i = 0; i < 65; i++) {
      const cx = (i * 211.3) % 2048;
      const cy = 90 + ((i * 59.7) % 160);
      const rx = 140 + (i % 7) * 45;
      const ry = 6 + (i % 4) * 3;
      const cGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
      cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
      cGrad.addColorStop(0.6, 'rgba(224, 242, 254, 0.08)');
      cGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(((i % 5) - 2) * 0.04);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Multi-Layered Volumetric Cumulus Cloud Banks (Cool Slate Shadow Base + Warm Sunlit Ivory Crown)
    for (let i = 0; i < 130; i++) {
      const cx = (i * 173.5) % 2048;
      const cy = 210 + ((i * 89.3) % 270);
      const rx = 75 + (i % 8) * 28;
      const ry = 22 + (i % 5) * 9;
      const alpha = 0.22 + (i % 4) * 0.08;

      // 1. Lower Cool Slate-Indigo Cloud Under-Shadow
      const baseGrad = ctx.createRadialGradient(cx, cy + ry * 0.35, 4, cx, cy + ry * 0.35, rx * 0.95);
      baseGrad.addColorStop(0, `rgba(100, 125, 168, ${alpha * 0.65})`);
      baseGrad.addColorStop(0.65, `rgba(148, 175, 214, ${alpha * 0.32})`);
      baseGrad.addColorStop(1, 'rgba(148, 175, 214, 0)');
      ctx.save();
      ctx.translate(cx, cy + ry * 0.28);
      ctx.scale(1, (ry * 0.85) / rx);
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rx * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Upper Sunlit Warm Ivory Cumulus Crown
      const topGrad = ctx.createRadialGradient(cx - rx * 0.12, cy - ry * 0.2, 2, cx, cy, rx);
      topGrad.addColorStop(0, `rgba(255, 252, 245, ${alpha * 1.15})`);
      topGrad.addColorStop(0.55, `rgba(245, 249, 255, ${alpha * 0.72})`);
      topGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  cachedSkyDomeTex = tex;
  return tex;
}

let cachedRoadMicroTex: THREE.CanvasTexture | null = null;
function getRoadSurfaceMicroTexture(): THREE.CanvasTexture {
  if (cachedRoadMicroTex) return cachedRoadMicroTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#7c828d';
    ctx.fillRect(0, 0, 512, 512);
    // Realistic Forza Horizon twin polished tire-wear tracks per lane + fine crushed-granite aggregate
    for (let x = 0; x < 512; x += 2) {
      const laneWear =
        Math.exp(-Math.pow((x - 128) / 42, 2)) * -18 +
        Math.exp(-Math.pow((x - 384) / 42, 2)) * -18;
      const streak = Math.sin(x * 0.14) * 10 + ((x * 31) % 15) - 7 + laneWear;
      const v = Math.max(82, Math.min(172, Math.round(126 + streak)));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, 0, 2, 512);
    }
    // Fine asphalt aggregate stones (dark basalt & bright quartz specks)
    for (let i = 0; i < 6400; i++) {
      const gx = (i * 97) % 512;
      const gy = (i * 181) % 512;
      const gv = i % 3 === 0 ? 168 : i % 2 === 0 ? 94 : 112;
      ctx.fillStyle = `rgb(${gv},${gv},${gv})`;
      ctx.fillRect(gx, gy, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 360);
  cachedRoadMicroTex = tex;
  return tex;
}

let cachedTerrainDetailTex: THREE.CanvasTexture | null = null;
function getTerrainDetailTexture(): THREE.CanvasTexture {
  if (cachedTerrainDetailTex) return cachedTerrainDetailTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Neutral luminance base (multiplies cleanly with vertexColors!)
    ctx.fillStyle = 'rgb(228, 228, 228)';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 7500; i++) {
      const x = (i * 83) % 512;
      const y = (i * 149) % 512;
      const v = 198 + ((i * 19) % 54);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 3, 5);
    }
    // Organic grass / soil micro-tuft strokes
    for (let i = 0; i < 1600; i++) {
      const x = (i * 127) % 512;
      const y = (i * 251) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(30,41,59,0.14)';
      ctx.fillRect(x, y, 2, 8);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(140, 140);
  cachedTerrainDetailTex = tex;
  return tex;
}

let cachedDrilledRotorTex: THREE.CanvasTexture | null = null;
function getDrilledBrakeRotorTexture(): THREE.CanvasTexture {
  if (cachedDrilledRotorTex) return cachedDrilledRotorTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 256, 256);
    ctx.translate(128, 128);
    // Concentric machined carbon-ceramic brake pad grooves
    for (let r = 36; r < 120; r += 4) {
      ctx.strokeStyle = r % 8 === 0 ? '#cbd5e1' : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross-drilled ventilation holes & curved cooling slots
    for (let a = 0; a < 24; a++) {
      const baseAngle = (a / 24) * Math.PI * 2;
      for (let h = 0; h < 4; h++) {
        const rad = 54 + h * 16;
        const ang = baseAngle + h * 0.055;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * rad, Math.sin(ang) * rad, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  cachedDrilledRotorTex = tex;
  return tex;
}

let cachedTireTreadTex: THREE.CanvasTexture | null = null;
function getTireTreadTexture(): THREE.CanvasTexture {
  if (cachedTireTreadTex) return cachedTireTreadTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, 256, 256);
    // Circumferential drainage channels
    [54, 104, 152, 202].forEach((x) => {
      ctx.fillStyle = '#090b0f';
      ctx.fillRect(x, 0, 8, 256);
    });
    // Angled directional performance V-tread sipes
    ctx.strokeStyle = '#090b0f';
    ctx.lineWidth = 5;
    for (let y = 0; y < 256; y += 24) {
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(128, y + 14);
      ctx.lineTo(248, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  cachedTireTreadTex = tex;
  return tex;
}

let cachedLicensePlateTex: THREE.CanvasTexture | null = null;
function getHorizonLicensePlateTexture(): THREE.CanvasTexture {
  if (cachedLicensePlateTex) return cachedLicensePlateTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 256, 64);
    // Euro/Horizon Blue Left Band
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 32, 64);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('H6', 16, 40);
    // Plate Border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 60);
    // Embossed Plate Number
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HORIZON 6', 142, 34);
  }
  const tex = new THREE.CanvasTexture(c);
  cachedLicensePlateTex = tex;
  return tex;
}

let cachedAlpineSnowRockTex: THREE.CanvasTexture | null = null;
function getAlpineSnowRockTexture(): THREE.CanvasTexture {
  if (cachedAlpineSnowRockTex) return cachedAlpineSnowRockTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Craggy dark slate-granite rock base with green alpine lower slopes & snow-streaked couloirs
    const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
    baseGrad.addColorStop(0.0, '#ffffff');
    baseGrad.addColorStop(0.32, '#e2e8f0');
    baseGrad.addColorStop(0.62, '#475569');
    baseGrad.addColorStop(0.84, '#334155');
    baseGrad.addColorStop(1.0, '#2d4a36');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Jagged vertical snow ridges and dark granite crevices (like the Japanese Alps in Forza Horizon 6)
    for (let i = 0; i < 110; i++) {
      const x = (i * 47) % 512;
      const w = 4 + (i % 5) * 4;
      const h = 160 + (i % 7) * 42;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(248, 250, 252, 0.85)' : 'rgba(30, 41, 59, 0.72)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + w, h);
      ctx.lineTo(x - w, h * 0.92);
      ctx.closePath();
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  cachedAlpineSnowRockTex = tex;
  return tex;
}

let cachedSakuraCanopyTex: THREE.CanvasTexture | null = null;
function getSakuraCanopyTexture(): THREE.CanvasTexture {
  if (cachedSakuraCanopyTex) return cachedSakuraCanopyTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f4a7c1';
    ctx.fillRect(0, 0, 256, 256);
    const palette = ['#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#db2777', '#581c3c'];
    for (let i = 0; i < 950; i++) {
      const px = (i * 67) % 256;
      const py = (i * 113) % 256;
      const r = 3 + (i % 5) * 2.5;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cachedSakuraCanopyTex = tex;
  return tex;
}

let cachedCarbonWeaveTex: THREE.CanvasTexture | null = null;
function getCarbonFiberWeaveTexture(): THREE.CanvasTexture {
  if (cachedCarbonWeaveTex) return cachedCarbonWeaveTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#12151c';
    ctx.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) {
      for (let x = 0; x < 64; x += 4) {
        const isDiag = ((x + y) / 4) % 2 === 0;
        ctx.fillStyle = isDiag ? '#242936' : '#0b0d12';
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  cachedCarbonWeaveTex = tex;
  return tex;
}

let cachedMetallicFlakeTex: THREE.CanvasTexture | null = null;
function getMetallicFlakeRoughnessTexture(): THREE.CanvasTexture {
  if (cachedMetallicFlakeTex) return cachedMetallicFlakeTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    // Ultra-smooth liquid metal base (low roughness ~ 18/255) with microscopic metallic flake sparkle
    ctx.fillStyle = 'rgb(18, 18, 18)';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) {
      const fx = (i * 73) % 128;
      const fy = (i * 41) % 128;
      const v = i % 2 === 0 ? 6 : 36;
      ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
      ctx.fillRect(fx, fy, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  cachedMetallicFlakeTex = tex;
  return tex;
}

/**
 * Welds split seam vertices across BoxGeometry face boundaries so vertex normals are 100% continuous
 * and liquid-smooth across the entire sculpted monocoque shell (eliminates all boxy seam creases!).
 */
function weldAndSmoothGeometryNormals(geo: THREE.BufferGeometry): void {
  geo.computeVertexNormals();
  const pos = geo.attributes.position;
  const norm = geo.attributes.normal;
  if (!pos || !norm) return;

  const accumMap = new Map<string, { nx: number; ny: number; nz: number; indices: number[] }>();
  for (let i = 0; i < pos.count; i++) {
    const qx = Math.round(pos.getX(i) * 2000);
    const qy = Math.round(pos.getY(i) * 2000);
    const qz = Math.round(pos.getZ(i) * 2000);
    const key = `${qx}_${qy}_${qz}`;
    let entry = accumMap.get(key);
    if (!entry) {
      entry = { nx: 0, ny: 0, nz: 0, indices: [] };
      accumMap.set(key, entry);
    }
    entry.nx += norm.getX(i);
    entry.ny += norm.getY(i);
    entry.nz += norm.getZ(i);
    entry.indices.push(i);
  }

  accumMap.forEach((entry) => {
    const len = Math.hypot(entry.nx, entry.ny, entry.nz) || 1;
    const snx = entry.nx / len;
    const sny = entry.ny / len;
    const snz = entry.nz / len;
    for (let k = 0; k < entry.indices.length; k++) {
      const idx = entry.indices[k];
      norm.setXYZ(idx, snx, sny, snz);
    }
  });
  norm.needsUpdate = true;
}

let cachedFacadeColorTex: THREE.CanvasTexture | null = null;
let cachedFacadeRoughTex: THREE.CanvasTexture | null = null;
function getHighEndBuildingFacadeTextures(): {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  if (cachedFacadeColorTex && cachedFacadeRoughTex) {
    return { colorMap: cachedFacadeColorTex, roughnessMap: cachedFacadeRoughTex };
  }
  const cColor = document.createElement('canvas');
  cColor.width = 512;
  cColor.height = 512;
  const ctx = cColor.getContext('2d');

  const cRough = document.createElement('canvas');
  cRough.width = 512;
  cRough.height = 512;
  const rCtx = cRough.getContext('2d');

  if (ctx && rCtx) {
    // Architectural Limestone / Anodized Cladding Frame Base
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 512, 512);
    // Roughness base: medium-matte stone/metal mullions (155/255)
    rCtx.fillStyle = 'rgb(155, 155, 155)';
    rCtx.fillRect(0, 0, 512, 512);

    const cols = 8;
    const rows = 10;
    const cellW = 512 / cols;
    const cellH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      // Horizontal architectural cornice & spandrel shadow line
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, r * cellH, 512, 5);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, r * cellH + 5, 512, 3);

      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + 7;
        const wy = r * cellH + 10;
        const ww = cellW - 14;
        const wh = cellH - 15;

        // Metallic anodized outer window frame
        ctx.fillStyle = '#334155';
        ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

        // Reflective architectural glass pane with sky-horizon gradient & warm interior depth
        const seed = (r * 17 + c * 31) % 11;
        const winGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
        if (seed === 0 || seed === 4) {
          // Warm sunlit interior lounge reflection
          winGrad.addColorStop(0, '#38bdf8');
          winGrad.addColorStop(0.45, '#fde68a');
          winGrad.addColorStop(1, '#f59e0b');
        } else if (seed % 2 === 0) {
          // Crisp azure sky & cloud reflection in glass
          winGrad.addColorStop(0, '#1e3a8a');
          winGrad.addColorStop(0.55, '#38bdf8');
          winGrad.addColorStop(1, '#bae6fd');
        } else {
          // Deep architectural smoked mirror glass
          winGrad.addColorStop(0, '#0f172a');
          winGrad.addColorStop(0.6, '#1e3a5f');
          winGrad.addColorStop(1, '#475569');
        }
        ctx.fillStyle = winGrad;
        ctx.fillRect(wx, wy, ww, wh);

        // Central metallic mullion bar inside window
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wx + ww * 0.48, wy, 2, wh);

        // Window glass is ultra-smooth mirror (roughness ~ 15/255 = 0.06) so it catches real 3D specular reflections!
        rCtx.fillStyle = 'rgb(16, 16, 16)';
        rCtx.fillRect(wx, wy, ww, wh);
      }
    }
  }

  const colorMap = new THREE.CanvasTexture(cColor);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  const roughnessMap = new THREE.CanvasTexture(cRough);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  cachedFacadeColorTex = colorMap;
  cachedFacadeRoughTex = roughnessMap;
  return { colorMap, roughnessMap };
}

let cachedRoofTileTex: THREE.CanvasTexture | null = null;
function getSlateRoofTileTexture(): THREE.CanvasTexture {
  if (cachedRoofTileTex) return cachedRoofTileTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#27303f';
    ctx.fillRect(0, 0, 256, 256);
    // Ribbed Kawara / Mansard slate roof courses
    for (let x = 0; x < 256; x += 8) {
      ctx.fillStyle = x % 16 === 0 ? '#384459' : '#1b222d';
      ctx.fillRect(x, 0, 4, 256);
    }
    for (let y = 0; y < 256; y += 16) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(0, y, 256, 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  cachedRoofTileTex = tex;
  return tex;
}

/**
 * Generates a continuous, smoothly sculpted 3D Monocoque Automotive Body Shell Geometry
 * with smooth vertex normals (zero blocky 90-degree edges!).
 * Sculpted features:
 * - Rounded super-ellipsoid shoulder beltline & tucked lower rockers for liquid-metal specular highlights
 * - Flared 3D front & rear wheel arches & muscular rear haunches
 * - Sculpted Coke-bottle door waist & side aerodynamic air channel
 * - Sloping aerodynamic hood valley flanked by raised curved front fender crests
 */
const SCULPTED_CAR_BODY_GEO_CACHE = new Map<string, THREE.BufferGeometry>();

function createSculptedCarBodyGeometry(
  bodyWidth: number,
  lowerHeight: number,
  bodyLength: number,
  wheelZFront: number,
  wheelZRear: number,
  archetype: string,
  specId: string,
  modelKey: string,
  modelVariant: number,
  isHyper: boolean,
  isSupercar: boolean,
  isTruck: boolean,
  isSuv: boolean,
  isHeavyTruck: boolean
): THREE.BufferGeometry {
  const cacheKey = `${specId}_${bodyWidth.toFixed(3)}_${lowerHeight.toFixed(3)}_${bodyLength.toFixed(3)}_${wheelZFront.toFixed(3)}_${wheelZRear.toFixed(3)}_${archetype}_${modelVariant}`;
  const cached = SCULPTED_CAR_BODY_GEO_CACHE.get(cacheKey);
  if (cached) return cached;

  const isWedgeOrigami = archetype === 'lamborghini' || modelKey.includes('m1-procar');
  // High-resolution cached mesh (zero runtime cost since cached in SCULPTED_CAR_BODY_GEO_CACHE!)
  const segX = isWedgeOrigami ? 18 : 34;
  const segY = isWedgeOrigami ? 10 : 16;
  const segZ = isWedgeOrigami ? 38 : 62;
  const geo = new THREE.BoxGeometry(bodyWidth, lowerHeight, bodyLength, segX, segY, segZ);
  const pos = geo.attributes.position;

  const halfW = bodyWidth * 0.5;
  const halfH = lowerHeight * 0.5;
  const halfL = bodyLength * 0.5;
  const nzFront = wheelZFront / halfL;
  const nzRear = wheelZRear / halfL;

  // Brand & Model-Specific Sculpting Archetypes so every car in the 260-car roster has its authentic 3D silhouette!
  const isPorsche911 =
    archetype === 'porsche' ||
    modelKey.includes('992') ||
    modelKey.includes('911') ||
    modelKey.includes('stuttgart') ||
    modelKey.includes('918');
  const isBoxClassic =
    modelKey.includes('f40') ||
    modelKey.includes('f50') ||
    modelKey.includes('countach') ||
    modelKey.includes('m1-procar') ||
    modelKey.includes('m3-gtr') ||
    modelKey.includes('e30') ||
    modelKey.includes('ae86') ||
    modelKey.includes('trueno') ||
    modelKey.includes('skyline') ||
    modelKey.includes('22b') ||
    modelKey.includes('lancer');
  const isF1NeedleNose =
    modelKey.includes('laferrari') ||
    modelKey.includes('enzo') ||
    modelKey.includes('f80') ||
    modelKey.includes('solus') ||
    modelKey.includes('bolide') ||
    modelKey.includes('veneno') ||
    modelKey.includes('essenza') ||
    modelKey.includes('valkyrie') ||
    modelKey.includes('amg-one');
  const isPontoonCurvy =
    archetype === 'ferrari' ||
    archetype === 'pagani' ||
    modelKey.includes('daytona-sp3') ||
    modelKey.includes('utopia') ||
    modelKey.includes('huayra') ||
    modelKey.includes('rx-7') ||
    modelKey.includes('supra') ||
    modelKey.includes('viper');
  const isFrontEngineGt =
    archetype === 'bmw' ||
    archetype === 'mercedes' ||
    archetype === 'muscle' ||
    archetype === 'aston' ||
    modelKey.includes('812') ||
    modelKey.includes('fairlady');
  const isBoxy4x4 =
    modelKey.includes('g63') ||
    modelKey.includes('wrangler') ||
    modelKey.includes('defender') ||
    modelKey.includes('bronco') ||
    modelKey.includes('unimog') ||
    modelKey.includes('land cruiser');
  const isPickupBed =
    isTruck &&
    !modelKey.includes('unimog') &&
    !modelKey.includes('dakar');
  const isSixBySix = modelKey.includes('6x6');

  for (let i = 0; i < pos.count; i++) {
    const rawX = pos.getX(i);
    const rawY = pos.getY(i);
    const rawZ = pos.getZ(i);

    const nx = rawX / halfW; // [-1, 1]
    const ny = rawY / halfH; // [-1, 1]
    const nz = rawZ / halfL; // [-1, 1] (+1 is front nose, -1 is rear tail)
    const absX = Math.abs(nx);

    // 1. Longitudinal Fender Arch Flares, Coke-Bottle Waist Pinch & Nose/Tail Plan-View Taper
    const frontArchFlare = Math.exp(-Math.pow((nz - nzFront) / 0.21, 2));
    const rearArchFlare = Math.exp(-Math.pow((nz - nzRear) / (isSixBySix ? 0.34 : 0.24), 2));
    const waistPinch = Math.exp(-Math.pow((nz + 0.04) / 0.28, 2));

    const nosePlanTaper =
      nz > 0.48
        ? Math.pow((nz - 0.48) / 0.52, isWedgeOrigami ? 1.15 : 1.75) *
          (isHeavyTruck || isBoxy4x4
            ? 0.05
            : isBoxClassic || archetype === 'muscle'
            ? 0.09
            : isWedgeOrigami
            ? 0.26
            : isF1NeedleNose
            ? 0.32
            : 0.21)
        : 0;
    const tailPlanTaper =
      nz < -0.52
        ? Math.pow((-0.52 - nz) / 0.48, 1.65) *
          (isHeavyTruck || isBoxy4x4 || isPickupBed
            ? 0.03
            : archetype === 'bugatti' || archetype === 'pagani' || modelKey.includes('speedtail')
            ? 0.29
            : isBoxClassic || isWedgeOrigami || archetype === 'nissan' || archetype === 'muscle'
            ? 0.06
            : 0.16)
        : 0;

    const haunchAmp =
      archetype === 'ferrari'
        ? 0.22
        : isPontoonCurvy || isPorsche911 || archetype === 'muscle'
        ? 0.195
        : archetype === 'rally' || archetype === 'nissan' || archetype === 'audi'
        ? 0.18
        : isWedgeOrigami
        ? 0.16
        : isHyper || isSupercar
        ? 0.14
        : isTruck || isSuv
        ? 0.105
        : 0.09;
    const frontFlareAmp =
      archetype === 'ferrari' || archetype === 'pagani' || archetype === 'rally'
        ? 0.16
        : isPorsche911 || archetype === 'nissan' || archetype === 'audi' || archetype === 'bmw'
        ? 0.145
        : isBoxClassic || archetype === 'muscle'
        ? 0.13
        : isHyper || isSupercar
        ? 0.105
        : 0.085;
    const waistAmp =
      archetype === 'ferrari'
        ? 0.175
        : archetype === 'mclaren' || archetype === 'pagani' || archetype === 'muscle'
        ? 0.145
        : isWedgeOrigami || isBoxy4x4
        ? 0.035
        : isHyper || isSupercar || archetype === 'jdm'
        ? 0.09
        : isHeavyTruck
        ? 0.01
        : 0.05;

    let widthFactor =
      0.92 +
      frontArchFlare * frontFlareAmp +
      rearArchFlare * haunchAmp -
      waistPinch * waistAmp -
      nosePlanTaper -
      tailPlanTaper;

    // 2. Cross-Sectional Profile: Flat Angular Stealth Chamfers for Lamborghini vs Boxy 4x4 vs Liquid Curves
    const shoulderExponent = isWedgeOrigami || isBoxy4x4 ? 6.5 : isBoxClassic || archetype === 'nissan' ? 3.2 : 1.7;
    const topShoulderRound =
      ny > 0.05
        ? Math.pow((ny - 0.05) / 0.95, shoulderExponent) *
          (isHeavyTruck || isBoxy4x4 ? 0.05 : isWedgeOrigami ? 0.08 : 0.14)
        : 0;
    const bottomRockerTuck = ny < -0.25 ? Math.pow((-0.25 - ny) / 0.75, 1.7) * 0.085 : 0;
    widthFactor -= topShoulderRound + bottomRockerTuck;

    // Sculpted side door aero undercut channel / scallop between front and rear wheels
    if (!isHeavyTruck && !isBoxy4x4 && absX > 0.50 && Math.abs(nz + 0.05) < 0.40 && Math.abs(ny) < 0.72) {
      const doorLon = Math.cos(((nz + 0.05) / 0.40) * (Math.PI * 0.5));
      const doorVert = Math.cos((ny / 0.72) * (Math.PI * 0.5));
      const channelDepth =
        archetype === 'mclaren'
          ? 0.18
          : archetype === 'ferrari'
          ? 0.16
          : archetype === 'koenigsegg' || archetype === 'aston'
          ? 0.14
          : isWedgeOrigami || archetype === 'audi'
          ? 0.11
          : isHyper || isSupercar || archetype === 'nissan' || archetype === 'jdm'
          ? 0.085
          : 0.045;
      widthFactor -= doorLon * doorVert * channelDepth;
    }

    let x = rawX * widthFactor;
    let y = rawY;
    let z = rawZ;

    // 3. Vertical Profile: Brand Nose Slope, Le Mans/Frog-Eye Fender Crests & S-Duct / Horseshoe Spine
    if (ny > -0.25) {
      const topWeight = Math.max(0, (ny + 0.25) / 1.25);
      const edgeDrop =
        Math.pow(absX, isWedgeOrigami || isBoxy4x4 ? 4.8 : 2.1) *
        lowerHeight *
        (isBoxClassic || isWedgeOrigami || isBoxy4x4 ? 0.08 : 0.20) *
        topWeight;
      y -= edgeDrop;

      // Aerodynamic front hood slope forward of cabin
      if (nz > 0.06 && !isHeavyTruck) {
        const slopeNorm = (nz - 0.06) / 0.94;
        const maxDrop =
          lowerHeight *
          (isWedgeOrigami
            ? 0.86 // Razor-sharp flat Countach/Aventador wedge nose!
            : archetype === 'pagani' || archetype === 'koenigsegg' || isF1NeedleNose
            ? 0.72
            : archetype === 'mclaren' || archetype === 'ferrari'
            ? 0.66
            : isPorsche911
            ? 0.62
            : isBoxy4x4
            ? 0.14 // Flat commanding G-Wagen / Wrangler / Bronco hood!
            : isFrontEngineGt
            ? 0.24 // Long muscular upright GT / Muscle V8 hood!
            : isHyper || isSupercar
            ? 0.56
            : isTruck || isSuv
            ? 0.20
            : archetype === 'jdm'
            ? 0.46
            : 0.36);
        const slopePower = isWedgeOrigami ? 1.04 : isPorsche911 ? 1.95 : 1.55;
        y -= Math.pow(slopeNorm, slopePower) * maxDrop * topWeight;
      }

      // Open Pickup Truck Sunken Cargo Bed Cutout behind the cab (leaves thick bed rails and closed tailgate!)
      if (isPickupBed && nz < -0.10 && nz > -0.90 && absX < 0.74 && ny > 0.10) {
        const bedSideClear = Math.min(1, (0.74 - absX) / 0.12);
        const bedLenClear = Math.min(1, (-0.10 - nz) / 0.08, (nz + 0.90) / 0.08);
        y -= lowerHeight * 0.44 * bedSideClear * bedLenClear * topWeight;
      }

      // Rear deck slope & brand tail profile (Porsche 911 whale-tail fastback vs Muscle hip kick-up vs Bugatti Boat-Tail)
      if (nz < -0.20 && !isHeavyTruck && !isSuv && !isPickupBed) {
        const rearNorm = (-0.20 - nz) / 0.80;
        const rearDropMult = isPorsche911
          ? 0.42
          : isBoxClassic || isWedgeOrigami || archetype === 'nissan' || archetype === 'muscle'
          ? 0.11
          : archetype === 'bugatti' || archetype === 'pagani'
          ? 0.34
          : 0.22;
        y -= Math.pow(rearNorm, isPorsche911 ? 1.38 : 1.7) * lowerHeight * rearDropMult * topWeight;
      }

      // Muscular raised fender crests over front & rear wheels vs recessed aerodynamic center hood valley
      if (!isHeavyTruck && !isBoxy4x4) {
        const fenderZone = Math.max(0, (absX - 0.32) / 0.68);
        const frontCrestMult =
          archetype === 'pagani'
            ? 0.36
            : isPorsche911
            ? 0.35
            : archetype === 'ferrari' || isF1NeedleNose
            ? 0.31
            : archetype === 'mclaren' || archetype === 'koenigsegg' || archetype === 'aston'
            ? 0.26
            : isWedgeOrigami
            ? 0.14
            : 0.17;
        const rearCrestMult =
          archetype === 'ferrari' || archetype === 'pagani'
            ? 0.32
            : isPorsche911 || archetype === 'mclaren' || archetype === 'muscle' || archetype === 'jdm'
            ? 0.27
            : isHyper || isSupercar || archetype === 'nissan'
            ? 0.22
            : 0.15;
        const crestHeight =
          (frontArchFlare * frontCrestMult + rearArchFlare * rearCrestMult) *
          lowerHeight *
          Math.sin(fenderZone * Math.PI * 0.85);
        y += crestHeight * topWeight;

        // Center hood valley depression (Ferrari S-Duct / Porsche Frunk / Pagani V-Nose) vs Bugatti Horseshoe & Muscle/BMW Power-Dome Spine
        if (nz > 0.12 && absX < 0.56) {
          const valleyFactor = Math.cos((absX / 0.56) * (Math.PI * 0.5));
          const hoodZone = Math.sin(((nz - 0.12) / 0.88) * Math.PI);
          if (archetype === 'bugatti' || isFrontEngineGt || archetype === 'rally') {
            // Proud raised center V8/I6 power-dome / Bugatti horseshoe nose arch
            y += valleyFactor * hoodZone * lowerHeight * (archetype === 'muscle' ? 0.18 : 0.14) * topWeight;
          } else if (
            isPorsche911 ||
            isF1NeedleNose ||
            archetype === 'ferrari' ||
            archetype === 'mclaren' ||
            archetype === 'pagani' ||
            archetype === 'koenigsegg' ||
            isHyper ||
            isSupercar
          ) {
            const valleyDepth =
              archetype === 'ferrari' || isPorsche911 || archetype === 'pagani'
                ? 0.28
                : isF1NeedleNose
                ? 0.25
                : 0.16;
            y -= valleyFactor * hoodZone * lowerHeight * valleyDepth * topWeight;
          }
        }
      }
    }

    // 4. Brand-Specific Front Nose & Rear Plan-View Silhouette
    if (nz > 0.58) {
      if (archetype === 'bugatti' && absX < 0.32) {
        // Bugatti Protruding Center Horseshoe Nose Cone!
        const centerFactor = Math.cos((absX / 0.32) * (Math.PI * 0.5));
        z += centerFactor * ((nz - 0.58) / 0.42) * bodyLength * 0.048;
      } else if (archetype === 'muscle' && ny > 0.0) {
        // Classic American Muscle Shark-Nose Forward Lean at upper grille edge!
        z += (ny * 0.5) * ((nz - 0.58) / 0.42) * bodyLength * 0.032;
      }
      const noseArc = isBoxClassic || isBoxy4x4 || archetype === 'muscle'
        ? 0.016
        : isWedgeOrigami
        ? 0.088 // Sharp pointed hexagonal wedge arrow for Lamborghini!
        : isF1NeedleNose || archetype === 'ferrari'
        ? 0.075
        : 0.046;
      const cornerPullback =
        Math.pow(absX, isWedgeOrigami ? 1.15 : 2.0) * ((nz - 0.58) / 0.42) * bodyLength * noseArc;
      z -= cornerPullback;
    } else if (nz < -0.58) {
      const tailArc =
        archetype === 'bugatti' || archetype === 'pagani' || modelKey.includes('speedtail')
          ? 0.075
          : isBoxClassic || isWedgeOrigami || isBoxy4x4 || isPickupBed || archetype === 'nissan' || archetype === 'muscle'
          ? 0.014
          : 0.038;
      const rearCornerPullback = Math.pow(absX, 2.0) * ((-0.58 - nz) / 0.42) * bodyLength * tailArc;
      z += rearCornerPullback;
    }

    // Cushion extreme front/rear bumper vertical corners (except Lamborghini & Boxy 4x4s)
    if (!isWedgeOrigami && !isBoxy4x4 && Math.abs(nz) > 0.82 && Math.abs(ny) > 0.35 && !isHeavyTruck) {
      const endFactor = (Math.abs(nz) - 0.82) / 0.18;
      const vertFactor = (Math.abs(ny) - 0.35) / 0.65;
      z -= Math.sign(nz) * endFactor * vertFactor * bodyLength * (0.022 + (modelVariant % 2) * 0.006);
    }

    // 5. Forza Horizon 6 True Hollow Wheel-Well Arch Cutouts (Including 3-Axle Tandem Cutout for 6x6 Monster Rigs!):
    if (absX > 0.56 && ny < 0.32) {
      const archSpanZ = isHeavyTruck ? 0.185 : 0.175;
      const dzFront = Math.abs(nz - nzFront) / archSpanZ;
      const dzRear = Math.abs(nz - (isSixBySix ? -0.74 : nzRear)) / archSpanZ;
      const dzMid = isSixBySix ? Math.abs(nz - -0.34) / archSpanZ : 999;
      const dArch = Math.min(dzFront, dzRear, dzMid);
      if (dArch < 1.0) {
        const archProfile = Math.sqrt(Math.max(0, 1.0 - dArch * dArch));
        const outerWeight = Math.min(1.0, (absX - 0.56) / 0.28);
        const minArchY = (-0.88 + archProfile * 1.08) * halfH;
        if (y < minArchY) {
          y = y * (1 - outerWeight) + minArchY * outerWeight;
        }
        // Subtle outward fender lip flare around the wheel arch rim
        x *= 1.0 + archProfile * outerWeight * (archetype === 'rally' || isBoxy4x4 ? 0.048 : 0.032);
      }
    }

    // 6. Sculpted Front Lower Air-Dam Intake & Rear Venturi Diffuser Recess
    if (!isHeavyTruck && absX < 0.68 && ny < -0.05) {
      const centerMouth = Math.cos((absX / 0.68) * (Math.PI * 0.5));
      const lowWeight = Math.min(1, (-0.05 - ny) / 0.85);
      if (nz > 0.86) {
        z -= centerMouth * lowWeight * ((nz - 0.86) / 0.14) * bodyLength * 0.032;
      } else if (nz < -0.86) {
        z += centerMouth * lowWeight * ((-0.86 - nz) / 0.14) * bodyLength * 0.028;
        y += centerMouth * lowWeight * ((-0.86 - nz) / 0.14) * lowerHeight * 0.12;
      }
    }

    pos.setXYZ(i, x, y, z);
  }

  if (isWedgeOrigami) {
    // Keep crisp stealth-fighter faceted wedge normals on Lamborghini!
    geo.computeVertexNormals();
  } else {
    weldAndSmoothGeometryNormals(geo);
  }
  SCULPTED_CAR_BODY_GEO_CACHE.set(cacheKey, geo);
  return geo;
}

const SCULPTED_CABIN_CANOPY_GEO_CACHE = new Map<
  string,
  { glassGeo: THREE.BufferGeometry; roofCapGeo: THREE.BufferGeometry }
>();

/**
 * Generates a brand-differentiated 3D Cabin Greenhouse Canopy & matching Painted Metallic Roof Cap:
 * - Koenigsegg: Fighter-Jet Wrap-Around "Egg" Helmet Visor Canopy
 * - Pagani / Solus / Bolide: Central Le Mans Group-C Teardrop Glass Bubble
 * - Lamborghini: Low Faceted Hexagonal Stealth-Fighter Canopy
 * - Porsche 911: Unbroken Sloping Fastback "Flyline" Teardrop Cabin
 * - Viper / Supra / RX-7 / BMW M / Ferrari: Aerodynamic Double-Bubble Zagato Helmet Roof Crown
 * - G63 / Wrangler / Defender / Pickup Trucks: Upright Command-Post Cabin
 */
function createSculptedCabinCanopyGeometry(
  cabinWidth: number,
  cabinHeight: number,
  cabinLength: number,
  archetype: string,
  specId: string,
  modelKey: string,
  isHeavyTruck: boolean,
  isSuv: boolean,
  isHatch: boolean,
  isPickupBed: boolean
): { glassGeo: THREE.BufferGeometry; roofCapGeo: THREE.BufferGeometry } {
  const cacheKey = `${specId}_${cabinWidth.toFixed(3)}_${cabinHeight.toFixed(3)}_${cabinLength.toFixed(3)}_${archetype}_${isHeavyTruck}_${isSuv}_${isHatch}_${isPickupBed}`;
  const cached = SCULPTED_CABIN_CANOPY_GEO_CACHE.get(cacheKey);
  if (cached) return cached;

  const isKoenigseggEgg = archetype === 'koenigsegg';
  const isBubbleCanopy =
    archetype === 'pagani' ||
    modelKey.includes('solus') ||
    modelKey.includes('bolide') ||
    modelKey.includes('veneno') ||
    modelKey.includes('essenza') ||
    modelKey.includes('m-hybrid') ||
    modelKey.includes('valkyrie');
  const isWedgeHexCanopy = archetype === 'lamborghini';
  const isPorscheFastback =
    archetype === 'porsche' ||
    modelKey.includes('992') ||
    modelKey.includes('911') ||
    modelKey.includes('stuttgart');
  const isBoxy4x4 =
    modelKey.includes('g63') ||
    modelKey.includes('wrangler') ||
    modelKey.includes('defender') ||
    modelKey.includes('bronco') ||
    modelKey.includes('unimog') ||
    modelKey.includes('land cruiser');
  const hasDoubleBubbleRoof =
    modelKey.includes('viper') ||
    modelKey.includes('supra') ||
    modelKey.includes('rx-7') ||
    modelKey.includes('m4') ||
    modelKey.includes('corvette') ||
    archetype === 'pagani' ||
    archetype === 'ferrari';

  const buildDome = (isRoofCap: boolean): THREE.BufferGeometry => {
    const segW = isWedgeHexCanopy ? 10 : 32;
    const segH = isWedgeHexCanopy ? 8 : 22;
    const geo = new THREE.SphereGeometry(0.5, segW, segH);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let nx = pos.getX(i) * 2; // [-1, 1]
      let ny = pos.getY(i) * 2; // [-1, 1]
      let nz = pos.getZ(i) * 2; // [-1, 1]

      if (ny < 0) {
        ny = isRoofCap ? 0.56 : ny * 0.05;
      }

      if (isRoofCap && ny < 0.56) {
        ny = 0.56;
      }

      const absY = Math.max(0, ny);
      const tumbleRate = isHeavyTruck || isBoxy4x4
        ? 0.09
        : isBubbleCanopy
        ? 0.38
        : isKoenigseggEgg
        ? 0.16 // Wrap-around vertical fighter-jet visor sides!
        : isWedgeHexCanopy
        ? 0.32
        : 0.24;
      const tumblehome = 1.0 - Math.pow(absY, 1.75) * tumbleRate;

      // Plan-view teardrop taper: Koenigsegg Egg & Pagani Bubble round at BOTH front and rear!
      const frontEggRound =
        nz > 0 && (isKoenigseggEgg || isBubbleCanopy)
          ? 1.0 - Math.pow(nz, 1.8) * (isKoenigseggEgg ? 0.28 : 0.24)
          : 1.0;
      const rearTaperRate = isBubbleCanopy
        ? 0.42
        : isKoenigseggEgg
        ? 0.34
        : isPorscheFastback
        ? 0.30
        : archetype === 'mclaren'
        ? 0.32
        : isPickupBed || isBoxy4x4
        ? 0.05
        : 0.19;
      const rearTaper =
        nz < 0 && !isHeavyTruck && !isSuv && !isHatch && !isPickupBed
          ? 1.0 - Math.pow(-nz, 1.6) * rearTaperRate
          : 1.0 - Math.pow(Math.abs(nz), 2.4) * (isBoxy4x4 ? 0.03 : 0.08);

      let zShift = 0;
      if (!isHeavyTruck) {
        if (nz > 0) {
          const rakeAmount = isWedgeHexCanopy
            ? 0.32 // Extreme 62-degree Lamborghini windshield rake!
            : isKoenigseggEgg || isBoxy4x4
            ? 0.09 // Upright wrap-around visor / G-Wagen windshield!
            : isBubbleCanopy
            ? 0.22
            : 0.19;
          zShift = -Math.pow(absY, 1.45) * rakeAmount;
        } else if (isPickupBed) {
          // Crew-cab vertical rear glass cut so open truck bed sits behind cab
          zShift = Math.pow(absY, 1.4) * 0.08;
        } else if (!isSuv && !isHatch) {
          const fastbackStretch =
            isPorscheFastback || archetype === 'muscle' || archetype === 'jdm' || archetype === 'nissan'
              ? 0.26
              : isBubbleCanopy
              ? 0.16
              : 0.13;
          zShift = -Math.pow(1 - absY, 1.5) * fastbackStretch;
        }
      }

      const crownPower = isKoenigseggEgg || isWedgeHexCanopy || isBoxy4x4 ? 0.58 : isBubbleCanopy ? 0.92 : 0.74;
      let sculptedY = Math.pow(absY, crownPower);

      // Double-Bubble Zagato/Viper/Supra Helmet Roof Crown
      if (hasDoubleBubbleRoof && absY > 0.62 && Math.abs(nx) < 0.72 && Math.abs(nz) < 0.65) {
        const lonWeight = Math.cos((nz / 0.65) * (Math.PI * 0.5));
        const doubleWave = Math.sin((Math.abs(nx) / 0.72) * Math.PI);
        sculptedY += doubleWave * lonWeight * 0.068;
      }

      const scaleW =
        cabinWidth *
        (isRoofCap ? 0.85 : 0.98) *
        (isBubbleCanopy ? 0.84 : isKoenigseggEgg ? 0.88 : 1.0);
      const scaleH = cabinHeight * (isRoofCap ? 1.025 : 0.98);
      const scaleL =
        cabinLength *
        (isRoofCap ? 0.68 : 0.98) *
        (isPorscheFastback ? 1.18 : isKoenigseggEgg ? 0.92 : 1.0);

      pos.setXYZ(
        i,
        nx * (scaleW * 0.5) * tumblehome * rearTaper * frontEggRound,
        sculptedY * scaleH,
        (nz + zShift) * (scaleL * 0.5)
      );
    }

    if (isWedgeHexCanopy) {
      geo.computeVertexNormals();
    } else {
      weldAndSmoothGeometryNormals(geo);
    }
    return geo;
  };

  const result = {
    glassGeo: buildDome(false),
    roofCapGeo: buildDome(true),
  };
  SCULPTED_CABIN_CANOPY_GEO_CACHE.set(cacheKey, result);
  return result;
}

/**
 * High-detail, sculpted 3D automotive rig with:
 * - Authentic IRL brand architecture for BMW, Lamborghini, Ferrari, Pagani, Koenigsegg, Bugatti & McLaren
 * - Multi-contour aerodynamic body shell, tapered hood, sculpted side intakes & door channels
 * - Flared 3D fender wheel arches & recessed dark wheel wells
 * - Sloped cabin greenhouse with A/B/C pillars, tinted glass, interior bucket seats & steering wheel
 * - Aerodynamic wing mirrors on twin stalks
 * - Brand-specific LED headlights, rear taillights, exhaust layouts & active aerodynamic flaps/airbrakes
 * - 5-twin-spoke 3D alloy wheels, rounded tire sidewalls, drilled steel brake rotors, and Brembo-style calipers
 */
function buildVehicleRig(spec: VehicleSpec, tune: VehicleTune): BuiltCarRig {
  const root = new THREE.Group();
  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);
  const archetype = spec.designArchetype || 'standard';

  const isRough = tune.paintFinish === 'Matte' || tune.paintFinish === 'Satin';
  const flakeTex = getMetallicFlakeRoughnessTexture();
  // Forza Horizon 6 Dual-Spec Automotive Clearcoat Paint:
  // Balanced metallic flake base coat (preserves deep rich pigment saturation in sunlight) + 100% wet-mirror clearcoat layer on top!
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tune.paintHex),
    roughnessMap: flakeTex,
    bumpMap: flakeTex,
    bumpScale: isRough ? 0.0018 : 0.0008,
    metalness:
      tune.paintFinish === 'Matte'
        ? 0.32
        : tune.paintFinish === 'Satin'
        ? 0.48
        : tune.paintFinish === 'Pearlescent'
        ? 0.72
        : 0.66,
    roughness:
      tune.paintFinish === 'Matte'
        ? 0.38
        : tune.paintFinish === 'Satin'
        ? 0.24
        : 0.14,
    clearcoat: isRough ? 0.25 : 1.0,
    clearcoatRoughness: isRough ? 0.22 : 0.006,
    ior: 1.68,
    reflectivity: 1.0,
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xffffff),
    iridescence: tune.paintFinish === 'Pearlescent' ? 0.75 : 0.18,
    iridescenceIOR: 1.65,
    iridescenceThicknessRange: [160, 460],
    anisotropy: 0.32,
    anisotropyRotation: Math.PI * 0.5,
    sheen: tune.paintFinish === 'Pearlescent' ? 0.65 : 0.22,
    sheenRoughness: 0.2,
    sheenColor: new THREE.Color(0xe0f2fe),
    envMapIntensity: isRough ? 1.85 : 3.15,
  });

  const carbonMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x161922,
    map: getCarbonFiberWeaveTexture(),
    bumpMap: getCarbonFiberWeaveTexture(),
    bumpScale: 0.003,
    metalness: 0.78,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.025,
    reflectivity: 1.0,
    envMapIntensity: 2.85,
  });

  const grilleMaterial = new THREE.MeshStandardMaterial({
    color: 0x07090e,
    metalness: 0.65,
    roughness: 0.42,
  });

  const chromeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.005,
    reflectivity: 1.0,
    envMapIntensity: 4.5,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x060b16,
    metalness: 0.46,
    roughness: 0.012,
    transparent: true,
    opacity: 0.92,
    clearcoat: 1.0,
    clearcoatRoughness: 0.005,
    ior: 1.62,
    reflectivity: 1.0,
    envMapIntensity: 3.9,
  });

  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x14161d,
    roughness: 0.65,
    metalness: 0.18,
  });

  const rimMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tune.rimHex),
    metalness: 0.97,
    roughness: 0.055,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    reflectivity: 1.0,
    anisotropy: 0.5,
    envMapIntensity: 3.6,
  });

  const rotorMaterial = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    map: getDrilledBrakeRotorTexture(),
    bumpMap: getDrilledBrakeRotorTexture(),
    bumpScale: 0.008,
    metalness: 0.88,
    roughness: 0.26,
    emissive: new THREE.Color(0xff3b00),
    emissiveIntensity: 0.0,
  });

  const caliperMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tune.caliperHex),
    metalness: 0.65,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x14171f,
    map: getTireTreadTexture(),
    bumpMap: getTireTreadTexture(),
    bumpScale: 0.012,
    roughness: 0.78,
    metalness: 0.08,
  });

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 2.8,
  });

  const drlAmberMaterial = new THREE.MeshStandardMaterial({
    color: archetype === 'bmw' ? 0xfacc15 : 0x38bdf8,
    emissive: archetype === 'bmw' ? 0xfacc15 : 0x38bdf8,
    emissiveIntensity: 2.1,
  });

  const brakeLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.9,
  });

  const activeAero: BuiltCarRig['activeAero'] = {};

  // Proportions per bodyStyle & Brand Design Archetype
  const isHeavyTruck = spec.bodyStyle === 'heavy_truck';
  const isTruck = spec.bodyStyle === 'baja_truck' || isHeavyTruck;
  const isSuv = spec.bodyStyle === 'suv_4x4';
  const isHatch = spec.bodyStyle === 'normal_hatch';
  const isNormal = spec.bodyStyle === 'normal_sedan' || isHatch;
  const isMuscle = spec.bodyStyle === 'muscle_classic';
  const isHyper = spec.bodyStyle === 'hypercar';
  const isSupercar = spec.bodyStyle === 'supercar';
  const isJdm = spec.bodyStyle === 'jdm_coupe';
  const isTrackGt = spec.bodyStyle === 'track_gt';

  const bodyWidth = isHeavyTruck
    ? 2.44
    : isTruck
    ? 2.18
    : isSuv
    ? 2.08
    : archetype === 'bugatti' || archetype === 'lamborghini' || archetype === 'koenigsegg'
    ? 2.12
    : isHyper || archetype === 'pagani' || archetype === 'mclaren'
    ? 2.08
    : isSupercar || isTrackGt || archetype === 'ferrari'
    ? 2.02
    : isNormal && archetype !== 'bmw'
    ? 1.86
    : 1.98;

  const bodyLength = isHeavyTruck
    ? 5.9
    : isTruck
    ? 4.92
    : isSuv
    ? 4.78
    : isHatch
    ? 4.22
    : archetype === 'lamborghini' || archetype === 'pagani' || archetype === 'koenigsegg'
    ? 4.82
    : isHyper || archetype === 'bugatti' || archetype === 'ferrari'
    ? 4.74
    : 4.58;

  const lowerHeight = isHeavyTruck
    ? 0.92
    : isTruck
    ? 0.66
    : isSuv
    ? 0.62
    : isNormal && archetype !== 'bmw'
    ? 0.52
    : archetype === 'lamborghini' || archetype === 'pagani' || archetype === 'koenigsegg'
    ? 0.37
    : isHyper || archetype === 'mclaren' || archetype === 'bugatti'
    ? 0.39
    : isSupercar || archetype === 'ferrari'
    ? 0.42
    : 0.46;

  const wheelRadius = isHeavyTruck ? 0.54 : isTruck || isSuv ? 0.44 : 0.355;
  const wheelWidth = isHeavyTruck ? 0.42 : isTruck || isSuv ? 0.34 : 0.305;
  const groundOffset =
    tune.rideHeightMm / 1000 + (isHeavyTruck ? 0.42 : isTruck || isSuv ? 0.34 : 0.19);

  // Unified lowercase model descriptor so ALL 260 cars (Hero, Showcase & Catalog) get bespoke real-world model details!
  const modelKey = `${spec.id} ${spec.name} ${spec.manufacturer}`.toLowerCase();

  // Deterministic per-model design hash so every individual supercar/hypercar model has distinct proportions & aero details
  let modelHash = 0;
  for (let i = 0; i < spec.id.length; i++) {
    modelHash = (modelHash * 31 + spec.id.charCodeAt(i)) >>> 0;
  }
  const modelVariant = modelHash % 4; // 0, 1, 2, 3
  const isLongtail =
    modelKey.includes('speedtail') ||
    modelKey.includes('codalunga') ||
    modelKey.includes('absolut') ||
    modelKey.includes('regera') ||
    modelKey.includes('ss-300') ||
    modelKey.includes('765lt') ||
    modelKey.includes('675lt') ||
    modelKey.includes('600lt') ||
    modelKey.includes('longtail');
  const isTrackSpecial =
    isTrackGt ||
    modelKey.includes('gtr') ||
    modelKey.includes('gt3') ||
    modelKey.includes('sto') ||
    modelKey.includes('svj') ||
    modelKey.includes('xx') ||
    modelKey.includes('bolide') ||
    modelKey.includes('senna') ||
    modelKey.includes('jesko-attack') ||
    modelKey.includes('one-1') ||
    modelKey.includes('zonda-r') ||
    modelKey.includes('huayra-r') ||
    modelKey.includes('f40') ||
    modelKey.includes('f50') ||
    modelKey.includes('veneno') ||
    modelKey.includes('valkyrie') ||
    modelKey.includes('acr') ||
    modelKey.includes('black series') ||
    modelKey.includes('time attack');
  const isClassicIcon =
    spec.year <= 1998 ||
    modelKey.includes('miura') ||
    modelKey.includes('countach') ||
    modelKey.includes('diablo') ||
    modelKey.includes('eb110') ||
    modelKey.includes('m1') ||
    modelKey.includes('e30') ||
    modelKey.includes('288-gto') ||
    modelKey.includes('ae86') ||
    modelKey.includes('trueno') ||
    modelKey.includes('rx-7') ||
    modelKey.includes('chevelle') ||
    modelKey.includes('boss 429');
  const hasPopUpHeadlights =
    modelKey.includes('ae86') ||
    modelKey.includes('trueno') ||
    modelKey.includes('rx-7') ||
    modelKey.includes('miura') ||
    modelKey.includes('countach') ||
    modelKey.includes('diablo') ||
    modelKey.includes('f40') ||
    modelKey.includes('288-gto') ||
    modelKey.includes('m1-procar');
  const isBoxy4x4 =
    modelKey.includes('g63') ||
    modelKey.includes('wrangler') ||
    modelKey.includes('defender') ||
    modelKey.includes('bronco') ||
    modelKey.includes('unimog') ||
    modelKey.includes('land cruiser');
  const isPickupBed =
    isTruck &&
    !modelKey.includes('unimog') &&
    !modelKey.includes('dakar');
  const isSixBySix = modelKey.includes('6x6');

  // 1. Lower Carbon Undertray & Sculpted Carbon Rocker Skirts
  const wheelZFront = bodyLength * 0.31;
  const wheelZRear = -bodyLength * 0.31;

  const undertrayGeo = new THREE.BoxGeometry(
    bodyWidth * 0.94,
    0.05,
    bodyLength * (isLongtail ? 0.94 : 0.9)
  );
  const undertrayMesh = new THREE.Mesh(undertrayGeo, carbonMaterial);
  undertrayMesh.position.set(0, groundOffset + 0.03, isLongtail ? -0.08 : 0);
  chassisGroup.add(undertrayMesh);

  // Side aerodynamic carbon rocker blades between front and rear wheels
  [-1, 1].forEach((side) => {
    const rockerBladeGeo = new THREE.CylinderGeometry(0.045, 0.055, bodyLength * 0.48, 12);
    rockerBladeGeo.rotateX(Math.PI / 2);
    const rockerBlade = new THREE.Mesh(rockerBladeGeo, carbonMaterial);
    rockerBlade.scale.set(1.4, 0.55, 1.0);
    rockerBlade.position.set(side * (bodyWidth * 0.475), groundOffset + 0.065, 0);
    chassisGroup.add(rockerBlade);
  });

  // 2. Continuous Sculpted 3D Monocoque Metallic Car Body Shell (Smooth welded vertex normals, bespoke brand/model silhouette!)
  const sculptedBodyGeo = createSculptedCarBodyGeometry(
    bodyWidth,
    lowerHeight,
    bodyLength * (isLongtail ? 1.06 : 1.0),
    wheelZFront,
    wheelZRear,
    archetype,
    spec.id,
    modelKey,
    modelVariant,
    isHyper,
    isSupercar,
    isTruck,
    isSuv,
    isHeavyTruck
  );
  const sculptedBodyMesh = new THREE.Mesh(sculptedBodyGeo, bodyMaterial);
  sculptedBodyMesh.position.set(
    0,
    groundOffset + lowerHeight * 0.52,
    isLongtail ? -bodyLength * 0.03 : 0
  );
  sculptedBodyMesh.castShadow = true;
  sculptedBodyMesh.receiveShadow = true;
  chassisGroup.add(sculptedBodyMesh);

  // ============================================================================
  // 2B. BESPOKE MODEL-SPECIFIC LIVERY, TWO-TONE PANELS, CARBON HOODS & RACING STRIPES
  // Makes every supercar & hypercar visually unmistakable at a glance!
  // ============================================================================
  const accentHexPalette = [0xf59e0b, 0x06b6d4, 0xef4444, 0xf8fafc, 0x10b981, 0xfacc15];
  let signatureAccentHex = accentHexPalette[modelHash % accentHexPalette.length];
  if (spec.id.includes('ss-300') || spec.id.includes('veyron-ss') || spec.id.includes('one-1')) {
    signatureAccentHex = 0xf97316; // Magma Orange
  } else if (spec.id.includes('divo') || spec.id.includes('regera')) {
    signatureAccentHex = 0x06b6d4; // Electric Cyan
  } else if (spec.id.includes('bolide') || spec.id.includes('centodieci')) {
    signatureAccentHex = 0x3b82f6; // French Racing Blue
  } else if (spec.id.includes('sf90-xx') || spec.id.includes('p1-gtr') || spec.id.includes('valkyrie')) {
    signatureAccentHex = 0xfacc15; // Giallo / Racing Yellow
  } else if (spec.id.includes('daytona-sp3') || spec.id.includes('458-speciale') || spec.id.includes('huayra-bc')) {
    signatureAccentHex = 0xf8fafc; // NART Championship White
  } else if (spec.id.includes('sesto') || spec.id.includes('zonda-cinque') || spec.id.includes('veneno')) {
    signatureAccentHex = 0xef4444; // Corsa Crimson Accent
  } else if (spec.id.includes('jesko-attack') || spec.id.includes('performante') || spec.id.includes('essenza')) {
    signatureAccentHex = 0x22c55e; // Verde / Slipstream Green
  } else if (spec.id.includes('svj') || spec.id.includes('agera-rs') || spec.id.includes('f1-lm') || spec.id.includes('gemera')) {
    signatureAccentHex = 0xfbbf24; // 24K Gold Leaf Accent
  }

  // Ensure accent color contrasts with primary paint
  const basePaintCol = new THREE.Color(tune.paintHex);
  const accentCol = new THREE.Color(signatureAccentHex);
  const basePaintLum =
    basePaintCol.r * 0.299 + basePaintCol.g * 0.587 + basePaintCol.b * 0.114;
  if (
    Math.abs(basePaintCol.r - accentCol.r) +
      Math.abs(basePaintCol.g - accentCol.g) +
      Math.abs(basePaintCol.b - accentCol.b) <
    0.45
  ) {
    accentCol.setHex(basePaintLum > 0.45 ? 0x111827 : 0xfbbf24);
  }

  const accentMaterial = new THREE.MeshPhysicalMaterial({
    color: accentCol,
    metalness: 0.92,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,
    envMapIntensity: 3.8,
  });

  // Ferrari F80 Signature Gloss-Black Front Nose Visor Mask across the hood between headlights!
  if (spec.id.includes('f80') || spec.id.includes('daytona-sp3')) {
    const visorMask = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.84, 0.032, 0.34),
      carbonMaterial
    );
    visorMask.position.set(0, groundOffset + lowerHeight * 0.66, bodyLength * 0.41);
    visorMask.rotation.x = 0.28;
    chassisGroup.add(visorMask);
  }

  // Weissach / Track Pack Contrasting Exposed Carbon-Fiber Center Hood Panel
  const hasCarbonHoodInsert =
    spec.id.includes('gtrs') ||
    spec.id.includes('gt3') ||
    spec.id.includes('svj') ||
    spec.id.includes('performante') ||
    spec.id.includes('veneno') ||
    spec.id.includes('essenza') ||
    spec.id.includes('bolide') ||
    spec.id.includes('p1-gtr') ||
    spec.id.includes('675lt') ||
    spec.id.includes('zonda-cinque') ||
    spec.id.includes('zonda-revolucion') ||
    spec.id.includes('huayra-bc') ||
    spec.id.includes('one-1') ||
    spec.id.includes('m4-csl') ||
    spec.id.includes('utopia');

  if (hasCarbonHoodInsert && !isHeavyTruck) {
    const hoodInsert = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.38, 0.025, bodyLength * 0.27),
      carbonMaterial
    );
    hoodInsert.position.set(0, groundOffset + lowerHeight * 0.74, bodyLength * 0.29);
    hoodInsert.rotation.x = 0.26;
    chassisGroup.add(hoodInsert);

    // Colored accent pin-stripes bordering the carbon hood panel
    [-1, 1].forEach((side) => {
      const pinStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.028, bodyLength * 0.27),
        accentMaterial
      );
      pinStripe.position.set(
        side * (bodyWidth * 0.195),
        groundOffset + lowerHeight * 0.745,
        bodyLength * 0.29
      );
      pinStripe.rotation.x = 0.26;
      chassisGroup.add(pinStripe);
    });
  }

  // Bugatti & Hypercar Two-Tone Duotone Side/Rear Quarter Panels
  if (
    archetype === 'bugatti' ||
    spec.id.includes('w1-hypercar') ||
    spec.id.includes('essenza') ||
    spec.id.includes('huayra-bc') ||
    spec.id.includes('revuelto')
  ) {
    [-1, 1].forEach((side) => {
      const duotoneFlank = new THREE.Mesh(
        new THREE.CylinderGeometry(lowerHeight * 0.44, lowerHeight * 0.48, bodyLength * 0.42, 16),
        spec.id.includes('veyron-ss') || spec.id.includes('bolide') ? accentMaterial : carbonMaterial
      );
      duotoneFlank.rotation.x = Math.PI / 2;
      duotoneFlank.scale.set(0.32, 0.92, 1.0);
      duotoneFlank.position.set(
        side * (bodyWidth * 0.44),
        groundOffset + lowerHeight * 0.52,
        -bodyLength * 0.21
      );
      chassisGroup.add(duotoneFlank);
    });
  }

  // Model-Differentiated Racing Stripes (Twin Le Mans Stripes vs Center Apex Stripe vs Side Motorsport Blade)
  const hasTwinRacingStripes =
    spec.id.includes('ss-300') ||
    spec.id.includes('458-speciale') ||
    spec.id.includes('daytona-sp3') ||
    spec.id.includes('agera-rs') ||
    spec.id.includes('p1-gtr') ||
    spec.id.includes('m4-csl') ||
    ((isSupercar || isHyper) && modelVariant === 1);

  const hasCenterApexStripe =
    spec.id.includes('zonda-cinque') ||
    spec.id.includes('zonda-revolucion') ||
    spec.id.includes('one-1') ||
    spec.id.includes('regera') ||
    spec.id.includes('jesko-attack') ||
    spec.id.includes('absolut') ||
    spec.id.includes('sf90-xx') ||
    spec.id.includes('divo') ||
    ((isSupercar || isHyper) && modelVariant === 2);

  if (hasTwinRacingStripes && !isHeavyTruck) {
    [-0.085, 0.085].forEach((xOff) => {
      const frontStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, 0.024, bodyLength * 0.31),
        accentMaterial
      );
      frontStripe.position.set(xOff, groundOffset + lowerHeight * 0.75, bodyLength * 0.28);
      frontStripe.rotation.x = 0.25;
      const rearStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.085, 0.024, bodyLength * 0.26),
        accentMaterial
      );
      rearStripe.position.set(xOff, groundOffset + lowerHeight * 0.84, -bodyLength * 0.31);
      rearStripe.rotation.x = -0.14;
      chassisGroup.add(frontStripe, rearStripe);
    });
  } else if (hasCenterApexStripe && !isHeavyTruck) {
    const apexFront = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.025, bodyLength * 0.32),
      accentMaterial
    );
    apexFront.position.set(0, groundOffset + lowerHeight * 0.76, bodyLength * 0.28);
    apexFront.rotation.x = 0.25;
    chassisGroup.add(apexFront);
  }

  // Colored Rocker Skirt & Side Door Livery Blades for Supercars / Track GTs
  if (isHyper || isSupercar || isTrackGt) {
    [-1, 1].forEach((side) => {
      const rockerAccent = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.028, bodyLength * 0.46),
        accentMaterial
      );
      rockerAccent.position.set(side * (bodyWidth * 0.49), groundOffset + 0.075, 0);
      chassisGroup.add(rockerAccent);
    });
  }

  // 3. Sculpted Brand-Specific Side Air Intakes, Curved Front Grille Mouth & Engine Bay Details
  const hoodLength = bodyLength * 0.34;
  if (isHyper || isSupercar || isTrackGt) {
    [-1, 1].forEach((side) => {
      const intakeScoopGeo = new THREE.CylinderGeometry(0.08, 0.15, 0.85, 14);
      intakeScoopGeo.rotateX(Math.PI / 2);
      const intakeScoop = new THREE.Mesh(intakeScoopGeo, grilleMaterial);
      intakeScoop.scale.set(0.65, 1.35, 1.0);
      intakeScoop.position.set(
        side * (bodyWidth * 0.445),
        groundOffset + lowerHeight * 0.56,
        -0.32
      );
      chassisGroup.add(intakeScoop);
    });
  }

  // Sculpted Hood Power Dome / Carbon Aero Extractor Vent
  if (archetype === 'bmw' || isMuscle || isTrackSpecial) {
    const hoodBulgeGeo = new THREE.CylinderGeometry(
      bodyWidth * 0.16,
      bodyWidth * 0.22,
      hoodLength * 0.68,
      16
    );
    hoodBulgeGeo.rotateX(Math.PI / 2);
    const hoodBulge = new THREE.Mesh(
      hoodBulgeGeo,
      isTrackSpecial && archetype !== 'bmw' ? carbonMaterial : bodyMaterial
    );
    hoodBulge.scale.set(1.3, 0.26, 1.0);
    hoodBulge.position.set(
      0,
      groundOffset + lowerHeight * (isHeavyTruck ? 0.98 : 0.78),
      bodyLength * 0.26
    );
    hoodBulge.rotation.x = isHeavyTruck ? 0.02 : 0.18;
    chassisGroup.add(hoodBulge);
  }

  // Curved Front Radiator Grille Aperture
  const frontGrilleGeo = new THREE.CylinderGeometry(
    bodyWidth * 0.36,
    bodyWidth * 0.36,
    lowerHeight * (isHeavyTruck ? 0.68 : 0.34),
    20,
    1,
    false,
    -Math.PI * 0.38,
    Math.PI * 0.76
  );
  const frontGrille = new THREE.Mesh(
    frontGrilleGeo,
    isHeavyTruck ? chromeMaterial : grilleMaterial
  );
  frontGrille.scale.set(1.0, 1.0, 0.38);
  frontGrille.position.set(
    0,
    groundOffset + lowerHeight * (isHeavyTruck ? 0.54 : 0.28),
    bodyLength * 0.37
  );
  chassisGroup.add(frontGrille);

  // Visible Front-Mount Intercooler for JDM / Turbo cars
  if (isJdm || tune.aspiration !== 'NA') {
    const intercoolerGeo = new THREE.BoxGeometry(bodyWidth * 0.44, lowerHeight * 0.22, 0.06);
    const intercoolerMesh = new THREE.Mesh(intercoolerGeo, rotorMaterial);
    intercoolerMesh.position.set(0, groundOffset + lowerHeight * 0.24, bodyLength * 0.495);
    chassisGroup.add(intercoolerMesh);
  }

  // Muscle Car Supercharger Blower Scoop
  if (isMuscle) {
    const scoopGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.86, 16);
    scoopGeo.rotateX(Math.PI / 2);
    const scoopMesh = new THREE.Mesh(scoopGeo, chromeMaterial);
    scoopMesh.scale.set(1.15, 0.55, 1.0);
    scoopMesh.position.set(0, groundOffset + lowerHeight + 0.06, bodyLength * 0.25);
    chassisGroup.add(scoopMesh);
  }

  // Heavy Truck Chrome Exhaust Stacks
  if (isHeavyTruck) {
    const stackGeo = new THREE.CylinderGeometry(0.085, 0.085, 2.05, 16);
    const stackL = new THREE.Mesh(stackGeo, chromeMaterial);
    stackL.position.set(bodyWidth * 0.46, groundOffset + lowerHeight + 0.8, -0.35);
    const stackR = stackL.clone();
    stackR.position.x = -bodyWidth * 0.46;
    chassisGroup.add(stackL, stackR);
  }

  // 4. Sculpted Smooth Torus Fender Flares & Recessed Wheel Wells (FL, FR, RL, RR + 6x6 Tandem Rear Axles!)
  const archRadius = wheelRadius * 1.12;
  const archWidth = wheelWidth * 1.15;

  const fenderPositions: [number, number][] = isSixBySix
    ? [
        [bodyWidth * 0.445, wheelZFront],
        [-bodyWidth * 0.445, wheelZFront],
        [bodyWidth * 0.46, -bodyLength * 0.17],
        [-bodyWidth * 0.46, -bodyLength * 0.17],
        [bodyWidth * 0.46, -bodyLength * 0.37],
        [-bodyWidth * 0.46, -bodyLength * 0.37],
      ]
    : [
        [bodyWidth * 0.445, wheelZFront],
        [-bodyWidth * 0.445, wheelZFront],
        [bodyWidth * 0.46, wheelZRear],
        [-bodyWidth * 0.46, wheelZRear],
      ];

  // Smooth rounded torus fender lip for realistic curved wheel arch flare
  const archLipTorusGeo = new THREE.TorusGeometry(archRadius * 0.95, 0.068, 14, 28, Math.PI * 1.05);
  archLipTorusGeo.rotateY(Math.PI / 2);

  const wellCylinderGeo = new THREE.CylinderGeometry(
    wheelRadius * 1.05,
    wheelRadius * 1.05,
    archWidth * 0.95,
    24
  );
  wellCylinderGeo.rotateZ(Math.PI / 2);

  fenderPositions.forEach(([fx, fz]) => {
    const archLip = new THREE.Mesh(
      archLipTorusGeo,
      isBoxy4x4 || isTruck || archetype === 'rally' ? carbonMaterial : bodyMaterial
    );
    archLip.position.set(fx * 1.02, wheelRadius + 0.03, fz);
    archLip.scale.set(1.35, 1.0, 1.08);
    archLip.castShadow = true;
    chassisGroup.add(archLip);

    const wellMesh = new THREE.Mesh(wellCylinderGeo, grilleMaterial);
    wellMesh.position.set(fx * 0.95, wheelRadius + 0.02, fz);
    chassisGroup.add(wellMesh);

    // Rally & Off-Road Motorsport Mudflaps behind each wheel arch
    if (archetype === 'rally' || isTruck) {
      const mudflap = new THREE.Mesh(
        new THREE.BoxGeometry(wheelWidth * 0.86, wheelRadius * 0.52, 0.018),
        archetype === 'rally' ? accentMaterial : carbonMaterial
      );
      mudflap.position.set(
        fx * 0.98,
        wheelRadius * 0.56,
        fz - archRadius * 0.92
      );
      chassisGroup.add(mudflap);
    }
  });

  // AE86 Sprinter Trueno Initial-D Panda Two-Tone Lower Door & Bumper Cladding
  if (modelKey.includes('ae86') || modelKey.includes('trueno')) {
    [-1, 1].forEach((side) => {
      const pandaLower = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, lowerHeight * 0.42, bodyLength * 0.88),
        carbonMaterial
      );
      pandaLower.position.set(
        side * (bodyWidth * 0.472),
        groundOffset + lowerHeight * 0.24,
        0
      );
      chassisGroup.add(pandaLower);
    });
  }

  // Audi R8 Signature Contrasting Carbon-Fiber Sideblades behind the doors
  if (archetype === 'audi' && (isSupercar || isHyper)) {
    [-1, 1].forEach((side) => {
      const sideblade = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, lowerHeight * 0.78, bodyLength * 0.16),
        carbonMaterial
      );
      sideblade.position.set(
        side * (bodyWidth * 0.475),
        groundOffset + lowerHeight * 0.62,
        -bodyLength * 0.12
      );
      sideblade.rotation.x = 0.22;
      chassisGroup.add(sideblade);
    });
  }

  // Rear Mid-Engine V10 / V12 / W16 Showcase Bay & Model-Specific Louver Architecture
  if (isHyper || isSupercar || isTrackGt) {
    const engineBayWidth = bodyWidth * 0.46;
    const engineBayLen = bodyLength * 0.26;
    const engineBayZ = -bodyLength * 0.26;
    const engineBayY = groundOffset + lowerHeight * 0.92;

    // 1. Recessed Carbon Engine Cradle
    const cradleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(engineBayWidth, 0.035, engineBayLen),
      carbonMaterial
    );
    cradleMesh.position.set(0, engineBayY, engineBayZ);
    chassisGroup.add(cradleMesh);

    // 2. Sculpted Twin Cylinder Bank Intake Plenums (Rosso Red for Ferrari, 24K Gold for McLaren/Lambo SVJ, Chrome/Cyan for Bugatti, Titanium for Porsche/Pagani/Koenigsegg)
    const plenumColor =
      archetype === 'ferrari'
        ? 0xdc2626
        : spec.id.includes('f1-lm') || archetype === 'lamborghini' || spec.id.includes('gemera')
        ? 0xd97706
        : archetype === 'bugatti'
        ? 0x38bdf8
        : 0x94a3b8;
    const plenumMat = new THREE.MeshPhysicalMaterial({
      color: plenumColor,
      metalness: 0.88,
      roughness: 0.16,
      clearcoat: 0.9,
      envMapIntensity: 3.2,
    });
    [-0.125, 0.125].forEach((xBank) => {
      const bankMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.058, engineBayLen * 0.82, 12),
        plenumMat
      );
      bankMesh.rotation.x = Math.PI / 2;
      bankMesh.position.set(xBank, engineBayY + 0.045, engineBayZ);
      chassisGroup.add(bankMesh);
    });

    // 3. Titanium X-Brace Strut Tower Bar across the Mid-Engine Bay
    [-1, 1].forEach((diag) => {
      const xBrace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, engineBayWidth * 1.05, 8),
        chromeMaterial
      );
      xBrace.rotation.z = Math.PI / 2;
      xBrace.rotation.y = diag * 0.52;
      xBrace.position.set(0, engineBayY + 0.075, engineBayZ);
      chassisGroup.add(xBrace);
    });

    // 4. Model-Specific Rear Deck Cover (Horizontal Daytona SP3 Strakes vs Stepped Countach/F40/SVJ Louvers vs Bugatti Dual Roof Scoops)
    if (spec.id.includes('daytona-sp3')) {
      // Iconic Ferrari Daytona SP3 Full-Width Horizontal Rear Strake Blades
      for (let s = 0; s < 5; s++) {
        const strake = new THREE.Mesh(
          new THREE.BoxGeometry(bodyWidth * 0.92, 0.022, 0.08),
          bodyMaterial
        );
        strake.position.set(
          0,
          groundOffset + lowerHeight * (0.32 + s * 0.11),
          -bodyLength * 0.502
        );
        chassisGroup.add(strake);
      }
    } else if (
      spec.id.includes('countach') ||
      spec.id.includes('svj') ||
      spec.id.includes('veneno') ||
      spec.id.includes('sesto') ||
      spec.id.includes('f40') ||
      spec.id.includes('miura')
    ) {
      // Stepped Slatted Carbon Miura/Countach/F40 Louvers
      for (let l = 0; l < 5; l++) {
        const louver = new THREE.Mesh(
          new THREE.BoxGeometry(engineBayWidth * 0.92, 0.026, 0.11),
          spec.id.includes('sesto') ? accentMaterial : carbonMaterial
        );
        louver.position.set(0, engineBayY + 0.09 - l * 0.012, -bodyLength * 0.16 - l * 0.14);
        louver.rotation.x = -0.24;
        chassisGroup.add(louver);
      }
    } else if (archetype === 'bugatti') {
      // Bugatti Veyron SS / Chiron / Tourbillon Twin Chrome Roof-to-Engine Air Intake Tubes
      [-0.17, 0.17].forEach((xScoop) => {
        const intakeTube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.075, bodyLength * 0.24, 14),
          chromeMaterial
        );
        intakeTube.rotation.x = Math.PI / 2 + 0.18;
        intakeTube.position.set(xScoop, engineBayY + 0.15, -bodyLength * 0.16);
        chassisGroup.add(intakeTube);
      });
    }
  }

  // 5. Realistic Tapered Cabin Greenhouse, Teardrop Canopy (Pagani/Koenigsegg/McLaren), Flying Buttresses (Ferrari) & Interior Cockpit
  const cabinWidth =
    bodyWidth *
    (isHeavyTruck
      ? 0.86
      : isSuv || isHatch
      ? 0.84
      : spec.id.includes('solus') || spec.id.includes('bolide')
      ? 0.58
      : archetype === 'pagani' || archetype === 'koenigsegg' || archetype === 'mclaren'
      ? 0.68
      : isHyper
      ? 0.72
      : isSupercar
      ? 0.75
      : 0.8);
  const cabinHeight = isHeavyTruck
    ? 0.92
    : isTruck || isSuv
    ? 0.56
    : isNormal && archetype !== 'bmw'
    ? 0.46
    : archetype === 'lamborghini' || spec.id.includes('bolide') || spec.id.includes('solus')
    ? 0.31
    : isHyper
    ? 0.35
    : 0.4;
  const cabinLength =
    bodyLength *
    (isHeavyTruck
      ? 0.36
      : isSuv || isHatch
      ? 0.56
      : isTruck
      ? 0.44
      : isNormal || archetype === 'bmw' || spec.id.includes('gemera')
      ? 0.46
      : 0.41);
  const cabinZ = isHeavyTruck
    ? 0.45
    : isSuv || isHatch
    ? -0.24
    : archetype === 'pagani' || archetype === 'koenigsegg' || archetype === 'lamborghini'
    ? 0.1
    : isHyper || isSupercar
    ? 0.06
    : -0.05;
  const cabinY = groundOffset + lowerHeight + cabinHeight * 0.38;

  // Smooth Sculpted 3D Glasshouse Canopy & Matching Curved Metallic Roof Cap (Zero blocky cabin edges!)
  const { glassGeo: cabinGeo, roofCapGeo: roofGeo } = createSculptedCabinCanopyGeometry(
    cabinWidth,
    cabinHeight,
    cabinLength,
    archetype,
    spec.id,
    modelKey,
    isHeavyTruck,
    isSuv,
    isHatch,
    isPickupBed
  );
  const cabinBaseY = groundOffset + lowerHeight * 0.88;
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
  cabinMesh.position.set(0, cabinBaseY, cabinZ);
  cabinMesh.castShadow = true;
  chassisGroup.add(cabinMesh);

  // Classic & Modern Muscle Car Slatted Rear Window Louvers (Mustang Boss 429 / Charger / Challenger / Lamborghini Miura / Countach)
  if (archetype === 'muscle' || modelKey.includes('miura') || modelKey.includes('countach')) {
    for (let lv = 0; lv < 5; lv++) {
      const louverSlat = new THREE.Mesh(
        new THREE.BoxGeometry(cabinWidth * (0.76 - lv * 0.03), 0.018, 0.075),
        carbonMaterial
      );
      louverSlat.position.set(
        0,
        cabinY + cabinHeight * (0.36 - lv * 0.11),
        cabinZ - cabinLength * (0.32 + lv * 0.055)
      );
      louverSlat.rotation.x = -0.35;
      chassisGroup.add(louverSlat);
    }
  }

  // WRC Rally Roof Ventilation Scoop (Impreza 22B STI / Lancer Evo IX / GR Yaris)
  if (archetype === 'rally') {
    const rallyRoofVent = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.065, 0.32),
      bodyMaterial
    );
    rallyRoofVent.position.set(0, cabinY + cabinHeight * 0.48, cabinZ + cabinLength * 0.12);
    const rallyVentMouth = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.045, 0.04),
      grilleMaterial
    );
    rallyVentMouth.position.set(0, cabinY + cabinHeight * 0.48, cabinZ + cabinLength * 0.28);
    chassisGroup.add(rallyRoofVent, rallyVentMouth);
  }

  // Ferrari & Ford GT Style Sculpted "Aero-Bridge" Flying Buttress C-Pillars with Open Air Channels
  if ((archetype === 'ferrari' || modelKey.includes('ford gt') || modelKey.includes('ford-gt')) && (isHyper || isSupercar)) {
    [-1, 1].forEach((side) => {
      const buttressGeo = new THREE.BoxGeometry(0.085, 0.042, bodyLength * 0.31);
      const buttress = new THREE.Mesh(buttressGeo, bodyMaterial);
      buttress.position.set(
        side * (cabinWidth * 0.44),
        cabinY + cabinHeight * 0.14,
        cabinZ - cabinLength * 0.46
      );
      buttress.rotation.x = 0.25;
      buttress.rotation.y = side * -0.16;
      const buttressUnderBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.018, bodyLength * 0.28),
        carbonMaterial
      );
      buttressUnderBlade.position.copy(buttress.position);
      buttressUnderBlade.position.y -= 0.025;
      buttressUnderBlade.rotation.copy(buttress.rotation);
      chassisGroup.add(buttress, buttressUnderBlade);
    });
  }

  // Koenigsegg Signature Wrap-Around Fighter-Jet Helmet Visor Headband & Central Vertical Wiper
  if (archetype === 'koenigsegg') {
    const visorBand = new THREE.Mesh(
      new THREE.CylinderGeometry(
        cabinWidth * 0.495,
        cabinWidth * 0.51,
        0.055,
        24,
        1,
        true,
        -Math.PI * 0.45,
        Math.PI * 0.9
      ),
      carbonMaterial
    );
    visorBand.position.set(0, cabinY + cabinHeight * 0.22, cabinZ + cabinLength * 0.06);
    const centralWiper = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, cabinHeight * 0.72, 0.024),
      carbonMaterial
    );
    centralWiper.position.set(0, cabinY + 0.02, cabinZ + cabinLength * 0.455);
    centralWiper.rotation.x = -0.68;
    chassisGroup.add(visorBand, centralWiper);
  }

  // Keep reference for cockpit hide list
  const windshieldMesh = new THREE.Object3D();

  // Sculpted Curved Metallic / Carbon Roof Crown seamlessly contoured to the cabin dome
  const roofMesh = new THREE.Mesh(
    roofGeo,
    isTrackGt ||
      isHyper ||
      archetype === 'mclaren' ||
      archetype === 'koenigsegg' ||
      archetype === 'pagani' ||
      archetype === 'bmw'
      ? carbonMaterial
      : bodyMaterial
  );
  roofMesh.position.set(0, cabinBaseY + 0.012, cabinZ - 0.02);
  roofMesh.castShadow = true;
  chassisGroup.add(roofMesh);

  // Forza Horizon 6 Off-Road / Rally Safari Roof Rack, Rollcage, Bed Spare Tire & Tailgate Spare Wheel
  if (
    isTruck ||
    isSuv ||
    modelKey.includes('dakar') ||
    modelKey.includes('raptor') ||
    modelKey.includes('trx') ||
    modelKey.includes('wrangler') ||
    modelKey.includes('hummer')
  ) {
    // Only mount Safari Roof LED Lightbar on genuine Off-Roaders (Skip urban luxury SUVs like Purosangue, Urus, Cayenne!)
    const isLuxuryRoadSuv =
      modelKey.includes('purosangue') ||
      modelKey.includes('urus') ||
      modelKey.includes('cayenne') ||
      modelKey.includes('trackhawk');
    const rackWidth = cabinWidth * 0.84;
    const rackY = cabinY + cabinHeight * 0.51;
    const lightbarZ = cabinZ + cabinLength * 0.28;
    if (!isLuxuryRoadSuv) {
      const ledBarHousing = new THREE.Mesh(
        new THREE.BoxGeometry(rackWidth * 0.92, 0.065, 0.09),
        carbonMaterial
      );
      ledBarHousing.position.set(0, rackY, lightbarZ);
      const ledBarLens = new THREE.Mesh(
        new THREE.BoxGeometry(rackWidth * 0.88, 0.042, 0.095),
        headlightMaterial
      );
      ledBarLens.position.set(0, rackY, lightbarZ + 0.008);
      chassisGroup.add(ledBarHousing, ledBarLens);
    }

    // Safari Roof Rails
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.045, cabinLength * 0.58),
        carbonMaterial
      );
      rail.position.set(side * (rackWidth * 0.46), rackY - 0.01, cabinZ);
      chassisGroup.add(rail);
    });

    // Boxy 4x4 Iconic Rear Tailgate-Mounted Full-Size Spare Wheel & Tire (G63 AMG / Wrangler Rubicon / Defender / Bronco Raptor)
    if (isBoxy4x4 && !isSixBySix && !isHeavyTruck) {
      const spareTireMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.92, wheelRadius * 0.92, wheelWidth * 0.88, 24),
        tireMaterial
      );
      spareTireMesh.rotation.x = Math.PI / 2;
      spareTireMesh.position.set(0, groundOffset + lowerHeight * 0.78, -bodyLength * 0.525);
      const spareRimMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, wheelWidth * 0.91, 20),
        modelKey.includes('g63') ? chromeMaterial : rimMaterial
      );
      spareRimMesh.rotation.x = Math.PI / 2;
      spareRimMesh.position.copy(spareTireMesh.position);
      chassisGroup.add(spareTireMesh, spareRimMesh);
    }

    // Baja Trophy & Pickup Truck Front Bullbar, Bed Rollcage Struts & Angled Bed-Mounted Spare Tire
    if (isTruck) {
      const bullbarTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, bodyWidth * 0.56, 10),
        carbonMaterial
      );
      bullbarTop.rotation.z = Math.PI / 2;
      bullbarTop.position.set(0, groundOffset + lowerHeight * 0.52, bodyLength * 0.515);
      chassisGroup.add(bullbarTop);

      // Front Aluminum Skid Plate & Red Off-Road Recovery Tow Hooks
      const skidPlate = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.52, 0.08, 0.34),
        chromeMaterial
      );
      skidPlate.position.set(0, groundOffset + 0.08, bodyLength * 0.49);
      skidPlate.rotation.x = -0.35;
      chassisGroup.add(skidPlate);

      // 3 Amber DOT Raptor / TRX Wide-Body Grille Marker Lights
      [-0.22, 0, 0.22].forEach((mOff) => {
        const dotLight = new THREE.Mesh(
          new THREE.BoxGeometry(0.065, 0.028, 0.04),
          drlAmberMaterial
        );
        dotLight.position.set(
          mOff,
          groundOffset + lowerHeight * 0.62,
          bodyLength * 0.512
        );
        chassisGroup.add(dotLight);
      });

      [-1, 1].forEach((side) => {
        const bedCageTube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, bodyLength * 0.34, 10),
          carbonMaterial
        );
        bedCageTube.rotation.x = 0.52;
        bedCageTube.position.set(
          side * (cabinWidth * 0.4),
          groundOffset + lowerHeight + 0.18,
          -bodyLength * 0.28
        );
        chassisGroup.add(bedCageTube);
      });

      // Angled Baja Spare Off-Road Tire mounted inside the open pickup bed!
      if (isPickupBed) {
        const bedSpare = new THREE.Mesh(
          new THREE.CylinderGeometry(wheelRadius * 0.88, wheelRadius * 0.88, wheelWidth * 0.85, 22),
          tireMaterial
        );
        bedSpare.rotation.x = 0.48;
        bedSpare.position.set(0, groundOffset + lowerHeight * 0.76, -bodyLength * 0.31);
        const bedSpareRim = new THREE.Mesh(
          new THREE.CylinderGeometry(wheelRadius * 0.56, wheelRadius * 0.56, wheelWidth * 0.88, 18),
          rimMaterial
        );
        bedSpareRim.rotation.x = 0.48;
        bedSpareRim.position.copy(bedSpare.position);
        chassisGroup.add(bedSpare, bedSpareRim);
      }
    }
  }

  // Interior Bucket Seats, 3D Cockpit Dashboard, Digital Cluster, A-Pillars & Animated 3D Steering Wheel
  const seatGeo = new THREE.BoxGeometry(0.38, cabinHeight * 0.75, 0.36);
  const headrestGeo = new THREE.BoxGeometry(0.24, cabinHeight * 0.32, 0.12);
  const bolsterGeo = new THREE.BoxGeometry(0.08, cabinHeight * 0.68, 0.38);
  const seatLeft = new THREE.Mesh(seatGeo, interiorMat);
  seatLeft.position.set(cabinWidth * 0.24, cabinY - 0.05, cabinZ - 0.05);
  const headrestLeft = new THREE.Mesh(headrestGeo, accentMaterial);
  headrestLeft.position.set(cabinWidth * 0.24, cabinY + cabinHeight * 0.34, cabinZ - 0.12);
  const bolsterLeft = new THREE.Mesh(bolsterGeo, carbonMaterial);
  bolsterLeft.position.set(cabinWidth * 0.24 + 0.18, cabinY - 0.04, cabinZ - 0.02);
  const seatRight = seatLeft.clone();
  seatRight.position.x = -cabinWidth * 0.24;
  const headrestRight = headrestLeft.clone();
  headrestRight.position.x = -cabinWidth * 0.24;
  const bolsterRight = bolsterLeft.clone();
  bolsterRight.position.x = -cabinWidth * 0.24 - 0.18;
  chassisGroup.add(seatLeft, seatRight, headrestLeft, headrestRight, bolsterLeft, bolsterRight);

  // Sculpted Flush Aerodynamic Door Handles, Recessed Door Shutlines & Gloss-Black B-Pillar Trim
  [-1, 1].forEach((side) => {
    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.026, 0.16),
      archetype === 'koenigsegg' || archetype === 'mclaren' ? carbonMaterial : chromeMaterial
    );
    doorHandle.position.set(
      side * (bodyWidth * 0.468),
      groundOffset + lowerHeight * 0.82,
      cabinZ - cabinLength * 0.12
    );
    const bPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, cabinHeight * 0.88, 0.09),
      carbonMaterial
    );
    bPillar.position.set(
      side * (cabinWidth * 0.465),
      cabinY - 0.02,
      cabinZ - cabinLength * 0.14
    );
    bPillar.rotation.z = side * 0.18;
    chassisGroup.add(doorHandle, bPillar);
  });

  // Dual Aerodynamic Windshield Wiper Blades at base of windshield
  [-0.18, 0.18].forEach((wOff) => {
    const wiper = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.016, 0.022),
      carbonMaterial
    );
    wiper.position.set(wOff, groundOffset + lowerHeight * 0.96, cabinZ + cabinLength * 0.48);
    wiper.rotation.y = -0.15;
    chassisGroup.add(wiper);
  });

  // Driver position (Left-Hand Drive at +X in local car space where forward is +Z and left is +X)
  const driverX = spec.id.includes('speedtail') || spec.id.includes('solus') ? 0 : cabinWidth * 0.23;
  const dashZ = cabinZ + cabinLength * 0.31;
  const dashY = groundOffset + lowerHeight + 0.05;

  // Sculpted Dashboard Cowl & Center Console
  const dashMainGeo = new THREE.BoxGeometry(cabinWidth * 0.88, 0.22, 0.36);
  const dashMain = new THREE.Mesh(dashMainGeo, interiorMat);
  dashMain.position.set(0, dashY - 0.04, dashZ);
  chassisGroup.add(dashMain);

  // Driver Instrument Binnacle Hood & Illuminated Digital Dash Screen
  const binnacleGeo = new THREE.BoxGeometry(0.34, 0.11, 0.22);
  const binnacle = new THREE.Mesh(binnacleGeo, carbonMaterial);
  binnacle.position.set(driverX, dashY + 0.08, dashZ - 0.02);
  chassisGroup.add(binnacle);

  const screenMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.075), screenMat);
  screenMesh.position.set(driverX, dashY + 0.075, dashZ - 0.131);
  screenMesh.rotation.y = Math.PI;
  chassisGroup.add(screenMesh);

  // Left & Right Windshield A-Pillars & Interior Rearview Mirror for authentic Cockpit framing
  [-1, 1].forEach((side) => {
    const aPillarGeo = new THREE.BoxGeometry(0.055, cabinHeight * 1.12, 0.065);
    const aPillar = new THREE.Mesh(aPillarGeo, carbonMaterial);
    aPillar.position.set(side * (cabinWidth * 0.44), cabinY + 0.02, cabinZ + cabinLength * 0.36);
    aPillar.rotation.x = isHeavyTruck ? -0.25 : -0.82;
    chassisGroup.add(aPillar);
  });

  const rearViewMirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.04), carbonMaterial);
  rearViewMirror.position.set(0, cabinY + cabinHeight * 0.34, cabinZ + cabinLength * 0.28);
  chassisGroup.add(rearViewMirror);

  // 3D Motorsport Steering Wheel Group (rotates with steering angle in Cockpit POV!)
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(driverX, dashY + 0.055, dashZ - 0.19);
  steeringWheelGroup.rotation.x = 0.32;

  const wheelRimTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.145, 0.022, 10, 24),
    carbonMaterial
  );
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.04, 12), interiorMat);
  wheelHub.rotation.x = Math.PI / 2;
  const spokeH = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.028, 0.02), chromeMaterial);
  const spokeV = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.13, 0.02), chromeMaterial);
  spokeV.position.y = -0.065;
  // Top 12-o'clock yellow/cyan motorsport center stripe on steering wheel
  const topStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.048, 0.048),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  );
  topStripe.position.set(0, 0.145, 0);
  steeringWheelGroup.add(wheelRimTorus, wheelHub, spokeH, spokeV, topStripe);
  chassisGroup.add(steeringWheelGroup);

  const cockpitCamPosLocal = new THREE.Vector3(
    driverX,
    cabinY + (isHeavyTruck ? 0.18 : 0.08),
    cabinZ - 0.08
  );
  const cockpitCamLookLocal = new THREE.Vector3(
    driverX * 0.65,
    cabinY + (isHeavyTruck ? 0.06 : -0.02),
    bodyLength * 4.5
  );
  const cockpitHideMeshes: THREE.Object3D[] = [cabinMesh, roofMesh, windshieldMesh];

  // 6. Brand-Specific Sculpted Aerodynamic Side Wing Mirrors (Pagani Leaf Stalks vs Lamborghini Hex Blades vs Standard)
  [-1, 1].forEach((side) => {
    const mirrorGroup = new THREE.Group();
    if (archetype === 'pagani') {
      // Pagani Zonda / Huayra Iconic Long Sculpted Art-Nouveau Stalks with Leaf-Shaped Carbon Mirrors
      const stalkGeo = new THREE.CylinderGeometry(0.012, 0.02, 0.28, 10);
      stalkGeo.rotateZ(side * -1.18);
      const stalk = new THREE.Mesh(stalkGeo, chromeMaterial);
      stalk.position.set(
        side * (bodyWidth * 0.42),
        groundOffset + lowerHeight + 0.12,
        cabinZ + cabinLength * 0.38
      );
      const leafCap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), carbonMaterial);
      leafCap.scale.set(1.45, 0.38, 0.65);
      leafCap.rotation.z = side * 0.22;
      leafCap.position.set(
        side * (bodyWidth * 0.53),
        groundOffset + lowerHeight + 0.19,
        cabinZ + cabinLength * 0.38
      );
      mirrorGroup.add(stalk, leafCap);
    } else if (archetype === 'lamborghini') {
      // Sharp origami hexagonal mirror blade
      const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.06), carbonMaterial);
      stalk.position.set(
        side * (cabinWidth * 0.48 + 0.06),
        cabinY - 0.05,
        cabinZ + cabinLength * 0.34
      );
      stalk.rotation.z = side * 0.24;
      const hexCap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.14, 6), bodyMaterial);
      hexCap.rotation.z = Math.PI / 2;
      hexCap.scale.set(0.55, 1.0, 0.85);
      hexCap.position.set(
        side * (cabinWidth * 0.48 + 0.15),
        cabinY - 0.03,
        cabinZ + cabinLength * 0.32
      );
      mirrorGroup.add(stalk, hexCap);
    } else {
      const stalkGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.16, 8);
      stalkGeo.rotateZ(Math.PI / 2);
      const stalk = new THREE.Mesh(stalkGeo, carbonMaterial);
      stalk.position.set(
        side * (cabinWidth * 0.48 + 0.05),
        cabinY - 0.06,
        cabinZ + cabinLength * 0.34
      );

      const capGeo = new THREE.SphereGeometry(0.085, 14, 10);
      const cap = new THREE.Mesh(capGeo, archetype === 'koenigsegg' ? carbonMaterial : bodyMaterial);
      cap.scale.set(1.15, 0.55, 0.78);
      cap.position.set(
        side * (cabinWidth * 0.48 + 0.13),
        cabinY - 0.04,
        cabinZ + cabinLength * 0.32
      );
      mirrorGroup.add(stalk, cap);
    }
    chassisGroup.add(mirrorGroup);
  });

  // 7. Front Carbon Splitter, Dive Planes & Multi-Fin Rear Diffuser
  const splitterGeo = new THREE.BoxGeometry(bodyWidth * 1.03, 0.045, 0.48);
  const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
  splitterMesh.position.set(0, groundOffset + 0.04, bodyLength * 0.5 + 0.04);
  chassisGroup.add(splitterMesh);

  const diffuserGeo = new THREE.BoxGeometry(bodyWidth * 0.92, 0.16, 0.38);
  const diffuserMesh = new THREE.Mesh(diffuserGeo, carbonMaterial);
  diffuserMesh.position.set(0, groundOffset + 0.11, -bodyLength * 0.49);
  chassisGroup.add(diffuserMesh);

  // Vertical Diffuser Aero Strakes / Fins
  for (let f = -3; f <= 3; f++) {
    if (f === 0) continue;
    const finGeo = new THREE.BoxGeometry(0.025, 0.16, 0.32);
    const fin = new THREE.Mesh(finGeo, archetype === 'lamborghini' ? accentMaterial : carbonMaterial);
    fin.position.set(f * (bodyWidth * 0.11), groundOffset + 0.1, -bodyLength * 0.5);
    chassisGroup.add(fin);
  }

  // 8. Brand-Specific Signature Architectural Structures, Headlights, Grilles & Taillights
  if (archetype === 'bugatti') {
    // BUGATTI SPECIALTY: Protruding 3D Chrome Horseshoe Grille, Sweeping Two-Tone "C-Line" Side Arch,
    // Atlantic Dorsal Spine Fin, 8-Eye Quad Crystal Headlights & Curved Full-Width Taillight Ribbon
    const horseshoeArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.042, 14, 28, Math.PI),
      chromeMaterial
    );
    horseshoeArch.position.set(0, groundOffset + lowerHeight * 0.24, bodyLength * 0.515);
    const horseshoeBaseBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.048, 0.09),
      chromeMaterial
    );
    horseshoeBaseBar.position.set(0, groundOffset + lowerHeight * 0.06, bodyLength * 0.515);
    const horseshoeMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.12, 20, 1, false, 0, Math.PI),
      grilleMaterial
    );
    horseshoeMesh.rotation.z = Math.PI / 2;
    horseshoeMesh.rotation.y = Math.PI / 2;
    horseshoeMesh.position.set(0, groundOffset + lowerHeight * 0.24, bodyLength * 0.506);
    // Iconic Red Bugatti "Macaron" Emblem inside Top of Horseshoe
    const bugattiBadge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 })
    );
    bugattiBadge.rotation.x = Math.PI / 2;
    bugattiBadge.position.set(0, groundOffset + lowerHeight * 0.43, bodyLength * 0.525);
    bugattiBadge.scale.set(1.4, 0.85, 1);

    // Type 57SC Atlantic / Chiron Pur Sport Full-Length Chrome Dorsal Spine Fin
    const dorsalSpine = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.24, bodyLength * 0.54),
      chromeMaterial
    );
    dorsalSpine.position.set(0, cabinY + cabinHeight * 0.22, -bodyLength * 0.12);
    chassisGroup.add(horseshoeArch, horseshoeBaseBar, horseshoeMesh, bugattiBadge, dorsalSpine);

    // Sweeping 3D Bugatti "C-Line" Side Arch wrapping around cockpit and side air intakes
    [-1, 1].forEach((side) => {
      const cLineOuter = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.045, 12, 32, Math.PI * 1.24),
        chromeMaterial
      );
      cLineOuter.rotation.y = Math.PI / 2;
      cLineOuter.rotation.z = Math.PI * 0.38;
      cLineOuter.scale.set(1.38, 0.92, 1.0);
      cLineOuter.position.set(side * (bodyWidth * 0.49), groundOffset + lowerHeight * 0.82, 0.02);

      // Contrasting Carbon Lower Door Recess inside the C-Line
      const cPanelRecess = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, lowerHeight * 0.65, bodyLength * 0.38),
        carbonMaterial
      );
      cPanelRecess.position.set(side * (bodyWidth * 0.478), groundOffset + lowerHeight * 0.48, 0.02);
      chassisGroup.add(cLineOuter, cPanelRecess);

      // Bugatti 8-Eye ("Quad-LED Crystal") Headlight Array (4 square crystal projectors per side)
      const hlPod = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.18), grilleMaterial);
      hlPod.position.set(
        side * bodyWidth * 0.33,
        groundOffset + lowerHeight * 0.58,
        bodyLength * 0.485
      );
      hlPod.rotation.y = side * -0.14;
      chassisGroup.add(hlPod);
      for (let q = 0; q < 4; q++) {
        const eyeCrystal = new THREE.Mesh(
          new THREE.BoxGeometry(0.072, 0.052, 0.06),
          headlightMaterial
        );
        const eyeX = side * (bodyWidth * 0.23 + q * 0.082);
        eyeCrystal.position.set(
          eyeX,
          groundOffset + lowerHeight * 0.58,
          bodyLength * 0.502 - q * 0.012
        );
        chassisGroup.add(eyeCrystal);
      }
      // Bolide / Mistral X-Beam or Horseshoe LED Signature
      if (spec.id.includes('bolide')) {
        [-0.45, 0.45].forEach((rotAngle) => {
          const xBeam = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.022, 0.08),
            headlightMaterial
          );
          xBeam.position.set(
            side * bodyWidth * 0.33,
            groundOffset + lowerHeight * 0.58,
            bodyLength * 0.505
          );
          xBeam.rotation.z = rotAngle;
          chassisGroup.add(xBeam);
        });
      }
    });
  } else if (archetype === 'lamborghini') {
    // LAMBORGHINI SPECIALTY: Angular Gandini Wedge, Giant Hexagonal Side Intakes with Accent Blades,
    // Y-Shape Tri-Branch Front Laser DRLs, Countach Periscopio Roof Tunnel & V12 Hex Spine
    const periscopioChannel = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.045, cabinLength * 0.65),
      grilleMaterial
    );
    periscopioChannel.position.set(0, cabinY + cabinHeight * 0.46, cabinZ + 0.05);
    const v12Spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.095, bodyLength * 0.38),
      carbonMaterial
    );
    v12Spine.position.set(0, groundOffset + lowerHeight + 0.065, -bodyLength * 0.28);
    chassisGroup.add(periscopioChannel, v12Spine);

    [-1, 1].forEach((side) => {
      // Giant Hexagonal Side NACA Air Scoop behind doors with contrasting perimeter blade
      const sideScoopOuter = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, lowerHeight * 0.62, bodyLength * 0.24),
        accentMaterial
      );
      sideScoopOuter.position.set(
        side * (bodyWidth * 0.485),
        groundOffset + lowerHeight * 0.54,
        -bodyLength * 0.08
      );
      sideScoopOuter.rotation.z = side * -0.18;
      const sideScoopInner = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, lowerHeight * 0.52, bodyLength * 0.21),
        grilleMaterial
      );
      sideScoopInner.position.copy(sideScoopOuter.position);
      sideScoopInner.position.z += 0.02;
      sideScoopInner.rotation.copy(sideScoopOuter.rotation);

      // Front Bumper Hexagonal Intake Mouths
      const frontHexMouth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.14, 6),
        grilleMaterial
      );
      frontHexMouth.rotation.x = Math.PI / 2;
      frontHexMouth.scale.set(1.5, 0.72, 1.0);
      frontHexMouth.position.set(
        side * (bodyWidth * 0.32),
        groundOffset + lowerHeight * 0.28,
        bodyLength * 0.505
      );

      // Iconic Lamborghini "Terzo Millennio / Sian / Revuelto" 3-Branch Y-Shape Front Laser Headlights
      const yStem = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.026, 0.14), headlightMaterial);
      yStem.position.set(
        side * (bodyWidth * 0.35),
        groundOffset + lowerHeight * 0.58,
        bodyLength * 0.495
      );
      yStem.rotation.y = side * -0.22;
      yStem.rotation.z = side * 0.12;

      const yUpper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.026, 0.1), headlightMaterial);
      yUpper.position.set(
        side * (bodyWidth * 0.39),
        groundOffset + lowerHeight * 0.66,
        bodyLength * 0.48
      );
      yUpper.rotation.z = side * 0.62;
      yUpper.rotation.y = side * -0.22;

      const yLower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.026, 0.1), drlAmberMaterial);
      yLower.position.set(
        side * (bodyWidth * 0.39),
        groundOffset + lowerHeight * 0.48,
        bodyLength * 0.49
      );
      yLower.rotation.z = side * -0.58;
      yLower.rotation.y = side * -0.22;

      chassisGroup.add(sideScoopOuter, sideScoopInner, frontHexMouth, yStem, yUpper, yLower);
    });
  } else if (archetype === 'koenigsegg') {
    // KOENIGSEGG SPECIALTY: Fighter-Jet Canopy, Deep Synchro-Helix Door Cutouts,
    // KNC Carbon Dive-Plane Canards, Dorsal Shark-Fin & Constellation Star-Cluster Headlights
    const sharkFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.36, bodyLength * 0.38),
      carbonMaterial
    );
    sharkFin.position.set(0, groundOffset + lowerHeight + 0.24, -bodyLength * 0.3);
    chassisGroup.add(sharkFin);

    [-1, 1].forEach((side) => {
      // Deep Koenigsegg Side Door Scoop Channel
      const doorChannel = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, lowerHeight * 0.48, bodyLength * 0.34),
        carbonMaterial
      );
      doorChannel.position.set(
        side * (bodyWidth * 0.475),
        groundOffset + lowerHeight * 0.52,
        -0.02
      );
      // Double Front Dive-Plane Carbon Canards
      [0.39, 0.44].forEach((zCanard, idx) => {
        const canard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.22), carbonMaterial);
        canard.position.set(
          side * (bodyWidth * 0.49),
          groundOffset + lowerHeight * (0.28 + idx * 0.12),
          bodyLength * zCanard
        );
        canard.rotation.z = side * -0.28;
        canard.rotation.x = 0.22;
        chassisGroup.add(canard);
      });

      // Swept-Back "Constellation" DRL & Low-Slung Jet Headlight Pod
      const koenigPod = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.34), grilleMaterial);
      koenigPod.position.set(
        side * (bodyWidth * 0.34),
        groundOffset + lowerHeight * 0.62,
        bodyLength * 0.45
      );
      koenigPod.rotation.y = side * -0.25;
      koenigPod.rotation.x = 0.22;
      const constellationStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.032, 0.32),
        headlightMaterial
      );
      constellationStrip.position.copy(koenigPod.position);
      constellationStrip.position.y += 0.028;
      constellationStrip.rotation.copy(koenigPod.rotation);
      chassisGroup.add(doorChannel, koenigPod, constellationStrip);
    });
  } else if (archetype === 'mclaren') {
    // MCLAREN SPECIALTY: Deeply Recessed "Eye-Socket" Headlight Intakes with Speedmark Boomerang LEDs,
    // Dihedral Door Carbon Boomerang Channels & Roof-Mounted F1/Senna Air Snorkel
    const roofSnorkel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.13, 0.58), carbonMaterial);
    roofSnorkel.position.set(0, cabinY + cabinHeight * 0.49, cabinZ - 0.06);
    const snorkelMouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.06), grilleMaterial);
    snorkelMouth.position.set(0, cabinY + cabinHeight * 0.5, cabinZ + 0.23);
    chassisGroup.add(roofSnorkel, snorkelMouth);

    [-1, 1].forEach((side) => {
      // Deep Dark "Eye-Socket" Aerodynamic Headlight Cavity (720S / P1 / Senna trademark)
      const eyeSocket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.28), grilleMaterial);
      eyeSocket.position.set(
        side * (bodyWidth * 0.34),
        groundOffset + lowerHeight * 0.58,
        bodyLength * 0.475
      );
      eyeSocket.rotation.y = side * -0.18;

      // McLaren "Speedmark" Curved Boomerang LED Blade floating inside the Eye-Socket
      const speedmarkArc = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.022, 10, 20, Math.PI * 0.85),
        headlightMaterial
      );
      speedmarkArc.position.set(
        side * (bodyWidth * 0.34),
        groundOffset + lowerHeight * 0.6,
        bodyLength * 0.502
      );
      speedmarkArc.rotation.y = side * -0.22;
      speedmarkArc.rotation.z = side === 1 ? 0.25 : Math.PI - 0.25;

      // Large Carbon Boomerang Side Door Aero Blade (P1 / 765LT / Senna door channel)
      const doorBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, lowerHeight * 0.68, bodyLength * 0.32),
        carbonMaterial
      );
      doorBlade.position.set(
        side * (bodyWidth * 0.482),
        groundOffset + lowerHeight * 0.52,
        -0.02
      );
      doorBlade.rotation.x = 0.24;
      chassisGroup.add(eyeSocket, speedmarkArc, doorBlade);
    });
  } else if (archetype === 'ferrari') {
    // FERRARI SPECIALTY: Deep Front S-Duct Hood Aero Bridge, Red-Head V8/V12 Engine Showcase,
    // Yellow Scuderia Ferrari Fender Shields & Swept-Back L-Blade / J50 / SF90 Headlights
    const sDuctBridge = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.44, 0.038, 0.26),
      bodyMaterial
    );
    sDuctBridge.position.set(0, groundOffset + lowerHeight * 0.68, bodyLength * 0.38);
    const sDuctCavity = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.42, 0.08, 0.38),
      grilleMaterial
    );
    sDuctCavity.position.set(0, groundOffset + lowerHeight * 0.62, bodyLength * 0.34);
    const cavallinoGrille = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.58, lowerHeight * 0.28, 0.12),
      grilleMaterial
    );
    cavallinoGrille.position.set(0, groundOffset + lowerHeight * 0.24, bodyLength * 0.504);
    chassisGroup.add(sDuctBridge, sDuctCavity, cavallinoGrille);

    const redEngineHeadMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.5,
    });
    [-1, 1].forEach((side) => {
      const headCover = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.065, 0.62), redEngineHeadMat);
      headCover.position.set(side * 0.16, groundOffset + lowerHeight + 0.025, -bodyLength * 0.27);
      // Iconic Yellow Scuderia Ferrari Fender Shield above front wheel arch
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.095, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      shield.position.set(
        side * (bodyWidth * 0.492),
        groundOffset + lowerHeight * 0.72,
        bodyLength * 0.22
      );
      // Swept-Back Razor-Thin L-Shaped Ferrari Headlight Blade (SF90 / 488 Pista / LaFerrari)
      const ferrariBladeH = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.034, 0.22),
        headlightMaterial
      );
      ferrariBladeH.position.set(
        side * (bodyWidth * 0.36),
        groundOffset + lowerHeight * 0.6,
        bodyLength * 0.46
      );
      ferrariBladeH.rotation.y = side * -0.28;
      const ferrariBladeV = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.08, 0.28),
        headlightMaterial
      );
      ferrariBladeV.position.set(
        side * (bodyWidth * 0.45),
        groundOffset + lowerHeight * 0.64,
        bodyLength * 0.39
      );
      ferrariBladeV.rotation.x = 0.22;
      chassisGroup.add(headCover, shield, ferrariBladeH, ferrariBladeV);
    });
  } else if (archetype === 'pagani') {
    // PAGANI SPECIALTY: Twin Raised Leaf-Shaped Dual Bi-Xenon Headlight Pods on Fenders,
    // 4 Independent Active Aero Flaps (2 Front + 2 Rear) & Overhead Cinque Carbon Roof Snorkel
    const flapGeo = new THREE.BoxGeometry(0.38, 0.028, 0.26);
    const flapFL = new THREE.Mesh(flapGeo, carbonMaterial);
    flapFL.position.set(0.28, groundOffset + lowerHeight * 0.66, bodyLength * 0.34);
    const flapFR = flapFL.clone();
    flapFR.position.x = -0.28;

    const flapRL = new THREE.Mesh(flapGeo, carbonMaterial);
    flapRL.position.set(0.32, groundOffset + lowerHeight * 0.8, -bodyLength * 0.41);
    const flapRR = flapRL.clone();
    flapRR.position.x = -0.32;

    // Cinque / Zonda R / Huayra Overhead Carbon Roof Air Scoop extending over canopy
    const roofScoop = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.78), carbonMaterial);
    roofScoop.position.set(0, cabinY + cabinHeight * 0.51, cabinZ - 0.12);
    const roofScoopStripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.155, 0.79), accentMaterial);
    roofScoopStripe.position.copy(roofScoop.position);

    chassisGroup.add(flapFL, flapFR, flapRL, flapRR, roofScoop, roofScoopStripe);
    activeAero.fl = flapFL;
    activeAero.fr = flapFR;
    activeAero.rl = flapRL;
    activeAero.rr = flapRR;

    // Twin Raised Leaf-Shaped Dual Bi-Xenon Projector Pods on Front Fenders
    [-1, 1].forEach((side) => {
      [0, 1].forEach((podIdx) => {
        const podHousing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.052, 0.058, 0.16, 14),
          carbonMaterial
        );
        podHousing.rotation.x = Math.PI / 2;
        podHousing.position.set(
          side * (bodyWidth * (0.31 + podIdx * 0.085)),
          groundOffset + lowerHeight * (0.68 - podIdx * 0.04),
          bodyLength * (0.455 - podIdx * 0.025)
        );
        const podLens = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), headlightMaterial);
        podLens.position.copy(podHousing.position);
        podLens.position.z += 0.075;
        chassisGroup.add(podHousing, podLens);
      });
    });
  } else if (archetype === 'porsche') {
    // PORSCHE SPECIALTY: Raised Round/Oval "Frog-Eye" Fender Headlamps with 4-Point LED Matrix,
    // GT3 RS Recessed Carbon Frunk Extractor Vent & Front Wheel Arch Louver Gills
    const gt3HoodVent = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.46, 0.04, 0.24),
      carbonMaterial
    );
    gt3HoodVent.position.set(0, groundOffset + lowerHeight * 0.72, bodyLength * 0.34);
    chassisGroup.add(gt3HoodVent);

    [-1, 1].forEach((side) => {
      // Iconic Raised Oval 911 "Frog-Eye" Headlamp Pod on Front Fender Crown
      const frogHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.145, 0.155, 0.12, 20),
        chromeMaterial
      );
      frogHousing.rotation.x = Math.PI / 2 - 0.48;
      frogHousing.rotation.z = side * -0.15;
      frogHousing.scale.set(0.88, 1.0, 1.18);
      frogHousing.position.set(
        side * (bodyWidth * 0.36),
        groundOffset + lowerHeight * 0.74,
        bodyLength * 0.435
      );
      const frogLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.13, 20),
        headlightMaterial
      );
      frogLens.rotation.copy(frogHousing.rotation);
      frogLens.scale.copy(frogHousing.scale);
      frogLens.position.copy(frogHousing.position);
      frogLens.position.z += 0.012;

      // GT3 RS Front Fender Carbon Louver Gills above wheels
      for (let g = 0; g < 4; g++) {
        const gill = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.045), carbonMaterial);
        gill.position.set(
          side * (bodyWidth * 0.39),
          groundOffset + lowerHeight * 0.96,
          wheelZFront + 0.12 - g * 0.065
        );
        gill.rotation.x = -0.35;
        chassisGroup.add(gill);
      }
      chassisGroup.add(frogHousing, frogLens);
    });
  } else if (archetype === 'bmw') {
    // BMW SPECIALTY: Prominent Illuminated Twin-Kidney Front Grille with M Tricolor Slats,
    // Quad Hexagonal "Angel-Eye" Laser Halo Headlights & Raised M Power-Dome Hood
    const powerDome = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.36, 0.065, bodyLength * 0.28),
      bodyMaterial
    );
    powerDome.position.set(0, groundOffset + lowerHeight * 0.96, bodyLength * 0.22);
    // BMW Blue/White Roundel Hood Emblem
    const bmwRoundel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.015, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    bmwRoundel.position.set(0, groundOffset + lowerHeight * 0.68, bodyLength * 0.485);
    bmwRoundel.rotation.x = 0.28;
    chassisGroup.add(powerDome, bmwRoundel);

    [-1, 1].forEach((side) => {
      const kidneyFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.31, lowerHeight * 0.52, 0.14),
        chromeMaterial
      );
      kidneyFrame.position.set(side * 0.18, groundOffset + lowerHeight * 0.44, bodyLength * 0.504);
      const kidneyCore = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, lowerHeight * 0.44, 0.15),
        grilleMaterial
      );
      kidneyCore.position.set(side * 0.18, groundOffset + lowerHeight * 0.44, bodyLength * 0.506);
      chassisGroup.add(kidneyFrame, kidneyCore);

      // Quad Hexagonal BMW "Angel-Eye" Laser Halo Rings (2 per side)
      [0, 1].forEach((ringIdx) => {
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(0.056, 0.013, 8, 6),
          modelKey.includes('cs') ? drlAmberMaterial : headlightMaterial
        );
        halo.position.set(
          side * (bodyWidth * (0.29 + ringIdx * 0.095)),
          groundOffset + lowerHeight * 0.63,
          bodyLength * (0.504 - ringIdx * 0.01)
        );
        halo.rotation.y = side * -0.14;
        chassisGroup.add(halo);
      });

      // BMW M Front Fender Breather Gills
      const gill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.22), carbonMaterial);
      gill.position.set(
        side * (bodyWidth * 0.492),
        groundOffset + lowerHeight * 0.55,
        bodyLength * 0.16
      );
      chassisGroup.add(gill);
    });
  } else if (archetype === 'audi') {
    // AUDI SPECIALTY: Wide Hexagonal Singleframe Honeycomb Grille, 4 Interlocking Chrome Audi Rings,
    // Matrix LED Segmented Digital DRL Headlights & Quattro Fender Blisters
    const singleframeOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyWidth * 0.34, bodyWidth * 0.31, lowerHeight * 0.46, 6),
      chromeMaterial
    );
    singleframeOuter.rotation.x = Math.PI / 2;
    singleframeOuter.scale.set(1.15, 0.22, 0.85);
    singleframeOuter.position.set(0, groundOffset + lowerHeight * 0.38, bodyLength * 0.502);
    const singleframeInner = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyWidth * 0.32, bodyWidth * 0.29, lowerHeight * 0.42, 6),
      grilleMaterial
    );
    singleframeInner.rotation.x = Math.PI / 2;
    singleframeInner.scale.set(1.15, 0.24, 0.85);
    singleframeInner.position.set(0, groundOffset + lowerHeight * 0.38, bodyLength * 0.504);
    chassisGroup.add(singleframeOuter, singleframeInner);

    // 4 Interlocking Chrome Audi Rings on the Singleframe Grille
    [-0.09, -0.03, 0.03, 0.09].forEach((ringX) => {
      const audiRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.034, 0.007, 8, 18),
        chromeMaterial
      );
      audiRing.position.set(ringX, groundOffset + lowerHeight * 0.48, bodyLength * 0.514);
      chassisGroup.add(audiRing);
    });

    [-1, 1].forEach((side) => {
      const matrixPod = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.095, 0.16), grilleMaterial);
      matrixPod.position.set(
        side * bodyWidth * 0.36,
        groundOffset + lowerHeight * 0.62,
        bodyLength * 0.488
      );
      matrixPod.rotation.y = side * -0.14;
      const matrixDrl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.028, 0.08), headlightMaterial);
      matrixDrl.position.set(
        side * bodyWidth * 0.36,
        groundOffset + lowerHeight * 0.65,
        bodyLength * 0.505
      );
      matrixDrl.rotation.y = side * -0.14;
      chassisGroup.add(matrixPod, matrixDrl);
    });
  } else if (archetype === 'nissan') {
    // NISSAN GT-R / SKYLINE / Z SPECIALTY: V-Motion Dark Chrome/Carbon Nose Grille, GT-R Red/Silver Nose Emblem,
    // Lightning-Bolt / Skyline Twin-Xenon Headlights & Nismo Red Aero Pinstripes
    const vMotionOuter = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.52, lowerHeight * 0.42, 0.14),
      grilleMaterial
    );
    vMotionOuter.position.set(0, groundOffset + lowerHeight * 0.34, bodyLength * 0.504);
    const gtrBadge = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.045, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    gtrBadge.position.set(0, groundOffset + lowerHeight * 0.46, bodyLength * 0.514);
    chassisGroup.add(vMotionOuter, gtrBadge);

    [-1, 1].forEach((side) => {
      const vStrut = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, lowerHeight * 0.38, 0.15),
        chromeMaterial
      );
      vStrut.position.set(
        side * bodyWidth * 0.18,
        groundOffset + lowerHeight * 0.38,
        bodyLength * 0.508
      );
      vStrut.rotation.z = side * 0.36;

      const hlPod = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.095, 0.22), grilleMaterial);
      hlPod.position.set(
        side * bodyWidth * 0.36,
        groundOffset + lowerHeight * 0.62,
        bodyLength * 0.48
      );
      hlPod.rotation.y = side * -0.16;
      const lightningDrl = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.034, 0.18),
        headlightMaterial
      );
      lightningDrl.position.set(
        side * bodyWidth * 0.36,
        groundOffset + lowerHeight * 0.64,
        bodyLength * 0.495
      );
      lightningDrl.rotation.y = side * -0.16;
      chassisGroup.add(vStrut, hlPod, lightningDrl);
    });
  } else if (archetype === 'rally') {
    // WRC RALLY SPECIALTY (Impreza 22B STI / Lancer Evo IX / GR Yaris):
    // Quad Circular Rally Safari Auxiliary Halogen Light Pods on Front Nose + Hood TMIC Scoop!
    const tmicScoop = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.34, 0.085, 0.36),
      bodyMaterial
    );
    tmicScoop.position.set(0, groundOffset + lowerHeight * 0.82, bodyLength * 0.22);
    const tmicMouth = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.30, 0.06, 0.05),
      grilleMaterial
    );
    tmicMouth.position.set(0, groundOffset + lowerHeight * 0.82, bodyLength * 0.39);
    chassisGroup.add(tmicScoop, tmicMouth);

    // Quad Safari Rally Fog Light Pod Bar across the front bumper nose
    [-0.27, -0.09, 0.09, 0.27].forEach((podX) => {
      const podHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.068, 0.09, 16),
        carbonMaterial
      );
      podHousing.rotation.x = Math.PI / 2;
      podHousing.position.set(podX, groundOffset + lowerHeight * 0.48, bodyLength * 0.522);
      const podLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.058, 0.058, 0.095, 16),
        headlightMaterial
      );
      podLens.rotation.x = Math.PI / 2;
      podLens.position.set(podX, groundOffset + lowerHeight * 0.48, bodyLength * 0.526);
      chassisGroup.add(podHousing, podLens);
    });

    [-1, 1].forEach((side) => {
      const rallyHl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.095, 0.14), headlightMaterial);
      rallyHl.position.set(
        side * bodyWidth * 0.35,
        groundOffset + lowerHeight * 0.62,
        bodyLength * 0.502
      );
      rallyHl.rotation.y = side * -0.1;
      const yellowFog = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.08, 14),
        drlAmberMaterial
      );
      yellowFog.rotation.x = Math.PI / 2;
      yellowFog.position.set(
        side * bodyWidth * 0.36,
        groundOffset + lowerHeight * 0.28,
        bodyLength * 0.508
      );
      chassisGroup.add(rallyHl, yellowFog);
    });
  } else if (archetype === 'muscle') {
    // AMERICAN MUSCLE SPECIALTY (Charger 69 / Challenger Demon / Mustang Boss 429 & GTD / Camaro ZL1 / Chevelle / Viper):
    // Deeply Recessed Black Muscle Grille with Quad Circular Halo Headlamps + Chrome Bumper Trim!
    const muscleGrilleCavity = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.82, lowerHeight * 0.36, 0.16),
      grilleMaterial
    );
    muscleGrilleCavity.position.set(0, groundOffset + lowerHeight * 0.54, bodyLength * 0.495);
    const muscleChromeTrim = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.85, 0.032, 0.17),
       isClassicIcon ? chromeMaterial : carbonMaterial
    );
    muscleChromeTrim.position.set(0, groundOffset + lowerHeight * 0.35, bodyLength * 0.502);
    chassisGroup.add(muscleGrilleCavity, muscleChromeTrim);

    [-1, 1].forEach((side) => {
      // Twin Circular Halo Muscle Headlamps per side (4 circular lamps total!)
      [0, 1].forEach((lampIdx) => {
        const haloRing = new THREE.Mesh(
          new THREE.TorusGeometry(lampIdx === 0 ? 0.058 : 0.048, 0.013, 10, 20),
          lampIdx === 1 && modelKey.includes('demon') ? drlAmberMaterial : headlightMaterial
        );
        haloRing.position.set(
          side * (bodyWidth * (0.36 - lampIdx * 0.11)),
          groundOffset + lowerHeight * 0.55,
          bodyLength * 0.506
        );
        chassisGroup.add(haloRing);
      });
    });
  } else if (isBoxy4x4) {
    // BOXY 4x4 SPECIALTY (G63 AMG / Wrangler Rubicon / Defender 110 / Bronco Raptor):
    // Upright Command Fascia with Circular LED Halo Headlights + Fender-Top Indicator Pods!
    const boxyGrille = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.54, lowerHeight * 0.46, 0.14),
      grilleMaterial
    );
    boxyGrille.position.set(0, groundOffset + lowerHeight * 0.54, bodyLength * 0.502);
    chassisGroup.add(boxyGrille);

    for (let s = -3; s <= 3; s++) {
      const vSlot = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, lowerHeight * 0.42, 0.15),
        chromeMaterial
      );
      vSlot.position.set(s * 0.11, groundOffset + lowerHeight * 0.54, bodyLength * 0.506);
      chassisGroup.add(vSlot);
    }

    [-1, 1].forEach((side) => {
      const roundHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.078, 0.016, 10, 22),
        headlightMaterial
      );
      roundHalo.position.set(
        side * bodyWidth * 0.36,
        groundOffset + lowerHeight * 0.58,
        bodyLength * 0.508
      );
      const roundCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.062, 0.06, 18),
        headlightMaterial
      );
      roundCore.rotation.x = Math.PI / 2;
      roundCore.position.set(
        side * bodyWidth * 0.36,
        groundOffset + lowerHeight * 0.58,
        bodyLength * 0.504
      );
      // G63 AMG / Classic 4x4 Fender-Top Amber Turn Signal Pod
      const fenderBlinker = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.042, 0.11),
        drlAmberMaterial
      );
      fenderBlinker.position.set(
        side * bodyWidth * 0.38,
        groundOffset + lowerHeight * 0.94,
        bodyLength * 0.42
      );
      chassisGroup.add(roundHalo, roundCore, fenderBlinker);
    });
  } else {
    // Mercedes-AMG Panamericana Vertical-Slat Grille / Aston Martin Vane Grille / JDM / Standard LED Projector Headlights
    if (archetype === 'mercedes' || archetype === 'aston') {
      const wideGrille = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.62, lowerHeight * 0.38, 0.14),
        grilleMaterial
      );
      wideGrille.position.set(0, groundOffset + lowerHeight * 0.36, bodyLength * 0.504);
      chassisGroup.add(wideGrille);
      for (let s = -5; s <= 5; s++) {
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(
            archetype === 'mercedes' ? 0.018 : bodyWidth * 0.58,
            archetype === 'mercedes' ? lowerHeight * 0.35 : 0.016,
            0.15
          ),
          chromeMaterial
        );
        slat.position.set(
          archetype === 'mercedes' ? s * 0.095 : 0,
          groundOffset + lowerHeight * 0.36 + (archetype === 'aston' ? s * 0.025 : 0),
          bodyLength * 0.506
        );
        chassisGroup.add(slat);
      }
      if (archetype === 'mercedes') {
        const starRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.068, 0.012, 8, 20),
          chromeMaterial
        );
        starRing.position.set(0, groundOffset + lowerHeight * 0.36, bodyLength * 0.514);
        chassisGroup.add(starRing);
      }
    }

    [-1, 1].forEach((side) => {
      const hlHousingGeo = new THREE.BoxGeometry(0.38, 0.11, 0.18);
      const hlHousing = new THREE.Mesh(hlHousingGeo, grilleMaterial);
      hlHousing.position.set(
        side * bodyWidth * 0.35,
        groundOffset + lowerHeight * 0.62,
        bodyLength * 0.485
      );
      hlHousing.rotation.y = side * -0.12;
      const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.065, 0.08), headlightMaterial);
      hlLens.position.set(
        side * bodyWidth * 0.35,
        groundOffset + lowerHeight * 0.63,
        bodyLength * 0.505
      );
      hlLens.rotation.y = side * -0.12;
      const drlBlade = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.09), drlAmberMaterial);
      drlBlade.position.set(
        side * bodyWidth * 0.35,
        groundOffset + lowerHeight * 0.57,
        bodyLength * 0.508
      );
      drlBlade.rotation.y = side * -0.12;
      chassisGroup.add(hlHousing, hlLens, drlBlade);
    });
  }

  // Iconic 1980s/90s Retractable Pop-Up Headlight Pods (AE86 Trueno, RX-7 FD, Countach, Diablo, F40, Miura, 288 GTO, BMW M1)
  if (hasPopUpHeadlights) {
    [-1, 1].forEach((side) => {
      const popPod = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.11, 0.22),
        bodyMaterial
      );
      popPod.position.set(
        side * (bodyWidth * 0.34),
        groundOffset + lowerHeight * 0.72,
        bodyLength * 0.435
      );
      const popLamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.078, 0.04),
        headlightMaterial
      );
      popLamp.position.set(
        side * (bodyWidth * 0.34),
        groundOffset + lowerHeight * 0.72,
        bodyLength * 0.492
      );
      chassisGroup.add(popPod, popLamp);
    });
  }

  // Sculpted Rear Taillight Cluster, Horizon 6 Rear License Plate & FIA Rain Light
  const rearFasciaGeo = new THREE.BoxGeometry(bodyWidth * 0.92, lowerHeight * 0.45, 0.12);
  const rearFascia = new THREE.Mesh(rearFasciaGeo, grilleMaterial);
  rearFascia.position.set(0, groundOffset + lowerHeight * 0.58, -bodyLength * 0.495);
  chassisGroup.add(rearFascia);

  // Forza Horizon 6 Rear License Plate & FIA Central Diffuser Rain Light
  const licensePlateMat = new THREE.MeshStandardMaterial({
    map: getHorizonLicensePlateTexture(),
    roughness: 0.25,
    metalness: 0.15,
  });
  const licensePlateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.105, 0.018), licensePlateMat);
  licensePlateMesh.position.set(0, groundOffset + lowerHeight * 0.36, -bodyLength * 0.506);
  const fiaRainLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.075, 0.025),
    brakeLightMaterial
  );
  fiaRainLight.position.set(0, groundOffset + 0.12, -bodyLength * 0.508);
  chassisGroup.add(licensePlateMesh, fiaRainLight);

  if (archetype === 'ferrari') {
    // FERRARI REAR: Classic Twin/Quad Circular Jet-Afterburner Taillight Rings + Active Diffuser Flaps
    [-0.72, -0.52, 0.52, 0.72].forEach((xOff) => {
      const ringTl = new THREE.Mesh(
        new THREE.TorusGeometry(0.062, 0.018, 10, 20),
        brakeLightMaterial
      );
      ringTl.position.set(xOff, groundOffset + lowerHeight * 0.68, -bodyLength * 0.504);
      chassisGroup.add(ringTl);
    });
    const diffFlapGeo = new THREE.BoxGeometry(0.34, 0.03, 0.22);
    const diffFlapL = new THREE.Mesh(diffFlapGeo, carbonMaterial);
    diffFlapL.position.set(0.3, groundOffset + 0.18, -bodyLength * 0.49);
    const diffFlapR = diffFlapL.clone();
    diffFlapR.position.x = -0.3;
    chassisGroup.add(diffFlapL, diffFlapR);
    activeAero.rl = diffFlapL;
    activeAero.rr = diffFlapR;
  } else if (archetype === 'lamborghini') {
    // LAMBORGHINI REAR: Triple Angled Y-Shape / Hexagonal LED Taillight Elements per side
    [-1, 1].forEach((side) => {
      [0, 1, 2].forEach((yIdx) => {
        const yTaillight = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.026, 0.09),
          brakeLightMaterial
        );
        yTaillight.position.set(
          side * (bodyWidth * 0.25 + yIdx * 0.085),
          groundOffset + lowerHeight * 0.7,
          -bodyLength * 0.504
        );
        yTaillight.rotation.z = side * 0.38;
        const yTaillightBranch = yTaillight.clone();
        yTaillightBranch.rotation.z = side * -0.38;
        yTaillightBranch.position.y -= 0.028;
        chassisGroup.add(yTaillight, yTaillightBranch);
      });
    });
  } else if (archetype === 'bugatti') {
    // BUGATTI REAR: Full-Width Continuous Floating Chiron / Mistral LED Ribbon + Bolide X-Taillight
    const bugattiRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.92, 0.042, 0.09),
      brakeLightMaterial
    );
    bugattiRibbon.position.set(0, groundOffset + lowerHeight * 0.68, -bodyLength * 0.505);
    chassisGroup.add(bugattiRibbon);
    if (spec.id.includes('bolide')) {
      [-0.28, 0.28].forEach((rotZ) => {
        const xWingLight = new THREE.Mesh(
          new THREE.BoxGeometry(bodyWidth * 0.78, 0.032, 0.095),
          brakeLightMaterial
        );
        xWingLight.position.set(0, groundOffset + lowerHeight * 0.68, -bodyLength * 0.508);
        xWingLight.rotation.z = rotZ;
        chassisGroup.add(xWingLight);
      });
    }
  } else if (archetype === 'pagani') {
    // PAGANI REAR: Triple Circular Jewel Taillight Pods on the outer rear fender tips
    [-1, 1].forEach((side) => {
      [0, 1, 2].forEach((podIdx) => {
        const jewelPod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.042, 0.045, 0.09, 14),
          brakeLightMaterial
        );
        jewelPod.rotation.x = Math.PI / 2;
        jewelPod.position.set(
          side * (bodyWidth * 0.43),
          groundOffset + lowerHeight * (0.76 - podIdx * 0.095),
          -bodyLength * 0.504
        );
        chassisGroup.add(jewelPod);
      });
    });
  } else if (archetype === 'mclaren') {
    // MCLAREN REAR: Ultra-Thin Twin Curved Boomerang LED Strips floating inside Rear Mesh Grill
    [-1, 1].forEach((side) => {
      const mclarenBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.028, 0.09),
        brakeLightMaterial
      );
      mclarenBlade.position.set(
        side * (bodyWidth * 0.33),
        groundOffset + lowerHeight * 0.72,
        -bodyLength * 0.505
      );
      mclarenBlade.rotation.z = side * -0.14;
      chassisGroup.add(mclarenBlade);
    });
  } else if (archetype === 'nissan') {
    // NISSAN SKYLINE / GT-R REAR: Iconic Quad Circular Afterburner Ring Taillights (Outer Large + Inner Ring per side!)
    [-1, 1].forEach((side) => {
      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.068, 0.019, 10, 22),
        brakeLightMaterial
      );
      outerRing.position.set(
        side * (bodyWidth * 0.37),
        groundOffset + lowerHeight * 0.68,
        -bodyLength * 0.504
      );
      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.052, 0.016, 10, 22),
        brakeLightMaterial
      );
      innerRing.position.set(
        side * (bodyWidth * 0.25),
        groundOffset + lowerHeight * 0.67,
        -bodyLength * 0.504
      );
      chassisGroup.add(outerRing, innerRing);
    });
  } else if (archetype === 'muscle') {
    if (modelKey.includes('mustang') || modelKey.includes('shelby')) {
      // FORD MUSTANG / SHELBY REAR: Iconic Sequential Tri-Bar Vertical Taillight Bars (3 vertical glowing red bars per side!)
      [-1, 1].forEach((side) => {
        [0, 1, 2].forEach((barIdx) => {
          const triBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.042, 0.13, 0.09),
            brakeLightMaterial
          );
          triBar.position.set(
            side * (bodyWidth * 0.26 + barIdx * 0.072),
            groundOffset + lowerHeight * 0.68,
            -bodyLength * 0.504
          );
          triBar.rotation.z = side * -0.12;
          chassisGroup.add(triBar);
        });
      });
    } else {
      // DODGE CHARGER / CHALLENGER / VIPER REAR: Full-Width Racetrack LED Ribbon Taillight
      const racetrackOuter = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.88, 0.095, 0.085),
        brakeLightMaterial
      );
      racetrackOuter.position.set(0, groundOffset + lowerHeight * 0.68, -bodyLength * 0.503);
      const racetrackInner = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.80, 0.042, 0.09),
        grilleMaterial
      );
      racetrackInner.position.set(0, groundOffset + lowerHeight * 0.68, -bodyLength * 0.505);
      chassisGroup.add(racetrackOuter, racetrackInner);
    }
  } else if (archetype === 'jdm' && modelKey.includes('supra')) {
    // TOYOTA SUPRA MK4 (JZA80) REAR: Iconic 4-Pod Circular Taillight Array inside dark housing
    [-1, 1].forEach((side) => {
      [0, 1, 2].forEach((podIdx) => {
        const supraPod = new THREE.Mesh(
          new THREE.CylinderGeometry(0.036, 0.036, 0.09, 14),
          brakeLightMaterial
        );
        supraPod.rotation.x = Math.PI / 2;
        supraPod.position.set(
          side * (bodyWidth * 0.26 + podIdx * 0.068),
          groundOffset + lowerHeight * 0.68,
          -bodyLength * 0.504
        );
        chassisGroup.add(supraPod);
      });
    });
  } else {
    // Porsche / Koenigsegg / BMW / Audi / Standard Rear Lightbar & L-Blades
    const tlBarGeo = new THREE.BoxGeometry(bodyWidth * 0.88, 0.055, 0.08);
    const tlBar = new THREE.Mesh(tlBarGeo, brakeLightMaterial);
    tlBar.position.set(0, groundOffset + lowerHeight * 0.72, -bodyLength * 0.502);
    chassisGroup.add(tlBar);

    [-1, 1].forEach((side) => {
      const quadTlGeo = new THREE.BoxGeometry(0.32, 0.095, 0.09);
      const quadTl = new THREE.Mesh(quadTlGeo, brakeLightMaterial);
      quadTl.position.set(
        side * bodyWidth * 0.34,
        groundOffset + lowerHeight * 0.66,
        -bodyLength * 0.505
      );
      chassisGroup.add(quadTl);
    });
  }

  // 9. Brand-Authentic Exhaust Systems (Pagani Central Quad-Stack, Koenigsegg Regera Heart Exhaust, Bugatti 6-Pipe, Civic Type R Triple-Center, Audi RS Oval, JDM Burnt-Titanium Cannon, etc.)
  const exhaustPipeGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.24, 16);
  exhaustPipeGeo.rotateX(Math.PI / 2);
  const exhaustBoreGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.25, 12);
  exhaustBoreGeo.rotateX(Math.PI / 2);
  const burntTitaniumMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.95,
    roughness: 0.12,
    clearcoat: 1.0,
  });

  if (archetype === 'pagani') {
    // Signature Pagani Central Quad-Stacked Circular Titanium Exhaust inside central carbon shroud
    const shroud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.18, 20),
      carbonMaterial
    );
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, groundOffset + lowerHeight * 0.58, -bodyLength * 0.502);
    chassisGroup.add(shroud);
    [
      [-0.058, 0.058],
      [0.058, 0.058],
      [-0.058, -0.058],
      [0.058, -0.058],
    ].forEach(([exX, exY]) => {
      const pipe = new THREE.Mesh(exhaustPipeGeo, chromeMaterial);
      pipe.position.set(exX, groundOffset + lowerHeight * 0.58 + exY, -bodyLength * 0.51);
      chassisGroup.add(pipe);
    });
  } else if (archetype === 'koenigsegg') {
    // Koenigsegg Central "Heart-Shaped" / Fishtail Akrapovič Titanium Exhaust Outlet
    const heartExhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.22, 16),
      chromeMaterial
    );
    heartExhaust.rotation.x = Math.PI / 2;
    heartExhaust.scale.set(1.65, 0.72, 1.0);
    heartExhaust.position.set(0, groundOffset + lowerHeight * 0.52, -bodyLength * 0.506);
    chassisGroup.add(heartExhaust);
  } else if (archetype === 'bugatti') {
    // Bugatti Central 4-to-6 Pipe Titanium Exhaust Array
    [-0.22, -0.08, 0.08, 0.22].forEach((xOff) => {
      const pipe = new THREE.Mesh(exhaustPipeGeo, chromeMaterial);
      pipe.position.set(xOff, groundOffset + 0.18, -bodyLength * 0.506);
      chassisGroup.add(pipe);
    });
  } else if (archetype === 'mclaren' || archetype === 'lamborghini') {
    // High-mounted Rear Fascia / Top-Deck Twin Titanium Exhausts
    [-0.19, 0.19].forEach((xOff) => {
      const pipe = new THREE.Mesh(exhaustPipeGeo, chromeMaterial);
      pipe.position.set(xOff, groundOffset + lowerHeight * 0.63, -bodyLength * 0.506);
      const bore = new THREE.Mesh(exhaustBoreGeo, grilleMaterial);
      bore.position.set(xOff, groundOffset + lowerHeight * 0.63, -bodyLength * 0.512);
      chassisGroup.add(pipe, bore);
    });
  } else if (archetype === 'porsche') {
    // Porsche 911 GT3 Central Twin Titanium Exhausts
    [-0.08, 0.08].forEach((xOff) => {
      const pipe = new THREE.Mesh(exhaustPipeGeo, chromeMaterial);
      pipe.position.set(xOff, groundOffset + 0.15, -bodyLength * 0.506);
      chassisGroup.add(pipe);
    });
  } else if (modelKey.includes('civic type r')) {
    // Honda Civic Type R FL5 Signature Triple Center Exhaust Pipes!
    [-0.095, 0, 0.095].forEach((xOff, idx) => {
      const pipe = new THREE.Mesh(exhaustPipeGeo, chromeMaterial);
      pipe.scale.set(idx === 1 ? 1.15 : 0.92, idx === 1 ? 1.15 : 0.92, 1.0);
      pipe.position.set(xOff, groundOffset + 0.15, -bodyLength * 0.506);
      chassisGroup.add(pipe);
    });
  } else if (archetype === 'audi') {
    // Audi RS Signature Large Twin Oval Exhaust Tips!
    [-0.32, 0.32].forEach((xOff) => {
      const ovalPipe = new THREE.Mesh(exhaustPipeGeo, chromeMaterial);
      ovalPipe.scale.set(1.55, 0.95, 1.0);
      ovalPipe.position.set(xOff, groundOffset + 0.15, -bodyLength * 0.506);
      chassisGroup.add(ovalPipe);
    });
  } else if ((archetype === 'jdm' || archetype === 'rally') && isJdm) {
    // JDM Street Tuner Large Angled Single-Exit Burnt-Blue Titanium Cannon Exhaust + Opposite Diffuser Pipe
    const cannonPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.072, 0.28, 18),
      burntTitaniumMat
    );
    cannonPipe.rotation.x = Math.PI / 2;
    cannonPipe.rotation.y = -0.18;
    cannonPipe.position.set(-0.34, groundOffset + 0.15, -bodyLength * 0.51);
    const cannonBore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.058, 0.29, 14),
      grilleMaterial
    );
    cannonBore.rotation.copy(cannonPipe.rotation);
    cannonBore.position.set(-0.34, groundOffset + 0.15, -bodyLength * 0.515);
    chassisGroup.add(cannonPipe, cannonBore);
  } else {
    [-0.36, -0.23, 0.23, 0.36].forEach((xOff) => {
      const pipe = new THREE.Mesh(
        exhaustPipeGeo,
        archetype === 'nissan' ? burntTitaniumMat : chromeMaterial
      );
      pipe.position.set(xOff, groundOffset + 0.15, -bodyLength * 0.505);
      const bore = new THREE.Mesh(exhaustBoreGeo, grilleMaterial);
      bore.position.set(xOff, groundOffset + 0.15, -bodyLength * 0.51);
      chassisGroup.add(pipe, bore);
    });
  }

  // 10. Model & Brand Specific Rear Wing / Spoiler / Active Hydraulic Airbrake / LMP1 Shark-Fin Architecture
  const wingGroup = new THREE.Group();
  const isSwanNeck =
    archetype === 'koenigsegg' ||
    archetype === 'pagani' ||
    spec.id.includes('gtrs') ||
    spec.id.includes('992') ||
    spec.id.includes('p1-gtr') ||
    spec.id.includes('senna') ||
    spec.id.includes('sto') ||
    spec.id.includes('gt3') ||
    spec.id.includes('bolide') ||
    spec.id.includes('revuelto');
  const isBoxWing =
    spec.id.includes('f40') ||
    spec.id.includes('f50') ||
    spec.id.includes('m3-gtr') ||
    spec.id.includes('m1-procar') ||
    spec.id.includes('rz34') ||
    spec.id.includes('eb110');
  const isLmpSharkFinCar =
    spec.id.includes('veneno') ||
    spec.id.includes('essenza') ||
    spec.id.includes('bolide') ||
    spec.id.includes('zonda-revolucion') ||
    spec.id.includes('imola') ||
    spec.id.includes('solus') ||
    spec.id.includes('m-hybrid');
  const isWinglessStreamliner =
    spec.id.includes('countach') ||
    spec.id.includes('daytona-sp3') ||
    spec.id.includes('speedtail') ||
    spec.id.includes('absolut') ||
    spec.id.includes('utopia') ||
    spec.id.includes('enzo') ||
    spec.id.includes('458-speciale') ||
    spec.id.includes('cc850') ||
    spec.id.includes('gemera');

  // LMP1 Central Dorsal Shark-Fin connecting roof scoop to rear wing for track prototypes!
  if (isLmpSharkFinCar) {
    const lmpFin = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.38, bodyLength * 0.44),
      carbonMaterial
    );
    lmpFin.position.set(0, groundOffset + lowerHeight + 0.26, -bodyLength * 0.24);
    const lmpFinTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.035, bodyLength * 0.44),
      accentMaterial
    );
    lmpFinTrim.position.set(0, groundOffset + lowerHeight + 0.45, -bodyLength * 0.24);
    lmpFinTrim.rotation.x = -0.08;
    chassisGroup.add(lmpFin, lmpFinTrim);
  }

  const pylonSpacing = isBoxWing
    ? bodyWidth * 0.46
    : isSwanNeck
    ? 0.24
    : 0.46;
  const pylonHeight = spec.id.includes('gtrs') || isLmpSharkFinCar ? 0.54 : isTrackSpecial ? 0.46 : 0.36;
  const pylonGeo = new THREE.BoxGeometry(isBoxWing ? 0.045 : 0.042, pylonHeight, isSwanNeck ? 0.34 : 0.24);
  const pylonMat = isBoxWing ? bodyMaterial : carbonMaterial;
  const pylonL = new THREE.Mesh(pylonGeo, pylonMat);
  pylonL.position.set(pylonSpacing, groundOffset + lowerHeight + pylonHeight * 0.45, -bodyLength * 0.43);
  pylonL.rotation.x = isSwanNeck ? -0.18 : 0.15;
  const pylonR = pylonL.clone();
  pylonR.position.x = -pylonSpacing;

  const wingSpan = bodyWidth * (spec.id.includes('gtrs') || isLmpSharkFinCar ? 1.12 : isTrackSpecial ? 1.06 : 0.96);
  const bladeGeo = new THREE.BoxGeometry(wingSpan, 0.042, isTrackSpecial ? 0.38 : 0.31);
  const bladeMesh = new THREE.Mesh(
    bladeGeo,
    isBoxWing ? bodyMaterial : carbonMaterial
  );
  const baseWingY = groundOffset + lowerHeight + pylonHeight * 0.92;
  const baseWingRotX = -0.14;
  const wingZ = -bodyLength * (isLongtail ? 0.5 : 0.46);
  bladeMesh.position.set(0, baseWingY, wingZ);
  bladeMesh.rotation.x = baseWingRotX;

  // Leading-edge colored accent strip on wing blade for instant visual recognition
  const wingAccentStrip = new THREE.Mesh(
    new THREE.BoxGeometry(wingSpan * 0.98, 0.046, 0.045),
    accentMaterial
  );
  wingAccentStrip.position.set(0, baseWingY + 0.015, wingZ + 0.14);
  wingAccentStrip.rotation.x = baseWingRotX;

  const endplateGeo = new THREE.BoxGeometry(
    0.032,
    isTrackSpecial ? 0.34 : 0.22,
    isTrackSpecial ? 0.48 : 0.38
  );
  const endL = new THREE.Mesh(
    endplateGeo,
    isBoxWing ? bodyMaterial : isTrackSpecial ? accentMaterial : carbonMaterial
  );
  endL.position.set(wingSpan * 0.5, baseWingY - 0.02, wingZ);
  const endR = endL.clone();
  endR.position.x = -wingSpan * 0.5;

  wingGroup.add(pylonL, pylonR, bladeMesh, wingAccentStrip, endL, endR);

  // Integrated sculpted Ducktail Lip Spoiler for touring/longtail/classic models so cars without tall wings have a distinct tail profile!
  const ducktailGeo = new THREE.BoxGeometry(bodyWidth * 0.88, 0.09, 0.18);
  const ducktailMesh = new THREE.Mesh(
    ducktailGeo,
    archetype === 'bmw' || archetype === 'lamborghini' ? carbonMaterial : bodyMaterial
  );
  ducktailMesh.position.set(0, groundOffset + lowerHeight * 0.82, -bodyLength * (isLongtail ? 0.52 : 0.48));
  ducktailMesh.rotation.x = 0.38;
  chassisGroup.add(ducktailMesh);

  // Jesko Absolut Twin Fighter-Jet Dorsal Tail Fins (Signature Wingless Twin-Fin Silhouette!)
  if (spec.id.includes('absolut') || spec.id.includes('speedtail')) {
    [-0.34, 0.34].forEach((xFin) => {
      const tailFin = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.28, 0.76),
        bodyMaterial
      );
      tailFin.position.set(xFin, groundOffset + lowerHeight + 0.14, -bodyLength * 0.41);
      const finTip = new THREE.Mesh(
        new THREE.BoxGeometry(0.036, 0.04, 0.76),
        accentMaterial
      );
      finTip.position.set(xFin, groundOffset + lowerHeight + 0.28, -bodyLength * 0.41);
      chassisGroup.add(tailFin, finTip);
    });
  }

  // Show tall rear wing on Track Specials, Box-Wing Classics, Active Airbrake Hypercars, or when explicitly upgraded to HorizonGT
  const showTallWingByDefault =
    !isWinglessStreamliner &&
    (isTrackSpecial ||
      isBoxWing ||
      isLmpSharkFinCar ||
      spec.id.includes('chiron') ||
      spec.id.includes('tourbillon') ||
      spec.id.includes('veyron') ||
      spec.id.includes('divo') ||
      spec.id.includes('centodieci') ||
      spec.id.includes('w1') ||
      spec.id.includes('p1') ||
      spec.id.includes('720s') ||
      spec.id.includes('675lt') ||
      spec.id.includes('laferrari') ||
      spec.id.includes('f80') ||
      spec.id.includes('revuelto') ||
      spec.id.includes('performante') ||
      spec.id.includes('murcielago-sv') ||
      spec.id.includes('huayra-bc'));
  if (tune.aeroKit === 'HorizonGT') {
    wingGroup.visible = true;
    wingGroup.scale.set(1.06, 1.12, 1.08);
  } else if (tune.aeroKit === 'Street') {
    wingGroup.visible = true;
    wingGroup.scale.set(0.94, 0.68, 0.85);
  } else {
    wingGroup.visible = showTallWingByDefault && spec.defaultTune.aeroKit === 'HorizonGT';
    wingGroup.scale.set(1, 1, 1);
  }
  chassisGroup.add(wingGroup);

  activeAero.airbrakeWing = bladeMesh;
  activeAero.airbrakeBaseY = baseWingY;
  activeAero.airbrakeBaseRotX = baseWingRotX;

  // 11. Exhaust Backfire Cones
  const flameGeo = new THREE.ConeGeometry(0.085, 0.58, 10);
  flameGeo.rotateX(-Math.PI / 2);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
  });
  const flameLeft = new THREE.Mesh(flameGeo, flameMat);
  flameLeft.position.set(0.29, groundOffset + 0.15, -bodyLength * 0.56);
  const flameRight = flameLeft.clone();
  flameRight.position.x = -0.29;
  chassisGroup.add(flameLeft, flameRight);

  // 12. 4 Multi-Spoke 3D Alloy Wheels + Brand/Model Spoke Geometry + Rounded Tire Sidewalls + Brake Rotors + Calipers
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 32);
  wheelGeo.rotateZ(Math.PI / 2);

  // Rounded tire shoulder torus for realistic tire profile
  const sidewallTorusGeo = new THREE.TorusGeometry(wheelRadius * 0.86, wheelWidth * 0.22, 12, 28);
  sidewallTorusGeo.rotateY(Math.PI / 2);

  const rimBarrelGeo = new THREE.CylinderGeometry(
    wheelRadius * 0.72,
    wheelRadius * 0.72,
    wheelWidth * 0.96,
    24
  );
  rimBarrelGeo.rotateZ(Math.PI / 2);

  const rotorGeo = new THREE.CylinderGeometry(
    wheelRadius * 0.54,
    wheelRadius * 0.54,
    0.04,
    20
  );
  rotorGeo.rotateZ(Math.PI / 2);

  const hubCapGeo = new THREE.CylinderGeometry(0.065, 0.065, wheelWidth + 0.03, 12);
  hubCapGeo.rotateZ(Math.PI / 2);

  const spokeCount =
    archetype === 'bmw' || archetype === 'pagani'
      ? 7
      : archetype === 'lamborghini' || archetype === 'bugatti'
      ? 6
      : 5;
  const spokeGeo = new THREE.BoxGeometry(
    wheelWidth + 0.02,
    wheelRadius * 0.68,
    spokeCount >= 6 ? 0.032 : 0.042
  );
  const caliperGeo = new THREE.BoxGeometry(0.09, wheelRadius * 0.52, 0.18);

  const wheelPositions: [number, number, number, boolean][] = isSixBySix
    ? [
        [bodyWidth * 0.5, wheelRadius, wheelZFront, true], // FL
        [-bodyWidth * 0.5, wheelRadius, wheelZFront, true], // FR
        [bodyWidth * 0.51, wheelRadius, -bodyLength * 0.17, false], // ML (Middle Axle Left)
        [-bodyWidth * 0.51, wheelRadius, -bodyLength * 0.17, false], // MR (Middle Axle Right)
        [bodyWidth * 0.51, wheelRadius, -bodyLength * 0.37, false], // RL (Rear Axle Left)
        [-bodyWidth * 0.51, wheelRadius, -bodyLength * 0.37, false], // RR (Rear Axle Right)
      ]
    : [
        [bodyWidth * 0.5, wheelRadius, wheelZFront, true], // FL
        [-bodyWidth * 0.5, wheelRadius, wheelZFront, true], // FR
        [bodyWidth * 0.51, wheelRadius, wheelZRear, false], // RL
        [-bodyWidth * 0.51, wheelRadius, wheelZRear, false], // RR
      ];

  const wheelMeshes: THREE.Group[] = [];
  const frontSteerPivots: THREE.Group[] = [];

  wheelPositions.forEach(([wx, wy, wz, isFront], idx) => {
    const pivot = new THREE.Group();
    pivot.position.set(wx, wy, wz);

    // Apply camber tilt
    const camberDeg = isFront ? tune.frontCamberDeg : tune.rearCamberDeg;
    const camberSign = wx > 0 ? -1 : 1;
    pivot.rotation.z = ((camberDeg * Math.PI) / 180) * camberSign;

    const spinGroup = new THREE.Group();
    const tireMesh = new THREE.Mesh(wheelGeo, tireMaterial);
    tireMesh.castShadow = true;

    const outerTorus = new THREE.Mesh(sidewallTorusGeo, tireMaterial);
    outerTorus.position.x = wx > 0 ? wheelWidth * 0.36 : -wheelWidth * 0.36;

    const rimBarrel = new THREE.Mesh(rimBarrelGeo, rimMaterial);
    const hubCap = new THREE.Mesh(
      hubCapGeo,
      isTrackSpecial || isHyper ? accentMaterial : chromeMaterial
    );

    spinGroup.add(tireMesh, outerTorus, rimBarrel, hubCap);

    // Carbon Aero-Disc Wheel Covers for Speedtail (front wheels), Bolide, Veneno & LMDh Prototypes
    const hasAeroDisc =
      (spec.id.includes('speedtail') && isFront) ||
      spec.id.includes('bolide') ||
      spec.id.includes('veneno') ||
      spec.id.includes('m-hybrid');
    if (hasAeroDisc) {
      const aeroDiscGeo = new THREE.CylinderGeometry(
        wheelRadius * 0.69,
        wheelRadius * 0.69,
        0.025,
        24
      );
      aeroDiscGeo.rotateZ(Math.PI / 2);
      const aeroDisc = new THREE.Mesh(aeroDiscGeo, carbonMaterial);
      aeroDisc.position.x = wx > 0 ? wheelWidth * 0.48 : -wheelWidth * 0.48;
      spinGroup.add(aeroDisc);
    } else {
      // Multi-Spoke Forged Concave Y-Spoke Alloy Wheel Spokes + Outer Rim Lip Ring
      const rimLipGeo = new THREE.TorusGeometry(wheelRadius * 0.72, 0.018, 10, 28);
      rimLipGeo.rotateY(Math.PI / 2);
      const rimLip = new THREE.Mesh(rimLipGeo, rimMaterial);
      rimLip.position.x = wx > 0 ? wheelWidth * 0.48 : -wheelWidth * 0.48;
      spinGroup.add(rimLip);

      for (let s = 0; s < spokeCount; s++) {
        const baseAngle = (s * Math.PI) / spokeCount;
        // Twin-branch Y-Spoke forged geometry
        [-0.08, 0.08].forEach((branchAngle) => {
          const spoke = new THREE.Mesh(spokeGeo, rimMaterial);
          spoke.rotation.x = baseAngle + branchAngle;
          spoke.position.x = wx > 0 ? wheelWidth * 0.16 : -wheelWidth * 0.16;
          spinGroup.add(spoke);
        });
      }
    }

    // Colored Motorsport Tire Sidewall Stripe Ring for Track Specials & Hypercars
    if (isTrackSpecial || isHyper) {
      const tireStripeGeo = new THREE.TorusGeometry(wheelRadius * 0.81, 0.011, 8, 28);
      tireStripeGeo.rotateY(Math.PI / 2);
      const tireStripe = new THREE.Mesh(tireStripeGeo, accentMaterial);
      tireStripe.position.x = wx > 0 ? wheelWidth * 0.49 : -wheelWidth * 0.49;
      spinGroup.add(tireStripe);
    }

    // Steel Brake Rotor & Painted Caliper fixed to knuckle pivot
    const rotorMesh = new THREE.Mesh(rotorGeo, rotorMaterial);
    rotorMesh.position.x = wx > 0 ? 0.04 : -0.04;
    pivot.add(rotorMesh);

    const caliperMesh = new THREE.Mesh(caliperGeo, caliperMaterial);
    caliperMesh.position.set(wx > 0 ? 0.07 : -0.07, 0.04, isFront ? -0.12 : 0.12);
    pivot.add(caliperMesh);

    pivot.add(spinGroup);
    root.add(pivot);

    wheelMeshes.push(spinGroup);
    if (idx < 2) {
      frontSteerPivots.push(pivot);
    }
  });

  // 13. Realistic Soft-Penumbra Under-Chassis Ambient Occlusion Contact Shadow Pad & Volumetric LED Headlight Beams
  const contactShadowGeo = new THREE.PlaneGeometry(bodyWidth * 1.38, bodyLength * 1.24);
  contactShadowGeo.rotateX(-Math.PI / 2);
  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
  contactShadow.position.set(0, 0.025, 0);
  root.add(contactShadow);

  const beamConeGeo = new THREE.ConeGeometry(1.35, 9.5, 16, 1, true);
  beamConeGeo.rotateX(Math.PI / 2);
  const beamConeMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  [-1, 1].forEach((side) => {
    const beamCone = new THREE.Mesh(beamConeGeo, beamConeMat);
    beamCone.position.set(
      side * bodyWidth * 0.35,
      groundOffset + lowerHeight * 0.42,
      bodyLength * 0.5 + 4.75
    );
    chassisGroup.add(beamCone);
  });

  return {
    root,
    chassisGroup,
    bodyPaintMaterials: [bodyMaterial],
    rimMaterials: [rimMaterial],
    caliperMaterials: [caliperMaterial],
    rotorMaterials: [rotorMaterial],
    wheelMeshes,
    frontSteerPivots,
    wingGroup,
    splitterMesh,
    brakeLightMaterial,
    flameLeft,
    flameRight,
    steeringWheelGroup,
    cockpitHideMeshes,
    cockpitCamPosLocal,
    cockpitCamLookLocal,
    activeAero,
  };
}

/**
 * Helper to construct the monumental Paris Arc de Triomphe at (0, 0)
 * Players can drive straight through its central vault or around the Place de l'Étoile roundabout!
 */
function buildArcDeTriomphe(): THREE.Group {
  const arcGroup = new THREE.Group();

  const limestoneMat = new THREE.MeshStandardMaterial({
    color: 0xe7dfd3,
    roughness: 0.72,
    metalness: 0.08,
  });
  const carvedReliefMat = new THREE.MeshStandardMaterial({
    color: 0xd6cbb9,
    roughness: 0.65,
    metalness: 0.12,
  });
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    metalness: 0.85,
    roughness: 0.2,
  });

  // 4 Monumental Corner Limestone Piers at (±17.5, ±17.5) forming a 26m-wide 4-Way Grand Archway
  // so North-South, East-West, and Diagonal boulevards all pass cleanly through the central vault!
  const pierGeo = new THREE.BoxGeometry(8.8, 22, 8.8);
  const baseGeo = new THREE.BoxGeometry(10.0, 3.2, 10.0);
  const reliefGeo = new THREE.BoxGeometry(9.4, 9.5, 9.4);

  const cornerCoords: [number, number][] = [
    [-17.5, -17.5],
    [17.5, -17.5],
    [-17.5, 17.5],
    [17.5, 17.5],
  ];

  cornerCoords.forEach(([px, pz]) => {
    const pier = new THREE.Mesh(pierGeo, limestoneMat);
    pier.position.set(px, 11, pz);
    pier.castShadow = true;
    pier.receiveShadow = true;

    const base = new THREE.Mesh(baseGeo, carvedReliefMat);
    base.position.set(px, 1.6, pz);

    const relief = new THREE.Mesh(reliefGeo, carvedReliefMat);
    relief.position.set(px, 9.5, pz);

    arcGroup.add(pier, base, relief);
  });

  // Grand 4-Way Arch Vault Span & Entablature Cornice high above the roadway (y = 23.8m)
  const entablatureGeo = new THREE.BoxGeometry(44.5, 4.8, 44.5);
  const entablature = new THREE.Mesh(entablatureGeo, limestoneMat);
  entablature.position.set(0, 23.8, 0);
  entablature.castShadow = true;

  const corniceGeo = new THREE.BoxGeometry(46.2, 1.4, 46.2);
  const cornice = new THREE.Mesh(corniceGeo, carvedReliefMat);
  cornice.position.set(0, 26.5, 0);

  // Upper Attic Story & Crown Balustrade
  const atticGeo = new THREE.BoxGeometry(42.5, 5.8, 42.5);
  const attic = new THREE.Mesh(atticGeo, limestoneMat);
  attic.position.set(0, 29.8, 0);
  attic.castShadow = true;

  const crownRimGeo = new THREE.BoxGeometry(44.0, 1.1, 44.0);
  const crownRim = new THREE.Mesh(crownRimGeo, goldAccentMat);
  crownRim.position.set(0, 33.0, 0);

  // Eternal Flame & Golden Torch Ring at the SW corner pier base
  const flameRingGeo = new THREE.RingGeometry(1.4, 2.1, 24);
  flameRingGeo.rotateX(-Math.PI / 2);
  const flameRing = new THREE.Mesh(flameRingGeo, goldAccentMat);
  flameRing.position.set(-17.5, 0.08, 23.5);

  arcGroup.add(
    entablature,
    cornice,
    attic,
    crownRim,
    flameRing
  );
  return arcGroup;
}

/**
 * Helper to construct the iconic 3D Tour Eiffel (Eiffel Tower) landmark
 */
function buildEiffelTower(): THREE.Group {
  const tower = new THREE.Group();

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x85684a,
    metalness: 0.78,
    roughness: 0.34,
  });
  const warmGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.4,
    metalness: 0.6,
    roughness: 0.3,
  });
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.9,
  });

  // 4 Angled Base Pylon Legs
  const legSpread = 22;
  const legPositions: [number, number][] = [
    [-legSpread, -legSpread],
    [legSpread, -legSpread],
    [-legSpread, legSpread],
    [legSpread, legSpread],
  ];
  legPositions.forEach(([lx, lz]) => {
    const legGeo = new THREE.BoxGeometry(5.2, 34, 5.2);
    const leg = new THREE.Mesh(legGeo, ironMat);
    leg.position.set(lx * 0.75, 16, lz * 0.75);
    leg.rotation.z = lx > 0 ? 0.24 : -0.24;
    leg.rotation.x = lz > 0 ? -0.24 : 0.24;
    leg.castShadow = true;
    tower.add(leg);
  });

  // 1st Floor Observation Deck (Height 32m)
  const deck1Geo = new THREE.BoxGeometry(34, 3.2, 34);
  const deck1 = new THREE.Mesh(deck1Geo, ironMat);
  deck1.position.y = 32;
  deck1.castShadow = true;
  tower.add(deck1);

  const deck1Glow = new THREE.Mesh(new THREE.BoxGeometry(35, 0.7, 35), warmGoldMat);
  deck1Glow.position.y = 33.8;
  tower.add(deck1Glow);

  // Middle Section Tapered Lattice Shaft (Height 33m to 68m)
  const midShaftGeo = new THREE.CylinderGeometry(8.5, 15.5, 35, 4);
  midShaftGeo.rotateY(Math.PI / 4);
  const midShaft = new THREE.Mesh(midShaftGeo, ironMat);
  midShaft.position.y = 50;
  midShaft.castShadow = true;
  tower.add(midShaft);

  // 2nd Floor Observation Deck (Height 68m)
  const deck2Geo = new THREE.BoxGeometry(19, 2.6, 19);
  const deck2 = new THREE.Mesh(deck2Geo, ironMat);
  deck2.position.y = 68;
  tower.add(deck2);

  const deck2Glow = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 20), warmGoldMat);
  deck2Glow.position.y = 69.5;
  tower.add(deck2Glow);

  // Upper Spire Section (Height 69m to 122m)
  const upperSpireGeo = new THREE.CylinderGeometry(2.6, 7.8, 52, 4);
  upperSpireGeo.rotateY(Math.PI / 4);
  const upperSpire = new THREE.Mesh(upperSpireGeo, ironMat);
  upperSpire.position.y = 95;
  upperSpire.castShadow = true;
  tower.add(upperSpire);

  // Summit Cupola, Golden Lantern & Sky Beacon Spire (Height 122m to 146m)
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 5, 12), warmGoldMat);
  cupola.position.y = 123;
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 22, 8), beaconMat);
  antenna.position.y = 135;
  tower.add(cupola, antenna);

  return tower;
}

/**
 * Helper to construct a Parisian Haussmannian Limestone Building block with Mansard roof
 */
function buildHaussmannBlock(width: number, height: number, depth: number): THREE.Group {
  const group = new THREE.Group();
  const { colorMap, roughnessMap } = getHighEndBuildingFacadeTextures();

  const facadeMat = new THREE.MeshPhysicalMaterial({
    color: 0xf1ece1,
    map: colorMap,
    roughnessMap,
    bumpMap: roughnessMap,
    bumpScale: 0.08,
    roughness: 0.25,
    metalness: 0.55,
    clearcoat: 0.75,
    envMapIntensity: 1.85,
  });
  const mansardRoofMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: getSlateRoofTileTexture(),
    roughness: 0.38,
    metalness: 0.42,
  });
  const storefrontGlowMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f172a,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.08,
    metalness: 0.85,
    clearcoat: 1.0,
  });
  const ironBalconyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.88,
    roughness: 0.22,
  });

  // Main Sculpted Architectural Facade with Glass Windows & Mullions
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), facadeMat);
  body.position.y = height * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Ground-floor Granite & Brushed Metal Colonnade Podium
  const storefront = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.35, 3.4, depth + 0.35),
    storefrontGlowMat
  );
  storefront.position.y = 1.7;
  group.add(storefront);

  // 2nd and 5th floor continuous wrought-iron Haussmann balconies & stone cornices
  [height * 0.38, height * 0.78].forEach((by) => {
    const balcony = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.55, 0.42, depth + 0.55),
      ironBalconyMat
    );
    balcony.position.y = by;
    group.add(balcony);
  });

  // Angled Blue-Slate Textured Mansard Roof with Crown Trim
  const roofGeo = new THREE.CylinderGeometry(
    Math.min(width, depth) * 0.54,
    Math.max(width, depth) * 0.72,
    4.4,
    4
  );
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, mansardRoofMat);
  roof.position.y = height + 2.2;
  group.add(roof);

  return group;
}

export const WorldSceneCanvas: React.FC<WorldSceneCanvasProps> = ({
  activeSpec,
  activeTune,
  benchmark,
  cameraMode,
  lightingPreset,
  isGarageView,
  isPaused = false,
  remotePlayers,
  activeChallenge,
  activeRaceSession,
  trackedDestination,
  customTrackPoints,
  teleportTarget,
  onTelemetryUpdate,
  onNetworkBroadcast,
  onLeaderboardEvent,
  onChallengeFinish,
  onReachRaceCheckpoint,
  onReachCustomTrackPoint,
  onRaceBotsUpdate,
  onCollectHorizonToken,
  externalControlsRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglLost, setWebglLost] = useState(false);

  // Interactive 360° Camera POV Orbit Controls for Chase Close & Chase Far views
  const povYawOffsetRef = useRef<number>(0);
  const povPitchOffsetRef = useRef<number>(0);
  const isDraggingPovRef = useRef<boolean>(false);
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs to hold latest props for the 60fps loop without recreating the WebGL scene
  const specRef = useRef(activeSpec);
  const tuneRef = useRef(activeTune);
  const benchmarkRef = useRef(benchmark);
  const cameraModeRef = useRef(cameraMode);
  const isGarageViewRef = useRef(isGarageView);
  const isPausedRef = useRef(isPaused);
  const remotePlayersRef = useRef(remotePlayers);
  const activeChallengeRef = useRef(activeChallenge);
  const activeRaceRef = useRef(activeRaceSession);
  const trackedDestRef = useRef(trackedDestination);
  const customTrackPointsRef = useRef(customTrackPoints);
  const raceBotsRef = useRef<RaceBotState[]>([]);
  const lastRaceKeyRef = useRef<string>('');
  const callbacksRef = useRef({
    onTelemetryUpdate,
    onNetworkBroadcast,
    onLeaderboardEvent,
    onChallengeFinish,
    onReachRaceCheckpoint,
    onReachCustomTrackPoint,
    onRaceBotsUpdate,
    onCollectHorizonToken,
  });

  specRef.current = activeSpec;
  tuneRef.current = activeTune;
  benchmarkRef.current = benchmark;
  cameraModeRef.current = cameraMode;
  isGarageViewRef.current = isGarageView;
  isPausedRef.current = isPaused;
  remotePlayersRef.current = remotePlayers;
  activeChallengeRef.current = activeChallenge;
  activeRaceRef.current = activeRaceSession;
  trackedDestRef.current = trackedDestination;
  customTrackPointsRef.current = customTrackPoints;
  callbacksRef.current = {
    onTelemetryUpdate,
    onNetworkBroadcast,
    onLeaderboardEvent,
    onChallengeFinish,
    onReachRaceCheckpoint,
    onReachCustomTrackPoint,
    onRaceBotsUpdate,
    onCollectHorizonToken,
  };

  // Spawn 5 AI Race Bots scaled to player's current car whenever a race starts
  useEffect(() => {
    if (!activeRaceSession || activeRaceSession.isCompleted) {
      raceBotsRef.current = [];
      lastRaceKeyRef.current = '';
      return;
    }
    const raceKey = activeRaceSession.sessionId || `${activeRaceSession.race.id}_active`;
    if (lastRaceKeyRef.current !== raceKey) {
      lastRaceKeyRef.current = raceKey;
      raceBotsRef.current = createRaceBotsForEvent(
        activeRaceSession.race,
        specRef.current,
        benchmarkRef.current,
        remotePlayersRef.current.length > 0,
        activeRaceSession.difficultyTier
      );
    }
  }, [activeRaceSession]);

  const physicsStateRef = useRef<InternalPhysicsState>(createInitialPhysicsState());
  const cameraSnapPendingRef = useRef<boolean>(false);
  const carRigRef = useRef<BuiltCarRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.HemisphereLight | null>(null);
  const speedFlashRef = useRef<number>(0);

  // Handle Teleport / Fast Travel requests
  useEffect(() => {
    if (!teleportTarget) return;
    const p = physicsStateRef.current;
    const terrain = sampleWorldTerrain(teleportTarget.x, teleportTarget.z);
    p.x = teleportTarget.x;
    p.z = teleportTarget.z;
    p.y = terrain.heightY;
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    p.heading = teleportTarget.heading;
    p.angularVelocity = 0;
    p.gear = 1;
    p.rpm = specRef.current.idleRPM;
    povYawOffsetRef.current = 0;
    povPitchOffsetRef.current = 0;
    cameraSnapPendingRef.current = true;
    if (carRigRef.current) {
      carRigRef.current.root.position.set(p.x, p.y, p.z);
      carRigRef.current.root.rotation.y = p.heading;
    }
  }, [teleportTarget]);

  // Rebuild player car mesh when vehicle or visual/aero tune changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (carRigRef.current) {
      scene.remove(carRigRef.current.root);
    }

    const newRig = buildVehicleRig(activeSpec, activeTune);
    const p = physicsStateRef.current;
    newRig.root.position.set(p.x, p.y, p.z);
    newRig.root.rotation.y = p.heading;
    scene.add(newRig.root);
    carRigRef.current = newRig;
  }, [
    activeSpec,
    activeTune.paintHex,
    activeTune.paintFinish,
    activeTune.rimHex,
    activeTune.caliperHex,
    activeTune.aeroKit,
    activeTune.aspiration,
    activeTune.rideHeightMm,
    activeTune.frontCamberDeg,
    activeTune.rearCamberDeg,
  ]);

  // Update Lighting Preset dynamically
  useEffect(() => {
    const scene = sceneRef.current;
    const sun = sunLightRef.current;
    const hemi = ambientLightRef.current;
    if (!scene || !sun || !hemi) return;

    if (lightingPreset === 'sunset') {
      scene.background = new THREE.Color(0x181524);
      scene.fog = new THREE.FogExp2(0x181524, 0.0019);
      sun.color.setHex(0xfbbf24);
      sun.intensity = 2.6;
      sun.position.set(160, 75, -180);
      hemi.color.setHex(0xfde68a);
      hemi.groundColor.setHex(0x1e293b);
      hemi.intensity = 1.15;
    } else if (lightingPreset === 'daylight') {
      scene.background = new THREE.Color(0x1e293b);
      scene.fog = new THREE.FogExp2(0x1e293b, 0.0016);
      sun.color.setHex(0xf8fafc);
      sun.intensity = 2.8;
      sun.position.set(120, 180, 90);
      hemi.color.setHex(0xe0f2fe);
      hemi.groundColor.setHex(0x334155);
      hemi.intensity = 1.35;
    } else {
      scene.background = new THREE.Color(0x07090e);
      scene.fog = new THREE.FogExp2(0x07090e, 0.0024);
      sun.color.setHex(0x38bdf8);
      sun.intensity = 1.2;
      sun.position.set(-100, 110, 100);
      hemi.color.setHex(0x1e293b);
      hemi.groundColor.setHex(0x090d16);
      hemi.intensity = 0.75;
    }
  }, [lightingPreset]);

  // Main Three.js Scene & 60Hz Simulation Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181524);
    // Ultra-clear atmospheric horizon fog so players can see kilometers ahead across hundreds of buildings, bridges & mountains
    scene.fog = new THREE.FogExp2(0x181524, 0.00018);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.35,
      9500
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // High-Dynamic-Range Procedural Studio & Sky-Horizon Environment Reflection Map
    // Gives cars & glass buildings a crisp, high-end liquid-metal & mirror finish!
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x091326);
    // Upper Deep Studio Azure Sky Hemisphere (High contrast against bright white/gold light ribbons!)
    const skyDomeEnv = new THREE.Mesh(
      new THREE.SphereGeometry(42, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
      new THREE.MeshBasicMaterial({ color: 0x1d4ed8, side: THREE.BackSide })
    );
    envScene.add(skyDomeEnv);
    // Lower Dark Obsidian Asphalt Hemisphere (creates razor-sharp dark metallic reflections on lower doors & rockers!)
    const groundDomeEnv = new THREE.Mesh(
      new THREE.SphereGeometry(42, 24, 16, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48),
      new THREE.MeshBasicMaterial({ color: 0x04070f, side: THREE.BackSide })
    );
    envScene.add(groundDomeEnv);
    // Multi-Band 360-Degree Luminous Chrome Horizon Reflection Belt
    const horizonGlowEnv = new THREE.Mesh(
      new THREE.CylinderGeometry(39, 39, 5.2, 36, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
    );
    horizonGlowEnv.position.y = 2.8;
    envScene.add(horizonGlowEnv);
    const skyTransitionBand = new THREE.Mesh(
      new THREE.CylinderGeometry(39.2, 39.2, 6.0, 36, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.BackSide })
    );
    skyTransitionBand.position.y = 7.8;
    envScene.add(skyTransitionBand);
    const warmSunHorizonBand = new THREE.Mesh(
      new THREE.CylinderGeometry(39.5, 39.5, 3.2, 36, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.BackSide })
    );
    warmSunHorizonBand.position.y = 0.2;
    envScene.add(warmSunHorizonBand);
    // Overhead & 45-Degree Lateral Studio Specular Softbox Ribbons + Negative-Fill Dark Ribs for Liquid-Metal Clearcoat Reflections!
    [-18, -9, 0, 9, 18].forEach((zStrip, idx) => {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(62, idx === 2 ? 6.5 : 3.8),
        new THREE.MeshBasicMaterial({
          color: idx === 2 ? 0xffffff : idx % 2 === 0 ? 0xe0f2fe : 0xfef08a,
          side: THREE.DoubleSide,
        })
      );
      strip.position.set(0, 26, zStrip);
      strip.rotation.x = Math.PI / 2;
      envScene.add(strip);
    });
    [-1, 1].forEach((side) => {
      const sideSoftbox = new THREE.Mesh(
        new THREE.PlaneGeometry(58, 5.2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      sideSoftbox.position.set(side * 22, 15, 0);
      sideSoftbox.rotation.y = Math.PI / 2;
      sideSoftbox.rotation.x = side * 0.65;
      envScene.add(sideSoftbox);
    });
    const generatedEnvMap = pmremGenerator.fromScene(envScene, 0.012).texture;
    scene.environment = generatedEnvMap;
    pmremGenerator.dispose();

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onContextRestored = () => {
      setWebglLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    // Lights (Forza Horizon 6 Crisp Natural Sunlight + Azure Sky Hemisphere Bounce)
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x465940, 1.32);
    scene.add(hemiLight);
    ambientLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff8eb, 3.15);
    sunLight.position.set(160, 95, -180);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.00028;
    sunLight.shadow.camera.near = 6;
    sunLight.shadow.camera.far = 340;
    const d = 84;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 0. 3D Forza Horizon 6 Procedural Sky & Sunlit Cloud Dome + Blazing Solar Disc Corona (Follows player horizontally, zero lag)
    const skyDomeMat = new THREE.MeshBasicMaterial({
      map: getHorizonSkyCloudsTexture(),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    const skyDomeMesh = new THREE.Mesh(new THREE.SphereGeometry(7600, 32, 20), skyDomeMat);
    skyDomeMesh.renderOrder = -10;
    scene.add(skyDomeMesh);

    // 3D Solar Disc & Warm Golden Atmospheric Corona Halo in the Sky
    const sunDiscGroup = new THREE.Group();
    const sunCoreMesh = new THREE.Mesh(
      new THREE.CircleGeometry(340, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        fog: false,
        depthWrite: false,
      })
    );
    const sunHaloMesh = new THREE.Mesh(
      new THREE.CircleGeometry(980, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.28,
        fog: false,
        depthWrite: false,
      })
    );
    sunHaloMesh.position.z = -2;
    sunDiscGroup.add(sunHaloMesh, sunCoreMesh);
    sunDiscGroup.renderOrder = -9;
    scene.add(sunDiscGroup);

    // ============================================================================
    // BUILD 10x+ MASSIVE 16km x 16km 8-BIOME OPEN WORLD
    // (Paris Metropolis, Alpine Glacier, Sahara Red Canyon, Mediterranean Riviera,
    //  Volcanic Caldera, Emerald Rainforest, Lavender Highlands, Autobahn Megaport)
    // ============================================================================
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // 1A. Continental 16,000m x 16,000m Multi-Biome Megaterrain (200x200 grid aligned with physics triangle sampler)
    const continentalGeo = new THREE.PlaneGeometry(16000, 16000, 200, 200);
    continentalGeo.rotateX(-Math.PI / 2);
    const contPos = continentalGeo.attributes.position;
    const contColors: number[] = [];

    for (let i = 0; i < contPos.count; i++) {
      const vx = contPos.getX(i);
      const vz = contPos.getZ(i);
      const sample = sampleWorldTerrain(vx, vz);
      const rawElev = evaluateRawTerrainElevation(vx, vz);
      // Depress continentalGeo inside central Paris [-760, 760] and keep flat ground at -0.14m below roads so sand NEVER pokes through roads
      const isInsideInner = Math.abs(vx) <= 760 && Math.abs(vz) <= 760;
      contPos.setY(i, isInsideInner ? -1.8 : rawElev <= 0.02 ? -0.14 : rawElev - 0.06);

      if (sample.surface === 'Asphalt') {
        contColors.push(0.07, 0.09, 0.13);
      } else if (sample.surface === 'Curb') {
        contColors.push(0.78, 0.76, 0.72);
      } else if (sample.surface === 'Snow') {
        contColors.push(0.88, 0.93, 0.98);
      } else if (sample.surface === 'Sand') {
        contColors.push(0.92, 0.68, 0.32);
      } else if (sample.biome === 'Volcanic Caldera') {
        contColors.push(0.16, 0.14, 0.15);
      } else if (sample.biome === 'Lavender Highlands') {
        contColors.push(0.42, 0.26, 0.58);
      } else if (sample.biome === 'Emerald Rainforest') {
        contColors.push(0.11, 0.29, 0.16);
      } else if (sample.biome === 'Mediterranean Riviera') {
        contColors.push(0.22, 0.46, 0.38);
      } else {
        contColors.push(0.18, 0.28, 0.19);
      }
    }
    continentalGeo.setAttribute('color', new THREE.Float32BufferAttribute(contColors, 3));
    continentalGeo.computeVertexNormals();
    const terrainDetailTex = getTerrainDetailTexture();
    const continentalMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: terrainDetailTex,
      bumpMap: terrainDetailTex,
      bumpScale: 0.08,
      roughness: 0.86,
      metalness: 0.04,
    });
    const continentalMesh = new THREE.Mesh(continentalGeo, continentalMat);
    continentalMesh.receiveShadow = true;
    worldGroup.add(continentalMesh);

    // 1B. High-Resolution Central 1,600m x 1,600m Terrain Plane (160x160 grid = 10m cells aligned with physics)
    const groundGeo = new THREE.PlaneGeometry(1600, 1600, 160, 160);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const sample = sampleWorldTerrain(vx, vz);
      const rawElev = evaluateRawTerrainElevation(vx, vz);
      posAttr.setY(i, rawElev <= 0.02 ? -0.06 : rawElev - 0.04);

      if (sample.surface === 'Asphalt') {
        colors.push(0.08, 0.1, 0.14);
      } else if (sample.surface === 'Curb') {
        colors.push(0.78, 0.76, 0.72);
      } else if (sample.surface === 'Sand') {
        colors.push(0.9, 0.66, 0.32);
      } else if (sample.surface === 'Snow') {
        colors.push(0.88, 0.93, 0.98);
      } else {
        colors.push(0.18, 0.28, 0.19);
      }
    }
    groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: terrainDetailTex,
      bumpMap: terrainDetailTex,
      bumpScale: 0.06,
      roughness: 0.85,
      metalness: 0.04,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    worldGroup.add(groundMesh);

    // 2. Continental Superhighways + Parisian Boulevards & Place de l'Étoile Roundabout
    // Deep matte charcoal-slate asphalt with micro-aggregate bump texture & zero Z-fighting
    const roadMicroTex = getRoadSurfaceMicroTexture();
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x181f2c,
      roughness: 0.86,
      metalness: 0.03,
      bumpMap: roadMicroTex,
      bumpScale: 0.035,
      envMapIntensity: 0.14,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const roadShoulderCurbMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.04,
      envMapIntensity: 0.08,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    });
    const cobblestoneMat = new THREE.MeshStandardMaterial({
      color: 0x1e2532,
      roughness: 0.86,
      metalness: 0.04,
      envMapIntensity: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });

    // Avenue des Champs-Élysées & N-S Continental Autoroute (15,200m total length, subdivided to prevent depth Z-fighting)
    const mainRoadShoulderGeo = new THREE.PlaneGeometry(37.5, 15200, 1, 160);
    mainRoadShoulderGeo.rotateX(-Math.PI / 2);
    const mainRoadShoulder = new THREE.Mesh(mainRoadShoulderGeo, roadShoulderCurbMat);
    mainRoadShoulder.position.y = 0.012;
    worldGroup.add(mainRoadShoulder);

    const mainRoadGeo = new THREE.PlaneGeometry(34, 15200, 1, 160);
    mainRoadGeo.rotateX(-Math.PI / 2);
    const mainRoad = new THREE.Mesh(mainRoadGeo, asphaltMat);
    mainRoad.position.y = 0.068;
    mainRoad.receiveShadow = true;
    worldGroup.add(mainRoad);

    // Rue de Rivoli & E-W Trans-Continental Autobahn (15,200m total length, subdivided)
    const crossRoadShoulderGeo = new THREE.PlaneGeometry(15200, 37.5, 160, 1);
    crossRoadShoulderGeo.rotateX(-Math.PI / 2);
    const crossRoadShoulder = new THREE.Mesh(crossRoadShoulderGeo, roadShoulderCurbMat);
    crossRoadShoulder.position.y = 0.014;
    worldGroup.add(crossRoadShoulder);

    const crossRoadGeo = new THREE.PlaneGeometry(15200, 34, 160, 1);
    crossRoadGeo.rotateX(-Math.PI / 2);
    const crossRoad = new THREE.Mesh(crossRoadGeo, asphaltMat);
    crossRoad.position.y = 0.072;
    crossRoad.receiveShadow = true;
    worldGroup.add(crossRoad);

    // 4 Diagonal Trans-Biome Arterials starting at the Boulevard Périphérique Inner Ring (r=265m) out to r=6200m
    // (Keeps inner Paris r < 265m completely clear for Tour Eiffel, Louvre, Sacré-Cœur, and Haussmann blocks!)
    const diagRayLen = 6200 - 265;
    const diagRayMidR = 265 + diagRayLen * 0.5;
    [Math.PI / 4, (3 * Math.PI) / 4, -Math.PI / 4, (-3 * Math.PI) / 4].forEach((rayAngle) => {
      const cx = Math.sin(rayAngle) * diagRayMidR;
      const cz = Math.cos(rayAngle) * diagRayMidR;

      const diagShoulderGeo = new THREE.PlaneGeometry(33.2, diagRayLen, 1, 64);
      diagShoulderGeo.rotateX(-Math.PI / 2);
      diagShoulderGeo.rotateY(rayAngle);
      const diagShoulder = new THREE.Mesh(diagShoulderGeo, roadShoulderCurbMat);
      diagShoulder.position.set(cx, 0.01, cz);
      worldGroup.add(diagShoulder);

      const diagGeo = new THREE.PlaneGeometry(30, diagRayLen, 1, 64);
      diagGeo.rotateX(-Math.PI / 2);
      diagGeo.rotateY(rayAngle);
      const diagRoad = new THREE.Mesh(diagGeo, asphaltMat);
      diagRoad.position.set(cx, 0.064, cz);
      worldGroup.add(diagRoad);
    });

    // Place Charles de Gaulle (Étoile Cobblestone Plaza Roundabout at 0,0)
    const etoilePlazaGeo = new THREE.CircleGeometry(46, 64);
    etoilePlazaGeo.rotateX(-Math.PI / 2);
    const etoilePlaza = new THREE.Mesh(etoilePlazaGeo, cobblestoneMat);
    etoilePlaza.position.y = 0.088;
    etoilePlaza.receiveShadow = true;
    worldGroup.add(etoilePlaza);

    // Boulevard Périphérique Inner Ring Road (Radius 265m)
    const ringShoulderGeo = new THREE.RingGeometry(247.2, 282.8, 96);
    ringShoulderGeo.rotateX(-Math.PI / 2);
    const ringShoulderMesh = new THREE.Mesh(ringShoulderGeo, roadShoulderCurbMat);
    ringShoulderMesh.position.y = 0.015;
    worldGroup.add(ringShoulderMesh);

    const ringGeo = new THREE.RingGeometry(249, 281, 96);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, asphaltMat);
    ringMesh.position.y = 0.075;
    ringMesh.receiveShadow = true;
    worldGroup.add(ringMesh);

    // Metropolitan District Ring Highway (Radius 900m)
    const metroShoulderGeo = new THREE.RingGeometry(883.2, 916.8, 128);
    metroShoulderGeo.rotateX(-Math.PI / 2);
    const metroShoulderMesh = new THREE.Mesh(metroShoulderGeo, roadShoulderCurbMat);
    metroShoulderMesh.position.y = 0.016;
    worldGroup.add(metroShoulderMesh);

    const metroRingGeo = new THREE.RingGeometry(885, 915, 128);
    metroRingGeo.rotateX(-Math.PI / 2);
    const metroRingMesh = new THREE.Mesh(metroRingGeo, asphaltMat);
    metroRingMesh.position.y = 0.078;
    worldGroup.add(metroRingMesh);

    // Mid-Biome Ring Road (Radius 1,800m)
    const midShoulderGeo = new THREE.RingGeometry(1780, 1820, 144);
    midShoulderGeo.rotateX(-Math.PI / 2);
    const midShoulderMesh = new THREE.Mesh(midShoulderGeo, roadShoulderCurbMat);
    midShoulderMesh.position.y = 0.018;
    worldGroup.add(midShoulderMesh);

    const midRingGeo = new THREE.RingGeometry(1782, 1818, 144);
    midRingGeo.rotateX(-Math.PI / 2);
    const midRingMesh = new THREE.Mesh(midRingGeo, asphaltMat);
    midRingMesh.position.y = 0.08;
    worldGroup.add(midRingMesh);

    // Suburban Ring Road (Radius 3,000m)
    const suburbanShoulderGeo = new THREE.RingGeometry(2979, 3021, 160);
    suburbanShoulderGeo.rotateX(-Math.PI / 2);
    const suburbanShoulderMesh = new THREE.Mesh(suburbanShoulderGeo, roadShoulderCurbMat);
    suburbanShoulderMesh.position.y = 0.019;
    worldGroup.add(suburbanShoulderMesh);

    const suburbanRingGeo = new THREE.RingGeometry(2981, 3019, 160);
    suburbanRingGeo.rotateX(-Math.PI / 2);
    const suburbanRingMesh = new THREE.Mesh(suburbanRingGeo, asphaltMat);
    suburbanRingMesh.position.y = 0.082;
    worldGroup.add(suburbanRingMesh);

    // Outer Continental Goliath Ring Road (Radius 4,200m connecting all 8 Biomes!)
    const outerShoulderGeo = new THREE.RingGeometry(4177.8, 4222.2, 180);
    outerShoulderGeo.rotateX(-Math.PI / 2);
    const outerShoulderMesh = new THREE.Mesh(outerShoulderGeo, roadShoulderCurbMat);
    outerShoulderMesh.position.y = 0.02;
    worldGroup.add(outerShoulderMesh);

    const outerRingGeo = new THREE.RingGeometry(4180, 4220, 180);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMesh = new THREE.Mesh(outerRingGeo, asphaltMat);
    outerRingMesh.position.y = 0.084;
    worldGroup.add(outerRingMesh);

    // Outer Perimeter Ring Highway (Radius 5,400m)
    const perimeterShoulderGeo = new THREE.RingGeometry(5378, 5422, 192);
    perimeterShoulderGeo.rotateX(-Math.PI / 2);
    const perimeterShoulderMesh = new THREE.Mesh(perimeterShoulderGeo, roadShoulderCurbMat);
    perimeterShoulderMesh.position.y = 0.021;
    worldGroup.add(perimeterShoulderMesh);

    const perimeterRingGeo = new THREE.RingGeometry(5380, 5420, 192);
    perimeterRingGeo.rotateX(-Math.PI / 2);
    const perimeterRingMesh = new THREE.Mesh(perimeterRingGeo, asphaltMat);
    perimeterRingMesh.position.y = 0.085;
    worldGroup.add(perimeterRingMesh);

    // ============================================================================
    // 2B. HUNDREDS OF INTERSECTING ROADS: 96 MAJOR BOULEVARDS, 80 SMALL STREETS, FLYOVERS & RIVER QUAYS
    // ============================================================================
    const boulevardMat = new THREE.MeshStandardMaterial({
      color: 0x151c28,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const smallStreetMat = new THREE.MeshStandardMaterial({
      color: 0x192130,
      roughness: 0.9,
      metalness: 0.02,
      envMapIntensity: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const yellowCenterLineMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    });

    // 48 North-South & 48 East-West Major Boulevards (Width 20m, Length 11,800m each)
    const nsBoulevardShoulderGeo = new THREE.PlaneGeometry(22.4, 11800, 1, 96);
    nsBoulevardShoulderGeo.rotateX(-Math.PI / 2);
    const ewBoulevardShoulderGeo = new THREE.PlaneGeometry(11800, 22.4, 96, 1);
    ewBoulevardShoulderGeo.rotateX(-Math.PI / 2);

    const nsBoulevardGeo = new THREE.PlaneGeometry(20, 11800, 1, 96);
    nsBoulevardGeo.rotateX(-Math.PI / 2);
    const ewBoulevardGeo = new THREE.PlaneGeometry(11800, 20, 96, 1);
    ewBoulevardGeo.rotateX(-Math.PI / 2);

    const nsCenterStripeGeo = new THREE.PlaneGeometry(0.28, 11800, 1, 96);
    nsCenterStripeGeo.rotateX(-Math.PI / 2);
    const ewCenterStripeGeo = new THREE.PlaneGeometry(11800, 0.28, 96, 1);
    ewCenterStripeGeo.rotateX(-Math.PI / 2);

    // Helper to add ground-level boulevard segments while COMPLETELY REMOVING the ground road underneath any Elevated Highway Flyover!
    const addSplitBoulevard = (axis: 'x' | 'z', fixedCoord: number) => {
      const matchingFlyovers = WORLD_ELEVATED_FLYOVERS.filter(
        (f) => f.axis === axis && f.fixedCoord === fixedCoord
      ).sort((a, b) => a.startCoord - b.startCoord);

      const spans: [number, number][] = [];
      let cursor = -5900;
      for (let i = 0; i < matchingFlyovers.length; i++) {
        const f = matchingFlyovers[i];
        const gapStart = f.startCoord + 8;
        const gapEnd = f.endCoord - 8;
        if (gapStart > cursor) {
          spans.push([cursor, gapStart]);
        }
        cursor = Math.max(cursor, gapEnd);
      }
      if (cursor < 5900) {
        spans.push([cursor, 5900]);
      }

      spans.forEach(([s0, s1]) => {
        const len = s1 - s0;
        if (len <= 10) return;
        const mid = (s0 + s1) * 0.5;

        if (axis === 'z') {
          // Runs North-South along x = fixedCoord from z = s0 to z = s1
          const shGeo = new THREE.PlaneGeometry(22.4, len, 1, 16);
          shGeo.rotateX(-Math.PI / 2);
          const rdGeo = new THREE.PlaneGeometry(20, len, 1, 16);
          rdGeo.rotateX(-Math.PI / 2);
          const stGeo = new THREE.PlaneGeometry(0.28, len, 1, 16);
          stGeo.rotateX(-Math.PI / 2);

          const nsShoulder = new THREE.Mesh(shGeo, roadShoulderCurbMat);
          nsShoulder.position.set(fixedCoord, 0.011, mid);
          const nsRoad = new THREE.Mesh(rdGeo, boulevardMat);
          nsRoad.position.set(fixedCoord, 0.058, mid);
          const nsStripe = new THREE.Mesh(stGeo, yellowCenterLineMat);
          nsStripe.position.set(fixedCoord, 0.088, mid);
          worldGroup.add(nsShoulder, nsRoad, nsStripe);
        } else {
          // Runs East-West along z = fixedCoord from x = s0 to x = s1
          const shGeo = new THREE.PlaneGeometry(len, 22.4, 16, 1);
          shGeo.rotateX(-Math.PI / 2);
          const rdGeo = new THREE.PlaneGeometry(len, 20, 16, 1);
          rdGeo.rotateX(-Math.PI / 2);
          const stGeo = new THREE.PlaneGeometry(len, 0.28, 16, 1);
          stGeo.rotateX(-Math.PI / 2);

          const ewShoulder = new THREE.Mesh(shGeo, roadShoulderCurbMat);
          ewShoulder.position.set(mid, 0.012, fixedCoord);
          const ewRoad = new THREE.Mesh(rdGeo, boulevardMat);
          ewRoad.position.set(mid, 0.06, fixedCoord);
          const ewStripe = new THREE.Mesh(stGeo, yellowCenterLineMat);
          ewStripe.position.set(mid, 0.09, fixedCoord);
          worldGroup.add(ewShoulder, ewRoad, ewStripe);
        }
      });
    };

    MAJOR_GRID_COORDS.forEach((coord) => {
      addSplitBoulevard('z', coord);
      addSplitBoulevard('x', coord);
    });

    // 40 North-South & 40 East-West Small Urban & Country Side Streets (Width 13m, Length 9,800m each)
    const nsSmallShoulderGeo = new THREE.PlaneGeometry(14.6, 9800, 1, 64);
    nsSmallShoulderGeo.rotateX(-Math.PI / 2);
    const ewSmallShoulderGeo = new THREE.PlaneGeometry(9800, 14.6, 64, 1);
    ewSmallShoulderGeo.rotateX(-Math.PI / 2);

    const nsSmallGeo = new THREE.PlaneGeometry(13, 9800, 1, 64);
    nsSmallGeo.rotateX(-Math.PI / 2);
    const ewSmallGeo = new THREE.PlaneGeometry(9800, 13, 64, 1);
    ewSmallGeo.rotateX(-Math.PI / 2);

    SMALL_STREET_COORDS.forEach((coord) => {
      const nsSmallShoulder = new THREE.Mesh(nsSmallShoulderGeo, roadShoulderCurbMat);
      nsSmallShoulder.position.set(coord, 0.009, 0);
      const nsSmall = new THREE.Mesh(nsSmallGeo, smallStreetMat);
      nsSmall.position.set(coord, 0.052, 0);
      worldGroup.add(nsSmallShoulder, nsSmall);

      const ewSmallShoulder = new THREE.Mesh(ewSmallShoulderGeo, roadShoulderCurbMat);
      ewSmallShoulder.position.set(0, 0.01, coord);
      const ewSmall = new THREE.Mesh(ewSmallGeo, smallStreetMat);
      ewSmall.position.set(0, 0.054, coord);
      worldGroup.add(ewSmallShoulder, ewSmall);
    });

    // 2B-Extra. DENSE WESTERN FOREST SMALL ROADS & WOODLAND LANES (Filling x ∈ [-5800, -600], z ∈ [-3800, 3800])
    const forestNsShoulderGeo = new THREE.PlaneGeometry(13.6, 7600, 1, 32);
    forestNsShoulderGeo.rotateX(-Math.PI / 2);
    const forestNsRoadGeo = new THREE.PlaneGeometry(12, 7600, 1, 32);
    forestNsRoadGeo.rotateX(-Math.PI / 2);

    FOREST_SMALL_ROAD_X_COORDS.forEach((fx) => {
      const sh = new THREE.Mesh(forestNsShoulderGeo, roadShoulderCurbMat);
      sh.position.set(fx, 0.009, 0);
      const rd = new THREE.Mesh(forestNsRoadGeo, smallStreetMat);
      rd.position.set(fx, 0.051, 0);
      worldGroup.add(sh, rd);
    });

    const forestEwShoulderGeo = new THREE.PlaneGeometry(5200, 13.6, 32, 1);
    forestEwShoulderGeo.rotateX(-Math.PI / 2);
    const forestEwRoadGeo = new THREE.PlaneGeometry(5200, 12, 32, 1);
    forestEwRoadGeo.rotateX(-Math.PI / 2);

    FOREST_SMALL_ROAD_Z_COORDS.forEach((fz) => {
      const sh = new THREE.Mesh(forestEwShoulderGeo, roadShoulderCurbMat);
      sh.position.set(-3200, 0.01, fz);
      const rd = new THREE.Mesh(forestEwRoadGeo, smallStreetMat);
      rd.position.set(-3200, 0.053, fz);
      worldGroup.add(sh, rd);
    });

    // 2C. 8 ELEVATED HIGHWAY FLYOVERS & VIADUCTS (Strictly Outside Crowded Main City Center!)
    const flyoverConcreteMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.72,
      metalness: 0.15,
    });
    const flyoverRailGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });

    WORLD_ELEVATED_FLYOVERS.forEach((f) => {
      const flyGroup = new THREE.Group();
      const totalLen = f.endCoord - f.startCoord;
      const segCount = 44;
      const segLen = totalLen / segCount;
      const deckWidth = f.halfWidth * 2;

      for (let s = 0; s < segCount; s++) {
        const c0 = f.startCoord + s * segLen;
        const c1 = c0 + segLen;
        const cMid = (c0 + c1) * 0.5;

        const evalH = (c: number) => {
          const dEdge = Math.min(c - f.startCoord, f.endCoord - c);
          const rt = Math.max(0, Math.min(1, dEdge / f.rampLength));
          return f.deckHeight * (0.5 - 0.5 * Math.cos(rt * Math.PI));
        };

        const h0 = evalH(c0);
        const h1 = evalH(c1);
        const hMid = (h0 + h1) * 0.5;
        const slopeAngle = Math.atan2(h1 - h0, segLen);
        const pitchedSegLen = Math.hypot(segLen, h1 - h0) + 0.35;

        const segGroup = new THREE.Group();
        if (f.axis === 'x') {
          segGroup.position.set(cMid, hMid, f.fixedCoord);
          segGroup.rotation.z = slopeAngle;
        } else {
          segGroup.position.set(f.fixedCoord, hMid, cMid);
          segGroup.rotation.x = -slopeAngle;
        }

        // Elevated concrete deck beam + dark asphalt surface + side guardrails
        const deckBeamGeo =
          f.axis === 'x'
            ? new THREE.BoxGeometry(pitchedSegLen, 0.75, deckWidth + 1.4)
            : new THREE.BoxGeometry(deckWidth + 1.4, 0.75, pitchedSegLen);
        const deckBeam = new THREE.Mesh(deckBeamGeo, flyoverConcreteMat);
        deckBeam.position.y = -0.36;
        segGroup.add(deckBeam);

        const deckAsphaltGeo =
          f.axis === 'x'
            ? new THREE.PlaneGeometry(pitchedSegLen, deckWidth)
            : new THREE.PlaneGeometry(deckWidth, pitchedSegLen);
        deckAsphaltGeo.rotateX(-Math.PI / 2);
        const deckAsphalt = new THREE.Mesh(deckAsphaltGeo, asphaltMat);
        deckAsphalt.position.y = 0.04;
        segGroup.add(deckAsphalt);

        // Twin side safety parapet barriers with cyan LED strip
        [-f.halfWidth - 0.35, f.halfWidth + 0.35].forEach((latOff) => {
          const wallGeo =
            f.axis === 'x'
              ? new THREE.BoxGeometry(pitchedSegLen, 1.15, 0.55)
              : new THREE.BoxGeometry(0.55, 1.15, pitchedSegLen);
          const wallMesh = new THREE.Mesh(wallGeo, flyoverConcreteMat);
          if (f.axis === 'x') {
            wallMesh.position.set(0, 0.55, latOff);
          } else {
            wallMesh.position.set(latOff, 0.55, 0);
          }
          segGroup.add(wallMesh);

          const ledGeo =
            f.axis === 'x'
              ? new THREE.BoxGeometry(pitchedSegLen, 0.16, 0.62)
              : new THREE.BoxGeometry(0.62, 0.16, pitchedSegLen);
          const ledMesh = new THREE.Mesh(ledGeo, flyoverRailGlowMat);
          if (f.axis === 'x') {
            ledMesh.position.set(0, 1.16, latOff);
          } else {
            ledMesh.position.set(latOff, 1.16, 0);
          }
          segGroup.add(ledMesh);
        });

        flyGroup.add(segGroup);

        // Concrete support columns under high deck segments (placed along outer edges clear of cross-streets)
        if (hMid > 3.2 && s % 3 === 1) {
          [-f.halfWidth + 1.8, f.halfWidth - 1.8].forEach((pierLat) => {
            const px = f.axis === 'x' ? cMid : f.fixedCoord + pierLat;
            const pz = f.axis === 'x' ? f.fixedCoord + pierLat : cMid;
            const pierMesh = new THREE.Mesh(
              new THREE.CylinderGeometry(1.1, 1.35, hMid, 10),
              flyoverConcreteMat
            );
            pierMesh.position.set(px, hMid * 0.5 - 0.35, pz);
            flyGroup.add(pierMesh);
          });
        }
      }

      worldGroup.add(flyGroup);
    });

    // Crisp Parisian Boulevard & Highway Lane Markings across N-S & E-W Arterials
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    });
    const dashGeo = new THREE.PlaneGeometry(0.35, 8.0);
    dashGeo.rotateX(-Math.PI / 2);
    const dashGeoEW = new THREE.PlaneGeometry(8.0, 0.35);
    dashGeoEW.rotateX(-Math.PI / 2);
    for (let dPos = -3600; dPos <= 3600; dPos += 28) {
      if (Math.abs(dPos) < 44) continue;
      const dashNS = new THREE.Mesh(dashGeo, stripeMat);
      dashNS.position.set(0, 0.092, dPos);
      const dashEW = new THREE.Mesh(dashGeoEW, stripeMat);
      dashEW.position.set(dPos, 0.092, 0);
      worldGroup.add(dashNS, dashEW);
    }

    // 3. LANDMARK 1: THE GRAND ARC DE TRIOMPHE AT PLACE DE L'ÉTOILE (0, 0)
    const arcDeTriomphe = buildArcDeTriomphe();
    arcDeTriomphe.position.set(0, 0, 0);
    worldGroup.add(arcDeTriomphe);

    // 4. LANDMARK 2: THE ICONIC TOUR EIFFEL (EIFFEL TOWER) ON CHAMP DE MARS LAWN (-245, 245) — 100% CLEAR OF RIVER & ALL STREETS!
    const eiffelTower = buildEiffelTower();
    eiffelTower.position.set(-245, 0, 245);
    worldGroup.add(eiffelTower);

    // 5. LANDMARK 3: THE LOUVRE PALACE & ILLUMINATED GLASS PYRAMID AT (245, -245) — CLEAR OF ALL BOULEVARDS & STREETS!
    const louvreGroup = new THREE.Group();
    louvreGroup.position.set(245, 0, -245);
    const pyramidGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      metalness: 0.25,
      roughness: 0.08,
      transparent: true,
      opacity: 0.78,
    });
    const pyramidGeo = new THREE.ConeGeometry(22, 21, 4);
    pyramidGeo.rotateY(Math.PI / 4);
    const louvrePyramid = new THREE.Mesh(pyramidGeo, pyramidGlassMat);
    louvrePyramid.position.y = 10.5;
    louvreGroup.add(louvrePyramid);

    // Classical Louvre Palace Wings flanking the courtyard (sized to stay strictly inside the plaza block)
    const louvreWingNorth = buildHaussmannBlock(44, 16, 12);
    louvreWingNorth.position.set(0, 0, -26);
    const louvreWingEast = buildHaussmannBlock(12, 16, 44);
    louvreWingEast.position.set(26, 0, 0);
    louvreGroup.add(louvreWingNorth, louvreWingEast);
    worldGroup.add(louvreGroup);

    // 6. LANDMARK 4: PLACE DE LA CONCORDE LUXOR OBELISK AT (-48, 245) — CLEAR OF RING ROAD & STREETS!
    const concordeGroup = new THREE.Group();
    concordeGroup.position.set(-48, 0, 245);
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0xd6cbb9, roughness: 0.65 });
    const goldTipMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.3,
      metalness: 0.9,
      roughness: 0.15,
    });
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(5.5, 6, 5.5), pedestalMat);
    pedestal.position.y = 3;
    const obeliskShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 23, 4), pedestalMat);
    obeliskShaft.position.y = 17.5;
    const pyramidion = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.8, 4), goldTipMat);
    pyramidion.position.y = 30.2;
    concordeGroup.add(pedestal, obeliskShaft, pyramidion);
    worldGroup.add(concordeGroup);

    // 7. LANDMARK 5: MONTMARTRE HILL, SACRÉ-CŒUR BASILICA IN NW SECTOR (-245, -245) — CLEAR OF ALL BOULEVARDS & STREETS!
    const sacreCoeurGroup = new THREE.Group();
    const scGroundY = sampleWorldTerrain(-245, -245).heightY;
    sacreCoeurGroup.position.set(-245, scGroundY, -245);
    const whiteTravertineMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.55,
      metalness: 0.08,
    });
    const scBase = new THREE.Mesh(new THREE.BoxGeometry(34, 16, 26), whiteTravertineMat);
    scBase.position.y = 8;
    scBase.castShadow = true;
    const mainDome = new THREE.Mesh(
      new THREE.SphereGeometry(9.5, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      whiteTravertineMat
    );
    mainDome.position.y = 16;
    mainDome.scale.y = 1.45;
    sacreCoeurGroup.add(scBase, mainDome);
    [-11, 11].forEach((dx) => {
      const sideDome = new THREE.Mesh(
        new THREE.SphereGeometry(5.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        whiteTravertineMat
      );
      sideDome.position.set(dx, 16, 4);
      sideDome.scale.y = 1.35;
      sacreCoeurGroup.add(sideDome);
    });
    worldGroup.add(sacreCoeurGroup);

    // ============================================================================
    // 8. GRAND WINDING MAIN RIVER, SCENIC QUAYSIDE ROADS, ORNATE ARCH BRIDGES & OPEN FIELDS
    // ============================================================================
    const seineWaterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.14,
      metalness: 0.68,
      clearcoat: 0.95,
    });
    const stoneQuayMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.72,
      metalness: 0.1,
    });

    // Build continuous winding Grand Main River from North (z = -5800) through Paris to South (z = +5800)
    // along dedicated channel x ≈ 88m (between x=0 and x=180) so it NEVER touches the Eiffel Tower or any N-S road!
    const riverSegments = 580;
    const riverZMin = -5800;
    const riverZMax = 5800;
    const riverStepZ = (riverZMax - riverZMin) / riverSegments;
    const segWaterGeo = new THREE.PlaneGeometry(32, riverStepZ + 1.5);
    segWaterGeo.rotateX(-Math.PI / 2);
    const segQuayRoadGeo = new THREE.PlaneGeometry(10, riverStepZ + 1.5);
    segQuayRoadGeo.rotateX(-Math.PI / 2);
    const segQuayWallGeo = new THREE.BoxGeometry(2.0, 1.25, riverStepZ + 0.8);

    for (let s = 0; s < riverSegments; s++) {
      const z0 = riverZMin + s * riverStepZ;
      const z1 = z0 + riverStepZ;
      const zMid = (z0 + z1) * 0.5;
      const x0 = getMainRiverCenterX(z0);
      const x1 = getMainRiverCenterX(z1);
      const xMid = (x0 + x1) * 0.5;
      const yaw = Math.atan2(x1 - x0, z1 - z0);

      const waterSeg = new THREE.Mesh(segWaterGeo, seineWaterMat);
      waterSeg.position.set(xMid, 0.018, zMid);
      waterSeg.rotation.y = yaw;
      worldGroup.add(waterSeg);

      // Leave full embankment wall openings at every 49m-wide Bridge crossing (including half-segment length!)
      // so river walls NEVER poke across any bridge deck!
      const isAtBridge = RIVER_BRIDGE_Z_COORDS.some(
        (bz) => Math.abs(zMid - bz) < 24.5 + riverStepZ * 0.5
      );

      // Left & Right Stone Embankments + Riverbank Quayside Small Roads
      [-1, 1].forEach((bankSide) => {
        if (!isAtBridge) {
          const wall = new THREE.Mesh(segQuayWallGeo, stoneQuayMat);
          wall.position.set(xMid + bankSide * 17.5, 0.5, zMid);
          wall.rotation.y = yaw;
          worldGroup.add(wall);
        }

        if (Math.abs(zMid) < 4800) {
          const quayRoad = new THREE.Mesh(segQuayRoadGeo, smallStreetMat);
          quayRoad.position.set(xMid + bankSide * 27, 0.031, zMid);
          quayRoad.rotation.y = yaw;
          worldGroup.add(quayRoad);
        }
      });
    }

    // Ornate Stone & Golden-Iron Arch Bridges Carrying Every Road, Boulevard & Race Pathway Across the Main River
    // Widened to 49m (zOff = ±24.5m) and flush at y = 0.04m so full 35m–43m race pathways sit 100% ON the bridge deck!
    const bridgeDeckGeo = new THREE.BoxGeometry(48, 0.14, 49);
    const bridgeParapetGeo = new THREE.BoxGeometry(48, 1.35, 1.2);
    const bridgeArchRingGeo = new THREE.CylinderGeometry(16, 16, 46, 20, 1, true, 0, Math.PI);
    bridgeArchRingGeo.rotateX(Math.PI / 2);

    RIVER_BRIDGE_Z_COORDS.forEach((bz) => {
      const rx = getMainRiverCenterX(bz);
      const bGroup = new THREE.Group();
      bGroup.position.set(rx, 0, bz);

      // Flush bridge deck & underside stone vault
      const deck = new THREE.Mesh(bridgeDeckGeo, cobblestoneMat);
      deck.position.y = 0.035;
      const underArch = new THREE.Mesh(bridgeArchRingGeo, pedestalMat);
      underArch.position.y = -15.2;
      bGroup.add(deck, underArch);

      // North & South Stone Balustrade Parapets (at ±24.5m, completely clear of all race pathways!)
      [-24.5, 24.5].forEach((zOff) => {
        const parapet = new THREE.Mesh(bridgeParapetGeo, pedestalMat);
        parapet.position.set(0, 0.85, zOff);
        bGroup.add(parapet);
      });

      // 4 Ornate Golden Bridge Columns at the 4 corners of each bridge
      [-21, 21].forEach((xCorner) => {
        [-24.5, 24.5].forEach((zCorner) => {
          const pylon = new THREE.Mesh(new THREE.BoxGeometry(2.2, 10.5, 2.2), pedestalMat);
          pylon.position.set(xCorner, 5.25, zCorner);
          const goldOrb = new THREE.Mesh(new THREE.SphereGeometry(1.25, 8, 8), goldTipMat);
          goldOrb.position.set(xCorner, 11.4, zCorner);
          bGroup.add(pylon, goldOrb);
        });
      });

      worldGroup.add(bGroup);
    });

    // ============================================================================
    // 8B. SCENIC LITTLE OPEN FIELDS & PASTORAL MEADOWS WITH WILDFLOWERS
    // ============================================================================
    const meadowLawnMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.85,
      metalness: 0.04,
    });
    const wildflowerAmberMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.25,
      roughness: 0.75,
    });
    const wildflowerLavenderMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.25,
      roughness: 0.75,
    });

    [
      // Compact Central Paris Champ de Mars Lawn surrounding Tour Eiffel (-245, 245)
      { cx: -245, cz: 245, w: 64, d: 64, flowerMat: wildflowerAmberMat },
    ].forEach((field) => {
      const lawnGeo = new THREE.PlaneGeometry(field.w, field.d);
      lawnGeo.rotateX(-Math.PI / 2);
      const lawn = new THREE.Mesh(lawnGeo, meadowLawnMat);
      lawn.position.set(field.cx, 0.018, field.cz);
      worldGroup.add(lawn);

      // Decorative wildflower / lavender strips across the open field
      for (let r = -2; r <= 2; r++) {
        const stripGeo = new THREE.PlaneGeometry(field.w * 0.72, 4.5);
        stripGeo.rotateX(-Math.PI / 2);
        const strip = new THREE.Mesh(stripGeo, field.flowerMat);
        strip.position.set(field.cx, 0.024, field.cz + r * (field.d * 0.14));
        worldGroup.add(strip);
      }
    });

    // ============================================================================
    // 9. AESTHETIC 3D BUILDINGS EVERYWHERE ACROSS THE MAP (INSTANCED FOR 60FPS + ZERO ROAD OVERLAP)
    // ============================================================================
    const lampPostMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const lampGlobeMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfbbf24,
      emissiveIntensity: 2.2,
    });

    // Hero Haussmannian Parisian Apartment Blocks along Champs-Élysées (Placed at mid-block coordinates clear of all streets & river!)
    [-138, -48, 48, 138].forEach((zPos) => {
      [-48, 38].forEach((xSide) => {
        if (getRoadNetworkDistance(xSide, zPos).minDist < 28) return;
        const block = buildHaussmannBlock(20, 17, 26);
        block.position.set(xSide, 0, zPos);
        worldGroup.add(block);
      });
    });

    // High-Performance Instanced Architectural Rendering of all 700+ WORLD_PROCEDURAL_BUILDINGS (Locked 60 FPS!)
    // Uses High-End Reflective Glass Curtain-Wall & Stone Mullion Textures + Sloped Mansard/Pagoda Roof Tiles
    // + Stepped Setback Tiers & Brushed Metallic Podiums (Zero untextured blocky cubes!)
    const totalProcBuildings = WORLD_PROCEDURAL_BUILDINGS.length;
    if (totalProcBuildings > 0) {
      const { colorMap: bldgColorMap, roughnessMap: bldgRoughMap } =
        getHighEndBuildingFacadeTextures();
      const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
      // 4-sided sloped Mansard/Pyramidal hip roof geometry so roofs are sloped & architectural instead of flat cubes
      const slopedRoofGeo = new THREE.CylinderGeometry(0.36, 0.72, 1, 4);
      slopedRoofGeo.rotateY(Math.PI / 4);

      const bldgBodyMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: bldgColorMap,
        roughnessMap: bldgRoughMap,
        bumpMap: bldgRoughMap,
        bumpScale: 0.08,
        roughness: 0.24,
        metalness: 0.62,
        clearcoat: 0.85,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.9,
      });
      const bldgRoofMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: getSlateRoofTileTexture(),
        roughness: 0.36,
        metalness: 0.45,
      });
      const bldgPodiumMat = new THREE.MeshPhysicalMaterial({
        color: 0x1e293b,
        roughness: 0.18,
        metalness: 0.78,
        clearcoat: 0.9,
        envMapIntensity: 2.0,
      });

      const bodyInstanced = new THREE.InstancedMesh(unitBoxGeo, bldgBodyMat, totalProcBuildings);
      const setbackInstanced = new THREE.InstancedMesh(unitBoxGeo, bldgBodyMat, totalProcBuildings);
      const roofInstanced = new THREE.InstancedMesh(slopedRoofGeo, bldgRoofMat, totalProcBuildings);
      const podiumInstanced = new THREE.InstancedMesh(unitBoxGeo, bldgPodiumMat, totalProcBuildings);
      bodyInstanced.castShadow = false;
      bodyInstanced.receiveShadow = false;

      const dummy = new THREE.Object3D();
      const tempColor = new THREE.Color();

      for (let i = 0; i < totalProcBuildings; i++) {
        const b = WORLD_PROCEDURAL_BUILDINGS[i];
        const baseY = sampleWorldTerrain(b.x, b.z).heightY;

        // 1. Ground-Floor Brushed Metallic & Granite Podium Colonnade
        const podiumH = Math.min(4.2, b.height * 0.22);
        dummy.position.set(b.x, baseY + podiumH * 0.5, b.z);
        dummy.scale.set(b.width + 0.45, podiumH, b.depth + 0.45);
        dummy.updateMatrix();
        podiumInstanced.setMatrixAt(i, dummy.matrix);

        // 2. Main Architectural Glass & Stone Mullion Tower Facade
        const mainH = b.height * 0.82;
        dummy.position.set(b.x, baseY + mainH * 0.5, b.z);
        dummy.scale.set(b.width, mainH, b.depth);
        dummy.updateMatrix();
        bodyInstanced.setMatrixAt(i, dummy.matrix);
        tempColor.setHex(b.tintHex);
        bodyInstanced.setColorAt(i, tempColor);

        // 3. Recessed Upper Setback Tier (Eliminates single-box look with authentic stepped architecture!)
        const setbackH = b.height * 0.24;
        dummy.position.set(b.x, baseY + mainH + setbackH * 0.45, b.z);
        dummy.scale.set(b.width * 0.82, setbackH, b.depth * 0.82);
        dummy.updateMatrix();
        setbackInstanced.setMatrixAt(i, dummy.matrix);
        setbackInstanced.setColorAt(i, tempColor);

        // 4. Sloped Mansard / Pyramidal Slate-Tiled Crown Roof
        const roofH = b.style === 'skyscraper' ? 5.2 : 3.8;
        dummy.position.set(b.x, baseY + mainH + setbackH * 0.9 + roofH * 0.5, b.z);
        dummy.scale.set(b.width * 0.86, roofH, b.depth * 0.86);
        dummy.updateMatrix();
        roofInstanced.setMatrixAt(i, dummy.matrix);
        tempColor.setHex(b.roofHex);
        roofInstanced.setColorAt(i, tempColor);
      }

      bodyInstanced.instanceMatrix.needsUpdate = true;
      if (bodyInstanced.instanceColor) bodyInstanced.instanceColor.needsUpdate = true;
      setbackInstanced.instanceMatrix.needsUpdate = true;
      if (setbackInstanced.instanceColor) setbackInstanced.instanceColor.needsUpdate = true;
      roofInstanced.instanceMatrix.needsUpdate = true;
      if (roofInstanced.instanceColor) roofInstanced.instanceColor.needsUpdate = true;
      podiumInstanced.instanceMatrix.needsUpdate = true;

      worldGroup.add(podiumInstanced, bodyInstanced, setbackInstanced, roofInstanced);
    }

    // Parisian Streetlamps & Manicured Chestnut Trees lining Champs-Élysées (Filtered so none ever touch intersecting roads!)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2305, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });

    for (let z = -320; z <= 320; z += 36) {
      if (Math.abs(z) < 52) continue;
      [-21.5, 21.5].forEach((xLamp) => {
        if (getRoadNetworkDistance(xLamp, z).minDist >= 28) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 6.2, 8), lampPostMat);
          pole.position.set(xLamp, 3.1, z);
          const globe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), lampGlobeMat);
          globe.position.set(xLamp, 6.4, z);
          worldGroup.add(pole, globe);
        }

        const treeX = xLamp * 1.16;
        const treeZ = z + 18;
        if (getRoadNetworkDistance(treeX, treeZ).minDist >= 28) {
          const treeGroup = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.38, 4.5, 7), trunkMat);
          trunk.position.y = 2.25;
          const crown = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 10), foliageMat);
          crown.position.y = 5.6;
          crown.scale.y = 1.25;
          treeGroup.add(trunk, crown);
          treeGroup.position.set(treeX, 0, treeZ);
          worldGroup.add(treeGroup);
        }
      });
    }

    // Trees around the Boulevard Périphérique (Filtered against all roads and the Main River!)
    for (let i = 0; i < 84; i++) {
      const angle = (i / 84) * Math.PI * 2;
      const radius = i % 2 === 0 ? 236 : 294;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      if (getRoadNetworkDistance(tx, tz).minDist < 28) continue;
      if (Math.abs(tx - getMainRiverCenterX(tz)) < 42) continue;

      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 4.8, 7), trunkMat);
      trunk.position.y = 2.4;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(2.4, 5.8, 8), foliageMat);
      crown.position.y = 6.2;
      treeGroup.add(trunk, crown);
      const tSample = sampleWorldTerrain(tx, tz);
      treeGroup.position.set(tx, tSample.heightY, tz);
      worldGroup.add(treeGroup);
    }

    // Boulevard Périphérique Speed Trap Gate at (240, -160)
    const neonCyanMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.4,
    });
    const speedTrapGate = new THREE.Group();
    speedTrapGate.position.set(240, 0, -160);
    speedTrapGate.rotation.y = -Math.PI / 4;
    const trapPillarGeo = new THREE.CylinderGeometry(0.55, 0.55, 9.5, 12);
    const trapL = new THREE.Mesh(trapPillarGeo, neonCyanMat);
    trapL.position.set(-14, 4.75, 0);
    const trapR = trapL.clone();
    trapR.position.x = 14;
    speedTrapGate.add(trapL, trapR);
    worldGroup.add(speedTrapGate);

    // Bois de Boulogne Danger Jump Ramp at (-210, 210) & Champs-Élysées Stunt Ramp at (28, -95)
    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.4,
      roughness: 0.6,
    });
    const stuntRampGeo = new THREE.BoxGeometry(16, 3.8, 34);
    const stuntRamp = new THREE.Mesh(stuntRampGeo, rampMat);
    stuntRamp.position.set(28, 1.1, -98);
    stuntRamp.rotation.x = 0.11;
    worldGroup.add(stuntRamp);

    const bajaRampGeo = new THREE.BoxGeometry(24, 5.2, 36);
    const bajaRamp = new THREE.Mesh(bajaRampGeo, rampMat);
    bajaRamp.position.set(-210, 1.8, 210);
    bajaRamp.rotation.x = 0.14;
    worldGroup.add(bajaRamp);

    // ============================================================================
    // 10. 3D MOUNTAINS, DESERT PYRAMIDS, PEAKS & SURROUNDING BUILDINGS IN ALL 4 DIRECTIONS
    //     (NORTH MOUNTAINS, SOUTH DESERT & PYRAMIDS, EAST SKYSCRAPERS & RIVIERA, WEST PEAKS & VOLCANO)
    // ============================================================================
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      map: getAlpineSnowRockTexture(),
      roughness: 0.48,
      metalness: 0.08,
    });
    const granitePeakMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      map: getAlpineSnowRockTexture(),
      roughness: 0.78,
      metalness: 0.08,
    });
    const iceLakeMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      roughness: 0.08,
      metalness: 0.35,
      clearcoat: 1.0,
    });
    const redRockMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85, metalness: 0.05 });
    const sandPyramidMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.72, metalness: 0.12 });

    // Helper to build a Multi-Ridge Jagged Snow-Streaked Alpine Mountain Peak (Forza Horizon 6 Japanese Alps Style)
    const buildMountainPeak = (radius: number, height: number, isSnowy: boolean): THREE.Group => {
      const mGroup = new THREE.Group();
      const baseCone = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 9),
        isSnowy ? granitePeakMat : redRockMat
      );
      baseCone.position.y = height * 0.46;
      mGroup.add(baseCone);

      // Secondary Jagged Sub-Peak Shoulder Ridge for realistic Alpine silhouette
      const shoulderCone = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.64, height * 0.74, 8),
        isSnowy ? granitePeakMat : redRockMat
      );
      shoulderCone.position.set(radius * 0.28, height * 0.35, -radius * 0.18);
      shoulderCone.rotation.y = 0.7;
      mGroup.add(shoulderCone);

      const capCone = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.5, height * 0.5, 9),
        isSnowy ? snowMat : sandPyramidMat
      );
      capCone.position.y = height * 0.71;
      mGroup.add(capCone);
      return mGroup;
    };

    // Helper to build the Iconic 5-Tier Japanese Castle Keep (Himeji / Tenshu Castle from the Forza Horizon 6 image!)
    const castleStoneWallMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      map: getAlpineSnowRockTexture(),
      roughness: 0.78,
      metalness: 0.12,
    });
    const castleWhitePlasterMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.32,
      metalness: 0.08,
      clearcoat: 0.35,
    });
    const castleDarkTimberMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      map: getHighEndBuildingFacadeTextures().colorMap,
      roughness: 0.42,
      metalness: 0.45,
    });
    const castleSlateRoofMat = new THREE.MeshPhysicalMaterial({
      color: 0x242c3a,
      map: getSlateRoofTileTexture(),
      roughness: 0.28,
      metalness: 0.52,
      clearcoat: 0.6,
    });
    const buildJapaneseTenshuCastle = (scale = 1.0): THREE.Group => {
      const castleGroup = new THREE.Group();
      // 1. Battered Ishigaki Stone Rampart Foundation
      const stoneBase = new THREE.Mesh(
        new THREE.CylinderGeometry(16 * scale, 21 * scale, 11 * scale, 4),
        castleStoneWallMat
      );
      stoneBase.rotation.y = Math.PI / 4;
      stoneBase.position.y = 5.5 * scale;
      castleGroup.add(stoneBase);

      // 2. 5 Stacked White-Plaster Tenshu Tiers with Sweeping Upturned Slate Tiled Roofs & Gables
      let currY = 11 * scale;
      const tiers = [
        { w: 20, d: 18, h: 6.5, roofR: 17.5 },
        { w: 16.5, d: 15, h: 5.8, roofR: 14.8 },
        { w: 13.2, d: 12, h: 5.2, roofR: 12.0 },
        { w: 10.2, d: 9.5, h: 4.6, roofR: 9.4 },
        { w: 7.8, d: 7.4, h: 4.4, roofR: 7.5 },
      ];
      tiers.forEach((tier, tIdx) => {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(tier.w * scale, tier.h * scale, tier.d * scale),
          castleWhitePlasterMat
        );
        wall.position.y = currY + tier.h * 0.5 * scale;
        wall.castShadow = true;
        castleGroup.add(wall);

        // Dark Horizontal Timber Window Lattice Band
        const windowBand = new THREE.Mesh(
          new THREE.BoxGeometry((tier.w + 0.3) * scale, tier.h * 0.32 * scale, (tier.d + 0.3) * scale),
          castleDarkTimberMat
        );
        windowBand.position.y = currY + tier.h * 0.56 * scale;
        castleGroup.add(windowBand);

        // Sweeping 4-Sided Curved-Eave Pagoda Roof
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(tier.roofR * scale, 3.2 * scale, 4),
          castleSlateRoofMat
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.y = currY + (tier.h + 1.1) * scale;
        castleGroup.add(roof);

        // Chidori-hafū Triangular Decorative Gable Dormer on tiers 1, 2, 3
        if (tIdx <= 2) {
          const dormer = new THREE.Mesh(
            new THREE.ConeGeometry(3.4 * scale, 2.4 * scale, 3),
            castleSlateRoofMat
          );
          dormer.position.set(0, currY + (tier.h + 0.9) * scale, (tier.d * 0.52) * scale);
          castleGroup.add(dormer);
        }

        currY += (tier.h + 0.45) * scale;
      });

      // Top Roof Ridge & Golden Shachihoko Finials
      const topRidge = new THREE.Mesh(
        new THREE.BoxGeometry(4.2 * scale, 0.7 * scale, 0.8 * scale),
        goldTipMat
      );
      topRidge.position.y = currY + 2.2 * scale;
      castleGroup.add(topRidge);
      return castleGroup;
    };

    // Place Iconic 5-Tier Japanese Castle Keeps on Scenic Overlooks (100% clear of all roads & rivers!)
    const centralSakuraCastle = buildJapaneseTenshuCastle(1.05);
    centralSakuraCastle.position.set(-315, sampleWorldTerrain(-315, -270).heightY, -270);
    worldGroup.add(centralSakuraCastle);

    const northernHillCastle = buildJapaneseTenshuCastle(1.25);
    northernHillCastle.position.set(540, sampleWorldTerrain(540, -1150).heightY, -1150);
    worldGroup.add(northernHillCastle);

    // A. NORTH & NE DIRECTION: SNOWY ALPINE MOUNTAINS, PEAKS, SKI CHALETS & RESORT BUILDINGS
    const alpineLodge = buildHaussmannBlock(36, 18, 28);
    alpineLodge.position.set(3975, sampleWorldTerrain(3975, -4450).heightY, -4450);
    worldGroup.add(alpineLodge);

    const frozenLake = new THREE.Mesh(new THREE.CircleGeometry(380, 48), iceLakeMat);
    frozenLake.rotateX(-Math.PI / 2);
    frozenLake.position.set(4650, sampleWorldTerrain(4650, -3450).heightY + 0.08, -3450);
    worldGroup.add(frozenLake);

    // Towering Snow-Capped Mountain Peaks along North & NE (Synced 1:1 with WORLD_MOUNTAIN_PEAKS Solid Colliders!)
    WORLD_MOUNTAIN_PEAKS.forEach((mp) => {
      if (mp.kind === 'snow_peak' || mp.kind === 'cliff_peak') {
        const peak = buildMountainPeak(mp.radius, mp.height, mp.kind === 'snow_peak');
        peak.position.set(mp.x, sampleWorldTerrain(mp.x, mp.z).heightY, mp.z);
        worldGroup.add(peak);
      } else if (mp.kind === 'desert_mesa') {
        const mesa = new THREE.Mesh(
          new THREE.CylinderGeometry(mp.radius * 0.68, mp.radius, mp.height, 8),
          redRockMat
        );
        mesa.position.set(mp.x, sampleWorldTerrain(mp.x, mp.z).heightY + mp.height * 0.45, mp.z);
        worldGroup.add(mesa);
      }
    });

    // Surrounding Alpine Ski Chalets & Mountain Resort Buildings (Placed at mid-block coordinates clear of all roads & river!)
    [-1150, -2250, -2650, -3350, -3825, -4500].forEach((zNorth) => {
      [-68, 148].forEach((xSide) => {
        if (getRoadNetworkDistance(xSide, zNorth).minDist < 32) return;
        const chalet = buildHaussmannBlock(30, 16, 26);
        chalet.position.set(xSide, sampleWorldTerrain(xSide, zNorth).heightY, zNorth);
        worldGroup.add(chalet);
      });
    });

    // B. SOUTH & SW DIRECTION: SAHARA DESERT, GREAT GOLDEN PYRAMIDS, RED CANYON MESAS & OASIS KASBAHS
    const archPierGeo = new THREE.BoxGeometry(18, 48, 18);
    const archL = new THREE.Mesh(archPierGeo, redRockMat);
    archL.position.set(-3995, 24, 4450);
    const archR = new THREE.Mesh(archPierGeo, redRockMat);
    archR.position.set(-3955, 24, 4450);
    const archSpan = new THREE.Mesh(new THREE.BoxGeometry(75, 14, 22), redRockMat);
    archSpan.position.set(-3975, 52, 4450);
    worldGroup.add(archL, archR, archSpan);

    // 3 Monumental Golden-Capped Desert Pyramids in South & SW Desert (Positioned clear of all roads & race pathways!)
    [
      [-540, 1250, 31, 64],
      [540, 2250, 31, 72],
      [-2950, 3250, 31, 80],
    ].forEach(([px, pz, pRad, pHeight]) => {
      const pyrGroup = new THREE.Group();
      const baseY = sampleWorldTerrain(px, pz).heightY;
      const bodyGeo = new THREE.ConeGeometry(pRad, pHeight, 4);
      bodyGeo.rotateY(Math.PI / 4);
      const bodyMesh = new THREE.Mesh(bodyGeo, sandPyramidMat);
      bodyMesh.position.y = pHeight * 0.5;
      bodyMesh.castShadow = true;

      const capGeo = new THREE.ConeGeometry(pRad * 0.24, pHeight * 0.24, 4);
      capGeo.rotateY(Math.PI / 4);
      const capMesh = new THREE.Mesh(capGeo, goldTipMat);
      capMesh.position.y = pHeight * 0.89;
      pyrGroup.add(bodyMesh, capMesh);
      pyrGroup.position.set(px, baseY, pz);
      worldGroup.add(pyrGroup);
    });

    // Surrounding Desert Adobe Kasbah Fortresses & Oasis Town Buildings (Mid-block coordinates clear of all roads & river!)
    const kasbahMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.82, metalness: 0.06 });
    [1150, 2250, 2650, 3350, 3825].forEach((zSouth) => {
      [-68, 148].forEach((xSide) => {
        if (getRoadNetworkDistance(xSide, zSouth).minDist < 32) return;
        const kasbahGroup = new THREE.Group();
        const kMain = new THREE.Mesh(new THREE.BoxGeometry(32, 18, 28), kasbahMat);
        kMain.position.y = 9;
        const kTower = new THREE.Mesh(new THREE.BoxGeometry(12, 28, 12), redRockMat);
        kTower.position.set(xSide > 0 ? -8 : 8, 14, -6);
        const kDome = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 12), goldTipMat);
        kDome.position.y = 19;
        kasbahGroup.add(kMain, kTower, kDome);
        kasbahGroup.position.set(xSide, sampleWorldTerrain(xSide, zSouth).heightY, zSouth);
        worldGroup.add(kasbahGroup);
      });
    });

    // C. EAST & SE DIRECTION: SKYSCRAPER METROPOLIS, AUTOBAHN MEGAPORT & MEDITERRANEAN RIVIERA
    const azureSeaMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.12,
      metalness: 0.55,
      clearcoat: 0.9,
    });
    const rivieraBay = new THREE.Mesh(new THREE.CircleGeometry(650, 48), azureSeaMat);
    rivieraBay.rotateX(-Math.PI / 2);
    rivieraBay.position.set(5200, 0.2, 4650);
    worldGroup.add(rivieraBay);

    const casinoHotel = buildHaussmannBlock(44, 24, 28);
    casinoHotel.position.set(3975, sampleWorldTerrain(3975, 4450).heightY, 4450);
    worldGroup.add(casinoHotel);

    // Towering Glass Skyscrapers & Financial Towers along the East Corridor (Mid-block coordinates clear of all grid roads!)
    const { colorMap: towerFacadeMap, roughnessMap: towerRoughMap } =
      getHighEndBuildingFacadeTextures();
    const skyscraperGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      map: towerFacadeMap,
      roughnessMap: towerRoughMap,
      metalness: 0.85,
      roughness: 0.12,
      clearcoat: 1.0,
      envMapIntensity: 2.4,
    });
    [1150, 2250, 2650, 3350, 3825].forEach((xEast, idx) => {
      [-68, 68].forEach((zSide) => {
        if (getRoadNetworkDistance(xEast, zSide).minDist < 32) return;
        const towerH = 52 + (idx % 3) * 18;
        const towerGroup = new THREE.Group();
        const core = new THREE.Mesh(new THREE.BoxGeometry(34, towerH * 0.78, 34), skyscraperGlassMat);
        core.position.y = towerH * 0.39;
        const upperTier = new THREE.Mesh(
          new THREE.BoxGeometry(26, towerH * 0.28, 26),
          skyscraperGlassMat
        );
        upperTier.position.y = towerH * 0.88;
        const crown = new THREE.Mesh(new THREE.BoxGeometry(28, 2.2, 28), goldTipMat);
        crown.position.y = towerH * 1.02 + 1.1;
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.2, 18, 8), goldTipMat);
        spire.position.y = towerH * 1.02 + 10;
        towerGroup.add(core, upperTier, crown, spire);
        towerGroup.position.set(xEast, sampleWorldTerrain(xEast, zSide).heightY, zSide);
        worldGroup.add(towerGroup);
      });
    });

    // D. WEST & NW DIRECTION: WESTERN MOUNTAIN PEAKS, VOLCANIC CALDERA, REDWOODS & RANGER LODGES
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.9, metalness: 0.12 });
    const magmaMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 2.5,
      roughness: 0.3,
    });
    const volcanoCone = new THREE.Mesh(new THREE.CylinderGeometry(120, 260, 175, 16, 1, true), basaltMat);
    volcanoCone.position.set(-5150, 82, -5150);
    const lavaLake = new THREE.Mesh(new THREE.CircleGeometry(115, 24), magmaMat);
    lavaLake.rotateX(-Math.PI / 2);
    lavaLake.position.set(-5150, 145, -5150);
    const observatoryDome = new THREE.Mesh(new THREE.SphereGeometry(16, 20, 16), whiteTravertineMat);
    observatoryDome.position.set(-3975, sampleWorldTerrain(-3975, -4450).heightY + 8, -4450);
    worldGroup.add(volcanoCone, lavaLake, observatoryDome);

    // Surrounding Western Timber Ranger Lodges & Mountain Outpost Buildings (Mid-block coordinates clear of all grid roads!)
    [-1150, -2250, -2650, -3350, -3825].forEach((xWest) => {
      [-68, 68].forEach((zSide) => {
        if (getRoadNetworkDistance(xWest, zSide).minDist < 32) return;
        const lodge = buildHaussmannBlock(30, 15, 26);
        lodge.position.set(xWest, sampleWorldTerrain(xWest, zSide).heightY, zSide);
        worldGroup.add(lodge);
      });
    });

    // E. 1,250+ DENSE SEQUOIA REDWOOD & EMERALD FOREST TREES FILLING THE WESTERN FOREST BIOME (Instanced for 60FPS!)
    const redwoodTrunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const deepForestCrownMat = new THREE.MeshStandardMaterial({
      color: 0x065f46,
      roughness: 0.85,
      metalness: 0.05,
    });
    if (WORLD_REDWOOD_TREES.length > 0) {
      const rwTrunkGeo = new THREE.CylinderGeometry(1.5, 2.5, 36, 7);
      const rwLowerCanopyGeo = new THREE.ConeGeometry(12.5, 34, 7);
      const rwUpperCrownGeo = new THREE.ConeGeometry(9.2, 30, 7);

      const trunkInst = new THREE.InstancedMesh(
        rwTrunkGeo,
        redwoodTrunkMat,
        WORLD_REDWOOD_TREES.length
      );
      const lowerCanopyInst = new THREE.InstancedMesh(
        rwLowerCanopyGeo,
        foliageMat,
        WORLD_REDWOOD_TREES.length
      );
      const upperCrownInst = new THREE.InstancedMesh(
        rwUpperCrownGeo,
        deepForestCrownMat,
        WORLD_REDWOOD_TREES.length
      );

      const treeDummy = new THREE.Object3D();
      for (let i = 0; i < WORLD_REDWOOD_TREES.length; i++) {
        const rw = WORLD_REDWOOD_TREES[i];
        const s = rw.scale || 1.0;
        const baseY = sampleWorldTerrain(rw.x, rw.z).heightY;

        treeDummy.position.set(rw.x, baseY + 18 * s, rw.z);
        treeDummy.rotation.set(0, (i * 1.37) % (Math.PI * 2), 0);
        treeDummy.scale.set(s, s, s);
        treeDummy.updateMatrix();
        trunkInst.setMatrixAt(i, treeDummy.matrix);

        treeDummy.position.set(rw.x, baseY + 34 * s, rw.z);
        treeDummy.updateMatrix();
        lowerCanopyInst.setMatrixAt(i, treeDummy.matrix);

        treeDummy.position.set(rw.x, baseY + 50 * s, rw.z);
        treeDummy.updateMatrix();
        upperCrownInst.setMatrixAt(i, treeDummy.matrix);
      }

      trunkInst.instanceMatrix.needsUpdate = true;
      lowerCanopyInst.instanceMatrix.needsUpdate = true;
      upperCrownInst.instanceMatrix.needsUpdate = true;
      worldGroup.add(trunkInst, lowerCanopyInst, upperCrownInst);
    }

    // E2. FORZA HORIZON 6 PINK SAKURA CHERRY BLOSSOM GROVES & FLOWERING ROADSIDE AZALEA SHRUBS (100% GPU-Instanced, Zero Lag!)
    const sakuraPositions: { x: number; z: number; scale: number; tintHex: number }[] = [];
    const shrubPositions: { x: number; z: number; scale: number; hasPinkFlowers: boolean }[] = [];
    const sakuraPalette = [0xfbcfe8, 0xf9a8d4, 0xf472b6, 0xfce7f3];

    // 1. Dense Pink Sakura Groves surrounding the two Japanese Tenshu Castles & Central Scenic Hillsides
    const addSakuraIfClear = (sx: number, sz: number, sScale: number, idxSeed: number) => {
      const roadDist = getRoadNetworkDistance(sx, sz).minDist;
      if (roadDist < 24.5) return;
      if (Math.abs(sx - getMainRiverCenterX(sz)) < 42) return;
      if (Math.hypot(sx - -315, sz - -270) < 25) return;
      if (Math.hypot(sx - 540, sz - -1150) < 30) return;
      sakuraPositions.push({
        x: sx,
        z: sz,
        scale: sScale,
        tintHex: sakuraPalette[idxSeed % sakuraPalette.length],
      });
    };

    // Surround the Japanese Castle Keeps with lush pink Sakura trees (just like the reference image!)
    [
      [-315, -270, 32, 165],
      [540, -1150, 38, 220],
    ].forEach(([cx, cz, innerR, outerR], cIdx) => {
      for (let i = 0; i < 160; i++) {
        const angle = i * 2.39996;
        const r = innerR + ((i * 17) % (outerR - innerR));
        const sx = cx + Math.cos(angle) * r;
        const sz = cz + Math.sin(angle) * r;
        const sScale = 0.85 + ((i % 7) * 0.14);
        addSakuraIfClear(sx, sz, sScale, i + cIdx);
      }
    });

    // Line the Scenic Boulevards, Hillsides, and Avenues with Pink Sakura Trees & Roadside Green/Pink Flowering Shrubs
    for (let gx = -2400; gx <= 2400; gx += 110) {
      for (let gz = -2400; gz <= 2400; gz += 110) {
        const h1 = Math.sin(gx * 19.13 + gz * 47.71) * 43758.5453;
        const jx = (h1 - Math.floor(h1) - 0.5) * 64;
        const jz = (Math.cos(gx * 31.7 + gz * 13.9) * 0.5) * 64;
        const sx = Math.round(gx + jx);
        const sz = Math.round(gz + jz);
        const roadDist = getRoadNetworkDistance(sx, sz).minDist;

        // Place Sakura trees along road verges (25m..54m from road center) clear of all race pathways!
        if (roadDist >= 25 && roadDist <= 54) {
          addSakuraIfClear(sx, sz, 0.82 + (Math.abs(gx + gz) % 5) * 0.15, Math.abs(gx + gz));
        }

        // Place lush green & pink-flowering Azalea bushes along the outer roadside verge (23.5m..32m from road center)
        if (roadDist >= 23.5 && roadDist <= 32 && Math.abs(sx - getMainRiverCenterX(sz)) >= 42) {
          shrubPositions.push({
            x: sx,
            z: sz,
            scale: 0.85 + (Math.abs(gx * 3 + gz) % 5) * 0.18,
            hasPinkFlowers: (Math.abs(gx + gz) % 3) !== 0,
          });
        }
      }
    }

    if (sakuraPositions.length > 0) {
      const sakuraBarkMat = new THREE.MeshStandardMaterial({ color: 0x3b2328, roughness: 0.92 });
      const sakuraBlossomMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: getSakuraCanopyTexture(),
        roughness: 0.68,
        metalness: 0.02,
      });

      const sTrunkGeo = new THREE.CylinderGeometry(0.32, 0.54, 5.4, 7);
      const sCanopyMainGeo = new THREE.SphereGeometry(4.4, 10, 8);
      sCanopyMainGeo.scale(1.35, 0.78, 1.35);
      const sCanopySubGeo = new THREE.SphereGeometry(3.2, 9, 7);
      sCanopySubGeo.scale(1.25, 0.72, 1.25);

      const sTrunkInst = new THREE.InstancedMesh(sTrunkGeo, sakuraBarkMat, sakuraPositions.length);
      const sMainInst = new THREE.InstancedMesh(
        sCanopyMainGeo,
        sakuraBlossomMat,
        sakuraPositions.length
      );
      const sLeftLobeInst = new THREE.InstancedMesh(
        sCanopySubGeo,
        sakuraBlossomMat,
        sakuraPositions.length
      );
      const sRightLobeInst = new THREE.InstancedMesh(
        sCanopySubGeo,
        sakuraBlossomMat,
        sakuraPositions.length
      );

      const sDummy = new THREE.Object3D();
      const sCol = new THREE.Color();
      for (let i = 0; i < sakuraPositions.length; i++) {
        const sp = sakuraPositions[i];
        const by = sampleWorldTerrain(sp.x, sp.z).heightY;
        const sc = sp.scale;
        const rotY = (i * 1.618) % (Math.PI * 2);

        sDummy.position.set(sp.x, by + 2.6 * sc, sp.z);
        sDummy.rotation.set(0.06, rotY, -0.04);
        sDummy.scale.set(sc, sc, sc);
        sDummy.updateMatrix();
        sTrunkInst.setMatrixAt(i, sDummy.matrix);

        sDummy.position.set(sp.x, by + 6.2 * sc, sp.z);
        sDummy.rotation.set(0, rotY, 0);
        sDummy.updateMatrix();
        sMainInst.setMatrixAt(i, sDummy.matrix);

        sDummy.position.set(
          sp.x + Math.cos(rotY) * 2.6 * sc,
          by + 5.3 * sc,
          sp.z + Math.sin(rotY) * 2.6 * sc
        );
        sDummy.updateMatrix();
        sLeftLobeInst.setMatrixAt(i, sDummy.matrix);

        sDummy.position.set(
          sp.x - Math.cos(rotY + 0.7) * 2.5 * sc,
          by + 5.6 * sc,
          sp.z - Math.sin(rotY + 0.7) * 2.5 * sc
        );
        sDummy.updateMatrix();
        sRightLobeInst.setMatrixAt(i, sDummy.matrix);

        sCol.setHex(sp.tintHex);
        sMainInst.setColorAt(i, sCol);
        sLeftLobeInst.setColorAt(i, sCol);
        sRightLobeInst.setColorAt(i, sCol);
      }

      sTrunkInst.instanceMatrix.needsUpdate = true;
      sMainInst.instanceMatrix.needsUpdate = true;
      sLeftLobeInst.instanceMatrix.needsUpdate = true;
      sRightLobeInst.instanceMatrix.needsUpdate = true;
      if (sMainInst.instanceColor) sMainInst.instanceColor.needsUpdate = true;
      if (sLeftLobeInst.instanceColor) sLeftLobeInst.instanceColor.needsUpdate = true;
      if (sRightLobeInst.instanceColor) sRightLobeInst.instanceColor.needsUpdate = true;
      worldGroup.add(sTrunkInst, sMainInst, sLeftLobeInst, sRightLobeInst);
    }

    if (shrubPositions.length > 0) {
      const shrubGreenMat = new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.84 });
      const shrubBlossomMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.65 });
      const shrubGeo = new THREE.SphereGeometry(1.65, 8, 7);
      shrubGeo.scale(1.35, 0.72, 1.25);
      const flowerAccentGeo = new THREE.SphereGeometry(1.15, 7, 6);
      flowerAccentGeo.scale(1.4, 0.65, 1.3);

      const shrubInst = new THREE.InstancedMesh(shrubGeo, shrubGreenMat, shrubPositions.length);
      const flowerInst = new THREE.InstancedMesh(
        flowerAccentGeo,
        shrubBlossomMat,
        shrubPositions.length
      );
      const shDummy = new THREE.Object3D();
      for (let i = 0; i < shrubPositions.length; i++) {
        const sh = shrubPositions[i];
        const by = sampleWorldTerrain(sh.x, sh.z).heightY;
        shDummy.position.set(sh.x, by + 0.75 * sh.scale, sh.z);
        shDummy.rotation.set(0, (i * 1.1) % Math.PI, 0);
        shDummy.scale.setScalar(sh.scale);
        shDummy.updateMatrix();
        shrubInst.setMatrixAt(i, shDummy.matrix);

        if (sh.hasPinkFlowers) {
          shDummy.position.set(sh.x, by + 1.05 * sh.scale, sh.z);
          shDummy.scale.setScalar(sh.scale * 0.92);
        } else {
          shDummy.scale.setScalar(0);
        }
        shDummy.updateMatrix();
        flowerInst.setMatrixAt(i, shDummy.matrix);
      }
      shrubInst.instanceMatrix.needsUpdate = true;
      flowerInst.instanceMatrix.needsUpdate = true;
      worldGroup.add(shrubInst, flowerInst);
    }

    // F. PROVENCE LAVENDER HIGHLANDS (South: -65, +5260) — Château clear of N-S Highway & River
    const lavenderChateau = buildHaussmannBlock(40, 20, 28);
    lavenderChateau.position.set(-65, sampleWorldTerrain(-65, 5260).heightY, 5260);
    worldGroup.add(lavenderChateau);

    // G. AUTOBAHN NEON MEGAPORT (East: +5200, 0) — Illuminated Container Stacks & Cranes
    const containerCyanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.35,
    });
    const containerAmberMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.35,
    });
    const stack1 = new THREE.Mesh(new THREE.BoxGeometry(32, 18, 56), containerCyanMat);
    stack1.position.set(5260, 9, -80);
    const stack2 = new THREE.Mesh(new THREE.BoxGeometry(32, 18, 56), containerAmberMat);
    stack2.position.set(5260, 9, 80);
    worldGroup.add(stack1, stack2);

    // Forza Horizon 3D Open-World Race Event Start Zones (Hidden during an active race!)
    const raceStartZonesGroup = new THREE.Group();
    worldGroup.add(raceStartZonesGroup);
    const eventRingGeo = new THREE.RingGeometry(11.5, 14.5, 36);
    eventRingGeo.rotateX(-Math.PI / 2);
    const eventRingMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const eventBeamGeo = new THREE.CylinderGeometry(11.5, 11.5, 28, 24, 1, true);
    const eventBeamMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    WORLD_RACES.forEach((race) => {
      const zoneGroup = new THREE.Group();
      const groundH = sampleWorldTerrain(race.startX, race.startZ).heightY;
      zoneGroup.position.set(race.startX, groundH, race.startZ);
      const ring = new THREE.Mesh(eventRingGeo, eventRingMat);
      ring.position.y = 0.14;
      const beam = new THREE.Mesh(eventBeamGeo, eventBeamMat);
      beam.position.y = 14;
      zoneGroup.add(ring, beam);
      raceStartZonesGroup.add(zoneGroup);
    });

    // 3D Designated Race Pathway, Continuous Ground Curb Ribbons, Centerline Racing-Line Chevrons,
    // Dual-Neon Side Guardrails & 3D Directional Arrows ON TOP OF Pathways
    // (Constructed right when a race starts, and completely removed right when the race ends!)
    const raceOutpostCorridorGroup = new THREE.Group();
    raceOutpostCorridorGroup.visible = false;
    scene.add(raceOutpostCorridorGroup);
    let builtCorridorRaceId = '';

    const outpostLineMatOrange = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.98,
    });
    const outpostLineMatCyan = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.98,
    });
    const barrierWallGeo = new THREE.BoxGeometry(0.56, 1.32, 8.2);
    const barrierWallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.45,
      roughness: 0.32,
      metalness: 0.78,
    });
    const barrierNeonRailGeo = new THREE.BoxGeometry(0.68, 0.32, 8.2);
    const barrierNeonRailCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
    });
    const barrierNeonRailGoldMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
    });
    const barrierNeonLowerMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
    });

    // Ground Curb Strip & Centerline Racing Line Materials (PolygonOffset prevents road z-fighting)
    const groundCurbCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -8,
      polygonOffsetUnits: -8,
    });
    const groundCurbGoldMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -9,
      polygonOffsetUnits: -9,
    });
    const centerRacingLineMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -7,
      polygonOffsetUnits: -7,
    });

    // Instanced Ground Racing-Line Chevron Geometry (Flat on asphalt pointing along +Z track tangent)
    const groundTrackChevronGeo = new THREE.ConeGeometry(1.65, 3.4, 3);
    groundTrackChevronGeo.rotateX(Math.PI / 2);
    groundTrackChevronGeo.scale(1.2, 0.14, 1.0);
    const groundChevronStraightMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.92,
    });
    const groundChevronTurnMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.96,
    });
    const groundChevronBrakeMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.98,
    });

    // 3D Directional Arrows Mounted Directly ON TOP OF the Pathway Walls (───► pointing along +Z pathway tangent)
    const pathwayArrowShaftGeo = new THREE.BoxGeometry(0.56, 0.56, 2.75);
    pathwayArrowShaftGeo.translate(0, 0, -0.65);
    const pathwayArrowHeadGeo = new THREE.ConeGeometry(1.28, 2.75, 4);
    pathwayArrowHeadGeo.rotateZ(Math.PI / 4);
    pathwayArrowHeadGeo.rotateX(Math.PI / 2);
    pathwayArrowHeadGeo.translate(0, 0, 1.38);
    const pathwayArrowStemGeo = new THREE.BoxGeometry(0.32, 0.72, 0.72);
    pathwayArrowStemGeo.translate(0, -0.42, -0.2);

    const pathwayArrowCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
    });
    const pathwayArrowTurnGoldMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
    });

    const rebuildRaceOutpostCorridor = (race: typeof WORLD_RACES[number]) => {
      while (raceOutpostCorridorGroup.children.length > 0) {
        const child = raceOutpostCorridorGroup.children[0];
        raceOutpostCorridorGroup.remove(child);
      }

      const rawPts = computeRaceRoadPath(race);
      if (rawPts.length < 2) return;

      // Resample path at uniform ~7.5m arc-length spacing so both straights and turns have uniform point density
      const densePts: { x: number; z: number }[] = [rawPts[0]];
      let accumDist = 0;
      for (let i = 0; i < rawPts.length - 1; i++) {
        const a = rawPts[i];
        const b = rawPts[i + 1];
        const segLen = Math.hypot(b.x - a.x, b.z - a.z);
        if (segLen < 0.05) continue;
        const steps = Math.max(1, Math.ceil(segLen / 4));
        const subStepLen = segLen / steps;
        for (let s = 1; s <= steps; s++) {
          accumDist += subStepLen;
          if (accumDist >= 7.5 || (i === rawPts.length - 2 && s === steps)) {
            const t = s / steps;
            densePts.push({
              x: a.x + (b.x - a.x) * t,
              z: a.z + (b.z - a.z) * t,
            });
            accumDist = 0;
          }
        }
      }

      const isClosedLoop =
        densePts.length >= 6 &&
        Math.hypot(
          densePts[densePts.length - 1].x - densePts[0].x,
          densePts[densePts.length - 1].z - densePts[0].z
        ) < 16;

      // 1. Identify macro turns along the route so we widen the pathway smoothly at turns
      //    and highlight the ground kerbs, racing line chevrons, and top arrows in bright Gold/Orange through every turn!
      const macroTurnPts: { x: number; z: number }[] = [];
      const lookWindow = 4;
      const nPts = densePts.length;
      for (let i = 0; i < nPts; i++) {
        if (!isClosedLoop && (i < lookWindow || i >= nPts - lookWindow)) continue;
        const pBefore = isClosedLoop
          ? densePts[(i - lookWindow + nPts) % nPts]
          : densePts[i - lookWindow];
        const pApex = densePts[i];
        const pAfter = isClosedLoop
          ? densePts[(i + lookWindow) % nPts]
          : densePts[i + lookWindow];

        const inYaw = Math.atan2(pApex.x - pBefore.x, pApex.z - pBefore.z);
        const outYaw = Math.atan2(pAfter.x - pApex.x, pAfter.z - pApex.z);
        const turnDelta = Math.atan2(Math.sin(outYaw - inYaw), Math.cos(outYaw - inYaw));

        if (Math.abs(turnDelta) > 0.22) {
          macroTurnPts.push({ x: pApex.x, z: pApex.z });
        }
      }

      // Uniform pathway width across all race types (17.5m base half-width = 35m corridor, widening at turns)
      const baseHalfWidthM = 17.5;
      const leftVertsLow: number[] = [];
      const rightVertsLow: number[] = [];
      const leftVertsHigh: number[] = [];
      const rightVertsHigh: number[] = [];

      const leftCurbStripPts: { x: number; y: number; z: number; nx: number; nz: number }[] = [];
      const rightCurbStripPts: { x: number; y: number; z: number; nx: number; nz: number }[] = [];
      const centerLineStripPts: { x: number; y: number; z: number; nx: number; nz: number }[] = [];

      const straightBarrierTransforms: { x: number; y: number; z: number; yaw: number }[] = [];
      const turnBarrierTransforms: { x: number; y: number; z: number; yaw: number }[] = [];
      const straightArrowTransforms: { x: number; y: number; z: number; yaw: number }[] = [];
      const turnArrowTransforms: { x: number; y: number; z: number; yaw: number }[] = [];

      const groundChevStraight: { x: number; y: number; z: number; yaw: number }[] = [];
      const groundChevTurn: { x: number; y: number; z: number; yaw: number }[] = [];
      const groundChevBrake: { x: number; y: number; z: number; yaw: number }[] = [];

      // Helper: ensure a boundary wall/arrow point never blocks a separate crossing leg of a figure-8 track,
      // while keeping 100% of inside & outside corner barriers intact around every 90° turn!
      const isClearOfTrackCenterline = (wx: number, wz: number, selfIdx: number): boolean => {
        for (let k = 0; k < nPts; k += 2) {
          const idxDiff = Math.abs(k - selfIdx);
          const wrappedDiff = isClosedLoop ? Math.min(idxDiff, nPts - idxDiff) : idxDiff;
          if (wrappedDiff <= 16) continue;
          const d = Math.hypot(wx - densePts[k].x, wz - densePts[k].z);
          if (d < 12.5) return false;
        }
        return true;
      };

      for (let i = 0; i < nPts; i++) {
        const curr = densePts[i];
        const pBack = isClosedLoop
          ? densePts[(i - 2 + nPts) % nPts]
          : densePts[Math.max(0, i - 2)];
        const pFwd = isClosedLoop
          ? densePts[(i + 2) % nPts]
          : densePts[Math.min(nPts - 1, i + 2)];
        const tx = pFwd.x - pBack.x;
        const tz = pFwd.z - pBack.z;
        const len = Math.hypot(tx, tz) || 1;
        const nx = -tz / len; // Left normal
        const nz = tx / len;
        const yaw = Math.atan2(tx, tz);

        // Compute distance to nearest turn
        let minTurnDist = Infinity;
        for (let t = 0; t < macroTurnPts.length; t++) {
          const d = Math.hypot(curr.x - macroTurnPts[t].x, curr.z - macroTurnPts[t].z);
          if (d < minTurnDist) minTurnDist = d;
        }

        // Smoothly widen pathway at turns (+4.0m per side at turns)
        const turnWideBoost =
          minTurnDist < 75 ? 4.0 * Math.pow(1 - minTurnDist / 75, 1.2) : 0;
        const dynamicHalfWidth = baseHalfWidthM + turnWideBoost;

        const cy = sampleWorldTerrain(curr.x, curr.z).heightY;
        centerLineStripPts.push({ x: curr.x, y: cy + 0.12, z: curr.z, nx, nz });

        // Place glowing ground racing-line chevrons along the track centerline
        if (i % 2 === 0 || minTurnDist < 65) {
          const chevPose = { x: curr.x, y: cy + 0.18, z: curr.z, yaw };
          if (minTurnDist < 30) {
            groundChevBrake.push(chevPose);
          } else if (minTurnDist < 72) {
            groundChevTurn.push(chevPose);
          } else {
            groundChevStraight.push(chevPose);
          }
        }

        const lx = curr.x + nx * dynamicHalfWidth;
        const lz = curr.z + nz * dynamicHalfWidth;
        const ly = sampleWorldTerrain(lx, lz).heightY;

        const rx = curr.x - nx * dynamicHalfWidth;
        const rz = curr.z - nz * dynamicHalfWidth;
        const ry = sampleWorldTerrain(rx, rz).heightY;

        leftCurbStripPts.push({ x: lx - nx * 0.85, y: ly + 0.14, z: lz - nz * 0.85, nx, nz });
        rightCurbStripPts.push({ x: rx + nx * 0.85, y: ry + 0.14, z: rz + nz * 0.85, nx, nz });

        leftVertsLow.push(lx, ly + 0.32, lz);
        rightVertsLow.push(rx, ry + 0.32, rz);
        leftVertsHigh.push(lx, ly + 1.32, lz);
        rightVertsHigh.push(rx, ry + 1.32, rz);

        const isNearTurn = minTurnDist < 72;
        const placeArrowOnTop = isNearTurn || i % 2 === 0;

        if (isClearOfTrackCenterline(lx, lz, i)) {
          const targetBarrierArr = isNearTurn ? turnBarrierTransforms : straightBarrierTransforms;
          targetBarrierArr.push({ x: lx, y: ly + 0.66, z: lz, yaw });
          if (placeArrowOnTop) {
            const targetArr = isNearTurn ? turnArrowTransforms : straightArrowTransforms;
            targetArr.push({ x: lx, y: ly + 2.02, z: lz, yaw });
          }
        }
        if (isClearOfTrackCenterline(rx, rz, i)) {
          const targetBarrierArr = isNearTurn ? turnBarrierTransforms : straightBarrierTransforms;
          targetBarrierArr.push({ x: rx, y: ry + 0.66, z: rz, yaw });
          if (placeArrowOnTop) {
            const targetArr = isNearTurn ? turnArrowTransforms : straightArrowTransforms;
            targetArr.push({ x: rx, y: ry + 2.02, z: rz, yaw });
          }
        }
      }

      const makeRibbonLine = (verts: number[], mat: THREE.LineBasicMaterial) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        return new THREE.Line(geo, mat);
      };

      const makeGroundFlatRibbonMesh = (
        pts: { x: number; y: number; z: number; nx: number; nz: number }[],
        halfW: number,
        mat: THREE.Material
      ) => {
        if (pts.length < 2) return null;
        const positions: number[] = [];
        const indices: number[] = [];
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          positions.push(
            p.x + p.nx * halfW,
            p.y,
            p.z + p.nz * halfW,
            p.x - p.nx * halfW,
            p.y,
            p.z - p.nz * halfW
          );
          if (i < pts.length - 1) {
            const base = i * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setIndex(indices);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false;
        return mesh;
      };

      // 1. Add Continuous Wide Ground Curb Strips (Left & Right Track Limits) + Centerline Racing Ribbon
      const leftCurbMesh = makeGroundFlatRibbonMesh(leftCurbStripPts, 0.78, groundCurbCyanMat);
      const rightCurbMesh = makeGroundFlatRibbonMesh(rightCurbStripPts, 0.78, groundCurbGoldMat);
      const centerLineMesh = makeGroundFlatRibbonMesh(centerLineStripPts, 0.48, centerRacingLineMat);
      if (leftCurbMesh) raceOutpostCorridorGroup.add(leftCurbMesh);
      if (rightCurbMesh) raceOutpostCorridorGroup.add(rightCurbMesh);
      if (centerLineMesh) raceOutpostCorridorGroup.add(centerLineMesh);

      // 2. Add Instanced Ground Racing-Line Chevrons (Cyan Straights, Gold Turn Entry, Red-Orange Apex Braking)
      const addGroundChevrons = (
        transforms: { x: number; y: number; z: number; yaw: number }[],
        mat: THREE.MeshBasicMaterial
      ) => {
        if (transforms.length === 0) return;
        const inst = new THREE.InstancedMesh(groundTrackChevronGeo, mat, transforms.length);
        inst.frustumCulled = false;
        const dummy = new THREE.Object3D();
        for (let c = 0; c < transforms.length; c++) {
          const t = transforms[c];
          dummy.position.set(t.x, t.y, t.z);
          dummy.rotation.set(0, t.yaw, 0);
          dummy.updateMatrix();
          inst.setMatrixAt(c, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
        raceOutpostCorridorGroup.add(inst);
      };
      addGroundChevrons(groundChevStraight, groundChevronStraightMat);
      addGroundChevrons(groundChevTurn, groundChevronTurnMat);
      addGroundChevrons(groundChevBrake, groundChevronBrakeMat);

      // 3. Clean outer race boundary lines (left & right pathway rails)
      raceOutpostCorridorGroup.add(
        makeRibbonLine(leftVertsLow, outpostLineMatOrange),
        makeRibbonLine(rightVertsLow, outpostLineMatOrange),
        makeRibbonLine(leftVertsHigh, outpostLineMatCyan),
        makeRibbonLine(rightVertsHigh, outpostLineMatCyan)
      );

      // 4. Continuous Left & Right Pathway Walls + Dual Top/Bottom Neon Rails (Cyan on Straights, Gold on Turns)
      const addBarrierSection = (
        transforms: { x: number; y: number; z: number; yaw: number }[],
        topRailMat: THREE.MeshBasicMaterial
      ) => {
        if (transforms.length === 0) return;
        const wallInst = new THREE.InstancedMesh(barrierWallGeo, barrierWallMat, transforms.length);
        const topRailInst = new THREE.InstancedMesh(
          barrierNeonRailGeo,
          topRailMat,
          transforms.length
        );
        const botRailInst = new THREE.InstancedMesh(
          barrierNeonRailGeo,
          barrierNeonLowerMat,
          transforms.length
        );
        wallInst.frustumCulled = false;
        topRailInst.frustumCulled = false;
        botRailInst.frustumCulled = false;
        const dummyObj = new THREE.Object3D();
        for (let b = 0; b < transforms.length; b++) {
          const bt = transforms[b];
          dummyObj.position.set(bt.x, bt.y, bt.z);
          dummyObj.rotation.set(0, bt.yaw, 0);
          dummyObj.updateMatrix();
          wallInst.setMatrixAt(b, dummyObj.matrix);

          dummyObj.position.set(bt.x, bt.y + 0.68, bt.z);
          dummyObj.updateMatrix();
          topRailInst.setMatrixAt(b, dummyObj.matrix);

          dummyObj.position.set(bt.x, bt.y - 0.36, bt.z);
          dummyObj.updateMatrix();
          botRailInst.setMatrixAt(b, dummyObj.matrix);
        }
        wallInst.instanceMatrix.needsUpdate = true;
        topRailInst.instanceMatrix.needsUpdate = true;
        botRailInst.instanceMatrix.needsUpdate = true;
        raceOutpostCorridorGroup.add(wallInst, topRailInst, botRailInst);
      };

      addBarrierSection(straightBarrierTransforms, barrierNeonRailCyanMat);
      addBarrierSection(turnBarrierTransforms, barrierNeonRailGoldMat);

      // 5. Helper to add Instanced 3D Directional Arrows ON TOP OF the Pathway Walls
      const addPathwayTopArrows = (
        transforms: { x: number; y: number; z: number; yaw: number }[],
        arrowMat: THREE.MeshBasicMaterial
      ) => {
        if (transforms.length === 0) return;
        const shaftInst = new THREE.InstancedMesh(
          pathwayArrowShaftGeo,
          arrowMat,
          transforms.length
        );
        const headInst = new THREE.InstancedMesh(
          pathwayArrowHeadGeo,
          arrowMat,
          transforms.length
        );
        const stemInst = new THREE.InstancedMesh(
          pathwayArrowStemGeo,
          barrierWallMat,
          transforms.length
        );
        shaftInst.frustumCulled = false;
        headInst.frustumCulled = false;
        stemInst.frustumCulled = false;
        const dummy = new THREE.Object3D();
        for (let a = 0; a < transforms.length; a++) {
          const at = transforms[a];
          dummy.position.set(at.x, at.y, at.z);
          dummy.rotation.set(0, at.yaw, 0);
          dummy.updateMatrix();
          shaftInst.setMatrixAt(a, dummy.matrix);
          headInst.setMatrixAt(a, dummy.matrix);
          stemInst.setMatrixAt(a, dummy.matrix);
        }
        shaftInst.instanceMatrix.needsUpdate = true;
        headInst.instanceMatrix.needsUpdate = true;
        stemInst.instanceMatrix.needsUpdate = true;
        raceOutpostCorridorGroup.add(stemInst, shaftInst, headInst);
      };

      addPathwayTopArrows(straightArrowTransforms, pathwayArrowCyanMat);
      addPathwayTopArrows(turnArrowTransforms, pathwayArrowTurnGoldMat);
    };

    // Build initial player vehicle rig
    const initialRig = buildVehicleRig(specRef.current, tuneRef.current);
    scene.add(initialRig.root);
    carRigRef.current = initialRig;

    // 3D GPS Sky Beacon & Active Race Checkpoint Overhead Gantry Arch Group
    const gpsBeaconGroup = new THREE.Group();
    const beaconBeamGeo = new THREE.CylinderGeometry(1.35, 1.35, 95, 16, 1, true);
    const beaconBeamMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const beaconBeam = new THREE.Mesh(beaconBeamGeo, beaconBeamMat);
    beaconBeam.position.y = 47.5;
    gpsBeaconGroup.add(beaconBeam);

    // Checkpoint Gate Twin Illuminated Pillars, Overhead Gantry Arch & Ground Ring (35m span across the pathway!)
    const gatePillarGeo = new THREE.CylinderGeometry(0.68, 0.68, 14.5, 12);
    const gatePillarMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.0,
    });
    const gateLeft = new THREE.Mesh(gatePillarGeo, gatePillarMat);
    gateLeft.position.set(-17.5, 7.25, 0);
    const gateRight = gateLeft.clone();
    gateRight.position.x = 17.5;

    // Overhead Illuminated Gantry Crossbar connecting Left & Right Checkpoint Pillars
    const gateCrossbarGeo = new THREE.BoxGeometry(36.4, 1.35, 1.35);
    const gateCrossbar = new THREE.Mesh(gateCrossbarGeo, gatePillarMat);
    gateCrossbar.position.set(0, 14.2, 0);

    const gateRingGeo = new THREE.RingGeometry(16.0, 18.2, 40);
    gateRingGeo.rotateX(-Math.PI / 2);
    const gateRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
    });
    const gateRing = new THREE.Mesh(gateRingGeo, gateRingMat);
    gateRing.position.y = 0.16;

    gpsBeaconGroup.add(gateLeft, gateRight, gateCrossbar, gateRing);
    gpsBeaconGroup.visible = false;
    scene.add(gpsBeaconGroup);

    // Next-Checkpoint Preview Gate Group (Shows Checkpoint N+1 in Glowing Cyan so drivers see the next turn early!)
    const nextCheckpointPreviewGroup = new THREE.Group();
    const nextGateMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.55,
    });
    const nextGateLeft = new THREE.Mesh(gatePillarGeo, nextGateMat);
    nextGateLeft.position.set(-17.5, 7.25, 0);
    const nextGateRight = new THREE.Mesh(gatePillarGeo, nextGateMat);
    nextGateRight.position.set(17.5, 7.25, 0);
    const nextGateCrossbar = new THREE.Mesh(gateCrossbarGeo, nextGateMat);
    nextGateCrossbar.position.set(0, 14.2, 0);
    const nextGateBeam = new THREE.Mesh(
      beaconBeamGeo,
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      })
    );
    nextGateBeam.position.y = 47.5;
    nextCheckpointPreviewGroup.add(nextGateLeft, nextGateRight, nextGateCrossbar, nextGateBeam);
    nextCheckpointPreviewGroup.visible = false;
    scene.add(nextCheckpointPreviewGroup);
    let lastTriggeredRaceCpKey = '';

    // 3D Road-Following GPS Line & Ground Racing-Line Directional Chevron Arrows
    const gpsChevronGroup = new THREE.Group();
    const chevronMeshes: THREE.Mesh[] = [];
    const chevronGeo = new THREE.ConeGeometry(0.95, 2.3, 3);
    chevronGeo.rotateX(Math.PI / 2);
    for (let c = 0; c < 5; c++) {
      const chevMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.85 - c * 0.12,
      });
      const chev = new THREE.Mesh(chevronGeo, chevMat);
      gpsChevronGroup.add(chev);
      chevronMeshes.push(chev);
    }
    const gpsRoadLineGeo = new THREE.BufferGeometry();
    const gpsRoadLineMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
    });
    const gpsRoadLine = new THREE.Line(gpsRoadLineGeo, gpsRoadLineMat);
    gpsChevronGroup.add(gpsRoadLine);
    gpsChevronGroup.visible = false;
    scene.add(gpsChevronGroup);

    // =========================================================================
    // 50 HORIZON TOKENS (3D GOLD 'H' COINS EVENLY DISTRIBUTED ALL AROUND THE MAP)
    // - Never shown on the mini-map
    // - Collected by passing the car through them
    // - Each collected token immediately starts its own slow respawn timer
    // =========================================================================
    const HORIZON_TOKEN_TOTAL = 50;
    const horizonTokensGroup = new THREE.Group();
    scene.add(horizonTokensGroup);

    const coinFaceTex = getHorizonCoinFaceTexture();
    const coinRimMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xb45309,
      emissiveIntensity: 0.45,
    });
    const coinFaceMat = new THREE.MeshStandardMaterial({
      map: coinFaceTex,
      metalness: 0.55,
      roughness: 0.25,
      emissive: 0xf59e0b,
      emissiveMap: coinFaceTex,
      emissiveIntensity: 0.55,
    });
    const coinCylGeo = new THREE.CylinderGeometry(1.35, 1.35, 0.28, 28);
    coinCylGeo.rotateX(Math.PI / 2);

    const coinGroundRingGeo = new THREE.RingGeometry(1.4, 2.05, 24);
    coinGroundRingGeo.rotateX(-Math.PI / 2);
    const coinGroundRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });

    // Helper to pick a valid random coordinate within one of the 50 evenly distributed map sectors
    const pickRandomTokenPosInSector = (sectorIndex: number): { x: number; y: number; z: number } => {
      // 10 columns x 5 rows = 50 uniform sectors spanning the map (-1500m to +1500m)
      const cols = 10;
      const rows = 5;
      const col = sectorIndex % cols;
      const row = Math.floor(sectorIndex / cols);
      const minX = -1500;
      const maxX = 1500;
      const minZ = -1500;
      const maxZ = 1500;
      const cellW = (maxX - minX) / cols;
      const cellH = (maxZ - minZ) / rows;

      const sectorMinX = minX + col * cellW;
      const sectorMinZ = minZ + row * cellH;

      for (let attempt = 0; attempt < 18; attempt++) {
        let rx = sectorMinX + (0.12 + Math.random() * 0.76) * cellW;
        let rz = sectorMinZ + (0.12 + Math.random() * 0.76) * cellH;

        // Snap 60% of tokens onto nearby avenues/streets within their sector for smooth driving discovery
        if (attempt < 10 && Math.random() < 0.6) {
          const allRoadCoords = [...MAJOR_GRID_COORDS, ...SMALL_STREET_COORDS];
          let nearestRoadX = rx;
          let minDx = 9999;
          for (const rc of allRoadCoords) {
            if (rc >= sectorMinX && rc <= sectorMinX + cellW) {
              const d = Math.abs(rc - rx);
              if (d < minDx) {
                minDx = d;
                nearestRoadX = rc;
              }
            }
          }
          if (minDx < cellW) {
            rx = nearestRoadX + (Math.random() - 0.5) * 8;
          }
        }

        // Avoid river channel (unless near a bridge)
        const riverCenterX = getMainRiverCenterX(rz);
        const nearBridge = RIVER_BRIDGE_Z_COORDS.some((bz) => Math.abs(rz - bz) < 12);
        if (Math.abs(rx - riverCenterX) < 54 && !nearBridge) {
          continue;
        }

        // Avoid spawning inside procedural building footprints
        let insideBuilding = false;
        for (let b = 0; b < WORLD_PROCEDURAL_BUILDINGS.length; b++) {
          const bld = WORLD_PROCEDURAL_BUILDINGS[b];
          if (
            Math.abs(rx - bld.x) < bld.width * 0.5 + 3.5 &&
            Math.abs(rz - bld.z) < bld.depth * 0.5 + 3.5
          ) {
            insideBuilding = true;
            break;
          }
        }
        if (insideBuilding) continue;

        const groundY = sampleWorldTerrain(rx, rz).heightY;
        return { x: rx, y: groundY, z: rz };
      }

      // Fallback to sector center outside river
      let fx = sectorMinX + cellW * 0.5;
      const fz = sectorMinZ + cellH * 0.5;
      if (Math.abs(fx - getMainRiverCenterX(fz)) < 58) {
        fx += 75;
      }
      const fy = sampleWorldTerrain(fx, fz).heightY;
      return { x: fx, y: fy, z: fz };
    };

    interface HorizonTokenInstance {
      sectorIndex: number;
      x: number;
      y: number;
      z: number;
      group: THREE.Group;
      coinMesh: THREE.Mesh;
      isCollected: boolean;
      collectedAtMs: number;
      respawnDurationMs: number;
    }

    const horizonTokens: HorizonTokenInstance[] = [];
    for (let i = 0; i < HORIZON_TOKEN_TOTAL; i++) {
      const pos = pickRandomTokenPosInSector(i);
      const tokenGroup = new THREE.Group();
      tokenGroup.position.set(pos.x, pos.y, pos.z);

      const coinMesh = new THREE.Mesh(coinCylGeo, [coinRimMat, coinFaceMat, coinFaceMat]);
      coinMesh.position.y = 1.45;
      tokenGroup.add(coinMesh);

      const ringMesh = new THREE.Mesh(coinGroundRingGeo, coinGroundRingMat);
      ringMesh.position.y = 0.14;
      tokenGroup.add(ringMesh);

      horizonTokensGroup.add(tokenGroup);
      horizonTokens.push({
        sectorIndex: i,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        group: tokenGroup,
        coinMesh,
        isCollected: false,
        collectedAtMs: 0,
        respawnDurationMs: 45000,
      });
    }
    let cachedGpsPath: { x: number; z: number }[] = [];
    let lastGpsCalcTime = 0;

    // Tire Burnout Smoke & Dust Particle Pool (Pre-allocated fixed pool for locked 60 FPS, zero runtime allocations)
    const maxParticles = 84;
    const smokeMeshes: {
      mesh: THREE.Mesh;
      life: number;
      decayRate: number;
      vx: number;
      vy: number;
      vz: number;
      startScale: number;
      maxScale: number;
      maxOpacity: number;
    }[] = [];
    const smokeGeo = new THREE.IcosahedronGeometry(0.34, 1);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    for (let i = 0; i < maxParticles; i++) {
      const m = new THREE.Mesh(smokeGeo, smokeMat.clone());
      m.visible = false;
      m.frustumCulled = false;
      scene.add(m);
      smokeMeshes.push({
        mesh: m,
        life: 0,
        decayRate: 1.5,
        vx: 0,
        vy: 0,
        vz: 0,
        startScale: 0.55,
        maxScale: 2.8,
        maxOpacity: 0.38,
      });
    }
    let nextSmokeIdx = 0;

    // 3D Tire Drift Marks (Skid Marks) Pool on Roads During Drifting
    const maxDriftMarks = 720;
    const driftMarkGeo = new THREE.PlaneGeometry(0.38, 1.55);
    driftMarkGeo.rotateX(-Math.PI / 2);
    const driftMarkMat = new THREE.MeshBasicMaterial({
      color: 0x05070b,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
    });
    const driftMarksInstanced = new THREE.InstancedMesh(
      driftMarkGeo,
      driftMarkMat,
      maxDriftMarks
    );
    driftMarksInstanced.frustumCulled = false;
    const hiddenDriftMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < maxDriftMarks; i++) {
      driftMarksInstanced.setMatrixAt(i, hiddenDriftMatrix);
    }
    driftMarksInstanced.instanceMatrix.needsUpdate = true;
    scene.add(driftMarksInstanced);
    let nextDriftMarkIdx = 0;
    let lastDriftMarkX = 0;
    let lastDriftMarkZ = 0;
    const driftMarkDummy = new THREE.Object3D();

    // Remote Human Players 3D Mesh Pool, Autonomous Parisian Roaming Traffic Pool & Active AI Race Bots Pool
    const remoteRigs = new Map<string, BuiltCarRig>();
    const trafficRigs = new Map<string, BuiltCarRig>();
    const raceBotRigs = new Map<string, BuiltCarRig>();

    // ========================================================================
    // 3D WEATHER PRECIPITATION SYSTEM: SNOWFLAKES (SNOWY) — NO RAIN DROPS
    // ========================================================================
    const precipHalfSpanXZ = 48;
    const precipHeightY = 34;

    // 3D Falling Snowflakes (2,000 soft crystalline snowflakes with wind swirl)
    const snowCanvas = document.createElement('canvas');
    snowCanvas.width = 64;
    snowCanvas.height = 64;
    const snowCtx = snowCanvas.getContext('2d');
    if (snowCtx) {
      const grad = snowCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.45, 'rgba(240, 249, 255, 0.88)');
      grad.addColorStop(0.8, 'rgba(224, 242, 254, 0.28)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      snowCtx.fillStyle = grad;
      snowCtx.fillRect(0, 0, 64, 64);
    }
    const snowTexture = new THREE.CanvasTexture(snowCanvas);

    const snowCount = 2000;
    const snowPositions = new Float32Array(snowCount * 3);
    const snowData = new Float32Array(snowCount * 4); // [relX, relY, relZ, phase]
    for (let i = 0; i < snowCount; i++) {
      snowData[i * 4] = (Math.random() * 2 - 1) * precipHalfSpanXZ;
      snowData[i * 4 + 1] = Math.random() * precipHeightY;
      snowData[i * 4 + 2] = (Math.random() * 2 - 1) * precipHalfSpanXZ;
      snowData[i * 4 + 3] = Math.random() * Math.PI * 2;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowFlakesMat = new THREE.PointsMaterial({
      color: 0xffffff,
      map: snowTexture,
      size: 0.58,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      alphaTest: 0.05,
    });
    const snowFlakesPoints = new THREE.Points(snowGeo, snowFlakesMat);
    snowFlakesPoints.frustumCulled = false;
    snowFlakesPoints.visible = false;
    scene.add(snowFlakesPoints);

    // Keyboard Controls Listener
    const keysDown = new Set<string>();
    let shiftUpQueued = false;
    let shiftDownQueued = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const k = e.key.toLowerCase();
      keysDown.add(k);
      if (k === 'e') shiftUpQueued = true;
      if (k === 'q') shiftDownQueued = true;
      if (k === 'r') {
        const p = physicsStateRef.current;
        p.vx = 0;
        p.vy = 0;
        p.vz = 0;
        p.angularVelocity = 0;
        const activeRace = activeRaceRef.current;
        if (activeRace && !activeRace.isCompleted) {
          // Snap car back onto the active race pathway facing toward the current checkpoint!
          const prevIdx = Math.max(0, activeRace.currentCheckpointIndex - 1);
          const resetPose =
            activeRace.currentCheckpointIndex > 0
              ? getCheckpointPoseOnRacePath(activeRace.race, prevIdx)
              : {
                  x: activeRace.race.startX,
                  z: activeRace.race.startZ,
                  yaw: activeRace.race.startHeading,
                };
          p.x = resetPose.x;
          p.z = resetPose.z;
          p.heading = resetPose.yaw;
        }
        p.y = sampleWorldTerrain(p.x, p.z).heightY;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Resize Handler + ResizeObserver for Full-Screen Responsiveness
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation & Physics Loop State
    let animationFrameId = 0;
    let lastTime = performance.now();
    let smoothDt = 1 / 60;
    let lastUiSyncTime = 0;
    let lastNetBroadcastTime = 0;
    let garageOrbitAngle = 0.6;
    const smoothCamPos = new THREE.Vector3(0, 4, 55);
    const smoothCamLook = new THREE.Vector3(0, 1, 45);
    let smoothChaseCamAngle = physicsStateRef.current.heading;
    let smoothChaseCamY = physicsStateRef.current.y;
    let smoothChaseLookAngle = physicsStateRef.current.heading;
    let chaseCamInitialized = false;
    const reusableBiomeTint = new THREE.Color();
    const reusableSkyBg = new THREE.Color();
    const reusableFogColor = new THREE.Color();

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const rawElapsed = (now - lastTime) / 1000;
      const clampedRawDt = rawElapsed > 0.12 ? 1 / 60 : Math.min(0.04, Math.max(0.001, rawElapsed));
      smoothDt = smoothDt * 0.72 + clampedRawDt * 0.28;
      const dt = smoothDt;
      lastTime = now;

      // Pause simulation when Main Menu or Post-Race Finish Window is open
      if (isPausedRef.current) {
        if (activeRaceRef.current?.isCompleted) {
          physicsStateRef.current.vx = 0;
          physicsStateRef.current.vz = 0;
        }
        if (isGarageViewRef.current) {
          const p = physicsStateRef.current;
          garageOrbitAngle += dt * 0.22;
          const radius = 5.2;
          const desiredPos = new THREE.Vector3(
            p.x + Math.cos(garageOrbitAngle) * radius,
            p.y + 1.55,
            p.z + Math.sin(garageOrbitAngle) * radius
          );
          smoothCamPos.lerp(desiredPos, Math.min(1, dt * 8));
          smoothCamLook.lerp(new THREE.Vector3(p.x, p.y + 0.68, p.z), Math.min(1, dt * 10));
          camera.fov = 48;
          camera.updateProjectionMatrix();
          camera.position.copy(smoothCamPos);
          camera.lookAt(smoothCamLook);
        }
        engineAudio.update(specRef.current, specRef.current.idleRPM, 0, 0);
        renderer.render(scene, camera);
        return;
      }

      const ext = externalControlsRef?.current;
      const controls: ControlInputState = {
        throttle: Math.max(
          keysDown.has('w') || keysDown.has('arrowup') ? 1 : 0,
          ext?.throttle || 0
        ),
        brake: Math.max(
          keysDown.has('s') || keysDown.has('arrowdown') ? 1 : 0,
          ext?.brake || 0
        ),
        steerLeft: Math.max(
          keysDown.has('a') || keysDown.has('arrowleft') ? 1 : 0,
          ext?.steerLeft || 0
        ),
        steerRight: Math.max(
          keysDown.has('d') || keysDown.has('arrowright') ? 1 : 0,
          ext?.steerRight || 0
        ),
        handbrake: keysDown.has(' ') || Boolean(ext?.handbrake),
        shiftUpRequested: shiftUpQueued || Boolean(ext?.shiftUpRequested),
        shiftDownRequested: shiftDownQueued || Boolean(ext?.shiftDownRequested),
        nitrousBoost: keysDown.has('shift') || Boolean(ext?.nitrousBoost),
        steerSensitivity: ext?.steerSensitivity ?? 0.65,
      };
      shiftUpQueued = false;
      shiftDownQueued = false;
      if (ext) {
        ext.shiftUpRequested = false;
        ext.shiftDownRequested = false;
      }

      const pState = physicsStateRef.current;
      const nowSec = now / 1000;
      const currentRaceSession = activeRaceRef.current;
      const isOngoingRace = Boolean(currentRaceSession && !currentRaceSession.isCompleted);
      const isRacePreCountdown = Boolean(
        isOngoingRace && currentRaceSession && Date.now() < currentRaceSession.startTimeMs
      );

      // Hold car on starting grid while race pathway is being processed & counted down (3... 2... 1... GO!)
      // Use brake: 0 + handbrake: true so automatic transmission never shifts into reverse (-1) during countdown!
      const effectiveControls: ControlInputState = isRacePreCountdown
        ? {
            ...controls,
            throttle: 0,
            brake: 0,
            handbrake: true,
            steerLeft: 0,
            steerRight: 0,
            nitrousBoost: false,
          }
        : controls;

      const stepResult = stepVehiclePhysics(
        pState,
        effectiveControls,
        specRef.current,
        tuneRef.current,
        benchmarkRef.current,
        dt,
        nowSec,
        remotePlayersRef.current,
        isOngoingRace && currentRaceSession ? currentRaceSession.race : null
      );
      const tel = stepResult.telemetry;
      if (isRacePreCountdown && currentRaceSession) {
        // Strictly lock car stationary in 1st gear at the starting grid during 3... 2... 1... countdown
        if (!currentRaceSession.race.isMultiplayerRace || remotePlayersRef.current.length === 0) {
          pState.x = currentRaceSession.race.startX;
          pState.z = currentRaceSession.race.startZ;
          pState.y = sampleWorldTerrain(pState.x, pState.z).heightY;
          pState.heading = currentRaceSession.race.startHeading;
          tel.x = pState.x;
          tel.y = pState.y;
          tel.z = pState.z;
          tel.heading = pState.heading;
        }
        pState.vx = 0;
        pState.vy = 0;
        pState.vz = 0;
        pState.angularVelocity = 0;
        pState.gear = 1;
        tel.vx = 0;
        tel.vz = 0;
        tel.speedKmh = 0;
        tel.gear = 1;
        if (controls.throttle > 0.05) {
          // Allow player to rev engine on the starting grid during countdown!
          tel.rpm = Math.round(
            specRef.current.idleRPM +
              controls.throttle * (specRef.current.redlineRPM - specRef.current.idleRPM) * 0.82
          );
          pState.rpm = tel.rpm;
        }
      }

      // Step AI Race Bots & Resolve Car-to-Car Race Collisions if an event is active (after countdown finishes)
      let activeRacePlayerPos = 1;
      let botCollisionImpactMs: number | undefined;
      if (
        isOngoingRace &&
        currentRaceSession &&
        !isRacePreCountdown &&
        raceBotsRef.current.length > 0
      ) {
        const elapsedRaceSec = Math.max(0, (Date.now() - currentRaceSession.startTimeMs) / 1000);
        const botStep = stepRaceBotsPhysics(
          raceBotsRef.current,
          currentRaceSession.race,
          pState,
          dt,
          elapsedRaceSec,
          currentRaceSession.currentCheckpointIndex
        );
        activeRacePlayerPos = botStep.playerPosition;
        botCollisionImpactMs = botStep.collisionImpactMs;
        // Sync telemetry position if player collided with a race bot
        tel.x = pState.x;
        tel.z = pState.z;
        tel.vx = pState.vx;
        tel.vz = pState.vz;
        tel.speedKmh = Math.round(Math.hypot(pState.vx, pState.vz) * 3.6);
      }

      // Update WebAudio synthesizer & play collision thud on solid impact (world or race bot)
      engineAudio.update(
        specRef.current,
        tel.rpm,
        controls.throttle,
        tel.slipAngleDeg,
        tel.wheelSpinRatio
      );
      const totalImpactMs = Math.max(
        stepResult.collisionImpactMs ?? 0,
        botCollisionImpactMs ?? 0
      );
      if (totalImpactMs > 0) {
        engineAudio.playCollisionThud(totalImpactMs);
      }

      // Hide all other world race start rings & beams during an ongoing race so player cannot interact with any other competition
      raceStartZonesGroup.visible = !isOngoingRace;

      // Show & maintain the 3D Designated Race Pathway & Direction Signs right when the race starts, and remove immediately when it ends!
      if (isOngoingRace && currentRaceSession) {
        if (builtCorridorRaceId !== currentRaceSession.race.id) {
          builtCorridorRaceId = currentRaceSession.race.id;
          rebuildRaceOutpostCorridor(currentRaceSession.race);
        }
        raceOutpostCorridorGroup.visible = true;
      } else {
        if (builtCorridorRaceId !== '') {
          builtCorridorRaceId = '';
          while (raceOutpostCorridorGroup.children.length > 0) {
            raceOutpostCorridorGroup.remove(raceOutpostCorridorGroup.children[0]);
          }
        }
        raceOutpostCorridorGroup.visible = false;
      }

      // Handle Leaderboard Triggers ONLY in Freeroam (Locked out during ongoing races!)
      if (!isOngoingRace) {
        if (stepResult.triggeredSpeedTrap) {
          speedFlashRef.current = 1.0;
          callbacksRef.current.onLeaderboardEvent(
            'speed_trap',
            tel.zoneName.includes('Champs')
              ? 'Champs-Élysées 1km Drag Strip'
              : 'Boulevard Périphérique Speed Trap',
            stepResult.triggeredSpeedTrap,
            'km/h'
          );
        }
        if (stepResult.triggeredJumpDistance) {
          callbacksRef.current.onLeaderboardEvent(
            'danger_jump',
            'Bois de Boulogne Danger Jump',
            stepResult.triggeredJumpDistance,
            'm'
          );
        }
        if (stepResult.bankedDriftScore) {
          callbacksRef.current.onLeaderboardEvent(
            'drift_zone',
            'Montmartre Sacré-Cœur Drift Zone',
            stepResult.bankedDriftScore,
            'pts'
          );
        }
      }

      // Update & Check 50 Horizon Tokens (Spinning 'H' Coins + Car Collection + Individual Slow Respawn)
      const nowWallMs = Date.now();
      for (let tIdx = 0; tIdx < horizonTokens.length; tIdx++) {
        const tok = horizonTokens[tIdx];
        if (tok.isCollected) {
          // Slowly respawn this token once its individual timer completes (even if other tokens are not collected!)
          if (nowWallMs - tok.collectedAtMs >= tok.respawnDurationMs) {
            const newPos = pickRandomTokenPosInSector(tok.sectorIndex);
            tok.x = newPos.x;
            tok.y = newPos.y;
            tok.z = newPos.z;
            tok.group.position.set(newPos.x, newPos.y, newPos.z);
            tok.isCollected = false;
            tok.group.visible = true;
          }
        } else {
          // Spin coin & bob gently
          tok.coinMesh.rotation.y = nowSec * 2.5 + tIdx * 0.45;
          tok.coinMesh.position.y = 1.45 + Math.sin(nowSec * 3.2 + tIdx) * 0.16;

          // Check if player's car passes through the token (4.4m capture radius)
          const dxTok = tel.x - tok.x;
          const dzTok = tel.z - tok.z;
          if (dxTok * dxTok + dzTok * dzTok <= 4.4 * 4.4) {
            tok.isCollected = true;
            tok.collectedAtMs = nowWallMs;
            // Slow independent respawn (40s to 55s)
            tok.respawnDurationMs = 40000 + Math.floor(Math.random() * 15000);
            tok.group.visible = false;
            callbacksRef.current.onCollectHorizonToken?.();
          }
        }
      }

      // Check Active Multiplayer Challenge Checkpoint Finish (Only when not in a solo race)
      const activeChal = activeChallengeRef.current;
      if (!isOngoingRace && activeChal && activeChal.status === 'active' && callbacksRef.current.onChallengeFinish) {
        const distToGoal = Math.hypot(tel.x - activeChal.checkpointX, tel.z - activeChal.checkpointZ);
        if (distToGoal < 24) {
          const elapsedSec = Number(((Date.now() - activeChal.startTimeMs) / 1000).toFixed(2));
          callbacksRef.current.onChallengeFinish(elapsedSec);
        }
      }

      // Check Active Race Checkpoint OR Custom Track Point / GPS Beacon Target
      let targetBeaconX: number | null = null;
      let targetBeaconZ: number | null = null;
      let targetBeaconYaw: number | null = null;
      let isRaceTarget = false;

      const raceSession = activeRaceRef.current;
      if (raceSession && !raceSession.isCompleted) {
        const cpIdx = raceSession.currentCheckpointIndex;
        const cp = raceSession.race.checkpoints[cpIdx];
        if (cp) {
          const cpPose = getCheckpointPoseOnRacePath(raceSession.race, cpIdx);
          targetBeaconX = cpPose.x;
          targetBeaconZ = cpPose.z;
          targetBeaconYaw = cpPose.yaw;
          isRaceTarget = true;

          // Position Next-Checkpoint Preview Gate (CP N+1) if available
          const nextCp = raceSession.race.checkpoints[cpIdx + 1];
          if (nextCp) {
            const nextPose = getCheckpointPoseOnRacePath(raceSession.race, cpIdx + 1);
            const nextGround = sampleWorldTerrain(nextPose.x, nextPose.z);
            nextCheckpointPreviewGroup.visible = true;
            nextCheckpointPreviewGroup.position.set(nextPose.x, nextGround.heightY, nextPose.z);
            nextCheckpointPreviewGroup.rotation.y = nextPose.yaw;
          } else {
            nextCheckpointPreviewGroup.visible = false;
          }

          // Check distance to both the beveled pathway pose and raw checkpoint (38m full-corridor capture width)
          const distToPose = Math.hypot(tel.x - cpPose.x, tel.z - cpPose.z);
          const distToRaw = Math.hypot(tel.x - cp.x, tel.z - cp.z);
          const distToCp = Math.min(distToPose, distToRaw);
          const sessionKey = raceSession.sessionId || raceSession.race.id;
          const cpTriggerKey = `${sessionKey}_${cpIdx}`;
          if (
            distToCp < 38 &&
            lastTriggeredRaceCpKey !== cpTriggerKey &&
            callbacksRef.current.onReachRaceCheckpoint
          ) {
            lastTriggeredRaceCpKey = cpTriggerKey;
            callbacksRef.current.onReachRaceCheckpoint();
          }
        } else {
          nextCheckpointPreviewGroup.visible = false;
        }
      } else {
        nextCheckpointPreviewGroup.visible = false;
        if (customTrackPointsRef.current.length > 0) {
          const firstPt = customTrackPointsRef.current[0];
          targetBeaconX = firstPt.x;
          targetBeaconZ = firstPt.z;
          const distToPt = Math.hypot(tel.x - firstPt.x, tel.z - firstPt.z);
          if (distToPt < 22 && callbacksRef.current.onReachCustomTrackPoint) {
            callbacksRef.current.onReachCustomTrackPoint(firstPt.id);
          }
        } else if (trackedDestRef.current) {
          targetBeaconX = trackedDestRef.current.x;
          targetBeaconZ = trackedDestRef.current.z;
        }
      }

      if (targetBeaconX !== null && targetBeaconZ !== null) {
        const tGround = sampleWorldTerrain(targetBeaconX, targetBeaconZ);
        gpsBeaconGroup.visible = true;
        gpsBeaconGroup.position.set(targetBeaconX, tGround.heightY, targetBeaconZ);
        const angleToCar = Math.atan2(tel.x - targetBeaconX, tel.z - targetBeaconZ);
        gpsBeaconGroup.rotation.y = targetBeaconYaw !== null ? targetBeaconYaw : angleToCar;

        const beaconColor = isRaceTarget ? 0xf59e0b : 0x06b6d4;
        beaconBeamMat.color.setHex(beaconColor);
        gateRingMat.color.setHex(beaconColor);
        gatePillarMat.color.setHex(beaconColor);
        gatePillarMat.emissive.setHex(beaconColor);
        gpsRoadLineMat.color.setHex(beaconColor);

        // Keep dynamic hood-ahead GPS chevrons visible during both free-roam and active races!
        gpsChevronGroup.visible = true;

        let dirAngle = Math.atan2(targetBeaconX - tel.x, targetBeaconZ - tel.z);
        if (isRaceTarget) {
          // During an active race, the 3D Race Corridor already renders the full racing line & barriers,
          // so hide the free-roam GPS line and point hood chevrons cleanly toward the active checkpoint gate!
          gpsRoadLine.visible = false;
        } else {
          gpsRoadLine.visible = true;
          // Recompute road-network path every 220ms in free-roam so GPS follows actual roads
          if (now - lastGpsCalcTime > 220 || cachedGpsPath.length < 2) {
            lastGpsCalcTime = now;
            cachedGpsPath = computeRoadNetworkPath(tel.x, tel.z, targetBeaconX, targetBeaconZ).points;
            const roadVerts: number[] = [];
            for (let k = 0; k < cachedGpsPath.length; k++) {
              const pt = cachedGpsPath[k];
              const py = sampleWorldTerrain(pt.x, pt.z).heightY + 0.24;
              roadVerts.push(pt.x, py, pt.z);
            }
            gpsRoadLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
          }
          const nextRoadWaypoint = cachedGpsPath[1] || { x: targetBeaconX, z: targetBeaconZ };
          dirAngle = Math.atan2(nextRoadWaypoint.x - tel.x, nextRoadWaypoint.z - tel.z);
        }

        const dirSin = Math.sin(dirAngle);
        const dirCos = Math.cos(dirAngle);
        chevronMeshes.forEach((chev, idx) => {
          const dAhead = 7 + idx * 5.0;
          const cx = tel.x + dirSin * dAhead;
          const cz = tel.z + dirCos * dAhead;
          const cy = sampleWorldTerrain(cx, cz).heightY + 0.18;
          chev.position.set(cx, cy, cz);
          chev.rotation.y = dirAngle;
          (chev.material as THREE.MeshBasicMaterial).color.setHex(beaconColor);
        });
      } else {
        gpsBeaconGroup.visible = false;
        gpsChevronGroup.visible = false;
        nextCheckpointPreviewGroup.visible = false;
      }

      // Update Player 3D Rig
      const rig = carRigRef.current;
      if (rig) {
        rig.root.position.set(tel.x, tel.y, tel.z);
        rig.root.rotation.y = tel.heading;

        // Normalize RPM from telemetry for burnout & wheelspin visual effects
        const rpmSpan = Math.max(1000, specRef.current.redlineRPM - specRef.current.idleRPM);
        const telRpmNorm = Math.max(0, Math.min(1, (tel.rpm - specRef.current.idleRPM) / rpmSpan));
        const isStationaryBurnout =
          tel.airtimeSec <= 0.04 &&
          tel.speedKmh < 8 &&
          tel.throttle > 0.2 &&
          tel.brake > 0.2 &&
          tel.wheelSpinRatio > 0.3;

        // Body pitch (strictly >= 0 so front NEVER lifts during acceleration or burnout!) and roll on suspension
        rig.chassisGroup.rotation.x = Math.max(0, tel.pitchRad);
        rig.chassisGroup.rotation.z =
          tel.rollRad +
          (isStationaryBurnout ? Math.sin(nowSec * 58) * 0.007 * Math.min(1.2, tel.wheelSpinRatio) : 0);

        // Front wheel steering, 3D interior steering wheel rotation (±90°) & wheel spin (including burnout slip spin)
        rig.frontSteerPivots.forEach((pivot) => {
          pivot.rotation.y = tel.steering * 0.42;
        });
        rig.steeringWheelGroup.rotation.z = -tel.steering * (Math.PI / 2);
        const isCockpitNow = !isGarageViewRef.current && cameraModeRef.current === 'cockpit';
        rig.cockpitHideMeshes.forEach((m) => {
          m.visible = !isCockpitNow;
        });
        const baseWheelSpinStep = (tel.speedKmh / 3.6) * dt * 2.8;
        const slipWheelSpinStep =
          tel.wheelSpinRatio > 0.15
            ? tel.wheelSpinRatio * (0.45 + telRpmNorm * 0.95) * dt * 26
            : 0;
        const isFwd = tuneRef.current.drivetrain === 'FWD';
        rig.wheelMeshes.forEach((wm, idx) => {
          const isFrontWheel = idx < 2;
          const isDrivenWheel = isFwd ? isFrontWheel : !isFrontWheel || tuneRef.current.drivetrain === 'AWD';
          if (isStationaryBurnout) {
            // During stationary burnout, braked non-driven wheels stay locked while driven wheels spin rapidly
            const spinThisWheel = isFwd ? isFrontWheel : !isFrontWheel;
            if (spinThisWheel) {
              wm.rotation.x += slipWheelSpinStep;
            }
          } else {
            wm.rotation.x += baseWheelSpinStep + (isDrivenWheel ? slipWheelSpinStep * 0.55 : 0);
          }
        });

        // Brake light intensity & Thermal Glowing Carbon-Ceramic Brake Rotors under high-speed braking!
        rig.brakeLightMaterial.emissiveIntensity = tel.brake > 0.1 || tel.handbrake ? 3.5 : 0.85;
        if (rig.rotorMaterials && rig.rotorMaterials.length > 0) {
          const rotorMat = rig.rotorMaterials[0];
          const targetHeat =
            tel.brake > 0.18 && tel.speedKmh > 65
              ? Math.min(2.6, ((tel.speedKmh - 65) / 160) * tel.brake * 2.8)
              : 0;
          rotorMat.emissiveIntensity +=
            (targetHeat - rotorMat.emissiveIntensity) * Math.min(1, dt * (targetHeat > rotorMat.emissiveIntensity ? 5.5 : 2.2));
        }

        // Brand-Specific Active Aerodynamics & Hydraulic Airbrake Animation (Pagani 4-Flap, Bugatti/McLaren/Koenigsegg Airbrake, Ferrari Diffuser Flaps)
        if (rig.activeAero) {
          const isBrakingHard = tel.brake > 0.15 && tel.speedKmh > 45;
          const speedDeployFactor = Math.min(1, Math.max(0, (tel.speedKmh - 85) / 140));
          const leftCornerDeploy = Math.max(0, tel.steering) * speedDeployFactor;
          const rightCornerDeploy = Math.max(0, -tel.steering) * speedDeployFactor;

          if (rig.activeAero.fl && rig.activeAero.fr) {
            const targetFL = isBrakingHard ? -0.52 : -leftCornerDeploy * 0.42;
            const targetFR = isBrakingHard ? -0.52 : -rightCornerDeploy * 0.42;
            rig.activeAero.fl.rotation.x += (targetFL - rig.activeAero.fl.rotation.x) * Math.min(1, dt * 12);
            rig.activeAero.fr.rotation.x += (targetFR - rig.activeAero.fr.rotation.x) * Math.min(1, dt * 12);
          }
          if (rig.activeAero.rl && rig.activeAero.rr) {
            const targetRL = isBrakingHard ? -0.58 : -leftCornerDeploy * 0.48 - speedDeployFactor * 0.12;
            const targetRR = isBrakingHard ? -0.58 : -rightCornerDeploy * 0.48 - speedDeployFactor * 0.12;
            rig.activeAero.rl.rotation.x += (targetRL - rig.activeAero.rl.rotation.x) * Math.min(1, dt * 12);
            rig.activeAero.rr.rotation.x += (targetRR - rig.activeAero.rr.rotation.x) * Math.min(1, dt * 12);
          }
          if (
            rig.activeAero.airbrakeWing &&
            rig.activeAero.airbrakeBaseY !== undefined &&
            rig.activeAero.airbrakeBaseRotX !== undefined
          ) {
            const targetLiftY =
              rig.activeAero.airbrakeBaseY +
              speedDeployFactor * 0.08 +
              (isBrakingHard ? 0.06 : 0);
            const targetWingRotX = isBrakingHard
              ? -0.62
              : rig.activeAero.airbrakeBaseRotX - speedDeployFactor * 0.12;
            rig.activeAero.airbrakeWing.position.y +=
              (targetLiftY - rig.activeAero.airbrakeWing.position.y) * Math.min(1, dt * 10);
            rig.activeAero.airbrakeWing.rotation.x +=
              (targetWingRotX - rig.activeAero.airbrakeWing.rotation.x) * Math.min(1, dt * 12);
          }
        }

        // Exhaust backfire flames during active Nitrous boost, gear shifts, or high-RPM throttle lift
        const showFlame =
          tel.nitroActive ||
          pState.shiftCooldownSec > 0.08 ||
          (tel.rpm > specRef.current.redlineRPM * 0.88 && tel.throttle < 0.2);
        const flameOpacity = tel.nitroActive ? 0.92 : showFlame ? 0.82 : 0;
        (rig.flameLeft.material as THREE.MeshBasicMaterial).opacity = flameOpacity;
        (rig.flameRight.material as THREE.MeshBasicMaterial).opacity = flameOpacity;

        // Dynamic Weather & Solar Day/Night Cycle Atmosphere, Sky Dome, Fog, Wet Road Reflection & Precipitation
        const envState = getDynamicWeatherAndDayState(nowSec);
        reusableSkyBg.setHex(envState.skyHorizonHex);
        reusableFogColor.setHex(envState.fogColorHex);
        if (scene.background instanceof THREE.Color) {
          scene.background.copy(reusableSkyBg);
        } else {
          scene.background = reusableSkyBg.clone();
        }

        // Keep 3D Forza Horizon 6 Sky & Cloud Dome centered on player and tinted by solar time-of-day
        skyDomeMesh.position.set(tel.x, 0, tel.z);
        skyDomeMesh.rotation.y = nowSec * 0.0025;
        skyDomeMat.color.setHex(
          envState.timeOfDayPhase === 'night'
            ? 0x1e293b
            : envState.timeOfDayPhase === 'sunset' || envState.timeOfDayPhase === 'dawn'
            ? 0xfed7aa
            : 0xffffff
        );

        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(reusableFogColor);
          // Smoothly scale fog density from crystal-clear sunny (0.00014) to dense foggy/snowy/rainy
          scene.fog.density =
            0.00014 +
            envState.fogDensity * 0.0018 +
            envState.rainIntensity * 0.00055 +
            envState.snowIntensity * 0.00075;
        }

        sunLight.color.setHex(envState.sunColorHex);
        sunLight.intensity = envState.sunIntensity;
        hemiLight.color.setHex(envState.skyTopHex);
        hemiLight.groundColor.setHex(envState.hemiGroundHex);
        hemiLight.intensity = envState.ambientIntensity;

        // Adjust road roughness subtly for wet rain sheen while keeping deep dark asphalt color
        const wetFactor = envState.roadWetness;
        asphaltMat.roughness = 0.86 - wetFactor * 0.32;
        boulevardMat.roughness = 0.88 - wetFactor * 0.32;
        smallStreetMat.roughness = 0.88 - wetFactor * 0.32;

        const sunDist = 160;
        const sunElev = Math.max(0.18, Math.sin(envState.sunElevationRad) + 0.35);
        sunLight.position.set(
          tel.x + Math.cos(envState.sunAzimuthRad) * sunDist,
          tel.y + sunElev * 110,
          tel.z + Math.sin(envState.sunAzimuthRad) * sunDist
        );
        sunLight.target.position.set(tel.x, tel.y, tel.z);
        sunLight.target.updateMatrixWorld();

        // Sync 3D Sky Solar Disc & Corona Halo with sun direction
        const skySunDist = 6800;
        sunDiscGroup.visible = envState.timeOfDayPhase !== 'night';
        sunDiscGroup.position.set(
          tel.x + Math.cos(envState.sunAzimuthRad) * skySunDist,
          Math.max(420, sunElev * 2800),
          tel.z + Math.sin(envState.sunAzimuthRad) * skySunDist
        );
        sunDiscGroup.lookAt(tel.x, tel.y + 2, tel.z);

        // Update 3D Falling Snowflakes during Snowy Weather
        if (envState.snowIntensity > 0.02) {
          snowFlakesPoints.visible = true;
          snowFlakesMat.opacity = Math.min(0.95, 0.35 + envState.snowIntensity * 0.6);
          const snowPosAttr = snowGeo.getAttribute('position') as THREE.BufferAttribute;

          for (let i = 0; i < snowCount; i++) {
            const idx4 = i * 4;
            const phase = snowData[idx4 + 3];
            const fallSpeed = 3.8 + (i % 5) * 0.42;
            const swirlX = Math.sin(nowSec * 1.6 + phase) * 1.85;
            const swirlZ = Math.cos(nowSec * 1.4 + phase * 1.3) * 1.85;

            let sx = snowData[idx4] + (swirlX - tel.vx * 0.35) * dt;
            let sy = snowData[idx4 + 1] - fallSpeed * dt;
            let sz = snowData[idx4 + 2] + (swirlZ - tel.vz * 0.35) * dt;

            if (sy < -1.0) {
              sy += precipHeightY;
              sx = (Math.random() * 2 - 1) * precipHalfSpanXZ;
              sz = (Math.random() * 2 - 1) * precipHalfSpanXZ;
            }
            if (sx < -precipHalfSpanXZ) sx += precipHalfSpanXZ * 2;
            else if (sx > precipHalfSpanXZ) sx -= precipHalfSpanXZ * 2;
            if (sz < -precipHalfSpanXZ) sz += precipHalfSpanXZ * 2;
            else if (sz > precipHalfSpanXZ) sz -= precipHalfSpanXZ * 2;

            snowData[idx4] = sx;
            snowData[idx4 + 1] = sy;
            snowData[idx4 + 2] = sz;

            const pIdx = i * 3;
            snowPositions[pIdx] = tel.x + sx;
            snowPositions[pIdx + 1] = tel.y + sy;
            snowPositions[pIdx + 2] = tel.z + sz;
          }
          snowPosAttr.needsUpdate = true;
        } else {
          snowFlakesPoints.visible = false;
        }
      }

      // Spawn Tire Burnout Smoke / Drift Smoke / Snow Spray / Desert Dust / Gravel Particles + Road Tire Marks
      const rpmRange = Math.max(1000, specRef.current.redlineRPM - specRef.current.idleRPM);
      const rpmNorm = Math.max(0, Math.min(1, (tel.rpm - specRef.current.idleRPM) / rpmRange));

      // Stationary Tire Burnout: triggered when brake and throttle are held simultaneously while stationary,
      // driven by existing telemetry data for wheel slip (tel.wheelSpinRatio) and RPM (tel.rpm)
      const isBurnout =
        tel.airtimeSec <= 0.04 &&
        tel.speedKmh < 8 &&
        tel.throttle > 0.2 &&
        tel.brake > 0.2 &&
        tel.wheelSpinRatio > 0.3 &&
        rpmNorm > 0.2;

      const isSliding =
        Math.abs(tel.slipAngleDeg) > 9.5 ||
        tel.wheelSpinRatio > 0.22 ||
        (tel.handbrake && tel.speedKmh > 20);
      const isOffroadMoving =
        (tel.surface === 'Sand' ||
          tel.surface === 'Dirt' ||
          tel.surface === 'Snow' ||
          tel.surface === 'Gravel') &&
        tel.speedKmh > 28;

      // Lay down persistent dark rubber Tire Drift & Burnout Marks on the road when drifting or doing a burnout
      if (tel.airtimeSec <= 0.04 && ((isSliding && tel.speedKmh > 22) || (isBurnout && Math.random() < 0.22))) {
        const distSinceLastMark = Math.hypot(tel.x - lastDriftMarkX, tel.z - lastDriftMarkZ);
        if (distSinceLastMark >= 0.65 || isBurnout) {
          lastDriftMarkX = tel.x;
          lastDriftMarkZ = tel.z;
          const sinH = Math.sin(tel.heading);
          const cosH = Math.cos(tel.heading);
          const moveYaw =
            Math.hypot(tel.vx, tel.vz) > 2.0 ? Math.atan2(tel.vx, tel.vz) : tel.heading;
          const tireLongitudinalOffset =
            isBurnout && tuneRef.current.drivetrain === 'FWD' ? 1.36 : -1.42;

          // Left & Right spinning tire contact patches
          [-0.82, 0.82].forEach((wheelSide) => {
            const wx = tel.x + sinH * tireLongitudinalOffset + cosH * wheelSide;
            const wz = tel.z + cosH * tireLongitudinalOffset - sinH * wheelSide;
            driftMarkDummy.position.set(wx, tel.y + 0.095, wz);
            driftMarkDummy.rotation.set(0, moveYaw, 0);
            driftMarkDummy.scale.set(1, 1, 1);
            driftMarkDummy.updateMatrix();
            driftMarksInstanced.setMatrixAt(nextDriftMarkIdx, driftMarkDummy.matrix);
            nextDriftMarkIdx = (nextDriftMarkIdx + 1) % maxDriftMarks;
          });
          driftMarksInstanced.instanceMatrix.needsUpdate = true;
        }
      }

      if (isBurnout) {
        // Tire Burnout Smoke Effect scaled by telemetry wheelSpinRatio and RPM (locked 60 FPS pool reuse)
        const slipStrength = Math.min(1.4, Math.max(0.25, tel.wheelSpinRatio));
        const burnoutIntensity = Math.min(1, slipStrength * (0.35 + 0.65 * rpmNorm));
        const sinH = Math.sin(tel.heading);
        const cosH = Math.cos(tel.heading);
        const isFwdBurnout = tuneRef.current.drivetrain === 'FWD';
        const longitudinalWheelZ = isFwdBurnout ? 1.36 : -1.48;

        // Spawn from both left and right spinning tires
        for (let sideIdx = 0; sideIdx < 2; sideIdx++) {
          const wheelSideSign = sideIdx === 0 ? -1 : 1;
          const sideOffset = wheelSideSign * 0.86;
          const p = smokeMeshes[nextSmokeIdx];
          nextSmokeIdx = (nextSmokeIdx + 1) % maxParticles;

          p.life = 1.0;
          p.decayRate = 1.05 + (1 - burnoutIntensity) * 0.45;
          p.startScale = 0.48 + burnoutIntensity * 0.28;
          p.maxScale = 2.2 + burnoutIntensity * 2.4;
          p.maxOpacity = 0.28 + burnoutIntensity * 0.34;
          p.mesh.visible = true;
          p.mesh.position.set(
            tel.x + sinH * longitudinalWheelZ + cosH * sideOffset + (Math.random() - 0.5) * 0.18,
            tel.y + 0.2,
            tel.z + cosH * longitudinalWheelZ - sinH * sideOffset + (Math.random() - 0.5) * 0.18
          );
          p.mesh.scale.setScalar(p.startScale);

          const mat = p.mesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(
            tel.surface === 'Sand'
              ? 0xd97706
              : tel.surface === 'Dirt' || tel.surface === 'Gravel'
              ? 0xa8a29e
              : 0xf1f5f9
          );
          mat.opacity = p.maxOpacity;

          // Billow backward from the spinning tire rotation + outward from the fender arches + upward rise
          const backwardKick = (1.4 + slipStrength * 2.2 * rpmNorm) * (0.75 + Math.random() * 0.5);
          const outwardPush = wheelSideSign * (0.65 + Math.random() * 0.85) * (0.6 + burnoutIntensity * 0.6);
          p.vx = -sinH * backwardKick + cosH * outwardPush + (Math.random() - 0.5) * 0.8;
          p.vy = 0.85 + burnoutIntensity * 0.95 + Math.random() * 0.55;
          p.vz = -cosH * backwardKick - sinH * outwardPush + (Math.random() - 0.5) * 0.8;
        }
      } else if ((isSliding && tel.speedKmh > 20) || isOffroadMoving) {
        const p = smokeMeshes[nextSmokeIdx];
        nextSmokeIdx = (nextSmokeIdx + 1) % maxParticles;
        p.life = 1.0;
        p.decayRate = 1.6;
        p.startScale = 0.6;
        p.maxScale = 3.0;
        p.maxOpacity = 0.38;
        p.mesh.visible = true;
        const sinH = Math.sin(tel.heading);
        const cosH = Math.cos(tel.heading);
        const sideOffset = (nextSmokeIdx % 2 === 0 ? 1 : -1) * 0.85;
        p.mesh.position.set(
          tel.x - sinH * 1.6 + cosH * sideOffset,
          tel.y + 0.22,
          tel.z - cosH * 1.6 - sinH * sideOffset
        );
        p.mesh.scale.setScalar(p.startScale);
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(
          tel.surface === 'Snow'
            ? 0xf8fafc
            : tel.surface === 'Sand'
            ? 0xd97706
            : tel.surface === 'Dirt' || tel.surface === 'Gravel'
            ? 0x78716c
            : 0xe2e8f0
        );
        mat.opacity = 0.42;
        p.vx = (Math.random() - 0.5) * 1.5;
        p.vy = 0.8 + Math.random() * 0.6;
        p.vz = (Math.random() - 0.5) * 1.5;
      }

      for (let i = 0; i < maxParticles; i++) {
        const sp = smokeMeshes[i];
        if (sp.life > 0) {
          sp.life -= dt * sp.decayRate;
          if (sp.life <= 0) {
            sp.mesh.visible = false;
          } else {
            // Smooth air drag on horizontal velocity so burnout smoke lingers in a dense cloud
            const dragFactor = Math.max(0, 1 - dt * 1.8);
            sp.vx *= dragFactor;
            sp.vz *= dragFactor;
            sp.mesh.position.x += sp.vx * dt;
            sp.mesh.position.y += sp.vy * dt;
            sp.mesh.position.z += sp.vz * dt;
            const progress = 1 - sp.life;
            sp.mesh.scale.setScalar(sp.startScale + progress * (sp.maxScale - sp.startScale));
            (sp.mesh.material as THREE.MeshBasicMaterial).opacity = sp.life * sp.maxOpacity;
          }
        }
      }

      // Update Autonomous Parisian Roaming Traffic Cars (Completely hidden & removed during active races!)
      const isRaceCurrentlyActive = Boolean(
        currentRaceSession && !currentRaceSession.isCompleted
      );
      const trafficStates = getParisRoamingTraffic(nowSec, isRaceCurrentlyActive);
      if (isRaceCurrentlyActive) {
        trafficRigs.forEach((tRig) => {
          tRig.root.visible = false;
        });
      } else {
        trafficStates.forEach((tc) => {
          let tRig = trafficRigs.get(tc.id);
          if (!tRig) {
            const tSpec = VEHICLES.find((v) => v.id === tc.vehicleId) || VEHICLES[0];
            const tTune: VehicleTune = {
              ...tSpec.defaultTune,
              paintHex: tc.paintHex,
              rimHex: tc.rimHex,
            };
            tRig = buildVehicleRig(tSpec, tTune);
            scene.add(tRig.root);
            trafficRigs.set(tc.id, tRig);
          }
          tRig.root.visible = true;
          tRig.root.position.set(tc.x, tc.y, tc.z);
          tRig.root.rotation.y = tc.heading;
          const tSpin = (tc.speedKmh / 3.6) * dt * 2.8;
          tRig.wheelMeshes.forEach((wm) => {
            wm.rotation.x += tSpin;
          });
        });
      }

      // Update Active 3D AI Race Bots ("Apex Drivatars") During Races
      const activeBotIds = new Set<string>();
      if (
        currentRaceSession &&
        !currentRaceSession.isCompleted &&
        raceBotsRef.current.length > 0
      ) {
        raceBotsRef.current.forEach((bot) => {
          activeBotIds.add(bot.id);
          let bRig = raceBotRigs.get(bot.id);
          if (!bRig) {
            const bSpec = VEHICLES.find((v) => v.id === bot.vehicleId) || VEHICLES[0];
            const bTune: VehicleTune = {
              ...bSpec.defaultTune,
              paintHex: bot.paintHex,
              rimHex: bot.rimHex,
            };
            bRig = buildVehicleRig(bSpec, bTune);
            scene.add(bRig.root);
            raceBotRigs.set(bot.id, bRig);
          }
          bRig.root.visible = true;
          bRig.root.position.set(bot.x, bot.y, bot.z);
          bRig.root.rotation.y = bot.heading;
          const bSpin = (bot.speedKmh / 3.6) * dt * 2.8;
          bRig.wheelMeshes.forEach((wm) => {
            wm.rotation.x += bSpin;
          });
        });
      }
      raceBotRigs.forEach((bRig, id) => {
        if (!activeBotIds.has(id)) {
          scene.remove(bRig.root);
          raceBotRigs.delete(id);
        }
      });

      // Reconcile & Interpolate Remote Human Multiplayer Vehicles
      const currentRemoteIds = new Set<string>();
      remotePlayersRef.current.forEach((rp) => {
        currentRemoteIds.add(rp.id);
        let remoteRig = remoteRigs.get(rp.id);
        if (!remoteRig) {
          const rSpec = VEHICLES.find((v) => v.id === rp.vehicleId) || VEHICLES[0];
          const rTune: VehicleTune = {
            ...rSpec.defaultTune,
            paintHex: rp.paintHex,
            rimHex: rp.rimHex,
          };
          remoteRig = buildVehicleRig(rSpec, rTune);
          remoteRig.root.position.set(rp.x, rp.y, rp.z);
          scene.add(remoteRig.root);
          remoteRigs.set(rp.id, remoteRig);
        }
        remoteRig.root.position.lerp(new THREE.Vector3(rp.x, rp.y, rp.z), Math.min(1, dt * 10));
        const angleDiff = Math.atan2(
          Math.sin(rp.heading - remoteRig.root.rotation.y),
          Math.cos(rp.heading - remoteRig.root.rotation.y)
        );
        remoteRig.root.rotation.y += angleDiff * Math.min(1, dt * 10);
      });

      remoteRigs.forEach((rRig, id) => {
        if (!currentRemoteIds.has(id)) {
          scene.remove(rRig.root);
          remoteRigs.delete(id);
        }
      });

        // Camera Choreography (Car-relative anchoring eliminates high-speed world-lerp jitter & cockpit drift!)
      const sinH = Math.sin(tel.heading);
      const cosH = Math.cos(tel.heading);
      const mode = isGarageViewRef.current ? 'orbit_garage' : cameraModeRef.current;

      if (mode === 'orbit_garage') {
        garageOrbitAngle += dt * 0.35;
        const radius = 5.6;
        const desiredPos = new THREE.Vector3(
          tel.x + Math.cos(garageOrbitAngle) * radius,
          tel.y + 1.85,
          tel.z + Math.sin(garageOrbitAngle) * radius
        );
        smoothCamPos.lerp(desiredPos, Math.min(1, dt * 8));
        smoothCamLook.lerp(new THREE.Vector3(tel.x, tel.y + 0.75, tel.z), Math.min(1, dt * 10));
        camera.fov = 50;
      } else if (mode === 'cockpit' && rig) {
        // First-Person Cockpit POV inside the driver's seat looking over the 3D steering wheel & dashboard.
        // Update rig.root.matrixWorld(true) so chassisGroup.matrixWorld uses the exact current-frame car transform
        // and NEVER lags behind or drifts away while travelling fast!
        rig.root.updateMatrixWorld(true);
        const worldCockpitEye = rig.cockpitCamPosLocal
          .clone()
          .applyMatrix4(rig.chassisGroup.matrixWorld);
        const worldCockpitLook = rig.cockpitCamLookLocal
          .clone()
          .applyMatrix4(rig.chassisGroup.matrixWorld);
        smoothCamPos.copy(worldCockpitEye);
        smoothCamLook.copy(worldCockpitLook);
        // Keep interior FOV fixed so dashboard & steering wheel never warp or drift away at high speed
        camera.fov = 66;
      } else if (mode === 'hood') {
        if (rig) {
          rig.root.updateMatrixWorld(true);
        }
        const desiredPos = new THREE.Vector3(
          tel.x + sinH * 0.45,
          tel.y + 1.28,
          tel.z + cosH * 0.45
        );
        const desiredLook = new THREE.Vector3(
          tel.x + sinH * 28,
          tel.y + 1.0,
          tel.z + cosH * 28
        );
        smoothCamPos.copy(desiredPos);
        smoothCamLook.copy(desiredLook);
        camera.fov = 66 + Math.min(10, tel.speedKmh * 0.025);
      } else {
        const isClose = mode === 'chase_close';
        const distBack = isClose ? 5.2 : 6.8;
        const baseHeightUp = isClose ? 1.85 : 2.35;
        const userYaw = povYawOffsetRef.current;
        const userPitch = povPitchOffsetRef.current;
        const driftSwing =
          Math.abs(userYaw) < 0.08 ? ((tel.slipAngleDeg * Math.PI) / 180) * 0.28 : 0;
        const targetCamAngle = tel.heading - driftSwing + userYaw;

        if (!chaseCamInitialized || cameraSnapPendingRef.current) {
          smoothChaseCamAngle = targetCamAngle;
          smoothChaseLookAngle = tel.heading;
          smoothChaseCamY = tel.y;
          chaseCamInitialized = true;
          cameraSnapPendingRef.current = false;
        } else {
          const angleDiff = Math.atan2(
            Math.sin(targetCamAngle - smoothChaseCamAngle),
            Math.cos(targetCamAngle - smoothChaseCamAngle)
          );
          smoothChaseCamAngle += angleDiff * Math.min(1, dt * 14);

          const lookAngleDiff = Math.atan2(
            Math.sin(tel.heading - smoothChaseLookAngle),
            Math.cos(tel.heading - smoothChaseLookAngle)
          );
          smoothChaseLookAngle += lookAngleDiff * Math.min(1, dt * 18);
          smoothChaseCamY += (tel.y - smoothChaseCamY) * Math.min(1, dt * 18);
        }

        const pitchHeightOffset = Math.sin(userPitch) * distBack * 0.75;
        const horizRadius = Math.cos(userPitch) * distBack;

        // Anchor camera translation directly to (tel.x, smoothChaseCamY, tel.z) so the car NEVER jitters or glitches at high speed!
        smoothCamPos.set(
          tel.x - Math.sin(smoothChaseCamAngle) * horizRadius,
          Math.max(tel.y + 0.55, smoothChaseCamY + baseHeightUp + pitchHeightOffset),
          tel.z - Math.cos(smoothChaseCamAngle) * horizRadius
        );

        const forwardLookLead = Math.cos(userYaw) * (Math.abs(userYaw) > 0.25 ? 1.2 : 5.5);
        smoothCamLook.set(
          tel.x + Math.sin(smoothChaseLookAngle) * forwardLookLead,
          smoothChaseCamY + 0.92,
          tel.z + Math.cos(smoothChaseLookAngle) * forwardLookLead
        );

        camera.fov = (isClose ? 60 : 63) + Math.min(12, tel.speedKmh * 0.032);
      }

      camera.updateProjectionMatrix();
      camera.position.copy(smoothCamPos);
      camera.lookAt(smoothCamLook);

      renderer.render(scene, camera);

      if (now - lastUiSyncTime > 42) {
        lastUiSyncTime = now;
        callbacksRef.current.onTelemetryUpdate(tel);
        if (
          currentRaceSession &&
          !currentRaceSession.isCompleted &&
          callbacksRef.current.onRaceBotsUpdate
        ) {
          callbacksRef.current.onRaceBotsUpdate(
            activeRacePlayerPos,
            raceBotsRef.current.map((b) => ({ ...b }))
          );
        }
      }
      if (now - lastNetBroadcastTime > 85) {
        lastNetBroadcastTime = now;
        callbacksRef.current.onNetworkBroadcast(tel);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      renderer.dispose();
    };
  }, []);

  const resetPovAngle = () => {
    povYawOffsetRef.current = 0;
    povPitchOffsetRef.current = 0;
  };

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cameraMode !== 'chase_close' && cameraMode !== 'chase_far') return;
    isDraggingPovRef.current = true;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPovRef.current) return;
    const dx = e.clientX - lastPointerPosRef.current.x;
    const dy = e.clientY - lastPointerPosRef.current.y;
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

    povYawOffsetRef.current -= dx * 0.0075;
    povPitchOffsetRef.current = Math.max(
      -0.22,
      Math.min(0.68, povPitchOffsetRef.current + dy * 0.0055)
    );
  };

  const handleViewportPointerUp = () => {
    isDraggingPovRef.current = false;
  };

  return (
    <div
      onPointerDown={handleViewportPointerDown}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handleViewportPointerUp}
      onPointerCancel={handleViewportPointerUp}
      onDoubleClick={resetPovAngle}
      className="relative w-full h-full overflow-hidden bg-[#0b0d12] touch-none"
    >
      {/* Pure Full-Viewport Three.js Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Graceful WebGL Context Lost Fallback */}
      {webglLost && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6 text-center">
          <p className="font-display text-xl font-semibold text-white">
            Restoring 3D Graphics Viewport
          </p>
          <p className="mt-2 text-sm text-slate-300 max-w-md">
            WebGL hardware context was temporarily suspended. Telemetry and performance tuning remain active.
          </p>
        </div>
      )}
    </div>
  );
};
