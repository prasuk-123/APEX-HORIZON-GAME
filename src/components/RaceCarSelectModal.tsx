import React, { useMemo, useState } from 'react';
import {
  DynoBenchmark,
  PIClass,
  VehicleSpec,
  VehicleTune,
  WorldRaceEvent,
} from '../types/game';
import { VEHICLES } from '../data/vehicles';
import { computeDynoBenchmark } from '../physics/vehiclePhysics';
import { FrontCarIllustration } from './AutoshowBuySellModal';
import {
  Car,
  Check,
  Flag,
  Gauge,
  Play,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';

interface RaceCarSelectModalProps {
  race: WorldRaceEvent;
  ownedVehicleIds: string[];
  activeVehicleId: string;
  customTunesByVehicle: Record<string, VehicleTune>;
  onConfirmRaceWithCar: (race: WorldRaceEvent, chosenSpec: VehicleSpec) => void;
  onClose: () => void;
}

interface OwnedCarEntry {
  spec: VehicleSpec;
  tune: VehicleTune;
  bench: DynoBenchmark;
  isRecommended: boolean;
  suitabilityReason: string;
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
 * Evaluates whether an owned car (with its current custom tune & benchmark)
 * is suitable / recommended for the selected WorldRaceEvent.
 */
export function evaluateCarSuitabilityForRace(
  spec: VehicleSpec,
  tune: VehicleTune,
  bench: DynoBenchmark,
  race: WorldRaceEvent
): { isRecommended: boolean; reason: string } {
  const catLower = (spec.category || '').toLowerCase();
  const isOffroadChassis =
    spec.bodyStyle === 'baja_truck' ||
    spec.bodyStyle === 'suv_4x4' ||
    spec.bodyStyle === 'heavy_truck' ||
    catLower.includes('truck') ||
    catLower.includes('4x4') ||
    catLower.includes('off-road') ||
    catLower.includes('rally') ||
    catLower.includes('suv');
  const hasRallySetup =
    tune.tireCompound === 'RallyGravel' ||
    (tune.rideHeightMm >= 165 && tune.drivetrain === 'AWD');

  // 1. Off-Road Rally Discipline: requires off-road/rally chassis or rally tires/suspension
  if (race.discipline === 'Off-Road Rally') {
    if (isOffroadChassis || hasRallySetup) {
      return {
        isRecommended: true,
        reason: isOffroadChassis
          ? 'Off-Road / Rally Chassis'
          : 'Rally Gravel Tire & High-Clearance Build',
      };
    }
    return { isRecommended: false, reason: '' };
  }

  // 2. Touge Drift Discipline: requires drift tire compound or RWD oversteer/drift-spec car matching class
  if (race.discipline === 'Touge Drift') {
    const isDriftSpec =
      tune.tireCompound === 'DriftCompound' ||
      bench.handlingBalanceLabel === 'Drift Angle Spec' ||
      (tune.drivetrain === 'RWD' &&
        (bench.handlingBalanceLabel === 'Sport Oversteer' ||
          spec.bodyStyle === 'jdm_coupe' ||
          spec.bodyStyle === 'muscle_classic') &&
        bench.piClass === race.recommendedClass);
    if (isDriftSpec) {
      return {
        isRecommended: true,
        reason:
          tune.tireCompound === 'DriftCompound'
            ? 'Drift Compound Setup'
            : `${bench.piClass}-Class RWD Touge Spec`,
      };
    }
    return { isRecommended: false, reason: '' };
  }

  // 3. Drag Showdown Discipline: requires matching recommended class (or X/S2) with rapid 0-100 launch
  if (race.discipline === 'Drag Showdown') {
    const isDragMonster =
      !isOffroadChassis &&
      (bench.piClass === race.recommendedClass || bench.piClass === 'X') &&
      (bench.zeroTo100KmhSec <= 2.95 || bench.peakPowerHP >= 700);
    if (isDragMonster) {
      return {
        isRecommended: true,
        reason: `${bench.zeroTo100KmhSec.toFixed(2)}s 0–100 Launch · ${bench.peakPowerHP} HP`,
      };
    }
    return { isRecommended: false, reason: '' };
  }

  // 4. Alpine Glacier Snow/Ice Races: requires AWD or Rally/Snow tires matching recommended class
  if (race.biome === 'Alpine Glacier') {
    const isSnowSuitable =
      (tune.drivetrain === 'AWD' || tune.tireCompound === 'RallyGravel') &&
      bench.piClass === race.recommendedClass;
    if (isSnowSuitable) {
      return {
        isRecommended: true,
        reason: `Alpine AWD / Snow Grip · Class ${bench.piClass}`,
      };
    }
    return { isRecommended: false, reason: '' };
  }

  // 5. Asphalt Circuit Race, Sprint Race, Circuit Sprint, Tutorial Qualifier, Multiplayer Grand Prix:
  // Suitable if it is an asphalt-focused car matching the race's recommended PI Class
  if (!isOffroadChassis && bench.piClass === race.recommendedClass) {
    return {
      isRecommended: true,
      reason: `Matches Recommended ${race.recommendedClass} Class · ${race.discipline}`,
    };
  }

  return { isRecommended: false, reason: '' };
}

export const RaceCarSelectModal: React.FC<RaceCarSelectModalProps> = ({
  race,
  ownedVehicleIds,
  activeVehicleId,
  customTunesByVehicle,
  onConfirmRaceWithCar,
  onClose,
}) => {
  // Compute all owned cars and whether each is recommended for this race
  const ownedCarEntries = useMemo<OwnedCarEntry[]>(() => {
    const ownedSet = new Set(ownedVehicleIds);
    const list = VEHICLES.filter((v) => ownedSet.has(v.id));
    // Fallback to activeVehicleId if ownedSet is somehow empty
    const effectiveList =
      list.length > 0
        ? list
        : VEHICLES.filter((v) => v.id === activeVehicleId);

    return effectiveList.map((spec) => {
      const tune = customTunesByVehicle[spec.id] || spec.defaultTune;
      const bench = computeDynoBenchmark(spec, tune);
      const { isRecommended, reason } = evaluateCarSuitabilityForRace(
        spec,
        tune,
        bench,
        race
      );
      return {
        spec,
        tune,
        bench,
        isRecommended,
        suitabilityReason: reason,
      };
    });
  }, [ownedVehicleIds, activeVehicleId, customTunesByVehicle, race]);

  const recommendedCarEntries = useMemo(
    () => ownedCarEntries.filter((entry) => entry.isRecommended),
    [ownedCarEntries]
  );

  // Category tab: 'all_owned' or 'recommended'
  const [activeCategory, setActiveCategory] = useState<'all_owned' | 'recommended'>('all_owned');

  // Selected car ID to race with (defaults to current active car if owned, otherwise first owned car)
  const [selectedCarId, setSelectedCarId] = useState<string>(() => {
    if (ownedCarEntries.some((e) => e.spec.id === activeVehicleId)) {
      return activeVehicleId;
    }
    return ownedCarEntries[0]?.spec.id || activeVehicleId;
  });

  const selectedEntry = useMemo(
    () =>
      ownedCarEntries.find((e) => e.spec.id === selectedCarId) ||
      ownedCarEntries[0],
    [ownedCarEntries, selectedCarId]
  );

  const displayedEntries =
    activeCategory === 'recommended' ? recommendedCarEntries : ownedCarEntries;

  const handleStartWithSelected = () => {
    if (!selectedEntry) return;
    onConfirmRaceWithCar(race, selectedEntry.spec);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/92 backdrop-blur-xl p-2 sm:p-4 select-none overflow-hidden animate-window-enter">
      <div className="relative max-w-6xl w-full max-h-[94vh] bg-slate-900/95 border-2 border-amber-400/70 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-menu-card-enter">
        {/* COMPACT SINGLE-ROW TOP HEADER: RACE DETAILS & CLOSE BUTTON */}
        <header className="px-4 sm:px-5 py-2 bg-slate-950/90 border-b border-white/15 flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Flag className="w-3 h-3" />
              SELECT CAR
            </span>
            <h2 className="font-display text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
              {race.name}
            </h2>
            <span className="text-[11px] font-mono text-pink-400 font-bold hidden sm:inline">
              · {race.biome} · {race.discipline}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-[10px] font-mono text-amber-300 font-bold shrink-0">
              Class {race.recommendedClass}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Cancel & Close Car Selection"
            aria-label="Cancel & Close Car Selection"
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 hover:border-red-300 flex items-center justify-center shadow transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* COMPACT CATEGORY TABS & AI DIFFICULTY BAR */}
        <div className="px-4 sm:px-5 py-1.5 bg-slate-950/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory('all_owned')}
              className={`px-3 py-1 rounded-lg font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                activeCategory === 'all_owned'
                  ? 'bg-amber-400 text-slate-950 border-white shadow'
                  : 'bg-slate-900/90 text-slate-300 border-white/15 hover:border-amber-400/50 hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>All Owned</span>
              <span
                className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-black ${
                  activeCategory === 'all_owned'
                    ? 'bg-slate-950 text-amber-300'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {ownedCarEntries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('recommended')}
              className={`px-3 py-1 rounded-lg font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                activeCategory === 'recommended'
                  ? 'bg-emerald-400 text-slate-950 border-white shadow'
                  : 'bg-slate-900/90 text-slate-300 border-white/15 hover:border-emerald-400/50 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended</span>
              <span
                className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-black ${
                  activeCategory === 'recommended'
                    ? 'bg-slate-950 text-emerald-300'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {recommendedCarEntries.length}
              </span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400 hidden md:inline">
            Click a car to select, or click <span className="text-amber-300 font-bold">Race With This Car</span> to launch immediately
          </span>
        </div>

        {/* MAIN SCROLLABLE CAR GRID OR EMPTY RECOMMENDED STATE */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {displayedEntries.length === 0 ? (
            <div className="h-64 rounded-2xl bg-slate-950/75 border-2 border-dashed border-white/15 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-extrabold text-white uppercase tracking-wide">
                  No Recommended Cars Owned For This Race
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                  None of your currently owned cars match the recommended suitability for{' '}
                  <span className="text-amber-300 font-semibold">
                    {race.name} ({race.discipline} · Class {race.recommendedClass})
                  </span>
                  . Switch to <span className="text-white font-semibold">All Owned Cars</span> to pick any car from your garage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategory('all_owned')}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors"
              >
                View All Owned Cars ({ownedCarEntries.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedEntries.map((entry) => {
                const { spec, tune, bench, isRecommended, suitabilityReason } = entry;
                const isSelected = selectedEntry?.spec.id === spec.id;

                return (
                  <div
                    key={spec.id}
                    onClick={() => setSelectedCarId(spec.id)}
                    onDoubleClick={() => onConfirmRaceWithCar(race, spec)}
                    className={`group relative rounded-2xl p-4 flex flex-col justify-between border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
                        : 'bg-slate-950/85 hover:bg-slate-900 border-white/15 hover:border-white/35'
                    }`}
                  >
                    {/* Top Row: Manufacturer + Year + PI Class Badge */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold truncate">
                            {spec.manufacturer} · {spec.year}
                          </div>
                          <h3 className="font-display text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                            {spec.name}
                          </h3>
                        </div>

                        <div className="flex items-center rounded-lg overflow-hidden border border-white/25 shrink-0 shadow">
                          <span
                            className={`px-2 py-0.5 font-display text-xs font-black ${getPiClassBadgeColor(
                              bench.piClass
                            )}`}
                          >
                            {bench.piClass}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-950 font-mono text-xs font-extrabold text-white tabular-nums">
                            {bench.piScore}
                          </span>
                        </div>
                      </div>

                      {/* Recommended Badge if suitable */}
                      <div className="flex flex-wrap items-center gap-1.5 min-h-[22px]">
                        {isRecommended && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>RECOMMENDED · {suitabilityReason}</span>
                          </span>
                        )}
                        {spec.id === activeVehicleId && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-300">
                            CURRENT CAR
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Studio Front Car Illustration */}
                    <div className="my-2 h-28 w-full flex items-center justify-center bg-gradient-to-b from-slate-900/40 to-slate-950/80 rounded-xl border border-white/5 px-3 py-1">
                      <FrontCarIllustration
                        spec={spec}
                        paintHex={tune.paintHex}
                        rimHex={tune.rimHex}
                      />
                    </div>

                    {/* Performance Specs Grid */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px] bg-slate-900/90 border border-white/10 rounded-xl p-2">
                        <div>
                          <div className="text-slate-400 text-[9px]">TOP SPD</div>
                          <div className="font-bold text-white tabular-nums">
                            {bench.topSpeedKmh} <span className="text-[8px] text-slate-400">KM/H</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[9px]">0–100</div>
                          <div className="font-bold text-cyan-300 tabular-nums">
                            {bench.zeroTo100KmhSec.toFixed(2)}s
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[9px]">POWER</div>
                          <div className="font-bold text-amber-300 tabular-nums">
                            {bench.peakPowerHP} HP
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[9px]">DRIVE</div>
                          <div className="font-bold text-emerald-300">
                            {tune.drivetrain}
                          </div>
                        </div>
                      </div>

                      {/* Select / Start Race Action Button on Card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmRaceWithCar(race, spec);
                        }}
                        className={`w-full py-2 px-3 rounded-xl font-display text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg'
                            : 'bg-white/10 hover:bg-amber-400 text-white hover:text-slate-950 border border-white/15'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Race With This Car</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER: SELECTED CAR SUMMARY & PRIMARY START RACE BUTTON */}
        <footer className="px-5 sm:px-7 py-3.5 bg-slate-950/95 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 shrink-0">
          {selectedEntry ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Selected Race Vehicle
                </div>
                <div className="font-display text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  <span>
                    {selectedEntry.spec.manufacturer} {selectedEntry.spec.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-black ${getPiClassBadgeColor(
                      selectedEntry.bench.piClass
                    )}`}
                  >
                    {selectedEntry.bench.piClass} {selectedEntry.bench.piScore}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-display font-bold uppercase tracking-wider text-slate-200 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedEntry}
              onClick={handleStartWithSelected}
              className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-display text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.4)] cursor-pointer transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Start Race Now</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
