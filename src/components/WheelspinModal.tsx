import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VehicleSpec, VehicleTune } from '../types/game';
import { VEHICLES } from '../data/vehicles';
import {
  FrontCarIllustration,
  getVehicleBuyPrice,
  getVehicleSellPrice,
} from './AutoshowBuySellModal';
import { computeDynoBenchmark } from '../physics/vehiclePhysics';
import { Car, Info, Lock, Sparkles, Trophy, X, Zap } from 'lucide-react';

let wheelspinAudioCtx: AudioContext | null = null;
function playWheelspinTick(pitchFactor = 1) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!wheelspinAudioCtx) wheelspinAudioCtx = new AudioCtx();
    if (wheelspinAudioCtx.state === 'suspended') wheelspinAudioCtx.resume().catch(() => {});
    const now = wheelspinAudioCtx.currentTime;
    const osc = wheelspinAudioCtx.createOscillator();
    const gain = wheelspinAudioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580 * pitchFactor, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.022);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
    osc.connect(gain);
    gain.connect(wheelspinAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.024);
  } catch {
    // Ignore audio context restriction
  }
}

function playWheelspinWinFanfare() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!wheelspinAudioCtx) wheelspinAudioCtx = new AudioCtx();
    if (wheelspinAudioCtx.state === 'suspended') wheelspinAudioCtx.resume().catch(() => {});
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      if (!wheelspinAudioCtx) return;
      const t0 = wheelspinAudioCtx.currentTime + i * 0.075;
      const osc = wheelspinAudioCtx.createOscillator();
      const gain = wheelspinAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
      osc.connect(gain);
      gain.connect(wheelspinAudioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.25);
    });
  } catch {
    // Ignore audio context restriction
  }
}

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

export type WheelspinRarity = 'common' | 'uncommon' | 'epic' | 'legendary' | 'grail';

export interface WheelspinPrizeItem {
  id: string;
  rarity: WheelspinRarity;
  rarityLabel: string;
  type: 'credits' | 'car';
  creditsAmount?: number;
  vehicle?: VehicleSpec;
  carTierLabel?: 'Low-End Car' | 'Mid-Tier Car' | 'ABSOLUTE GRAIL (0.4%)';
}

/**
 * Exact 11 Credit Amounts requested by user:
 * 3000, 5000, 10000, 15000, 25000, 50000, 75000, 100000, 200000, 250000, 400000
 */
const CREDIT_PRIZE_DEFS: { amount: number; rarity: WheelspinRarity; label: string }[] = [
  { amount: 3000, rarity: 'common', label: 'COMMON' },
  { amount: 5000, rarity: 'common', label: 'COMMON' },
  { amount: 10000, rarity: 'common', label: 'COMMON' },
  { amount: 15000, rarity: 'common', label: 'COMMON' },
  { amount: 25000, rarity: 'common', label: 'COMMON' },
  { amount: 50000, rarity: 'uncommon', label: 'UNCOMMON' },
  { amount: 75000, rarity: 'uncommon', label: 'UNCOMMON' },
  { amount: 100000, rarity: 'uncommon', label: 'UNCOMMON' },
  { amount: 200000, rarity: 'epic', label: 'EPIC' },
  { amount: 250000, rarity: 'epic', label: 'EPIC' },
  { amount: 400000, rarity: 'legendary', label: 'LEGENDARY' },
];

/**
 * Rarity Drop Probabilities (Identical to Forza Horizon 5 structure):
 * - Grail is strictly 0.4% (0.004) in both Normal and Super Wheelspin.
 * - Super Wheelspin increases Common and Uncommon chances by a little compared to Normal Wheelspin.
 */
export const NORMAL_WHEELSPIN_ODDS: Record<WheelspinRarity, number> = {
  common: 0.54, // 54.0%
  uncommon: 0.28, // 28.0%
  epic: 0.136, // 13.6%
  legendary: 0.04, // 4.0%
  grail: 0.004, // 0.4% (Exact Grail chance)
};

