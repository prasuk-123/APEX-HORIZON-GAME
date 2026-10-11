import {
  DayCycleControlMode,
  DynoBenchmark,
  DynoPoint,
  GearSpeedPoint,
  PIClass,
  RaceBotDifficultyTier,
  RaceBotState,
  SurfaceType,
  TelemetryFrame,
  TimeOfDayPhase,
  TireCompoundType,
  VehicleSpec,
  VehicleTune,
  WeatherControlMode,
  WeatherType,
  WorldBiomeType,
  WorldRaceEvent,
} from '../types/game';

// ============================================================================
// DYNAMIC WEATHER & DAY-NIGHT CYCLE ENGINE
// ============================================================================
export interface DynamicEnvironmentState {
  weather: WeatherType;
  nextWeather: WeatherType;
  weatherTransition: number; // 0..1 smooth crossfade
  weatherControlMode: WeatherControlMode;
  dayCycleControlMode: DayCycleControlMode;
  gripMultiplier: number; // 0.64..1.00
  visibilityMultiplier: number; // 0.38..1.00
  enginePowerMultiplier: number; // 0.95..1.04
  fogNear: number;
  fogFar: number;
  rainIntensity: number; // 0..1
  snowIntensity: number; // 0..1
  fogDensity: number; // 0..1
  roadWetness: number; // 0..1
  solarHour: number; // 0..24
  timeOfDayPhase: TimeOfDayPhase;
  timeOfDayLabel: string;
  sunElevationRad: number;
  sunAzimuthRad: number;
  sunIntensity: number;
  ambientIntensity: number;
  skyTopHex: number;
  skyHorizonHex: number;
  fogColorHex: number;
  sunColorHex: number;
  hemiGroundHex: number;
  headlightsOn: boolean;
}

const WEATHER_CYCLE_ORDER: WeatherType[] = ['sunny', 'rainy', 'snowy', 'cloudy', 'foggy'];
const WEATHER_STAGE_DURATION_SEC = 75; // 75 seconds per weather stage in Auto mode
const DAY_CYCLE_DURATION_SEC = 900; // Slow 15 minutes for a full 24h solar day/night cycle

const WEATHER_SPECS: Record<
  WeatherType,
  {
    grip: number;
    visibility: number;
    power: number;
    fogNear: number;
    fogFar: number;
    rain: number;
    snow: number;
    fog: number;
    wetness: number;
    skyDarken: number;
  }
> = {
  sunny: {
    grip: 1.0,
    visibility: 1.0,
    power: 1.0,
    fogNear: 520,
    fogFar: 2650,
    rain: 0,
    snow: 0,
    fog: 0,
    wetness: 0.0,
    skyDarken: 0.0,
  },
  cloudy: {
    grip: 0.96,
    visibility: 0.85,
    power: 1.03, // Cool dense intake charge
    fogNear: 360,
    fogFar: 1850,
    rain: 0,
    snow: 0,
    fog: 0.22,
    wetness: 0.12,
    skyDarken: 0.28,
  },
  rainy: {
    grip: 0.78,
    visibility: 0.62,
    power: 0.95, // Heavy wet air & high rolling drag
    fogNear: 190,
    fogFar: 1120,
    rain: 1.0,
    snow: 0,
    fog: 0.48,
    wetness: 0.95,
    skyDarken: 0.56,
  },
  foggy: {
    grip: 0.9,
    visibility: 0.38,
    power: 0.97,
    fogNear: 70,
    fogFar: 520,
    rain: 0.08,
    snow: 0,
    fog: 1.0,
    wetness: 0.38,
    skyDarken: 0.45,
  },
  snowy: {
    grip: 0.64,
    visibility: 0.54,
    power: 1.04, // Crisp sub-zero air density boost, traction-limited
    fogNear: 150,
    fogFar: 920,
    rain: 0,
    snow: 1.0,
    fog: 0.58,
    wetness: 0.65,
    skyDarken: 0.38,
  },
};

let currentWeatherControlMode: WeatherControlMode = 'auto';
let currentDayCycleControlMode: DayCycleControlMode = 'auto';

export function setWeatherControlMode(mode: WeatherControlMode): void {
  currentWeatherControlMode = mode;
}

export function getWeatherControlMode(): WeatherControlMode {
  return currentWeatherControlMode;
}

export function setDayCycleControlMode(_mode: DayCycleControlMode): void {
  // Locked to automatic solar cycle per user request
  currentDayCycleControlMode = 'auto';
}

export function getDayCycleControlMode(): DayCycleControlMode {
  return 'auto';
}

function lerpColorHex(hexA: number, hexB: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const rA = (hexA >> 16) & 0xff;
  const gA = (hexA >> 8) & 0xff;
  const bA = hexA & 0xff;
  const rB = (hexB >> 16) & 0xff;
  const gB = (hexB >> 8) & 0xff;
  const bB = hexB & 0xff;
  const r = Math.round(rA + (rB - rA) * clamped);
  const g = Math.round(gA + (gB - gA) * clamped);
  const b = Math.round(bA + (bB - bA) * clamped);
  return (r << 16) | (g << 8) | b;
}

export function getDynamicWeatherAndDayState(nowSec: number): DynamicEnvironmentState {
  // 1. Weather State & Smooth Crossfade
  let weather: WeatherType = 'sunny';
  let nextWeather: WeatherType = 'sunny';
  let weatherTransition = 0;

  if (currentWeatherControlMode === 'auto') {
    const cyclePos = (nowSec / WEATHER_STAGE_DURATION_SEC) % WEATHER_CYCLE_ORDER.length;
    const idx = Math.floor(cyclePos);
    const frac = cyclePos - idx;
    weather = WEATHER_CYCLE_ORDER[idx] ?? 'sunny';
    nextWeather = WEATHER_CYCLE_ORDER[(idx + 1) % WEATHER_CYCLE_ORDER.length] ?? 'cloudy';
    // Smooth cosine crossfade during the final 25% of each weather window
    if (frac > 0.75) {
      const fadeNorm = (frac - 0.75) / 0.25;
      weatherTransition = 0.5 - 0.5 * Math.cos(fadeNorm * Math.PI);
    }
  } else {
    weather = currentWeatherControlMode;
    nextWeather = currentWeatherControlMode;
    weatherTransition = 0;
  }

  const wA = WEATHER_SPECS[weather];
  const wB = WEATHER_SPECS[nextWeather];
  const lerp = (a: number, b: number) => a + (b - a) * weatherTransition;

  const gripMultiplier = Number(lerp(wA.grip, wB.grip).toFixed(3));
  const visibilityMultiplier = Number(lerp(wA.visibility, wB.visibility).toFixed(3));
  const enginePowerMultiplier = Number(lerp(wA.power, wB.power).toFixed(3));
  const fogNear = Math.round(lerp(wA.fogNear, wB.fogNear));
  const fogFar = Math.round(lerp(wA.fogFar, wB.fogFar));
  const rainIntensity = Number(lerp(wA.rain, wB.rain).toFixed(2));
  const snowIntensity = Number(lerp(wA.snow, wB.snow).toFixed(2));
  const fogDensity = Number(lerp(wA.fog, wB.fog).toFixed(2));
  const roadWetness = Number(lerp(wA.wetness, wB.wetness).toFixed(2));
  const skyDarken = lerp(wA.skyDarken, wB.skyDarken);

  // 2. Solar Day/Night Cycle (0..24h)
  let solarHour = 13.5;
  if (currentDayCycleControlMode === 'auto') {
    // Start at 11:30 AM at t=0 and cycle smoothly across 24 hours
    solarHour = (11.5 + (nowSec / DAY_CYCLE_DURATION_SEC) * 24) % 24;
  } else if (currentDayCycleControlMode === 'dawn') {
    solarHour = 6.25;
  } else if (currentDayCycleControlMode === 'noon') {
    solarHour = 13.0;
  } else if (currentDayCycleControlMode === 'sunset') {
    solarHour = 18.5;
  } else if (currentDayCycleControlMode === 'night') {
    solarHour = 0.5;
  }

  const hourInt = Math.floor(solarHour);
  const minInt = Math.floor((solarHour - hourInt) * 60);
  const timeString = `${String(hourInt).padStart(2, '0')}:${String(minInt).padStart(2, '0')}`;

  let timeOfDayPhase: TimeOfDayPhase = 'noon';
  let phaseTitle = 'MIDDAY';
  if (solarHour >= 5.0 && solarHour < 8.0) {
    timeOfDayPhase = 'dawn';
    phaseTitle = 'DAWN';
  } else if (solarHour >= 8.0 && solarHour < 16.8) {
    timeOfDayPhase = 'noon';
    phaseTitle = 'DAY';
  } else if (solarHour >= 16.8 && solarHour < 20.2) {
    timeOfDayPhase = 'sunset';
    phaseTitle = 'SUNSET';
  } else {
    timeOfDayPhase = 'night';
    phaseTitle = 'NIGHT';
  }

  // Solar angle: peaks at 12:30 PM, lowest at 00:30 AM
  const dayAngle = ((solarHour - 6.25) / 24) * Math.PI * 2;
  const sunElevationRad = Math.sin(dayAngle) * 1.18;
  const sunAzimuthRad = dayAngle;
  const sunHeightNorm = Math.max(-1, Math.min(1, Math.sin(dayAngle))); // -1 midnight .. +1 noon

  // Smoothly interpolate sky & lighting across Night -> Dawn/Sunset -> Day (Forza Horizon 6 Crisp Azure Sky & Natural Sunlight)
  let baseSkyTop = 0x2563eb;
  let baseSkyHorizon = 0xa5cdfa;
  let baseFogHex = 0xbad9fc;
  let baseSunHex = 0xfff8eb;
  let baseGroundHex = 0x465940;
  let baseSunIntensity = 3.1;
  let baseAmbientIntensity = 1.22;

  if (sunHeightNorm >= 0.25) {
    // Full Daylight — Crisp Horizon 6 Azure Blue Sky, Soft Horizon Haze & Warm Natural Sunlight
    const t = Math.min(1, (sunHeightNorm - 0.25) / 0.75);
    baseSkyTop = lerpColorHex(0x3b76d4, 0x2563eb, t);
    baseSkyHorizon = lerpColorHex(0xfcd39b, 0xa5cdfa, t);
    baseFogHex = lerpColorHex(0xf3c697, 0xbad9fc, t);
    baseSunHex = lerpColorHex(0xffc382, 0xfff8eb, t);
    baseGroundHex = lerpColorHex(0x3d382e, 0x465940, t);
    baseSunIntensity = 2.1 + t * 1.0;
    baseAmbientIntensity = 0.94 + t * 0.28;
  } else if (sunHeightNorm >= -0.18) {
    // Golden Hour / Dawn / Sunset transition
    const t = (sunHeightNorm + 0.18) / 0.43; // 0 at twilight, 1 at low day
    baseSkyTop = lerpColorHex(0x0f172a, 0x3b6cb7, t);
    baseSkyHorizon = lerpColorHex(0x4c1d95, 0xf97316, t);
    baseFogHex = lerpColorHex(0x1e1b4b, 0xea580c, t);
    baseSunHex = lerpColorHex(0xf97316, 0xffb169, t);
    baseGroundHex = lerpColorHex(0x111827, 0x332924, t);
    baseSunIntensity = 0.45 + t * 1.4;
    baseAmbientIntensity = 0.42 + t * 0.4;
  } else {
    // Nighttime under moonlight
    const t = Math.min(1, (-sunHeightNorm - 0.18) / 0.82);
    baseSkyTop = lerpColorHex(0x0f172a, 0x050814, t);
    baseSkyHorizon = lerpColorHex(0x1e293b, 0x0f172a, t);
    baseFogHex = lerpColorHex(0x1e293b, 0x0b1120, t);
    baseSunHex = 0x93c5fd; // Cool moonlight directional tint
    baseGroundHex = 0x090d16;
    baseSunIntensity = 0.42;
    baseAmbientIntensity = 0.36;
  }

  // Blend weather overcast/fog/snow tint into the sky & fog palette
  const weatherOvercastTop =
    weather === 'snowy' ? 0x94a3b8 : weather === 'foggy' ? 0x9ca3af : 0x475569;
  const weatherOvercastHorizon =
    weather === 'snowy' ? 0xcbd5e1 : weather === 'foggy' ? 0xd1d5db : 0x64748b;

  const nightDarkFactor = sunHeightNorm < 0 ? Math.max(0.22, 1 + sunHeightNorm * 0.85) : 1.0;
  const tintedWeatherTop = lerpColorHex(0x090d16, weatherOvercastTop, nightDarkFactor);
  const tintedWeatherHorizon = lerpColorHex(0x111827, weatherOvercastHorizon, nightDarkFactor);

  const skyTopHex = lerpColorHex(baseSkyTop, tintedWeatherTop, skyDarken);
  const skyHorizonHex = lerpColorHex(baseSkyHorizon, tintedWeatherHorizon, skyDarken);
  const fogColorHex = lerpColorHex(baseFogHex, tintedWeatherHorizon, Math.min(1, skyDarken * 1.15));

  const sunIntensity = Number((baseSunIntensity * (1 - skyDarken * 0.52)).toFixed(2));
  const ambientIntensity = Number((baseAmbientIntensity * (1 - skyDarken * 0.25)).toFixed(2));
  const headlightsOn =
    timeOfDayPhase === 'night' ||
    timeOfDayPhase === 'sunset' ||
    weather === 'foggy' ||
    weather === 'rainy' ||
    weather === 'snowy';

  const activeWeatherLabel =
    weatherTransition > 0.5 ? nextWeather : weather;

  return {
    weather: activeWeatherLabel,
    nextWeather,
    weatherTransition,
    weatherControlMode: currentWeatherControlMode,
    dayCycleControlMode: currentDayCycleControlMode,
    gripMultiplier,
    visibilityMultiplier,
    enginePowerMultiplier,
    fogNear,
    fogFar,
    rainIntensity,
    snowIntensity,
    fogDensity,
    roadWetness,
    solarHour,
    timeOfDayPhase,
    timeOfDayLabel: `${timeString} · ${phaseTitle}`,
    sunElevationRad,
    sunAzimuthRad,
    sunIntensity,
    ambientIntensity,
    skyTopHex,
    skyHorizonHex,
    fogColorHex,
    sunColorHex: baseSunHex,
    hemiGroundHex: baseGroundHex,
    headlightsOn,
  };
}

const TIRE_GRIP_TABLE: Record<
  TireCompoundType,
  { asphalt: number; curb: number; dirt: number; sand: number; optimalPsi: number }
> = {
  Street: { asphalt: 0.96, curb: 0.93, dirt: 0.90, sand: 0.87, optimalPsi: 32.0 },
  Sport: { asphalt: 1.08, curb: 1.04, dirt: 1.00, sand: 0.96, optimalPsi: 30.5 },
  SemiSlick: { asphalt: 1.24, curb: 1.18, dirt: 1.10, sand: 1.05, optimalPsi: 29.0 },
  RallyGravel: { asphalt: 1.02, curb: 1.00, dirt: 1.18, sand: 1.14, optimalPsi: 24.0 },
  DriftCompound: { asphalt: 0.86, curb: 0.84, dirt: 0.80, sand: 0.77, optimalPsi: 35.0 },
};

export function evaluateEngineTorqueAtRPM(
  spec: VehicleSpec,
  tune: VehicleTune,
  rpm: number
): { torqueNm: number; powerHP: number; boostMultiplier: number } {
  const clampedRpm = Math.max(spec.idleRPM, Math.min(spec.maxRPM, rpm));
  const norm = (clampedRpm - spec.idleRPM) / (spec.redlineRPM - spec.idleRPM);

  // Base volumetric efficiency curve depending on aspiration
  let shape = 1.0;
  let boostGain = 1.0;

  if (tune.aspiration === 'NA') {
    // High-revving naturally aspirated curve peaking around 78% of redline
    shape = 0.68 + 0.42 * Math.sin(Math.min(1.15, Math.max(0, norm)) * Math.PI * 0.78);
    boostGain = 1.04; // High-flow intake & headers
  } else if (tune.aspiration === 'SingleTurbo') {
    // Big single turbo: lag below 42% RPM, massive top-end surge
    const spool = 1 / (1 + Math.exp(-10 * (norm - 0.44)));
    shape = 0.62 + 0.38 * Math.sin(Math.min(1.1, norm) * Math.PI * 0.75);
    boostGain = 1.0 + tune.boostPressureBar * 0.48 * spool;
  } else if (tune.aspiration === 'TwinTurbo') {
    // Sequential twin-turbo: early spool at 26% RPM, broad plateau
    const spool = 1 / (1 + Math.exp(-11 * (norm - 0.25)));
    shape = 0.72 + 0.32 * Math.sin(Math.min(1.1, norm) * Math.PI * 0.72);
    boostGain = 1.0 + tune.boostPressureBar * 0.44 * spool;
  } else if (tune.aspiration === 'Supercharged') {
    // Instant low-end positive displacement boost
    shape = 0.82 + 0.22 * Math.sin(Math.min(1.1, norm) * Math.PI * 0.68);
    boostGain = 1.0 + tune.boostPressureBar * 0.36 * (0.65 + 0.35 * norm);
  }

  // Drop-off past redline
  let overRevPenalty = 1.0;
  if (clampedRpm > spec.redlineRPM) {
    const overNorm = (clampedRpm - spec.redlineRPM) / Math.max(200, spec.maxRPM - spec.redlineRPM);
    overRevPenalty = Math.max(0.4, 1.0 - overNorm * 0.55);
  }

  // Forza Horizon 5 Engine Component Upgrades (Intake, Exhaust, Camshaft/Valves, Pistons/Displacement)
  const intakeMult = [1.0, 1.035, 1.075, 1.125][tune.engineIntakeStage ?? 0] ?? 1.0;
  const exhaustMult = [1.0, 1.03, 1.068, 1.115][tune.engineExhaustStage ?? 0] ?? 1.0;
  const camMult = [1.0, 1.04, 1.09, 1.155][tune.engineCamshaftStage ?? 0] ?? 1.0;
  const pistonMult = [1.0, 1.045, 1.095, 1.16][tune.enginePistonStage ?? 0] ?? 1.0;
  const engineStageBonus = intakeMult * exhaustMult * camMult * pistonMult;

  const torqueNm = Math.round(
    spec.baseTorqueNm * shape * boostGain * engineStageBonus * overRevPenalty
  );
  // Power (HP) = Torque (Nm) * RPM / 7127
  const powerHP = Math.round((torqueNm * clampedRpm) / 7127);

  return { torqueNm, powerHP, boostMultiplier: boostGain * engineStageBonus };
}

