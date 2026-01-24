"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface PlateAnimationProps {
  isVisible: boolean;
  imagePath: string | null;
  itemName: string | null;
  onClose: () => void;
}

export default function PlateAnimation({
  isVisible,
  imagePath,
  itemName,
  onClose,
}: PlateAnimationProps) {
  // Auto-hide after 10 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && imagePath && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            duration: 0.6,
          }}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50"
          style={{ willChange: "transform" }}
        >
          <div className="relative">
            {/* Plate */}
            <div className="relative w-64 h-64 bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-700 dark:to-stone-800 rounded-full shadow-2xl border-4 border-stone-400 dark:border-stone-600 overflow-hidden">
              {/* Plate rim */}
              <div className="absolute inset-0 rounded-full border-8 border-stone-300 dark:border-stone-600 opacity-50"></div>
              
              {/* Image container */}
              <div className="absolute inset-4 rounded-full overflow-hidden bg-white dark:bg-stone-900">
                {imagePath ? (
                  <img
                    src={imagePath}
                    alt={itemName || "Menu item"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if image doesn't exist
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="flex items-center justify-center h-full text-stone-500 dark:text-stone-400 text-sm">
                            Image not found
                          </div>
                        `;
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-500 dark:text-stone-400 text-sm">
                    No image available
                  </div>
                )}
              </div>
            </div>

            {/* Item name label */}
            {itemName && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg"
              >
                {itemName}
              </motion.div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Close"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
