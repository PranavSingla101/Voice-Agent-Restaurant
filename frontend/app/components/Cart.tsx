"use client";

import { motion, AnimatePresence } from "framer-motion";

export interface CartItem {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  addons?: string[];
}

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

export default function Cart({ isOpen, onClose, items }: CartProps) {
  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const calculateGST = () => {
    return calculateSubtotal() * 0.05; // 5% GST
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-stone-100 dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-stone-300 dark:border-stone-700">
                <h2 className="text-xl font-semibold">Your Cart</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                  aria-label="Close cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <CartIcon className="w-16 h-16 text-stone-400 dark:text-stone-600 mb-4" />
                    <p className="text-stone-500 dark:text-stone-400 text-lg">
                      Your cart is empty
                    </p>
                    <p className="text-stone-400 dark:text-stone-500 text-sm mt-2">
                      Add items to your cart by speaking to the assistant
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div
                        key={index}
                        className="bg-white dark:bg-stone-800 rounded-lg p-4 border border-stone-200 dark:border-stone-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-stone-900 dark:text-stone-100">
                              {item.name}
                            </h3>
                            {item.size && (
                              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                                Size: {item.size}
                              </p>
                            )}
                            {item.addons && item.addons.length > 0 && (
                              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                                Add-ons: {item.addons.join(", ")}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm text-stone-500 dark:text-stone-400">
                                Quantity: {item.quantity}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-stone-900 dark:text-stone-100">
                              ₹{(item.price * item.quantity).toFixed(0)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                ₹{item.price.toFixed(0)} each
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer with Totals */}
              {items.length > 0 && (
                <div className="border-t border-stone-300 dark:border-stone-700 p-6 space-y-3 bg-white dark:bg-stone-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600 dark:text-stone-400">
                      Subtotal
                    </span>
                    <span className="text-stone-900 dark:text-stone-100">
                      ₹{calculateSubtotal().toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600 dark:text-stone-400">
                      GST (5%)
                    </span>
                    <span className="text-stone-900 dark:text-stone-100">
                      ₹{calculateGST().toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-stone-300 dark:border-stone-700">
                    <span className="text-stone-900 dark:text-stone-100">
                      Total
                    </span>
                    <span className="text-amber-600 dark:text-amber-500">
                      ₹{calculateTotal().toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
