"use client";
import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Pointer-driven parallax. Reserved for surfaces the reader is meant to treat
 * as physical objects — the dashboard deck and the cohort directory — so the
 * depth stays meaningful instead of decorating every card on the page.
 */
export function Tilt({
  children,
  className,
  strength = 6,
  lift = 10,
  glare = true,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  lift?: number;
  glare?: boolean;
}) {
  const reduced = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.4 };
  const rotateX = useSpring(
    useTransform(py, [0, 1], [strength, -strength]),
    spring,
  );
  const rotateY = useSpring(
    useTransform(px, [0, 1], [-strength, strength]),
    spring,
  );
  const z = useSpring(useMotionValue(0), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cn("preserve-3d relative", className)}
      style={{ rotateX, rotateY, translateZ: z, transformPerspective: 900 }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width);
        py.set((event.clientY - rect.top) / rect.height);
      }}
      onPointerEnter={() => z.set(lift)}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
        z.set(0);
      }}
    >
      {children}
      {glare && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 [.group:hover_&]:opacity-100"
          style={{
            background: `radial-gradient(220px circle at ${glareX} ${glareY}, color-mix(in oklab, var(--ink) 9%, transparent), transparent 70%)`,
          }}
        />
      )}
    </motion.div>
  );
}
