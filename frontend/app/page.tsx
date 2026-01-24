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
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-stone-900 rounded-lg p-8 border border-stone-200 dark:border-stone-700 shadow-lg">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            {/* Order Confirmed Message */}
            <h1 className="text-3xl font-semibold text-center mb-2">
              Order Confirmed!
            </h1>
            <p className="text-center text-stone-600 dark:text-stone-400 mb-6">
              Thank you for your order. We're preparing it now.
            </p>

            {/* Order Details */}
            <div className="bg-stone-50 dark:bg-stone-800 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  Order ID
                </span>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-100">
                  {currentOrder.orderId}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  Status
                </span>
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full text-sm font-medium">
                  {currentOrder.status === "in_progress" ? "In Progress" : currentOrder.status}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  Total Amount
                </span>
                <span className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  ₹{currentOrder.total.toFixed(0)}
                </span>
              </div>
              <div className="pt-4 border-t border-stone-200 dark:border-stone-700">
                <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                  Items ({currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)}):
                </p>
                <ul className="space-y-1">
                  {currentOrder.items.map((item, index) => (
                    <li
                      key={index}
                      className="text-sm text-stone-600 dark:text-stone-400"
                    >
                      {item.quantity}x {item.name}
                      {item.size && ` (${item.size})`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePlaceNewOrder}
                className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-amber-400/40"
              >
                Place a New Order
              </button>
              <button
                onClick={handleCheckOrderStatus}
                className="flex-1 px-6 py-3 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-900 dark:text-stone-100 rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-stone-400/40"
              >
                Check Order Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen((prev) => !prev)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-colors focus:outline-none focus:ring-4 focus:ring-amber-400/40"
            aria-label={`${isCartOpen ? "Close" : "Open"} cart`}
          >
            <svg
              className="w-5 h-5"
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
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
          <button
            {...validButtonProps}
            className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Leave
          </button>
        </div>
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

          {/* Mic button — click to disconnect */}
          <button
            type="button"
            onClick={() => {
              validButtonProps.onClick?.();
            }}
            className="flex h-36 w-36 items-center justify-center rounded-full bg-amber-600 hover:bg-amber-500 shadow-lg transition focus:outline-none focus:ring-4 focus:ring-amber-400/40"
            aria-label="Press to disconnect"
          >
            <MicIcon className="h-18 w-18 text-white" />
          </button>

          <p className="text-sm text-stone-500 dark:text-stone-400">
            Press again to disconnect
          </p>
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
