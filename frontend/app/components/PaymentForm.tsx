"use client";

import { CartItem } from "./Cart";

interface PaymentFormProps {
  cartItems: CartItem[];
  calculateSubtotal: () => number;
  calculateGST: () => number;
  calculateTotal: () => number;
  handleDone: () => void;
  onCancel: () => void;
}

export default function PaymentForm({
  cartItems,
  calculateSubtotal,
  calculateGST,
  calculateTotal,
  handleDone,
  onCancel,
}: PaymentFormProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Order Summary */}
      <div className="bg-white dark:bg-stone-900 rounded-lg p-6 border border-stone-200 dark:border-stone-700">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="space-y-4 mb-6">
          {cartItems.map((item, index) => (
            <div
              key={index}
              className="flex items-start justify-between pb-4 border-b border-stone-200 dark:border-stone-700 last:border-0"
            >
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
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Quantity: {item.quantity}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  ₹{(item.price * item.quantity).toFixed(0)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-4 border-t border-stone-300 dark:border-stone-700">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600 dark:text-stone-400">Subtotal</span>
            <span className="text-stone-900 dark:text-stone-100">
              ₹{calculateSubtotal().toFixed(0)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-600 dark:text-stone-400">GST (5%)</span>
            <span className="text-stone-900 dark:text-stone-100">
              ₹{calculateGST().toFixed(0)}
            </span>
          </div>
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-stone-300 dark:border-stone-700">
            <span className="text-stone-900 dark:text-stone-100">Total</span>
            <span className="text-amber-600 dark:text-amber-500">
              ₹{calculateTotal().toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="bg-white dark:bg-stone-900 rounded-lg p-6 border border-stone-200 dark:border-stone-700">
        <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Card Number
            </label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              disabled
              className="w-full px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                Expiry Date
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                disabled
                className="w-full px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                CVV
              </label>
              <input
                type="text"
                placeholder="123"
                disabled
                className="w-full px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              disabled
              className="w-full px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 cursor-not-allowed"
            />
          </div>
          <div className="pt-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              This is a demo payment page. No actual payment will be processed.
            </p>
            <button
              onClick={handleDone}
              className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-4 focus:ring-amber-400/40"
            >
              Done
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full mt-3 px-6 py-3 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-900 dark:text-stone-100 rounded-lg font-medium transition-colors"
              >
                Cancel Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
