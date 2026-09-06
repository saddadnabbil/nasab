import type { Gender, NodeColor, Person, TreeDocument } from "./types";

export function defaultColorForGender(gender: Gender): NodeColor {
  switch (gender) {
    case "male":
      return "mint";
    case "female":
      return "pink";
    case "other":
      return "lilac";
    default:
      return "cream";
  }
}

export function genderLabel(gender: Gender): string {
  switch (gender) {
    case "male":
      return "Laki-laki";
    case "female":
      return "Perempuan";
    case "other":
      return "Lainnya";
    default:
      return "Tidak disebutkan";
  }
}

export function lifespan(person: Person): string {
  const b = person.birthYear?.trim();
  const d = person.deathYear?.trim();
  if (b && d) return `${b} — ${d}`;
  if (b && !d) return b;
  if (!b && d) return `— ${d}`;
  return "";
}

export function displayName(person: Person): string {
  const title = person.title?.trim();
  return title ? `${title} ${person.name}` : person.name;
}

export function givenFamily(name: string): { given: string; family: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { given: name.trim(), family: "" };
  return { given: parts.slice(0, -1).join(" "), family: parts.at(-1) ?? "" };
}

function parentsOf(doc: TreeDocument, id: string): string[] {
  const u = doc.unions.find((x) => x.children.includes(id));
  if (!u) return [];
  return [u.a, u.b].filter(Boolean) as string[];
}

function fatherOf(doc: TreeDocument, id: string): Person | undefined {
  const parents = parentsOf(doc, id)
    .map((pid) => doc.people.find((p) => p.id === pid))
    .filter((p): p is Person => Boolean(p));
  return parents.find((p) => p.gender === "male") ?? parents[0];
}

/**
 * Traditional nasab chain: Name bin/binti Father bin Grandfather …
 * Walks the paternal line when a father is present.
 */
export function formatNasab(doc: TreeDocument, id: string, max = 6): string {
  const person = doc.people.find((p) => p.id === id);
  if (!person) return "";
  const chain: string[] = [person.name.trim() || "Tanpa nama"];
  let current = person;
  const seen = new Set<string>([person.id]);
  for (let i = 0; i < max; i += 1) {
    const father = fatherOf(doc, current.id);
    if (!father || seen.has(father.id)) break;
    seen.add(father.id);
    const particle = i === 0 ? (person.gender === "female" ? "binti" : "bin") : "bin";
    chain.push(`${particle} ${father.name.trim() || "Tanpa nama"}`);
    current = father;
  }
  return chain.join(" ");
}

export function countLiving(doc: TreeDocument): number {
  return doc.people.filter((p) => !p.deathYear?.trim()).length;
}
