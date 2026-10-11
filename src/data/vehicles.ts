import {
  AspirationType,
  BrandDesignArchetype,
  DrivetrainType,
  PaintFinishType,
  SharedTunePreset,
  TireCompoundType,
  VehicleBodyStyle,
  VehicleSpec,
  WorldPointOfInterest,
  WorldRaceEvent,
} from '../types/game';

export const PAINT_SWATCHES = [
  { name: 'Horizon Solar Amber', hex: '#F59E0B' },
  { name: 'Bayside Electric Cyan', hex: '#06B6D4' },
  { name: 'Rosso Corsa Crimson', hex: '#EF4444' },
  { name: 'Nürburgring Emerald', hex: '#10B981' },
  { name: 'Liquid Silver Platinum', hex: '#E2E8F0' },
  { name: 'Stealth Obsidian Carbon', hex: '#1E293B' },
  { name: 'Suzuka Championship White', hex: '#F8FAFC' },
  { name: 'Midnight Indigo', hex: '#3B82F6' },
  { name: 'Sunset Copper Bronze', hex: '#D97706' },
  { name: 'British Racing Green', hex: '#065F46' },
  { name: 'Daytona Violet', hex: '#6366F1' },
  { name: 'Baja Desert Sand', hex: '#CA8A04' },
];

export function getShortCarMainName(spec: VehicleSpec): string {
  const cleaned = spec.name
    .replace(/\([^)]*\)/g, '')
    .replace(
      /\b(Strassenversion|Centenario|Carbon Edition|Weissach|Lightweight|Super-Saloon|Competition xDrive|Competition|xDrive|Nismo Z-Tune|Z-Tune|Baja 1000 Trophy|Trophy 4x4|Trophy|Spec-V|GT3 EVO2|Hypercar|Prototype|Coupe|Roadster|Spider|Aperta|Spyder|Berlinetta|Superfast|Assetto Fiorano|Track Pack|Clubsport|Longtail| Edition|Series|6x6|4x4)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ');
  return words.slice(0, 3).join(' ');
}

function inferBrandDesignArchetype(manufacturer: string, name = ''): BrandDesignArchetype {
  const m = `${manufacturer} ${name}`.toLowerCase();
  if (m.includes('bmw') || m.includes('m340i')) return 'bmw';
  if (m.includes('lamborghini') || m.includes('santagata') || m.includes('huracán') || m.includes('urus')) return 'lamborghini';
  if (m.includes('ferrari') || m.includes('maranello') || m.includes('purosangue') || m.includes('296') || m.includes('488') || m.includes('812')) return 'ferrari';
  if (m.includes('pagani') || m.includes('modena') || m.includes('huayra') || m.includes('zonda')) return 'pagani';
  if (m.includes('koenigsegg') || m.includes('ängelholm') || m.includes('jesko') || m.includes('agera') || m.includes('regera') || m.includes('gemera') || m.includes('cc850')) return 'koenigsegg';
  if (m.includes('bugatti') || m.includes('molsheim') || m.includes('chiron') || m.includes('veyron') || m.includes('bolide') || m.includes('divo') || m.includes('mistral') || m.includes('centodieci') || m.includes('tourbillon') || m.includes('eb110')) return 'bugatti';
  if (m.includes('mclaren') || m.includes('woking') || m.includes('senna') || m.includes('765lt') || m.includes('720s') || m.includes('675lt') || m.includes('speedtail') || m.includes('solus')) return 'mclaren';
  if (m.includes('porsche') || m.includes('stuttgart') || m.includes('cayenne') || m.includes('918') || m.includes('911') || m.includes('carrera')) return 'porsche';
  if (m.includes('mercedes') || m.includes('amg') || m.includes('unimog') || m.includes('g63')) return 'mercedes';
  if (m.includes('aston') || m.includes('valkyrie')) return 'aston';
  if (m.includes('audi') || m.includes('rs6') || m.includes('quattro')) return 'audi';
  if (m.includes('subaru') || m.includes('impreza') || m.includes('22b') || m.includes('mitsubishi') || m.includes('lancer') || m.includes('gr yaris') || m.includes('gr corolla')) return 'rally';
  if (m.includes('nissan') || m.includes('skyline') || m.includes('gt-r') || m.includes('silvia') || m.includes('fairlady')) return 'nissan';
  if (m.includes('supra') || m.includes('rx-7') || m.includes('mazda') || m.includes('nsx') || m.includes('s2000') || m.includes('trueno') || m.includes('ae86') || m.includes('civic') || m.includes('accord') || m.includes('camry')) return 'jdm';
  if (m.includes('dodge') || m.includes('charger') || m.includes('challenger') || m.includes('viper') || m.includes('mustang') || m.includes('shelby') || m.includes('camaro') || m.includes('chevelle') || m.includes('corvette') || m.includes('ford gt')) return 'muscle';
  return 'standard';
}

function defaultMechanicForBrand(archetype: BrandDesignArchetype, bodyStyle: VehicleBodyStyle): string {
  switch (archetype) {
    case 'bmw':
      return 'M xDrive Torque-Vectoring & 8-Speed M Steptronic / Active M Differential';
    case 'lamborghini':
      return 'ALA 2.0 Active Aerodynamics & LDVI 4-Wheel Steering';
    case 'ferrari':
      return 'SSC 8.0 Side Slip Angle Control & F1 Dual-Clutch E-Diff3';
    case 'pagani':
      return '4-Flap Active Aerodynamics & Carbo-Titanium HP62 Monocoque';
    case 'koenigsegg':
      return '9-Speed Light Speed Transmission (LST) & Triplex Carbon Suspension';
    case 'bugatti':
      return 'Quad-Turbo W16 All-Wheel Torque Vectoring & Hydraulic Airbrake Wing';
    case 'mclaren':
      return 'ProActive Chassis Control III & DRS Longtail Active Airbrake';
    case 'porsche':
      return 'Active DRS Swan-Neck Aero, Weissach Carbon Pack & Rear-Axle Steering';
    case 'mercedes':
      return 'AMG Panamericana Aero Stage, 9-Stage Traction Control & Bi-Turbo V8';
    case 'aston':
      return 'Full-Length Underbody Venturi Tunnels & Cosworth High-RPM Aero';
    case 'audi':
      return 'Quattro Sport Center Differential, Dynamic Ride Control & Matrix LED Optics';
    case 'nissan':
      return 'ATTESA E-TS Pro All-Wheel Torque Split, Super-HICAS & Nismo Aero Stage';
    case 'jdm':
      return 'Sequential Twin-Scroll Boost Controller, Helical 1.5-Way LSD & Forged Internals';
    case 'muscle':
      return 'Twin-Screw Supercharger Blower / High-Flow V8 Headers & Launch Line-Lock';
    case 'rally':
      return 'Driver-Controlled Center Differential (DCCD), Anti-Lag System & Gravel Spec';
    default:
      if (bodyStyle === 'baja_truck' || bodyStyle === 'heavy_truck' || bodyStyle === 'suv_4x4') {
        return 'Fox Live-Valve Long-Travel Off-Road Suspension & Locking 4x4 Diffs';
      }
      if (bodyStyle === 'jdm_coupe') {
        return 'ATTESA E-TS Pro / Twin-Scroll Boost Controller & Helical LSD';
      }
      return 'Motorsport Limited-Slip Differential & Coilover Track Chassis';
  }
}

// Helper to construct complete realistic VehicleSpec entries cleanly with IRL-calibrated performance
function buildSpec(params: {
  id: string;
  name: string;
  manufacturer: string;
  year: number;
  category: string;
  engineDescription: string;
  drivetrain: DrivetrainType;
  aspiration: AspirationType;
  hp: number;
  torque: number;
  redline: number;
  massKg: number;
  bodyStyle: VehicleBodyStyle;
  sound: VehicleSpec['engineSoundProfile'];
  paintHex: string;
  paintFinish?: PaintFinishType;
  tireCompound?: TireCompoundType;
  rideHeightMm?: number;
  boostBar?: number;
  irlTopSpeedKmh?: number;
  irlZeroTo100Sec?: number;
  irlBraking100To0M?: number;
  designArchetype?: BrandDesignArchetype;
  signatureMechanic?: string;
}): VehicleSpec {
  const isOffroad =
    params.bodyStyle === 'baja_truck' ||
    params.bodyStyle === 'heavy_truck' ||
    params.bodyStyle === 'suv_4x4';
  const isTrack = params.bodyStyle === 'hypercar' || params.bodyStyle === 'track_gt';
  const isNormal = params.bodyStyle === 'normal_sedan' || params.bodyStyle === 'normal_hatch';

  const archetype = params.designArchetype ?? inferBrandDesignArchetype(params.manufacturer, params.name);
  const signatureMechanic =
    params.signatureMechanic ?? defaultMechanicForBrand(archetype, params.bodyStyle);

  const defaultCompound: TireCompoundType =
    params.tireCompound ||
    (isOffroad ? 'RallyGravel' : isTrack ? 'SemiSlick' : isNormal ? 'Street' : 'Sport');

  const rideHeight =
    params.rideHeightMm ??
    (params.bodyStyle === 'heavy_truck'
      ? 245
      : params.bodyStyle === 'baja_truck'
      ? 220
      : params.bodyStyle === 'suv_4x4'
      ? 195
      : isNormal
      ? 135
      : isTrack
      ? 78
      : 102);

  const tireRadiusM =
    params.bodyStyle === 'heavy_truck'
      ? 0.52
      : params.bodyStyle === 'baja_truck'
      ? 0.44
      : params.bodyStyle === 'suv_4x4'
      ? 0.4
      : 0.34;
  const tireCircumferenceM = 2 * Math.PI * tireRadiusM;
  const targetTopSpeed = params.irlTopSpeedKmh ?? 285;
  const sixthGearRatio = 0.82;
  // Calibrate finalDrive so 6th gear at redline reaches ~104% of IRL top speed
  const calibratedFinalDrive =
    (params.redline * tireCircumferenceM * 60) /
    (1000 * sixthGearRatio * (targetTopSpeed * 1.04));
  const finalDrive = Number(Math.max(2.2, Math.min(5.2, calibratedFinalDrive)).toFixed(2));

  return {
    id: params.id,
    name: params.name,
    manufacturer: params.manufacturer,
    year: params.year,
    category: params.category,
    engineDescription: params.engineDescription,
    baseDrivetrain: params.drivetrain,
    baseAspiration: params.aspiration,
    basePowerHP: params.hp,
    baseTorqueNm: params.torque,
    idleRPM: isNormal ? 750 : 950,
    redlineRPM: params.redline,
    maxRPM: params.redline + 400,
    baseMassKg: params.massKg,
    weightDistributionFront:
      params.drivetrain === 'FWD'
        ? 0.61
        : archetype === 'bmw'
        ? 0.5
        : params.bodyStyle === 'supercar' || params.bodyStyle === 'hypercar'
        ? 0.42
        : 0.51,
    wheelbaseM:
      params.bodyStyle === 'heavy_truck'
        ? 3.65
        : params.bodyStyle === 'baja_truck'
        ? 3.15
        : isNormal
        ? 2.62
        : 2.68,
    cgHeightM:
      params.bodyStyle === 'heavy_truck'
        ? 0.85
        : isOffroad
        ? 0.64
        : isNormal
        ? 0.52
        : params.bodyStyle === 'hypercar'
        ? 0.39
        : 0.43,
    dragCoeff:
      params.bodyStyle === 'heavy_truck'
        ? 0.54
        : isOffroad
        ? 0.43
        : archetype === 'koenigsegg' || archetype === 'bugatti'
        ? 0.26
        : isTrack
        ? 0.28
        : 0.32,
    frontalAreaM2:
      params.bodyStyle === 'heavy_truck'
        ? 3.6
        : isOffroad
        ? 2.55
        : 1.96,
    irlTopSpeedKmh: params.irlTopSpeedKmh,
    irlZeroTo100Sec: params.irlZeroTo100Sec,
    irlBraking100To0M: params.irlBraking100To0M,
    bodyStyle: params.bodyStyle,
    designArchetype: archetype,
    signatureMechanic,
    engineSoundProfile: params.sound,
    defaultTune: {
      aspiration: params.aspiration,
      boostPressureBar:
        params.boostBar ??
        (params.aspiration === 'NA' ? 0 : params.aspiration === 'TwinTurbo' ? 1.25 : 0.95),
      tireCompound: defaultCompound,
      drivetrain: params.drivetrain,
      weightReductionStage: isTrack ? 2 : isNormal ? 0 : 1,
      aeroKit: isTrack ? 'HorizonGT' : isNormal || isOffroad ? 'Stock' : 'Street',
      frontTirePressurePSI: isOffroad ? 24.5 : 30.5,
      rearTirePressurePSI: isOffroad ? 24.0 : 30.0,
      finalDrive,
      gearRatios: [3.22, 2.18, 1.61, 1.25, 1.01, 0.82],
      frontCamberDeg: isTrack ? -2.4 : isOffroad ? -0.7 : -1.5,
      rearCamberDeg: isTrack ? -2.0 : isOffroad ? -0.5 : -1.2,
      rideHeightMm: rideHeight,
      frontSpringRate: isOffroad ? 64 : isTrack ? 155 : isNormal ? 82 : 120,
      rearSpringRate: isOffroad ? 60 : isTrack ? 170 : isNormal ? 78 : 130,
      frontARB: isOffroad ? 16 : isTrack ? 38 : 26,
      rearARB: isOffroad ? 14 : isTrack ? 34 : 24,
      frontDownforceKg: isTrack ? 260 : isOffroad || isNormal ? 45 : 135,
      rearDownforceKg: isTrack ? 375 : isOffroad || isNormal ? 60 : 185,
      brakeBiasFrontPct: 54,
      brakePressurePct: isTrack ? 120 : 100,
      diffAccelLockPct: isOffroad ? 80 : 55,
      diffDecelLockPct: 30,
      transmissionMode: 'Automatic',
      absEnabled: true,
      tcsEnabled: false,
      paintHex: params.paintHex,
      paintFinish: params.paintFinish || 'Metallic',
      rimHex: '#1E293B',
      caliperHex: '#EF4444',
    },
  };
}

// 5 Signature Hero Cars (Always first in the roster, with authentic IRL brands, designs & specs)
const HERO_VEHICLES: VehicleSpec[] = [
  buildSpec({
    id: 'valkyrie-gtr',
    name: 'Lamborghini Huracán GT3 EVO2 Centenario',
    manufacturer: 'Lamborghini',
    year: 2025,
    category: 'Modern Supercar',
    engineDescription: '5.2L Naturally Aspirated V10',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 640,
    torque: 590,
    redline: 8600,
    massKg: 1380,
    bodyStyle: 'supercar',
    designArchetype: 'lamborghini',
    signatureMechanic: 'ALA 2.0 Active Aero Stalling & Hexagonal Roof Scoop Intake',
    sound: 'v10_scream',
    paintHex: '#F59E0B',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 326,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 29.2,
  }),
  buildSpec({
    id: 'kimura-rz34',
    name: 'Nissan Skyline GT-R Nismo Z-Tune (R34)',
    manufacturer: 'Nissan',
    year: 2005,
    category: 'JDM Street Legend',
    engineDescription: '2.8L RB28DETT Twin-Turbo Inline-6',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 510,
    torque: 545,
    redline: 8000,
    massKg: 1510,
    bodyStyle: 'jdm_coupe',
    signatureMechanic: 'ATTESA E-TS Pro Active AWD & Super-HICAS 4-Wheel Steering',
    sound: 'i6_turbo',
    paintHex: '#06B6D4',
    paintFinish: 'Pearlescent',
    irlTopSpeedKmh: 308,
    irlZeroTo100Sec: 3.4,
    irlBraking100To0M: 31.5,
  }),
  buildSpec({
    id: 'stuttgart-992-gtrs',
    name: 'Porsche 911 GT3 RS (992) Weissach',
    manufacturer: 'Porsche',
    year: 2024,
    category: 'Track Toy GT',
    engineDescription: '4.0L Naturally Aspirated Flat-6',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 525,
    torque: 465,
    redline: 9000,
    massKg: 1450,
    bodyStyle: 'track_gt',
    signatureMechanic: '860 kg Active DRS Swan-Neck Wing & Rear-Axle Steering',
    sound: 'flat6_gt',
    paintHex: '#10B981',
    paintFinish: 'Satin',
    irlTopSpeedKmh: 312,
    irlZeroTo100Sec: 3.1,
    irlBraking100To0M: 28.0,
  }),
  buildSpec({
    id: 'solis-baja-nomad',
    name: 'Ford F-150 Raptor R Baja 1000 Trophy',
    manufacturer: 'Ford',
    year: 2024,
    category: 'Trucks & Heavy Rigs',
    engineDescription: '5.2L Carnivore Supercharged V8',
    drivetrain: 'AWD',
    aspiration: 'Supercharged',
    hp: 720,
    torque: 880,
    redline: 6600,
    massKg: 1980,
    bodyStyle: 'baja_truck',
    signatureMechanic: 'Fox Dual-Live-Valve 24-Inch Travel Bypass Shocks',
    sound: 'v8_supercharged',
    paintHex: '#EF4444',
    paintFinish: 'Matte',
    irlTopSpeedKmh: 238,
    irlZeroTo100Sec: 3.7,
    irlBraking100To0M: 38.5,
  }),
  buildSpec({
    id: 'aetherion-hyperx',
    name: 'Koenigsegg Jesko Absolut Carbon Edition',
    manufacturer: 'Koenigsegg',
    year: 2026,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.0L Twin-Turbo V8 (E85 1600 HP)',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 1600,
    torque: 1500,
    redline: 8500,
    massKg: 1390,
    bodyStyle: 'hypercar',
    designArchetype: 'koenigsegg',
    signatureMechanic: '9-Speed Light Speed Transmission (LST) & 0.278 Cd Twin-Fin Tail',
    sound: 'hybrid_hyper',
    paintHex: '#E2E8F0',
    irlTopSpeedKmh: 498,
    irlZeroTo100Sec: 2.4,
    irlBraking100To0M: 26.8,
  }),
];