export const SUPER_WHEELSPIN_ODDS: Record<WheelspinRarity, number> = {
  common: 0.585, // 58.5% (+4.5% higher than Normal)
  uncommon: 0.305, // 30.5% (+2.5% higher than Normal)
  epic: 0.082, // 8.2%
  legendary: 0.024, // 2.4%
  grail: 0.004, // 0.4% (Exact Grail chance)
};

function getRarityTheme(rarity: WheelspinRarity): {
  bgGrad: string;
  border: string;
  badgeBg: string;
  text: string;
} {
  switch (rarity) {
    case 'common':
      return {
        bgGrad: 'from-emerald-950/95 via-slate-900/95 to-emerald-900/40',
        border: 'border-emerald-400/70',
        badgeBg: 'bg-emerald-500 text-slate-950',
        text: 'text-emerald-300',
      };
    case 'uncommon':
      return {
        bgGrad: 'from-sky-950/95 via-slate-900/95 to-blue-900/45',
        border: 'border-sky-400/75',
        badgeBg: 'bg-sky-400 text-slate-950',
        text: 'text-sky-300',
      };
    case 'epic':
      return {
        bgGrad: 'from-purple-950/95 via-slate-900/95 to-fuchsia-900/45',
        border: 'border-purple-400/80',
        badgeBg: 'bg-purple-500 text-white',
        text: 'text-purple-300',
      };
    case 'legendary':
      return {
        bgGrad: 'from-amber-950/95 via-slate-900/95 to-yellow-900/50',
        border: 'border-amber-400',
        badgeBg: 'bg-amber-400 text-slate-950',
        text: 'text-amber-300',
      };
    case 'grail':
      return {
        bgGrad: 'from-amber-500/35 via-yellow-950/95 to-cyan-900/60',
        border: 'border-amber-300',
        badgeBg: 'bg-gradient-to-r from-amber-300 via-yellow-200 to-cyan-300 text-slate-950',
        text: 'text-amber-200',
      };
  }
}

interface WheelspinModalProps {
  careerCredits: number;
  wheelspinsCount: number;
  superWheelspinsCount: number;
  ownedVehicleIds: string[];
  customTunesByVehicle: Record<string, VehicleTune>;
  onConsumeWheelspin: (isSuper: boolean) => void;
  onAwardPrize: (
    totalCreditsWon: number,
    carsWon: VehicleSpec[],
    duplicateCarCredits: number
  ) => void;
  onClose: () => void;
}

const REEL_TOTAL_ITEMS = 52;
const REEL_WINNING_INDEX = 45;
const TILE_HEIGHT_PX = 104;

/**
 * Smooth 3-stage Forza Horizon reel curve:
 * - Brief initial ramp-up (0..0.08) so the reel accelerates smoothly from rest
 * - Fast continuous cruise & smooth quintic ease-out deceleration (0.08..1.0)
 * C1-continuous derivative so there is zero jerk or sudden velocity jump.
 */
function evaluateSmoothReelProgress(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // Smooth step blend between quadratic ramp-in and quintic ease-out
  const easeIn = t * t * (3 - 2 * t);
  const easeOut = 1 - Math.pow(1 - t, 4.35);
  const blend = Math.min(1, t / 0.12);
  return easeOut * (0.15 + 0.85 * blend) * (0.92 + 0.08 * easeIn) / (0.92 + 0.08);
}

