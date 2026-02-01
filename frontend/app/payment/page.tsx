"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CartItem } from "../components/Cart";
import PaymentForm from "../components/PaymentForm";
import {
  LiveKitRoom,
  useRoomContext,
} from "@livekit/components-react";
import type { DataPacket_Kind } from "livekit-client";

const DEFAULT_ROOM = process.env.NEXT_PUBLIC_LIVEKIT_ROOM_NAME || "restaurant-voice-order";

export default function PaymentPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [identity] = useState(
    `guest-${Math.floor(Math.random() * 10_000)}`
  );

  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT;
  const fallbackServerUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  useEffect(() => {
    // Load cart items from sessionStorage
    const storedItems = sessionStorage.getItem("pendingOrderItems");
    if (storedItems) {
      try {
        const items: CartItem[] = JSON.parse(storedItems);
        setCartItems(items);
      } catch (error) {
        console.error("Error loading cart items:", error);
      }
    }

    // Try to get token and serverUrl from sessionStorage (from main page)
    const storedToken = sessionStorage.getItem("livekit_token");
    const storedServerUrl = sessionStorage.getItem("livekit_server_url");
    const storedIdentity = sessionStorage.getItem("livekit_identity");

    if (storedToken && storedServerUrl) {
      setToken(storedToken);
      setServerUrl(storedServerUrl);
      setIsLoading(false);
    } else if (tokenEndpoint) {
      // If not in sessionStorage, fetch new token
      const fetchToken = async () => {
        try {
          const res = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room_name: DEFAULT_ROOM,
              identity: storedIdentity || identity
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as { token: string; url?: string };
            setToken(data.token);
            setServerUrl(data.url ?? fallbackServerUrl ?? null);
            // Store in sessionStorage for future use
            sessionStorage.setItem("livekit_token", data.token);
            if (data.url || fallbackServerUrl) {
              sessionStorage.setItem("livekit_server_url", data.url || fallbackServerUrl || "");
            }
            if (storedIdentity) {
              sessionStorage.setItem("livekit_identity", storedIdentity);
            }
          }
        } catch (error) {
          console.error("Error fetching token:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchToken();
    } else {
      setIsLoading(false);
    }
  }, [tokenEndpoint, fallbackServerUrl, identity]);

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const calculateGST = () => {
    return calculateSubtotal() * 0.05; // 5% GST
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const generateOrderId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORD-${timestamp}-${random}`;
  };

  const handleDone = () => {
    if (cartItems.length === 0) {
      alert("No items in cart");
      return;
    }

    // Generate order data
    const orderId = generateOrderId();
    const orderData = {
      orderId,
      status: "in_progress" as const,
      items: cartItems,
      total: calculateTotal(),
      timestamp: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem("currentOrder", JSON.stringify(orderData));

    // Clear sessionStorage
    sessionStorage.removeItem("pendingOrderItems");

    // Navigate back to home
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[100px]" />
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-stone-600 dark:text-stone-400 font-medium">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="text-center max-w-md relative z-10 bg-white/50 dark:bg-stone-900/50 backdrop-blur-xl p-8 rounded-2xl border border-stone-200/50 dark:border-stone-800/50 shadow-xl">
          <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
          <p className="text-stone-500 dark:text-stone-400 mb-8">
            Looks like you haven't added anything to your cart yet.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full px-6 py-3 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-xl font-semibold transition-all active:scale-95"
          >
            Go Back directly
          </button>
        </div>
      </div>
    );
  }

  // Payment page content component that uses LiveKit room
  const PaymentContent = () => {
    const room = useRoomContext();

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

          // Handle navigation commands
          if (data.type === "navigate_to_menu" || data.type === "cancel_payment") {
            router.push("/");
          }
        } catch (error) {
          console.error("Error parsing data message:", error);
        }
      };

      room.on("dataReceived", handleDataReceived);

      return () => {
        room.off("dataReceived", handleDataReceived);
      };
    }, [room, router]);

    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
          {/* Header */}
          <header className="mb-10 text-center sm:text-left">
            <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-stone-900 to-stone-600 dark:from-white dark:to-stone-400">
              Checkout
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-lg max-w-2xl">
              Complete your order by reviewing the details below. You can say <span className="font-semibold text-amber-600 dark:text-amber-400">"go back"</span> or <span className="font-semibold text-red-600 dark:text-red-400">"cancel payment"</span> at any time.
            </p>
          </header>

          <div className="bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/50 dark:border-stone-800/50 overflow-hidden">
            <div className="p-6 sm:p-8">
              <PaymentForm
                cartItems={cartItems}
                calculateSubtotal={calculateSubtotal}
                calculateGST={calculateGST}
                calculateTotal={calculateTotal}
                handleDone={handleDone}
                onCancel={() => router.push("/")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If we have token and serverUrl, wrap in LiveKitRoom
  if (token && serverUrl) {
    return (
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        audio
        video={false}
        connect
        data-lk-theme="default"
        className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100"
      >
        <PaymentContent />
      </LiveKitRoom>
    );
  }

  // Fallback: render without LiveKit if no connection
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <header className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-stone-900 to-stone-600 dark:from-white dark:to-stone-400">
            Checkout
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-lg">
            Complete your order by reviewing the details below
          </p>
        </header>

        <div className="bg-white/60 dark:bg-stone-900/60 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/50 dark:border-stone-800/50 overflow-hidden">
          <div className="p-6 sm:p-8">
            <PaymentForm
              cartItems={cartItems}
              calculateSubtotal={calculateSubtotal}
              calculateGST={calculateGST}
              calculateTotal={calculateTotal}
              handleDone={handleDone}
              onCancel={() => router.push("/")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