export function computeDynoBenchmark(spec: VehicleSpec, tune: VehicleTune): DynoBenchmark {
  // 1. Calculate Curb Weight (including Exhaust, Brake, and Weight Reduction upgrades)
  const weightReductionFactor = [1.0, 0.94, 0.88, 0.82][tune.weightReductionStage] ?? 1.0;
  const exhaustWeightDeltaKg = [0, -6, -14, -24][tune.engineExhaustStage ?? 0] ?? 0;
  const brakeWeightDeltaKg = [0, -4, -10, -22][tune.brakeStage ?? 0] ?? 0;
  const drivetrainDeltaKg =
    tune.drivetrain === spec.baseDrivetrain
      ? 0
      : tune.drivetrain === 'AWD'
      ? 68
      : -55;
  const aspirationDeltaKg =
    tune.aspiration === 'NA'
      ? -18
      : tune.aspiration === 'TwinTurbo'
      ? 28
      : tune.aspiration === 'SingleTurbo'
      ? 18
      : 24;
  const curbWeightKg = Math.max(
    680,
    Math.round(
      spec.baseMassKg * weightReductionFactor +
        drivetrainDeltaKg +
        aspirationDeltaKg +
        exhaustWeightDeltaKg +
        brakeWeightDeltaKg
    )
  );

  // 2. Build Dyno Curve across RPM range
  const dynoCurve: DynoPoint[] = [];
  let peakPowerHP = 0;
  let peakPowerRPM = spec.idleRPM;
  let peakTorqueNm = 0;
  let peakTorqueRPM = spec.idleRPM;

  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const rpm = Math.round(spec.idleRPM + ((spec.maxRPM - spec.idleRPM) * i) / steps);
    const { torqueNm, powerHP } = evaluateEngineTorqueAtRPM(spec, tune, rpm);
    dynoCurve.push({ rpm, powerHP, torqueNm });
    if (powerHP > peakPowerHP) {
      peakPowerHP = powerHP;
      peakPowerRPM = rpm;
    }
    if (torqueNm > peakTorqueNm) {
      peakTorqueNm = torqueNm;
      peakTorqueRPM = rpm;
    }
  }

  // 3. Calculate Gear Max Speeds
  const tireRadiusM =
    spec.bodyStyle === 'heavy_truck'
      ? 0.52
      : spec.bodyStyle === 'baja_truck'
      ? 0.44
      : spec.bodyStyle === 'suv_4x4'
      ? 0.4
      : 0.34;
  const tireCircumferenceM = 2 * Math.PI * tireRadiusM;
  const gearSpeeds: GearSpeedPoint[] = tune.gearRatios.map((ratio, idx) => {
    const wheelRpmAtRedline = spec.redlineRPM / (ratio * tune.finalDrive);
    const maxSpeedKmh = Math.round(((wheelRpmAtRedline * tireCircumferenceM * 60) / 1000) * 1.12);
    const nextRatio = tune.gearRatios[idx + 1] ?? ratio;
    const shiftDropRPM = Math.round(spec.redlineRPM * (nextRatio / ratio));
    return {
      gear: idx + 1,
      ratio,
      maxSpeedKmh,
      shiftDropRPM,
    };
  });

  // 4. Calculate Top Speed (Calibrated to IRL vehicle top speed + extra high-velocity boost)
  const aeroDragAddon =
    tune.aeroKit === 'HorizonGT' ? 0.055 : tune.aeroKit === 'Street' ? 0.02 : 0.0;
  const downforceDragAddon = (tune.frontDownforceKg + tune.rearDownforceKg) * 0.00014;
  const effectiveCd = spec.dragCoeff + aeroDragAddon + downforceDragAddon;
  const airDensity = 1.225;

  const defaultEval = evaluateEngineTorqueAtRPM(spec, spec.defaultTune, Math.round(spec.redlineRPM * 0.86));
  const defaultPeakHP = Math.max(95, defaultEval.powerHP, spec.basePowerHP);
  const powerRatioVsStock = Math.max(0.65, peakPowerHP / defaultPeakHP);

  const wheelPowerWatts = peakPowerHP * 745.7 * (tune.drivetrain === 'AWD' ? 0.86 : 0.90);
  const aeroLimitedVelocityMs = Math.pow(
    wheelPowerWatts / (0.5 * airDensity * effectiveCd * spec.frontalAreaM2),
    1 / 3
  );
  const physicsAeroTopSpeedKmh = aeroLimitedVelocityMs * 3.6 * 1.12;
  const irlAnchoredAeroTopSpeedKmh = spec.irlTopSpeedKmh
    ? (spec.irlTopSpeedKmh *
        Math.pow(powerRatioVsStock, 0.29) *
        (spec.dragCoeff / Math.max(0.22, effectiveCd)) *
        0.99 +
        physicsAeroTopSpeedKmh * 0.01) *
      1.12
    : physicsAeroTopSpeedKmh;

  const sixthGearMaxKmh = gearSpeeds[gearSpeeds.length - 1]?.maxSpeedKmh ?? 350;
  const topSpeedKmh = Math.round(
    Math.max(140, Math.min(585, Math.min(irlAnchoredAeroTopSpeedKmh, sixthGearMaxKmh * 1.05)))
  );

  // 5. Tire Grip & Pressure Efficiency + Suspension Upgrade Stage
  const compoundInfo = TIRE_GRIP_TABLE[tune.tireCompound];
  const defaultCompoundInfo = TIRE_GRIP_TABLE[spec.defaultTune.tireCompound];
  const avgPsi = (tune.frontTirePressurePSI + tune.rearTirePressurePSI) * 0.5;
  const psiPenalty = Math.max(0.88, 1.0 - Math.abs(avgPsi - compoundInfo.optimalPsi) * 0.012);
  const camberBonus =
    1.0 +
    Math.min(0.05, Math.max(-0.04, (Math.abs(tune.frontCamberDeg + 2.1) < 1.5 ? 0.035 : -0.01)));
  const suspensionGripBonus = [1.0, 1.028, 1.058, 1.095][tune.suspensionStage ?? 0] ?? 1.0;
  const effectiveAsphaltGrip = compoundInfo.asphalt * psiPenalty * camberBonus * suspensionGripBonus;
  const gripRatioVsStock = effectiveAsphaltGrip / Math.max(0.7, defaultCompoundInfo.asphalt);

  // 6. 0-100 km/h and 0-200 km/h acceleration benchmark (Calibrated to IRL 0-100 km/h spec + tuning deltas)
  const powerToWeightHPPerTon = Math.round((peakPowerHP / curbWeightKg) * 1000);
  const stockPowerToWeight = (defaultPeakHP / spec.baseMassKg) * 1000;
  const pwRatioVsStock = Math.max(0.5, powerToWeightHPPerTon / Math.max(50, stockPowerToWeight));

  const drivetrainTractionMult =
    tune.drivetrain === spec.baseDrivetrain
      ? 1.0
      : tune.drivetrain === 'AWD'
      ? 1.12
      : tune.drivetrain === 'RWD'
      ? 0.96
      : 0.86;
  const transmissionShiftBonus = [1.0, 1.03, 1.065, 1.105][tune.transmissionStage ?? 0] ?? 1.0;
  const gearingAccelFactor =
    Math.min(
      1.12,
      Math.max(0.88, tune.finalDrive / Math.max(2.0, spec.defaultTune.finalDrive))
    ) * transmissionShiftBonus;

  const rawPhysics0To100 =
    9.2 /
    Math.pow(
      (powerToWeightHPPerTon / 220) * effectiveAsphaltGrip * drivetrainTractionMult * gearingAccelFactor,
      0.58
    );

  const calibrated0To100 = spec.irlZeroTo100Sec
    ? spec.irlZeroTo100Sec /
      (Math.pow(pwRatioVsStock, 0.54) *
        Math.pow(gripRatioVsStock, 0.34) *
        drivetrainTractionMult *
        Math.pow(gearingAccelFactor, 0.35))
    : rawPhysics0To100;

  const zeroTo100KmhSec = Number(Math.max(1.65, Math.min(14.5, calibrated0To100 * 0.94)).toFixed(2));

  const raw0To200 =
    zeroTo100KmhSec * 2.48 +
    4.2 / Math.pow(Math.max(0.35, powerToWeightHPPerTon / 340), 0.68) +
    effectiveCd * 1.95;
  const zeroTo200KmhSec = Number(Math.max(4.4, Math.min(36.0, raw0To200)).toFixed(2));

  // 7. Braking 100-0 m & Lateral G @ 120 km/h (Calibrated to IRL 100-0m braking spec + brake/tire tuning)
  const totalDownforceAt120 = (tune.frontDownforceKg + tune.rearDownforceKg) * 0.36;
  const downforceGripFactor = 1.0 + totalDownforceAt120 / (curbWeightKg * 2.2);
  const brakeBiasEfficiency =
    1.0 - Math.abs(tune.brakeBiasFrontPct - 54) * 0.006;
  const brakeStageBonus = [1.0, 1.045, 1.095, 1.16][tune.brakeStage ?? 0] ?? 1.0;
  const brakePressureFactor =
    Math.min(
      1.16,
      0.85 + (tune.brakePressurePct / Math.max(70, spec.defaultTune.brakePressurePct)) * 0.15
    ) * brakeStageBonus;
  const weightRatioVsStock = curbWeightKg / Math.max(700, spec.baseMassKg);

  const lateralG120Kmh = Number(
    (effectiveAsphaltGrip * downforceGripFactor * (1380 / Math.max(1150, curbWeightKg * 0.92))).toFixed(2)
  );

  const rawPhysicsBrakingM =
    38.5 /
    (effectiveAsphaltGrip * downforceGripFactor * brakeBiasEfficiency * brakePressureFactor);
  const calibratedBrakingM = spec.irlBraking100To0M
    ? (spec.irlBraking100To0M * Math.pow(weightRatioVsStock, 0.38)) /
      (Math.pow(gripRatioVsStock, 0.62) * brakeBiasEfficiency * brakePressureFactor)
    : rawPhysicsBrakingM;

  const braking100To0M = Number(Math.max(22.5, Math.min(54.0, calibratedBrakingM * 0.96)).toFixed(1));

  // 8. Off-Road Capability Score (out of 100)
  const rideHeightScore = Math.min(40, Math.max(5, (tune.rideHeightMm - 60) * 0.2));
  const softSpringScore = Math.min(25, Math.max(4, (190 - (tune.frontSpringRate + tune.rearSpringRate) * 0.5) * 0.16));
  const tireOffroadScore = compoundInfo.dirt * 32;
  const offroadScore = Math.min(
    99,
    Math.round(rideHeightScore + softSpringScore + tireOffroadScore + (tune.drivetrain === 'AWD' ? 10 : 0))
  );

  // 9. Handling Balance (Understeer vs Oversteer ratio 0..1)
  const rearStiffnessRatio = tune.rearARB / Math.max(1, tune.frontARB + tune.rearARB);
  const springRatio = tune.rearSpringRate / Math.max(1, tune.frontSpringRate + tune.rearSpringRate);
  const aeroFrontRatio =
    tune.frontDownforceKg / Math.max(1, tune.frontDownforceKg + tune.rearDownforceKg);
  const diffOversteerPush =
    (tune.diffAccelLockPct / 100) * (tune.drivetrain === 'RWD' ? 0.18 : 0.08);
  const driftTirePush = tune.tireCompound === 'DriftCompound' ? 0.22 : 0;

  const balanceRatio = Math.max(
    0.05,
    Math.min(
      0.98,
      rearStiffnessRatio * 0.42 +
        springRatio * 0.25 +
        aeroFrontRatio * 0.2 +
        diffOversteerPush +
        driftTirePush
    )
  );

  let handlingBalanceLabel: DynoBenchmark['handlingBalanceLabel'] = 'Balanced Neutral';
  if (balanceRatio > 0.68 || tune.tireCompound === 'DriftCompound') {
    handlingBalanceLabel = 'Drift Angle Spec';
  } else if (balanceRatio > 0.55) {
    handlingBalanceLabel = 'Sport Oversteer';
  } else if (balanceRatio < 0.43) {
    handlingBalanceLabel = 'Understeer';
  }

  // 10. Performance Index (PI Score 350..999)
  const speedComponent = (topSpeedKmh - 210) * 1.35;
  const accelComponent = (6.5 - zeroTo100KmhSec) * 62;
  const gripComponent = (lateralG120Kmh - 0.95) * 260;
  const rawPi = Math.round(520 + speedComponent + accelComponent + gripComponent);
  const piScore = Math.max(350, Math.min(999, rawPi));

  let piClass: PIClass = 'D';
  if (piScore >= 998) piClass = 'X';
  else if (piScore >= 901) piClass = 'S2';
  else if (piScore >= 801) piClass = 'S1';
  else if (piScore >= 701) piClass = 'A';
  else if (piScore >= 601) piClass = 'B';
  else if (piScore >= 501) piClass = 'C';
  else piClass = 'D';

  return {
    peakPowerHP,
    peakPowerRPM,
    peakTorqueNm,
    peakTorqueRPM,
    curbWeightKg,
    powerToWeightHPPerTon,
    piScore,
    piClass,
    zeroTo100KmhSec,
    zeroTo200KmhSec,
    topSpeedKmh,
    braking100To0M,
    lateralG120Kmh,
    offroadScore,
    handlingBalanceLabel,
    balanceRatio,
    dynoCurve,
    gearSpeeds,
  };
}

export function getBiomeAtPosition(x: number, z: number): WorldBiomeType {
  const distFromCenter = Math.hypot(x, z);
  if (distFromCenter < 460) {
    return 'Paris Metropolis';
  }
  const angle = Math.atan2(z, x); // -PI..PI
  // All 4 cardinal directions + 4 diagonals surrounding Paris:
  // East (-PI/8..PI/8): Autobahn Megaport & Skyscraper Corridor
  // SE (PI/8..3PI/8): Mediterranean Riviera & Coastal Cliffs
  // South (3PI/8..5PI/8): Sahara Desert Oasis & Lavender Highlands
  // SW (5PI/8..7PI/8): Sahara Red Canyon & Great Desert Dunes
  // West (|angle| > 7PI/8): Emerald Rainforest & Western Mountain Ridge
  // NW (-7PI/8..-5PI/8): Volcanic Caldera & Basalt Peaks
  // North (-5PI/8..-3PI/8): Alpine Glacier & Northern Mountain Pass
  // NE (-3PI/8..-PI/8): Alpine Glacier & Mont Blanc Summit
  if (angle >= -Math.PI / 8 && angle < Math.PI / 8) {
    return 'Autobahn Megaport';
  }
  if (angle >= Math.PI / 8 && angle < (3 * Math.PI) / 8) {
    return 'Mediterranean Riviera';
  }
  if (angle >= (3 * Math.PI) / 8 && angle < (5 * Math.PI) / 8) {
    return z > 3600 && Math.abs(x) < 1200 ? 'Lavender Highlands' : 'Sahara Red Canyon';
  }
  if (angle >= (5 * Math.PI) / 8 && angle < (7 * Math.PI) / 8) {
    return 'Sahara Red Canyon';
  }
  if (angle >= (7 * Math.PI) / 8 || angle < -(7 * Math.PI) / 8) {
    return 'Emerald Rainforest';
  }
  if (angle >= -(7 * Math.PI) / 8 && angle < -(5 * Math.PI) / 8) {
    return 'Volcanic Caldera';
  }
  return 'Alpine Glacier';
}

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

// ============================================================================
// MAIN WINDING RIVER, BRIDGES, OPEN FIELDS & 450+ ROAD NETWORK DEFINITIONS
// ============================================================================

/** Major N-S & E-W Boulevard grid coordinates (48x48 = 2,304 intersections, 96 major boulevards) */
export const MAJOR_GRID_COORDS = [
  -5800, -5400, -5000, -4600, -4200, -3900, -3600, -3400, -3200, -3000, -2800, -2600, -2400,
  -2200, -2000, -1800, -1600, -1400, -1200, -1000, -800, -600, -360, -180,
  180, 360, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000, 3200,
  3400, 3600, 3900, 4200, 4600, 5000, 5400, 5800,
];

/** Dense urban & country side-street grid coordinates (40x40 = 1,600 intersections, 80 side streets) */
export const SMALL_STREET_COORDS = [
  -4800, -4400, -4050, -3750, -3500, -3300, -3100, -2900, -2700, -2500, -2300, -2100, -1900,
  -1700, -1500, -1300, -1100, -900, -700, -480,
  480, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500, 2700, 2900, 3100, 3300, 3500,
  3750, 4050, 4400, 4800,
];

/** Dense Woodland & Forest Small Road Grid filling the Western Forest Biome (x ∈ [-5800, -600], z ∈ [-3800, 3800]) */
export const FOREST_SMALL_ROAD_X_COORDS = [
  -5600, -5200, -4900, -4700, -4500, -4300, -4120, -3975, -3825, -3675, -3450, -3250, -3050,
  -2850, -2650, -2450, -2250, -2050, -1850, -1650, -1450, -1250, -1050, -850, -680,
];
export const FOREST_SMALL_ROAD_Z_COORDS = [
  -3700, -3450, -3250, -3050, -2850, -2650, -2450, -2250, -2050, -1850, -1650, -1450, -1250,
  -1050, -850, -680, -520, -280, -95, 95, 280, 520, 680, 850, 1050, 1250, 1450, 1650, 1850,
  2050, 2250, 2450, 2650, 2850, 3050, 3250, 3450, 3700,
];

/** Z-coordinates where ornate bridges carry all East-West roads, Diagonal Highways & Ring Roads across the Main River */
export const RIVER_BRIDGE_Z_COORDS = [
  -5800, -5400, -5000, -4800, -4600, -4400, -4200, -4050, -3900, -3750, -3600, -3500, -3400,
  -3300, -3200, -3100, -3000, -2900, -2800, -2700, -2600, -2500, -2400, -2300, -2200, -2100,
  -2000, -1900, -1800, -1700, -1600, -1500, -1400, -1300, -1200, -1100, -1000, -900, -800, -700,
  -600, -480, -360, -250, -180, -88,
  0,
  88, 180, 250, 360, 480, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800,
  1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400,
  3500, 3600, 3750, 3900, 4050, 4200, 4400, 4600, 4800, 5000, 5400, 5800,
];

export interface ElevatedFlyoverSpec {
  id: string;
  name: string;
  axis: 'x' | 'z'; // 'x' runs East-West along constant z; 'z' runs North-South along constant x
  fixedCoord: number; // z if axis === 'x', x if axis === 'z'
  startCoord: number; // start of ramp
  endCoord: number; // end of ramp
  rampLength: number; // length of inclined entry/exit ramp at each end
  deckHeight: number; // peak elevation in meters
  halfWidth: number; // half-width of elevated highway deck
}

/**
 * 8 Elevated Highway Flyovers & Viaducts placed strictly OUTSIDE the crowded main city center (|coord| >= 1400m)
 * so players can soar over outer intersections on multi-level highway overpasses.
 */
export const WORLD_ELEVATED_FLYOVERS: ElevatedFlyoverSpec[] = [
  // 1. Eastern Autobahn Skyway Viaduct (runs E-W at z = -1400 from x = 1350 to x = 3450)
  {
    id: 'flyover_east_autobahn_n',
    name: 'Autobahn Skyway Overpass North',
    axis: 'x',
    fixedCoord: -1400,
    startCoord: 1350,
    endCoord: 3450,
    rampLength: 320,
    deckHeight: 10.5,
    halfWidth: 13.5,
  },
  // 2. Eastern Megaport Express Viaduct (runs E-W at z = 1400 from x = 1350 to x = 3450)
  {
    id: 'flyover_east_megaport_s',
    name: 'Megaport Elevated Expressway',
    axis: 'x',
    fixedCoord: 1400,
    startCoord: 1350,
    endCoord: 3450,
    rampLength: 320,
    deckHeight: 10.5,
    halfWidth: 13.5,
  },
  // 3. Western Sequoia Ridge Flyover (runs E-W at z = -1400 from x = -3450 to x = -1350)
  {
    id: 'flyover_west_ridge_n',
    name: 'Western Ridge Elevated Viaduct',
    axis: 'x',
    fixedCoord: -1400,
    startCoord: -3450,
    endCoord: -1350,
    rampLength: 320,
    deckHeight: 10.5,
    halfWidth: 13.5,
  },
  // 4. Southwestern Canyon Overpass (runs E-W at z = 1400 from x = -3450 to x = -1350)
  {
    id: 'flyover_west_canyon_s',
    name: 'Red Canyon Highway Flyover',
    axis: 'x',
    fixedCoord: 1400,
    startCoord: -3450,
    endCoord: -1350,
    rampLength: 320,
    deckHeight: 10.5,
    halfWidth: 13.5,
  },
  // 5. Northern Alpine Foothills Flyover (runs N-S at x = 1800 from z = -3850 to z = -1550)
  {
    id: 'flyover_north_alpine_e',
    name: 'Alpine Foothills High Viaduct',
    axis: 'z',
    fixedCoord: 1800,
    startCoord: -3850,
    endCoord: -1550,
    rampLength: 320,
    deckHeight: 11.5,
    halfWidth: 13.5,
  },
  // 6. Northwestern Caldera Approach Flyover (runs N-S at x = -1800 from z = -3850 to z = -1550)
  {
    id: 'flyover_north_caldera_w',
    name: 'Caldera Approach Elevated Highway',
    axis: 'z',
    fixedCoord: -1800,
    startCoord: -3850,
    endCoord: -1550,
    rampLength: 320,
    deckHeight: 11.5,
    halfWidth: 13.5,
  },
  // 7. Southeastern Riviera Coastal Flyover (runs N-S at x = 1800 from z = 1550 to z = 3850)
  {
    id: 'flyover_south_riviera_e',
    name: 'Côte d’Azur Coastal Skyway',
    axis: 'z',
    fixedCoord: 1800,
    startCoord: 1550,
    endCoord: 3850,
    rampLength: 320,
    deckHeight: 11.0,
    halfWidth: 13.5,
  },
  // 8. Southern Sahara Oasis Flyover (runs N-S at x = -1800 from z = 1550 to z = 3850)
  {
    id: 'flyover_south_sahara_w',
    name: 'Sahara Oasis Elevated Overpass',
    axis: 'z',
    fixedCoord: -1800,
    startCoord: 1550,
    endCoord: 3850,
    rampLength: 320,
    deckHeight: 11.0,
    halfWidth: 13.5,
  },
];

export function evaluateFlyoverElevation(x: number, z: number): {
  onFlyover: boolean;
  heightY: number;
  flyoverName?: string;
} {
  for (let i = 0; i < WORLD_ELEVATED_FLYOVERS.length; i++) {
    const f = WORLD_ELEVATED_FLYOVERS[i];
    const lateralDist = f.axis === 'x' ? Math.abs(z - f.fixedCoord) : Math.abs(x - f.fixedCoord);
    // Include +2.8m margin so outer wheel terrain probes always sample the elevated deck height
    if (lateralDist > f.halfWidth + 2.8) continue;
    const along = f.axis === 'x' ? x : z;
    if (along < f.startCoord || along > f.endCoord) continue;

    const distFromStart = along - f.startCoord;
    const distFromEnd = f.endCoord - along;
    const rampEdgeDist = Math.min(distFromStart, distFromEnd);
    const rampT = Math.max(0, Math.min(1, rampEdgeDist / f.rampLength));
    // Smooth cosine ramp profile so cars transition onto and off the flyover with zero jarring seam
    const smoothRamp = 0.5 - 0.5 * Math.cos(rampT * Math.PI);
    return {
      onFlyover: true,
      heightY: f.deckHeight * smoothRamp,
      flyoverName: f.name,
    };
  }
  return { onFlyover: false, heightY: 0 };
}

/**
 * Centerline X coordinate of the Grand Main River flowing North-to-South (-6200m to +6200m).
 * Flows gracefully along the dedicated channel x ∈ [72, 104] between the x = 0 Champs-Élysées highway
 * and the x = 180 Boulevard so it NEVER overlaps any N-S road or landmark!
 */
export function getMainRiverCenterX(z: number): number {
  return 88 + Math.sin(z * 0.0016) * 10 + Math.cos(z * 0.0007) * 6;
}

/**
 * Checks if (x, z) is inside one of the curated Scenic Open Fields & Meadows
 * (kept free of buildings for wide-open sightlines and pastoral beauty).
 */
export function isPointInOpenField(x: number, z: number): boolean {
  // Compact Champ de Mars Lawn immediately surrounding Tour Eiffel (-95, 95)
  if (x > -135 && x < -55 && z > 55 && z < 135) return true;
  return false;
}

/**
 * Computes minimum distance from (x, z) to the nearest road centerline across all:
 * - Big Superhighways (N-S, E-W, Diagonals outside r >= 265m)
 * - 6 Concentric Ring Highways (265m, 900m, 1800m, 3000m, 4200m, 5400m)
 * - 96 Major Grid Boulevards (MAJOR_GRID_COORDS)
 * - 80 Small Side Streets & Country Lanes (SMALL_STREET_COORDS)
 * - Scenic Riverbank Quayside Roads flanking the Main River
 */
export function getRoadNetworkDistance(x: number, z: number): {
  minDist: number;
  roadCategory: 'highway' | 'boulevard' | 'small_road' | 'none';
} {
  const distFromCenter = Math.hypot(x, z);

  // 1. Big Highways & 6 Concentric Ring Highways (Diagonals start at the r=265m Inner Ring)
  const dNorthSouth = Math.abs(z) < 7650 ? Math.abs(x) : 9999;
  const dEastWest = Math.abs(x) < 7650 ? Math.abs(z) : 9999;
  const dDiag1 = distFromCenter >= 265 && distFromCenter < 6850 ? Math.abs(x - z) * 0.7071 : 9999;
  const dDiag2 = distFromCenter >= 265 && distFromCenter < 6850 ? Math.abs(x + z) * 0.7071 : 9999;
  const dInnerRing = Math.abs(distFromCenter - 265);
  const dMetroRing = Math.abs(distFromCenter - 900);
  const dMidRing = Math.abs(distFromCenter - 1800);
  const dSuburbanRing = Math.abs(distFromCenter - 3000);
  const dOuterRing = Math.abs(distFromCenter - 4200);
  const dContinentalRing = Math.abs(distFromCenter - 5400);
  const dCentralPlaza = Math.max(0, distFromCenter - 46);

  const highwayDist = Math.min(
    dNorthSouth,
    dEastWest,
    dDiag1,
    dDiag2,
    dInnerRing,
    dMetroRing,
    dMidRing,
    dSuburbanRing,
    dOuterRing,
    dContinentalRing,
    dCentralPlaza
  );

  // 2. Medium District Boulevards (within [-5950, +5950])
  let boulevardDist = 9999;
  if (Math.abs(x) <= 5950 && Math.abs(z) <= 5950) {
    for (let i = 0; i < MAJOR_GRID_COORDS.length; i++) {
      const c = MAJOR_GRID_COORDS[i];
      const dx = Math.abs(x - c);
      const dz = Math.abs(z - c);
      if (dx < boulevardDist) boulevardDist = dx;
      if (dz < boulevardDist) boulevardDist = dz;
    }
  }

  // 3. Small Side Streets, Dense Forest Woodland Lanes & Riverbank Quayside Roads
  let smallRoadDist = 9999;
  if (Math.abs(x) <= 4950 && Math.abs(z) <= 4950) {
    for (let i = 0; i < SMALL_STREET_COORDS.length; i++) {
      const c = SMALL_STREET_COORDS[i];
      const dx = Math.abs(x - c);
      const dz = Math.abs(z - c);
      if (dx < smallRoadDist) smallRoadDist = dx;
      if (dz < smallRoadDist) smallRoadDist = dz;
    }
  }
  // Dense Western Forest Small Roads (x ∈ [-5850, -600], z ∈ [-3900, 3900])
  if (x >= -5850 && x <= -600 && Math.abs(z) <= 3900) {
    for (let i = 0; i < FOREST_SMALL_ROAD_X_COORDS.length; i++) {
      const dx = Math.abs(x - FOREST_SMALL_ROAD_X_COORDS[i]);
      if (dx < smallRoadDist) smallRoadDist = dx;
    }
    for (let i = 0; i < FOREST_SMALL_ROAD_Z_COORDS.length; i++) {
      const dz = Math.abs(z - FOREST_SMALL_ROAD_Z_COORDS[i]);
      if (dz < smallRoadDist) smallRoadDist = dz;
    }
  }
  // Riverbank Quayside Roads running parallel to the Main River on both banks (offset ±27m from river center)
  if (Math.abs(z) <= 5850) {
    const riverX = getMainRiverCenterX(z);
    const dWestQuay = Math.abs(x - (riverX - 27));
    const dEastQuay = Math.abs(x - (riverX + 27));
    smallRoadDist = Math.min(smallRoadDist, dWestQuay, dEastQuay);
  }

  const minDist = Math.min(highwayDist, boulevardDist, smallRoadDist);
  let roadCategory: 'highway' | 'boulevard' | 'small_road' | 'none' = 'none';
  if (highwayDist <= 19) {
    roadCategory = 'highway';
  } else if (boulevardDist <= 11) {
    roadCategory = 'boulevard';
  } else if (smallRoadDist <= 7.5) {
    roadCategory = 'small_road';
  }

  return { minDist, roadCategory };
}

/**
 * Pure continuous terrain elevation (excluding stunt ramps) used identically by both
 * the 3D terrain mesh vertex generator AND the physics triangle-height sampler.
 * Smoothly flattens to 0 across all highways, boulevards, small streets, open fields, and the Main River.
 */
