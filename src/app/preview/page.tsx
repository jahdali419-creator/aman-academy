import { getLang } from "./lang";
import { LangSwitch } from "./runtime";

export const metadata = { title: "Aman Academy · design previews" };

const list = [
  { href: "/preview/concept-a", key: "A", ar: "الختم", en: "The Seal", arNote: "الهوية المعتمدة: الميدالية، الكحلي والذهبي.", enNote: "The agreed brand: Medallion, navy and gold.", bg: "#0b1b33", fg: "#e0b65c" },
  { href: "/preview/concept-b", key: "B", ar: "الإشارة", en: "Signal", arNote: "بديل: خط ملصقات جريء ولون واحد حار.", enNote: "Alternative: bold poster type and one hot colour.", bg: "#efece4", fg: "#15130f" },
  { href: "/preview/concept-c", key: "C", ar: "السكينة", en: "Stillness", arNote: "بديل: دافئ وهادئ، والقوس رمز للمأوى.", enNote: "Alternative: warm and calm, with the arch as shelter.", bg: "#1e3b30", fg: "#f8f3e8" },
];

export default async function PreviewIndex() {
  const lang = await getLang();
  const ar = lang === "ar";
  return (
    <main style={{ minHeight: "100dvh", background: "#f4f1ea", color: "#15130f", fontFamily: "system-ui, 'Geeza Pro', sans-serif", padding: "max(24px, 5vw)" }}>
      <style>{`.pvi-lang{display:flex;gap:6px}.pvi-lang button{border:1px solid #15130f;background:none;border-radius:999px;padding:6px 14px;font-weight:600}.pvi-lang button[aria-pressed=true]{background:#15130f;color:#f4f1ea}.pvi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:18px;margin-top:32px}.pvi-card{display:grid;gap:8px;padding:28px;border-radius:18px;text-decoration:none;min-height:240px;align-content:end;transition:transform .4s cubic-bezier(.2,.9,.1,1)}.pvi-card:hover{transform:translateY(-6px)}.pvi-card b{font-size:4rem;line-height:1}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.6rem)" }}>{ar ? "أكاديمية أمان · ثلاثة تصاميم للمعاينة" : "Aman Academy · three design previews"}</h1>
        <LangSwitch lang={lang} className="pvi-lang" />
      </div>
      <p style={{ maxWidth: "60ch", marginTop: 10, opacity: 0.75 }}>
        {ar ? "صفحات معاينة معزولة عن الموقع الحالي. المحتوى والأسعار نماذج." : "Preview pages, isolated from the current site. Content and prices are samples."}
      </p>
      <div className="pvi-grid">
        {list.map((c) => (
          <a key={c.key} className="pvi-card" href={c.href} style={{ background: c.bg, color: c.fg, border: "1px solid rgb(21 19 15 / 0.15)" }}>
            <b>{c.key}</b>
            <strong style={{ fontSize: "1.5rem" }}>{ar ? c.ar : c.en}</strong>
            <span style={{ opacity: 0.85 }}>{ar ? c.arNote : c.enNote}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