export const WheelspinModal: React.FC<WheelspinModalProps> = ({
  careerCredits,
  wheelspinsCount,
  superWheelspinsCount,
  ownedVehicleIds,
  customTunesByVehicle,
  onConsumeWheelspin,
  onAwardPrize,
  onClose,
}) => {
  // Mode: 'normal' (1 reel) or 'super' (3 reels rotating side-by-side)
  const [spinMode, setSpinMode] = useState<'normal' | 'super'>('normal');
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [showOddsModal, setShowOddsModal] = useState<boolean>(false);

  // Reel strips & current winning results
  const [reelStrips, setReelStrips] = useState<WheelspinPrizeItem[][]>([]);
  const [wonPrizes, setWonPrizes] = useState<WheelspinPrizeItem[] | null>(null);
  const [claimSummary, setClaimSummary] = useState<{
    totalCredits: number;
    newCars: VehicleSpec[];
    duplicateCredits: number;
    autoSoldCars: { vehicle: VehicleSpec; marketPrice: number; sellPrice: number }[];
  } | null>(null);

  // Direct DOM refs for 60fps GPU-accelerated translate3d reel animation without React re-renders during spin
  const reelTrackRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const animFrameRef = useRef<number | null>(null);

  const availableSpinsForCurrentMode =
    spinMode === 'super' ? superWheelspinsCount : wheelspinsCount;

  // Build categorized prize pool from the 11 exact credit amounts + Low-End Cars + Mid-Tier Cars + 1 Absolute Grail
  const prizePoolsByRarity = useMemo(() => {
    const pools: Record<WheelspinRarity, WheelspinPrizeItem[]> = {
      common: [],
      uncommon: [],
      epic: [],
      legendary: [],
      grail: [],
    };

    // 1. Add the 11 exact credit amounts
    CREDIT_PRIZE_DEFS.forEach((def) => {
      pools[def.rarity].push({
        id: `cr_${def.amount}`,
        rarity: def.rarity,
        rarityLabel: def.label,
        type: 'credits',
        creditsAmount: def.amount,
      });
    });

    // 2. Select Low-End Cars (Common & Uncommon), Mid-Tier Cars (Uncommon & Epic), and the Absolute Grail (0.4%)
    const catalogWithPrices = VEHICLES.map((v) => {
      const bench = computeDynoBenchmark(v, customTunesByVehicle[v.id] || v.defaultTune);
      const price = getVehicleBuyPrice(v, bench);
      return { v, price };
    });

    // Low-End Cars (55,000 to 115,000 credits)
    const lowEndCars = catalogWithPrices
      .filter((x) => x.price >= 55000 && x.price <= 115000)
      .slice(0, 10);

    lowEndCars.forEach((item, idx) => {
      const targetRarity: WheelspinRarity = idx < 6 ? 'common' : 'uncommon';
      pools[targetRarity].push({
        id: `car_low_${item.v.id}`,
        rarity: targetRarity,
        rarityLabel: targetRarity === 'common' ? 'COMMON CAR' : 'UNCOMMON CAR',
        type: 'car',
        vehicle: item.v,
        carTierLabel: 'Low-End Car',
      });
    });

    // Mid-Tier Cars (160,000 to 550,000 credits)
    const midTierCars = catalogWithPrices
      .filter((x) => x.price >= 160000 && x.price <= 550000)
      .slice(0, 6);

    midTierCars.forEach((item, idx) => {
      const targetRarity: WheelspinRarity = idx < 2 ? 'uncommon' : 'epic';
      pools[targetRarity].push({
        id: `car_mid_${item.v.id}`,
        rarity: targetRarity,
        rarityLabel: targetRarity === 'uncommon' ? 'UNCOMMON CAR' : 'EPIC CAR',
        type: 'car',
        vehicle: item.v,
        carTierLabel: 'Mid-Tier Car',
      });
    });

    // Absolute Grail (0.4% Pull Chance — Flagship hypercar)
    const grailVehicle =
      VEHICLES.find((v) => v.id === 'bugatti-tourbillon-v16') ||
      VEHICLES.find((v) => v.id === 'aetherion-hyperx') ||
      VEHICLES[VEHICLES.length - 1];

    pools.grail.push({
      id: `car_grail_${grailVehicle.id}`,
      rarity: 'grail',
      rarityLabel: 'GRAIL · 0.4%',
      type: 'car',
      vehicle: grailVehicle,
      carTierLabel: 'ABSOLUTE GRAIL (0.4%)',
    });

    return pools;
  }, [customTunesByVehicle]);

  // Roll a single prize using the Forza Horizon 5 probability table for Normal or Super Wheelspin
  const rollSinglePrize = useCallback(
    (isSuper: boolean): WheelspinPrizeItem => {
      const odds = isSuper ? SUPER_WHEELSPIN_ODDS : NORMAL_WHEELSPIN_ODDS;
      const r = Math.random();
      let chosenRarity: WheelspinRarity = 'common';

      if (r < odds.grail) {
        chosenRarity = 'grail';
      } else if (r < odds.grail + odds.legendary) {
        chosenRarity = 'legendary';
      } else if (r < odds.grail + odds.legendary + odds.epic) {
        chosenRarity = 'epic';
      } else if (r < odds.grail + odds.legendary + odds.epic + odds.uncommon) {
        chosenRarity = 'uncommon';
      } else {
        chosenRarity = 'common';
      }

      const pool = prizePoolsByRarity[chosenRarity];
      if (!pool || pool.length === 0) {
        return prizePoolsByRarity.common[0];
      }
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [prizePoolsByRarity]
  );

  // Build initial idle strips whenever spinMode changes
  useEffect(() => {
    if (isSpinning) return;
    const numReels = spinMode === 'super' ? 3 : 1;
    const initialStrips: WheelspinPrizeItem[][] = [];
    for (let r = 0; r < numReels; r++) {
      const strip: WheelspinPrizeItem[] = [];
      for (let i = 0; i < REEL_TOTAL_ITEMS; i++) {
        strip.push(rollSinglePrize(spinMode === 'super'));
      }
      initialStrips.push(strip);
    }
    setReelStrips(initialStrips);
    setWonPrizes(null);
    setClaimSummary(null);

    requestAnimationFrame(() => {
      for (let r = 0; r < 3; r++) {
        const el = reelTrackRefs.current[r];
        if (el) {
          el.style.transform = `translate3d(0, -${TILE_HEIGHT_PX * 1}px, 0)`;
        }
      }
    });
  }, [spinMode, rollSinglePrize]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Start 60 FPS Forza Horizon 5 Wheelspin / Super Wheelspin Animation
  // Strictly blocked if player has 0 spins for the active mode
  const handleStartSpin = () => {
    const isSuper = spinMode === 'super';
    const availableCount = isSuper ? superWheelspinsCount : wheelspinsCount;
    if (isSpinning || availableCount <= 0) return;

    const numReels = isSuper ? 3 : 1;

    onConsumeWheelspin(isSuper);
    setWonPrizes(null);
    setClaimSummary(null);

    // Preserve currently visible top 3 tiles so the start of the spin never jumps visually
    const winners: WheelspinPrizeItem[] = [];
    const nextStrips: WheelspinPrizeItem[][] = [];

    for (let r = 0; r < numReels; r++) {
      const prevStrip = reelStrips[r] || [];
      const winItem = rollSinglePrize(isSuper);
      winners.push(winItem);
      const strip: WheelspinPrizeItem[] = [];
      for (let i = 0; i < REEL_TOTAL_ITEMS; i++) {
        if (i < 3 && prevStrip[i]) {
          strip.push(prevStrip[i]);
        } else if (i === REEL_WINNING_INDEX) {
          strip.push(winItem);
        } else {
          strip.push(rollSinglePrize(isSuper));
        }
      }
      nextStrips.push(strip);
    }

    setReelStrips(nextStrips);
    setIsSpinning(true);

    // Wait 1 frame for React DOM commit, then run pure GPU translate3d loop with zero React state updates
    requestAnimationFrame(() => {
      const startOffsetPx = TILE_HEIGHT_PX * 1;
      const targetOffsetPx = TILE_HEIGHT_PX * (REEL_WINNING_INDEX - 1);

      for (let r = 0; r < numReels; r++) {
        const trackEl = reelTrackRefs.current[r];
        if (trackEl) {
          trackEl.style.transform = `translate3d(0, -${startOffsetPx}px, 0)`;
        }
      }

      const startTime = performance.now();
      const durationsMs = isSuper ? [3400, 4150, 4900] : [3800];
      const maxDurationMs = durationsMs[durationsMs.length - 1];
      const lastTickIndex = [1, 1, 1];

      const stepAnimation = (now: number) => {
        const elapsed = Math.max(0, now - startTime);

        for (let r = 0; r < numReels; r++) {
          const trackEl = reelTrackRefs.current[r];
          if (!trackEl) continue;

          const dur = durationsMs[r];
          const t = Math.min(1, elapsed / dur);
          const eased = evaluateSmoothReelProgress(t);
          const currentY = startOffsetPx + (targetOffsetPx - startOffsetPx) * eased;

          trackEl.style.transform = `translate3d(0, -${currentY.toFixed(2)}px, 0)`;

          const currentTileIdx = Math.floor(currentY / TILE_HEIGHT_PX);
          if (currentTileIdx > lastTickIndex[r] && t < 0.995) {
            lastTickIndex[r] = currentTileIdx;
            if (r === 0 || t > 0.68) {
              playWheelspinTick(0.85 + 0.35 * (1 - t));
            }
          }
        }

        if (elapsed < maxDurationMs) {
          animFrameRef.current = requestAnimationFrame(stepAnimation);
        } else {
          for (let r = 0; r < numReels; r++) {
            const trackEl = reelTrackRefs.current[r];
            if (trackEl) {
              trackEl.style.transform = `translate3d(0, -${targetOffsetPx}px, 0)`;
            }
          }

          playWheelspinWinFanfare();
          setIsSpinning(false);
          setWonPrizes(winners);

          let totalCr = 0;
          let dupCr = 0;
          const newCars: VehicleSpec[] = [];
          const autoSoldCars: { vehicle: VehicleSpec; marketPrice: number; sellPrice: number }[] = [];
          const tempOwned = new Set(ownedVehicleIds);

          winners.forEach((prize) => {
            if (prize.type === 'credits' && prize.creditsAmount) {
              totalCr += prize.creditsAmount;
            } else if (prize.type === 'car' && prize.vehicle) {
              if (tempOwned.has(prize.vehicle.id)) {
                // Already owned car: automatically sold at 20% less than market price (80% of market buy price)
                const bench = computeDynoBenchmark(
                  prize.vehicle,
                  customTunesByVehicle[prize.vehicle.id] || prize.vehicle.defaultTune
                );
                const marketPrice = getVehicleBuyPrice(prize.vehicle, bench);
                const sellVal = getVehicleSellPrice(marketPrice);
                dupCr += sellVal;
                totalCr += sellVal;
                autoSoldCars.push({
                  vehicle: prize.vehicle,
                  marketPrice,
                  sellPrice: sellVal,
                });
              } else {
                tempOwned.add(prize.vehicle.id);
                newCars.push(prize.vehicle);
              }
            }
          });

          setClaimSummary({
            totalCredits: totalCr,
            newCars,
            duplicateCredits: dupCr,
            autoSoldCars,
          });
          onAwardPrize(totalCr, newCars, dupCr);
        }
      };

      animFrameRef.current = requestAnimationFrame(stepAnimation);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/96 backdrop-blur-xl text-white select-none overflow-hidden animate-window-enter">
      {/* =====================================================================
          1. COMPACT TOP HEADER BAR (CREDITS + WHEELSPIN COUNTS + ODDS + CLOSE)
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2 border-b border-white/10 bg-slate-900/90 shrink-0 z-30">
        <div className="flex items-center gap-3">
          {/* Player Credits Balance */}
          <div className="bg-slate-950 border border-amber-400/80 rounded-xl px-3 py-1 flex items-center gap-1.5 shadow">
            <CreditSymbolIcon className="w-4 h-4 text-amber-400" />
            <span className="font-display text-xs sm:text-sm font-extrabold text-amber-300 font-mono tabular-nums">
              {careerCredits.toLocaleString()}
            </span>
          </div>

          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-purple-300 leading-none">
              10% DROP AFTER RACES · GRAIL CHANCE 0.4%
            </div>
            <h2 className="font-display text-sm sm:text-lg font-extrabold text-white tracking-tight">
              {spinMode === 'super' ? 'Horizon Super Wheelspin (3x Reels)' : 'Horizon Wheelspin'}
            </h2>
          </div>
        </div>

        {/* Available Spins Counters + Odds Info + Close */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-400/50 text-[11px] font-mono text-purple-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Wheelspins:</span>
            <span className="font-bold text-white">{wheelspinsCount}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-400/50 text-[11px] font-mono text-amber-200 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Super Spins:</span>
            <span className="font-bold text-white">{superWheelspinsCount}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowOddsModal((v) => !v)}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-white/10 border border-white/15 text-[11px] font-mono text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prize Odds</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={isSpinning}
            className="px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-lg cursor-pointer"
          >
            Menu
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSpinning}
            title="Close Wheelspins"
            aria-label="Close Wheelspins"
            className="w-7 h-7 rounded-full bg-slate-950 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. CENTER STAGE: FORZA HORIZON 5 VERTICAL REEL DRUM(S) (60 FPS)
         ===================================================================== */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-2 min-h-0">
        {/* Rarity Legend Pill Strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300">
            COMMON ({spinMode === 'super' ? '58.5%' : '54.0%'})
          </span>
          <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-300">
            UNCOMMON ({spinMode === 'super' ? '30.5%' : '28.0%'})
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/50 text-purple-300">
            EPIC ({spinMode === 'super' ? '8.2%' : '13.6%'})
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300">
            LEGENDARY ({spinMode === 'super' ? '2.4%' : '4.0%'})
          </span>
          <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-400/30 to-cyan-400/30 border border-amber-300 text-amber-200 font-bold">
            GRAIL CAR (0.4%)
          </span>
        </div>

        {/* Main Reel Drum Housing */}
        <div className="relative flex items-center justify-center gap-3 sm:gap-5 p-3 sm:p-4 rounded-3xl bg-slate-900/90 border-2 border-white/15 shadow-2xl">
          {/* Glowing Horizontal Payline Selection Frame Across Middle Row */}
          <div
            style={{ height: `${TILE_HEIGHT_PX + 6}px` }}
            className="pointer-events-none absolute inset-x-1.5 top-1/2 -translate-y-1/2 z-20 rounded-2xl border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.45)] flex items-center justify-between px-1"
          >
            <div className="w-2.5 h-5 rounded-r-full bg-amber-400" />
            <div className="w-2.5 h-5 rounded-l-full bg-amber-400" />
          </div>

          {/* Render 1 Reel (Normal Wheelspin) or 3 Simultaneous Reels (Super Wheelspin) */}
          {reelStrips.map((strip, reelIdx) => (
            <div
              key={`${spinMode}_reel_${reelIdx}`}
              style={{ height: `${TILE_HEIGHT_PX * 3}px`, contain: 'strict' }}
              className="relative w-[220px] sm:w-[255px] rounded-2xl bg-slate-950 border border-white/10 overflow-hidden"
            >
              {/* Top & Bottom Studio Vignette Gradients for 3D Cylindrical Drum Illusion */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-slate-950 via-slate-950/70 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent z-10" />

              {/* GPU-Accelerated 60fps Vertical Track */}
              <div
                ref={(el) => {
                  reelTrackRefs.current[reelIdx] = el;
                }}
                style={{
                  transform: `translate3d(0, -${TILE_HEIGHT_PX * 1}px, 0)`,
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                }}
                className="w-full flex flex-col"
              >
                {strip.map((item, tileIdx) => {
                  const theme = getRarityTheme(item.rarity);
                  const tune =
                    item.vehicle &&
                    (customTunesByVehicle[item.vehicle.id] || item.vehicle.defaultTune);

                  return (
                    <div
                      key={`${item.id}_${tileIdx}`}
                      style={{ height: `${TILE_HEIGHT_PX}px`, contain: 'layout paint style' }}
                      className="w-full p-1.5 shrink-0"
                    >
                      <div
                        className={`w-full h-full rounded-xl bg-gradient-to-r ${theme.bgGrad} border ${theme.border} px-3 py-1.5 flex items-center justify-between gap-2`}
                      >
                        {item.type === 'credits' ? (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CreditSymbolIcon className="w-7 h-7 text-amber-400 shrink-0" />
                              <div>
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-mono font-extrabold uppercase tracking-wider ${theme.badgeBg}`}
                                >
                                  {item.rarityLabel}
                                </span>
                                <div className="font-display text-lg sm:text-xl font-black text-white font-mono tabular-nums leading-tight mt-0.5">
                                  {item.creditsAmount?.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono uppercase text-slate-300 shrink-0">
                              CREDITS
                            </span>
                          </>
                        ) : (
                          item.vehicle &&
                          tune && (
                            <>
                              <div className="w-20 h-14 shrink-0 flex items-center justify-center">
                                <FrontCarIllustration
                                  spec={item.vehicle}
                                  paintHex={tune.paintHex}
                                  rimHex={tune.rimHex}
                                />
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-mono font-extrabold uppercase tracking-wider ${theme.badgeBg}`}
                                >
                                  {item.rarityLabel}
                                </span>
                                <div className="font-display text-xs font-extrabold text-white truncate mt-0.5">
                                  {item.vehicle.name}
                                </div>
                                <div className={`text-[9px] font-mono font-bold ${theme.text}`}>
                                  {ownedVehicleIds.includes(item.vehicle.id)
                                    ? 'OWNED · AUTO-SELL (-20%)'
                                    : item.carTierLabel}
                                </div>
                              </div>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Won Prize Summary Banner */}
        {wonPrizes && claimSummary && !isSpinning && (
          <div className="mt-2.5 px-5 py-2 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-xl flex flex-wrap items-center justify-center gap-4 z-30">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="font-display text-sm sm:text-base font-extrabold text-white uppercase">
                Spin Rewards Claimed:
              </span>
            </div>

            {claimSummary.totalCredits > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-emerald-400/50 text-emerald-300 font-mono text-xs sm:text-sm font-extrabold">
                <span>+</span>
                <CreditSymbolIcon className="w-4 h-4 text-amber-400" />
                <span>{claimSummary.totalCredits.toLocaleString()} Credits</span>
              </div>
            )}

            {claimSummary.newCars.map((car) => (
              <div
                key={car.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300 text-amber-200 font-mono text-xs font-extrabold"
              >
                <Car className="w-4 h-4 text-amber-300" />
                <span>NEW CAR: {car.name}</span>
              </div>
            ))}

            {claimSummary.autoSoldCars.map((dup, idx) => (
              <div
                key={`${dup.vehicle.id}_autosold_${idx}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/20 border border-cyan-400/60 text-cyan-200 font-mono text-xs font-extrabold"
              >
                <Car className="w-4 h-4 text-cyan-300" />
                <span>
                  OWNED {dup.vehicle.name} AUTO-SOLD (-20%): +{dup.sellPrice.toLocaleString()} CR
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          3. BOTTOM CONTROLS + SMALLER BOTTOM MIDDLE-RIGHT SUPER WHEELSPIN BUTTON
         ===================================================================== */}
      <div className="relative px-4 sm:px-8 py-2.5 border-t border-white/10 bg-slate-900/90 flex flex-wrap items-center justify-center gap-3 shrink-0 z-30">
        {/* Main Spin Action Button (Disabled when 0 spins available) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleStartSpin}
            disabled={isSpinning || availableSpinsForCurrentMode <= 0}
            className={`px-6 py-2.5 rounded-xl font-display text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              isSpinning || availableSpinsForCurrentMode <= 0
                ? 'bg-slate-800/90 text-slate-400 border border-white/10 cursor-not-allowed opacity-75'
                : spinMode === 'super'
                ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 hover:brightness-110 text-slate-950 shadow-lg cursor-pointer'
                : 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 hover:brightness-110 text-slate-950 shadow-lg cursor-pointer'
            }`}
          >
            {availableSpinsForCurrentMode <= 0 && !isSpinning ? (
              <>
                <Lock className="w-4 h-4 text-slate-400" />
                <span>
                  {spinMode === 'super'
                    ? '0 Super Wheelspins Available'
                    : '0 Wheelspins Available (10% Race Drop)'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {isSpinning
                    ? 'Spinning...'
                    : spinMode === 'super'
                    ? `Spin Super Wheelspin (${superWheelspinsCount})`
                    : `Spin Wheelspin (${wheelspinsCount})`}
                </span>
              </>
            )}
          </button>

          {spinMode === 'super' && (
            <button
              type="button"
              onClick={() => !isSpinning && setSpinMode('normal')}
              disabled={isSpinning}
              className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/20 text-[11px] font-display font-bold uppercase tracking-wider text-slate-200 cursor-pointer"
            >
              1x Normal Spin
            </button>
          )}
        </div>

        {/* ===================================================================
            SMALLER BOTTOM MIDDLE-RIGHT BUTTON: SUPER WHEELSPIN (3x)
           =================================================================== */}
        <div className="sm:absolute sm:right-[12%] md:right-[16%] sm:bottom-2.5">
          <button
            type="button"
            onClick={() => {
              if (isSpinning) return;
              setSpinMode((prev) => (prev === 'super' ? 'normal' : 'super'));
            }}
            className={`px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-2 text-left cursor-pointer ${
              spinMode === 'super'
                ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                : 'bg-slate-950/90 hover:bg-slate-900 border-amber-400/40 hover:border-amber-400 text-slate-200'
            }`}
          >
            {/* Compact 3 Mini Spin Discs */}
            <div className="flex items-center -space-x-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-4 h-4 rounded-full border border-slate-950 flex items-center justify-center text-[7px] font-mono font-black ${
                    i === 0
                      ? 'bg-emerald-400 text-slate-950'
                      : i === 1
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-cyan-400 text-slate-950'
                  } ${isSpinning && spinMode === 'super' ? 'animate-spin' : ''}`}
                >
                  {i + 1}
                </span>
              ))}
            </div>

            <div className="leading-tight">
              <div className="flex items-center gap-1">
                <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                  Super Wheelspin
                </span>
                <span className="px-1 py-0.2 rounded bg-amber-400/20 border border-amber-400/40 text-amber-200 font-mono text-[9px] font-bold">
                  {superWheelspinsCount}
                </span>
              </div>
              <div className="text-[8px] font-mono text-slate-400">
                {spinMode === 'super' ? '3x Reels Active' : '3x Spin Mode'}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* =====================================================================
          4. PRIZE POOL & PROBABILITY BREAKDOWN MODAL
         ===================================================================== */}
      {showOddsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-white/20 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                  FORZA HORIZON 5 PRIZE STRUCTURE
                </div>
                <h3 className="font-display text-lg font-extrabold text-white">
                  Wheelspin &amp; Super Wheelspin Prize Pool
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOddsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-950 hover:bg-red-500 text-slate-300 hover:text-white border border-white/20 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-400/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-emerald-300">
                    COMMON (Normal: 54.0% · Super: 58.5%)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Credits: 3,000 · 5,000 · 10,000 · 15,000 · 25,000 + Low-End Daily Cars
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-400/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sky-300">
                    UNCOMMON (Normal: 28.0% · Super: 30.5%)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Credits: 50,000 · 75,000 · 100,000 + Low/Mid-Tier Street Cars
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-400/40 flex items-center justify-between">
                <div>
                  <div className="font-bold text-purple-300">
                    EPIC (Normal: 13.6% · Super: 8.2%)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Credits: 200,000 · 250,000 + Mid-Tier Track &amp; JDM Legends
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-400/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-300">
                    LEGENDARY (Normal: 4.0% · Super: 2.4%)
                  </div>
                  <div className="text-[11px] text-slate-300">Credits: 400,000 Jackpot</div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-cyan-500/20 border border-amber-300 flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-200">
                    ABSOLUTE GRAIL HYPERCAR (0.4% Pull Chance)
                  </div>
                  <div className="text-[11px] text-slate-200">
                    Bugatti Tourbillon V16 Hybrid (1,800 HP Flagship Grail)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
