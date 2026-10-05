"use client";
import { useRef, useState } from "react";

/**
 * Wraps a staff ticket/order card so it can be swiped left/right to fire the same action
 * as its own button (kept inside `children` as the accessible, keyboard-operable fallback -
 * swipe is a physical shortcut layered on top for hands that are busy or gloved, not a
 * replacement for a real button). Pointer Events cover touch, mouse and pen in one handler.
 */
export default function SwipeCard({
  onSwipeRight, onSwipeLeft, rightLabel, leftLabel, rightColor = "var(--ok)", leftColor = "var(--cherry)", children,
}: {
  onSwipeRight?: () => void; onSwipeLeft?: () => void; rightLabel?: string; leftLabel?: string; rightColor?: string; leftColor?: string; children: React.ReactNode;
}) {
  const THRESHOLD = 88;
  // Movement below this is a tap, not a swipe. The pointer is only captured once a swipe
  // starts: capturing on pointerdown sends the click to this wrapper instead of the button
  // under the finger, so "Take order", "Done" and "Served" never fired.
  const DRAG_START = 8;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pressed = useRef(false);
  const swiped = useRef(false);
  const startX = useRef(0);
  const dxRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    pressed.current = true;
    swiped.current = false;
    startX.current = e.clientX;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pressed.current) return;
    let delta = e.clientX - startX.current;
    if (!swiped.current) {
      if (Math.abs(delta) < DRAG_START) return;
      swiped.current = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (!onSwipeRight && delta > 0) delta = 0;
    if (!onSwipeLeft && delta < 0) delta = 0;
    dxRef.current = delta;
    setDx(delta);
  };
  const finish = () => {
    pressed.current = false;
    setDragging(false);
    const d = dxRef.current;
    dxRef.current = 0;
    setDx(0);
    if (d > THRESHOLD && onSwipeRight) onSwipeRight();
    else if (d < -THRESHOLD && onSwipeLeft) onSwipeLeft();
  };
  // A swipe that ends over a button must not also count as a click on it.
  const onClickCapture = (e: React.MouseEvent) => {
    if (swiped.current) { e.stopPropagation(); e.preventDefault(); swiped.current = false; }
  };

  const showRight = dx > 16;
  const showLeft = dx < -16;
  const revealOpacity = Math.min(Math.abs(dx) / THRESHOLD, 1);

  return (
    <div className="sa-swipe" style={{ position: "relative", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
      {(rightLabel || leftLabel) && (showRight || showLeft) && (
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: showRight ? "flex-start" : "flex-end", padding: "0 24px",
          background: showRight ? rightColor : leftColor, color: showRight ? "var(--on-ok)" : "var(--on-cherry)", fontWeight: 700, fontSize: 16,
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
        onClickCapture={onClickCapture}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform .25s ease", touchAction: "pan-y", cursor: onSwipeRight || onSwipeLeft ? "grab" : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
