export type AspirationType = 'NA' | 'SingleTurbo' | 'TwinTurbo' | 'Supercharged';
export type TireCompoundType = 'Street' | 'Sport' | 'SemiSlick' | 'RallyGravel' | 'DriftCompound';
export type DrivetrainType = 'RWD' | 'AWD' | 'FWD';
export type AeroKitType = 'Stock' | 'Street' | 'HorizonGT';
export type PaintFinishType = 'Metallic' | 'Matte' | 'Pearlescent' | 'Satin';
export type PIClass = 'D' | 'C' | 'B' | 'A' | 'S1' | 'S2' | 'X';
export type SurfaceType = 'Asphalt' | 'Curb' | 'Dirt' | 'Sand' | 'Snow' | 'Gravel';
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
export type WeatherControlMode = 'auto' | WeatherType;
export type TimeOfDayPhase = 'dawn' | 'noon' | 'sunset' | 'night';
export type DayCycleControlMode = 'auto' | TimeOfDayPhase;
export type TimeOfDayControlMode = 'auto' | 'dawn' | 'day' | 'sunset' | 'night';
export type WorldBiomeType =
  | 'Paris Metropolis'
  | 'Alpine Glacier'
  | 'Sahara Red Canyon'
  | 'Mediterranean Riviera'
  | 'Volcanic Caldera'
  | 'Emerald Rainforest'
  | 'Lavender Highlands'
  | 'Autobahn Megaport';
export type CameraMode = 'chase_far' | 'chase_close' | 'cockpit' | 'hood' | 'orbit_garage';
export type MobileControlMode = 'wheel' | 'buttons' | 'tilt';
export type VehicleBodyStyle =
  | 'supercar'
  | 'jdm_coupe'
  | 'track_gt'
  | 'baja_truck'
  | 'hypercar'
  | 'normal_sedan'
  | 'normal_hatch'
  | 'muscle_classic'
  | 'heavy_truck'
  | 'suv_4x4';

export type BrandDesignArchetype =
  | 'bmw'
  | 'lamborghini'
  | 'ferrari'
  | 'pagani'
  | 'koenigsegg'
  | 'bugatti'
  | 'mclaren'
  | 'porsche'
  | 'mercedes'
  | 'aston'
  | 'audi'
  | 'nissan'
  | 'jdm'
  | 'muscle'
  | 'rally'
  | 'standard';

export interface VehicleTune {
  // Power & Drivetrain Upgrades
  aspiration: AspirationType;
  boostPressureBar: number; // 0.0 to 2.0 bar
  tireCompound: TireCompoundType;
  drivetrain: DrivetrainType;
  weightReductionStage: 0 | 1 | 2 | 3;
  aeroKit: AeroKitType;

  // Forza Horizon 5 Upgrade Shop Component Stages (0 = Stock, 1 = Street, 2 = Sport, 3 = Race)
  engineIntakeStage?: 0 | 1 | 2 | 3;
  engineExhaustStage?: 0 | 1 | 2 | 3;
  engineCamshaftStage?: 0 | 1 | 2 | 3;
  enginePistonStage?: 0 | 1 | 2 | 3;
  brakeStage?: 0 | 1 | 2 | 3;
  suspensionStage?: 0 | 1 | 2 | 3;
  transmissionStage?: 0 | 1 | 2 | 3;

  // Tires
  frontTirePressurePSI: number; // 22 to 42
  rearTirePressurePSI: number; // 22 to 42

  // Gearing
  finalDrive: number; // 2.60 to 4.80
  gearRatios: [number, number, number, number, number, number];

  // Alignment & Suspension
  frontCamberDeg: number; // -5.0 to 0.0
  rearCamberDeg: number; // -4.5 to 0.0
  rideHeightMm: number; // 65 to 260
  frontSpringRate: number; // 40 to 220 N/mm
  rearSpringRate: number; // 40 to 220 N/mm
  frontARB: number; // 1 to 65
  rearARB: number; // 1 to 65

  // Aerodynamics
  frontDownforceKg: number; // 20 to 380 kgf @ 200km/h
  rearDownforceKg: number; // 30 to 480 kgf @ 200km/h

