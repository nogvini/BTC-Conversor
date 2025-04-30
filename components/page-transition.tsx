"use client"

import React, { useState, useEffect } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

export function PageTransition({ 
  children, 
  className = "",
  delay = 50,
  direction = 'up'
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  const getTransformValue = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up': return 'translate-y-4'
        case 'down': return 'translate-y-[-1rem]'
        case 'left': return 'translate-x-4'
        case 'right': return 'translate-x-[-1rem]'
        default: return 'translate-y-4'
      }
    }
    return 'translate-y-0 translate-x-0'
  }

  return (
    <div
      className={`transition-all duration-500 ease-out will-change-transform ${
        isVisible
          ? "opacity-100 blur-none"
          : "opacity-0 blur-[2px]"
      } ${getTransformValue()} ${className}`}
    >
      {children}
    </div>
  )
} 