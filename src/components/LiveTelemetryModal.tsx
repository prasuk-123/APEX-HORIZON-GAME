import React from 'react';
import { DynoBenchmark, TelemetryFrame, VehicleSpec, VehicleTune } from '../types/game';
import { X } from 'lucide-react';

interface LiveTelemetryModalProps {
  spec: VehicleSpec;
  tune: VehicleTune;
  benchmark: DynoBenchmark;
  telemetry: TelemetryFrame;
  onClose: () => void;
}

export const LiveTelemetryModal: React.FC<LiveTelemetryModalProps> = ({
  spec,
  tune,
  benchmark,
  telemetry,
  onClose,
}) => {
  const totalLoadKg = Math.max(1, telemetry.frontAxleLoadKg + telemetry.rearAxleLoadKg);
  const frontLoadPct = Math.round((telemetry.frontAxleLoadKg / totalLoadKg) * 100);
  const rearLoadPct = 100 - frontLoadPct;

  // GG Diagram coordinates (-2G..+2G mapped to 120px circle)
  const ggRadius = 70;
  const dotX = 90 + Math.max(-1.8, Math.min(1.8, telemetry.lateralG)) * (ggRadius / 1.8);
  const dotY = 90 - Math.max(-1.8, Math.min(1.8, telemetry.longitudinalG)) * (ggRadius / 1.8);

  return (
    <div className="fixed left-6 bottom-28 z-20 w-[390px] max-w-[calc(100vw-3rem)] bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-5 space-y-4 pointer-events-auto shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="font-display text-sm font-bold text-white">
            Chassis Dynamics &amp; Tire Telemetry
          </h3>
          <p className="text-[11px] text-slate-400 font-mono tabular-nums">
            {spec.name} · Surface: {telemetry.surface}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close Telemetry Window"
          aria-label="Close Telemetry Window"
          className="w-8 h-8 rounded-full bg-slate-900 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Top Row: G-Force Friction Circle + Live Values */}
      <div className="flex items-center gap-4">
        <div className="shrink-0 bg-slate-950/90 border border-white/10 rounded-xl p-2">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={ggRadius}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
            <circle
              cx="90"
              cy="90"
              r={ggRadius * 0.55}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="3 3"
            />
            <line x1="20" y1="90" x2="160" y2="90" stroke="rgba(255,255,255,0.1)" />
            <line x1="90" y1="20" x2="90" y2="160" stroke="rgba(255,255,255,0.1)" />
            {/* Active G vector line & point */}
            <line
              x1="90"
              y1="90"
              x2={dotX}
              y2={dotY}
              stroke="#F59E0B"
              strokeWidth="2"
            />
            <circle cx={dotX} cy={dotY} r="5.5" fill="#06B6D4" stroke="#ffffff" strokeWidth="1.5" />
            <text x="90" y="14" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              ACCEL +G
            </text>
            <text x="90" y="174" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
              BRAKE -G
            </text>
          </svg>
        </div>

        <div className="flex-1 space-y-2.5 font-mono tabular-nums text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Lateral G</span>
            <span className="text-cyan-300 font-semibold">{telemetry.lateralG.toFixed(2)} G</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Longitudinal G</span>
            <span className="text-amber-400 font-semibold">{telemetry.longitudinalG.toFixed(2)} G</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Slip Angle</span>
            <span className="text-white font-semibold">{telemetry.slipAngleDeg.toFixed(1)}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Wheelspin</span>
            <span className="text-emerald-400 font-semibold">
              {Math.round(telemetry.wheelSpinRatio * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Manifold Boost</span>
            <span className="text-amber-300 font-semibold">{telemetry.boostBar.toFixed(2)} Bar</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-sans">Pitch / Roll</span>
            <span className="text-slate-200">
              {((telemetry.pitchRad * 180) / Math.PI).toFixed(1)}° /{' '}
              {((telemetry.rollRad * 180) / Math.PI).toFixed(1)}°
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Weight Transfer Distribution */}
      <div className="space-y-1.5 pt-2 border-t border-white/10">
        <div className="flex justify-between text-xs font-mono tabular-nums">
          <span className="text-cyan-300">
            Front Axle: {telemetry.frontAxleLoadKg} kg ({frontLoadPct}%)
          </span>
          <span className="text-amber-400">
            Rear Axle: {telemetry.rearAxleLoadKg} kg ({rearLoadPct}%)
          </span>
        </div>
        <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-cyan-400 transition-all duration-75"
            style={{ width: `${frontLoadPct}%` }}
          />
          <div
            className="h-full bg-amber-400 transition-all duration-75"
            style={{ width: `${rearLoadPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-mono tabular-nums">
          <span>Tire Pressures: {tune.frontTirePressurePSI} / {tune.rearTirePressurePSI} PSI</span>
          <span>Peak Grip Cap: {benchmark.lateralG120Kmh} G</span>
        </div>
      </div>
    </div>
  );
};