// ============================================================================
// 50 NEW BESPOKE ICONIC CARS FROM POPULAR BRANDS WITH IRL DESIGNS & MECHANICS
// (8 BMW + 8 Lamborghini + 8 Ferrari + 6 Pagani + 7 Koenigsegg + 6 Bugatti + 7 McLaren = 50 Cars)
// ============================================================================
const POPULAR_BRAND_SHOWCASE_CARS: VehicleSpec[] = [
  // --- BMW (8 Iconic Cars) ---
  buildSpec({
    id: 'bmw-m3-gtr-e46',
    name: 'BMW M3 GTR Strassenversion (E46)',
    manufacturer: 'BMW',
    year: 2001,
    category: 'Track Toy GT',
    engineDescription: '4.0L P60B40 Flat-Plane Dry-Sump NA V8',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 444,
    torque: 480,
    redline: 8500,
    massKg: 1350,
    bodyStyle: 'track_gt',
    designArchetype: 'bmw',
    signatureMechanic: 'P60B40 Flat-Plane V8 & Straight-Cut 6-Speed Dogbox',
    sound: 'v8_supercharged',
    paintHex: '#E2E8F0',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 300,
    irlZeroTo100Sec: 3.4,
    irlBraking100To0M: 30.2,
  }),
  buildSpec({
    id: 'bmw-m3-g80-comp',
    name: 'BMW M3 Competition xDrive (G80)',
    manufacturer: 'BMW',
    year: 2024,
    category: 'Track Toy GT',
    engineDescription: '3.0L S58 Twin-Turbo Inline-6',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 523,
    torque: 650,
    redline: 7200,
    massKg: 1780,
    bodyStyle: 'normal_sedan',
    designArchetype: 'bmw',
    signatureMechanic: 'M xDrive 4WD/2WD Drift Analyzer & 10-Stage M Traction Control',
    sound: 'i6_turbo',
    paintHex: '#10B981',
    paintFinish: 'Metallic',
    tireCompound: 'Sport',
    irlTopSpeedKmh: 290,
    irlZeroTo100Sec: 3.2,
    irlBraking100To0M: 31.4,
  }),
  buildSpec({
    id: 'bmw-m4-csl-g82',
    name: 'BMW M4 CSL Lightweight (G82)',
    manufacturer: 'BMW',
    year: 2023,
    category: 'Track Toy GT',
    engineDescription: '3.0L S58 High-Boost Twin-Turbo I6',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 543,
    torque: 650,
    redline: 7200,
    massKg: 1625,
    bodyStyle: 'track_gt',
    designArchetype: 'bmw',
    signatureMechanic: 'CFRP Ducktail Trunklid & Uniball Solid-Mounted M Subframe',
    sound: 'i6_turbo',
    paintHex: '#1E293B',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 307,
    irlZeroTo100Sec: 3.6,
    irlBraking100To0M: 30.0,
  }),
  buildSpec({
    id: 'bmw-m5-cs-f90',
    name: 'BMW M5 CS Super-Saloon (F90)',
    manufacturer: 'BMW',
    year: 2022,
    category: 'Track Toy GT',
    engineDescription: '4.4L S63 Hot-V Twin-Turbo V8',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 627,
    torque: 750,
    redline: 7200,
    massKg: 1825,
    bodyStyle: 'normal_sedan',
    designArchetype: 'bmw',
    signatureMechanic: 'M xDrive Rear-Biased Torque Split & Carbon-Bucket 4-Seater',
    sound: 'v8_supercharged',
    paintHex: '#065F46',
    paintFinish: 'Matte',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 305,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 30.8,
  }),
  buildSpec({
    id: 'bmw-m8-comp-f92',
    name: 'BMW M8 Competition Grand Coupé (F92)',
    manufacturer: 'BMW',
    year: 2024,
    category: 'Modern Supercar',
    engineDescription: '4.4L S63B44T4 TwinPower Turbo V8',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 617,
    torque: 750,
    redline: 7200,
    massKg: 1885,
    bodyStyle: 'track_gt',
    designArchetype: 'bmw',
    signatureMechanic: 'Adaptive M Suspension & M Carbon-Ceramic Brake-by-Wire',
    sound: 'v8_supercharged',
    paintHex: '#3B82F6',
    paintFinish: 'Metallic',
    tireCompound: 'Sport',
    irlTopSpeedKmh: 305,
    irlZeroTo100Sec: 3.0,
    irlBraking100To0M: 31.5,
  }),
  buildSpec({
    id: 'bmw-m2-cs-f87',
    name: 'BMW M2 CS Clubsport (F87)',
    manufacturer: 'BMW',
    year: 2020,
    category: 'Track Toy GT',
    engineDescription: '3.0L S55 Twin-Turbo Inline-6',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 444,
    torque: 550,
    redline: 7600,
    massKg: 1550,
    bodyStyle: 'jdm_coupe',
    designArchetype: 'bmw',
    signatureMechanic: 'Short-Wheelbase 50:50 Balance & 7-Speed M-DCT E-Diff',
    sound: 'i6_turbo',
    paintHex: '#06B6D4',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 280,
    irlZeroTo100Sec: 3.8,
    irlBraking100To0M: 31.8,
  }),
  buildSpec({
    id: 'bmw-m1-procar-e26',
    name: 'BMW M1 Procar Group 4 (E26)',
    manufacturer: 'BMW',
    year: 1980,
    category: 'Modern Supercar',
    engineDescription: '3.5L M88/1 DOHC 24-Valve Inline-6',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 470,
    torque: 390,
    redline: 9000,
    massKg: 1020,
    bodyStyle: 'supercar',
    designArchetype: 'bmw',
    signatureMechanic: 'Mid-Engine Giugiaro Wedge & 6 Individual Throttle Bodies',
    sound: 'i6_turbo',
    paintHex: '#F8FAFC',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 311,
    irlZeroTo100Sec: 4.3,
    irlBraking100To0M: 32.5,
  }),
  buildSpec({
    id: 'bmw-m-hybrid-v8',
    name: 'BMW M Hybrid V8 LMDh LeMans',
    manufacturer: 'BMW',
    year: 2024,
    category: 'Hypercars & Prototypes',
    engineDescription: '4.0L P66/3 Twin-Turbo V8 + Bosch MGU',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 671,
    torque: 650,
    redline: 8200,
    massKg: 1030,
    bodyStyle: 'hypercar',
    designArchetype: 'bmw',
    signatureMechanic: 'Illuminated Iconic Kidney Nose & LMDh Dorsal Shark-Fin Aero',
    sound: 'hybrid_hyper',
    paintHex: '#1E293B',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 345,
    irlZeroTo100Sec: 2.6,
    irlBraking100To0M: 26.8,
  }),

  // --- LAMBORGHINI (8 Iconic Cars) ---
  buildSpec({
    id: 'lambo-revuelto-v12',
    name: 'Lamborghini Revuelto V12 HPEV',
    manufacturer: 'Lamborghini',
    year: 2025,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.5L L545 NA V12 + Triple Axial E-Motors',
    drivetrain: 'AWD',
    aspiration: 'NA',
    hp: 1001,
    torque: 1062,
    redline: 9500,
    massKg: 1772,
    bodyStyle: 'hypercar',
    designArchetype: 'lamborghini',
    signatureMechanic: 'LDVI 2.0 Front E-Axle Torque Vectoring & 8-Speed Transverse DCT',
    sound: 'v10_scream',
    paintHex: '#F59E0B',
    paintFinish: 'Pearlescent',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 354,
    irlZeroTo100Sec: 2.5,
    irlBraking100To0M: 29.2,
  }),
  buildSpec({
    id: 'lambo-aventador-svj',
    name: 'Lamborghini Aventador SVJ LP770-4',
    manufacturer: 'Lamborghini',
    year: 2021,
    category: 'Modern Supercar',
    engineDescription: '6.5L L539 Naturally Aspirated V12',
    drivetrain: 'AWD',
    aspiration: 'NA',
    hp: 759,
    torque: 720,
    redline: 8700,
    massKg: 1525,
    bodyStyle: 'supercar',
    designArchetype: 'lamborghini',
    signatureMechanic: 'ALA 2.0 Aero Vectoring Stalling Wing & Lamborghini Rear Steering',
    sound: 'v10_scream',
    paintHex: '#10B981',
    paintFinish: 'Matte',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 352,
    irlZeroTo100Sec: 2.8,
    irlBraking100To0M: 29.5,
  }),
  buildSpec({
    id: 'lambo-huracan-performante',
    name: 'Lamborghini Huracán Performante LP640-4',
    manufacturer: 'Lamborghini',
    year: 2019,
    category: 'Modern Supercar',
    engineDescription: '5.2L Naturally Aspirated V10',
    drivetrain: 'AWD',
    aspiration: 'NA',
    hp: 631,
    torque: 600,
    redline: 8500,
    massKg: 1382,
    bodyStyle: 'supercar',
    designArchetype: 'lamborghini',
    signatureMechanic: 'Forged Carbon ALA Internal Aero Ducts & ANIMA Corsa Mode',
    sound: 'v10_scream',
    paintHex: '#D97706',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 325,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 29.4,
  }),
  buildSpec({
    id: 'lambo-veneno-roadster',
    name: 'Lamborghini Veneno Roadster LP750-4',
    manufacturer: 'Lamborghini',
    year: 2014,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.5L Naturally Aspirated V12',
    drivetrain: 'AWD',
    aspiration: 'NA',
    hp: 740,
    torque: 690,
    redline: 8400,
    massKg: 1490,
    bodyStyle: 'hypercar',
    designArchetype: 'lamborghini',
    signatureMechanic: 'LMP1 Central Dorsal Fin & Pushrod Horizontal Damper Architecture',
    sound: 'v10_scream',
    paintHex: '#E2E8F0',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 355,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 29.6,
  }),
  buildSpec({
    id: 'lambo-sesto-elemento',
    name: 'Lamborghini Sesto Elemento Carbon',
    manufacturer: 'Lamborghini',
    year: 2012,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.2L Odd-Firing Naturally Aspirated V10',
    drivetrain: 'AWD',
    aspiration: 'NA',
    hp: 562,
    torque: 540,
    redline: 8250,
    massKg: 999,
    bodyStyle: 'hypercar',
    designArchetype: 'lamborghini',
    signatureMechanic: '999 kg Full Forged-Carbon Chassis & Pyrosic Glass-Ceramic Exhaust',
    sound: 'v10_scream',
    paintHex: '#1E293B',
    paintFinish: 'Matte',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 322,
    irlZeroTo100Sec: 2.5,
    irlBraking100To0M: 27.8,
  }),
  buildSpec({
    id: 'lambo-countach-lpi800',
    name: 'Lamborghini Countach LPI 800-4',
    manufacturer: 'Lamborghini',
    year: 2022,
    category: 'Modern Supercar',
    engineDescription: '6.5L V12 + 48V Supercapacitor Hybrid',
    drivetrain: 'AWD',
    aspiration: 'NA',
    hp: 803,
    torque: 755,
    redline: 8500,
    massKg: 1595,
    bodyStyle: 'supercar',
    designArchetype: 'lamborghini',
    signatureMechanic: 'Supercapacitor Instant Power Impulse & Periscopio Wedge Profile',
    sound: 'v10_scream',
    paintHex: '#F8FAFC',
    paintFinish: 'Pearlescent',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 355,
    irlZeroTo100Sec: 2.8,
    irlBraking100To0M: 29.8,
  }),
  buildSpec({
    id: 'lambo-murcielago-sv',
    name: 'Lamborghini Murciélago LP670-4 SuperVeloce',
    manufacturer: 'Lamborghini',
    year: 2010,
    category: 'Modern Supercar',
    engineDescription: '6.5L Bizzarrini-Lineage NA V12',
    drivetrain: 'AWD',
    aspiration: 'NA',
    hp: 661,
    torque: 660,
    redline: 8000,
    massKg: 1565,
    bodyStyle: 'supercar',
    designArchetype: 'lamborghini',
    signatureMechanic: 'Deployable Bat-Wing Cooling Intakes & Aeropack Carbon Wing',
    sound: 'v10_scream',
    paintHex: '#F59E0B',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 342,
    irlZeroTo100Sec: 3.2,
    irlBraking100To0M: 31.0,
  }),
  buildSpec({
    id: 'lambo-essenza-scv12',
    name: 'Lamborghini Essenza SCV12 Squadra Corse',
    manufacturer: 'Lamborghini',
    year: 2021,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.5L Ram-Air Naturally Aspirated V12',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 819,
    torque: 720,
    redline: 8800,
    massKg: 1376,
    bodyStyle: 'hypercar',
    designArchetype: 'lamborghini',
    signatureMechanic: 'Structural Xtrac 6-Speed Gearbox & 1,200 kg GT3 Downforce',
    sound: 'v10_scream',
    paintHex: '#10B981',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 340,
    irlZeroTo100Sec: 2.6,
    irlBraking100To0M: 26.9,
  }),

  // --- FERRARI (8 Iconic Cars) ---
  buildSpec({
    id: 'ferrari-f80-hypercar',
    name: 'Ferrari F80 Maranello Flagship',
    manufacturer: 'Ferrari',
    year: 2025,
    category: 'Hypercars & Prototypes',
    engineDescription: '3.0L 120° Twin-Turbo V6 + MGU-K/H Tri-Motor',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 1184,
    torque: 1090,
    redline: 9200,
    massKg: 1525,
    bodyStyle: 'hypercar',
    designArchetype: 'ferrari',
    signatureMechanic: '48V Multimatic Active Suspension & 1,050 kg S-Duct Ground Effect',
    sound: 'hybrid_hyper',
    paintHex: '#EF4444',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 350,
    irlZeroTo100Sec: 2.15,
    irlBraking100To0M: 27.2,
  }),
  buildSpec({
    id: 'ferrari-laferrari-aperta',
    name: 'Ferrari LaFerrari Aperta V12 HY-KERS',
    manufacturer: 'Ferrari',
    year: 2017,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.3L F140FE V12 + F1 HY-KERS Hybrid',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 950,
    torque: 900,
    redline: 9250,
    massKg: 1395,
    bodyStyle: 'hypercar',
    designArchetype: 'ferrari',
    signatureMechanic: 'F1 HY-KERS Instant Torque Fill & Active Underbody Diffuser Flaps',
    sound: 'v10_scream',
    paintHex: '#EF4444',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 352,
    irlZeroTo100Sec: 2.6,
    irlBraking100To0M: 28.4,
  }),
  buildSpec({
    id: 'ferrari-sf90-xx',
    name: 'Ferrari SF90 XX Stradale Fiorano',
    manufacturer: 'Ferrari',
    year: 2024,
    category: 'Hypercars & Prototypes',
    engineDescription: '4.0L F154 Twin-Turbo V8 + 3 Axial E-Motors',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 1016,
    torque: 940,
    redline: 8300,
    massKg: 1560,
    bodyStyle: 'hypercar',
    designArchetype: 'ferrari',
    signatureMechanic: 'Qualifying Extra-Boost Impulse & Fixed Gurney Shut-Off Wing',
    sound: 'hybrid_hyper',
    paintHex: '#EF4444',
    paintFinish: 'Pearlescent',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 320,
    irlZeroTo100Sec: 2.3,
    irlBraking100To0M: 28.0,
  }),
  buildSpec({
    id: 'ferrari-daytona-sp3',
    name: 'Ferrari Daytona SP3 Icona V12',
    manufacturer: 'Ferrari',
    year: 2023,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.5L F140HC Naturally Aspirated V12',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 829,
    torque: 697,
    redline: 9500,
    massKg: 1485,
    bodyStyle: 'hypercar',
    designArchetype: 'ferrari',
    signatureMechanic: '9,500 RPM Titanium-Rod V12 & Underbody Floor Chimneys',
    sound: 'v10_scream',
    paintHex: '#EF4444',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 340,
    irlZeroTo100Sec: 2.85,
    irlBraking100To0M: 29.0,
  }),
  buildSpec({
    id: 'ferrari-enzo-v12',
    name: 'Ferrari Enzo Berlinetta Pininfarina',
    manufacturer: 'Ferrari',
    year: 2003,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.0L F140B Naturally Aspirated V12',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 651,
    torque: 657,
    redline: 8200,
    massKg: 1365,
    bodyStyle: 'hypercar',
    designArchetype: 'ferrari',
    signatureMechanic: 'F1 Nose Cone Ground-Effect Tunnels & Electrohydraulic Shift',
    sound: 'v10_scream',
    paintHex: '#EF4444',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 355,
    irlZeroTo100Sec: 3.14,
    irlBraking100To0M: 30.2,
  }),
  buildSpec({
    id: 'ferrari-f40-competizione',
    name: 'Ferrari F40 Competizione LM',
    manufacturer: 'Ferrari',
    year: 1990,
    category: 'Modern Supercar',
    engineDescription: '2.9L F120B Twin-Turbo IHI V8',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 700,
    torque: 706,
    redline: 8100,
    massKg: 1050,
    bodyStyle: 'supercar',
    designArchetype: 'ferrari',
    signatureMechanic: 'Kevlar-Carbon Honeycomb Tub & Triple-Pipe Screamer Wastegates',
    sound: 'v8_supercharged',
    paintHex: '#EF4444',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 367,
    irlZeroTo100Sec: 3.1,
    irlBraking100To0M: 29.5,
  }),
  buildSpec({
    id: 'ferrari-f50-gt1',
    name: 'Ferrari F50 GT1 V12 Corsa',
    manufacturer: 'Ferrari',
    year: 1996,
    category: 'Hypercars & Prototypes',
    engineDescription: '4.7L F130B 60-Valve Formula 1 V12',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 739,
    torque: 529,
    redline: 10500,
    massKg: 910,
    bodyStyle: 'hypercar',
    designArchetype: 'ferrari',
    signatureMechanic: '10,500 RPM Stressed-Member F1 V12 & Pushrod Rockers',
    sound: 'v10_scream',
    paintHex: '#EF4444',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 376,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 27.6,
  }),
  buildSpec({
    id: 'ferrari-458-speciale',
    name: 'Ferrari 458 Speciale Aperta',
    manufacturer: 'Ferrari',
    year: 2015,
    category: 'Modern Supercar',
    engineDescription: '4.5L F136 Flat-Plane Naturally Aspirated V8',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 597,
    torque: 540,
    redline: 9000,
    massKg: 1340,
    bodyStyle: 'supercar',
    designArchetype: 'ferrari',
    signatureMechanic: '9,000 RPM Flat-Plane V8 & SSC Side Slip Angle Control',
    sound: 'v10_scream',
    paintHex: '#F59E0B',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 325,
    irlZeroTo100Sec: 3.0,
    irlBraking100To0M: 29.4,
  }),

  // --- PAGANI (6 Iconic Cars) ---
  buildSpec({
    id: 'pagani-utopia-coupe',
    name: 'Pagani Utopia Carbo-Titanium V12',
    manufacturer: 'Pagani',
    year: 2024,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.0L AMG M158 Twin-Turbo 60° V12',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 852,
    torque: 1100,
    redline: 6700,
    massKg: 1280,
    bodyStyle: 'hypercar',
    designArchetype: 'pagani',
    signatureMechanic: 'Carbo-Titanium HP62 Monocoque & Xtrac 7-Speed Gated Gearbox',
    sound: 'v10_scream',
    paintHex: '#E2E8F0',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 358,
    irlZeroTo100Sec: 2.8,
    irlBraking100To0M: 28.2,
  }),
  buildSpec({
    id: 'pagani-zonda-cinque',
    name: 'Pagani Zonda Cinque Roadster',
    manufacturer: 'Pagani',
    year: 2010,
    category: 'Hypercars & Prototypes',
    engineDescription: '7.3L AMG Naturally Aspirated V12',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 669,
    torque: 780,
    redline: 7300,
    massKg: 1210,
    bodyStyle: 'hypercar',
    designArchetype: 'pagani',
    signatureMechanic: 'Roof Ram-Air Snorkel & Ceramic-Coated Titanium Quad Exhaust',
    sound: 'v10_scream',
    paintHex: '#F8FAFC',
    paintFinish: 'Pearlescent',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 350,
    irlZeroTo100Sec: 3.4,
    irlBraking100To0M: 29.0,
  }),
  buildSpec({
    id: 'pagani-zonda-revolucion',
    name: 'Pagani Zonda Revolución Track V12',
    manufacturer: 'Pagani',
    year: 2014,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.0L AMG M120 Race-Spec NA V12',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 789,
    torque: 730,
    redline: 8500,
    massKg: 1070,
    bodyStyle: 'hypercar',
    designArchetype: 'pagani',
    signatureMechanic: 'F1-Style DRS Dual-Mode Rear Wing & 20ms Sequential Magnesium Gearbox',
    sound: 'v10_scream',
    paintHex: '#1E293B',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 355,
    irlZeroTo100Sec: 2.6,
    irlBraking100To0M: 26.5,
  }),
  buildSpec({
    id: 'pagani-huayra-bc',
    name: 'Pagani Huayra BC Roadster',
    manufacturer: 'Pagani',
    year: 2020,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.0L AMG Twin-Turbo V12',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 791,
    torque: 1050,
    redline: 6500,
    massKg: 1250,
    bodyStyle: 'hypercar',
    designArchetype: 'pagani',
    signatureMechanic: '4-Flap Independent Active Aero & Lateral Roll Compensation',
    sound: 'v10_scream',
    paintHex: '#6366F1',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 370,
    irlZeroTo100Sec: 2.8,
    irlBraking100To0M: 27.6,
  }),
  buildSpec({
    id: 'pagani-imola-v12',
    name: 'Pagani Imola 827 HP Track Special',
    manufacturer: 'Pagani',
    year: 2021,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.0L AMG Twin-Turbo V12',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 827,
    torque: 1100,
    redline: 6500,
    massKg: 1246,
    bodyStyle: 'hypercar',
    designArchetype: 'pagani',
    signatureMechanic: '1,000 kg Active Aero Downforce & Interconnected Smart Dampers',
    sound: 'v10_scream',
    paintHex: '#D97706',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 372,
    irlZeroTo100Sec: 2.7,
    irlBraking100To0M: 27.4,
  }),
  buildSpec({
    id: 'pagani-zonda-f',
    name: 'Pagani Zonda F Clubsport',
    manufacturer: 'Pagani',
    year: 2006,
    category: 'Hypercars & Prototypes',
    engineDescription: '7.3L AMG M297 Naturally Aspirated V12',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 641,
    torque: 780,
    redline: 6800,
    massKg: 1230,
    bodyStyle: 'hypercar',
    designArchetype: 'pagani',
    signatureMechanic: 'Hand-Built 7.3L NA V12 & Forged Avional Pushrod Suspension',
    sound: 'v10_scream',
    paintHex: '#EF4444',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 345,
    irlZeroTo100Sec: 3.5,
    irlBraking100To0M: 29.6,
  }),

  // --- KOENIGSEGG (7 Iconic Cars) ---
  buildSpec({
    id: 'koenigsegg-jesko-attack',
    name: 'Koenigsegg Jesko Attack 1600 HP',
    manufacturer: 'Koenigsegg',
    year: 2025,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.0L Flat-Plane Twin-Turbo V8 (E85)',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 1600,
    torque: 1500,
    redline: 8500,
    massKg: 1420,
    bodyStyle: 'hypercar',
    designArchetype: 'koenigsegg',
    signatureMechanic: '9-Speed Light Speed Transmission (LST) & 1,400 kg Boomerang Wing',
    sound: 'hybrid_hyper',
    paintHex: '#F8FAFC',
    paintFinish: 'Pearlescent',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 430,
    irlZeroTo100Sec: 2.5,
    irlBraking100To0M: 26.8,
  }),
  buildSpec({
    id: 'koenigsegg-one-1',
    name: 'Koenigsegg One:1 Megacar',
    manufacturer: 'Koenigsegg',
    year: 2015,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.0L 1-Megawatt Twin-Turbo V8',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 1341,
    torque: 1371,
    redline: 8250,
    massKg: 1360,
    bodyStyle: 'hypercar',
    designArchetype: 'koenigsegg',
    signatureMechanic: '1:1 HP-to-Kg Power Ratio & Active Triplex Carbon Rear Damper',
    sound: 'hybrid_hyper',
    paintHex: '#E2E8F0',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 440,
    irlZeroTo100Sec: 2.6,
    irlBraking100To0M: 27.0,
  }),
  buildSpec({
    id: 'koenigsegg-agera-rs',
    name: 'Koenigsegg Agera RS 447 km/h Record',
    manufacturer: 'Koenigsegg',
    year: 2017,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.0L 1MW Twin-Turbo Aluminum V8',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 1341,
    torque: 1371,
    redline: 8250,
    massKg: 1395,
    bodyStyle: 'hypercar',
    designArchetype: 'koenigsegg',
    signatureMechanic: '447 km/h World-Record Active Underbody Flaps & Cima 7-Speed',
    sound: 'hybrid_hyper',
    paintHex: '#EF4444',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 447,
    irlZeroTo100Sec: 2.6,
    irlBraking100To0M: 27.4,
  }),
  buildSpec({
    id: 'koenigsegg-regera-kdd',
    name: 'Koenigsegg Regera Direct-Drive Hybrid',
    manufacturer: 'Koenigsegg',
    year: 2020,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.0L Twin-Turbo V8 + 3 YASA Axial E-Motors',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 1500,
    torque: 2000,
    redline: 8250,
    massKg: 1590,
    bodyStyle: 'hypercar',
    designArchetype: 'koenigsegg',
    signatureMechanic: 'Koenigsegg Direct Drive (HydraCoup Zero-Gear Shift Interruption)',
    sound: 'hybrid_hyper',
    paintHex: '#06B6D4',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 404,
    irlZeroTo100Sec: 2.7,
    irlBraking100To0M: 28.2,
  }),
  buildSpec({
    id: 'koenigsegg-gemera-hv8',
    name: 'Koenigsegg Gemera HV8 2300 HP Mega-GT',
    manufacturer: 'Koenigsegg',
    year: 2025,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.0L Hot-V Twin-Turbo V8 + Dark Matter E-Motor',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 2300,
    torque: 2750,
    redline: 8500,
    massKg: 1950,
    bodyStyle: 'hypercar',
    designArchetype: 'koenigsegg',
    signatureMechanic: '2,300 HP Raxial-Flux Dark Matter E-Drive & All-Wheel Torque Vectoring',
    sound: 'hybrid_hyper',
    paintHex: '#065F46',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 402,
    irlZeroTo100Sec: 1.9,
    irlBraking100To0M: 28.5,
  }),
  buildSpec({
    id: 'koenigsegg-cc850',
    name: 'Koenigsegg CC850 Engage Shift',
    manufacturer: 'Koenigsegg',
    year: 2024,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.0L Flywheel-Free Twin-Turbo V8',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 1385,
    torque: 1385,
    redline: 8500,
    massKg: 1385,
    bodyStyle: 'hypercar',
    designArchetype: 'koenigsegg',
    signatureMechanic: 'ESS Engage Shift System (Gated 6-Speed + 9-Speed LST Multi-Clutch)',
    sound: 'hybrid_hyper',
    paintHex: '#E2E8F0',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 435,
    irlZeroTo100Sec: 2.6,
    irlBraking100To0M: 27.2,
  }),
  buildSpec({
    id: 'koenigsegg-ccxr-trevita',
    name: 'Koenigsegg CCXR Trevita Diamond Weave',
    manufacturer: 'Koenigsegg',
    year: 2010,
    category: 'Hypercars & Prototypes',
    engineDescription: '4.8L Twin-Rotrex Supercharged V8',
    drivetrain: 'RWD',
    aspiration: 'Supercharged',
    hp: 1018,
    torque: 1080,
    redline: 7200,
    massKg: 1280,
    bodyStyle: 'hypercar',
    designArchetype: 'koenigsegg',
    signatureMechanic: 'Twin Centrifugal Superchargers & White Diamond-Weave Carbon Tub',
    sound: 'v8_supercharged',
    paintHex: '#F8FAFC',
    paintFinish: 'Pearlescent',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 410,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 28.8,
  }),

  // --- BUGATTI (6 Iconic Cars) ---
  buildSpec({
    id: 'bugatti-tourbillon-v16',
    name: 'Bugatti Tourbillon V16 Hybrid',
    manufacturer: 'Bugatti',
    year: 2026,
    category: 'Hypercars & Prototypes',
    engineDescription: '8.3L Cosworth NA V16 + Triple Axial E-Motors',
    drivetrain: 'AWD',
    aspiration: 'NA',
    hp: 1800,
    torque: 1750,
    redline: 9000,
    massKg: 1995,
    bodyStyle: 'hypercar',
    designArchetype: 'bugatti',
    signatureMechanic: '9,000 RPM Cosworth V16 + Dual-Motor Front Torque-Vectoring Axle',
    sound: 'hybrid_hyper',
    paintHex: '#06B6D4',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 445,
    irlZeroTo100Sec: 2.0,
    irlBraking100To0M: 27.8,
  }),
  buildSpec({
    id: 'bugatti-bolide-w16',
    name: 'Bugatti Bolide W16 Track Hypercar',
    manufacturer: 'Bugatti',
    year: 2024,
    category: 'Hypercars & Prototypes',
    engineDescription: '8.0L Quad-Turbo W16',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 1578,
    torque: 1600,
    redline: 7050,
    massKg: 1450,
    bodyStyle: 'hypercar',
    designArchetype: 'bugatti',
    signatureMechanic: 'Morphable Dimpled Roof Intake Scoop & 2,600 kg LMP1 Ground Effect',
    sound: 'hybrid_hyper',
    paintHex: '#3B82F6',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 380,
    irlZeroTo100Sec: 2.2,
    irlBraking100To0M: 25.8,
  }),
  buildSpec({
    id: 'bugatti-chiron-ss-300',
    name: 'Bugatti Chiron Super Sport 300+',
    manufacturer: 'Bugatti',
    year: 2022,
    category: 'Hypercars & Prototypes',
    engineDescription: '8.0L Thor Quad-Turbo W16',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 1578,
    torque: 1600,
    redline: 7100,
    massKg: 1978,
    bodyStyle: 'hypercar',
    designArchetype: 'bugatti',
    signatureMechanic: '490 km/h Longtail Laminar Exhaust Diffuser & Hydraulic Airbrake',
    sound: 'hybrid_hyper',
    paintHex: '#1E293B',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 490,
    irlZeroTo100Sec: 2.3,
    irlBraking100To0M: 28.2,
  }),
  buildSpec({
    id: 'bugatti-divo-atelier',
    name: 'Bugatti Divo Molsheim Track Edition',
    manufacturer: 'Bugatti',
    year: 2021,
    category: 'Hypercars & Prototypes',
    engineDescription: '8.0L Quad-Turbo W16',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 1479,
    torque: 1600,
    redline: 6900,
    massKg: 1960,
    bodyStyle: 'hypercar',
    designArchetype: 'bugatti',
    signatureMechanic: '1.6G Lateral Camber Setup, NACA Roof Duct & 1.83m Hydraulic Airbrake',
    sound: 'hybrid_hyper',
    paintHex: '#3B82F6',
    paintFinish: 'Matte',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 380,
    irlZeroTo100Sec: 2.4,
    irlBraking100To0M: 27.6,
  }),
  buildSpec({
    id: 'bugatti-veyron-ss',
    name: 'Bugatti Veyron 16.4 Super Sport World Record',
    manufacturer: 'Bugatti',
    year: 2011,
    category: 'Hypercars & Prototypes',
    engineDescription: '8.0L Quad-Turbocharged W16',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 1200,
    torque: 1500,
    redline: 6400,
    massKg: 1888,
    bodyStyle: 'hypercar',
    designArchetype: 'bugatti',
    signatureMechanic: 'Dual-Stage 55° Hydraulic Airbrake Wing & Haldex AWD',
    sound: 'hybrid_hyper',
    paintHex: '#F59E0B',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 431,
    irlZeroTo100Sec: 2.5,
    irlBraking100To0M: 29.2,
  }),
  buildSpec({
    id: 'bugatti-centodieci',
    name: 'Bugatti Centodieci EB110 Homage',
    manufacturer: 'Bugatti',
    year: 2022,
    category: 'Hypercars & Prototypes',
    engineDescription: '8.0L Quad-Turbo W16',
    drivetrain: 'AWD',
    aspiration: 'TwinTurbo',
    hp: 1578,
    torque: 1600,
    redline: 7000,
    massKg: 1975,
    bodyStyle: 'hypercar',
    designArchetype: 'bugatti',
    signatureMechanic: '5-Porthole B-Pillar Cooling Intakes & 2-Stage Sequential Quad-Turbos',
    sound: 'hybrid_hyper',
    paintHex: '#F8FAFC',
    paintFinish: 'Pearlescent',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 380,
    irlZeroTo100Sec: 2.4,
    irlBraking100To0M: 28.4,
  }),

  // --- MCLAREN (7 Iconic Cars) ---
  buildSpec({
    id: 'mclaren-w1-hypercar',
    name: 'McLaren W1 Ultimate Hypercar',
    manufacturer: 'McLaren',
    year: 2025,
    category: 'Hypercars & Prototypes',
    engineDescription: '4.0L MPH-8 Flat-Plane V8 + Radial Flux E-Module',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 1258,
    torque: 1340,
    redline: 9200,
    massKg: 1399,
    bodyStyle: 'hypercar',
    designArchetype: 'mclaren',
    signatureMechanic: 'Active Longtail Wing (300mm Extension) & 1,000 kg Ground Effect',
    sound: 'hybrid_hyper',
    paintHex: '#F59E0B',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 350,
    irlZeroTo100Sec: 2.7,
    irlBraking100To0M: 27.0,
  }),
  buildSpec({
    id: 'mclaren-f1-lm',
    name: 'McLaren F1 LM Papaya Orange',
    manufacturer: 'McLaren',
    year: 1995,
    category: 'Hypercars & Prototypes',
    engineDescription: '6.1L BMW S70/2 Naturally Aspirated V12',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 680,
    torque: 705,
    redline: 8500,
    massKg: 1062,
    bodyStyle: 'hypercar',
    designArchetype: 'mclaren',
    signatureMechanic: 'Central Driver Cockpit, 24k Gold-Foil V12 Bay & Ground-Effect Foils',
    sound: 'v10_scream',
    paintHex: '#F59E0B',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 362,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 28.8,
  }),
  buildSpec({
    id: 'mclaren-p1-gtr',
    name: 'McLaren P1 GTR Woking Track Spec',
    manufacturer: 'McLaren',
    year: 2016,
    category: 'Hypercars & Prototypes',
    engineDescription: '3.8L M838TQ Twin-Turbo V8 + IPAS Hybrid',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 986,
    torque: 980,
    redline: 8200,
    massKg: 1440,
    bodyStyle: 'hypercar',
    designArchetype: 'mclaren',
    signatureMechanic: 'IPAS Instant Hybrid Torque Fill & DRS RaceActive Hydraulics',
    sound: 'hybrid_hyper',
    paintHex: '#F59E0B',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 362,
    irlZeroTo100Sec: 2.6,
    irlBraking100To0M: 26.8,
  }),
  buildSpec({
    id: 'mclaren-speedtail',
    name: 'McLaren Speedtail 403 km/h Hyper-GT',
    manufacturer: 'McLaren',
    year: 2020,
    category: 'Hypercars & Prototypes',
    engineDescription: '4.0L M840TQ Twin-Turbo V8 + Parallel eMotor',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 1035,
    torque: 1150,
    redline: 8000,
    massKg: 1430,
    bodyStyle: 'hypercar',
    designArchetype: 'mclaren',
    signatureMechanic: 'Flexible Carbon-Fiber Rear Ailerons & Velocity Lowering Mode',
    sound: 'hybrid_hyper',
    paintHex: '#E2E8F0',
    paintFinish: 'Pearlescent',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 403,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 28.6,
  }),
  buildSpec({
    id: 'mclaren-720s-spider',
    name: 'McLaren 720S Spider Performance',
    manufacturer: 'McLaren',
    year: 2022,
    category: 'Modern Supercar',
    engineDescription: '4.0L M840T Twin-Scroll Turbo V8',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 710,
    torque: 770,
    redline: 8100,
    massKg: 1380,
    bodyStyle: 'supercar',
    designArchetype: 'mclaren',
    signatureMechanic: 'ProActive Chassis Control II & Variable Drift Angle Control',
    sound: 'v8_supercharged',
    paintHex: '#06B6D4',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 341,
    irlZeroTo100Sec: 2.8,
    irlBraking100To0M: 29.0,
  }),
  buildSpec({
    id: 'mclaren-675lt-coupe',
    name: 'McLaren 675LT Carbon Longtail',
    manufacturer: 'McLaren',
    year: 2016,
    category: 'Modern Supercar',
    engineDescription: '3.8L M838TL Twin-Turbo V8',
    drivetrain: 'RWD',
    aspiration: 'TwinTurbo',
    hp: 666,
    torque: 700,
    redline: 8100,
    massKg: 1230,
    bodyStyle: 'supercar',
    designArchetype: 'mclaren',
    signatureMechanic: 'Titanium Crossover Exhaust & 50% Larger Longtail Airbrake',
    sound: 'v8_supercharged',
    paintHex: '#10B981',
    paintFinish: 'Metallic',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 330,
    irlZeroTo100Sec: 2.9,
    irlBraking100To0M: 28.9,
  }),
  buildSpec({
    id: 'mclaren-solus-gt',
    name: 'McLaren Solus GT 10,000 RPM V10',
    manufacturer: 'McLaren',
    year: 2023,
    category: 'Hypercars & Prototypes',
    engineDescription: '5.2L Judd Naturally Aspirated V10',
    drivetrain: 'RWD',
    aspiration: 'NA',
    hp: 829,
    torque: 650,
    redline: 10000,
    massKg: 995,
    bodyStyle: 'hypercar',
    designArchetype: 'mclaren',
    signatureMechanic: '10,000 RPM Gear-Driven Judd V10 & 1,200 kg Venturi Tunnels',
    sound: 'v10_scream',
    paintHex: '#F59E0B',
    paintFinish: 'Satin',
    tireCompound: 'SemiSlick',
    irlTopSpeedKmh: 338,
    irlZeroTo100Sec: 2.5,
    irlBraking100To0M: 25.6,
  }),
];

// Catalog Generator (With 35 Unpopular-Brand Vehicles Removed Including 7 Unpopular Trucks!)
interface ArchetypeCatalogGroup {
  category: string;
  bodyStyle: VehicleBodyStyle;
  sound: VehicleSpec['engineSoundProfile'];
  manufacturers: string[];
  models: {
    title: string;
    year: number;
    engine: string;
    drivetrain: DrivetrainType;
    aspiration: AspirationType;
    baseHp: number;
    baseTorque: number;
    redline: number;
    massKg: number;
    irlTopSpeedKmh: number;
    irlZeroTo100Sec: number;
    irlBraking100To0M: number;
  }[];
  editions: { suffix: string; hpMult: number; weightOffset: number; yearOffset: number }[];
  maxGeneratedCount?: number;
}

