import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/site-nav";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-14 md:px-12 md:py-20">
        <Link
          to="/"
          className="body-sm inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" /> Kembali ke Nasab
        </Link>
        <header className="mt-12 border-b border-hairline pb-10">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display-lg mt-4">{title}</h1>
          <p className="body mt-5 max-w-2xl">{intro}</p>
          <p className="caption mt-6">Berlaku mulai 6 September 2026</p>
        </header>
        <article className="legal-copy py-10">{children}</article>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
