import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AeroKitType,
  AspirationType,
  DrivetrainType,
  DynoBenchmark,
  PIClass,
  TireCompoundType,
  VehicleSpec,
  VehicleTune,
} from '../types/game';
import { computeDynoBenchmark } from '../physics/vehiclePhysics';
import {
  Check,
  ChevronRight,
  ShoppingCart,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

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

export type UpgradeCategoryId =
  | 'engine'
  | 'braking'
  | 'suspension'
  | 'tires'
  | 'aero_wing'
  | 'wheel_drive'
  | 'turbo'
  | 'transmission'
  | 'weight';

export interface UpgradePartOption {
  id: string;
  categoryId: UpgradeCategoryId;
  subGroupLabel: string;
  slotKey: string; // Only 1 part per slotKey can be in cart / installed at a time
  name: string;
  stageLabel: 'STOCK' | 'STREET' | 'SPORT' | 'RACE' | 'CONVERSION';
  description: string;
  fh5BaseCost: number; // Original Forza Horizon 5 part cost
  costWith30PctMarkup: number; // Exact +30% markup over Forza Horizon 5 cost
  applyToTune: (tune: VehicleTune, spec: VehicleSpec) => VehicleTune;
  isCurrentlyInstalled: (tune: VehicleTune, spec: VehicleSpec) => boolean;
}

/**
 * Every part cost is strictly 30% MORE than its Forza Horizon 5 price:
 * Math.round(fh5BaseCost * 1.30)
 */
function calcFh5Plus30Cost(fh5Cost: number): number {
  return Math.round(fh5Cost * 1.3);
}

function getPiBadgeStyle(piClass: PIClass): string {
  switch (piClass) {
    case 'X':
      return 'bg-emerald-400 text-slate-950';
    case 'S2':
      return 'bg-blue-600 text-white';
    case 'S1':
      return 'bg-purple-600 text-white';
    case 'A':
      return 'bg-rose-600 text-white';
    case 'B':
      return 'bg-orange-500 text-slate-950';
    case 'C':
      return 'bg-amber-400 text-slate-950';
    case 'D':
    default:
      return 'bg-sky-400 text-slate-950';
  }
}

/**
 * Converts raw benchmark metrics into Forza Horizon 5's 0.0 - 10.0 rating scale
 */
function computeFh5TenPointRatings(bench: DynoBenchmark) {
  const speedRating = Math.max(1.5, Math.min(10.0, (bench.topSpeedKmh - 140) / 31.5));
  const gripRating = Math.max(1.5, Math.min(10.0, (bench.lateralG120Kmh - 0.65) / 0.115));
  const accelRating = Math.max(1.5, Math.min(10.0, (11.5 - bench.zeroTo100KmhSec) / 0.98));
  const brakingRating = Math.max(1.5, Math.min(10.0, (48.0 - bench.braking100To0M) / 2.65));
  const offroadRating = Math.max(1.5, Math.min(10.0, bench.offroadScore / 10));
  return {
    speed: Number(speedRating.toFixed(1)),
    grip: Number(gripRating.toFixed(1)),
    accel: Number(accelRating.toFixed(1)),
    braking: Number(brakingRating.toFixed(1)),
    offroad: Number(offroadRating.toFixed(1)),
  };
}

/**
 * Forza Horizon 5 Category Definitions (Matches the 3x3 grid in shared_image.jpg)
 */
const UPGRADE_CATEGORIES: {
  id: UpgradeCategoryId;
  title: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'engine',
    title: 'ENGINE',
    shortLabel: 'Engine',
    description:
      'Valve springs, improved intake, and exhaust systems as well as camshaft and piston upgrades to get more power out of your engine. Combine several engine upgrade types to get the most horsepower.',
  },
  {
    id: 'braking',
    title: 'BRAKING',
    shortLabel: 'Braking',
    description:
      'Upgrade your brake rotors, calipers, and pads from street spec to cross-drilled carbon-ceramic race brakes to dramatically shorten 100–0 km/h stopping distances and reduce unsprung weight.',
  },
  {
    id: 'suspension',
    title: 'SUSPENSION & CHASSIS',
    shortLabel: 'Suspension',
    description:
      'Install lowered sport or race coilover springs, dampers, and stiffer anti-roll bars to lower the center of gravity, sharpen cornering turn-in, and increase lateral grip.',
  },
  {
    id: 'tires',
    title: 'TIRES & COMPOUND',
    shortLabel: 'Tires',
    description:
      'Change tire compounds between Street, Sport, Semi-Slick Race, Rally Gravel, or Drift Compound to tailor mechanical traction, launch grip, and cornering G-force.',
  },
  {
    id: 'aero_wing',
    title: 'AERO & BACK WING',
    shortLabel: 'Back Wing',
    description:
      'Install a Street Lip Spoiler or an adjustable Forza Horizon GT Carbon Rear Wing and Front Splitter. Appears directly on the car structure and increases high-speed cornering downforce.',
  },
  {
    id: 'wheel_drive',
    title: 'WHEEL DRIVE (DRIVETRAIN)',
    shortLabel: 'Wheel Drive',
    description:
      'Convert your vehicle between Rear-Wheel Drive (RWD), All-Wheel Drive (AWD), or Front-Wheel Drive (FWD) to transform launch traction, weight balance, and corner-exit power delivery.',
  },
  {
    id: 'turbo',
    title: 'TURBO & SUPERCHARGER',
    shortLabel: 'Turbo / Boost',
    description:
      'Bolt on a Single Turbo, Sequential Twin-Turbo, or Positive-Displacement Supercharger with upgraded intercooling and boost pressure for massive torque and top-speed gains.',
  },
  {
    id: 'transmission',
    title: 'TRANSMISSION & DRIVELINE',
    shortLabel: 'Gearbox',
    description:
      'Upgrade the clutch, flywheel, limited-slip differential, and 6-speed close-ratio race gearbox to cut shift times and maximize acceleration through every gear.',
  },
  {
    id: 'weight',
    title: 'WEIGHT REDUCTION',
    shortLabel: 'Weight Drop',
    description:
      'Strip interior sound deadening, replace body panels with lightweight carbon fiber, and install lexan windows to shed mass and improve acceleration, braking, and handling.',
  },
];

/**
 * Custom SVG Icons matching the Forza Horizon 5 Upgrade Shop 3x3 Tiles in shared_image.jpg
 */