const CATALOG_GROUPS: ArchetypeCatalogGroup[] = [
  // 1. Everyday Sport Sedans & Saloons (24 Vehicles — 16 unpopular commuter sedans removed)
  {
    category: 'Normal & Daily Cars',
    bodyStyle: 'normal_sedan',
    sound: 'i6_turbo',
    manufacturers: ['Honda', 'Toyota', 'Volkswagen', 'BMW'],
    models: [
      { title: 'Civic Si Sport Sedan', year: 2022, engine: '1.5L VTEC Turbo I4', drivetrain: 'FWD', aspiration: 'SingleTurbo', baseHp: 205, baseTorque: 260, redline: 6600, massKg: 1330, irlTopSpeedKmh: 222, irlZeroTo100Sec: 6.8, irlBraking100To0M: 36.4 },
      { title: 'Camry TRD V6 Saloon', year: 2023, engine: '3.5L Naturally Aspirated V6', drivetrain: 'FWD', aspiration: 'NA', baseHp: 301, baseTorque: 362, redline: 6800, massKg: 1620, irlTopSpeedKmh: 235, irlZeroTo100Sec: 5.8, irlBraking100To0M: 37.2 },
      { title: 'Accord 2.0T Sport', year: 2021, engine: '2.0L K20C4 Turbo I4', drivetrain: 'FWD', aspiration: 'SingleTurbo', baseHp: 252, baseTorque: 370, redline: 6500, massKg: 1550, irlTopSpeedKmh: 230, irlZeroTo100Sec: 5.7, irlBraking100To0M: 36.8 },
      { title: 'GR Corolla Circuit Saloon', year: 2024, engine: '1.6L G16E-GTS Turbo I3', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 300, baseTorque: 370, redline: 7200, massKg: 1475, irlTopSpeedKmh: 245, irlZeroTo100Sec: 4.9, irlBraking100To0M: 33.4 },
      { title: 'Arteon R-Line 4Motion', year: 2023, engine: '2.0L EA888 TSI Inline-4', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 300, baseTorque: 400, redline: 6600, massKg: 1680, irlTopSpeedKmh: 258, irlZeroTo100Sec: 4.8, irlBraking100To0M: 34.2 },
      { title: 'BMW M340i xDrive Saloon', year: 2024, engine: '3.0L B58 TwinPower Turbo I6', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 382, baseTorque: 500, redline: 7000, massKg: 1710, irlTopSpeedKmh: 268, irlZeroTo100Sec: 4.1, irlBraking100To0M: 32.8 },
    ],
    editions: [
      { suffix: 'Factory Spec', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Touring Trim', hpMult: 1.08, weightOffset: -20, yearOffset: 1 },
      { suffix: 'Sport Package', hpMult: 1.18, weightOffset: -45, yearOffset: 1 },
      { suffix: 'Stage 2 Tuned', hpMult: 1.55, weightOffset: -90, yearOffset: 2 },
    ],
  },

  // 2. Hot Hatches & Autobahn Wagons (20 Vehicles — 12 unpopular micro/city hatches removed)
  {
    category: 'Normal & Daily Cars',
    bodyStyle: 'normal_hatch',
    sound: 'i6_turbo',
    manufacturers: ['Volkswagen', 'Mazda', 'Toyota', 'Honda', 'Audi'],
    models: [
      { title: 'Golf GTI Clubsport Hatch', year: 2023, engine: '2.0L EA888 Turbo I4', drivetrain: 'FWD', aspiration: 'SingleTurbo', baseHp: 296, baseTorque: 400, redline: 6800, massKg: 1440, irlTopSpeedKmh: 262, irlZeroTo100Sec: 5.5, irlBraking100To0M: 33.8 },
      { title: 'Mazda3 2.5 Turbo AWD Hatch', year: 2023, engine: '2.5L SkyActiv-G Turbo I4', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 250, baseTorque: 434, redline: 6300, massKg: 1530, irlTopSpeedKmh: 234, irlZeroTo100Sec: 5.7, irlBraking100To0M: 36.0 },
      { title: 'GR Yaris Rallye Circuit Pack', year: 2024, engine: '1.6L 3-Cylinder Turbo', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 300, baseTorque: 400, redline: 7200, massKg: 1280, irlTopSpeedKmh: 252, irlZeroTo100Sec: 5.1, irlBraking100To0M: 32.8 },
      { title: 'Civic Type R FL5 Hatch', year: 2024, engine: '2.0L K20C1 VTEC Turbo', drivetrain: 'FWD', aspiration: 'SingleTurbo', baseHp: 315, baseTorque: 420, redline: 7000, massKg: 1430, irlTopSpeedKmh: 275, irlZeroTo100Sec: 5.3, irlBraking100To0M: 32.4 },
      { title: 'Audi RS6 Avant Performance', year: 2024, engine: '4.0L Twin-Turbo V8', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 621, baseTorque: 850, redline: 6800, massKg: 2075, irlTopSpeedKmh: 305, irlZeroTo100Sec: 3.3, irlBraking100To0M: 31.8 },
    ],
    editions: [
      { suffix: 'Street Spec', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Performance Pack', hpMult: 1.1, weightOffset: -25, yearOffset: 0 },
      { suffix: 'Cup Edition', hpMult: 1.24, weightOffset: -60, yearOffset: 1 },
      { suffix: 'Time Attack Hatch', hpMult: 1.5, weightOffset: -110, yearOffset: 1 },
    ],
  },

  // 3. Pickup Trucks & Heavy Rigs (29 Vehicles in Catalog + 1 Hero = 30 Trucks; 7 Unpopular Trucks Removed!)
  {
    category: 'Trucks & Heavy Rigs',
    bodyStyle: 'baja_truck',
    sound: 'v8_supercharged',
    manufacturers: ['Ford', 'RAM', 'Chevrolet', 'Toyota'],
    models: [
      { title: 'F-150 Raptor R Desert Predator', year: 2024, engine: '5.2L Supercharged V8', drivetrain: 'AWD', aspiration: 'Supercharged', baseHp: 700, baseTorque: 868, redline: 6600, massKg: 2690, irlTopSpeedKmh: 215, irlZeroTo100Sec: 3.8, irlBraking100To0M: 41.2 },
      { title: 'RAM 1500 TRX Sandrunner', year: 2023, engine: '6.2L HEMI Supercharged V8', drivetrain: 'AWD', aspiration: 'Supercharged', baseHp: 702, baseTorque: 881, redline: 6500, massKg: 2880, irlTopSpeedKmh: 218, irlZeroTo100Sec: 3.9, irlBraking100To0M: 41.8 },
      { title: 'Silverado ZR2 Bison 4x4', year: 2024, engine: '6.2L EcoTec3 V8', drivetrain: 'AWD', aspiration: 'NA', baseHp: 420, baseTorque: 624, redline: 6000, massKg: 2590, irlTopSpeedKmh: 195, irlZeroTo100Sec: 6.1, irlBraking100To0M: 42.5 },
      { title: 'Tacoma TRD Pro Overland', year: 2024, engine: '2.4L i-Force MAX Turbo', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 326, baseTorque: 630, redline: 6000, massKg: 2180, irlTopSpeedKmh: 192, irlZeroTo100Sec: 6.6, irlBraking100To0M: 41.0 },
      { title: 'Hilux GR-Sport Arctic 4x4', year: 2023, engine: '2.8L Turbo-Diesel I4', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 245, baseTorque: 550, redline: 5200, massKg: 2150, irlTopSpeedKmh: 185, irlZeroTo100Sec: 8.4, irlBraking100To0M: 43.0 },
    ],
    editions: [
      { suffix: 'Off-Road 4x4', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Trail Boss', hpMult: 1.14, weightOffset: -80, yearOffset: 0 },
      { suffix: 'Baja 1000 Spec', hpMult: 1.32, weightOffset: -220, yearOffset: 1 },
    ],
    // 5 models x 3 editions = 15 trucks (3 unpopular pickup trucks removed from previous 18)
  },
  {
    category: 'Trucks & Heavy Rigs',
    bodyStyle: 'heavy_truck',
    sound: 'v8_supercharged',
    manufacturers: ['Mercedes-AMG', 'RAM', 'Ford'],
    models: [
      { title: 'Unimog U5023 Expedition 4x4', year: 2022, engine: '5.1L High-Torque Turbo I4', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 380, baseTorque: 1100, redline: 5200, massKg: 4600, irlTopSpeedKmh: 145, irlZeroTo100Sec: 14.2, irlBraking100To0M: 49.5 },
      { title: 'Dakar Rally Raid T5 Prototype', year: 2024, engine: '13.0L Race Twin-Turbo Diesel', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 1050, baseTorque: 3200, redline: 5600, massKg: 4250, irlTopSpeedKmh: 198, irlZeroTo100Sec: 6.4, irlBraking100To0M: 44.0 },
      { title: 'Mammoth 1000 6x6 TRX', year: 2024, engine: '6.2L Supercharged Hellephant V8', drivetrain: 'AWD', aspiration: 'Supercharged', baseHp: 1012, baseTorque: 1314, redline: 6500, massKg: 3850, irlTopSpeedKmh: 224, irlZeroTo100Sec: 4.1, irlBraking100To0M: 42.8 },
      { title: 'VelociRaptor 6x6 Desert Rig', year: 2024, engine: '5.2L Supercharged V8', drivetrain: 'AWD', aspiration: 'Supercharged', baseHp: 758, baseTorque: 920, redline: 6600, massKg: 3650, irlTopSpeedKmh: 215, irlZeroTo100Sec: 4.4, irlBraking100To0M: 43.2 },
      { title: 'G63 AMG 6x6 Brabus Adventure', year: 2023, engine: '5.5L Bi-Turbo V8', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 700, baseTorque: 960, redline: 6500, massKg: 3775, irlTopSpeedKmh: 210, irlZeroTo100Sec: 4.6, irlBraking100To0M: 43.5 },
    ],
    editions: [
      { suffix: 'Expedition Spec', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Dunes Raid', hpMult: 1.18, weightOffset: -180, yearOffset: 1 },
      { suffix: 'Festival Race Rig', hpMult: 1.38, weightOffset: -450, yearOffset: 1 },
    ],
    maxGeneratedCount: 14, // 14 heavy rigs (4 unpopular heavy trucks removed from previous 18 -> 3 + 4 = 7 trucks removed total!)
  },

  // 4. SUVs & 4x4 Off-Roaders (27 Vehicles — Authentic Popular Brands)
  {
    category: 'SUVs & 4x4',
    bodyStyle: 'suv_4x4',
    sound: 'v8_supercharged',
    manufacturers: ['Mercedes-AMG', 'Land Rover', 'Lamborghini', 'Porsche', 'Ford', 'Jeep', 'Toyota', 'Ferrari'],
    models: [
      { title: 'G63 AMG Geländewagen 4x4', year: 2024, engine: '4.0L Bi-Turbo V8', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 577, baseTorque: 850, redline: 6800, massKg: 2560, irlTopSpeedKmh: 240, irlZeroTo100Sec: 4.5, irlBraking100To0M: 36.5 },
      { title: 'Defender 110 OCTA V8', year: 2024, engine: '4.4L Twin-Turbo V8', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 626, baseTorque: 750, redline: 6800, massKg: 2510, irlTopSpeedKmh: 250, irlZeroTo100Sec: 4.0, irlBraking100To0M: 36.2 },
      { title: 'Lamborghini Urus Performante', year: 2024, engine: '4.0L Twin-Turbo V8', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 657, baseTorque: 850, redline: 6900, massKg: 2150, irlTopSpeedKmh: 306, irlZeroTo100Sec: 3.3, irlBraking100To0M: 32.9 },
      { title: 'Porsche Cayenne Turbo GT', year: 2024, engine: '4.0L Twin-Turbo V8', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 650, baseTorque: 850, redline: 6800, massKg: 2220, irlTopSpeedKmh: 305, irlZeroTo100Sec: 3.3, irlBraking100To0M: 33.1 },
      { title: 'Bronco Raptor Desert 4x4', year: 2024, engine: '3.0L EcoBoost Twin-Turbo V6', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 418, baseTorque: 597, redline: 6500, massKg: 2600, irlTopSpeedKmh: 198, irlZeroTo100Sec: 5.6, irlBraking100To0M: 41.5 },
      { title: 'Wrangler Rubicon 392 HEMI', year: 2023, engine: '6.4L Apache V8', drivetrain: 'AWD', aspiration: 'NA', baseHp: 470, baseTorque: 637, redline: 6400, massKg: 2315, irlTopSpeedKmh: 195, irlZeroTo100Sec: 4.5, irlBraking100To0M: 41.2 },
      { title: 'Land Cruiser GR-Sport 300', year: 2024, engine: '3.5L Twin-Turbo V6', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 409, baseTorque: 650, redline: 6200, massKg: 2580, irlTopSpeedKmh: 215, irlZeroTo100Sec: 6.7, irlBraking100To0M: 39.4 },
      { title: 'Grand Cherokee Trackhawk', year: 2021, engine: '6.2L Supercharged Hellcat V8', drivetrain: 'AWD', aspiration: 'Supercharged', baseHp: 707, baseTorque: 875, redline: 6500, massKg: 2430, irlTopSpeedKmh: 290, irlZeroTo100Sec: 3.5, irlBraking100To0M: 34.8 },
      { title: 'Ferrari Purosangue V12 GT', year: 2025, engine: '6.5L Naturally Aspirated V12', drivetrain: 'AWD', aspiration: 'NA', baseHp: 715, baseTorque: 716, redline: 8250, massKg: 2033, irlTopSpeedKmh: 312, irlZeroTo100Sec: 3.3, irlBraking100To0M: 32.2 },
    ],
    editions: [
      { suffix: 'Factory 4x4', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Overland Pack', hpMult: 1.12, weightOffset: -65, yearOffset: 0 },
      { suffix: 'SVR Track Tune', hpMult: 1.28, weightOffset: -150, yearOffset: 1 },
    ],
  },

  // 5. JDM Legends & Street Tuners (36 Vehicles — Authentic Japanese Brands)
  {
    category: 'JDM Street Legend',
    bodyStyle: 'jdm_coupe',
    sound: 'i6_turbo',
    manufacturers: ['Nissan', 'Toyota', 'Mazda', 'Honda', 'Mitsubishi', 'Subaru'],
    models: [
      { title: 'Skyline GT-R V-Spec II (BNR34)', year: 2002, engine: '2.6L RB26DETT Twin-Turbo I6', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 330, baseTorque: 392, redline: 8000, massKg: 1560, irlTopSpeedKmh: 268, irlZeroTo100Sec: 4.7, irlBraking100To0M: 34.2 },
      { title: 'Supra RZ Twin-Turbo (JZA80)', year: 1998, engine: '3.0L 2JZ-GTE Twin-Turbo I6', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 326, baseTorque: 440, redline: 7200, massKg: 1510, irlTopSpeedKmh: 272, irlZeroTo100Sec: 4.6, irlBraking100To0M: 34.6 },
      { title: 'RX-7 Spirit R Type-A (FD3S)', year: 2002, engine: '1.3L 13B-REW Sequential Twin-Turbo Rotary', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 280, baseTorque: 314, redline: 8500, massKg: 1270, irlTopSpeedKmh: 262, irlZeroTo100Sec: 4.9, irlBraking100To0M: 33.5 },
      { title: 'NSX-R Championship White (NA2)', year: 2002, engine: '3.2L C32B DOHC VTEC V6', drivetrain: 'RWD', aspiration: 'NA', baseHp: 290, baseTorque: 304, redline: 8400, massKg: 1270, irlTopSpeedKmh: 282, irlZeroTo100Sec: 4.4, irlBraking100To0M: 32.8 },
      { title: 'Silvia Spec-R Aero (S15)', year: 2000, engine: '2.0L SR20DET Turbo I4', drivetrain: 'RWD', aspiration: 'SingleTurbo', baseHp: 250, baseTorque: 275, redline: 7500, massKg: 1240, irlTopSpeedKmh: 248, irlZeroTo100Sec: 5.5, irlBraking100To0M: 35.0 },
      { title: 'Lancer Evolution IX MR GSR', year: 2006, engine: '2.0L 4G63T MIVEC Turbo I4', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 286, baseTorque: 400, redline: 7600, massKg: 1410, irlTopSpeedKmh: 255, irlZeroTo100Sec: 4.6, irlBraking100To0M: 33.6 },
      { title: 'Impreza 22B-STI Version', year: 1998, engine: '2.2L EJ22G Turbo Flat-4', drivetrain: 'AWD', aspiration: 'SingleTurbo', baseHp: 280, baseTorque: 363, redline: 7900, massKg: 1270, irlTopSpeedKmh: 252, irlZeroTo100Sec: 4.5, irlBraking100To0M: 33.4 },
      { title: 'S2000 Type-S Club Racer (AP2)', year: 2009, engine: '2.2L F22C1 VTEC Inline-4', drivetrain: 'RWD', aspiration: 'NA', baseHp: 242, baseTorque: 220, redline: 8800, massKg: 1255, irlTopSpeedKmh: 248, irlZeroTo100Sec: 5.6, irlBraking100To0M: 34.0 },
      { title: 'Sprinter Trueno GT-Apex (AE86)', year: 1986, engine: '1.6L 4A-GE 20V Silvertop I4', drivetrain: 'RWD', aspiration: 'NA', baseHp: 160, baseTorque: 162, redline: 8200, massKg: 940, irlTopSpeedKmh: 204, irlZeroTo100Sec: 8.1, irlBraking100To0M: 37.8 },
      { title: 'Fairlady Z NISMO (RZ34)', year: 2024, engine: '3.0L VR30DDTT Twin-Turbo V6', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 420, baseTorque: 520, redline: 7200, massKg: 1650, irlTopSpeedKmh: 288, irlZeroTo100Sec: 4.1, irlBraking100To0M: 32.6 },
      { title: 'GT-R NISMO Special Edition (R35)', year: 2024, engine: '3.8L VR38DETT Twin-Turbo V6', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 600, baseTorque: 652, redline: 7100, massKg: 1720, irlTopSpeedKmh: 328, irlZeroTo100Sec: 2.7, irlBraking100To0M: 30.2 },
      { title: 'GR Supra A90 Final Edition', year: 2025, engine: '3.0L B58 Twin-Scroll Turbo I6', drivetrain: 'RWD', aspiration: 'SingleTurbo', baseHp: 429, baseTorque: 570, redline: 7000, massKg: 1495, irlTopSpeedKmh: 285, irlZeroTo100Sec: 3.8, irlBraking100To0M: 31.8 },
    ],
    editions: [
      { suffix: 'Factory JDM', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Wangan Midnight Spec', hpMult: 1.45, weightOffset: -65, yearOffset: 0 },
      { suffix: 'Tsukuba Time Attack', hpMult: 1.85, weightOffset: -135, yearOffset: 0 },
    ],
  },

  // 6. American Muscle & Classic Icons (24 Vehicles — Authentic Brands)
  {
    category: 'Muscle & Classic Icons',
    bodyStyle: 'muscle_classic',
    sound: 'v8_supercharged',
    manufacturers: ['Dodge', 'Ford', 'Chevrolet'],
    models: [
      { title: 'Charger R/T 426 HEMI Classic', year: 1969, engine: '7.0L 426 HEMI V8', drivetrain: 'RWD', aspiration: 'NA', baseHp: 425, baseTorque: 664, redline: 6200, massKg: 1650, irlTopSpeedKmh: 238, irlZeroTo100Sec: 5.3, irlBraking100To0M: 39.5 },
      { title: 'Mustang Fastback Boss 429', year: 1969, engine: '7.0L Boss 429 V8', drivetrain: 'RWD', aspiration: 'NA', baseHp: 385, baseTorque: 610, redline: 6200, massKg: 1580, irlTopSpeedKmh: 232, irlZeroTo100Sec: 5.5, irlBraking100To0M: 39.2 },
      { title: 'Challenger SRT Demon 170', year: 2023, engine: '6.2L Supercharged HEMI V8', drivetrain: 'RWD', aspiration: 'Supercharged', baseHp: 1025, baseTorque: 1280, redline: 6500, massKg: 1940, irlTopSpeedKmh: 346, irlZeroTo100Sec: 1.95, irlBraking100To0M: 33.8 },
      { title: 'Camaro ZL1 1LE Track Package', year: 2023, engine: '6.2L LT4 Supercharged V8', drivetrain: 'RWD', aspiration: 'Supercharged', baseHp: 650, baseTorque: 881, redline: 6600, massKg: 1730, irlTopSpeedKmh: 318, irlZeroTo100Sec: 3.4, irlBraking100To0M: 30.8 },
      { title: 'Mustang Dark Horse GTD', year: 2025, engine: '5.2L Predator Supercharged V8', drivetrain: 'RWD', aspiration: 'Supercharged', baseHp: 815, baseTorque: 900, redline: 7650, massKg: 1710, irlTopSpeedKmh: 325, irlZeroTo100Sec: 3.0, irlBraking100To0M: 29.4 },
      { title: 'Chevelle SS 454 LS6', year: 1970, engine: '7.4L Big-Block V8', drivetrain: 'RWD', aspiration: 'NA', baseHp: 450, baseTorque: 678, redline: 6000, massKg: 1690, irlTopSpeedKmh: 235, irlZeroTo100Sec: 5.4, irlBraking100To0M: 39.8 },
      { title: 'Shelby GT500 Code Red', year: 2023, engine: '5.2L Twin-Turbo Predator V8', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 1000, baseTorque: 1150, redline: 7500, massKg: 1790, irlTopSpeedKmh: 342, irlZeroTo100Sec: 2.7, irlBraking100To0M: 30.5 },
      { title: 'Viper ACR Extreme Aero', year: 2017, engine: '8.4L Naturally Aspirated V10', drivetrain: 'RWD', aspiration: 'NA', baseHp: 645, baseTorque: 813, redline: 6400, massKg: 1530, irlTopSpeedKmh: 298, irlZeroTo100Sec: 3.3, irlBraking100To0M: 28.6 },
    ],
    editions: [
      { suffix: 'Showroom Stock', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Street Strip Blower', hpMult: 1.28, weightOffset: -60, yearOffset: 0 },
      { suffix: 'Pro-Touring Restomod', hpMult: 1.52, weightOffset: -140, yearOffset: 0 },
    ],
  },

  // 7. Modern Supercars & Track GT (24 Vehicles — Authentic Brands)
  {
    category: 'Modern Supercar',
    bodyStyle: 'supercar',
    sound: 'v10_scream',
    manufacturers: ['Lamborghini', 'Ferrari', 'McLaren', 'Chevrolet', 'Mercedes-AMG', 'Ford'],
    models: [
      { title: 'Lamborghini Huracán STO Trofeo', year: 2024, engine: '5.2L Naturally Aspirated V10', drivetrain: 'RWD', aspiration: 'NA', baseHp: 631, baseTorque: 565, redline: 8500, massKg: 1339, irlTopSpeedKmh: 315, irlZeroTo100Sec: 3.0, irlBraking100To0M: 29.5 },
      { title: 'Ferrari 296 GTB Assetto Fiorano', year: 2024, engine: '3.0L Twin-Turbo V6 + Hybrid', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 819, baseTorque: 740, redline: 8500, massKg: 1470, irlTopSpeedKmh: 335, irlZeroTo100Sec: 2.8, irlBraking100To0M: 29.0 },
      { title: 'McLaren 765LT Spider Carbon', year: 2023, engine: '4.0L Twin-Turbo V8', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 755, baseTorque: 800, redline: 8200, massKg: 1339, irlTopSpeedKmh: 332, irlZeroTo100Sec: 2.7, irlBraking100To0M: 28.8 },
      { title: 'Corvette ZR1 (C8) LT7 Twin-Turbo', year: 2025, engine: '5.5L LT7 Flat-Plane Twin-Turbo V8', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 1064, baseTorque: 1123, redline: 8000, massKg: 1665, irlTopSpeedKmh: 375, irlZeroTo100Sec: 2.3, irlBraking100To0M: 28.6 },
      { title: 'Mercedes-AMG GT Black Series', year: 2022, engine: '4.0L Flat-Plane Bi-Turbo V8', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 720, baseTorque: 800, redline: 7200, massKg: 1540, irlTopSpeedKmh: 325, irlZeroTo100Sec: 3.1, irlBraking100To0M: 28.9 },
      { title: 'Ford GT Mk IV Track Series', year: 2023, engine: '3.8L EcoBoost Twin-Turbo V6', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 800, baseTorque: 850, redline: 7400, massKg: 1290, irlTopSpeedKmh: 356, irlZeroTo100Sec: 2.7, irlBraking100To0M: 27.8 },
      { title: 'Ferrari 488 Pista Piloti', year: 2020, engine: '3.9L Twin-Turbo V8', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 710, baseTorque: 770, redline: 8000, massKg: 1385, irlTopSpeedKmh: 340, irlZeroTo100Sec: 2.85, irlBraking100To0M: 29.2 },
      { title: 'Ferrari 812 Competizione V12', year: 2023, engine: '6.5L Naturally Aspirated V12', drivetrain: 'RWD', aspiration: 'NA', baseHp: 819, baseTorque: 692, redline: 9500, massKg: 1487, irlTopSpeedKmh: 342, irlZeroTo100Sec: 2.85, irlBraking100To0M: 29.5 },
    ],
    editions: [
      { suffix: 'Stradale', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Clubsport Weissach', hpMult: 1.1, weightOffset: -45, yearOffset: 0 },
      { suffix: 'GT3 RS Homologation', hpMult: 1.24, weightOffset: -105, yearOffset: 1 },
    ],
  },

  // 8. Hypercars & Extreme LeMans Prototypes (21 Vehicles — Authentic Brands)
  {
    category: 'Hypercars & Prototypes',
    bodyStyle: 'hypercar',
    sound: 'hybrid_hyper',
    manufacturers: ['Koenigsegg', 'Bugatti', 'Pagani', 'Aston Martin', 'Rimac', 'Porsche', 'McLaren'],
    models: [
      { title: 'Koenigsegg Jesko Absolut High-Speed', year: 2025, engine: '5.0L Twin-Turbo V8 (E85)', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 1600, baseTorque: 1500, redline: 8500, massKg: 1390, irlTopSpeedKmh: 498, irlZeroTo100Sec: 2.5, irlBraking100To0M: 27.6 },
      { title: 'Bugatti Chiron Pur Sport W16', year: 2024, engine: '8.0L Quad-Turbo W16', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 1479, baseTorque: 1600, redline: 6900, massKg: 1945, irlTopSpeedKmh: 442, irlZeroTo100Sec: 2.3, irlBraking100To0M: 28.4 },
      { title: 'Pagani Huayra R V12 Track', year: 2024, engine: '6.0L Naturally Aspirated V12', drivetrain: 'RWD', aspiration: 'NA', baseHp: 838, baseTorque: 750, redline: 9000, massKg: 1050, irlTopSpeedKmh: 368, irlZeroTo100Sec: 2.6, irlBraking100To0M: 26.8 },
      { title: 'Aston Martin Valkyrie AMR Pro V12', year: 2025, engine: '6.5L Cosworth NA V12', drivetrain: 'RWD', aspiration: 'NA', baseHp: 1160, baseTorque: 900, redline: 11000, massKg: 1030, irlTopSpeedKmh: 402, irlZeroTo100Sec: 2.4, irlBraking100To0M: 26.2 },
      { title: 'Rimac Nevera R Hyper-EV', year: 2025, engine: 'Quad-Motor Torque-Vectoring', drivetrain: 'AWD', aspiration: 'TwinTurbo', baseHp: 2107, baseTorque: 2360, redline: 9000, massKg: 2150, irlTopSpeedKmh: 412, irlZeroTo100Sec: 1.74, irlBraking100To0M: 28.2 },
      { title: 'Porsche 918 Spyder Weissach', year: 2015, engine: '4.6L V8 + Twin E-Motors', drivetrain: 'AWD', aspiration: 'NA', baseHp: 887, baseTorque: 1280, redline: 9150, massKg: 1634, irlTopSpeedKmh: 345, irlZeroTo100Sec: 2.5, irlBraking100To0M: 28.8 },
      { title: 'McLaren Senna GTR LM Prototype', year: 2021, engine: '4.0L Twin-Turbo V8', drivetrain: 'RWD', aspiration: 'TwinTurbo', baseHp: 814, baseTorque: 800, redline: 8250, massKg: 1188, irlTopSpeedKmh: 342, irlZeroTo100Sec: 2.7, irlBraking100To0M: 26.4 },
    ],
    editions: [
      { suffix: 'Factory Hypercar', hpMult: 1.0, weightOffset: 0, yearOffset: 0 },
      { suffix: 'Carbon Longtail', hpMult: 1.08, weightOffset: -45, yearOffset: 0 },
      { suffix: 'Apex X-Class Spec', hpMult: 1.18, weightOffset: -85, yearOffset: 1 },
    ],
  },
];

function inferManufacturerFromTitle(title: string, fallbackMfg: string): string {
  const t = title.toLowerCase();
  if (t.includes('bmw') || t.includes('m340i')) return 'BMW';
  if (t.includes('lamborghini') || t.includes('huracán') || t.includes('urus')) return 'Lamborghini';
  if (t.includes('ferrari') || t.includes('purosangue') || t.includes('296') || t.includes('488') || t.includes('812')) return 'Ferrari';
  if (t.includes('pagani') || t.includes('huayra') || t.includes('zonda')) return 'Pagani';
  if (t.includes('koenigsegg') || t.includes('jesko')) return 'Koenigsegg';
  if (t.includes('bugatti') || t.includes('chiron')) return 'Bugatti';
  if (t.includes('mclaren') || t.includes('765lt') || t.includes('senna')) return 'McLaren';
  if (t.includes('porsche') || t.includes('cayenne') || t.includes('918')) return 'Porsche';
  if (t.includes('mercedes') || t.includes('amg') || t.includes('unimog') || t.includes('g63')) return 'Mercedes-AMG';
  if (t.includes('civic') || t.includes('accord') || t.includes('nsx') || t.includes('s2000')) return 'Honda';
  if (t.includes('camry') || t.includes('corolla') || t.includes('yaris') || t.includes('supra') || t.includes('trueno') || t.includes('tacoma') || t.includes('hilux') || t.includes('land cruiser')) return 'Toyota';
  if (t.includes('skyline') || t.includes('silvia') || t.includes('fairlady') || t.includes('gt-r')) return 'Nissan';
  if (t.includes('rx-7') || t.includes('mazda3')) return 'Mazda';
  if (t.includes('lancer')) return 'Mitsubishi';
  if (t.includes('impreza')) return 'Subaru';
  if (t.includes('golf') || t.includes('arteon')) return 'Volkswagen';
  if (t.includes('audi') || t.includes('rs6')) return 'Audi';
  if (t.includes('f-150') || t.includes('raptor') || t.includes('bronco') || t.includes('mustang') || t.includes('shelby') || t.includes('ford gt')) return 'Ford';
  if (t.includes('ram') || t.includes('mammoth')) return 'RAM';
  if (t.includes('silverado') || t.includes('camaro') || t.includes('chevelle') || t.includes('corvette')) return 'Chevrolet';
  if (t.includes('charger') || t.includes('challenger') || t.includes('viper')) return 'Dodge';
  if (t.includes('wrangler') || t.includes('cherokee')) return 'Jeep';
  if (t.includes('defender')) return 'Land Rover';
  if (t.includes('aston') || t.includes('valkyrie')) return 'Aston Martin';
  if (t.includes('rimac') || t.includes('nevera')) return 'Rimac';
  return fallbackMfg;
}

function generateFullVehicleCatalog(): VehicleSpec[] {
  // Include 5 Signature Hero Cars + 50 Bespoke Popular Brand Cars (BMW, Lamborghini, Ferrari, Pagani, Koenigsegg, Bugatti, McLaren)
  const list: VehicleSpec[] = [...HERO_VEHICLES, ...POPULAR_BRAND_SHOWCASE_CARS];
  let colorCursor = 0;

  CATALOG_GROUPS.forEach((group, gIdx) => {
    let groupGenerated = 0;
    group.models.forEach((m, mIdx) => {
      group.editions.forEach((ed, eIdx) => {
        if (group.maxGeneratedCount !== undefined && groupGenerated >= group.maxGeneratedCount) {
          return;
        }
        groupGenerated++;
        const swatch = PAINT_SWATCHES[colorCursor % PAINT_SWATCHES.length];
        colorCursor++;
        const fallbackMfg = group.manufacturers[(mIdx + eIdx) % group.manufacturers.length];
        const mfg = inferManufacturerFromTitle(m.title, fallbackMfg);
        const hp = Math.round(m.baseHp * ed.hpMult);
        const torque = Math.round(m.baseTorque * ed.hpMult);
        const mass = Math.max(700, m.massKg + ed.weightOffset);
        const finishes: PaintFinishType[] = ['Metallic', 'Pearlescent', 'Satin', 'Matte'];

        // Scale IRL top speed, 0-100s acceleration, and 100-0m braking realistically for higher-output editions
        const powerRatio = ed.hpMult;
        const weightRatio = mass / m.massKg;
        const irlTopSpeedKmh = Math.min(
          525,
          Math.round(m.irlTopSpeedKmh * Math.pow(powerRatio, 0.28))
        );
        const irlZeroTo100Sec = Number(
          Math.max(
            1.75,
            m.irlZeroTo100Sec * Math.pow(weightRatio / powerRatio, 0.52)
          ).toFixed(2)
        );
        const irlBraking100To0M = Number(
          Math.max(
            25.5,
            m.irlBraking100To0M * Math.pow(weightRatio, 0.45)
          ).toFixed(1)
        );

        list.push(
          buildSpec({
            id: `veh_${gIdx}_${mIdx}_${eIdx}`,
            name: `${m.title} · ${ed.suffix}`,
            manufacturer: mfg,
            year: Math.min(2026, m.year + ed.yearOffset),
            category: group.category,
            engineDescription: m.engine,
            drivetrain: m.drivetrain,
            aspiration: ed.hpMult > 1.35 && m.aspiration === 'NA' ? 'TwinTurbo' : m.aspiration,
            hp,
            torque,
            redline: m.redline,
            massKg: mass,
            bodyStyle: group.bodyStyle,
            sound: group.sound,
            paintHex: swatch.hex,
            paintFinish: finishes[(mIdx + eIdx) % finishes.length],
            irlTopSpeedKmh,
            irlZeroTo100Sec,
            irlBraking100To0M,
          })
        );
      });
    });
  });

  return list;
}

export const VEHICLES: VehicleSpec[] = generateFullVehicleCatalog();

export const WORLD_POIS: WorldPointOfInterest[] = [
  {
    id: 'festival-outpost',
    name: "Place de l'Étoile & Arc de Triomphe",
    biome: 'Paris Metropolis',
    category: 'festival',
    description: 'Grand Parisian roundabout, tuning pavilion, and Champs-Élysées starting grid.',
    x: 0,
    z: 0,
    heading: 0,
    targetValue: 300,
    unit: 'km/h',
  },
  {
    id: 'coastal-speed-trap',
    name: 'Boulevard Périphérique Speed Trap',
    biome: 'Paris Metropolis',
    category: 'speed_trap',
    description: 'High-speed Parisian ring-road straightaway past the Louvre & River Seine.',
    x: 240,
    z: -160,
    heading: -Math.PI / 4,
    targetValue: 315,
    unit: 'km/h',
  },
  {
    id: 'canyon-drift-zone',
    name: 'Montmartre Hill Drift Zone',
    biome: 'Paris Metropolis',
    category: 'drift_zone',
    description: 'Winding Parisian cobblestone hill climbs beneath Sacré-Cœur Basilica.',
    x: -220,
    z: -180,
    heading: Math.PI / 3,
    targetValue: 45000,
    unit: 'pts',
  },
  {
    id: 'baja-danger-jump',
    name: 'Bois de Boulogne Danger Jump',
    biome: 'Paris Metropolis',
    category: 'danger_jump',
    description: 'High-speed parkland ramp overlooking the Versailles gardens & Seine basin.',
    x: -210,
    z: 210,
    heading: -Math.PI * 0.75,
    targetValue: 145,
    unit: 'm',
  },
  {
    id: 'festival-drag-strip',
    name: 'Champs-Élysées 1km Drag Strip',
    biome: 'Paris Metropolis',
    category: 'drag_strip',
    description: 'Iconic tree-lined grand boulevard from Place de la Concorde to Arc de Triomphe.',
    x: 0,
    z: 280,
    heading: Math.PI,
    targetValue: 295,
    unit: 'km/h',
  },
  {
    id: 'alpine-summit-outpost',
    name: 'Chamonix Glacier Summit Outpost',
    biome: 'Alpine Glacier',
    category: 'festival',
    description: 'High-altitude snow & ice summit station overlooking the Mont Blanc glacial ridge.',
    x: 4200,
    z: -4200,
    heading: Math.PI / 4,
    targetValue: 280,
    unit: 'km/h',
  },
  {
    id: 'sahara-canyon-arch',
    name: 'Sahara Red Canyon & Oasis Outpost',
    biome: 'Sahara Red Canyon',
    category: 'danger_jump',
    description: 'Towering red sandstone canyon arches and massive desert dune jumps.',
    x: -4200,
    z: 4200,
    heading: -Math.PI / 4,
    targetValue: 240,
    unit: 'm',
  },
  {
    id: 'riviera-harbor-outpost',
    name: 'Côte d’Azur Riviera Yacht Club',
    biome: 'Mediterranean Riviera',
    category: 'speed_trap',
    description: 'Sun-drenched Mediterranean coastal cliffside highway and harbor hairpins.',
    x: 4200,
    z: 4200,
    heading: -Math.PI * 0.75,
    targetValue: 355,
    unit: 'km/h',
  },
  {
    id: 'volcano-caldera-observatory',
    name: 'Vulcan Caldera Rim Observatory',
    biome: 'Volcanic Caldera',
    category: 'drift_zone',
    description: 'Glowing volcanic magma rim switchbacks and black basalt salt flats.',
    x: -4200,
    z: -4200,
    heading: Math.PI * 0.75,
    targetValue: 85000,
    unit: 'pts',
  },
  {
    id: 'autobahn-unlimited-trap',
    name: 'Autobahn Unlimited 420 km/h Radar',
    biome: 'Autobahn Megaport',
    category: 'speed_trap',
    description: '5km straight multi-lane continental superhighway built for 420+ km/h hypercars.',
    x: 5200,
    z: 0,
    heading: 0,
    targetValue: 410,
    unit: 'km/h',
  },
  {
    id: 'rainforest-canopy-bridge',
    name: 'Emerald Rainforest Valley Outpost',
    biome: 'Emerald Rainforest',
    category: 'scenic',
    description: 'Misty giant redwood valley, waterfall gorges, and muddy rally stages.',
    x: -5200,
    z: 0,
    heading: Math.PI / 2,
    targetValue: 260,
    unit: 'km/h',
  },
  {
    id: 'provence-lavender-chateau',
    name: 'Provence Lavender Highlands Château',
    biome: 'Lavender Highlands',
    category: 'scenic',
    description: 'Rolling purple lavender terraces, cypress avenues, and Roman stone viaducts.',
    x: 0,
    z: 5200,
    heading: Math.PI,
    targetValue: 310,
    unit: 'km/h',
  },
  {
    id: 'north-mountain-pass-summit',
    name: 'North Alpine Mountain Pass & Ski Resort',
    biome: 'Alpine Glacier',
    category: 'festival',
    description: 'Snow-capped mountain peaks, ski chalets, and high-altitude passes directly north of Paris.',
    x: 0,
    z: -1800,
    heading: Math.PI,
    targetValue: 290,
    unit: 'km/h',
  },
  {
    id: 'south-desert-pyramids-oasis',
    name: 'Great Desert Pyramids & Oasis Kasbah',
    biome: 'Sahara Red Canyon',
    category: 'danger_jump',
    description: 'Ancient golden desert pyramids, sand dunes, and adobe kasbah towers directly south of Paris.',
    x: 0,
    z: 1800,
    heading: 0,
    targetValue: 210,
    unit: 'm',
  },
  {
    id: 'east-skyscraper-plaza',
    name: 'East Skyscraper Metropolis & La Défense Towers',
    biome: 'Autobahn Megaport',
    category: 'speed_trap',
    description: 'Illuminated glass high-rise towers and derestricted expressway directly east of Paris.',
    x: 1800,
    z: 0,
    heading: Math.PI / 2,
    targetValue: 365,
    unit: 'km/h',
  },
  {
    id: 'west-mountain-ridge-lodge',
    name: 'Western Mountain Ridge & Redwood Lodge',
    biome: 'Emerald Rainforest',
    category: 'drift_zone',
    description: 'Granite mountain peaks, timber lodges, and giant sequoia groves directly west of Paris.',
    x: -1800,
    z: 0,
    heading: -Math.PI / 2,
    targetValue: 65000,
    unit: 'pts',
  },
];

export const WORLD_RACES: WorldRaceEvent[] = [
  // ==========================================================================
  // BIOME 1: PARIS METROPOLIS (Center: 0, 0) — 5 RACES
  // ==========================================================================
  {
    id: 'apex-tutorial-qualifier',
    name: 'Apex Association Paris Qualifier',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Association Talent Syndicate',
    discipline: 'Tutorial Qualifier',
    description:
      'Official Paris rookie evaluation circuit. Sprint up the Champs-Élysées past the Arc de Triomphe and Tour Eiffel onto the Boulevard Périphérique.',
    recommendedClass: 'S1',
    targetTimeSec: 55,
    startX: 0,
    startZ: 220,
    startHeading: Math.PI,
    checkpoints: [
      {
        x: 0,
        z: 100,
        label: 'Gate 01 · Champs-Élysées Launch',
        coachingTitle: 'STEP 1: THROTTLE LAUNCH',
        coachingInstruction:
          'Hold the GAS pedal (or [W] / [Up]) to accelerate up the Avenue des Champs-Élysées.',
      },
      {
        x: 0,
        z: 0,
        label: 'Gate 02 · Arc de Triomphe Central Vault',
        coachingTitle: 'STEP 2: HIGH-SPEED ENTRY & BRAKING',
        coachingInstruction:
          'Prepare for a 90° right turn toward the Louvre & Seine Quays! Tap BRAKE before turning.',
      },
      {
        x: 120,
        z: 0,
        label: 'Gate 03 · Rue de Rivoli Link',
        coachingTitle: 'STEP 3: STEERING & APEX LINE',
        coachingInstruction:
          'Steer smoothly past the Haussmannian boulevards toward the Boulevard Périphérique.',
      },
      {
        x: 265,
        z: 0,
        label: 'Gate 04 · Périphérique Entry',
        coachingTitle: 'STEP 4: SWEEPING RING ROAD CURVE',
        coachingInstruction:
          'Follow the curved Parisian Ring Road north-west. Tap DRIFT (E-Brake) to rotate through tight bends.',
      },
      {
        x: 187,
        z: -187,
        label: 'Gate 05 · Seine Speed Trap Sector',
        coachingTitle: 'STEP 5: CORNER EXIT TRACTION',
        coachingInstruction:
          'Unwind steering smoothly and roll back onto full power toward the northern Paris junction.',
      },
      {
        x: 0,
        z: -265,
        label: 'FINISH · Porte Maillot Gantry',
        coachingTitle: 'FINAL STEP: NITROUS BOOST TO FINISH',
        coachingInstruction:
          'Press NOS BOOST + GAS to sprint across the Apex Association Finish Line!',
      },
    ],
  },
  {
    id: 'pacific-coastal-goliath',
    name: 'Boulevard Périphérique Grand Prix',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Association Pro Series',
    discipline: 'Circuit Race',
    description:
      'High-speed orbital circuit around the entire Paris Boulevard Périphérique ring road past Tour Eiffel, Louvre, and Montmartre.',
    recommendedClass: 'S2',
    targetTimeSec: 48,
    startX: 0,
    startZ: -265,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 185, z: -185, label: 'CP 1 · Louvre & Seine Radar' },
      { x: 265, z: 0, label: 'CP 2 · Bastille Interchange' },
      { x: 185, z: 185, label: 'CP 3 · Tour Eiffel Overlook' },
      { x: 0, z: 265, label: 'CP 4 · Place de la Concorde' },
      { x: -185, z: 185, label: 'CP 5 · Bois de Boulogne Curve' },
      { x: -265, z: 0, label: 'CP 6 · Trocadéro Link' },
      { x: -185, z: -185, label: 'CP 7 · Montmartre Switchback' },
      { x: 0, z: -265, label: 'FINISH · Porte Maillot Gate' },
    ],
  },
  {
    id: 'outpost-1km-drag-cup',
    name: 'Champs-Élysées 1km Drag Showdown',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Performance Workshop',
    discipline: 'Drag Showdown',
    description:
      'All-out straight-line acceleration battle down the Avenue des Champs-Élysées through the Arc de Triomphe.',
    recommendedClass: 'S2',
    targetTimeSec: 18,
    startX: 0,
    startZ: 310,
    startHeading: Math.PI,
    checkpoints: [
      { x: 0, z: 140, label: '200m Tour Eiffel Split' },
      { x: 0, z: 0, label: '500m Arc de Triomphe Split' },
      { x: 0, z: -160, label: '800m Grande Armée Split' },
      { x: 0, z: -310, label: 'FINISH · La Défense Gantry' },
    ],
  },
  {
    id: 'red-rock-touge-masters',
    name: 'Montmartre Sacré-Cœur Drift Touge',
    biome: 'Paris Metropolis',
    sponsor: 'Kimura Street Works',
    discipline: 'Touge Drift',
    description:
      'Technical Parisian hill run combining Montmartre switchbacks and sweeping Haussmann boulevard transitions.',
    recommendedClass: 'S1',
    targetTimeSec: 42,
    startX: -260,
    startZ: 0,
    startHeading: Math.PI,
    checkpoints: [
      { x: -220, z: -150, label: 'CP 1 · Pigalle Entry' },
      { x: -120, z: -230, label: 'CP 2 · Sacré-Cœur Hairpin' },
      { x: 0, z: -260, label: 'CP 3 · North Boulevard' },
      { x: 0, z: -90, label: 'CP 4 · Étoile Approach' },
      { x: 0, z: 0, label: 'FINISH · Arc de Triomphe' },
    ],
  },
  {
    id: 'baja-sandstorm-scramble',
    name: 'Bois de Boulogne & Versailles Rally',
    biome: 'Paris Metropolis',
    sponsor: 'Solis Off-Road Division',
    discipline: 'Off-Road Rally',
    description:
      'Cross-country French parkland raid over rolling gravel carriageways and the Versailles jump ramp.',
    recommendedClass: 'A',
    targetTimeSec: 46,
    startX: 0,
    startZ: 90,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -120, z: 110, label: 'CP 1 · Boulogne Gate' },
      { x: -210, z: 225, label: 'CP 2 · Royal Park Jump' },
      { x: -210, z: 175, label: 'CP 3 · Fountain Landing' },
      { x: -110, z: 240, label: 'CP 4 · Seine Meadow' },
      { x: 0, z: 265, label: 'FINISH · Concorde Link' },
    ],
  },

  // ==========================================================================
  // ALL 4 CARDINAL CORRIDORS (NORTH MOUNTAINS, SOUTH DESERT, EAST TOWERS, WEST PEAKS) — 8 RACES
  // ==========================================================================
  {
    id: 'north-mountain-pass-sprint',
    name: 'North Alpine Mountain Pass Sprint',
    biome: 'Alpine Glacier',
    sponsor: 'Apex Mountain Syndicate',
    discipline: 'Sprint Race',
    description:
      'Blast straight north out of Paris into the towering snow-capped Alpine Mountain Pass lined with ski chalets and peaks.',
    recommendedClass: 'S1',
    targetTimeSec: 52,
    startX: 0,
    startZ: -850,
    startHeading: Math.PI,
    checkpoints: [
      { x: 0, z: -1550, label: 'CP 1 · North Ski Chalet Village' },
      { x: 0, z: -2350, label: 'CP 2 · Twin Glacier Peaks Gate' },
      { x: 0, z: -3250, label: 'CP 3 · High Altitude Snow Bridge' },
      { x: 0, z: -4200, label: 'FINISH · North Summit Ring Junction' },
    ],
  },
  {
    id: 'north-matterhorn-switchback-touge',
    name: 'Matterhorn Ridge Snow Touge (North)',
    biome: 'Alpine Glacier',
    sponsor: 'Fuji & Alpine Snow Works',
    discipline: 'Touge Drift',
    description:
      'Technical snow-packed mountain switchbacks weaving between the northern 240m peaks and alpine resort lodges.',
    recommendedClass: 'S1',
    targetTimeSec: 56,
    startX: 0,
    startZ: -1800,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 650, z: -1680, label: 'CP 1 · East Glacier Overlook' },
      { x: 1270, z: -1270, label: 'CP 2 · Pine Ridge Hairpin' },
      { x: 650, z: -850, label: 'CP 3 · Chalet Valley Descent' },
      { x: 0, z: -1150, label: 'FINISH · North Pass Plaza' },
    ],
  },
  {
    id: 'south-great-pyramid-dune-rally',
    name: 'Great Pyramid & Sahara Dune Rally (South)',
    biome: 'Sahara Red Canyon',
    sponsor: 'Dakar Raid Works',
    discipline: 'Off-Road Rally',
    description:
      'Grueling sand-dune and gravel slalom with steep moguls, deep sand traps, and sharp hairpin turns that bog down low supercars.',
    recommendedClass: 'A',
    targetTimeSec: 66,
    startX: 0,
    startZ: 850,
    startHeading: 0,
    checkpoints: [
      { x: -340, z: 1180, label: 'CP 1 · West Great Pyramid Dune Turn' },
      { x: -120, z: 1520, label: 'CP 2 · Soft Sand Washboard Chicane' },
      { x: -460, z: 1860, label: 'CP 3 · Oasis Wadi Hairpin' },
      { x: -80, z: 2180, label: 'CP 4 · East Pyramid Mogul Climb' },
      { x: -420, z: 2540, label: 'CP 5 · Red Butte Sand Switchback' },
      { x: 0, z: 2850, label: 'FINISH · Desert Highway Gate' },
    ],
  },
  {
    id: 'south-oasis-kasbah-sprint',
    name: 'Southern Desert Oasis & Canyon Sprint',
    biome: 'Sahara Red Canyon',
    sponsor: 'Solis Desert Division',
    discipline: 'Sprint Race',
    description:
      'High-speed southern desert highway and mid-ring sprint framed by red rock mesas, palm oases, and sandstone towers.',
    recommendedClass: 'S1',
    targetTimeSec: 50,
    startX: 0,
    startZ: 1800,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -950, z: 1550, label: 'CP 1 · Sandstone Butte Curve' },
      { x: -1270, z: 1270, label: 'CP 2 · SW Canyon Arterial' },
      { x: -650, z: 900, label: 'CP 3 · Desert Mirage Straight' },
      { x: 0, z: 1150, label: 'FINISH · Oasis Town Arch' },
    ],
  },
  {
    id: 'east-skyscraper-highway-sprint',
    name: 'La Défense Skyscraper & East Autobahn Sprint',
    biome: 'Autobahn Megaport',
    sponsor: 'Stuttgart & Wolfsburg GT',
    discipline: 'Sprint Race',
    description:
      'Ultra-fast eastern corridor sprint between towering glass skyscrapers, financial district plazas, and the Mid-Ring.',
    recommendedClass: 'S2',
    targetTimeSec: 46,
    startX: 850,
    startZ: 0,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1800, z: 0, label: 'CP 1 · Skyscraper Plaza Gate' },
      { x: 1550, z: 900, label: 'CP 2 · SE Coastal Ring Link' },
      { x: 1270, z: 1270, label: 'CP 3 · Riviera Viaduct Turn' },
      { x: 950, z: 450, label: 'FINISH · East Metro Tower' },
    ],
  },
  {
    id: 'east-twin-tower-drift',
    name: 'Eastern Metropolis Tower Gymkhana',
    biome: 'Autobahn Megaport',
    sponsor: 'Kimura Street Works',
    discipline: 'Touge Drift',
    description:
      'Link high-speed drifts around the illuminated eastern high-rise towers and highway interchanges.',
    recommendedClass: 'S1',
    targetTimeSec: 48,
    startX: 1800,
    startZ: 0,
    startHeading: Math.PI,
    checkpoints: [
      { x: 1550, z: -900, label: 'CP 1 · North Tower Sweep' },
      { x: 2450, z: -450, label: 'CP 2 · Industrial Overpass' },
      { x: 2450, z: 450, label: 'CP 3 · South Crane Hairpin' },
      { x: 1800, z: 0, label: 'FINISH · East Plaza Central' },
    ],
  },
  {
    id: 'west-mountain-ridge-rally',
    name: 'Western Mountain Ridge & Sequoia Rally',
    biome: 'Emerald Rainforest',
    sponsor: 'Fuji Rally Motorsport',
    discipline: 'Off-Road Rally',
    description:
      'Brutal technical forest dirt rally with deep mud ruts, tight hairpin switchbacks, and heavy mogul bumps—punishing for low-clearance supercars!',
    recommendedClass: 'A',
    targetTimeSec: 68,
    startX: -850,
    startZ: 0,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -1320, z: 290, label: 'CP 1 · Muddy Log Chicane' },
      { x: -1680, z: -260, label: 'CP 2 · Timber Switchback Left' },
      { x: -2120, z: 340, label: 'CP 3 · Granite Mogul Hairpin' },
      { x: -2640, z: -310, label: 'CP 4 · Creek Bed Washboard Turn' },
      { x: -3220, z: 280, label: 'CP 5 · Sequoia Root Crest Jump' },
      { x: -3720, z: -240, label: 'CP 6 · Canyon Mud Switchback' },
      { x: -4200, z: 0, label: 'FINISH · Western Ring Outpost' },
    ],
  },
  {
    id: 'west-volcanic-foothills-sprint',
    name: 'West-Northwest Volcanic Peak Sprint',
    biome: 'Volcanic Caldera',
    sponsor: 'SantAgata Automobili',
    discipline: 'Circuit Sprint',
    description:
      'High-speed western ring road sprint linking the Redwood Valley lodges with the smoking Volcanic Caldera peaks.',
    recommendedClass: 'S2',
    targetTimeSec: 50,
    startX: -1800,
    startZ: 0,
    startHeading: Math.PI,
    checkpoints: [
      { x: -1550, z: -900, label: 'CP 1 · Basalt Ridge Climb' },
      { x: -1270, z: -1270, label: 'CP 2 · NW Volcano Arterial' },
      { x: -2100, z: -2100, label: 'CP 3 · Geothermal Peak Gate' },
      { x: -2600, z: -1200, label: 'FINISH · Western Crater Overlook' },
    ],
  },

  // ==========================================================================
  // BIOME 2: ALPINE GLACIER & SNOW PEAKS (NE: +4200, -4200) — 4 RACES
  // ==========================================================================
  {
    id: 'alpine-chamonix-downhill',
    name: 'Chamonix Glacier Ice Touge',
    biome: 'Alpine Glacier',
    sponsor: 'Fuji & Alpine Snow Works',
    discipline: 'Touge Drift',
    description:
      'High-altitude snow & ice downhill hairpins descending from the Mont Blanc glacier station through pine valleys.',
    recommendedClass: 'S1',
    targetTimeSec: 68,
    startX: 4200,
    startZ: -4200,
    startHeading: -Math.PI * 0.75,
    checkpoints: [
      { x: 3900, z: -3950, label: 'CP 1 · Glacier Crest Switchback' },
      { x: 3550, z: -3700, label: 'CP 2 · Avalanche Pine Hairpin' },
      { x: 3250, z: -3300, label: 'CP 3 · Frozen Lake Crossing' },
      { x: 2900, z: -2900, label: 'CP 4 · Val d’Isère Bridge' },
      { x: 2500, z: -2500, label: 'FINISH · Alpine Valley Gate' },
    ],
  },
  {
    id: 'alpine-frozen-lake-circuit',
    name: 'Mont Blanc Frozen Lake Circuit',
    biome: 'Alpine Glacier',
    sponsor: 'Nordic Rally Raid',
    discipline: 'Circuit Sprint',
    description:
      'Full-lock AWD drift and grip battle across the mirror-smooth frozen glacial basin and snow-banked chicanes.',
    recommendedClass: 'A',
    targetTimeSec: 58,
    startX: 3800,
    startZ: -4400,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 4350, z: -4450, label: 'CP 1 · North Ice Shelf' },
      { x: 4650, z: -4100, label: 'CP 2 · Glacier Wall Bank' },
      { x: 4350, z: -3750, label: 'CP 3 · Pine Ridge Chicane' },
      { x: 3850, z: -3850, label: 'CP 4 · Snow Tunnel Exit' },
      { x: 3800, z: -4400, label: 'FINISH · Summit Lodge Arch' },
    ],
  },
  {
    id: 'alpine-blizzard-rally',
    name: 'Val d’Isère Snowstorm Rally Raid',
    biome: 'Alpine Glacier',
    sponsor: 'Solis Arctic Division',
    discipline: 'Off-Road Rally',
    description:
      'Deep-snow backcountry ascent climbing 140m up the jagged Alpine peaks through timberline jumps.',
    recommendedClass: 'S1',
    targetTimeSec: 64,
    startX: 3100,
    startZ: -3100,
    startHeading: Math.PI / 4,
    checkpoints: [
      { x: 3450, z: -3500, label: 'CP 1 · Timberline Ascent' },
      { x: 3850, z: -3750, label: 'CP 2 · Snow Cornice Jump' },
      { x: 4250, z: -4150, label: 'CP 3 · Summit Weather Dome' },
      { x: 4650, z: -4550, label: 'FINISH · Peak 4800m Observatory' },
    ],
  },
  {
    id: 'alpine-runway-ice-drag',
    name: 'Glacier Airfield 1.5km Ice Drag',
    biome: 'Alpine Glacier',
    sponsor: 'Apex Extreme Cold Lab',
    discipline: 'Drag Showdown',
    description:
      'Test AWD traction and nitrous modulation along a 1.5km snow-packed high-altitude airstrip.',
    recommendedClass: 'S2',
    targetTimeSec: 28,
    startX: 3600,
    startZ: -4200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 4000, z: -4200, label: '400m Ice Runway Split' },
      { x: 4450, z: -4200, label: '850m Hangar Radar Split' },
      { x: 5000, z: -4200, label: 'FINISH · Glacier Runway End' },
    ],
  },

  // ==========================================================================
  // BIOME 3: SAHARA & RED CANYON DUNES (SW: -4200, +4200) — 4 RACES
  // ==========================================================================
  {
    id: 'sahara-dakar-dune-raid',
    name: 'Sahara Dakar 1000 Dune Odyssey',
    biome: 'Sahara Red Canyon',
    sponsor: 'Dakar Raid Works',
    discipline: 'Off-Road Rally',
    description:
      'Massive desert sand dune raid leaping across golden-red crests, oasis palm groves, and dry wadis.',
    recommendedClass: 'A',
    targetTimeSec: 72,
    startX: -3200,
    startZ: 3200,
    startHeading: -Math.PI * 0.75,
    checkpoints: [
      { x: -3650, z: 3600, label: 'CP 1 · Golden Erg Dune Crest' },
      { x: -4100, z: 4050, label: 'CP 2 · Mirage Oasis Lagoon' },
      { x: -4550, z: 4400, label: 'CP 3 · Red Sandstone Arch Jump' },
      { x: -5000, z: 4800, label: 'FINISH · Sahara Bivouac Camp' },
    ],
  },
  {
    id: 'canyon-red-rock-sprint',
    name: 'Red Canyon Mesa Highway Sprint',
    biome: 'Sahara Red Canyon',
    sponsor: 'Apex Desert Syndicate',
    discipline: 'Circuit Sprint',
    description:
      'High-speed sun-baked desert tarmac weaving between towering 100m red sandstone buttes and canyon walls.',
    recommendedClass: 'S2',
    targetTimeSec: 60,
    startX: -4200,
    startZ: 4200,
    startHeading: Math.PI / 4,
    checkpoints: [
      { x: -3750, z: 4450, label: 'CP 1 · Cathedral Rock Bend' },
      { x: -3450, z: 4000, label: 'CP 2 · Sunburst Canyon Straight' },
      { x: -3800, z: 3550, label: 'CP 3 · Twin Buttes Chicane' },
      { x: -4350, z: 3750, label: 'CP 4 · Oasis Bridge' },
      { x: -4200, z: 4200, label: 'FINISH · Red Canyon Outpost' },
    ],
  },
  {
    id: 'canyon-sandstorm-drift',
    name: 'Sandstone Switchback Drift Touge',
    biome: 'Sahara Red Canyon',
    sponsor: 'Kimura Desert Spec',
    discipline: 'Touge Drift',
    description:
      'Slide inches from sheer red rock cliffs along dusty canyon switchbacks overlooking the desert floor.',
    recommendedClass: 'S1',
    targetTimeSec: 54,
    startX: -4600,
    startZ: 3700,
    startHeading: 0,
    checkpoints: [
      { x: -4600, z: 4150, label: 'CP 1 · Cliffside Overlook' },
      { x: -4250, z: 4550, label: 'CP 2 · Dust Devil Hairpin' },
      { x: -3850, z: 4350, label: 'CP 3 · Canyon Floor Drop' },
      { x: -3600, z: 3900, label: 'FINISH · Canyon Mouth Gate' },
    ],
  },
  {
    id: 'sahara-salt-flat-drag',
    name: 'Chott el Djerid Desert Pan Drag',
    biome: 'Sahara Red Canyon',
    sponsor: 'Hennessey & Solis Speed',
    discipline: 'Drag Showdown',
    description:
      'Flat-out 2km desert salt pan speed run where 1,500+ HP hypercars battle heat haze and wind.',
    recommendedClass: 'X',
    targetTimeSec: 29,
    startX: -5200,
    startZ: 4200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -4600, z: 4200, label: '600m Mirage Marker' },
      { x: -4000, z: 4200, label: '1.2km Oasis Trap' },
      { x: -3300, z: 4200, label: 'FINISH · Desert Highway Gate' },
    ],
  },

  // ==========================================================================
  // BIOME 4: MEDITERRANEAN COASTAL RIVIERA (SE: +4200, +4200) — 4 RACES
  // ==========================================================================
  {
    id: 'riviera-monaco-gp-circuit',
    name: 'Monte-Carlo Riviera Harbor GP',
    biome: 'Mediterranean Riviera',
    sponsor: 'Maranello & Molsheim Corsa',
    discipline: 'Circuit Sprint',
    description:
      'Glamorous Mediterranean coastal circuit featuring sea-cliff tunnels, yacht harbor chicanes, and casino hairpins.',
    recommendedClass: 'S2',
    targetTimeSec: 62,
    startX: 4200,
    startZ: 4200,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 3750, z: 4200, label: 'CP 1 · Casino Square Climb' },
      { x: 3650, z: 4650, label: 'CP 2 · Grand Hotel Hairpin' },
      { x: 4150, z: 4850, label: 'CP 3 · Seafront Tunnel Exit' },
      { x: 4650, z: 4550, label: 'CP 4 · Superyacht Marina Chicane' },
      { x: 4200, z: 4200, label: 'FINISH · Riviera Yacht Club' },
    ],
  },
  {
    id: 'riviera-corniche-sprint',
    name: 'Grande Corniche Coastal Cliff Sprint',
    biome: 'Mediterranean Riviera',
    sponsor: 'Apex Riviera Invitational',
    discipline: 'Circuit Sprint',
    description:
      'Breathtaking high-speed run along the cliffside road suspended above the turquoise Mediterranean Sea.',
    recommendedClass: 'S2',
    targetTimeSec: 56,
    startX: 2800,
    startZ: 2800,
    startHeading: Math.PI / 4,
    checkpoints: [
      { x: 3300, z: 3250, label: 'CP 1 · Cap d’Antibes Viewpoint' },
      { x: 3800, z: 3650, label: 'CP 2 · Azure Viaduct' },
      { x: 4300, z: 4150, label: 'CP 3 · Lighthouse Cliff Curve' },
      { x: 4850, z: 4650, label: 'FINISH · Menton Border Arch' },
    ],
  },
  {
    id: 'riviera-amalfi-drift',
    name: 'Cap Ferrat Sunset Cliff Touge',
    biome: 'Mediterranean Riviera',
    sponsor: 'Stuttgart Motorsport',
    discipline: 'Touge Drift',
    description:
      'Flowing coastal S-curves lined with Mediterranean stone walls, cypress trees, and ocean spray.',
    recommendedClass: 'S1',
    targetTimeSec: 50,
    startX: 4700,
    startZ: 3800,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 4300, z: 3850, label: 'CP 1 · Villa Ephrussi Turn' },
      { x: 3950, z: 4150, label: 'CP 2 · Harbor Overlook Drift' },
      { x: 4250, z: 4550, label: 'CP 3 · Palm Promenade' },
      { x: 4750, z: 4450, label: 'FINISH · Lighthouse Pier' },
    ],
  },
  {
    id: 'riviera-promenade-drag',
    name: 'Promenade des Anglais 1.5km Drag',
    biome: 'Mediterranean Riviera',
    sponsor: 'Aetherion Hyperworks',
    discipline: 'Drag Showdown',
    description:
      'Palm-lined beachfront boulevard drag race beside the shimmering turquoise bay of Nice.',
    recommendedClass: 'S2',
    targetTimeSec: 25,
    startX: 3500,
    startZ: 4500,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 4000, z: 4500, label: '500m Negresco Hotel Split' },
      { x: 4500, z: 4500, label: '1000m Beach Club Split' },
      { x: 5000, z: 4500, label: 'FINISH · Marina Jetty Gantry' },
    ],
  },

  // ==========================================================================
  // BIOME 5: VOLCANIC CALDERA & BASALT FLATS (NW: -4200, -4200) — 4 RACES
  // ==========================================================================
  {
    id: 'volcano-caldera-descent',
    name: 'La Gran Caldera Magma Rim Touge',
    biome: 'Volcanic Caldera',
    sponsor: 'Apex Extreme Touge',
    discipline: 'Touge Drift',
    description:
      'Descend from the 160m smoking volcanic crater rim past glowing lava vents and black basalt hairpins.',
    recommendedClass: 'S1',
    targetTimeSec: 65,
    startX: -4200,
    startZ: -4200,
    startHeading: Math.PI / 4,
    checkpoints: [
      { x: -3800, z: -3900, label: 'CP 1 · Crater Rim Observatory' },
      { x: -3450, z: -3550, label: 'CP 2 · Magma Fissure Bridge' },
      { x: -3100, z: -3150, label: 'CP 3 · Obsidian Hairpin' },
      { x: -2700, z: -2700, label: 'FINISH · Basalt Foothills Gate' },
    ],
  },
  {
    id: 'volcano-lava-circuit',
    name: 'Vulcan Crater & Geothermal Circuit',
    biome: 'Volcanic Caldera',
    sponsor: 'SantAgata Automobili',
    discipline: 'Circuit Sprint',
    description:
      'High-speed volcanic ridge loop circling the glowing caldera lake and steam geyser fields.',
    recommendedClass: 'S2',
    targetTimeSec: 59,
    startX: -4500,
    startZ: -4200,
    startHeading: 0,
    checkpoints: [
      { x: -4500, z: -3750, label: 'CP 1 · South Lava Overlook' },
      { x: -3950, z: -3750, label: 'CP 2 · Geothermal Geyser Straight' },
      { x: -3850, z: -4450, label: 'CP 3 · North Basalt Ridge' },
      { x: -4400, z: -4650, label: 'CP 4 · Ash Cloud Chicane' },
      { x: -4500, z: -4200, label: 'FINISH · Caldera Summit Gate' },
    ],
  },
  {
    id: 'volcano-ash-rally',
    name: 'Black Basalt & Cinder Cone Rally',
    biome: 'Volcanic Caldera',
    sponsor: 'Bison Off-Road Works',
    discipline: 'Off-Road Rally',
    description:
      'Brutal volcanic gravel and cinder-cone jump rally across the smoking northwest badlands.',
    recommendedClass: 'A',
    targetTimeSec: 63,
    startX: -3600,
    startZ: -4600,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -4150, z: -4650, label: 'CP 1 · Cinder Cone Crest' },
      { x: -4650, z: -4350, label: 'CP 2 · Lava Tube Jump' },
      { x: -4450, z: -3850, label: 'CP 3 · Sulfur Springs Ford' },
      { x: -3900, z: -3900, label: 'FINISH · Volcanic Outpost' },
    ],
  },
  {
    id: 'volcano-obsidian-drag',
    name: 'Obsidian Flats 2km Top Speed Drag',
    biome: 'Volcanic Caldera',
    sponsor: 'Ängelholm Hyperworks',
    discipline: 'Drag Showdown',
    description:
      'Laser-flat black volcanic glass pan engineered for world land-speed record attempts.',
    recommendedClass: 'X',
    targetTimeSec: 27,
    startX: -5000,
    startZ: -3600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -4400, z: -3600, label: '600m Basalt Split' },
      { x: -3800, z: -3600, label: '1.2km Geyser Split' },
      { x: -3100, z: -3600, label: 'FINISH · Obsidian Speed Arch' },
    ],
  },

  // ==========================================================================
  // BIOME 6: EMERALD REDWOOD & RAINFOREST VALLEY (West: -5200, 0) — 4 RACES
  // ==========================================================================
  {
    id: 'rainforest-redwood-rally',
    name: 'Giant Redwood Canopy Rally Stage',
    biome: 'Emerald Rainforest',
    sponsor: 'Fuji Rally Motorsport',
    discipline: 'Off-Road Rally',
    description:
      'Winding forest dirt and mud stage threading between ancient 90m giant redwoods and misty waterfalls.',
    recommendedClass: 'A',
    targetTimeSec: 64,
    startX: -5200,
    startZ: -400,
    startHeading: 0,
    checkpoints: [
      { x: -5350, z: 100, label: 'CP 1 · Cathedral Grove Arch' },
      { x: -4950, z: 500, label: 'CP 2 · Misty Waterfall Splash' },
      { x: -4550, z: 150, label: 'CP 3 · Timber Suspension Bridge' },
      { x: -4800, z: -350, label: 'FINISH · Redwood Ranger Camp' },
    ],
  },
  {
    id: 'rainforest-gorge-sprint',
    name: 'Emerald River Gorge Tarmac Sprint',
    biome: 'Emerald Rainforest',
    sponsor: 'Woking Track Division',
    discipline: 'Circuit Sprint',
    description:
      'Damp, mossy forest ribbon road hugging the rushing emerald river rapids from the West Highway into the valley.',
    recommendedClass: 'S1',
    targetTimeSec: 55,
    startX: -3200,
    startZ: 0,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -3800, z: -150, label: 'CP 1 · Fern Canyon Entry' },
      { x: -4400, z: 150, label: 'CP 2 · Rapids Overlook Bridge' },
      { x: -5000, z: -50, label: 'CP 3 · Sequoia Tunnel' },
      { x: -5600, z: 0, label: 'FINISH · Emerald Valley Sanctuary' },
    ],
  },
  {
    id: 'rainforest-misty-touge',
    name: 'Fern Gully Moss Hairpin Touge',
    biome: 'Emerald Rainforest',
    sponsor: 'Tsukuba Works',
    discipline: 'Touge Drift',
    description:
      'Technical low-grip damp tarmac switchbacks under a dense rainforest canopy.',
    recommendedClass: 'S1',
    targetTimeSec: 52,
    startX: -5500,
    startZ: 500,
    startHeading: Math.PI,
    checkpoints: [
      { x: -5500, z: 50, label: 'CP 1 · Canopy Mist Hairpin' },
      { x: -5100, z: -300, label: 'CP 2 · Old Mill Bridge' },
      { x: -4700, z: 50, label: 'CP 3 · Hollow Log Bend' },
      { x: -4700, z: 500, label: 'FINISH · Valley Overlook' },
    ],
  },

  // ==========================================================================
  // BIOME 7: PROVENCAL LAVENDER HIGHLANDS (South: 0, +5200) — 4 RACES
  // ==========================================================================
  {
    id: 'provence-lavender-grand-tour',
    name: 'Provence Lavender Château Grand Tour',
    biome: 'Lavender Highlands',
    sponsor: 'Modena Horacio Atelier',
    discipline: 'Circuit Sprint',
    description:
      'Fast, flowing French country roads sweeping across purple lavender plateaus, cypress alleys, and Roman aqueducts.',
    recommendedClass: 'S1',
    targetTimeSec: 60,
    startX: 0,
    startZ: 5200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 550, z: 5250, label: 'CP 1 · Lavender Plateau Crest' },
      { x: 650, z: 5750, label: 'CP 2 · Roman Stone Viaduct' },
      { x: 0, z: 5900, label: 'CP 3 · Château de Gordes Gate' },
      { x: -550, z: 5600, label: 'CP 4 · Cypress Alley Straight' },
      { x: 0, z: 5200, label: 'FINISH · Provence Outpost' },
    ],
  },
  {
    id: 'provence-vineyard-rally',
    name: 'Luberon Vineyard Gravel Scramble',
    biome: 'Lavender Highlands',
    sponsor: 'EuroRenault Rallye',
    discipline: 'Off-Road Rally',
    description:
      'Classic European gravel rally cutting through purple lavender rows, olive groves, and medieval stone villages.',
    recommendedClass: 'A',
    targetTimeSec: 57,
    startX: -500,
    startZ: 4600,
    startHeading: 0,
    checkpoints: [
      { x: -500, z: 5150, label: 'CP 1 · Lavender Terrace Jump' },
      { x: -240, z: 5550, label: 'CP 2 · Windmill Ridge' },
      { x: 0, z: 5350, label: 'CP 3 · Vineyard Cellar Hairpin' },
      { x: 0, z: 4750, label: 'FINISH · Luberon Arch' },
    ],
  },
  {
    id: 'provence-southern-highway-run',
    name: 'Autoroute du Soleil Paris–Provence Run',
    biome: 'Lavender Highlands',
    sponsor: 'Apex Endurance Series',
    discipline: 'Circuit Sprint',
    description:
      '4km high-speed endurance blast down the southern superhighway from Paris straight into the Lavender Highlands.',
    recommendedClass: 'S2',
    targetTimeSec: 54,
    startX: 0,
    startZ: 1600,
    startHeading: 0,
    checkpoints: [
      { x: 0, z: 2500, label: 'CP 1 · Loire Valley Viaduct' },
      { x: 0, z: 3400, label: 'CP 2 · Rhône Toll Plaza' },
      { x: 0, z: 4300, label: 'CP 3 · Avignon Lavender Entry' },
      { x: 0, z: 5200, label: 'FINISH · Provence Château Plaza' },
    ],
  },

  // ==========================================================================
  // BIOME 8: AUTOBAHN & NEON MEGAPORT (East: +5200, 0) — 4 RACES
  // ==========================================================================
  {
    id: 'autobahn-400kmh-goliath',
    name: 'Autobahn Unlimited 420 km/h Bullet',
    biome: 'Autobahn Megaport',
    sponsor: 'Ängelholm & Molsheim Speed',
    discipline: 'Drag Showdown',
    description:
      '4.5km derestricted eastern superhighway sprint from Paris to the Eastern Megaport. Built for 400+ km/h hypercars.',
    recommendedClass: 'X',
    targetTimeSec: 45,
    startX: 1200,
    startZ: 0,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 2200, z: 0, label: '1.0km Marne Interchange' },
      { x: 3200, z: 0, label: '2.0km Rhine Speed Gantry' },
      { x: 4200, z: 0, label: '3.0km Continental Ring Junction' },
      { x: 5200, z: 0, label: 'FINISH · Autobahn Megaport Terminal' },
    ],
  },
  {
    id: 'megaport-container-drift',
    name: 'Neon Megaport Container Gymkhana',
    biome: 'Autobahn Megaport',
    sponsor: 'Yokohama & Kimura Drift',
    discipline: 'Touge Drift',
    description:
      'Thread wide-angle drifts between towering stacks of illuminated shipping containers and harbor cranes.',
    recommendedClass: 'S1',
    targetTimeSec: 52,
    startX: 5200,
    startZ: -450,
    startHeading: 0,
    checkpoints: [
      { x: 5200, z: 0, label: 'CP 1 · Crane Gantry Alley' },
      { x: 5650, z: 250, label: 'CP 2 · Container Stack 360' },
      { x: 5650, z: -250, label: 'CP 3 · Drydock Pier Drift' },
      { x: 5200, z: -450, label: 'FINISH · Logistics Tower Gate' },
    ],
  },
  {
    id: 'autobahn-test-bowl-oval',
    name: 'Continental Ring 26km Hyper-Goliath',
    biome: 'Autobahn Megaport',
    sponsor: 'Apex World Championship',
    discipline: 'Circuit Sprint',
    description:
      'The ultimate trans-biome endurance race! Circle the 4,200m-radius Continental Ring Highway through all 8 Biomes.',
    recommendedClass: 'X',
    targetTimeSec: 185,
    startX: 4200,
    startZ: 0,
    startHeading: 0,
    checkpoints: [
      { x: 4200, z: 4200, label: 'CP 1 · Mediterranean Riviera Sector' },
      { x: 0, z: 4200, label: 'CP 2 · Provence Lavender Sector' },
      { x: -4200, z: 4200, label: 'CP 3 · Sahara Red Canyon Sector' },
      { x: -4200, z: 0, label: 'CP 4 · Emerald Rainforest Sector' },
      { x: -4200, z: -4200, label: 'CP 5 · Volcanic Caldera Sector' },
      { x: 0, z: -4200, label: 'CP 6 · Northern Autobahn Sector' },
      { x: 4200, z: -4200, label: 'CP 7 · Alpine Glacier Sector' },
      { x: 4200, z: 0, label: 'FINISH · Continental Ring Gantry' },
    ],
  },
  {
    id: 'megaport-docklands-sprint',
    name: 'East Docklands Industrial Circuit',
    biome: 'Autobahn Megaport',
    sponsor: 'Wolfsburg Motorsport',
    discipline: 'Circuit Race',
    description:
      'High-speed technical circuit linking the Autobahn cloverleaf with the industrial docklands.',
    recommendedClass: 'S2',
    targetTimeSec: 50,
    startX: 4700,
    startZ: 0,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 5300, z: 0, label: 'CP 1 · Port Terminal Straight' },
      { x: 5500, z: 450, label: 'CP 2 · South Quay Hairpin' },
      { x: 4900, z: 450, label: 'CP 3 · Rail Yard Chicane' },
      { x: 4700, z: 0, label: 'FINISH · Autobahn Cloverleaf' },
    ],
  },

  // ==========================================================================
  // NEW MULTI-ROAD CIRCUIT & SPRINT RACES (BIG HIGHWAYS, BOULEVARDS, SMALL STREETS & RIVER BRIDGES)
  // ==========================================================================
  {
    id: 'grand-river-bridges-circuit',
    name: 'Grand River & 6-Bridge Quayside Circuit',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Riverfront Series',
    discipline: 'Circuit Race',
    description:
      'Closed-loop circuit racing along the narrow Riverbank Quayside small roads, crossing 4 ornate arch bridges, and blasting back up the main N-S Highway.',
    recommendedClass: 'S1',
    targetTimeSec: 54,
    startX: 293,
    startZ: -180,
    startHeading: 0,
    checkpoints: [
      { x: 320, z: 0, label: 'CP 1 · Pont Alexandre III Bridge Deck' },
      { x: 345, z: 180, label: 'CP 2 · South River Bridge Crossing' },
      { x: 369, z: 360, label: 'CP 3 · Grand Meadow Arch Bridge' },
      { x: 0, z: 360, label: 'CP 4 · Champs-Élysées Highway Junction (Big Road)' },
      { x: 0, z: -180, label: 'CP 5 · North Autoroute Straight (Highway)' },
      { x: 293, z: -180, label: 'FINISH · North River Bridge Gate' },
    ],
  },
  {
    id: 'highway-to-small-streets-sprint',
    name: 'Highway to Small Streets & River Sprint',
    biome: 'Paris Metropolis',
    sponsor: 'Horizon Street Syndicate',
    discipline: 'Sprint Race',
    description:
      'Launch at 300+ km/h on the big East Highway, brake hard into tight 13m small city side streets, cross the Main River bridge, and sprint to the Emerald Meadow.',
    recommendedClass: 'S1',
    targetTimeSec: 49,
    startX: 600,
    startZ: 0,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 360, z: 0, label: 'CP 1 · East Highway Exit into Boulevard' },
      { x: 360, z: 180, label: 'CP 2 · Tight 90° East Bank Corner' },
      { x: 345, z: 180, label: 'CP 3 · Main River Arch Bridge Deck' },
      { x: 0, z: 180, label: 'CP 4 · Central Boulevard Link' },
      { x: -270, z: 270, label: 'CP 5 · Bois de Boulogne Open Field Lane' },
      { x: -360, z: 600, label: 'FINISH · South District Boulevard Gate' },
    ],
  },
  {
    id: 'metro-ring-900-circuit',
    name: 'Metropolitan 900m Ring & Small Grid Circuit',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Pro Touring Championship',
    discipline: 'Circuit Race',
    description:
      'High-speed circuit combining the 900m Metropolitan Ring Highway with medium district boulevards and technical small streets.',
    recommendedClass: 'S2',
    targetTimeSec: 62,
    startX: 900,
    startZ: 0,
    startHeading: 0,
    checkpoints: [
      { x: 636, z: 636, label: 'CP 1 · SE Metro Ring Curve (Big Highway)' },
      { x: 180, z: 600, label: 'CP 2 · River Bend Bridge Approach (Boulevard)' },
      { x: 0, z: 900, label: 'CP 3 · South Metro Ring Interchange' },
      { x: -480, z: 480, label: 'CP 4 · SW Small Street Chicane (Small Road)' },
      { x: -900, z: 0, label: 'CP 5 · West Metro Ring High-Speed Bank' },
      { x: 0, z: -900, label: 'CP 6 · North Metro Ring Overpass' },
      { x: 900, z: 0, label: 'FINISH · East Metro Ring Gantry' },
    ],
  },
  {
    id: 'paris-city-grid-alley-circuit',
    name: 'Downtown Small Streets & Boulevard Circuit',
    biome: 'Paris Metropolis',
    sponsor: 'Kimura Urban Works',
    discipline: 'Circuit Race',
    description:
      'Technical inner-city circuit threading 90° corners between Haussmann apartment blocks on 13m small streets and 34m big boulevards.',
    recommendedClass: 'A',
    targetTimeSec: 46,
    startX: -180,
    startZ: -90,
    startHeading: 0,
    checkpoints: [
      { x: -180, z: 180, label: 'CP 1 · West Boulevard Straight' },
      { x: -90, z: 270, label: 'CP 2 · South Small Street Chicane' },
      { x: 90, z: 180, label: 'CP 3 · Seine Bridge Approach' },
      { x: 270, z: 90, label: 'CP 4 · East Small Street Alley' },
      { x: 180, z: -180, label: 'CP 5 · Louvre North Boulevard' },
      { x: -90, z: -180, label: 'CP 6 · Montmartre Small Street Link' },
      { x: -180, z: -90, label: 'FINISH · West Haussmann Gate' },
    ],
  },
  {
    id: 'open-meadows-country-sprint',
    name: 'Open Fields, River Bridges & Country Roads Sprint',
    biome: 'Emerald Rainforest',
    sponsor: 'Horizon Country Club',
    discipline: 'Sprint Race',
    description:
      'Scenic point-to-point sprint connecting 3 lush open fields, narrow country side roads, two Main River arch bridges, and the Southern Boulevard.',
    recommendedClass: 'A',
    targetTimeSec: 55,
    startX: -1200,
    startZ: -360,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -750, z: -360, label: 'CP 1 · Western Glade Country Road (Small Road)' },
      { x: -360, z: 270, label: 'CP 2 · Royal Parkland Open Meadow' },
      { x: 369, z: 360, label: 'CP 3 · Main River Bridge #14 Crossing' },
      { x: 480, z: 600, label: 'CP 4 · Grand River Bend Open Field' },
      { x: 900, z: 600, label: 'FINISH · East Boulevard Overlook' },
    ],
  },
  {
    id: 'north-alpine-bridge-to-highway-sprint',
    name: 'Northern River Bridges to Alpine Highway Sprint',
    biome: 'Alpine Glacier',
    sponsor: 'Apex Mountain Syndicate',
    discipline: 'Sprint Race',
    description:
      'Start on the small northern river quayside roads, cross two snowy arch bridges, weave through chalet streets, and hit top speed on the North Autoroute.',
    recommendedClass: 'S1',
    targetTimeSec: 58,
    startX: 360,
    startZ: -600,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 233, z: -600, label: 'CP 1 · North River Bridge #9 Crossing' },
      { x: -270, z: -900, label: 'CP 2 · Alpine Foothills Small Street' },
      { x: -480, z: -1200, label: 'CP 3 · Northern Open Pasture Lane' },
      { x: 136, z: -1500, label: 'CP 4 · Upper River Bridge #6 Crossing' },
      { x: 0, z: -2100, label: 'CP 5 · North Continental Superhighway (Big Road)' },
      { x: 0, z: -3000, label: 'FINISH · Glacier Highway Summit Gate' },
    ],
  },
  {
    id: 'east-financial-grid-circuit',
    name: 'East Skyscraper Grid & Autobahn Circuit',
    biome: 'Autobahn Megaport',
    sponsor: 'Stuttgart Motorsport',
    discipline: 'Circuit Race',
    description:
      'Fast urban circuit weaving through the eastern skyscraper city blocks on small side streets before opening up full nitro on the East Autobahn.',
    recommendedClass: 'S2',
    targetTimeSec: 53,
    startX: 1200,
    startZ: 0,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1800, z: 0, label: 'CP 1 · East Autobahn Speed Trap (Big Highway)' },
      { x: 1800, z: -360, label: 'CP 2 · Mid-Ring North Link' },
      { x: 1350, z: -360, label: 'CP 3 · Skyscraper Small Street Canyon' },
      { x: 1050, z: -180, label: 'CP 4 · Financial District Alley' },
      { x: 900, z: 180, label: 'CP 5 · South Tower Boulevard' },
      { x: 1200, z: 0, label: 'FINISH · East Autobahn Plaza' },
    ],
  },
  {
    id: 'south-kasbah-boulevard-circuit',
    name: 'Southern River Bridge & Desert Boulevard Circuit',
    biome: 'Sahara Red Canyon',
    sponsor: 'Solis Desert Division',
    discipline: 'Circuit Race',
    description:
      'Multi-surface circuit linking the Southern Highway, the z=1200m and z=1800m Main River Bridges, desert kasbah boulevards, and small oasis lanes.',
    recommendedClass: 'S1',
    targetTimeSec: 57,
    startX: 0,
    startZ: 1200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 240, z: 1200, label: 'CP 1 · South River Bridge #17 Crossing' },
      { x: 600, z: 1500, label: 'CP 2 · East Oasis Small Road' },
      { x: 180, z: 1800, label: 'CP 3 · Mid-Ring River Bridge #19' },
      { x: -360, z: 1800, label: 'CP 4 · Pyramid View Highway (Big Road)' },
      { x: -270, z: 1350, label: 'CP 5 · Kasbah Small Street Cut' },
      { x: 0, z: 1200, label: 'FINISH · South Autoroute Gate' },
    ],
  },
  {
    id: 'trans-continental-all-roads-marathon',
    name: 'Apex Grand Tour: Highways, Small Roads & Bridges',
    biome: 'Paris Metropolis',
    sponsor: 'Apex World Championship',
    discipline: 'Circuit Race',
    description:
      'The ultimate all-roads circuit! Combines 400 km/h Superhighways, 20m District Boulevards, 13m Small City Streets, Open Meadows, and 3 Main River Bridges.',
    recommendedClass: 'S2',
    targetTimeSec: 88,
    startX: 0,
    startZ: 360,
    startHeading: Math.PI,
    checkpoints: [
      { x: 0, z: -600, label: 'CP 1 · Champs-Élysées & North Highway Blast' },
      { x: 600, z: -600, label: 'CP 2 · Sunrise Meadow & River Bridge' },
      { x: 1200, z: 0, label: 'CP 3 · East Skyscraper Autobahn (Big Road)' },
      { x: 750, z: 480, label: 'CP 4 · SE Small Street Switchback' },
      { x: 180, z: 900, label: 'CP 5 · Southern River Bridge & Quayside' },
      { x: -600, z: 600, label: 'CP 6 · SW Boulevard & Royal Meadow' },
      { x: -480, z: 0, label: 'CP 7 · West Small Street Chicane' },
      { x: 0, z: 360, label: 'FINISH · Grand Tour Arch Gantry' },
    ],
  },

  // ==========================================================================
  // 50 ADDITIONAL CIRCUIT & SPRINT RACES COVERING ALL SECTORS OF THE 16KM MAP
  // ==========================================================================
  {
    id: 'paris-etoile-grand-circuit',
    name: 'Place de l’Étoile & Grand Boulevards Circuit',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Paris Grand Prix',
    discipline: 'Circuit Race',
    description:
      'High-speed inner Paris circuit sweeping through the Arc de Triomphe vault and the 360m Haussmannian boulevards.',
    recommendedClass: 'S1',
    targetTimeSec: 46,
    startX: 0,
    startZ: 180,
    startHeading: Math.PI,
    checkpoints: [
      { x: 0, z: -180, label: 'CP 1 · Arc de Triomphe North Vault' },
      { x: 180, z: -180, label: 'CP 2 · Louvre North Boulevard' },
      { x: 180, z: 180, label: 'CP 3 · Seine Bridge South Link' },
      { x: -180, z: 180, label: 'CP 4 · Trocadéro South Boulevard' },
      { x: -180, z: -180, label: 'CP 5 · Ternes West Corner' },
      { x: 0, z: 180, label: 'FINISH · Champs-Élysées Gantry' },
    ],
  },
  {
    id: 'paris-seine-bridges-sprint',
    name: 'Seine 5-Bridge Quayside Sprint',
    biome: 'Paris Metropolis',
    sponsor: 'Horizon Riverfront Club',
    discipline: 'Sprint Race',
    description:
      'Technical point-to-point sprint slaloming across five consecutive ornate Seine arch bridges and riverfront quays.',
    recommendedClass: 'A',
    targetTimeSec: 52,
    startX: 0,
    startZ: -600,
    startHeading: 0,
    checkpoints: [
      { x: 266, z: -360, label: 'CP 1 · North Seine Bridge Crossing' },
      { x: 180, z: -180, label: 'CP 2 · Louvre West Quay' },
      { x: 320, z: 0, label: 'CP 3 · Pont Alexandre III Bridge Deck' },
      { x: 180, z: 180, label: 'CP 4 · Champ de Mars Boulevard' },
      { x: 369, z: 360, label: 'CP 5 · South Meadow Bridge' },
      { x: 0, z: 600, label: 'FINISH · Southern Boulevard Arch' },
    ],
  },
  {
    id: 'paris-louvre-bastille-circuit',
    name: 'Louvre to Bastille Ring Circuit',
    biome: 'Paris Metropolis',
    sponsor: 'Maranello Urban Tour',
    discipline: 'Circuit Race',
    description:
      'Fast eastern Paris loop linking the Rue de Rivoli arterial with the 600m district boulevards.',
    recommendedClass: 'S1',
    targetTimeSec: 50,
    startX: 180,
    startZ: 0,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 600, z: 0, label: 'CP 1 · Bastille Plaza Straight' },
      { x: 600, z: -360, label: 'CP 2 · République North Turn' },
      { x: 180, z: -360, label: 'CP 3 · Opéra Garnier Boulevard' },
      { x: 180, z: 0, label: 'FINISH · Louvre Rivoli Gate' },
    ],
  },
  {
    id: 'paris-trocadero-champs-sprint',
    name: 'Trocadéro to Champs-Élysées Sprint',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Street Syndicate',
    discipline: 'Sprint Race',
    description:
      'Charge from the western Trocadéro avenues through the central Paris grid to the Eastern Skyscraper gateway.',
    recommendedClass: 'S1',
    targetTimeSec: 44,
    startX: -600,
    startZ: 0,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -265, z: 0, label: 'CP 1 · Porte Dauphine Ring' },
      { x: 0, z: 0, label: 'CP 2 · Étoile Central Vault' },
      { x: 360, z: 0, label: 'CP 3 · Rivoli High-Speed Straight' },
      { x: 600, z: 360, label: 'CP 4 · Southeast River Viaduct' },
      { x: 900, z: 360, label: 'FINISH · Metro Ring East Gate' },
    ],
  },
  {
    id: 'paris-haussmann-inner-grid-circuit',
    name: 'Haussmann 360m Boulevard Grid Circuit',
    biome: 'Paris Metropolis',
    sponsor: 'Munich M Performance',
    discipline: 'Circuit Race',
    description:
      'Four-corner 90-degree boulevard circuit around the outer Haussmann apartment blocks.',
    recommendedClass: 'A',
    targetTimeSec: 54,
    startX: 360,
    startZ: -360,
    startHeading: 0,
    checkpoints: [
      { x: 360, z: 360, label: 'CP 1 · SE Boulevard Corner' },
      { x: -360, z: 360, label: 'CP 2 · SW Boulogne Corner' },
      { x: -360, z: -360, label: 'CP 3 · NW Montmartre Corner' },
      { x: 360, z: -360, label: 'FINISH · NE Haussmann Gate' },
    ],
  },
  {
    id: 'paris-latin-quarter-alley-sprint',
    name: 'Left Bank Small Streets Sprint',
    biome: 'Paris Metropolis',
    sponsor: 'Kimura Urban Works',
    discipline: 'Sprint Race',
    description:
      'Thread the needle along narrow 13m Left Bank side streets and tight 90-degree alleys.',
    recommendedClass: 'A',
    targetTimeSec: 47,
    startX: -90,
    startZ: 90,
    startHeading: 0,
    checkpoints: [
      { x: -90, z: 480, label: 'CP 1 · Montparnasse Alley' },
      { x: 240, z: 480, label: 'CP 2 · Left Bank River Crossing' },
      { x: 240, z: 240, label: 'CP 3 · Sorbonne Side Street' },
      { x: 480, z: 240, label: 'CP 4 · Jardin des Plantes Turn' },
      { x: 480, z: -90, label: 'FINISH · Bastille Small Road Gate' },
    ],
  },
  {
    id: 'paris-concorde-opera-circuit',
    name: 'Concorde & Opéra Midnight Circuit',
    biome: 'Paris Metropolis',
    sponsor: 'Molsheim Atelier',
    discipline: 'Circuit Race',
    description:
      'High-speed night-style street circuit connecting the Place de la Concorde with the northern grand avenues.',
    recommendedClass: 'S2',
    targetTimeSec: 48,
    startX: 0,
    startZ: 240,
    startHeading: Math.PI,
    checkpoints: [
      { x: 0, z: -240, label: 'CP 1 · North Champs-Élysées' },
      { x: -240, z: -240, label: 'CP 2 · Monceau Small Street' },
      { x: -240, z: 240, label: 'CP 3 · Invalides West Avenue' },
      { x: 0, z: 240, label: 'FINISH · Concorde Gantry' },
    ],
  },
  {
    id: 'paris-peripherique-reverse-gp',
    name: 'Périphérique Counter-Clockwise GP',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Association Pro Series',
    discipline: 'Circuit Race',
    description:
      'Reverse-direction high-G orbital race around the 265m Boulevard Périphérique ring road.',
    recommendedClass: 'S2',
    targetTimeSec: 47,
    startX: 0,
    startZ: 265,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 265, z: 0, label: 'CP 1 · East Ring Sector' },
      { x: 0, z: -265, label: 'CP 2 · North Ring Sector' },
      { x: -265, z: 0, label: 'CP 3 · West Ring Sector' },
      { x: 0, z: 265, label: 'FINISH · South Ring Gantry' },
    ],
  },
  {
    id: 'alpine-mont-blanc-highway-circuit',
    name: 'Mont Blanc High-Altitude Highway Circuit',
    biome: 'Alpine Glacier',
    sponsor: 'Fuji & Alpine Snow Works',
    discipline: 'Circuit Race',
    description:
      'Fast snow-flanked highway circuit looping the northern 2400m and 3600m Alpine boulevards.',
    recommendedClass: 'S2',
    targetTimeSec: 64,
    startX: 0,
    startZ: -2400,
    startHeading: Math.PI,
    checkpoints: [
      { x: 0, z: -3600, label: 'CP 1 · North Glacier Autoroute' },
      { x: 1200, z: -3600, label: 'CP 2 · High Alpine Pass East' },
      { x: 1200, z: -2400, label: 'CP 3 · Chamonix Valley Boulevard' },
      { x: 0, z: -2400, label: 'FINISH · Alpine Autoroute Gate' },
    ],
  },
  {
    id: 'alpine-glacier-bridge-sprint',
    name: 'Northern Glacier Bridges Sprint',
    biome: 'Alpine Glacier',
    sponsor: 'Nordic Rally Raid',
    discipline: 'Sprint Race',
    description:
      'Sprint across the northernmost frozen river bridges and climb toward the NE Continental Ring.',
    recommendedClass: 'S1',
    targetTimeSec: 58,
    startX: -600,
    startZ: -2400,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 600, z: -2400, label: 'CP 1 · Bridge #4 Glacier Crossing' },
      { x: 600, z: -3000, label: 'CP 2 · Ice Gorge Boulevard' },
      { x: 0, z: -3000, label: 'CP 3 · Bridge #3 Upper Crossing' },
      { x: 0, z: -4200, label: 'FINISH · North Continental Ring' },
    ],
  },
  {
    id: 'alpine-courchevel-valley-circuit',
    name: 'Courchevel Chalet Boulevard Circuit',
    biome: 'Alpine Glacier',
    sponsor: 'Apex Mountain Syndicate',
    discipline: 'Circuit Race',
    description:
      'Technical winter tarmac circuit weaving through the ski chalet boulevards at z = -1500m to -2100m.',
    recommendedClass: 'S1',
    targetTimeSec: 54,
    startX: -600,
    startZ: -1500,
    startHeading: Math.PI,
    checkpoints: [
      { x: -600, z: -2100, label: 'CP 1 · West Chalet Avenue' },
      { x: 600, z: -2100, label: 'CP 2 · North Ski Bridge' },
      { x: 600, z: -1500, label: 'CP 3 · East Slopes Boulevard' },
      { x: -600, z: -1500, label: 'FINISH · Courchevel Village Gate' },
    ],
  },
  {
    id: 'alpine-zermatt-express-sprint',
    name: 'Zermatt North Autoroute Express Sprint',
    biome: 'Alpine Glacier',
    sponsor: 'Ängelholm Hyperworks',
    discipline: 'Sprint Race',
    description:
      'All-out top-speed mountain highway blast from the 900m Metro Ring straight up to the 4200m Northern Summit.',
    recommendedClass: 'X',
    targetTimeSec: 46,
    startX: 0,
    startZ: -900,
    startHeading: Math.PI,
    checkpoints: [
      { x: 0, z: -1800, label: 'CP 1 · Mid-Ring Mountain Junction' },
      { x: 0, z: -2800, label: 'CP 2 · Matterhorn Straight' },
      { x: 0, z: -3600, label: 'CP 3 · Timberline Speed Trap' },
      { x: 0, z: -4200, label: 'FINISH · North Continental Ring Gantry' },
    ],
  },
  {
    id: 'alpine-ice-ring-1800-circuit',
    name: 'Alpine 1800m Ring & Pass Circuit',
    biome: 'Alpine Glacier',
    sponsor: 'Stuttgart Motorsport',
    discipline: 'Circuit Race',
    description:
      'High-speed northern arc of the 1800m Mid-Ring combined with the 1200m mountain boulevards.',
    recommendedClass: 'S2',
    targetTimeSec: 60,
    startX: 0,
    startZ: -1800,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1272, z: -1272, label: 'CP 1 · NE Mid-Ring Curve' },
      { x: 1200, z: -1200, label: 'CP 2 · East Mountain Junction' },
      { x: 0, z: -1200, label: 'CP 3 · North River Bridge #7' },
      { x: 0, z: -1800, label: 'FINISH · Alpine Pass Gate' },
    ],
  },
  {
    id: 'alpine-avalanche-ridge-sprint',
    name: 'Avalanche Ridge to NE Summit Sprint',
    biome: 'Alpine Glacier',
    sponsor: 'Woking Track Division',
    discipline: 'Sprint Race',
    description:
      'Diagonal highway ascent from the 1800m ring up the NE Trans-Biome Arterial to the Chamonix Summit.',
    recommendedClass: 'S2',
    targetTimeSec: 52,
    startX: 1272,
    startZ: -1272,
    startHeading: Math.PI / 4,
    checkpoints: [
      { x: 1800, z: -1800, label: 'CP 1 · Lower Glacier Viaduct' },
      { x: 2400, z: -2400, label: 'CP 2 · Snow Peak Pass' },
      { x: 3000, z: -3000, label: 'CP 3 · Ice Shelf Straight' },
      { x: 3600, z: -3600, label: 'FINISH · NE Summit Plaza' },
    ],
  },
  {
    id: 'alpine-nordic-viaduct-circuit',
    name: 'Nordic Viaduct & Snow Grid Circuit',
    biome: 'Alpine Glacier',
    sponsor: 'Nordic Rally Raid',
    discipline: 'Circuit Race',
    description:
      'High-elevation paved boulevard circuit in the far northeast snowfield sector.',
    recommendedClass: 'S1',
    targetTimeSec: 58,
    startX: 2400,
    startZ: -2400,
    startHeading: Math.PI,
    checkpoints: [
      { x: 2400, z: -3200, label: 'CP 1 · North Glacier Boulevard' },
      { x: 3200, z: -3200, label: 'CP 2 · Frozen Peak Corner' },
      { x: 3200, z: -2400, label: 'CP 3 · East Icefield Straight' },
      { x: 2400, z: -2400, label: 'FINISH · Nordic Viaduct Arch' },
    ],
  },
  {
    id: 'sahara-pyramid-oasis-circuit',
    name: 'Great Pyramids Boulevard Circuit',
    biome: 'Sahara Red Canyon',
    sponsor: 'Solis Desert Division',
    discipline: 'Circuit Race',
    description:
      'High-speed paved circuit surrounding the Great Golden Pyramids on the southern desert boulevards.',
    recommendedClass: 'S1',
    targetTimeSec: 58,
    startX: 0,
    startZ: 1500,
    startHeading: 0,
    checkpoints: [
      { x: 0, z: 2400, label: 'CP 1 · South Pyramid Highway' },
      { x: -900, z: 2400, label: 'CP 2 · West Dune Boulevard' },
      { x: -900, z: 1500, label: 'CP 3 · Red Butte Straight' },
      { x: 0, z: 1500, label: 'FINISH · Oasis Boulevard Gate' },
    ],
  },
  {
    id: 'sahara-canyon-highway-sprint',
    name: 'Red Canyon SW Arterial Sprint',
    biome: 'Sahara Red Canyon',
    sponsor: 'Apex Desert Syndicate',
    discipline: 'Sprint Race',
    description:
      'Flat-out southwest diagonal highway sprint from the 1800m Mid-Ring deep into the Sahara Red Canyon.',
    recommendedClass: 'S2',
    targetTimeSec: 50,
    startX: -1272,
    startZ: 1272,
    startHeading: -Math.PI * 0.75,
    checkpoints: [
      { x: -1800, z: 1800, label: 'CP 1 · Sandstone Gorge Entry' },
      { x: -2400, z: 2400, label: 'CP 2 · Red Mesa Straight' },
      { x: -3000, z: 3000, label: 'CP 3 · Pyramid Overlook' },
      { x: -3600, z: 3600, label: 'FINISH · Red Canyon Outpost' },
    ],
  },
  {
    id: 'sahara-mirage-boulevard-circuit',
    name: 'Desert Mirage 2400m Grid Circuit',
    biome: 'Sahara Red Canyon',
    sponsor: 'SantAgata Automobili',
    discipline: 'Circuit Race',
    description:
      'Sun-drenched desert tarmac circuit on the wide 2400m–3200m southwestern boulevards.',
    recommendedClass: 'S2',
    targetTimeSec: 60,
    startX: -2400,
    startZ: 2400,
    startHeading: 0,
    checkpoints: [
      { x: -2400, z: 3200, label: 'CP 1 · South Erg Boulevard' },
      { x: -3200, z: 3200, label: 'CP 2 · Great Pyramid West Turn' },
      { x: -3200, z: 2400, label: 'CP 3 · Canyon Rim Straight' },
      { x: -2400, z: 2400, label: 'FINISH · Mirage Grid Gate' },
    ],
  },
  {
    id: 'sahara-kasbah-bridge-sprint',
    name: 'Kasbah Fortress to South Bridge Sprint',
    biome: 'Sahara Red Canyon',
    sponsor: 'Dakar Raid Works',
    discipline: 'Sprint Race',
    description:
      'Race from the western desert kasbahs across the southern Main River bridges to the eastern oasis.',
    recommendedClass: 'A',
    targetTimeSec: 54,
    startX: -1200,
    startZ: 1800,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 0, z: 1800, label: 'CP 1 · Oasis Town Junction' },
      { x: 300, z: 1800, label: 'CP 2 · South River Bridge #19' },
      { x: 900, z: 1800, label: 'CP 3 · East Desert Boulevard' },
      { x: 900, z: 2400, label: 'FINISH · Southern Palms Gate' },
    ],
  },
  {
    id: 'sahara-erg-chebbi-tarmac-circuit',
    name: 'Erg Chebbi Perimeter Road Circuit',
    biome: 'Sahara Red Canyon',
    sponsor: 'Modena Horacio Atelier',
    discipline: 'Circuit Race',
    description:
      'High-speed perimeter road loop skirting the golden sand dunes at 280+ km/h.',
    recommendedClass: 'S1',
    targetTimeSec: 56,
    startX: -1500,
    startZ: 1500,
    startHeading: 0,
    checkpoints: [
      { x: -1500, z: 2100, label: 'CP 1 · Dune Shadow Straight' },
      { x: -2100, z: 2100, label: 'CP 2 · Southwest Butte Turn' },
      { x: -2100, z: 1500, label: 'CP 3 · Wadi Tarmac Link' },
      { x: -1500, z: 1500, label: 'FINISH · Erg Chebbi Arch' },
    ],
  },
  {
    id: 'sahara-wadi-express-sprint',
    name: 'Southern Wadi Superhighway Sprint',
    biome: 'Sahara Red Canyon',
    sponsor: 'Hennessey & Solis Speed',
    discipline: 'Sprint Race',
    description:
      'High-velocity southern boulevard run from the 900m Metro Ring to the 3600m desert horizon.',
    recommendedClass: 'S2',
    targetTimeSec: 49,
    startX: -600,
    startZ: 900,
    startHeading: 0,
    checkpoints: [
      { x: -600, z: 1800, label: 'CP 1 · Pyramid West Pass' },
      { x: -600, z: 2800, label: 'CP 2 · Southern Kasbah Straight' },
      { x: 0, z: 2800, label: 'CP 3 · Autoroute du Sud Link' },
      { x: 0, z: 3600, label: 'FINISH · Southern Desert Gantry' },
    ],
  },
  {
    id: 'sahara-sunburst-mesa-circuit',
    name: 'Sunburst Mesa Outer Ring Circuit',
    biome: 'Sahara Red Canyon',
    sponsor: 'Apex World Championship',
    discipline: 'Circuit Race',
    description:
      'Combine the 3600m and 4200m southern desert highways in a blistering top-speed circuit.',
    recommendedClass: 'S2',
    targetTimeSec: 65,
    startX: -1800,
    startZ: 3600,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -3000, z: 3600, label: 'CP 1 · Red Mesa West Turn' },
      { x: -3000, z: 4200, label: 'CP 2 · Outer Ring Desert Entry' },
      { x: -1800, z: 4200, label: 'CP 3 · Sahara South Straight' },
      { x: -1800, z: 3600, label: 'FINISH · Sunburst Mesa Gate' },
    ],
  },
  {
    id: 'riviera-cannes-croisette-circuit',
    name: 'Cannes Croisette Seafront Circuit',
    biome: 'Mediterranean Riviera',
    sponsor: 'Maranello & Molsheim Corsa',
    discipline: 'Circuit Race',
    description:
      'Glamorous coastal boulevard circuit along the southeastern Mediterranean seafront grid.',
    recommendedClass: 'S2',
    targetTimeSec: 56,
    startX: 2400,
    startZ: 2400,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 3200, z: 2400, label: 'CP 1 · Palm Boulevard Straight' },
      { x: 3200, z: 3200, label: 'CP 2 · Azure Harbor Turn' },
      { x: 2400, z: 3200, label: 'CP 3 · Cliffside Villa Avenue' },
      { x: 2400, z: 2400, label: 'FINISH · Croisette Grand Arch' },
    ],
  },
  {
    id: 'riviera-antibes-harbor-sprint',
    name: 'Cap d’Antibes to Harbor Sprint',
    biome: 'Mediterranean Riviera',
    sponsor: 'Apex Riviera Invitational',
    discipline: 'Sprint Race',
    description:
      'Fast coastal sprint from the 1800m Mid-Ring out to the Mediterranean Riviera marina.',
    recommendedClass: 'S1',
    targetTimeSec: 52,
    startX: 1800,
    startZ: 1200,
    startHeading: 0,
    checkpoints: [
      { x: 1800, z: 2400, label: 'CP 1 · Riviera Foothills Straight' },
      { x: 2800, z: 2400, label: 'CP 2 · Cap d’Antibes Boulevard' },
      { x: 2800, z: 3600, label: 'CP 3 · Seafront Viaduct' },
      { x: 3600, z: 3600, label: 'FINISH · Marina Yacht Club' },
    ],
  },
  {
    id: 'riviera-sanremo-coastal-circuit',
    name: 'Sanremo Coastal Boulevard Circuit',
    biome: 'Mediterranean Riviera',
    sponsor: 'Modena Horacio Atelier',
    discipline: 'Circuit Race',
    description:
      'Flowing 90-degree boulevard circuit through the sun-kissed southeastern Riviera district.',
    recommendedClass: 'S1',
    targetTimeSec: 55,
    startX: 1500,
    startZ: 1500,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 2100, z: 1500, label: 'CP 1 · Cypress Ridge Road' },
      { x: 2100, z: 2100, label: 'CP 2 · Sanremo Overlook' },
      { x: 1500, z: 2100, label: 'CP 3 · Olive Grove Avenue' },
      { x: 1500, z: 1500, label: 'FINISH · Coastal Plaza Gate' },
    ],
  },
  {
    id: 'riviera-eze-viaduct-sprint',
    name: 'Èze Cliff Viaduct Highway Sprint',
    biome: 'Mediterranean Riviera',
    sponsor: 'Woking Track Division',
    discipline: 'Sprint Race',
    description:
      'High-speed coastal highway sprint linking the East Autobahn with the southern Riviera cliffs.',
    recommendedClass: 'S2',
    targetTimeSec: 50,
    startX: 3000,
    startZ: 600,
    startHeading: 0,
    checkpoints: [
      { x: 3000, z: 1800, label: 'CP 1 · Èze Viaduct Straight' },
      { x: 3000, z: 2800, label: 'CP 2 · Monaco Upper Corniche' },
      { x: 3600, z: 2800, label: 'CP 3 · Harbor Tunnel Approach' },
      { x: 3600, z: 4200, label: 'FINISH · Riviera Outer Ring' },
    ],
  },
  {
    id: 'riviera-st-tropez-bay-circuit',
    name: 'Saint-Tropez Bay & Marina Circuit',
    biome: 'Mediterranean Riviera',
    sponsor: 'Maranello Urban Tour',
    discipline: 'Circuit Race',
    description:
      'Scenic coastal circuit connecting the southern river bridges with the Riviera beach avenues.',
    recommendedClass: 'A',
    targetTimeSec: 57,
    startX: 900,
    startZ: 2400,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1800, z: 2400, label: 'CP 1 · Bay View Boulevard' },
      { x: 1800, z: 3200, label: 'CP 2 · Saint-Tropez Pier Turn' },
      { x: 900, z: 3200, label: 'CP 3 · Vineyard Coast Road' },
      { x: 900, z: 2400, label: 'FINISH · Marina Arch' },
    ],
  },
  {
    id: 'riviera-azure-diagonal-sprint',
    name: 'Côte d’Azur SE Diagonal Sprint',
    biome: 'Mediterranean Riviera',
    sponsor: 'Ängelholm Hyperworks',
    discipline: 'Sprint Race',
    description:
      'Full-throttle southeastern diagonal superhighway sprint from central Paris to the Riviera coast.',
    recommendedClass: 'X',
    targetTimeSec: 48,
    startX: 600,
    startZ: 600,
    startHeading: Math.PI * 0.25,
    checkpoints: [
      { x: 1500, z: 1500, label: 'CP 1 · SE Metro Interchange' },
      { x: 2400, z: 2400, label: 'CP 2 · Riviera Foothills Gantry' },
      { x: 3300, z: 3300, label: 'CP 3 · Sea Cliff Speed Trap' },
      { x: 4000, z: 4000, label: 'FINISH · Côte d’Azur Terminal' },
    ],
  },
  {
    id: 'volcano-basalt-highway-circuit',
    name: 'Basalt Badlands 3000m Grid Circuit',
    biome: 'Volcanic Caldera',
    sponsor: 'SantAgata Automobili',
    discipline: 'Circuit Race',
    description:
      'High-speed volcanic tarmac circuit around the smoking northwest basalt plateaus.',
    recommendedClass: 'S2',
    targetTimeSec: 58,
    startX: -2400,
    startZ: -2400,
    startHeading: Math.PI,
    checkpoints: [
      { x: -2400, z: -3200, label: 'CP 1 · North Caldera Straight' },
      { x: -3200, z: -3200, label: 'CP 2 · Crater Rim Junction' },
      { x: -3200, z: -2400, label: 'CP 3 · West Basalt Boulevard' },
      { x: -2400, z: -2400, label: 'FINISH · Badlands Gate' },
    ],
  },
  {
    id: 'volcano-crater-express-sprint',
    name: 'NW Caldera Diagonal Highway Sprint',
    biome: 'Volcanic Caldera',
    sponsor: 'Apex Extreme Touge',
    discipline: 'Sprint Race',
    description:
      'Blast up the NW Diagonal Highway from Paris straight toward the smoking La Gran Caldera volcano.',
    recommendedClass: 'S2',
    targetTimeSec: 50,
    startX: -900,
    startZ: -900,
    startHeading: -Math.PI * 0.75,
    checkpoints: [
      { x: -1800, z: -1800, label: 'CP 1 · Mid-Ring Volcano Gate' },
      { x: -2700, z: -2700, label: 'CP 2 · Basalt Slope Ascent' },
      { x: -3400, z: -3400, label: 'CP 3 · Geothermal Overlook' },
      { x: -4000, z: -4000, label: 'FINISH · Caldera Summit Ring' },
    ],
  },
  {
    id: 'volcano-obsidian-ring-circuit',
    name: 'Obsidian Outer Ring & Boulevard Circuit',
    biome: 'Volcanic Caldera',
    sponsor: 'Ängelholm Hyperworks',
    discipline: 'Circuit Race',
    description:
      'Ultra-fast northwest circuit linking the 3600m and 4200m volcanic highways.',
    recommendedClass: 'X',
    targetTimeSec: 62,
    startX: -1800,
    startZ: -3600,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -3000, z: -3600, label: 'CP 1 · Obsidian West Turn' },
      { x: -3000, z: -4200, label: 'CP 2 · North Outer Ring Entry' },
      { x: -1800, z: -4200, label: 'CP 3 · Lava Field Straight' },
      { x: -1800, z: -3600, label: 'FINISH · Obsidian Gate' },
    ],
  },
  {
    id: 'volcano-magma-viaduct-sprint',
    name: 'Magma Viaduct to West Ridge Sprint',
    biome: 'Volcanic Caldera',
    sponsor: 'Woking Track Division',
    discipline: 'Sprint Race',
    description:
      'Point-to-point sprint descending from the northern volcanic boulevards into the western redwood valley.',
    recommendedClass: 'S1',
    targetTimeSec: 53,
    startX: -3000,
    startZ: -3000,
    startHeading: 0,
    checkpoints: [
      { x: -3000, z: -1800, label: 'CP 1 · Basalt Ridge Viaduct' },
      { x: -2400, z: -1800, label: 'CP 2 · Western Foothills Turn' },
      { x: -2400, z: -600, label: 'CP 3 · Redwood Approach Road' },
      { x: -1800, z: -600, label: 'FINISH · West Mid-Ring Gate' },
    ],
  },
  {
    id: 'volcano-geyser-valley-circuit',
    name: 'Geothermal Valley Paved Circuit',
    biome: 'Volcanic Caldera',
    sponsor: 'Munich M Performance',
    discipline: 'Circuit Race',
    description:
      'Technical 600m-grid circuit through the steaming geothermal valley northwest of Paris.',
    recommendedClass: 'S1',
    targetTimeSec: 54,
    startX: -1500,
    startZ: -1500,
    startHeading: Math.PI,
    checkpoints: [
      { x: -1500, z: -2100, label: 'CP 1 · Steam Vent Straight' },
      { x: -2100, z: -2100, label: 'CP 2 · Cinder Ridge Corner' },
      { x: -2100, z: -1500, label: 'CP 3 · Basalt Gorge Link' },
      { x: -1500, z: -1500, label: 'FINISH · Geothermal Arch' },
    ],
  },
  {
    id: 'volcano-north-crater-sprint',
    name: 'North Crater Rim to Autoroute Sprint',
    biome: 'Volcanic Caldera',
    sponsor: 'SantAgata Automobili',
    discipline: 'Sprint Race',
    description:
      'High-speed cross-sector sprint from the NW Volcano Rim to the North Continental Highway.',
    recommendedClass: 'S2',
    targetTimeSec: 49,
    startX: -3600,
    startZ: -3000,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -2400, z: -3000, label: 'CP 1 · Crater East Boulevard' },
      { x: -1200, z: -3000, label: 'CP 2 · Alpine Transition Straight' },
      { x: -600, z: -3000, label: 'CP 3 · North Gorge Approach' },
      { x: 0, z: -3000, label: 'FINISH · North Autoroute Bridge #3' },
    ],
  },
  {
    id: 'rainforest-sequoia-boulevard-circuit',
    name: 'Sequoia Valley 1800m Boulevard Circuit',
    biome: 'Emerald Rainforest',
    sponsor: 'Fuji Rally Motorsport',
    discipline: 'Circuit Race',
    description:
      'Fast forest tarmac circuit weaving along the wide western boulevards beside the giant sequoias.',
    recommendedClass: 'S1',
    targetTimeSec: 56,
    startX: -1800,
    startZ: -600,
    startHeading: 0,
    checkpoints: [
      { x: -1800, z: 600, label: 'CP 1 · South Redwood Straight' },
      { x: -2800, z: 600, label: 'CP 2 · Fern Canopy Turn' },
      { x: -2800, z: -600, label: 'CP 3 · North Sequoia Boulevard' },
      { x: -1800, z: -600, label: 'FINISH · Ranger Lodge Gate' },
    ],
  },
  {
    id: 'rainforest-west-corridor-sprint',
    name: 'Western Corridor Superhighway Sprint',
    biome: 'Emerald Rainforest',
    sponsor: 'Woking Track Division',
    discipline: 'Sprint Race',
    description:
      '3.6km straight-line and chicane blast down the Western Superhighway from Paris to the Outer Ring.',
    recommendedClass: 'S2',
    targetTimeSec: 46,
    startX: -600,
    startZ: 0,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -1500, z: 0, label: 'CP 1 · Western Glade Straight' },
      { x: -2400, z: 0, label: 'CP 2 · Sequoia Corridor Radar' },
      { x: -3300, z: 0, label: 'CP 3 · Misty Ridge Overpass' },
      { x: -4200, z: 0, label: 'FINISH · West Continental Ring' },
    ],
  },
  {
    id: 'rainforest-canopy-grid-circuit',
    name: 'Emerald Canopy Small Road Circuit',
    biome: 'Emerald Rainforest',
    sponsor: 'Tsukuba Works',
    discipline: 'Circuit Race',
    description:
      'Technical 13m small-road circuit through the lush western forest glades and country lanes.',
    recommendedClass: 'A',
    targetTimeSec: 52,
    startX: -1050,
    startZ: -480,
    startHeading: 0,
    checkpoints: [
      { x: -1050, z: 480, label: 'CP 1 · Forest Glade Lane' },
      { x: -1650, z: 480, label: 'CP 2 · Mossy Creek Corner' },
      { x: -1650, z: -480, label: 'CP 3 · Pine Ridge Small Road' },
      { x: -1050, z: -480, label: 'FINISH · Western Glade Arch' },
    ],
  },
  {
    id: 'rainforest-timber-lodge-sprint',
    name: 'Timber Lodge to River Bridge Sprint',
    biome: 'Emerald Rainforest',
    sponsor: 'Horizon Country Club',
    discipline: 'Sprint Race',
    description:
      'Sprint east from the western mountain lodges across the open meadows to the Main River bridge.',
    recommendedClass: 'A',
    targetTimeSec: 51,
    startX: -2400,
    startZ: 600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -1500, z: 600, label: 'CP 1 · Redwood Foothills Road' },
      { x: -600, z: 600, label: 'CP 2 · Royal Parkland South' },
      { x: 0, z: 600, label: 'CP 3 · South Autoroute Junction' },
      { x: 300, z: 600, label: 'FINISH · River Bridge #15 East Bank' },
    ],
  },
  {
    id: 'rainforest-misty-ring-circuit',
    name: 'Western Mid-Ring & Glade Circuit',
    biome: 'Emerald Rainforest',
    sponsor: 'Stuttgart Motorsport',
    discipline: 'Circuit Race',
    description:
      'Combine the sweeping 1800m Mid-Ring curve with the 1200m western forest boulevards.',
    recommendedClass: 'S1',
    targetTimeSec: 57,
    startX: -1800,
    startZ: 0,
    startHeading: 0,
    checkpoints: [
      { x: -1272, z: 1272, label: 'CP 1 · SW Mid-Ring Sweep' },
      { x: -1200, z: 1200, label: 'CP 2 · Canyon Transition Turn' },
      { x: -1200, z: 0, label: 'CP 3 · Sequoia Glade Boulevard' },
      { x: -1800, z: 0, label: 'FINISH · West Mid-Ring Gantry' },
    ],
  },
  {
    id: 'rainforest-pacific-pass-sprint',
    name: 'Western Mountain Pass to Coast Sprint',
    biome: 'Emerald Rainforest',
    sponsor: 'Apex Endurance Series',
    discipline: 'Sprint Race',
    description:
      'Fast north-to-south western corridor sprint along the 3600m outer boulevard.',
    recommendedClass: 'S2',
    targetTimeSec: 54,
    startX: -3600,
    startZ: -1800,
    startHeading: 0,
    checkpoints: [
      { x: -3600, z: -600, label: 'CP 1 · North Redwood Pass' },
      { x: -3600, z: 0, label: 'CP 2 · West Highway Crossing' },
      { x: -3600, z: 1200, label: 'CP 3 · South Jungle Viaduct' },
      { x: -3600, z: 2400, label: 'FINISH · SW Canyon Border Gate' },
    ],
  },
  {
    id: 'provence-avignon-bridge-circuit',
    name: 'Avignon Bridge & Lavender Circuit',
    biome: 'Lavender Highlands',
    sponsor: 'Modena Horacio Atelier',
    discipline: 'Circuit Race',
    description:
      'Scenic high-speed circuit crossing the southern river bridges at z = 3000m and z = 3600m.',
    recommendedClass: 'S1',
    targetTimeSec: 58,
    startX: 0,
    startZ: 3000,
    startHeading: 0,
    checkpoints: [
      { x: 0, z: 3600, label: 'CP 1 · Lavender Autoroute South' },
      { x: 600, z: 3600, label: 'CP 2 · Bridge #22 East Crossing' },
      { x: 600, z: 3000, label: 'CP 3 · Provence East Boulevard' },
      { x: 0, z: 3000, label: 'FINISH · Avignon Bridge #21 Gate' },
    ],
  },
  {
    id: 'provence-gordes-plateau-sprint',
    name: 'Gordes Plateau Boulevard Sprint',
    biome: 'Lavender Highlands',
    sponsor: 'EuroRenault Rallye',
    discipline: 'Sprint Race',
    description:
      'Flowing country boulevard sprint across the purple lavender terraces and southern river valley.',
    recommendedClass: 'A',
    targetTimeSec: 53,
    startX: -1200,
    startZ: 3000,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 0, z: 3000, label: 'CP 1 · Southern Autoroute Crossing' },
      { x: 600, z: 3000, label: 'CP 2 · River Bridge #21 East' },
      { x: 1200, z: 3000, label: 'CP 3 · Cypress Terrace Road' },
      { x: 1200, z: 4200, label: 'FINISH · Southern Outer Ring' },
    ],
  },
  {
    id: 'provence-aix-fountain-circuit',
    name: 'Aix-en-Provence Country Grid Circuit',
    biome: 'Lavender Highlands',
    sponsor: 'Maranello Urban Tour',
    discipline: 'Circuit Race',
    description:
      'Fast paved country circuit on the 600m–1200m southeastern farmland boulevards.',
    recommendedClass: 'A',
    targetTimeSec: 55,
    startX: 600,
    startZ: 1200,
    startHeading: 0,
    checkpoints: [
      { x: 600, z: 2100, label: 'CP 1 · Farmland South Straight' },
      { x: 1200, z: 2100, label: 'CP 2 · Lavender Mill Corner' },
      { x: 1200, z: 1200, label: 'CP 3 · Riviera Link Boulevard' },
      { x: 600, z: 1200, label: 'FINISH · Aix Fountain Gate' },
    ],
  },
  {
    id: 'provence-rhone-valley-sprint',
    name: 'Rhône Valley River Quayside Sprint',
    biome: 'Lavender Highlands',
    sponsor: 'Apex Riverfront Series',
    discipline: 'Sprint Race',
    description:
      'Follow the Southern Highway and river bridges from the Grand River Meadow down to the 4200m Ring.',
    recommendedClass: 'S1',
    targetTimeSec: 52,
    startX: 600,
    startZ: 600,
    startHeading: 0,
    checkpoints: [
      { x: 600, z: 1500, label: 'CP 1 · East River Meadow Straight' },
      { x: 0, z: 1500, label: 'CP 2 · Bridge #18 River Crossing' },
      { x: 0, z: 2800, label: 'CP 3 · Rhône Autoroute Straight' },
      { x: 0, z: 4200, label: 'FINISH · Provence Ring Junction' },
    ],
  },
  {
    id: 'provence-southern-ring-circuit',
    name: 'Southern 4200m Ring & Château Circuit',
    biome: 'Lavender Highlands',
    sponsor: 'Molsheim Atelier',
    discipline: 'Circuit Race',
    description:
      'High-speed endurance loop combining the southern 4200m Continental Ring with the 3600m boulevard.',
    recommendedClass: 'S2',
    targetTimeSec: 64,
    startX: 0,
    startZ: 4200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1200, z: 4200, label: 'CP 1 · SE Outer Ring Curve' },
      { x: 1200, z: 3600, label: 'CP 2 · Highlands East Turn' },
      { x: 0, z: 3600, label: 'CP 3 · Bridge #22 Crossing' },
      { x: 0, z: 4200, label: 'FINISH · Provence Ring Gantry' },
    ],
  },
  {
    id: 'autobahn-megaport-loop-circuit',
    name: 'Autobahn Megaport Cloverleaf Circuit',
    biome: 'Autobahn Megaport',
    sponsor: 'Wolfsburg Motorsport',
    discipline: 'Circuit Race',
    description:
      'Ultra-fast eastern highway circuit linking the 3000m and 4200m Autobahn interchanges.',
    recommendedClass: 'S2',
    targetTimeSec: 56,
    startX: 3000,
    startZ: 0,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 4200, z: 0, label: 'CP 1 · Outer Ring Cloverleaf' },
      { x: 4200, z: -1200, label: 'CP 2 · North Industrial Highway' },
      { x: 3000, z: -1200, label: 'CP 3 · Skyscraper North Boulevard' },
      { x: 3000, z: 0, label: 'FINISH · Autobahn East Gantry' },
    ],
  },
  {
    id: 'autobahn-skyline-express-sprint',
    name: 'East Skyline to Outer Ring Sprint',
    biome: 'Autobahn Megaport',
    sponsor: 'Stuttgart & Wolfsburg GT',
    discipline: 'Sprint Race',
    description:
      'High-speed skyscraper slalom along the eastern boulevards out to the 4200m Continental Ring.',
    recommendedClass: 'S2',
    targetTimeSec: 48,
    startX: 900,
    startZ: -600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1800, z: -600, label: 'CP 1 · Mid-Ring East Crossing' },
      { x: 2800, z: -600, label: 'CP 2 · Financial Tower Straight' },
      { x: 3600, z: -600, label: 'CP 3 · Megaport North Approach' },
      { x: 3600, z: 0, label: 'FINISH · East Autobahn Terminal' },
    ],
  },
  {
    id: 'autobahn-rhine-bridge-circuit',
    name: 'Eastern Boulevard & River Bridge Circuit',
    biome: 'Autobahn Megaport',
    sponsor: 'Munich M Performance',
    discipline: 'Circuit Race',
    description:
      'Fast circuit connecting the eastern Sunrise Meadow with the z = -600m and z = -1200m river bridges.',
    recommendedClass: 'S1',
    targetTimeSec: 54,
    startX: 600,
    startZ: -600,
    startHeading: Math.PI,
    checkpoints: [
      { x: 600, z: -1200, label: 'CP 1 · North Sunrise Boulevard' },
      { x: 0, z: -1200, label: 'CP 2 · Bridge #7 River Crossing' },
      { x: 0, z: -600, label: 'CP 3 · North Autoroute Straight' },
      { x: 600, z: -600, label: 'FINISH · Sunrise Meadow Gate' },
    ],
  },
  {
    id: 'autobahn-mid-ring-1800-gp',
    name: 'Full 1800m Mid-Biome Ring Grand Prix',
    biome: 'Autobahn Megaport',
    sponsor: 'Apex World Championship',
    discipline: 'Circuit Race',
    description:
      'Complete 11.3km orbital circuit around the entire 1800m-radius Mid-Biome Ring Highway!',
    recommendedClass: 'S2',
    targetTimeSec: 96,
    startX: 1800,
    startZ: 0,
    startHeading: 0,
    checkpoints: [
      { x: 1272, z: 1272, label: 'CP 1 · SE Riviera Sector' },
      { x: 0, z: 1800, label: 'CP 2 · South Desert Oasis Sector' },
      { x: -1272, z: 1272, label: 'CP 3 · SW Red Canyon Sector' },
      { x: -1800, z: 0, label: 'CP 4 · West Sequoia Sector' },
      { x: -1272, z: -1272, label: 'CP 5 · NW Volcanic Sector' },
      { x: 0, z: -1800, label: 'CP 6 · North Alpine Pass Sector' },
      { x: 1272, z: -1272, label: 'CP 7 · NE Glacier Sector' },
      { x: 1800, z: 0, label: 'FINISH · East Skyscraper Gantry' },
    ],
  },
  {
    id: 'autobahn-trans-map-diagonal-sprint',
    name: 'NW-to-SE Trans-Continental 12km Sprint',
    biome: 'Autobahn Megaport',
    sponsor: 'Apex World Championship',
    discipline: 'Sprint Race',
    description:
      'Epic coast-to-coast diagonal highway sprint from the NW Volcanic Caldera through central Paris to the SE Mediterranean Riviera!',
    recommendedClass: 'X',
    targetTimeSec: 92,
    startX: -3600,
    startZ: -3600,
    startHeading: Math.PI * 0.25,
    checkpoints: [
      { x: -1800, z: -1800, label: 'CP 1 · NW Mid-Ring Crossing' },
      { x: 0, z: 0, label: 'CP 2 · Paris Arc de Triomphe Vault' },
      { x: 1800, z: 1800, label: 'CP 3 · SE Mid-Ring Crossing' },
      { x: 3600, z: 3600, label: 'FINISH · Riviera Coast Gantry' },
    ],
  },

  // ==========================================================================
  // 5 NEW EXTREME TECHNICAL & BUMPY DIRT RALLY RACES (ANTI-SUPERCAR OFF-ROAD STAGES)
  // ==========================================================================
  {
    id: 'dirt-rally-sahara-mogul-gauntlet',
    name: 'Sahara Sandpit Mogul & Hairpin Gauntlet',
    biome: 'Sahara Red Canyon',
    sponsor: 'Dakar Raid Works',
    discipline: 'Off-Road Rally',
    description:
      'Relentless off-road desert dirt & deep sand stage packed with washboard moguls and 90-degree canyon switchbacks. High ground clearance & rally tires essential!',
    recommendedClass: 'A',
    targetTimeSec: 74,
    startX: -1850,
    startZ: 1950,
    startHeading: 0,
    checkpoints: [
      { x: -2280, z: 2120, label: 'CP 1 · Deep Sand Washboard Entry' },
      { x: -2060, z: 2520, label: 'CP 2 · Canyon Rim Hairpin Right' },
      { x: -2580, z: 2740, label: 'CP 3 · Red Butte Mogul Crest' },
      { x: -2320, z: 3180, label: 'CP 4 · Dry Wadi S-Bend Chicane' },
      { x: -2880, z: 3420, label: 'CP 5 · Dune Ridge Switchback' },
      { x: -2540, z: 3780, label: 'CP 6 · Oasis Mud Pit Hairpin' },
      { x: -2050, z: 3480, label: 'FINISH · Sahara Canyon Bivouac' },
    ],
  },
  {
    id: 'dirt-rally-caldera-basalt-switchbacks',
    name: 'Caldera Basalt Ruts & Switchback Scramble',
    biome: 'Volcanic Caldera',
    sponsor: 'Bison Off-Road Works',
    discipline: 'Off-Road Rally',
    description:
      'Jagged volcanic gravel switchbacks and steep crater ruts where stiff low-riding supercars bottom out and lose traction.',
    recommendedClass: 'A',
    targetTimeSec: 72,
    startX: -1950,
    startZ: -1950,
    startHeading: Math.PI,
    checkpoints: [
      { x: -2320, z: -2080, label: 'CP 1 · Basalt Boulder Chicane' },
      { x: -2080, z: -2460, label: 'CP 2 · Ash Trench Hairpin' },
      { x: -2560, z: -2620, label: 'CP 3 · Geothermal Mogul Jump' },
      { x: -2340, z: -3020, label: 'CP 4 · Cinder Ridge Switchback' },
      { x: -2860, z: -3180, label: 'CP 5 · Sulfur Vent Gravel Turn' },
      { x: -3180, z: -2820, label: 'CP 6 · Crater Slope Hairpin' },
      { x: -2850, z: -2450, label: 'FINISH · Volcano Trail Camp' },
    ],
  },
  {
    id: 'dirt-rally-emerald-mud-labyrinth',
    name: 'Emerald Jungle Mud-Rut Labyrinth Rally',
    biome: 'Emerald Rainforest',
    sponsor: 'Fuji Rally Motorsport',
    discipline: 'Off-Road Rally',
    description:
      'Slippery rainforest mud and grass stage featuring rapid-fire S-turns, tree-root bumps, and off-camber dirt banks.',
    recommendedClass: 'A',
    targetTimeSec: 70,
    startX: -1950,
    startZ: -150,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -2380, z: -420, label: 'CP 1 · Fern Hollow Mud Hairpin' },
      { x: -2780, z: -80, label: 'CP 2 · Root Mogul Chicane' },
      { x: -3220, z: -460, label: 'CP 3 · Mossy Creek Splash Turn' },
      { x: -3680, z: -120, label: 'CP 4 · Giant Sequoia Switchback' },
      { x: -3380, z: 380, label: 'CP 5 · Muddy Logging Trail Bend' },
      { x: -2880, z: 180, label: 'CP 6 · Canopy Ridge Hairpin' },
      { x: -2450, z: 540, label: 'FINISH · Jungle Ranger Outpost' },
    ],
  },
  {
    id: 'dirt-rally-alpine-gravel-hairpins',
    name: 'Alpine Timberline Gravel & Mogul Climb',
    biome: 'Alpine Glacier',
    sponsor: 'Solis Arctic Division',
    discipline: 'Off-Road Rally',
    description:
      'Steep, bumpy mountain gravel and snow-rut switchbacks climbing the Northeast Alpine ridge. Demands 4x4 grip and long suspension travel.',
    recommendedClass: 'S1',
    targetTimeSec: 73,
    startX: 1950,
    startZ: -1950,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 2320, z: -2120, label: 'CP 1 · Pine Stump Chicane' },
      { x: 2080, z: -2480, label: 'CP 2 · Glacial Moraine Hairpin' },
      { x: 2580, z: -2680, label: 'CP 3 · Washboard Ridge Climb' },
      { x: 2380, z: -3080, label: 'CP 4 · Snow-Mud Switchback Left' },
      { x: 2880, z: -3260, label: 'CP 5 · Avalanche Gully Bumps' },
      { x: 3220, z: -2880, label: 'CP 6 · High Timberline Hairpin' },
      { x: 2920, z: -2420, label: 'FINISH · Alpine Rally Bivouac' },
    ],
  },
  {
    id: 'dirt-rally-provence-farmland-scramble',
    name: 'Provence Terrace Bumpy Dirt & Grass Scramble',
    biome: 'Lavender Highlands',
    sponsor: 'EuroRenault Rallye',
    discipline: 'Off-Road Rally',
    description:
      'Tight, twisty cross-country dirt and grass stage cutting across uneven agricultural terraces, stone-wall hairpins, and undulating pasture bumps.',
    recommendedClass: 'A',
    targetTimeSec: 69,
    startX: 1850,
    startZ: 1850,
    startHeading: 0,
    checkpoints: [
      { x: 2280, z: 2120, label: 'CP 1 · Olive Grove Dirt Hairpin' },
      { x: 2680, z: 1880, label: 'CP 2 · Terrace Drop & Bumps' },
      { x: 3080, z: 2280, label: 'CP 3 · Vineyard Mud Switchback' },
      { x: 2740, z: 2680, label: 'CP 4 · Pasture Mogul S-Curve' },
      { x: 3180, z: 3080, label: 'CP 5 · Old Mill Gravel Hairpin' },
      { x: 2620, z: 3380, label: 'CP 6 · Cypress Field Chicane' },
      { x: 2120, z: 3020, label: 'FINISH · Highlands Dirt Barn' },
    ],
  },

  // ==========================================================================
  // 50 NEW EVENTS: CIRCUIT, SPRINT & DIRT RACES ONLY (DISTRIBUTED MAP-WIDE)
  // - 18 Circuit Races (Closed 2-Lap Loops)
  // - 17 Sprint Races (Point-to-Point Technical & High-Speed Routes)
  // - 15 Dirt Races (Off-Road Rally Cross-Country Stages)
  // ==========================================================================

  // --- 18 NEW CIRCUIT RACES ---
  {
    id: 'circuit-mont-blanc-glacier-loop',
    name: 'Mont Blanc Ring',
    biome: 'Alpine Glacier',
    sponsor: 'Apex Winter Series',
    discipline: 'Circuit Race',
    description:
      'High-speed northern glacier circuit circling the snow-capped Mont Blanc foothills along wide obstacle-free boulevards.',
    recommendedClass: 'S1',
    targetTimeSec: 84,
    startX: -1200,
    startZ: -4600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -360, z: -4600, label: 'CP 1 · North Ridge Straight' },
      { x: -360, z: -3600, label: 'CP 2 · Ice Valley South Turn' },
      { x: -1200, z: -3600, label: 'CP 3 · West Glacier Boulevard' },
      { x: -1200, z: -4600, label: 'FINISH · Mont Blanc Arch' },
    ],
  },
  {
    id: 'circuit-chamonix-summit-ring',
    name: 'Chamonix Summit Loop',
    biome: 'Alpine Glacier',
    sponsor: 'Chrono-Swiss',
    discipline: 'Circuit Race',
    description:
      'Fast technical circuit across the northeast Alpine plateau with sweeping 90-degree corners and long full-throttle straights.',
    recommendedClass: 'S2',
    targetTimeSec: 86,
    startX: 2200,
    startZ: -4600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 3200, z: -4600, label: 'CP 1 · Summit Crest Gate' },
      { x: 3200, z: -3600, label: 'CP 2 · East Glacier Descent' },
      { x: 2200, z: -3600, label: 'CP 3 · Pine Valley Corner' },
      { x: 2200, z: -4600, label: 'FINISH · Chamonix Loop Line' },
    ],
  },
  {
    id: 'circuit-val-disere-ice-arena',
    name: 'Val dIsere Circuit',
    biome: 'Alpine Glacier',
    sponsor: 'Solis Arctic Division',
    discipline: 'Circuit Race',
    description:
      'Balanced mid-northern Alpine circuit linking two river bridges with wide snow-plowed avenues.',
    recommendedClass: 'A',
    targetTimeSec: 78,
    startX: -600,
    startZ: -2800,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 600, z: -2800, label: 'CP 1 · North Bridge Crossing' },
      { x: 600, z: -2000, label: 'CP 2 · East Snow Bank Turn' },
      { x: -600, z: -2000, label: 'CP 3 · South Bridge Return' },
      { x: -600, z: -2800, label: 'FINISH · Val dIsere Gate' },
    ],
  },
  {
    id: 'circuit-megaport-terminal-ring',
    name: 'Terminal Grand Circuit',
    biome: 'Autobahn Megaport',
    sponsor: 'Bavaria Motorsport',
    discipline: 'Circuit Race',
    description:
      'Ultra-wide eastern industrial docklands circuit engineered for top-end hypercar drafting and late-braking 90-degree turns.',
    recommendedClass: 'S2',
    targetTimeSec: 82,
    startX: 3600,
    startZ: -1200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 4600, z: -1200, label: 'CP 1 · Outer Dock Straight' },
      { x: 4600, z: -360, label: 'CP 2 · Crane Harbor South' },
      { x: 3600, z: -360, label: 'CP 3 · Container Boulevard' },
      { x: 3600, z: -1200, label: 'FINISH · Terminal Start Arch' },
    ],
  },
  {
    id: 'circuit-autobahn-east-loop',
    name: 'East Autobahn Loop',
    biome: 'Autobahn Megaport',
    sponsor: 'Stuttgart Weissach',
    discipline: 'Circuit Race',
    description:
      'High-velocity rectangle circuit in the eastern skyscraper district with clean wide apexes.',
    recommendedClass: 'X',
    targetTimeSec: 80,
    startX: 2800,
    startZ: -800,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 3600, z: -800, label: 'CP 1 · Skyscraper North Gate' },
      { x: 3600, z: 360, label: 'CP 2 · Megaport South Turn' },
      { x: 2800, z: 360, label: 'CP 3 · Financial Avenue West' },
      { x: 2800, z: -800, label: 'FINISH · East Autobahn Line' },
    ],
  },
  {
    id: 'circuit-skyline-plaza-gp',
    name: 'Skyline Plaza Circuit',
    biome: 'Autobahn Megaport',
    sponsor: 'Apex International',
    discipline: 'Circuit Race',
    description:
      'Technical inner-east metropolis loop featuring four wide 90-degree boulevard corners.',
    recommendedClass: 'S1',
    targetTimeSec: 76,
    startX: 1600,
    startZ: -600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 2400, z: -600, label: 'CP 1 · Glass Tower Corner' },
      { x: 2400, z: 360, label: 'CP 2 · Metro Plaza South' },
      { x: 1600, z: 360, label: 'CP 3 · Inner Ring Connector' },
      { x: 1600, z: -600, label: 'FINISH · Skyline Plaza Arch' },
    ],
  },
  {
    id: 'circuit-monaco-harbor-crown',
    name: 'Monaco Harbor Loop',
    biome: 'Mediterranean Riviera',
    sponsor: 'Scuderia Corsa',
    discipline: 'Circuit Race',
    description:
      'Sun-drenched southeastern coastal circuit with palm-lined straights and wide harbor hairpins.',
    recommendedClass: 'S2',
    targetTimeSec: 84,
    startX: 3600,
    startZ: 1600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 4600, z: 1600, label: 'CP 1 · Yacht Marina Straight' },
      { x: 4600, z: 2600, label: 'CP 2 · Seafront Cliff Turn' },
      { x: 3600, z: 2600, label: 'CP 3 · Casino Boulevard West' },
      { x: 3600, z: 1600, label: 'FINISH · Monaco Harbor Gate' },
    ],
  },
  {
    id: 'circuit-antibes-coastal-ring',
    name: 'Antibes Coastal Ring',
    biome: 'Mediterranean Riviera',
    sponsor: 'Riviera Yacht Club',
    discipline: 'Circuit Race',
    description:
      'Flowing grand tourer circuit in the far southeast Riviera sector with crystal-clear coastal sightlines.',
    recommendedClass: 'S1',
    targetTimeSec: 85,
    startX: 2800,
    startZ: 3400,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 3900, z: 3400, label: 'CP 1 · Azure Bay East' },
      { x: 3900, z: 4200, label: 'CP 2 · Lighthouse Point Turn' },
      { x: 2800, z: 4200, label: 'CP 3 · Palm Promenade Return' },
      { x: 2800, z: 3400, label: 'FINISH · Antibes Finish Arch' },
    ],
  },
  {
    id: 'circuit-provence-chateau-loop',
    name: 'Provence Chateau Loop',
    biome: 'Lavender Highlands',
    sponsor: 'EuroRenault Sport',
    discipline: 'Circuit Race',
    description:
      'Scenic southern highlands circuit crossing the Main River over two wide stone arch bridges.',
    recommendedClass: 'A',
    targetTimeSec: 82,
    startX: -600,
    startZ: 3600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 800, z: 3600, label: 'CP 1 · Lavender Bridge East' },
      { x: 800, z: 4600, label: 'CP 2 · Southern Vineyard Turn' },
      { x: -600, z: 4600, label: 'CP 3 · Chateau Bridge West' },
      { x: -600, z: 3600, label: 'FINISH · Provence Loop Gate' },
    ],
  },
  {
    id: 'circuit-avignon-valley-ring',
    name: 'Avignon Valley Ring',
    biome: 'Lavender Highlands',
    sponsor: 'Motul Racing',
    discipline: 'Circuit Race',
    description:
      'Fast rhythmic A-class and S1-class circuit through the rolling southern pastoral avenues.',
    recommendedClass: 'A',
    targetTimeSec: 79,
    startX: 1200,
    startZ: 2600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 2200, z: 2600, label: 'CP 1 · Cypress Avenue East' },
      { x: 2200, z: 3400, label: 'CP 2 · Old Mill Corner' },
      { x: 1200, z: 3400, label: 'CP 3 · Valley West Straight' },
      { x: 1200, z: 2600, label: 'FINISH · Avignon Ring Line' },
    ],
  },
  {
    id: 'circuit-red-mesa-oasis-loop',
    name: 'Red Mesa Loop',
    biome: 'Sahara Red Canyon',
    sponsor: 'Solis Off-Road',
    discipline: 'Circuit Race',
    description:
      'High-temperature desert asphalt circuit looping around the southwestern red sandstone mesas.',
    recommendedClass: 'S1',
    targetTimeSec: 84,
    startX: -3600,
    startZ: 2600,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -4600, z: 2600, label: 'CP 1 · West Canyon Rim' },
      { x: -4600, z: 3600, label: 'CP 2 · Sandstone Butte Turn' },
      { x: -3600, z: 3600, label: 'CP 3 · Oasis Mirage Straight' },
      { x: -3600, z: 2600, label: 'FINISH · Red Mesa Gantry' },
    ],
  },
  {
    id: 'circuit-sahara-mirage-ring',
    name: 'Sahara Mirage Ring',
    biome: 'Sahara Red Canyon',
    sponsor: 'Apex Desert Cup',
    discipline: 'Circuit Race',
    description:
      'Long flat-out desert straights connected by wide 90-degree oasis boulevard turns in the deep south.',
    recommendedClass: 'S2',
    targetTimeSec: 86,
    startX: -2400,
    startZ: 3600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -1200, z: 3600, label: 'CP 1 · Dune Corridor East' },
      { x: -1200, z: 4600, label: 'CP 2 · Southern Border Turn' },
      { x: -2400, z: 4600, label: 'CP 3 · Sunbaked Straight' },
      { x: -2400, z: 3600, label: 'FINISH · Mirage Ring Arch' },
    ],
  },
  {
    id: 'circuit-canyon-sun-circuit',
    name: 'Canyon Sun Circuit',
    biome: 'Sahara Red Canyon',
    sponsor: 'Pirelli Motorsport',
    discipline: 'Circuit Race',
    description:
      'Mid-southwest canyon circuit combining rapid acceleration zones with clean wide braking zones.',
    recommendedClass: 'A',
    targetTimeSec: 78,
    startX: -2200,
    startZ: 1200,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -3000, z: 1200, label: 'CP 1 · Canyon Entry West' },
      { x: -3000, z: 2200, label: 'CP 2 · Red Gorge Corner' },
      { x: -2200, z: 2200, label: 'CP 3 · Desert Basin Return' },
      { x: -2200, z: 1200, label: 'FINISH · Canyon Sun Line' },
    ],
  },
  {
    id: 'circuit-sequoia-canopy-ring',
    name: 'Sequoia Canopy Ring',
    biome: 'Emerald Rainforest',
    sponsor: 'Emerald Forestry',
    discipline: 'Circuit Race',
    description:
      'Lush western forest road circuit on wide paved boulevards completely clear of giant redwood trunks.',
    recommendedClass: 'S1',
    targetTimeSec: 83,
    startX: -4600,
    startZ: -800,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -3600, z: -800, label: 'CP 1 · Redwood East Gate' },
      { x: -3600, z: 360, label: 'CP 2 · Fern Valley South' },
      { x: -4600, z: 360, label: 'CP 3 · Pacific Ridge West' },
      { x: -4600, z: -800, label: 'FINISH · Sequoia Ring Arch' },
    ],
  },
  {
    id: 'circuit-emerald-falls-loop',
    name: 'Emerald Falls Loop',
    biome: 'Emerald Rainforest',
    sponsor: 'Kimura Works',
    discipline: 'Circuit Race',
    description:
      'Mid-western rainforest boulevard circuit ideal for balanced grip and corner-exit traction.',
    recommendedClass: 'A',
    targetTimeSec: 77,
    startX: -2800,
    startZ: -1000,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -2000, z: -1000, label: 'CP 1 · Misty Ridge East' },
      { x: -2000, z: -180, label: 'CP 2 · Jungle Basin Turn' },
      { x: -2800, z: -180, label: 'CP 3 · Canopy West Avenue' },
      { x: -2800, z: -1000, label: 'FINISH · Emerald Falls Line' },
    ],
  },
  {
    id: 'circuit-caldera-basalt-ring',
    name: 'Caldera Basalt Ring',
    biome: 'Volcanic Caldera',
    sponsor: 'Vulcan Engineering',
    discipline: 'Circuit Race',
    description:
      'High-altitude northwest volcanic circuit with sweeping dark-asphalt straights and wide turn aprons.',
    recommendedClass: 'S2',
    targetTimeSec: 85,
    startX: -4600,
    startZ: -3600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -3600, z: -3600, label: 'CP 1 · Basalt Ridge East' },
      { x: -3600, z: -2600, label: 'CP 2 · Lava Plateau South' },
      { x: -4600, z: -2600, label: 'CP 3 · Obsidian Rim West' },
      { x: -4600, z: -3600, label: 'FINISH · Basalt Ring Gate' },
    ],
  },
  {
    id: 'circuit-obsidian-crater-loop',
    name: 'Obsidian Crater Loop',
    biome: 'Volcanic Caldera',
    sponsor: 'Apex Legends Tour',
    discipline: 'Circuit Race',
    description:
      'Fast technical circuit in the northwest caldera foothills designed for high-downforce track cars.',
    recommendedClass: 'S1',
    targetTimeSec: 81,
    startX: -2600,
    startZ: -4200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -1600, z: -4200, label: 'CP 1 · North Foothill Gate' },
      { x: -1600, z: -3200, label: 'CP 2 · Geothermal Valley Turn' },
      { x: -2600, z: -3200, label: 'CP 3 · Crater Approach West' },
      { x: -2600, z: -4200, label: 'FINISH · Obsidian Loop Line' },
    ],
  },
  {
    id: 'circuit-seine-quayside-gp',
    name: 'Seine Quayside Loop',
    biome: 'Paris Metropolis',
    sponsor: 'Chrono-Swiss',
    discipline: 'Circuit Race',
    description:
      'Classic outer-Paris metropolitan circuit crossing two ornate river bridges with wide boulevard corners.',
    recommendedClass: 'S1',
    targetTimeSec: 76,
    startX: -800,
    startZ: 800,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 800, z: 800, label: 'CP 1 · South Seine Bridge' },
      { x: 800, z: 1600, label: 'CP 2 · Left Bank Boulevard' },
      { x: -800, z: 1600, label: 'CP 3 · Metro Bridge West' },
      { x: -800, z: 800, label: 'FINISH · Quayside GP Arch' },
    ],
  },

  // --- 17 NEW SPRINT RACES ---
  {
    id: 'sprint-glacier-avalanche-dash',
    name: 'Glacier Dash Sprint',
    biome: 'Alpine Glacier',
    sponsor: 'Solis Arctic Division',
    discipline: 'Sprint Race',
    description:
      'Point-to-point northern mountain sprint from the northwest snowfields across the river bridge to the eastern Alpine peaks.',
    recommendedClass: 'S1',
    targetTimeSec: 72,
    startX: -2000,
    startZ: -4600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -600, z: -4600, label: 'CP 1 · North Ice Straight' },
      { x: -600, z: -3900, label: 'CP 2 · Glacier Drop Turn' },
      { x: 1000, z: -3900, label: 'CP 3 · Alpine River Bridge' },
      { x: 1000, z: -3200, label: 'CP 4 · Chamonix Lower Bend' },
      { x: 2400, z: -3200, label: 'FINISH · East Alpine Outpost' },
    ],
  },
  {
    id: 'sprint-nordic-pass-run',
    name: 'Nordic Pass Sprint',
    biome: 'Alpine Glacier',
    sponsor: 'Chrono-Swiss',
    discipline: 'Sprint Race',
    description:
      'High-speed downhill sprint from the far northeast glacier ridge down toward the eastern highway corridor.',
    recommendedClass: 'S2',
    targetTimeSec: 70,
    startX: 4200,
    startZ: -4600,
    startHeading: 0,
    checkpoints: [
      { x: 4200, z: -3400, label: 'CP 1 · High Ridge Straight' },
      { x: 3000, z: -3400, label: 'CP 2 · Ice Wall 90 Turn' },
      { x: 3000, z: -2200, label: 'CP 3 · Timberline Avenue' },
      { x: 1600, z: -2200, label: 'CP 4 · Foothill Chicane' },
      { x: 1600, z: -1200, label: 'FINISH · Nordic Valley Gate' },
    ],
  },
  {
    id: 'sprint-autobahn-bullet-run',
    name: 'Autobahn Bullet Sprint',
    biome: 'Autobahn Megaport',
    sponsor: 'Bavaria Motorsport',
    discipline: 'Sprint Race',
    description:
      'Blistering top-speed sprint across the eastern Autobahn grid designed for 380+ km/h hypercars.',
    recommendedClass: 'X',
    targetTimeSec: 68,
    startX: 1200,
    startZ: -1600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 2800, z: -1600, label: 'CP 1 · Inner Autobahn Gate' },
      { x: 2800, z: -2600, label: 'CP 2 · North Industrial Turn' },
      { x: 4200, z: -2600, label: 'CP 3 · Outer Ring Approach' },
      { x: 4200, z: -1000, label: 'CP 4 · Megaport Long Straight' },
      { x: 4600, z: -1000, label: 'FINISH · East Docks Finish' },
    ],
  },
  {
    id: 'sprint-megaport-harbor-express',
    name: 'Harbor Express Sprint',
    biome: 'Autobahn Megaport',
    sponsor: 'Stuttgart Weissach',
    discipline: 'Sprint Race',
    description:
      'Fast technical sprint linking the central-east business towers to the southeastern container port.',
    recommendedClass: 'S1',
    targetTimeSec: 69,
    startX: 2000,
    startZ: 600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 3200, z: 600, label: 'CP 1 · Tower Boulevard East' },
      { x: 3200, z: -600, label: 'CP 2 · Harbor Cross Turn' },
      { x: 4200, z: -600, label: 'CP 3 · Crane Avenue North' },
      { x: 4200, z: 1000, label: 'CP 4 · Coastal Link Straight' },
      { x: 4600, z: 1000, label: 'FINISH · Megaport Pier Gate' },
    ],
  },
  {
    id: 'sprint-riviera-corniche-dash',
    name: 'Corniche Coast Sprint',
    biome: 'Mediterranean Riviera',
    sponsor: 'Scuderia Corsa',
    discipline: 'Sprint Race',
    description:
      'Sweeping coastal sprint from the eastern port down to the southern Mediterranean cliffside.',
    recommendedClass: 'S2',
    targetTimeSec: 74,
    startX: 4600,
    startZ: 600,
    startHeading: 0,
    checkpoints: [
      { x: 4600, z: 2200, label: 'CP 1 · Upper Corniche Straight' },
      { x: 3400, z: 2200, label: 'CP 2 · Villa Terrace Turn' },
      { x: 3400, z: 3600, label: 'CP 3 · Azure Cliff Avenue' },
      { x: 4600, z: 3600, label: 'CP 4 · Marina Hairpin East' },
      { x: 4600, z: 4600, label: 'FINISH · Riviera Point Arch' },
    ],
  },
  {
    id: 'sprint-azure-bay-run',
    name: 'Azure Bay Sprint',
    biome: 'Mediterranean Riviera',
    sponsor: 'Riviera Yacht Club',
    discipline: 'Sprint Race',
    description:
      'Medium-speed technical sprint winding through the southeastern Riviera resorts and palm boulevards.',
    recommendedClass: 'A',
    targetTimeSec: 71,
    startX: 2600,
    startZ: 1200,
    startHeading: 0,
    checkpoints: [
      { x: 2600, z: 2400, label: 'CP 1 · Resort Boulevard South' },
      { x: 1600, z: 2400, label: 'CP 2 · Hilltop West Turn' },
      { x: 1600, z: 3900, label: 'CP 3 · Lavender Border Run' },
      { x: 3000, z: 3900, label: 'CP 4 · Bayfront Straight' },
      { x: 3000, z: 4600, label: 'FINISH · Azure Bay Promenade' },
    ],
  },
  {
    id: 'sprint-lavender-ridge-dash',
    name: 'Lavender Ridge Sprint',
    biome: 'Lavender Highlands',
    sponsor: 'EuroRenault Sport',
    discipline: 'Sprint Race',
    description:
      'Cross-valley southern sprint over the Seine bridge through the blooming Provence highlands.',
    recommendedClass: 'A',
    targetTimeSec: 72,
    startX: 2000,
    startZ: 4600,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 600, z: 4600, label: 'CP 1 · South Chateau Straight' },
      { x: 600, z: 3200, label: 'CP 2 · Vineyard North Turn' },
      { x: -800, z: 3200, label: 'CP 3 · Provence River Bridge' },
      { x: -800, z: 2200, label: 'CP 4 · West Meadow Avenue' },
      { x: -180, z: 2200, label: 'FINISH · Highlands Crest Gate' },
    ],
  },
  {
    id: 'sprint-southern-viaduct-sprint',
    name: 'South Viaduct Sprint',
    biome: 'Lavender Highlands',
    sponsor: 'Motul Racing',
    discipline: 'Sprint Race',
    description:
      'Fast S1-class road sprint connecting the central-south boulevards to the southeastern coast.',
    recommendedClass: 'S1',
    targetTimeSec: 69,
    startX: -360,
    startZ: 2600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1000, z: 2600, label: 'CP 1 · South Bridge Deck' },
      { x: 1000, z: 1600, label: 'CP 2 · East Bank Turn' },
      { x: 2200, z: 1600, label: 'CP 3 · Pastoral Straight' },
      { x: 2200, z: 3000, label: 'CP 4 · Cypress South Bend' },
      { x: 3400, z: 3000, label: 'FINISH · Riviera Border Gate' },
    ],
  },
  {
    id: 'sprint-sahara-horizon-dash',
    name: 'Sahara Horizon Sprint',
    biome: 'Sahara Red Canyon',
    sponsor: 'Apex Desert Cup',
    discipline: 'Sprint Race',
    description:
      'Blistering desert highway sprint across the southwestern red canyon boulevards.',
    recommendedClass: 'S2',
    targetTimeSec: 73,
    startX: -1200,
    startZ: 4200,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -2800, z: 4200, label: 'CP 1 · Southern Dune Highway' },
      { x: -2800, z: 3000, label: 'CP 2 · Red Butte North Turn' },
      { x: -4200, z: 3000, label: 'CP 3 · West Mesa Straight' },
      { x: -4200, z: 4600, label: 'CP 4 · Canyon Rim South' },
      { x: -4600, z: 4600, label: 'FINISH · Southwest Oasis Arch' },
    ],
  },
  {
    id: 'sprint-red-canyon-gorge-run',
    name: 'Red Gorge Sprint',
    biome: 'Sahara Red Canyon',
    sponsor: 'Pirelli Motorsport',
    discipline: 'Sprint Race',
    description:
      'High-speed desert sprint from the western canyon rim toward the central-south river bridges.',
    recommendedClass: 'S1',
    targetTimeSec: 71,
    startX: -4600,
    startZ: 1800,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -3400, z: 1800, label: 'CP 1 · Gorge Entrance East' },
      { x: -3400, z: 2800, label: 'CP 2 · Pyramid View Turn' },
      { x: -2000, z: 2800, label: 'CP 3 · Oasis Avenue East' },
      { x: -2000, z: 1600, label: 'CP 4 · Inner Canyon Turn' },
      { x: -1000, z: 1600, label: 'FINISH · South Basin Gate' },
    ],
  },
  {
    id: 'sprint-oasis-pyramid-run',
    name: 'Oasis Pyramid Sprint',
    biome: 'Sahara Red Canyon',
    sponsor: 'Solis Off-Road',
    discipline: 'Sprint Race',
    description:
      'Fast desert road stage passing safely along the wide boulevards flanking the ancient desert pyramids.',
    recommendedClass: 'A',
    targetTimeSec: 68,
    startX: -1600,
    startZ: 2600,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -2600, z: 2600, label: 'CP 1 · West Oasis Straight' },
      { x: -2600, z: 3900, label: 'CP 2 · Dune Ridge South' },
      { x: -3900, z: 3900, label: 'CP 3 · Red Arch Approach' },
      { x: -3900, z: 2200, label: 'FINISH · Western Mesa Gate' },
    ],
  },
  {
    id: 'sprint-redwood-valley-dash',
    name: 'Redwood Valley Sprint',
    biome: 'Emerald Rainforest',
    sponsor: 'Emerald Forestry',
    discipline: 'Sprint Race',
    description:
      'Clean, wide paved highway sprint through the heart of the western giant sequoia valley.',
    recommendedClass: 'S1',
    targetTimeSec: 72,
    startX: -4600,
    startZ: 1000,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -3200, z: 1000, label: 'CP 1 · Sequoia Straight East' },
      { x: -3200, z: -360, label: 'CP 2 · Forest River Turn' },
      { x: -4200, z: -360, label: 'CP 3 · Deep Canopy West' },
      { x: -4200, z: -1600, label: 'CP 4 · North Timberline Run' },
      { x: -3000, z: -1600, label: 'FINISH · Rainforest Outpost' },
    ],
  },
  {
    id: 'sprint-pacific-forest-run',
    name: 'Pacific Forest Sprint',
    biome: 'Emerald Rainforest',
    sponsor: 'Kimura Works',
    discipline: 'Sprint Race',
    description:
      'Rhythmic B-class and A-class road sprint connecting the western forest avenues to the inner ring.',
    recommendedClass: 'B',
    targetTimeSec: 74,
    startX: -3600,
    startZ: 600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -2400, z: 600, label: 'CP 1 · Woodland Avenue East' },
      { x: -2400, z: -600, label: 'CP 2 · Mossy Ridge North' },
      { x: -1600, z: -600, label: 'CP 3 · Mid-Ring West Gate' },
      { x: -1600, z: 800, label: 'CP 4 · South Forest Straight' },
      { x: -1000, z: 800, label: 'FINISH · Paris West Approach' },
    ],
  },
  {
    id: 'sprint-volcano-descent-dash',
    name: 'Volcano Descent Sprint',
    biome: 'Volcanic Caldera',
    sponsor: 'Vulcan Engineering',
    discipline: 'Sprint Race',
    description:
      'High-speed northwest sprint descending from the outer volcanic caldera rim toward the central basin.',
    recommendedClass: 'S2',
    targetTimeSec: 71,
    startX: -4600,
    startZ: -4600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -3200, z: -4600, label: 'CP 1 · North Caldera Straight' },
      { x: -3200, z: -3400, label: 'CP 2 · Basalt Escarpment Turn' },
      { x: -2000, z: -3400, label: 'CP 3 · Lava Field East' },
      { x: -2000, z: -2200, label: 'CP 4 · Foothill Straight' },
      { x: -1200, z: -2200, label: 'FINISH · Northwest Basin Gate' },
    ],
  },
  {
    id: 'sprint-basalt-ridge-run',
    name: 'Basalt Ridge Sprint',
    biome: 'Volcanic Caldera',
    sponsor: 'Apex Legends Tour',
    discipline: 'Sprint Race',
    description:
      'Technical S1-class sprint across the northwest volcanic avenues with crisp 90-degree cornering.',
    recommendedClass: 'S1',
    targetTimeSec: 70,
    startX: -3900,
    startZ: -2000,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -4600, z: -2000, label: 'CP 1 · West Coast Overlook' },
      { x: -4600, z: -3200, label: 'CP 2 · Obsidian North Turn' },
      { x: -3000, z: -3200, label: 'CP 3 · Caldera Cross Road' },
      { x: -3000, z: -4200, label: 'CP 4 · High Summit Approach' },
      { x: -2000, z: -4200, label: 'FINISH · North Glacier Border' },
    ],
  },
  {
    id: 'sprint-haussmann-grand-boulevard',
    name: 'Haussmann Sprint',
    biome: 'Paris Metropolis',
    sponsor: 'Chrono-Swiss',
    discipline: 'Sprint Race',
    description:
      'Metropolitan boulevard sprint linking the northern and eastern Paris districts across two Seine bridges.',
    recommendedClass: 'A',
    targetTimeSec: 67,
    startX: -1200,
    startZ: -1200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 600, z: -1200, label: 'CP 1 · North Seine Bridge' },
      { x: 600, z: -360, label: 'CP 2 · East Louvre Boulevard' },
      { x: 1200, z: -360, label: 'CP 3 · Bastille Gate Turn' },
      { x: 1200, z: 800, label: 'CP 4 · Southeast Avenue' },
      { x: -360, z: 800, label: 'FINISH · South River Bridge' },
    ],
  },
  {
    id: 'sprint-continental-cross-tour',
    name: 'Continental Cross Sprint',
    biome: 'Autobahn Megaport',
    sponsor: 'Apex International',
    discipline: 'Sprint Race',
    description:
      'Long-distance high-speed sprint from the northern Alpine border straight through the eastern Autobahn.',
    recommendedClass: 'X',
    targetTimeSec: 78,
    startX: 2600,
    startZ: -3900,
    startHeading: 0,
    checkpoints: [
      { x: 2600, z: -2000, label: 'CP 1 · Alpine-Autobahn Link' },
      { x: 3900, z: -2000, label: 'CP 2 · Outer Industrial Turn' },
      { x: 3900, z: 0, label: 'CP 3 · Megaport Main Crossing' },
      { x: 3200, z: 0, label: 'CP 4 · Skyscraper West Turn' },
      { x: 3200, z: 1800, label: 'FINISH · Riviera North Gate' },
    ],
  },

  // --- 15 NEW DIRT RACES (OFF-ROAD RALLY) ---
  {
    id: 'dirt-sahara-dune-Odyssey',
    name: 'Sahara Dune Rally',
    biome: 'Sahara Red Canyon',
    sponsor: 'Solis Off-Road',
    discipline: 'Off-Road Rally',
    description:
      'Wide cross-country desert dirt rally across the southwestern sand corridors. Built for Baja trucks and 4x4 rally builds.',
    recommendedClass: 'A',
    targetTimeSec: 76,
    startX: -4200,
    startZ: 4200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -3000, z: 4200, label: 'CP 1 · Golden Dune Straight' },
      { x: -3000, z: 3400, label: 'CP 2 · Sandstone Wash Turn' },
      { x: -1800, z: 3400, label: 'CP 3 · Oasis Dirt Track' },
      { x: -1800, z: 4600, label: 'CP 4 · South Erg Switchback' },
      { x: -800, z: 4600, label: 'FINISH · Desert Rally Bivouac' },
    ],
  },
  {
    id: 'dirt-canyon-arroyo-rally',
    name: 'Canyon Arroyo Dirt',
    biome: 'Sahara Red Canyon',
    sponsor: 'Apex Desert Cup',
    discipline: 'Off-Road Rally',
    description:
      'Fast off-road gravel and sand rally stage winding through the red rock canyon avenues.',
    recommendedClass: 'S1',
    targetTimeSec: 74,
    startX: -3200,
    startZ: 2400,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -4200, z: 2400, label: 'CP 1 · Arroyo West Entry' },
      { x: -4200, z: 1200, label: 'CP 2 · Red Cliff North Turn' },
      { x: -2800, z: 1200, label: 'CP 3 · Dry Riverbed Run' },
      { x: -2800, z: 2000, label: 'CP 4 · Mesa Dust Corner' },
      { x: -1600, z: 2000, label: 'FINISH · Canyon Rally Arch' },
    ],
  },
  {
    id: 'dirt-oasis-sandstorm-stage',
    name: 'Sandstorm Dirt Rally',
    biome: 'Sahara Red Canyon',
    sponsor: 'Pirelli Off-Road',
    discipline: 'Off-Road Rally',
    description:
      'High-speed southern desert rally raid across wide obstacle-free corridors.',
    recommendedClass: 'A',
    targetTimeSec: 73,
    startX: -1000,
    startZ: 3400,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -2200, z: 3400, label: 'CP 1 · Mirage Dust Straight' },
      { x: -2200, z: 4200, label: 'CP 2 · South Dune Turn' },
      { x: -3400, z: 4200, label: 'CP 3 · Red Rock Corridor' },
      { x: -3400, z: 2800, label: 'FINISH · Oasis Rally Finish' },
    ],
  },
  {
    id: 'dirt-emerald-logging-trail',
    name: 'Logging Trail Dirt',
    biome: 'Emerald Rainforest',
    sponsor: 'Emerald Forestry',
    discipline: 'Off-Road Rally',
    description:
      'Mud and gravel forest rally stage along wide clearings in the western Emerald Rainforest.',
    recommendedClass: 'A',
    targetTimeSec: 75,
    startX: -4200,
    startZ: -1200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -3000, z: -1200, label: 'CP 1 · Timber Clearing East' },
      { x: -3000, z: -2400, label: 'CP 2 · North Creek Splash' },
      { x: -4200, z: -2400, label: 'CP 3 · Giant Fern Turn' },
      { x: -4200, z: -360, label: 'CP 4 · West Ridge Straight' },
      { x: -3200, z: -360, label: 'FINISH · Lumber Camp Gate' },
    ],
  },
  {
    id: 'dirt-sequoia-mud-raid',
    name: 'Sequoia Mud Rally',
    biome: 'Emerald Rainforest',
    sponsor: 'Solis Off-Road',
    discipline: 'Off-Road Rally',
    description:
      'Technical AWD rally raid through the southwestern rainforest corridors with wide 41m dirt pathways.',
    recommendedClass: 'B',
    targetTimeSec: 76,
    startX: -3900,
    startZ: 1400,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -2600, z: 1400, label: 'CP 1 · Mossy Hollow East' },
      { x: -2600, z: 360, label: 'CP 2 · Forest Basin North' },
      { x: -3600, z: 360, label: 'CP 3 · Redwood Mud Corner' },
      { x: -3600, z: -600, label: 'CP 4 · Canopy Trail North' },
      { x: -2400, z: -600, label: 'FINISH · Ranger Station Line' },
    ],
  },
  {
    id: 'dirt-rainforest-ridge-baja',
    name: 'Rainforest Baja Dirt',
    biome: 'Emerald Rainforest',
    sponsor: 'Kimura Works',
    discipline: 'Off-Road Rally',
    description:
      'High-momentum western cross-country rally stage designed for long-travel suspension trucks and rally cars.',
    recommendedClass: 'S1',
    targetTimeSec: 72,
    startX: -2000,
    startZ: 1000,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -3400, z: 1000, label: 'CP 1 · West Jungle Straight' },
      { x: -3400, z: 2200, label: 'CP 2 · Canyon Border Turn' },
      { x: -4600, z: 2200, label: 'CP 3 · Outer Ridge West' },
      { x: -4600, z: 600, label: 'FINISH · Pacific Cliff Camp' },
    ],
  },
  {
    id: 'dirt-volcano-ash-scramble',
    name: 'Volcano Ash Dirt',
    biome: 'Volcanic Caldera',
    sponsor: 'Vulcan Engineering',
    discipline: 'Off-Road Rally',
    description:
      'Gravel and volcanic ash rally stage across the northwest caldera plateau with sweeping wide corners.',
    recommendedClass: 'S1',
    targetTimeSec: 74,
    startX: -3400,
    startZ: -4200,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -4600, z: -4200, label: 'CP 1 · Crater Rim West' },
      { x: -4600, z: -2800, label: 'CP 2 · Black Sand South' },
      { x: -3400, z: -2800, label: 'CP 3 · Basalt Flats East' },
      { x: -3400, z: -1800, label: 'CP 4 · Foothill Gravel Turn' },
      { x: -2200, z: -1800, label: 'FINISH · Caldera Base Camp' },
    ],
  },
  {
    id: 'dirt-caldera-lava-trail',
    name: 'Lava Trail Rally',
    biome: 'Volcanic Caldera',
    sponsor: 'Pirelli Off-Road',
    discipline: 'Off-Road Rally',
    description:
      'Demanding high-altitude gravel rally stage in the northern volcanic sector.',
    recommendedClass: 'A',
    targetTimeSec: 73,
    startX: -1800,
    startZ: -3600,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -3000, z: -3600, label: 'CP 1 · Obsidian Straight West' },
      { x: -3000, z: -2600, label: 'CP 2 · Ash Valley South' },
      { x: -1800, z: -2600, label: 'CP 3 · Geothermal East Turn' },
      { x: -1800, z: -1600, label: 'FINISH · Northwest Rally Gate' },
    ],
  },
  {
    id: 'dirt-alpine-blizzard-rally',
    name: 'Blizzard Snow Rally',
    biome: 'Alpine Glacier',
    sponsor: 'Solis Arctic Division',
    discipline: 'Off-Road Rally',
    description:
      'Snow and gravel off-road rally across the northern Alpine glacier corridors.',
    recommendedClass: 'S1',
    targetTimeSec: 75,
    startX: 360,
    startZ: -4600,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1800, z: -4600, label: 'CP 1 · North Snowfield East' },
      { x: 1800, z: -3400, label: 'CP 2 · Glacier Gully South' },
      { x: 600, z: -3400, label: 'CP 3 · Ice Bridge Approach' },
      { x: 600, z: -2400, label: 'CP 4 · Valley Floor Turn' },
      { x: -800, z: -2400, label: 'FINISH · West Alpine Bivouac' },
    ],
  },
  {
    id: 'dirt-glacier-moraine-raid',
    name: 'Glacier Moraine Dirt',
    biome: 'Alpine Glacier',
    sponsor: 'Apex Winter Series',
    discipline: 'Off-Road Rally',
    description:
      'High-grip rally gravel and snow stage in the northeast Chamonix mountains.',
    recommendedClass: 'A',
    targetTimeSec: 72,
    startX: 3600,
    startZ: -4200,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 2400, z: -4200, label: 'CP 1 · Moraine Ridge West' },
      { x: 2400, z: -2800, label: 'CP 2 · Pine Basin South' },
      { x: 3600, z: -2800, label: 'CP 3 · East Summit Straight' },
      { x: 3600, z: -1800, label: 'FINISH · Timberline Rally Arch' },
    ],
  },
  {
    id: 'dirt-provence-vineyard-rally',
    name: 'Vineyard Dirt Rally',
    biome: 'Lavender Highlands',
    sponsor: 'EuroRenault Rallye',
    discipline: 'Off-Road Rally',
    description:
      'Fast flowing dirt and gravel rally through the southern Lavender Highlands and river bridges.',
    recommendedClass: 'B',
    targetTimeSec: 74,
    startX: 360,
    startZ: 4200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1600, z: 4200, label: 'CP 1 · Lavender Field East' },
      { x: 1600, z: 3000, label: 'CP 2 · Old Barn North Turn' },
      { x: 360, z: 3000, label: 'CP 3 · River Meadow West' },
      { x: 360, z: 2000, label: 'CP 4 · Quayside North Run' },
      { x: -800, z: 2000, label: 'FINISH · Bridge Rally Finish' },
    ],
  },
  {
    id: 'dirt-highlands-pasture-raid',
    name: 'Highlands Dirt Raid',
    biome: 'Lavender Highlands',
    sponsor: 'Motul Racing',
    discipline: 'Off-Road Rally',
    description:
      'Cross-country agricultural rally stage in the southeast highlands with wide 41m pathways.',
    recommendedClass: 'A',
    targetTimeSec: 71,
    startX: 2400,
    startZ: 3900,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 1000, z: 3900, label: 'CP 1 · Pasture Straight West' },
      { x: 1000, z: 4600, label: 'CP 2 · South Border Corner' },
      { x: -360, z: 4600, label: 'CP 3 · South Seine Bridge' },
      { x: -360, z: 3400, label: 'FINISH · Chateau Dirt Gate' },
    ],
  },
  {
    id: 'dirt-riviera-cliffside-rally',
    name: 'Cliffside Dirt Rally',
    biome: 'Mediterranean Riviera',
    sponsor: 'Scuderia Corsa',
    discipline: 'Off-Road Rally',
    description:
      'Gravel and coastal dirt stage above the Mediterranean cliffs in the southeast sector.',
    recommendedClass: 'S1',
    targetTimeSec: 73,
    startX: 4200,
    startZ: 2800,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 3000, z: 2800, label: 'CP 1 · Olive Terrace West' },
      { x: 3000, z: 1600, label: 'CP 2 · Hilltop North Turn' },
      { x: 4200, z: 1600, label: 'CP 3 · Sea Overlook East' },
      { x: 4200, z: 4200, label: 'FINISH · Coastal Rally Camp' },
    ],
  },
  {
    id: 'dirt-megaport-quarry-rally',
    name: 'Megaport Quarry Dirt',
    biome: 'Autobahn Megaport',
    sponsor: 'Bavaria Motorsport',
    discipline: 'Off-Road Rally',
    description:
      'Industrial gravel and dirt rally through the outer eastern docklands and freight corridors.',
    recommendedClass: 'A',
    targetTimeSec: 72,
    startX: 4600,
    startZ: -2000,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: 3400, z: -2000, label: 'CP 1 · Freight Yard West' },
      { x: 3400, z: -800, label: 'CP 2 · Quarry South Turn' },
      { x: 4600, z: -800, label: 'CP 3 · Outer Dock East' },
      { x: 4600, z: 360, label: 'FINISH · Port Rally Bivouac' },
    ],
  },
  {
    id: 'dirt-continental-outback-raid',
    name: 'Outback Dirt Raid',
    biome: 'Sahara Red Canyon',
    sponsor: 'Solis Off-Road',
    discipline: 'Off-Road Rally',
    description:
      'Endurance off-road rally raid linking the western rainforest border with the southern red desert.',
    recommendedClass: 'S1',
    targetTimeSec: 77,
    startX: -4600,
    startZ: 3400,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: -3200, z: 3400, label: 'CP 1 · Red Mesa East' },
      { x: -3200, z: 4600, label: 'CP 2 · Deep Desert South' },
      { x: -2000, z: 4600, label: 'CP 3 · Oasis Trail East' },
      { x: -2000, z: 3200, label: 'CP 4 · Canyon North Turn' },
      { x: -800, z: 3200, label: 'FINISH · Central Outback Gate' },
    ],
  },

  // ==========================================================================
  // 7 LARGE MULTIPLAYER GRAND PRIX RACES (2+ PLAYERS, ZERO AI BOTS)
  // ==========================================================================
  {
    id: 'mp-paris-grand-tour',
    name: 'Paris Grand Tour',
    biome: 'Paris Metropolis',
    sponsor: 'Apex Multiplayer League',
    discipline: 'Multiplayer Grand Prix',
    isMultiplayerRace: true,
    difficultyLevel: 3,
    description:
      'Large-scale multiplayer circuit around the Grand Paris boulevards and Seine river bridges. 2+ real players compete head-to-head with zero AI bots.',
    recommendedClass: 'S1',
    targetTimeSec: 88,
    startX: 0,
    startZ: -360,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 1000, z: -360, label: 'CP 1 · East Boulevard Gate' },
      { x: 1000, z: -1600, label: 'CP 2 · North Metro Avenue' },
      { x: -1000, z: -1600, label: 'CP 3 · North River Bridge Crossing' },
      { x: -1000, z: 1000, label: 'CP 4 · West Corridor Straight' },
      { x: 1000, z: 1000, label: 'CP 5 · South River Bridge Crossing' },
      { x: 1000, z: 360, label: 'CP 6 · Southeast Boulevard Turn' },
      { x: 0, z: 360, label: 'CP 7 · Champs-Élysées Approach' },
      { x: 0, z: -360, label: 'FINISH · Paris Grand Tour Arch' },
    ],
  },
  {
    id: 'mp-alpine-glacier-gp',
    name: 'Glacier Peak GP',
    biome: 'Alpine Glacier',
    sponsor: 'Apex Multiplayer League',
    discipline: 'Multiplayer Grand Prix',
    isMultiplayerRace: true,
    difficultyLevel: 4,
    description:
      'High-altitude northern mountain multiplayer endurance circuit for 2 or more human drivers with zero AI bots.',
    recommendedClass: 'S2',
    targetTimeSec: 105,
    startX: 1600,
    startZ: -2000,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 3400, z: -2000, label: 'CP 1 · East Glacier Highway' },
      { x: 3400, z: -3900, label: 'CP 2 · Chamonix Summit Pass' },
      { x: 1000, z: -3900, label: 'CP 3 · Northern Ice Ridge' },
      { x: 1000, z: -3000, label: 'CP 4 · Alpine Valley Drop' },
      { x: -1000, z: -3000, label: 'CP 5 · North Viaduct Bridge' },
      { x: -1000, z: -2000, label: 'CP 6 · West Mountain Link' },
      { x: 1600, z: -2000, label: 'FINISH · Glacier GP Gantry' },
    ],
  },
  {
    id: 'mp-sahara-canyon-marathon',
    name: 'Sahara Goliath',
    biome: 'Sahara Red Canyon',
    sponsor: 'Apex Multiplayer League',
    discipline: 'Multiplayer Grand Prix',
    isMultiplayerRace: true,
    difficultyLevel: 3,
    description:
      'Massive southern desert highway showdown for 2+ players with zero AI bots. High-speed straights and 90-degree oasis turns.',
    recommendedClass: 'S2',
    targetTimeSec: 102,
    startX: -1600,
    startZ: 2000,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -3400, z: 2000, label: 'CP 1 · West Canyon Straight' },
      { x: -3400, z: 3900, label: 'CP 2 · Red Mesa Overlook' },
      { x: -1000, z: 3900, label: 'CP 3 · Southern Dune Highway' },
      { x: -1000, z: 3000, label: 'CP 4 · Oasis Boulevard North' },
      { x: 1000, z: 3000, label: 'CP 5 · South River Bridge Deck' },
      { x: 1000, z: 2000, label: 'CP 6 · Lavender Border Turn' },
      { x: -1600, z: 2000, label: 'FINISH · Sahara Goliath Gate' },
    ],
  },
  {
    id: 'mp-autobahn-riviera-express',
    name: 'Riviera Express',
    biome: 'Mediterranean Riviera',
    sponsor: 'Apex Multiplayer League',
    discipline: 'Multiplayer Grand Prix',
    isMultiplayerRace: true,
    difficultyLevel: 2,
    description:
      'High-velocity eastern multiplayer tour linking the Autobahn Megaport with the Mediterranean Riviera coast. Pure player-vs-player racing.',
    recommendedClass: 'X',
    targetTimeSec: 98,
    startX: 2400,
    startZ: 0,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 4200, z: 0, label: 'CP 1 · Autobahn 400 km/h Zone' },
      { x: 4200, z: 2400, label: 'CP 2 · Coastal Cliff Entry' },
      { x: 4200, z: 3900, label: 'CP 3 · Riviera Harbor Hairpin' },
      { x: 2000, z: 3900, label: 'CP 4 · Azure Bay Boulevard' },
      { x: 2000, z: 2000, label: 'CP 5 · Mid-Ring Interchange' },
      { x: 2400, z: 2000, label: 'CP 6 · Skyscraper Corridor' },
      { x: 2400, z: 0, label: 'FINISH · Riviera Express Arch' },
    ],
  },
  {
    id: 'mp-horizon-continental-goliath',
    name: 'Horizon Goliath',
    biome: 'Autobahn Megaport',
    sponsor: 'Apex Multiplayer League',
    discipline: 'Multiplayer Grand Prix',
    isMultiplayerRace: true,
    difficultyLevel: 4,
    description:
      'The ultimate 28km trans-continental multiplayer Goliath spanning all 4 quadrants of the map for 2 or more human racers (No Bots).',
    recommendedClass: 'X',
    targetTimeSec: 175,
    startX: -2400,
    startZ: 0,
    startHeading: -Math.PI / 2,
    checkpoints: [
      { x: -3400, z: 0, label: 'CP 1 · Emerald West Gate' },
      { x: -3400, z: -3400, label: 'CP 2 · Volcanic Caldera Corner' },
      { x: 0, z: -3400, label: 'CP 3 · Northern Highway Bridge' },
      { x: 3400, z: -3400, label: 'CP 4 · Alpine Glacier Turn' },
      { x: 3400, z: 0, label: 'CP 5 · East Megaport Straight' },
      { x: 3400, z: 3400, label: 'CP 6 · Riviera Bay Corner' },
      { x: 0, z: 3400, label: 'CP 7 · Provence Bridge Crossing' },
      { x: -3400, z: 3400, label: 'CP 8 · Sahara Canyon Turn' },
      { x: -2400, z: 3400, label: 'CP 9 · West Return Corridor' },
      { x: -2400, z: 0, label: 'FINISH · Horizon Goliath Line' },
    ],
  },
  {
    id: 'mp-volcano-rainforest-gp',
    name: 'Caldera Jungle GP',
    biome: 'Volcanic Caldera',
    sponsor: 'Apex Multiplayer League',
    discipline: 'Multiplayer Grand Prix',
    isMultiplayerRace: true,
    difficultyLevel: 3,
    description:
      'High-speed western multiplayer grand prix connecting the NW Volcanic Caldera rim with the Emerald Rainforest boulevards (2+ Players, Zero AI Bots).',
    recommendedClass: 'S1',
    targetTimeSec: 96,
    startX: -3900,
    startZ: -1200,
    startHeading: 0,
    checkpoints: [
      { x: -3900, z: -3600, label: 'CP 1 · Caldera Rim North' },
      { x: -2200, z: -3600, label: 'CP 2 · Obsidian Plateau East' },
      { x: -2200, z: 1200, label: 'CP 3 · Rainforest Valley South' },
      { x: -3900, z: 1200, label: 'CP 4 · Sequoia West Boulevard' },
      { x: -3900, z: -1200, label: 'FINISH · Caldera Jungle Arch' },
    ],
  },
  {
    id: 'mp-southern-crown-grand-prix',
    name: 'Southern Crown GP',
    biome: 'Lavender Highlands',
    sponsor: 'Apex Multiplayer League',
    discipline: 'Multiplayer Grand Prix',
    isMultiplayerRace: true,
    difficultyLevel: 4,
    description:
      'Southern trans-biome multiplayer circuit linking the Lavender Highlands, Mediterranean Riviera, and Sahara Red Canyon across two river bridges.',
    recommendedClass: 'S2',
    targetTimeSec: 104,
    startX: 800,
    startZ: 3200,
    startHeading: Math.PI / 2,
    checkpoints: [
      { x: 3200, z: 3200, label: 'CP 1 · Riviera Coastal Approach' },
      { x: 3200, z: 4600, label: 'CP 2 · Southeast Bay Corner' },
      { x: -2000, z: 4600, label: 'CP 3 · Southern Bridge & Oasis Run' },
      { x: -2000, z: 3200, label: 'CP 4 · Red Canyon North Turn' },
      { x: 800, z: 3200, label: 'FINISH · Southern Crown Gantry' },
    ],
  },
];

