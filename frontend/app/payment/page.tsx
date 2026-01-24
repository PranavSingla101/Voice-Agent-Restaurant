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
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-stone-600 dark:text-stone-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-4">No Items in Cart</h1>
          <p className="text-stone-600 dark:text-stone-400 mb-6">
            Your cart is empty. Please add items before proceeding to payment.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
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
      <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-semibold mb-2">Payment</h1>
            <p className="text-stone-600 dark:text-stone-400">
              Complete your order by reviewing the details below. You can say "go back" or "cancel payment" to return to the menu.
            </p>
          </header>

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
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Payment</h1>
          <p className="text-stone-600 dark:text-stone-400">
            Complete your order by reviewing the details below
          </p>
        </header>

        <PaymentForm
          cartItems={cartItems}
          calculateSubtotal={calculateSubtotal}
          calculateGST={calculateGST}
          calculateTotal={calculateTotal}
          handleDone={handleDone}
          onCancel={undefined}
        />
      </div>
    </div>
  );
}
