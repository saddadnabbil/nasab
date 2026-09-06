import {
  COUPLE_GAP,
  H_GAP,
  NODE_H,
  NODE_W,
  UNION_SIZE,
  V_GAP,
  type Person,
  type TreeDocument,
  type Union,
} from "./types";

export type LaidOut = {
  people: Map<string, { x: number; y: number; gen: number }>;
  unions: Map<string, { x: number; y: number; gen: number }>;
  generations: Map<string, number>;
  maxGen: number;
};

type Fam = {
  key: string;
  unions: Union[];
  partners: string[];
  children: Fam[];
  width: number;
};

function parentMap(doc: TreeDocument): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const u of doc.unions) {
    for (const c of u.children) {
      const parents = [u.a, u.b].filter(Boolean) as string[];
      m.set(c, [...(m.get(c) ?? []), ...parents]);
    }
  }
  return m;
}

function unionsForPerson(doc: TreeDocument, id: string): Union[] {
  return doc.unions.filter((u) => u.a === id || u.b === id);
}

function primaryUnion(doc: TreeDocument, id: string): Union | undefined {
  const list = unionsForPerson(doc, id);
  return list.find((u) => u.children.length > 0) ?? list[0];
}

export function computeGenerations(doc: TreeDocument): Map<string, number> {
  const parents = parentMap(doc);
  const gen = new Map<string, number>();
  const ids = new Set(doc.people.map((p) => p.id));

  const visit = (id: string, visiting: Set<string>): number => {
    if (gen.has(id)) return gen.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const ps = (parents.get(id) ?? []).filter((p) => ids.has(p));
    const g = ps.length === 0 ? 0 : Math.max(...ps.map((p) => visit(p, visiting))) + 1;
    visiting.delete(id);
    gen.set(id, g);
    return g;
  };

  for (const p of doc.people) visit(p.id, new Set());

  // Spouses share the higher generation so couples sit on one row.
  for (const u of doc.unions) {
    const ga = gen.get(u.a) ?? 0;
    const gb = u.b ? (gen.get(u.b) ?? 0) : ga;
    const g = Math.max(ga, gb);
    gen.set(u.a, g);
    if (u.b) gen.set(u.b, g);
  }
  return gen;
}

function buildFam(
  doc: TreeDocument,
  union: Union | null,
  singles: string[],
  usedUnions: Set<string>,
  usedPeople: Set<string>,
): Fam {
  const partners: string[] = union ? ([union.a, union.b].filter(Boolean) as string[]) : [...singles];
  for (const p of partners) usedPeople.add(p);
  const unions: Union[] = [];
  if (union) {
    unions.push(union);
    usedUnions.add(union.id);
  }

  // A person can have more than one union (polygamy). Fold every other union
  // these partners belong to into this same family row instead of stranding
  // the extra spouse as an unrelated tree elsewhere in the forest.
  for (let i = 0; i < partners.length; i += 1) {
    const pid = partners[i];
    for (const extra of unionsForPerson(doc, pid)) {
      if (usedUnions.has(extra.id)) continue;
      usedUnions.add(extra.id);
      unions.push(extra);
      const other = extra.a === pid ? extra.b : extra.a;
      if (other && !partners.includes(other)) {
        partners.push(other);
        usedPeople.add(other);
      }
    }
  }

  const childIds: string[] = [];
  for (const u of unions) {
    for (const c of u.children) if (!childIds.includes(c)) childIds.push(c);
  }
  const children: Fam[] = [];
  const nestedUsed = new Set<string>();

  for (const cid of childIds) {
    if (nestedUsed.has(cid)) continue;
    const cu = primaryUnion(doc, cid);
    if (cu && !usedUnions.has(cu.id)) {
      const partnerIds = [cu.a, cu.b].filter(Boolean) as string[];
      for (const pid of partnerIds) nestedUsed.add(pid);
      children.push(buildFam(doc, cu, partnerIds, usedUnions, usedPeople));
    } else {
      nestedUsed.add(cid);
      children.push(buildFam(doc, null, [cid], usedUnions, usedPeople));
    }
  }

  const coupleW =
    partners.length > 1 ? partners.length * NODE_W + (partners.length - 1) * COUPLE_GAP : NODE_W;
  const childrenW =
    children.length === 0
      ? 0
      : children.reduce((s, c) => s + c.width, 0) + Math.max(0, children.length - 1) * H_GAP;
  const width = Math.max(coupleW, childrenW, NODE_W);

  return {
    key: unions[0]?.id ?? `s:${partners[0] ?? "x"}`,
    unions,
    partners,
    children,
    width,
  };
}

