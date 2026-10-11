import React, { useEffect, useState } from 'react';
import childhoodDreamImg from '../assets/images/cutscene_childhood_dream_1791303233982.jpg';
import garageDynoImg from '../assets/images/bg_automotive_garage_1791300705412.jpg';
import apexInviteImg from '../assets/images/cutscene_apex_association_invite_1791303256038.jpg';
import provingGridImg from '../assets/images/cutscene_proving_ground_grid_1791303268415.jpg';
import { ChevronRight, ChevronLeft, Play, FastForward, Award, X } from 'lucide-react';

interface StoryCutsceneModalProps {
  driverName: string;
  onChangeDriverName: (name: string) => void;
  onStartTutorialRace: () => void;
  onSkipToFreeRoam: () => void;
}

interface CutsceneChapter {
  id: number;
  yearLabel: string;
  chapterTitle: string;
  speaker: string;
  narrative: string;
  subQuote: string;
  imageSrc: string;
  telemetryNote: string;
}

const STORY_CHAPTERS: CutsceneChapter[] = [
  {
    id: 0,
    yearLabel: 'ACT I · 2012 · SIERRA CIRCUIT PERIMETER FENCE',
    chapterTitle: '01. The Kid Outside the Catch Fence',
    speaker: 'Memory Log',
    narrative:
      'Every Sunday at dusk, you stood pressed against the chain-link perimeter fence with a chipped die-cast V10 supercar in your hand. You didn’t come from a billionaire racing dynasty or karting academies—all you had was the roar of downshifts echoing across the canyon and a notebook filled with hand-drawn gear ratios.',
    subQuote:
      '“They told me motorsport was a closed club. I promised myself that if I couldn’t buy a seat, I would engineer my way into one.”',
    imageSrc: childhoodDreamImg,
    telemetryNote: 'AGE: 09 · LOCATION: OUTER TURN 4 CATCH FENCE',
  },
  {
    id: 1,
    yearLabel: 'ACT II · 2022 · BACK-ALLEY DYNAMOMETER BAY',
    chapterTitle: '02. Ten Thousand Midnight Dyno Pulls',
    speaker: 'Workshop Years',
    narrative:
      'As an adult, you took the night shift as a junior chassis and dyno technician. After the shop shutters rolled down at midnight, you spent hours calibrating boost curves, weight transfer geometry, and suspension damping—logging thousands of flawless virtual laps on the telemetry rig.',
    subQuote:
      '“Every engine has a heartbeat, and every corner has a physics equation waiting to be solved.”',
    imageSrc: garageDynoImg,
    telemetryNote: 'ROLE: NIGHT-SHIFT DYNO TECH · SIMULATED LAPS: 14,820',
  },
  {
    id: 2,
    yearLabel: 'ACT III · PRESENT DAY · THE SCHOLARSHIP DOSSIER',
    chapterTitle: '03. Recruited by the Apex Association',
    speaker: 'Apex Association Scouting Board',
    narrative:
      'One morning, a sealed carbon-fiber case was waiting on your dyno bench. Inside rested a titanium transponder key and an official contract from the Apex Association—the global motorsport organization founded to scout raw talent and fund grassroots prodigies who never had a sponsor.',
    subQuote:
      '“Your late-night dyno setups and simulator sector times beat our factory drivers by 0.8 seconds. Welcome to the Apex Association.”',
    imageSrc: apexInviteImg,
    telemetryNote: 'CONTRACT: APEX ASSOCIATION WILDCARD SEAT · STATUS: OFFERED',
  },
  {
    id: 3,
    yearLabel: 'ACT IV · HORIZON FESTIVAL PROVING GROUND',
    chapterTitle: '04. The Proving Ground Qualification Trial',
    speaker: 'Elena Vance · Apex Association Chief Race Engineer',
    narrative:
      'You stand on the Horizon Outpost starting grid as a 640 HP V10 supercar idles before you. Pass the 6-Gate Apex Association Rookie Trial to validate your license—demonstrating clean launch traction, braking weight transfer, apex cornering, and full-boost straightaway control.',
    subQuote:
      '“The helmet is yours, rookie. Put the car on the line and show the world why the Apex Association chose you.”',
    imageSrc: provingGridImg,
    telemetryNote: 'OBJECTIVE: COMPLETE 6-GATE PROVING TRIAL UNDER 55.0 SECONDS',
  },
];

