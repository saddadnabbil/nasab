import { useRef, type ReactNode } from "react";
import {
  Focus,
  ImagePlus,
  Trash2,
  UserPlus,
  Users,
  Baby,
  GitFork,
  Unlink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { formatNasab } from "@/lib/tree/nasab";
import { fileToAvatarDataUrl } from "@/lib/tree/photo";
import { useLocale } from "@/lib/i18n/context";
import {
  childrenOf,
  parentsOf,
  patchPerson,
  spousesOf,
} from "@/lib/tree/ops";
import {
  GENDERS,
  NODE_COLORS,
  PERSON_ICONS,
  type NodeColor,
  type Person,
  type PersonIcon,
  type TreeDocument,
} from "@/lib/tree/types";
import { PersonGlyph } from "./person-icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const COLOR_SWATCH: Record<NodeColor, string> = {
  lime: "bg-block-lime",
  lilac: "bg-block-lilac",
  cream: "bg-block-cream",
  mint: "bg-block-mint",
  pink: "bg-block-pink",
  coral: "bg-block-coral",
  navy: "bg-block-navy",
  ink: "bg-primary",
};

const GENDER_KEY: Record<string, string> = {
  male: "gender.male",
  female: "gender.female",
  other: "gender.other",
  unknown: "gender.unknown",
};

type Props = {
  doc: TreeDocument;
  person: Person;
  onChange: (doc: TreeDocument) => void;
  onClose: () => void;
  onAddSpouse: () => void;
  onAddChild: () => void;
  onAddParent: () => void;
  onAddSibling: () => void;
  onDelete: () => void;
  onSelect: (id: string) => void;
  onUnlinkParent: (parentId: string) => void;
  onUnlinkSpouse: (spouseId: string) => void;
  onUnlinkChild: (childId: string) => void;
  onFocus: () => void;
};

