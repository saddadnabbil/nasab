import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  getViewportForBounds,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ViewportPortal,
  type Connection,
  type Edge,
  type EdgeChange,
  type IsValidConnection,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";
import { documentToFlow, type RelationEdgeData } from "@/lib/tree/graph";
import { useLocale } from "@/lib/i18n/context";
import { formatNasab } from "@/lib/tree/nasab";
import {
  addAnnotation,
  ensureUnion,
  linkChildToParent,
  patchAnnotation,
  setPersonPosition,
} from "@/lib/tree/ops";
import { STROKE_COLORS, type StrokeColor, type TreeDocument } from "@/lib/tree/types";
import { AnnotationNode } from "./annotation-node";
import { PersonNode, UnionNode } from "./person-node";
import { RelationEdge } from "./relation-edge";

const nodeTypes = { person: PersonNode, union: UnionNode, annotation: AnnotationNode };
const edgeTypes = { relation: RelationEdge };

export type ExportPng = () => Promise<string>;
export type PenTool = "draw" | "erase";

function themeStrokeColor(color: StrokeColor) {
  return color === STROKE_COLORS[0] ? "var(--color-ink)" : color;
}

function pointsToPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.reduce(
    (d, p, i) => d + `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `,
    "",
  );
}

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const ERASE_THRESHOLD = 12;

type Props = {
  doc: TreeDocument;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSelectUnion: (id: string) => void;
  onMultiSelect: (ids: string[]) => void;
  onChange: (doc: TreeDocument) => void;
  fitNonce: number;
  exportRef?: MutableRefObject<ExportPng | null>;
  visibleIds?: Set<string>;
  onUnlinkRelation: (data: RelationEdgeData) => void;
  onAnnotationTextChange: (id: string, text: string, width?: number) => void;
  onDeleteAnnotation: (id: string) => void;
  onAnnotationFocus: () => void;
  penMode: boolean;
  textMode: boolean;
  onTextPlaced: () => void;
  penTool: PenTool;
  penColor: StrokeColor;
  onAddStroke: (points: { x: number; y: number }[], color: StrokeColor) => void;
  onEraseStroke: (id: string) => void;
};

