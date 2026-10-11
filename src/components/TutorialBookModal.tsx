import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flag,
  Gamepad2,
  Sparkles,
  Store,
  Trophy,
  Wrench,
  X,
} from 'lucide-react';

interface TutorialBookModalProps {
  driverName: string;
  onClose: () => void;
}

interface TutorialChapter {
  id: string;
  chapterNumber: number;
  shortTitle: string;
  fullTitle: string;
  subtitle: string;
  accentColor: string;
  badgeBg: string;
  icon: React.FC<{ className?: string }>;
  sections: {
    heading: string;
    badge?: string;
    items: {
      label: string;
      detail: string;
    }[];
  }[];
  proTip: string;
}

const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: 'controls',
    chapterNumber: 1,
    shortTitle: '1. Controls & POV',
    fullTitle: 'Driving Controls, Nitrous & Camera POVs',
    subtitle: 'Master keyboard, touch steering modes, burnouts, and cockpit camera views.',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-400/20 border-amber-400/50 text-amber-300',
    icon: Gamepad2,
    sections: [
      {
        heading: 'Keyboard Driving Controls',
        badge: 'DESKTOP',
        items: [
          {
            label: 'W / S or ↑ / ↓ Arrows',
            detail: 'Smooth progressive Throttle (Accelerate) and Carbon-Ceramic Braking / Reverse.',
          },
          {
            label: 'A / D or ← / → Arrows',
            detail: 'Speed-sensitive front wheel steering with automatic counter-steer assist.',
          },
          {
            label: 'SPACEBAR (Handbrake)',
            detail: 'Locks the rear axle to initiate high-angle drifts through corners and hairpins.',
          },
          {
            label: 'LEFT SHIFT (Nitrous / NOS)',
            detail: 'Engages twin-bottle Nitrous boost for explosive acceleration. Recharges automatically when released.',
          },
          {
            label: 'HOLD W + S (Stationary Burnout)',
            detail: 'Hold throttle and brake together while stopped to spin the rear tires and build tire smoke.',
          },
          {
            label: 'C Key / POV Button',
            detail: 'Cycle between Far Chase, Close Chase, Hood Cam, and 1st-Person Inside-Car Cockpit POV.',
          },
          {
            label: 'E / ENTER & M Key',
            detail: 'Press E or Enter at any glowing race gate to launch the event. Press M to open the World Map.',
          },
        ],
      },
      {
        heading: 'Mobile & Touch Steering Modes',
        badge: 'TOUCH / MOBILE',
        items: [
          {
            label: '3 Steering Modes in Settings',
            detail: 'Switch anytime between 1. Virtual Steering Wheel (±90° lock), 2. Left/Right Buttons, or 3. Tilt/Slide.',
          },
          {
            label: 'Steering Sensitivity Slider',
            detail: 'Fine-tune steering response from 30% (Smooth) to 110% (Quick) inside the top-left Settings menu.',
          },
          {
            label: 'Right-Side Action Pedals',
            detail: 'Dedicated multi-touch GAS, BRAKE/REV, HB (Handbrake), and NOS boost buttons.',
          },
        ],
      },
    ],
    proTip:
      'Use Inside-Car Cockpit POV (Key C) to see your live steering wheel, digital RPM cluster, and windshield rain/snow effects in first person.',
  },
  {
    id: 'world_map',
    chapterNumber: 2,
    shortTitle: '2. World & Weather',
    fullTitle: 'Open World Biomes, GPS Map & Dynamic Weather',
    subtitle: 'Navigate 7 interconnected biomes, elevated flyovers, and automatic weather cycles.',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-400/20 border-cyan-400/50 text-cyan-300',
    icon: Compass,
    sections: [
      {
        heading: '7 Open-World Biomes & Landmarks',
        badge: '12 KM × 12 KM WORLD',
        items: [
          {
            label: 'Paris Metropolis Center',
            detail: 'Drive through the Arc de Triomphe, Eiffel Tower lawn, Louvre Glass Pyramid, Sacré-Cœur, and ornate Seine River bridges.',
          },
          {
            label: 'Surrounding Horizon Biomes',
            detail: 'Explore Alpine Glacier (North), Autobahn Megaport (East), Mediterranean Riviera (SE), Lavender Highlands (South), Sahara Red Canyon (SW), Emerald Rainforest (West), and Volcanic Caldera (NW).',
          },
          {
            label: 'Elevated Highway Flyovers',
            detail: '8 multi-level highway viaducts let you soar above outer intersections at 400+ km/h.',
          },
        ],
      },
      {
        heading: 'Satellite World Map, GPS & Automatic Weather',
        badge: 'NAVIGATION',
        items: [
          {
            label: 'Interactive Mini-Map & Full Map',
            detail: 'Click the top-right circular Mini-Map to open the full World Map. Click any race icon to set a GPS route or Teleport & Race immediately.',
          },
          {
            label: 'Automatic Weather & 24h Solar Cycle',
            detail: 'Weather transitions smoothly between Sunny, Cloudy, Rainy, Foggy, and Snowy alongside a full Dawn, Day, Sunset, and Night cycle.',
          },
          {
            label: 'Real Surface & Weather Physics',
            detail: 'Rain and snow reduce asphalt traction, while off-road sand, mud, and gravel favor high-clearance 4×4 trucks and rally tires.',
          },
        ],
      },
    ],
    proTip:
      'Look for glowing golden "H" Token Coins along roads and intersections—drive through them to collect Horizon Tokens for the Horizon Shop!',
  },
  {
    id: 'racing',
    chapterNumber: 3,
    shortTitle: '3. Races & AI Bots',
    fullTitle: 'Race Disciplines, Pathways, AI Drivatars & Multiplayer',
    subtitle: 'Compete in 90+ Circuit, Sprint, Dirt Rally, and Multiplayer Grand Prix events.',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-400/20 border-emerald-400/50 text-emerald-300',
    icon: Flag,
    sections: [
      {
        heading: 'Race Disciplines & Designated Pathways',
        badge: '90+ EVENTS',
        items: [
          {
            label: 'Circuit, Sprint & Off-Road Dirt Races',
            detail: 'Circuit Races run 2 complete laps; Sprint Races are point-to-point showdowns; Off-Road Rally races test dirt and sand traction.',
          },
          {
            label: 'Clear Neon Pathways & Checkpoints',
            detail: 'Every active race locks in a wide obstacle-free pathway with glowing chevrons on the road and numbered Checkpoint Gates.',
          },
          {
            label: 'Pre-Race Car Selection',
            detail: 'Before every race, pick from All Owned Cars or filter by Recommended Cars tailored to that race’s surface and PI Class.',
          },
        ],
      },
      {
        heading: 'Automatic AI Difficulty, Rewards & Multiplayer',
        badge: 'COMPETITION',
        items: [
          {
            label: 'Adaptive Apex Drivatars',
            detail: '5 AI Drivatars automatically scale to your car’s Performance Index (Clubman, Skilled, Expert, Pro, and Unbeatable Apex).',
          },
          {
            label: 'Race Credits & XP Payouts',
            detail: 'Earn 15,000 – 70,000 CR in solo races (20,000 – 100,000 CR in Multiplayer) plus Race XP based on finish position, difficulty, and distance.',
          },
          {
            label: 'Multiplayer Grand Prix & Convoys',
            detail: 'Join live online players in the Multiplayer drawer or host head-to-head Multiplayer Grand Prix races with zero AI bots.',
          },
        ],
      },
    ],
    proTip:
      'In Off-Road Dirt Rally events, select a Baja Truck, 4×4 SUV, or a car equipped with Rally Gravel tires so you maintain 100% power and grip on sand and dirt.',
  },
  {
    id: 'garage_tuning',
    chapterNumber: 4,
    shortTitle: '4. Cars & Tuning',
    fullTitle: 'Autoshow Buy & Sell, My Garage & Performance Tuning',
    subtitle: 'Collect 260+ iconic vehicles and build custom X-Class monsters in the Upgrade Shop.',
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-400/20 border-rose-400/50 text-rose-300',
    icon: Wrench,
    sections: [
      {
        heading: '1. Buy & Sell Cars + 2. My Garage',
        badge: '260+ VEHICLES',
        items: [
          {
            label: 'Starter Vehicles',
            detail: 'You begin your career with 2 starter vehicles (a Street Sedan and a Baja Trophy Truck). Starter cars are permanent and cannot be sold.',
          },
          {
            label: 'Autoshow Buy & Sell',
            detail: 'Browse all 260+ cars alphabetically by brand (50,000 CR to 8,000,000 CR). Any non-starter car you own can be sold for 80% of its market value.',
          },
          {
            label: 'My Garage Quick-Switch',
            detail: 'Open My Garage from the Main Menu to inspect your owned collection and click Drive Now to switch vehicles on the spot.',
          },
        ],
      },
      {
        heading: '3. Modification & Tuning Shop',
        badge: '9 UPGRADE CATEGORIES',
        items: [
          {
            label: '9 Forza Upgrade Categories',
            detail: 'Upgrade Engine (Intake, Exhaust, Camshaft, Pistons), Braking, Suspension, Tires, Aero & Back Wing, Wheel Drive (RWD/AWD/FWD), Turbo/Supercharger, Gearbox, and Weight Reduction.',
          },
          {
            label: 'Live 3D Structure & Dyno Preview',
            detail: 'Click any part to inspect its isolated Speed, Grip, Accel, Braking, HP, and PI rating gains—and watch wings, splitters, intercoolers, calipers, and ride height update live on your car.',
          },
          {
            label: 'Direct Install or Upgrade Cart',
            detail: 'Click Buy & Install Now for instant fitting with telemetry feedback, or combine multiple parts in your Cart to install a full build at once.',
          },
        ],
      },
    ],
    proTip:
      'Converting a high-horsepower RWD hypercar to AWD and fitting Semi-Slick Race tires dramatically cuts your 0–100 km/h launch time.',
  },
  {
    id: 'progression_shop',
    chapterNumber: 5,
    shortTitle: '5. XP, Spins & Shop',
    fullTitle: 'Driver Levels, Wheelspins, Horizon Shop & Auto-Save',
    subtitle: 'Climb from Level 1 to 100, spin for hypercars, and spend Horizon Tokens.',
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-400/20 border-purple-400/50 text-purple-300',
    icon: Sparkles,
    sections: [
      {
        heading: '4. Wheelspins & 5. Player Profile (Levels 1 – 100)',
        badge: 'PROGRESSION',
        items: [
          {
            label: 'Level-Up Wheelspin Milestones',
            detail: 'Every race awards XP toward Level 100 (each level requires +40% more XP). Normal level-ups award +1 Wheelspin, and every 5th level (5, 10, 15...) awards +1 Super Wheelspin!',
          },
          {
            label: 'Wheelspins & Super Wheelspins',
            detail: 'Spin 1-reel Wheelspins or 3-reel Super Wheelspins to win up to 500,000 CR and rare hypercars. Duplicate cars won are automatically converted into 80% cash!',
          },
          {
            label: 'Editable Driver Username',
            detail: 'Open 5. Player’s Profile from the Main Menu anytime to change your Driver Username and view your career milestones.',
          },
        ],
      },
      {
        heading: '6. Horizon Shop & Save Backups',
        badge: 'TOKENS & SAVES',
        items: [
          {
            label: 'Horizon Shop (Unlimited Spins)',
            detail: 'Spend the golden "H" Tokens you collect on the map to buy Regular Wheelspins (8 H Tokens) and Super Wheelspins (20 H Tokens) with no daily limit.',
          },
          {
            label: 'Automatic Browser Save & JSON Backup',
            detail: 'Your credits, owned cars, custom tunes, XP level, and completed races auto-save automatically. You can also export or restore a .json backup file in Settings.',
          },
        ],
      },
    ],
    proTip:
      'You can reopen this Tutorial Book anytime by clicking the Gear Settings button at the top-left of your driving screen!',
  },
];

