"use client";

import { useEffect, useRef } from "react";

interface Petal {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  wind: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  oscillationOffset: number;
  oscillationSpeed: number;
}

export default function Sakurafall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let petals: Petal[] = [];
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createPetals = () => {
      const count = 50; // Number of petals
      const newPetals: Petal[] = [];
      for (let i = 0; i < count; i++) {
        newPetals.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          width: Math.random() * 8 + 6,   // Width between 6 and 14
          height: Math.random() * 4 + 4,  // Height between 4 and 8
          speed: Math.random() * 1 + 0.5, // Speed between 0.5 and 1.5
          wind: Math.random() * 1 - 0.5,  // Horizontal drift
          opacity: Math.random() * 0.4 + 0.4, // Opacity between 0.4 and 0.8
          rotation: Math.random() * Math.PI * 2, // Initial rotation
          rotationSpeed: (Math.random() - 0.5) * 0.1, // Spin rate
          oscillationOffset: Math.random() * Math.PI * 2,
          oscillationSpeed: Math.random() * 0.05 + 0.02,
        });
      }
      petals = newPetals;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      petals.forEach((petal) => {
        ctx.save();

        // Translate to petal center
        // Add oscillation to X for fluttering effect
        const currentX = petal.x + Math.sin(time * petal.oscillationSpeed + petal.oscillationOffset) * 20;
        ctx.translate(currentX, petal.y);

        // Rotate petal
        ctx.rotate(petal.rotation);

        // Draw an ellipse shape for a petal
        ctx.beginPath();
        // Fallback for older browsers: use bezier curves if ellipse is not supported,
        // but ctx.ellipse is widely supported now.
        if (ctx.ellipse) {
          ctx.ellipse(0, 0, petal.width / 2, petal.height / 2, 0, 0, Math.PI * 2);
        } else {
          // Fallback to circle just in case
          ctx.arc(0, 0, petal.width / 2, 0, Math.PI * 2);
        }

        // Light pink color
        ctx.fillStyle = `rgba(255, 183, 197, ${petal.opacity})`;
        ctx.fill();

        ctx.restore();
      });
    };

    const update = () => {
      time++;
      petals.forEach((petal) => {
        petal.y += petal.speed;
        petal.x += petal.wind;
        petal.rotation += petal.rotationSpeed;

        // Reset if off screen
        if (petal.y > canvas.height + 20) {
          petal.y = -20;
          petal.x = Math.random() * canvas.width;
        }
        if (petal.x > canvas.width + 50) {
          petal.x = -50;
        } else if (petal.x < -50) {
          petal.x = canvas.width + 50;
        }
      });
    };

    const loop = () => {
      draw();
      update();
      animationFrameId = requestAnimationFrame(loop);
    };

    // Initialize
    resizeCanvas();
    createPetals();
    loop();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
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