const CategoryTileIcon: React.FC<{ categoryId: UpgradeCategoryId; isSelected: boolean }> = ({
  categoryId,
}) => {
  const strokeCol = '#1e1b4b';
  switch (categoryId) {
    case 'engine':
      // Piston & Connecting Rod (Top-Left tile in shared_image.jpg)
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <g transform="rotate(-42 32 32)" fill="none" stroke={strokeCol} strokeWidth="3.2">
            <rect x="20" y="8" width="24" height="20" rx="3" fill="#cbd5e1" />
            <line x1="20" y1="14" x2="44" y2="14" />
            <line x1="20" y1="19" x2="44" y2="19" />
            <circle cx="32" cy="23" r="3" fill={strokeCol} />
            <path d="M28 28 L26 48 L38 48 L36 28 Z" fill="#94a3b8" />
            <circle cx="32" cy="52" r="6" fill="#e2e8f0" />
            <circle cx="32" cy="52" r="2.5" fill={strokeCol} />
          </g>
        </svg>
      );
    case 'braking':
      // Brake Rotor & Caliper (Top-Middle tile in shared_image.jpg)
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="#cbd5e1"
            stroke={strokeCol}
            strokeWidth="3.2"
          />
          <circle
            cx="32"
            cy="32"
            r="9"
            fill="#f8fafc"
            stroke={strokeCol}
            strokeWidth="2.8"
          />
          <path
            d="M 16 18 A 21 21 0 0 0 16 46 L 23 41 A 13 13 0 0 1 23 23 Z"
            fill={strokeCol}
          />
          <circle cx="39" cy="22" r="1.6" fill={strokeCol} />
          <circle cx="44" cy="32" r="1.6" fill={strokeCol} />
          <circle cx="39" cy="42" r="1.6" fill={strokeCol} />
        </svg>
      );
    case 'suspension':
      // Chassis & Suspension Axles (Top-Right tile in shared_image.jpg)
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <rect x="8" y="22" width="8" height="20" rx="2" fill={strokeCol} />
          <rect x="48" y="22" width="8" height="20" rx="2" fill={strokeCol} />
          <line x1="16" y1="32" x2="48" y2="32" stroke={strokeCol} strokeWidth="4" />
          <path
            d="M24 18 L40 18 M22 23 L42 23 M22 41 L42 41 M24 46 L40 46"
            stroke={strokeCol}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <line x1="32" y1="16" x2="32" y2="48" stroke={strokeCol} strokeWidth="3.5" />
        </svg>
      );
    case 'tires':
      // 3D Angled Tire & Rim (Middle-Left tile in shared_image.jpg)
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <ellipse
            cx="34"
            cy="34"
            rx="19"
            ry="15"
            transform="rotate(-25 34 34)"
            fill={strokeCol}
          />
          <ellipse
            cx="30"
            cy="30"
            rx="17"
            ry="12"
            transform="rotate(-25 30 30)"
            fill="#f8fafc"
            stroke={strokeCol}
            strokeWidth="3"
          />
          <ellipse
            cx="30"
            cy="30"
            rx="10"
            ry="7"
            transform="rotate(-25 30 30)"
            fill="#cbd5e1"
            stroke={strokeCol}
            strokeWidth="2.2"
          />
          <circle cx="30" cy="30" r="2.5" fill={strokeCol} />
        </svg>
      );
    case 'aero_wing':
      // Rear Wing / Spoiler Profile (Middle-Center tile in shared_image.jpg)
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <path
            d="M10 26 C 24 22, 42 22, 54 28 L 48 33 C 36 28, 22 28, 12 31 Z"
            fill={strokeCol}
          />
          <path d="M22 30 L18 44 L26 44 L28 30 Z" fill={strokeCol} />
          <path d="M40 30 L36 44 L44 44 L46 30 Z" fill={strokeCol} />
          <path
            d="M12 44 L52 44"
            stroke={strokeCol}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'wheel_drive':
      // Drivetrain / Intermeshed Gears & Axles (Middle-Right tile in shared_image.jpg)
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <circle
            cx="38"
            cy="26"
            r="11"
            fill="#cbd5e1"
            stroke={strokeCol}
            strokeWidth="3.2"
            strokeDasharray="4 2.5"
          />
          <circle cx="38" cy="26" r="4.5" fill={strokeCol} />
          <circle
            cx="22"
            cy="40"
            r="8"
            fill="#e2e8f0"
            stroke={strokeCol}
            strokeWidth="3"
            strokeDasharray="3.5 2"
          />
          <circle cx="22" cy="40" r="3" fill={strokeCol} />
          <line
            x1="22"
            y1="26"
            x2="38"
            y2="40"
            stroke={strokeCol}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'turbo':
      // Turbocharger Snail Housing
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <path
            d="M 32 14 H 52 V 26 H 44 A 14 14 0 1 1 20 26 A 14 14 0 0 1 32 14 Z"
            fill="#cbd5e1"
            stroke={strokeCol}
            strokeWidth="3.2"
          />
          <circle cx="32" cy="34" r="7" fill={strokeCol} />
          <circle cx="32" cy="34" r="2.5" fill="#f8fafc" />
        </svg>
      );
    case 'transmission':
      // 6-Speed H-Pattern Shifter Gate
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <circle
            cx="32"
            cy="32"
            r="20"
            fill="#e2e8f0"
            stroke={strokeCol}
            strokeWidth="3"
          />
          <path
            d="M22 20 V44 M32 20 V44 M42 20 V44 M22 32 H42"
            stroke={strokeCol}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="22" cy="20" r="2.5" fill={strokeCol} />
          <circle cx="32" cy="20" r="2.5" fill={strokeCol} />
          <circle cx="42" cy="20" r="2.5" fill={strokeCol} />
          <circle cx="22" cy="44" r="2.5" fill={strokeCol} />
          <circle cx="32" cy="44" r="2.5" fill={strokeCol} />
          <circle cx="42" cy="44" r="2.5" fill={strokeCol} />
        </svg>
      );
    case 'weight':
      // Feather / Lightweight Chassis Scale Icon
      return (
        <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-12 sm:h-12">
          <path
            d="M16 44 L48 44 L42 24 L22 24 Z"
            fill="#cbd5e1"
            stroke={strokeCol}
            strokeWidth="3"
          />
          <path
            d="M32 14 V34 M25 27 L32 34 L39 27"
            stroke={strokeCol}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

/**
 * Interactive 3/4 Angled Forza Horizon 5 Upgrade Shop Studio Car Structure Visualizer
 * Shows live physical modifications on the car structure:
 * - Back Wing (Stock vs Street Lip Spoiler vs Forza Horizon GT Carbon Swan-Neck Race Wing)
 * - Front Carbon Splitter & Dive-Plane Canards
 * - Front-Mount Turbo Intercooler
 * - Lowered / Raised Coilover Suspension Stance
 * - Upgraded Cross-Drilled Carbon-Ceramic Brake Rotors & Colored Calipers
 * - Tire Compound Tread & Sidewall Lettering
 */
const StudioCarStructurePreview: React.FC<{
  spec: VehicleSpec;
  previewTune: VehicleTune;
  previewBench: DynoBenchmark;
  isInstallingFlash?: boolean;
}> = ({ spec, previewTune, previewBench, isInstallingFlash = false }) => {
  const isTruck =
    spec.bodyStyle === 'baja_truck' ||
    spec.bodyStyle === 'heavy_truck' ||
    spec.bodyStyle === 'suv_4x4';
  const isSedanOrHatch =
    spec.bodyStyle === 'normal_sedan' || spec.bodyStyle === 'normal_hatch';

  // Suspension ride height visual offset (-8px when slammed, +8px when lifted)
  const rideOffsetPx = Math.max(
    -9,
    Math.min(10, Math.round((previewTune.rideHeightMm - spec.defaultTune.rideHeightMm) * 0.14))
  );

  const hasTurboIntercooler = previewTune.aspiration !== 'NA';
  const brakeStage = previewTune.brakeStage ?? 0;
  const caliperColor =
    brakeStage >= 3
      ? '#facc15' // Race Carbon-Ceramic Gold/Yellow Calipers
      : brakeStage === 2
      ? '#ef4444' // Sport Red Calipers
      : brakeStage === 1
      ? '#38bdf8' // Street Blue Calipers
      : previewTune.caliperHex || '#ef4444';

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none select-none">
      <svg
        viewBox="0 0 760 360"
        className="w-full max-w-[740px] h-auto drop-shadow-[0_26px_38px_rgba(0,0,0,0.85)]"
      >
        <defs>
          <linearGradient id="fh5FloorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="fh5BodyPaint" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="28%" stopColor={previewTune.paintHex} stopOpacity="1" />
            <stop offset="80%" stopColor={previewTune.paintHex} stopOpacity="0.92" />
            <stop offset="100%" stopColor="#090d16" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="fh5GlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#0f172a" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.98" />
          </linearGradient>
        </defs>

        {/* Reflective Forza Horizon 5 Studio Garage Floor Grid Lines */}
        <ellipse cx="390" cy="292" rx="310" ry="44" fill="url(#fh5FloorGrad)" />
        {isInstallingFlash && (
          <ellipse
            cx="390"
            cy="288"
            rx="286"
            ry="34"
            fill="rgba(16, 185, 129, 0.09)"
            stroke="rgba(52, 211, 153, 0.65)"
            strokeWidth="2"
            strokeDasharray="14 8"
          />
        )}
        <line
          x1="90"
          y1="315"
          x2="660"
          y2="265"
          stroke="rgba(148,163,184,0.22)"
          strokeWidth="1.5"
        />
        <line
          x1="150"
          y1="335"
          x2="700"
          y2="282"
          stroke="rgba(148,163,184,0.16)"
          strokeWidth="1.2"
        />
        <line
          x1="210"
          y1="252"
          x2="560"
          y2="338"
          stroke="rgba(148,163,184,0.16)"
          strokeWidth="1.2"
        />

        {/* Soft Under-Car Contact Shadow */}
        <ellipse cx="385" cy="284" rx="248" ry="26" fill="rgba(2,6,18,0.88)" />

        {/* =================================================================
            CHASSIS GROUP (Moves up/down with Suspension Ride Height!)
           ================================================================= */}
        <g transform={`translate(0, ${-rideOffsetPx})`}>
          {/* ===============================================================
              1. BACK WING / SPOILER STRUCTURE (STOCK vs STREET vs HORIZON GT)
             =============================================================== */}
          {previewTune.aeroKit === 'HorizonGT' && (
            <g>
              {/* Tall Swan-Neck Carbon-Fiber GT Race Pylons */}
              <path
                d="M 565 162 L 584 108 L 598 108 L 582 162 Z"
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              <path
                d="M 604 166 L 622 112 L 634 112 L 618 166 Z"
                fill="#1e293b"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
              {/* Wide Dual-Element Carbon GT Wing Mainplane */}
              <path
                d="M 538 102 L 664 112 L 652 124 L 530 113 Z"
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              {/* Carbon GT Endplate */}
              <polygon
                points="650,96 672,102 666,136 644,131"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* Label callout on car structure */}
              <g transform="translate(535, 66)">
                <rect
                  x="0"
                  y="0"
                  width="136"
                  height="20"
                  rx="5"
                  fill="rgba(15,23,42,0.92)"
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                />
                <text
                  x="68"
                  y="13.5"
                  textAnchor="middle"
                  fill="#fde047"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  HORIZON GT BACK WING
                </text>
              </g>
            </g>
          )}

          {previewTune.aeroKit === 'Street' && (
            <g>
              {/* Street Carbon Ducktail / Lip Spoiler on Rear Deck */}
              <path
                d="M 566 158 L 626 144 L 634 156 L 572 168 Z"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.8"
              />
              <g transform="translate(545, 118)">
                <rect
                  x="0"
                  y="0"
                  width="120"
                  height="19"
                  rx="5"
                  fill="rgba(15,23,42,0.9)"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                />
                <text
                  x="60"
                  y="13"
                  textAnchor="middle"
                  fill="#7dd3fc"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  STREET LIP SPOILER
                </text>
              </g>
            </g>
          )}

          {/* ===============================================================
              2. MAIN 3/4 SCULPTED CAR BODY STRUCTURE
             =============================================================== */}
          {isTruck ? (
            /* 3/4 Pickup / Off-Road Truck Body Silhouette */
            <g>
              <path
                d="M 145 236 L 140 192 L 228 174 L 295 126 L 468 126 L 492 172 L 622 172 L 628 242 L 152 254 Z"
                fill={previewTune.paintHex}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="2"
              />
              <path
                d="M 145 236 L 140 192 L 228 174 L 295 126 L 468 126 L 492 172 L 622 172 L 628 242 L 152 254 Z"
                fill="url(#fh5BodyPaint)"
              />
              {/* Cabin Windows */}
              <polygon
                points="242,172 302,134 382,134 376,174"
                fill="url(#fh5GlassGrad)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
              />
              <polygon
                points="392,134 458,134 476,174 388,174"
                fill="url(#fh5GlassGrad)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
              />
            </g>
          ) : (
            /* 3/4 Coupe / Sedan / Supercar Studio Body Silhouette (Matches 2013 Subaru BRZ angle in shared_image.jpg) */
            <g>
              {/* Main Sculpted Monocoque Body */}
              <path
                d={
                  isSedanOrHatch
                    ? 'M 132 242 C 130 210, 152 192, 235 178 L 315 130 C 375 122, 465 124, 535 152 L 618 164 C 632 184, 634 218, 622 242 L 145 254 Z'
                    : 'M 126 244 C 126 212, 155 190, 244 176 L 328 132 C 392 124, 468 128, 545 158 L 622 164 C 635 184, 635 218, 624 242 L 142 254 Z'
                }
                fill={previewTune.paintHex}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              />
              <path
                d={
                  isSedanOrHatch
                    ? 'M 132 242 C 130 210, 152 192, 235 178 L 315 130 C 375 122, 465 124, 535 152 L 618 164 C 632 184, 634 218, 622 242 L 145 254 Z'
                    : 'M 126 244 C 126 212, 155 190, 244 176 L 328 132 C 392 124, 468 128, 545 158 L 622 164 C 635 184, 635 218, 624 242 L 142 254 Z'
                }
                fill="url(#fh5BodyPaint)"
              />

              {/* Windshield & Side Daylight Opening Glass */}
              <path
                d="M 248 174 L 326 136 L 395 136 L 352 178 Z"
                fill="url(#fh5GlassGrad)"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
              />
              <path
                d="M 366 178 L 406 137 C 455 138, 498 146, 532 162 L 492 178 Z"
                fill="url(#fh5GlassGrad)"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
              />

              {/* Sculpted Character Shoulder Line & Side Skirt Crease */}
              <path
                d="M 178 202 Q 360 186 608 182"
                fill="none"
                stroke="rgba(255,255,255,0.38)"
                strokeWidth="2"
              />
              <path
                d="M 328 242 L 522 234"
                fill="none"
                stroke="#0f172a"
                strokeWidth="4.5"
              />
            </g>
          )}

          {/* ===============================================================
              3. FRONT BUMPER GRILLE, HEADLIGHTS, TURBO INTERCOOLER & AERO SPLITTER
             =============================================================== */}
          {/* Front Lower Grille Mouth */}
          <polygon
            points="135,214 212,208 218,242 138,244"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Visible Front-Mount Aluminium Intercooler when Turbo / Supercharger is equipped */}
          {hasTurboIntercooler && (
            <g>
              <rect
                x="146"
                y="215"
                width="58"
                height="22"
                rx="2"
                fill="#cbd5e1"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <line x1="148" y1="221" x2="202" y2="221" stroke="#475569" strokeWidth="1.2" />
              <line x1="148" y1="226" x2="202" y2="226" stroke="#475569" strokeWidth="1.2" />
              <line x1="148" y1="231" x2="202" y2="231" stroke="#475569" strokeWidth="1.2" />
            </g>
          )}

          {/* LED Projector Headlights */}
          <polygon
            points="195,190 248,184 240,202 188,204"
            fill="#e0f2fe"
            stroke="#38bdf8"
            strokeWidth="1.8"
          />

          {/* Front Carbon Aero Splitter & Dive Planes when Street or HorizonGT Aero is equipped */}
          {(previewTune.aeroKit === 'Street' || previewTune.aeroKit === 'HorizonGT') && (
            <g>
              <polygon
                points="116,246 244,246 248,254 112,253"
                fill="#0f172a"
                stroke={previewTune.aeroKit === 'HorizonGT' ? '#f59e0b' : '#38bdf8'}
                strokeWidth="1.8"
              />
              {previewTune.aeroKit === 'HorizonGT' && (
                <polygon
                  points="218,224 246,216 244,232 216,236"
                  fill="#0f172a"
                  stroke="#f59e0b"
                  strokeWidth="1.4"
                />
              )}
            </g>
          )}

          {/* Dark Wheel Arch Cutouts */}
          <circle cx="282" cy="246" r="46" fill="#050811" />
          <circle cx="558" cy="238" r="44" fill="#050811" />
        </g>

        {/* =================================================================
            4. FRONT & REAR WHEELS, TIRES, BRAKE ROTORS & CALIPERS (FIXED ON FLOOR)
           ================================================================= */}
        {[
          { cx: 282, cy: 248, r: 42 },
          { cx: 558, cy: 240, r: 40 },
        ].map((w, idx) => (
          <g key={idx}>
            {/* Tire Tread & Sidewall */}
            <circle
              cx={w.cx}
              cy={w.cy}
              r={w.r}
              fill="#0f172a"
              stroke={
                previewTune.tireCompound === 'SemiSlick'
                  ? '#ef4444'
                  : previewTune.tireCompound === 'Sport'
                  ? '#f59e0b'
                  : previewTune.tireCompound === 'RallyGravel'
                  ? '#10b981'
                  : previewTune.tireCompound === 'DriftCompound'
                  ? '#a855f7'
                  : '#334155'
              }
              strokeWidth="2.8"
              strokeDasharray={previewTune.tireCompound === 'RallyGravel' ? '6 3' : undefined}
            />

            {/* Forged Rim Barrel */}
            <circle
              cx={w.cx}
              cy={w.cy}
              r={w.r * 0.74}
              fill="#1e293b"
              stroke={previewTune.rimHex || '#e2e8f0'}
              strokeWidth="3"
            />

            {/* Brake Rotor (Slotted/Drilled for Sport & Race Brake Upgrades) */}
            <circle
              cx={w.cx}
              cy={w.cy}
              r={w.r * (0.48 + brakeStage * 0.04)}
              fill={brakeStage >= 3 ? '#334155' : '#94a3b8'}
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray={brakeStage >= 2 ? '3 2' : undefined}
            />

            {/* Painted Brake Caliper */}
            <path
              d={`M ${w.cx - w.r * 0.44} ${w.cy - 10} L ${w.cx - w.r * 0.25} ${w.cy - 14} L ${
                w.cx - w.r * 0.25
              } ${w.cy + 8} L ${w.cx - w.r * 0.44} ${w.cy + 6} Z`}
              fill={caliperColor}
              stroke="#ffffff"
              strokeWidth="0.8"
            />

            {/* Multi-Spoke Alloy Wheel Spokes */}
            {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => (
              <line
                key={deg}
                x1={w.cx}
                y1={w.cy}
                x2={w.cx + Math.cos((deg * Math.PI) / 180) * (w.r * 0.72)}
                y2={w.cy + Math.sin((deg * Math.PI) / 180) * (w.r * 0.72)}
                stroke={previewTune.rimHex || '#f8fafc'}
                strokeWidth="2.4"
              />
            ))}

            {/* Center Lock Hub Cap */}
            <circle cx={w.cx} cy={w.cy} r="5.5" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
          </g>
        ))}

        {/* Live Structure Status Badges at Bottom of Car Showcase */}
        <g transform="translate(185, 322)">
          <rect
            x="0"
            y="0"
            width="410"
            height="24"
            rx="8"
            fill="rgba(15, 23, 42, 0.85)"
            stroke="rgba(255,255,255,0.15)"
          />
          <text
            x="205"
            y="15.5"
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize="10.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {`WING: ${previewTune.aeroKit.toUpperCase()} · DRIVE: ${previewTune.drivetrain} · BOOST: ${previewTune.aspiration} · TIRES: ${previewTune.tireCompound.toUpperCase()} · RATING: ${previewBench.piClass} ${Math.min(999, previewBench.piScore)}`}
          </text>
        </g>
      </svg>
    </div>
  );
};

