'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function AnimatedWaveLines() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10 opacity-70">
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7FBA44" stopOpacity="0" />
            <stop offset="30%" stopColor="#7FBA44" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#2DD4BF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0" />
            <stop offset="40%" stopColor="#2DD4BF" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#7FBA44" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7FBA44" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06707B" stopOpacity="0" />
            <stop offset="50%" stopColor="#7FBA44" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Wave Line 1 */}
        <motion.path
          d="M-100 450 Q 360 250, 720 450 T 1540 450"
          stroke="url(#waveGrad1)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathOffset: 0, opacity: 0.3 }}
          animate={{
            d: [
              "M-100 450 Q 360 250, 720 450 T 1540 450",
              "M-100 480 Q 360 300, 720 420 T 1540 480",
              "M-100 450 Q 360 250, 720 450 T 1540 450",
            ],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Wave Line 2 */}
        <motion.path
          d="M-100 520 Q 400 650, 800 480 T 1540 520"
          stroke="url(#waveGrad2)"
          strokeWidth="1.2"
          fill="none"
          initial={{ opacity: 0.2 }}
          animate={{
            d: [
              "M-100 520 Q 400 650, 800 480 T 1540 520",
              "M-100 490 Q 400 580, 800 520 T 1540 490",
              "M-100 520 Q 400 650, 800 480 T 1540 520",
            ],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Wave Line 3 (Lower depth) */}
        <motion.path
          d="M-100 600 Q 300 400, 750 620 T 1540 600"
          stroke="url(#waveGrad3)"
          strokeWidth="1.8"
          fill="none"
          initial={{ opacity: 0.25 }}
          animate={{
            d: [
              "M-100 600 Q 300 400, 750 620 T 1540 600",
              "M-100 630 Q 300 450, 750 580 T 1540 630",
              "M-100 600 Q 300 400, 750 620 T 1540 600",
            ],
            opacity: [0.25, 0.55, 0.25],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
    </div>
  )
}
