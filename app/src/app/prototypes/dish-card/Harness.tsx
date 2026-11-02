"use client";
// Prototype harness: one variant at a time, full size, inside a realistic diner page. The picker follows eval PICKER.md of the prototype skill.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { tr } from "@/modules/diner/i18n";
import Icon from "@/modules/platform/Icon";
import type { Lang } from "@/modules/platform/menu";
import { ITEMS } from "./data";
import AllergyFirst from "./VariantAllergyFirst";
import MenuBoard from "./VariantMenuBoard";
import Showcase from "./VariantShowcase";
import "./proto.css";

const VARIANTS = [
  { name: "Menu board", View: MenuBoard },
  { name: "Showcase", View: Showcase },
  { name: "Allergy first", View: AllergyFirst },
];
const DEMO_PROFILE = ["peanut", "shellfish"];

export default function Harness() {
  const [current, setCurrent] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<string[]>(DEMO_PROFILE);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const pickerRef = useRef<HTMLElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const t = useCallback((k: string) => tr(lang, k), [lang]);
  const bump = useCallback((id: number, d: number) => setPicks((p) => ({ ...p, [id]: Math.max(0, Math.min(20, (p[id] ?? 0) + d)) })), []);

  const select = useCallback((i: number) => {
    if (i < 0 || i >= VARIANTS.length) return;
    setCurrent(i);
    setNonce((n) => n + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", String(i + 1));
    history.replaceState(null, "", url);
  }, []);

  // Initial variant comes from ?v=, applied before first paint so the highlight starts in place without sliding.
  useLayoutEffect(() => {
    const v = Number.parseInt(new URLSearchParams(location.search).get("v") ?? "", 10);
    if (v >= 1 && v <= VARIANTS.length) setCurrent(v - 1);
  }, []);
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setReady(true))); }, []);

  useLayoutEffect(() => {
    const el = itemRefs.current[current], hl = hlRef.current;
    if (!el || !hl) return;
    const move = () => { hl.style.width = `${el.offsetWidth}px`; hl.style.transform = `translateX(${el.offsetLeft}px)`; };
    move();
    window.addEventListener("resize", move);
    return () => window.removeEventListener("resize", move);
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) select(num - 1);
      else if (e.key === "ArrowRight") select((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") select((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") setNonce((n) => n + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, select]);

  const total = Object.values(picks).reduce((a, b) => a + b, 0);
  const { View } = VARIANTS[current];

  return (
    <div className="sa-app pv-page">
      <div className="diner pv-diner">
        <div className="sa-checker" />
        <header className="sa-sign">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <h1 className="sa-sign__name">Golden Lotus Kitchen</h1>
              <p className="sa-sign__meta">Chiang Rai · {t("table")} 5</p>
            </div>
            <div className="sa-lang" role="group" aria-label="Language">
              {(["th", "my", "en"] as Lang[]).map((l) => <button type="button" key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
            </div>
          </div>
        </header>
        <div className="pv-context">
          <button type="button" className="sa-chip" aria-pressed={profile.length > 0} onClick={() => setProfile(profile.length ? [] : DEMO_PROFILE)}>
            <Icon name="alert" size={14} /> {t("myAllergies")}{profile.length ? `: ${profile.join(", ")}` : ""}
          </button>
          <span className="pv-context__picks" aria-live="polite">{t("myPicks")} · {total}</span>
        </div>
        <main key={`${current}-${nonce}`} className="pv-stage">
          <View items={ITEMS} lang={lang} profile={profile} picks={picks} bump={bump} setProfile={setProfile} t={t} />
        </main>
      </div>

      <nav ref={pickerRef} className="proto-picker" data-ready={ready || undefined} aria-label="Prototype variants">
        <span ref={hlRef} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((v, i) => (
          <button key={v.name} ref={(el) => { itemRefs.current[i] = el; }} type="button" className="proto-picker-item" data-active={i === current || undefined} aria-current={i === current ? "true" : undefined} onClick={() => select(i)}>{v.name}</button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button type="button" className="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" onClick={() => setNonce((n) => n + 1)}>↻</button>
      </nav>
    </div>
  );
}
