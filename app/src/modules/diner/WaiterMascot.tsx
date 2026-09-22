"use client";
import { useEffect, useState } from "react";

// Original waiter quips — not verbatim show dialogue. Warm, food-and-hospitality
// themed lines in the spirit of "no guest goes hungry," rotated at random.
const WAITER_LINES = [
  "A meal made with love is never wasted.",
  "No guest of mine ever leaves hungry!",
  "Every dish has a story — want to hear today's?",
  "The kitchen is my battlefield, and flavor is my victory.",
  "A good cook always saves room for someone in need.",
  "Hungry? Let's find you something wonderful.",
  "I judge a kitchen by how well it treats a hungry stranger.",
  "Ask away — feeding people is what I live for.",
];

export default function WaiterMascot({ onOpen, label }: { onOpen: () => void; label: string }) {
  const [facing, setFacing] = useState(1);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const flipTimer = setInterval(() => setFacing((f) => f * -1), 4000);
    const quoteTimer = setInterval(() => {
      setQuoteIndex((i) => {
        let next = Math.floor(Math.random() * WAITER_LINES.length);
        if (next === i) next = (next + 1) % WAITER_LINES.length;
        return next;
      });
    }, 4200);
    return () => {
      clearInterval(flipTimer);
      clearInterval(quoteTimer);
    };
  }, []);

  return (
    <div className="waiterMascotLane">
      <button className="waiterMascotBtn" aria-label={label} onClick={onOpen}>
        <div className="waiterMascotBubble">{WAITER_LINES[quoteIndex]}</div>
        <div className="waiterMascotFlip" style={{ transform: facing === 1 ? "scaleX(1)" : "scaleX(-1)" }}>
          <div className="waiterMascotBob">
            <svg className="waiterMascotSvg" viewBox="0 0 60 88" aria-hidden="true">
              <defs>
                <linearGradient id="waiterHairG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffe38a" />
                  <stop offset="1" stopColor="#f0b93f" />
                </linearGradient>
                <linearGradient id="waiterSkinG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffe1bd" />
                  <stop offset="1" stopColor="#ffcf9e" />
                </linearGradient>
                <linearGradient id="waiterUniG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#dff3e7" />
                </linearGradient>
                <linearGradient id="waiterApronG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fffdf7" />
                  <stop offset="1" stopColor="#fff1da" />
                </linearGradient>
                <linearGradient id="waiterPantsG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2f386b" />
                  <stop offset="1" stopColor="#1d2447" />
                </linearGradient>
                <linearGradient id="waiterShoeG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#96633c" />
                  <stop offset="1" stopColor="#6e4527" />
                </linearGradient>
              </defs>
              <ellipse cx="30" cy="84" rx="16" ry="3" fill="rgba(10,8,30,.28)" />
              <g className="waiterSwingGroup waiterLegR">
                <rect x="27" y="56" width="9" height="20" rx="4.5" fill="url(#waiterPantsG)" stroke="#12163a" strokeWidth="0.6" />
                <ellipse cx="31.5" cy="77" rx="7" ry="4.5" fill="url(#waiterShoeG)" stroke="#4a2f1b" strokeWidth="0.6" />
                <ellipse cx="29.7" cy="75.4" rx="2" ry="1" fill="#caa06a" opacity=".7" />
              </g>
              <g className="waiterSwingGroup waiterLegL">
                <rect x="20" y="56" width="9" height="20" rx="4.5" fill="url(#waiterPantsG)" stroke="#12163a" strokeWidth="0.6" />
                <ellipse cx="24.5" cy="77" rx="7" ry="4.5" fill="url(#waiterShoeG)" stroke="#4a2f1b" strokeWidth="0.6" />
                <ellipse cx="22.7" cy="75.4" rx="2" ry="1" fill="#caa06a" opacity=".7" />
              </g>
              <g className="waiterSwingGroup waiterArmTray">
                <rect x="38" y="36" width="8" height="19" rx="4" fill="url(#waiterUniG)" stroke="#c9ded1" strokeWidth="0.6" />
                <rect x="38" y="51" width="8" height="4" rx="2" fill="#ffffff" stroke="#c9ded1" strokeWidth="0.5" />
                <circle cx="46" cy="30" r="3.6" fill="url(#waiterSkinG)" stroke="#e0a97a" strokeWidth="0.5" />
                <ellipse cx="49" cy="27" rx="12" ry="3.2" fill="#fff9ec" stroke="#e3d6b8" strokeWidth="1" />
                <path d="M39 26.4c4-1.6 16-1.6 20 0" stroke="#ffffff" strokeWidth="1" fill="none" opacity=".7" />
                <circle cx="49" cy="25.2" r="4.6" fill="#ffe9c7" stroke="#e3d6b8" strokeWidth="1" />
                <circle cx="49" cy="24.3" r="1.6" fill="var(--gold)" />
                <path d="M55 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#fff2c4" opacity=".9" />
              </g>
              <g className="waiterSwingGroup waiterArmFree">
                <rect x="14" y="36" width="8" height="19" rx="4" fill="url(#waiterUniG)" stroke="#c9ded1" strokeWidth="0.6" />
                <rect x="14" y="51" width="8" height="4" rx="2" fill="#ffffff" stroke="#c9ded1" strokeWidth="0.5" />
                <circle cx="18" cy="55" r="4" fill="url(#waiterSkinG)" stroke="#e0a97a" strokeWidth="0.5" />
              </g>
              <rect x="15" y="28" width="30" height="30" rx="12" fill="url(#waiterUniG)" stroke="#c9ded1" strokeWidth="0.8" />
              <path d="M24 28l6 6 6-6" fill="none" stroke="#b9d6c4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M27 31l-3 2 3 2z" fill="#232a55" />
              <path d="M33 31l3 2-3 2z" fill="#232a55" />
              <rect x="28.6" y="31.6" width="2.8" height="2.8" rx="1" fill="#171c3f" />
              <circle cx="24" cy="38" r="1.6" fill="#c9c6e0" />
              <circle cx="23.4" cy="37.4" r=".5" fill="#fff" opacity=".8" />
              <circle cx="24" cy="45" r="1.6" fill="#c9c6e0" />
              <circle cx="23.4" cy="44.4" r=".5" fill="#fff" opacity=".8" />
              <rect x="18" y="41" width="24" height="16" rx="7" fill="url(#waiterApronG)" stroke="#e7ddc9" strokeWidth="0.8" />
              <rect x="25" y="46" width="10" height="6" rx="2" fill="none" stroke="#e7ddc9" strokeWidth="1" />
              <circle cx="30" cy="18" r="15" fill="url(#waiterSkinG)" stroke="#e0a97a" strokeWidth="0.8" />
              <path d="M14 15c1-9 8-13 16-13s15 4 16 13c-3-4-9-5-16-5s-13 1-16 5z" fill="url(#waiterHairG)" stroke="#caa23a" strokeWidth="0.6" />
              <path d="M14 15c-1 3 0 6 2 8 0-3 1-5 2-7-2 0-3-1-4-1z" fill="url(#waiterHairG)" stroke="#caa23a" strokeWidth="0.5" />
              <path d="M46 15c1 3 0 6-2 8 0-3-1-5-2-7 2 0 3-1 4-1z" fill="url(#waiterHairG)" stroke="#caa23a" strokeWidth="0.5" />
              <path d="M22 5c3-1 6-1 9 0" stroke="#fff3c9" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".8" />
              <path d="M22 22q3-2 6 0" stroke="#c98a2a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              <path d="M32 22q3-2 6 0" stroke="#c98a2a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              <circle cx="24" cy="20" r="2.1" fill="#3a2f1a" />
              <circle cx="23.3" cy="19.2" r=".7" fill="#fff" />
              <circle cx="36" cy="20" r="2.1" fill="#3a2f1a" />
              <circle cx="35.3" cy="19.2" r=".7" fill="#fff" />
              <circle cx="20" cy="25" r="2.8" fill="#ffb3b3" opacity=".55" />
              <circle cx="40" cy="25" r="2.8" fill="#ffb3b3" opacity=".55" />
              <path d="M24 27q6 5 12 0" stroke="#a85a2a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M27 27.8c1.6 1 4.4 1 6 0" stroke="#fff" strokeWidth="1" fill="none" strokeLinecap="round" opacity=".8" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}
