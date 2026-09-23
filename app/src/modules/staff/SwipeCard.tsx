"use client";
import { useRef, useState } from "react";

/**
 * Wraps a staff ticket/order card so it can be swiped left/right to fire the same action
 * as its own button (kept inside `children` as the accessible, keyboard-operable fallback -
 * swipe is a physical shortcut layered on top for hands that are busy or gloved, not a
 * replacement for a real button). Pointer Events cover touch, mouse and pen in one handler.
 */
export default function SwipeCard({
  onSwipeRight, onSwipeLeft, rightLabel, leftLabel, rightColor = "#1fa68a", leftColor = "#c62828", children,
}: {
  onSwipeRight?: () => void; onSwipeLeft?: () => void; rightLabel?: string; leftLabel?: string; rightColor?: string; leftColor?: string; children: React.ReactNode;
}) {
  const THRESHOLD = 88;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const dxRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    let delta = e.clientX - startX.current;
    if (!onSwipeRight && delta > 0) delta = 0;
    if (!onSwipeLeft && delta < 0) delta = 0;
    dxRef.current = delta;
    setDx(delta);
  };
  const finish = () => {
    setDragging(false);
    const d = dxRef.current;
    dxRef.current = 0;
    setDx(0);
    if (d > THRESHOLD && onSwipeRight) onSwipeRight();
    else if (d < -THRESHOLD && onSwipeLeft) onSwipeLeft();
  };

  const showRight = dx > 16;
  const showLeft = dx < -16;
  const revealOpacity = Math.min(Math.abs(dx) / THRESHOLD, 1);

  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden" }}>
      {(rightLabel || leftLabel) && (showRight || showLeft) && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: showRight ? "flex-start" : "flex-end", padding: "0 24px",
          background: showRight ? rightColor : leftColor, color: "#fff", fontWeight: 700, fontSize: 16,
          opacity: revealOpacity,
        }}>
          {showRight ? rightLabel : leftLabel}
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform .25s ease", touchAction: "pan-y", cursor: onSwipeRight || onSwipeLeft ? "grab" : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