function CanvasInner({
  doc,
  selectedId,
  onSelect,
  onSelectUnion,
  onMultiSelect,
  onChange,
  fitNonce,
  exportRef,
  visibleIds,
  onUnlinkRelation,
  onAnnotationTextChange,
  onDeleteAnnotation,
  onAnnotationFocus,
  penMode,
  textMode,
  onTextPlaced,
  penTool,
  penColor,
  onAddStroke,
  onEraseStroke,
}: Props) {
  const { fitView, getNodes, getNodesBounds, screenToFlowPosition } = useReactFlow();
  const { t: translate } = useLocale();
  const { nodes: computedNodes, edges } = useMemo(
    () => documentToFlow(doc, selectedId, (id) => formatNasab(doc, id), visibleIds),
    [doc, selectedId, visibleIds],
  );

  // React Flow is a controlled component here (nodes come from `doc`), but a
  // drag needs its own live-updating state to render smoothly frame-by-frame —
  // without this, node positions only visually "jump" once at drag end.
  // See https://github.com/xyflow/xyflow/issues/4760.
  const [nodes, setNodes] = useState<Node[]>(computedNodes);
  const [newTextId, setNewTextId] = useState<string | null>(null);
  useEffect(() => {
    setNodes((prev) => {
      const selectedIds = new Set(prev.filter((n) => n.selected).map((n) => n.id));
      if (selectedIds.size === 0) return computedNodes;
      return computedNodes.map((n) => (selectedIds.has(n.id) ? { ...n, selected: true } : n));
    });
  }, [computedNodes]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const renderedNodes = useMemo(
    () =>
      nodes.map((n) =>
        n.type === "annotation"
          ? {
              ...n,
              data: {
                ...n.data,
                onTextChange: onAnnotationTextChange,
                onDelete: onDeleteAnnotation,
                onFocus: () => {
                  setNewTextId(null);
                  onAnnotationFocus();
                },
                autoFocus: n.id === newTextId,
              },
            }
          : n,
      ),
    [nodes, newTextId, onAnnotationTextChange, onDeleteAnnotation, onAnnotationFocus],
  );

  // Same controlled-component gap as nodes above: edges need their own local
  // state + onEdgesChange, or a click never actually marks one `selected`
  // (nothing feeds that back into the `edges` prop), so the unlink button
  // never appears. `renderedEdges` then just decorates `edgesState` fresh
  // each render — cheap, and never resets the click-driven selection.
  const [edgesState, setEdgesState] = useState<Edge[]>(edges);
  useEffect(() => {
    setEdgesState(edges);
  }, [edges]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdgesState((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const renderedEdges = useMemo(
    () => edgesState.map((e) => ({ ...e, data: { ...e.data, onUnlink: onUnlinkRelation } })),
    [edgesState, onUnlinkRelation],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fitView({ padding: 0.18, duration: 400 });
    }, 40);
    return () => window.clearTimeout(t);
  }, [fitNonce, fitView]);

  const onNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      if (node.type === "person") onSelect(node.id);
      if (node.type === "union") onSelectUnion(node.id);
    },
    [onSelect, onSelectUnion],
  );

  const onPaneClick = useCallback(
    (event: ReactMouseEvent | MouseEvent) => {
      if (textMode) {
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const added = addAnnotation(doc, { x: position.x, y: position.y });
        setNewTextId(added.id);
        onChange(added.doc);
        onTextPlaced();
        return;
      }
      onSelect(null);
    },
    [doc, onChange, onSelect, onTextPlaced, screenToFlowPosition, textMode],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      onMultiSelect(selectedNodes.filter((n) => n.type === "person").map((n) => n.id));
    },
    [onMultiSelect],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      if (node.type === "person") {
        onChange(setPersonPosition(doc, node.id, node.position));
      } else if (node.type === "annotation") {
        onChange(patchAnnotation(doc, node.id, { x: node.position.x, y: node.position.y }));
      }
    },
    [doc, onChange],
  );

  const isValidConnection = useCallback<IsValidConnection>((c) => {
    if (!c.source || !c.target || c.source === c.target) return false;
    if (c.sourceHandle === "child" && c.targetHandle === "parent") return true;
    if (c.sourceHandle === "spouse-source" && c.targetHandle === "spouse-target") return true;
    return false;
  }, []);

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      if (c.sourceHandle === "child" && c.targetHandle === "parent") {
        const already = doc.unions.some(
          (u) => (u.a === c.source || u.b === c.source) && u.children.includes(c.target!),
        );
        if (already) {
          toast.info(translate("editor.union.toast.alreadyLinked"));
          return;
        }
        onChange(linkChildToParent(doc, c.source, c.target));
        toast.success(translate("editor.union.toast.linked"));
      } else if (c.sourceHandle === "spouse-source" && c.targetHandle === "spouse-target") {
        const already = doc.unions.some(
          (u) =>
            (u.a === c.source && u.b === c.target) || (u.a === c.target && u.b === c.source),
        );
        if (already) {
          toast.info(translate("editor.union.toast.alreadySpouse"));
          return;
        }
        onChange(ensureUnion(doc, c.source, c.target).doc);
        toast.success(translate("editor.union.toast.spouseLinked"));
      }
    },
    [doc, onChange, translate],
  );

  useEffect(() => {
    if (!exportRef) return;
    exportRef.current = async () => {
      await fitView({ duration: 0 });
      const bounds = getNodesBounds(getNodes());
      // Frame matches the content's own aspect ratio — the margin comes from
      // the `padding` fraction below, not from inflating this frame (inflating
      // it here just makes getViewportForBounds zoom in further to fill it,
      // which was the earlier bug: exports rendered edge-to-edge with no air).
      const width = Math.max(640, Math.round(bounds.width));
      const height = Math.max(480, Math.round(bounds.height));
      const viewport = getViewportForBounds(bounds, width, height, 0.1, 2, 0.14);
      const el = document.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (!el) throw new Error("Kanvas belum siap");
      return toPng(el, {
        backgroundColor: "#ffffff",
        width,
        height,
        pixelRatio: 2,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
    };
    return () => {
      exportRef.current = null;
    };
  }, [exportRef, getNodes, getNodesBounds, fitView]);

  // ── pen tool ─────────────────────────────────────────────────────────
  // Handlers live on the same wrapper as the canvas (not a full-screen
  // overlay on top of it) so a click that actually lands on an interactive
  // element — an annotation's textarea, its delete button, an edge's unlink
  // button — reaches that element instead of always starting a stroke.
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[] | null>(null);
  const drawingRef = useRef<{ x: number; y: number }[] | null>(null);
  const erasedRef = useRef<Set<string>>(new Set());

  const isInteractiveTarget = (e: ReactPointerEvent<HTMLDivElement>) =>
    (e.target as HTMLElement).closest("textarea, button, input");

  const onPenPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!penMode || isInteractiveTarget(e)) return;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (penTool === "erase") {
        erasedRef.current = new Set();
        const hit = (doc.strokes ?? []).find((s) =>
          s.points.some(
            (pt, i) => i > 0 && distToSegment(p, s.points[i - 1], pt) <= ERASE_THRESHOLD,
          ),
        );
        if (hit) {
          erasedRef.current.add(hit.id);
          onEraseStroke(hit.id);
        }
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = [p];
      setDrawingPoints([p]);
    },
    [penMode, penTool, screenToFlowPosition, doc.strokes, onEraseStroke],
  );

  const onPenPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!penMode) return;
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      if (penTool === "erase") {
        if (e.buttons !== 1) return;
        const hit = (doc.strokes ?? []).find(
          (s) =>
            !erasedRef.current.has(s.id) &&
            s.points.some(
              (pt, i) => i > 0 && distToSegment(p, s.points[i - 1], pt) <= ERASE_THRESHOLD,
            ),
        );
        if (hit) {
          erasedRef.current.add(hit.id);
          onEraseStroke(hit.id);
        }
        return;
      }
      if (!drawingRef.current) return;
      drawingRef.current = [...drawingRef.current, p];
      setDrawingPoints(drawingRef.current);
    },
    [penMode, penTool, screenToFlowPosition, doc.strokes, onEraseStroke],
  );

  const onPenPointerUp = useCallback(() => {
    if (drawingRef.current && drawingRef.current.length >= 2) {
      onAddStroke(drawingRef.current, penColor);
    }
    drawingRef.current = null;
    setDrawingPoints(null);
  }, [onAddStroke, penColor]);

  return (
    <div
      className="relative size-full"
      onPointerDown={penMode ? onPenPointerDown : undefined}
      onPointerMove={penMode ? onPenPointerMove : undefined}
      onPointerUp={penMode ? onPenPointerUp : undefined}
      style={
        penMode || textMode
          ? { cursor: textMode ? "text" : penTool === "erase" ? "cell" : "crosshair" }
          : undefined
      }
    >
      <ReactFlow
        nodes={renderedNodes}
        edges={renderedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodesDraggable={!penMode && !textMode}
        elementsSelectable={!penMode && !textMode}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesFocusable
        selectNodesOnDrag
        selectionOnDrag
        panOnScroll
        panOnDrag={!penMode && !textMode}
        zoomOnDoubleClick={!penMode && !textMode}
        fitView
        fitViewOptions={{ padding: 0.18 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--color-hairline)" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeColor={(n) => {
            const color = (n.data as { person?: { color?: string } }).person?.color;
            switch (color) {
              case "lime":
                return "#dceeb1";
              case "lilac":
                return "#c5b0f4";
              case "mint":
                return "#c8e6cd";
              case "pink":
                return "#efd4d4";
              case "coral":
                return "#f3c9b6";
              case "navy":
                return "#1f1d3d";
              case "ink":
                return "#000000";
              default:
                return "#f4ecd6";
            }
          }}
        />
        <ViewportPortal>
          <svg style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}>
            {(doc.strokes ?? []).map((s) => (
              <path
                key={s.id}
                d={pointsToPath(s.points)}
                stroke={themeStrokeColor(s.color)}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {drawingPoints ? (
              <path
                d={pointsToPath(drawingPoints)}
                stroke={themeStrokeColor(penColor)}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
        </ViewportPortal>
      </ReactFlow>
    </div>
  );
}

export function TreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
