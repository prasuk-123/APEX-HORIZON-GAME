import React, { useState } from 'react';
import {
  ConvoyChallenge,
  FeedEvent,
  RemotePlayerState,
} from '../types/game';
import { Users, Flag, Send, X, Copy, Check, HelpCircle } from 'lucide-react';

interface ConvoyMultiplayerDrawerProps {
  driverName: string;
  isConnected: boolean;
  remotePlayers: RemotePlayerState[];
  activeChallenge: ConvoyChallenge | null;
  feedEvents: FeedEvent[];
  onChangeDriverName: (name: string) => void;
  onStartChallenge: (routeType: ConvoyChallenge['routeType']) => void;
  onJoinChallenge: (challengeId: string) => void;
  onSendChatPing: (message: string) => void;
  onClose: () => void;
}

export const ConvoyMultiplayerDrawer: React.FC<ConvoyMultiplayerDrawerProps> = ({
  driverName,
  isConnected,
  remotePlayers,
  activeChallenge,
  feedEvents,
  onChangeDriverName,
  onStartChallenge,
  onJoinChallenge,
  onSendChatPing,
  onClose,
}) => {
  const [nameDraft, setNameDraft] = useState(driverName);
  const [customMsg, setCustomMsg] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(true);

  const humanDrivers = remotePlayers.filter((p) => !p.id.startsWith('mmo_bot_'));
  const festivalDrivers = remotePlayers.filter((p) => p.id.startsWith('mmo_bot_'));

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameDraft.trim()) {
      onChangeDriverName(nameDraft.trim());
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    onSendChatPing(customMsg.trim());
    setCustomMsg('');
  };

  const handleCopyInviteLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    }
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 z-30 w-full sm:w-[430px] bg-slate-950/95 backdrop-blur-xl border-l border-white/10 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="font-display text-base font-bold text-white">
              Massive Multiplayer Convoy Hub ({remotePlayers.length + 1} Live)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close Convoy Window"
            aria-label="Close Convoy Drawer"
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-red-500 text-slate-200 hover:text-white border border-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* How to Play Massive Multiplayer Guide & 1-Click Invite Link */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-400/40 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowHowToPlay((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How to Play Massive Multiplayer</span>
            </button>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md cursor-pointer"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-3 h-3" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy Invite URL
                </>
              )}
            </button>
          </div>

          {showHowToPlay && (
            <ol className="text-[11px] text-slate-200 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>
                <strong>Invite Friends or Open Another Tab:</strong> Copy the app URL and open it on a phone, tablet, or second browser window—everyone connects automatically to the shared WebSocket server.
              </li>
              <li>
                <strong>Meet Up on the Open-World Map:</strong> Locate other drivers on your top-right Forza Horizon radar or World Map and drive across the highway to cruise together.
              </li>
              <li>
                <strong>Start a Convoy Sprint Race:</strong> Tap any of the 4 Convoy Sprint routes below to trigger a synchronized countdown for everyone in the lobby.
              </li>
            </ol>
          )}
        </div>

        {/* Driver Callsign Configuration */}
        <form onSubmit={handleNameSubmit} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Your Driver Callsign</span>
            <span className="font-mono text-[11px] text-emerald-400">
              {isConnected ? 'MMO Server Connected (12Hz)' : 'Reconnecting...'}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={22}
              className="flex-1 px-3 py-1.5 text-xs bg-black/50 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400 font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg whitespace-nowrap cursor-pointer"
            >
              Update
            </button>
          </div>
        </form>

        {/* Synchronized Head-to-Head / Convoy Event Launcher */}
        <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-cyan-400" />
              Launch Synchronized Convoy Sprint
            </span>
          </div>

          {activeChallenge && activeChallenge.status !== 'finished' ? (
            <div className="p-3 bg-cyan-500/10 border border-cyan-400/40 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-cyan-200">
                {activeChallenge.routeType} · Hosted by {activeChallenge.hostName}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Status: {activeChallenge.status.toUpperCase()} · Drivers:{' '}
                {activeChallenge.participants.join(', ')}
              </div>
              {!activeChallenge.participants.includes(driverName) && (
                <button
                  type="button"
                  onClick={() => onJoinChallenge(activeChallenge.id)}
                  className="w-full py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md cursor-pointer"
                >
                  Enter Convoy Sprint Roster
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  'Festival Drag 1km',
                  'Coastal Highway Sprint',
                  'Canyon Drift Touge',
                  'Baja Dunes Scramble',
                ] as ConvoyChallenge['routeType'][]
              ).map((route) => (
                <button
                  key={route}
                  type="button"
                  onClick={() => onStartChallenge(route)}
                  className="p-2.5 text-left text-xs font-medium bg-black/40 hover:bg-white/10 border border-white/10 hover:border-amber-400/60 rounded-lg text-slate-200 transition-colors cursor-pointer"
                >
                  {route}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Connected Multiplayer Drivers in Open World (No Teleporting - Pure Open World Driving) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Active World Drivers ({humanDrivers.length + 1} Human · {festivalDrivers.length} Roaming)
            </span>
            <span className="font-mono text-[11px]">Live Coordinates</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {remotePlayers.map((rp) => {
              const isHuman = !rp.id.startsWith('mmo_bot_');
              return (
                <div
                  key={rp.id}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
                    isHuman
                      ? 'bg-emerald-500/10 border-emerald-400/40'
                      : 'bg-white/[0.03] border-white/10'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: rp.paintHex }}
                      />
                      <span className="font-semibold text-white truncate">{rp.driverName}</span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="font-mono text-amber-400 text-[11px]">
                        {rp.piClass} {rp.piScore}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      {rp.vehicleName} · {rp.speedKmh} km/h
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    ({Math.round(rp.x)}m, {Math.round(rp.z)}m)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Session Radio & Activity Feed */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <span className="text-xs font-semibold text-slate-300 block">
            Horizon Link Radio &amp; Live Activity
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              'Meet at Festival Outpost!',
              'Line up for 1km Drag!',
              'Drifting Red Rock Canyon!',
            ].map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => onSendChatPing(quick)}
                className="px-2.5 py-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md cursor-pointer"
              >
                {quick}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto bg-black/40 border border-white/10 rounded-xl p-3">
            {feedEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No session transmissions yet.</p>
            ) : (
              feedEvents.map((ev) => (
                <div key={ev.id} className="text-xs leading-snug">
                  <span className="font-semibold text-amber-400">{ev.driverName}</span>
                  <span className="text-slate-500 mx-1.5">·</span>
                  <span className="text-slate-200">{ev.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Send Custom Radio Message */}
      <form onSubmit={handleChatSubmit} className="pt-3 mt-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={customMsg}
          onChange={(e) => setCustomMsg(e.target.value)}
          placeholder="Broadcast message to convoy..."
          maxLength={80}
          className="flex-1 px-3 py-2 text-xs bg-black/50 border border-white/15 rounded-lg text-white focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          className="px-3 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </form>
    </div>
  );
};
