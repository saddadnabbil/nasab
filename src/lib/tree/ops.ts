import { newId } from "./ids";
import type {
  Annotation,
  Gender,
  NodeColor,
  Person,
  PersonIcon,
  Stroke,
  StrokeColor,
  TreeDocument,
  Union,
} from "./types";
import { defaultColorForGender } from "./nasab";

export function emptyTree(name = "Pohon baru"): TreeDocument {
  const self: Person = {
    id: newId("p"),
    name: "Saya",
    gender: "unknown",
    color: "cream",
    icon: "user",
    notes: "Titik awal silsilah. Ubah nama, tambah orang tua, pasangan, atau anak.",
  };
  return {
    version: 1,
    name,
    description: "",
    people: [self],
    unions: [],
  };
}

export function cloneDoc(doc: TreeDocument): TreeDocument {
  return structuredClone(doc);
}

export function getPerson(doc: TreeDocument, id: string): Person | undefined {
  return doc.people.find((p) => p.id === id);
}

export function upsertPerson(doc: TreeDocument, person: Person): TreeDocument {
  const next = cloneDoc(doc);
  const i = next.people.findIndex((p) => p.id === person.id);
  if (i >= 0) next.people[i] = person;
  else next.people.push(person);
  return next;
}

export function patchPerson(
  doc: TreeDocument,
  id: string,
  patch: Partial<Person>,
): TreeDocument {
  const next = cloneDoc(doc);
  const i = next.people.findIndex((p) => p.id === id);
  if (i < 0) return doc;
  next.people[i] = { ...next.people[i], ...patch };
  return next;
}

export function patchPeople(
  doc: TreeDocument,
  ids: string[],
  patch: Partial<Person>,
): TreeDocument {
  const idSet = new Set(ids);
  const next = cloneDoc(doc);
  next.people = next.people.map((p) => (idSet.has(p.id) ? { ...p, ...patch } : p));
  return next;
}

export function setPersonPosition(
  doc: TreeDocument,
  id: string,
  position: { x: number; y: number },
): TreeDocument {
  return patchPerson(doc, id, { position });
}

export function addBlankPerson(
  doc: TreeDocument,
  seed: Partial<Person> = {},
): { doc: TreeDocument; id: string } {
  const gender: Gender = seed.gender ?? "unknown";
  const person: Person = {
    id: seed.id ?? newId("p"),
    name: seed.name ?? "Tanpa nama",
    gender,
    color: seed.color ?? defaultColorForGender(gender),
    icon: (seed.icon as PersonIcon | undefined) ?? "user",
    ...seed,
  };
  return { doc: upsertPerson(doc, person), id: person.id };
}

function findUnionForPartners(
  doc: TreeDocument,
  a: string,
  b: string | null,
): Union | undefined {
  return doc.unions.find((u) => {
    const ids = [u.a, u.b].filter(Boolean) as string[];
    if (b) return ids.includes(a) && ids.includes(b);
    return ids.includes(a) && u.b === null;
  });
}

export function ensureUnion(
  doc: TreeDocument,
  a: string,
  b: string | null,
): { doc: TreeDocument; unionId: string } {
  const existing = findUnionForPartners(doc, a, b);
  if (existing) return { doc, unionId: existing.id };
  const next = cloneDoc(doc);
  const union: Union = { id: newId("u"), a, b, children: [] };
  next.unions.push(union);
  return { doc: next, unionId: union.id };
}

export function addSpouse(
  doc: TreeDocument,
  personId: string,
  spouseSeed: Partial<Person> = {},
): { doc: TreeDocument; spouseId: string } {
  const person = getPerson(doc, personId);
  if (!person) return { doc, spouseId: personId };
  const spouseGender: Gender =
    spouseSeed.gender ??
    (person.gender === "male" ? "female" : person.gender === "female" ? "male" : "unknown");
  const added = addBlankPerson(doc, {
    name: spouseSeed.name ?? "Pasangan",
    gender: spouseGender,
    color: (spouseSeed.color as NodeColor | undefined) ?? defaultColorForGender(spouseGender),
    ...spouseSeed,
  });
  const linked = ensureUnion(added.doc, personId, added.id);
  return { doc: linked.doc, spouseId: added.id };
}

