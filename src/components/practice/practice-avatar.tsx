"use client";

/**
 * PracticeAvatar — animated bot/avatar for the Practice Session shell.
 *
 * Renders a CSS-animated SVG character whose visual style adapts to the
 * current practice state.  A `lottieUrl` prop can optionally be supplied to
 * replace the SVG with a Lottie JSON animation loaded via URL (the SVG shows
 * during load or on error).
 *
 * States:
 *  idle      — gentle floating + breathing scale
 *  speaking  — expanding sound-wave rings emanate from the avatar
 *  listening — green pulse ring, avatar tilts slightly
 *  thinking  — three bouncing dots, muted opacity
 */

import dynamic from "next/dynamic";
import React, { useState } from "react";

export type AvatarState = "idle" | "speaking" | "listening" | "thinking";

/* ─── Lottie lazy-load (named export, no SSR) ──────────────────────────── */

const LottieDynamic = dynamic(
  () => import("lottie-react").then((mod) => ({ default: mod.Lottie as React.ComponentType<{ src: string | object; loop?: boolean; autoplay?: boolean; style?: React.CSSProperties }> })),
  { ssr: false },
);

/* ─── Main component ────────────────────────────────────────────────────── */

export interface PracticeAvatarProps {
  state: AvatarState;
  /** Optional: CDN URL of a Lottie JSON to use instead of the SVG avatar. */
  lottieUrl?: string;
  className?: string;
}

export function PracticeAvatar({ state, lottieUrl, className = "" }: PracticeAvatarProps) {
  const [lottieError, setLottieError] = useState(false);
  const showLottie = Boolean(lottieUrl) && !lottieError;

  return (
    <div className={`ps-avatar ps-avatar--${state} ${className}`} aria-hidden="true">
      {/* Wave rings for speaking state */}
      {state === "speaking" && (
        <div className="ps-avatar-rings">
          <span className="ps-ring ps-ring-1" />
          <span className="ps-ring ps-ring-2" />
          <span className="ps-ring ps-ring-3" />
        </div>
      )}

      {/* Listening pulse ring */}
      {state === "listening" && (
        <div className="ps-avatar-rings">
          <span className="ps-ring ps-ring-listen" />
        </div>
      )}

      {/* Avatar body */}
      <div className="ps-avatar-body">
        {showLottie && lottieUrl ? (
          <LottieDynamic
            src={lottieUrl}
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <SvgAvatar state={state} />
        )}
      </div>

      {/* Waveform bars (speaking state) */}
      {state === "speaking" && (
        <div aria-hidden="true" aria-label="Đang phát câu hỏi" className="ps-avatar-waveform">
          <span className="ps-waveform-bar" />
          <span className="ps-waveform-bar" />
          <span className="ps-waveform-bar" />
          <span className="ps-waveform-bar" />
          <span className="ps-waveform-bar" />
        </div>
      )}

      {/* Thinking orbit dots */}
      {state === "thinking" && (
        <div className="ps-avatar-thinking" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}

/* ─── SVG Avatar ────────────────────────────────────────────────────────── */

function SvgAvatar({ state }: { state: AvatarState }) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="ps-svg-avatar"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ps-bodyGrad" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <radialGradient id="ps-glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e9d5ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ps-screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="ps-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="7" floodColor="#4c1d95" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Outer glow halo */}
      <circle cx="100" cy="100" r="92" fill="url(#ps-glowGrad)" />

      {/* Main body */}
      <circle cx="100" cy="100" r="80" fill="url(#ps-bodyGrad)" filter="url(#ps-shadow)" />

      {/* Face screen panel */}
      <rect x="54" y="62" width="92" height="76" rx="18" fill="url(#ps-screenGrad)" opacity="0.2" />

      {/* Eyes */}
      <AvatarEyes state={state} />

      {/* Mouth / speaker */}
      <AvatarMouth state={state} />

      {/* Antenna */}
      <line x1="100" y1="20" x2="100" y2="40" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="15" r="6" fill="#a78bfa" />

      {/* Ear nubs */}
      <rect x="17" y="83" width="12" height="24" rx="6" fill="#6d28d9" />
      <rect x="171" y="83" width="12" height="24" rx="6" fill="#6d28d9" />

      {/* Chin / neck */}
      <rect x="62" y="161" width="76" height="22" rx="11" fill="#5b21b6" />
      <ellipse cx="100" cy="177" rx="36" ry="9" fill="#4c1d95" opacity="0.4" />
    </svg>
  );
}

function AvatarEyes({ state }: { state: AvatarState }) {
  if (state === "thinking") {
    // Squinting eyes
    return (
      <g>
        <line x1="72" y1="97" x2="88" y2="95" stroke="#1e1b4b" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="112" y1="95" x2="128" y2="97" stroke="#1e1b4b" strokeWidth="3.5" strokeLinecap="round" />
      </g>
    );
  }
  if (state === "listening") {
    // Wide attentive eyes
    return (
      <g>
        <circle cx="80" cy="95" r="10.5" fill="white" />
        <circle cx="120" cy="95" r="10.5" fill="white" />
        <circle cx="81" cy="96" r="5.5" fill="#1e1b4b" />
        <circle cx="121" cy="96" r="5.5" fill="#1e1b4b" />
        <circle cx="83" cy="93" r="2" fill="white" opacity="0.75" />
        <circle cx="123" cy="93" r="2" fill="white" opacity="0.75" />
      </g>
    );
  }
  // Idle / speaking — friendly normal eyes
  return (
    <g>
      <ellipse cx="80" cy="96" rx="9.5" ry="9.5" fill="white" />
      <ellipse cx="120" cy="96" rx="9.5" ry="9.5" fill="white" />
      <circle cx="81" cy="97" r="5" fill="#312e81" />
      <circle cx="121" cy="97" r="5" fill="#312e81" />
      <circle cx="83" cy="94" r="2" fill="white" opacity="0.7" />
      <circle cx="123" cy="94" r="2" fill="white" opacity="0.7" />
    </g>
  );
}

function AvatarMouth({ state }: { state: AvatarState }) {
  if (state === "speaking") {
    // Equalizer bars — animated via CSS
    return (
      <g className="ps-svg-equalizer">
        <rect x="78"  y="118" width="5" height="8"  rx="2.5" fill="#c4b5fd" className="ps-eq-bar ps-eq-bar-1" />
        <rect x="87"  y="114" width="5" height="12" rx="2.5" fill="#ddd6fe" className="ps-eq-bar ps-eq-bar-2" />
        <rect x="96"  y="116" width="5" height="10" rx="2.5" fill="#c4b5fd" className="ps-eq-bar ps-eq-bar-3" />
        <rect x="105" y="112" width="5" height="14" rx="2.5" fill="#ddd6fe" className="ps-eq-bar ps-eq-bar-4" />
        <rect x="114" y="118" width="5" height="8"  rx="2.5" fill="#c4b5fd" className="ps-eq-bar ps-eq-bar-5" />
      </g>
    );
  }
  if (state === "listening") {
    return <ellipse cx="100" cy="124" rx="10" ry="5" fill="#1e1b4b" opacity="0.45" />;
  }
  if (state === "thinking") {
    return <line x1="88" y1="124" x2="112" y2="124" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />;
  }
  // Idle — smile
  return (
    <path
      d="M 86 120 Q 100 134 114 120"
      stroke="#c4b5fd"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />
  );
}