  // Brakes & Differential
  brakeBiasFrontPct: number; // 40 to 75%
  brakePressurePct: number; // 70 to 150%
  diffAccelLockPct: number; // 10 to 100%
  diffDecelLockPct: number; // 5 to 85%

  // Driver Assists
  transmissionMode: 'Automatic' | 'Manual';
  absEnabled: boolean;
  tcsEnabled: boolean;

  // Visual Styling
  paintHex: string;
  paintFinish: PaintFinishType;
  rimHex: string;
  caliperHex: string;
}

export interface VehicleSpec {
  id: string;
  name: string;
  manufacturer: string;
  year: number;
  category: string;
  engineDescription: string;
  baseDrivetrain: DrivetrainType;
  baseAspiration: AspirationType;
  basePowerHP: number;
  baseTorqueNm: number;
  idleRPM: number;
  redlineRPM: number;
  maxRPM: number;
  baseMassKg: number;
  weightDistributionFront: number; // e.g., 0.46
  wheelbaseM: number;
  cgHeightM: number;
  dragCoeff: number;
  frontalAreaM2: number;
  irlTopSpeedKmh?: number;
  irlZeroTo100Sec?: number;
  irlBraking100To0M?: number;
  bodyStyle: VehicleBodyStyle;
  designArchetype?: BrandDesignArchetype;
  signatureMechanic?: string;
  engineSoundProfile: 'v10_scream' | 'i6_turbo' | 'flat6_gt' | 'v8_supercharged' | 'hybrid_hyper';
  defaultTune: VehicleTune;
}

export interface DynoPoint {
  rpm: number;
  powerHP: number;
  torqueNm: number;
}

export interface GearSpeedPoint {
  gear: number;
  ratio: number;
  maxSpeedKmh: number;
  shiftDropRPM: number;
}

export interface DynoBenchmark {
  peakPowerHP: number;
  peakPowerRPM: number;
  peakTorqueNm: number;
  peakTorqueRPM: number;
  curbWeightKg: number;
  powerToWeightHPPerTon: number;
  piScore: number;
  piClass: PIClass;
  zeroTo100KmhSec: number;
  zeroTo200KmhSec: number;
  topSpeedKmh: number;
  braking100To0M: number;
  lateralG120Kmh: number;
  offroadScore: number;
  handlingBalanceLabel: 'Understeer' | 'Balanced Neutral' | 'Sport Oversteer' | 'Drift Angle Spec';
  balanceRatio: number; // 0 (understeer) to 1 (oversteer)
  dynoCurve: DynoPoint[];
  gearSpeeds: GearSpeedPoint[];
}

export interface TelemetryFrame {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  heading: number; // radians
  angularVelocity: number;
  pitchRad: number;
  rollRad: number;
  speedKmh: number;
  rpm: number;
  gear: number; // -1 = R, 0 = N, 1..6
  throttle: number;
  brake: number;
  steering: number; // -1 to 1
  handbrake: boolean;
  boostBar: number;
  nitroPct: number; // 0..100
  nitroActive: boolean;
  slipAngleDeg: number;
  wheelSpinRatio: number;
  longitudinalG: number;
  lateralG: number;
  frontAxleLoadKg: number;
  rearAxleLoadKg: number;
  surface: SurfaceType;
  zoneName: string;
  activeDriftScore: number;
  bestDriftChain: number;
  lastSpeedTrapKmh: number;
  airtimeSec: number;
  jumpDistanceM: number;
  weatherCondition?: WeatherType;
  weatherGripPct?: number;
  weatherVisibilityPct?: number;
  weatherPowerPct?: number;
  timeOfDayLabel?: string;
  solarHour?: number;
}

export interface RemotePlayerState {
  id: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  piClass: PIClass;
  piScore: number;
  paintHex: string;
  rimHex: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speedKmh: number;
  rpm: number;
  gear: number;
  steering: number;
  drifting: boolean;
  braking: boolean;
  activeRaceId?: string;
  activeRaceCp?: number;
  activeRaceFinished?: boolean;
  activeRaceFinishTimeSec?: number;
  updatedAt: number;
}

export interface MultiplayerRaceLobby {
  id: string;
  raceId: string;
  raceName: string;
  hostName: string;
  participants: string[];
  status: 'lobby' | 'countdown' | 'active' | 'finished';
  startTimeMs: number;
  finishOrder: { driverName: string; elapsedSec: number }[];
}

