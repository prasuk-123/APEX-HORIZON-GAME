import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveRaceSession,
  CameraMode,
  ConvoyChallenge,
  CustomTrackPoint,
  FeedEvent,
  LeaderboardEntry,
  MobileControlMode,
  MultiplayerRaceLobby,
  RaceBotDifficultyTier,
  RaceBotState,
  RemotePlayerState,
  SharedTunePreset,
  TelemetryFrame,
  TrackedDestination,
  VehicleSpec,
  VehicleTune,
  WeatherControlMode,
  WorldRaceEvent,
} from './types/game';
import {
  getShortCarMainName,
  INITIAL_SHARED_TUNES,
  VEHICLES,
  WORLD_POIS,
  WORLD_RACES,
} from './data/vehicles';
import {
  ControlInputState,
  computeDynoBenchmark,
  computeRaceRoadPath,
  computeRoadNetworkPath,
  getRaceDifficultyForCar,
  setWeatherControlMode,
} from './physics/vehiclePhysics';
import { WorldSceneCanvas } from './three/WorldSceneCanvas';
import { VehicleRosterModal } from './components/VehicleRosterModal';
import {
  AutoshowBuySellModal,
  DEFAULT_STARTER_OWNED_IDS,
  NON_SELLABLE_STARTER_IDS,
  STARTER_SEDAN_ID,
} from './components/AutoshowBuySellModal';
import { ModificationTuningModal } from './components/ModificationTuningModal';
import { WheelspinModal } from './components/WheelspinModal';
import {
  calculateRaceXpReward,
  computeLevelUpSpinRewards,
  getLevelProgressFromTotalXp,
  MAX_PLAYER_LEVEL,
  PlayerProfileModal,
} from './components/PlayerProfileModal';
import {
  DAILY_MAX_SUPER_WHEELSPINS_BUY,
  DAILY_MAX_WHEELSPINS_BUY,
  getTodayDateKey,
  HORIZON_SHOP_SUPER_WHEELSPIN_COST,
  HORIZON_SHOP_WHEELSPIN_COST,
  HorizonShopModal,
  HorizonTokenCoinIcon,
} from './components/HorizonShopModal';
import { RaceCarSelectModal } from './components/RaceCarSelectModal';
import { getWorldSatelliteMapDataUrl, WorldMapModal } from './components/WorldMapModal';
import { LiveTelemetryModal } from './components/LiveTelemetryModal';
import { ConvoyMultiplayerDrawer } from './components/ConvoyMultiplayerDrawer';
import { StoryCutsceneModal } from './components/StoryCutsceneModal';
import { MobileTouchControls } from './components/MobileTouchControls';
import { IntroTitleAnimationModal } from './components/IntroTitleAnimationModal';
import { TutorialBookModal } from './components/TutorialBookModal';
import { engineAudio } from './audio/engineAudio';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize2,
  Minimize2,
  Navigation,
  Flag,
  Award,
  Settings,
  Menu,
  Disc,
  Gamepad2,
  Smartphone,
  Car,
  Map as MapIcon,
  Users,
  Activity,
  Film,
  X,
  Save,
  Download,
  Upload,
  CheckCircle2,
  ShieldAlert,
  Eye,
  CloudRain,
  Sun,
  ShoppingBag,
  Wrench,
  Sparkles,
  Store,
  User,
  Zap,
  BookOpen,
} from 'lucide-react';

const SAVE_STORAGE_KEY = 'apex_horizons_save_v1';
const FIRST_TIME_USERNAME_KEY = 'apex_horizons_username_setup_v1';
const FIRST_TIME_TUTORIAL_BOOK_KEY = 'apex_horizons_tutorial_book_seen_v1';

interface SavedProgressData {
  version: number;
  savedAt: number;
  driverName: string;
  hasCompletedUsernameSetup?: boolean;
  hasSeenTutorialBook?: boolean;
  activeVehicleId: string;
  ownedVehicleIds?: string[];
  customTunes: Record<string, VehicleTune>;
  completedRaces: Record<string, { bestTimeSec: number; bestPosition: number; completions: number }>;
  careerCredits: number;
  wheelspinsCount?: number;
  superWheelspinsCount?: number;
  wheelspinsResetToZeroV2?: boolean;
  playerXp?: number;
  horizonTokens?: number;
  shopPurchaseDateKey?: string;
  normalSpinsBoughtToday?: number;
  superSpinsBoughtToday?: number;
  driverLevel: number;
  customTrackPoints: CustomTrackPoint[];
  mobileControlMode: MobileControlMode;
  steerSensitivity: number;
  cameraMode: CameraMode;
}

function loadSavedProgress(): Partial<SavedProgressData> | null {
  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<SavedProgressData>;
  } catch {
    return null;
  }
}

type ActiveOverlay =
  | 'intro_title'
  | 'none'
  | 'main_menu'
  | 'buy_sell'
  | 'my_garage'
  | 'mod_tuning'
  | 'wheelspins'
  | 'player_profile'
  | 'horizon_shop'
  | 'roster'
  | 'map'
  | 'telemetry'
  | 'cutscene';

/**
 * Currency symbol: 'C' with a horizontal line right through the middle.
 */
export const CreditCurrencySymbol: React.FC<{
  className?: string;
  withCoinBadge?: boolean;
}> = ({ className = 'w-5 h-5', withCoinBadge = true }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 select-none ${className}`}
    aria-label="Credits Currency Symbol"
  >
    {withCoinBadge && (
      <>
        <circle
          cx="12"
          cy="12"
          r="10.5"
          fill="rgba(245, 158, 11, 0.18)"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="12"
          r="8.4"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="0.9"
          strokeDasharray="2 2"
        />
      </>
    )}
    {/* Bold 'C' curve */}
    <path
      d={
        withCoinBadge
          ? 'M 15.6 8.2 A 5.2 5.2 0 1 0 15.6 15.8'
          : 'M 18.2 6.4 A 7.6 7.6 0 1 0 18.2 17.6'
      }
      stroke="currentColor"
      strokeWidth={withCoinBadge ? '2.5' : '2.8'}
      strokeLinecap="round"
    />
    {/* Horizontal line right through the middle of the 'C' */}
    <line
      x1={withCoinBadge ? '4.8' : '2.5'}
      y1="12"
      x2={withCoinBadge ? '15.2' : '16.5'}
      y2="12"
      stroke="currentColor"
      strokeWidth={withCoinBadge ? '2.3' : '2.6'}
      strokeLinecap="round"
    />
  </svg>
);

function formatOrdinalPosition(pos: number): string {
  const n = Math.max(1, Math.round(pos));
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}TH`;
  switch (n % 10) {
    case 1:
      return `${n}ST`;
    case 2:
      return `${n}ND`;
    case 3:
      return `${n}RD`;
    default:
      return `${n}TH`;
  }
}

function calculateRaceCreditsReward(
  race: WorldRaceEvent,
  finalPosition: number,
  totalRacers: number,
  aiDifficultyTier: string,
  isMultiplayer: boolean
): { creditsEarned: number; distanceKm: number; difficultyLabel: string } {
  const minCredits = isMultiplayer ? 20000 : 15000;
  const maxCredits = isMultiplayer ? 100000 : 70000;

  // 1. Finish Position Factor (0.0 for last place -> 1.0 for 1st place)
  const clampedPos = Math.max(1, Math.min(Math.max(2, totalRacers), finalPosition));
  const positionFactor =
    totalRacers <= 1
      ? 1.0
      : Math.max(0, Math.min(1, (totalRacers - clampedPos) / (totalRacers - 1)));

  // 2. Difficulty Level Factor (combines event difficultyLevel 1..4 & AI difficulty tier)
  const diffLvl = race.difficultyLevel ?? 2;
  const eventDiffScore =
    diffLvl >= 4
      ? 1.0
      : diffLvl === 3
      ? 0.72
      : diffLvl === 2
      ? 0.42
      : 0.12;
  const aiTierScore =
    aiDifficultyTier.includes('Unbeatable')
      ? 1.0
      : aiDifficultyTier.includes('Pro')
      ? 0.75
      : aiDifficultyTier.includes('Expert')
      ? 0.55
      : aiDifficultyTier.includes('Skilled')
      ? 0.35
      : 0.15;
  const difficultyFactor = Math.max(0, Math.min(1, eventDiffScore * 0.65 + aiTierScore * 0.35));

  // 3. Race Length Factor (computed from the true 3D road path length in km)
  const pathPts = computeRaceRoadPath(race);
  let totalDistM = 0;
  for (let i = 1; i < pathPts.length; i++) {
    totalDistM += Math.hypot(pathPts[i].x - pathPts[i - 1].x, pathPts[i].z - pathPts[i - 1].z);
  }
  const totalDistKm = Math.max(0.8, Number(((totalDistM || 4500) / 1000).toFixed(1)));
  const lengthFactor = Math.max(0, Math.min(1, (totalDistKm - 2.0) / 12.0));

  // Weighted score combining Position (50%), Difficulty (25%), and Race Length (25%)
  const weightedScore =
    positionFactor * 0.5 + difficultyFactor * 0.25 + lengthFactor * 0.25;

  const rawCredits = minCredits + weightedScore * (maxCredits - minCredits);
  const roundedCredits = Math.round(rawCredits / 100) * 100;
  const creditsEarned = Math.max(minCredits, Math.min(maxCredits, roundedCredits));

  const difficultyLabel =
    aiDifficultyTier ||
    (diffLvl >= 4 ? 'Unbeatable' : diffLvl === 3 ? 'Expert' : diffLvl === 2 ? 'Pro' : 'Clubman');

  return { creditsEarned, distanceKm: totalDistKm, difficultyLabel };
}