interface ModificationTuningModalProps {
  activeSpec: VehicleSpec;
  activeTune: VehicleTune;
  careerCredits: number;
  ownedVehicleIds: string[];
  customTunesByVehicle: Record<string, VehicleTune>;
  onSelectVehicle: (id: string) => void;
  onPurchaseCartTune: (newTune: VehicleTune, totalCost: number) => void;
  onClose: () => void;
}

export const ModificationTuningModal: React.FC<ModificationTuningModalProps> = ({
  activeSpec,
  activeTune,
  careerCredits,
  onPurchaseCartTune,
  onClose,
}) => {
  // 1. Selected Main Category from the Forza Horizon 5 3x3 Upgrade Shop Grid
  const [selectedCategoryId, setSelectedCategoryId] = useState<UpgradeCategoryId>('engine');

  // 2. Selected Upgrade Part Option (Triggers the Left-Side Pop-Up Window showing Speed/Grip/Accel/Rating deltas, +30% FH5 Cost, and Add to Cart)
  const [selectedPart, setSelectedPart] = useState<UpgradePartOption | null>(null);

  // 3. Upgrade Shopping Cart (Stored at Middle-Right of screen; player buys whole cart at once)
  const [cartParts, setCartParts] = useState<UpgradePartOption[]>([]);
  const [isCartPopupOpen, setIsCartPopupOpen] = useState<boolean>(false);
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);
  const [installFeedback, setInstallFeedback] = useState<{
    id: number;
    title: string;
    stageLabel: string;
    partsCount: number;
    costPaid: number;
    piBefore: number;
    piAfter: number;
    piClassBefore: PIClass;
    piClassAfter: PIClass;
    hpDelta: number;
    weightDeltaKg: number;
    topSpeedDeltaKmh: number;
    installedPartIds: string[];
    installedCategories: UpgradeCategoryId[];
  } | null>(null);
  const installFeedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (installFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(installFeedbackTimeoutRef.current);
      }
    };
  }, []);

  // Build the complete catalog of Forza Horizon 5 Upgrade Parts across all 9 categories
  // Every part's cost is strictly 30% MORE than its Forza Horizon 5 price!
  const allUpgradeParts = useMemo<UpgradePartOption[]>(() => {
    const parts: UpgradePartOption[] = [
      // =====================================================================
      // CATEGORY 1: ENGINE (INTAKE, EXHAUST, CAMSHAFT, PISTONS)
      // =====================================================================
      {
        id: 'eng_intake_0',
        categoryId: 'engine',
        subGroupLabel: 'Air Intake & Manifold',
        slotKey: 'engineIntakeStage',
        name: 'Stock Airbox & Filter',
        stageLabel: 'STOCK',
        description: 'Factory airbox and paper filter element.',
        fh5BaseCost: 0,
        costWith30PctMarkup: 0,
        applyToTune: (t) => ({ ...t, engineIntakeStage: 0 }),
        isCurrentlyInstalled: (t) => (t.engineIntakeStage ?? 0) === 0,
      },
      {
        id: 'eng_intake_1',
        categoryId: 'engine',
        subGroupLabel: 'Air Intake & Manifold',
        slotKey: 'engineIntakeStage',
        name: 'Street High-Flow Cold Air Intake',
        stageLabel: 'STREET',
        description: 'Replaces restrictive factory airbox with a high-flow cone filter for improved throttle response and horsepower.',
        fh5BaseCost: 1250,
        costWith30PctMarkup: calcFh5Plus30Cost(1250),
        applyToTune: (t) => ({ ...t, engineIntakeStage: 1 }),
        isCurrentlyInstalled: (t) => (t.engineIntakeStage ?? 0) === 1,
      },
      {
        id: 'eng_intake_2',
        categoryId: 'engine',
        subGroupLabel: 'Air Intake & Manifold',
        slotKey: 'engineIntakeStage',
        name: 'Sport Carbon Ram-Air Intake & Plenum',
        stageLabel: 'SPORT',
        description: 'Ported intake manifold and carbon ram-air ducting increase volumetric efficiency across mid and high RPM.',
        fh5BaseCost: 2600,
        costWith30PctMarkup: calcFh5Plus30Cost(2600),
        applyToTune: (t) => ({ ...t, engineIntakeStage: 2 }),
        isCurrentlyInstalled: (t) => (t.engineIntakeStage ?? 0) === 2,
      },
      {
        id: 'eng_intake_3',
        categoryId: 'engine',
        subGroupLabel: 'Air Intake & Manifold',
        slotKey: 'engineIntakeStage',
        name: 'Race Individual Throttle Bodies (ITBs)',
        stageLabel: 'RACE',
        description: 'Motorsport multi-throttle intake system delivering maximum airflow, top-end horsepower, and razor-sharp response.',
        fh5BaseCost: 5200,
        costWith30PctMarkup: calcFh5Plus30Cost(5200),
        applyToTune: (t) => ({ ...t, engineIntakeStage: 3 }),
        isCurrentlyInstalled: (t) => (t.engineIntakeStage ?? 0) === 3,
      },

      // Engine Exhaust System
      {
        id: 'eng_exhaust_1',
        categoryId: 'engine',
        subGroupLabel: 'Exhaust System & Headers',
        slotKey: 'engineExhaustStage',
        name: 'Street Cat-Back Performance Exhaust',
        stageLabel: 'STREET',
        description: 'Free-flowing stainless muffler reduces backpressure, adds power, and sheds 6 kg.',
        fh5BaseCost: 1500,
        costWith30PctMarkup: calcFh5Plus30Cost(1500),
        applyToTune: (t) => ({ ...t, engineExhaustStage: 1 }),
        isCurrentlyInstalled: (t) => (t.engineExhaustStage ?? 0) === 1,
      },
      {
        id: 'eng_exhaust_2',
        categoryId: 'engine',
        subGroupLabel: 'Exhaust System & Headers',
        slotKey: 'engineExhaustStage',
        name: 'Sport High-Flow Headers & Downpipe',
        stageLabel: 'SPORT',
        description: 'Equal-length tubular headers and sport catalytic converters boost mid-range torque and save 14 kg.',
        fh5BaseCost: 3300,
        costWith30PctMarkup: calcFh5Plus30Cost(3300),
        applyToTune: (t) => ({ ...t, engineExhaustStage: 2 }),
        isCurrentlyInstalled: (t) => (t.engineExhaustStage ?? 0) === 2,
      },
      {
        id: 'eng_exhaust_3',
        categoryId: 'engine',
        subGroupLabel: 'Exhaust System & Headers',
        slotKey: 'engineExhaustStage',
        name: 'Race Full Titanium Straight-Pipe Exhaust',
        stageLabel: 'RACE',
        description: 'Ultra-lightweight full titanium motorsport exhaust system maximizes peak power and cuts 24 kg.',
        fh5BaseCost: 6800,
        costWith30PctMarkup: calcFh5Plus30Cost(6800),
        applyToTune: (t) => ({ ...t, engineExhaustStage: 3 }),
        isCurrentlyInstalled: (t) => (t.engineExhaustStage ?? 0) === 3,
      },

      // Engine Camshaft & Valves
      {
        id: 'eng_cam_1',
        categoryId: 'engine',
        subGroupLabel: 'Camshafts & Valve Springs',
        slotKey: 'engineCamshaftStage',
        name: 'Street High-Lift Camshafts',
        stageLabel: 'STREET',
        description: 'Mildly aggressive cam lobe profile increases valve lift and upper-RPM breathing.',
        fh5BaseCost: 2100,
        costWith30PctMarkup: calcFh5Plus30Cost(2100),
        applyToTune: (t) => ({ ...t, engineCamshaftStage: 1 }),
        isCurrentlyInstalled: (t) => (t.engineCamshaftStage ?? 0) === 1,
      },
      {
        id: 'eng_cam_2',
        categoryId: 'engine',
        subGroupLabel: 'Camshafts & Valve Springs',
        slotKey: 'engineCamshaftStage',
        name: 'Sport Camshafts & Titanium Retainers',
        stageLabel: 'SPORT',
        description: 'High-duration sport cams with reinforced valve springs unlock strong top-end horsepower.',
        fh5BaseCost: 4600,
        costWith30PctMarkup: calcFh5Plus30Cost(4600),
        applyToTune: (t) => ({ ...t, engineCamshaftStage: 2 }),
        isCurrentlyInstalled: (t) => (t.engineCamshaftStage ?? 0) === 2,
      },
      {
        id: 'eng_cam_3',
        categoryId: 'engine',
        subGroupLabel: 'Camshafts & Valve Springs',
        slotKey: 'engineCamshaftStage',
        name: 'Race Billet Camshafts & Oversized Valves',
        stageLabel: 'RACE',
        description: 'Full race valvetrain with CNC-ported cylinder heads for maximum high-RPM power output.',
        fh5BaseCost: 9500,
        costWith30PctMarkup: calcFh5Plus30Cost(9500),
        applyToTune: (t) => ({ ...t, engineCamshaftStage: 3 }),
        isCurrentlyInstalled: (t) => (t.engineCamshaftStage ?? 0) === 3,
      },

      // Engine Pistons & Compression
      {
        id: 'eng_piston_2',
        categoryId: 'engine',
        subGroupLabel: 'Pistons, Rods & Displacement',
        slotKey: 'enginePistonStage',
        name: 'Sport High-Compression Forged Pistons',
        stageLabel: 'SPORT',
        description: 'Forged aluminum pistons and H-beam connecting rods increase cylinder pressure and torque across all RPM.',
        fh5BaseCost: 5400,
        costWith30PctMarkup: calcFh5Plus30Cost(5400),
        applyToTune: (t) => ({ ...t, enginePistonStage: 2 }),
        isCurrentlyInstalled: (t) => (t.enginePistonStage ?? 0) === 2,
      },
      {
        id: 'eng_piston_3',
        categoryId: 'engine',
        subGroupLabel: 'Pistons, Rods & Displacement',
        slotKey: 'enginePistonStage',
        name: 'Race Stroker Kit & Billet Crankshaft',
        stageLabel: 'RACE',
        description: 'Enlarged bore and stroke with a lightweight billet crankshaft for massive horsepower and top-speed gains.',
        fh5BaseCost: 11200,
        costWith30PctMarkup: calcFh5Plus30Cost(11200),
        applyToTune: (t) => ({ ...t, enginePistonStage: 3 }),
        isCurrentlyInstalled: (t) => (t.enginePistonStage ?? 0) === 3,
      },

      // =====================================================================
      // CATEGORY 2: BRAKING
      // =====================================================================
      {
        id: 'brk_0',
        categoryId: 'braking',
        subGroupLabel: 'Brake Rotors, Calipers & Pads',
        slotKey: 'brakeStage',
        name: 'Stock Factory Disc Brakes',
        stageLabel: 'STOCK',
        description: 'Standard factory iron brake rotors and street pads.',
        fh5BaseCost: 0,
        costWith30PctMarkup: 0,
        applyToTune: (t, s) => ({
          ...t,
          brakeStage: 0,
          brakePressurePct: s.defaultTune.brakePressurePct,
        }),
        isCurrentlyInstalled: (t) => (t.brakeStage ?? 0) === 0,
      },
      {
        id: 'brk_1',
        categoryId: 'braking',
        subGroupLabel: 'Brake Rotors, Calipers & Pads',
        slotKey: 'brakeStage',
        name: 'Street Slotted Rotors & Performance Pads',
        stageLabel: 'STREET',
        description: 'High-friction street pads and slotted rotors improve bite and shorten 100–0 km/h braking distance.',
        fh5BaseCost: 1650,
        costWith30PctMarkup: calcFh5Plus30Cost(1650),
        applyToTune: (t) => ({
          ...t,
          brakeStage: 1,
          brakePressurePct: Math.max(t.brakePressurePct, 108),
          caliperHex: '#38bdf8',
        }),
        isCurrentlyInstalled: (t) => (t.brakeStage ?? 0) === 1,
      },
      {
        id: 'brk_2',
        categoryId: 'braking',
        subGroupLabel: 'Brake Rotors, Calipers & Pads',
        slotKey: 'brakeStage',
        name: 'Sport 6-Piston Big Brake Kit',
        stageLabel: 'SPORT',
        description: 'Two-piece floating cross-drilled rotors and 6-piston monoblock calipers reduce stopping distance and save 10 kg.',
        fh5BaseCost: 3400,
        costWith30PctMarkup: calcFh5Plus30Cost(3400),
        applyToTune: (t) => ({
          ...t,
          brakeStage: 2,
          brakePressurePct: Math.max(t.brakePressurePct, 122),
          caliperHex: '#ef4444',
        }),
        isCurrentlyInstalled: (t) => (t.brakeStage ?? 0) === 2,
      },
      {
        id: 'brk_3',
        categoryId: 'braking',
        subGroupLabel: 'Brake Rotors, Calipers & Pads',
        slotKey: 'brakeStage',
        name: 'Race Carbon-Ceramic Brakes (CCBs)',
        stageLabel: 'RACE',
        description: 'Full Forza Motorsport carbon-ceramic discs and titanium-piston calipers deliver extreme stopping power and save 22 kg.',
        fh5BaseCost: 6800,
        costWith30PctMarkup: calcFh5Plus30Cost(6800),
        applyToTune: (t) => ({
          ...t,
          brakeStage: 3,
          brakePressurePct: 140,
          brakeBiasFrontPct: 54,
          caliperHex: '#facc15',
        }),
        isCurrentlyInstalled: (t) => (t.brakeStage ?? 0) === 3,
      },

      // =====================================================================
      // CATEGORY 3: SUSPENSION & CHASSIS
      // =====================================================================
      {
        id: 'susp_0',
        categoryId: 'suspension',
        subGroupLabel: 'Springs, Dampers & Coilovers',
        slotKey: 'suspensionStage',
        name: 'Stock Factory Springs & Dampers',
        stageLabel: 'STOCK',
        description: 'Factory ride height, spring rates, and camber alignment.',
        fh5BaseCost: 0,
        costWith30PctMarkup: 0,
        applyToTune: (t, s) => ({
          ...t,
          suspensionStage: 0,
          rideHeightMm: s.defaultTune.rideHeightMm,
          frontSpringRate: s.defaultTune.frontSpringRate,
          rearSpringRate: s.defaultTune.rearSpringRate,
          frontCamberDeg: s.defaultTune.frontCamberDeg,
        }),
        isCurrentlyInstalled: (t) => (t.suspensionStage ?? 0) === 0,
      },
      {
        id: 'susp_1',
        categoryId: 'suspension',
        subGroupLabel: 'Springs, Dampers & Coilovers',
        slotKey: 'suspensionStage',
        name: 'Street Lowering Springs & Shocks',
        stageLabel: 'STREET',
        description: 'Lowers ride height by 12mm and stiffens damping to reduce body roll and increase cornering grip.',
        fh5BaseCost: 1800,
        costWith30PctMarkup: calcFh5Plus30Cost(1800),
        applyToTune: (t, s) => ({
          ...t,
          suspensionStage: 1,
          rideHeightMm: Math.max(70, s.defaultTune.rideHeightMm - 12),
          frontSpringRate: Math.min(210, Math.round(s.defaultTune.frontSpringRate * 1.12)),
          rearSpringRate: Math.min(210, Math.round(s.defaultTune.rearSpringRate * 1.12)),
          frontCamberDeg: -1.6,
        }),
        isCurrentlyInstalled: (t) => (t.suspensionStage ?? 0) === 1,
      },
      {
        id: 'susp_2',
        categoryId: 'suspension',
        subGroupLabel: 'Springs, Dampers & Coilovers',
        slotKey: 'suspensionStage',
        name: 'Sport Adjustable Coilover Suspension',
        stageLabel: 'SPORT',
        description: 'Lowers chassis stance by 22mm with negative track camber and firmer anti-roll bars for sharp cornering grip.',
        fh5BaseCost: 3600,
        costWith30PctMarkup: calcFh5Plus30Cost(3600),
        applyToTune: (t, s) => ({
          ...t,
          suspensionStage: 2,
          rideHeightMm: Math.max(68, s.defaultTune.rideHeightMm - 22),
          frontSpringRate: Math.min(215, Math.round(s.defaultTune.frontSpringRate * 1.24)),
          rearSpringRate: Math.min(215, Math.round(s.defaultTune.rearSpringRate * 1.24)),
          frontCamberDeg: -2.0,
          rearCamberDeg: -1.5,
        }),
        isCurrentlyInstalled: (t) => (t.suspensionStage ?? 0) === 2,
      },
      {
        id: 'susp_3',
        categoryId: 'suspension',
        subGroupLabel: 'Springs, Dampers & Coilovers',
        slotKey: 'suspensionStage',
        name: 'Race Multi-Way Track Coilovers & ARBs',
        stageLabel: 'RACE',
        description: 'Full Forza Race suspension lowers stance by 30mm with optimal -2.1° camber for maximum lateral G-force.',
        fh5BaseCost: 7200,
        costWith30PctMarkup: calcFh5Plus30Cost(7200),
        applyToTune: (t, s) => ({
          ...t,
          suspensionStage: 3,
          rideHeightMm: Math.max(65, s.defaultTune.rideHeightMm - 30),
          frontSpringRate: Math.min(220, Math.round(s.defaultTune.frontSpringRate * 1.35)),
          rearSpringRate: Math.min(220, Math.round(s.defaultTune.rearSpringRate * 1.35)),
          frontCamberDeg: -2.1,
          rearCamberDeg: -1.7,
        }),
        isCurrentlyInstalled: (t) => (t.suspensionStage ?? 0) === 3,
      },

      // =====================================================================
      // CATEGORY 4: TIRES & COMPOUND
      // =====================================================================
      ...(
        [
          {
            compound: 'Street' as TireCompoundType,
            name: 'Street Performance Tire Compound',
            stage: 'STREET' as const,
            fh5Cost: 1500,
            desc: 'All-weather street radial compound offering balanced road grip and predictable slip progression.',
          },
          {
            compound: 'Sport' as TireCompoundType,
            name: 'Sport Max-Performance Tire Compound',
            stage: 'SPORT' as const,
            fh5Cost: 4800,
            desc: 'Soft-shoulder summer sport compound that boosts launch acceleration, braking, and cornering grip.',
          },
          {
            compound: 'SemiSlick' as TireCompoundType,
            name: 'Horizon Race Semi-Slick Tire Compound',
            stage: 'RACE' as const,
            fh5Cost: 11500,
            desc: 'Ultra-sticky motorsport semi-slick compound delivering maximum asphalt grip, shortest braking, and huge PI gains.',
          },
          {
            compound: 'RallyGravel' as TireCompoundType,
            name: 'Off-Road Rally & Gravel Tire Compound',
            stage: 'CONVERSION' as const,
            fh5Cost: 6200,
            desc: 'Deep-lug rally compound engineered for maximum bite on dirt, gravel, grass, sand, and snow.',
          },
          {
            compound: 'DriftCompound' as TireCompoundType,
            name: 'Formula Drift Spec Tire Compound',
            stage: 'CONVERSION' as const,
            fh5Cost: 4200,
            desc: 'Low-bite progressive sidewall compound designed for sustained high-angle drift chains.',
          },
        ] as const
      ).map((item) => ({
        id: `tire_${item.compound}`,
        categoryId: 'tires' as UpgradeCategoryId,
        subGroupLabel: 'Tire Compound Selection',
        slotKey: 'tireCompound',
        name: item.name,
        stageLabel: item.stage,
        description: item.desc,
        fh5BaseCost: item.fh5Cost,
        costWith30PctMarkup: calcFh5Plus30Cost(item.fh5Cost),
        applyToTune: (t: VehicleTune) => ({ ...t, tireCompound: item.compound }),
        isCurrentlyInstalled: (t: VehicleTune) => t.tireCompound === item.compound,
      })),

      // =====================================================================
      // CATEGORY 5: AERO & BACK WING (APPEARS DIRECTLY ON CAR STRUCTURE)
      // =====================================================================
      ...(
        [
          {
            kit: 'Stock' as AeroKitType,
            name: 'Stock Factory Rear Deck & Bumper',
            stage: 'STOCK' as const,
            fh5Cost: 0,
            downF: 0,
            downR: 0,
            desc: 'Factory aerodynamic configuration with lowest straight-line drag.',
          },
          {
            kit: 'Street' as AeroKitType,
            name: 'Street Carbon Lip Spoiler & Front Splitter',
            stage: 'STREET' as const,
            fh5Cost: 2400,
            downF: 45,
            downR: 65,
            desc: 'Mounts a sleek carbon-fiber ducktail lip spoiler and front splitter on the car structure, increasing high-speed grip.',
          },
          {
            kit: 'HorizonGT' as AeroKitType,
            name: 'Forza Horizon GT Adjustable Carbon Back Wing',
            stage: 'RACE' as const,
            fh5Cost: 4800,
            downF: 120,
            downR: 165,
            desc: 'Mounts the full Swan-Neck Carbon-Fiber GT Back Wing with endplates & front aero canards on the car structure. Huge cornering grip boost.',
          },
        ] as const
      ).map((item) => ({
        id: `aero_${item.kit}`,
        categoryId: 'aero_wing' as UpgradeCategoryId,
        subGroupLabel: 'Rear Wing & Front Aero Kit',
        slotKey: 'aeroKit',
        name: item.name,
        stageLabel: item.stage,
        description: item.desc,
        fh5BaseCost: item.fh5Cost,
        costWith30PctMarkup: calcFh5Plus30Cost(item.fh5Cost),
        applyToTune: (t: VehicleTune, s: VehicleSpec) => ({
          ...t,
          aeroKit: item.kit,
          frontDownforceKg: Math.min(380, s.defaultTune.frontDownforceKg + item.downF),
          rearDownforceKg: Math.min(480, s.defaultTune.rearDownforceKg + item.downR),
        }),
        isCurrentlyInstalled: (t: VehicleTune) => t.aeroKit === item.kit,
      })),

      // =====================================================================
      // CATEGORY 6: WHEEL DRIVE (DRIVETRAIN CONVERSION)
      // =====================================================================
      ...(
        [
          {
            dt: 'RWD' as DrivetrainType,
            name: 'Rear-Wheel Drive (RWD) Drivetrain',
            fh5Cost: 6500,
            desc: 'Sends 100% of power to the rear axle, shedding 55 kg for agile turn-in and higher top speed.',
          },
          {
            dt: 'AWD' as DrivetrainType,
            name: 'All-Wheel Drive (AWD) Conversion',
            fh5Cost: 12500,
            desc: 'Splits torque across all four wheels for explosive 0–100 km/h launch acceleration and all-weather traction (+68 kg).',
          },
          {
            dt: 'FWD' as DrivetrainType,
            name: 'Front-Wheel Drive (FWD) Conversion',
            fh5Cost: 4500,
            desc: 'Front-axle transaxle layout with light curb weight and stable wet/off-road pull.',
          },
        ] as const
      ).map((item) => ({
        id: `drive_${item.dt}`,
        categoryId: 'wheel_drive' as UpgradeCategoryId,
        subGroupLabel: 'Drivetrain Layout Swap',
        slotKey: 'drivetrain',
        name: item.name,
        stageLabel: 'CONVERSION' as const,
        description: item.desc,
        fh5BaseCost: item.fh5Cost,
        costWith30PctMarkup: calcFh5Plus30Cost(item.fh5Cost),
        applyToTune: (t: VehicleTune) => ({ ...t, drivetrain: item.dt }),
        isCurrentlyInstalled: (t: VehicleTune) => t.drivetrain === item.dt,
      })),

      // =====================================================================
      // CATEGORY 7: TURBO & SUPERCHARGER (FORCED INDUCTION)
      // =====================================================================
      ...(
        [
          {
            asp: 'NA' as AspirationType,
            boost: 0.0,
            name: 'Naturally Aspirated (High-Rev NA)',
            stage: 'STOCK' as const,
            fh5Cost: 2200,
            desc: 'Instant linear throttle response and lighter front-end weight (-18 kg) with zero turbo lag.',
          },
          {
            asp: 'SingleTurbo' as AspirationType,
            boost: 1.35,
            name: 'Sport Single Turbocharger + Intercooler',
            stage: 'SPORT' as const,
            fh5Cost: 8500,
            desc: 'Large-frame single turbocharger running 1.35 bar boost with a visible front-mount intercooler for huge top-end power.',
          },
          {
            asp: 'TwinTurbo' as AspirationType,
            boost: 1.65,
            name: 'Race Sequential Twin-Turbo Kit (1.65 Bar)',
            stage: 'RACE' as const,
            fh5Cost: 15500,
            desc: 'Twin ball-bearing turbochargers running 1.65 bar boost deliver massive mid-range torque and extreme top speed.',
          },
          {
            asp: 'Supercharged' as AspirationType,
            boost: 1.25,
            name: 'Positive-Displacement Roots Supercharger',
            stage: 'CONVERSION' as const,
            fh5Cost: 9800,
            desc: 'Belt-driven twin-screw supercharger providing instant low-RPM torque from idle to redline.',
          },
        ] as const
      ).map((item) => ({
        id: `turbo_${item.asp}`,
        categoryId: 'turbo' as UpgradeCategoryId,
        subGroupLabel: 'Forced Induction & Boost System',
        slotKey: 'aspiration',
        name: item.name,
        stageLabel: item.stage,
        description: item.desc,
        fh5BaseCost: item.fh5Cost,
        costWith30PctMarkup: calcFh5Plus30Cost(item.fh5Cost),
        applyToTune: (t: VehicleTune) => ({
          ...t,
          aspiration: item.asp,
          boostPressureBar: item.boost,
        }),
        isCurrentlyInstalled: (t: VehicleTune) => t.aspiration === item.asp,
      })),

      // =====================================================================
      // CATEGORY 8: TRANSMISSION & DRIVELINE
      // =====================================================================
      {
        id: 'trans_0',
        categoryId: 'transmission',
        subGroupLabel: 'Gearbox, Clutch & Differential',
        slotKey: 'transmissionStage',
        name: 'Stock Factory Gearbox & Differential',
        stageLabel: 'STOCK',
        description: 'Factory shift speed and standard differential lock.',
        fh5BaseCost: 0,
        costWith30PctMarkup: 0,
        applyToTune: (t, s) => ({
          ...t,
          transmissionStage: 0,
          finalDrive: s.defaultTune.finalDrive,
        }),
        isCurrentlyInstalled: (t) => (t.transmissionStage ?? 0) === 0,
      },
      {
        id: 'trans_1',
        categoryId: 'transmission',
        subGroupLabel: 'Gearbox, Clutch & Differential',
        slotKey: 'transmissionStage',
        name: 'Street Twin-Plate Clutch & Lightened Flywheel',
        stageLabel: 'STREET',
        description: 'Reduces rotational inertia for quicker gear shifts and faster 0–100 km/h acceleration.',
        fh5BaseCost: 1700,
        costWith30PctMarkup: calcFh5Plus30Cost(1700),
        applyToTune: (t) => ({ ...t, transmissionStage: 1 }),
        isCurrentlyInstalled: (t) => (t.transmissionStage ?? 0) === 1,
      },
      {
        id: 'trans_2',
        categoryId: 'transmission',
        subGroupLabel: 'Gearbox, Clutch & Differential',
        slotKey: 'transmissionStage',
        name: 'Sport Close-Ratio Gearbox & Carbon Driveshaft',
        stageLabel: 'SPORT',
        description: 'Optimized gear spacing and carbon prop-shaft keep the engine in peak powerband on every upshift.',
        fh5BaseCost: 3800,
        costWith30PctMarkup: calcFh5Plus30Cost(3800),
        applyToTune: (t) => ({ ...t, transmissionStage: 2 }),
        isCurrentlyInstalled: (t) => (t.transmissionStage ?? 0) === 2,
      },
      {
        id: 'trans_3',
        categoryId: 'transmission',
        subGroupLabel: 'Gearbox, Clutch & Differential',
        slotKey: 'transmissionStage',
        name: 'Race 6-Speed Sequential Dog-Box & 2-Way LSD',
        stageLabel: 'RACE',
        description: 'Lightning-fast motorsport sequential transmission and race differential maximize acceleration and corner exit.',
        fh5BaseCost: 7600,
        costWith30PctMarkup: calcFh5Plus30Cost(7600),
        applyToTune: (t) => ({
          ...t,
          transmissionStage: 3,
          diffAccelLockPct: 75,
        }),
        isCurrentlyInstalled: (t) => (t.transmissionStage ?? 0) === 3,
      },

      // =====================================================================
      // CATEGORY 9: WEIGHT REDUCTION
      // =====================================================================
      ...(
        [
          {
            stageNum: 0 as const,
            name: 'Stock Full Interior & Steel Panels',
            stage: 'STOCK' as const,
            fh5Cost: 0,
            desc: 'Factory curb weight with full interior trim.',
          },
          {
            stageNum: 1 as const,
            name: 'Street Weight Reduction (-6% Mass)',
            stage: 'STREET' as const,
            fh5Cost: 2200,
            desc: 'Removes spare tire, rear seats, and heavy sound insulation to cut 6% of vehicle weight.',
          },
          {
            stageNum: 2 as const,
            name: 'Sport Carbon Panels & Bucket Seats (-12% Mass)',
            stage: 'SPORT' as const,
            fh5Cost: 5600,
            desc: 'Carbon-fiber hood, trunk lid, and racing bucket seats shed 12% of vehicle mass.',
          },
          {
            stageNum: 3 as const,
            name: 'Race Full Gutted Chassis & Lexan Glass (-18% Mass)',
            stage: 'RACE' as const,
            fh5Cost: 12000,
            desc: 'Full Forza Race weight reduction strips 18% of curb weight, improving speed, acceleration, grip, and braking.',
          },
        ] as const
      ).map((item) => ({
        id: `weight_${item.stageNum}`,
        categoryId: 'weight' as UpgradeCategoryId,
        subGroupLabel: 'Chassis Weight Reduction',
        slotKey: 'weightReductionStage',
        name: item.name,
        stageLabel: item.stage,
        description: item.desc,
        fh5BaseCost: item.fh5Cost,
        costWith30PctMarkup: calcFh5Plus30Cost(item.fh5Cost),
        applyToTune: (t: VehicleTune) => ({ ...t, weightReductionStage: item.stageNum }),
        isCurrentlyInstalled: (t: VehicleTune) => t.weightReductionStage === item.stageNum,
      })),
    ];

    return parts;
  }, []);

  const currentCategory = useMemo(
    () => UPGRADE_CATEGORIES.find((c) => c.id === selectedCategoryId) || UPGRADE_CATEGORIES[0],
    [selectedCategoryId]
  );

  const partsForSelectedCategory = useMemo(
    () => allUpgradeParts.filter((p) => p.categoryId === selectedCategoryId),
    [allUpgradeParts, selectedCategoryId]
  );

  // Full cart tune is used ONLY when purchasing/installing the cart
  const tuneWithCartApplied = useMemo(() => {
    let next = { ...activeTune };
    cartParts.forEach((part) => {
      next = part.applyToTune(next, activeSpec);
    });
    return next;
  }, [activeTune, cartParts, activeSpec]);

  // Visual structure preview tune for the center car illustration
  const previewTune = useMemo(() => {
    if (!selectedPart) return activeTune;
    return selectedPart.applyToTune(activeTune, activeSpec);
  }, [selectedPart, activeTune, activeSpec]);

  // Stock baseline benchmark (used to measure each part's isolated individual effect)
  const stockBenchmark = useMemo(
    () => computeDynoBenchmark(activeSpec, activeSpec.defaultTune),
    [activeSpec]
  );

  // Individual part benchmark: applies ONLY `selectedPart` to the stock car
  // so the pop-up ALWAYS shows that single part's individual increase/decrease (e.g. +3 km/h, never +23 km/h collectively)
  const singlePartTune = useMemo(() => {
    if (!selectedPart) return activeSpec.defaultTune;
    return selectedPart.applyToTune(activeSpec.defaultTune, activeSpec);
  }, [selectedPart, activeSpec]);

  const singlePartBenchmark = useMemo(
    () => computeDynoBenchmark(activeSpec, singlePartTune),
    [activeSpec, singlePartTune]
  );

  const installedBenchmark = useMemo(
    () => computeDynoBenchmark(activeSpec, activeTune),
    [activeSpec, activeTune]
  );
  const cartBenchmark = useMemo(
    () => computeDynoBenchmark(activeSpec, tuneWithCartApplied),
    [activeSpec, tuneWithCartApplied]
  );

  const stockRatings = useMemo(
    () => computeFh5TenPointRatings(stockBenchmark),
    [stockBenchmark]
  );
  const singlePartRatings = useMemo(
    () => computeFh5TenPointRatings(singlePartBenchmark),
    [singlePartBenchmark]
  );

  // Add or Replace part in Cart (by slotKey)
  const handleAddToCart = (part: UpgradePartOption) => {
    if (part.isCurrentlyInstalled(activeTune, activeSpec)) {
      // If user selects the already-installed part, remove any cart override for that slot
      setCartParts((prev) => prev.filter((p) => p.slotKey !== part.slotKey));
      return;
    }
    setCartParts((prev) => {
      const filtered = prev.filter((p) => p.slotKey !== part.slotKey);
      return [...filtered, part];
    });
  };

  const handleRemoveFromCart = (partId: string) => {
    setCartParts((prev) => prev.filter((p) => p.id !== partId));
  };

  const totalCartCost = useMemo(
    () => cartParts.reduce((sum, p) => sum + p.costWith30PctMarkup, 0),
    [cartParts]
  );

  const canAffordCart = careerCredits >= totalCartCost;

  const triggerInstallSuccessFeedback = (params: {
    title: string;
    stageLabel: string;
    partsCount: number;
    costPaid: number;
    newTune: VehicleTune;
    installedPartIds: string[];
    installedCategories: UpgradeCategoryId[];
  }) => {
    const afterBench = computeDynoBenchmark(activeSpec, params.newTune);
    const piBefore = Math.min(999, installedBenchmark.piScore);
    const piAfter = Math.min(999, afterBench.piScore);
    if (installFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(installFeedbackTimeoutRef.current);
    }
    setInstallFeedback({
      id: Date.now(),
      title: params.title,
      stageLabel: params.stageLabel,
      partsCount: params.partsCount,
      costPaid: params.costPaid,
      piBefore,
      piAfter,
      piClassBefore: installedBenchmark.piClass,
      piClassAfter: afterBench.piClass,
      hpDelta: Math.round(afterBench.peakPowerHP - installedBenchmark.peakPowerHP),
      weightDeltaKg: Math.round(afterBench.curbWeightKg - installedBenchmark.curbWeightKg),
      topSpeedDeltaKmh: Math.round(afterBench.topSpeedKmh - installedBenchmark.topSpeedKmh),
      installedPartIds: params.installedPartIds,
      installedCategories: params.installedCategories,
    });
    installFeedbackTimeoutRef.current = window.setTimeout(() => {
      setInstallFeedback(null);
      setPurchaseToast(null);
    }, 2800);
  };

  const handleDirectBuyAndInstallPart = (part: UpgradePartOption) => {
    if (part.isCurrentlyInstalled(activeTune, activeSpec)) return;
    const cost = part.costWith30PctMarkup;
    if (careerCredits < cost) {
      setPurchaseToast(
        `Need ${(cost - careerCredits).toLocaleString()} more CR to install ${part.name}!`
      );
      setTimeout(() => setPurchaseToast(null), 2800);
      return;
    }
    const newTune = part.applyToTune(activeTune, activeSpec);
    const newBench = computeDynoBenchmark(activeSpec, newTune);
    onPurchaseCartTune(newTune, cost);
    setCartParts((prev) => prev.filter((p) => p.slotKey !== part.slotKey));
    setPurchaseToast(
      `Installed ${part.name}! Rating is now ${newBench.piClass} ${Math.min(999, newBench.piScore)}.`
    );
    triggerInstallSuccessFeedback({
      title: part.name,
      stageLabel: part.stageLabel,
      partsCount: 1,
      costPaid: cost,
      newTune,
      installedPartIds: [part.id],
      installedCategories: [part.categoryId],
    });
  };

  const handleBuyWholeCart = () => {
    if (cartParts.length === 0) {
      setPurchaseToast('Cart is empty — select a part & click Add to Cart.');
      setTimeout(() => setPurchaseToast(null), 2500);
      return;
    }
    if (!canAffordCart) {
      setPurchaseToast(
        `Need ${(totalCartCost - careerCredits).toLocaleString()} more CR to buy cart!`
      );
      setTimeout(() => setPurchaseToast(null), 2800);
      return;
    }
    const count = cartParts.length;
    const firstPart = cartParts[0];
    const partIds = cartParts.map((p) => p.id);
    const categories = Array.from(new Set(cartParts.map((p) => p.categoryId)));
    onPurchaseCartTune(tuneWithCartApplied, totalCartCost);
    setCartParts([]);
    setIsCartPopupOpen(false);
    setPurchaseToast(
      `Installed ${count} modification${count > 1 ? 's' : ''}! Rating is now ${
        cartBenchmark.piClass
      } ${Math.min(999, cartBenchmark.piScore)}.`
    );
    triggerInstallSuccessFeedback({
      title: count === 1 ? firstPart.name : `${count} Performance Modifications`,
      stageLabel: count === 1 ? firstPart.stageLabel : 'CUSTOM BUILD',
      partsCount: count,
      costPaid: totalCartCost,
      newTune: tuneWithCartApplied,
      installedPartIds: partIds,
      installedCategories: categories,
    });
  };

  const isPartInCart = (partId: string) => cartParts.some((p) => p.id === partId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-br from-slate-900/90 via-slate-950/80 to-slate-950/92 backdrop-blur-md text-white select-none overflow-hidden animate-window-enter">
      {/* =====================================================================
          1. FORZA HORIZON 5 TOP HEADER BAR (MATCHES SCREENSHOT TOP RIBBON)
             [PI CLASS | RATING <= 999] YEAR CAR NAME   ...   [CR | CREDITS]
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2 bg-slate-950/95 border-b border-white/15 shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Forza Horizon 5 PI Class & Rating Badge (Never exceeds 999) */}
          <div
            key={installFeedback ? `hdr-pi-${installFeedback.id}` : 'hdr-pi-static'}
            className={`flex items-center rounded overflow-hidden border shadow transition-all ${
              installFeedback
                ? 'animate-upgrade-badge-pop border-emerald-400 ring-2 ring-emerald-400/50'
                : 'border-white/30'
            }`}
          >
            <span
              className={`px-2.5 py-0.5 font-display text-xs sm:text-sm font-black uppercase ${getPiBadgeStyle(
                installedBenchmark.piClass
              )}`}
            >
              {installedBenchmark.piClass}
            </span>
            <span className="px-2.5 py-0.5 bg-white text-slate-950 font-mono text-xs sm:text-sm font-black tabular-nums">
              {Math.min(999, installedBenchmark.piScore)}
            </span>
          </div>

          {/* Subtle PI Delta Badge on Install */}
          {installFeedback && installFeedback.piAfter !== installFeedback.piBefore && (
            <span
              key={`pi-delta-${installFeedback.id}`}
              className="animate-upgrade-badge-pop px-2 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/70 text-emerald-300 font-mono text-xs font-black"
            >
              {installFeedback.piAfter > installFeedback.piBefore ? '+' : ''}
              {installFeedback.piAfter - installFeedback.piBefore} PI
            </span>
          )}

          {/* Individual Part Rating Impact Indicator when viewing a part */}
          {selectedPart && singlePartBenchmark.piScore !== stockBenchmark.piScore && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                singlePartBenchmark.piScore > stockBenchmark.piScore
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                  : 'bg-rose-500/20 border border-rose-400/50 text-rose-300'
              }`}
            >
              Part: {singlePartBenchmark.piScore > stockBenchmark.piScore ? '+' : ''}
              {Math.min(999, singlePartBenchmark.piScore) -
                Math.min(999, stockBenchmark.piScore)}{' '}
              PI
            </span>
          )}

          {/* Active Car Title */}
          <div className="font-display text-sm sm:text-base font-black uppercase tracking-wide text-white truncate max-w-[260px] sm:max-w-md">
            {activeSpec.year} {activeSpec.manufacturer} {activeSpec.name}
          </div>
        </div>

        {/* Right Side: Forza CR Credits Box + Back to Menu */}
        <div className="flex items-center gap-2.5">
          {/* [CR | 154,534] Forza Horizon 5 Credits Badge */}
          <div className="flex items-center rounded overflow-hidden border border-white/25 shadow">
            <span className="px-2 py-0.5 bg-white text-slate-950 font-display text-xs font-black uppercase flex items-center gap-1">
              <CreditSymbolIcon className="w-3.5 h-3.5 text-slate-950" />
              <span>CR</span>
            </span>
            <span className="px-3 py-0.5 bg-slate-900 text-white font-mono text-xs sm:text-sm font-black tabular-nums">
              {careerCredits.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Menu
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Upgrade Shop"
            aria-label="Close Upgrade Shop"
            className="w-7 h-7 rounded-full bg-slate-900 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. MAIN INTERACTIVE FORZA HORIZON 5 UPGRADE SHOP WORKSPACE
         ===================================================================== */}
      <div className="relative flex-1 flex flex-col lg:flex-row items-stretch justify-between px-3 sm:px-6 py-2.5 gap-3 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* ===================================================================
            LEFT COLUMN: EXACT FORZA HORIZON 5 "UPGRADE SHOP" 3x3 TILE GRID
            + SCROLLABLE CATEGORY OPTIONS LIST
           =================================================================== */}
        <div className="w-full lg:w-[560px] xl:w-[600px] h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] flex flex-row gap-2.5 sm:gap-3 shrink-0 z-20 min-h-0">
          {/* 1A. Forza Horizon 5 "UPGRADE SHOP" 3x3 Tile Box (Exact visual replica of shared_image.jpg) */}
          <div className="w-[210px] sm:w-[250px] h-full flex flex-col bg-slate-900/90 border border-white/20 shadow-2xl shrink-0 overflow-y-auto">
            {/* Yellow "UPGRADE SHOP" Top Banner */}
            <div className="bg-[#facc15] px-3 py-1.5 text-slate-950 font-display text-sm sm:text-base font-black uppercase tracking-wider shrink-0">
              UPGRADE SHOP
            </div>

            {/* 3x3 Grid of Square White/Grey Category Tiles */}
            <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-300/90 shrink-0">
              {UPGRADE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const hasCartItemInCat = cartParts.some((p) => p.categoryId === cat.id);
                const isJustInstalledCat =
                  installFeedback?.installedCategories.includes(cat.id) ?? false;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                    }}
                    className={`relative aspect-square flex flex-col items-center justify-center p-1 transition-all cursor-pointer ${
                      isJustInstalledCat
                        ? 'animate-upgrade-card-flash ring-2 ring-emerald-500'
                        : ''
                    } ${
                      isSelected
                        ? 'bg-white border-[3px] border-[#ec4899] shadow-[0_0_16px_rgba(236,72,153,0.55)] scale-[1.03] z-10'
                        : 'bg-slate-100/95 hover:bg-white border border-slate-300'
                    }`}
                  >
                    {hasCartItemInCat && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                    {isJustInstalledCat && !hasCartItemInCat && (
                      <span
                        key={`cat-inst-${installFeedback?.id}`}
                        className="animate-upgrade-badge-pop absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                    <CategoryTileIcon categoryId={cat.id} isSelected={isSelected} />
                    <span className="text-[8px] font-display font-black uppercase tracking-tighter text-slate-800 mt-0.5 leading-none">
                      {cat.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Purple Category Title Bar (Exact match to "ENGINE" purple bar in shared_image.jpg) */}
            <div className="bg-gradient-to-r from-[#581c87] via-[#6b21a8] to-[#4c1d95] px-3 py-1 text-center font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white shrink-0">
              {currentCategory.title}
            </div>

            {/* Dark Category Description Box */}
            <div className="p-2.5 bg-slate-950/95 text-[11px] text-slate-200 leading-snug flex-1">
              {currentCategory.description}
            </div>
          </div>

          {/* 1B. Scrollable Installable Options List for the Clicked Main Category */}
          <div className="flex-1 h-full flex flex-col bg-slate-950/90 border border-white/15 rounded-xl overflow-hidden min-h-0">
            <div className="px-3 py-2 bg-slate-900 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-amber-400">
                  INSTALLABLE OPTIONS ({partsForSelectedCategory.length} PARTS)
                </div>
                <div className="font-display text-xs sm:text-sm font-extrabold text-white uppercase">
                  {currentCategory.title} PARTS
                </div>
              </div>
              <span className="text-[10px] font-mono text-cyan-300">
                Scroll ↕ · Click part
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-2 pb-10 space-y-1.5">
              {partsForSelectedCategory.map((part) => {
                const installed = part.isCurrentlyInstalled(activeTune, activeSpec);
                const inCart = isPartInCart(part.id);
                const isSelected = selectedPart?.id === part.id;
                const isJustInstalledPart =
                  installFeedback?.installedPartIds.includes(part.id) ?? false;

                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => setSelectedPart(part)}
                    className={`relative overflow-hidden w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isJustInstalledPart
                        ? 'animate-upgrade-card-flash ring-2 ring-emerald-400/80'
                        : ''
                    } ${
                      isSelected
                        ? 'bg-pink-500/20 border-[#ec4899] shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                        : inCart
                        ? 'bg-amber-500/15 border-amber-400/70'
                        : installed
                        ? 'bg-emerald-950/40 border-emerald-400/50'
                        : 'bg-slate-900/80 hover:bg-slate-800/90 border-white/10'
                    }`}
                  >
                    {isJustInstalledPart && (
                      <div
                        key={`row-sweep-${installFeedback?.id}`}
                        className="pointer-events-none absolute inset-0 overflow-hidden"
                      >
                        <div className="animate-upgrade-scan-sweep w-2/3 h-full bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 relative z-10">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-extrabold uppercase ${
                            part.stageLabel === 'RACE'
                              ? 'bg-amber-400 text-slate-950'
                              : part.stageLabel === 'SPORT'
                              ? 'bg-purple-500 text-white'
                              : part.stageLabel === 'STREET'
                              ? 'bg-sky-400 text-slate-950'
                              : part.stageLabel === 'CONVERSION'
                              ? 'bg-pink-500 text-white'
                              : 'bg-slate-700 text-slate-200'
                          }`}
                        >
                          {part.stageLabel}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 truncate">
                          {part.subGroupLabel}
                        </span>
                      </div>

                      <div className="font-display text-xs font-extrabold text-white truncate mt-0.5">
                        {part.name}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {installed ? (
                          <span
                            key={
                              isJustInstalledPart
                                ? `row-inst-${installFeedback?.id}`
                                : 'row-inst-static'
                            }
                            className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold ${
                              isJustInstalledPart
                                ? 'animate-upgrade-badge-pop px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.7)]'
                                : 'text-emerald-400'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />{' '}
                            {isJustInstalledPart ? 'JUST INSTALLED' : 'INSTALLED'}
                          </span>
                        ) : inCart ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300">
                            <ShoppingCart className="w-3 h-3" /> IN CART
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300">
                            <CreditSymbolIcon className="w-3 h-3 text-amber-400" />
                            {part.costWith30PctMarkup.toLocaleString()} CR
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 relative z-10" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===================================================================
            CENTER / RIGHT: 3/4 STUDIO CAR STRUCTURE SHOWCASE (SHOWS BACK WING,
            RIDE HEIGHT, INTERCOOLER, BRAKES, TIRES & LIVE STATS)
           =================================================================== */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[220px] overflow-hidden">
          {/* Subtle diagonal garage light-sweep across the car when a part is installed */}
          {installFeedback && (
            <div
              key={`car-sweep-${installFeedback.id}`}
              className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
            >
              <div className="animate-upgrade-scan-sweep w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-400/18 to-transparent" />
            </div>
          )}

          {/* Subtle Floating Installation Confirmation Banner with Telemetry Deltas */}
          {installFeedback && (
            <div
              key={`car-toast-${installFeedback.id}`}
              className="animate-upgrade-toast absolute top-2 z-20 px-4 py-2 rounded-2xl bg-slate-950/95 border border-emerald-400/80 text-white shadow-[0_0_32px_rgba(16,185,129,0.45)] flex flex-wrap items-center justify-center gap-3 backdrop-blur-md pointer-events-none"
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.75)]">
                <Wrench className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-400">
                    PART FITTED &amp; INSTALLED
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-[9px] font-mono font-bold text-emerald-300 uppercase">
                    {installFeedback.stageLabel}
                  </span>
                </div>
                <span className="text-xs font-display font-black uppercase tracking-wider text-white">
                  {installFeedback.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/15 font-mono text-[10px] font-bold text-slate-200">
                  {installFeedback.piClassAfter} {installFeedback.piAfter}
                  {installFeedback.piAfter !== installFeedback.piBefore && (
                    <span
                      className={`ml-1 font-black ${
                        installFeedback.piAfter > installFeedback.piBefore
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      ({installFeedback.piAfter > installFeedback.piBefore ? '+' : ''}
                      {installFeedback.piAfter - installFeedback.piBefore} PI)
                    </span>
                  )}
                </span>
                {installFeedback.hpDelta !== 0 && (
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-black ${
                      installFeedback.hpDelta > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {installFeedback.hpDelta > 0 ? '+' : ''}
                    {installFeedback.hpDelta} HP
                  </span>
                )}
                {installFeedback.weightDeltaKg !== 0 && (
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-black ${
                      installFeedback.weightDeltaKg < 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {installFeedback.weightDeltaKg > 0 ? '+' : ''}
                    {installFeedback.weightDeltaKg} KG
                  </span>
                )}
                {installFeedback.costPaid > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 font-mono text-[10px] font-bold text-amber-300 inline-flex items-center gap-1">
                    -<CreditSymbolIcon className="w-3 h-3 text-amber-400" />
                    {installFeedback.costPaid.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          <StudioCarStructurePreview
            spec={activeSpec}
            previewTune={previewTune}
            previewBench={installedBenchmark}
            isInstallingFlash={Boolean(installFeedback)}
          />

          {purchaseToast && !installFeedback && (
            <div className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-mono text-xs font-black uppercase tracking-wider shadow-lg">
              {purchaseToast}
            </div>
          )}
        </div>

        {/* ===================================================================
            LEFT-SIDE POP-UP WINDOW (APPEARS WHEN ANY PART OPTION IS SELECTED)
            Shows ONLY this single part's individual increase/decrease (never
            collectively stacked with other parts in the cart or installed)!
           =================================================================== */}
        {selectedPart && (
          <div className="fixed left-3 sm:left-6 top-14 bottom-3 z-40 w-[245px] sm:w-[260px] rounded-2xl bg-slate-950/98 border-2 border-[#ec4899] shadow-[0_0_55px_rgba(0,0,0,0.95)] flex flex-col justify-between overflow-hidden">
            {/* Pop-Up Header */}
            <div className="p-3 bg-gradient-to-r from-[#581c87] via-slate-900 to-slate-950 border-b border-white/15 flex items-start justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-[#ec4899] text-white font-mono text-[9px] font-black uppercase">
                    {selectedPart.stageLabel}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-pink-200 truncate">
                    {selectedPart.subGroupLabel}
                  </span>
                </div>
                <h3 className="font-display text-xs sm:text-sm font-extrabold text-white mt-1 leading-tight">
                  {selectedPart.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPart(null)}
                className="w-7 h-7 rounded-full bg-slate-900 hover:bg-red-500 text-slate-300 hover:text-white border border-white/20 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pop-Up Body: Individual Part Effect (Never Collective) */}
            <div className="p-3 space-y-2.5 overflow-y-auto overscroll-contain touch-pan-y flex-1 min-h-0">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {selectedPart.description}
              </p>

              {/* Individual Part Rating Impact */}
              <div className="p-2 rounded-xl bg-slate-900 border border-white/15 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-300 font-bold">
                  Part Rating Effect
                </span>
                <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                  {singlePartBenchmark.piScore !== stockBenchmark.piScore ? (
                    <span
                      className={
                        singlePartBenchmark.piScore > stockBenchmark.piScore
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      {singlePartBenchmark.piScore > stockBenchmark.piScore ? '+' : ''}
                      {Math.min(999, singlePartBenchmark.piScore) -
                        Math.min(999, stockBenchmark.piScore)}{' '}
                      PI
                    </span>
                  ) : (
                    <span className="text-slate-400">0 PI (Stock)</span>
                  )}
                </div>
              </div>

              {/* Individual Part Improvements / Reductions */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  INDIVIDUAL PART EFFECT
                </div>

                {[
                  {
                    label: 'SPEED',
                    oldScore: stockRatings.speed,
                    newScore: singlePartRatings.speed,
                    physOld: stockBenchmark.topSpeedKmh,
                    physNew: singlePartBenchmark.topSpeedKmh,
                    unit: 'km/h',
                    higherIsBetter: true,
                  },
                  {
                    label: 'GRIP',
                    oldScore: stockRatings.grip,
                    newScore: singlePartRatings.grip,
                    physOld: stockBenchmark.lateralG120Kmh,
                    physNew: singlePartBenchmark.lateralG120Kmh,
                    unit: 'G',
                    higherIsBetter: true,
                  },
                  {
                    label: 'ACCEL 0–100',
                    oldScore: stockRatings.accel,
                    newScore: singlePartRatings.accel,
                    physOld: stockBenchmark.zeroTo100KmhSec,
                    physNew: singlePartBenchmark.zeroTo100KmhSec,
                    unit: 's',
                    higherIsBetter: false,
                  },
                  {
                    label: 'BRAKING',
                    oldScore: stockRatings.braking,
                    newScore: singlePartRatings.braking,
                    physOld: stockBenchmark.braking100To0M,
                    physNew: singlePartBenchmark.braking100To0M,
                    unit: 'm',
                    higherIsBetter: false,
                  },
                ].map((stat) => {
                  const rawDelta = Number((stat.physNew - stat.physOld).toFixed(2));
                  const scoreDelta = Number((stat.newScore - stat.oldScore).toFixed(1));
                  const isImproved = stat.higherIsBetter ? rawDelta > 0 : rawDelta < 0;
                  const isWorse = stat.higherIsBetter ? rawDelta < 0 : rawDelta > 0;

                  return (
                    <div
                      key={stat.label}
                      className="p-2 rounded-xl bg-slate-900/90 border border-white/10 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-200 font-bold">{stat.label}</span>
                        <div className="flex items-center gap-1">
                          {rawDelta !== 0 ? (
                            <span
                              className={`font-black text-xs ${
                                isImproved
                                  ? 'text-emerald-400'
                                  : isWorse
                                  ? 'text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {rawDelta > 0 ? `+${rawDelta}` : rawDelta} {stat.unit}
                            </span>
                          ) : (
                            <span className="text-slate-500">0 {stat.unit}</span>
                          )}
                        </div>
                      </div>

                      {/* Forza Horizon 5 Bar showing this individual part's rating delta */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                          <div
                            style={{ width: `${Math.min(100, stat.newScore * 10)}%` }}
                            className={`h-full transition-all ${
                              isImproved
                                ? 'bg-emerald-400'
                                : isWorse
                                ? 'bg-rose-400'
                                : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold w-8 text-right ${
                            scoreDelta > 0
                              ? 'text-emerald-400'
                              : scoreDelta < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta === 0 ? '0.0' : scoreDelta}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Individual Part Power & Curb Weight Change */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <div className="p-1.5 rounded-xl bg-slate-900 border border-white/10 text-[10px] font-mono">
                    <div className="text-slate-400 text-[8px]">PART HP GAIN</div>
                    <div
                      className={`font-extrabold ${
                        singlePartBenchmark.peakPowerHP > stockBenchmark.peakPowerHP
                          ? 'text-emerald-400'
                          : singlePartBenchmark.peakPowerHP < stockBenchmark.peakPowerHP
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {singlePartBenchmark.peakPowerHP - stockBenchmark.peakPowerHP > 0 ? '+' : ''}
                      {singlePartBenchmark.peakPowerHP - stockBenchmark.peakPowerHP} HP
                    </div>
                  </div>

                  <div className="p-1.5 rounded-xl bg-slate-900 border border-white/10 text-[10px] font-mono">
                    <div className="text-slate-400 text-[8px]">PART WEIGHT</div>
                    <div
                      className={`font-extrabold ${
                        singlePartBenchmark.curbWeightKg < stockBenchmark.curbWeightKg
                          ? 'text-emerald-400'
                          : singlePartBenchmark.curbWeightKg > stockBenchmark.curbWeightKg
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {singlePartBenchmark.curbWeightKg - stockBenchmark.curbWeightKg > 0 ? '+' : ''}
                      {singlePartBenchmark.curbWeightKg - stockBenchmark.curbWeightKg} kg
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pop-Up Footer: Part Cost (+30% of FH5 Price) & Add to Cart Button */}
            <div className="p-3 bg-slate-900 border-t border-white/15 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[8px] font-mono uppercase tracking-wider text-slate-400">
                    COST (FH5 + 30%)
                  </div>
                  <div className="text-[9px] font-mono text-slate-400">
                    {selectedPart.fh5BaseCost.toLocaleString()} × 1.30
                  </div>
                </div>
                <div className="flex items-center gap-1 font-display text-base font-black text-amber-300 font-mono tabular-nums">
                  <CreditSymbolIcon className="w-4 h-4 text-amber-400" />
                  <span>{selectedPart.costWith30PctMarkup.toLocaleString()}</span>
                </div>
              </div>

              {selectedPart.isCurrentlyInstalled(activeTune, activeSpec) ? (
                <div
                  key={
                    installFeedback?.installedPartIds.includes(selectedPart.id)
                      ? `popup-inst-${installFeedback.id}`
                      : 'popup-inst-static'
                  }
                  className={`w-full py-2 px-3 rounded-xl text-[11px] font-mono font-bold text-center flex items-center justify-center gap-1.5 ${
                    installFeedback?.installedPartIds.includes(selectedPart.id)
                      ? 'animate-upgrade-badge-pop bg-emerald-500 text-slate-950 font-black shadow-[0_0_20px_rgba(16,185,129,0.65)]'
                      : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                  }`}
                >
                  {installFeedback?.installedPartIds.includes(selectedPart.id) ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>PART INSTALLED &amp; FITTED</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Installed</span>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleDirectBuyAndInstallPart(selectedPart)}
                    disabled={careerCredits < selectedPart.costWith30PctMarkup}
                    className={`w-full py-2 px-3 rounded-xl font-display text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                      careerCredits >= selectedPart.costWith30PctMarkup
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg cursor-pointer'
                        : 'bg-slate-800 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      {selectedPart.costWith30PctMarkup === 0
                        ? 'Equip Stock (Free)'
                        : 'Buy & Install Now'}
                    </span>
                  </button>

                  {isPartInCart(selectedPart.id) ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(selectedPart.id)}
                      className="w-full py-1.5 px-3 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400 text-rose-200 font-display text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove from Cart</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(selectedPart)}
                      className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#ec4899] via-fuchsia-500 to-amber-400 hover:brightness-110 text-slate-950 font-display text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            MIDDLE-RIGHT SECTION: COMPACT SYMBOL-ONLY CART BUTTON + SMALL POP-UP
            Clicking the Cart Symbol opens a small pop-up window showing all
            car parts added, a Buy Cart option, and a top cross button to close it.
           =================================================================== */}
        <button
          type="button"
          onClick={() => setIsCartPopupOpen((prev) => !prev)}
          title={
            cartParts.length > 0
              ? `Open Cart (${cartParts.length} parts · ${totalCartCost.toLocaleString()} CR)`
              : 'Open Cart (Empty)'
          }
          aria-label="Open Cart"
          className={`fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-2xl border-2 flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
            cartParts.length > 0
              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-white scale-105'
              : 'bg-slate-950/90 hover:bg-slate-900 text-amber-400 border-amber-400/70'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          {cartParts.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#ec4899] text-white font-mono text-[10px] font-black flex items-center justify-center border border-white shadow">
              {cartParts.length}
            </span>
          )}
        </button>

        {/* Small Cart Pop-Up Window (Appears after clicking the Cart button) */}
        {isCartPopupOpen && (
          <div className="fixed right-16 sm:right-20 top-1/2 -translate-y-1/2 z-40 w-[245px] sm:w-[270px] rounded-2xl bg-slate-950/98 border-2 border-amber-400 shadow-[0_0_45px_rgba(0,0,0,0.95)] overflow-hidden">
            {/* Top Header with Little Cross Button to Remove/Close Pop-Up */}
            <div className="px-3 py-2 bg-gradient-to-r from-amber-500/25 via-slate-900 to-slate-950 border-b border-white/15 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-amber-400" />
                <span className="font-display text-xs font-black uppercase tracking-wider text-white">
                  Cart ({cartParts.length})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsCartPopupOpen(false)}
                title="Close Cart Pop-Up"
                aria-label="Close Cart Pop-Up"
                className="w-6 h-6 rounded-full bg-slate-900 hover:bg-red-500 text-slate-300 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body: All Car Parts Added + Buy Cart Option */}
            <div className="p-2.5 space-y-2.5">
              {cartParts.length === 0 ? (
                <div className="py-4 text-center text-[11px] font-mono text-slate-400">
                  No car parts added yet.
                </div>
              ) : (
                <>
                  <div className="max-h-[160px] overflow-y-auto overscroll-contain touch-pan-y space-y-1.5 pr-0.5">
                    {cartParts.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-display font-bold text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-amber-300 flex items-center gap-1">
                            <CreditSymbolIcon className="w-3 h-3 text-amber-400" />
                            <span>{item.costWith30PctMarkup.toLocaleString()}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          title="Remove Part"
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-white/15 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300 font-bold">Total:</span>
                      <span className="font-display text-sm font-black text-amber-300 flex items-center gap-1">
                        <CreditSymbolIcon className="w-4 h-4 text-amber-400" />
                        <span>{totalCartCost.toLocaleString()}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleBuyWholeCart}
                      disabled={!canAffordCart}
                      className={`w-full py-2 px-3 rounded-xl font-display text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                        canAffordCart
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg cursor-pointer'
                          : 'bg-slate-800 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                      }`}
                    >
                      {canAffordCart ? (
                        <span>Buy Cart</span>
                      ) : (
                        <span>Need {(totalCartCost - careerCredits).toLocaleString()} CR</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