export function evaluateRawTerrainElevation(x: number, z: number): number {
  const distFromCenter = Math.hypot(x, z);
  const biome = getBiomeAtPosition(x, z);

  const { minDist: minRoadDist } = getRoadNetworkDistance(x, z);
  const riverDist = Math.abs(z) < 6200 ? Math.abs(x - getMainRiverCenterX(z)) : 9999;

  // Keep terrain strictly at y = 0 across the entire urbanized road grid (within 2650m),
  // near any road/river (120m buffer so 80m terrain cells never overlap road edges), or inside open fields.
  if (
    distFromCenter < 2650 ||
    minRoadDist < 120 ||
    riverDist < 90 ||
    isPointInOpenField(x, z)
  ) {
    return 0;
  }

  const roadClearance = smoothstep01((minRoadDist - 120) / 95);
  const riverClearance = smoothstep01((riverDist - 90) / 75);
  const urbanClearance = smoothstep01((distFromCenter - 2650) / 450);
  const totalClearance = roadClearance * riverClearance * urbanClearance;
  if (totalClearance <= 0.0001) {
    return 0;
  }

  const dome1 = (1 + Math.sin(x * 0.0045) * Math.cos(z * 0.0045)) * 0.5;
  const dome2 = (1 + Math.sin((x + z) * 0.0065)) * 0.5;
  const duneRipple = (1 + Math.sin((x - z * 0.7) * 0.012)) * 0.5;

  let wave = 0;
  if (biome === 'Alpine Glacier') {
    wave = dome1 * 26.0 + dome2 * 11.0 + 3.0;
  } else if (biome === 'Sahara Red Canyon') {
    wave = dome1 * 14.0 + duneRipple * 6.0 + 2.0;
  } else if (biome === 'Volcanic Caldera') {
    wave = dome1 * 28.0 + dome2 * 10.0 + 3.5;
  } else if (biome === 'Mediterranean Riviera') {
    wave = dome1 * 10.0 + dome2 * 4.0 + 1.2;
  } else if (biome === 'Emerald Rainforest') {
    wave = dome1 * 15.0 + dome2 * 6.0 + 2.0;
  } else if (biome === 'Lavender Highlands') {
    wave = dome1 * 10.0 + dome2 * 4.0 + 1.5;
  } else {
    wave = dome1 * 3.5;
  }

  return Math.max(0, wave * totalClearance);
}

/**
 * Computes the exact barycentric triangle-interpolated terrain height matching Three.js PlaneGeometry
 * so the vehicle physics ground height is 100% aligned with the rendered 3D sand/mountain mesh triangles.
 */
function sampleMeshAlignedElevation(x: number, z: number): number {
  const isInnerMesh = Math.abs(x) <= 760 && Math.abs(z) <= 760;
  const halfSpan = isInnerMesh ? 800 : 8000;
  const segments = isInnerMesh ? 160 : 200;
  const cellSize = (halfSpan * 2) / segments;

  const gx = Math.max(0, Math.min(segments - 0.0001, (x + halfSpan) / cellSize));
  const gz = Math.max(0, Math.min(segments - 0.0001, (z + halfSpan) / cellSize));
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;

  const x0 = -halfSpan + ix * cellSize;
  const x1 = x0 + cellSize;
  const z0 = -halfSpan + iz * cellSize;
  const z1 = z0 + cellSize;

  const y00 = evaluateRawTerrainElevation(x0, z0);
  const y10 = evaluateRawTerrainElevation(x1, z0);
  const y01 = evaluateRawTerrainElevation(x0, z1);
  const y11 = evaluateRawTerrainElevation(x1, z1);

  // PlaneGeometry splits each cell along (1,0)-(0,1)
  const triA = y00 + fx * (y10 - y00) + fz * (y01 - y00);
  const triB = y11 + (1 - fx) * (y01 - y11) + (1 - fz) * (y10 - y11);
  const triActual = fx + fz <= 1 ? triA : triB;
  const rawExact = evaluateRawTerrainElevation(x, z);

  // Take the maximum of the exact triangle surface and raw elevation so the car NEVER dips beneath any sand or mountain face
  return Math.max(0, triActual, Math.max(triA, triB), rawExact);
}

// World terrain height & surface query at (x, z) across the 16km x 16km 8-Biome Open World
// When referenceY is provided, a car driving on the ground (referenceY < flyoverDeck - 2.6m) passes smoothly UNDER elevated highways!
export function sampleWorldTerrain(
  x: number,
  z: number,
  referenceY?: number
): {
  heightY: number;
  surface: SurfaceType;
  zoneName: string;
  biome: WorldBiomeType;
} {
  const distFromCenter = Math.hypot(x, z);
  const biome = getBiomeAtPosition(x, z);

  const { minDist, roadCategory } = getRoadNetworkDistance(x, z);
  const onAnyAsphaltRoad = roadCategory !== 'none';

  // Jump ramps in Paris & Biomes
  let rampHeight = 0;
  // Bois de Boulogne Jump Ramp at (-210, 210)
  const dxJump = x - -210;
  const dzJump = z - 210;
  if (Math.abs(dxJump) < 14 && dzJump > -18 && dzJump < 18) {
    const rampProgress = (18 - dzJump) / 36;
    if (rampProgress > 0 && rampProgress <= 1) {
      rampHeight = Math.max(rampHeight, Math.pow(rampProgress, 1.5) * 5.2);
    }
  }

  // Paris Stunt Ramp at (28, -95)
  if (Math.abs(x - 28) < 9 && z > -115 && z < -80) {
    const p = (-80 - z) / 35;
    if (p > 0 && p <= 1) {
      rampHeight = Math.max(rampHeight, Math.pow(p, 1.4) * 3.8);
    }
  }

  // Gentle arched bridge crown when driving over any of the Main River Bridges
  const riverCenterX = getMainRiverCenterX(z);
  const distFromRiverCenter = Math.abs(x - riverCenterX);
  if (distFromRiverCenter < 24) {
    for (let i = 0; i < RIVER_BRIDGE_Z_COORDS.length; i++) {
      const bz = RIVER_BRIDGE_Z_COORDS[i];
      if (Math.abs(z - bz) < 15) {
        const spanNorm = 1 - distFromRiverCenter / 24;
        rampHeight = Math.max(rampHeight, Math.sin(spanNorm * Math.PI) * 0.95);
        break;
      }
    }
  }

  // Elevated Highway Flyover check (outside main city center)
  // If referenceY is provided and the car is on the ground below the elevated span (referenceY < deckHeight - 2.6m),
  // let the car pass freely UNDERNEATH the elevated highway at ground level!
  const flyoverInfo = evaluateFlyoverElevation(x, z);
  const isDrivingOnFlyoverDeck =
    flyoverInfo.onFlyover &&
    flyoverInfo.heightY > 0.05 &&
    (referenceY === undefined ||
      flyoverInfo.heightY < 2.6 ||
      referenceY >= flyoverInfo.heightY - 2.6);
  if (isDrivingOnFlyoverDeck) {
    rampHeight = Math.max(rampHeight, flyoverInfo.heightY);
  }

  // Off-road rally moguls, washboard ruts & bumps when off paved roads
  let offRoadBumpHeight = 0;
  if (!onAnyAsphaltRoad && !isDrivingOnFlyoverDeck && minDist > 18 && distFromCenter > 290) {
    const bumpEnv = Math.min(1, (minDist - 18) / 24);
    const waveA = Math.sin(x * 0.11 + z * 0.07) * Math.cos(z * 0.13 - x * 0.05);
    const waveB = Math.sin(x * 0.24 - z * 0.19) * 0.45;
    offRoadBumpHeight = Math.max(0, (waveA * 0.42 + waveB * 0.28 + 0.22) * bumpEnv);
  }

  // Guarantee 100% smooth 0m base elevation on and near all roads and river banks to eliminate any triangle seam bounce
  const baseElevation =
    minDist < 36 || distFromRiverCenter < 48 || distFromCenter < 2650
      ? 0
      : sampleMeshAlignedElevation(x, z);
  const heightY = Math.max(0, baseElevation + rampHeight + offRoadBumpHeight);

  // Determine Surface Type by Road, Flyover, Open Field & Biome
  let surface: SurfaceType = 'Asphalt';
  if (onAnyAsphaltRoad || isDrivingOnFlyoverDeck) {
    surface = 'Asphalt';
  } else if (minDist < 14) {
    surface = 'Curb';
  } else if (isPointInOpenField(x, z)) {
    surface = 'Dirt';
  } else if (biome === 'Alpine Glacier') {
    surface = 'Snow';
  } else if (biome === 'Sahara Red Canyon') {
    surface = 'Sand';
  } else if (biome === 'Volcanic Caldera' || biome === 'Lavender Highlands') {
    surface = 'Gravel';
  } else {
    surface = 'Dirt';
  }

  // Determine Zone Name
  let zoneName = "Place de l'Étoile · Arc de Triomphe";
  if (isPointInOpenField(x, z)) {
    zoneName = 'Grand River Meadow & Scenic Open Field';
  } else if (distFromRiverCenter < 36 && Math.abs(z) < 4500) {
    zoneName = 'Grand River Quayside & Arch Bridges';
  } else if (biome === 'Paris Metropolis') {
    if (distFromCenter < 95) {
      zoneName = "Place de l'Étoile · Arc de Triomphe";
    } else if (Math.abs(x) < 35 && Math.abs(z) > 95) {
      zoneName = 'Avenue des Champs-Élysées · Paris';
    } else if (x >= 180 && z <= 50) {
      zoneName = 'Boulevard Périphérique & Le Louvre';
    } else if (x < -40 && z < -40) {
      zoneName = 'Montmartre & Sacré-Cœur · Paris';
    } else if (x < -40 && z > 40) {
      zoneName = 'Tour Eiffel & Champ de Mars · Paris';
    } else {
      zoneName = 'Quai de la Seine & Grand Bridges';
    }
  } else if (biome === 'Alpine Glacier') {
    zoneName = 'Alpine Mountains & Chamonix Glacier Peaks';
  } else if (biome === 'Sahara Red Canyon') {
    zoneName = 'Sahara Desert Dunes, Pyramids & Red Canyon';
  } else if (biome === 'Mediterranean Riviera') {
    zoneName = 'Côte d’Azur · Mediterranean Riviera & Cliffs';
  } else if (biome === 'Volcanic Caldera') {
    zoneName = 'La Gran Caldera · Volcanic Mountain Peaks';
  } else if (biome === 'Emerald Rainforest') {
    zoneName = 'Western Mountain Ridge & Giant Redwood Valley';
  } else if (biome === 'Lavender Highlands') {
    zoneName = 'Provence Highlands & Southern Châteaux';
  } else {
    zoneName = 'Eastern Skyscraper Metropolis & Autobahn Megaport';
  }

  return { heightY, surface, zoneName, biome };
}

// ============================================================================
// HUNDREDS OF PROCEDURAL BUILDINGS & SOLID WORLD COLLIDERS ACROSS THE MAP
// ============================================================================
export interface WorldBoxCollider {
  id: string;
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

export interface WorldCylinderCollider {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface ProceduralBuildingSpec {
  id: string;
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  style: 'haussmann' | 'skyscraper' | 'alpine_chalet' | 'desert_kasbah' | 'modern_midrise';
  tintHex: number;
  roofHex: number;
}

/**
 * Checks whether a rectangular building footprint centered at (bx, bz) with size (width, depth)
 * is 100% clear of every road, ring road, diagonal highway, small street, and the Main River.
 */
function isBuildingFootprintClearOfRoadsAndRiver(
  bx: number,
  bz: number,
  width: number,
  depth: number
): boolean {
  const hw = width * 0.5 + 14;
  const hd = depth * 0.5 + 14;
  const offsets: [number, number][] = [
    [0, 0],
    [-hw, -hd],
    [hw, -hd],
    [-hw, hd],
    [hw, hd],
    [-hw, 0],
    [hw, 0],
    [0, -hd],
    [0, hd],
  ];

  for (let i = 0; i < offsets.length; i++) {
    const px = bx + offsets[i][0];
    const pz = bz + offsets[i][1];
    const { minDist, roadCategory } = getRoadNetworkDistance(px, pz);
    if (roadCategory !== 'none' || minDist < 27.5) {
      return false;
    }
    if (Math.abs(px - getMainRiverCenterX(pz)) < 46) {
      return false;
    }
  }
  return true;
}

export const WORLD_PROCEDURAL_BUILDINGS: ProceduralBuildingSpec[] = (() => {
  const list: ProceduralBuildingSpec[] = [];

  // Generate over 1,200+ buildings across city blocks, avenues, and biome districts ([-5550..+5550])
  // Eliminates empty flat roaming grounds while strictly validating every footprint so NO building EVER touches any road or river!
  const blockCenters: number[] = [
    -5550, -5200, -4700, -4500, -4300, -4125, -3975, -3825, -3675, -3550, -3450, -3350, -3250,
    -3150, -3050, -2950, -2850, -2750, -2650, -2550, -2450, -2350, -2250, -2150, -2050, -1950,
    -1850, -1750, -1650, -1550, -1450, -1350, -1250, -1150, -1050, -950, -850, -750, -650, -540,
    -420, -315, -220, -105,
    105, 220, 315, 420, 540, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750,
    1850, 1950, 2050, 2150, 2250, 2350, 2450, 2550, 2650, 2750, 2850, 2950, 3050, 3150, 3250,
    3350, 3450, 3550, 3675, 3825, 3975, 4125, 4300, 4500, 4700, 5200, 5550,
  ];

  let idx = 0;
  for (let ix = 0; ix < blockCenters.length; ix++) {
    const bx = blockCenters[ix];
    for (let iz = 0; iz < blockCenters.length; iz++) {
      const bz = blockCenters[iz];
      const dist = Math.hypot(bx, bz);

      // Keep central Étoile plaza & landmarks clear
      if (dist < 115) continue;
      // Keep Eiffel Tower (-245, 245), Louvre (245, -245), Sacré-Cœur (-245, -245) & Concorde (-48, 245) clear
      if (Math.hypot(bx - -245, bz - 245) < 82) continue;
      if (Math.hypot(bx - 245, bz - -245) < 85) continue;
      if (Math.hypot(bx - -245, bz - -245) < 78) continue;
      if (Math.hypot(bx - -48, bz - 245) < 52) continue;
      if (Math.hypot(bx - -315, bz - -270) < 65) continue;
      if (Math.hypot(bx - 540, bz - -1150) < 70) continue;
      // Keep Desert Pyramids footprints clear
      if (Math.hypot(bx - -520, bz - 1250) < 135) continue;
      if (Math.hypot(bx - 540, bz - 2250) < 155) continue;
      if (Math.hypot(bx - -2950, bz - 3250) < 165) continue;

      // Keep Open Fields & Scenic Meadows 100% open!
      if (isPointInOpenField(bx, bz)) continue;

      // Deterministic pseudo-random variation per block
      const hash = Math.abs(Math.sin(bx * 12.9898 + bz * 78.233) * 43758.5453);
      const frac = hash - Math.floor(hash);

      // Leave ~18% of outer blocks as breathing pocket plazas
      if (dist > 950 && frac < 0.18) continue;

      const width = 20 + Math.round((frac * 12) % 12);
      const depth = 20 + Math.round(((frac * 37) % 12));

      // Verify all 9 footprint points (center, 4 corners, 4 edges) are completely clear of all roads & the river
      if (!isBuildingFootprintClearOfRoadsAndRiver(bx, bz, width, depth)) continue;

      const biome = getBiomeAtPosition(bx, bz);
      let style: ProceduralBuildingSpec['style'] = 'haussmann';
      let height = 18 + Math.round((frac * 16) % 14);
      let tintHex = 0xe7decd;
      let roofHex = 0x334155;

      if (dist < 680) {
        style = 'haussmann';
        height = 17 + Math.round((frac * 12) % 11);
        tintHex = idx % 2 === 0 ? 0xe7decd : 0xdcd2c0;
        roofHex = 0x334155;
      } else if (biome === 'Autobahn Megaport' || biome === 'Mediterranean Riviera') {
        style = frac > 0.32 ? 'skyscraper' : 'modern_midrise';
        height = style === 'skyscraper' ? 48 + Math.round((frac * 78) % 68) : 26 + Math.round((frac * 24) % 20);
        tintHex = idx % 3 === 0 ? 0x0ea5e9 : idx % 3 === 1 ? 0x38bdf8 : 0x64748b;
        roofHex = 0x0f172a;
      } else if (biome === 'Alpine Glacier') {
        style = 'alpine_chalet';
        height = 15 + Math.round((frac * 14) % 12);
        tintHex = 0xd6cbb9;
        roofHex = 0xf1f5f9;
      } else if (biome === 'Sahara Red Canyon' || biome === 'Lavender Highlands') {
        style = 'desert_kasbah';
        height = 16 + Math.round((frac * 18) % 15);
        tintHex = biome === 'Lavender Highlands' ? 0xe2d5c4 : 0xd97706;
        roofHex = 0xb45309;
      } else {
        style = frac > 0.55 ? 'modern_midrise' : 'haussmann';
        height = 20 + Math.round((frac * 26) % 24);
        tintHex = 0xcbd5e1;
        roofHex = 0x1e293b;
      }

      list.push({
        id: `proc_bldg_${idx++}`,
        x: bx,
        z: bz,
        width,
        height,
        depth,
        style,
        tintHex,
        roofHex,
      });
    }
  }

  return list;
})();

export interface RoamingTrafficCarState {
  id: string;
  vehicleId: string;
  paintHex: string;
  rimHex: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  speedKmh: number;
}

const WORLD_BOX_COLLIDERS: WorldBoxCollider[] = (() => {
  const boxes: WorldBoxCollider[] = [
    // 1. Arc de Triomphe 4 Corner Limestone Piers at (0, 0) (Matches 10x10m pier bases!)
    // Both North-South (x = 0) and East-West (z = 0) 25m central archways are 100% open!
    { id: 'arc_pier_nw', x: -17.5, z: -17.5, halfW: 5.1, halfD: 5.1 },
    { id: 'arc_pier_ne', x: 17.5, z: -17.5, halfW: 5.1, halfD: 5.1 },
    { id: 'arc_pier_sw', x: -17.5, z: 17.5, halfW: 5.1, halfD: 5.1 },
    { id: 'arc_pier_se', x: 17.5, z: 17.5, halfW: 5.1, halfD: 5.1 },

    // 2. Tour Eiffel 4 Iron Base Pylon Legs at (-245, 245) on Champ de Mars Lawn (Synced 1:1 with WorldSceneCanvas!)
    { id: 'eiffel_leg_nw', x: -245 - 18.0, z: 245 - 18.0, halfW: 5.2, halfD: 5.2 },
    { id: 'eiffel_leg_ne', x: -245 + 18.0, z: 245 - 18.0, halfW: 5.2, halfD: 5.2 },
    { id: 'eiffel_leg_sw', x: -245 - 18.0, z: 245 + 18.0, halfW: 5.2, halfD: 5.2 },
    { id: 'eiffel_leg_se', x: -245 + 18.0, z: 245 + 18.0, halfW: 5.2, halfD: 5.2 },

    // 3. Le Louvre Glass Pyramid & Classical Palace Wings at (245, -245) (Synced 1:1 with WorldSceneCanvas!)
    { id: 'louvre_pyramid', x: 245, z: -245, halfW: 16.0, halfD: 16.0 },
    { id: 'louvre_wing_north', x: 245, z: -245 - 26, halfW: 22.5, halfD: 6.5 },
    { id: 'louvre_wing_east', x: 245 + 26, z: -245, halfW: 6.5, halfD: 22.5 },

    // 4. Place de la Concorde Luxor Obelisk Base at (-48, 245) (Synced 1:1 with WorldSceneCanvas!)
    { id: 'concorde_obelisk', x: -48, z: 245, halfW: 3.2, halfD: 3.2 },

    // 5. Montmartre Sacré-Cœur Basilica at (-245, -245) (Synced 1:1 with WorldSceneCanvas!)
    { id: 'sacre_coeur_basilica', x: -245, z: -245, halfW: 17.5, halfD: 13.5 },
  ];

  // 6. Hero Haussmannian Parisian Apartment Blocks along Champs-Élysées (All 8 rendered at [-138, -48, 48, 138] x [-48, 38]!)
  [-138, -48, 48, 138].forEach((zPos) => {
    [-48, 38].forEach((xSide) => {
      boxes.push({
        id: `haussmann_${xSide}_${zPos}`,
        x: xSide,
        z: zPos,
        halfW: 10.5,
        halfD: 13.5,
      });
    });
  });

  // 6B. River Bridge North & South Stone Balustrade Parapets & Corner Pylons (Widened to ±24.5m so full race pathways fit inside!)
  RIVER_BRIDGE_Z_COORDS.forEach((bz) => {
    const rx = getMainRiverCenterX(bz);
    [-24.5, 24.5].forEach((zOff) => {
      boxes.push({
        id: `bridge_parapet_${bz}_${zOff}`,
        x: rx,
        z: bz + zOff,
        halfW: 23.5,
        halfD: 1.0,
      });
    });
  });

  // 7. Outer Biome Monumental Solid Structures, Japanese Castles & Pyramids (100% Solid Colliders!)
  const outerMonuments: WorldBoxCollider[] = [
    { id: 'alpine_summit_lodge', x: 3975, z: -4450, halfW: 18.5, halfD: 14.5 },
    { id: 'sahara_arch_pier_l', x: -3995, z: 4450, halfW: 9.5, halfD: 9.5 },
    { id: 'sahara_arch_pier_r', x: -3955, z: 4450, halfW: 9.5, halfD: 9.5 },
    { id: 'riviera_casino_hotel', x: 3975, z: 4450, halfW: 22.5, halfD: 14.5 },
    { id: 'volcano_observatory_dome', x: -3975, z: -4450, halfW: 16.5, halfD: 16.5 },
    { id: 'provence_chateau_main', x: -65, z: 5260, halfW: 20.5, halfD: 14.5 },
    { id: 'megaport_stack_1', x: 5260, z: -80, halfW: 16.5, halfD: 28.5 },
    { id: 'megaport_stack_2', x: 5260, z: 80, halfW: 16.5, halfD: 28.5 },
    { id: 'desert_pyramid_1', x: -540, z: 1250, halfW: 22.0, halfD: 22.0 },
    { id: 'desert_pyramid_2', x: 540, z: 2250, halfW: 22.0, halfD: 22.0 },
    { id: 'desert_pyramid_3', x: -2950, z: 3250, halfW: 22.0, halfD: 22.0 },
    { id: 'sakura_tenshu_castle_1', x: -315, z: -270, halfW: 17.5, halfD: 17.5 },
    { id: 'sakura_tenshu_castle_2', x: 540, z: -1150, halfW: 21.0, halfD: 21.0 },
  ];
  outerMonuments.forEach((m) => {
    boxes.push(m);
  });

  // 8. Surrounding Corridor Buildings (Synced 1:1 with WorldSceneCanvas getRoadNetworkDistance(x, z).minDist >= 32!)
  [-1150, -2250, -2650, -3350, -3825, -4500].forEach((zNorth) => {
    [-68, 148].forEach((xSide) => {
      if (getRoadNetworkDistance(xSide, zNorth).minDist >= 32) {
        boxes.push({
          id: `north_chalet_${xSide}_${zNorth}`,
          x: xSide,
          z: zNorth,
          halfW: 15.4,
          halfD: 13.4,
        });
      }
    });
  });

  [1150, 2250, 2650, 3350, 3825].forEach((zSouth) => {
    [-68, 148].forEach((xSide) => {
      if (getRoadNetworkDistance(xSide, zSouth).minDist >= 32) {
        boxes.push({
          id: `south_kasbah_${xSide}_${zSouth}`,
          x: xSide,
          z: zSouth,
          halfW: 16.4,
          halfD: 14.4,
        });
      }
    });
  });

  [1150, 2250, 2650, 3350, 3825].forEach((xEast) => {
    [-68, 68].forEach((zSide) => {
      if (getRoadNetworkDistance(xEast, zSide).minDist >= 32) {
        boxes.push({
          id: `east_tower_${xEast}_${zSide}`,
          x: xEast,
          z: zSide,
          halfW: 17.4,
          halfD: 17.4,
        });
      }
    });
  });

  [-1150, -2250, -2650, -3350, -3825].forEach((xWest) => {
    [-68, 68].forEach((zSide) => {
      if (getRoadNetworkDistance(xWest, zSide).minDist >= 32) {
        boxes.push({
          id: `west_lodge_${xWest}_${zSide}`,
          x: xWest,
          z: zSide,
          halfW: 15.4,
          halfD: 13.4,
        });
      }
    });
  });

  // 9. All 700+ Procedural City Block & District Buildings across the map (including +0.35m podium overhang!)
  for (let i = 0; i < WORLD_PROCEDURAL_BUILDINGS.length; i++) {
    const b = WORLD_PROCEDURAL_BUILDINGS[i];
    boxes.push({
      id: b.id,
      x: b.x,
      z: b.z,
      halfW: b.width * 0.5 + 0.35,
      halfD: b.depth * 0.5 + 0.35,
    });
  }

  return boxes;
})();

export interface WorldMountainPeakSpec {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  kind: 'snow_peak' | 'desert_mesa' | 'cliff_peak' | 'volcano_cone';
}

export const WORLD_MOUNTAIN_PEAKS: WorldMountainPeakSpec[] = (() => {
  const rawPeaks: Omit<WorldMountainPeakSpec, 'id'>[] = [
    // A. North & NE Snowy Alpine Mountain Peaks (Placed safely inside mountain blocks away from all roads)
    { x: -420, z: -820, radius: 62, height: 165, kind: 'snow_peak' },
    { x: 420, z: -820, radius: 62, height: 175, kind: 'snow_peak' },
    { x: -420, z: -1425, radius: 62, height: 210, kind: 'snow_peak' },
    { x: 420, z: -1425, radius: 62, height: 200, kind: 'snow_peak' },
    { x: -420, z: -2250, radius: 75, height: 235, kind: 'snow_peak' },
    { x: 420, z: -2250, radius: 75, height: 225, kind: 'snow_peak' },
    { x: -420, z: -3400, radius: 85, height: 250, kind: 'snow_peak' },
    { x: 420, z: -3400, radius: 85, height: 240, kind: 'snow_peak' },
    { x: -420, z: -3900, radius: 90, height: 260, kind: 'snow_peak' },
    { x: 420, z: -3900, radius: 90, height: 255, kind: 'snow_peak' },
    { x: -420, z: -4900, radius: 115, height: 270, kind: 'snow_peak' },
    { x: 420, z: -4900, radius: 115, height: 260, kind: 'snow_peak' },
    { x: 4550, z: -4850, radius: 110, height: 235, kind: 'snow_peak' },
    { x: 3750, z: -4650, radius: 105, height: 205, kind: 'snow_peak' },
    { x: 4680, z: -3850, radius: 110, height: 220, kind: 'snow_peak' },
    { x: 2500, z: -2250, radius: 68, height: 225, kind: 'snow_peak' },
    { x: 1575, z: -1875, radius: 55, height: 195, kind: 'snow_peak' },

    // B. South & SW Red Rock Canyon Mesas & Buttes
    { x: -420, z: 820, radius: 58, height: 95, kind: 'desert_mesa' },
    { x: 420, z: 820, radius: 58, height: 105, kind: 'desert_mesa' },
    { x: -420, z: 1575, radius: 58, height: 120, kind: 'desert_mesa' },
    { x: 420, z: 1575, radius: 58, height: 110, kind: 'desert_mesa' },
    { x: -420, z: 2500, radius: 68, height: 135, kind: 'desert_mesa' },
    { x: 420, z: 2500, radius: 68, height: 125, kind: 'desert_mesa' },
    { x: -420, z: 3900, radius: 85, height: 145, kind: 'desert_mesa' },
    { x: 420, z: 3900, radius: 85, height: 130, kind: 'desert_mesa' },
    { x: -4850, z: 4350, radius: 90, height: 120, kind: 'desert_mesa' },
    { x: -3750, z: 4550, radius: 85, height: 105, kind: 'desert_mesa' },
    { x: -4600, z: 3800, radius: 95, height: 135, kind: 'desert_mesa' },
    { x: -2250, z: 2500, radius: 68, height: 130, kind: 'desert_mesa' },
    { x: -1575, z: 1875, radius: 55, height: 115, kind: 'desert_mesa' },

    // C. East & SE Coastal Cliff Mountain Peaks
    { x: 1425, z: 420, radius: 58, height: 135, kind: 'cliff_peak' },
    { x: 2250, z: -420, radius: 68, height: 155, kind: 'cliff_peak' },
    { x: 3400, z: 420, radius: 78, height: 170, kind: 'cliff_peak' },
    { x: 2500, z: 2250, radius: 68, height: 165, kind: 'cliff_peak' },
    { x: 3400, z: 3900, radius: 85, height: 185, kind: 'cliff_peak' },

    // D. West & NW Granite & Volcanic Mountain Peaks + Volcano Cone
    { x: -820, z: -420, radius: 58, height: 160, kind: 'snow_peak' },
    { x: -820, z: 420, radius: 58, height: 170, kind: 'snow_peak' },
    { x: -1425, z: -420, radius: 58, height: 205, kind: 'snow_peak' },
    { x: -1425, z: 420, radius: 58, height: 195, kind: 'snow_peak' },
    { x: -2250, z: -420, radius: 68, height: 225, kind: 'snow_peak' },
    { x: -2250, z: 420, radius: 68, height: 215, kind: 'snow_peak' },
    { x: -3400, z: -420, radius: 78, height: 245, kind: 'snow_peak' },
    { x: -3400, z: 420, radius: 78, height: 235, kind: 'snow_peak' },
    { x: -4550, z: 420, radius: 90, height: 250, kind: 'snow_peak' },
    { x: -2250, z: -2500, radius: 68, height: 230, kind: 'snow_peak' },
    { x: -1575, z: -1875, radius: 55, height: 205, kind: 'snow_peak' },
    // NW Volcano Caldera Cone (Placed at (-5150, -5150) clear of the volcano rally trail)
    { x: -5150, z: -5150, radius: 260, height: 175, kind: 'volcano_cone' },
  ];

  return rawPeaks
    .map((p, idx) => {
      const { minDist } = getRoadNetworkDistance(p.x, p.z);
      // Automatically clamp radius so no mountain cone ever intrudes onto a paved road
      const safeRadius = Math.min(p.radius, minDist - 26);
      return {
        ...p,
        id: `mountain_peak_${idx}`,
        radius: safeRadius,
      };
    })
    .filter((p) => p.radius >= 24);
})();

export const WORLD_REDWOOD_TREES: {
  id: string;
  x: number;
  z: number;
  trunkRadius: number;
  scale: number;
}[] = (() => {
  const trees: { id: string; x: number; z: number; trunkRadius: number; scale: number }[] = [];
  let idx = 0;

  // Fill the entire Western Emerald Rainforest & Sequoia Forest sector (x ∈ [-5750, -650], z ∈ [-3850, 3850])
  // with over 1,250+ dense trees packed inside every woodland block between the small forest roads!
  for (let gx = -5680; gx <= -680; gx += 125) {
    for (let gz = -3760; gz <= 3760; gz += 125) {
      // Deterministic organic jitter so the forest looks lush and natural
      const hash1 = Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453;
      const hash2 = Math.cos(gx * 39.346 + gz * 11.135) * 23421.631;
      const jx = (hash1 - Math.floor(hash1) - 0.5) * 68;
      const jz = (hash2 - Math.floor(hash2) - 0.5) * 68;
      const tx = Math.round(gx + jx);
      const tz = Math.round(gz + jz);

      // Keep clear of all highways, boulevards, and small forest roads (including full race pathway width)
      if (getRoadNetworkDistance(tx, tz).minDist < 29.5) continue;
      // Keep clear of the NW Volcano cone & western ranger lodges
      if (Math.hypot(tx - -5150, tz - -5150) < 310) continue;
      if (Math.hypot(tx - -3975, tz - -4450) < 60) continue;

      const scale = 0.72 + (Math.abs(Math.sin(idx * 1.73)) * 0.65);
      trees.push({
        id: `redwood_${idx++}`,
        x: tx,
        z: tz,
        trunkRadius: Number((2.2 * scale).toFixed(2)),
        scale: Number(scale.toFixed(2)),
      });
    }
  }
  return trees;
})();

const WORLD_CYLINDER_COLLIDERS: WorldCylinderCollider[] = (() => {
  const cyls: WorldCylinderCollider[] = [];

  // 1. Champs-Élysées Streetlamps & Chestnut Trees (Filtered so none ever land on intersecting boulevards or race pathways)
  for (let z = -320; z <= 320; z += 36) {
    if (Math.abs(z) < 52) continue;
    [-21.5, 21.5].forEach((xLamp) => {
      if (getRoadNetworkDistance(xLamp, z).minDist >= 28) {
        cyls.push({ id: `lamp_${xLamp}_${z}`, x: xLamp, z, radius: 0.35 });
      }
      const treeX = xLamp * 1.16;
      const treeZ = z + 18;
      if (getRoadNetworkDistance(treeX, treeZ).minDist >= 28) {
        cyls.push({ id: `tree_${xLamp}_${z}`, x: treeX, z: treeZ, radius: 0.65 });
      }
    });
  }

  // 2. Outer Boulevard Périphérique Ring Trees (Filtered against all roads and the Main River)
  for (let i = 0; i < 84; i++) {
    const angle = (i / 84) * Math.PI * 2;
    const radius = i % 2 === 0 ? 236 : 294;
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius;
    if (getRoadNetworkDistance(tx, tz).minDist < 28) continue;
    if (Math.abs(tx - getMainRiverCenterX(tz)) < 42) continue;
    cyls.push({ id: `ring_tree_${i}`, x: tx, z: tz, radius: 0.65 });
  }

  // 3. ALL 3D Mountain Peaks, Desert Mesas, Coastal Cliffs & Volcano Cone (100% Solid Colliders!)
  for (let i = 0; i < WORLD_MOUNTAIN_PEAKS.length; i++) {
    const mp = WORLD_MOUNTAIN_PEAKS[i];
    cyls.push({
      id: mp.id,
      x: mp.x,
      z: mp.z,
      radius: mp.radius * 0.94,
    });
  }

  // 4. Giant 75m Sequoia Redwood Trunks along West Corridor
  for (let i = 0; i < WORLD_REDWOOD_TREES.length; i++) {
    const rw = WORLD_REDWOOD_TREES[i];
    cyls.push({
      id: rw.id,
      x: rw.x,
      z: rw.z,
      radius: rw.trunkRadius,
    });
  }

  return cyls;
})();

// ============================================================================
// SPATIAL HASH GRID FOR O(1) SOLID COLLISION QUERIES (ELIMINATES FRAME LAG)
// ============================================================================
const COLLIDER_CELL_SIZE = 200;
interface SpatialCell {
  boxes: WorldBoxCollider[];
  cyls: WorldCylinderCollider[];
}
const COLLIDER_SPATIAL_GRID = new Map<string, SpatialCell>();

function getSpatialCell(cx: number, cz: number): SpatialCell {
  const key = `${cx},${cz}`;
  let cell = COLLIDER_SPATIAL_GRID.get(key);
  if (!cell) {
    cell = { boxes: [], cyls: [] };
    COLLIDER_SPATIAL_GRID.set(key, cell);
  }
  return cell;
}

(() => {
  for (let i = 0; i < WORLD_BOX_COLLIDERS.length; i++) {
    const b = WORLD_BOX_COLLIDERS[i];
    const minCx = Math.floor((b.x - b.halfW - 4) / COLLIDER_CELL_SIZE);
    const maxCx = Math.floor((b.x + b.halfW + 4) / COLLIDER_CELL_SIZE);
    const minCz = Math.floor((b.z - b.halfD - 4) / COLLIDER_CELL_SIZE);
    const maxCz = Math.floor((b.z + b.halfD + 4) / COLLIDER_CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        getSpatialCell(cx, cz).boxes.push(b);
      }
    }
  }
  for (let i = 0; i < WORLD_CYLINDER_COLLIDERS.length; i++) {
    const c = WORLD_CYLINDER_COLLIDERS[i];
    const minCx = Math.floor((c.x - c.radius - 4) / COLLIDER_CELL_SIZE);
    const maxCx = Math.floor((c.x + c.radius + 4) / COLLIDER_CELL_SIZE);
    const minCz = Math.floor((c.z - c.radius - 4) / COLLIDER_CELL_SIZE);
    const maxCz = Math.floor((c.z + c.radius + 4) / COLLIDER_CELL_SIZE);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        getSpatialCell(cx, cz).cyls.push(c);
      }
    }
  }
})();

