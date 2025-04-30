"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  highlightChange?: boolean
}

export default function AnimatedCounter({
  value,
  duration = 1000,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  highlightChange = false
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isIncreasing, setIsIncreasing] = useState(false)
  const [isDecreasing, setIsDecreasing] = useState(false)
  const previousValue = useRef(value)

  useEffect(() => {
    // Determinar se o valor está aumentando ou diminuindo
    if (value > previousValue.current) {
      setIsIncreasing(true)
      setIsDecreasing(false)
    } else if (value < previousValue.current) {
      setIsIncreasing(false)
      setIsDecreasing(true)
    }
    
    let startTime: number | null = null
    let animationFrame: number

    const updateValue = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsedTime = timestamp - startTime
      const progress = Math.min(elapsedTime / duration, 1)

      // Função de easing cúbica para animação mais natural
      const easedProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      setDisplayValue(previousValue.current + (value - previousValue.current) * easedProgress)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(updateValue)
      } else {
        // Resetar os estados após a animação
        setTimeout(() => {
          setIsIncreasing(false)
          setIsDecreasing(false)
        }, 700)
        
        // Atualizar referência para o próximo ciclo
        previousValue.current = value
      }
    }

    animationFrame = requestAnimationFrame(updateValue)

    return () => {
      cancelAnimationFrame(animationFrame)
      previousValue.current = value
    }
  }, [value, duration])

  const formattedValue = decimals > 0 
    ? displayValue.toFixed(decimals) 
    : Math.floor(displayValue).toLocaleString()

  return (
    <span 
      className={cn(
        className,
        "transition-colors duration-700",
        highlightChange && isIncreasing && "text-green-400",
        highlightChange && isDecreasing && "text-red-400",
      )}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}
