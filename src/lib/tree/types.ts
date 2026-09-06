export const PERSON_ICONS = [
  "user",
  "crown",
  "heart",
  "star",
  "book",
  "shield",
  "sun",
  "moon",
  "leaf",
  "landmark",
  "flag",
  "feather",
] as const;

export type PersonIcon = (typeof PERSON_ICONS)[number];

export const NODE_COLORS = [
  "lime",
  "lilac",
  "cream",
  "mint",
  "pink",
  "coral",
  "navy",
  "ink",
] as const;

export type NodeColor = (typeof NODE_COLORS)[number];

export const GENDERS = ["male", "female", "other", "unknown"] as const;
export type Gender = (typeof GENDERS)[number];

export type Person = {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: string;
  deathYear?: string;
  birthPlace?: string;
  title?: string;
  notes?: string;
  photo?: string;
  icon?: PersonIcon;
  color?: NodeColor;
  shape?: "rect" | "circle";
  position?: { x: number; y: number };
};

export type Union = {
  id: string;
  a: string;
  b: string | null;
  children: string[];
  label?: string;
  notes?: string;
};

export type Annotation = {
  id: string;
  text: string;
  x: number;
  y: number;
  width?: number;
  color?: NodeColor;
};

export const STROKE_COLORS = ["#111111", "#e0503e", "#2f6fed", "#1ea64a", "#f2a900"] as const;
export type StrokeColor = (typeof STROKE_COLORS)[number];

export type Stroke = {
  id: string;
  points: { x: number; y: number }[];
  color: StrokeColor;
};

export type TreeDocument = {
  version: 1;
  name: string;
  description: string;
  people: Person[];
  unions: Union[];
  annotations?: Annotation[];
  strokes?: Stroke[];
};

export type TreeMeta = {
  id: string;
  name: string;
  description: string;
  origin: "local" | "cloud";
  updatedAt: string;
  personCount: number;
};

export type StoredTree = TreeMeta & {
  doc: TreeDocument;
};

export const NODE_W = 196;
export const NODE_H = 232;
export const H_GAP = 56;
export const V_GAP = 168;
export const COUPLE_GAP = 28;
export const UNION_SIZE = 36;