// Clean Major Boulevard Grid Snap Coordinates (Synced with continuous ground boulevards in vehiclePhysics.ts, excluding 0 [Arc de Triomphe/river bank] and flyover axes ±1400 and ±1800)
const CLEAN_RACE_GRID_COORDS = [
  -5400, -5000, -4600, -4200, -3900, -3600, -3400, -3200, -3000, -2800, -2600, -2400, -2200,
  -2000, -1600, -1200, -1000, -800, -600, -360, -180,
  180, 360, 600, 800, 1000, 1200, 1600, 2000, 2200, 2400, 2600, 2800, 3000, 3200,
  3400, 3600, 3900, 4200, 4600, 5000, 5400,
];

function snapToCleanBoulevard(val: number): number {
  let best = CLEAN_RACE_GRID_COORDS[0];
  let bestDist = Math.abs(val - best);
  for (let i = 1; i < CLEAN_RACE_GRID_COORDS.length; i++) {
    const c = CLEAN_RACE_GRID_COORDS[i];
    const d = Math.abs(val - c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function makeShortRaceTitle(rawName: string): string {
  const cleaned = rawName
    .replace(/\b(Tutorial|Qualifier|Pro|Championship|International| Invitational|Stage|Showdown|Scramble|Gymkhana|Time Attack)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').filter(Boolean);
  if (words.length <= 3) return words.join(' ');
  return words.slice(0, 3).join(' ');
}

// Evenly distributed full-map anchor intersections across [-4600, +4600] (576 clean boulevard intersections)
// Kept away from the ±5400 outer border so shifted race checkpoints NEVER clamp or collapse against the map edge!
const FULL_MAP_DISTRIBUTION_ANCHORS: [number, number][] = [];
const ANCHOR_RING_COORDS = [
  -4600, -4200, -3900, -3400, -3000, -2600, -2200, -1600, -1200, -800, -360,
  360, 800, 1200, 1600, 2200, 2600, 3000, 3400, 3900, 4200, 4600,
];
for (let ix = 0; ix < ANCHOR_RING_COORDS.length; ix++) {
  for (let iz = 0; iz < ANCHOR_RING_COORDS.length; iz++) {
    FULL_MAP_DISTRIBUTION_ANCHORS.push([ANCHOR_RING_COORDS[ix], ANCHOR_RING_COORDS[iz]]);
  }
}
FULL_MAP_DISTRIBUTION_ANCHORS.sort((a, b) => {
  const distA = Math.hypot(a[0], a[1]);
  const distB = Math.hypot(b[0], b[1]);
  const scoreA = Math.abs(distA - 2800);
  const scoreB = Math.abs(distB - 2800);
  return scoreA - scoreB;
});

// Post-process all WORLD_RACES:
// 1. Shorten race names & remove any "Qualifier" locks (all races accessible at all times)
// 2. Assign a deterministic difficulty level from 1 to 4 to every race
// 3. Preserve race shapes without border clamping and snap ALL race start & checkpoint coordinates
//    to exact obstacle-free boulevards & river bridges so zero races ever pass through the river or buildings/trees!
const placedRaceStarts: { x: number; z: number }[] = [];
let centerCityRaceCount = 0;
const MIN_RACE_SEPARATION = 310;

WORLD_RACES.forEach((race, idx) => {
  race.name = makeShortRaceTitle(race.name);
  if (race.discipline === 'Tutorial Qualifier') {
    race.discipline = 'Sprint Race';
  }
  if (!race.difficultyLevel) {
    race.difficultyLevel = ((((idx * 7 + 3) % 3) + 2) as 1 | 2 | 3 | 4);
  } else if (race.difficultyLevel < 4) {
    race.difficultyLevel = Math.min(4, race.difficultyLevel + 1) as 1 | 2 | 3 | 4;
  }

  const origStartX = race.startX;
  const origStartZ = race.startZ;
  const origLastCp = race.checkpoints[race.checkpoints.length - 1];
  const isClosedCircuit =
    race.discipline === 'Circuit Race' ||
    race.discipline === 'Circuit Sprint' ||
    (origLastCp && Math.hypot(origLastCp.x - origStartX, origLastCp.z - origStartZ) < 160);

  // Compute checkpoint offsets relative to origStart so we never push any checkpoint outside [-5000, +5000]
  let minDx = 0;
  let maxDx = 0;
  let minDz = 0;
  let maxDz = 0;
  for (let i = 0; i < race.checkpoints.length; i++) {
    const dx = race.checkpoints[i].x - origStartX;
    const dz = race.checkpoints[i].z - origStartZ;
    if (dx < minDx) minDx = dx;
    if (dx > maxDx) maxDx = dx;
    if (dz < minDz) minDz = dz;
    if (dz > maxDz) maxDz = dz;
  }

  const minAllowedStartX = Math.max(-4600, -5000 - minDx);
  const maxAllowedStartX = Math.min(4600, 5000 - maxDx);
  const minAllowedStartZ = Math.max(-4600, -5000 - minDz);
  const maxAllowedStartZ = Math.min(4600, 5000 - maxDz);

  let targetStartX = snapToCleanBoulevard(
    Math.max(minAllowedStartX, Math.min(maxAllowedStartX, origStartX))
  );
  let targetStartZ = snapToCleanBoulevard(
    Math.max(minAllowedStartZ, Math.min(maxAllowedStartZ, origStartZ))
  );

  const isInCenterCore = Math.hypot(targetStartX, targetStartZ) < 950;
  const isTooClose = (x: number, z: number, minDist: number) =>
    placedRaceStarts.some((p) => Math.hypot(p.x - x, p.z - z) < minDist);

  if ((isInCenterCore && centerCityRaceCount >= 6) || isTooClose(targetStartX, targetStartZ, MIN_RACE_SEPARATION)) {
    let prefDirX = origStartX;
    let prefDirZ = origStartZ;
    if (Math.hypot(prefDirX, prefDirZ) < 400) {
      const angle = (idx * 2.3999632) % (Math.PI * 2);
      prefDirX = Math.cos(angle) * 2800;
      prefDirZ = Math.sin(angle) * 2800;
    }

    let bestAnchor: [number, number] = [targetStartX, targetStartZ];
    let bestScore = Infinity;

    for (let aIdx = 0; aIdx < FULL_MAP_DISTRIBUTION_ANCHORS.length; aIdx++) {
      const [rawCandX, rawCandZ] = FULL_MAP_DISTRIBUTION_ANCHORS[aIdx];
      const candX = snapToCleanBoulevard(
        Math.max(minAllowedStartX, Math.min(maxAllowedStartX, rawCandX))
      );
      const candZ = snapToCleanBoulevard(
        Math.max(minAllowedStartZ, Math.min(maxAllowedStartZ, rawCandZ))
      );
      if (Math.hypot(candX, candZ) < 950 && centerCityRaceCount >= 6) continue;
      if (isTooClose(candX, candZ, MIN_RACE_SEPARATION)) continue;

      const dPref = Math.hypot(candX - prefDirX, candZ - prefDirZ);
      if (dPref < bestScore) {
        bestScore = dPref;
        bestAnchor = [candX, candZ];
      }
    }

    targetStartX = bestAnchor[0];
    targetStartZ = bestAnchor[1];
  }

  if (Math.hypot(targetStartX, targetStartZ) < 950) {
    centerCityRaceCount++;
  }
  placedRaceStarts.push({ x: targetStartX, z: targetStartZ });

  const shiftX = targetStartX - origStartX;
  const shiftZ = targetStartZ - origStartZ;

  race.startX = snapToCleanBoulevard(targetStartX);
  race.startZ = snapToCleanBoulevard(targetStartZ);

  // Build 100% orthogonal, obstacle-free, bridge-aligned checkpoints for EVERY race (including Off-Road Rally!)
  // so no race ever cuts across the Main River without a bridge or passes through buildings, mountains, or trees!
  const orthoNodes: { x: number; z: number; label: string }[] = [
    { x: race.startX, z: race.startZ, label: 'START' },
  ];

  for (let i = 0; i < race.checkpoints.length; i++) {
    const cp = race.checkpoints[i];
    const isFinalLoopNode = isClosedCircuit && i === race.checkpoints.length - 1;
    const rawCx = isFinalLoopNode
      ? race.startX
      : Math.max(-5000, Math.min(5000, cp.x + shiftX));
    const rawCz = isFinalLoopNode
      ? race.startZ
      : Math.max(-5000, Math.min(5000, cp.z + shiftZ));
    let cx = isFinalLoopNode ? race.startX : snapToCleanBoulevard(rawCx);
    let cz = isFinalLoopNode ? race.startZ : snapToCleanBoulevard(rawCz);

    const prev = orthoNodes[orthoNodes.length - 1];
    const prev2 = orthoNodes.length >= 2 ? orthoNodes[orthoNodes.length - 2] : null;

    // Ensure consecutive target checkpoints don't collapse onto the exact same intersection
    if (cx === prev.x && cz === prev.z && !isFinalLoopNode) {
      const xIdx = CLEAN_RACE_GRID_COORDS.indexOf(cx);
      const zIdx = CLEAN_RACE_GRID_COORDS.indexOf(cz);
      if (i % 2 === 0 && xIdx >= 0) {
        const stepDir = rawCx >= prev.x ? 1 : -1;
        const nextIdx = Math.min(CLEAN_RACE_GRID_COORDS.length - 1, Math.max(0, xIdx + stepDir));
        cx = CLEAN_RACE_GRID_COORDS[nextIdx !== xIdx ? nextIdx : Math.max(0, xIdx - stepDir)];
      } else if (zIdx >= 0) {
        const stepDir = rawCz >= prev.z ? 1 : -1;
        const nextIdx = Math.min(CLEAN_RACE_GRID_COORDS.length - 1, Math.max(0, zIdx + stepDir));
        cz = CLEAN_RACE_GRID_COORDS[nextIdx !== zIdx ? nextIdx : Math.max(0, zIdx - stepDir)];
      }
    }

    if (cx === prev.x && cz === prev.z && !isFinalLoopNode) {
      continue;
    }

    const cleanBaseLabel = cp.label.replace(/^(CP\s*\d+|FINISH)\s*·\s*/i, '').trim();

    // If this leg changes BOTH X and Z, choose between Corner 1 (cx, prev.z) and Corner 2 (prev.x, cz)
    // so that we NEVER reverse 180 degrees back onto the incoming road segment!
    if (Math.abs(cx - prev.x) > 12 && Math.abs(cz - prev.z) > 12) {
      const c1 = { x: cx, z: prev.z };
      const c2 = { x: prev.x, z: cz };
      let useC1 = true;

      if (prev2) {
        const inVx = prev.x - prev2.x;
        const inVz = prev.z - prev2.z;
        const inLen = Math.hypot(inVx, inVz) || 1;

        const v1x = c1.x - prev.x;
        const v1z = c1.z - prev.z;
        const l1 = Math.hypot(v1x, v1z) || 1;
        const dot1 = (inVx * v1x + inVz * v1z) / (inLen * l1);

        const v2x = c2.x - prev.x;
        const v2z = c2.z - prev.z;
        const l2 = Math.hypot(v2x, v2z) || 1;
        const dot2 = (inVx * v2x + inVz * v2z) / (inLen * l2);

        // Prefer the L-corner that turns 90° (dot ≈ 0) or continues forward (dot > 0) rather than reversing 180° (dot < -0.5)
        if (dot1 < -0.5 && dot2 >= -0.5) {
          useC1 = false;
        } else if (dot2 < -0.5 && dot1 >= -0.5) {
          useC1 = true;
        } else if (Math.hypot(c1.x - prev2.x, c1.z - prev2.z) < 20) {
          useC1 = false;
        } else if (Math.hypot(c2.x - prev2.x, c2.z - prev2.z) < 20) {
          useC1 = true;
        }
      }

      const chosenCorner = useC1 ? c1 : c2;
      orthoNodes.push({
        x: chosenCorner.x,
        z: chosenCorner.z,
        label: `${cleanBaseLabel} Turn`,
      });
    } else if (prev2) {
      // Single-axis move (either X or Z is unchanged): check if it reverses 180° back over prev -> prev2
      const inVx = prev.x - prev2.x;
      const inVz = prev.z - prev2.z;
      const outVx = cx - prev.x;
      const outVz = cz - prev.z;
      const inLen = Math.hypot(inVx, inVz) || 1;
      const outLen = Math.hypot(outVx, outVz) || 1;
      const dot = (inVx * outVx + inVz * outVz) / (inLen * outLen);

      if (dot < -0.85) {
        // Detour via an adjacent parallel boulevard so the race makes a proper U-loop instead of a 180° hair-pin on the same line
        if (Math.abs(outVz) < 12) {
          // Moving along X, detour Z to the next boulevard
          const zIdx = CLEAN_RACE_GRID_COORDS.indexOf(prev.z);
          const detourZ =
            CLEAN_RACE_GRID_COORDS[
              Math.min(CLEAN_RACE_GRID_COORDS.length - 1, Math.max(0, zIdx + (zIdx < CLEAN_RACE_GRID_COORDS.length - 1 ? 1 : -1)))
            ];
          orthoNodes.push({ x: prev.x, z: detourZ, label: `${cleanBaseLabel} Chicane` });
          orthoNodes.push({ x: cx, z: detourZ, label: `${cleanBaseLabel} Turn` });
        } else {
          // Moving along Z, detour X to the next boulevard
          const xIdx = CLEAN_RACE_GRID_COORDS.indexOf(prev.x);
          const detourX =
            CLEAN_RACE_GRID_COORDS[
              Math.min(CLEAN_RACE_GRID_COORDS.length - 1, Math.max(0, xIdx + (xIdx < CLEAN_RACE_GRID_COORDS.length - 1 ? 1 : -1)))
            ];
          orthoNodes.push({ x: detourX, z: prev.z, label: `${cleanBaseLabel} Chicane` });
          orthoNodes.push({ x: detourX, z: cz, label: `${cleanBaseLabel} Turn` });
        }
      }
    }

    orthoNodes.push({
      x: cx,
      z: cz,
      label: cp.label,
    });
  }

  // Merge collinear intermediate vertices while keeping all genuine 90° corner checkpoints intact
  const cleanedRoadCps: typeof race.checkpoints = [];
  for (let i = 1; i < orthoNodes.length; i++) {
    const curr = orthoNodes[i];
    const p1 =
      cleanedRoadCps.length > 0
        ? cleanedRoadCps[cleanedRoadCps.length - 1]
        : { x: race.startX, z: race.startZ, label: 'START' };
    if (Math.hypot(curr.x - p1.x, curr.z - p1.z) < 12) continue;

    if (cleanedRoadCps.length >= 1) {
      const p0 =
        cleanedRoadCps.length >= 2
          ? cleanedRoadCps[cleanedRoadCps.length - 2]
          : { x: race.startX, z: race.startZ };
      const v1x = p1.x - p0.x;
      const v1z = p1.z - p0.z;
      const v2x = curr.x - p1.x;
      const v2z = curr.z - p1.z;
      const l1 = Math.hypot(v1x, v1z) || 1;
      const l2 = Math.hypot(v2x, v2z) || 1;
      const dot = (v1x * v2x + v1z * v2z) / (l1 * l2);
      // If p0 -> p1 -> curr is a straight collinear line and p1 was an auto-inserted Turn/Chicane node, merge p1 into curr
      if (dot > 0.985 && /\b(Turn|Chicane)\b$/i.test(p1.label)) {
        cleanedRoadCps[cleanedRoadCps.length - 1] = curr;
        continue;
      }
    }
    cleanedRoadCps.push(curr);
  }

  // Re-number checkpoint labels sequentially (CP 1, CP 2, ..., FINISH)
  const numberedCps = cleanedRoadCps.map((cp, idx) => {
    const baseTitle = cp.label.replace(/^(CP\s*\d+|FINISH)\s*·\s*/i, '').trim();
    const isLast = idx === cleanedRoadCps.length - 1;
    return {
      ...cp,
      label: isLast ? `FINISH · ${baseTitle}` : `CP ${idx + 1} · ${baseTitle}`,
    };
  });

  if (isClosedCircuit && numberedCps.length >= 3) {
    race.laps = 2;
    const lap1Cps = numberedCps.map((cp, idx) => ({
      ...cp,
      label:
        idx === numberedCps.length - 1
          ? 'LAP 1/2 COMPLETE · START LAP 2'
          : `LAP 1 · ${cp.label}`,
    }));
    const lap2Cps = numberedCps.map((cp, idx) => ({
      ...cp,
      label:
        idx === numberedCps.length - 1
          ? 'FINISH · LAP 2/2 COMPLETE'
          : `LAP 2 · ${cp.label}`,
    }));
    race.checkpoints = [...lap1Cps, ...lap2Cps];
  } else {
    race.laps = 1;
    race.checkpoints = numberedCps;
  }

  // Align startHeading with the initial road direction from (startX, startZ) toward CP 1
  if (race.checkpoints.length > 0) {
    const cp0 = race.checkpoints[0];
    const dx = cp0.x - race.startX;
    const dz = cp0.z - race.startZ;
    race.startHeading = Math.atan2(dx, dz);
  }
});

export const INITIAL_SHARED_TUNES: SharedTunePreset[] = [
  {
    id: 'tune-kimura-drift-pro',
    title: 'Touge Formula Drift Angle Spec',
    author: 'Kenji_Takahashi',
    vehicleId: 'kimura-rz34',
    vehicleName: 'Kimura Apex RZ-34 Spec-V',
    purpose: 'Drift Spec',
    piClass: 'S1',
    piScore: 864,
    peakPowerHP: 765,
    zeroTo100Sec: 3.4,
    topSpeedKmh: 318,
    createdAt: Date.now() - 3600_000 * 5,
    tune: {
      ...HERO_VEHICLES[1].defaultTune,
      drivetrain: 'RWD',
      tireCompound: 'DriftCompound',
      boostPressureBar: 1.75,
      frontCamberDeg: -4.2,
      rearCamberDeg: -0.8,
      frontARB: 48,
      rearARB: 56,
      diffAccelLockPct: 95,
      diffDecelLockPct: 65,
      finalDrive: 3.95,
      rearTirePressurePSI: 36.0,
    },
  },
  {
    id: 'tune-valkyrie-topspeed',
    title: 'Highway 395+ km/h Twin-Turbo',
    author: 'Elena_Vance',
    vehicleId: 'valkyrie-gtr',
    vehicleName: 'Valkyrie GT-R Centenario',
    purpose: 'Top Speed Highway',
    piClass: 'S2',
    piScore: 968,
    peakPowerHP: 1085,
    zeroTo100Sec: 2.3,
    topSpeedKmh: 398,
    createdAt: Date.now() - 3600_000 * 3,
    tune: {
      ...HERO_VEHICLES[0].defaultTune,
      aspiration: 'TwinTurbo',
      boostPressureBar: 1.65,
      drivetrain: 'AWD',
      tireCompound: 'SemiSlick',
      weightReductionStage: 3,
      aeroKit: 'Stock',
      frontDownforceKg: 45,
      rearDownforceKg: 60,
      finalDrive: 2.78,
      rideHeightMm: 78,
    },
  },
  {
    id: 'tune-stuttgart-timeattack',
    title: 'Apex Time Attack Grip Monster',
    author: 'Marcus_Richter',
    vehicleId: 'stuttgart-992-gtrs',
    vehicleName: 'Stuttgart 992 Weissach GT-RS',
    purpose: 'Grip / Track',
    piClass: 'S2',
    piScore: 942,
    peakPowerHP: 780,
    zeroTo100Sec: 2.6,
    topSpeedKmh: 334,
    createdAt: Date.now() - 3600_000 * 2,
    tune: {
      ...HERO_VEHICLES[2].defaultTune,
      aspiration: 'TwinTurbo',
      boostPressureBar: 0.95,
      tireCompound: 'SemiSlick',
      weightReductionStage: 3,
      aeroKit: 'HorizonGT',
      frontDownforceKg: 340,
      rearDownforceKg: 450,
      frontCamberDeg: -3.2,
      rearCamberDeg: -2.6,
      brakePressurePct: 130,
    },
  },
  {
    id: 'tune-baja-dunes-king',
    title: 'Baja 1000 Long-Travel Jump Spec',
    author: 'Carlos_Mendoza',
    vehicleId: 'solis-baja-nomad',
    vehicleName: 'Solis Baja Nomad Trophy 4x4',
    purpose: 'Rally / Off-Road',
    piClass: 'A',
    piScore: 798,
    peakPowerHP: 890,
    zeroTo100Sec: 3.1,
    topSpeedKmh: 288,
    createdAt: Date.now() - 3600_000 * 1,
    tune: {
      ...HERO_VEHICLES[3].defaultTune,
      boostPressureBar: 1.55,
      tireCompound: 'RallyGravel',
      weightReductionStage: 2,
      rideHeightMm: 255,
      frontSpringRate: 52,
      rearSpringRate: 48,
      frontTirePressurePSI: 22.5,
      rearTirePressurePSI: 22.5,
    },
  },
];
