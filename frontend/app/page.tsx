"use client";

import { useState, useCallback, useEffect } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useAudioWaveform,
  useDisconnectButton,
} from "@livekit/components-react";
import type { LocalAudioTrack } from "livekit-client";
import "@livekit/components-styles";

const DEFAULT_ROOM = "restaurant-voice-order";

const IDLE_BARS = [4, 8, 14, 20, 14, 8, 4];

function LoadingSpinner() {
  return (
    <svg
      className="h-16 w-16 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2a4 4 0 014 4v6a4 4 0 01-8 0V6a4 4 0 014-4z" />
      <path d="M5 10v2a7 7 0 0014 0v-2h2v2a9 9 0 01-18 0v-2h2z" />
    </svg>
  );
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [roomName] = useState(DEFAULT_ROOM);
  const [identity] = useState(
    `guest-${Math.floor(Math.random() * 10_000)}`
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT;
  const fallbackServerUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const handleStart = useCallback(async () => {
    if (!tokenEndpoint) {
      setError("Token endpoint is not configured.");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_name: roomName, identity }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Token request failed: ${res.status} ${body}`);
      }
      const data = (await res.json()) as { token: string; url?: string };
      setToken(data.token);
      setServerUrl(data.url ?? fallbackServerUrl ?? null);
      if (!data.url && !fallbackServerUrl) {
        setError("No LiveKit URL provided from server or env.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch token.";
      const isNetworkError =
        /failed to fetch|networkerror|load failed|connection refused/i.test(
          String(msg)
        ) || (e instanceof TypeError && msg.includes("fetch"));
      if (isNetworkError) {
        setError(
          "Cannot reach the token server. Start it from the project root: uvicorn backend.token_server:app --reload --port 8000  (or from backend/: uvicorn token_server:app --reload --port 8000). Ensure frontend/.env.local has NEXT_PUBLIC_TOKEN_ENDPOINT=http://localhost:8000/token"
        );
      } else {
        setError(msg);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [tokenEndpoint, roomName, identity, fallbackServerUrl]);

  const handleDisconnected = useCallback(() => {
    setToken(null);
    setServerUrl(null);
  }, []);

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100 flex items-center justify-center px-4">
        <main className="w-full max-w-md flex flex-col items-center gap-8">
          <header className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Talk to The Pizzeria, Delhi
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Press the mic to connect and speak your order.
            </p>
          </header>

          <button
            type="button"
            onClick={handleStart}
            disabled={isConnecting}
            className="relative flex h-36 w-36 items-center justify-center rounded-full bg-amber-600 shadow-lg transition hover:bg-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-400/40 disabled:pointer-events-none disabled:opacity-70"
            aria-label={isConnecting ? "Connecting…" : "Press to connect and speak"}
          >
            {isConnecting ? (
              <LoadingSpinner />
            ) : (
              <MicIcon className="h-20 w-20 text-white" />
            )}
          </button>

          <p className="text-xs text-stone-500 dark:text-stone-400 text-center max-w-[260px]">
            {isConnecting
              ? "Connecting… You’ll be asked for microphone permission."
              : "Hold the mic to speak to the restaurant."}
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          )}
        </main>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      audio
      video={false}
      connect
      onDisconnected={handleDisconnected}
      data-lk-theme="default"
      className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
    >
      <CallUI />
    </LiveKitRoom>
  );
}

function CallUI() {
  const connectionState = useConnectionState();
  const { microphoneTrack } = useLocalParticipant();
  const { buttonProps: leaveButtonProps } = useDisconnectButton({
    stopTracks: true,
  });

  const audioTrack = (microphoneTrack?.track as LocalAudioTrack | undefined) ?? undefined;
  const { bars } = useAudioWaveform(audioTrack, {
    barCount: 9,
    volMultiplier: 12,
    updateInterval: 35,
  });

  const [isPressed, setIsPressed] = useState(false);

  // Push-to-talk: mute when not pressing, unmute when pressing
  useEffect(() => {
    if (!audioTrack) return;
    if (isPressed) {
      void audioTrack.unmute();
    } else {
      void audioTrack.mute();
    }
  }, [audioTrack, isPressed]);

  // Release on pointer up elsewhere (e.g. user drags off the button)
  useEffect(() => {
    if (!isPressed) return;
    const onUp = () => setIsPressed(false);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isPressed]);

  const displayBars = bars.length >= 7 ? bars : IDLE_BARS;

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-4 py-6">
      <header className="w-full max-w-2xl flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight">
            The Pizzeria, Delhi
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Hold the mic to speak · {connectionState}
          </p>
        </div>
        <button
          {...leaveButtonProps}
          className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800"
        >
          Leave
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-6">
          {/* Wave bars */}
          <div
            className="flex items-end justify-center gap-1.5"
            style={{ height: 40 }}
          >
            {displayBars.map((v, i) => (
              <div
                key={i}
                className="w-1.5 min-h-[4px] rounded-full bg-amber-500/80 transition-all duration-75 ease-out"
                style={{
                  height: `${Math.min(40, Math.max(4, (v ?? 2) * 2))}px`,
                }}
              />
            ))}
          </div>

          {/* Mic button — push to talk */}
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              setIsPressed(true);
            }}
            className={`flex h-36 w-36 items-center justify-center rounded-full shadow-lg transition focus:outline-none focus:ring-4 focus:ring-amber-400/40 ${
              isPressed
                ? "bg-amber-500 scale-105"
                : "bg-amber-600 hover:bg-amber-500"
            }`}
            aria-label={isPressed ? "Speaking… Release to mute" : "Hold to speak"}
          >
            <MicIcon className="h-18 w-18 text-white" />
          </button>

          <p className="text-sm text-stone-500 dark:text-stone-400">
            {isPressed ? "Speaking…" : "Hold to speak to the restaurant"}
          </p>
        </div>
      </main>

      <div className="w-full max-w-2xl">
        <RoomAudioRenderer />
      </div>
    </div>
  );
}
