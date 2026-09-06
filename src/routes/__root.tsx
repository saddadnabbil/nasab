import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { LocaleProvider } from "@/lib/i18n/context";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ThemeProvider } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Nasab";
const THEME_BOOTSTRAP = `(() => {
  try {
    const saved = localStorage.getItem("nasab:theme");
    const theme = saved === "light" || saved === "dark"
      ? saved
      : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Studio silsilah. Gambar pohon nasab dengan foto, ikon, dan catatan — simpan ke akun atau biarkan di perangkat.",
      },
      { name: "theme-color", content: "#000000" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300..700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="id" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="bg-canvas text-ink">
        <PreviewHostBridge />
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <Outlet />
                <Toaster position="bottom-center" richColors={false} />
              </QueryClientProvider>
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