export interface LeaderboardEntry {
  id: string;
  driverName: string;
  vehicleName: string;
  piClass: PIClass;
  piScore: number;
  zoneType: 'speed_trap' | 'drift_zone' | 'drag_strip' | 'danger_jump';
  zoneTitle: string;
  value: number; // km/h, drift pts, seconds, or meters
  unit: string;
  timestamp: number;
}

export interface SharedTunePreset {
  id: string;
  title: string;
  author: string;
  vehicleId: string;
  vehicleName: string;
  purpose: 'Grip / Track' | 'Drift Spec' | 'Top Speed Highway' | 'Rally / Off-Road' | 'Balanced Street';
  piClass: PIClass;
  piScore: number;
  peakPowerHP: number;
  zeroTo100Sec: number;
  topSpeedKmh: number;
  tune: VehicleTune;
  createdAt: number;
}

export interface ConvoyChallenge {
  id: string;
  hostName: string;
  title: string;
  routeType: 'Festival Drag 1km' | 'Coastal Highway Sprint' | 'Canyon Drift Touge' | 'Baja Dunes Scramble';
  startX: number;
  startZ: number;
  startHeading: number;
  checkpointX: number;
  checkpointZ: number;
  participants: string[];
  status: 'recruiting' | 'countdown' | 'active' | 'finished';
  startTimeMs: number;
  winnerName?: string;
  winningTimeSec?: number;
}

export interface FeedEvent {
  id: string;
  driverName: string;
  message: string;
  category: 'record' | 'tune' | 'convoy' | 'join';
  timestamp: number;
}

export interface WorldPointOfInterest {
  id: string;
  name: string;
  biome?: WorldBiomeType;
  category: 'festival' | 'speed_trap' | 'drift_zone' | 'drag_strip' | 'danger_jump' | 'scenic';
  description: string;
  x: number;
  z: number;
  heading: number;
  targetValue: number;
  unit: string;
}

export interface RaceCheckpoint {
  x: number;
  z: number;
  label: string;
  coachingTitle?: string;
  coachingInstruction?: string;
}

export interface WorldRaceEvent {
  id: string;
  name: string;
  biome?: WorldBiomeType;
  sponsor: string;
  discipline:
    | 'Tutorial Qualifier'
    | 'Circuit Race'
    | 'Sprint Race'
    | 'Circuit Sprint'
    | 'Drag Showdown'
    | 'Touge Drift'
    | 'Off-Road Rally'
    | 'Multiplayer Grand Prix';
  description: string;
  recommendedClass: PIClass;
  difficultyLevel?: 1 | 2 | 3 | 4;
  isMultiplayerRace?: boolean;
  laps?: number;
  targetTimeSec: number;
  startX: number;
  startZ: number;
  startHeading: number;
  checkpoints: RaceCheckpoint[];
}

export interface CustomTrackPoint {
  id: string;
  label: string;
  x: number;
  z: number;
}

export interface TrackedDestination {
  id: string;
  label: string;
  x: number;
  z: number;
  category: 'race' | 'poi' | 'waypoint';
  raceId?: string;
}

export type RaceBotDifficultyTier =
  | 'Clubman'
  | 'Skilled'
  | 'Expert'
  | 'Pro'
  | 'Unbeatable Apex';

export interface RaceBotState {
  id: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  paintHex: string;
  rimHex: string;
  piClass: PIClass;
  piScore: number;
  difficultyTier: RaceBotDifficultyTier;
  difficultyScale: number;
  targetTopSpeedKmh: number;
  targetAccelMs2: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  speedKmh: number;
  currentCheckpointIndex: number;
  isFinished: boolean;
  finishTimeSec?: number;
  laneOffsetM: number;
  trackProgressM?: number;
}

export interface ActiveRaceSession {
  sessionId?: string;
  race: WorldRaceEvent;
  currentCheckpointIndex: number;
  startTimeMs: number;
  elapsedSec: number;
  isCompleted: boolean;
  finalTimeSec?: number;
  playerPosition?: number;
  totalRacers?: number;
  difficultyTier?: RaceBotDifficultyTier;
  bots?: RaceBotState[];
}
