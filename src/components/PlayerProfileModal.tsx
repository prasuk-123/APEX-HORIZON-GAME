import React, { useMemo, useState } from 'react';
import {
  Award,
  Car,
  CheckCircle2,
  Flag,
  Lock,
  Sparkles,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react';

export const MAX_PLAYER_LEVEL = 100;

/**
 * Progressive XP required to advance from `level` to `level + 1` (for levels 1..99).
 * Scales 40% harder with every new level (Base 2,520 XP = 1,800 * 1.4, stepping +40% per new level).
 */
export function getXpRequiredForLevelJump(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_PLAYER_LEVEL - 1, level));
  return Math.round(2520 * (1 + 0.4 * (clamped - 1)));
}

/**
 * Cumulative total XP required to reach `targetLevel` (Level 1 starts at 0 XP).
 */
export function getCumulativeXpForLevel(targetLevel: number): number {
  const clamped = Math.max(1, Math.min(MAX_PLAYER_LEVEL, targetLevel));
  let total = 0;
  for (let lvl = 1; lvl < clamped; lvl++) {
    total += getXpRequiredForLevelJump(lvl);
  }
  return total;
}

export interface PlayerLevelProgress {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  xpForNextLevel: number;
  progressPct: number;
  isMaxLevel: boolean;
}

/**
 * Given a player's cumulative `totalXp`, returns their current Level (1..100)
 * and progress toward the next level.
 */
export function getLevelProgressFromTotalXp(totalXp: number): PlayerLevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safeXp;

  while (level < MAX_PLAYER_LEVEL) {
    const req = getXpRequiredForLevelJump(level);
    if (remaining >= req) {
      remaining -= req;
      level += 1;
    } else {
      break;
    }
  }

  if (level >= MAX_PLAYER_LEVEL) {
    const lastReq = getXpRequiredForLevelJump(MAX_PLAYER_LEVEL - 1);
    return {
      level: MAX_PLAYER_LEVEL,
      totalXp: safeXp,
      currentLevelXp: lastReq,
      xpForNextLevel: lastReq,
      progressPct: 100,
      isMaxLevel: true,
    };
  }

  const xpForNextLevel = getXpRequiredForLevelJump(level);
  const progressPct = Math.min(100, Math.max(0, (remaining / xpForNextLevel) * 100));

  return {
    level,
    totalXp: safeXp,
    currentLevelXp: remaining,
    xpForNextLevel,
    progressPct,
    isMaxLevel: false,
  };
}

/**
 * Every level has a reward of 1 Wheelspin.
 * Every 5th level (5, 10, 15, ..., 100) gives 1 Super Wheelspin INSTEAD of a normal Wheelspin.
 */
export function getLevelRewardType(level: number): 'super_wheelspin' | 'wheelspin' {
  return level % 5 === 0 ? 'super_wheelspin' : 'wheelspin';
}

/**
 * Calculates how many Normal Wheelspins and Super Wheelspins are earned when leveling up
 * from `oldLevel` to `newLevel`.
 */
export function computeLevelUpSpinRewards(
  oldLevel: number,
  newLevel: number
): {
  normalWheelspinsEarned: number;
  superWheelspinsEarned: number;
  levelsGained: number;
} {
  const start = Math.max(1, Math.min(MAX_PLAYER_LEVEL, oldLevel));
  const end = Math.max(start, Math.min(MAX_PLAYER_LEVEL, newLevel));

  let normalWheelspinsEarned = 0;
  let superWheelspinsEarned = 0;

  for (let lvl = start + 1; lvl <= end; lvl++) {
    if (getLevelRewardType(lvl) === 'super_wheelspin') {
      superWheelspinsEarned += 1;
    } else {
      normalWheelspinsEarned += 1;
    }
  }

  return {
    normalWheelspinsEarned,
    superWheelspinsEarned,
    levelsGained: end - start,
  };
}

/**
 * Balanced Race XP Reward calculation based on finishing position, race length, and difficulty.
 * Awards ~1,350 to 2,650 XP per completed race so leveling up is neither too hard nor too easy.
 */
