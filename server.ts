import express from 'express';
import { execFile } from 'child_process';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  ConvoyChallenge,
  FeedEvent,
  LeaderboardEntry,
  MultiplayerRaceLobby,
  RemotePlayerState,
  SharedTunePreset,
} from './src/types/game';
import { INITIAL_SHARED_TUNES } from './src/data/vehicles';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Server-authoritative state for Real Connected Human Players
  const players = new Map<string, RemotePlayerState>();

  function getAllWorldPlayers(): RemotePlayerState[] {
    return Array.from(players.values());
  }
  let sharedTunes: SharedTunePreset[] = [...INITIAL_SHARED_TUNES];
  let activeChallenge: ConvoyChallenge | null = null;
  let activeMpRaceLobby: MultiplayerRaceLobby | null = null;

  let leaderboard: LeaderboardEntry[] = [
    {
      id: 'rec-speed-1',
      driverName: 'Elena_Vance',
      vehicleName: 'Valkyrie GT-R Centenario',
      piClass: 'S2',
      piScore: 968,
      zoneType: 'speed_trap',
      zoneTitle: 'Pacific Highway Speed Trap',
      value: 364,
      unit: 'km/h',
      timestamp: Date.now() - 1800_000,
    },
    {
      id: 'rec-drift-1',
      driverName: 'Kenji_Takahashi',
      vehicleName: 'Kimura Apex RZ-34 Spec-V',
      piClass: 'S1',
      piScore: 864,
      zoneType: 'drift_zone',
      zoneTitle: 'Red Rock Canyon Drift Zone',
      value: 52400,
      unit: 'pts',
      timestamp: Date.now() - 1500_000,
    },
    {
      id: 'rec-jump-1',
      driverName: 'Carlos_Mendoza',
      vehicleName: 'Solis Baja Nomad Trophy 4x4',
      piClass: 'A',
      piScore: 798,
      zoneType: 'danger_jump',
      zoneTitle: 'Mesa Ridge Danger Sign',
      value: 158,
      unit: 'm',
      timestamp: Date.now() - 1200_000,
    },
    {
      id: 'rec-speed-2',
      driverName: 'Marcus_Richter',
      vehicleName: 'Stuttgart 992 Weissach GT-RS',
      piClass: 'S2',
      piScore: 942,
      zoneType: 'speed_trap',
      zoneTitle: 'Outpost 1km Drag Strip',
      value: 329,
      unit: 'km/h',
      timestamp: Date.now() - 900_000,
    },
  ];

  let feedEvents: FeedEvent[] = [
    {
      id: 'feed-init-1',
      driverName: 'Horizon Festival Control',
      message: 'Welcome to Apex Horizon Open World. Speed Traps and Dyno Telemetry are live.',
      category: 'join',
      timestamp: Date.now() - 60_000,
    },
  ];

  function broadcastAll(payload: unknown, excludeClient?: WebSocket) {
    const raw = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    });
  }

  function pushFeedEvent(event: FeedEvent) {
    if (feedEvents.some((e) => e.id === event.id)) return;
    feedEvents = [event, ...feedEvents].slice(0, 35);
    broadcastAll({ type: 'feed:created', event });
  }

  // Authoritative Massive Multiplayer 150ms World Tick
  setInterval(() => {
    if (wss.clients.size === 0) return;
    broadcastAll({
      type: 'world:mmo_tick',
      players: getAllWorldPlayers(),
    });
  }, 150);

  // REST endpoint for health & state inspection
  app.get('/api/world-state', (_req, res) => {
    res.json({
      players: getAllWorldPlayers(),
      leaderboard,
      sharedTunes,
      activeChallenge,
      activeMpRaceLobby,
      feedEvents,
    });
  });

  // REST endpoint to dynamically build or stream the signed Android APK (.apk)
  app.get('/api/download-apk', (req, res) => {
    const rawOrigin = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
    const validOrigin = /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?$/.test(rawOrigin)
      ? rawOrigin
      : 'https://ais-pre-pvlzcuyoquqv6memnlpdh2-888736281426.asia-southeast1.run.app';

    const scriptPath = path.resolve(__dirname, 'scripts', 'build_apk_and_icons.py');
    const fallbackApkPath = path.resolve(__dirname, 'public', 'ApexHorizon-v1.0.apk');
    const tmpApkPath = path.join(os.tmpdir(), `ApexHorizon-${Date.now()}.apk`);

    execFile('python3', [scriptPath, validOrigin, tmpApkPath], { timeout: 10000 }, (err) => {
      const targetPath = !err && fs.existsSync(tmpApkPath) ? tmpApkPath : fallbackApkPath;
      if (!fs.existsSync(targetPath)) {
        res.status(404).json({ error: 'APK file not found' });
        return;
      }
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="ApexHorizon-v1.0.apk"');
      res.setHeader('Cache-Control', 'no-store');
      const stream = fs.createReadStream(targetPath);
      stream.pipe(res);
      stream.on('close', () => {
        if (targetPath === tmpApkPath && fs.existsSync(tmpApkPath)) {
          fs.unlink(tmpApkPath, () => {});
        }
      });
    });
  });

  wss.on('connection', (ws) => {
    const clientId = `drv_${Math.random().toString(36).slice(2, 10)}`;

    // Send initial authoritative state to newly connected client
    ws.send(
      JSON.stringify({
        type: 'world:init',
        clientId,
        players: getAllWorldPlayers(),
        leaderboard,
        sharedTunes,
        activeChallenge,
        activeMpRaceLobby,
        feedEvents,
      })
    );

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'player:update' && msg.state) {
          const isNew = !players.has(clientId);
          const nextState: RemotePlayerState = {
            ...msg.state,
            id: clientId,
            updatedAt: Date.now(),
          };
          players.set(clientId, nextState);

          if (isNew) {
            broadcastAll({ type: 'player:joined', player: nextState }, ws);
            pushFeedEvent({
              id: `join_${clientId}_${Date.now()}`,
              driverName: nextState.driverName,
              message: `entered the Horizon open world in a ${nextState.vehicleName} (${nextState.piClass} ${nextState.piScore})`,
              category: 'join',
              timestamp: Date.now(),
            });
          } else {
            broadcastAll({ type: 'player:updated', player: nextState }, ws);
          }
        } else if (msg.type === 'leaderboard:record' && msg.entry) {
          const entry: LeaderboardEntry = {
            ...msg.entry,
            id: msg.entry.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
          };

          // Idempotency guard
          if (!leaderboard.some((r) => r.id === entry.id)) {
            leaderboard.push(entry);
            leaderboard.sort((a, b) => b.value - a.value);
            leaderboard = leaderboard.slice(0, 40);
            broadcastAll({ type: 'leaderboard:updated', leaderboard });

            pushFeedEvent({
              id: `feed_${entry.id}`,
              driverName: entry.driverName,
              message: `clocked ${entry.value.toLocaleString()} ${entry.unit} at ${entry.zoneTitle} (${entry.vehicleName})`,
              category: 'record',
              timestamp: Date.now(),
            });
          }
        } else if (msg.type === 'tune:publish' && msg.preset) {
          const preset: SharedTunePreset = {
            ...msg.preset,
            id: msg.preset.id || `tune_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            createdAt: Date.now(),
          };
          if (!sharedTunes.some((t) => t.id === preset.id)) {
            sharedTunes = [preset, ...sharedTunes].slice(0, 30);
            broadcastAll({ type: 'tune:created', preset });
            pushFeedEvent({
              id: `feed_${preset.id}`,
              driverName: preset.author,
              message: `shared tune "${preset.title}" for ${preset.vehicleName} (${preset.piClass} ${preset.piScore})`,
              category: 'tune',
              timestamp: Date.now(),
            });
          }
        } else if (msg.type === 'challenge:create' && msg.routeType) {
          const routeConfigs: Record<
            ConvoyChallenge['routeType'],
            { startX: number; startZ: number; startHeading: number; checkpointX: number; checkpointZ: number }
          > = {
            'Festival Drag 1km': {
              startX: 0,
              startZ: 280,
              startHeading: Math.PI,
              checkpointX: 0,
              checkpointZ: -260,
            },
            'Coastal Highway Sprint': {
              startX: 240,
              startZ: -160,
              startHeading: -Math.PI / 4,
              checkpointX: 240,
              checkpointZ: 160,
            },
            'Canyon Drift Touge': {
              startX: -220,
              startZ: -180,
              startHeading: Math.PI / 3,
              checkpointX: 0,
              checkpointZ: 0,
            },
            'Baja Dunes Scramble': {
              startX: -210,
              startZ: 210,
              startHeading: -Math.PI * 0.75,
              checkpointX: 0,
              checkpointZ: 45,
            },
          };
          const cfg = routeConfigs[msg.routeType as ConvoyChallenge['routeType']] || routeConfigs['Festival Drag 1km'];
          const hostName = msg.driverName || 'Driver';

          activeChallenge = {
            id: `chal_${Date.now()}`,
            hostName,
            title: msg.routeType,
            routeType: msg.routeType,
            ...cfg,
            participants: [hostName],
            status: 'countdown',
            startTimeMs: Date.now() + 4000,
          };

          broadcastAll({ type: 'challenge:updated', challenge: activeChallenge });
          pushFeedEvent({
            id: `feed_${activeChallenge.id}`,
            driverName: hostName,
            message: `started a Convoy Sprint: ${msg.routeType}! Starting in 4 seconds...`,
            category: 'convoy',
            timestamp: Date.now(),
          });

          const chalId = activeChallenge.id;
          setTimeout(() => {
            if (activeChallenge && activeChallenge.id === chalId) {
              activeChallenge = {
                ...activeChallenge,
                status: 'active',
                startTimeMs: Date.now(),
              };
              broadcastAll({ type: 'challenge:updated', challenge: activeChallenge });
            }
          }, 4000);
        } else if (msg.type === 'challenge:join' && activeChallenge) {
          const dName = msg.driverName || 'Driver';
          if (!activeChallenge.participants.includes(dName)) {
            activeChallenge.participants.push(dName);
          }
          broadcastAll({ type: 'challenge:updated', challenge: activeChallenge });
        } else if (msg.type === 'challenge:finish' && activeChallenge && activeChallenge.status === 'active') {
          const winnerName = msg.driverName || 'Driver';
          const winningTimeSec = Number(msg.elapsedSec) || 12.5;
          activeChallenge = {
            ...activeChallenge,
            status: 'finished',
            winnerName,
            winningTimeSec,
          };
          broadcastAll({ type: 'challenge:updated', challenge: activeChallenge });
          pushFeedEvent({
            id: `feed_win_${Date.now()}`,
            driverName: winnerName,
            message: `won ${activeChallenge.routeType} in ${winningTimeSec.toFixed(2)}s!`,
            category: 'convoy',
            timestamp: Date.now(),
          });
        } else if (msg.type === 'mp_race:host' && msg.raceId) {
          const hostName = msg.driverName || 'Driver';
          const raceName = msg.raceName || 'Multiplayer GP';
          activeMpRaceLobby = {
            id: `mpr_${Date.now()}`,
            raceId: String(msg.raceId),
            raceName: String(raceName),
            hostName,
            participants: [hostName],
            status: 'lobby',
            startTimeMs: 0,
            finishOrder: [],
          };
          broadcastAll({ type: 'mp_race:updated', lobby: activeMpRaceLobby });
          pushFeedEvent({
            id: `feed_mpr_${activeMpRaceLobby.id}`,
            driverName: hostName,
            message: `opened Multiplayer Race Lobby: ${raceName} (2+ Players, No Bots)!`,
            category: 'convoy',
            timestamp: Date.now(),
          });
        } else if (msg.type === 'mp_race:join' && activeMpRaceLobby) {
          const dName = msg.driverName || 'Driver';
          if (!activeMpRaceLobby.participants.includes(dName)) {
            activeMpRaceLobby.participants.push(dName);
          }
          broadcastAll({ type: 'mp_race:updated', lobby: activeMpRaceLobby });
        } else if (msg.type === 'mp_race:launch' && activeMpRaceLobby) {
          const lobbyId = activeMpRaceLobby.id;
          const startTimeMs = Date.now() + 3600;
          activeMpRaceLobby = {
            ...activeMpRaceLobby,
            status: 'countdown',
            startTimeMs,
          };
          broadcastAll({ type: 'mp_race:updated', lobby: activeMpRaceLobby });
          setTimeout(() => {
            if (activeMpRaceLobby && activeMpRaceLobby.id === lobbyId) {
              activeMpRaceLobby = {
                ...activeMpRaceLobby,
                status: 'active',
              };
              broadcastAll({ type: 'mp_race:updated', lobby: activeMpRaceLobby });
            }
          }, 3600);
        } else if (msg.type === 'mp_race:finish' && activeMpRaceLobby) {
          const dName = msg.driverName || 'Driver';
          const elapsedSec = Number(msg.elapsedSec) || 30.0;
          if (!activeMpRaceLobby.finishOrder.some((f) => f.driverName === dName)) {
            activeMpRaceLobby.finishOrder.push({ driverName: dName, elapsedSec });
            activeMpRaceLobby.finishOrder.sort((a, b) => a.elapsedSec - b.elapsedSec);
          }
          if (activeMpRaceLobby.finishOrder.length >= activeMpRaceLobby.participants.length) {
            activeMpRaceLobby.status = 'finished';
          }
          broadcastAll({ type: 'mp_race:updated', lobby: activeMpRaceLobby });
          pushFeedEvent({
            id: `feed_mpr_fin_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            driverName: dName,
            message: `finished Multiplayer Race ${activeMpRaceLobby.raceName} in ${elapsedSec.toFixed(2)}s!`,
            category: 'convoy',
            timestamp: Date.now(),
          });
        } else if (msg.type === 'mp_race:cancel') {
          activeMpRaceLobby = null;
          broadcastAll({ type: 'mp_race:updated', lobby: null });
        } else if (msg.type === 'chat:ping' && msg.message) {
          pushFeedEvent({
            id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            driverName: msg.driverName || 'Driver',
            message: String(msg.message).slice(0, 100),
            category: 'convoy',
            timestamp: Date.now(),
          });
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      if (players.has(clientId)) {
        players.delete(clientId);
        broadcastAll({ type: 'player:left', id: clientId });
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Apex Horizon Server & WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
