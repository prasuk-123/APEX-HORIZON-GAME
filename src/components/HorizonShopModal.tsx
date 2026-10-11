import React, { useState } from 'react';
import { CheckCircle2, Lock, Sparkles, Store, X, Zap } from 'lucide-react';

export const HORIZON_SHOP_WHEELSPIN_COST = 8;
export const HORIZON_SHOP_SUPER_WHEELSPIN_COST = 20;
export const DAILY_MAX_WHEELSPINS_BUY = Infinity;
export const DAILY_MAX_SUPER_WHEELSPINS_BUY = Infinity;

export function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gold Coin Icon with 'H' embossed in the center, matching the 3D world Horizon Tokens.
 */
export const HorizonTokenCoinIcon: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 select-none ${className}`}
    aria-label="Horizon Token"
  >
    <circle cx="14" cy="14" r="13" fill="#FACC15" stroke="#FEF08A" strokeWidth="1.8" />
    <circle
      cx="14"
      cy="14"
      r="10.2"
      fill="#B45309"
      stroke="#FDE047"
      strokeWidth="1.2"
      strokeDasharray="2.5 1.5"
    />
    <path
      d="M9.5 8.5V19.5M18.5 8.5V19.5M9.5 14H18.5"
      stroke="#FEF9C3"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
  </svg>
);

interface HorizonShopModalProps {
  horizonTokens: number;
  wheelspinsCount: number;
  superWheelspinsCount: number;
  normalSpinsBoughtToday: number;
  superSpinsBoughtToday: number;
  onBuyNormalWheelspin: () => void;
  onBuySuperWheelspin: () => void;
  onOpenWheelspins: () => void;
  onClose: () => void;
}

export const HorizonShopModal: React.FC<HorizonShopModalProps> = ({
  horizonTokens,
  wheelspinsCount,
  superWheelspinsCount,
  normalSpinsBoughtToday,
  superSpinsBoughtToday,
  onBuyNormalWheelspin,
  onBuySuperWheelspin,
  onOpenWheelspins,
  onClose,
}) => {
  const [purchaseBanner, setPurchaseBanner] = useState<string | null>(null);

  const canBuyNormal = horizonTokens >= HORIZON_SHOP_WHEELSPIN_COST;
  const canBuySuper = horizonTokens >= HORIZON_SHOP_SUPER_WHEELSPIN_COST;

  const handlePurchaseNormal = () => {
    if (!canBuyNormal) return;
    onBuyNormalWheelspin();
    setPurchaseBanner(
      'Purchased +1 Horizon Wheelspin for 8 Horizon Tokens!'
    );
    setTimeout(() => setPurchaseBanner(null), 3000);
  };

  const handlePurchaseSuper = () => {
    if (!canBuySuper) return;
    onBuySuperWheelspin();
    setPurchaseBanner(
      'Purchased +1 Super Wheelspin for 20 Horizon Tokens!'
    );
    setTimeout(() => setPurchaseBanner(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950/95 backdrop-blur-xl text-white select-none overflow-y-auto animate-window-enter">
      {/* =====================================================================
          1. TOP HEADER BAR (HORIZON TOKENS BALANCE + SPINS + CLOSE CROSS)
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-900/95 border-b border-white/15 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-lg">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              FORZATHON / HORIZON TOKEN EXCHANGE &middot; UNLIMITED STOCK
            </div>
            <h2 className="font-display text-base sm:text-xl font-black text-white uppercase tracking-wide">
              Horizon Shop
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Player Horizon Tokens ('H' Coin) Balance */}
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/90 border-2 border-amber-400 flex items-center gap-2 shadow-lg">
            <HorizonTokenCoinIcon className="w-5 h-5" />
            <div>
              <div className="text-[8px] font-mono uppercase tracking-wider text-amber-300 leading-none">
                HORIZON TOKENS
              </div>
              <div className="font-display text-sm sm:text-base font-black text-white font-mono tabular-nums leading-tight">
                {horizonTokens.toLocaleString()} H
              </div>
            </div>
          </div>

          {/* Quick Link to Wheelspins */}
          <button
            type="button"
            onClick={onOpenWheelspins}
            className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900/80 border border-purple-400/50 text-xs font-mono text-purple-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Spins: {wheelspinsCount}</span>
            <span className="text-slate-500">|</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Super: {superWheelspinsCount}</span>
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
            title="Close Horizon Shop"
            aria-label="Close Horizon Shop"
            className="w-8 h-8 rounded-full bg-slate-950 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. MAIN HORIZON SHOP SHOWCASE (2 PURCHASABLE ITEMS WITH DAILY LIMITS)
         ===================================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-5">
        {purchaseBanner && (
          <div className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-200 font-mono text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{purchaseBanner}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* =================================================================
              ITEM 1: 1x NORMAL WHEELSPIN (8 HORIZON TOKENS · UNLIMITED)
             ================================================================= */}
          <div className="relative rounded-3xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-2 border-purple-400/60 p-6 shadow-2xl flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-500/25 border border-purple-400/60 text-purple-200 font-mono text-[10px] font-extrabold uppercase tracking-wider">
                  SINGLE REEL PRIZE SPIN
                </span>
                <span className="px-3 py-1 rounded-full font-mono text-[11px] font-black uppercase bg-emerald-500/20 border border-emerald-400/50 text-emerald-300">
                  Unlimited Stock
                </span>
              </div>

              <div className="py-5 rounded-2xl bg-slate-950/85 border border-white/10 flex flex-col items-center justify-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.45)]">
                  <Sparkles className="w-9 h-9" />
                </div>
                <h3 className="font-display text-2xl font-black text-white uppercase tracking-tight pt-1">
                  1x Wheelspin
                </h3>
                <p className="text-xs text-slate-300 text-center max-w-xs px-3">
                  1 vertical prize reel containing up to 400,000 CR, JDM &amp; Track cars, and a 0.4% chance at the Absolute Grail hypercar.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    TOKEN PRICE
                  </div>
                  <div className="text-xs font-mono text-emerald-300">
                    No Purchase Limit
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-amber-400/60">
                  <HorizonTokenCoinIcon className="w-5 h-5" />
                  <span className="font-display text-lg font-black text-amber-300 font-mono tabular-nums">
                    {HORIZON_SHOP_WHEELSPIN_COST} Tokens
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePurchaseNormal}
                disabled={!canBuyNormal}
                className={`w-full py-3.5 px-5 rounded-2xl font-display text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  canBuyNormal
                    ? 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 hover:brightness-110 text-slate-950 shadow-xl cursor-pointer'
                    : 'bg-slate-800/90 text-slate-400 border border-white/10 cursor-not-allowed'
                }`}
              >
                {horizonTokens < HORIZON_SHOP_WHEELSPIN_COST ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Need {HORIZON_SHOP_WHEELSPIN_COST - horizonTokens} More Horizon Tokens
                    </span>
                  </>
                ) : (
                  <>
                    <HorizonTokenCoinIcon className="w-5 h-5" />
                    <span>Buy 1x Wheelspin (8 Horizon Tokens)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* =================================================================
              ITEM 2: 1x SUPER WHEELSPIN (20 HORIZON TOKENS · UNLIMITED)
             ================================================================= */}
          <div className="relative rounded-3xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-2 border-amber-400/75 p-6 shadow-2xl flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/60 text-amber-200 font-mono text-[10px] font-extrabold uppercase tracking-wider">
                  TRIPLE 3x REEL JACKPOT SPIN
                </span>
                <span className="px-3 py-1 rounded-full font-mono text-[11px] font-black uppercase bg-emerald-500/20 border border-emerald-400/50 text-emerald-300">
                  Unlimited Stock
                </span>
              </div>

              <div className="py-5 rounded-2xl bg-slate-950/85 border border-white/10 flex flex-col items-center justify-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                  <Zap className="w-9 h-9" />
                </div>
                <h3 className="font-display text-2xl font-black text-white uppercase tracking-tight pt-1">
                  1x Super Wheelspin
                </h3>
                <p className="text-xs text-slate-300 text-center max-w-xs px-3">
                  Spins 3 simultaneous prize reels at once for triple rewards, rare cars, and triple shots at the 0.4% Absolute Grail hypercar.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    TOKEN PRICE
                  </div>
                  <div className="text-xs font-mono text-emerald-300">
                    No Purchase Limit
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border border-amber-400/60">
                  <HorizonTokenCoinIcon className="w-5 h-5" />
                  <span className="font-display text-lg font-black text-amber-300 font-mono tabular-nums">
                    {HORIZON_SHOP_SUPER_WHEELSPIN_COST} Tokens
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePurchaseSuper}
                disabled={!canBuySuper}
                className={`w-full py-3.5 px-5 rounded-2xl font-display text-xs sm:text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  canBuySuper
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 hover:brightness-110 text-slate-950 shadow-xl cursor-pointer'
                    : 'bg-slate-800/90 text-slate-400 border border-white/10 cursor-not-allowed'
                }`}
              >
                {horizonTokens < HORIZON_SHOP_SUPER_WHEELSPIN_COST ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Need {HORIZON_SHOP_SUPER_WHEELSPIN_COST - horizonTokens} More Horizon Tokens
                    </span>
                  </>
                ) : (
                  <>
                    <HorizonTokenCoinIcon className="w-5 h-5" />
                    <span>Buy 1x Super Wheelspin (20 Horizon Tokens)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* How to Find Horizon Tokens Info Strip */}
        <div className="w-full p-4 rounded-2xl bg-slate-900/90 border border-amber-400/35 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
          <div className="flex items-center gap-3">
            <HorizonTokenCoinIcon className="w-7 h-7" />
            <div>
              <div className="font-display font-extrabold text-amber-300 uppercase">
                How to Collect Horizon Tokens (50 Active on Map)
              </div>
              <div className="text-[11px] text-slate-300">
                50 spinning Gold &lsquo;H&rsquo; Coins are evenly distributed all across the open world (hidden from the mini-map). Drive your car through any coin to collect +1 Horizon Token — each collected coin immediately begins slowly respawning!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