/**
 * Resolves solid collisions with all world structures (buildings, monuments, pyramids,
 * columns, trees, bridge parapets, and Main River water embankments) with anti-tunneling
 * sub-stepping so neither the player nor AI bots can ever pass through any object.
 */
function resolveSolidWorldCollisionsForEntity(
  entity: {
    x: number;
    y?: number;
    z: number;
    vx: number;
    vz: number;
    vy?: number;
    angularVelocity?: number;
  },
  carRadius: number,
  prevX: number,
  prevZ: number
): number | undefined {
  let collisionImpactMs: number | undefined;
  const moveDist = Math.hypot(entity.x - prevX, entity.z - prevZ);
  const subSteps = moveDist > 0.65 ? Math.min(12, Math.ceil(moveDist / 0.65)) : 1;

  let curX = prevX;
  let curZ = prevZ;
  const targetDx = (entity.x - prevX) / subSteps;
  const targetDz = (entity.z - prevZ) / subSteps;

  for (let step = 0; step < subSteps; step++) {
    curX += targetDx;
    curZ += targetDz;

    const cx = Math.floor(curX / COLLIDER_CELL_SIZE);
    const cz = Math.floor(curZ / COLLIDER_CELL_SIZE);
    const cell = COLLIDER_SPATIAL_GRID.get(`${cx},${cz}`);

    if (cell) {
      // 1. Solid Box Colliders (Buildings, Arc Piers, Eiffel Legs, Louvre, Pyramids, Bridge Guardrails)
      for (let i = 0; i < cell.boxes.length; i++) {
        const box = cell.boxes[i];
        const minX = box.x - box.halfW - carRadius;
        const maxX = box.x + box.halfW + carRadius;
        const minZ = box.z - box.halfD - carRadius;
        const maxZ = box.z + box.halfD + carRadius;

        if (curX > minX && curX < maxX && curZ > minZ && curZ < maxZ) {
          const penLeft = curX - minX;
          const penRight = maxX - curX;
          const penTop = curZ - minZ;
          const penBottom = maxZ - curZ;
          const minPen = Math.min(penLeft, penRight, penTop, penBottom);

          let nx = 0;
          let nz = 0;
          if (minPen === penLeft) {
            curX = minX;
            nx = -1;
          } else if (minPen === penRight) {
            curX = maxX;
            nx = 1;
          } else if (minPen === penTop) {
            curZ = minZ;
            nz = -1;
          } else {
            curZ = maxZ;
            nz = 1;
          }

          const vNormal = entity.vx * nx + entity.vz * nz;
          if (vNormal < 0) {
            const impactSpeed = Math.abs(vNormal);
            if (impactSpeed > 1.8) {
              collisionImpactMs = Math.max(collisionImpactMs ?? 0, impactSpeed);
            }
            const restitution = 0.24;
            const wallFriction = 0.78;
            const vTangX = entity.vx - vNormal * nx;
            const vTangZ = entity.vz - vNormal * nz;
            entity.vx = -vNormal * restitution * nx + vTangX * wallFriction;
            entity.vz = -vNormal * restitution * nz + vTangZ * wallFriction;
            if (entity.vy !== undefined) entity.vy = 0;
            if (entity.angularVelocity !== undefined) entity.angularVelocity *= 0.35;
          }
        }
      }

      // 2. Solid Cylinder Colliders (Columns, Streetlamps, Trees)
      for (let i = 0; i < cell.cyls.length; i++) {
        const cyl = cell.cyls[i];
        const dx = curX - cyl.x;
        const dz = curZ - cyl.z;
        const minDist = cyl.radius + carRadius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          curX = cyl.x + nx * minDist;
          curZ = cyl.z + nz * minDist;

          const vNormal = entity.vx * nx + entity.vz * nz;
          if (vNormal < 0) {
            const impactSpeed = Math.abs(vNormal);
            if (impactSpeed > 1.8) {
              collisionImpactMs = Math.max(collisionImpactMs ?? 0, impactSpeed);
            }
            const vTangX = entity.vx - vNormal * nx;
            const vTangZ = entity.vz - vNormal * nz;
            entity.vx = -vNormal * 0.28 * nx + vTangX * 0.8;
            entity.vz = -vNormal * 0.28 * nz + vTangZ * 0.8;
            if (entity.vy !== undefined) entity.vy = 0;
          }
        }
      }
    }

    // 3. Solid Main River Stone Embankment Wall (Cars CANNOT drive into or across the river except on a Bridge!)
    if (Math.abs(curZ) < 6200) {
      const riverCenterX = getMainRiverCenterX(curZ);
      const riverWallOuterHalfW = 18.5 + carRadius;
      const distFromRiver = curX - riverCenterX;
      const prevDistFromRiver = prevX !== undefined ? prevX - riverCenterX : distFromRiver;
      // Check if the car either landed inside the river channel OR tunneled across the river in a single high-speed step
      const crossedRiverChannel =
        prevX !== undefined &&
        prevDistFromRiver * distFromRiver < 0 &&
        Math.abs(prevDistFromRiver) < 120;

      if (Math.abs(distFromRiver) < riverWallOuterHalfW || crossedRiverChannel) {
        let activeBridgeZ: number | null = null;
        for (let b = 0; b < RIVER_BRIDGE_Z_COORDS.length; b++) {
          const bz = RIVER_BRIDGE_Z_COORDS[b];
          if (Math.abs(curZ - bz) <= 23.5 || (prevZ !== undefined && Math.abs(prevZ - bz) <= 23.5)) {
            activeBridgeZ = bz;
            break;
          }
        }

        if (activeBridgeZ === null) {
          // NOT on a bridge: solid stone embankment wall blocks the car on the bank it approached from!
          const sideSign =
            prevX !== undefined && Math.abs(prevDistFromRiver) > 0.01
              ? prevDistFromRiver >= 0
                ? 1
                : -1
              : distFromRiver >= 0
              ? 1
              : -1;
          curX = riverCenterX + sideSign * riverWallOuterHalfW;
          if (entity.vx * sideSign < 0) {
            const impactSpeed = Math.abs(entity.vx);
            if (impactSpeed > 1.8) {
              collisionImpactMs = Math.max(collisionImpactMs ?? 0, impactSpeed);
            }
            entity.vx = -entity.vx * 0.25;
            entity.vz *= 0.85;
            if (entity.vy !== undefined) entity.vy = 0;
          }
        } else if (Math.abs(distFromRiver) < 19.0) {
          // ON a bridge deck over the water: enforce the bridge's North & South Stone Balustrade Parapets
          const maxBridgeHalfZ = 23.5 - carRadius * 0.5;
          const dzBridge = curZ - activeBridgeZ;
          if (Math.abs(dzBridge) > maxBridgeHalfZ) {
            const zSign = dzBridge >= 0 ? 1 : -1;
            curZ = activeBridgeZ + zSign * maxBridgeHalfZ;
            if (entity.vz * zSign > 0) {
              const impactSpeed = Math.abs(entity.vz);
              if (impactSpeed > 1.8) {
                collisionImpactMs = Math.max(collisionImpactMs ?? 0, impactSpeed);
              }
              entity.vz = -entity.vz * 0.25;
              entity.vx *= 0.88;
              if (entity.vy !== undefined) entity.vy = 0;
            }
          }
        }
      }
    }

    // 4. Solid Elevated Highway Flyover Side Parapet Guardrails
    //    - Cars ON the elevated highway deck are kept safely inside the side guardrails.
    //    - Cars on the ground (entity.y < deckH - 2.6m) where the highway is elevated (deckH >= 2.6m)
    //      pass 100% freely UNDERNEATH the elevated highway without getting stuck!
    for (let fIdx = 0; fIdx < WORLD_ELEVATED_FLYOVERS.length; fIdx++) {
      const f = WORLD_ELEVATED_FLYOVERS[fIdx];
      const along = f.axis === 'x' ? curX : curZ;
      if (along < f.startCoord + 6 || along > f.endCoord - 6) continue;

      const dEdge = Math.min(along - f.startCoord, f.endCoord - along);
      const rampT = Math.max(0, Math.min(1, dEdge / f.rampLength));
      const deckH = f.deckHeight * (0.5 - 0.5 * Math.cos(rampT * Math.PI));
      const carY = entity.y ?? 0;

      // If the highway deck overhead is elevated (>= 2.6m) and the car is down on the ground below it,
      // let the car drive freely UNDER the elevated highway!
      if (deckH >= 2.6 && carY < deckH - 2.6) {
        continue;
      }

      const curLat = f.axis === 'x' ? curZ - f.fixedCoord : curX - f.fixedCoord;
      const prevLat = f.axis === 'x' ? prevZ - f.fixedCoord : prevX - f.fixedCoord;
      const innerGuardLimit = f.halfWidth - carRadius;
      const outerGuardLimit = f.halfWidth + carRadius + 0.6;

      // Case A: Vehicle is driving ON the elevated highway deck and touches the left or right side parapet wall
      if (Math.abs(prevLat) <= f.halfWidth + 0.5 && Math.abs(curLat) > innerGuardLimit) {
        const sideSign = curLat >= 0 ? 1 : -1;
        if (f.axis === 'x') {
          curZ = f.fixedCoord + sideSign * innerGuardLimit;
          if (entity.vz * sideSign > 0) {
            collisionImpactMs = Math.max(collisionImpactMs ?? 0, Math.abs(entity.vz));
            entity.vz = -entity.vz * 0.2;
            entity.vx *= 0.92;
          }
        } else {
          curX = f.fixedCoord + sideSign * innerGuardLimit;
          if (entity.vx * sideSign > 0) {
            collisionImpactMs = Math.max(collisionImpactMs ?? 0, Math.abs(entity.vx));
            entity.vx = -entity.vx * 0.2;
            entity.vz *= 0.92;
          }
        }
        if (entity.vy !== undefined) entity.vy = 0;
        if (entity.angularVelocity !== undefined) entity.angularVelocity *= 0.4;
      }
      // Case B: Only at the low solid ramp embankment ends (deckH < 2.6m), block driving sideways through the low ramp wall
      else if (deckH < 2.6 && Math.abs(prevLat) > f.halfWidth + 0.5 && Math.abs(curLat) < outerGuardLimit) {
        const sideSign = prevLat >= 0 ? 1 : -1;
        if (f.axis === 'x') {
          curZ = f.fixedCoord + sideSign * outerGuardLimit;
          if (entity.vz * sideSign < 0) {
            entity.vz = -entity.vz * 0.2;
          }
        } else {
          curX = f.fixedCoord + sideSign * outerGuardLimit;
          if (entity.vx * sideSign < 0) {
            entity.vx = -entity.vx * 0.2;
          }
        }
      }
    }
  }

  entity.x = curX;
  entity.z = curZ;
  return collisionImpactMs;
}

// ============================================================================
// ROAD-NETWORK GPS PATHFINDER & RACE ROAD ROUTE GENERATOR (WITH BRIDGE & OBSTACLE SAFETY)
// ============================================================================
const ALL_GRID_ROAD_COORDS = [0, ...MAJOR_GRID_COORDS, ...SMALL_STREET_COORDS].sort(
  (a, b) => a - b
);

function snapCoordToRoadGrid(val: number): number {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < ALL_GRID_ROAD_COORDS.length; i++) {
    const c = ALL_GRID_ROAD_COORDS[i];
    const d = Math.abs(val - c);
    if (d < bestDiff) {
      bestDiff = d;
      best = c;
    }
  }
  return best;
}

function findNearestRiverBridgeZ(z: number): number {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < RIVER_BRIDGE_Z_COORDS.length; i++) {
    const bz = RIVER_BRIDGE_Z_COORDS[i];
    const d = Math.abs(z - bz);
    if (d < bestDiff) {
      bestDiff = d;
      best = bz;
    }
  }
  return best;
}

/**
 * Ensures any route waypoint or race path node stays strictly clear of all world obstacles
 * (Arc de Triomphe piers, Louvre pyramid, Eiffel Tower legs, Haussmann blocks, mountains, and river water).
 */
