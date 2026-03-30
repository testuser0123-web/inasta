"use client";

import { useEffect, useRef } from "react";

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wind: number;
  opacity: number;
}

export default function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let snowflakes: Snowflake[] = [];
    let lastTime = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createSnowflakes = () => {
      const count = 100; // Number of snowflakes
      const newSnowflakes: Snowflake[] = [];
      for (let i = 0; i < count; i++) {
        newSnowflakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 3 + 1, // Size between 1 and 4
          speed: Math.random() * 1.5 + 0.5, // Speed between 0.5 and 2
          wind: Math.random() * 0.5 - 0.25, // Slight horizontal drift
          opacity: Math.random() * 0.5 + 0.3, // Opacity between 0.3 and 0.8
        });
      }
      snowflakes = newSnowflakes;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snowflakes.forEach((flake) => {
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
        ctx.fill();
      });
    };

    const update = (deltaTimeScale: number) => {
      snowflakes.forEach((flake) => {
        flake.y += flake.speed * deltaTimeScale;
        flake.x += flake.wind * deltaTimeScale;

        // Reset if off screen
        if (flake.y > canvas.height) {
          flake.y = -flake.radius;
          flake.x = Math.random() * canvas.width;
        }
        if (flake.x > canvas.width) {
          flake.x = 0;
        } else if (flake.x < 0) {
          flake.x = canvas.width;
        }
      });
    };

    const loop = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      // Calculate scale factor relative to 60 FPS (approx 16.66ms per frame)
      // Cap deltaTime at 50ms to prevent massive jumps if tab is inactive
      const clampedDeltaTime = Math.min(deltaTime, 50);
      const deltaTimeScale = clampedDeltaTime / 16.66;

      draw();
      update(deltaTimeScale);
      animationFrameId.current = requestAnimationFrame(loop);
    };

    // Initialize
    resizeCanvas();
    createSnowflakes();
    animationFrameId.current = requestAnimationFrame(loop);

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      aria-hidden="true"
    />
  );
}
