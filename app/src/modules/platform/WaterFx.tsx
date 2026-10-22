"use client";
import { useEffect } from "react";

// The water feel of the app that CSS alone cannot do: a ring that spreads from the point you pressed (like a drop landing on water), and a drop
// that falls from a button into another one (a dish into the cart). Everything is decoration: it never takes focus or clicks, is removed when
// it ends, and none of it runs when the phone asks for reduced motion.
const reduced = () => typeof window === "undefined" || typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PRESSABLE = "button, a[href], [role=button], [role=menuitem], summary, label.sa-switch, .home-card, .pill, .check";

// One ring (and a second, fainter one just behind it) at a point of the screen, in the given colour.
export function ring(x: number, y: number, color: string, size = 64) {
  if (reduced()) return;
  for (const [i, cls] of ["", " water-ring--late"].entries()) {
    const r = document.createElement("span");
    r.className = `water-ring${cls}`;
    r.setAttribute("aria-hidden", "true");
    r.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-color:${color}`;
    r.addEventListener("animationend", () => r.remove(), { once: true });
    document.body.appendChild(r);
    if (i === 0) setTimeout(() => r.remove(), 1200);          // a safety net if the animation never reports its end
  }
}

// The element "plops": it squashes and rings once, as when a drop lands in it.
export function plop(el: Element | null) {
  if (!el) return;
  el.classList.remove("is-plop");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("is-plop");
  setTimeout(() => el.classList.remove("is-plop"), 800);
  const r = el.getBoundingClientRect();
  ring(r.left + r.width / 2, r.top + r.height / 2, getComputedStyle(el).borderTopColor || "currentColor", Math.max(r.width, r.height) * 1.5);
}

// A drop leaves `from`, rises a little, falls into `to` (stretching as it falls) and lands with a plop.
export function dropInto(from: Element | null, to: Element | null) {
  if (!from || !to) { plop(to); return; }
  const probe = document.createElement("span");
  if (reduced() || typeof probe.animate !== "function") { plop(to); return; }
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const lift = Math.min(120, Math.abs(y1 - y0) * 0.3 + 48);
  const at = (x: number, y: number, s: string) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
  probe.className = "water-drop";
  probe.setAttribute("aria-hidden", "true");
  document.body.appendChild(probe);
  const anim = probe.animate([
    { transform: at(x0, y0, ".5"), opacity: 1, offset: 0, easing: "cubic-bezier(.2,.7,.4,1)" },
    { transform: at(x0 + (x1 - x0) * 0.4, Math.min(y0, y1) - lift, "1"), opacity: 1, offset: 0.42, easing: "cubic-bezier(.5,0,.9,.5)" },
    { transform: at(x1, y1, ".75, 1.45"), opacity: 1, offset: 0.93, easing: "linear" },
    { transform: at(x1, y1, ".3"), opacity: 0, offset: 1 },
  ], { duration: 640, fill: "forwards" });
  const land = () => { probe.remove(); plop(to); };
  anim.onfinish = land;
  anim.oncancel = () => probe.remove();
}

export default function WaterFx() {
  useEffect(() => {
    // Every press anywhere rings from the pointer, in the colour of the pressed thing's text (white on a dark button, ink on a light one).
    const onDown = (e: PointerEvent) => {
      if (e.button > 0 || reduced()) return;
      const el = (e.target as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const box = el.getBoundingClientRect();
      const size = Math.min(120, Math.max(44, Math.min(box.width, box.height) * 1.5));
      ring(e.clientX, e.clientY, getComputedStyle(el).color, size);
    };
    // A key press (Enter or Space) has no pointer: ring from the middle of the element.
    const onClick = (e: MouseEvent) => {
      if (e.detail !== 0 || reduced()) return;
      const el = (e.target as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null;
      if (!el) return;
      const box = el.getBoundingClientRect();
      ring(box.left + box.width / 2, box.top + box.height / 2, getComputedStyle(el).color, Math.min(120, Math.max(44, Math.min(box.width, box.height) * 1.5)));
    };
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => { document.removeEventListener("pointerdown", onDown, { capture: true }); document.removeEventListener("click", onClick, { capture: true }); };
  }, []);
  return null;
}
