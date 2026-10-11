import React, { useMemo, useState } from 'react';
import { PIClass, VehicleSpec, VehicleTune } from '../types/game';
import { getShortCarMainName, VEHICLES } from '../data/vehicles';
import { computeDynoBenchmark } from '../physics/vehiclePhysics';
import { Check, Search, X } from 'lucide-react';

interface VehicleRosterModalProps {
  activeVehicleId: string;
  customTunesByVehicle: Record<string, VehicleTune>;
  onSelectVehicle: (spec: VehicleSpec) => void;
  onClose: () => void;
}

const CATEGORIES = [
  'All Categories',
  'Normal & Daily Cars',
  'Trucks & Heavy Rigs',
  'SUVs & 4x4',
  'JDM Street Legend',
  'Muscle & Classic Icons',
  'Modern Supercar',
  'Track Toy GT',
  'Hypercars & Prototypes',
];

const POPULAR_BRANDS = [
  'All Brands',
  'BMW',
  'Lamborghini',
  'Ferrari',
  'Pagani',
  'Koenigsegg',
  'Bugatti',
  'McLaren',
];

const PI_CLASSES: ('All' | PIClass)[] = ['All', 'D', 'C', 'B', 'A', 'S1', 'S2', 'X'];

export const VehicleRosterModal: React.FC<VehicleRosterModalProps> = ({
  activeVehicleId,
  customTunesByVehicle,
  onSelectVehicle,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('All Brands');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedPiClass, setSelectedPiClass] = useState<'All' | PIClass>('All');
  const [visibleCount, setVisibleCount] = useState<number>(30);

  // Precompute benchmarks for filtering
  const catalogWithBenchmarks = useMemo(() => {
    return VEHICLES.map((veh) => {
      const tune = customTunesByVehicle[veh.id] || veh.defaultTune;
      const bench = computeDynoBenchmark(veh, tune);
      return { veh, tune, bench };
    });
  }, [customTunesByVehicle]);

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogWithBenchmarks.filter(({ veh, bench }) => {
      if (selectedBrand !== 'All Brands' && veh.manufacturer.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }
      if (selectedCategory !== 'All Categories' && veh.category !== selectedCategory) {
        return false;
      }
      if (selectedPiClass !== 'All' && bench.piClass !== selectedPiClass) {
        return false;
      }
      if (
        q &&
        !veh.name.toLowerCase().includes(q) &&
        !veh.manufacturer.toLowerCase().includes(q) &&
        !veh.engineDescription.toLowerCase().includes(q) &&
        !veh.category.toLowerCase().includes(q) &&
        !(veh.signatureMechanic && veh.signatureMechanic.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [catalogWithBenchmarks, selectedBrand, selectedCategory, selectedPiClass, searchQuery]);

  const visibleSlice = filteredVehicles.slice(0, visibleCount);

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-950/95 backdrop-blur-xl overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl w-full mx-auto space-y-4">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
              Horizon Festival Vehicle Roster ({VEHICLES.length} Vehicles)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Featuring 50+ authentic IRL builds from BMW, Lamborghini, Ferrari, Pagani, Koenigsegg, Bugatti, and McLaren alongside JDM icons, GT cars, SUVs, and trucks.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Return to Free Roam
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close Vehicle Roster"
              aria-label="Close Vehicle Roster"
              className="w-9 h-9 rounded-full bg-slate-900 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center shadow-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & PI Class Filter Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(30);
              }}
              placeholder="Search BMW, Lamborghini, Ferrari, Pagani, Koenigsegg, Bugatti, McLaren..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-black/50 border border-white/15 rounded-xl text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* PI Class Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/10 rounded-xl overflow-x-auto">
            {PI_CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => {
                  setSelectedPiClass(cls);
                  setVisibleCount(30);
                }}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  selectedPiClass === cls
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {cls === 'All' ? 'All Classes' : `Class ${cls}`}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Marque Filter Bar */}
        <div className="flex items-center gap-1.5 pb-1 overflow-x-auto">
          {POPULAR_BRANDS.map((brand) => {
            const active = selectedBrand === brand;
            return (
              <button
                key={brand}
                type="button"
                onClick={() => {
                  setSelectedBrand(brand);
                  setVisibleCount(30);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                    : 'bg-slate-900/90 text-cyan-200 border-cyan-500/25 hover:border-cyan-400/60'
                }`}
              >
                {brand}
              </button>
            );
          })}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 pb-2 overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setVisibleCount(30);
                }}
                className={`px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold'
                    : 'bg-white/[0.03] text-slate-300 border-white/10 hover:border-white/25'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <div className="text-xs text-slate-400 font-mono">
          Showing {visibleSlice.length} of {filteredVehicles.length} matching vehicles
        </div>

        {/* Vehicle Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleSlice.map(({ veh, tune, bench }) => {
            const isSelected = veh.id === activeVehicleId;

            return (
              <div
                key={veh.id}
                className={`flex flex-col justify-between p-5 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-white/[0.07] border-amber-400'
                    : 'bg-white/[0.025] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Quiet 1-line unboxed text kicker */}
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                    <span className="truncate">
                      {veh.year} · {veh.manufacturer} · {veh.category}
                    </span>
                    <span className="text-amber-400 font-semibold shrink-0 ml-2">
                      Class {bench.piClass} · {bench.piScore}
                    </span>
                  </div>

                  {/* Primary Vehicle Title (Main Name Only) */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 border border-white/25"
                      style={{ backgroundColor: tune.paintHex }}
                    />
                    <h3 className="font-display text-base font-bold text-white tracking-tight truncate">
                      {getShortCarMainName(veh)}
                    </h3>
                  </div>

                  {/* Unboxed Engine & Drivetrain Metadata */}
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-1.5 font-mono tabular-nums">
                    <span>{tune.drivetrain}</span>
                    <span aria-hidden="true">·</span>
                    <span>{veh.engineDescription}</span>
                    <span aria-hidden="true">·</span>
                    <span>{bench.curbWeightKg.toLocaleString()} kg</span>
                  </div>

                  {veh.signatureMechanic && (
                    <div className="text-[11px] text-cyan-300/95 font-mono truncate">
                      IRL System: {veh.signatureMechanic}
                    </div>
                  )}

                  {/* Performance Telemetry Breakdown (IRL-Calibrated Acceleration, Braking & Top Speed) */}
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Output</span>
                      <span className="text-white font-semibold">{bench.peakPowerHP} HP</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">100–0 Brake</span>
                      <span className="text-rose-300 font-semibold">{bench.braking100To0M} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">0–100 km/h</span>
                      <span className="text-cyan-300 font-semibold">{bench.zeroTo100KmhSec} s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-sans">Top Speed</span>
                      <span className="text-amber-400 font-semibold">{bench.topSpeedKmh} km/h</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectVehicle(veh);
                      onClose();
                    }}
                    className={`min-h-[40px] w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Driving
                      </>
                    ) : (
                      'Drive Now'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Vehicles Button */}
        {visibleCount < filteredVehicles.length && (
          <div className="pt-4 pb-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 36)}
              className="min-h-[44px] px-6 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
            >
              Show More Vehicles ({filteredVehicles.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