export default function App() {
  const initialSave = useMemo(() => loadSavedProgress(), []);

  // Driver identity (Restored from localStorage if saved) & First-Time Username Setup Flag
  const [driverName, setDriverName] = useState<string>(() => {
    if (initialSave?.driverName) return initialSave.driverName;
    const suffix = Math.floor(100 + Math.random() * 899);
    return `ApexDriver_${suffix}`;
  });
  const [hasCompletedUsernameSetup, setHasCompletedUsernameSetup] = useState<boolean>(() => {
    try {
      if (window.localStorage.getItem(FIRST_TIME_USERNAME_KEY) === 'true') {
        return true;
      }
    } catch {
      // Ignore localStorage access error
    }
    return Boolean(initialSave?.hasCompletedUsernameSetup);
  });
  const [hasSeenTutorialBook, setHasSeenTutorialBook] = useState<boolean>(() => {
    try {
      if (window.localStorage.getItem(FIRST_TIME_TUTORIAL_BOOK_KEY) === 'true') {
        return true;
      }
    } catch {
      // Ignore localStorage access error
    }
    return Boolean(initialSave?.hasSeenTutorialBook);
  });
  const [tutorialBookOpen, setTutorialBookOpen] = useState<boolean>(false);

  const handleCloseTutorialBook = useCallback(() => {
    setTutorialBookOpen(false);
    setHasSeenTutorialBook(true);
    try {
      window.localStorage.setItem(FIRST_TIME_TUTORIAL_BOOK_KEY, 'true');
    } catch {
      // Ignore storage error
    }
  }, []);

  const handleUpdateDriverName = useCallback((newName: string) => {
    const cleaned = newName.trim().slice(0, 20);
    if (!cleaned) return;
    setDriverName(cleaned);
    setHasCompletedUsernameSetup(true);
    try {
      window.localStorage.setItem(FIRST_TIME_USERNAME_KEY, 'true');
    } catch {
      // Ignore storage error
    }
  }, []);

  // Active vehicle & owned vehicles list (Starts with only the 2 non-sellable 70,000-credit starter cars: 1 Sedan + 1 Truck)
  const [activeVehicleId, setActiveVehicleId] = useState<string>(() => {
    if (
      initialSave?.version === 3 &&
      initialSave?.activeVehicleId &&
      VEHICLES.some((v) => v.id === initialSave.activeVehicleId)
    ) {
      return initialSave.activeVehicleId;
    }
    return STARTER_SEDAN_ID;
  });

  const [ownedVehicleIds, setOwnedVehicleIds] = useState<string[]>(() => {
    if (
      initialSave?.version === 3 &&
      Array.isArray(initialSave?.ownedVehicleIds) &&
      initialSave.ownedVehicleIds.length >= 2
    ) {
      const merged = new Set<string>([...DEFAULT_STARTER_OWNED_IDS, ...initialSave.ownedVehicleIds]);
      return Array.from(merged);
    }
    return [...DEFAULT_STARTER_OWNED_IDS];
  });

  const handleBuyVehicle = useCallback((spec: VehicleSpec, buyPrice: number) => {
    setCareerCredits((prevCredits) => {
      if (prevCredits < buyPrice) return prevCredits;
      return prevCredits - buyPrice;
    });
    setOwnedVehicleIds((prevOwned) =>
      prevOwned.includes(spec.id) ? prevOwned : [...prevOwned, spec.id]
    );
    setActiveVehicleId(spec.id);
  }, []);

  const handleSellVehicle = useCallback((spec: VehicleSpec, sellPrice: number) => {
    // Starter 70,000-credit Truck & Sedan cannot be sold
    if (NON_SELLABLE_STARTER_IDS.has(spec.id)) return;
    setCareerCredits((prevCredits) => prevCredits + sellPrice);
    setOwnedVehicleIds((prevOwned) => {
      const next = prevOwned.filter((id) => id !== spec.id);
      if (next.length > 0) {
        setActiveVehicleId((curr) => (curr === spec.id ? next[0] : curr));
      }
      return next;
    });
  }, []);

  const [customTunes, setCustomTunes] = useState<Record<string, VehicleTune>>(() => {
    const map: Record<string, VehicleTune> = {};
    VEHICLES.forEach((v) => {
      map[v.id] = { ...v.defaultTune };
    });
    if (initialSave?.customTunes) {
      Object.entries(initialSave.customTunes).forEach(([id, tune]) => {
        if (map[id] && tune) {
          map[id] = { ...map[id], ...tune };
        }
      });
    }
    return map;
  });

  // Career Progress: Completed Races, Credits & Driver Level (Auto-Saved in localStorage)
  const [completedRaces, setCompletedRaces] = useState<
    Record<string, { bestTimeSec: number; bestPosition: number; completions: number }>
  >(() => initialSave?.completedRaces || {});
  const [careerCredits, setCareerCredits] = useState<number>(
    () => (initialSave?.version === 3 ? initialSave?.careerCredits ?? 0 : 0)
  );
  const [wheelspinsCount, setWheelspinsCount] = useState<number>(() =>
    initialSave?.version === 3 && initialSave?.wheelspinsResetToZeroV2
      ? initialSave?.wheelspinsCount ?? 0
      : 0
  );
  const [superWheelspinsCount, setSuperWheelspinsCount] = useState<number>(() =>
    initialSave?.version === 3 && initialSave?.wheelspinsResetToZeroV2
      ? initialSave?.superWheelspinsCount ?? 0
      : 0
  );
  const [playerXp, setPlayerXp] = useState<number>(() => initialSave?.playerXp ?? 0);
  const playerXpRef = useRef<number>(initialSave?.playerXp ?? 0);
  useEffect(() => {
    playerXpRef.current = playerXp;
  }, [playerXp]);
  const levelProgress = useMemo(() => getLevelProgressFromTotalXp(playerXp), [playerXp]);
  const driverLevel = levelProgress.level;

  // Horizon Tokens ('H' Coins collected on map) & Daily Horizon Shop Purchase Limits (4 Wheelspins & 2 Super Wheelspins per day)
  const [horizonTokens, setHorizonTokens] = useState<number>(
    () => initialSave?.horizonTokens ?? 0
  );
  const [shopPurchaseDateKey, setShopPurchaseDateKey] = useState<string>(() =>
    initialSave?.shopPurchaseDateKey || getTodayDateKey()
  );
  const [normalSpinsBoughtToday, setNormalSpinsBoughtToday] = useState<number>(() => {
    const today = getTodayDateKey();
    return initialSave?.shopPurchaseDateKey === today
      ? initialSave?.normalSpinsBoughtToday ?? 0
      : 0;
  });
  const [superSpinsBoughtToday, setSuperSpinsBoughtToday] = useState<number>(() => {
    const today = getTodayDateKey();
    return initialSave?.shopPurchaseDateKey === today
      ? initialSave?.superSpinsBoughtToday ?? 0
      : 0;
  });
  const [tokenCollectToast, setTokenCollectToast] = useState<number | null>(null);
  const tokenToastTimeoutRef = useRef<number | null>(null);

  const handleCollectHorizonToken = useCallback(() => {
    setHorizonTokens((prev) => {
      const next = prev + 1;
      setTokenCollectToast(next);
      return next;
    });
    if (tokenToastTimeoutRef.current !== null) {
      window.clearTimeout(tokenToastTimeoutRef.current);
    }
    tokenToastTimeoutRef.current = window.setTimeout(() => {
      setTokenCollectToast(null);
    }, 2400);
  }, []);

  const handleBuyShopNormalWheelspin = useCallback(() => {
    const today = getTodayDateKey();
    const currentBought = shopPurchaseDateKey === today ? normalSpinsBoughtToday : 0;
    if (horizonTokens < HORIZON_SHOP_WHEELSPIN_COST) return;

    setHorizonTokens((prev) => Math.max(0, prev - HORIZON_SHOP_WHEELSPIN_COST));
    setWheelspinsCount((prev) => prev + 1);
    setShopPurchaseDateKey(today);
    setNormalSpinsBoughtToday(currentBought + 1);
  }, [horizonTokens, normalSpinsBoughtToday, shopPurchaseDateKey]);

  const handleBuyShopSuperWheelspin = useCallback(() => {
    const today = getTodayDateKey();
    const currentBought = shopPurchaseDateKey === today ? superSpinsBoughtToday : 0;
    if (horizonTokens < HORIZON_SHOP_SUPER_WHEELSPIN_COST) return;

    setHorizonTokens((prev) => Math.max(0, prev - HORIZON_SHOP_SUPER_WHEELSPIN_COST));
    setSuperWheelspinsCount((prev) => prev + 1);
    setShopPurchaseDateKey(today);
    setSuperSpinsBoughtToday(currentBought + 1);
  }, [horizonTokens, shopPurchaseDateKey, superSpinsBoughtToday]);
  const [lastSavedTimeText, setLastSavedTimeText] = useState<string>(() =>
    initialSave?.savedAt ? new Date(initialSave.savedAt).toLocaleTimeString() : 'Auto-Save Active'
  );
  const [saveFeedbackToast, setSaveFeedbackToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeSpec = useMemo(
    () => VEHICLES.find((v) => v.id === activeVehicleId) || VEHICLES[0],
    [activeVehicleId]
  );
  const activeTune = customTunes[activeSpec.id] || activeSpec.defaultTune;
  const benchmark = useMemo(
    () => computeDynoBenchmark(activeSpec, activeTune),
    [activeSpec, activeTune]
  );

  // Start with the animated ignition sequence -> "APEX HORIZONS" title reveal -> Start button
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>('intro_title');
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [convoyDrawerOpen, setConvoyDrawerOpen] = useState<boolean>(false);
  const [dismissedEventGateId, setDismissedEventGateId] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>(
    () => initialSave?.cameraMode || 'chase_far'
  );
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);

  // Ensure weather & day/night cycle is always automatic
  useEffect(() => {
    setWeatherControlMode('auto');
  }, []);

  // Mobile Touch Controls (3 Modes: 1. Steering Wheel, 2. Touch Buttons, 3. Tilt / Slider)
  const [mobileControlMode, setMobileControlMode] = useState<MobileControlMode>(
    () => initialSave?.mobileControlMode || 'wheel'
  );
  const [steerSensitivity, setSteerSensitivity] = useState<number>(
    () => initialSave?.steerSensitivity ?? 0.65
  );
  const [showMobileControls, setShowMobileControls] = useState<boolean>(true);
  const touchControlsRef = useRef<ControlInputState>({
    throttle: 0,
    brake: 0,
    steerLeft: 0,
    steerRight: 0,
    handbrake: false,
    shiftUpRequested: false,
    shiftDownRequested: false,
    nitrousBoost: false,
    steerSensitivity: 0.65,
  });

  useEffect(() => {
    touchControlsRef.current.steerSensitivity = steerSensitivity;
  }, [steerSensitivity]);

  const [teleportTarget, setTeleportTarget] = useState<{
    x: number;
    z: number;
    heading: number;
    nonce: number;
  } | null>(null);

  // World Map Custom Marked Track Points, GPS Tracked Destination & Active Race with AI Bots
  const [customTrackPoints, setCustomTrackPoints] = useState<CustomTrackPoint[]>(
    () => initialSave?.customTrackPoints || []
  );
  const [trackedDestination, setTrackedDestination] = useState<TrackedDestination | null>({
    id: WORLD_RACES[0].id,
    label: WORLD_RACES[0].name,
    x: WORLD_RACES[0].startX,
    z: WORLD_RACES[0].startZ,
    category: 'race',
    raceId: WORLD_RACES[0].id,
  });
  const [activeRaceSession, setActiveRaceSession] = useState<ActiveRaceSession | null>(null);
  const [pendingRaceForCarSelect, setPendingRaceForCarSelect] = useState<WorldRaceEvent | null>(
    null
  );
  const [liveRaceStanding, setLiveRaceStanding] = useState<{
    playerPosition: number;
    totalRacers: number;
    difficultyTier: RaceBotDifficultyTier;
    bots: RaceBotState[];
  }>({
    playerPosition: 1,
    totalRacers: 6,
    difficultyTier: 'Pro',
    bots: [],
  });
  const [licenseEarnedModal, setLicenseEarnedModal] = useState<{
    raceName: string;
    finalTimeSec: number;
    isTutorial: boolean;
    playerPosition: number;
    totalRacers: number;
    creditsEarned: number;
    xpEarned: number;
    oldLevel: number;
    newLevel: number;
    normalSpinsFromLevelUp: number;
    superSpinsFromLevelUp: number;
    difficultyLabel: string;
    distanceKm: number;
    isMultiplayerRace: boolean;
    wonWheelspin?: boolean;
  } | null>(null);

  // Game pauses whenever the Main Menu or any of its 6 sub-windows is opened OR when the pre-race car selection or post-race finish window is displayed
  const isGamePaused =
    activeOverlay === 'main_menu' ||
    activeOverlay === 'buy_sell' ||
    activeOverlay === 'my_garage' ||
    activeOverlay === 'mod_tuning' ||
    activeOverlay === 'wheelspins' ||
    activeOverlay === 'player_profile' ||
    activeOverlay === 'horizon_shop' ||
    tutorialBookOpen ||
    Boolean(pendingRaceForCarSelect) ||
    Boolean(licenseEarnedModal);
  const pauseStartedAtRef = useRef<number | null>(null);
  const hasOngoingSoloRace = Boolean(
    activeRaceSession &&
      !activeRaceSession.isCompleted &&
      !activeRaceSession.race.isMultiplayerRace &&
      !pendingRaceForCarSelect
  );

  // Shift solo race startTimeMs forward by the paused duration ONLY when an active solo race is paused
  useEffect(() => {
    if (isGamePaused && hasOngoingSoloRace) {
      if (pauseStartedAtRef.current === null) {
        pauseStartedAtRef.current = Date.now();
      }
    } else if (!isGamePaused && pauseStartedAtRef.current !== null) {
      const pausedMs = Math.max(0, Date.now() - pauseStartedAtRef.current);
      pauseStartedAtRef.current = null;
      if (pausedMs > 0) {
        setActiveRaceSession((prev) => {
          if (!prev || prev.isCompleted || prev.race.isMultiplayerRace) return prev;
          return {
            ...prev,
            startTimeMs: prev.startTimeMs + pausedMs,
          };
        });
      }
    } else if (!hasOngoingSoloRace) {
      pauseStartedAtRef.current = null;
    }
  }, [isGamePaused, hasOngoingSoloRace]);

  // Automatic & Manual Progress Persistence to localStorage
  const persistGameProgress = useCallback(
    (showBanner = false) => {
      try {
        const now = Date.now();
        const payload: SavedProgressData = {
          version: 3,
          savedAt: now,
          driverName,
          hasCompletedUsernameSetup,
          hasSeenTutorialBook,
          activeVehicleId,
          ownedVehicleIds,
          customTunes,
          completedRaces,
          careerCredits,
          wheelspinsCount,
          superWheelspinsCount,
          wheelspinsResetToZeroV2: true,
          playerXp,
          horizonTokens,
          shopPurchaseDateKey,
          normalSpinsBoughtToday,
          superSpinsBoughtToday,
          driverLevel,
          customTrackPoints,
          mobileControlMode,
          steerSensitivity,
          cameraMode,
        };
        window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
        setLastSavedTimeText(new Date(now).toLocaleTimeString());
        if (showBanner) {
          setSaveFeedbackToast('Progress saved to browser storage!');
          setTimeout(() => setSaveFeedbackToast(null), 2800);
        }
      } catch {
        // Ignore storage quota errors
      }
    },
    [
      driverName,
      hasCompletedUsernameSetup,
      hasSeenTutorialBook,
      activeVehicleId,
      ownedVehicleIds,
      customTunes,
      completedRaces,
      careerCredits,
      wheelspinsCount,
      superWheelspinsCount,
      playerXp,
      horizonTokens,
      shopPurchaseDateKey,
      normalSpinsBoughtToday,
      superSpinsBoughtToday,
      driverLevel,
      customTrackPoints,
      mobileControlMode,
      steerSensitivity,
      cameraMode,
    ]
  );

  // Auto-save whenever any player state changes + on tab close/unload
  useEffect(() => {
    persistGameProgress(false);
  }, [persistGameProgress]);

  useEffect(() => {
    const onBeforeUnload = () => {
      persistGameProgress(false);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [persistGameProgress]);

  // Export Save Backup File (.json)
  const handleExportSaveFile = () => {
    persistGameProgress(false);
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex_horizons_save_${driverName.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSaveFeedbackToast('Save backup file downloaded!');
    setTimeout(() => setSaveFeedbackToast(null), 3000);
  };

  // Import Save Backup File (.json)
  const handleImportSaveFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<SavedProgressData>;
        if (parsed.driverName) handleUpdateDriverName(parsed.driverName);
        if (parsed.activeVehicleId && VEHICLES.some((v) => v.id === parsed.activeVehicleId)) {
          setActiveVehicleId(parsed.activeVehicleId);
        }
        if (parsed.customTunes) {
          setCustomTunes((prev) => ({ ...prev, ...parsed.customTunes }));
        }
        if (parsed.completedRaces) setCompletedRaces(parsed.completedRaces);
        if (typeof parsed.careerCredits === 'number') setCareerCredits(parsed.careerCredits);
        if (typeof parsed.playerXp === 'number') setPlayerXp(parsed.playerXp);
        if (typeof parsed.horizonTokens === 'number') setHorizonTokens(parsed.horizonTokens);
        if (typeof parsed.shopPurchaseDateKey === 'string') {
          setShopPurchaseDateKey(parsed.shopPurchaseDateKey);
        }
        if (typeof parsed.normalSpinsBoughtToday === 'number') {
          setNormalSpinsBoughtToday(parsed.normalSpinsBoughtToday);
        }
        if (typeof parsed.superSpinsBoughtToday === 'number') {
          setSuperSpinsBoughtToday(parsed.superSpinsBoughtToday);
        }
        if (Array.isArray(parsed.customTrackPoints)) setCustomTrackPoints(parsed.customTrackPoints);
        if (parsed.mobileControlMode) setMobileControlMode(parsed.mobileControlMode);
        if (typeof parsed.steerSensitivity === 'number')
          setSteerSensitivity(parsed.steerSensitivity);
        if (parsed.cameraMode) setCameraMode(parsed.cameraMode);
        setSaveFeedbackToast('Save file restored successfully!');
        setTimeout(() => setSaveFeedbackToast(null), 3000);
      } catch {
        setSaveFeedbackToast('Invalid save file format.');
        setTimeout(() => setSaveFeedbackToast(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Live 60fps->24fps HUD telemetry frame
  const [telemetry, setTelemetry] = useState<TelemetryFrame>({
    x: 0,
    y: 0,
    z: 45,
    vx: 0,
    vz: 0,
    heading: Math.PI,
    angularVelocity: 0,
    pitchRad: 0,
    rollRad: 0,
    speedKmh: 0,
    rpm: activeSpec.idleRPM,
    gear: 1,
    throttle: 0,
    brake: 0,
    steering: 0,
    handbrake: false,
    boostBar: 0,
    nitroPct: 100,
    nitroActive: false,
    slipAngleDeg: 0,
    wheelSpinRatio: 0,
    longitudinalG: 0,
    lateralG: 0,
    frontAxleLoadKg: 650,
    rearAxleLoadKg: 770,
    surface: 'Asphalt',
    zoneName: "Place de l'Étoile · Arc de Triomphe",
    activeDriftScore: 0,
    bestDriftChain: 0,
    lastSpeedTrapKmh: 0,
    airtimeSec: 0,
    jumpDistanceM: 0,
  });

  // Recent stunt notification banner
  const [stuntBanner, setStuntBanner] = useState<{
    title: string;
    valueText: string;
  } | null>(null);

  // Multiplayer WebSocket state
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>('');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerState[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sharedTunes, setSharedTunes] = useState<SharedTunePreset[]>(INITIAL_SHARED_TUNES);
  const [activeChallenge, setActiveChallenge] = useState<ConvoyChallenge | null>(null);
  const [activeMpRaceLobby, setActiveMpRaceLobby] = useState<MultiplayerRaceLobby | null>(null);
  const [raceCountdownDisplay, setRaceCountdownDisplay] = useState<'3' | '2' | '1' | 'GO!' | null>(
    null
  );
  const lastCountdownBeepStageRef = useRef<string | null>(null);
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);

  // Request Fullscreen & Lock Landscape Mode Automatically
  const enterFullscreenAndLandscape = useCallback(() => {
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      }
      const orientation = (window.screen as Screen & {
        orientation?: { lock?: (mode: string) => Promise<void> };
      })?.orientation;
      if (orientation && typeof orientation.lock === 'function') {
        orientation
          .lock('landscape')
          .catch(() => orientation.lock?.('landscape-primary').catch(() => {}));
      }
      setIsFullscreenMode(true);
    } catch {
      // Ignore if blocked by browser/iframe policy
    }
  }, []);

  // Toggle Fullscreen & Landscape Lock
  const toggleFullscreen = useCallback(() => {
    setIsFullscreenMode((prev) => {
      const next = !prev;
      try {
        if (next) {
          enterFullscreenAndLandscape();
        } else if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {
        // Fallback if blocked by iframe
      }
      return next;
    });
  }, [enterFullscreenAndLandscape]);

  // Unlock car engine audio on first user interaction without spamming fullscreen requests on every keypress
  useEffect(() => {
    const onUserGesture = () => {
      if (!engineAudio.getMuted()) {
        engineAudio.enableSound();
      }
    };
    window.addEventListener('pointerdown', onUserGesture, { passive: true });
    window.addEventListener('touchstart', onUserGesture, { passive: true });
    window.addEventListener('keydown', onUserGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onUserGesture);
      window.removeEventListener('touchstart', onUserGesture);
      window.removeEventListener('keydown', onUserGesture);
    };
  }, [enterFullscreenAndLandscape]);

  // Cycle Driving POV Camera (Far Chase -> Close Chase -> Cockpit Inside Car -> Hood -> Far Chase)
  const cycleCameraMode = useCallback(() => {
    setCameraMode((prev) =>
      prev === 'chase_far'
        ? 'chase_close'
        : prev === 'chase_close'
        ? 'cockpit'
        : prev === 'cockpit'
        ? 'hood'
        : 'chase_far'
    );
  }, []);

  // Connect to Authoritative WebSocket Server with Auto-Reconnect
  useEffect(() => {
    let isMounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!isMounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'world:init') {
            clientIdRef.current = msg.clientId;
            setRemotePlayers(
              (msg.players as RemotePlayerState[]).filter((p) => p.id !== msg.clientId)
            );
            if (Array.isArray(msg.leaderboard)) setLeaderboard(msg.leaderboard);
            if (Array.isArray(msg.sharedTunes)) setSharedTunes(msg.sharedTunes);
            if (msg.activeChallenge) setActiveChallenge(msg.activeChallenge);
            if (msg.activeMpRaceLobby !== undefined) setActiveMpRaceLobby(msg.activeMpRaceLobby);
            if (Array.isArray(msg.feedEvents)) setFeedEvents(msg.feedEvents);
          } else if (msg.type === 'world:mmo_tick' && Array.isArray(msg.players)) {
            setRemotePlayers(
              (msg.players as RemotePlayerState[]).filter((p) => p.id !== clientIdRef.current)
            );
          } else if (msg.type === 'player:joined' || msg.type === 'player:updated') {
            const incoming = msg.player as RemotePlayerState;
            if (incoming.id === clientIdRef.current) return;
            setRemotePlayers((prev) => {
              const exists = prev.some((p) => p.id === incoming.id);
              if (exists) {
                return prev.map((p) => (p.id === incoming.id ? incoming : p));
              }
              return [...prev, incoming];
            });
          } else if (msg.type === 'player:left') {
            setRemotePlayers((prev) => prev.filter((p) => p.id !== msg.id));
          } else if (msg.type === 'leaderboard:updated' && Array.isArray(msg.leaderboard)) {
            setLeaderboard(msg.leaderboard);
          } else if (msg.type === 'tune:created' && msg.preset) {
            const incomingTune = msg.preset as SharedTunePreset;
            setSharedTunes((prev) => {
              if (prev.some((t) => t.id === incomingTune.id)) return prev;
              return [incomingTune, ...prev];
            });
          } else if (msg.type === 'challenge:updated' && msg.challenge) {
            setActiveChallenge(msg.challenge);
          } else if (msg.type === 'mp_race:sync' || msg.type === 'mp_race:updated') {
            setActiveMpRaceLobby((msg.lobby as MultiplayerRaceLobby | null) ?? null);
          } else if (msg.type === 'feed:created' && msg.event) {
            const ev = msg.event as FeedEvent;
            setFeedEvents((prev) => {
              if (prev.some((e) => e.id === ev.id)) return prev;
              return [ev, ...prev].slice(0, 35);
            });
          }
        } catch {
          // Ignore malformed WS messages
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setWsConnected(false);
        reconnectTimer = setTimeout(connect, 2500);
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Keyboard shortcuts: 'Escape' Main Menu / Pause, 'C' Camera, 'M' Map, 'F' Fullscreen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (licenseEarnedModal) return;
        setActiveOverlay((prev) => (prev === 'main_menu' ? 'none' : 'main_menu'));
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'c' || k === 'v') {
        cycleCameraMode();
      } else if (k === 'm') {
        setActiveOverlay((prev) => (prev === 'map' ? 'none' : 'map'));
      } else if (k === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleFullscreen, cycleCameraMode, licenseEarnedModal]);

  // Broadcast local player vehicle telemetry to WebSocket server at ~12Hz
  const handleNetworkBroadcast = useCallback(
    (frame: TelemetryFrame) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: 'player:update',
          state: {
            driverName,
            vehicleId: activeSpec.id,
            vehicleName: activeSpec.name,
            piClass: benchmark.piClass,
            piScore: benchmark.piScore,
            paintHex: activeTune.paintHex,
            rimHex: activeTune.rimHex,
            x: Number(frame.x.toFixed(2)),
            y: Number(frame.y.toFixed(2)),
            z: Number(frame.z.toFixed(2)),
            heading: Number(frame.heading.toFixed(3)),
            speedKmh: frame.speedKmh,
            rpm: frame.rpm,
            gear: frame.gear,
            steering: Number(frame.steering.toFixed(2)),
            drifting: Math.abs(frame.slipAngleDeg) > 12,
            braking: frame.brake > 0.1,
            activeRaceId:
              activeRaceSession && !activeRaceSession.isCompleted
                ? activeRaceSession.race.id
                : undefined,
            activeRaceCp:
              activeRaceSession && !activeRaceSession.isCompleted
                ? activeRaceSession.currentCheckpointIndex
                : undefined,
            activeRaceFinished:
              activeRaceSession && activeRaceSession.isCompleted ? true : undefined,
            activeRaceFinishTimeSec: activeRaceSession?.finalTimeSec,
          },
        })
      );
    },
    [driverName, activeSpec, benchmark, activeTune, activeRaceSession]
  );

  // Continuous heartbeat so even when a player is in a menu, map, or lobby, all 2+ players always see each other as dots on the mini-map
  const latestTelemetryRef = useRef<TelemetryFrame>(telemetry);
  latestTelemetryRef.current = telemetry;
  useEffect(() => {
    if (!wsConnected) return;
    handleNetworkBroadcast(latestTelemetryRef.current);
    const heartbeat = setInterval(() => {
      handleNetworkBroadcast(latestTelemetryRef.current);
    }, 450);
    return () => clearInterval(heartbeat);
  }, [wsConnected, handleNetworkBroadcast]);

  // Handle PR Stunt Leaderboard Record Trigger
  const handleLeaderboardEvent = useCallback(
    (
      zoneType: 'speed_trap' | 'drift_zone' | 'drag_strip' | 'danger_jump',
      zoneTitle: string,
      value: number,
      unit: string
    ) => {
      setStuntBanner({
        title: zoneTitle,
        valueText: `${value.toLocaleString()} ${unit}`,
      });
      setTimeout(() => setStuntBanner(null), 4000);

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'leaderboard:record',
            entry: {
              id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              driverName,
              vehicleName: activeSpec.name,
              piClass: benchmark.piClass,
              piScore: benchmark.piScore,
              zoneType,
              zoneTitle,
              value,
              unit,
            },
          })
        );
      }
    },
    [driverName, activeSpec.name, benchmark.piClass, benchmark.piScore]
  );

  // Host, Join, or Launch a 2+ Player Multiplayer Grand Prix Lobby (Zero AI Bots)
  const handleHostMultiplayerRace = useCallback(
    (race: WorldRaceEvent) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'mp_race:host',
            raceId: race.id,
            raceName: race.name,
            driverName,
          })
        );
      }
      setActiveOverlay('none');
      setTeleportTarget({
        x: race.startX,
        z: race.startZ,
        heading: race.startHeading,
        nonce: Date.now(),
      });
    },
    [driverName]
  );

  const handleJoinMultiplayerRace = useCallback(
    (lobby: MultiplayerRaceLobby) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'mp_race:join',
            lobbyId: lobby.id,
            driverName,
          })
        );
      }
      const race = WORLD_RACES.find((r) => r.id === lobby.raceId);
      if (race) {
        setActiveOverlay('none');
        const rightX = Math.cos(race.startHeading);
        const rightZ = -Math.sin(race.startHeading);
        const slotIdx = Math.max(0, lobby.participants.length);
        const latOffset = ((slotIdx % 2 === 0 ? -1 : 1) * Math.ceil((slotIdx + 1) / 2)) * 3.8;
        setTeleportTarget({
          x: race.startX + rightX * latOffset,
          z: race.startZ + rightZ * latOffset,
          heading: race.startHeading,
          nonce: Date.now(),
        });
      }
    },
    [driverName]
  );

  const handleLaunchMultiplayerRaceCountdown = useCallback((lobbyId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'mp_race:launch',
          lobbyId,
        })
      );
    }
  }, []);

  const handleCancelMultiplayerRaceLobby = useCallback((lobbyId: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'mp_race:cancel',
          lobbyId,
        })
      );
    }
  }, []);

  // Synchronize Multiplayer Race Start & Separate Starting Grid Lanes when lobby enters 'countdown'
  useEffect(() => {
    if (!activeMpRaceLobby || activeMpRaceLobby.status !== 'countdown') return;
    if (!activeMpRaceLobby.participants.includes(driverName)) return;
    const race = WORLD_RACES.find((r) => r.id === activeMpRaceLobby.raceId);
    if (!race) return;

    if (
      activeRaceSession &&
      !activeRaceSession.isCompleted &&
      activeRaceSession.race.id === race.id
    ) {
      return;
    }

    const totalPlayers = Math.max(1, activeMpRaceLobby.participants.length);
    const myIdx = Math.max(0, activeMpRaceLobby.participants.indexOf(driverName));
    const rightX = Math.cos(race.startHeading);
    const rightZ = -Math.sin(race.startHeading);
    const fwdX = -Math.sin(race.startHeading);
    const fwdZ = -Math.cos(race.startHeading);
    const laneOffsetM = (myIdx - (totalPlayers - 1) * 0.5) * 4.2;
    const rowBackM = Math.floor(myIdx / 3) * 6.5;

    setActiveOverlay('none');
    setLicenseEarnedModal(null);
    setDismissedEventGateId(null);
    setStuntBanner(null);

    setTeleportTarget({
      x: race.startX + rightX * laneOffsetM - fwdX * rowBackM,
      z: race.startZ + rightZ * laneOffsetM - fwdZ * rowBackM,
      heading: race.startHeading,
      nonce: Date.now(),
    });

    const startTimeMs = Math.max(Date.now() + 3000, activeMpRaceLobby.startTimeMs || Date.now() + 3000);
    pauseStartedAtRef.current = null;
    lastCountdownBeepStageRef.current = null;
    setRaceCountdownDisplay('3');
    setLiveRaceStanding({
      playerPosition: myIdx + 1,
      totalRacers: totalPlayers,
      difficultyTier: 'Unbeatable Apex',
      bots: [],
    });
    setActiveRaceSession({
      sessionId: `${race.id}_${Date.now()}`,
      race,
      currentCheckpointIndex: 0,
      startTimeMs,
      elapsedSec: 0,
      isCompleted: false,
      playerPosition: myIdx + 1,
      totalRacers: totalPlayers,
      difficultyTier: 'Unbeatable Apex',
    });
    setTrackedDestination(null);
  }, [activeMpRaceLobby, driverName, activeRaceSession]);

  const activeRaceStartTimeMs =
    activeRaceSession && !activeRaceSession.isCompleted ? activeRaceSession.startTimeMs : null;
  const activeRaceSessionId =
    activeRaceSession && !activeRaceSession.isCompleted
      ? activeRaceSession.sessionId || activeRaceSession.race.id
      : null;

  // 3... 2... 1... GO! Pre-Race Countdown Display & WebAudio Beep Synchronizer (Uniform 1.00s cadence)
  useEffect(() => {
    if (activeRaceStartTimeMs === null || !activeRaceSessionId) {
      setRaceCountdownDisplay(null);
      lastCountdownBeepStageRef.current = null;
      return;
    }
    if (isGamePaused) return;

    const tickCountdown = () => {
      const remMs = activeRaceStartTimeMs - Date.now();
      let stage: '3' | '2' | '1' | 'GO!' | null = null;
      if (remMs > 2000) {
        stage = '3';
      } else if (remMs > 1000) {
        stage = '2';
      } else if (remMs > 0) {
        stage = '1';
      } else if (remMs > -900) {
        stage = 'GO!';
      } else {
        stage = null;
      }

      setRaceCountdownDisplay((prev) => (prev === stage ? prev : stage));
      if (stage && lastCountdownBeepStageRef.current !== stage) {
        lastCountdownBeepStageRef.current = stage;
        engineAudio.playCountdownBeep(stage === 'GO!');
      }
    };

    tickCountdown();
    const timer = setInterval(tickCountdown, 30);
    return () => clearInterval(timer);
  }, [activeRaceStartTimeMs, activeRaceSessionId, isGamePaused]);

  // Step 1 of Starting a Race: Open Pre-Race Car Selection Window (Owned Cars + Recommended Cars)
  const handleStartRaceEvent = useCallback(
    (race: WorldRaceEvent) => {
      // Prevent interacting with or starting another competition while a race is already ongoing
      if (activeRaceSession && !activeRaceSession.isCompleted) return;
      pauseStartedAtRef.current = null;
      setActiveOverlay('none');
      setLicenseEarnedModal(null);
      setPendingRaceForCarSelect(race);
    },
    [activeRaceSession]
  );

  // Step 2 of Starting a Race: Launch Race Event with the Player's Chosen Car & Difficulty Level
  const handleConfirmRaceWithCar = useCallback(
    (race: WorldRaceEvent, chosenSpec: VehicleSpec) => {
      if (activeRaceSession && !activeRaceSession.isCompleted) return;

      pauseStartedAtRef.current = null;
      lastCountdownBeepStageRef.current = null;
      setActiveVehicleId(chosenSpec.id);
      setPendingRaceForCarSelect(null);

      // If this is one of the 5 Multiplayer Grand Prix races and 2+ players are online:
      if (
        race.isMultiplayerRace &&
        remotePlayers.length > 0 &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        if (
          activeMpRaceLobby &&
          activeMpRaceLobby.raceId === race.id &&
          (activeMpRaceLobby.status === 'lobby' ||
            (activeMpRaceLobby.status as string) === 'waiting')
        ) {
          if (!activeMpRaceLobby.participants.includes(driverName)) {
            handleJoinMultiplayerRace(activeMpRaceLobby);
          } else {
            handleLaunchMultiplayerRaceCountdown(activeMpRaceLobby.id);
          }
          return;
        }
        handleHostMultiplayerRace(race);
        return;
      }

      setActiveOverlay('none');
      setLicenseEarnedModal(null);
      setDismissedEventGateId(null);
      setStuntBanner(null);

      const chosenTune = customTunes[chosenSpec.id] || chosenSpec.defaultTune;
      const chosenBench = computeDynoBenchmark(chosenSpec, chosenTune);
      const carDiff = getRaceDifficultyForCar(chosenBench);
      const totalRacers =
        race.isMultiplayerRace && remotePlayers.length > 0
          ? Math.max(2, remotePlayers.length + 1)
          : 6;
      const nowMs = Date.now();
      setRaceCountdownDisplay('3');
      setLiveRaceStanding({
        playerPosition: 1,
        totalRacers,
        difficultyTier: carDiff.tier,
        bots: [],
      });
      setTeleportTarget({
        x: race.startX,
        z: race.startZ,
        heading: race.startHeading,
        nonce: nowMs,
      });
      // Set startTimeMs exactly 3.0 seconds in the future for a uniform 3... 2... 1... GO! (1.0s each) countdown!
      setActiveRaceSession({
        sessionId: `${race.id}_${nowMs}`,
        race,
        currentCheckpointIndex: 0,
        startTimeMs: nowMs + 3000,
        elapsedSec: 0,
        isCompleted: false,
        playerPosition: 1,
        totalRacers,
        difficultyTier: carDiff.tier,
      });
      // Clear single-checkpoint GPS target so the full race route is shown on the map
      setTrackedDestination(null);
    },
    [
      customTunes,
      activeRaceSession,
      activeMpRaceLobby,
      driverName,
      remotePlayers.length,
      handleHostMultiplayerRace,
      handleJoinMultiplayerRace,
      handleLaunchMultiplayerRaceCountdown,
    ]
  );

  // Receive live AI Race Bots standing updates from WorldSceneCanvas
  const handleRaceBotsUpdate = useCallback((playerPosition: number, bots: RaceBotState[]) => {
    setLiveRaceStanding((prev) => ({
      ...prev,
      playerPosition,
      totalRacers: bots.length + 1,
      bots,
    }));
  }, []);

  // Advance Checkpoint when player drives through active 3D Race Gate
  const handleReachRaceCheckpoint = useCallback(() => {
    setActiveRaceSession((prev) => {
      if (!prev || prev.isCompleted) return prev;
      const nextIdx = prev.currentCheckpointIndex + 1;
      const elapsedSec = Number(((Date.now() - prev.startTimeMs) / 1000).toFixed(2));

      if (nextIdx >= prev.race.checkpoints.length) {
        const isTutorial = prev.race.id === 'apex-tutorial-qualifier';
        let finalPos = liveRaceStanding.playerPosition || 1;
        let totalRacers = liveRaceStanding.totalRacers || 6;

        // If finishing a Multiplayer Race, notify server and compute human finish standing
        if (prev.race.isMultiplayerRace && activeMpRaceLobby) {
          finalPos = (activeMpRaceLobby.finishOrder?.length || 0) + 1;
          totalRacers = Math.max(2, activeMpRaceLobby.participants.length);
          const ws = wsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'mp_race:finish',
                lobbyId: activeMpRaceLobby.id,
                driverName,
                vehicleName: activeSpec.name,
                piClass: benchmark.piClass,
                piScore: benchmark.piScore,
                elapsedSec,
              })
            );
          }
        }

        const isMultiplayerRace = Boolean(
          prev.race.isMultiplayerRace &&
            (activeMpRaceLobby || remotePlayers.length > 0)
        ) || Boolean(prev.race.isMultiplayerRace);

        const { creditsEarned, distanceKm, difficultyLabel } = calculateRaceCreditsReward(
          prev.race,
          finalPos,
          totalRacers,
          prev.difficultyTier || liveRaceStanding.difficultyTier || 'Pro',
          isMultiplayerRace
        );

        // 1. Calculate balanced Race XP reward (Level 1 to 100 progression)
        const xpEarned = calculateRaceXpReward(
          finalPos,
          totalRacers,
          distanceKm,
          isMultiplayerRace
        );
        const prevProgress = getLevelProgressFromTotalXp(playerXpRef.current);
        const nextTotalXp = playerXpRef.current + xpEarned;
        const nextProgress = getLevelProgressFromTotalXp(nextTotalXp);
        const levelUpRewards = computeLevelUpSpinRewards(
          prevProgress.level,
          nextProgress.level
        );

        playerXpRef.current = nextTotalXp;
        setPlayerXp(nextTotalXp);

        // 2. 10% chance to earn +1 bonus Wheelspin after completing any race
        // PLUS every level gained awards 1 Wheelspin (or 1 Super Wheelspin on every 5th level!)
        const wonWheelspin = Math.random() < 0.1;
        const totalNormalSpinsToAdd =
          (wonWheelspin ? 1 : 0) + levelUpRewards.normalWheelspinsEarned;
        if (totalNormalSpinsToAdd > 0) {
          setWheelspinsCount((w) => w + totalNormalSpinsToAdd);
        }
        if (levelUpRewards.superWheelspinsEarned > 0) {
          setSuperWheelspinsCount((s) => s + levelUpRewards.superWheelspinsEarned);
        }

        setCareerCredits((c) => c + creditsEarned);
        setCompletedRaces((oldMap) => {
          const existing = oldMap[prev.race.id];
          return {
            ...oldMap,
            [prev.race.id]: {
              bestTimeSec: existing ? Math.min(existing.bestTimeSec, elapsedSec) : elapsedSec,
              bestPosition: existing ? Math.min(existing.bestPosition, finalPos) : finalPos,
              completions: (existing?.completions || 0) + 1,
            },
          };
        });

        setLicenseEarnedModal({
          raceName: prev.race.name,
          finalTimeSec: elapsedSec,
          isTutorial,
          playerPosition: finalPos,
          totalRacers,
          creditsEarned,
          xpEarned,
          oldLevel: prevProgress.level,
          newLevel: nextProgress.level,
          normalSpinsFromLevelUp: levelUpRewards.normalWheelspinsEarned,
          superSpinsFromLevelUp: levelUpRewards.superWheelspinsEarned,
          difficultyLabel,
          distanceKm,
          isMultiplayerRace,
          wonWheelspin,
        });
        setTrackedDestination(null);
        handleLeaderboardEvent('drag_strip', prev.race.name, elapsedSec, 's');
        return {
          ...prev,
          elapsedSec,
          isCompleted: true,
          finalTimeSec: elapsedSec,
          playerPosition: finalPos,
          totalRacers,
        };
      }

        return {
          ...prev,
          currentCheckpointIndex: nextIdx,
          elapsedSec,
        };
      });
    },
    [
      handleLeaderboardEvent,
      liveRaceStanding.playerPosition,
      liveRaceStanding.totalRacers,
      liveRaceStanding.difficultyTier,
      remotePlayers.length,
      benchmark.piScore,
      benchmark.piClass,
      activeMpRaceLobby,
      driverName,
      activeSpec.name,
    ]
  );

  // Advance Custom Track Point when player drives through it
  const handleReachCustomTrackPoint = useCallback((ptId: string) => {
    setCustomTrackPoints((prev) => {
      const remaining = prev.filter((p) => p.id !== ptId);
      if (remaining.length > 0) {
        const nextPt = remaining[0];
        setTrackedDestination({
          id: nextPt.id,
          label: nextPt.label,
          x: nextPt.x,
          z: nextPt.z,
          category: 'waypoint',
        });
      } else {
        setTrackedDestination((curr) => (curr?.id === ptId ? null : curr));
      }
      return remaining;
    });
    setStuntBanner({
      title: 'GPS Track Point Reached',
      valueText: 'Waypoint Cleared',
    });
    setTimeout(() => setStuntBanner(null), 2200);
  }, []);

  // Update active vehicle tune
  const handleUpdateTune = (nextTune: VehicleTune) => {
    setCustomTunes((prev) => ({
      ...prev,
      [activeSpec.id]: nextTune,
    }));
  };

  // Reset active vehicle to factory default tune
  const handleResetFactory = () => {
    setCustomTunes((prev) => ({
      ...prev,
      [activeSpec.id]: { ...activeSpec.defaultTune },
    }));
  };

  // Publish custom tune to multiplayer server
  const handlePublishTune = (title: string, purpose: SharedTunePreset['purpose']) => {
    const preset: SharedTunePreset = {
      id: `tune_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      author: driverName,
      vehicleId: activeSpec.id,
      vehicleName: activeSpec.name,
      purpose,
      piClass: benchmark.piClass,
      piScore: benchmark.piScore,
      peakPowerHP: benchmark.peakPowerHP,
      zeroTo100Sec: benchmark.zeroTo100KmhSec,
      topSpeedKmh: benchmark.topSpeedKmh,
      tune: { ...activeTune },
      createdAt: Date.now(),
    };

    setSharedTunes((prev) => [preset, ...prev]);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tune:publish', preset }));
    }
  };

  // Load any shared tune preset
  const handleApplySharedTune = (preset: SharedTunePreset) => {
    setActiveVehicleId(preset.vehicleId);
    setCustomTunes((prev) => ({
      ...prev,
      [preset.vehicleId]: { ...preset.tune },
    }));
  };

  const handleFastTravelCoords = (x: number, z: number, heading: number) => {
    setTeleportTarget({
      x,
      z,
      heading,
      nonce: Date.now(),
    });
  };

  // Start or Join Multiplayer Convoy Challenge (Blocked during an active solo race)
  const handleStartChallenge = (routeType: ConvoyChallenge['routeType']) => {
    if (activeRaceSession && !activeRaceSession.isCompleted) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'challenge:create',
          routeType,
          driverName,
        })
      );
    }
    setConvoyDrawerOpen(false);
  };

  const handleJoinChallenge = (challengeId: string) => {
    if (activeRaceSession && !activeRaceSession.isCompleted) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'challenge:join',
          challengeId,
          driverName,
        })
      );
    }
    setConvoyDrawerOpen(false);
  };

  const handleChallengeFinish = useCallback(
    (elapsedSec: number) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'challenge:finish',
            driverName,
            elapsedSec,
          })
        );
      }
      setStuntBanner({
        title: `${activeChallenge?.routeType || 'Convoy Sprint'} Complete!`,
        valueText: `${elapsedSec.toFixed(2)}s`,
      });
      setTimeout(() => setStuntBanner(null), 4500);
    },
    [driverName, activeChallenge]
  );

  const handleSendChatPing = (message: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'chat:ping',
          driverName,
          message,
        })
      );
    }
  };

  // Tachometer RPM & Speedometer radial arc calculations (240 of 301.6 circumference = 286° sweep)
  const arcMax = 240;
  const rpmRatio = Math.min(1, Math.max(0, telemetry.rpm / activeSpec.maxRPM));
  const redlineRatio = activeSpec.redlineRPM / activeSpec.maxRPM;
  const isNearRedline = telemetry.rpm >= activeSpec.redlineRPM * 0.94;

  const speedScaleMax = Math.max(320, Math.ceil(benchmark.topSpeedKmh / 20) * 20);
  const speedRatio = Math.min(1, Math.max(0, telemetry.speedKmh / speedScaleMax));
  const topSpeedZoneRatio = Math.min(0.95, (benchmark.topSpeedKmh * 0.85) / speedScaleMax);
  const isHighSpeedVelocity = telemetry.speedKmh >= benchmark.topSpeedKmh * 0.85;
  const speedNeedleAngleDeg = 135 + speedRatio * 286.5;
  const rpmNeedleAngleDeg = 135 + rpmRatio * 286.5;

  // Full Race Route on Map during an active race (instead of a single checkpoint)
  const activeRaceFullRoute = useMemo(() => {
    if (!activeRaceSession || activeRaceSession.isCompleted) return null;
    return computeRaceRoadPath(activeRaceSession.race);
  }, [activeRaceSession]);

  // Free-roam GPS Target Coords (when not in a race)
  const gpsTargetCoords =
    activeRaceSession && !activeRaceSession.isCompleted
      ? null
      : customTrackPoints.length > 0
      ? {
          x: customTrackPoints[0].x,
          z: customTrackPoints[0].z,
          label: customTrackPoints[0].label,
        }
      : trackedDestination
      ? { x: trackedDestination.x, z: trackedDestination.z, label: trackedDestination.label }
      : null;

  // Quantized player coords (~20m steps) so road-network GPS pathing runs smoothly without lag
  const snappedPlayerGpsX = Math.round(telemetry.x / 20) * 20;
  const snappedPlayerGpsZ = Math.round(telemetry.z / 20) * 20;

  const activeGpsRoadRoute = useMemo(() => {
    if (!gpsTargetCoords) return null;
    return computeRoadNetworkPath(
      snappedPlayerGpsX,
      snappedPlayerGpsZ,
      gpsTargetCoords.x,
      gpsTargetCoords.z
    );
  }, [snappedPlayerGpsX, snappedPlayerGpsZ, gpsTargetCoords?.x, gpsTargetCoords?.z]);

  const gpsDistanceM = activeGpsRoadRoute
    ? activeGpsRoadRoute.totalDistanceM
    : gpsTargetCoords
    ? Math.round(Math.hypot(gpsTargetCoords.x - telemetry.x, gpsTargetCoords.z - telemetry.z))
    : null;

  // Check if player has driven into any Open-World Race Event Start Zone (Forza Horizon style)
  const nearbyWorldRace = useMemo(() => {
    if (activeRaceSession && !activeRaceSession.isCompleted) return null;
    let closestRace: WorldRaceEvent | null = null;
    let closestDist = 88;
    for (const race of WORLD_RACES) {
      const dist = Math.hypot(telemetry.x - race.startX, telemetry.z - race.startZ);
      if (dist < closestDist) {
        closestDist = dist;
        closestRace = race;
      }
    }
    return closestRace;
  }, [telemetry.x, telemetry.z, activeRaceSession]);

  // Reset dismissed gate prompt when player drives away OR arrives at a GPS-tracked race destination
  useEffect(() => {
    if (!nearbyWorldRace && dismissedEventGateId) {
      setDismissedEventGateId(null);
    } else if (
      nearbyWorldRace &&
      trackedDestination?.raceId === nearbyWorldRace.id &&
      dismissedEventGateId === nearbyWorldRace.id
    ) {
      setDismissedEventGateId(null);
    }
  }, [nearbyWorldRace, dismissedEventGateId, trackedDestination]);

  // Allow pressing [E] or [Enter] to start the race when the car reaches the race location and the top prompt appears
  useEffect(() => {
    if (
      !nearbyWorldRace ||
      Boolean(pendingRaceForCarSelect) ||
      (activeRaceSession && !activeRaceSession.isCompleted) ||
      dismissedEventGateId === nearbyWorldRace.id ||
      activeOverlay !== 'none'
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        handleStartRaceEvent(nearbyWorldRace);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    nearbyWorldRace,
    pendingRaceForCarSelect,
    activeRaceSession,
    dismissedEventGateId,
    activeOverlay,
    handleStartRaceEvent,
  ]);

  // Accurate direction in which the car moves on the 2D map (+X right, +Z down, -Z up)
  const playerSpeedMs = Math.hypot(telemetry.vx, telemetry.vz);
  const playerRadarDeg =
    playerSpeedMs > 0.8
      ? (Math.atan2(telemetry.vx, -telemetry.vz) * 180) / Math.PI
      : 180 - (telemetry.heading * 180) / Math.PI;
  const satelliteMapUrl = useMemo(() => getWorldSatelliteMapDataUrl(), []);

  // Compact Live Race Leaderboard Standings (Player + 5 AI Bots sorted 1st..6th)
  const activeRaceLeaderboardRows = useMemo(() => {
    if (!activeRaceSession || activeRaceSession.isCompleted) return [];
    const checkpoints = activeRaceSession.race.checkpoints;
    const totalCps = Math.max(1, checkpoints.length);
    const totalLaps = Math.max(1, activeRaceSession.race.laps ?? 1);
    const cpsPerLap = Math.max(1, Math.round(totalCps / totalLaps));
    const formatProgress = (cpIdx: number) => {
      const clampedIdx = Math.min(totalCps - 1, Math.max(0, cpIdx));
      if (totalLaps > 1) {
        const lapNum = Math.min(totalLaps, Math.floor(clampedIdx / cpsPerLap) + 1);
        return `L${lapNum}/${totalLaps}·${clampedIdx + 1}/${totalCps}`;
      }
      return `${clampedIdx + 1}/${totalCps}`;
    };
    const pCpIdx = activeRaceSession.currentCheckpointIndex;
    const pTargetCp = checkpoints[pCpIdx] || checkpoints[totalCps - 1];
    const pDist = pTargetCp ? Math.hypot(pTargetCp.x - telemetry.x, pTargetCp.z - telemetry.z) : 0;
    const pScore = pCpIdx * 100000 - pDist;

    const entries: {
      id: string;
      name: string;
      paintHex: string;
      isPlayer: boolean;
      score: number;
      cpText: string;
      speedKmh: number;
    }[] = [
      {
        id: 'player',
        name: `YOU (${driverName.slice(0, 10)})`,
        paintHex: activeTune.paintHex,
        isPlayer: true,
        score: pScore,
        cpText: formatProgress(pCpIdx),
        speedKmh: telemetry.speedKmh,
      },
    ];

    const fallbackBotNames = ['Laurent', 'Kenji', 'Elena', 'Mateo', 'Claire'];
    const fallbackColors = ['#EF4444', '#06B6D4', '#10B981', '#8B5CF6', '#F97316'];

    if (activeRaceSession.race.isMultiplayerRace) {
      // Multiplayer Race: Compete solely against real human players (Zero AI Bots!)
      const mpRacers = remotePlayers.filter(
        (rp) =>
          rp.activeRaceId === activeRaceSession.race.id ||
          activeMpRaceLobby?.participants.includes(rp.driverName)
      );
      mpRacers.forEach((rp) => {
        const rpCpIdx = rp.activeRaceCp ?? 0;
        const rpTargetCp = checkpoints[rpCpIdx] || checkpoints[totalCps - 1];
        const rpDist = rpTargetCp ? Math.hypot(rpTargetCp.x - rp.x, rpTargetCp.z - rp.z) : 0;
        const rpScore = rp.activeRaceFinished
          ? 99999999 - (rp.activeRaceFinishTimeSec || 0) * 100
          : rpCpIdx * 100000 - rpDist;
        entries.push({
          id: rp.id,
          name: rp.driverName.slice(0, 12),
          paintHex: rp.paintHex || '#38BDF8',
          isPlayer: false,
          score: rpScore,
          cpText: rp.activeRaceFinished ? 'FIN' : formatProgress(rpCpIdx),
          speedKmh: rp.speedKmh,
        });
      });
    } else if (liveRaceStanding.bots.length > 0) {
      liveRaceStanding.bots.forEach((bot) => {
        const bCp = checkpoints[bot.currentCheckpointIndex] || checkpoints[totalCps - 1];
        const bDist = bCp ? Math.hypot(bCp.x - bot.x, bCp.z - bot.z) : 0;
        const bScore = bot.isFinished
          ? 99999999 - (bot.finishTimeSec || 0) * 100
          : bot.currentCheckpointIndex * 100000 - bDist;
        entries.push({
          id: bot.id,
          name: bot.driverName.split('_')[0],
          paintHex: bot.paintHex,
          isPlayer: false,
          score: bScore,
          cpText: bot.isFinished ? 'FIN' : formatProgress(bot.currentCheckpointIndex),
          speedKmh: bot.speedKmh,
        });
      });
    } else {
      for (let i = 0; i < 5; i++) {
        entries.push({
          id: `bot_init_${i}`,
          name: fallbackBotNames[i],
          paintHex: fallbackColors[i],
          isPlayer: false,
          score: pScore - (i + 1) * 5,
          cpText: formatProgress(0),
          speedKmh: 0,
        });
      }
    }

    entries.sort((a, b) => b.score - a.score);
    return entries;
  }, [
    activeRaceSession,
    telemetry.x,
    telemetry.z,
    telemetry.speedKmh,
    driverName,
    activeTune.paintHex,
    liveRaceStanding.bots,
    remotePlayers,
    activeMpRaceLobby,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0d12] select-none">
      {/* Hidden File Input for Save Backup JSON Restore */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportSaveFile}
        className="hidden"
      />

      {/* Main 3D Open-World WebGL Viewport — Fills 100% Full Screen Edge-to-Edge */}
      <main className="fixed inset-0 w-screen h-screen overflow-hidden">
        <WorldSceneCanvas
          activeSpec={activeSpec}
          activeTune={activeTune}
          benchmark={benchmark}
          cameraMode={cameraMode}
          lightingPreset="sunset"
          isGarageView={activeOverlay === 'mod_tuning'}
          isPaused={isGamePaused}
          remotePlayers={remotePlayers}
          activeChallenge={activeChallenge}
          activeRaceSession={activeRaceSession}
          trackedDestination={trackedDestination}
          customTrackPoints={customTrackPoints}
          teleportTarget={teleportTarget}
          onTelemetryUpdate={setTelemetry}
          onNetworkBroadcast={handleNetworkBroadcast}
          onLeaderboardEvent={handleLeaderboardEvent}
          onChallengeFinish={handleChallengeFinish}
          onReachRaceCheckpoint={handleReachRaceCheckpoint}
          onReachCustomTrackPoint={handleReachCustomTrackPoint}
          onRaceBotsUpdate={handleRaceBotsUpdate}
          onCollectHorizonToken={handleCollectHorizonToken}
          externalControlsRef={touchControlsRef}
        />
      </main>

      {/* DRIVING HUD OVERLAY (Clean Forza Horizon Layout: Top Middle-Left Settings | Top-Right Forza Map + Main Menu | Bottom Controls & Gauges) */}
      {(activeOverlay === 'none' || activeOverlay === 'telemetry') && (
        <div className="fixed inset-0 z-10 pointer-events-none">
          {/* 1. TOP-LEFT: GEAR SETTINGS BUTTON & DRIVING POV CAMERA TOGGLE */}
          <div className="fixed top-4 left-4 sm:left-6 z-20 pointer-events-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen((prev) => !prev)}
                title="Settings & Controls"
                aria-label="Settings & Controls"
                className="w-11 h-11 rounded-full bg-slate-950/88 hover:bg-slate-900 backdrop-blur-md border border-white/25 hover:border-amber-400 flex items-center justify-center text-white shadow-2xl transition-all cursor-pointer group"
              >
                <Settings
                  className={`w-5 h-5 text-amber-400 transition-transform duration-300 ${
                    settingsOpen ? 'rotate-90' : 'group-hover:rotate-45'
                  }`}
                />
              </button>

              {/* Quick POV Switch Button (Includes Inside-Car Cockpit POV) */}
              <button
                type="button"
                onClick={cycleCameraMode}
                title="Switch Driving POV (Key: C)"
                className="h-10 px-3.5 rounded-full bg-slate-950/85 hover:bg-slate-900 backdrop-blur-md border border-white/20 hover:border-cyan-400 flex items-center gap-1.5 text-[11px] font-display font-bold uppercase tracking-wider text-white shadow-2xl transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  POV:{' '}
                  {cameraMode === 'cockpit'
                    ? 'Inside Car'
                    : cameraMode === 'chase_far'
                    ? 'Far Chase'
                    : cameraMode === 'chase_close'
                    ? 'Close Chase'
                    : 'Hood'}
                </span>
              </button>

              {/* Dynamic Weather & Solar Day-Cycle Live Status Badge (Automatic Only) */}
              <div
                title="Live Automatic Weather & Solar Day/Night Cycle"
                className="h-10 px-3 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/20 flex items-center gap-2 text-[10px] font-mono text-white shadow-2xl select-none"
              >
                <CloudRain className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-bold uppercase tracking-wider text-amber-300">
                    {(telemetry.weatherCondition || 'sunny').toUpperCase()} ·{' '}
                    {telemetry.timeOfDayLabel || '13:00 · DAY'}
                  </span>
                  <span className="text-[9px] text-slate-300">
                    Grip {telemetry.weatherGripPct ?? 100}% · Vis{' '}
                    {telemetry.weatherVisibilityPct ?? 100}% · Pwr{' '}
                    {telemetry.weatherPowerPct ?? 100}%
                  </span>
                </div>
              </div>

              {/* Live Horizon Tokens ('H' Coin) Counter Badge */}
              <button
                type="button"
                onClick={() => setActiveOverlay('horizon_shop')}
                title="Open Horizon Shop (Exchange Horizon Tokens for Wheelspins)"
                className="h-10 px-3 rounded-full bg-slate-950/88 hover:bg-slate-900 backdrop-blur-md border border-amber-400/60 hover:border-amber-300 flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 shadow-2xl cursor-pointer transition-colors"
              >
                <HorizonTokenCoinIcon className="w-4 h-4" />
                <span className="tabular-nums">{horizonTokens} H</span>
              </button>
            </div>

            {/* COMPACT LIVE RACE LEADERBOARD + CANCEL RACE BUTTON RIGHT BESIDE IT */}
            {activeRaceSession && !activeRaceSession.isCompleted && (
              <div className="mt-2 flex items-start gap-1.5">
                {/* Compact Leaderboard Box */}
                <div className="w-40 sm:w-44 bg-slate-950/88 backdrop-blur-md border border-white/20 rounded-xl px-2 py-1.5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1 text-[9px] font-mono">
                    <span className="text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Flag className="w-2.5 h-2.5" />
                      POS {liveRaceStanding.playerPosition}/{liveRaceStanding.totalRacers}
                    </span>
                    <span className="text-cyan-300 tabular-nums">
                      {(activeRaceSession.race.laps ?? 1) > 1
                        ? `LAP ${Math.min(
                            activeRaceSession.race.laps ?? 2,
                            Math.floor(
                              activeRaceSession.currentCheckpointIndex /
                                Math.max(
                                  1,
                                  Math.round(
                                    activeRaceSession.race.checkpoints.length /
                                      (activeRaceSession.race.laps ?? 2)
                                  )
                                )
                            ) + 1
                          )}/${activeRaceSession.race.laps} · CP ${
                            activeRaceSession.currentCheckpointIndex + 1
                          }/${activeRaceSession.race.checkpoints.length}`
                        : `CP ${activeRaceSession.currentCheckpointIndex + 1}/${
                            activeRaceSession.race.checkpoints.length
                          }`}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {activeRaceLeaderboardRows.map((row, idx) => (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between text-[10px] font-mono tabular-nums leading-tight px-1 py-0.5 rounded ${
                          row.isPlayer
                            ? 'bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40'
                            : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="w-3 text-[9px] text-slate-400 shrink-0">
                            {idx + 1}.
                          </span>
                          <span
                            style={{ backgroundColor: row.paintHex }}
                            className="w-1.5 h-1.5 rounded-full shrink-0 border border-white/40"
                          />
                          <span className="truncate">{row.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 ml-1 shrink-0">
                          {row.cpText}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cancel Race Option Right Beside the Leaderboard */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveRaceSession(null);
                  }}
                  title="Cancel Current Race"
                  className="px-2.5 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 backdrop-blur-md border border-red-300/40 text-white font-display text-[10px] font-bold uppercase tracking-wider shadow-xl flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            )}

            {/* Control & Game Settings Popover Panel */}
            {settingsOpen && (
              <div className="mt-2 w-80 sm:w-96 bg-slate-950/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl space-y-3.5 max-h-[84vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="font-display text-sm font-bold text-white">
                    Driving Controls, Save &amp; Settings
                  </span>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    title="Close Settings Window"
                    aria-label="Close Settings Window"
                    className="w-7 h-7 rounded-full bg-white/10 hover:bg-red-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 3 Mobile Steering Control Modes */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-slate-400 block">
                    MOBILE STEERING CONTROL MODE (±90° LOCK)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'wheel', label: '1. Wheel', icon: Disc },
                        { id: 'buttons', label: '2. Buttons', icon: Gamepad2 },
                        { id: 'tilt', label: '3. Tilt/Slide', icon: Smartphone },
                      ] as const
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const active = mobileControlMode === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setMobileControlMode(opt.id)}
                          className={`py-2 px-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                            active
                              ? 'bg-amber-400 text-slate-950 border-white font-semibold'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wheel & Steering Sensitivity Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Wheel Steering Sensitivity</span>
                    <span className="font-mono text-amber-400 font-semibold">
                      {Math.round(steerSensitivity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.3}
                    max={1.1}
                    step={0.05}
                    value={steerSensitivity}
                    onChange={(e) => setSteerSensitivity(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>Smooth / Low (30%)</span>
                    <span>Balanced (65%)</span>
                    <span>Quick (110%)</span>
                  </div>
                </div>

                {/* Automatic Weather & Solar Day/Night Cycle Status (Manual changing removed) */}
                <div className="pt-1 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                      <span>DYNAMIC WEATHER (AUTO)</span>
                    </span>
                    <span className="text-cyan-300 font-bold uppercase">
                      {telemetry.weatherCondition || 'sunny'} · {telemetry.timeOfDayLabel || '13:00 · DAY'}
                    </span>
                  </div>
                </div>

                {/* Quick Toggles: Camera (with Inside-Car Cockpit POV), Audio, Touch Visibility, Fullscreen */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={cycleCameraMode}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-white cursor-pointer"
                  >
                    POV:{' '}
                    {cameraMode === 'cockpit'
                      ? 'Inside Car'
                      : cameraMode === 'chase_far'
                      ? 'Far Chase'
                      : cameraMode === 'chase_close'
                      ? 'Close Chase'
                      : 'Hood Cam'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const muted = engineAudio.toggleMute();
                      setIsAudioMuted(muted);
                    }}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isAudioMuted ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-red-400" />
                        <span>Audio: Muted</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Audio: Realistic</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMobileControls((prev) => !prev)}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-white cursor-pointer"
                  >
                    Touch HUD: {showMobileControls ? 'Visible' : 'Hidden'}
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isFullscreenMode ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Exit Fullscreen</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Fullscreen</span>
                      </>
                    )}
                  </button>
                </div>

                {activeRaceSession && !activeRaceSession.isCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRaceSession(null);
                      setSettingsOpen(false);
                    }}
                    className="w-full py-2 bg-red-500/20 hover:bg-red-500/35 border border-red-400/50 rounded-xl text-xs font-semibold text-red-200 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Exit Current Race ({activeRaceSession.race.name})</span>
                  </button>
                )}

                {/* Open Tutorial Book / Game Guide Anytime from Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setTutorialBookOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-400/20 via-amber-500/15 to-cyan-500/15 hover:from-amber-400/30 hover:to-cyan-500/25 border border-amber-400/60 rounded-xl text-xs font-display font-extrabold uppercase tracking-wider text-amber-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
                >
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>Open Tutorial Book &amp; Game Guide</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleFastTravelCoords(
                      WORLD_POIS[0].x,
                      WORLD_POIS[0].z,
                      WORLD_POIS[0].heading
                    );
                    setSettingsOpen(false);
                  }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Vehicle to Road / Outpost</span>
                </button>

                {/* Save Progress & Backup Section */}
                <div className="pt-2.5 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Auto-Saved ({lastSavedTimeText})
                    </span>
                    <span className="text-slate-400">
                      {Object.keys(completedRaces).length} Races · {careerCredits.toLocaleString()} CR
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Your cars, completed races, and credits auto-save in your browser even after closing the game. You can also save manually or download a backup file:
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => persistGameProgress(true)}
                      className="py-2 px-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 rounded-xl text-[11px] font-semibold text-emerald-300 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSaveFile}
                      className="py-2 px-2 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-[11px] font-medium text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Backup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2 px-2 bg-white/5 hover:bg-white/10 border border-white/15 rounded-xl text-[11px] font-medium text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Restore</span>
                    </button>
                  </div>
                  {saveFeedbackToast && (
                    <div className="text-[11px] font-mono text-center text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-lg py-1 px-2">
                      {saveFeedbackToast}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. TOP-CENTER: FORZA HORIZON OPEN-WORLD EVENT ENTRY PROMPT, ACTIVE RACE CHECKPOINT BANNER, MULTIPLAYER LOBBY & DRIFT CHAIN */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 max-w-md w-full px-4 pointer-events-none">
            {/* Active Race Top-Center Checkpoint & Pathway Guidance Banner */}
            {activeRaceSession &&
              !activeRaceSession.isCompleted &&
              !raceCountdownDisplay &&
              (() => {
                const cpIdx = activeRaceSession.currentCheckpointIndex;
                const cp =
                  activeRaceSession.race.checkpoints[cpIdx] ||
                  activeRaceSession.race.checkpoints[
                    activeRaceSession.race.checkpoints.length - 1
                  ];
                const distToCpM = cp
                  ? Math.round(Math.hypot(cp.x - telemetry.x, cp.z - telemetry.z))
                  : 0;
                const liveElapsedSec = Math.max(
                  0,
                  (Date.now() - activeRaceSession.startTimeMs) / 1000
                );
                return (
                  <div className="pointer-events-auto w-full bg-slate-950/90 backdrop-blur-xl border border-amber-400/70 rounded-2xl px-4 py-2 shadow-2xl flex items-center justify-between gap-3">
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                        <span className="text-amber-400 font-bold">
                          {activeRaceSession.race.name}
                        </span>
                        <span aria-hidden="true" className="text-slate-600">
                          ·
                        </span>
                        <span className="text-cyan-300 font-semibold tabular-nums">
                          {liveElapsedSec.toFixed(1)}s
                        </span>
                      </div>
                      <div className="text-xs font-display font-bold text-white truncate">
                        {cp ? cp.label : 'FINISH LINE'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-cyan-300 tabular-nums">
                          {distToCpM}m
                        </div>
                        <div className="text-[9px] text-slate-400">TO GATE</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
                        }}
                        title="Reset Car onto Race Pathway (Key: R)"
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-amber-400 text-slate-200 hover:text-slate-950 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Reset [R]
                      </button>
                    </div>
                  </div>
                );
              })()}

            {/* Live Synchronized Multiplayer Grand Prix Lobby Invite Banner (2+ Players, Zero AI Bots) */}
            {activeMpRaceLobby &&
              (activeMpRaceLobby.status === 'lobby' ||
                (activeMpRaceLobby.status as string) === 'waiting') &&
              (!activeRaceSession || activeRaceSession.isCompleted) && (
                <div className="relative pointer-events-auto w-full bg-slate-950/95 backdrop-blur-xl border-2 border-cyan-400 rounded-2xl px-5 py-3 shadow-2xl text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => handleCancelMultiplayerRaceLobby(activeMpRaceLobby.id)}
                    title="Close / Cancel Multiplayer Lobby"
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-red-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-[10px] font-mono tracking-widest text-cyan-300 uppercase font-bold">
                    MULTIPLAYER GRAND PRIX LOBBY · ZERO AI BOTS
                  </div>
                  <div className="font-display text-base font-bold text-white">
                    {activeMpRaceLobby.raceName}
                  </div>
                  <div className="text-[11px] font-mono text-amber-300">
                    Host: {activeMpRaceLobby.hostName} · {activeMpRaceLobby.participants.length}{' '}
                    Player{activeMpRaceLobby.participants.length === 1 ? '' : 's'} Ready (
                    {activeMpRaceLobby.participants.join(', ')})
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-0.5">
                    {!activeMpRaceLobby.participants.includes(driverName) ? (
                      <button
                        type="button"
                        onClick={() => handleJoinMultiplayerRace(activeMpRaceLobby)}
                        className="px-4 py-1.5 text-xs font-display font-bold uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg cursor-pointer shadow-lg"
                      >
                        Join &amp; Teleport to Grid
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLaunchMultiplayerRaceCountdown(activeMpRaceLobby.id)}
                        className="px-4 py-1.5 text-xs font-display font-bold uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg cursor-pointer shadow-lg"
                      >
                        Launch Race Countdown (3-2-1-GO!)
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* Open-World Event Start Gate Prompt (When player drives to an event on the map) */}
            {nearbyWorldRace &&
              (!activeRaceSession || activeRaceSession.isCompleted) &&
              dismissedEventGateId !== nearbyWorldRace.id && (
                <div className="relative pointer-events-auto bg-slate-950/92 backdrop-blur-xl border-2 border-pink-500 rounded-2xl px-6 py-3.5 shadow-2xl text-center space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setDismissedEventGateId(nearbyWorldRace.id)}
                    title="Close Event Window"
                    aria-label="Close Event Window"
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-red-500 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-[10px] font-mono tracking-widest text-pink-400 uppercase font-bold pr-4">
                    {nearbyWorldRace.biome} · {nearbyWorldRace.discipline}
                  </div>
                  <div className="font-display text-base font-bold text-white">
                    {nearbyWorldRace.name}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 font-bold">
                      Difficulty Level {nearbyWorldRace.difficultyLevel ?? 2} / 4 ·{' '}
                      {'★'.repeat(nearbyWorldRace.difficultyLevel ?? 2)}
                      {'☆'.repeat(4 - (nearbyWorldRace.difficultyLevel ?? 2))}
                    </span>
                    {(nearbyWorldRace.laps ?? 1) > 1 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 font-bold">
                        {nearbyWorldRace.laps} Laps
                      </span>
                    )}
                    {nearbyWorldRace.isMultiplayerRace && (
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 font-bold">
                        2+ Players · No Bots
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleStartRaceEvent(nearbyWorldRace)}
                      className="px-5 py-1.5 text-xs font-display font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer shadow-lg"
                    >
                      {nearbyWorldRace.isMultiplayerRace && remotePlayers.length > 0
                        ? activeMpRaceLobby &&
                          activeMpRaceLobby.raceId === nearbyWorldRace.id &&
                          (activeMpRaceLobby.status === 'lobby' ||
                            (activeMpRaceLobby.status as string) === 'waiting')
                          ? activeMpRaceLobby.participants.includes(driverName)
                            ? 'Launch Countdown [E]'
                            : 'Join Multiplayer Lobby [E]'
                          : 'Host Multiplayer Race [E]'
                        : 'Start Race [E]'}
                    </button>
                  </div>
                </div>
              )}

            {/* Post-Race Finish Window (Rendered as a full-screen pause modal below) */}

            {telemetry.activeDriftScore > 0 && (
              <div className="bg-black/70 backdrop-blur-md border border-amber-400/50 rounded-xl px-5 py-2 text-center shadow-lg">
                <div className="text-[10px] font-mono text-amber-300">
                  DRIFT SKILL CHAIN · {Math.abs(telemetry.slipAngleDeg).toFixed(0)}° ANGLE
                </div>
                <div className="font-display text-xl font-bold text-white font-mono tabular-nums">
                  +{telemetry.activeDriftScore.toLocaleString()} PTS
                </div>
              </div>
            )}

            {stuntBanner && (
              <div className="relative pointer-events-auto bg-black/80 backdrop-blur-md border border-cyan-400/60 rounded-xl px-6 py-2.5 text-center shadow-xl">
                <button
                  type="button"
                  onClick={() => setStuntBanner(null)}
                  title="Close Banner"
                  aria-label="Close Banner"
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/10 hover:bg-red-500 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="text-xs font-semibold text-cyan-300">{stuntBanner.title}</div>
                <div className="font-display text-xl font-bold text-white font-mono tabular-nums">
                  {stuntBanner.valueText}
                </div>
              </div>
            )}

            {tokenCollectToast !== null && (
              <div className="bg-amber-950/90 backdrop-blur-md border-2 border-amber-400 rounded-2xl px-5 py-2 text-center shadow-2xl flex items-center gap-2.5">
                <HorizonTokenCoinIcon className="w-6 h-6" />
                <div className="text-left">
                  <div className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-amber-300">
                    +1 HORIZON TOKEN COLLECTED!
                  </div>
                  <div className="font-display text-sm font-black text-white font-mono tabular-nums">
                    Total Balance: {tokenCollectToast} H Tokens
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2B. CENTER-SCREEN 3... 2... 1... GO! PRE-RACE COUNTDOWN OVERLAY */}
          {raceCountdownDisplay && activeRaceSession && !activeRaceSession.isCompleted && (
            <div className="fixed inset-0 z-30 flex flex-col items-center justify-center pointer-events-none select-none">
              <div className="bg-slate-950/85 backdrop-blur-xl border-2 border-amber-400/80 rounded-3xl px-12 py-6 text-center shadow-[0_0_80px_rgba(251,191,36,0.45)] animate-pulse">
                <div className="text-[11px] font-mono tracking-widest uppercase text-slate-300 mb-1">
                  {activeRaceSession.race.name} · DIFFICULTY LEVEL{' '}
                  {activeRaceSession.race.difficultyLevel ?? 2}/4
                </div>
                <div
                  className={`font-display text-7xl sm:text-8xl font-black tracking-tight drop-shadow-[0_0_30px_rgba(251,191,36,0.8)] ${
                    raceCountdownDisplay === 'GO!' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {raceCountdownDisplay}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 mt-2">
                  {raceCountdownDisplay === 'GO!'
                    ? 'FULL THROTTLE — STAY WITHIN RACE BOUNDARIES!'
                    : 'STARTING GRID LOCKED · HOLD THROTTLE TO REV ENGINE'}
                </div>
              </div>
            </div>
          )}

          {/* 3. TOP-RIGHT: "MAIN MENU" BUTTON TO THE LEFT OF FORZA HORIZON CIRCULAR MAP LOCATOR */}
          <div className="fixed top-4 right-4 z-20 pointer-events-auto flex items-start gap-2.5">
            {/* MAIN MENU SYMBOL BUTTON DIRECTLY TO THE LEFT OF THE MINI-MAP (SYMBOL ONLY) */}
            <button
              type="button"
              onClick={() => setActiveOverlay('main_menu')}
              title="Main Menu"
              aria-label="Main Menu"
              className="w-11 h-11 bg-slate-950/90 hover:bg-amber-400 text-white hover:text-slate-950 backdrop-blur-md border border-white/25 hover:border-amber-300 rounded-full flex items-center justify-center shadow-2xl transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Forza Horizon Circular GPS Radar Locator (Map rotates so Player Cursor ALWAYS faces at the top!) */}
            <button
              type="button"
              onClick={() => setActiveOverlay('map')}
              title="Open Forza Horizon World Map (M)"
              className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#091e2c] border-[3px] border-white/35 hover:border-pink-500 shadow-[0_12px_35px_rgba(0,0,0,0.85)] overflow-hidden transition-colors cursor-pointer group"
            >
              {/* Rotating World Layer: Rotates by -playerRadarDeg around (50%, 50%) so car travel direction is always at the TOP */}
              <div
                style={{
                  transform: `rotate(${-playerRadarDeg}deg)`,
                }}
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                {/* Live Scrolling Satellite & Topographic Terrain Map Centered on Player */}
                {satelliteMapUrl && (
                  <img
                    src={satelliteMapUrl}
                    alt=""
                    draggable={false}
                    style={{
                      left: '50%',
                      top: '50%',
                      width: '800%',
                      height: '800%',
                      maxWidth: 'none',
                      transform: `translate(${-((telemetry.x + 6400) / 12800) * 100}%, ${
                        -((telemetry.z + 6400) / 12800) * 100
                      }%)`,
                    }}
                    className="absolute pointer-events-none select-none object-cover"
                  />
                )}

                {/* Full Race Route OR Road-Following GPS Line on Player-Centered Rotating Radar */}
                <svg viewBox="0 0 840 840" className="relative z-10 w-full h-full">
                  {/* Full Race Route on Radar during an active race */}
                  {activeRaceFullRoute && activeRaceFullRoute.length > 1 && (
                    <>
                      <polyline
                        points={activeRaceFullRoute
                          .map((pt) => {
                            const px = 420 + (pt.x - telemetry.x) * 0.525;
                            const pz = 420 + (pt.z - telemetry.z) * 0.525;
                            return `${px.toFixed(1)},${pz.toFixed(1)}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="rgba(0, 0, 0, 0.8)"
                        strokeWidth="22"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points={activeRaceFullRoute
                          .map((pt) => {
                            const px = 420 + (pt.x - telemetry.x) * 0.525;
                            const pz = 420 + (pt.z - telemetry.z) * 0.525;
                            return `${px.toFixed(1)},${pz.toFixed(1)}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#FBBF24"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {activeRaceSession?.race.checkpoints.map((cp, idx) => {
                        const cpx = 420 + (cp.x - telemetry.x) * 0.525;
                        const cpz = 420 + (cp.z - telemetry.z) * 0.525;
                        return (
                          <circle
                            key={`radar_cp_${idx}`}
                            cx={cpx}
                            cy={cpz}
                            r="11"
                            fill={
                              idx === activeRaceSession.currentCheckpointIndex
                                ? '#00F0FF'
                                : '#0F172A'
                            }
                            stroke="#FFFFFF"
                            strokeWidth="4"
                          />
                        );
                      })}
                      {/* Live AI Race Bots on Radar during an active race */}
                      {liveRaceStanding.bots.map((bot) => {
                        const bx = 420 + (bot.x - telemetry.x) * 0.525;
                        const bz = 420 + (bot.z - telemetry.z) * 0.525;
                        return (
                          <circle
                            key={`radar_bot_${bot.id}`}
                            cx={bx}
                            cy={bz}
                            r="9"
                            fill={bot.paintHex || '#EF4444'}
                            stroke="#FFFFFF"
                            strokeWidth="3"
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Free-Roam Road-Following GPS Line */}
                  {!activeRaceFullRoute &&
                    activeGpsRoadRoute &&
                    activeGpsRoadRoute.points.length > 1 && (
                      <>
                        <polyline
                          points={activeGpsRoadRoute.points
                            .map((pt, idx) => {
                              const px = idx === 0 ? 420 : 420 + (pt.x - telemetry.x) * 0.525;
                              const pz = idx === 0 ? 420 : 420 + (pt.z - telemetry.z) * 0.525;
                              return `${px.toFixed(1)},${pz.toFixed(1)}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke="#00F0FF"
                          strokeWidth="22"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.35"
                        />
                        <polyline
                          points={activeGpsRoadRoute.points
                            .map((pt, idx) => {
                              const px = idx === 0 ? 420 : 420 + (pt.x - telemetry.x) * 0.525;
                              const pz = idx === 0 ? 420 : 420 + (pt.z - telemetry.z) * 0.525;
                              return `${px.toFixed(1)},${pz.toFixed(1)}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke="#00F0FF"
                          strokeWidth="11"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}
                </svg>

                {/* Forza Horizon Colorful Race Event Badges on Player-Centered Radar (Hidden during active race) */}
                {(!activeRaceSession || activeRaceSession.isCompleted) &&
                  WORLD_RACES.map((race) => {
                    const rx = 50 + ((race.startX - telemetry.x) / 1600) * 100;
                    const rz = 50 + ((race.startZ - telemetry.z) / 1600) * 100;
                    if (rx < 6 || rx > 94 || rz < 6 || rz > 94) return null;
                    const badgeColor =
                      race.discipline === 'Off-Road Rally'
                        ? 'bg-orange-500'
                        : race.discipline === 'Touge Drift'
                        ? 'bg-purple-500 rotate-45'
                        : race.discipline === 'Drag Showdown'
                        ? 'bg-pink-500'
                        : 'bg-sky-500';
                    return (
                      <span
                        key={race.id}
                        style={{
                          left: `${rx}%`,
                          top: `${rz}%`,
                        }}
                        className={`absolute z-10 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-sm ${badgeColor} border border-white shadow`}
                      />
                    );
                  })}

                {/* Custom Track Points on Radar */}
                {customTrackPoints.map((pt) => (
                  <span
                    key={pt.id}
                    style={{
                      left: `${Math.max(8, Math.min(92, 50 + ((pt.x - telemetry.x) / 1600) * 100))}%`,
                      top: `${Math.max(8, Math.min(92, 50 + ((pt.z - telemetry.z) / 1600) * 100))}%`,
                    }}
                    className="absolute z-10 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 border border-white"
                  />
                ))}

                {/* Active GPS Destination Beacon on Radar (Radially clamped inside circle) */}
                {gpsTargetCoords && (() => {
                  const dxPct = ((gpsTargetCoords.x - telemetry.x) / 1600) * 100;
                  const dzPct = ((gpsTargetCoords.z - telemetry.z) / 1600) * 100;
                  const rPct = Math.hypot(dxPct, dzPct);
                  const clampScale = rPct > 42 ? 42 / rPct : 1;
                  return (
                    <span
                      style={{
                        left: `${50 + dxPct * clampScale}%`,
                        top: `${50 + dzPct * clampScale}%`,
                      }}
                      className="absolute z-10 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 border border-white animate-pulse shadow-[0_0_8px_#00F0FF]"
                    />
                  );
                })()}

                {/* Live Human Multiplayer Drivers on Radar (Radially clamped inside circular mini-map so 2+ players ALWAYS see each other as glowing dots!) */}
                {remotePlayers.map((rp) => {
                  const dxPct = ((rp.x - telemetry.x) / 1600) * 100;
                  const dzPct = ((rp.z - telemetry.z) / 1600) * 100;
                  const rPct = Math.hypot(dxPct, dzPct);
                  const clampScale = rPct > 40 ? 40 / rPct : 1;
                  return (
                    <div
                      key={rp.id}
                      style={{
                        left: `${50 + dxPct * clampScale}%`,
                        top: `${50 + dzPct * clampScale}%`,
                      }}
                      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                    >
                      <span className="absolute w-5 h-5 rounded-full bg-emerald-400/50 animate-ping" />
                      <span
                        style={{
                          backgroundColor: rp.paintHex || '#10b981',
                        }}
                        className="relative w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ring-emerald-400 shadow-[0_0_10px_#10b981]"
                      />
                      <span
                        style={{
                          transform: `rotate(${playerRadarDeg}deg)`,
                        }}
                        className="absolute -top-4 px-1 py-0.2 rounded bg-slate-950/90 border border-emerald-400/60 text-[7px] font-mono font-bold text-emerald-300 whitespace-nowrap shadow"
                      >
                        {rp.driverName.slice(0, 10)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Forza Horizon Directional Player Chevron Arrow (Always Faces UP at Top of Radar!) */}
              <div
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-20 w-4 h-4 flex items-center justify-center pointer-events-none"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <polygon
                    points="12,2 21,21 12,16 3,21"
                    fill="#FFFFFF"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Dynamic North Cardinal Badge Orbiting Rim */}
              <div
                style={{
                  transform: `rotate(${-playerRadarDeg}deg)`,
                }}
                className="absolute inset-0 z-20 pointer-events-none"
              >
                <span
                  style={{
                    transform: `translateX(-50%) rotate(${playerRadarDeg}deg)`,
                  }}
                  className="absolute top-1 left-1/2 px-1.5 py-0.2 bg-slate-950/90 border border-white/20 rounded text-[9px] font-display font-bold text-amber-400"
                >
                  N
                </span>
              </div>

              {/* Forza Horizon Bottom Rim Readout */}
              <div className="absolute bottom-1.5 inset-x-3 z-20 bg-slate-950/90 border border-white/15 rounded-full px-2 py-0.5 flex items-center justify-center gap-1 text-[10px] font-mono tabular-nums text-white">
                <Navigation className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                <span className="truncate">
                  {activeRaceSession && !activeRaceSession.isCompleted
                    ? `POS ${liveRaceStanding.playerPosition}/${liveRaceStanding.totalRacers}`
                    : gpsDistanceM !== null
                    ? `${gpsDistanceM}m`
                    : telemetry.zoneName.split(' ')[0]}
                </span>
              </div>
            </button>
          </div>

          {/* 5. MOBILE 3-OPTION TOUCH CONTROLS (Left Steering + Right Pedals — Anchored Bottom-Left & Bottom-Right, 100% Visible) */}
          {showMobileControls && activeOverlay === 'none' && (
            <MobileTouchControls
              controlMode={mobileControlMode}
              touchControlsRef={touchControlsRef}
              isManualTransmission={activeTune.transmissionMode === 'Manual'}
            />
          )}

          {/* 6. BOTTOM-CENTER: ULTRA-SHORT COMPACT SPEEDOMETER & RPM PANEL + NITRO LINE BAR BELOW */}
          <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-10 pointer-events-auto w-[112px] sm:w-[122px] bg-slate-950/88 backdrop-blur-md border border-white/15 rounded-xl px-2 py-1 flex flex-col items-center gap-0.5 shadow-2xl">
            <div className="flex items-center justify-between w-full gap-1">
              {/* Dual Concentric RPM + Speedometer Compact Ring */}
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  {/* Outer RPM Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${arcMax} 302`}
                    transform="rotate(135 60 60)"
                  />
                  {/* Redline Zone */}
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="rgba(239,68,68,0.45)"
                    strokeWidth="8"
                    strokeDashoffset={-arcMax * redlineRatio}
                    strokeDasharray={`${arcMax * (1 - redlineRatio)} 302`}
                    transform="rotate(135 60 60)"
                  />
                  {/* Active RPM Sweep */}
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={isNearRedline ? '#EF4444' : '#F59E0B'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${rpmRatio * arcMax} 302`}
                    transform="rotate(135 60 60)"
                    className="transition-[stroke-dasharray,stroke] duration-75 ease-out"
                  />
                  {/* Inner Speed Sweep */}
                  <circle
                    cx="60"
                    cy="60"
                    r="39"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${arcMax * 0.75} 302`}
                    transform="rotate(135 60 60)"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="39"
                    fill="none"
                    stroke={isHighSpeedVelocity ? '#F59E0B' : '#06B6D4'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${speedRatio * arcMax * 0.75} 302`}
                    transform="rotate(135 60 60)"
                    className="transition-[stroke-dasharray,stroke] duration-75 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`font-display text-xs sm:text-sm font-bold leading-none ${
                      isNearRedline ? 'text-red-400' : 'text-amber-400'
                    }`}
                  >
                    {telemetry.gear === -1 ? 'R' : telemetry.gear === 0 ? 'N' : telemetry.gear}
                  </span>
                  <span className="text-[6px] font-mono tabular-nums text-slate-400">
                    {(telemetry.rpm / 1000).toFixed(1)}k
                  </span>
                </div>
              </div>

              {/* Compact Digital Speed Readout */}
              <div className="flex flex-col items-end justify-center min-w-0 pr-0.5">
                <span
                  className={`font-display text-base sm:text-lg font-bold leading-none font-mono tabular-nums tracking-tight ${
                    isHighSpeedVelocity ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  {String(telemetry.speedKmh).padStart(3, '0')}
                </span>
                <span className="text-[7px] font-mono text-cyan-300 uppercase">KM/H</span>
              </div>
            </div>

            {/* Short Limited & Slowly Refilling Nitro Line Bar Below Speedometer */}
            <div className="w-full space-y-0.5">
              <div className="flex items-center justify-between text-[6px] font-mono tabular-nums leading-none">
                <span className={telemetry.nitroActive ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                  NOS
                </span>
                <span className="text-cyan-300 font-semibold">{Math.round(telemetry.nitroPct)}%</span>
              </div>
              <div className="w-full h-1 bg-slate-900 border border-white/10 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.max(0, Math.min(100, telemetry.nitroPct))}%` }}
                  className={`h-full rounded-full transition-all duration-75 ${
                    telemetry.nitroActive
                      ? 'bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 shadow-[0_0_6px_#38bdf8]'
                      : telemetry.nitroPct < 25
                      ? 'bg-amber-400'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OPENING GAME ANIMATION -> "APEX HORIZONS" TITLE & FIRST-TIME USERNAME POPUP / START BUTTON */}
      {activeOverlay === 'intro_title' && (
        <IntroTitleAnimationModal
          isFirstTimeUser={!hasCompletedUsernameSetup}
          initialDriverName={driverName}
          onConfirmFirstTimeUsername={handleUpdateDriverName}
          onStartGame={() => {
            enterFullscreenAndLandscape();
            engineAudio.playIgnitionStartup();
            setIsAudioMuted(false);
            setActiveOverlay('none');
            if (!hasSeenTutorialBook) {
              setTutorialBookOpen(true);
            }
          }}
        />
      )}

      {/* TUTORIAL BOOK MODAL (Pops up automatically the first time after starting the game, and accessible anytime from Settings) */}
      {tutorialBookOpen && (
        <TutorialBookModal
          driverName={driverName}
          onClose={handleCloseTutorialBook}
        />
      )}

      {/* PRE-RACE CAR SELECTION WINDOW (Appears when player selects Start Race: All Owned Cars + Recommended Cars) */}
      {pendingRaceForCarSelect && (
        <RaceCarSelectModal
          race={pendingRaceForCarSelect}
          ownedVehicleIds={ownedVehicleIds}
          activeVehicleId={activeSpec.id}
          customTunesByVehicle={customTunes}
          onConfirmRaceWithCar={handleConfirmRaceWithCar}
          onClose={() => setPendingRaceForCarSelect(null)}
        />
      )}

      {/* POST-RACE FINISH WINDOW (Scrollable with pinned bottom Continue Game button so it's always accessible!) */}
      {licenseEarnedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 backdrop-blur-xl p-3 sm:p-5 pointer-events-auto overflow-y-auto">
          <div className="relative max-w-lg w-full max-h-[92vh] bg-slate-900/95 border-2 border-amber-400 rounded-3xl text-center shadow-[0_0_60px_rgba(245,158,11,0.28)] flex flex-col overflow-hidden my-auto">
            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 font-mono text-xs font-semibold uppercase tracking-widest">
                <Award className="w-4 h-4 text-amber-400" />
                <span>
                  {licenseEarnedModal.isMultiplayerRace
                    ? 'Multiplayer Grand Prix Finished'
                    : 'Apex Horizons Race Finished'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  {licenseEarnedModal.raceName} · {licenseEarnedModal.finalTimeSec.toFixed(2)}s
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase">
                  YOU FINISHED {formatOrdinalPosition(licenseEarnedModal.playerPosition)}
                </h2>
              </div>

              {/* Credits Earned Display with 'C' horizontal-line currency symbol */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-400/40 shadow-inner space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                  Race Payout ({licenseEarnedModal.isMultiplayerRace ? '20,000 – 100,000' : '15,000 – 70,000'} Credits)
                </div>
                <div className="flex items-center justify-center gap-2.5 text-2xl sm:text-3xl font-display font-extrabold text-emerald-400 font-mono tabular-nums">
                  <span>+</span>
                  <CreditCurrencySymbol className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" />
                  <span>{licenseEarnedModal.creditsEarned.toLocaleString()} credits</span>
                </div>
                <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                  <div className="bg-white/[0.04] rounded-lg py-1.5 px-2">
                    <div className="text-[9px] text-slate-400 uppercase">Position</div>
                    <div className="font-bold text-amber-300">
                      {formatOrdinalPosition(licenseEarnedModal.playerPosition)} / {licenseEarnedModal.totalRacers}
                    </div>
                  </div>
                  <div className="bg-white/[0.04] rounded-lg py-1.5 px-2">
                    <div className="text-[9px] text-slate-400 uppercase">Difficulty</div>
                    <div className="font-bold text-cyan-300 truncate">
                      {licenseEarnedModal.difficultyLabel.split(' ')[0]}
                    </div>
                  </div>
                  <div className="bg-white/[0.04] rounded-lg py-1.5 px-2">
                    <div className="text-[9px] text-slate-400 uppercase">Race Length</div>
                    <div className="font-bold text-emerald-300">
                      {licenseEarnedModal.distanceKm.toFixed(1)} KM
                    </div>
                  </div>
                </div>
                <div className="pt-1 text-xs font-mono text-slate-300 flex items-center justify-center gap-1.5">
                  <span>Total Balance:</span>
                  <CreditCurrencySymbol className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-amber-300 tabular-nums">
                    {careerCredits.toLocaleString()} credits
                  </span>
                </div>

                {/* Race XP & Level 1-100 Progress Summary */}
                <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-cyan-400/40 text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-extrabold">
                      +{licenseEarnedModal.xpEarned.toLocaleString()} RACE XP
                    </span>
                    <span className="text-amber-300 font-extrabold">
                      LEVEL {levelProgress.level} / {MAX_PLAYER_LEVEL}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      style={{ width: `${levelProgress.progressPct}%` }}
                      className="h-full bg-gradient-to-r from-cyan-400 to-amber-400"
                    />
                  </div>
                </div>

                {/* Level-Up Wheelspin / Every-5th-Level Super Wheelspin Reward Banner */}
                {licenseEarnedModal.newLevel > licenseEarnedModal.oldLevel && (
                  <div className="mt-2 py-2 px-3 rounded-xl bg-amber-400/20 border-2 border-amber-400 text-amber-200 font-mono text-xs font-extrabold space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>
                        LEVEL UP! (LVL {licenseEarnedModal.oldLevel} → LVL {licenseEarnedModal.newLevel})
                      </span>
                    </div>
                    <div className="text-[11px] text-white">
                      {licenseEarnedModal.superSpinsFromLevelUp > 0 &&
                        `+${licenseEarnedModal.superSpinsFromLevelUp} SUPER WHEELSPIN (5th Level Milestone!) `}
                      {licenseEarnedModal.normalSpinsFromLevelUp > 0 &&
                        `+${licenseEarnedModal.normalSpinsFromLevelUp} WHEELSPIN`}
                    </div>
                  </div>
                )}

                {licenseEarnedModal.wonWheelspin && (
                  <div className="mt-2 py-1.5 px-3 rounded-xl bg-purple-500/20 border border-purple-400 text-purple-200 font-mono text-xs font-extrabold flex items-center justify-center gap-1.5 animate-pulse">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <span>+1 BONUS WHEELSPIN EARNED! (10% Post-Race Drop)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Bottom Footer: Primary Option to Continue the Game is ALWAYS visible */}
            <div className="shrink-0 p-4 sm:px-6 bg-slate-950/95 border-t border-white/15 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setLicenseEarnedModal(null);
                  setActiveRaceSession((prev) => (prev?.isCompleted ? null : prev));
                }}
                className="w-full py-3 px-6 text-sm sm:text-base font-display font-bold uppercase tracking-wider text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-2xl cursor-pointer shadow-lg transition-colors"
              >
                Continue Game
              </button>

              <div className="flex items-center justify-center gap-2.5">
                {activeRaceSession?.race && (
                  <button
                    type="button"
                    onClick={() => {
                      const raceToReplay = activeRaceSession.race;
                      setLicenseEarnedModal(null);
                      setActiveRaceSession(null);
                      setTimeout(() => handleStartRaceEvent(raceToReplay), 20);
                    }}
                    className="flex-1 py-2 px-4 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl cursor-pointer transition-colors"
                  >
                    Race Again
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLicenseEarnedModal(null);
                    setActiveRaceSession((prev) => (prev?.isCompleted ? null : prev));
                    setActiveOverlay('map');
                  }}
                  className="flex-1 py-2 px-4 text-xs font-semibold text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-400/30 rounded-xl cursor-pointer transition-colors"
                >
                  Open World Map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN MENU HUB (Opened from the Main Menu button — Pauses the Game & Displays the 6 Core Windows) */}
      {activeOverlay === 'main_menu' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center bg-slate-950/92 backdrop-blur-xl px-4 pt-20 pb-6 sm:px-6 sm:pt-22 sm:pb-6 overflow-y-auto animate-window-enter">
          {/* Top-Left Player Credits & Horizon Tokens Badges visible immediately when Main Menu is opened */}
          <div className="fixed top-3 left-4 sm:top-4 sm:left-6 z-50 flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-900/95 border-2 border-amber-400/80 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-2.5">
              <CreditCurrencySymbol className="w-6 h-6 text-amber-400" />
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 leading-none">
                  Player Credits
                </div>
                <div className="font-display text-base sm:text-lg font-extrabold text-amber-300 font-mono tabular-nums leading-tight mt-0.5">
                  {careerCredits.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/95 border-2 border-yellow-400/80 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-2.5">
              <HorizonTokenCoinIcon className="w-6 h-6" />
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-amber-300 leading-none">
                  Horizon Tokens
                </div>
                <div className="font-display text-base sm:text-lg font-extrabold text-white font-mono tabular-nums leading-tight mt-0.5">
                  {horizonTokens.toLocaleString()} H
                </div>
              </div>
            </div>
          </div>

          {/* Top-Right Cross Button to Remove/Close the Main Menu */}
          <button
            type="button"
            onClick={() => setActiveOverlay('none')}
            title="Close Main Menu"
            aria-label="Close Main Menu"
            className="fixed top-3 right-4 sm:top-4 sm:right-6 z-50 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-900/95 hover:bg-red-500 text-white border-2 border-white/30 hover:border-red-300 flex items-center justify-center shadow-2xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative max-w-5xl w-full my-auto bg-slate-900/90 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-menu-card-enter">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tracking-widest text-amber-400 uppercase">
                    APEX HORIZONS
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                    Game Paused
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">
                  Main Menu
                </h2>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveOverlay('none')}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl cursor-pointer"
                >
                  Resume Driving
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOverlay('none')}
                  title="Close Main Menu"
                  aria-label="Close Main Menu"
                  className="w-9 h-9 rounded-full bg-slate-950 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center shadow-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 6 Forza Horizon Style Main Menu Windows (1. Buy and Sell Cars at Top-Left) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Buy and Sell Cars */}
              <button
                type="button"
                onClick={() => setActiveOverlay('buy_sell')}
                className="group p-4 sm:p-5 text-left bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 hover:from-amber-500/30 border-2 border-amber-400/60 hover:border-amber-400 rounded-2xl transition-all cursor-pointer space-y-2.5 shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider text-right">
                    {VEHICLES.length} Cars · 50K – 8M
                  </span>
                </div>
                <div className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  1. Buy and Sell Cars
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Browse all {VEHICLES.length} vehicles alphabetically by brand. Buy new cars or sell owned cars for 20% less than buy value.
                </p>
              </button>

              {/* 2. My Garage */}
              <button
                type="button"
                onClick={() => setActiveOverlay('my_garage')}
                className="group p-4 sm:p-5 text-left bg-gradient-to-br from-cyan-500/15 via-slate-900 to-slate-950 hover:from-cyan-500/25 border-2 border-cyan-400/45 hover:border-cyan-400 rounded-2xl transition-all cursor-pointer space-y-2.5 shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                    {ownedVehicleIds.length} Owned
                  </span>
                </div>
                <div className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  2. My Garage
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  View and manage your personal collection of owned vehicles and select any car to drive immediately.
                </p>
              </button>

              {/* 3. Modification and Tuning */}
              <button
                type="button"
                onClick={() => setActiveOverlay('mod_tuning')}
                className="group p-4 sm:p-5 text-left bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-950 hover:from-emerald-500/25 border-2 border-emerald-400/45 hover:border-emerald-400 rounded-2xl transition-all cursor-pointer space-y-2.5 shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                    Custom Builds
                  </span>
                </div>
                <div className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  3. Modification and Tuning
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upgrade performance parts, aero, tires, gearing, and custom tuning setups.
                </p>
              </button>

              {/* 4. Wheelspins */}
              <button
                type="button"
                onClick={() => setActiveOverlay('wheelspins')}
                className="group p-4 sm:p-5 text-left bg-gradient-to-br from-purple-500/15 via-slate-900 to-slate-950 hover:from-purple-500/25 border-2 border-purple-400/45 hover:border-purple-400 rounded-2xl transition-all cursor-pointer space-y-2.5 shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-purple-400/20 border border-purple-400/40 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider">
                    {wheelspinsCount} Spins · {superWheelspinsCount} Super
                  </span>
                </div>
                <div className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  4. Wheelspins
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Spin for bonus credits, rare hypercars, and special festival rewards. Owned duplicate cars auto-sell at 20% less than market.
                </p>
              </button>

              {/* 5. Player's Profile (Level 1 to 100 XP & Wheelspin/Super Wheelspin Milestones) */}
              <button
                type="button"
                onClick={() => setActiveOverlay('player_profile')}
                className="group p-4 sm:p-5 text-left bg-gradient-to-br from-pink-500/15 via-slate-900 to-slate-950 hover:from-pink-500/25 border-2 border-pink-400/45 hover:border-pink-400 rounded-2xl transition-all cursor-pointer space-y-2.5 shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-pink-400/20 border border-pink-400/40 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-950/90 border border-pink-400/50 text-pink-300 font-mono text-[11px] font-bold truncate max-w-[110px]">
                      {driverName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono text-[11px] font-black uppercase tracking-wider shrink-0">
                      LVL {levelProgress.level}
                    </span>
                  </div>
                </div>
                <div className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  5. Player&apos;s Profile
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Change your driver username anytime, view Level 1 – 100 race XP progression, and claim level-up Wheelspin &amp; Super Wheelspin rewards.
                </p>
              </button>

              {/* 6. Horizon Shop (Buy Wheelspins & Super Wheelspins with Horizon Tokens) */}
              <button
                type="button"
                onClick={() => setActiveOverlay('horizon_shop')}
                className="group p-4 sm:p-5 text-left bg-gradient-to-br from-yellow-500/20 via-slate-900 to-slate-950 hover:from-yellow-500/30 border-2 border-yellow-400/60 hover:border-yellow-300 rounded-2xl transition-all cursor-pointer space-y-2.5 shadow-xl"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-yellow-300 group-hover:scale-110 transition-transform shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-950 border border-yellow-400/60 font-mono text-[11px] font-black text-yellow-300 uppercase tracking-wider">
                    <HorizonTokenCoinIcon className="w-3.5 h-3.5" />
                    <span>{horizonTokens} H Tokens</span>
                  </span>
                </div>
                <div className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  6. Horizon Shop
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Exchange map &lsquo;H&rsquo; Coins for unlimited Wheelspins (8 Tokens) &amp; Super Wheelspins (20 Tokens).
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINDOW 1: BUY AND SELL CARS (FORZA HORIZON 5 HORIZONTAL AUTOSHOW — ALL 260 CARS ALPHABETICALLY BY BRAND) */}
      {activeOverlay === 'buy_sell' && (
        <AutoshowBuySellModal
          key="window_buy_sell"
          careerCredits={careerCredits}
          ownedVehicleIds={ownedVehicleIds}
          activeVehicleId={activeSpec.id}
          customTunesByVehicle={customTunes}
          onBuyVehicle={handleBuyVehicle}
          onSellVehicle={handleSellVehicle}
          onSelectVehicle={(spec) => setActiveVehicleId(spec.id)}
          onClose={() => setActiveOverlay('main_menu')}
        />
      )}

      {/* WINDOW 2: MY GARAGE (ONLY OWNED CARS + LEFT-SIDE POP-UP + 'DRIVE NOW' RESUMES GAME) */}
      {activeOverlay === 'my_garage' && (
        <AutoshowBuySellModal
          key="window_my_garage"
          mode="my_garage"
          careerCredits={careerCredits}
          ownedVehicleIds={ownedVehicleIds}
          activeVehicleId={activeSpec.id}
          customTunesByVehicle={customTunes}
          onBuyVehicle={handleBuyVehicle}
          onSellVehicle={handleSellVehicle}
          onSelectVehicle={(spec) => setActiveVehicleId(spec.id)}
          onDriveNow={(spec) => {
            setActiveVehicleId(spec.id);
            setActiveOverlay('none');
          }}
          onClose={() => setActiveOverlay('main_menu')}
        />
      )}

      {/* WINDOW 3: MODIFICATION AND TUNING (FORZA HORIZON 5 UPGRADE SHOP + LEFT POP-UP + MIDDLE-RIGHT CART) */}
      {activeOverlay === 'mod_tuning' && (
        <ModificationTuningModal
          activeSpec={activeSpec}
          activeTune={activeTune}
          careerCredits={careerCredits}
          ownedVehicleIds={ownedVehicleIds}
          customTunesByVehicle={customTunes}
          onSelectVehicle={(id) => setActiveVehicleId(id)}
          onPurchaseCartTune={(newTune, totalCost) => {
            setCareerCredits((prev) => Math.max(0, prev - totalCost));
            setCustomTunes((prev) => ({
              ...prev,
              [activeSpec.id]: newTune,
            }));
          }}
          onClose={() => setActiveOverlay('main_menu')}
        />
      )}

      {/* WINDOW 4: WHEELSPINS & SUPER WHEELSPINS (FORZA HORIZON 5 60FPS REELS) */}
      {activeOverlay === 'wheelspins' && (
        <WheelspinModal
          careerCredits={careerCredits}
          wheelspinsCount={wheelspinsCount}
          superWheelspinsCount={superWheelspinsCount}
          ownedVehicleIds={ownedVehicleIds}
          customTunesByVehicle={customTunes}
          onConsumeWheelspin={(isSuper) => {
            if (isSuper) {
              setSuperWheelspinsCount((c) => Math.max(0, c - 1));
            } else {
              setWheelspinsCount((c) => Math.max(0, c - 1));
            }
          }}
          onAwardPrize={(totalCreditsWon, carsWon) => {
            if (totalCreditsWon > 0) {
              setCareerCredits((c) => c + totalCreditsWon);
            }
            if (carsWon.length > 0) {
              setOwnedVehicleIds((prev) => {
                const next = new Set(prev);
                carsWon.forEach((car) => next.add(car.id));
                return Array.from(next);
              });
            }
          }}
          onClose={() => setActiveOverlay('main_menu')}
        />
      )}

      {/* WINDOW 5: PLAYER'S PROFILE (LEVEL 1 TO 100 XP & WHEELSPIN / SUPER WHEELSPIN REWARDS) */}
      {activeOverlay === 'player_profile' && (
        <PlayerProfileModal
          driverName={driverName}
          onChangeDriverName={handleUpdateDriverName}
          playerXp={playerXp}
          careerCredits={careerCredits}
          wheelspinsCount={wheelspinsCount}
          superWheelspinsCount={superWheelspinsCount}
          ownedVehiclesCount={ownedVehicleIds.length}
          totalVehiclesCount={VEHICLES.length}
          completedRacesCount={Object.keys(completedRaces).length}
          onOpenWheelspins={() => setActiveOverlay('wheelspins')}
          onClose={() => setActiveOverlay('main_menu')}
        />
      )}

      {/* WINDOW 6: HORIZON SHOP (WHEELSPIN FOR 8 TOKENS [MAX 4/DAY] & SUPER WHEELSPIN FOR 20 TOKENS [MAX 2/DAY]) */}
      {activeOverlay === 'horizon_shop' && (
        <HorizonShopModal
          horizonTokens={horizonTokens}
          wheelspinsCount={wheelspinsCount}
          superWheelspinsCount={superWheelspinsCount}
          normalSpinsBoughtToday={
            shopPurchaseDateKey === getTodayDateKey() ? normalSpinsBoughtToday : 0
          }
          superSpinsBoughtToday={
            shopPurchaseDateKey === getTodayDateKey() ? superSpinsBoughtToday : 0
          }
          onBuyNormalWheelspin={handleBuyShopNormalWheelspin}
          onBuySuperWheelspin={handleBuyShopSuperWheelspin}
          onOpenWheelspins={() => setActiveOverlay('wheelspins')}
          onClose={() => setActiveOverlay('main_menu')}
        />
      )}

      {/* Starting Cutscene: Apex Association Driver Origin Story */}
      {activeOverlay === 'cutscene' && (
        <StoryCutsceneModal
          driverName={driverName}
          onChangeDriverName={handleUpdateDriverName}
          onStartTutorialRace={() => handleStartRaceEvent(WORLD_RACES[0])}
          onSkipToFreeRoam={() => setActiveOverlay('none')}
        />
      )}

      {/* Vehicle Roster Showroom Overlay */}
      {activeOverlay === 'roster' && (
        <VehicleRosterModal
          activeVehicleId={activeSpec.id}
          customTunesByVehicle={customTunes}
          onSelectVehicle={(spec: VehicleSpec) => setActiveVehicleId(spec.id)}
          onClose={() => setActiveOverlay('none')}
        />
      )}

      {/* World Satellite Map, Races, Custom Track Points & Live GPS Tracker Overlay */}
      {activeOverlay === 'map' && (
        <WorldMapModal
          telemetry={telemetry}
          remotePlayers={remotePlayers}
          leaderboard={leaderboard}
          customTrackPoints={customTrackPoints}
          trackedDestination={trackedDestination}
          activeRaceSession={activeRaceSession}
          completedRaces={completedRaces}
          onAddCustomTrackPoint={(pt) => setCustomTrackPoints((prev) => [...prev, pt])}
          onRemoveCustomTrackPoint={(id) =>
            setCustomTrackPoints((prev) => prev.filter((p) => p.id !== id))
          }
          onClearCustomTrackPoints={() => setCustomTrackPoints([])}
          onSetTrackedDestination={setTrackedDestination}
          onStartRaceEvent={handleStartRaceEvent}
          onFastTravelCoords={handleFastTravelCoords}
          onClose={() => setActiveOverlay('none')}
        />
      )}

      {/* Live Chassis & Tire Telemetry Inspector Floating Card */}
      {activeOverlay === 'telemetry' && (
        <LiveTelemetryModal
          spec={activeSpec}
          tune={activeTune}
          benchmark={benchmark}
          telemetry={telemetry}
          onClose={() => setActiveOverlay('none')}
        />
      )}

      {/* Multiplayer Convoy & Session Drawer (Without Player Teleport) */}
      {convoyDrawerOpen && (
        <ConvoyMultiplayerDrawer
          driverName={driverName}
          isConnected={wsConnected}
          remotePlayers={remotePlayers}
          activeChallenge={activeChallenge}
          feedEvents={feedEvents}
          onChangeDriverName={handleUpdateDriverName}
          onStartChallenge={handleStartChallenge}
          onJoinChallenge={handleJoinChallenge}
          onSendChatPing={handleSendChatPing}
          onClose={() => setConvoyDrawerOpen(false)}
        />
      )}
    </div>
  );
}
