"use client";
import { useEffect, useState } from "react";
import Icon from "@/modules/platform/Icon";

// A dish photo that cannot load (a dead link, offline) must not show broken-image text: it falls back to the same plate the dish
// has when the owner added no photo.
export function useImageOk(src: string): [boolean, () => void] {
  const [bad, setBad] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new photo address gets a new try
  useEffect(() => { setBad(false); }, [src]);
  return [!!src && !bad, () => setBad(true)];
}

export default function DishPhoto({ src, className = "", style }: { src: string; className?: string; style?: React.CSSProperties }) {
  const [ok, fail] = useImageOk(src);
  return (
    <div className={`sa-dish__plate${ok ? "" : " sa-dish__plate--empty"}${className ? ` ${className}` : ""}`} aria-hidden="true" style={style}>
      {ok ? <img src={src} alt="" onError={fail} /> : <Icon name="utensils" size={28} />}
    </div>
  );
}

// The small round photo in the owner's menu table and form.
export function Thumb({ src, size = 44 }: { src: string; size?: number }) {
  const [ok, fail] = useImageOk(src);
  return ok
    ? <img className="photo" style={size === 44 ? undefined : { width: size, height: size }} src={src} alt="" onError={fail} />
    : <div className="photo" style={size === 44 ? undefined : { width: size, height: size }}><Icon name="image" size={Math.round(size / 2.2)} /></div>;
}