export function PersonPanel({
  doc,
  person,
  onChange,
  onClose,
  onAddSpouse,
  onAddChild,
  onAddParent,
  onAddSibling,
  onDelete,
  onSelect,
  onUnlinkParent,
  onUnlinkSpouse,
  onUnlinkChild,
  onFocus,
}: Props) {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const nasab = formatNasab(doc, person.id);
  const parents = parentsOf(doc, person.id)
    .map((id) => doc.people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p));
  const spouses = spousesOf(doc, person.id)
    .map((id) => doc.people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p));
  const children = childrenOf(doc, person.id)
    .map((id) => doc.people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p));

  function set<K extends keyof Person>(key: K, value: Person[K]) {
    onChange(patchPerson(doc, person.id, { [key]: value }));
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const url = await fileToAvatarDataUrl(file);
      set("photo", url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("panel.toast.photoFailed"));
    }
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-t-2xl border border-b-0 border-hairline bg-canvas shadow-soft md:w-[360px] md:rounded-none md:border-y-0 md:border-r-0 md:shadow-none">
      <div className="mx-auto mt-2 h-1 w-10 rounded-pill bg-hairline md:hidden" aria-hidden="true" />
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-5 sm:py-4">
        <p className="eyebrow">{t("panel.eyebrow")}</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onFocus}
            aria-label={t("panel.focusBranch")}
            title={t("panel.focusBranch")}
            className="grid size-10 place-items-center rounded-full bg-surface-soft hover:bg-primary hover:text-on-primary"
          >
            <Focus className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-surface-soft"
            aria-label={t("panel.close.ariaLabel")}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-soft sm:size-20"
            aria-label={t("panel.changePhoto.ariaLabel")}
          >
            {person.photo ? (
              <img src={person.photo} alt="" className="size-full object-cover" />
            ) : (
              <PersonGlyph name={person.icon ?? "user"} className="size-7 sm:size-8" />
            )}
            <span className="absolute inset-x-0 bottom-0 grid h-6 place-items-center bg-primary/70 text-on-primary">
              <ImagePlus className="size-3.5" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
          <div className="min-w-0">
            <p className="truncate text-[20px] leading-tight font-medium sm:text-[22px]">{person.name || t("panel.noName")}</p>
            <p className="mt-0.5 line-clamp-1 text-[14px] leading-5 text-ink/70 sm:mt-1 sm:text-[16px]">{nasab}</p>
          </div>
        </div>

        {person.photo ? (
          <button
            type="button"
            className="mt-3 text-[13px] underline underline-offset-4"
            onClick={() => set("photo", undefined)}
          >
            {t("panel.removePhoto")}
          </button>
        ) : null}

        <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4">
          <Field label={t("panel.field.name")}>
            <Input value={person.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label={t("panel.field.title")}>
            <Input
              value={person.title ?? ""}
              placeholder={t("panel.field.titlePlaceholder")}
              onChange={(e) => set("title", e.target.value || undefined)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("panel.field.birthYear")}>
              <Input
                value={person.birthYear ?? ""}
                placeholder="1948"
                onChange={(e) => set("birthYear", e.target.value || undefined)}
              />
            </Field>
            <Field label={t("panel.field.deathYear")}>
              <Input
                value={person.deathYear ?? ""}
                placeholder={t("panel.field.deathYearPlaceholder")}
                onChange={(e) => set("deathYear", e.target.value || undefined)}
              />
            </Field>
          </div>
          <Field label={t("panel.field.place")}>
            <Input
              value={person.birthPlace ?? ""}
              placeholder="Demak"
              onChange={(e) => set("birthPlace", e.target.value || undefined)}
            />
          </Field>
          <Field label={t("panel.field.gender")}>
            <div className="flex flex-wrap gap-1.5">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", g)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-[13px]",
                    person.gender === g ? "bg-primary text-on-primary" : "bg-surface-soft text-ink",
                  )}
                >
                  {t(GENDER_KEY[g])}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("panel.field.shape")}>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => set("shape", undefined)}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-[13px]",
                  (person.shape ?? "rect") === "rect"
                    ? "bg-primary text-on-primary"
                    : "bg-surface-soft text-ink",
                )}
              >
                {t("panel.shape.rect")}
              </button>
              <button
                type="button"
                onClick={() => set("shape", "circle")}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-[13px]",
                  person.shape === "circle" ? "bg-primary text-on-primary" : "bg-surface-soft text-ink",
                )}
              >
                {t("panel.shape.circle")}
              </button>
            </div>
          </Field>
          <Field label={t("panel.field.color")}>
            <div className="flex flex-wrap gap-2">
              {NODE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => set("color", c)}
                  className={cn(
                    "size-8 rounded-full ring-offset-2 ring-offset-canvas",
                    COLOR_SWATCH[c],
                    person.color === c ? "ring-2 ring-ink" : "ring-1 ring-hairline",
                  )}
                />
              ))}
            </div>
          </Field>
          <Field label={t("panel.field.icon")}>
            <div className="grid grid-cols-6 gap-1.5">
              {PERSON_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  aria-label={icon}
                  onClick={() => set("icon", icon)}
                  className={cn(
                    "grid size-10 place-items-center rounded-md",
                    (person.icon ?? "user") === icon
                      ? "bg-primary text-on-primary"
                      : "bg-surface-soft text-ink",
                  )}
                >
                  <PersonGlyph name={icon as PersonIcon} className="size-4" />
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("panel.field.notes")}>
            <Textarea
              value={person.notes ?? ""}
              placeholder={t("panel.field.notesPlaceholder")}
              onChange={(e) => set("notes", e.target.value || undefined)}
            />
          </Field>
        </div>

        <div className="mt-8">
          <p className="eyebrow">{t("panel.relations.eyebrow")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onAddParent}>
              <GitFork className="size-3.5" /> {t("panel.relations.addParent")}
            </Button>
            <Button variant="outline" size="sm" onClick={onAddSpouse}>
              <Users className="size-3.5" /> {t("panel.relations.addSpouse")}
            </Button>
            <Button variant="outline" size="sm" onClick={onAddChild}>
              <Baby className="size-3.5" /> {t("panel.relations.addChild")}
            </Button>
            <Button variant="outline" size="sm" onClick={onAddSibling}>
              <UserPlus className="size-3.5" /> {t("panel.relations.addSibling")}
            </Button>
          </div>

          <RelList label={t("panel.relations.parentsLabel")} people={parents} onSelect={onSelect} onUnlink={onUnlinkParent} />
          <RelList label={t("panel.relations.spousesLabel")} people={spouses} onSelect={onSelect} onUnlink={onUnlinkSpouse} />
          <RelList label={t("panel.relations.childrenLabel")} people={children} onSelect={onSelect} onUnlink={onUnlinkChild} />
        </div>

        <Button variant="danger-outline" className="mt-8 w-full" onClick={onDelete}>
          <Trash2 className="size-4" /> {t("panel.delete")}
        </Button>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function RelList({
  label,
  people,
  onSelect,
  onUnlink,
}: {
  label: string;
  people: Person[];
  onSelect: (id: string) => void;
  onUnlink: (id: string) => void;
}) {
  const { t } = useLocale();
  if (people.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="caption text-ink/70">{label}</p>
      <ul className="mt-2 grid gap-1">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className="min-w-0 flex-1 rounded-md px-2 py-2 text-left text-[14px] hover:bg-surface-soft"
            >
              <span className="block truncate">{p.name}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const name = p.name || t("panel.unlink.fallbackName");
                if (window.confirm(t("panel.unlink.confirm", { name }))) {
                  onUnlink(p.id);
                }
              }}
              aria-label={t("panel.unlink.ariaLabel", { name: p.name || t("panel.unlink.fallbackName") })}
              className="grid size-8 shrink-0 place-items-center rounded-full text-danger hover:bg-danger-soft"
            >
              <Unlink className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