export function calculateRaceXpReward(
  playerPosition: number,
  totalRacers: number,
  distanceKm: number,
  isMultiplayerRace: boolean
): number {
  const safeTotal = Math.max(2, totalRacers);
  const clampedPos = Math.max(1, Math.min(safeTotal, playerPosition));
  const placementRatio = (safeTotal - clampedPos) / (safeTotal - 1); // 1.0 for 1st, 0.0 for last

  const baseCompletionXp = 1350;
  const placementBonusXp = Math.round(placementRatio * 850);
  const distanceBonusXp = Math.min(350, Math.round(distanceKm * 65));
  const multiplayerBonusXp = isMultiplayerRace ? 200 : 0;

  return Math.round((baseCompletionXp + placementBonusXp + distanceBonusXp + multiplayerBonusXp) / 10) * 10;
}

interface PlayerProfileModalProps {
  driverName: string;
  onChangeDriverName: (name: string) => void;
  playerXp: number;
  careerCredits: number;
  wheelspinsCount: number;
  superWheelspinsCount: number;
  ownedVehiclesCount: number;
  totalVehiclesCount: number;
  completedRacesCount: number;
  onOpenWheelspins: () => void;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  driverName,
  onChangeDriverName,
  playerXp,
  careerCredits,
  wheelspinsCount,
  superWheelspinsCount,
  ownedVehiclesCount,
  totalVehiclesCount,
  completedRacesCount,
  onOpenWheelspins,
  onClose,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'super_only' | 'unlocked'>('all');
  const [editingName, setEditingName] = useState<boolean>(false);
  const [nameDraft, setNameDraft] = useState<string>(driverName);
  const [nameSavedBanner, setNameSavedBanner] = useState<boolean>(false);

  const handleSaveDriverName = () => {
    const cleaned = nameDraft.trim().slice(0, 20);
    if (cleaned.length >= 2) {
      onChangeDriverName(cleaned);
      setEditingName(false);
      setNameSavedBanner(true);
      window.setTimeout(() => setNameSavedBanner(false), 2600);
    }
  };

  const progress = useMemo(() => getLevelProgressFromTotalXp(playerXp), [playerXp]);
  const nextLevel = Math.min(MAX_PLAYER_LEVEL, progress.level + 1);
  const nextLevelReward = getLevelRewardType(nextLevel);

  const allLevelsList = useMemo(() => {
    const list: {
      level: number;
      rewardType: 'super_wheelspin' | 'wheelspin';
      xpToReach: number;
      xpStep: number;
      isUnlocked: boolean;
      isCurrent: boolean;
      isNext: boolean;
    }[] = [];

    for (let lvl = 1; lvl <= MAX_PLAYER_LEVEL; lvl++) {
      list.push({
        level: lvl,
        rewardType: getLevelRewardType(lvl),
        xpToReach: getCumulativeXpForLevel(lvl),
        xpStep: lvl > 1 ? getXpRequiredForLevelJump(lvl - 1) : 0,
        isUnlocked: lvl <= progress.level,
        isCurrent: lvl === progress.level,
        isNext: !progress.isMaxLevel && lvl === progress.level + 1,
      });
    }
    return list;
  }, [progress]);

