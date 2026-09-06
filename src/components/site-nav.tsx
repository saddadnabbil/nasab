import { Link } from "@tanstack/react-router";
import { Globe, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";
import { LOCALES } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-2 font-sans text-[18px] font-medium tracking-tight",
        inverse ? "text-inverse-ink" : "text-ink",
      )}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="6" cy="6" r="3.1" fill="currentColor" />
        <circle cx="16" cy="6" r="3.1" fill="currentColor" />
        <circle cx="11" cy="16.2" r="3.1" fill="currentColor" />
        <path
          d="M6 9.2 L11 13.1 L16 9.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
      Nasab
    </Link>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.language")}
        className="flex h-9 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium transition-[transform,background-color] duration-150 ease-out hover:-translate-y-px hover:bg-surface-soft active:translate-y-0 active:scale-[0.98]"
      >
        <Globe className="size-3.5" />
        {current.short}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="animate-in fade-in zoom-in-95 absolute top-full right-0 z-50 mt-1 min-w-[160px] rounded-lg bg-canvas p-1 shadow-soft ring-1 ring-hairline duration-100">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[14px]",
                  l.code === locale ? "bg-primary text-on-primary" : "hover:bg-surface-soft",
                )}
              >
                {l.label}
                <span className="caption opacity-60">{l.short}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  const { t } = useLocale();
  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-surface-soft" />;
  }
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
          <Link to="/app">{t("nav.myTrees")}</Link>
        </Button>
        <UserButton />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link to="/login">{t("nav.signIn")}</Link>
      </Button>
      <Button asChild size="sm">
        <Link to="/app">{t("nav.start")}</Link>
      </Button>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("nav.useLightMode") : t("nav.useDarkMode")}
      title={isDark ? t("nav.useLightMode") : t("nav.useDarkMode")}
      className="grid size-9 place-items-center rounded-full text-ink transition-[transform,background-color,color] duration-150 ease-out hover:-translate-y-px hover:bg-surface-soft active:translate-y-0 active:scale-[0.96]"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function SiteNav({ solid = true }: { solid?: boolean }) {
  const [open, setOpen] = useState(false);
  const { t } = useLocale();
  return (
    <header
      className={cn(
        "site-header sticky top-0 z-40 h-14",
        solid ? "bg-canvas/92" : "bg-canvas/82",
      )}
    >
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6 md:px-12">
        <Wordmark />
        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/app" className="site-link body-sm text-ink">
            {t("nav.canvas")}
          </Link>
          <a href="/#cara-kerja" className="site-link body-sm text-ink">
            {t("nav.howItWorks")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <AuthSlot />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full bg-surface-soft transition-[transform,background-color] duration-150 ease-out hover:bg-hairline-soft active:scale-[0.96] md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="site-menu animate-in fade-in slide-in-from-top-2 absolute inset-x-0 top-full border-t border-hairline bg-canvas px-6 py-4 shadow-soft duration-200 ease-out md:hidden">
          <div className="flex flex-col gap-3">
            <Link to="/app" className="body py-2" onClick={() => setOpen(false)}>
              {t("nav.canvas")}
            </Link>
            <a href="/#cara-kerja" className="body py-2" onClick={() => setOpen(false)}>
              {t("nav.howItWorks")}
            </a>
            <SignedOut>
              <Button asChild>
                <Link to="/login">{t("nav.signIn")}</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button asChild variant="outline">
                <Link to="/app">{t("nav.myTrees")}</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      ) : null}
    </header>
  );
}
