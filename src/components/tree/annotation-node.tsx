import { type NodeProps, useReactFlow } from "@xyflow/react";
import { GripHorizontal, MoveDiagonal2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { AnnotationNodeData } from "@/lib/tree/graph";
import { cn } from "@/lib/utils";

export type AnnotationNodeCallbacks = {
  onTextChange?: (id: string, text: string, width?: number) => void;
  onDelete?: (id: string) => void;
  onFocus?: () => void;
  autoFocus?: boolean;
};

export function AnnotationNode({ data, selected }: NodeProps) {
  const { annotation, onTextChange, onDelete, onFocus, autoFocus } = data as AnnotationNodeData &
    AnnotationNodeCallbacks;
  const { getZoom } = useReactFlow();
  const [local, setLocal] = useState(annotation.text);
  const [width, setWidth] = useState(annotation.width ?? 180);
  const widthRef = useRef(width);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = widthRef.current;
    const zoom = getZoom();

    function move(pointerEvent: globalThis.PointerEvent) {
      const next = Math.min(560, Math.max(100, startWidth + (pointerEvent.clientX - startX) / zoom));
      widthRef.current = next;
      setWidth(next);
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      onTextChange?.(annotation.id, local, Math.round(widthRef.current));
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  return (
    <div
      className="group relative -m-2 p-2"
      style={{ width }}
    >
      <div
        className={cn(
          "annotation-drag-handle -mx-1 -mt-1 mb-0.5 flex h-4 cursor-grab items-center justify-center text-ink/30 active:cursor-grabbing",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
        aria-label="Geser teks"
      >
        <GripHorizontal className="size-3.5" />
      </div>
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(annotation.id)}
          className={cn(
            "nodrag absolute -top-1 -right-1 z-10 size-5 place-items-center rounded-full bg-danger text-on-primary shadow-soft hover:bg-danger/90",
            selected ? "grid" : "hidden group-hover:grid group-focus-within:grid",
          )}
          aria-label="Hapus teks"
        >
          <Trash2 className="size-3" />
        </button>
      ) : null}
      <textarea
        ref={textRef}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => onFocus?.()}
        onBlur={() => onTextChange?.(annotation.id, local, Math.round(width))}
        placeholder="Tulis sesuatu…"
        rows={2}
        className="nodrag w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[14px] leading-snug font-medium text-ink outline-none placeholder:opacity-40"
      />
      <button
        type="button"
        onPointerDown={startResize}
        className={cn(
          "nodrag absolute right-0 bottom-0 grid size-7 touch-none place-items-center text-ink/35 hover:text-ink",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        )}
        aria-label="Ubah lebar teks"
      >
        <MoveDiagonal2 className="size-3.5" />
      </button>
    </div>
  );
}