  const filteredLevels = useMemo(() => {
    if (filterMode === 'super_only') {
      return allLevelsList.filter((item) => item.rewardType === 'super_wheelspin');
    }
    if (filterMode === 'unlocked') {
      return allLevelsList.filter((item) => item.isUnlocked);
    }
    return allLevelsList;
  }, [allLevelsList, filterMode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/95 backdrop-blur-xl text-white select-none overflow-hidden animate-window-enter">
      {/* =====================================================================
          1. TOP HEADER BAR (PLAYER LEVEL BADGE + XP + SPINS + CLOSE CROSS)
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-slate-900/95 border-b border-white/15 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-display font-black text-base shadow-lg">
            {progress.level}
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              HORIZON DRIVER PROFILE · LEVEL 1 – 100 PROGRESSION
            </div>
            <h2 className="font-display text-base sm:text-xl font-black text-white uppercase tracking-wide">
              {driverName} &middot; Level {progress.level} / {MAX_PLAYER_LEVEL}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Wheelspin & Super Wheelspin Badges */}
          <button
            type="button"
            onClick={onOpenWheelspins}
            className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900/80 border border-purple-400/50 text-xs font-mono text-purple-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Wheelspins:</span>
            <span className="font-extrabold text-white">{wheelspinsCount}</span>
          </button>

          <button
            type="button"
            onClick={onOpenWheelspins}
            className="px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900/80 border border-amber-400/60 text-xs font-mono text-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Super Spins:</span>
            <span className="font-extrabold text-white">{superWheelspinsCount}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Menu
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Player Profile"
            aria-label="Close Player Profile"
            className="w-8 h-8 rounded-full bg-slate-950 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. MAIN PROFILE WORKSPACE (LEFT: DRIVER LEVEL & XP CARD, RIGHT: 1-100 REWARD TRACK)
         ===================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-6 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* LEFT COLUMN: DRIVER LEVEL CREST, XP BAR, NEXT LEVEL REWARD & STATS */}
        <div className="w-full lg:w-[400px] xl:w-[430px] flex flex-col gap-3.5 shrink-0 lg:overflow-y-auto pr-0.5">
          {/* Primary Level 1-100 & XP Progression Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-400/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-slate-950 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.45)] border-2 border-white">
                  <span className="text-[9px] font-mono font-black uppercase leading-none">
                    LVL
                  </span>
                  <span className="font-display text-2xl font-black leading-none mt-0.5">
                    {progress.level}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                    DRIVER USERNAME &amp; PRESTIGE RANK
                  </div>
                  {editingName ? (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={nameDraft}
                        maxLength={20}
                        autoFocus
                        placeholder="Enter username..."
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveDriverName();
                          } else if (e.key === 'Escape') {
                            setEditingName(false);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border-2 border-amber-400 text-xs font-mono font-bold text-white w-40 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveDriverName}
                        className="px-2.5 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-[10px] font-mono font-black uppercase cursor-pointer transition-colors"
                      >
                        Save Name
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <h3 className="font-display text-lg font-extrabold text-white">
                        {driverName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setNameDraft(driverName);
                          setEditingName(true);
                        }}
                        className="px-2.5 py-0.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/30 border border-cyan-400/50 text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Change Name
                      </button>
                      {nameSavedBanner && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Saved!
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    Total Career XP: <span className="text-white font-bold">{progress.totalXp.toLocaleString()} XP</span>
                  </div>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
                  {progress.level} / {MAX_PLAYER_LEVEL}
                </span>
              </div>
            </div>

            {/* XP Progress Bar toward Next Level */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold">
                  {progress.isMaxLevel
                    ? 'MAX LEVEL 100 ACHIEVED'
                    : `Progress to Level ${nextLevel}`}
                </span>
                <span className="text-cyan-300 font-bold tabular-nums">
                  {progress.isMaxLevel
                    ? 'MAX'
                    : `${progress.currentLevelXp.toLocaleString()} / ${progress.xpForNextLevel.toLocaleString()} XP (${Math.round(
                        progress.progressPct
                      )}%)`}
                </span>
              </div>

              <div className="w-full h-3.5 rounded-full bg-slate-950 border border-white/15 overflow-hidden p-0.5">
                <div
                  style={{ width: `${progress.progressPct}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-pink-500 transition-all duration-300"
                />
              </div>

              {!progress.isMaxLevel && (
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>
                    Need{' '}
                    <strong className="text-white">
                      {(progress.xpForNextLevel - progress.currentLevelXp).toLocaleString()} XP
                    </strong>{' '}
                    for Level {nextLevel}
                  </span>
                  <span className="text-emerald-400">+40% XP / New Level</span>
                </div>
              )}
            </div>

            {/* Next Level Reward Highlight Box */}
            {!progress.isMaxLevel && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  nextLevelReward === 'super_wheelspin'
                    ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-slate-950 border-amber-400'
                    : 'bg-gradient-to-r from-purple-500/20 via-fuchsia-500/10 to-slate-950 border-purple-400/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      nextLevelReward === 'super_wheelspin'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-purple-500 text-white'
                    }`}
                  >
                    {nextLevelReward === 'super_wheelspin' ? (
                      <Zap className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300">
                      NEXT REWARD AT LEVEL {nextLevel}
                    </div>
                    <div className="font-display text-sm font-black uppercase text-white">
                      {nextLevelReward === 'super_wheelspin'
                        ? '+1 SUPER WHEELSPIN (5th Level Milestone!)'
                        : '+1 HORIZON WHEELSPIN'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reward Rules & Race XP Guide */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/15 space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>LEVEL 1–100 REWARD &amp; XP RULES</span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <Flag className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Complete Races for XP:</strong> Every completed race awards{' '}
                  <span className="text-cyan-300 font-mono font-bold">1,350 – 2,600 XP</span>. Each new level requires{' '}
                  <span className="text-amber-300 font-mono font-bold">+40% more XP</span> as you climb higher.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Every Level Reward:</strong> Reaching any level gives{' '}
                  <span className="text-purple-300 font-mono font-bold">+1 Normal Wheelspin</span>.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Every 5th Level Milestone:</strong> Levels{' '}
                  <span className="text-amber-300 font-mono font-bold">5, 10, 15, 20 … 100</span> award{' '}
                  <span className="text-amber-300 font-mono font-bold">+1 Super Wheelspin</span> instead of a normal one!
                </span>
              </div>
            </div>
          </div>

          {/* Career Driver Statistics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-slate-400">Races Completed</div>
              <div className="font-display text-lg font-black text-white mt-0.5 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{completedRacesCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-slate-400">Garage Cars Owned</div>
              <div className="font-display text-lg font-black text-cyan-300 mt-0.5 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-cyan-400" />
                <span>
                  {ownedVehiclesCount} / {totalVehiclesCount}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-slate-400">Player Credits</div>
              <div className="font-display text-lg font-black text-amber-300 mt-0.5 font-mono tabular-nums">
                {careerCredits.toLocaleString()} CR
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-white/10">
              <div className="text-[10px] font-mono uppercase text-slate-400">Saved Spins</div>
              <div className="font-display text-sm font-black text-purple-300 mt-1 font-mono">
                {wheelspinsCount} Normal &middot; {superWheelspinsCount} Super
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            RIGHT COLUMN: SCROLLABLE LEVEL 1 TO 100 REWARD TRACK
           =================================================================== */}
        <div className="flex-1 flex flex-col bg-slate-900/90 border border-white/15 rounded-3xl overflow-hidden min-h-[320px]">
          <div className="px-4 sm:px-5 py-3 bg-slate-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
                EVERY LEVEL = 1 WHEELSPIN &middot; EVERY 5TH LEVEL = 1 SUPER WHEELSPIN
              </div>
              <h3 className="font-display text-sm sm:text-base font-black uppercase text-white">
                Level 1 – 100 Milestone Rewards
              </h3>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Levels (1–100)' },
                  { id: 'super_only', label: 'Every 5th Level (Super Spins)' },
                  { id: 'unlocked', label: `Unlocked (${progress.level})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Grid of Levels 1 to 100 */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-3 sm:p-4 pb-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 content-start">
            {filteredLevels.map((item) => {
              const isSuper = item.rewardType === 'super_wheelspin';

              return (
                <div
                  key={item.level}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                    item.isCurrent
                      ? 'bg-amber-400/20 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                      : item.isNext
                      ? 'bg-cyan-500/15 border-2 border-cyan-400'
                      : item.isUnlocked
                      ? 'bg-emerald-950/35 border-emerald-400/40'
                      : isSuper
                      ? 'bg-amber-950/25 border-amber-400/35'
                      : 'bg-slate-950/80 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl font-display font-black text-xs flex flex-col items-center justify-center shrink-0 ${
                        item.isUnlocked
                          ? 'bg-emerald-400 text-slate-950'
                          : isSuper
                          ? 'bg-amber-400/25 border border-amber-400 text-amber-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="text-[8px] font-mono leading-none">LVL</span>
                      <span className="text-sm leading-none mt-0.5">{item.level}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.level === 1 ? (
                          <span className="font-display text-xs font-extrabold text-slate-200">
                            Starting Driver Rank
                          </span>
                        ) : isSuper ? (
                          <span className="font-display text-xs font-extrabold text-amber-300 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>1x Super Wheelspin</span>
                          </span>
                        ) : (
                          <span className="font-display text-xs font-extrabold text-purple-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>1x Wheelspin</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {item.level === 1
                          ? '0 XP (Career Start)'
                          : `${item.xpToReach.toLocaleString()} Total XP (+${item.xpStep.toLocaleString()})`}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.isCurrent ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[9px] font-black uppercase">
                        Current
                      </span>
                    ) : item.isNext ? (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono text-[9px] font-black uppercase">
                        Next
                      </span>
                    ) : item.isUnlocked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