function forest(doc: TreeDocument): Fam[] {
  const parents = parentMap(doc);
  const usedUnions = new Set<string>();
  const usedPeople = new Set<string>();
  const roots = doc.people.filter((p) => !parents.has(p.id));
  const trees: Fam[] = [];

  for (const r of roots) {
    if (usedPeople.has(r.id)) continue;
    const u = primaryUnion(doc, r.id);
    if (u && !usedUnions.has(u.id)) {
      trees.push(buildFam(doc, u, [u.a, u.b].filter(Boolean) as string[], usedUnions, usedPeople));
    } else {
      trees.push(buildFam(doc, null, [r.id], usedUnions, usedPeople));
    }
  }

  // Orphans that were never visited (cycles / detached).
  for (const p of doc.people) {
    if (usedPeople.has(p.id)) continue;
    trees.push(buildFam(doc, null, [p.id], usedUnions, usedPeople));
  }

  return trees;
}

function placeFam(
  fam: Fam,
  left: number,
  gen: number,
  people: Map<string, { x: number; y: number; gen: number }>,
  unions: Map<string, { x: number; y: number; gen: number }>,
) {
  const y = gen * (NODE_H + V_GAP);
  const coupleW =
    fam.partners.length > 1
      ? fam.partners.length * NODE_W + (fam.partners.length - 1) * COUPLE_GAP
      : NODE_W;
  const coupleLeft = left + (fam.width - coupleW) / 2;

  fam.partners.forEach((id, i) => {
    people.set(id, {
      x: coupleLeft + i * (NODE_W + COUPLE_GAP),
      y,
      gen,
    });
  });

  for (const u of fam.unions) {
    const aPos = people.get(u.a);
    if (!aPos) continue;
    const bPos = u.b ? people.get(u.b) : null;
    const mid = bPos ? (aPos.x + bPos.x + NODE_W) / 2 : aPos.x + NODE_W / 2;
    unions.set(u.id, {
      x: mid - UNION_SIZE / 2,
      y: y + NODE_H + 44,
      gen,
    });
  }

  let cx = left;
  for (const child of fam.children) {
    placeFam(child, cx, gen + 1, people, unions);
    cx += child.width + H_GAP;
  }
}

export function layoutTree(doc: TreeDocument): LaidOut {
  const generations = computeGenerations(doc);
  const people = new Map<string, { x: number; y: number; gen: number }>();
  const unions = new Map<string, { x: number; y: number; gen: number }>();
  const trees = forest(doc);

  let x = 40;
  for (const t of trees) {
    placeFam(t, x, 0, people, unions);
    x += t.width + H_GAP * 1.5;
  }

  // Honour saved positions.
  for (const p of doc.people) {
    const auto = people.get(p.id);
    if (p.position) {
      people.set(p.id, {
        x: p.position.x,
        y: p.position.y,
        gen: auto?.gen ?? generations.get(p.id) ?? 0,
      });
    } else if (!auto) {
      people.set(p.id, { x: x, y: 0, gen: 0 });
      x += NODE_W + H_GAP;
    }
  }

  let maxGen = 0;
  for (const g of generations.values()) maxGen = Math.max(maxGen, g);

  return { people, unions, generations, maxGen };
}

export function clearPositions(doc: TreeDocument): TreeDocument {
  return {
    ...doc,
    people: doc.people.map((p: Person) => {
      const { position: _omit, ...rest } = p;
      return rest;
    }),
  };
}
