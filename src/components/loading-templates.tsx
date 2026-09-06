import { Link } from "@tanstack/react-router";
import { Download, HelpCircle, LayoutTemplate, PenLine, Redo2, Search, Type, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

function Shine({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`loading-shine ${className}`} />;
}

export function TreeGridLoadingTemplate() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Memuat daftar pohon">
      {[0, 1].map((item) => (
        <div key={item} className="min-h-[17rem] rounded-lg border border-hairline p-6">
          <Shine className="h-3 w-20" /><Shine className="mt-5 h-7 w-3/5" />
          <Shine className="mt-4 h-4 w-full" /><Shine className="mt-2 h-4 w-4/5" />
          <Shine className="mt-12 h-9 w-20 rounded-pill" />
        </div>
      ))}
    </div>
  );
}

function ToolButton({ children }: { children: ReactNode }) {
  return <Button variant="outline" size="icon-sm" disabled tabIndex={-1}>{children}</Button>;
}

export function TreeEditorLoadingTemplate() {
  return (
    <div className="flex h-dvh min-h-[520px] flex-col overflow-hidden bg-canvas">
      <header className="editor-toolbar flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2 sm:px-5">
        <Link to="/app" className="grid size-9 shrink-0 place-items-center rounded-full" aria-label="Kembali ke daftar pohon">
          <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="6" cy="6" r="3.1" fill="currentColor" /><circle cx="16" cy="6" r="3.1" fill="currentColor" /><circle cx="11" cy="16.2" r="3.1" fill="currentColor" />
            <path d="M6 9.2 L11 13.1 L16 9.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>
        <Shine className="h-5 w-32" />
        <div className="editor-toolbar-actions ml-auto flex flex-wrap items-center gap-1.5" aria-hidden="true">
          <ToolButton><Undo2 className="size-3.5" /></ToolButton><ToolButton><Redo2 className="size-3.5" /></ToolButton>
          <ToolButton><Search className="size-3.5" /></ToolButton><ToolButton><LayoutTemplate className="size-3.5" /></ToolButton>
          <ToolButton><PenLine className="size-3.5" /></ToolButton><ToolButton><Type className="size-3.5" /></ToolButton>
          <ToolButton><Download className="size-3.5" /></ToolButton><ToolButton><HelpCircle className="size-3.5" /></ToolButton>
        </div>
      </header>
      <div className="relative min-h-0 flex-1 bg-dots" aria-busy="true" aria-label="Memuat isi pohon">
        <div className="absolute top-1/2 left-1/2 grid w-52 -translate-x-1/2 -translate-y-1/2 gap-3 rounded-lg bg-canvas p-5 ring-1 ring-hairline">
          <Shine className="mx-auto size-10 rounded-full" /><Shine className="mx-auto h-4 w-28" /><Shine className="mx-auto h-3 w-20" />
          </div>
      </div>
    </div>
  );
}
