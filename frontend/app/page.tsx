"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useAudioWaveform,
  useDisconnectButton,
  useRoomContext,
  useParticipants,
} from "@livekit/components-react";
import type { LocalAudioTrack, DataPacket_Kind, Participant } from "livekit-client";
import "@livekit/components-styles";
import PlateAnimation from "./components/PlateAnimation";
import Cart, { CartItem } from "./components/Cart";

const DEFAULT_ROOM = process.env.NEXT_PUBLIC_LIVEKIT_ROOM_NAME || "restaurant-voice-order";

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
      // Store in sessionStorage for payment page to use
      sessionStorage.setItem("livekit_token", data.token);
      if (data.url || fallbackServerUrl) {
        sessionStorage.setItem("livekit_server_url", data.url || fallbackServerUrl || "");
      }
      sessionStorage.setItem("livekit_identity", identity);
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
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        <main className="relative z-10 w-full max-w-md flex flex-col items-center gap-10">
          <header className="text-center space-y-3">
            <div className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold tracking-wide mb-2">
              VOICE ORDERING
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-stone-900 to-stone-600 dark:from-white dark:to-stone-400 bg-clip-text text-transparent">
              The Pizzeria
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-lg">
              Press the mic to start your order
            </p>
          </header>

          <div className="relative group">
            {/* Pulsing Glow Effect */}
            <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-50 group-hover:opacity-80 animate-pulse" />

            <button
              type="button"
              onClick={handleStart}
              disabled={isConnecting}
              className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-xl shadow-amber-500/20 transition-all duration-300 hover:scale-105 hover:from-amber-400 hover:to-amber-500 active:scale-95 disabled:pointer-events-none disabled:opacity-70 disabled:grayscale"
              aria-label={isConnecting ? "Connecting…" : "Press to connect and speak"}
            >
              {isConnecting ? (
                <LoadingSpinner />
              ) : (
                <MicIcon className="h-20 w-20 text-white drop-shadow-md" />
              )}
            </button>
          </div>

          <p className="text-sm text-stone-500 dark:text-stone-400 text-center max-w-[280px]">
            {isConnecting
              ? "Connecting to the restaurant..."
              : "Experience the fastest way to order pizza using mostly your voice."}
          </p>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-sm text-red-600 dark:text-red-400 text-center max-w-sm">
              {error}
            </div>
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

interface OrderData {
  orderId: string;
  status: "in_progress" | "completed" | "cancelled";
  items: CartItem[];
  total: number;
  timestamp: string;
}

