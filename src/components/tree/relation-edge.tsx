import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { Unlink } from "lucide-react";
import type { RelationEdgeData } from "@/lib/tree/graph";

export type RelationEdgePayload = RelationEdgeData & {
  onUnlink?: (data: RelationEdgeData) => void;
};

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
  data,
  markerEnd,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14,
  });
  const payload = data as RelationEdgePayload | undefined;

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} interactionWidth={22} />
      {selected && payload?.onUnlink ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                payload.onUnlink?.(payload);
              }}
              className="animate-in zoom-in-75 grid size-6 place-items-center rounded-full bg-danger text-on-primary shadow-soft ring-2 ring-canvas duration-100 hover:bg-danger/90"
              aria-label="unlink"
            >
              <Unlink className="size-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