export function addChild(
  doc: TreeDocument,
  parentId: string,
  childSeed: Partial<Person> = {},
): { doc: TreeDocument; childId: string } {
  const parent = getPerson(doc, parentId);
  if (!parent) return { doc, childId: parentId };

  let next = doc;
  let union = next.unions.find(
    (u) => (u.a === parentId || u.b === parentId) && u.children.length >= 0,
  );
  if (!union) {
    const spouse = addSpouse(next, parentId, { name: "Pasangan" });
    next = spouse.doc;
    union = next.unions.find((u) => u.a === parentId || u.b === parentId);
  }
  if (!union) return { doc: next, childId: parentId };

  const added = addBlankPerson(next, {
    name: childSeed.name ?? "Anak",
    gender: childSeed.gender ?? "unknown",
    ...childSeed,
  });
  const withChild = cloneDoc(added.doc);
  const u = withChild.unions.find((x) => x.id === union!.id);
  if (u && !u.children.includes(added.id)) u.children.push(added.id);
  return { doc: withChild, childId: added.id };
}

export function addParent(
  doc: TreeDocument,
  childId: string,
  parentSeed: Partial<Person> = {},
): { doc: TreeDocument; parentId: string } {
  const existing = doc.unions.find((u) => u.children.includes(childId));
  if (existing) {
    const ids = [existing.a, existing.b].filter(Boolean) as string[];
    if (ids.length === 1) {
      const spouse = addSpouse(doc, ids[0], {
        name: parentSeed.name ?? "Orang tua",
        ...parentSeed,
      });
      return { doc: spouse.doc, parentId: spouse.spouseId };
    }
    return { doc, parentId: existing.a };
  }

  const fatherGender: Gender = parentSeed.gender ?? "male";
  const added = addBlankPerson(doc, {
    name: parentSeed.name ?? "Orang tua",
    gender: fatherGender,
    color: defaultColorForGender(fatherGender),
    ...parentSeed,
  });
  const spouse = addSpouse(added.doc, added.id, {
    name: "Orang tua",
    gender: fatherGender === "male" ? "female" : "male",
  });
  const linked = cloneDoc(spouse.doc);
  const union = linked.unions.find((u) => u.a === added.id || u.b === added.id);
  if (union && !union.children.includes(childId)) union.children.push(childId);
  return { doc: linked, parentId: added.id };
}

export function removePerson(doc: TreeDocument, id: string): TreeDocument {
  const next = cloneDoc(doc);
  next.people = next.people.filter((p) => p.id !== id);
  next.unions = next.unions
    .map((u) => ({
      ...u,
      a: u.a === id ? u.b ?? "" : u.a,
      b: u.b === id ? null : u.b,
      children: u.children.filter((c) => c !== id),
    }))
    .filter((u) => u.a && next.people.some((p) => p.id === u.a));
  return next;
}

export function addSibling(
  doc: TreeDocument,
  personId: string,
): { doc: TreeDocument; siblingId: string } {
  const union = doc.unions.find((u) => u.children.includes(personId));
  if (union) {
    const added = addBlankPerson(doc, { name: "Saudara", gender: "unknown" });
    const next = cloneDoc(added.doc);
    const u = next.unions.find((x) => x.id === union.id);
    if (u) u.children.push(added.id);
    return { doc: next, siblingId: added.id };
  }
  const withParents = addParent(doc, personId);
  const child = addChild(withParents.doc, withParents.parentId, { name: "Saudara" });
  return { doc: child.doc, siblingId: child.childId };
}

function pruneEmptyUnions(doc: TreeDocument): TreeDocument {
  return {
    ...doc,
    unions: doc.unions.filter((u) => u.b || u.children.length > 0),
  };
}

/** Detaches a child from a specific parent's union — used to remove a parent/child link either way. */
export function unlinkChild(
  doc: TreeDocument,
  parentId: string,
  childId: string,
): TreeDocument {
  const next = cloneDoc(doc);
  next.unions = next.unions.map((u) => {
    if (u.a !== parentId && u.b !== parentId) return u;
    if (!u.children.includes(childId)) return u;
    return { ...u, children: u.children.filter((c) => c !== childId) };
  });
  return pruneEmptyUnions(next);
}

/** Removes the spousal link between two people. Keeps the union (and its children) if it has any. */
export function unlinkSpouse(
  doc: TreeDocument,
  personId: string,
  spouseId: string,
): TreeDocument {
  const next = cloneDoc(doc);
  next.unions = next.unions.map((u) => {
    const isPair = (u.a === personId && u.b === spouseId) || (u.a === spouseId && u.b === personId);
    if (!isPair) return u;
    const keep = u.a === personId || u.a === spouseId ? u.a : personId;
    return { ...u, a: keep, b: null };
  });
  return pruneEmptyUnions(next);
}

