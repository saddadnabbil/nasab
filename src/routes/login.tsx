import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SiteNav } from "@/components/site-nav";
import { useLocale } from "@/lib/i18n/context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

const LOGIN_PROVIDERS = GROK_PROVIDERS.filter((provider) => provider.providerId === "grok-google");

function Login() {
  const { t } = useLocale();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onProviderSignIn(providerId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await signIn(providerId, { callbackURL: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("login.toast.oauthFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "User",
        });
        if (error) throw new Error(error.message ?? t("login.toast.signUpFailed"));
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message ?? t("login.toast.signInFailed"));
      }
      window.location.href = "/app";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("login.toast.genericFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <SiteNav />
      <main className="mx-auto grid max-w-[1280px] gap-8 px-6 py-12 md:grid-cols-2 md:px-12 md:py-20">
        <div className="color-block min-w-0 bg-block-cream">
          <p className="eyebrow">{t("login.eyebrow")}</p>
          <h1 className="display-lg mt-4">{t("login.heading")}</h1>
          <p className="body mt-6 max-w-md">{t("login.body")}</p>
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <h2 className="headline">{mode === "signin" ? t("login.signIn") : t("login.signUp")}</h2>
          <form className="mt-6 grid gap-4" onSubmit={(e) => void onEmail(e)}>
            {mode === "signup" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="name">{t("login.field.name")}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("login.field.email")}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">{t("login.field.password")}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t("login.processing") : mode === "signin" ? t("login.submitSignIn") : t("login.submitSignUp")}
            </Button>
          </form>

          <div className="my-8 flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline" />
            <span className="caption">{t("login.or")}</span>
            <span className="h-px flex-1 bg-hairline" />
          </div>

          {authEnabled ? (
            <div className="grid gap-3">
              {LOGIN_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void onProviderSignIn(p.providerId)}
                >
                  <img src="/google-g.svg" alt="" aria-hidden="true" className="size-5" />
                  {t("login.continueWith", { label: p.label })}
                </Button>
              ))}
            </div>
          ) : (
            <p className="body-sm">{t("login.signInDisabled")}</p>
          )}

          <div className="mt-8 flex flex-nowrap items-center justify-center gap-x-3 text-center text-[15px]">
            <button
              type="button"
              className="whitespace-nowrap underline underline-offset-4"
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            >
              {mode === "signin" ? t("login.toggleToSignUp") : t("login.toggleToSignIn")}
            </button>
            <Link to="/app" className="whitespace-nowrap underline underline-offset-4 hover:text-ink/70">
              {t("login.continueWithoutSignIn")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
