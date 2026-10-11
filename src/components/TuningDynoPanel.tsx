import React, { useState } from 'react';
import {
  AeroKitType,
  AspirationType,
  DrivetrainType,
  DynoBenchmark,
  PaintFinishType,
  SharedTunePreset,
  TireCompoundType,
  VehicleSpec,
  VehicleTune,
} from '../types/game';
import { PAINT_SWATCHES } from '../data/vehicles';
import { RotateCcw, Share2, Check, Sliders, Gauge, Wrench, Palette, Users, X } from 'lucide-react';

interface TuningDynoPanelProps {
  spec: VehicleSpec;
  tune: VehicleTune;
  benchmark: DynoBenchmark;
  sharedTunes: SharedTunePreset[];
  onChangeTune: (nextTune: VehicleTune) => void;
  onResetFactory: () => void;
  onPublishTune: (title: string, purpose: SharedTunePreset['purpose']) => void;
  onApplySharedTune: (preset: SharedTunePreset) => void;
  onClose: () => void;
}

type TuneTab = 'upgrades' | 'gearing' | 'suspension' | 'aero_diff' | 'paint' | 'presets';

export const TuningDynoPanel: React.FC<TuningDynoPanelProps> = ({
  spec,
  tune,
  benchmark,
  sharedTunes,
  onChangeTune,
  onResetFactory,
  onPublishTune,
  onApplySharedTune,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TuneTab>('upgrades');
  const [shareTitle, setShareTitle] = useState(`${spec.name.split(' ')[0]} Custom Spec`);
  const [sharePurpose, setSharePurpose] = useState<SharedTunePreset['purpose']>('Grip / Track');
  const [publishedToast, setPublishedToast] = useState(false);

  const updateField = <K extends keyof VehicleTune>(key: K, value: VehicleTune[K]) => {
    onChangeTune({
      ...tune,
      [key]: value,
    });
  };

  const updateGearRatio = (index: number, value: number) => {
    const nextGears = [...tune.gearRatios] as [number, number, number, number, number, number];
    nextGears[index] = value;
    updateField('gearRatios', nextGears);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTitle.trim()) return;
    onPublishTune(shareTitle.trim(), sharePurpose);
    setPublishedToast(true);
    setTimeout(() => setPublishedToast(false), 2500);
  };

  const vehiclePresets = sharedTunes.filter((t) => t.vehicleId === spec.id);
  const allOtherPresets = sharedTunes.filter((t) => t.vehicleId !== spec.id);

  const arcMax = 240;
  const piRatio = Math.min(1, Math.max(0.1, (benchmark.piScore - 300) / 700));
  const speedGaugeRatio = Math.min(1, Math.max(0.1, benchmark.topSpeedKmh / 440));

  return (
    <div className="fixed inset-0 z-30 flex flex-col lg:flex-row bg-slate-950/92 backdrop-blur-xl overflow-hidden">
      {/* Top-Right Little Cross (X) Button to Close Window */}
      <button
        type="button"
        onClick={onClose}
        title="Close Performance Tuning"
        aria-label="Close Performance Tuning"
        className="fixed top-3.5 right-3.5 z-50 w-9 h-9 rounded-full bg-slate-900/95 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center shadow-2xl transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Left / Center Configuration Column */}
      <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-white/10 bg-black/40">
          <div>
            <h2 className="font-display text-xl font-bold text-white tracking-tight">
              Performance Tuning &amp; Chassis Setup
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
              <span className="text-amber-400 font-semibold">{spec.name}</span>
              <span aria-hidden="true">·</span>
              <span>
                Class {benchmark.piClass} {benchmark.piScore}
              </span>
              <span aria-hidden="true">·</span>
              <span>{tune.drivetrain}</span>
              <span aria-hidden="true">·</span>
              <span>{benchmark.curbWeightKg.toLocaleString()} kg</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onResetFactory}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Factory Spec
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Drive Tuned Vehicle
            </button>
          </div>
        </div>

        {/* Interactive Category Segmented Bar */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-900/60 border-b border-white/10 overflow-x-auto">
          {[
            { id: 'upgrades', label: 'Power & Conversions', icon: Wrench },
            { id: 'gearing', label: 'Transmission Gearing', icon: Gauge },
            { id: 'suspension', label: 'Tires, Alignment & Springs', icon: Sliders },
            { id: 'aero_diff', label: 'Aero, Brakes & Diff', icon: Sliders },
            { id: 'paint', label: 'Paint & Stance Studio', icon: Palette },
            { id: 'presets', label: 'Community Tune Hub', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TuneTab)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable Tuning Controls Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'upgrades' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Forced Induction / Aspiration */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">01. Aspiration &amp; Forced Induction</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select intake architecture and calibrate manifold boost pressure.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['NA', 'Naturally Aspirated'],
                      ['SingleTurbo', 'Big Single Turbo'],
                      ['TwinTurbo', 'Sequential Twin-Turbo'],
                      ['Supercharged', 'Roots Supercharger'],
                    ] as [AspirationType, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        onChangeTune({
                          ...tune,
                          aspiration: val,
                          boostPressureBar: val === 'NA' ? 0 : Math.max(0.85, tune.boostPressureBar),
                        });
                      }}
                      className={`px-3 py-2.5 text-left text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        tune.aspiration === val
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                          : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tune.aspiration !== 'NA' && (
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Manifold Boost Pressure</span>
                      <span className="font-mono tabular-nums text-amber-400 font-semibold">
                        {tune.boostPressureBar.toFixed(2)} Bar ({Math.round(tune.boostPressureBar * 14.5)} PSI)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={2.0}
                      step={0.05}
                      value={tune.boostPressureBar}
                      onChange={(e) => updateField('boostPressureBar', parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>0.20 Bar Mild</span>
                      <span>2.00 Bar Race</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tire Compound Selection */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">02. Tire Compound Architecture</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Balances peak asphalt lateral G against dirt/sand grip and slip angle behavior.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(
                    [
                      ['Street', 'Street Radial · Balanced road durability (0.96G)'],
                      ['Sport', 'Sport Pilot Cup · High cornering grip (1.08G)'],
                      ['SemiSlick', 'Horizon Semi-Slick Race · Maximum dry asphalt traction (1.24G)'],
                      ['RallyGravel', 'Baja All-Terrain Rally · Superior dirt & sand dune bite'],
                      ['DriftCompound', 'Formula Drift Low-Grip · Progressive high slip-angle control'],
                    ] as [TireCompoundType, string][]
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => updateField('tireCompound', val)}
                      className={`px-3.5 py-2 text-left text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        tune.tireCompound === val
                          ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                          : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drivetrain & Chassis Weight Reduction */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">03. Drivetrain Swap &amp; Weight Reduction</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure power delivery axles and strip chassis mass.
                  </p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 block">Drivetrain Layout</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['RWD', 'AWD', 'FWD'] as DrivetrainType[]).map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => updateField('drivetrain', dt)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          tune.drivetrain === dt
                            ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                            : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        {dt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-xs text-slate-400 block">Chassis Weight Reduction</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        [0, 'Stock'],
                        [1, 'Street (-6%)'],
                        [2, 'Sport (-12%)'],
                        [3, 'Race (-18%)'],
                      ] as [0 | 1 | 2 | 3, string][]
                    ).map(([stage, label]) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => updateField('weightReductionStage', stage)}
                        className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                          tune.weightReductionStage === stage
                            ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                            : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aerodynamic Package */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">04. Aerodynamic Body Package</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adds visual carbon rear wing &amp; unlocks higher downforce ceiling.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['Stock', 'Factory Aero'],
                      ['Street', 'Street Lip + Wing'],
                      ['HorizonGT', 'Horizon GT Wing'],
                    ] as [AeroKitType, string][]
                  ).map(([kit, label]) => (
                    <button
                      key={kit}
                      type="button"
                      onClick={() => {
                        const nextFront = kit === 'HorizonGT' ? 240 : kit === 'Street' ? 140 : 60;
                        const nextRear = kit === 'HorizonGT' ? 340 : kit === 'Street' ? 190 : 85;
                        onChangeTune({
                          ...tune,
                          aeroKit: kit,
                          frontDownforceKg: nextFront,
                          rearDownforceKg: nextRear,
                        });
                      }}
                      className={`py-2.5 px-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        tune.aeroKit === kit
                          ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                          : 'bg-black/30 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Transmission & Assists Quick Toggles */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        'transmissionMode',
                        tune.transmissionMode === 'Automatic' ? 'Manual' : 'Automatic'
                      )
                    }
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-black/40 border border-white/15 text-slate-200 hover:border-amber-400 cursor-pointer"
                  >
                    Gearbox: <strong className="text-amber-400">{tune.transmissionMode}</strong>{' '}
                    {tune.transmissionMode === 'Manual' ? '(Q/E)' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('absEnabled', !tune.absEnabled)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                      tune.absEnabled
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                        : 'bg-black/40 border-white/10 text-slate-400'
                    }`}
                  >
                    ABS: {tune.absEnabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('tcsEnabled', !tune.tcsEnabled)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                      tune.tcsEnabled
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                        : 'bg-black/40 border-white/10 text-slate-400'
                    }`}
                  >
                    TCS: {tune.tcsEnabled ? 'ON' : 'OFF (Drift Ready)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gearing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Final Drive &amp; Gear Ratios</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Higher ratios increase wheel torque multiplication (acceleration); lower ratios extend top speed.
                  </p>
                </div>

                {/* Final Drive */}
                <div className="space-y-1 pb-3 border-b border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-amber-400">Final Drive Ratio</span>
                    <span className="font-mono tabular-nums text-white">{tune.finalDrive.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={2.5}
                    max={4.8}
                    step={0.02}
                    value={tune.finalDrive}
                    onChange={(e) => updateField('finalDrive', parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>2.50 Top Speed</span>
                    <span>4.80 Short Track Acceleration</span>
                  </div>
                </div>

                {/* Individual 1st-6th Gears */}
                {tune.gearRatios.map((ratio, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{idx + 1}st/th Gear Ratio</span>
                      <span className="font-mono tabular-nums text-cyan-300">
                        {ratio.toFixed(2)} ({benchmark.gearSpeeds[idx]?.maxSpeedKmh ?? 0} km/h)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.65}
                      max={3.9}
                      step={0.02}
                      value={ratio}
                      onChange={(e) => updateGearRatio(idx, parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Visual Gear Speed Ladder */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Transmission Speed Diagram</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Redline speed limit per gear at {spec.redlineRPM.toLocaleString()} RPM.
                  </p>
                </div>

                <div className="space-y-3 my-4">
                  {benchmark.gearSpeeds.map((g) => {
                    const widthPct = Math.min(100, Math.max(12, (g.maxSpeedKmh / 420) * 100));
                    return (
                      <div key={g.gear} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono tabular-nums">
                          <span className="text-slate-300">
                            Gear {g.gear} · {g.ratio.toFixed(2)}:1
                          </span>
                          <span className="text-amber-400 font-semibold">{g.maxSpeedKmh} km/h</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 rounded-full"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-400 border-t border-white/10 pt-3 font-mono tabular-nums">
                  Simulated Aero/Gear Top Speed: <strong className="text-white">{benchmark.topSpeedKmh} km/h</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suspension' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tire Pressures & Camber Alignment */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Tire Pressure &amp; Wheel Camber</h3>

                {[
                  {
                    label: 'Front Tire Pressure',
                    val: tune.frontTirePressurePSI,
                    min: 22,
                    max: 42,
                    step: 0.5,
                    unit: 'PSI',
                    key: 'frontTirePressurePSI' as const,
                  },
                  {
                    label: 'Rear Tire Pressure',
                    val: tune.rearTirePressurePSI,
                    min: 22,
                    max: 42,
                    step: 0.5,
                    unit: 'PSI',
                    key: 'rearTirePressurePSI' as const,
                  },
                  {
                    label: 'Front Camber Angle',
                    val: tune.frontCamberDeg,
                    min: -5.0,
                    max: 0.0,
                    step: 0.1,
                    unit: '°',
                    key: 'frontCamberDeg' as const,
                  },
                  {
                    label: 'Rear Camber Angle',
                    val: tune.rearCamberDeg,
                    min: -4.5,
                    max: 0.0,
                    step: 0.1,
                    unit: '°',
                    key: 'rearCamberDeg' as const,
                  },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-mono tabular-nums text-amber-400">
                        {item.val.toFixed(1)} {item.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      value={item.val}
                      onChange={(e) => updateField(item.key, parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Springs, Ride Height & Anti-Roll Bars */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Springs, Ride Height &amp; Anti-Roll Bars</h3>

                {[
                  {
                    label: 'Chassis Ride Height',
                    val: tune.rideHeightMm,
                    min: 65,
                    max: 260,
                    step: 2,
                    unit: 'mm',
                    key: 'rideHeightMm' as const,
                  },
                  {
                    label: 'Front Spring Stiffness',
                    val: tune.frontSpringRate,
                    min: 40,
                    max: 220,
                    step: 2,
                    unit: 'N/mm',
                    key: 'frontSpringRate' as const,
                  },
                  {
                    label: 'Rear Spring Stiffness',
                    val: tune.rearSpringRate,
                    min: 40,
                    max: 220,
                    step: 2,
                    unit: 'N/mm',
                    key: 'rearSpringRate' as const,
                  },
                  {
                    label: 'Front Anti-Roll Bar (ARB)',
                    val: tune.frontARB,
                    min: 1,
                    max: 65,
                    step: 1,
                    unit: 'lvl',
                    key: 'frontARB' as const,
                  },
                  {
                    label: 'Rear Anti-Roll Bar (ARB)',
                    val: tune.rearARB,
                    min: 1,
                    max: 65,
                    step: 1,
                    unit: 'lvl',
                    key: 'rearARB' as const,
                  },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-mono tabular-nums text-cyan-300">
                        {item.val} {item.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      value={item.val}
                      onChange={(e) => updateField(item.key, parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'aero_diff' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aerodynamic Downforce */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Aerodynamic Downforce Balance</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Increases high-speed cornering grip at the expense of top-end straightaway speed.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Front Splitter Downforce</span>
                    <span className="font-mono tabular-nums text-amber-400">
                      {tune.frontDownforceKg} kgf
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={380}
                    step={5}
                    value={tune.frontDownforceKg}
                    onChange={(e) => updateField('frontDownforceKg', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Rear Wing Downforce</span>
                    <span className="font-mono tabular-nums text-amber-400">
                      {tune.rearDownforceKg} kgf
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={480}
                    step={5}
                    value={tune.rearDownforceKg}
                    onChange={(e) => updateField('rearDownforceKg', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Brakes & Differential */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Braking Bias &amp; Limited Slip Differential</h3>

                {[
                  {
                    label: 'Brake Balance (Front Bias)',
                    val: tune.brakeBiasFrontPct,
                    min: 40,
                    max: 75,
                    unit: '%',
                    key: 'brakeBiasFrontPct' as const,
                  },
                  {
                    label: 'Brake Line Pressure',
                    val: tune.brakePressurePct,
                    min: 70,
                    max: 150,
                    unit: '%',
                    key: 'brakePressurePct' as const,
                  },
                  {
                    label: 'Differential Acceleration Lock',
                    val: tune.diffAccelLockPct,
                    min: 10,
                    max: 100,
                    unit: '%',
                    key: 'diffAccelLockPct' as const,
                  },
                  {
                    label: 'Differential Deceleration Lock',
                    val: tune.diffDecelLockPct,
                    min: 5,
                    max: 85,
                    unit: '%',
                    key: 'diffDecelLockPct' as const,
                  },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-mono tabular-nums text-cyan-300">
                        {item.val}{item.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={1}
                      value={item.val}
                      onChange={(e) => updateField(item.key, parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'paint' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Bodywork Paint &amp; Clearcoat Finish</h3>
                <div className="grid grid-cols-3 gap-2">
                  {PAINT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      onClick={() => updateField('paintHex', swatch.hex)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                        tune.paintHex.toLowerCase() === swatch.hex.toLowerCase()
                          ? 'border-amber-400 bg-white/10 text-white'
                          : 'border-white/10 bg-black/30 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-white/20"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className="truncate">{swatch.name.split(' ')[1] || swatch.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <span className="text-xs text-slate-400 block mb-2">Clearcoat Surface Shader</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Metallic', 'Pearlescent', 'Satin', 'Matte'] as PaintFinishType[]).map((fin) => (
                      <button
                        key={fin}
                        type="button"
                        onClick={() => updateField('paintFinish', fin)}
                        className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                          tune.paintFinish === fin
                            ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                            : 'bg-black/30 border-white/10 text-slate-300'
                        }`}
                      >
                        {fin}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Forged Wheel Rims &amp; Brake Calipers</h3>
                <div>
                  <span className="text-xs text-slate-400 block mb-2">Wheel Rim Alloy Finish</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Obsidian', hex: '#0F172A' },
                      { label: 'Silver', hex: '#E2E8F0' },
                      { label: 'Bronze', hex: '#D97706' },
                      { label: 'Gold', hex: '#FACC15' },
                    ].map((rim) => (
                      <button
                        key={rim.hex}
                        type="button"
                        onClick={() => updateField('rimHex', rim.hex)}
                        className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg border cursor-pointer ${
                          tune.rimHex.toLowerCase() === rim.hex.toLowerCase()
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                            : 'border-white/10 bg-black/30 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: rim.hex }}
                        />
                        {rim.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-2">Ceramic Brake Caliper Color</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Brembo Red', hex: '#EF4444' },
                      { label: 'Acid Yellow', hex: '#FACC15' },
                      { label: 'Apex Amber', hex: '#F59E0B' },
                      { label: 'Electric Cyan', hex: '#06B6D4' },
                    ].map((cal) => (
                      <button
                        key={cal.hex}
                        type="button"
                        onClick={() => updateField('caliperHex', cal.hex)}
                        className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg border cursor-pointer ${
                          tune.caliperHex.toLowerCase() === cal.hex.toLowerCase()
                            ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                            : 'border-white/10 bg-black/30 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-white/20"
                          style={{ backgroundColor: cal.hex }}
                        />
                        {cal.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Publish Current Setup to Live Multiplayer Session */}
              <form
                onSubmit={handlePublish}
                className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">Share Setup to Horizon Tune Hub</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Broadcasts your current gear ratios, suspension geometry, and power tune to all players in the session.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 block">Tune Setup Name</label>
                  <input
                    type="text"
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                    maxLength={40}
                    className="w-full px-3 py-2 text-xs bg-black/50 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400"
                    placeholder="e.g. Canyon Grip Spec"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 block">Build Discipline</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        'Grip / Track',
                        'Drift Spec',
                        'Top Speed Highway',
                        'Rally / Off-Road',
                      ] as SharedTunePreset['purpose'][]
                    ).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSharePurpose(p)}
                        className={`py-2 px-2.5 text-xs font-medium rounded-lg border text-left cursor-pointer ${
                          sharePurpose === p
                            ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                            : 'bg-black/30 border-white/10 text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                >
                  {publishedToast ? (
                    <>
                      <Check className="w-4 h-4" />
                      Published to Live Server!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Publish Tune Preset ({benchmark.piClass} {benchmark.piScore})
                    </>
                  )}
                </button>
              </form>

              {/* Load Tunes List */}
              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold text-white">
                  Available Community &amp; Pro Setups
                </h3>
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {[...vehiclePresets, ...allOtherPresets].map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between gap-3 p-3 bg-black/40 border border-white/10 rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{preset.title}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          <span className="text-amber-400">{preset.purpose}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {preset.piClass} {preset.piScore}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{preset.peakPowerHP} HP</span>
                          <span aria-hidden="true">·</span>
                          <span>by {preset.author}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplySharedTune(preset)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Load Tune
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Radial Performance Gauges & Chassis Benchmarks */}
      <div className="w-full lg:w-[420px] shrink-0 bg-black/50 p-6 flex flex-col justify-between overflow-y-auto space-y-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              Performance Gauges &amp; Specs
            </h3>
            <span className="text-xs font-mono text-amber-400">
              {benchmark.peakPowerHP} HP · {benchmark.peakTorqueNm} Nm
            </span>
          </div>

          {/* Dual Radial Performance Index & Top Speed Gauges */}
          <div className="bg-slate-950/90 border border-white/10 rounded-xl p-4 flex items-center justify-around gap-4">
            {/* Radial PI Score Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="2"
                  strokeDasharray="2 10"
                  transform="rotate(135 60 60)"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${arcMax} 302`}
                  transform="rotate(135 60 60)"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${piRatio * arcMax} 302`}
                  transform="rotate(135 60 60)"
                  className="transition-[stroke-dasharray] duration-150 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono text-slate-400">CLASS {benchmark.piClass}</span>
                <span className="font-display text-2xl font-bold text-amber-400 font-mono tabular-nums">
                  {benchmark.piScore}
                </span>
                <span className="text-[10px] font-mono text-slate-300">PI RATING</span>
              </div>
            </div>

            {/* Radial Top Speed Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="2"
                  strokeDasharray="2 10"
                  transform="rotate(135 60 60)"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${arcMax} 302`}
                  transform="rotate(135 60 60)"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#06B6D4"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${speedGaugeRatio * arcMax} 302`}
                  transform="rotate(135 60 60)"
                  className="transition-[stroke-dasharray] duration-150 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-mono text-slate-400">V-MAX</span>
                <span className="font-display text-2xl font-bold text-white font-mono tabular-nums">
                  {benchmark.topSpeedKmh}
                </span>
                <span className="text-[10px] font-mono text-cyan-300">KM/H</span>
              </div>
            </div>
          </div>

          {/* Simulated Benchmark Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
              <span className="text-[11px] text-slate-400 block font-sans">0–100 km/h Launch</span>
              <span className="text-lg font-bold text-white">{benchmark.zeroTo100KmhSec} s</span>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
              <span className="text-[11px] text-slate-400 block font-sans">0–200 km/h Sprint</span>
              <span className="text-lg font-bold text-white">{benchmark.zeroTo200KmhSec} s</span>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
              <span className="text-[11px] text-slate-400 block font-sans">Simulated Top Speed</span>
              <span className="text-lg font-bold text-amber-400">{benchmark.topSpeedKmh} km/h</span>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
              <span className="text-[11px] text-slate-400 block font-sans">100–0 km/h Braking</span>
              <span className="text-lg font-bold text-cyan-300">{benchmark.braking100To0M} m</span>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
              <span className="text-[11px] text-slate-400 block font-sans">Cornering @ 120 km/h</span>
              <span className="text-lg font-bold text-emerald-400">{benchmark.lateralG120Kmh} G</span>
            </div>
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
              <span className="text-[11px] text-slate-400 block font-sans">Power-to-Weight</span>
              <span className="text-lg font-bold text-white">{benchmark.powerToWeightHPPerTon} HP/t</span>
            </div>
          </div>

          {/* Dynamic Chassis Balance Gauge */}
          <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Dynamic Yaw &amp; Roll Balance</span>
              <span className="font-mono font-semibold text-amber-400">
                {benchmark.handlingBalanceLabel}
              </span>
            </div>
            <div className="relative h-2.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="absolute top-0 bottom-0 w-3 bg-amber-400 rounded-full transition-transform duration-150"
                style={{
                  left: `calc(${Math.round(benchmark.balanceRatio * 100)}% - 6px)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Understeer (Stable)</span>
              <span>Neutral</span>
              <span>Oversteer (Drift)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