export const StoryCutsceneModal: React.FC<StoryCutsceneModalProps> = ({
  driverName,
  onChangeDriverName,
  onStartTutorialRace,
  onSkipToFreeRoam,
}) => {
  const [step, setStep] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [progressPct, setProgressPct] = useState<number>(0);

  const currentChapter = STORY_CHAPTERS[step] || STORY_CHAPTERS[0];
  const isFinalStep = step === STORY_CHAPTERS.length - 1;

  useEffect(() => {
    setProgressPct(0);
    if (!autoPlay || isFinalStep) return;

    const interval = setInterval(() => {
      setProgressPct((prev) => {
        if (prev >= 100) {
          setStep((s) => Math.min(STORY_CHAPTERS.length - 1, s + 1));
          return 0;
        }
        return prev + 1.25; // ~8 seconds per chapter
      });
    }, 100);

    return () => clearInterval(interval);
  }, [step, autoPlay, isFinalStep]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white select-none overflow-hidden">
      {/* Background Cinematic Keyframe with Subtle Scale Motion */}
      <div className="absolute inset-0 overflow-hidden bg-slate-950">
        <img
          key={currentChapter.id}
          src={currentChapter.imageSrc}
          alt={currentChapter.chapterTitle}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-70 scale-105 transition-transform duration-1000 ease-out"
        />
        {/* Measured Contrast Scrims for WCAG AA legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
      </div>

      {/* Top Widescreen Cinema Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 sm:px-12 py-5 bg-black/75 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-400" />
          <span className="font-display text-sm sm:text-base font-bold tracking-wide text-white">
            Apex Association · Driver Origin Prologue
          </span>
          <span className="hidden md:inline text-xs font-mono text-slate-400">
            · {currentChapter.telemetryNote}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoPlay((prev) => !prev)}
            className="px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Auto-Advance: {autoPlay ? 'ON' : 'PAUSED'}
          </button>
          <button
            type="button"
            onClick={onSkipToFreeRoam}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/15 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FastForward className="w-3.5 h-3.5" />
            Skip to Free Roam
          </button>
          <button
            type="button"
            onClick={onSkipToFreeRoam}
            title="Close Cutscene"
            aria-label="Close Cutscene"
            className="w-9 h-9 rounded-full bg-slate-900/90 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center shadow-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Story Narrative Frame */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 sm:px-12 pb-8 max-w-6xl w-full mx-auto">
        <div className="max-w-3xl space-y-4">
          {/* Chapter Act Kicker */}
          <div className="text-xs font-mono font-semibold text-amber-400 tracking-wider">
            {currentChapter.yearLabel} · {currentChapter.speaker}
          </div>

          {/* Chapter Headline */}
          <h1
            className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            {currentChapter.chapterTitle}
          </h1>

          {/* Primary Narrative Body Prose */}
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
            {currentChapter.narrative}
          </p>

          {/* Character Quote */}
          <blockquote className="pl-4 border-l-2 border-amber-400 text-xs sm:text-sm italic text-amber-200/90 max-w-xl">
            {currentChapter.subQuote}
          </blockquote>

          {/* Final Chapter: Official Apex Association License Sign-In Card */}
          {isFinalStep && (
            <div className="mt-4 p-4 sm:p-5 bg-slate-950/85 border border-amber-400/50 rounded-xl max-w-xl space-y-3 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-amber-400">
                <span>APEX ASSOCIATION OFFICIAL DRIVER CONTRACT</span>
                <span>CLASS S1 PROVING VEHICLE ASSIGNED</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-slate-400 block mb-1">
                    Sign Driver License Callsign
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => onChangeDriverName(e.target.value)}
                    maxLength={22}
                    className="w-full px-3 py-2 text-xs font-mono bg-black/70 border border-white/20 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    placeholder="Enter Driver Callsign..."
                  />
                </div>
                <button
                  type="button"
                  onClick={onStartTutorialRace}
                  className="sm:mt-5 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Begin Tutorial Race
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Widescreen Cinema Bar: Chapter Progress & Controls */}
      <div className="relative z-10 px-6 sm:px-12 py-5 bg-black/85 border-t border-white/10 backdrop-blur-md">
        <div className="max-w-6xl w-full mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* 4 Chapter Timeline Indicators */}
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            {STORY_CHAPTERS.map((chap, idx) => {
              const isCurrent = idx === step;
              const isDone = idx < step;
              return (
                <button
                  key={chap.id}
                  type="button"
                  onClick={() => {
                    setAutoPlay(false);
                    setStep(idx);
                  }}
                  className="flex-1 text-left space-y-1.5 group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={
                        isCurrent
                          ? 'text-amber-400 font-semibold'
                          : isDone
                          ? 'text-slate-300'
                          : 'text-slate-500'
                      }
                    >
                      Act 0{idx + 1}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-100"
                      style={{
                        width: isDone ? '100%' : isCurrent ? `${isFinalStep ? 100 : progressPct}%` : '0%',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chapter Navigation & Direct Launch Tutorial Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => {
                setAutoPlay(false);
                setStep((s) => Math.max(0, s - 1));
              }}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {!isFinalStep ? (
              <button
                type="button"
                onClick={() => {
                  setAutoPlay(false);
                  setStep((s) => Math.min(STORY_CHAPTERS.length - 1, s + 1));
                }}
                className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Next Chapter
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={onStartTutorialRace}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Tutorial Race Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
