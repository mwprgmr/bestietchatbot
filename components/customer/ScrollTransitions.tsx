'use client'

import React, { ReactNode } from 'react'
import { motion, Variants } from 'framer-motion'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  duration?: number
  scale?: boolean
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.6,
  scale = false,
}: RevealProps) {
  const getInitialOffset = () => {
    switch (direction) {
      case 'up':
        return { y: 25, x: 0 }
      case 'down':
        return { y: -25, x: 0 }
      case 'left':
        return { x: 25, y: 0 }
      case 'right':
        return { x: -25, y: 0 }
      case 'none':
      default:
        return { x: 0, y: 0 }
    }
  }

  const offset = getInitialOffset()

  const variants: Variants = {
    hidden: {
      opacity: 0,
      x: offset.x,
      y: offset.y,
      scale: scale ? 0.96 : 1,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      },
    },
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      variants={variants}
      className={`transform-gpu ${className}`}
    >
      {children}
    </motion.div>
  )
}

interface StaggerContainerProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
}

export function ScrollStaggerContainer({
  children,
  className = '',
  staggerDelay = 0.08,
}: StaggerContainerProps) {
  const variants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={variants}
      className={`transform-gpu ${className}`}
    >
      {children}
    </motion.div>
  )
}

export function ScrollStaggerItem({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const variants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.21, 0.47, 0.32, 0.98],
      },
    },
  }

  return (
    <motion.div variants={variants} className={`transform-gpu ${className}`}>
      {children}
    </motion.div>
  )
}