export function deflectPointFromWorldObstacles(
  x: number,
  z: number,
  clearanceRadius = 4.2
): { x: number; z: number } {
  let curX = x;
  let curZ = z;

  // 1. Special handling for Arc de Triomphe Plaza at (0, 0):
  // Left pier is at (-16.5, 0) [x: -22..-11], Right pier is at (+16.5, 0) [x: +11..+22].
  // Central archway vault is wide open along x in [-8.5, +8.5]!
  if (Math.abs(curZ) < 12.5 && Math.abs(curX) > 8.5 && Math.abs(curX) < 24.5) {
    if (Math.abs(curX) < 16.5) {
      curX = Math.sign(curX) * 7.2; // Channel cleanly through central vault
    } else {
      curX = Math.sign(curX) * 25.0; // Or around the outer perimeter of the pier
    }
  }

  // 2. Keep waypoints out of the Main River water unless on a bridge deck
  if (Math.abs(curZ) < 5800) {
    const riverX = getMainRiverCenterX(curZ);
    const distFromRiver = curX - riverX;
    if (Math.abs(distFromRiver) < 22) {
      const nearestBz = findNearestRiverBridgeZ(curZ);
      if (Math.abs(curZ - nearestBz) > 14.5) {
        curX = riverX + (distFromRiver >= 0 ? 24 : -24);
      }
    }
  }

  const cx = Math.floor(curX / COLLIDER_CELL_SIZE);
  const cz = Math.floor(curZ / COLLIDER_CELL_SIZE);
  const cell = COLLIDER_SPATIAL_GRID.get(`${cx},${cz}`);
  if (!cell) return { x: curX, z: curZ };

  // 3. Deflect out of any solid box collider (buildings, monuments, pyramids)
  for (let i = 0; i < cell.boxes.length; i++) {
    const box = cell.boxes[i];
    if (box.id.startsWith('bridge_rail_')) continue;
    const minX = box.x - box.halfW - clearanceRadius;
    const maxX = box.x + box.halfW + clearanceRadius;
    const minZ = box.z - box.halfD - clearanceRadius;
    const maxZ = box.z + box.halfD + clearanceRadius;

    if (curX > minX && curX < maxX && curZ > minZ && curZ < maxZ) {
      const penLeft = curX - minX;
      const penRight = maxX - curX;
      const penTop = curZ - minZ;
      const penBottom = maxZ - curZ;
      const minPen = Math.min(penLeft, penRight, penTop, penBottom);
      if (minPen === penLeft) curX = minX;
      else if (minPen === penRight) curX = maxX;
      else if (minPen === penTop) curZ = minZ;
      else curZ = maxZ;
    }
  }

  // 4. Deflect out of any large cylinder collider (mountain peaks, mesas, volcano, columns)
  for (let i = 0; i < cell.cyls.length; i++) {
    const cyl = cell.cyls[i];
    if (cyl.radius < 1.2) continue;
    const dx = curX - cyl.x;
    const dz = curZ - cyl.z;
    const minDist = cyl.radius + clearanceRadius;
    const dSq = dx * dx + dz * dz;
    if (dSq < minDist * minDist && dSq > 0.0001) {
      const d = Math.sqrt(dSq);
      curX = cyl.x + (dx / d) * minDist;
      curZ = cyl.z + (dz / d) * minDist;
    }
  }

  return { x: curX, z: curZ };
}

/**
 * Ensures a segment from pA to pB never cuts across the Main River water without using a bridge.
 */
function appendRiverSafeSegment(
  pts: { x: number; z: number }[],
  nextPt: { x: number; z: number },
  clearance = 4.2
): void {
  const prev = pts[pts.length - 1];
  const safeNext = deflectPointFromWorldObstacles(nextPt.x, nextPt.z, clearance);
  const legDist = Math.hypot(safeNext.x - prev.x, safeNext.z - prev.z);
  if (legDist < 3) return;

  const rPrev = prev.x - getMainRiverCenterX(prev.z);
  const rNext = safeNext.x - getMainRiverCenterX(safeNext.z);
  const crossesRiver = rPrev * rNext < 0;
  const nearBridgeZ = findNearestRiverBridgeZ((prev.z + safeNext.z) * 0.5);
  const alreadyOnBridge =
    Math.abs(prev.z - nearBridgeZ) < 15 && Math.abs(safeNext.z - nearBridgeZ) < 15;

  if (crossesRiver && !alreadyOnBridge) {
    // Route across the nearest River Bridge so races/GPS never cut across river water!
    const bridgeZ = nearBridgeZ;
    const bridgeCenterX = getMainRiverCenterX(bridgeZ);
    const westQuayX = bridgeCenterX - 27;
    const eastQuayX = bridgeCenterX + 27;
    const entryX = rPrev < 0 ? westQuayX : eastQuayX;
    const exitX = rPrev < 0 ? eastQuayX : westQuayX;

    const bridgeWaypoints = [
      { x: entryX, z: bridgeZ },
      { x: exitX, z: bridgeZ },
      safeNext,
    ];
    for (let b = 0; b < bridgeWaypoints.length; b++) {
      const p0 = pts[pts.length - 1];
      const p1 = bridgeWaypoints[b];
      const d = Math.hypot(p1.x - p0.x, p1.z - p0.z);
      const steps = Math.max(1, Math.ceil(d / 45));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const sx = p0.x + (p1.x - p0.x) * t;
        const sz = p0.z + (p1.z - p0.z) * t;
        pts.push(deflectPointFromWorldObstacles(sx, sz, clearance));
      }
    }
    return;
  }

  const steps = Math.max(1, Math.ceil(legDist / 45));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const subX = prev.x + (safeNext.x - prev.x) * t;
    const subZ = prev.z + (safeNext.z - prev.z) * t;
    pts.push(deflectPointFromWorldObstacles(subX, subZ, clearance));
  }
}

const ROAD_NETWORK_PATH_CACHE = new Map<
  string,
  { points: { x: number; z: number }[]; totalDistanceM: number }
>();

/**
 * Computes a road-aligned path between any two world points (startX, startZ) and (endX, endZ)
 * following ring roads, cardinal/diagonal highways, grid boulevards, small city streets, and river bridges,
 * while guaranteeing zero intersection with any building, monument, or river water.
 */
export function computeRoadNetworkPath(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number
): { points: { x: number; z: number }[]; totalDistanceM: number } {
  const cacheKey = `${Math.round(startX / 4)},${Math.round(startZ / 4)}->${Math.round(endX / 4)},${Math.round(endZ / 4)}`;
  const cached = ROAD_NETWORK_PATH_CACHE.get(cacheKey);
  if (cached) return cached;

  const safeStart = deflectPointFromWorldObstacles(startX, startZ, 4.2);
  const safeEnd = deflectPointFromWorldObstacles(endX, endZ, 4.2);
  const pts: { x: number; z: number }[] = [{ x: safeStart.x, z: safeStart.z }];

  const rStart = Math.hypot(safeStart.x, safeStart.z);
  const rEnd = Math.hypot(safeEnd.x, safeEnd.z);
  const ringRadii = [265, 900, 1800, 4200];

  // 1. Check if both points lie on the same Ring Road (e.g., Boulevard Périphérique, Metro 900m Ring, Mid-Ring, Continental Ring)
  let matchedRing = -1;
  for (let i = 0; i < ringRadii.length; i++) {
    const rr = ringRadii[i];
    if (Math.abs(rStart - rr) < 42 && Math.abs(rEnd - rr) < 42) {
      matchedRing = rr;
      break;
    }
  }

  if (matchedRing > 0) {
    const a0 = Math.atan2(safeStart.z, safeStart.x);
    const a1 = Math.atan2(safeEnd.z, safeEnd.x);
    let delta = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
    if (Math.abs(Math.abs(delta) - Math.PI) < 0.05) {
      delta = Math.PI;
    }
    const steps = Math.max(4, Math.ceil((Math.abs(delta) * matchedRing) / 50));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const ang = a0 + delta * t;
      const rawPt = {
        x: Math.cos(ang) * matchedRing,
        z: Math.sin(ang) * matchedRing,
      };
      pts.push(deflectPointFromWorldObstacles(rawPt.x, rawPt.z, 4.2));
    }
    pts.push({ x: safeEnd.x, z: safeEnd.z });
  } else {
    const dx = safeEnd.x - safeStart.x;
    const dz = safeEnd.z - safeStart.z;

    // 2. Check if already aligned along an axial road (X-road or Z-road) or 45° diagonal highway (outside r >= 265)
    const isAxialX = Math.abs(dx) < 18;
    const isAxialZ = Math.abs(dz) < 18;
    const isDiagonal =
      rStart >= 240 &&
      rEnd >= 240 &&
      Math.abs(Math.abs(safeStart.x) - Math.abs(safeStart.z)) < 32 &&
      Math.abs(Math.abs(safeEnd.x) - Math.abs(safeEnd.z)) < 32 &&
      Math.abs(Math.abs(dx) - Math.abs(dz)) < 35 &&
      Math.sign(safeStart.x || 1) === Math.sign(safeEnd.x || 1) &&
      Math.sign(safeStart.z || 1) === Math.sign(safeEnd.z || 1);

    const crossesArcPiersEW =
      isAxialZ &&
      Math.abs(safeStart.z) < 12 &&
      Math.min(safeStart.x, safeEnd.x) < 22 &&
      Math.max(safeStart.x, safeEnd.x) > -22 &&
      Math.abs(dx) > 18;

    if ((isAxialX || isAxialZ || isDiagonal) && !crossesArcPiersEW) {
      appendRiverSafeSegment(pts, safeEnd, 4.2);
    } else {
      // 3. Route via orthogonal road grid & major boulevards
      const snapStartX = snapCoordToRoadGrid(safeStart.x);
      const snapStartZ = snapCoordToRoadGrid(safeStart.z);
      const snapEndX = snapCoordToRoadGrid(safeEnd.x);
      const snapEndZ = snapCoordToRoadGrid(safeEnd.z);

      const rawWaypoints: { x: number; z: number }[] = [];

      if (
        Math.abs(safeStart.x) < 12 &&
        Math.abs(safeStart.z) < 40 &&
        Math.abs(safeEnd.z) >= 18 &&
        Math.abs(safeEnd.z) <= 36
      ) {
        rawWaypoints.push({ x: 0, z: safeEnd.z });
        rawWaypoints.push({ x: safeEnd.x, z: safeEnd.z });
      } else if (
        Math.abs(safeEnd.x) < 12 &&
        Math.abs(safeEnd.z) < 40 &&
        Math.abs(safeStart.z) >= 18 &&
        Math.abs(safeStart.z) <= 36
      ) {
        rawWaypoints.push({ x: 0, z: safeStart.z });
        rawWaypoints.push({ x: safeEnd.x, z: safeEnd.z });
      } else {
        if (Math.hypot(snapStartX - safeStart.x, snapStartZ - safeStart.z) > 12) {
          if (Math.abs(snapStartX - safeStart.x) < Math.abs(snapStartZ - safeStart.z)) {
            rawWaypoints.push({ x: snapStartX, z: safeStart.z });
          } else {
            rawWaypoints.push({ x: safeStart.x, z: snapStartZ });
          }
          rawWaypoints.push({ x: snapStartX, z: snapStartZ });
        }

        const cornerA = { x: snapEndX, z: snapStartZ };
        const cornerB = { x: snapStartX, z: snapEndZ };
        const distRiverA = Math.abs(cornerA.x - getMainRiverCenterX(cornerA.z));
        const distRiverB = Math.abs(cornerB.x - getMainRiverCenterX(cornerB.z));
        if (distRiverA > distRiverB) {
          rawWaypoints.push(cornerA);
        } else {
          rawWaypoints.push(cornerB);
        }
        rawWaypoints.push({ x: snapEndX, z: snapEndZ });
        rawWaypoints.push({ x: safeEnd.x, z: safeEnd.z });
      }

      for (let w = 0; w < rawWaypoints.length; w++) {
        appendRiverSafeSegment(pts, rawWaypoints[w], 4.2);
      }
    }
  }

  let totalDistanceM = 0;
  for (let i = 1; i < pts.length; i++) {
    totalDistanceM += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  }

  const result = { points: pts, totalDistanceM: Math.round(totalDistanceM) };
  if (ROAD_NETWORK_PATH_CACHE.size > 600) {
    ROAD_NETWORK_PATH_CACHE.clear();
  }
  ROAD_NETWORK_PATH_CACHE.set(cacheKey, result);
  return result;
}

const RACE_ROAD_PATH_CACHE = new Map<string, { x: number; z: number }[]>();

/**
 * Returns the complete obstacle-free, bridge-safe, corner-beveled road path for any WorldRaceEvent.
 * Every turn is smoothly beveled with a wide racing curve so pathways and boundaries are crystal-clear and wide at turns.
 */
export function computeRaceRoadPath(race: WorldRaceEvent): { x: number; z: number }[] {
  const cached = RACE_ROAD_PATH_CACHE.get(race.id);
  if (cached) return cached;

  // For multi-lap circuit races, build the 3D pathway corridor from 1 complete loop of checkpoints
  // so pathway walls and arrows never double-draw on top of themselves!
  const oneLapCps =
    race.laps && race.laps > 1
      ? race.checkpoints.slice(0, Math.max(1, Math.floor(race.checkpoints.length / race.laps)))
      : race.checkpoints;
  const allNodes = [{ x: race.startX, z: race.startZ }, ...oneLapCps];

  // 1. Construct clean orthogonal road-grid corner vertices between consecutive checkpoints for ALL races
  const rawCorners: { x: number; z: number }[] = [{ x: allNodes[0].x, z: allNodes[0].z }];
  for (let i = 0; i < allNodes.length - 1; i++) {
    const a = rawCorners[rawCorners.length - 1];
    const b = allNodes[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    if (Math.hypot(dx, dz) < 5) continue;

    if (Math.abs(dx) > 8 && Math.abs(dz) > 8) {
      // L-turn intersection at (b.x, a.z) which lies on CLEAN_RACE_GRID_COORDS and crosses river on a bridge
      rawCorners.push({ x: b.x, z: a.z });
    }
    rawCorners.push({ x: b.x, z: b.z });
  }

  // 2. Remove any duplicate or collinear intermediate vertices while keeping 100% of orthogonal corner turns intact
  const cleanedCorners: { x: number; z: number }[] = [rawCorners[0]];
  for (let i = 1; i < rawCorners.length; i++) {
    const prev = cleanedCorners[cleanedCorners.length - 1];
    const curr = rawCorners[i];
    if (Math.hypot(curr.x - prev.x, curr.z - prev.z) < 12) continue;

    if (cleanedCorners.length >= 2) {
      const prev2 = cleanedCorners[cleanedCorners.length - 2];
      const v1x = prev.x - prev2.x;
      const v1z = prev.z - prev2.z;
      const v2x = curr.x - prev.x;
      const v2z = curr.z - prev.z;
      const l1 = Math.hypot(v1x, v1z) || 1;
      const l2 = Math.hypot(v2x, v2z) || 1;
      const dot = (v1x * v2x + v1z * v2z) / (l1 * l2);
      if (dot > 0.985) {
        // Collinear straight continuation: merge into a single segment
        cleanedCorners[cleanedCorners.length - 1] = curr;
        continue;
      }
    }
    cleanedCorners.push(curr);
  }

  // Check if this is a closed-loop Circuit Race returning to (startX, startZ)
  const firstC = cleanedCorners[0];
  const lastC = cleanedCorners[cleanedCorners.length - 1];
  const isClosedLoop =
    cleanedCorners.length >= 4 && Math.hypot(lastC.x - firstC.x, lastC.z - firstC.z) < 28;

  // 3. Round every corner with a smooth quadratic Bezier arc (up to 48m radius > pathway halfWidth!)
  // so pathway walls never fold over or self-intersect at corners
  const beveledPath: { x: number; z: number }[] = [];
  if (isClosedLoop) {
    // Closed polygon vertices (excluding duplicate closing point)
    const loopVerts = cleanedCorners.slice(0, cleanedCorners.length - 1);
    const nV = loopVerts.length;
    for (let i = 0; i < nV; i++) {
      const pPrev = loopVerts[(i - 1 + nV) % nV];
      const pCorner = loopVerts[i];
      const pNext = loopVerts[(i + 1) % nV];

      const inDx = pCorner.x - pPrev.x;
      const inDz = pCorner.z - pPrev.z;
      const outDx = pNext.x - pCorner.x;
      const outDz = pNext.z - pCorner.z;
      const inLen = Math.hypot(inDx, inDz);
      const outLen = Math.hypot(outDx, outDz);
      const dot = inLen > 1 && outLen > 1 ? (inDx * outDx + inDz * outDz) / (inLen * outLen) : 1;

      if (inLen > 25 && outLen > 25 && dot < 0.98) {
        const bevelR = Math.min(22, inLen * 0.28, outLen * 0.28);
        const entryX = pCorner.x - (inDx / inLen) * bevelR;
        const entryZ = pCorner.z - (inDz / inLen) * bevelR;
        const exitX = pCorner.x + (outDx / outLen) * bevelR;
        const exitZ = pCorner.z + (outDz / outLen) * bevelR;

        const arcSteps = 8;
        for (let s = 0; s <= arcSteps; s++) {
          const t = s / arcSteps;
          const omt = 1 - t;
          const bx = omt * omt * entryX + 2 * omt * t * pCorner.x + t * t * exitX;
          const bz = omt * omt * entryZ + 2 * omt * t * pCorner.z + t * t * exitZ;
          beveledPath.push({ x: bx, z: bz });
        }
      } else {
        beveledPath.push(pCorner);
      }
    }
    if (beveledPath.length > 0) {
      beveledPath.push({ x: beveledPath[0].x, z: beveledPath[0].z });
    }
  } else {
    beveledPath.push(cleanedCorners[0]);
    for (let i = 1; i < cleanedCorners.length - 1; i++) {
      const pPrev = cleanedCorners[i - 1];
      const pCorner = cleanedCorners[i];
      const pNext = cleanedCorners[i + 1];

      const inDx = pCorner.x - pPrev.x;
      const inDz = pCorner.z - pPrev.z;
      const outDx = pNext.x - pCorner.x;
      const outDz = pNext.z - pCorner.z;
      const inLen = Math.hypot(inDx, inDz);
      const outLen = Math.hypot(outDx, outDz);
      const dot = inLen > 1 && outLen > 1 ? (inDx * outDx + inDz * outDz) / (inLen * outLen) : 1;

      if (inLen > 25 && outLen > 25 && dot < -0.92) {
        // 180° hairpin turnaround on a wide avenue: insert a smooth semicircular U-turn arc
        const uTurnR = 9.5;
        const ux = inDx / inLen;
        const uz = inDz / inLen;
        const nx = uz; // Right normal
        const nz = -ux;
        const arcSteps = 10;
        for (let s = 0; s <= arcSteps; s++) {
          const ang = (s / arcSteps) * Math.PI;
          const bx = pCorner.x - ux * (1 - Math.sin(ang)) * uTurnR + nx * Math.cos(ang) * uTurnR * 0.55;
          const bz = pCorner.z - uz * (1 - Math.sin(ang)) * uTurnR + nz * Math.cos(ang) * uTurnR * 0.55;
          beveledPath.push({ x: bx, z: bz });
        }
      } else if (inLen > 25 && outLen > 25) {
        const bevelR = Math.min(22, inLen * 0.28, outLen * 0.28);
        const entryX = pCorner.x - (inDx / inLen) * bevelR;
        const entryZ = pCorner.z - (inDz / inLen) * bevelR;
        const exitX = pCorner.x + (outDx / outLen) * bevelR;
        const exitZ = pCorner.z + (outDz / outLen) * bevelR;

        const arcSteps = 8;
        for (let s = 0; s <= arcSteps; s++) {
          const t = s / arcSteps;
          const omt = 1 - t;
          const bx = omt * omt * entryX + 2 * omt * t * pCorner.x + t * t * exitX;
          const bz = omt * omt * entryZ + 2 * omt * t * pCorner.z + t * t * exitZ;
          beveledPath.push({ x: bx, z: bz });
        }
      } else {
        beveledPath.push(pCorner);
      }
    }
    if (cleanedCorners.length > 1) {
      beveledPath.push(cleanedCorners[cleanedCorners.length - 1]);
    }
  }

  RACE_ROAD_PATH_CACHE.set(race.id, beveledPath);
  return beveledPath;
}

/**
 * Projects any race checkpoint onto the exact beveled race pathway centerline and returns
 * its centerline (x, z) and forward track tangent yaw so Checkpoint Gates sit dead-center inside the pathway.
 */
export function getCheckpointPoseOnRacePath(
  race: WorldRaceEvent,
  checkpointIndex: number
): { x: number; z: number; yaw: number } {
  const cp =
    race.checkpoints[checkpointIndex] ||
    race.checkpoints[race.checkpoints.length - 1] || {
      x: race.startX,
      z: race.startZ,
    };
  const pathPts = computeRaceRoadPath(race);
  if (pathPts.length < 2) {
    return { x: cp.x, z: cp.z, yaw: race.startHeading };
  }

  let bestDistSq = Infinity;
  let bestX = cp.x;
  let bestZ = cp.z;
  let bestYaw = race.startHeading;

  for (let i = 0; i < pathPts.length - 1; i++) {
    const a = pathPts[i];
    const b = pathPts[i + 1];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const abLenSq = abx * abx + abz * abz;
    if (abLenSq < 0.05) continue;

    const t = Math.max(0, Math.min(1, ((cp.x - a.x) * abx + (cp.z - a.z) * abz) / abLenSq));
    const cx = a.x + abx * t;
    const cz = a.z + abz * t;
    const dSq = (cp.x - cx) ** 2 + (cp.z - cz) ** 2;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestX = cx;
      bestZ = cz;
      // Blend tangent with next segment if near a vertex so corner gates face smoothly through the apex
      const nextB = pathPts[Math.min(pathPts.length - 1, i + 2)];
      const tx = nextB.x - a.x;
      const tz = nextB.z - a.z;
      bestYaw = Math.hypot(tx, tz) > 0.5 ? Math.atan2(tx, tz) : Math.atan2(abx, abz);
    }
  }

  return { x: bestX, z: bestZ, yaw: bestYaw };
}

interface DenseCorridorSample {
  x: number;
  z: number;
  tx: number;
  tz: number;
  halfWidth: number;
}

const RACE_CORRIDOR_CACHE = new Map<string, DenseCorridorSample[]>();