/** Links two already-existing people as parent → child, e.g. via a dragged handle connection. */
export function linkChildToParent(
  doc: TreeDocument,
  parentId: string,
  childId: string,
): TreeDocument {
  if (parentId === childId) return doc;
  const next = cloneDoc(doc);
  let union = next.unions.find((u) => u.a === parentId || u.b === parentId);
  if (!union) {
    union = { id: newId("u"), a: parentId, b: null, children: [] };
    next.unions.push(union);
  }
  if (!union.children.includes(childId)) union.children.push(childId);
  return next;
}

export function patchUnion(
  doc: TreeDocument,
  unionId: string,
  patch: Partial<Pick<Union, "label" | "notes">>,
): TreeDocument {
  const next = cloneDoc(doc);
  const i = next.unions.findIndex((u) => u.id === unionId);
  if (i < 0) return doc;
  next.unions[i] = { ...next.unions[i], ...patch };
  return next;
}

export function parentsOf(doc: TreeDocument, id: string): string[] {
  const u = doc.unions.find((x) => x.children.includes(id));
  if (!u) return [];
  return [u.a, u.b].filter(Boolean) as string[];
}

export function childrenOf(doc: TreeDocument, id: string): string[] {
  return doc.unions.filter((u) => u.a === id || u.b === id).flatMap((u) => u.children);
}

export function spousesOf(doc: TreeDocument, id: string): string[] {
  return doc.unions
    .filter((u) => u.a === id || u.b === id)
    .map((u) => (u.a === id ? u.b : u.a))
    .filter((x): x is string => Boolean(x));
}

/**
 * Everyone "focus mode" should show for a branch rooted at `rootId`: the
 * root, their spouse(s), and every descendant (and each descendant's own
 * spouses) — never a spouse's unrelated other marriage/lineage.
 */
export function collectDescendants(doc: TreeDocument, rootId: string): Set<string> {
  const visible = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const pid = queue.shift()!;
    for (const u of doc.unions) {
      if (u.a !== pid && u.b !== pid) continue;
      const spouse = u.a === pid ? u.b : u.a;
      if (spouse) visible.add(spouse);
      for (const cid of u.children) {
        if (!visible.has(cid)) {
          visible.add(cid);
          queue.push(cid);
        }
      }
    }
  }
  return visible;
}

/** Unlinks a specific parent from a union, keeping the union (and children) if the other parent remains. */
export function unlinkUnionParent(
  doc: TreeDocument,
  unionId: string,
  personId: string,
): TreeDocument {
  const union = doc.unions.find((u) => u.id === unionId);
  if (!union) return doc;
  const other = union.a === personId ? union.b : union.b === personId ? union.a : null;
  if (!other) return doc;
  return unlinkSpouse(doc, personId, other);
}

// ── canvas annotations (free text) ──────────────────────────────────────
export function addAnnotation(
  doc: TreeDocument,
  seed: { x: number; y: number; text?: string; color?: NodeColor },
): { doc: TreeDocument; id: string } {
  const annotation: Annotation = {
    id: newId("a"),
    text: seed.text ?? "",
    x: seed.x,
    y: seed.y,
    color: seed.color ?? "cream",
  };
  const next = cloneDoc(doc);
  next.annotations = [...(next.annotations ?? []), annotation];
  return { doc: next, id: annotation.id };
}

export function patchAnnotation(
  doc: TreeDocument,
  id: string,
  patch: Partial<Omit<Annotation, "id">>,
): TreeDocument {
  const next = cloneDoc(doc);
  next.annotations = (next.annotations ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a));
  return next;
}

export function removeAnnotation(doc: TreeDocument, id: string): TreeDocument {
  const next = cloneDoc(doc);
  next.annotations = (next.annotations ?? []).filter((a) => a.id !== id);
  return next;
}

// ── canvas pen strokes ───────────────────────────────────────────────────
export function addStroke(
  doc: TreeDocument,
  points: { x: number; y: number }[],
  color: StrokeColor,
): TreeDocument {
  if (points.length < 2) return doc;
  const stroke: Stroke = { id: newId("s"), points, color };
  const next = cloneDoc(doc);
  next.strokes = [...(next.strokes ?? []), stroke];
  return next;
}

export function removeStroke(doc: TreeDocument, id: string): TreeDocument {
  const next = cloneDoc(doc);
  next.strokes = (next.strokes ?? []).filter((s) => s.id !== id);
  return next;
}

export function clearStrokes(doc: TreeDocument): TreeDocument {
  return { ...cloneDoc(doc), strokes: [] };
}
