/**
 * The locked brand mark: "Logo 12 · Medallion", reproduced from
 * design-samples/logos.html without redrawing. `id` keeps gradient and path
 * ids unique when the mark appears more than once on a page.
 */
export function Medallion({ id, className, onLight = false, spin = false }: { id: string; className?: string; onLight?: boolean; spin?: boolean }) {
  const rays = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const r2 = i % 2 ? 86 : 90;
    return `M${(100 + Math.cos(a) * 79).toFixed(1)} ${(100 + Math.sin(a) * 79).toFixed(1)}L${(100 + Math.cos(a) * r2).toFixed(1)} ${(100 + Math.sin(a) * r2).toFixed(1)}`;
  }).join("");
  const gold = `url(#${id}-g)`;
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="أمان · Aman Academy">
      <defs>
        {onLight ? (
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b98524" /><stop offset="0.5" stopColor="#8a5f12" /><stop offset="1" stopColor="#c9982f" />
          </linearGradient>
        ) : (
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6dc9a" /><stop offset="0.45" stopColor="#d7a94a" /><stop offset="0.7" stopColor="#f3d68b" /><stop offset="1" stopColor="#b98524" />
          </linearGradient>
        )}
        <clipPath id={`${id}-c`}><circle cx="100" cy="100" r="94" /></clipPath>
        <path id={`${id}-a`} d="M42 104a58 58 0 0 0 116 0" />
      </defs>
      <circle cx="100" cy="100" r="94" fill={onLight ? "#f3ead7" : "#0b1b33"} />
      <circle cx="100" cy="100" r="94" fill="none" stroke={gold} strokeWidth="3.5" />
      <g className={spin ? "md-spin" : undefined}><path d={rays} stroke={gold} strokeWidth="1.6" fill="none" /></g>
      <circle cx="100" cy="100" r="75" fill="none" stroke={gold} strokeWidth="1.4" />
      <text x="100" y="108" textAnchor="middle" direction="rtl" fill={gold} style={{ fontFamily: "var(--md-ar), 'Aref Ruqaa', serif", fontWeight: 700, fontSize: 56 }}>أمان</text>
      <text fill={gold} style={{ fontFamily: "var(--md-en), Marcellus, serif", fontSize: 10.5, letterSpacing: 3.2 }} direction="ltr">
        <textPath href={`#${id}-a`} startOffset="50%" textAnchor="middle">AMAN ACADEMY</textPath>
      </text>
      {spin ? <g clipPath={`url(#${id}-c)`}><rect className="md-shine" x="0" y="0" width="34" height="200" fill="#fff" opacity="0.28" /></g> : null}
    </svg>
  );
}