function getDenseRaceCorridorSamples(race: WorldRaceEvent): DenseCorridorSample[] {
  const cached = RACE_CORRIDOR_CACHE.get(race.id);
  if (cached) return cached;

  const rawPts = computeRaceRoadPath(race);
  if (rawPts.length < 2) return [];

  const densePts: { x: number; z: number }[] = [rawPts[0]];
  let accumDist = 0;
  for (let i = 0; i < rawPts.length - 1; i++) {
    const a = rawPts[i];
    const b = rawPts[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    if (segLen < 0.05) continue;
    const steps = Math.max(1, Math.ceil(segLen / 4));
    const subStepLen = segLen / steps;
    for (let s = 1; s <= steps; s++) {
      accumDist += subStepLen;
      if (accumDist >= 7.5 || (i === rawPts.length - 2 && s === steps)) {
        const t = s / steps;
        densePts.push({
          x: a.x + (b.x - a.x) * t,
          z: a.z + (b.z - a.z) * t,
        });
        accumDist = 0;
      }
    }
  }

  const nPts = densePts.length;
  const isClosedLoop =
    nPts >= 6 &&
    Math.hypot(densePts[nPts - 1].x - densePts[0].x, densePts[nPts - 1].z - densePts[0].z) < 16;

  const macroTurnPts: { x: number; z: number }[] = [];
  const lookWindow = 4;
  for (let i = 0; i < nPts; i++) {
    if (!isClosedLoop && (i < lookWindow || i >= nPts - lookWindow)) continue;
    const pBefore = isClosedLoop
      ? densePts[(i - lookWindow + nPts) % nPts]
      : densePts[i - lookWindow];
    const pApex = densePts[i];
    const pAfter = isClosedLoop
      ? densePts[(i + lookWindow) % nPts]
      : densePts[i + lookWindow];

    const inYaw = Math.atan2(pApex.x - pBefore.x, pApex.z - pBefore.z);
    const outYaw = Math.atan2(pAfter.x - pApex.x, pAfter.z - pApex.z);
    const turnDelta = Math.atan2(Math.sin(outYaw - inYaw), Math.cos(outYaw - inYaw));
    if (Math.abs(turnDelta) > 0.22) {
      macroTurnPts.push({ x: pApex.x, z: pApex.z });
    }
  }

  // Uniform pathway width across all race types (17.5m base half-width = 35m corridor, widening at turns)
  const baseHalfWidthM = 17.5;
  const samples: DenseCorridorSample[] = [];

  for (let i = 0; i < nPts; i++) {
    const curr = densePts[i];
    const pBack = isClosedLoop
      ? densePts[(i - 2 + nPts) % nPts]
      : densePts[Math.max(0, i - 2)];
    const pFwd = isClosedLoop
      ? densePts[(i + 2) % nPts]
      : densePts[Math.min(nPts - 1, i + 2)];
    const dx = pFwd.x - pBack.x;
    const dz = pFwd.z - pBack.z;
    const len = Math.hypot(dx, dz) || 1;

    let minTurnDist = Infinity;
    for (let t = 0; t < macroTurnPts.length; t++) {
      const d = Math.hypot(curr.x - macroTurnPts[t].x, curr.z - macroTurnPts[t].z);
      if (d < minTurnDist) minTurnDist = d;
    }

    const turnWideBoost =
      minTurnDist < 75 ? 4.0 * Math.pow(1 - minTurnDist / 75, 1.2) : 0;

    samples.push({
      x: curr.x,
      z: curr.z,
      tx: dx / len,
      tz: dz / len,
      halfWidth: baseHalfWidthM + turnWideBoost - 1.05,
    });
  }

  RACE_CORRIDOR_CACHE.set(race.id, samples);
  return samples;
}

/**
 * Enforces the physical Designated Race Pathway corridor walls during an active race.
 * Smoothly synced 1:1 with the 3D neon guardrails in WorldSceneCanvas so there are zero step-jumps or teleports.
 */
export function enforceDesignatedRacePathway(
  entity: {
    x: number;
    z: number;
    vx: number;
    vz: number;
    vy?: number;
    angularVelocity?: number;
  },
  race: WorldRaceEvent
): number | undefined {
  const samples = getDenseRaceCorridorSamples(race);
  if (samples.length < 2) return undefined;

  let bestDistSq = Infinity;
  let bestClosestX = entity.x;
  let bestClosestZ = entity.z;
  let bestHalfWidth = 16.5;

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const abLenSq = abx * abx + abz * abz;
    if (abLenSq < 0.01) continue;

    const apx = entity.x - a.x;
    const apz = entity.z - a.z;
    const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq));
    const cx = a.x + abx * t;
    const cz = a.z + abz * t;
    const dx = entity.x - cx;
    const dz = entity.z - cz;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestClosestX = cx;
      bestClosestZ = cz;
      bestHalfWidth = a.halfWidth + (b.halfWidth - a.halfWidth) * t;
    }
  }

  if (bestDistSq > bestHalfWidth * bestHalfWidth && bestDistSq < 220 * 220) {
    const dist = Math.sqrt(bestDistSq);
    const nx = (entity.x - bestClosestX) / dist; // Outward normal from pathway center
    const nz = (entity.z - bestClosestZ) / dist;
    entity.x = bestClosestX + nx * bestHalfWidth;
    entity.z = bestClosestZ + nz * bestHalfWidth;

    const vOutward = entity.vx * nx + entity.vz * nz;
    if (vOutward > 0) {
      const impact = vOutward;
      // Remove outward normal velocity smoothly while keeping tangential momentum along the barrier
      entity.vx = (entity.vx - nx * vOutward * 1.15) * 0.96;
      entity.vz = (entity.vz - nz * vOutward * 1.15) * 0.96;
      if (entity.vy !== undefined) entity.vy = 0;
      if (entity.angularVelocity !== undefined) entity.angularVelocity *= 0.55;
      return impact > 2.2 ? impact : undefined;
    }
  }

  return undefined;
}

// 14 Autonomous Roaming Traffic & Street Cars in Paris (Not shown as human players)
interface TrafficOrbitDef {
  id: string;
  vehicleId: string;
  paintHex: string;
  rimHex: string;
  route: 'peripherique_cw' | 'peripherique_ccw' | 'champs_ns' | 'rivoli_ew' | 'montmartre_loop';
  phase: number;
  speedRad: number;
  speedKmh: number;
}

const PARIS_TRAFFIC_DEFS: TrafficOrbitDef[] = [
  { id: 'trf_1', vehicleId: 'lambo-revuelto-v12', paintHex: '#F59E0B', rimHex: '#1E293B', route: 'peripherique_cw', phase: 0.2, speedRad: 0.18, speedKmh: 175 },
  { id: 'trf_2', vehicleId: 'bmw-m4-csl-g82', paintHex: '#06B6D4', rimHex: '#F8FAFC', route: 'peripherique_cw', phase: 1.8, speedRad: 0.16, speedKmh: 160 },
  { id: 'trf_3', vehicleId: 'ferrari-f80-hypercar', paintHex: '#EF4444', rimHex: '#1E293B', route: 'peripherique_cw', phase: 3.5, speedRad: 0.19, speedKmh: 185 },
  { id: 'trf_4', vehicleId: 'bugatti-tourbillon-v16', paintHex: '#3B82F6', rimHex: '#E2E8F0', route: 'peripherique_cw', phase: 5.1, speedRad: 0.21, speedKmh: 205 },
  { id: 'trf_5', vehicleId: 'pagani-utopia-coupe', paintHex: '#E2E8F0', rimHex: '#1E293B', route: 'peripherique_ccw', phase: 0.9, speedRad: 0.15, speedKmh: 150 },
  { id: 'trf_6', vehicleId: 'koenigsegg-jesko-attack', paintHex: '#F8FAFC', rimHex: '#1E293B', route: 'peripherique_ccw', phase: 2.6, speedRad: 0.17, speedKmh: 168 },
  { id: 'trf_7', vehicleId: 'mclaren-w1-hypercar', paintHex: '#F59E0B', rimHex: '#E2E8F0', route: 'peripherique_ccw', phase: 4.4, speedRad: 0.18, speedKmh: 178 },
  { id: 'trf_8', vehicleId: 'ferrari-laferrari-aperta', paintHex: '#EF4444', rimHex: '#F59E0B', route: 'champs_ns', phase: 0.4, speedRad: 0.24, speedKmh: 135 },
  { id: 'trf_9', vehicleId: 'bmw-m3-g80-comp', paintHex: '#10B981', rimHex: '#1E293B', route: 'champs_ns', phase: 2.2, speedRad: 0.22, speedKmh: 125 },
  { id: 'trf_10', vehicleId: 'mclaren-720s-spider', paintHex: '#F97316', rimHex: '#1E293B', route: 'champs_ns', phase: 4.1, speedRad: 0.25, speedKmh: 142 },
  { id: 'trf_11', vehicleId: 'lambo-aventador-svj', paintHex: '#38BDF8', rimHex: '#E2E8F0', route: 'rivoli_ew', phase: 1.2, speedRad: 0.22, speedKmh: 120 },
  { id: 'trf_12', vehicleId: 'bugatti-chiron-ss-300', paintHex: '#1E293B', rimHex: '#3B82F6', route: 'rivoli_ew', phase: 3.9, speedRad: 0.20, speedKmh: 112 },
  { id: 'trf_13', vehicleId: 'pagani-huayra-bc', paintHex: '#6366F1', rimHex: '#F8FAFC', route: 'montmartre_loop', phase: 0.7, speedRad: 0.28, speedKmh: 118 },
  { id: 'trf_14', vehicleId: 'bmw-m3-gtr-e46', paintHex: '#E2E8F0', rimHex: '#3B82F6', route: 'montmartre_loop', phase: 3.8, speedRad: 0.28, speedKmh: 118 },
];

export function getParisRoamingTraffic(
  nowSec: number,
  isRaceActive = false
): RoamingTrafficCarState[] {
  // Remove roaming AI traffic bots during active races so they never interfere with the player or race
  if (isRaceActive) {
    return [];
  }
  return PARIS_TRAFFIC_DEFS.map((def) => {
    const angle = def.phase + nowSec * def.speedRad;
    let x = 0;
    let z = 0;
    let heading = 0;

    if (def.route === 'peripherique_cw') {
      const r = 258;
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
      heading = Math.atan2(-Math.sin(angle), Math.cos(angle));
    } else if (def.route === 'peripherique_ccw') {
      const r = 272;
      x = Math.cos(-angle) * r;
      z = Math.sin(-angle) * r;
      heading = Math.atan2(Math.sin(-angle), -Math.cos(-angle));
    } else if (def.route === 'champs_ns') {
      // Drive along left/right lanes of Champs-Élysées (x = ±6.5, passing cleanly through the 22m wide Arc de Triomphe vault!)
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      x = c >= 0 ? 6.5 : -6.5;
      z = s * 315;
      heading = c >= 0 ? 0 : Math.PI;
    } else if (def.route === 'rivoli_ew') {
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      x = s * 315;
      z = c >= 0 ? -180 : 180;
      heading = c >= 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const s = Math.sin(angle);
      const c = Math.cos(angle);
      x = c >= 0 ? -180 : 180;
      z = s * 315;
      heading = c >= 0 ? 0 : Math.PI;
    }

    const speedMs = def.speedKmh / 3.6;
    const vx = Math.sin(heading) * speedMs;
    const vz = Math.cos(heading) * speedMs;
    const y = sampleWorldTerrain(x, z).heightY;

    return {
      id: def.id,
      vehicleId: def.vehicleId,
      paintHex: def.paintHex,
      rimHex: def.rimHex,
      x,
      y,
      z,
      vx,
      vz,
      heading,
      speedKmh: def.speedKmh,
    };
  });
}

export interface ControlInputState {
  throttle: number; // 0..1
  brake: number; // 0..1
  steerLeft: number; // 0..1
  steerRight: number; // 0..1
  handbrake: boolean;
  shiftUpRequested: boolean;
  shiftDownRequested: boolean;
  nitrousBoost: boolean;
  steerSensitivity?: number; // 0.3..1.2 (default 0.65)
}

export interface InternalPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  angularVelocity: number;
  pitchRad: number;
  rollRad: number;
  rpm: number;
  gear: number; // -1 = R, 1..6
  shiftCooldownSec: number;
  boostBar: number;
  nitroPct: number; // 0..100
  steeringAngle: number; // -1..1 smoothed
  activeDriftScore: number;
  bestDriftChain: number;
  driftBankTimerSec: number;
  lastSpeedTrapKmh: number;
  speedTrapCooldownSec: number;
  airtimeSec: number;
  takeoffX: number;
  takeoffZ: number;
  jumpDistanceM: number;
}

export function createInitialPhysicsState(): InternalPhysicsState {
  return {
    x: 0,
    y: 0,
    z: 45,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: Math.PI, // Facing North (-Z) down the main festival runway
    angularVelocity: 0,
    pitchRad: 0,
    rollRad: 0,
    rpm: 1000,
    gear: 1,
    shiftCooldownSec: 0,
    boostBar: 0,
    nitroPct: 100,
    steeringAngle: 0,
    activeDriftScore: 0,
    bestDriftChain: 0,
    driftBankTimerSec: 0,
    lastSpeedTrapKmh: 0,
    speedTrapCooldownSec: 0,
    airtimeSec: 0,
    takeoffX: 0,
    takeoffZ: 0,
    jumpDistanceM: 0,
  };
}