export const TutorialBookModal: React.FC<TutorialBookModalProps> = ({
  driverName,
  onClose,
}) => {
  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(0);
  const currentChapter = TUTORIAL_CHAPTERS[activeChapterIdx] || TUTORIAL_CHAPTERS[0];
  const ChapterIcon = currentChapter.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 backdrop-blur-xl p-2.5 sm:p-5 select-none overflow-y-auto animate-window-enter pointer-events-auto">
      <div className="relative max-w-5xl w-full max-h-[93vh] bg-slate-900/95 border-2 border-amber-400/80 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden my-auto animate-menu-card-enter">
        {/* TOP BOOK HEADER */}
        <header className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-white/15 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400/20 border border-amber-400/60 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-400">
                  OFFICIAL DRIVER HANDBOOK &amp; TUTORIAL BOOK
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300">
                  Welcome, {driverName}
                </span>
              </div>
              <h2 className="font-display text-base sm:text-xl font-extrabold text-white tracking-tight truncate">
                Apex Horizons Complete Game Guide
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close Tutorial Book"
            aria-label="Close Tutorial Book"
            className="w-9 h-9 rounded-full bg-slate-950 hover:bg-red-500 text-slate-300 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* CHAPTER TABS RIBBON */}
        <div className="px-4 sm:px-6 py-2 bg-slate-950/80 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
          {TUTORIAL_CHAPTERS.map((chap, idx) => {
            const Icon = chap.icon;
            const isActive = idx === activeChapterIdx;
            return (
              <button
                key={chap.id}
                type="button"
                onClick={() => setActiveChapterIdx(idx)}
                className={`px-3 py-1.5 rounded-xl font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 border-white shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-amber-400/50 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{chap.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN SCROLLABLE BOOK PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Chapter Title Banner */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-white/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0">
                <ChapterIcon className={`w-6 h-6 ${currentChapter.accentColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-black uppercase tracking-widest ${currentChapter.badgeBg}`}
                  >
                    CHAPTER {currentChapter.chapterNumber} OF {TUTORIAL_CHAPTERS.length}
                  </span>
                </div>
                <h3 className="font-display text-lg sm:text-xl font-extrabold text-white mt-0.5">
                  {currentChapter.fullTitle}
                </h3>
                <p className="text-xs text-slate-400">{currentChapter.subtitle}</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
              <span>Page</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/15 text-amber-300 font-bold">
                {activeChapterIdx + 1} / {TUTORIAL_CHAPTERS.length}
              </span>
            </div>
          </div>

          {/* Two-Column Open-Book Spread for the Chapter's Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentChapter.sections.map((sec) => (
              <div
                key={sec.heading}
                className="rounded-2xl bg-slate-950/80 border border-white/12 p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <h4 className="font-display text-sm sm:text-base font-extrabold text-white uppercase tracking-wide">
                      {sec.heading}
                    </h4>
                    {sec.badge && (
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono font-bold text-amber-300 uppercase">
                        {sec.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {sec.items.map((item) => (
                      <div
                        key={item.label}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-white/8 space-y-0.5"
                      >
                        <div className="font-display text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed pl-5">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Horizon Pro Tip Callout Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-cyan-500/15 border border-amber-400/40 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-xs sm:text-sm text-slate-200 leading-snug">
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                HORIZON FESTIVAL PRO TIP
              </span>
              {currentChapter.proTip}
            </div>
          </div>
        </div>

        {/* PINNED BOTTOM FOOTER: PAGE NAVIGATION & START DRIVING BUTTON */}
        <footer className="px-4 sm:px-6 py-3 bg-slate-950/95 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeChapterIdx === 0}
              onClick={() => setActiveChapterIdx((i) => Math.max(0, i - 1))}
              className={`px-3.5 py-2 rounded-xl font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1 border transition-all ${
                activeChapterIdx === 0
                  ? 'bg-slate-900/50 text-slate-600 border-white/5 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-white/20 cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Page</span>
            </button>

            <button
              type="button"
              disabled={activeChapterIdx === TUTORIAL_CHAPTERS.length - 1}
              onClick={() =>
                setActiveChapterIdx((i) => Math.min(TUTORIAL_CHAPTERS.length - 1, i + 1))
              }
              className={`px-3.5 py-2 rounded-xl font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1 border transition-all ${
                activeChapterIdx === TUTORIAL_CHAPTERS.length - 1
                  ? 'bg-slate-900/50 text-slate-600 border-white/5 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/20 text-amber-300 border-amber-400/40 cursor-pointer'
              }`}
            >
              <span>Next Page</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
              Accessible anytime via <strong className="text-amber-300">Settings (⚙)</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs sm:text-sm font-black uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
            >
              Got It — Start Driving
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
