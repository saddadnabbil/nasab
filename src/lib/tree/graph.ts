import type { Edge, Node } from "@xyflow/react";
import { layoutTree } from "./layout";
import type { Annotation, Person, TreeDocument } from "./types";
import { NODE_W, UNION_SIZE } from "./types";

export type PersonNodeData = {
  person: Person;
  nasab: string;
  selected: boolean;
};

export type UnionNodeData = {
  label?: string;
};

export type AnnotationNodeData = {
  annotation: Annotation;
};

export type RelationEdgeData =
  | { kind: "parent-union"; unionId: string; personId: string }
  | { kind: "union-child"; unionId: string; childId: string };

export function documentToFlow(
  doc: TreeDocument,
  selectedId: string | null,
  nasabOf: (id: string) => string,
  visibleIds?: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const people = visibleIds ? doc.people.filter((p) => visibleIds.has(p.id)) : doc.people;
  const unions = visibleIds
    ? doc.unions.filter((u) => visibleIds.has(u.a) || (u.b ? visibleIds.has(u.b) : false))
    : doc.unions;
  const layoutDoc: TreeDocument = visibleIds ? { ...doc, people, unions } : doc;
  const laid = layoutTree(layoutDoc);
  const nodes: Node[] = [];
  const edges: Edge<RelationEdgeData>[] = [];

  for (const person of people) {
    const pos = laid.people.get(person.id) ?? { x: 0, y: 0, gen: 0 };
    nodes.push({
      id: person.id,
      type: "person",
      position: { x: pos.x, y: pos.y },
      data: {
        person,
        nasab: nasabOf(person.id),
        selected: person.id === selectedId,
      } satisfies PersonNodeData,
      style: { width: NODE_W },
    });
  }

  for (const union of unions) {
    const pos = laid.unions.get(union.id) ?? { x: 0, y: 0, gen: 0 };
    nodes.push({
      id: union.id,
      type: "union",
      position: { x: pos.x, y: pos.y },
      data: { label: union.label } satisfies UnionNodeData,
      draggable: false,
      style: { width: UNION_SIZE, height: UNION_SIZE },
    });

    // The two lines converging into the union dot below already read as
    // "these two are a couple" — a direct spouse-to-spouse line on top of
    // that is redundant, and slants oddly once cards have different heights.
    const partners = [union.a, union.b].filter(Boolean) as string[];

    for (const pid of partners) {
      if (visibleIds && !visibleIds.has(pid)) continue;
      edges.push({
        id: `e-pu-${union.id}-${pid}`,
        source: pid,
        target: union.id,
        sourceHandle: "child",
        type: "relation",
        className: "nasab-parent",
        style: { stroke: "var(--color-ink)", strokeWidth: 1.5 },
        data: { kind: "parent-union", unionId: union.id, personId: pid },
      });
    }

    for (const cid of union.children) {
      if (visibleIds && !visibleIds.has(cid)) continue;
      edges.push({
        id: `e-uc-${union.id}-${cid}`,
        source: union.id,
        target: cid,
        targetHandle: "parent",
        type: "relation",
        className: "nasab-child",
        style: { stroke: "var(--color-ink)", strokeWidth: 1.5 },
        data: { kind: "union-child", unionId: union.id, childId: cid },
      });
    }
  }

  for (const annotation of doc.annotations ?? []) {
    nodes.push({
      id: annotation.id,
      type: "annotation",
      position: { x: annotation.x, y: annotation.y },
      data: { annotation } satisfies AnnotationNodeData,
    });
  }

  return { nodes, edges };
}