export function stepVehiclePhysics(
  state: InternalPhysicsState,
  controls: ControlInputState,
  spec: VehicleSpec,
  tune: VehicleTune,
  benchmark: DynoBenchmark,
  dt: number,
  nowSec?: number,
  remoteCars?: { x: number; z: number; vx?: number; vz?: number }[],
  activeRace?: WorldRaceEvent | null
): {
  telemetry: TelemetryFrame;
  triggeredSpeedTrap?: number;
  triggeredJumpDistance?: number;
  bankedDriftScore?: number;
  collisionImpactMs?: number;
} {
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  const terrain = sampleWorldTerrain(state.x, state.z, state.y);

  // Smooth steering input with responsive authority
  const rawSteer = controls.steerLeft - controls.steerRight;
  const sensitivity = controls.steerSensitivity ?? 0.65;
  const progressiveSteer =
    Math.sign(rawSteer) * Math.pow(Math.min(1, Math.abs(rawSteer)), 1.15) * sensitivity;
  const steerRate = 6.5;
  state.steeringAngle +=
    (progressiveSteer - state.steeringAngle) * Math.min(1, steerRate * clampedDt);

  // Transform world velocity (vx, vz) into vehicle local frame (forward, lateral)
  const sinH = Math.sin(state.heading);
  const cosH = Math.cos(state.heading);
  // Vehicle forward vector is (sinH, cosH)
  const vForward = state.vx * sinH + state.vz * cosH;
  const vLateral = state.vx * cosH - state.vz * sinH;
  const speedMs = Math.hypot(state.vx, state.vz);
  const speedKmh = speedMs * 3.6;

  // Brand-Specific IRL Transmission Mechanics (Koenigsegg LST, Ferrari F1 DCT, McLaren SSG, BMW M-DCT, etc.)
  const archetype = spec.designArchetype || 'standard';
  const brandShiftTimeSec =
    archetype === 'koenigsegg'
      ? 0.05
      : archetype === 'ferrari'
      ? 0.07
      : archetype === 'mclaren' || archetype === 'lamborghini' || archetype === 'bugatti'
      ? 0.08
      : archetype === 'bmw'
      ? 0.09
      : 0.16;

  // Automatic / Manual Transmission Shifting
  if (state.shiftCooldownSec > 0) {
    state.shiftCooldownSec = Math.max(0, state.shiftCooldownSec - clampedDt);
  }

  // Stationary Tire Burnout detection: triggered when brake and throttle are held simultaneously while stationary
  const isStationaryBurnout =
    state.y <= terrain.heightY + 0.18 &&
    speedMs < 2.4 &&
    controls.throttle > 0.2 &&
    controls.brake > 0.2;

  if (tune.transmissionMode === 'Manual') {
    if (controls.shiftUpRequested && state.gear < 6 && state.shiftCooldownSec <= 0) {
      state.gear += 1;
      state.shiftCooldownSec = brandShiftTimeSec;
    } else if (controls.shiftDownRequested && state.gear > -1 && state.shiftCooldownSec <= 0) {
      state.gear = state.gear === 1 ? -1 : state.gear - 1;
      state.shiftCooldownSec = brandShiftTimeSec;
    }
  } else {
    // Smart Automatic + Reverse logic (ensure 1st gear is engaged during stationary burnout)
    if (isStationaryBurnout) {
      state.gear = 1;
    } else if (controls.brake > 0.5 && controls.throttle < 0.1 && vForward < 0.8 && state.gear > 0) {
      state.gear = -1;
    } else if (controls.throttle > 0.2 && state.gear === -1 && vForward > -2.5) {
      state.gear = 1;
    } else if (state.gear > 0 && state.shiftCooldownSec <= 0) {
      const upshiftRpm = spec.redlineRPM * 0.94;
      const downshiftRpm = spec.redlineRPM * 0.48;
      if (state.rpm >= upshiftRpm && state.gear < 6 && vForward > 3) {
        state.gear += 1;
        state.shiftCooldownSec = brandShiftTimeSec;
      } else if (state.rpm <= downshiftRpm && state.gear > 1) {
        state.gear -= 1;
        state.shiftCooldownSec = brandShiftTimeSec;
      }
    }
  }

  // Compute wheel RPM & engine RPM
  const tireRadiusM =
    spec.bodyStyle === 'heavy_truck'
      ? 0.52
      : spec.bodyStyle === 'baja_truck'
      ? 0.44
      : spec.bodyStyle === 'suv_4x4'
      ? 0.4
      : 0.34;
  const activeGearRatio =
    state.gear === -1
      ? -3.15
      : tune.gearRatios[Math.max(0, Math.min(5, state.gear - 1))] ?? 2.5;
  const wheelAngularVel = vForward / tireRadiusM;
  const wheelDrivenRpm =
    (Math.abs(wheelAngularVel) * Math.abs(activeGearRatio) * tune.finalDrive * 60) /
    (2 * Math.PI);

  const freeRevRpm = spec.idleRPM + controls.throttle * (spec.redlineRPM - spec.idleRPM) * 0.85;
  // During a stationary burnout, driven wheels break traction and spin freely up toward redline with limiter bounce
  const burnoutFreeSpinRpm =
    spec.idleRPM +
    controls.throttle * (spec.redlineRPM - spec.idleRPM) * 0.94 +
    Math.sin((nowSec ?? 0) * 54) * 120;
  const targetRpm = isStationaryBurnout
    ? Math.max(spec.idleRPM, burnoutFreeSpinRpm)
    : Math.max(spec.idleRPM, Math.max(wheelDrivenRpm, freeRevRpm * 0.42));
  state.rpm += (Math.min(spec.maxRPM, targetRpm) - state.rpm) * Math.min(1, 14 * clampedDt);

  // Boost spool simulation
  const targetBoost =
    tune.aspiration === 'NA'
      ? 0
      : controls.throttle *
        tune.boostPressureBar *
        Math.min(1, Math.max(0.15, (state.rpm - spec.idleRPM) / (spec.redlineRPM * 0.55)));
  state.boostBar += (targetBoost - state.boostBar) * Math.min(1, 6.5 * clampedDt);

  // Engine torque & wheel drive force (Koenigsegg LST / KDD & Ferrari F1 DCT maintain seamless torque during shifts)
  const { torqueNm } = evaluateEngineTorqueAtRPM(spec, tune, state.rpm);
  const shiftTorqueCut =
    state.shiftCooldownSec > 0.03
      ? archetype === 'koenigsegg'
        ? 0.95
        : archetype === 'ferrari' || archetype === 'mclaren' || archetype === 'bugatti'
        ? 0.82
        : 0.35
      : 1.0;

  // Rev limiter cut at maxRPM
  const limiterCut = state.rpm >= spec.maxRPM - 80 ? 0.15 : 1.0;

  let throttleInput = controls.throttle;
  let brakeInput = controls.brake;
  // In automatic mode, holding brake while in Reverse acts as reverse throttle
  if (tune.transmissionMode === 'Automatic' && state.gear === -1) {
    throttleInput = controls.brake;
    brakeInput = controls.throttle;
  }

  const drivelineEfficiency = tune.drivetrain === 'AWD' ? 0.87 : 0.91;

  // Limited Nitrous System: drains at 28%/s when boosting with throttle, slowly refills at 8.5%/s when released
  const canUseNitro = controls.nitrousBoost && throttleInput > 0.1 && state.nitroPct > 1.0;
  if (canUseNitro) {
    state.nitroPct = Math.max(0, state.nitroPct - 28.0 * clampedDt);
  } else if (!controls.nitrousBoost) {
    state.nitroPct = Math.min(100, state.nitroPct + 8.5 * clampedDt);
  }

  const envState = getDynamicWeatherAndDayState(nowSec ?? performance.now() / 1000);

  // Off-Road Surface Grip & Engine Strength Reduction (Sand, Grass/Dirt, Gravel, Snow)
  // Trucks & 4x4 Off-Road vehicles are purpose-built for grass & sand and suffer ZERO deceleration or grip/power loss!
  const isOffRoadSurface =
    terrain.surface === 'Sand' ||
    terrain.surface === 'Dirt' ||
    terrain.surface === 'Gravel' ||
    terrain.surface === 'Snow';
  const catLower = (spec.category || '').toLowerCase();
  const isTruckOrOffroadVehicle =
    spec.bodyStyle === 'baja_truck' ||
    spec.bodyStyle === 'suv_4x4' ||
    spec.bodyStyle === 'heavy_truck' ||
    catLower.includes('truck') ||
    catLower.includes('4x4') ||
    catLower.includes('off-road') ||
    catLower.includes('rally') ||
    tune.tireCompound === 'RallyGravel' ||
    tune.rideHeightMm >= 165;
  const isLowSlungSupercar =
    !isTruckOrOffroadVehicle &&
    (spec.defaultTune.rideHeightMm < 126 ||
      tune.rideHeightMm < 118 ||
      tune.tireCompound === 'SemiSlick' ||
      benchmark.piClass === 'X' ||
      benchmark.piClass === 'S2');

  let offRoadEnginePowerPenalty = 1.0;
  let offRoadSurfaceGripPenalty = 1.0;
  if (isOffRoadSurface) {
    if (isTruckOrOffroadVehicle) {
      // Trucks are built for grass & sand: 100% full engine power and 100% full surface grip!
      offRoadEnginePowerPenalty = 1.0;
      offRoadSurfaceGripPenalty = 1.0;
    } else if (isLowSlungSupercar) {
      offRoadEnginePowerPenalty = terrain.surface === 'Sand' ? 0.88 : 0.92;
      offRoadSurfaceGripPenalty = terrain.surface === 'Sand' ? 0.88 : 0.92;
    } else {
      offRoadEnginePowerPenalty = terrain.surface === 'Sand' ? 0.92 : 0.95;
      offRoadSurfaceGripPenalty = terrain.surface === 'Sand' ? 0.92 : 0.95;
    }
  }

  const effectiveEnginePowerMult = envState.enginePowerMultiplier * offRoadEnginePowerPenalty;

  const rawWheelForceN =
    ((torqueNm *
      effectiveEnginePowerMult *
      throttleInput *
      shiftTorqueCut *
      limiterCut *
      activeGearRatio *
      tune.finalDrive *
      drivelineEfficiency) /
      tireRadiusM) *
    1.18 *
    (canUseNitro ? 1.32 : 1.0);

  // Surface Grip & Tire Compound Lookup + Dynamic Weather & Mild Off-Road Surface Grip Modifiers
  const compound = TIRE_GRIP_TABLE[tune.tireCompound];
  const rawSurfaceGrip = isTruckOrOffroadVehicle
    ? Math.max(compound.asphalt, compound.dirt, compound.sand)
    : terrain.surface === 'Asphalt'
    ? compound.asphalt
    : terrain.surface === 'Curb'
    ? compound.curb
    : terrain.surface === 'Dirt' || terrain.surface === 'Gravel'
    ? compound.dirt
    : terrain.surface === 'Snow'
    ? compound.sand * 0.95
    : compound.sand;
  const baseSurfaceGrip = rawSurfaceGrip * envState.gripMultiplier * offRoadSurfaceGripPenalty;
  const surfaceGripRatio = isTruckOrOffroadVehicle
    ? 1.0
    : Math.max(0.84, baseSurfaceGrip / Math.max(0.7, compound.asphalt));

  // Aerodynamic Downforce & Brand Active Aero (Koenigsegg Boomerang Wing, Pagani 4-Flap, Lamborghini ALA 2.0)
  const aeroMultiplier = Math.pow(speedMs / 55.5, 2); // Normalized around 200 km/h (55.5 m/s)
  const brandCorneringAeroBonus =
    archetype === 'koenigsegg' || archetype === 'pagani'
      ? 1.15
      : archetype === 'lamborghini' && Math.abs(state.steeringAngle) > 0.18
      ? 1.14
      : archetype === 'ferrari' || archetype === 'mclaren' || archetype === 'bugatti'
      ? 1.1
      : 1.0;
  const frontDownforceN = tune.frontDownforceKg * 9.81 * aeroMultiplier * brandCorneringAeroBonus;
  const rearDownforceN = tune.rearDownforceKg * 9.81 * aeroMultiplier * brandCorneringAeroBonus;
  const totalDownforceN = frontDownforceN + rearDownforceN;

  const massKg = benchmark.curbWeightKg;
  const weightN = massKg * 9.81;

  // Tire maximum traction capacity
  const maxTireForceN = (weightN + totalDownforceN) * baseSurfaceGrip;

  // IRL-Calibrated Acceleration & Drive Force (balanced launch & high-speed acceleration):
  const irlTarget0To100AccelMs2 = (27.78 / Math.max(1.65, benchmark.zeroTo100KmhSec)) * 1.18;
  const irlTopSpeedMs = Math.max(36, benchmark.topSpeedKmh / 3.6);
  // Torque-curve modulation factor around peak torque
  const torqueBandFactor = Math.max(0.8, Math.min(1.18, torqueNm / Math.max(120, benchmark.peakTorqueNm)));
  // Lamborghini ALA 2.0 & McLaren/Koenigsegg DRS Aero Stalling boosts straight-line pull above 170 km/h
  const isAeroStallingStraight =
    (archetype === 'lamborghini' || archetype === 'koenigsegg' || archetype === 'mclaren' || archetype === 'bugatti') &&
    speedKmh > 170 &&
    Math.abs(state.steeringAngle) < 0.2;
  // High-speed power taper so acceleration pulls smoothly toward top speed
  const speedRatioToTop = Math.min(1.25, Math.abs(vForward) / irlTopSpeedMs);
  const highSpeedForceTaper =
    Math.max(0.34, 1.14 - 0.58 * Math.pow(speedRatioToTop, 0.85)) *
    (isAeroStallingStraight ? 1.07 : 1.0);

  const irlCalibratedDriveForceN =
    Math.sign(activeGearRatio) *
    massKg *
    irlTarget0To100AccelMs2 *
    effectiveEnginePowerMult *
    highSpeedForceTaper *
    torqueBandFactor *
    throttleInput *
    shiftTorqueCut *
    limiterCut *
    surfaceGripRatio *
    (canUseNitro ? 1.32 : 1.0);

  // Blend 78% IRL-calibrated force + 22% raw gearbox wheel force for authentic gear-by-gear feel
  const blendedWheelForceN = irlCalibratedDriveForceN * 0.78 + rawWheelForceN * 0.22;

  // Traction control & wheelspin calculation (Ferrari E-Diff3 & Bugatti/BMW M xDrive Torque Vectoring)
  const drivenAxleShare =
    tune.drivetrain === 'AWD'
      ? archetype === 'bugatti' || archetype === 'lamborghini' || archetype === 'bmw'
        ? 1.02
        : 0.98
      : tune.drivetrain === 'RWD'
      ? archetype === 'ferrari' || archetype === 'mclaren' || archetype === 'pagani' || archetype === 'koenigsegg'
        ? 0.88
        : 0.82
      : 0.72;
  const maxDriveForceN = Math.max(
    maxTireForceN * drivenAxleShare * 1.22,
    massKg * irlTarget0To100AccelMs2 * surfaceGripRatio * 1.12
  );
  let wheelSpinRatio = Math.max(
    0,
    (Math.abs(blendedWheelForceN) - maxDriveForceN * 0.92) / Math.max(1000, maxDriveForceN)
  );

  let appliedDriveForceN = blendedWheelForceN;
  if (Math.abs(blendedWheelForceN) > maxDriveForceN) {
    if (tune.tcsEnabled && !isStationaryBurnout) {
      appliedDriveForceN = Math.sign(blendedWheelForceN) * maxDriveForceN * 0.98;
      wheelSpinRatio *= 0.2;
    } else {
      appliedDriveForceN = Math.sign(blendedWheelForceN) * maxDriveForceN * 0.94;
    }
  }

  // During a stationary burnout (brake + throttle held simultaneously while stationary),
  // driven wheels spin rapidly while front brakes hold the chassis in place
  if (isStationaryBurnout) {
    const burnoutRpmNorm = Math.max(
      0,
      Math.min(1, (state.rpm - spec.idleRPM) / Math.max(1000, spec.redlineRPM - spec.idleRPM))
    );
    wheelSpinRatio = Math.max(
      wheelSpinRatio,
      0.45 + burnoutRpmNorm * 1.35 * controls.throttle
    );
  }

  // IRL-Calibrated Braking Force + Active Hydraulic Airbrake (Bugatti, McLaren, Pagani, Koenigsegg):
  const hasActiveAirbrake =
    (archetype === 'bugatti' ||
      archetype === 'mclaren' ||
      archetype === 'pagani' ||
      archetype === 'koenigsegg') &&
    speedKmh > 100 &&
    brakeInput > 0.25;
  const airbrakeBonus = hasActiveAirbrake ? 1.12 : 1.0;

  const irlBrakeDecelMs2 =
    (385.8 / Math.max(21.5, benchmark.braking100To0M)) *
    1.16 *
    airbrakeBonus *
    surfaceGripRatio *
    (tune.absEnabled ? 1.06 : 0.95);
  const maxBrakeForceN = massKg * irlBrakeDecelMs2;
  const brakingForceN =
    speedMs > 0.2 ? -Math.sign(vForward || 1) * brakeInput * maxBrakeForceN : 0;

  // Handbrake Force (for drift initiation & emergency stopping)
  const handbrakeForceN =
    controls.handbrake && speedMs > 0.5 ? -Math.sign(vForward || 1) * maxTireForceN * 0.68 : 0;

  // IRL-Calibrated Aerodynamic Drag & Rolling Resistance so terminal velocity equals benchmark.topSpeedKmh
  const effectiveVmaxMs = irlTopSpeedMs * (canUseNitro ? 1.09 : 1.0);
  const topSpeedEquilibriumForceN =
    massKg * irlTarget0To100AccelMs2 * 0.44 * (canUseNitro ? 1.35 : 1.0);
  const rollingResistCoeff = isTruckOrOffroadVehicle
    ? 32
    : terrain.surface === 'Sand'
    ? isLowSlungSupercar
      ? 54
      : 44
    : terrain.surface === 'Dirt' || terrain.surface === 'Gravel' || terrain.surface === 'Snow'
    ? isLowSlungSupercar
      ? 46
      : 40
    : 32;
  const rollingResistN = -vForward * rollingResistCoeff;
  const calibratedAeroDragK = Math.max(
    0.25,
    (topSpeedEquilibriumForceN - rollingResistCoeff * effectiveVmaxMs) /
      (effectiveVmaxMs * effectiveVmaxMs)
  );
  const dragForceN = -Math.sign(vForward || 1) * calibratedAeroDragK * vForward * vForward;

  // Check if airborne
  const isAirborne = state.y > terrain.heightY + 0.18;

  const netLongitudinalForceN = isAirborne
    ? dragForceN * 0.5
    : appliedDriveForceN + brakingForceN + handbrakeForceN + dragForceN + rollingResistN;

  const accelLongitudinalMs2 = netLongitudinalForceN / massKg;

  // Lateral Cornering & Drift Physics (Includes Lamborghini LDVI 4-Wheel Steering & Ferrari SSC 8.0 / BMW M Drift Control)
  // Balance ratio from tune determines oversteer/drift eagerness
  const oversteerBias = benchmark.balanceRatio; // 0..1
  const highSpeedSteerDamp = 1 / (1 + Math.pow(speedKmh / 145, 1.45));
  const rearWheelSteerBonus =
    archetype === 'lamborghini' || archetype === 'pagani' || archetype === 'mclaren'
      ? 1.09
      : archetype === 'ferrari' || archetype === 'koenigsegg' || archetype === 'bmw'
      ? 1.06
      : 1.0;
  // Realistic physical front-wheel steer angle (~16 degrees max at low speed, tapering at high speed)
  const frontWheelSteerRad =
    state.steeringAngle * 0.28 * (0.28 + highSpeedSteerDamp * 0.72) * rearWheelSteerBonus;
  const turnCurvature = frontWheelSteerRad / spec.wheelbaseM;

  // Engage vehicle turning as soon as the car has minimal motion
  const isMoving = speedMs > 0.15 && Math.abs(vForward) > 0.1;
  const motionEngagement = isMoving ? Math.min(1, (speedMs - 0.15) / 2.2) : 0;
  const directionSign = vForward >= 0 ? 1 : -1;

  const targetYawRate = !isMoving
    ? 0
    : isAirborne
    ? state.angularVelocity * 0.98
    : turnCurvature *
      Math.min(speedMs, 38) *
      motionEngagement *
      directionSign *
      (0.95 + (oversteerBias - 0.5) * 0.45);

  const yawStiffness = controls.handbrake
    ? 5.2
    : tune.tireCompound === 'DriftCompound'
    ? 6.4
    : 9.8 * baseSurfaceGrip;

  if (!isMoving) {
    state.angularVelocity = 0;
  } else {
    state.angularVelocity +=
      (targetYawRate - state.angularVelocity) * Math.min(1, yawStiffness * clampedDt);

    // Handbrake or high rear-wheelspin induces drift yaw moment only when moving at speed
    if (!isAirborne && speedKmh > 28) {
      if (controls.handbrake) {
        state.angularVelocity += state.steeringAngle * 1.15 * clampedDt;
      } else if (wheelSpinRatio > 0.18 && tune.drivetrain === 'RWD') {
        state.angularVelocity +=
          state.steeringAngle * Math.min(0.85, wheelSpinRatio * 0.75) * clampedDt;
      }
    }

    // Low-slung supercars bottom out and suffer steering deflection over off-road bumps/ruts at speed
    if (!isAirborne && isOffRoadSurface && isLowSlungSupercar && speedKmh > 65) {
      const bumpPhase = Math.sin(state.x * 0.22 + state.z * 0.19) * Math.cos(state.z * 0.27 - state.x * 0.14);
      if (Math.abs(bumpPhase) > 0.62) {
        state.angularVelocity += Math.sign(bumpPhase) * 0.95 * clampedDt;
      }
    }

    state.heading += state.angularVelocity * clampedDt;
  }

  // Lateral grip damping (Ferrari SSC 8.0 & BMW M Drift Analyzer stabilize high-angle slides)
  const brandLateralStability =
    archetype === 'ferrari' || archetype === 'bmw' || archetype === 'mclaren'
      ? 1.08
      : archetype === 'lamborghini' || archetype === 'pagani' || archetype === 'koenigsegg' || archetype === 'bugatti'
      ? 1.06
      : 1.0;
  let lateralGripRate =
    baseSurfaceGrip * 7.5 * brandLateralStability * (1.0 - (oversteerBias - 0.45) * 0.4);
  if (controls.handbrake) {
    lateralGripRate *= 0.28;
  } else if (wheelSpinRatio > 0.1 && tune.drivetrain === 'RWD') {
    lateralGripRate *= Math.max(0.38, 1.0 - wheelSpinRatio * 0.5);
  }

  let newVForward = vForward + accelLongitudinalMs2 * clampedDt;
  let newVLateral = isAirborne
    ? vLateral * 0.995
    : vLateral * Math.max(0, 1 - lateralGripRate * clampedDt);

  // Stationary burnout line-lock: hold vehicle stationary while spinning driven tires
  if (isStationaryBurnout) {
    newVForward = vForward * Math.max(0, 1 - 18 * clampedDt);
    newVLateral = vLateral * Math.max(0, 1 - 18 * clampedDt);
    if (Math.abs(newVForward) < 0.08) newVForward = 0;
    if (Math.abs(newVLateral) < 0.08) newVLateral = 0;

    if (Math.abs(state.steeringAngle) > 0.05) {
      const burnoutRpmNorm = Math.max(
        0,
        Math.min(1, (state.rpm - spec.idleRPM) / Math.max(1000, spec.redlineRPM - spec.idleRPM))
      );
      state.angularVelocity = state.steeringAngle * 0.85 * burnoutRpmNorm * controls.throttle;
      state.heading += state.angularVelocity * clampedDt;
    } else {
      state.angularVelocity = 0;
    }
  }

  // Clean zero-velocity rest clamp when stopped with no throttle
  if (
    Math.abs(newVForward) < 0.22 &&
    throttleInput < 0.05 &&
    (state.gear > 0 || controls.brake < 0.05)
  ) {
    newVForward = 0;
    newVLateral = 0;
    state.angularVelocity = 0;
  }

  // Convert back to world (vx, vz) using updated heading
  const newSinH = Math.sin(state.heading);
  const newCosH = Math.cos(state.heading);
  state.vx = newVForward * newSinH + newVLateral * newCosH;
  state.vz = newVForward * newCosH - newVLateral * newSinH;

  // ============================================================================
  // HORIZONTAL MOVEMENT + SOLID IRL COLLISIONS (BUILDINGS, MONUMENTS & CARS)
  // ============================================================================
  const prevX = state.x;
  const prevZ = state.z;
  const prevGroundY = terrain.heightY;

  state.x += state.vx * clampedDt;
  state.z += state.vz * clampedDt;

  let collisionImpactMs: number | undefined;
  const carRadius = 1.52;

  // Prevent side-of-ramp step-up bug ONLY at the 2 dedicated stunt ramps:
  const nearBoulogneRamp = Math.hypot(state.x - -210, state.z - 210) < 28;
  const nearParisRamp = Math.hypot(state.x - 28, state.z - -95) < 24;
  const rawNextTerrain = sampleWorldTerrain(state.x, state.z, state.y);
  if (
    (nearBoulogneRamp || nearParisRamp) &&
    rawNextTerrain.heightY - prevGroundY > 0.55 &&
    state.y <= prevGroundY + 0.35
  ) {
    state.x = prevX;
    state.z = prevZ;
    state.vx *= -0.3;
    state.vz *= -0.3;
    collisionImpactMs = Math.max(collisionImpactMs ?? 0, Math.hypot(state.vx, state.vz));
  }

  // 1. If an active race is in progress, enforce the Designated Race Pathway barriers first
  if (activeRace) {
    const pathwayImpact = enforceDesignatedRacePathway(state, activeRace);
    if (pathwayImpact !== undefined) {
      collisionImpactMs = Math.max(collisionImpactMs ?? 0, pathwayImpact);
    }
  }

  // 2. Resolve Solid Collisions with all Buildings, Mountains, Monuments, Columns, Trees, Bridge Guardrails & River Embankments
  const worldImpact = resolveSolidWorldCollisionsForEntity(state, carRadius, prevX, prevZ);
  if (worldImpact !== undefined) {
    collisionImpactMs = Math.max(collisionImpactMs ?? 0, worldImpact);
  }

  // 3. Resolve IRL Car-to-Car Collisions with Roaming Paris Traffic (disabled during races) & Connected Multiplayer Cars
  const trafficList = getParisRoamingTraffic(
    nowSec ?? performance.now() / 1000,
    Boolean(activeRace)
  );
  const allOtherCars: { x: number; z: number; vx: number; vz: number }[] = [
    ...trafficList.map((tc) => ({ x: tc.x, z: tc.z, vx: tc.vx, vz: tc.vz })),
    ...(remoteCars || []).map((rc) => ({ x: rc.x, z: rc.z, vx: rc.vx ?? 0, vz: rc.vz ?? 0 })),
  ];

  const carToCarMinDist = 2.45;
  for (let i = 0; i < allOtherCars.length; i++) {
    const oc = allOtherCars[i];
    const dx = state.x - oc.x;
    const dz = state.z - oc.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < carToCarMinDist * carToCarMinDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const nz = dz / dist;
      // Push player car out horizontally so cars never overlap or launch into the sky
      state.x = oc.x + nx * carToCarMinDist;
      state.z = oc.z + nz * carToCarMinDist;

      const relVx = state.vx - oc.vx;
      const relVz = state.vz - oc.vz;
      const relNormal = relVx * nx + relVz * nz;
      if (relNormal < 0) {
        const impactSpeed = Math.abs(relNormal);
        if (impactSpeed > 1.5) {
          collisionImpactMs = Math.max(collisionImpactMs ?? 0, impactSpeed);
        }
        const impulse = -(1 + 0.42) * relNormal * 0.65;
        state.vx += impulse * nx;
        state.vz += impulse * nz;
        state.vy = 0;
        state.angularVelocity += (nx * newCosH - nz * newSinH) * 0.45;
      }
    }
  }

  // World Boundary Soft Wall (-7800m to +7800m -> 15.6km x 15.6km Open World)
  const worldLimit = 7800;
  if (Math.abs(state.x) > worldLimit) {
    state.x = Math.sign(state.x) * worldLimit;
    state.vx *= -0.45;
  }
  if (Math.abs(state.z) > worldLimit) {
    state.z = Math.sign(state.z) * worldLimit;
    state.vz *= -0.45;
  }

  // Grounded Vertical & Multi-Point Sand/Mountain Slope Physics (Guarantees the car NEVER sinks beneath sand or hills)
  // Passing state.y ensures cars on the ground pass smoothly UNDER elevated highways instead of snapping to the upper deck!
  const nextTerrain = sampleWorldTerrain(state.x, state.z, state.y);
  const frontWheelTerrain = sampleWorldTerrain(
    state.x + newSinH * 1.65,
    state.z + newCosH * 1.65,
    state.y
  );
  const rearWheelTerrain = sampleWorldTerrain(
    state.x - newSinH * 1.65,
    state.z - newCosH * 1.65,
    state.y
  );
  const leftWheelTerrain = sampleWorldTerrain(
    state.x + newCosH * 0.95,
    state.z - newSinH * 0.95,
    state.y
  );
  const rightWheelTerrain = sampleWorldTerrain(
    state.x - newCosH * 0.95,
    state.z + newSinH * 0.95,
    state.y
  );

  // Effective ground contact height takes the envelope of center + front/rear/side wheel contact points
  const effectiveGroundY = Math.max(
    nextTerrain.heightY,
    (frontWheelTerrain.heightY + rearWheelTerrain.heightY) * 0.5,
    (leftWheelTerrain.heightY + rightWheelTerrain.heightY) * 0.5,
    frontWheelTerrain.heightY - 0.14,
    rearWheelTerrain.heightY - 0.14
  );

  const heightDelta = effectiveGroundY - prevGroundY;
  const onStuntRamp = nearBoulogneRamp || nearParisRamp;
  const flyoverCheck = evaluateFlyoverElevation(state.x, state.z);
  const onElevatedFlyover =
    flyoverCheck.onFlyover &&
    flyoverCheck.heightY > 0.05 &&
    (flyoverCheck.heightY < 2.6 || state.y >= flyoverCheck.heightY - 2.6);
  const clampedSlopeVy = onStuntRamp
    ? Math.max(-5.0, Math.min(7.8, (heightDelta / clampedDt) * 0.78))
    : Math.max(-6.0, Math.min(3.2, (heightDelta / clampedDt) * 0.35));

  let triggeredJumpDistance: number | undefined;

  // Keep vehicle 100% planted on Elevated Highway Flyovers so it never jumps off the ramp or deck at high speed!
  if (onElevatedFlyover) {
    state.airtimeSec = 0;
    state.y = effectiveGroundY;
    state.vy = 0;
    state.takeoffX = state.x;
    state.takeoffZ = state.z;
  } else if (
    (!onStuntRamp && state.airtimeSec === 0 && Math.abs(heightDelta) < 1.15) ||
    (state.y <= effectiveGroundY + 0.28 && state.vy <= clampedSlopeVy + 2.2)
  ) {
    if (state.airtimeSec > 0.45) {
      const dist = Math.round(Math.hypot(state.x - state.takeoffX, state.z - state.takeoffZ));
      if (dist >= 12) {
        state.jumpDistanceM = dist;
        triggeredJumpDistance = dist;
      }
    }
    state.airtimeSec = 0;
    state.y = effectiveGroundY;
    state.vy = onStuntRamp ? Math.max(0, clampedSlopeVy) : 0;
    state.takeoffX = state.x;
    state.takeoffZ = state.z;
  } else {
    state.airtimeSec += clampedDt;
    state.vy = Math.max(-28, Math.min(9.5, state.vy - 21.0 * clampedDt));
    state.y += state.vy * clampedDt;
    if (state.y <= effectiveGroundY) {
      if (state.airtimeSec > 0.45) {
        const dist = Math.round(Math.hypot(state.x - state.takeoffX, state.z - state.takeoffZ));
        if (dist >= 12) {
          state.jumpDistanceM = dist;
          triggeredJumpDistance = dist;
        }
      }
      state.y = effectiveGroundY;
      state.vy = 0;
      state.airtimeSec = 0;
    }
  }
  // Final safety floor: never allow car y below effectiveGroundY
  if (state.y < effectiveGroundY) {
    state.y = effectiveGroundY;
  }

  // Slip angle in degrees
  const slipAngleRad = speedMs > 2.2 ? Math.atan2(newVLateral, Math.abs(newVForward)) : 0;
  const slipAngleDeg = Number(((slipAngleRad * 180) / Math.PI).toFixed(1));

  // Longitudinal & Lateral G-forces + Dynamic Axle Weight Transfer
  const longitudinalG = Number((accelLongitudinalMs2 / 9.81).toFixed(2));
  const lateralAccelMs2 = state.angularVelocity * newVForward;
  const lateralG = Number((lateralAccelMs2 / 9.81).toFixed(2));

  // Weight transfer delta (kg) = (cgHeight / wheelbase) * mass * longG
  const staticFrontKg = massKg * spec.weightDistributionFront;
  const staticRearKg = massKg * (1 - spec.weightDistributionFront);
  const transferKg = (spec.cgHeightM / spec.wheelbaseM) * massKg * longitudinalG;

  const frontAxleLoadKg = Math.round(
    Math.max(150, staticFrontKg - transferKg + frontDownforceN / 9.81)
  );
  const rearAxleLoadKg = Math.round(
    Math.max(150, staticRearKg + transferKg + rearDownforceN / 9.81)
  );

  // Chassis Pitch & Roll visual body motion (McLaren PCC III, Pagani 4-Flap & Koenigsegg Triplex active stabilization)
  // Zero front-end lift during acceleration (targetPitch >= 0 so nose never lifts up during launch or acceleration!)
  const avgSpring = (tune.frontSpringRate + tune.rearSpringRate) * 0.5;
  const brandPitchDamp =
    archetype === 'koenigsegg' || archetype === 'pagani' || archetype === 'ferrari'
      ? 0.65
      : archetype === 'mclaren' || archetype === 'lamborghini' || archetype === 'bugatti'
      ? 0.72
      : 1.0;
  const brandRollDamp =
    archetype === 'mclaren' || archetype === 'pagani'
      ? 0.58
      : archetype === 'ferrari' || archetype === 'koenigsegg' || archetype === 'lamborghini' || archetype === 'bugatti' || archetype === 'bmw'
      ? 0.72
      : 1.0;
  const compliance = (115 / Math.max(45, avgSpring)) * brandPitchDamp;
  // Subtle forward nose-dive ONLY under braking (longitudinalG < 0); strictly 0 during positive acceleration so front NEVER raises!
  const brakeDiveRad =
    longitudinalG < -0.05
      ? Math.min(0.024, -longitudinalG * 0.012 * compliance)
      : 0;
  const targetPitch = brakeDiveRad;
  const targetRoll =
    lateralG * 0.036 * brandRollDamp * (35 / Math.max(12, (tune.frontARB + tune.rearARB) * 0.5));
  state.pitchRad += (targetPitch - state.pitchRad) * Math.min(1, 14 * clampedDt);
  state.rollRad += (targetRoll - state.rollRad) * Math.min(1, 14 * clampedDt);

  // Drift Scoring Chain
  let bankedDriftScore: number | undefined;
  const absSlip = Math.abs(slipAngleDeg);
  if (!isAirborne && absSlip >= 11 && speedKmh >= 38) {
    const ptsPerSec = (absSlip * 18 + speedKmh * 4.5) * (nextTerrain.zoneName.includes('Canyon') ? 1.5 : 1.0);
    state.activeDriftScore = Math.round(state.activeDriftScore + ptsPerSec * clampedDt);
    state.driftBankTimerSec = 1.8;
    if (state.activeDriftScore > state.bestDriftChain) {
      state.bestDriftChain = state.activeDriftScore;
    }
  } else if (state.activeDriftScore > 0) {
    state.driftBankTimerSec -= clampedDt;
    if (state.driftBankTimerSec <= 0) {
      if (state.activeDriftScore >= 1500) {
        bankedDriftScore = state.activeDriftScore;
      }
      state.activeDriftScore = 0;
    }
  }

  // Speed Trap Radar Detection at Pacific Highway Speed Trap (240, -160) & Outpost Drag Strip (0, -240)
  if (state.speedTrapCooldownSec > 0) {
    state.speedTrapCooldownSec = Math.max(0, state.speedTrapCooldownSec - clampedDt);
  }
  let triggeredSpeedTrap: number | undefined;
  const distCoastalTrap = Math.hypot(state.x - 240, state.z - -160);
  const distDragTrap = Math.hypot(state.x - 0, state.z - -220);
  if (
    state.speedTrapCooldownSec <= 0 &&
    speedKmh >= 80 &&
    (distCoastalTrap < 18 || distDragTrap < 18)
  ) {
    const trapSpeed = Math.round(speedKmh);
    state.lastSpeedTrapKmh = trapSpeed;
    state.speedTrapCooldownSec = 6.0;
    triggeredSpeedTrap = trapSpeed;
  }

  return {
    telemetry: {
      x: state.x,
      y: state.y,
      z: state.z,
      vx: state.vx,
      vz: state.vz,
      heading: state.heading,
      angularVelocity: state.angularVelocity,
      pitchRad: state.pitchRad,
      rollRad: state.rollRad,
      speedKmh: Math.round(speedKmh),
      rpm: Math.round(state.rpm),
      gear: state.gear,
      throttle: throttleInput,
      brake: brakeInput,
      steering: state.steeringAngle,
      handbrake: controls.handbrake,
      boostBar: Number(state.boostBar.toFixed(2)),
      nitroPct: Number(state.nitroPct.toFixed(1)),
      nitroActive: canUseNitro,
      slipAngleDeg,
      wheelSpinRatio: Number(wheelSpinRatio.toFixed(2)),
      longitudinalG,
      lateralG,
      frontAxleLoadKg,
      rearAxleLoadKg,
      surface: nextTerrain.surface,
      zoneName: nextTerrain.zoneName,
      activeDriftScore: state.activeDriftScore,
      bestDriftChain: state.bestDriftChain,
      lastSpeedTrapKmh: state.lastSpeedTrapKmh,
      airtimeSec: Number(state.airtimeSec.toFixed(2)),
      jumpDistanceM: state.jumpDistanceM,
      weatherCondition: envState.weather,
      weatherGripPct: Math.round(envState.gripMultiplier * offRoadSurfaceGripPenalty * 100),
      weatherVisibilityPct: Math.round(envState.visibilityMultiplier * 100),
      weatherPowerPct: Math.round(effectiveEnginePowerMult * 100),
      timeOfDayLabel: envState.timeOfDayLabel,
      solarHour: Number(envState.solarHour.toFixed(2)),
    },
    triggeredSpeedTrap,
    triggeredJumpDistance,
    bankedDriftScore,
    collisionImpactMs,
  };
}

