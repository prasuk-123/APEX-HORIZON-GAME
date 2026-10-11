import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Play, User, X } from 'lucide-react';

interface IntroTitleAnimationModalProps {
  isFirstTimeUser: boolean;
  initialDriverName: string;
  onConfirmFirstTimeUsername: (username: string) => void;
  onStartGame: () => void;
  onOpenApkModal?: () => void;
}

export const IntroTitleAnimationModal: React.FC<IntroTitleAnimationModalProps> = ({
  isFirstTimeUser,
  initialDriverName,
  onConfirmFirstTimeUsername,
  onStartGame,
  onOpenApkModal,
}) => {
  const [stage, setStage] = useState<'ignition' | 'title_ready'>('ignition');
  const [sweepProgress, setSweepProgress] = useState<number>(0);
  const [usernameDraft, setUsernameDraft] = useState<string>(() =>
    initialDriverName.startsWith('ApexDriver_') ? '' : initialDriverName
  );
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const startMs = performance.now();
    const durationMs = 2100;

    const tick = (now: number) => {
      const elapsed = now - startMs;
      const ratio = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setSweepProgress(eased);

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setStage('title_ready');
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    if (stage === 'title_ready' && isFirstTimeUser) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => window.clearTimeout(timer);
    }
  }, [stage, isFirstTimeUser]);

  const handleSubmitFirstTimeUsername = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = usernameDraft.trim();
    if (cleaned.length < 2) {
      setUsernameError('Please enter a username (at least 2 characters).');
      inputRef.current?.focus();
      return;
    }
    setUsernameError(null);
    onConfirmFirstTimeUsername(cleaned.slice(0, 20));
    onStartGame();
  };

  const rpmDisplay = Math.round(sweepProgress * 9000);
  const speedDisplay = Math.round(sweepProgress * 365);
  const arcMax = 240;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#07090e] select-none">
      {/* Top-Left Download APK / Install App Button */}
      {onOpenApkModal && (
        <button
          type="button"
          onClick={onOpenApkModal}
          title="Download Android APK or Install App"
          className="fixed top-4 left-4 z-50 px-3.5 py-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white border border-orange-300/40 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider shadow-2xl transition-all cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Get APK / Install App</span>
        </button>
      )}

      {/* Top-Right Little Cross (X) Button to Close Intro Window Immediately (Only skips directly if username is already set; otherwise reveals the first-time username window) */}
      <button
        type="button"
        onClick={() => {
          if (isFirstTimeUser) {
            setStage('title_ready');
            setTimeout(() => inputRef.current?.focus(), 50);
          } else {
            onStartGame();
          }
        }}
        title="Close Window"
        aria-label="Close Intro Window"
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-slate-900/90 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center shadow-2xl transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Clean Atmospheric Parisian Twilight Gradient & Speed Light Streaks (No Watermark Image) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.16),rgba(6,182,212,0.08)_45%,#07090e_80%)] pointer-events-none" />

      {/* Animated Horizon Light Streaks during Ignition */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          style={{
            transform: `translateX(${(sweepProgress - 0.5) * 140}%)`,
            opacity: stage === 'ignition' ? 0.65 : 0.18,
          }}
          className="absolute top-1/3 -left-1/4 w-[150%] h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent blur-[1px] transition-opacity duration-700"
        />
        <div
          style={{
            transform: `translateX(${(0.5 - sweepProgress) * 140}%)`,
            opacity: stage === 'ignition' ? 0.55 : 0.15,
          }}
          className="absolute bottom-1/3 -left-1/4 w-[150%] h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[1px] transition-opacity duration-700"
        />
      </div>

      {/* Center Content Stage */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl w-full">
        {/* Stage 1 & Persistent Animated Telemetry Tachometer Emblem */}
        <div
          className={`relative flex items-center justify-center transition-all duration-700 ${
            stage === 'title_ready' ? 'w-28 h-28 mb-3' : 'w-48 h-48 mb-6'
          }`}
        >
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="2"
              strokeDasharray="2 8"
              transform="rotate(135 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${arcMax} 302`}
              transform="rotate(135 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke={sweepProgress > 0.85 ? '#EF4444' : '#F59E0B'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${sweepProgress * arcMax} 302`}
              transform="rotate(135 60 60)"
            />
            <g transform={`rotate(${135 + sweepProgress * 286.5} 60 60)`}>
              <line
                x1="94"
                y1="60"
                x2="108"
                y2="60"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-mono text-amber-400 tracking-widest">
              {stage === 'ignition' ? 'IGNITION' : 'V10 READY'}
            </span>
            <span className="font-display text-2xl font-bold text-white font-mono tabular-nums">
              {stage === 'ignition' ? `${speedDisplay}` : '9000'}
            </span>
            <span className="text-[9px] font-mono text-cyan-300">
              {stage === 'ignition' ? 'KM/H' : 'RPM'}
            </span>
          </div>
        </div>

        {/* Stage 1 Telemetry Loading Caption */}
        {stage === 'ignition' && (
          <div className="space-y-2 animate-pulse">
            <p className="font-mono text-xs tracking-[0.25em] text-amber-400 uppercase">
              Calibrating Paris Open-World Physics &amp; Exhaust Harmonics...
            </p>
            <p className="font-mono text-xs text-slate-400 tabular-nums">
              Engine Rev: {rpmDisplay.toLocaleString()} RPM · 260 Vehicles Loaded
            </p>
          </div>
        )}

        {/* Stage 2: "APEX HORIZONS" Grand Title Reveal & First-Time Username Popup Window OR Start Button */}
        <div
          className={`transition-all duration-700 ease-out flex flex-col items-center w-full ${
            stage === 'title_ready'
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-6 scale-95 pointer-events-none h-0 overflow-hidden'
          }`}
        >
          <span className="text-xs font-mono tracking-[0.35em] text-cyan-300 uppercase mb-1.5">
            Paris Open-World Driving &amp; Massive Multiplayer Simulation
          </span>

          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white uppercase drop-shadow-[0_6px_30px_rgba(245,158,11,0.35)]">
            APEX <span className="text-amber-400">HORIZONS</span>
          </h1>

          {isFirstTimeUser ? (
            /* FIRST-TIME USER ONLY: POPUP WINDOW TO ENTER DRIVER USERNAME */
            <form
              onSubmit={handleSubmitFirstTimeUsername}
              className="mt-6 w-full max-w-md bg-slate-900/95 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.28)] text-left space-y-4 animate-menu-card-enter"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                    FIRST-TIME DRIVER REGISTRATION
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                    Enter Your Username
                  </h2>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Choose your Horizon driver username for leaderboards, race standings, and multiplayer convoys. You can change your name anytime later from the <strong className="text-amber-300">Profile</strong> section.
              </p>

              <div className="space-y-1.5">
                <label
                  htmlFor="first-time-driver-username"
                  className="block text-[11px] font-mono uppercase tracking-wider text-slate-400"
                >
                  Driver Username (2 – 20 Characters)
                </label>
                <input
                  id="first-time-driver-username"
                  ref={inputRef}
                  type="text"
                  value={usernameDraft}
                  maxLength={20}
                  placeholder="e.g. HorizonLegend_99"
                  onChange={(e) => {
                    setUsernameDraft(e.target.value);
                    if (usernameError) setUsernameError(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-white/20 focus:border-amber-400 focus:outline-none text-sm sm:text-base font-mono font-bold text-white placeholder:text-slate-600 transition-colors"
                />
                {usernameError && (
                  <p className="text-xs font-mono text-rose-400">{usernameError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-sm sm:text-base font-extrabold uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.45)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Save Username &amp; Start Game</span>
              </button>
            </form>
          ) : (
            /* RETURNING USER: NO USERNAME POPUP — DIRECT START GAME BUTTON */
            <>
              <p className="mt-2.5 text-sm sm:text-base text-slate-300 max-w-xl">
                Welcome back, <span className="font-mono font-bold text-amber-300">{initialDriverName}</span> · 260 Sculpted Supercars, Normal Cars &amp; Heavy Rigs
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={onStartGame}
                  className="group relative inline-flex items-center gap-3 px-10 py-4 text-base sm:text-lg font-display font-bold tracking-wider uppercase text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Game</span>
                </button>

                {onOpenApkModal && (
                  <button
                    type="button"
                    onClick={onOpenApkModal}
                    className="inline-flex items-center gap-2.5 px-6 py-4 text-sm sm:text-base font-display font-bold tracking-wider uppercase text-white bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 border border-orange-300/40 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download APK / App</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
