"use client";

import React, { useEffect, useRef } from "react";
import { BookOpen, Headphones, MessageCircle, Sparkles } from "lucide-react";
import styles from "./ambient-background.module.css";

/** Decorative only: pointer movement never updates React state. */
export function AmbientBackground() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      root.current?.style.setProperty("--wave-x", `${x}px`);
      root.current?.style.setProperty("--wave-y", `${y}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const move = (event: PointerEvent) => {
      if (preference.matches || !pointer.matches) return;
      x = (event.clientX / window.innerWidth - 0.5) * 20;
      y = (event.clientY / window.innerHeight - 0.5) * 14;
      schedule();
    };
    const reset = () => { x = 0; y = 0; schedule(); };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    preference.addEventListener("change", reset);
    pointer.addEventListener("change", reset);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      preference.removeEventListener("change", reset);
      pointer.removeEventListener("change", reset);
    };
  }, []);

  return (
    <div ref={root} className={styles.background} aria-hidden="true">
      <div className={styles.parallax}>
        <svg className={styles.waves} viewBox="0 0 1440 1000" preserveAspectRatio="none" fill="none">
          <g className={styles.upper}>
            {[0, 28, 56, 84].map((offset) => (
              <path key={offset} transform={`translate(0 ${offset})`} d="M-120 160 C140 -40 280 340 550 130 S1000 40 1560 180" />
            ))}
          </g>
          <g className={styles.middle}>
            {[0, 32, 64, 96].map((offset) => (
              <path key={offset} transform={`translate(0 ${offset})`} d="M-120 420 C160 200 360 680 720 440 S1200 320 1560 500" />
            ))}
          </g>
          <g className={styles.lower}>
            {[0, 26, 52, 78].map((offset) => (
              <path key={offset} transform={`translate(0 ${offset})`} d="M-120 740 C180 560 350 1020 680 800 S1120 650 1560 870" />
            ))}
          </g>
        </svg>
        <BookOpen className={`${styles.icon} ${styles.book}`} strokeWidth={1.2} />
        <MessageCircle className={`${styles.icon} ${styles.chat}`} strokeWidth={1.2} />
        <Headphones className={`${styles.icon} ${styles.headphones}`} strokeWidth={1.2} />
        <Sparkles className={`${styles.icon} ${styles.sparkles}`} strokeWidth={1.2} />
      </div>
    </div>
  );
}
