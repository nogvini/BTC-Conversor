"use client"

import { useState, useEffect } from "react"

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export default function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    let animationFrame: number

    const updateValue = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      // Easing function for smoother animation
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

      setDisplayValue(easedProgress * value)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateValue)
      }
    }

    animationFrame = requestAnimationFrame(updateValue)

    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  const formattedValue = decimals > 0 ? displayValue.toFixed(decimals) : Math.floor(displayValue).toLocaleString()

  return (
    <span className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}