function CallUI() {
  const router = useRouter();
  const connectionState = useConnectionState();
  const { microphoneTrack } = useLocalParticipant();
  const { buttonProps: leaveButtonProps } = useDisconnectButton({
    stopTracks: true,
  });
  // Extract stopTracks to prevent it from being passed to DOM element
  const { stopTracks, ...validButtonProps } = leaveButtonProps;
  const room = useRoomContext();
  const participants = useParticipants();

  const audioTrack = (microphoneTrack?.track as LocalAudioTrack | undefined) ?? undefined;
  const { bars } = useAudioWaveform(audioTrack, {
    barCount: 9,
    volMultiplier: 12,
    updateInterval: 35,
  });

  // Animation state
  const [showPlate, setShowPlate] = useState(false);
  const [plateImagePath, setPlateImagePath] = useState<string | null>(null);
  const [plateItemName, setPlateItemName] = useState<string | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Order state
  const [orderStatus, setOrderStatus] = useState<"in_progress" | "completed" | "cancelled" | null>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);

  // Load order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem("currentOrder");
    if (savedOrder) {
      try {
        const order: OrderData = JSON.parse(savedOrder);
        setCurrentOrder(order);
        setOrderStatus(order.status);
        setOrderConfirmed(true);
      } catch (error) {
        console.error("Error loading order from localStorage:", error);
        localStorage.removeItem("currentOrder");
      }
    }
  }, []);

  // Handle place new order
  const handlePlaceNewOrder = () => {
    setOrderConfirmed(false);
    setOrderStatus(null);
    setCurrentOrder(null);
    setCartItems([]);
    localStorage.removeItem("currentOrder");
  };

  // Handle check order status
  const handleCheckOrderStatus = () => {
    // Order status is already displayed, this could show a modal or navigate to a status page
    // For now, we'll just ensure the order is visible
    if (currentOrder) {
      setIsCartOpen(false);
    }
  };

  // Keep mic always unmuted during call
  useEffect(() => {
    if (!audioTrack) return;
    void audioTrack.unmute();
  }, [audioTrack]);

  // Debug: Log remote participants and their audio tracks
  // RoomAudioRenderer handles subscription automatically, so we just log for debugging
  useEffect(() => {
    if (!room) return;

    const localParticipant = room.localParticipant;

    console.log("Connection state:", connectionState);
    console.log("Participants:", participants.length);

    const handleTrackPublished = (publication: any, participant: Participant) => {
      // Check if it's a remote participant (not local)
      if (participant !== localParticipant && publication.kind === "audio") {
        console.log(`New audio track published by ${participant.identity}: ${publication.trackSid}`);
        console.log(`  - Subscribed: ${publication.isSubscribed}, Muted: ${publication.isMuted}`);

        // Explicitly subscribe to remote audio tracks
        if (!publication.isSubscribed && "setSubscribed" in publication) {
          console.log(`  - Attempting to subscribe to audio track: ${publication.trackSid}`);
          try {
            (publication as any).setSubscribed(true);
          } catch (err: any) {
            console.error(`  - Failed to subscribe to track: ${err}`);
          }
        }
      }
    };

    const handleTrackSubscribed = (track: any, publication: any, participant: Participant) => {
      // Check if it's a remote participant (not local)
      if (participant !== localParticipant && track.kind === "audio") {
        console.log(`Audio track subscribed: ${publication.trackSid} from ${participant.identity}`);
        console.log(`  - Track muted: ${track.isMuted}, enabled: ${track.isEnabled}`);
      }
    };

    room.on("trackPublished", handleTrackPublished);
    room.on("trackSubscribed", handleTrackSubscribed);

    // Log existing participants and tracks, and ensure subscription
    participants.forEach((participant) => {
      // Check if it's a remote participant (not local)
      if (participant !== localParticipant) {
        console.log(`Remote participant: ${participant.identity}`);
        console.log(`  - Audio tracks: ${participant.audioTrackPublications.size}`);
        console.log(`  - Is speaking: ${participant.isSpeaking}`);

        participant.audioTrackPublications.forEach((publication) => {
          console.log(`  - Track: ${publication.trackSid}, subscribed: ${publication.isSubscribed}, muted: ${publication.isMuted}`);
          if (publication.track) {
            console.log(`  - Track kind: ${publication.kind}, source: ${publication.source}`);
          }

          // Explicitly subscribe to remote audio tracks if not already subscribed
          if (!publication.isSubscribed && publication.kind === "audio" && "setSubscribed" in publication) {
            console.log(`  - Subscribing to audio track: ${publication.trackSid}`);
            try {
              (publication as any).setSubscribed(true);
            } catch (err: any) {
              console.error(`  - Failed to subscribe to track: ${err}`);
            }
          }
        });
      }
    });

    return () => {
      room.off("trackPublished", handleTrackPublished);
      room.off("trackSubscribed", handleTrackSubscribed);
    };
  }, [room, participants, connectionState]);

  // Listen for data messages from the agent
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant: any,
      kind?: DataPacket_Kind,
      topic?: string
    ) => {
      // Process messages on the "animation" topic
      if (topic !== "animation") return;

      try {
        const decoder = new TextDecoder();
        const messageText = decoder.decode(payload);
        const data = JSON.parse(messageText);

        // Handle show item animation
        if (data.type === "show_item" && data.imagePath) {
          setPlateImagePath(data.imagePath);
          setPlateItemName(data.itemName || null);
          setShowPlate(true);
        }
        // Handle cart operations
        else if (data.type === "add_to_cart" && data.item) {
          const newItem: CartItem = {
            name: data.item.name,
            quantity: data.item.quantity || 1,
            price: data.item.price,
            size: data.item.size,
            addons: data.item.addons,
          };
          setCartItems((prev) => {
            // Check if item already exists (same name and size)
            const existingIndex = prev.findIndex(
              (item) =>
                item.name === newItem.name && item.size === newItem.size
            );
            if (existingIndex >= 0) {
              // Update quantity of existing item
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                quantity: updated[existingIndex].quantity + newItem.quantity,
              };
              return updated;
            } else {
              // Add new item
              return [...prev, newItem];
            }
          });
        } else if (data.type === "remove_from_cart" && data.itemName) {
          setCartItems((prev) =>
            prev.filter((item) => item.name !== data.itemName)
          );
        } else if (data.type === "update_cart" && Array.isArray(data.items)) {
          setCartItems(data.items);
        } else if (data.type === "clear_cart") {
          setCartItems([]);
        } else if (data.type === "open_cart") {
          setIsCartOpen(true);
        } else if (data.type === "navigate_to_payment") {
          // Store cart items in sessionStorage for payment page
          if (cartItems.length > 0) {
            sessionStorage.setItem("pendingOrderItems", JSON.stringify(cartItems));
            router.push("/payment");
          }
        } else if (data.type === "navigate_to_menu") {
          // Navigate back to main menu page
          router.push("/");
        } else if (data.type === "cancel_payment") {
          // Cancel payment and return to menu
          router.push("/");
        } else if (data.type === "cancel_order") {
          // Cancel a confirmed order
          const savedOrder = localStorage.getItem("currentOrder");
          if (savedOrder) {
            try {
              const order = JSON.parse(savedOrder);
              // Check if order is within 5 minute cancellation window
              const orderTime = new Date(order.timestamp);
              const now = new Date();
              const minutesDiff = (now.getTime() - orderTime.getTime()) / (1000 * 60);

              if (minutesDiff <= 5) {
                // Update order status to cancelled
                order.status = "cancelled";
                localStorage.setItem("currentOrder", JSON.stringify(order));
                setCurrentOrder(order);
                setOrderStatus("cancelled");
                setOrderConfirmed(true);
              } else {
                // Order is too old to cancel
                console.log("Order is outside cancellation window");
              }
            } catch (error) {
              console.error("Error processing order cancellation:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error parsing data message:", error);
      }
    };

    room.on("dataReceived", handleDataReceived);

    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room, cartItems, router]);

  const handleClosePlate = useCallback(() => {
    setShowPlate(false);
    // Clear the image path after animation completes
    setTimeout(() => {
      setPlateImagePath(null);
      setPlateItemName(null);
    }, 600); // Match animation duration
  }, []);

  const displayBars = bars.length >= 7 ? bars : IDLE_BARS;

  // Show order confirmation UI if order is confirmed
  if (orderConfirmed && currentOrder) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center px-4 py-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 dark:bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-2xl relative z-10">
          <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl rounded-2xl p-8 border border-stone-200/50 dark:border-stone-700/50 shadow-2xl">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center shadow-inner">
                <svg
                  className="w-10 h-10 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Order Confirmed Message */}
            <h1 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-stone-900 to-stone-600 dark:from-white dark:to-stone-400">
              Order Confirmed!
            </h1>
            <p className="text-center text-stone-600 dark:text-stone-400 mb-8 max-w-md mx-auto">
              Thank you for your order. The kitchen has received it and is preparing your meal.
            </p>

            {/* Order Details */}
            <div className="bg-stone-50 dark:bg-stone-950/50 rounded-xl p-6 mb-8 border border-stone-100 dark:border-stone-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">
                  Order ID
                </span>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100 tracking-wide">
                  {currentOrder.orderId}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">
                  Status
                </span>
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold uppercase tracking-wide">
                  {currentOrder.status === "in_progress" ? "In Progress" : currentOrder.status}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  ₹{currentOrder.total.toFixed(0)}
                </span>
              </div>
              <div className="pt-4 border-t border-dashed border-stone-200 dark:border-stone-700">
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
                  Items ({currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)})
                </p>
                <ul className="space-y-2">
                  {currentOrder.items.map((item, index) => (
                    <li
                      key={index}
                      className="text-sm text-stone-700 dark:text-stone-300 flex justify-between"
                    >
                      <span>
                        <span className="font-semibold">{item.quantity}x</span> {item.name}
                        {item.size && <span className="text-stone-400"> ({item.size})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handlePlaceNewOrder}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                Place New Order
              </button>
              <button
                onClick={handleCheckOrderStatus}
                className="flex-1 px-6 py-3.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 rounded-xl font-semibold transition-all active:scale-95"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-4 py-6 bg-stone-50 dark:bg-stone-950 relative overflow-hidden">
      {/* Dynamic Background */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${participants.some(p => p.isSpeaking) ? "opacity-30" : "opacity-10"
          }`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-amber-500/20 to-transparent rounded-full blur-[100px]" />
      </div>

      <header className="w-full max-w-4xl flex items-center justify-between relative z-10 p-4 rounded-2xl bg-white/60 dark:bg-stone-900/60 backdrop-blur-md border border-stone-200/50 dark:border-stone-800/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md">
            <span className="font-bold text-lg">P</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-none">
              The Pizzeria
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full ${participants.some(p => p.isSpeaking) ? "bg-green-500 animate-pulse" : "bg-green-500/50"}`} />
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                {connectionState === 'connected' ? 'Live Connection' : connectionState}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen((prev) => !prev)}
            className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10 active:scale-95"
            aria-label={`${isCartOpen ? "Close" : "Open"} cart`}
          >
            <svg
              className="w-5 h-5 text-stone-600 dark:text-stone-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartItems.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm border-2 border-white dark:border-stone-900">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>

          <button
            {...validButtonProps}
            className="px-5 py-2.5 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-sm font-semibold text-stone-600 dark:text-stone-300 transition-colors border border-stone-200/50 dark:border-stone-700/50"
          >
            Disconnect
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-12 relative z-10 w-full max-w-md">

        {/* Dynamic Waveform Visualizer */}
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
            {/* Glow behind bars */}
            <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
            <div
              className="flex items-end justify-center gap-2 relative z-10"
              style={{ height: 60 }}
            >
              {displayBars.map((v, i) => (
                <div
                  key={i}
                  className="w-2 rounded-full bg-gradient-to-t from-amber-600 to-amber-400 dark:from-amber-600 dark:to-amber-300 transition-all duration-75 ease-out shadow-sm"
                  style={{
                    height: `${Math.min(60, Math.max(6, (v ?? 2) * 3))}px`,
                  }}
                />
              ))}
            </div>
          </div>

          <p className="text-stone-400 font-medium tracking-wide text-sm uppercase">Listening...</p>
        </div>

        {/* Main Mic Interaction */}
        <div className="relative group">
          <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl group-hover:blur-4xl transition-all duration-700 opacity-50" />
          <button
            type="button"
            onClick={() => {
              validButtonProps.onClick?.();
            }}
            className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-2xl shadow-red-500/20 transition-all transform hover:scale-105 active:scale-95 focus:outline-none ring-4 ring-stone-100 dark:ring-stone-900 ring-offset-4 ring-offset-stone-100 dark:ring-offset-stone-950"
            aria-label="Press to disconnect"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-white">
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
          </button>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-stone-400 bg-stone-900/90 text-white px-3 py-1 rounded-lg">
            Tap to end call
          </div>
        </div>
      </main>

      <div className="w-full max-w-2xl">
        <RoomAudioRenderer />
      </div>

      {/* Plate Animation */}
      <PlateAnimation
        isVisible={showPlate}
        imagePath={plateImagePath}
        itemName={plateItemName}
        onClose={handleClosePlate}
      />

      {/* Cart Sidebar */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen((prev) => !prev)}
        items={cartItems}
      />
    </div>
  );
}
