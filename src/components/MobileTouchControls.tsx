import React, { useEffect, useRef, useState } from 'react';
import { MobileControlMode } from '../types/game';
import { ControlInputState } from '../physics/vehiclePhysics';
import { Flame, ArrowLeft, ArrowRight } from 'lucide-react';

interface MobileTouchControlsProps {
  controlMode: MobileControlMode;
  touchControlsRef: React.MutableRefObject<ControlInputState>;
  isManualTransmission: boolean;
}

export const MobileTouchControls: React.FC<MobileTouchControlsProps> = ({
  controlMode,
  touchControlsRef,
  isManualTransmission,
}) => {
  // Visual states for tactile feedback
  const [wheelAngleDeg, setWheelAngleDeg] = useState<number>(0);
  const [activeGas, setActiveGas] = useState<boolean>(false);
  const [activeBrake, setActiveBrake] = useState<boolean>(false);
  const [activeLeft, setActiveLeft] = useState<boolean>(false);
  const [activeRight, setActiveRight] = useState<boolean>(false);
  const [activeDrift, setActiveDrift] = useState<boolean>(false);
  const [activeNos, setActiveNos] = useState<boolean>(false);
  const [gyroEnabled, setGyroEnabled] = useState<boolean>(false);

  const wheelContainerRef = useRef<HTMLDivElement | null>(null);
  const wheelPointerIdRef = useRef<number | null>(null);
  const wheelAngleRef = useRef<number>(0);
  const lastPointerAngleRef = useRef<number | null>(null);
  const lastClientXRef = useRef<number>(0);
  const lockedRotateDirRef = useRef<number>(0); // -1 = Left (CCW), +1 = Right (CW)
  const reverseAccumDegRef = useRef<number>(0);
  const sliderContainerRef = useRef<HTMLDivElement | null>(null);
  const sliderPointerIdRef = useRef<number | null>(null);

  // Reset steering when switching control modes
  useEffect(() => {
    touchControlsRef.current.steerLeft = 0;
    touchControlsRef.current.steerRight = 0;
    wheelAngleRef.current = 0;
    lockedRotateDirRef.current = 0;
    reverseAccumDegRef.current = 0;
    lastPointerAngleRef.current = null;
    setWheelAngleDeg(0);
    setActiveLeft(false);
    setActiveRight(false);
  }, [controlMode, touchControlsRef]);

  // DeviceOrientation Gyroscope Listener for 'tilt' mode
  useEffect(() => {
    if (controlMode !== 'tilt') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const rawTilt =
        window.innerWidth > window.innerHeight ? (e.beta ?? 0) : (e.gamma ?? 0);
      if (Math.abs(rawTilt) < 2.2) {
        if (sliderPointerIdRef.current === null) {
          touchControlsRef.current.steerLeft = 0;
          touchControlsRef.current.steerRight = 0;
          setWheelAngleDeg(0);
        }
        return;
      }
      setGyroEnabled(true);
      const clamped = Math.max(-45, Math.min(45, rawTilt)) / 45;
      const smoothTilt = Math.sign(clamped) * Math.pow(Math.abs(clamped), 1.15);
      setWheelAngleDeg(smoothTilt * 180);
      if (smoothTilt < 0) {
        touchControlsRef.current.steerLeft = Math.abs(smoothTilt);
        touchControlsRef.current.steerRight = 0;
      } else {
        touchControlsRef.current.steerRight = smoothTilt;
        touchControlsRef.current.steerLeft = 0;
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [controlMode, touchControlsRef]);

  // Sync visual steering wheel rotation when steering via keyboard (A/D or Left/Right arrows)
  useEffect(() => {
    const keys = new Set<string>();
    const updateKeyboardWheel = () => {
      if (wheelPointerIdRef.current !== null || sliderPointerIdRef.current !== null) return;
      const left = keys.has('a') || keys.has('arrowleft');
      const right = keys.has('d') || keys.has('arrowright');
      if (left && !right) {
        wheelAngleRef.current = -180;
        setWheelAngleDeg(-180);
      } else if (right && !left) {
        wheelAngleRef.current = 180;
        setWheelAngleDeg(180);
      } else {
        wheelAngleRef.current = 0;
        setWheelAngleDeg(0);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'd' || k === 'arrowleft' || k === 'arrowright') {
        keys.add(k);
        updateKeyboardWheel();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (keys.has(k)) {
        keys.delete(k);
        updateKeyboardWheel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Apply steering output from current wheel angle & locked rotation direction
  const applyWheelSteerOutput = (angleDeg: number, dirLock: number) => {
    const effectiveDir = dirLock !== 0 ? dirLock : Math.sign(angleDeg);
    // Smooth steering authority that reaches full lock at 60° and stays engaged through unlimited 360°+ rotations
    const magnitude = Math.min(1, Math.max(0.35, Math.abs(angleDeg) / 60));

    if (effectiveDir < 0 && Math.abs(angleDeg) > 1.5) {
      touchControlsRef.current.steerLeft = magnitude;
      touchControlsRef.current.steerRight = 0;
    } else if (effectiveDir > 0 && Math.abs(angleDeg) > 1.5) {
      touchControlsRef.current.steerRight = magnitude;
      touchControlsRef.current.steerLeft = 0;
    } else {
      touchControlsRef.current.steerLeft = 0;
      touchControlsRef.current.steerRight = 0;
    }
  };

  // Virtual Steering Wheel Pointer Down Handler
  const handleWheelPointerDown = (clientX: number, clientY: number) => {
    const el = wheelContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const dx = clientX - cx;
    const dy = clientY - cy;

    lastPointerAngleRef.current = Math.atan2(dy, dx) * (180 / Math.PI);
    lastClientXRef.current = clientX;
    lockedRotateDirRef.current = 0;
    reverseAccumDegRef.current = 0;
    wheelAngleRef.current = 0;
    setWheelAngleDeg(0);
  };

  // Virtual Steering Wheel Pointer Move Handler (Unlimited 360°+ full rotation in the direction started)
  const updateWheelFromPointer = (clientX: number, clientY: number) => {
    const el = wheelContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const distFromCenter = Math.hypot(dx, dy);

    const currentPointerAngle = Math.atan2(dy, dx) * (180 / Math.PI);
    let deltaDeg = 0;

    if (distFromCenter > 8 && lastPointerAngleRef.current !== null) {
      deltaDeg = currentPointerAngle - lastPointerAngleRef.current;
      // Wrap across ±180° boundary so full 360° rotation never flips sign
      if (deltaDeg > 180) deltaDeg -= 360;
      if (deltaDeg < -180) deltaDeg += 360;
    } else {
      deltaDeg = (clientX - lastClientXRef.current) * 2.4;
    }

    lastPointerAngleRef.current = currentPointerAngle;
    lastClientXRef.current = clientX;

    // Lock into the direction the user started to rotate the wheel
    if (lockedRotateDirRef.current === 0 && Math.abs(deltaDeg) > 0.6) {
      lockedRotateDirRef.current = deltaDeg > 0 ? 1 : -1;
      reverseAccumDegRef.current = 0;
    } else if (lockedRotateDirRef.current !== 0) {
      // Only switch direction if user deliberately rotates the wheel back the opposite way by > 35°
      if (Math.sign(deltaDeg) !== 0 && Math.sign(deltaDeg) !== lockedRotateDirRef.current) {
        reverseAccumDegRef.current += Math.abs(deltaDeg);
        if (reverseAccumDegRef.current > 35) {
          lockedRotateDirRef.current = deltaDeg > 0 ? 1 : -1;
          reverseAccumDegRef.current = 0;
          wheelAngleRef.current = deltaDeg * 1.4;
        }
      } else if (Math.sign(deltaDeg) === lockedRotateDirRef.current) {
        reverseAccumDegRef.current = 0;
      }
    }

    // Unlimited full 360°+ wheel rotation
    const nextAngle = wheelAngleRef.current + deltaDeg * 1.4;
    wheelAngleRef.current = nextAngle;

    setWheelAngleDeg(nextAngle);
    applyWheelSteerOutput(nextAngle, lockedRotateDirRef.current);
  };

  // Tilt / Slider Analog Bar Pointer Handlers (Full ±90° range)
  const updateSliderFromPointer = (clientX: number) => {
    const el = sliderContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const rawNorm = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width * 0.45)));
    const progressiveNorm = Math.sign(rawNorm) * Math.pow(Math.abs(rawNorm), 1.15);
    setWheelAngleDeg(Math.max(-90, Math.min(90, progressiveNorm * 90)));
    if (progressiveNorm < -0.04) {
      touchControlsRef.current.steerLeft = Math.abs(progressiveNorm);
      touchControlsRef.current.steerRight = 0;
    } else if (progressiveNorm > 0.04) {
      touchControlsRef.current.steerRight = progressiveNorm;
      touchControlsRef.current.steerLeft = 0;
    } else {
      touchControlsRef.current.steerLeft = 0;
      touchControlsRef.current.steerRight = 0;
    }
  };

  return (
    <>
      {/* LEFT THUMB ZONE (Anchored Bottom-Left, Always 100% Visible) */}
      <div className="fixed bottom-5 left-5 z-20 pointer-events-auto flex items-end select-none">
        {controlMode === 'wheel' && (
          <div
            ref={wheelContainerRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              wheelPointerIdRef.current = e.pointerId;
              handleWheelPointerDown(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (wheelPointerIdRef.current === e.pointerId) {
                updateWheelFromPointer(e.clientX, e.clientY);
              }
            }}
            onPointerUp={(e) => {
              if (wheelPointerIdRef.current === e.pointerId) {
                wheelPointerIdRef.current = null;
                wheelAngleRef.current = 0;
                lockedRotateDirRef.current = 0;
                lastPointerAngleRef.current = null;
                setWheelAngleDeg(0);
                touchControlsRef.current.steerLeft = 0;
                touchControlsRef.current.steerRight = 0;
              }
            }}
            onPointerCancel={() => {
              wheelPointerIdRef.current = null;
              wheelAngleRef.current = 0;
              lockedRotateDirRef.current = 0;
              lastPointerAngleRef.current = null;
              setWheelAngleDeg(0);
              touchControlsRef.current.steerLeft = 0;
              touchControlsRef.current.steerRight = 0;
            }}
            style={{ touchAction: 'none' }}
            className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-slate-950/75 backdrop-blur-md border-2 border-white/25 flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing"
          >
            <svg
              viewBox="0 0 120 120"
              style={{ transform: `rotate(${wheelAngleDeg}deg)` }}
              className="w-32 h-32 sm:w-36 sm:h-36 pointer-events-none"
            >
              {/* Outer Steering Rim */}
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="#0F172A"
                strokeWidth="6"
              />
              {/* Top Center Racing Stripe */}
              <path
                d="M 55 12 L 65 12"
                stroke="#F59E0B"
                strokeWidth="10"
                strokeLinecap="butt"
              />
              {/* Steering Spokes */}
              <line x1="16" y1="60" x2="44" y2="60" stroke="#94A3B8" strokeWidth="7" />
              <line x1="76" y1="60" x2="104" y2="60" stroke="#94A3B8" strokeWidth="7" />
              <line x1="60" y1="68" x2="60" y2="104" stroke="#94A3B8" strokeWidth="7" />
              {/* Center Hub */}
              <circle cx="60" cy="60" r="15" fill="#1E293B" stroke="#F59E0B" strokeWidth="2.5" />
            </svg>
            {/* Full Rotation Indicators */}
            <span className="absolute left-1 text-[8px] font-mono text-amber-400/80 pointer-events-none">
              ◄ L
            </span>
            <span className="absolute right-1 text-[8px] font-mono text-amber-400/80 pointer-events-none">
              R ►
            </span>
            <span className="absolute -top-6 text-[10px] font-mono text-slate-200 bg-black/80 border border-white/15 px-2.5 py-0.5 rounded whitespace-nowrap">
              STEER ({Math.round(wheelAngleDeg)}°)
            </span>
          </div>
        )}

        {controlMode === 'buttons' && (
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setActiveLeft(true);
                touchControlsRef.current.steerLeft = 1;
              }}
              onPointerUp={() => {
                setActiveLeft(false);
                touchControlsRef.current.steerLeft = 0;
              }}
              onPointerCancel={() => {
                setActiveLeft(false);
                touchControlsRef.current.steerLeft = 0;
              }}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform cursor-pointer shadow-2xl ${
                activeLeft
                  ? 'bg-amber-400 text-slate-950 border-white scale-95'
                  : 'bg-slate-950/85 text-white border-white/25 hover:border-amber-400'
              }`}
            >
              <ArrowLeft className="w-8 h-8" />
              <span className="text-[11px] font-mono font-bold mt-1">LEFT</span>
            </button>

            <button
              type="button"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setActiveRight(true);
                touchControlsRef.current.steerRight = 1;
              }}
              onPointerUp={() => {
                setActiveRight(false);
                touchControlsRef.current.steerRight = 0;
              }}
              onPointerCancel={() => {
                setActiveRight(false);
                touchControlsRef.current.steerRight = 0;
              }}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform cursor-pointer shadow-2xl ${
                activeRight
                  ? 'bg-amber-400 text-slate-950 border-white scale-95'
                  : 'bg-slate-950/85 text-white border-white/25 hover:border-amber-400'
              }`}
            >
              <ArrowRight className="w-8 h-8" />
              <span className="text-[11px] font-mono font-bold mt-1">RIGHT</span>
            </button>
          </div>
        )}

        {controlMode === 'tilt' && (
          <div
            ref={sliderContainerRef}
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              sliderPointerIdRef.current = e.pointerId;
              updateSliderFromPointer(e.clientX);
            }}
            onPointerMove={(e) => {
              if (sliderPointerIdRef.current === e.pointerId) {
                updateSliderFromPointer(e.clientX);
              }
            }}
            onPointerUp={(e) => {
              if (sliderPointerIdRef.current === e.pointerId) {
                sliderPointerIdRef.current = null;
                setWheelAngleDeg(0);
                touchControlsRef.current.steerLeft = 0;
                touchControlsRef.current.steerRight = 0;
              }
            }}
            onPointerCancel={() => {
              sliderPointerIdRef.current = null;
              setWheelAngleDeg(0);
              touchControlsRef.current.steerLeft = 0;
              touchControlsRef.current.steerRight = 0;
            }}
            className="relative w-48 sm:w-56 h-20 bg-slate-950/85 backdrop-blur-md border-2 border-cyan-400/60 rounded-2xl flex items-center justify-center px-5 cursor-ew-resize shadow-2xl"
          >
            <div className="w-full h-2 bg-white/20 rounded-full relative">
              <div
                style={{
                  left: `${50 + (wheelAngleDeg / 90) * 44}%`,
                }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-12 bg-cyan-400 border-2 border-white rounded-xl shadow-md"
              />
            </div>
            <span className="absolute bottom-1.5 text-[10px] font-mono text-cyan-200 pointer-events-none">
              {gyroEnabled ? 'TILT DEVICE OR SLIDE' : 'SLIDE OR TILT TO STEER'}
            </span>
          </div>
        )}
      </div>

      {/* RIGHT THUMB ZONE: E-Brake Drift, NOS Boost, Brake/Rev & Gas Pedals (Anchored Bottom-Right, Always 100% Visible) */}
      <div className="fixed bottom-5 right-5 z-20 pointer-events-auto flex items-end gap-3 select-none">
        {/* Secondary Action Column: NOS Boost & E-Brake Drift (+ Manual Shift if enabled) */}
        <div className="flex flex-col items-center gap-2.5">
          {isManualTransmission && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  touchControlsRef.current.shiftDownRequested = true;
                }}
                className="min-w-[46px] min-h-[38px] px-2.5 bg-slate-900/90 border border-white/25 rounded-xl text-xs font-mono font-bold text-white active:scale-95 cursor-pointer"
              >
                -GEAR
              </button>
              <button
                type="button"
                onClick={() => {
                  touchControlsRef.current.shiftUpRequested = true;
                }}
                className="min-w-[46px] min-h-[38px] px-2.5 bg-slate-900/90 border border-white/25 rounded-xl text-xs font-mono font-bold text-amber-400 active:scale-95 cursor-pointer"
              >
                +GEAR
              </button>
            </div>
          )}

          <button
            type="button"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setActiveNos(true);
              touchControlsRef.current.nitrousBoost = true;
            }}
            onPointerUp={() => {
              setActiveNos(false);
              touchControlsRef.current.nitrousBoost = false;
            }}
            onPointerCancel={() => {
              setActiveNos(false);
              touchControlsRef.current.nitrousBoost = false;
            }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 flex flex-col items-center justify-center transition-transform cursor-pointer shadow-xl ${
              activeNos
                ? 'bg-cyan-400 text-slate-950 border-white scale-95'
                : 'bg-slate-950/90 text-cyan-300 border-cyan-400/60'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold">NOS</span>
          </button>

          <button
            type="button"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setActiveDrift(true);
              touchControlsRef.current.handbrake = true;
            }}
            onPointerUp={() => {
              setActiveDrift(false);
              touchControlsRef.current.handbrake = false;
            }}
            onPointerCancel={() => {
              setActiveDrift(false);
              touchControlsRef.current.handbrake = false;
            }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform cursor-pointer shadow-xl ${
              activeDrift
                ? 'bg-amber-400 text-slate-950 border-white scale-95'
                : 'bg-slate-950/90 text-amber-300 border-amber-400/60'
            }`}
          >
            <span className="text-[11px] font-mono font-bold">DRIFT</span>
            <span className="text-[9px] font-mono text-slate-400">E-BRK</span>
          </button>
        </div>

        {/* Brake / Reverse Pedal */}
        <button
          type="button"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setActiveBrake(true);
            touchControlsRef.current.brake = 1;
          }}
          onPointerUp={() => {
            setActiveBrake(false);
            touchControlsRef.current.brake = 0;
          }}
          onPointerCancel={() => {
            setActiveBrake(false);
            touchControlsRef.current.brake = 0;
          }}
          className={`w-18 h-24 sm:w-20 sm:h-28 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform cursor-pointer shadow-2xl ${
            activeBrake
              ? 'bg-red-500 text-white border-white scale-95'
              : 'bg-slate-950/90 text-red-400 border-red-500/60 hover:border-red-400'
          }`}
        >
          <span className="font-display text-xs sm:text-sm font-bold">BRAKE</span>
          <span className="text-[10px] font-mono opacity-80">REV</span>
        </button>

        {/* Primary Tall Gas / Throttle Pedal */}
        <button
          type="button"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setActiveGas(true);
            touchControlsRef.current.throttle = 1;
          }}
          onPointerUp={() => {
            setActiveGas(false);
            touchControlsRef.current.throttle = 0;
          }}
          onPointerCancel={() => {
            setActiveGas(false);
            touchControlsRef.current.throttle = 0;
          }}
          className={`w-20 h-32 sm:w-24 sm:h-36 rounded-2xl border-2 flex flex-col items-center justify-between py-3.5 transition-transform cursor-pointer shadow-2xl ${
            activeGas
              ? 'bg-emerald-400 text-slate-950 border-white scale-95'
              : 'bg-slate-950/90 text-emerald-400 border-emerald-400/70 hover:border-emerald-300'
          }`}
        >
          <span className="w-9 h-1 rounded-full bg-current opacity-50" />
          <span className="font-display text-base font-bold tracking-wider">GAS</span>
          <span className="w-9 h-1 rounded-full bg-current opacity-50" />
        </button>
      </div>
    </>
  );
};
