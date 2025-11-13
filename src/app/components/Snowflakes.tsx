"use client"

import { useEffect, useState } from "react"

interface Snowflake {
  id: string
  left: string
  delay: string
  duration: string
  size: string
}

export default function Snowflakes() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])

  useEffect(() => {
    const generateSnowflakes = () => {
      const flakes: Snowflake[] = Array.from({ length: 50 }, (_, i) => ({
        id: `snowflake-${i}`,
        left: Math.random() * 100 + "%",
        delay: Math.random() * 5 + "s",
        duration: Math.random() * 8 + 10 + "s",
        size: Math.random() * 1.5 + 0.5 + "rem",
      }))
      setSnowflakes(flakes)
    }

    generateSnowflakes()
  }, [])

  return (
    <>
      <style>{`
        @keyframes snowfallAnimation {
          0% {
            transform: translateY(-10px) translateX(0);
            opacity: 0.7;
          }
          25% {
            transform: translateY(25vh) translateX(50px);
          }
          50% {
            transform: translateY(50vh) translateX(-30px);
            opacity: 0.8;
          }
          75% {
            transform: translateY(75vh) translateX(40px);
          }
          100% {
            transform: translateY(100vh) translateX(0);
            opacity: 0;
          }
        }
      `}</style>

      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 40 }}>
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            style={{
              position: "absolute",
              left: flake.left,
              top: "-10px",
              fontSize: flake.size,
              opacity: 0.7,
              animation: `snowfallAnimation ${flake.duration} linear ${flake.delay} infinite`,
            }}
          >
            ❄️
          </div>
        ))}
      </div>
    </>
  )
}
