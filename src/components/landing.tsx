import { Link } from "@tanstack/react-router";
import { ArrowRight, MousePointer2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/site-nav";
import { createLocalTree } from "@/lib/tree/storage";
import { emptyTree } from "@/lib/tree/ops";
import { sampleAlFalah } from "@/lib/tree/sample";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/context";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

function Reveal({ children, className }: RevealProps) {
  return (
    <div className={cn("reveal", className)}>{children}</div>
  );
}

function ArchiveIndex() {
  return (
    <aside className="archive-index" aria-label="Contoh silsilah keluarga Al-Falah">
      <div className="archive-index-heading">
        <span className="eyebrow">AL-FALAH / 01</span>
        <p>Setiap nama punya tempat dalam cerita.</p>
      </div>
      <div className="archive-index-list">
        {[
          ["01", "Ahmad Al-Falah", "1920 — 1998"],
          ["02", "Aminah", "1924 — 2003"],
          ["03", "Hasan Al-Falah", "1948 —"],
        ].map(([number, name, years]) => (
          <div className="archive-index-row" key={number}>
            <span className="caption">{number}</span>
            <strong>{name}</strong>
            <span>{years}</span>
          </div>
        ))}
      </div>
      <div className="archive-index-foot">
        <span>6 orang terhubung</span>
        <span>›</span>
      </div>
    </aside>
  );
}

export function Landing() {
  const navigate = useNavigate();
  const { t } = useLocale();

  function startSample() {
    const tree = createLocalTree(sampleAlFalah());
    void navigate({ to: "/app/tree/$treeId", params: { treeId: tree.id } });
  }

  function startEmpty() {
    const tree = createLocalTree(emptyTree(t("editor.newTreeName")));
    void navigate({ to: "/app/tree/$treeId", params: { treeId: tree.id } });
  }

  return (
    <div className="landing-page min-h-dvh bg-canvas text-ink">
      <SiteNav />

      <main>
        <section className="landing-hero">
          <div className="landing-hero-grid mx-auto max-w-[1280px] px-6 py-10 md:px-12 md:py-16">
            <Reveal className="landing-hero-copy">
              <p className="eyebrow">{t("landing.eyebrow")}</p>
              <h1 className="landing-title">{t("landing.hero.title")}</h1>
              <p className="landing-lede">{t("landing.hero.body")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" onClick={startSample} className="group">
                  {t("landing.hero.ctaSample")} <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-1" />
                </Button>
                <Button size="lg" variant="secondary" className="landing-secondary" onClick={startEmpty}>
                  {t("landing.hero.ctaEmpty")}
                </Button>
              </div>
              <div className="landing-proof">
                <span className="landing-proof-mark"><Sparkles className="size-3.5" /></span>
                <span>Rapi saat disusun. Aman di perangkatmu.</span>
              </div>
            </Reveal>
            <Reveal className="landing-preview" delayMs={100}>
              <ArchiveIndex />
            </Reveal>
          </div>
        </section>

        <section id="cara-kerja" className="landing-section mx-auto max-w-[1280px] px-6 py-20 md:px-12 md:py-28">
          <Reveal className="landing-intro">
            <p className="eyebrow">01 — {t("landing.card.eyebrow")}</p>
            <h2 className="landing-section-title">{t("landing.card.heading")}</h2>
          </Reveal>
          <div className="landing-story-grid">
            <Reveal className="landing-story-copy" delayMs={80}>
              <p className="landing-lede">{t("landing.card.body")}</p>
              <div className="landing-detail">
                <MousePointer2 className="size-4" />
                <span>Pilih satu nama, hubungkan keluarganya, lalu biarkan ceritanya tumbuh.</span>
              </div>
            </Reveal>
            <Reveal className="landing-process" delayMs={140}>
              {[
                ["01", "Mulai dari satu nama", "Buat kartu pertama dan isi detail yang ingin kamu kenang."],
                ["02", "Sambungkan keluarganya", "Tambahkan orang tua, pasangan, anak, atau saudara langsung dari kanvas."],
                ["03", "Lihat ceritanya terbentuk", "Rangkaian nasab tersusun sendiri, siap disimpan atau dibagikan."],
              ].map(([number, title, body]) => (
                <div className="landing-process-row" key={number}>
                  <span className="caption">{number}</span>
                  <div><h3>{title}</h3><p>{body}</p></div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="landing-dark-section">
          <div className="landing-dark-grid mx-auto max-w-[1280px] px-6 py-20 md:px-12 md:py-28">
            <Reveal>
              <p className="landing-nasab-accent eyebrow">02 — {t("landing.nasab.eyebrow")}</p>
              <h2 className="landing-section-title text-inverse-ink">{t("landing.nasab.heading")}</h2>
            </Reveal>
            <Reveal delayMs={100}>
              <p className="landing-lede text-inverse-ink/80">{t("landing.nasab.body")}</p>
              <div className="nasab-reading">Adam <span>bin</span> Rayyan <span>bin</span> Hasan <span>bin</span> Ahmad Al-Falah</div>
            </Reveal>
          </div>
        </section>

        <section className="landing-section mx-auto max-w-[1280px] px-6 py-20 md:px-12 md:py-28">
          <Reveal className="landing-feature-heading">
            <p className="eyebrow">{t("landing.features.eyebrow")}</p>
            <h2 className="landing-section-title">{t("landing.features.heading")}</h2>
          </Reveal>
          <div className="landing-feature-grid">
            {[
              ["landing.features.customCard.title", "landing.features.customCard.body"],
              ["landing.features.relations.title", "landing.features.relations.body"],
              ["landing.features.dragZoom.title", "landing.features.dragZoom.body"],
              ["landing.features.multiTree.title", "landing.features.multiTree.body"],
              ["landing.features.exportJson.title", "landing.features.exportJson.body"],
              ["landing.features.localFirst.title", "landing.features.localFirst.body"],
            ].map(([titleKey, bodyKey], index) => (
              <Reveal key={titleKey} delayMs={index * 45}>
                <article className="landing-feature">
                  <span className="caption">0{index + 1}</span>
                  <h3>{t(titleKey)}</h3>
                  <p>{t(bodyKey)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="landing-closeout mx-auto max-w-[1280px] px-6 pb-20 md:px-12 md:pb-28">
          <Reveal className="landing-closeout-inner">
            <p className="eyebrow">{t("landing.save.eyebrow")}</p>
            <h2 className="landing-section-title">{t("landing.save.heading")}</h2>
            <p className="landing-lede">{t("landing.save.body")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link to="/app">{t("landing.save.ctaOpen")}</Link></Button>
              <Button asChild size="lg" variant="secondary" className="landing-secondary"><Link to="/login">{t("landing.save.ctaSignIn")}</Link></Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto max-w-[1280px] px-6 py-24 md:px-12">
        <p className="display-lg">Nasab</p>
        <p className="body mt-6 max-w-lg">{t("landing.footer.tagline")}</p>
        <div className="mt-10 flex flex-wrap gap-6">
          <Link to="/app" className="body-sm underline-offset-4 hover:underline">
            {t("nav.canvas")}
          </Link>
          <Link to="/login" className="body-sm underline-offset-4 hover:underline">
            {t("nav.signIn")}
          </Link>
          <Link to="/privacy" className="body-sm underline-offset-4 hover:underline">
            Privasi
          </Link>
          <Link to="/terms" className="body-sm underline-offset-4 hover:underline">
            Ketentuan
          </Link>
        </div>
      </footer>
    </div>
  );
}
