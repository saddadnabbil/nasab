import { emptyTree } from "./ops";
import type { StoredTree, TreeDocument, TreeMeta } from "./types";

const KEY = "nasab.v1";

type Disk = {
  trees: StoredTree[];
  lastOpenedId?: string;
};

function canUse(): boolean {
  return typeof window !== "undefined";
}

function read(): Disk {
  if (!canUse()) return { trees: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { trees: [] };
    const parsed = JSON.parse(raw) as Disk;
    if (!Array.isArray(parsed.trees)) return { trees: [] };
    return parsed;
  } catch {
    return { trees: [] };
  }
}

function write(disk: Disk) {
  if (!canUse()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(disk));
  } catch {
    /* quota */
  }
}

function metaOf(t: StoredTree): TreeMeta {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    origin: t.origin,
    updatedAt: t.updatedAt,
    personCount: t.personCount,
  };
}

export function listLocalTrees(): TreeMeta[] {
  return read()
    .trees.filter((t) => t.origin === "local")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(metaOf);
}

export function getLocalTree(id: string): StoredTree | null {
  return read().trees.find((t) => t.id === id) ?? null;
}

export function saveLocalTree(tree: StoredTree): void {
  const disk = read();
  const i = disk.trees.findIndex((t) => t.id === tree.id);
  const next: StoredTree = {
    ...tree,
    name: tree.doc.name,
    description: tree.doc.description,
    personCount: tree.doc.people.length,
    updatedAt: new Date().toISOString(),
  };
  if (i >= 0) disk.trees[i] = next;
  else disk.trees.unshift(next);
  disk.lastOpenedId = tree.id;
  write(disk);
}

export function deleteLocalTree(id: string): void {
  const disk = read();
  disk.trees = disk.trees.filter((t) => t.id !== id);
  if (disk.lastOpenedId === id) disk.lastOpenedId = disk.trees[0]?.id;
  write(disk);
}

export function getLastOpenedId(): string | undefined {
  return read().lastOpenedId;
}

export function createLocalTree(doc?: TreeDocument): StoredTree {
  const d = doc ?? emptyTree();
  const tree: StoredTree = {
    id: crypto.randomUUID(),
    name: d.name,
    description: d.description,
    origin: "local",
    updatedAt: new Date().toISOString(),
    personCount: d.people.length,
    doc: d,
  };
  saveLocalTree(tree);
  return tree;
}

export function duplicateLocal(id: string): StoredTree | null {
  const src = getLocalTree(id);
  if (!src) return null;
  const copy = structuredClone(src.doc);
  copy.name = `${copy.name} (salinan)`;
  return createLocalTree(copy);
}

export function importLocalDoc(doc: TreeDocument): StoredTree {
  return createLocalTree(doc);
}
