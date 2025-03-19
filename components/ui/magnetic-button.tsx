"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  strength?: number
  onClick?: () => void
  as?: React.ElementType // Add this to allow changing the element type
}

export function MagneticButton({ 
  children, 
  className, 
  strength = 30, 
  onClick,
  as: Component = "div" // Default to div instead of button
}: MagneticButtonProps) {
  const elementRef = useRef<HTMLElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (isMobile || !elementRef.current) return

    const element = elementRef.current
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const mouseX = e.clientX
    const mouseY = e.clientY

    const distanceX = mouseX - centerX
    const distanceY = mouseY - centerY
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY)
    const maxDistance = Math.max(rect.width, rect.height) / 2

    if (distance < maxDistance) {
      const moveX = (distanceX / maxDistance) * strength
      const moveY = (distanceY / maxDistance) * strength
      setPosition({ x: moveX, y: moveY })
    } else {
      setPosition({ x: 0, y: 0 })
    }
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <Component
      ref={elementRef}
      className={cn("relative transition-transform duration-100 ease-out", className)}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {children}
    </Component>
  )
}