// ============================================================================
// AI RACE BOTS ("APEX DRIVATARS") — DIFFICULTY SCALES WITH PLAYER'S CAR + SOLID RACE COLLISIONS
// ============================================================================
const AI_DRIVER_ROSTER = [
  { name: 'Laurent_Moreau', paintHex: '#EF4444', rimHex: '#F8FAFC', vehicleId: 'ferrari-f80-hypercar' },
  { name: 'Kenji_Takahashi', paintHex: '#06B6D4', rimHex: '#1E293B', vehicleId: 'bmw-m4-csl-g82' },
  { name: 'Elena_Richter', paintHex: '#10B981', rimHex: '#E2E8F0', vehicleId: 'lambo-revuelto-v12' },
  { name: 'Mateo_Santana', paintHex: '#F59E0B', rimHex: '#1E293B', vehicleId: 'mclaren-w1-hypercar' },
  { name: 'Claire_Dubois', paintHex: '#3B82F6', rimHex: '#F8FAFC', vehicleId: 'koenigsegg-jesko-attack' },
];

export function getDifficultyScaleForTier(tier: RaceBotDifficultyTier): number {
  switch (tier) {
    case 'Unbeatable Apex':
      return 1.06;
    case 'Pro':
      return 1.01;
    case 'Expert':
      return 0.97;
    case 'Skilled':
      return 0.94;
    case 'Clubman':
    default:
      return 0.91;
  }
}

export function getRaceDifficultyForCar(
  benchmark: DynoBenchmark,
  overrideTier?: RaceBotDifficultyTier
): {
  tier: RaceBotDifficultyTier;
  baseScale: number;
} {
  if (overrideTier) {
    return {
      tier: overrideTier,
      baseScale: getDifficultyScaleForTier(overrideTier),
    };
  }
  if (benchmark.piScore >= 860) {
    return { tier: 'Unbeatable Apex', baseScale: 1.06 };
  }
  if (benchmark.piScore >= 760) {
    return { tier: 'Pro', baseScale: 1.01 };
  }
  if (benchmark.piScore >= 660) {
    return { tier: 'Expert', baseScale: 0.97 };
  }
  if (benchmark.piScore >= 560) {
    return { tier: 'Skilled', baseScale: 0.94 };
  }
  return { tier: 'Clubman', baseScale: 0.91 };
}

export function createRaceBotsForEvent(
  race: WorldRaceEvent,
  playerSpec: VehicleSpec,
  playerBenchmark: DynoBenchmark,
  hasRemoteHumanPlayers = false,
  overrideTier?: RaceBotDifficultyTier
): RaceBotState[] {
  // Multiplayer Grand Prix races have ZERO AI bots when 2+ real human players are competing together;
  // when launched solo with no remote human players online, populate the 5 Apex Drivatars so the race is full!
  if (
    hasRemoteHumanPlayers &&
    (race.isMultiplayerRace || race.discipline === 'Multiplayer Grand Prix')
  ) {
    return [];
  }

  const { tier, baseScale } = getRaceDifficultyForCar(playerBenchmark, overrideTier);
  const raceDiffMod = ((race.difficultyLevel ?? 2) - 2.5) * 0.035;
  const sinH = Math.sin(race.startHeading);
  const cosH = Math.cos(race.startHeading);
  // Right perpendicular vector: (cosH, -sinH)
  const rightX = cosH;
  const rightZ = -sinH;

  const isOffroadRace = race.discipline === 'Off-Road Rally';
  const playerUsingSupercarInDirtRace =
    isOffroadRace &&
    playerSpec.bodyStyle !== 'baja_truck' &&
    playerSpec.bodyStyle !== 'suv_4x4' &&
    playerSpec.bodyStyle !== 'heavy_truck' &&
    playerSpec.defaultTune.rideHeightMm < 135;

  // Separate parallel lanes for all 5 AI bots at the race start (Player occupies center-right +1.6m lane)
  const distinctStartLanesM = [-7.8, -4.8, -1.8, 4.8, 7.8];
  const staggeredForwardOffsetsM = [-3.0, -5.5, -8.0, -10.5, -13.0];

  return AI_DRIVER_ROSTER.map((slot, idx) => {
    const lateralOffset = distinctStartLanesM[idx] ?? (idx % 2 === 0 ? 5.5 : -5.5);
    const forwardOffset = staggeredForwardOffsetsM[idx] ?? -(idx + 1) * 3.0;

    const spawnX = race.startX + sinH * forwardOffset + rightX * lateralOffset;
    const spawnZ = race.startZ + cosH * forwardOffset + rightZ * lateralOffset;
    const spawnY = sampleWorldTerrain(spawnX, spawnZ).heightY;

    const botSpread = (2 - idx) * 0.018;
    const rallyPaceBonus = isOffroadRace ? (playerUsingSupercarInDirtRace ? 0.14 : 0.06) : 0;
    const difficultyScale = Number(
      Math.max(0.88, Math.min(1.12, baseScale + raceDiffMod + botSpread + rallyPaceBonus)).toFixed(3)
    );

    const botPiScore = Math.max(
      350,
      Math.min(999, Math.round(playerBenchmark.piScore * (0.99 + (2 - idx) * 0.015)))
    );
    const playerLaunchAccelMs2 = 27.78 / Math.max(1.75, playerBenchmark.zeroTo100KmhSec);

    return {
      id: `race_bot_${idx + 1}`,
      driverName: slot.name,
      vehicleId: isOffroadRace && idx % 2 === 1 ? 'solis-baja-nomad' : slot.vehicleId || playerSpec.id,
      vehicleName: `${slot.name.split('_')[0]}'s ${playerBenchmark.piClass}-Spec`,
      paintHex: slot.paintHex,
      rimHex: slot.rimHex,
      piClass: playerBenchmark.piClass,
      piScore: botPiScore,
      difficultyTier: tier,
      difficultyScale,
      targetTopSpeedKmh: Math.round(playerBenchmark.topSpeedKmh * difficultyScale * 1.05),
      targetAccelMs2: Number((playerLaunchAccelMs2 * difficultyScale * 1.18).toFixed(2)),
      x: spawnX,
      y: spawnY,
      z: spawnZ,
      vx: 0,
      vz: 0,
      heading: race.startHeading,
      speedKmh: 0,
      currentCheckpointIndex: 0,
      isFinished: false,
      laneOffsetM: lateralOffset,
      trackProgressM: 0,
    };
  });
}

interface BotTrackSample {
  x: number;
  z: number;
  s: number;
  heading: number;
  upcomingTurnRad: number;
}

interface FullRaceBotTrack {
  samples: BotTrackSample[];
  cpArcS: number[];
  totalLengthM: number;
}

const FULL_RACE_BOT_TRACK_CACHE = new Map<string, FullRaceBotTrack>();

function getFullRaceBotTrack(race: WorldRaceEvent): FullRaceBotTrack {
  const cached = FULL_RACE_BOT_TRACK_CACHE.get(race.id);
  if (cached) return cached;

  // Build the exact obstacle-free, corner-beveled pathway spline from computeRaceRoadPath(race)
  // repeated across all laps so AI bots follow the exact same 3D pathway corridor as the player!
  const oneLapPath = computeRaceRoadPath(race);
  const totalLaps = Math.max(1, race.laps ?? 1);
  const beveledPts: { x: number; z: number }[] = [];

  for (let lap = 0; lap < totalLaps; lap++) {
    for (let i = 0; i < oneLapPath.length; i++) {
      if (lap > 0 && i === 0) {
        const prevPt = beveledPts[beveledPts.length - 1];
        if (Math.hypot(oneLapPath[0].x - prevPt.x, oneLapPath[0].z - prevPt.z) < 4) {
          continue;
        }
      }
      beveledPts.push(deflectPointFromWorldObstacles(oneLapPath[i].x, oneLapPath[i].z, 4.2));
    }
  }

  if (beveledPts.length < 2) {
    beveledPts.push(
      { x: race.startX, z: race.startZ },
      {
        x: race.checkpoints[0]?.x ?? race.startX,
        z: race.checkpoints[0]?.z ?? race.startZ - 100,
      }
    );
  }

  // Resample beveledPts at uniform ~4.5m steps with cumulative arc-length s
  const samples: BotTrackSample[] = [];
  let cumS = 0;
  samples.push({
    x: beveledPts[0].x,
    z: beveledPts[0].z,
    s: 0,
    heading: race.startHeading,
    upcomingTurnRad: 0,
  });

  for (let i = 0; i < beveledPts.length - 1; i++) {
    const a = beveledPts[i];
    const b = beveledPts[i + 1];
    const segLen = Math.hypot(b.x - a.x, b.z - a.z);
    if (segLen < 0.05) continue;
    const segHeading = Math.atan2(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(segLen / 4.5));
    const stepLen = segLen / steps;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      cumS += stepLen;
      samples.push({
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        s: cumS,
        heading: segHeading,
        upcomingTurnRad: 0,
      });
    }
  }

  // Smooth sample headings using forward-difference window
  for (let i = 0; i < samples.length - 1; i++) {
    const next = samples[Math.min(samples.length - 1, i + 2)];
    const dx = next.x - samples[i].x;
    const dz = next.z - samples[i].z;
    if (Math.hypot(dx, dz) > 0.1) {
      samples[i].heading = Math.atan2(dx, dz);
    }
  }
  if (samples.length >= 2) {
    samples[samples.length - 1].heading = samples[samples.length - 2].heading;
  }

  // Precompute upcomingTurnRad over a 90m lookahead window so bots brake smoothly before corners
  for (let i = 0; i < samples.length; i++) {
    const baseS = samples[i].s;
    const baseH = samples[i].heading;
    let maxTurn = 0;
    for (let j = i + 1; j < samples.length; j++) {
      const ds = samples[j].s - baseS;
      if (ds > 90) break;
      const diff = Math.abs(
        Math.atan2(Math.sin(samples[j].heading - baseH), Math.cos(samples[j].heading - baseH))
      );
      const weight = ds < 45 ? 1.0 : 1.0 - ((ds - 45) / 45) * 0.35;
      if (diff * weight > maxTurn) {
        maxTurn = diff * weight;
      }
    }
    samples[i].upcomingTurnRad = maxTurn;
  }

  // Map each race checkpoint monotonically to its closest forward arc-length s on the track
  const cpArcS: number[] = [];
  let minAllowedS = 12;
  const totalCps = Math.max(1, race.checkpoints.length);
  const lapLengthS = cumS / totalLaps;
  const cpsPerLap = Math.max(1, Math.round(totalCps / totalLaps));

  for (let cIdx = 0; cIdx < totalCps; cIdx++) {
    const cp = race.checkpoints[cIdx];
    const lapIdx = totalLaps > 1 ? Math.min(totalLaps - 1, Math.floor(cIdx / cpsPerLap)) : 0;
    const searchStartS = Math.max(minAllowedS, lapIdx * lapLengthS - 25);
    const searchEndS =
      cIdx === totalCps - 1
        ? cumS + 10
        : Math.min(cumS, (lapIdx + 1) * lapLengthS + 60);

    let bestS = minAllowedS;
    let bestDistSq = Infinity;
    for (let k = 0; k < samples.length; k++) {
      const smp = samples[k];
      if (smp.s < searchStartS) continue;
      if (smp.s > searchEndS && bestDistSq < Infinity) break;
      const dSq = (smp.x - cp.x) ** 2 + (smp.z - cp.z) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestS = smp.s;
      }
    }
    const clampedS = Math.max(minAllowedS, Math.min(cumS, bestS));
    cpArcS.push(clampedS);
    minAllowedS = Math.min(cumS, clampedS + 18);
  }
  if (cpArcS.length > 0) {
    cpArcS[cpArcS.length - 1] = Math.max(cpArcS[cpArcS.length - 1], cumS - 8);
  }

  const track: FullRaceBotTrack = {
    samples,
    cpArcS,
    totalLengthM: cumS,
  };
  FULL_RACE_BOT_TRACK_CACHE.set(race.id, track);
  return track;
}

function sampleBotTrackAtArcS(track: FullRaceBotTrack, targetS: number): BotTrackSample {
  const samples = track.samples;
  if (samples.length === 0) {
    return { x: 0, z: 0, s: 0, heading: 0, upcomingTurnRad: 0 };
  }
  if (targetS <= 0) return samples[0];
  if (targetS >= track.totalLengthM) return samples[samples.length - 1];

  // Binary search by s
  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].s <= targetS) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = Math.max(0.01, b.s - a.s);
  const t = Math.max(0, Math.min(1, (targetS - a.s) / span));
  const dh = Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading));
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    s: targetS,
    heading: a.heading + dh * t,
    upcomingTurnRad: Math.max(a.upcomingTurnRad, b.upcomingTurnRad),
  };
}

export function stepRaceBotsPhysics(
  bots: RaceBotState[],
  race: WorldRaceEvent,
  playerState: InternalPhysicsState,
  dt: number,
  elapsedRaceSec: number,
  playerCheckpointIndex: number
): {
  collisionImpactMs?: number;
  playerPosition: number;
} {
  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  let collisionImpactMs: number | undefined;
  const isSeparateLaneStartPhase = elapsedRaceSec < 5.0;
  const track = getFullRaceBotTrack(race);

  // 1. Step each AI Race Bot along the continuous beveled road centerline spline
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    if (bot.isFinished) {
      bot.vx *= Math.max(0, 1 - 2.5 * clampedDt);
      bot.vz *= Math.max(0, 1 - 2.5 * clampedDt);
      bot.x += bot.vx * clampedDt;
      bot.z += bot.vz * clampedDt;
      const targetY = sampleWorldTerrain(bot.x, bot.z).heightY;
      bot.y += (targetY - bot.y) * Math.min(1, clampedDt * 14);
      bot.speedKmh = Math.round(Math.hypot(bot.vx, bot.vz) * 3.6);
      continue;
    }

    // 1. Advance bot monotonically along the beveled road spline so it NEVER gets stuck at any turn or intersection!
    const prevS = bot.trackProgressM ?? 0;
    const preSample = sampleBotTrackAtArcS(track, prevS);
    const upcomingTurnRad = preSample.upcomingTurnRad;

    // Estimate player's current arc-length progress so trailing bots apply competitive drafting/catch-up pressure
    const playerCpS =
      playerCheckpointIndex > 0
        ? track.cpArcS[Math.min(track.cpArcS.length - 1, playerCheckpointIndex - 1)] ?? 0
        : 0;
    const gapBehindPlayerM = Math.max(0, playerCpS - prevS);
    const catchupMultiplier =
      gapBehindPlayerM > 12 ? 1.0 + Math.min(0.20, (gapBehindPlayerM - 12) / 220) : 1.0;

    // Realistic corner braking with higher apex speed carry so AI bots stay fast and competitive through turns
    const cornerSpeedFactor = Math.max(
      0.58,
      1.0 - Math.min(1, upcomingTurnRad / (Math.PI * 0.5)) * 0.40
    );
    const desiredSpeedMs = Math.max(
      28,
      (bot.targetTopSpeedKmh / 3.6) * cornerSpeedFactor * catchupMultiplier
    );
    const currentSpeedMs = Math.hypot(bot.vx, bot.vz);

    let nextSpeedMs = currentSpeedMs;
    if (currentSpeedMs < desiredSpeedMs) {
      const speedRatio = currentSpeedMs / Math.max(25, bot.targetTopSpeedKmh / 3.6);
      const accelStep =
        bot.targetAccelMs2 * catchupMultiplier * Math.max(0.48, 1.12 - speedRatio * 0.52);
      nextSpeedMs = Math.min(desiredSpeedMs, currentSpeedMs + accelStep * clampedDt);
    } else {
      const brakeDecel = 22.0 * bot.difficultyScale;
      nextSpeedMs = Math.max(desiredSpeedMs, currentSpeedMs - brakeDecel * clampedDt);
    }

    const botArcS = Math.min(track.totalLengthM, prevS + nextSpeedMs * clampedDt);
    bot.trackProgressM = botArcS;

    // Advance checkpoint when bot reaches checkpoint arc-length or passes through gate center
    const cpIdx = bot.currentCheckpointIndex;
    const cp = race.checkpoints[cpIdx] || race.checkpoints[race.checkpoints.length - 1];
    if (!cp) continue;

    const targetCpArcS = track.cpArcS[cpIdx] ?? track.totalLengthM;
    const distToRawCp = Math.hypot(cp.x - bot.x, cp.z - bot.z);

    if (botArcS >= targetCpArcS - 6 || distToRawCp < 18) {
      const nextIdx = cpIdx + 1;
      if (nextIdx >= race.checkpoints.length) {
        bot.isFinished = true;
        bot.finishTimeSec = Number(elapsedRaceSec.toFixed(2));
        bot.currentCheckpointIndex = nextIdx;
        bot.trackProgressM = track.totalLengthM;
        continue;
      } else {
        bot.currentCheckpointIndex = nextIdx;
      }
    }

    const currSample = sampleBotTrackAtArcS(track, botArcS);
    const lookSample = sampleBotTrackAtArcS(track, Math.min(track.totalLengthM, botArcS + 14.0));

    // Taper lateral lane offset to 0 at turns so bots file cleanly through the road apex at every corner
    const cornerLaneTaper = Math.max(0, 1 - currSample.upcomingTurnRad / 0.55);
    const baseLaneOffset = isSeparateLaneStartPhase ? bot.laneOffsetM * 0.85 : bot.laneOffsetM * 0.36;
    const activeLaneOffset = baseLaneOffset * cornerLaneTaper;

    const rightX = Math.cos(currSample.heading);
    const rightZ = -Math.sin(currSample.heading);
    const targetX = currSample.x + rightX * activeLaneOffset;
    const targetZ = currSample.z + rightZ * activeLaneOffset;

    const prevBotX = bot.x;
    const prevBotZ = bot.z;

    // Smoothly track the obstacle-free spline position while preserving physical velocity & heading
    const followRate = Math.min(1, clampedDt * 14.5);
    bot.x = prevBotX + (targetX - prevBotX) * followRate;
    bot.z = prevBotZ + (targetZ - prevBotZ) * followRate;

    const moveDx = lookSample.x + Math.cos(lookSample.heading) * activeLaneOffset - bot.x;
    const moveDz = lookSample.z - Math.sin(lookSample.heading) * activeLaneOffset - bot.z;
    const desiredHeading =
      Math.hypot(moveDx, moveDz) > 0.5 ? Math.atan2(moveDx, moveDz) : currSample.heading;
    const headingError = Math.atan2(
      Math.sin(desiredHeading - bot.heading),
      Math.cos(desiredHeading - bot.heading)
    );
    bot.heading += headingError * Math.min(1, clampedDt * 14.0);

    bot.vx = Math.sin(bot.heading) * nextSpeedMs;
    bot.vz = Math.cos(bot.heading) * nextSpeedMs;

    enforceDesignatedRacePathway(bot, race);

    const targetGroundY = sampleWorldTerrain(bot.x, bot.z, bot.y).heightY;
    bot.y += (targetGroundY - bot.y) * Math.min(1, clampedDt * 15);
    bot.speedKmh = Math.round(nextSpeedMs * 3.6);
  }

  // 2. Bot-to-Bot Spacing & 3. Player-to-Bot Collisions (Only active AFTER the 6-second separate-lane start phase!)
  if (!isSeparateLaneStartPhase) {
    const botMinDist = 2.4;
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const a = bots[i];
        const b = bots[j];
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < botMinDist * botMinDist && dSq > 0.0001) {
          const d = Math.sqrt(dSq);
          const nx = dx / d;
          const nz = dz / d;
          const overlap = (botMinDist - d) * 0.5;
          a.x += nx * overlap;
          a.z += nz * overlap;
          b.x -= nx * overlap;
          b.z -= nz * overlap;
        }
      }
    }

    const playerBotMinDist = 2.55;
    for (let i = 0; i < bots.length; i++) {
      const bot = bots[i];
      const dx = playerState.x - bot.x;
      const dz = playerState.z - bot.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < playerBotMinDist * playerBotMinDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = playerBotMinDist - dist;

        playerState.x += nx * overlap * 0.55;
        playerState.z += nz * overlap * 0.55;
        bot.x -= nx * overlap * 0.45;
        bot.z -= nz * overlap * 0.45;

        const relVx = playerState.vx - bot.vx;
        const relVz = playerState.vz - bot.vz;
        const relNormal = relVx * nx + relVz * nz;
        if (relNormal < 0) {
          const impactSpeed = Math.abs(relNormal);
          if (impactSpeed > 1.2) {
            collisionImpactMs = Math.max(collisionImpactMs ?? 0, impactSpeed);
          }
          const restitution = 0.42;
          const impulse = -(1 + restitution) * relNormal * 0.5;
          playerState.vx += impulse * nx;
          playerState.vz += impulse * nz;
          playerState.vy = 0;

          bot.vx -= impulse * nx * 0.85;
          bot.vz -= impulse * nz * 0.85;
          bot.speedKmh = Math.round(Math.hypot(bot.vx, bot.vz) * 3.6);
        }
      }
    }
  }

  // 4. Calculate Live Race Standing Position (1st to 6th)
  const playerTargetCp =
    race.checkpoints[playerCheckpointIndex] ||
    race.checkpoints[race.checkpoints.length - 1];
  const playerDistToCp = playerTargetCp
    ? Math.hypot(playerTargetCp.x - playerState.x, playerTargetCp.z - playerState.z)
    : 0;
  const playerScore = playerCheckpointIndex * 100000 - playerDistToCp;

  let botsAhead = 0;
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    if (bot.isFinished) {
      botsAhead++;
    } else {
      const bCp =
        race.checkpoints[bot.currentCheckpointIndex] ||
        race.checkpoints[race.checkpoints.length - 1];
      const bDist = bCp ? Math.hypot(bCp.x - bot.x, bCp.z - bot.z) : 0;
      const botScore = bot.currentCheckpointIndex * 100000 - bDist;
      if (botScore > playerScore) {
        botsAhead++;
      }
    }
  }

  return {
    collisionImpactMs,
    playerPosition: botsAhead + 1,
  };
}
