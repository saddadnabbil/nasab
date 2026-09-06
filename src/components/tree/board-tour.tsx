import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/context";

type Rect = { top: number; left: number; width: number; height: number };

const STEPS = [
  { target: "canvas", title: "editor.tour.canvas.title", body: "editor.tour.canvas.body" },
  { target: "tools", title: "editor.tour.tools.title", body: "editor.tour.tools.body" },
  { target: "add-person", title: "editor.tour.add.title", body: "editor.tour.add.body" },
] as const;

export const BOARD_TOUR_STORAGE_KEY = "nasab:board-tour-complete:v1";

export function BoardTour({ open, onFinish }: { open: boolean; onFinish: () => void }) {
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const current = STEPS[step];

  useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const elements = [...document.querySelectorAll<HTMLElement>(`[data-coachmark="${current.target}"]`)];
      if (elements.length === 0) return setRect(null);
      const boxes = elements.map((element) => element.getBoundingClientRect());
      const box = {
        top: Math.min(...boxes.map((item) => item.top)),
        left: Math.min(...boxes.map((item) => item.left)),
        right: Math.max(...boxes.map((item) => item.right)),
        bottom: Math.max(...boxes.map((item) => item.bottom)),
      };
      const isCanvas = current.target === "canvas";
      const inset = isCanvas ? 12 : -4;
      const left = Math.max(8, box.left + inset);
      const top = Math.max(8, box.top + inset);
      const right = Math.min(window.innerWidth - 8, box.right - inset);
      const bottom = Math.min(window.innerHeight - 8, box.bottom - inset);
      setRect({
        top,
        left,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [current.target, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish();
      if (event.key === "ArrowRight") setStep((value) => Math.min(STEPS.length - 1, value + 1));
      if (event.key === "ArrowLeft") setStep((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onFinish, open]);

  if (!open) return null;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="board-tour-title">
      {rect ? (
        <div
          className="coachmark-spotlight pointer-events-none fixed rounded-lg ring-2 ring-canvas"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : <div className="fixed inset-0 bg-overlay-scrim/70" />}

      <section className={`coachmark-card fixed inset-x-4 mx-auto max-w-md rounded-lg bg-canvas p-5 shadow-soft ring-1 ring-hairline sm:p-6 ${current.target === "add-person" ? "top-20" : "bottom-4 sm:bottom-6"}`}>
        <div className="flex items-center justify-between gap-4">
          <p className="caption">{t("editor.tour.progress", { current: step + 1, total: STEPS.length })}</p>
          <button type="button" onClick={onFinish} className="text-sm font-medium text-ink/60 hover:text-ink">
            {t("editor.tour.skip")}
          </button>
        </div>
        <h2 id="board-tour-title" className="headline mt-4">{t(current.title)}</h2>
        <p className="body-sm mt-2">{t(current.body)}</p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep((value) => value - 1)} disabled={step === 0}>
            <ArrowLeft className="size-4" /> {t("editor.tour.back")}
          </Button>
          <Button
            size="sm"
            onClick={() => isLast ? onFinish() : setStep((value) => value + 1)}
          >
            {isLast ? t("editor.tour.finish") : t("editor.tour.next")}
            {!isLast ? <ArrowRight className="size-4" /> : null}
          </Button>
        </div>
      </section>
    </div>
  );
}
