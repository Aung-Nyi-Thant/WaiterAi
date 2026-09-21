const P: Record<string, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4.2-4.2" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  bell: <><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z" /><path d="M10 21h4" /></>,
  plus: <path d="M12 5v14M5 12h14" />, check: <path d="M4 12.5l5 5L20 6.5" />, back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />, send: <path d="M4 12L20 4l-4 16-4-6z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />, upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>, help: <><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></>,
  bot: <><rect x="5" y="8" width="14" height="10" rx="2" /><path d="M12 4v4M9 13h.01M15 13h.01" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" /><rect x="14" y="4" width="6" height="6" /><rect x="4" y="14" width="6" height="6" /><path d="M14 14h3v3h3M14 20h.01M20 20h.01" /></>,
  chart: <path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3" />, edit: <path d="M4 20l1-4L16 5l3 3L8 19z" />,
  alert: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>, users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .6 3 2.4 3 6" /></>,
  up: <path d="M7 14l5-5 5 5" />, down: <path d="M7 10l5 5 5-5" />, trash: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  thumbUp: <path d="M7 11v9H4v-9h3zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.8 9H19a2 2 0 0 1 2 2.4l-1.3 6.4A2 2 0 0 1 17.8 19H7" />,
  thumbDown: <path d="M7 13V4H4v9h3zM7 13l4 7c1.5 0 2.5-1 2.2-2.6L12.8 15H19a2 2 0 0 0 2-2.4L19.7 6.2A2 2 0 0 0 17.8 5H7" />,
  logout: <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />, eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
};
export default function Icon({ name, size = 20, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </svg>
  );
}
