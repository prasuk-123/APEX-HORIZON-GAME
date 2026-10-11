import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DynoBenchmark, PIClass, VehicleSpec, VehicleTune } from '../types/game';
import { VEHICLES } from '../data/vehicles';
import { computeDynoBenchmark } from '../physics/vehiclePhysics';
import {
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  X,
} from 'lucide-react';

/**
 * The 2 Starter Cars owned by the player at the start of the game:
 * 1. Mid-tier 70,000-credit Sedan: BMW M340i xDrive Saloon · Factory Spec ('veh_0_5_0')
 * 2. Mid-tier 70,000-credit Truck: Toyota Tacoma TRD Pro Overland · Off-Road 4x4 ('veh_2_3_0')
 * Both are worth 70,000 credits and CANNOT be sold.
 */
export const STARTER_SEDAN_ID = 'veh_0_5_0';
export const STARTER_TRUCK_ID = 'veh_2_3_0';
export const DEFAULT_STARTER_OWNED_IDS: string[] = [STARTER_SEDAN_ID, STARTER_TRUCK_ID];
export const NON_SELLABLE_STARTER_IDS = new Set<string>(DEFAULT_STARTER_OWNED_IDS);

/**
 * Currency symbol: 'C' with a horizontal line right through the middle.
 */
const CreditSymbolIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 select-none ${className}`}
    aria-label="Credits"
  >
    <circle
      cx="12"
      cy="12"
      r="10.5"
      fill="rgba(245, 158, 11, 0.18)"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M 15.6 8.2 A 5.2 5.2 0 1 0 15.6 15.8"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <line
      x1="4.8"
      y1="12"
      x2="15.2"
      y2="12"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Compute deterministic Forza Horizon 5 style Autoshow Buy Price for all 260 vehicles
 * ranging from 50,000 credits (entry daily cars) up to 7,000,000 - 8,000,000 credits (flagship hypercars).
 * Always uses the car's factory stock tune (`veh.defaultTune`) so the value of the car
 * NEVER increases or decreases after modification!
 */
export function getVehicleBuyPrice(veh: VehicleSpec, _bench?: DynoBenchmark): number {
  if (NON_SELLABLE_STARTER_IDS.has(veh.id)) {
    return 70000;
  }

  // Always compute value from stock factory benchmark so modifications never alter car value
  const stockBench = computeDynoBenchmark(veh, veh.defaultTune);

  const brandPrestigeMultiplier: Record<string, number> = {
    Bugatti: 2.35,
    Koenigsegg: 2.3,
    Pagani: 2.15,
    'Aston Martin': 1.85,
    Rimac: 1.95,
    Ferrari: 1.65,
    Lamborghini: 1.55,
    McLaren: 1.5,
    Porsche: 1.35,
    'Mercedes-AMG': 1.25,
    BMW: 1.12,
  };

  const prestige = brandPrestigeMultiplier[veh.manufacturer] ?? 1.0;

  let basePrice = 50000;
  if (veh.category === 'Normal & Daily Cars') {
    basePrice = 50000 + Math.max(0, (stockBench.peakPowerHP - 180) * 340);
  } else if (veh.category === 'JDM Street Legend') {
    basePrice = 95000 + Math.max(0, (stockBench.peakPowerHP - 220) * 680);
  } else if (veh.category === 'SUVs & 4x4') {
    basePrice = 110000 + Math.max(0, (stockBench.peakPowerHP - 280) * 820);
  } else if (veh.category === 'Trucks & Heavy Rigs') {
    basePrice = 125000 + Math.max(0, (stockBench.peakPowerHP - 250) * 760);
  } else if (veh.category === 'Muscle & Classic Icons') {
    basePrice = 115000 + Math.max(0, (stockBench.peakPowerHP - 300) * 790);
  } else if (veh.category === 'Modern Supercar' || veh.category === 'Track Toy GT') {
    basePrice = 420000 + Math.max(0, (stockBench.peakPowerHP - 500) * 2400);
  } else if (veh.category === 'Hypercars & Prototypes') {
    basePrice = 2100000 + Math.max(0, (stockBench.peakPowerHP - 750) * 2850);
  }

  const piBonus = Math.pow(Math.max(0, (stockBench.piScore - 500) / 499), 2.4) * 1450000;
  const speedBonus = stockBench.topSpeedKmh > 380 ? (stockBench.topSpeedKmh - 380) * 18500 : 0;

  let hash = 0;
  for (let i = 0; i < veh.id.length; i++) {
    hash = (hash * 31 + veh.id.charCodeAt(i)) & 0xffff;
  }
  const trimVariance = 0.94 + (hash % 13) * 0.01;

  const rawPrice = (basePrice + piBonus + speedBonus) * prestige * trimVariance;
  const clamped = Math.max(50000, Math.min(7950000, rawPrice));

  if (clamped < 150000) {
    return Math.max(50000, Math.round(clamped / 2500) * 2500);
  }
  if (clamped < 1000000) {
    return Math.round(clamped / 10000) * 10000;
  }
  return Math.round(clamped / 25000) * 25000;
}

/**
 * Player sells any sellable owned car for 20% less than its Buy Price (80% of Buy Price).
 */
export function getVehicleSellPrice(buyPrice: number): number {
  return Math.round(buyPrice * 0.8);
}

function getPiClassBadgeColor(piClass: PIClass): string {
  switch (piClass) {
    case 'X':
      return 'bg-emerald-500 text-slate-950 border-emerald-300';
    case 'S2':
      return 'bg-blue-600 text-white border-blue-400';
    case 'S1':
      return 'bg-purple-600 text-white border-purple-400';
    case 'A':
      return 'bg-rose-600 text-white border-rose-400';
    case 'B':
      return 'bg-orange-500 text-slate-950 border-orange-300';
    case 'C':
      return 'bg-amber-400 text-slate-950 border-amber-200';
    case 'D':
    default:
      return 'bg-sky-400 text-slate-950 border-sky-200';
  }
}

/**
 * Pure 60fps Front-View Studio Car Photo Illustration (`FrontCarIllustration`).
 * Renders every vehicle straight from the front with authentic brand grilles,
 * LED headlight signatures, hood creases, cabin windshield, side mirrors, and front tires.
 */
export const FrontCarIllustration: React.FC<{
  spec: VehicleSpec;
  paintHex: string;
  rimHex: string;
}> = React.memo(({ spec, paintHex, rimHex }) => {
  const arch = spec.designArchetype || 'standard';
  const style = spec.bodyStyle;
  const modelKey = `${spec.id} ${spec.name} ${spec.manufacturer}`.toLowerCase();
  const isTruck = style === 'baja_truck' || style === 'heavy_truck';
  const isSuv = style === 'suv_4x4';
  const isHyper = style === 'hypercar' || style === 'supercar' || style === 'track_gt';
  const isBoxy4x4 =
    modelKey.includes('g63') ||
    modelKey.includes('wrangler') ||
    modelKey.includes('defender') ||
    modelKey.includes('bronco') ||
    modelKey.includes('unimog') ||
    modelKey.includes('land cruiser');
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
  const hasRoofScoop =
    arch === 'pagani' ||
    arch === 'mclaren' ||
    arch === 'rally' ||
    modelKey.includes('veneno') ||
    modelKey.includes('bolide') ||
    modelKey.includes('one-1');
  const hasTwinStripes =
    arch === 'muscle' ||
    modelKey.includes('ss-300') ||
    modelKey.includes('speciale') ||
    modelKey.includes('daytona-sp3') ||
    modelKey.includes('ford gt');

  // Geometry proportions by vehicle class (Trucks & SUVs stand taller with higher ground clearance; Hypercars are ultra-wide and low)
  const tireWidth = isTruck ? 34 : isSuv ? 30 : isHyper ? 32 : 28;
  const tireTopY = isTruck ? 70 : isSuv ? 76 : 82;
  const tireBottomY = 122;
  const underbodyY = isTruck ? 94 : isSuv ? 100 : isHyper ? 111 : 107;
  const hoodTopY = isTruck ? 56 : isSuv ? 60 : isHyper ? 70 : 65;
  const roofTopY = isTruck ? 24 : isSuv ? 28 : isHyper ? 40 : 34;
  const roofHalfWidth = isTruck ? 56 : isSuv || isBoxy4x4 ? 54 : arch === 'koenigsegg' || arch === 'pagani' ? 38 : isHyper ? 42 : 48;
  const shoulderHalfWidth = isTruck ? 96 : isSuv ? 94 : isHyper ? 98 : 90;

  const leftWheelX = 130 - shoulderHalfWidth + 4;
  const rightWheelX = 130 + shoulderHalfWidth - tireWidth - 4;

  // Sculpted fender crest height vs center hood valley
  const fenderCrestRaise =
    arch === 'pagani' || arch === 'porsche' || arch === 'ferrari' || arch === 'mclaren' || arch === 'koenigsegg'
      ? 5
      : isHyper
      ? 3
      : 0;
  const hoodCenterDip =
    arch === 'ferrari' || arch === 'porsche' || arch === 'pagani' || arch === 'mclaren'
      ? 4
      : arch === 'muscle' || arch === 'bmw' || arch === 'bugatti'
      ? -3
      : 0;

  // Cabin & Windshield front silhouette
  const cabinPath = `
    M ${130 - shoulderHalfWidth + 14} ${hoodTopY + 2}
    L ${130 - roofHalfWidth} ${roofTopY}
    Q 130 ${roofTopY - (arch === 'koenigsegg' || arch === 'pagani' ? 8 : 4)} ${130 + roofHalfWidth} ${roofTopY}
    L ${130 + shoulderHalfWidth - 14} ${hoodTopY + 2}
    Z
  `;

  const windshieldPath = `
    M ${130 - shoulderHalfWidth + 20} ${hoodTopY}
    L ${130 - roofHalfWidth + 5} ${roofTopY + 5}
    Q 130 ${roofTopY + (arch === 'koenigsegg' ? 0 : 2)} ${130 + roofHalfWidth - 5} ${roofTopY + 5}
    L ${130 + shoulderHalfWidth - 20} ${hoodTopY}
    Z
  `;

  // Main Front Chassis & Sculpted Fender Arch Body Path
  const frontBodyPath = `
    M ${130 - shoulderHalfWidth} ${underbodyY}
    L ${130 - shoulderHalfWidth - 4} ${hoodTopY + 18}
    Q ${130 - shoulderHalfWidth - 2} ${hoodTopY - fenderCrestRaise} ${130 - shoulderHalfWidth + 22} ${hoodTopY - fenderCrestRaise}
    Q 130 ${hoodTopY + hoodCenterDip} ${130 + shoulderHalfWidth - 22} ${hoodTopY - fenderCrestRaise}
    Q ${130 + shoulderHalfWidth + 2} ${hoodTopY - fenderCrestRaise} ${130 + shoulderHalfWidth + 4} ${hoodTopY + 18}
    L ${130 + shoulderHalfWidth} ${underbodyY}
    Z
  `;

  return (
    <svg
      viewBox="0 0 260 134"
      className="w-full h-full select-none pointer-events-none overflow-visible"
    >
      <defs>
        <linearGradient id={`frontPaint_${spec.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
          <stop offset="28%" stopColor={paintHex} stopOpacity="1" />
          <stop offset="85%" stopColor={paintHex} stopOpacity="0.94" />
          <stop offset="100%" stopColor="#050811" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`glassGrad_${spec.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="42%" stopColor="#0f172a" />
          <stop offset="54%" stopColor="#334155" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>

      {/* Studio Wet-Floor Reflection & Headlight Floor Glow */}
      <ellipse cx="130" cy="122" rx="112" ry="8.5" fill="rgba(0,0,0,0.78)" />
      <ellipse cx="130" cy="124" rx="76" ry="3.5" fill={paintHex} opacity="0.16" />
      <ellipse cx="64" cy="123" rx="24" ry="4.5" fill="rgba(56,189,248,0.28)" />
      <ellipse cx="196" cy="123" rx="24" ry="4.5" fill="rgba(56,189,248,0.28)" />

      {/* Rear Aero Wing Extending Above Roof on Track GT / Hypercars / Rally / Supra */}
      {(isHyper || arch === 'rally' || modelKey.includes('supra') || modelKey.includes('skyline') || modelKey.includes('gt-r')) &&
        !isTruck &&
        !isSuv &&
        !modelKey.includes('speedtail') &&
        !modelKey.includes('absolut') && (
          <g>
            {modelKey.includes('supra') ? (
              /* Supra MK4 Iconic Curved High-Arch Basket-Handle Wing */
              <path
                d={`M 54 ${hoodTopY} Q 58 ${roofTopY - 6} 130 ${roofTopY - 6} Q 202 ${roofTopY - 6} 206 ${hoodTopY}`}
                fill="none"
                stroke={paintHex}
                strokeWidth="4"
              />
            ) : (
              <>
                <path
                  d={`M 44 ${roofTopY + 2} L 216 ${roofTopY + 2} L 222 ${roofTopY - 4} L 38 ${roofTopY - 4} Z`}
                  fill="#0f172a"
                  stroke={paintHex}
                  strokeWidth="1.2"
                />
                {/* Wing Endplates */}
                <rect x="36" y={roofTopY - 6} width="4" height="12" rx="1" fill={paintHex} />
                <rect x="220" y={roofTopY - 6} width="4" height="12" rx="1" fill={paintHex} />
                <line x1="94" y1={roofTopY + 2} x2="94" y2={roofTopY + 12} stroke="#475569" strokeWidth="2.5" />
                <line x1="166" y1={roofTopY + 2} x2="166" y2={roofTopY + 12} stroke="#475569" strokeWidth="2.5" />
              </>
            )}
          </g>
        )}

      {/* Overhead Carbon Roof Snorkel / Rally Roof Scoop */}
      {hasRoofScoop && !isTruck && !isSuv && (
        <g>
          <rect
            x="118"
            y={roofTopY - 6}
            width="24"
            height="8"
            rx="3"
            fill="#0f172a"
            stroke="#64748b"
            strokeWidth="1.2"
          />
          <rect x="122" y={roofTopY - 4} width="16" height="4" rx="1.5" fill="#020617" />
        </g>
      )}

      {/* Rally Mudflaps Behind Front Wheels */}
      {arch === 'rally' && (
        <g>
          <rect x={leftWheelX - 3} y={tireBottomY - 18} width="10" height="15" rx="1.5" fill="#ef4444" />
          <rect x={rightWheelX + tireWidth - 7} y={tireBottomY - 18} width="10" height="15" rx="1.5" fill="#ef4444" />
        </g>
      )}

      {/* Left & Right Wide Front Tires (with Off-Road Tread Blocks & Brembo Caliper Glimpse) */}
      {[leftWheelX, rightWheelX].map((tx, idx) => (
        <g key={idx}>
          <rect
            x={tx}
            y={tireTopY}
            width={tireWidth}
            height={tireBottomY - tireTopY}
            rx={isTruck ? 5 : 4}
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          {/* Tire Tread Grooves */}
          {[0.25, 0.5, 0.75].map((pct, gIdx) => (
            <line
              key={gIdx}
              x1={tx + tireWidth * pct}
              y1={tireTopY + 3}
              x2={tx + tireWidth * pct}
              y2={tireBottomY - 2}
              stroke="#1e293b"
              strokeWidth="1.4"
              strokeDasharray={isTruck ? '4 3' : '6 4'}
            />
          ))}
          {/* Outer Rim Edge Lip & Inner Brake Caliper Accent */}
          <rect
            x={idx === 0 ? tx + 2 : tx + tireWidth - 5}
            y={tireTopY + 9}
            width="3.5"
            height={tireBottomY - tireTopY - 18}
            rx="1"
            fill={rimHex}
            opacity="0.85"
          />
          <rect
            x={idx === 0 ? tx + 6 : tx + tireWidth - 9}
            y={tireTopY + 14}
            width="2.5"
            height="12"
            rx="1"
            fill="#ef4444"
            opacity="0.9"
          />
        </g>
      ))}

      {/* Truck / SUV Heavy Duty Front Axle, Differential & Skid Plate */}
      {(isTruck || isSuv) && (
        <g>
          <rect
            x="68"
            y={underbodyY - 4}
            width="124"
            height="14"
            rx="4"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1.2"
          />
          {/* Alloy Skid Plate Ribs */}
          <rect x="92" y={underbodyY - 2} width="76" height="12" rx="3" fill="#64748b" />
          {[104, 118, 130, 142, 156].map((rx) => (
            <line
              key={rx}
              x1={rx}
              y1={underbodyY}
              x2={rx}
              y2={underbodyY + 8}
              stroke="#0f172a"
              strokeWidth="2"
            />
          ))}
          {/* Red Recovery Tow Hooks */}
          <rect x="78" y={underbodyY + 2} width="8" height="6" rx="2" fill="#ef4444" />
          <rect x="174" y={underbodyY + 2} width="8" height="6" rx="2" fill="#ef4444" />
        </g>
      )}

      {/* Left & Right Aerodynamic Side Mirrors (Pagani High Leaf Stalks vs Standard) */}
      {arch === 'pagani' ? (
        <g>
          <path d={`M 48 ${hoodTopY} Q 34 ${hoodTopY - 14} 24 ${hoodTopY - 12}`} fill="none" stroke="#e2e8f0" strokeWidth="1.8" />
          <ellipse cx="22" cy={hoodTopY - 12} rx="7" ry="3.2" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
          <path d={`M 212 ${hoodTopY} Q 226 ${hoodTopY - 14} 236 ${hoodTopY - 12}`} fill="none" stroke="#e2e8f0" strokeWidth="1.8" />
          <ellipse cx="238" cy={hoodTopY - 12} rx="7" ry="3.2" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
        </g>
      ) : (
        <>
          <path
            d={`M ${130 - shoulderHalfWidth + 14} ${hoodTopY + 2} L ${130 - shoulderHalfWidth - 10} ${
              hoodTopY - 5
            } L ${130 - shoulderHalfWidth - 8} ${hoodTopY + 3} L ${130 - shoulderHalfWidth + 10} ${
              hoodTopY + 6
            } Z`}
            fill={paintHex}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
          />
          <path
            d={`M ${130 + shoulderHalfWidth - 14} ${hoodTopY + 2} L ${130 + shoulderHalfWidth + 10} ${
              hoodTopY - 5
            } L ${130 + shoulderHalfWidth + 8} ${hoodTopY + 3} L ${130 + shoulderHalfWidth - 10} ${
              hoodTopY + 6
            } Z`}
            fill={paintHex}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
          />
        </>
      )}

      {/* Cabin Roof & A-Pillars */}
      <path
        d={cabinPath}
        fill={paintHex}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Front Windshield Glass + Interior Sport Seats & Glare Reflection */}
      <path
        d={windshieldPath}
        fill={`url(#glassGrad_${spec.id})`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Left & Right Sport Bucket Seat Headrests & Racing Harness Pass-Throughs inside Cabin */}
      <rect
        x="99"
        y={hoodTopY - 16}
        width="17"
        height="14"
        rx="4"
        fill="#090d16"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.9"
      />
      <rect x="103" y={hoodTopY - 12} width="3" height="4" rx="1" fill="#f59e0b" />
      <rect x="109" y={hoodTopY - 12} width="3" height="4" rx="1" fill="#f59e0b" />
      <rect
        x="144"
        y={hoodTopY - 16}
        width="17"
        height="14"
        rx="4"
        fill="#090d16"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.9"
      />
      <rect x="148" y={hoodTopY - 12} width="3" height="4" rx="1" fill="#f59e0b" />
      <rect x="154" y={hoodTopY - 12} width="3" height="4" rx="1" fill="#f59e0b" />
      {/* Interior Rearview Mirror & Steering Wheel Rim Top */}
      <rect x="122" y={roofTopY + 8} width="16" height="4" rx="2" fill="#090d16" />
      <path d={`M 99 ${hoodTopY - 2} A 9 9 0 0 1 117 ${hoodTopY - 2}`} fill="none" stroke="#475569" strokeWidth="2.2" />
      {/* Koenigsegg / Prototype Single Central Vertical Windshield Wiper */}
      {(arch === 'koenigsegg' || arch === 'pagani' || modelKey.includes('solus') || modelKey.includes('bolide')) && (
        <line x1="130" y1={roofTopY + 9} x2="130" y2={hoodTopY} stroke="#090d16" strokeWidth="2.2" />
      )}
      {/* Diagonal Windshield Studio Light Glare */}
      <path
        d={`M ${130 - roofHalfWidth + 14} ${roofTopY + 6} L ${130 - roofHalfWidth + 28} ${
          roofTopY + 6
        } L ${130 - roofHalfWidth + 8} ${hoodTopY - 2} L ${130 - roofHalfWidth - 4} ${
          hoodTopY - 2
        } Z`}
        fill="rgba(255,255,255,0.16)"
      />

      {/* Truck / Boxy 4x4 Roof Clearance Marker LEDs / Safari Lightbar */}
      {(isTruck || isBoxy4x4) && (
        <g>
          <rect x="86" y={roofTopY - 4} width="88" height="5" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1" />
          {[96, 108, 120, 130, 140, 152, 164].map((lx) => (
            <circle key={lx} cx={lx} cy={roofTopY - 1.5} r="1.8" fill={isTruck ? '#f59e0b' : '#e0f2fe'} />
          ))}
        </g>
      )}

      {/* Main Front Chassis Body & Sculpted Fenders */}
      <path
        d={frontBodyPath}
        fill={paintHex}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d={frontBodyPath} fill={`url(#frontPaint_${spec.id})`} strokeLinejoin="round" />

      {/* Over-the-Top Twin Le Mans Racing Stripes (Muscle / Ford GT / Speciale / Bugatti SS) */}
      {hasTwinStripes && !isTruck && (
        <g opacity="0.88">
          <polygon
            points={`115,${hoodTopY} 125,${hoodTopY} 123,${hoodTopY + 26} 112,${hoodTopY + 26}`}
            fill="rgba(255,255,255,0.85)"
          />
          <polygon
            points={`135,${hoodTopY} 145,${hoodTopY} 148,${hoodTopY + 26} 137,${hoodTopY + 26}`}
            fill="rgba(255,255,255,0.85)"
          />
        </g>
      )}

      {/* Muscle Car Chrome Supercharger Blower Bug-Catcher Scoop with 3 Red Butterfly Valves */}
      {arch === 'muscle' && !modelKey.includes('corvette') && !modelKey.includes('ford gt') && (
        <g>
          <rect
            x="110"
            y={hoodTopY - 9}
            width="40"
            height="12"
            rx="4"
            fill="#e2e8f0"
            stroke="#0f172a"
            strokeWidth="1.4"
          />
          <rect x="113" y={hoodTopY - 7} width="34" height="8" rx="3" fill="#090d16" />
          {[119, 130, 141].map((bx) => (
            <circle key={bx} cx={bx} cy={hoodTopY - 3} r="3.2" fill="#ef4444" stroke="#cbd5e1" strokeWidth="0.9" />
          ))}
        </g>
      )}

      {/* Rally Car Hood Top-Mount Intercooler (TMIC) Scoop */}
      {arch === 'rally' && (
        <g>
          <path
            d={`M 104 ${hoodTopY + 4} L 110 ${hoodTopY - 3} L 150 ${hoodTopY - 3} L 156 ${hoodTopY + 4} Z`}
            fill={paintHex}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.2"
          />
          <rect x="111" y={hoodTopY - 1} width="38" height="4" rx="1" fill="#090d16" />
        </g>
      )}

      {/* Sculpted Hood Crease Lines & Aero Vents */}
      <path
        d={`M ${130 - roofHalfWidth + 10} ${hoodTopY + 1} L 100 ${hoodTopY + 18}`}
        stroke="rgba(15,23,42,0.58)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d={`M ${130 + roofHalfWidth - 10} ${hoodTopY + 1} L 160 ${hoodTopY + 18}`}
        stroke="rgba(15,23,42,0.58)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Hood Nostrils / S-Duct / GT3 Extractor Vent */}
      {arch !== 'muscle' && arch !== 'rally' && (
        <>
          <rect x="110" y={hoodTopY + 5} width="16" height="3.8" rx="1.5" fill="#090d16" opacity="0.82" />
          <rect x="134" y={hoodTopY + 5} width="16" height="3.8" rx="1.5" fill="#090d16" opacity="0.82" />
        </>
      )}

      {/* Koenigsegg / Track GT Outer Bumper Carbon Dive-Plane Canards */}
      {(arch === 'koenigsegg' || isHyper) && !isTruck && !isSuv && (
        <g stroke="#334155" strokeWidth="1.4" fill="#090d16">
          <polygon points={`28,${underbodyY - 14} 38,${underbodyY - 10} 36,${underbodyY - 4} 26,${underbodyY - 8}`} />
          <polygon points={`232,${underbodyY - 14} 222,${underbodyY - 10} 224,${underbodyY - 4} 234,${underbodyY - 8}`} />
        </g>
      )}

      {/* Front Carbon Splitter Lip (with Nismo/Track Red Pinstripe on GT-R & Track Cars) */}
      {!isTruck && !isSuv && (
        <g>
          <path
            d={`M ${130 - shoulderHalfWidth - 2} ${underbodyY} L ${
              130 + shoulderHalfWidth + 2
            } ${underbodyY} L ${130 + shoulderHalfWidth - 4} ${underbodyY + 5.5} L ${
              130 - shoulderHalfWidth + 4
            } ${underbodyY + 5.5} Z`}
            fill="#090d16"
            stroke={arch === 'nissan' || isHyper ? '#ef4444' : '#475569'}
            strokeWidth="1.1"
          />
        </g>
      )}

      {/* =====================================================================
          BRAND-AUTHENTIC FRONT GRILLE & LOWER INTAKES
         ===================================================================== */}
      {arch === 'bmw' ? (
        /* BMW Iconic Twin Kidney Grille + Lower M Intakes */
        <g>
          <circle cx="130" cy={hoodTopY + 12} r="3.2" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.9" />
          <rect
            x="101"
            y={hoodTopY + 17}
            width="26"
            height="17"
            rx="5"
            fill="#090d16"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          <rect
            x="133"
            y={hoodTopY + 17}
            width="26"
            height="17"
            rx="5"
            fill="#090d16"
            stroke="#e2e8f0"
            strokeWidth="2"
          />
          {[107, 113, 119, 139, 145, 151].map((sx, idx) => (
            <line
              key={sx}
              x1={sx}
              y1={hoodTopY + 19}
              x2={sx}
              y2={hoodTopY + 32}
              stroke={idx === 1 ? '#38bdf8' : idx === 2 ? '#ef4444' : '#64748b'}
              strokeWidth="1.5"
            />
          ))}
          <polygon
            points={`46,${hoodTopY + 24} 88,${hoodTopY + 26} 84,${underbodyY - 3} 44,${underbodyY - 3}`}
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1"
          />
          <polygon
            points={`214,${hoodTopY + 24} 172,${hoodTopY + 26} 176,${underbodyY - 3} 216,${underbodyY - 3}`}
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1"
          />
        </g>
      ) : arch === 'bugatti' ? (
        /* Bugatti Signature Horseshoe Center Grille + Red Macaron + Side Intakes */
        <g>
          <path
            d={`M 112 ${underbodyY} L 112 ${hoodTopY + 22} C 112 ${hoodTopY + 9}, 148 ${
              hoodTopY + 9
            }, 148 ${hoodTopY + 22} L 148 ${underbodyY} Z`}
            fill="#090d16"
            stroke="#e2e8f0"
            strokeWidth="2.2"
          />
          <circle cx="130" cy={hoodTopY + 18} r="3.6" fill="#ef4444" stroke="#ffffff" strokeWidth="0.9" />
          <rect
            x="46"
            y={hoodTopY + 26}
            width="56"
            height="12"
            rx="3"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1.1"
          />
          <rect
            x="158"
            y={hoodTopY + 26}
            width="56"
            height="12"
            rx="3"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1.1"
          />
        </g>
      ) : arch === 'lamborghini' ? (
        /* Lamborghini Hexagonal Twin Intakes + Gold Raging Bull Shield */
        <g>
          <polygon points={`130,${hoodTopY + 10} 134,${hoodTopY + 14} 130,${hoodTopY + 19} 126,${hoodTopY + 14}`} fill="#f59e0b" />
          <polygon
            points={`42,${hoodTopY + 22} 98,${hoodTopY + 25} 92,${underbodyY - 3} 40,${underbodyY - 3}`}
            fill="#090d16"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.2"
          />
          <polygon
            points={`218,${hoodTopY + 22} 162,${hoodTopY + 25} 168,${underbodyY - 3} 220,${underbodyY - 3}`}
            fill="#090d16"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="1.2"
          />
          <rect x="98" y={underbodyY - 12} width="64" height="9" rx="2" fill="#090d16" />
        </g>
      ) : arch === 'audi' ? (
        /* Audi Hexagonal Singleframe Honeycomb Grille + 4 Interlocking Chrome Rings */
        <g>
          <polygon
            points={`84,${hoodTopY + 16} 176,${hoodTopY + 16} 184,${hoodTopY + 26} 172,${underbodyY - 3} 88,${underbodyY - 3} 76,${hoodTopY + 26}`}
            fill="#090d16"
            stroke="#cbd5e1"
            strokeWidth="1.8"
          />
          {[118, 126, 134, 142].map((rx) => (
            <circle
              key={rx}
              cx={rx}
              cy={hoodTopY + 24}
              r="4.2"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="1.3"
            />
          ))}
          <polygon
            points={`42,${hoodTopY + 23} 72,${hoodTopY + 25} 68,${underbodyY - 3} 40,${underbodyY - 3}`}
            fill="#090d16"
            stroke="#475569"
            strokeWidth="1.1"
          />
          <polygon
            points={`218,${hoodTopY + 23} 188,${hoodTopY + 25} 192,${underbodyY - 3} 220,${underbodyY - 3}`}
            fill="#090d16"
            stroke="#475569"
            strokeWidth="1.1"
          />
        </g>
      ) : arch === 'nissan' ? (
        /* Nissan GT-R / Skyline V-Motion Grille, Red GT-R Badge & Visible Aluminum Intercooler */
        <g>
          <polygon
            points={`82,${hoodTopY + 16} 178,${hoodTopY + 16} 168,${underbodyY - 2} 92,${underbodyY - 2}`}
            fill="#090d16"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <polyline
            points={`90,${hoodTopY + 16} 112,${hoodTopY + 29} 148,${hoodTopY + 29} 170,${hoodTopY + 16}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="2.2"
          />
          {/* Visible Aluminum Front-Mount Intercooler Core */}
          <rect
            x="98"
            y={underbodyY - 13}
            width="64"
            height="10"
            rx="1.5"
            fill="#94a3b8"
            stroke="#475569"
            strokeWidth="1"
          />
          {/* GT-R Red Nose Badge */}
          <rect x="125" y={hoodTopY + 20} width="10" height="5" rx="1" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
        </g>
      ) : arch === 'muscle' ? (
        /* American Muscle Deep Recessed Black Honeycomb Grille + Lower Chin Spoiler */
        <g>
          <rect
            x="44"
            y={hoodTopY + 12}
            width="172"
            height="18"
            rx="3"
            fill="#050811"
            stroke="#cbd5e1"
            strokeWidth="1.6"
          />
          <line x1="130" y1={hoodTopY + 12} x2="130" y2={hoodTopY + 30} stroke="#64748b" strokeWidth="2" />
          <rect
            x="76"
            y={underbodyY - 11}
            width="108"
            height="8"
            rx="2"
            fill="#090d16"
            stroke="#475569"
            strokeWidth="1"
          />
        </g>
      ) : arch === 'mercedes' || arch === 'aston' ? (
        /* Mercedes-AMG Panamericana Vertical-Slat Grille / Aston Martin Vane Grille */
        <g>
          <polygon
            points={`76,${hoodTopY + 17} 184,${hoodTopY + 17} 192,${underbodyY - 5} 68,${underbodyY - 5}`}
            fill="#090d16"
            stroke="#cbd5e1"
            strokeWidth="1.6"
          />
          {arch === 'mercedes' ? (
            <>
              {[86, 98, 110, 122, 138, 150, 162, 174].map((sx) => (
                <line
                  key={sx}
                  x1={sx}
                  y1={hoodTopY + 18}
                  x2={sx}
                  y2={underbodyY - 6}
                  stroke="#94a3b8"
                  strokeWidth="1.3"
                />
              ))}
              <circle cx="130" cy={hoodTopY + 25} r="6.5" fill="#090d16" stroke="#f8fafc" strokeWidth="1.6" />
            </>
          ) : (
            <>
              {[hoodTopY + 21, hoodTopY + 25, hoodTopY + 29].map((sy) => (
                <line key={sy} x1="74" y1={sy} x2="186" y2={sy} stroke="#94a3b8" strokeWidth="1.2" />
              ))}
            </>
          )}
        </g>
      ) : isTruck || isBoxy4x4 ? (
        /* Pickup / Baja Truck / G63 / Wrangler Wide Off-Road Grille with 3 Amber Marker Lights */
        <g>
          <rect
            x="74"
            y={hoodTopY + 10}
            width="112"
            height="24"
            rx="4"
            fill="#090d16"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          {isBoxy4x4 ? (
            [86, 100, 114, 130, 146, 160, 174].map((vx) => (
              <line key={vx} x1={vx} y1={hoodTopY + 12} x2={vx} y2={hoodTopY + 32} stroke="#64748b" strokeWidth="2.2" />
            ))
          ) : (
            <>
              <rect x="76" y={hoodTopY + 19} width="108" height="6" fill="#334155" />
              {[114, 130, 146].map((mx) => (
                <rect key={mx} x={mx - 3} y={hoodTopY + 12} width="6" height="3" rx="1" fill="#f59e0b" />
              ))}
            </>
          )}
        </g>
      ) : (
        /* Ferrari / McLaren / Porsche / Koenigsegg / Pagani / JDM / Rally Front Grille & Intercooler */
        <g>
          {/* Ferrari F80 / Daytona SP3 Black Nose Visor Mask */}
          {(modelKey.includes('f80') || modelKey.includes('daytona-sp3')) && (
            <rect x="44" y={hoodTopY + 9} width="172" height="7" rx="2" fill="#090d16" />
          )}
          <rect
            x="78"
            y={hoodTopY + 18}
            width="104"
            height="14"
            rx="5"
            fill="#090d16"
            stroke="#475569"
            strokeWidth="1.5"
          />
          {/* Visible Aluminum Intercooler on JDM / Rally / Turbo Cars */}
          {(arch === 'jdm' || arch === 'rally') && (
            <rect x="92" y={hoodTopY + 20} width="76" height="10" rx="2" fill="#94a3b8" opacity="0.85" />
          )}
          {/* Center Brand Crest */}
          <circle
            cx="130"
            cy={hoodTopY + 13}
            r="4.2"
            fill={arch === 'ferrari' || arch === 'porsche' ? '#facc15' : arch === 'jdm' ? '#ef4444' : '#1e293b'}
            stroke="#e2e8f0"
            strokeWidth="1.1"
          />
          {/* Lower Bumper Corner Air Ducts */}
          <rect
            x="44"
            y={underbodyY - 14}
            width="32"
            height="10"
            rx="2"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1"
          />
          <rect
            x="184"
            y={underbodyY - 14}
            width="32"
            height="10"
            rx="2"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1"
          />
          {/* Rally Quad Safari Fog Light Pod Bar across the center nose! */}
          {arch === 'rally' && (
            <g>
              {[100, 120, 140, 160].map((px) => (
                <circle
                  key={px}
                  cx={px}
                  cy={hoodTopY + 18}
                  r="6.5"
                  fill="#fef08a"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                />
              ))}
            </g>
          )}
        </g>
      )}

      {/* =====================================================================
          LEFT & RIGHT FRONT LED HEADLIGHTS, POP-UP PODS & DRL SIGNATURES
         ===================================================================== */}
      {hasPopUpHeadlights && (
        /* Classic 1980s/90s Retractable Pop-Up Headlight Pods on Hood Edge (AE86, RX-7, F40, Countach, Diablo, Miura) */
        <g>
          {[54, 184].map((px, idx) => (
            <g key={idx}>
              <rect
                x={px}
                y={hoodTopY - 6}
                width="22"
                height="13"
                rx="2.5"
                fill={paintHex}
                stroke="#090d16"
                strokeWidth="1.4"
              />
              <rect x={px + 2.5} y={hoodTopY - 3.5} width="17" height="8.5" rx="1.5" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
            </g>
          ))}
        </g>
      )}

      {arch === 'lamborghini' ? (
        /* Lamborghini Y-Shaped Laser LED Headlights */
        <g stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" fill="none">
          <path d={`M 42 ${hoodTopY + 12} L 66 ${hoodTopY + 16} L 82 ${hoodTopY + 12}`} />
          <path d={`M 66 ${hoodTopY + 16} L 62 ${hoodTopY + 23}`} />
          <path d={`M 218 ${hoodTopY + 12} L 194 ${hoodTopY + 16} L 178 ${hoodTopY + 12}`} />
          <path d={`M 194 ${hoodTopY + 16} L 198 ${hoodTopY + 23}`} />
        </g>
      ) : arch === 'porsche' ? (
        /* Porsche Raised Oval "Frog-Eye" Headlights with 4-Point Matrix LEDs */
        <g>
          {[58, 202].map((hx, idx) => (
            <g key={idx}>
              <ellipse
                cx={hx}
                cy={hoodTopY + 10}
                rx="14"
                ry="8.5"
                fill="#090d16"
                stroke="#38bdf8"
                strokeWidth="1.8"
              />
              <circle cx={hx - 5} cy={hoodTopY + 8} r="1.9" fill="#ffffff" />
              <circle cx={hx + 5} cy={hoodTopY + 8} r="1.9" fill="#ffffff" />
              <circle cx={hx - 5} cy={hoodTopY + 12} r="1.9" fill="#ffffff" />
              <circle cx={hx + 5} cy={hoodTopY + 12} r="1.9" fill="#ffffff" />
            </g>
          ))}
        </g>
      ) : arch === 'bugatti' ? (
        /* Bugatti 8-Eye Quad-Crystal LED Projector Array (4 square jewels per side) */
        <g>
          <rect x="42" y={hoodTopY + 12} width="44" height="10" rx="3" fill="#090d16" stroke="#38bdf8" strokeWidth="1.4" />
          {[47, 57, 67, 77].map((ex) => (
            <rect key={ex} x={ex} y={hoodTopY + 14.5} width="6" height="5" rx="1" fill="#ffffff" />
          ))}
          <rect x="174" y={hoodTopY + 12} width="44" height="10" rx="3" fill="#090d16" stroke="#38bdf8" strokeWidth="1.4" />
          {[179, 189, 199, 209].map((ex) => (
            <rect key={ex} x={ex} y={hoodTopY + 14.5} width="6" height="5" rx="1" fill="#ffffff" />
          ))}
        </g>
      ) : arch === 'pagani' ? (
        /* Pagani Twin Raised Leaf-Shaped Dual Bi-Xenon Projector Pods on Fenders */
        <g>
          {[50, 65, 195, 210].map((px, idx) => (
            <circle
              key={idx}
              cx={px}
              cy={hoodTopY + (idx % 2 === 0 ? 10 : 13)}
              r="5.2"
              fill="#e0f2fe"
              stroke="#090d16"
              strokeWidth="1.8"
            />
          ))}
        </g>
      ) : arch === 'bmw' ? (
        /* BMW Quad Hexagonal "Angel-Eye" Laser Halo Headlights */
        <g>
          <rect x="42" y={hoodTopY + 13} width="44" height="11" rx="3" fill="#090d16" stroke="#475569" strokeWidth="1.2" />
          <rect x="174" y={hoodTopY + 13} width="44" height="11" rx="3" fill="#090d16" stroke="#475569" strokeWidth="1.2" />
          {[54, 72, 188, 206].map((hx) => (
            <circle
              key={hx}
              cx={hx}
              cy={hoodTopY + 18.5}
              r="4.5"
              fill="none"
              stroke={modelKey.includes('cs') || modelKey.includes('gtr') ? '#facc15' : '#38bdf8'}
              strokeWidth="2"
            />
          ))}
        </g>
      ) : arch === 'muscle' ? (
        /* American Muscle Quad Circular Halo Headlamps inside Recessed Grille */
        <g>
          {[56, 74, 186, 204].map((hx, idx) => (
            <circle
              key={hx}
              cx={hx}
              cy={hoodTopY + 21}
              r={idx === 0 || idx === 3 ? 6.2 : 5.2}
              fill="#090d16"
              stroke={ (idx === 1 || idx === 2) && modelKey.includes('demon') ? '#f59e0b' : '#e0f2fe'}
              strokeWidth="2.2"
            />
          ))}
        </g>
      ) : isBoxy4x4 ? (
        /* G63 AMG / Wrangler / Defender Iconic Circular LED Halo Headlights + Fender Blinkers */
        <g>
          {[56, 204].map((hx) => (
            <g key={hx}>
              <circle cx={hx} cy={hoodTopY + 20} r="9" fill="#090d16" stroke="#ffffff" strokeWidth="2.4" />
              <circle cx={hx} cy={hoodTopY + 20} r="4.5" fill="#bae6fd" />
              <rect x={hx - 6} y={hoodTopY - 4} width="12" height="4" rx="1.5" fill="#f59e0b" />
            </g>
          ))}
        </g>
      ) : isTruck ? (
        /* Truck C-Clamp Dual-Beam LED Headlights */
        <g>
          <rect
            x="40"
            y={hoodTopY + 10}
            width="28"
            height="22"
            rx="3"
            fill="#090d16"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <rect x="45" y={hoodTopY + 14} width="18" height="6" rx="1" fill="#e0f2fe" />
          <rect x="45" y={hoodTopY + 22} width="18" height="6" rx="1" fill="#38bdf8" />

          <rect
            x="192"
            y={hoodTopY + 10}
            width="28"
            height="22"
            rx="3"
            fill="#090d16"
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <rect x="197" y={hoodTopY + 14} width="18" height="6" rx="1" fill="#e0f2fe" />
          <rect x="197" y={hoodTopY + 22} width="18" height="6" rx="1" fill="#38bdf8" />
        </g>
      ) : (
        /* Aggressive Dual Projector LED Headlights + Cyan DRL Blades (Ferrari, McLaren, Koenigsegg, Audi, Nissan, JDM, Rally) */
        <g>
          <polygon
            points={`40,${hoodTopY + 11} 82,${hoodTopY + 16} 78,${hoodTopY + 23} 42,${hoodTopY + 20}`}
            fill="#090d16"
            stroke="#38bdf8"
            strokeWidth="1.8"
          />
          <circle cx="54" cy={hoodTopY + 16} r="3.2" fill="#ffffff" />
          <circle cx="68" cy={hoodTopY + 17} r="2.8" fill="#bae6fd" />

          <polygon
            points={`220,${hoodTopY + 11} 178,${hoodTopY + 16} 182,${hoodTopY + 23} 218,${hoodTopY + 20}`}
            fill="#090d16"
            stroke="#38bdf8"
            strokeWidth="1.8"
          />
          <circle cx="206" cy={hoodTopY + 16} r="3.2" fill="#ffffff" />
          <circle cx="192" cy={hoodTopY + 17} r="2.8" fill="#bae6fd" />
        </g>
      )}
    </svg>
  );
});

interface AutoshowBuySellModalProps {
  mode?: 'buy_sell' | 'my_garage';
  careerCredits: number;
  ownedVehicleIds: string[];
  activeVehicleId: string;
  customTunesByVehicle: Record<string, VehicleTune>;
  onBuyVehicle: (spec: VehicleSpec, buyPrice: number) => void;
  onSellVehicle: (spec: VehicleSpec, sellPrice: number) => void;
  onSelectVehicle: (spec: VehicleSpec) => void;
  onDriveNow?: (spec: VehicleSpec) => void;
  onClose: () => void;
}

export const AutoshowBuySellModal: React.FC<AutoshowBuySellModalProps> = ({
  mode = 'buy_sell',
  careerCredits,
  ownedVehicleIds,
  activeVehicleId,
  customTunesByVehicle,
  onBuyVehicle,
  onSellVehicle,
  onSelectVehicle,
  onDriveNow,
  onClose,
}) => {
  const isGarageMode = mode === 'my_garage';
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [buySellTab, setBuySellTab] = useState<'all' | 'buy' | 'sell'>('all');
  const [activeBrandInView, setActiveBrandInView] = useState<string>('Aston Martin');

  // Left-side Buy & Sell Car Details Panel — open by default to the active car so Buy & Sell controls are always immediately visible!
  const [popupVehicleId, setPopupVehicleId] = useState<string | null>(
    () => activeVehicleId || VEHICLES[0]?.id || null
  );

  const [actionFeedback, setActionFeedback] = useState<{
    text: string;
    type: 'success' | 'sell' | 'error';
  } | null>(null);

  // Drag-to-scroll & RAF wheel inertia state for ultra-smooth 60fps horizontal sliding
  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartLeftRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const wheelTargetLeftRef = useRef<number | null>(null);
  const wheelAnimRafRef = useRef<number | null>(null);

  const ownedSet = useMemo(() => new Set(ownedVehicleIds), [ownedVehicleIds]);

  // Precompute all 260 cars with benchmarks, buy price (50k -> 7-8M, starter truck & sedan = 70k), sell price (20% less = 80%), sorted alphabetically by Brand (A -> Z)
  const sortedCatalog = useMemo(() => {
    const items = VEHICLES.map((veh) => {
      const tune = customTunesByVehicle[veh.id] || veh.defaultTune;
      const bench = computeDynoBenchmark(veh, tune);
      const buyPrice = getVehicleBuyPrice(veh, bench);
      const sellPrice = getVehicleSellPrice(buyPrice);
      const isStarterLocked = NON_SELLABLE_STARTER_IDS.has(veh.id);
      return {
        veh,
        tune,
        bench,
        buyPrice,
        sellPrice,
        isStarterLocked,
      };
    });

    items.sort((a, b) => {
      const brandCmp = a.veh.manufacturer.localeCompare(b.veh.manufacturer);
      if (brandCmp !== 0) return brandCmp;
      return a.buyPrice - b.buyPrice || a.veh.name.localeCompare(b.veh.name);
    });

    return items;
  }, [customTunesByVehicle]);

  // Filter catalog by mode (My Garage shows only owned cars, Buy & Sell supports All / Buy / Sell tabs) and optional search while preserving alphabetical Brand order
  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedCatalog.filter(({ veh }) => {
      const isOwned = ownedSet.has(veh.id);
      if (isGarageMode && !isOwned) return false;
      if (!isGarageMode && buySellTab === 'buy' && isOwned) return false;
      if (!isGarageMode && buySellTab === 'sell' && !isOwned) return false;
      if (!q) return true;
      return (
        veh.name.toLowerCase().includes(q) ||
        veh.manufacturer.toLowerCase().includes(q) ||
        veh.engineDescription.toLowerCase().includes(q)
      );
    });
  }, [sortedCatalog, isGarageMode, buySellTab, ownedSet, searchQuery]);

  // Group filtered vehicles alphabetically by Brand
  const brandGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        brand: string;
        items: typeof filteredCatalog;
      }
    >();
    filteredCatalog.forEach((item) => {
      const brand = item.veh.manufacturer;
      const existing = map.get(brand);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(brand, { brand, items: [item] });
      }
    });
    return Array.from(map.values());
  }, [filteredCatalog]);

  useEffect(() => {
    if (brandGroups.length > 0 && !brandGroups.some((g) => g.brand === activeBrandInView)) {
      setActiveBrandInView(brandGroups[0].brand);
    }
  }, [brandGroups, activeBrandInView]);

  // Update active brand highlight in real time as user slides horizontally (throttled via RAF for 60fps smoothness)
  const handleHorizontalScroll = () => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollContainerRef.current;
      if (!el) return;
      const containerCenter = el.scrollLeft + el.clientWidth * 0.35;
      const brandSections = el.querySelectorAll<HTMLElement>('[data-brand-section]');
      let matchedBrand = brandGroups[0]?.brand || '';
      for (let i = 0; i < brandSections.length; i++) {
        const sec = brandSections[i];
        if (sec.offsetLeft <= containerCenter) {
          matchedBrand = sec.dataset.brandSection || matchedBrand;
        } else {
          break;
        }
      }
      setActiveBrandInView((prev) => (matchedBrand && matchedBrand !== prev ? matchedBrand : prev));
    });
  };

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
      if (wheelAnimRafRef.current !== null) cancelAnimationFrame(wheelAnimRafRef.current);
    };
  }, []);

  const animateWheelToTarget = () => {
    const el = scrollContainerRef.current;
    if (!el || wheelTargetLeftRef.current === null) {
      wheelAnimRafRef.current = null;
      return;
    }
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = Math.max(0, Math.min(maxScroll, wheelTargetLeftRef.current));
    wheelTargetLeftRef.current = target;
    const diff = target - el.scrollLeft;
    if (Math.abs(diff) < 0.8) {
      el.scrollLeft = target;
      wheelTargetLeftRef.current = null;
      wheelAnimRafRef.current = null;
      return;
    }
    el.scrollLeft += diff * 0.24;
    wheelAnimRafRef.current = window.requestAnimationFrame(animateWheelToTarget);
  };

  const scrollToBrand = (brand: string) => {
    setActiveBrandInView(brand);
    const el = scrollContainerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-brand-section="${CSS.escape(brand)}"]`);
    if (target) {
      wheelTargetLeftRef.current = Math.max(0, target.offsetLeft - 24);
      if (wheelAnimRafRef.current === null) {
        wheelAnimRafRef.current = window.requestAnimationFrame(animateWheelToTarget);
      }
    }
  };

  const slideByPixels = (deltaPx: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const base = wheelTargetLeftRef.current ?? el.scrollLeft;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    wheelTargetLeftRef.current = Math.max(0, Math.min(maxScroll, base + deltaPx));
    if (wheelAnimRafRef.current === null) {
      wheelAnimRafRef.current = window.requestAnimationFrame(animateWheelToTarget);
    }
  };

  // Convert vertical mouse wheel into butter-smooth 60fps horizontal gliding
  const handleWheelHorizontal = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(delta) < 0.1) return;
    const base = wheelTargetLeftRef.current ?? el.scrollLeft;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    wheelTargetLeftRef.current = Math.max(0, Math.min(maxScroll, base + delta * 1.45));
    if (wheelAnimRafRef.current === null) {
      wheelAnimRafRef.current = window.requestAnimationFrame(animateWheelToTarget);
    }
  };

  const showToast = (text: string, type: 'success' | 'sell' | 'error') => {
    setActionFeedback({ text, type });
    setTimeout(() => {
      setActionFeedback((prev) => (prev?.text === text ? null : prev));
    }, 3200);
  };

  const popupItem = useMemo(() => {
    if (!popupVehicleId) return null;
    return sortedCatalog.find((x) => x.veh.id === popupVehicleId) || null;
  }, [sortedCatalog, popupVehicleId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/96 backdrop-blur-xl text-white select-none overflow-hidden animate-window-enter">
      {/* =====================================================================
          1. TOP HEADER BAR (CREDITS + BUY/SELL TABS + BRANDS A-Z + SEARCH + CLOSE)
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b border-white/10 bg-slate-900/95 shrink-0">
        {/* Left: Player Credits + Window Title + Buy / Sell Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="bg-slate-950 border border-amber-400/80 rounded-xl px-2.5 py-1 flex items-center gap-1.5 shadow">
            <CreditSymbolIcon className="w-4 h-4 text-amber-400" />
            <span className="font-display text-xs sm:text-sm font-extrabold text-amber-300 font-mono tabular-nums">
              {careerCredits.toLocaleString()}
            </span>
          </div>
          <h2 className="font-display text-sm sm:text-base font-extrabold text-white tracking-tight">
            {isGarageMode ? `My Garage (${ownedVehicleIds.length} Owned)` : 'Buy & Sell Cars'}
          </h2>

          {!isGarageMode && (
            <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => setBuySellTab('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold uppercase tracking-wider cursor-pointer transition-colors ${
                  buySellTab === 'all'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                All ({VEHICLES.length})
              </button>
              <button
                type="button"
                onClick={() => setBuySellTab('buy')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold uppercase tracking-wider cursor-pointer transition-colors ${
                  buySellTab === 'buy'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Buy Cars ({VEHICLES.length - ownedVehicleIds.length})
              </button>
              <button
                type="button"
                onClick={() => setBuySellTab('sell')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold uppercase tracking-wider cursor-pointer transition-colors ${
                  buySellTab === 'sell'
                    ? 'bg-rose-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Sell Owned ({ownedVehicleIds.length})
              </button>
            </div>
          )}
        </div>

        {/* Center: Compact Horizontal Alphabetical Brand Bar (A-Z) */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar px-1 min-w-[160px]">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 shrink-0 hidden xl:flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-2.5 h-2.5 text-amber-400" />
            Brands:
          </span>
          {brandGroups.map((group) => {
            const isCurrent = activeBrandInView === group.brand;
            return (
              <button
                key={group.brand}
                type="button"
                onClick={() => scrollToBrand(group.brand)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-display font-bold uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'bg-slate-950/80 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {group.brand}
              </button>
            );
          })}
        </div>

        {/* Right: Compact Search & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative w-32 sm:w-44">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search car..."
              className="w-full pl-7 pr-2.5 py-1 text-[11px] bg-slate-950/90 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer hidden sm:block"
          >
            Menu
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Buy & Sell Window"
            aria-label="Close Buy & Sell Window"
            className="w-7 h-7 rounded-full bg-slate-950 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {actionFeedback && (
        <div
          className={`fixed top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-mono font-bold shadow-2xl border z-50 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300'
              : actionFeedback.type === 'sell'
              ? 'bg-amber-950/95 border-amber-400 text-amber-300'
              : 'bg-red-950/95 border-red-400 text-red-300'
          }`}
        >
          {actionFeedback.text}
        </div>
      )}

      {/* =====================================================================
          3. MAIN WORKSPACE: LEFT-SIDE POP-UP DETAILS WINDOW + HORIZONTAL 2-CAR ROW SLIDER
         ===================================================================== */}
      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {/* ===================================================================
            LEFT-SIDE BUY & SELL DETAILS WINDOW (Always visible when a car is selected;
            contains full car specs + Buy Car, Drive Now, and Sell (-20%) buttons!)
           =================================================================== */}
        {popupItem && (() => {
          const { veh, tune, bench, buyPrice, sellPrice, isStarterLocked } = popupItem;
          const isOwned = ownedSet.has(veh.id);
          const isEquipped = activeVehicleId === veh.id;
          const canAfford = careerCredits >= buyPrice;

          return (
            <div className="w-[270px] sm:w-[325px] shrink-0 h-full bg-slate-900/98 border-r-2 border-amber-400/70 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto z-40 shadow-[16px_0_50px_rgba(0,0,0,0.85)]">
              <div className="space-y-2.5">
                {/* Pop-Up Top Bar */}
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                        {veh.manufacturer} · {veh.year}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold border ${getPiClassBadgeColor(
                          bench.piClass
                        )}`}
                      >
                        {bench.piClass} {bench.piScore}
                      </span>
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-extrabold text-white leading-snug mt-0.5">
                      {veh.name}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPopupVehicleId(null)}
                    title="Minimize Car Details Panel"
                    aria-label="Minimize Car Details Panel"
                    className="w-7 h-7 rounded-full bg-slate-950 hover:bg-red-500 text-slate-300 hover:text-white border border-white/20 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Front-Facing Studio Car Photo inside Left Pop-up */}
                <div className="relative h-28 rounded-xl bg-gradient-to-b from-slate-800/80 via-slate-900 to-slate-950 border border-white/15 flex items-center justify-center p-2 overflow-hidden">
                  <FrontCarIllustration
                    spec={veh}
                    paintHex={tune.paintHex}
                    rimHex={tune.rimHex}
                  />
                  {isOwned && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      {isEquipped ? 'DRIVING' : 'OWNED'}
                    </span>
                  )}
                  {isStarterLocked && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-amber-300 font-mono text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Starter
                    </span>
                  )}
                </div>

                {/* Full Car Technical Details & Performance Specs */}
                <div className="space-y-1.5 bg-slate-950/85 border border-white/10 rounded-xl p-2.5 text-[11px] font-mono">
                  <div className="text-[9px] uppercase tracking-widest text-cyan-400 font-bold pb-1 border-b border-white/10">
                    Vehicle Specifications
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Engine</span>
                    <span className="text-white font-semibold text-right truncate max-w-[165px]">
                      {veh.engineDescription}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Drivetrain</span>
                    <span className="text-cyan-300 font-bold">
                      {tune.drivetrain} · {tune.aspiration}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Power / Torque</span>
                    <span className="text-white font-bold">
                      {bench.peakPowerHP} HP / {bench.peakTorqueNm} Nm
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Top Speed</span>
                    <span className="text-amber-300 font-bold">{bench.topSpeedKmh} km/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">0–100 km/h</span>
                    <span className="text-emerald-300 font-bold">{bench.zeroTo100KmhSec} s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">100–0 Braking</span>
                    <span className="text-white font-semibold">
                      {bench.braking100To0M} m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Weight</span>
                    <span className="text-white font-semibold">{veh.baseMassKg} kg</span>
                  </div>
                </div>
              </div>

              {/* ===============================================================
                  BUY & SELL ACTION CONTROLS IN LEFT POP-UP WINDOW
                 =============================================================== */}
              <div className="pt-2.5 mt-2 border-t border-white/15 space-y-2">
                <div className="flex items-center justify-between bg-slate-950/90 border border-amber-400/30 rounded-xl px-3 py-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300">
                    {isOwned ? 'Showroom Value' : 'Buy Price'}
                  </span>
                  <span className="flex items-center gap-1 font-display text-sm sm:text-base font-extrabold text-amber-300 font-mono tabular-nums">
                    <CreditSymbolIcon className="w-4 h-4 text-amber-400" />
                    <span>{buyPrice.toLocaleString()}</span>
                  </span>
                </div>

                {!isOwned ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!canAfford) {
                        showToast(
                          `Insufficient Credits! Need ${(
                            buyPrice - careerCredits
                          ).toLocaleString()} more credits.`,
                          'error'
                        );
                        return;
                      }
                      onBuyVehicle(veh, buyPrice);
                      showToast(
                        `Purchased ${veh.manufacturer} ${veh.name} for ${buyPrice.toLocaleString()} credits!`,
                        'success'
                      );
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl font-display text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      canAfford
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg'
                        : 'bg-white/10 text-slate-400 border border-white/15 hover:bg-white/15'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Buy Car ({buyPrice.toLocaleString()})</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectVehicle(veh);
                        if (onDriveNow) {
                          onDriveNow(veh);
                        } else {
                          showToast(`Equipped ${veh.manufacturer} ${veh.name} for driving!`, 'success');
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>{isGarageMode ? 'Drive Now' : isEquipped ? 'Currently Driving' : 'Equip / Drive Car'}</span>
                    </button>

                    {/* Sell Option (20% Less Than Buy Price = 80% of Buy Price) OR Starter Vehicle Lock Notice */}
                    {isStarterLocked ? (
                      <div className="w-full py-1.5 px-2.5 rounded-xl bg-slate-950 border border-white/15 text-slate-400 font-mono text-[10px] flex items-center justify-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Starter 70K Car · Cannot Sell</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSellVehicle(veh, sellPrice);
                          showToast(
                            `Sold ${veh.name} for ${sellPrice.toLocaleString()} credits (20% less than buy price)!`,
                            'sell'
                          );
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500 border border-rose-400/60 text-rose-200 hover:text-white font-display text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Sell (-20%): {sellPrice.toLocaleString()}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ===================================================================
            RIGHT / MAIN HORIZONTAL SLIDING SHOWCASE (2 CARS SHOWN PER COLUMN,
            FRONT CAR PHOTOS + DIRECT BUY / SELL BUTTONS ON EVERY CARD)
           =================================================================== */}
        <div className="relative flex-1 flex items-center min-w-0 h-full">
          {/* Left Horizontal Slide Button */}
          <button
            type="button"
            onClick={() => slideByPixels(-740)}
            title="Slide Left"
            aria-label="Slide Left"
            className="absolute left-3 z-30 w-11 h-11 rounded-full bg-slate-950/90 hover:bg-amber-400 text-white hover:text-slate-950 border border-white/25 flex items-center justify-center shadow-2xl transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Horizontal Slide Button */}
          <button
            type="button"
            onClick={() => slideByPixels(740)}
            title="Slide Right"
            aria-label="Slide Right"
            className="absolute right-3 z-30 w-11 h-11 rounded-full bg-slate-950/90 hover:bg-amber-400 text-white hover:text-slate-950 border border-white/25 flex items-center justify-center shadow-2xl transition-colors cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Horizontal Scroll Track */}
          <div
            ref={scrollContainerRef}
            onScroll={handleHorizontalScroll}
            onWheel={handleWheelHorizontal}
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              if (wheelAnimRafRef.current !== null) {
                cancelAnimationFrame(wheelAnimRafRef.current);
                wheelAnimRafRef.current = null;
              }
              wheelTargetLeftRef.current = null;
              isDraggingRef.current = true;
              dragMovedRef.current = false;
              dragStartXRef.current = e.clientX;
              scrollStartLeftRef.current = scrollContainerRef.current?.scrollLeft || 0;
            }}
            onPointerMove={(e) => {
              if (!isDraggingRef.current || !scrollContainerRef.current) return;
              const dx = e.clientX - dragStartXRef.current;
              if (Math.abs(dx) > 6) {
                dragMovedRef.current = true;
              }
              scrollContainerRef.current.scrollLeft = scrollStartLeftRef.current - dx;
            }}
            onPointerUp={() => {
              isDraggingRef.current = false;
            }}
            onPointerLeave={() => {
              isDraggingRef.current = false;
            }}
            className="w-full h-full flex items-center gap-5 px-12 overflow-x-auto overflow-y-hidden overscroll-contain cursor-grab active:cursor-grabbing"
          >
            {brandGroups.map((group) => (
              <div
                key={group.brand}
                data-brand-section={group.brand}
                className="flex flex-col justify-center shrink-0 h-full py-1"
              >
                {/* Compact Brand Section Header */}
                <div className="flex items-center gap-2 mb-1.5 pb-0.5 border-b border-white/15">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <h3 className="font-display text-sm sm:text-base font-black uppercase tracking-wider text-white leading-none">
                    {group.brand}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 leading-none">
                    ({group.items.length})
                  </span>
                </div>

                {/* 2-Row Car Slides with Direct Buy & Sell Action Buttons on Every Card */}
                <div className="grid grid-rows-2 grid-flow-col gap-2 sm:gap-2.5 items-stretch">
                  {group.items.map(({ veh, tune, bench, buyPrice, sellPrice, isStarterLocked }) => {
                    const isOwned = ownedSet.has(veh.id);
                    const isSelected = popupVehicleId === veh.id;
                    const isEquipped = activeVehicleId === veh.id;
                    const canAfford = careerCredits >= buyPrice;

                    return (
                      <div
                        key={veh.id}
                        onClick={() => {
                          if (dragMovedRef.current) return;
                          setPopupVehicleId(veh.id);
                        }}
                        className={`w-[205px] sm:w-[235px] h-[148px] sm:h-[162px] shrink-0 rounded-xl border-2 transition-all flex flex-col justify-between p-2 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900/95 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] -translate-y-0.5'
                            : 'bg-slate-900/75 border-white/15 hover:border-amber-400/60'
                        }`}
                      >
                        {/* Top Bar: Brand + PI Class Badge */}
                        <div className="flex items-center justify-between gap-1 leading-none">
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 truncate">
                            {veh.manufacturer} · {veh.year}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-extrabold border shrink-0 ${getPiClassBadgeColor(
                              bench.piClass
                            )}`}
                          >
                            {bench.piClass} {bench.piScore}
                          </span>
                        </div>

                        {/* Center Studio Front-Facing Car Photo */}
                        <div className="relative my-0.5 h-14 sm:h-16 rounded-lg bg-gradient-to-b from-slate-800/70 via-slate-900/90 to-slate-950 border border-white/10 flex items-center justify-center px-2 py-0.5 overflow-hidden">
                          <FrontCarIllustration
                            spec={veh}
                            paintHex={tune.paintHex}
                            rimHex={tune.rimHex}
                          />
                          {isOwned && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-emerald-500/95 text-slate-950 font-mono text-[8px] font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                              <Check className="w-2 h-2 stroke-[3]" />
                              {isEquipped ? 'DRIVING' : isStarterLocked ? 'STARTER' : 'OWNED'}
                            </span>
                          )}
                        </div>

                        {/* Car Name + Buy Price */}
                        <div className="flex items-center justify-between gap-1.5 leading-none">
                          <h4
                            title={veh.name}
                            className="font-display text-[11px] font-bold text-white truncate"
                          >
                            {veh.name}
                          </h4>
                          <span className="flex items-center gap-0.5 font-display text-[11px] font-extrabold text-amber-300 font-mono tabular-nums shrink-0">
                            <CreditSymbolIcon className="w-3 h-3 text-amber-400" />
                            <span>{buyPrice.toLocaleString()}</span>
                          </span>
                        </div>

                        {/* Direct Buy / Sell / Drive Action Bar on Every Card */}
                        <div className="pt-1 flex items-center gap-1">
                          {!isOwned ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPopupVehicleId(veh.id);
                                if (!canAfford) {
                                  showToast(
                                    `Insufficient Credits! Need ${(
                                      buyPrice - careerCredits
                                    ).toLocaleString()} more credits.`,
                                    'error'
                                  );
                                  return;
                                }
                                onBuyVehicle(veh, buyPrice);
                                showToast(
                                  `Purchased ${veh.manufacturer} ${veh.name} for ${buyPrice.toLocaleString()} credits!`,
                                  'success'
                                );
                              }}
                              className={`w-full py-1 px-2 rounded-lg font-display text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                                canAfford
                                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow'
                                  : 'bg-white/10 text-slate-400 border border-white/15 hover:bg-white/15'
                              }`}
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>Buy ({buyPrice.toLocaleString()})</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPopupVehicleId(veh.id);
                                  onSelectVehicle(veh);
                                  if (onDriveNow) {
                                    onDriveNow(veh);
                                  } else {
                                    showToast(`Equipped ${veh.name} for driving!`, 'success');
                                  }
                                }}
                                className="flex-1 py-1 px-1.5 rounded-lg bg-cyan-400/20 hover:bg-cyan-400 text-cyan-200 hover:text-slate-950 border border-cyan-400/50 font-display text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <Car className="w-2.5 h-2.5" />
                                <span>{isGarageMode ? 'Drive' : isEquipped ? 'Active' : 'Equip'}</span>
                              </button>

                              {!isStarterLocked ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPopupVehicleId(veh.id);
                                    onSellVehicle(veh, sellPrice);
                                    showToast(
                                      `Sold ${veh.name} for ${sellPrice.toLocaleString()} credits (-20%)!`,
                                      'sell'
                                    );
                                  }}
                                  className="flex-1 py-1 px-1.5 rounded-lg bg-rose-500/25 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-400/60 font-display text-[9px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Tag className="w-2.5 h-2.5" />
                                  <span>Sell ({sellPrice.toLocaleString()})</span>
                                </button>
                              ) : (
                                <span className="flex-1 py-1 px-1.5 rounded-lg bg-slate-950/90 border border-white/10 text-[8px] font-mono text-slate-400 text-center uppercase">
                                  Starter Lock
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
