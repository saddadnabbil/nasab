import { Link, useNavigate } from "@tanstack/react-router";
import {
  Baby,
  Cloud,
  Download,
  Eraser,
  FileJson,
  Focus,
  GitFork,
  ImageDown,
  HelpCircle,
  LayoutTemplate,
  PenLine,
  Plus,
  Redo2,
  Search,
  Type,
  Undo2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { upsertCloudTree } from "@/lib/tree/api";
import { formatNasab } from "@/lib/tree/nasab";
import { withNasabCredit } from "@/lib/tree/export-image";
import { useLocale } from "@/lib/i18n/context";
import {
  addChild,
  addParent,
  addSibling,
  addSpouse,
  addBlankPerson,
  addStroke,
  collectDescendants,
  patchAnnotation,
  patchPeople,
  patchUnion,
  removeAnnotation,
  removePerson,
  removeStroke,
  unlinkChild,
  unlinkSpouse,
  unlinkUnionParent,
} from "@/lib/tree/ops";
import { clearPositions } from "@/lib/tree/layout";
import { saveLocalTree } from "@/lib/tree/storage";
import {
  NODE_COLORS,
  PERSON_ICONS,
  STROKE_COLORS,
  type PersonIcon,
  type StoredTree,
  type StrokeColor,
  type TreeDocument,
} from "@/lib/tree/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { RelationEdgeData } from "@/lib/tree/graph";
import { PersonGlyph } from "./person-icon";
import { COLOR_SWATCH, PersonPanel } from "./person-panel";
import { TreeCanvas, type ExportPng, type PenTool } from "./tree-canvas";
import { BOARD_TOUR_STORAGE_KEY, BoardTour } from "./board-tour";
import { cn } from "@/lib/utils";

const NOTICE_DISMISSED_KEY = "nasab:local-tree-notice-dismissed";
const HISTORY_DEBOUNCE_MS = 600;

type Relation = "parent" | "spouse" | "child" | "sibling";

type Props = {
  tree: StoredTree;
  onTreeChange: (tree: StoredTree) => void;
};

export function EditorShell({ tree, onTreeChange }: Props) {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user } = useCurrentUserState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedUnionId, setSelectedUnionId] = useState<string | null>(null);
  const [fitNonce, setFitNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [cloudSavedAt, setCloudSavedAt] = useState<string | null>(
    tree.origin === "cloud" ? tree.updatedAt : null,
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addFromQuery, setAddFromQuery] = useState("");
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [addFromId, setAddFromId] = useState<string | null>(null);
  const [addRelation, setAddRelation] = useState<Relation>("child");
  const [historyTick, setHistoryTick] = useState(0);
  const [focusRootId, setFocusRootId] = useState<string | null>(null);
  const [penMode, setPenMode] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [penTool, setPenTool] = useState<PenTool>("draw");
  const [penColor, setPenColor] = useState<StrokeColor>(STROKE_COLORS[0]);
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [tourOpen, setTourOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const exportPngRef = useRef<ExportPng | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(NOTICE_DISMISSED_KEY) === "1",
  );

  useEffect(() => {
    if (localStorage.getItem(BOARD_TOUR_STORAGE_KEY) !== "1") setTourOpen(true);
  }, []);

  const finishTour = useCallback(() => {
    localStorage.setItem(BOARD_TOUR_STORAGE_KEY, "1");
    setTourOpen(false);
  }, []);
  const doc = tree.doc;
  const selected = doc.people.find((p) => p.id === selectedId) ?? null;
  const selectedUnion = doc.unions.find((u) => u.id === selectedUnionId) ?? null;
  const focusRoot = focusRootId ? doc.people.find((p) => p.id === focusRootId) ?? null : null;
  const visibleIds = useMemo(
    () => (focusRoot ? collectDescendants(doc, focusRoot.id) : undefined),
    [doc, focusRoot],
  );
  const unionPartnerNames = selectedUnion
    ? [selectedUnion.a, selectedUnion.b]
        .filter(Boolean)
        .map((id) => doc.people.find((p) => p.id === id)?.name || t("panel.noName"))
        .join(" & ")
    : "";

  function dismissNotice() {
    localStorage.setItem(NOTICE_DISMISSED_KEY, "1");
    setNoticeDismissed(true);
  }

  // ── undo / redo ──────────────────────────────────────────────────────
  // Refs, not state: history must survive without re-rendering on every push,
  // and `commit` needs the latest tree without re-registering the key handler.
  const treeRef = useRef(tree);
  treeRef.current = tree;
  const undoStack = useRef<TreeDocument[]>([]);
  const redoStack = useRef<TreeDocument[]>([]);
  const pendingBase = useRef<TreeDocument | null>(null);
  const historyTimer = useRef<number | null>(null);
  const bump = () => setHistoryTick((n) => n + 1);

  const flushPending = useCallback(() => {
    if (historyTimer.current) {
      window.clearTimeout(historyTimer.current);
      historyTimer.current = null;
    }
    if (pendingBase.current) {
      undoStack.current.push(pendingBase.current);
      pendingBase.current = null;
    }
  }, []);

  const applyHistoryDoc = useCallback(
    (nextDoc: TreeDocument) => {
      const next: StoredTree = {
        ...treeRef.current,
        name: nextDoc.name,
        description: nextDoc.description,
        personCount: nextDoc.people.length,
        doc: nextDoc,
        updatedAt: new Date().toISOString(),
      };
      saveLocalTree({ ...next, origin: "local" });
      onTreeChange(next);
      bump();
    },
    [onTreeChange],
  );

  const undo = useCallback(() => {
    flushPending();
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(treeRef.current.doc);
    applyHistoryDoc(prev);
  }, [applyHistoryDoc, flushPending]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(treeRef.current.doc);
    applyHistoryDoc(next);
  }, [applyHistoryDoc]);

  const commit = useCallback(
    (nextDoc: TreeDocument, opts?: { historyGroup?: boolean }) => {
      const prevDoc = treeRef.current.doc;
      const structural =
        prevDoc.people.length !== nextDoc.people.length ||
        prevDoc.unions.length !== nextDoc.unions.length;
      redoStack.current = [];
      if (structural || !opts?.historyGroup) {
        flushPending();
        undoStack.current.push(prevDoc);
      } else {
        if (!pendingBase.current) pendingBase.current = prevDoc;
        if (historyTimer.current) window.clearTimeout(historyTimer.current);
        historyTimer.current = window.setTimeout(flushPending, HISTORY_DEBOUNCE_MS);
      }
      bump();

      const next: StoredTree = {
        ...treeRef.current,
        name: nextDoc.name,
        description: nextDoc.description,
        personCount: nextDoc.people.length,
        doc: nextDoc,
        updatedAt: new Date().toISOString(),
      };
      saveLocalTree({ ...next, origin: "local" });
      onTreeChange(next);
    },
    [flushPending, onTreeChange],
  );

  /** For text-field edits — groups a burst of keystrokes into one undo step. */
  const commitField = useCallback(
    (nextDoc: TreeDocument) => commit(nextDoc, { historyGroup: true }),
    [commit],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveLocalTree({ ...tree, origin: "local" });
    }, 400);
    return () => window.clearTimeout(id);
  }, [tree]);

  useEffect(() => {
    if (focusRootId && !doc.people.some((p) => p.id === focusRootId)) setFocusRootId(null);
  }, [doc, focusRootId]);

  const cloudTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!user || tree.origin !== "cloud") return;
    if (cloudTimer.current) window.clearTimeout(cloudTimer.current);
    cloudTimer.current = window.setTimeout(() => {
      void upsertCloudTree({ data: { id: tree.id, doc: tree.doc } })
        .then(() => setCloudSavedAt(new Date().toISOString()))
        .catch(() => toast.error(t("editor.toast.saveFailed")));
    }, 1400);
    return () => {
      if (cloudTimer.current) window.clearTimeout(cloudTimer.current);
    };
  }, [tree.doc, tree.id, tree.origin, user, t]);

  async function saveToAccount() {
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    setSavingCloud(true);
    try {
      await upsertCloudTree({ data: { id: tree.id, doc: tree.doc } });
      setCloudSavedAt(new Date().toISOString());
      onTreeChange({ ...tree, origin: "cloud" });
      toast.success(t("editor.toast.savedToAccount"));
    } catch {
      toast.error(t("editor.toast.saveFailedRetry"));
    } finally {
      setSavingCloud(false);
    }
  }

  function mutate(next: TreeDocument, focus?: string) {
    commit(next);
    if (focus) {
      setSelectedId(focus);
      setFitNonce((n) => n + 1);
    }
  }

  function autoLayout() {
    mutate(clearPositions(doc));
    setFitNonce((n) => n + 1);
  }

  function handleUnlinkRelation(data: RelationEdgeData) {
    if (!window.confirm(t("editor.unlink.confirm"))) return;
    if (data.kind === "union-child") {
      const union = doc.unions.find((u) => u.id === data.unionId);
      if (!union) return;
      commit(unlinkChild(doc, union.a, data.childId));
    } else {
      const union = doc.unions.find((u) => u.id === data.unionId);
      if (!union || !union.b) {
        toast.info(t("editor.unlink.noOtherParent"));
        return;
      }
      commit(unlinkUnionParent(doc, data.unionId, data.personId));
    }
  }

  function handleAnnotationTextChange(id: string, text: string, width?: number) {
    if (!text.trim()) commit(removeAnnotation(doc, id));
    else commitField(patchAnnotation(doc, id, { text, width }));
  }

  function handleDeleteAnnotation(id: string) {
    if (!window.confirm(t("editor.annotation.deleteConfirm"))) return;
    commit(removeAnnotation(doc, id));
  }

  function handleAnnotationFocus() {
    setPenMode(false);
  }

  function handleAddStroke(points: { x: number; y: number }[], color: StrokeColor) {
    commit(addStroke(doc, points, color));
  }

  function handleEraseStroke(id: string) {
    commit(removeStroke(doc, id));
  }

  function applyBulk(patch: Parameters<typeof patchPeople>[2]) {
    if (multiIds.length === 0) return;
    commit(patchPeople(doc, multiIds, patch));
  }

  function focusOn(id: string) {
    setFocusRootId(id);
    setFitNonce((n) => n + 1);
  }

  function exitFocus() {
    setFocusRootId(null);
    setFitNonce((n) => n + 1);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, "-").toLowerCase() || "nasab"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportImage() {
    if (!exportPngRef.current) return;
    try {
      const raw = await exportPngRef.current();
      const branded = await withNasabCredit(raw);
      const a = document.createElement("a");
      a.href = branded;
      a.download = `${doc.name.replace(/\s+/g, "-").toLowerCase() || "nasab"}.png`;
      a.click();
    } catch {
      toast.error(t("editor.toast.imageFailed"));
    }
  }

  function importJson(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as TreeDocument;
        if (!parsed || !Array.isArray(parsed.people)) throw new Error("format");
        mutate({
          version: 1,
          name: parsed.name || doc.name,
          description: parsed.description || "",
          people: parsed.people,
          unions: parsed.unions ?? [],
        });
        toast.success(t("editor.toast.imported"));
      } catch {
        toast.error(t("editor.toast.importFailed"));
      }
    };
    reader.readAsText(file);
  }

  function openAddDialog() {
    setAddFromId(selectedId ?? doc.people[0]?.id ?? null);
    setAddRelation("child");
    setAddFromQuery("");
    setAddDialogOpen(true);
  }

  function confirmAddPerson() {
    const seed = { name: t("editor.newPersonName") };
    if (!addFromId) {
      const added = addBlankPerson(doc, seed);
      mutate(added.doc, added.id);
    } else {
      switch (addRelation) {
        case "parent": {
          const r = addParent(doc, addFromId, seed);
          mutate(r.doc, r.parentId);
          break;
        }
        case "spouse": {
          const r = addSpouse(doc, addFromId, seed);
          mutate(r.doc, r.spouseId);
          break;
        }
        case "child": {
          const r = addChild(doc, addFromId, seed);
          mutate(r.doc, r.childId);
          break;
        }
        case "sibling": {
          const r = addSibling(doc, addFromId);
          mutate(r.doc, r.siblingId);
          break;
        }
      }
    }
    setAddDialogOpen(false);
  }

  function addWithoutRelation() {
    const added = addBlankPerson(doc, { name: t("editor.newPersonName") });
    mutate(added.doc, added.id);
    setAddDialogOpen(false);
  }

  const addFromHits = useMemo(() => {
    const q = addFromQuery.trim().toLowerCase();
    const list = q ? doc.people.filter((p) => p.name.toLowerCase().includes(q)) : doc.people;
    return list.slice(0, 30);
  }, [doc.people, addFromQuery]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doc.people.slice(0, 8);
    return doc.people
      .filter((p) =>
        [p.name, p.title, p.notes, p.birthPlace].some((s) => s?.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [doc.people, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSelectedId(null);
        setSelectedUnionId(null);
        setAddDialogOpen(false);
        setPenMode(false);
        setTextMode(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const nasab = selected ? formatNasab(doc, selected.id) : "";
  const canUndo = undoStack.current.length > 0 || pendingBase.current !== null;
  const canRedo = redoStack.current.length > 0;
  void historyTick; // re-render trigger for the two flags above

  const RELATIONS: { id: Relation; icon: typeof GitFork; label: string }[] = [
    { id: "parent", icon: GitFork, label: t("panel.relations.addParent") },
    { id: "spouse", icon: Users, label: t("panel.relations.addSpouse") },
    { id: "child", icon: Baby, label: t("panel.relations.addChild") },
    { id: "sibling", icon: UserPlus, label: t("panel.relations.addSibling") },
  ];

  return (
    <div className="flex h-dvh min-h-[520px] flex-col overflow-hidden bg-canvas">
      <div className="editor-toolbar flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2 sm:px-5">
        <Link
          to="/app"
          aria-label={t("editor.backToTrees.ariaLabel")}
          className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-soft"
        >
          <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="6" cy="6" r="3.1" fill="currentColor" />
            <circle cx="16" cy="6" r="3.1" fill="currentColor" />
            <circle cx="11" cy="16.2" r="3.1" fill="currentColor" />
            <path d="M6 9.2 L11 13.1 L16 9.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </Link>
        <Input
          value={doc.name}
          onChange={(e) => commitField({ ...doc, name: e.target.value })}
          className="h-10 max-w-[220px] border-0 bg-transparent px-1 text-[16px] font-medium sm:max-w-[320px]"
          aria-label={t("editor.treeName.ariaLabel")}
        />
        <div className="editor-toolbar-actions ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="icon-sm" onClick={undo} disabled={!canUndo} aria-label={t("editor.undo.ariaLabel")} data-coachmark="tools">
            <Undo2 className="size-3.5" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={redo} disabled={!canRedo} aria-label={t("editor.redo.ariaLabel")} data-coachmark="tools">
            <Redo2 className="size-3.5" />
          </Button>
            <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)} data-coachmark="tools">
              <Search className="size-3.5" />
              <span className="hidden sm:inline">{t("editor.search")}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={autoLayout} data-coachmark="tools">
              <LayoutTemplate className="size-3.5" />
              <span className="hidden sm:inline">{t("editor.layout")}</span>
            </Button>
            <Button
              variant={penMode ? "primary" : "outline"}
              size="icon-sm"
              onClick={() => {
                setPenMode((v) => !v);
                setTextMode(false);
              }}
              aria-label={t("editor.pen.ariaLabel")}
              data-coachmark="tools"
            >
              <PenLine className="size-3.5" />
            </Button>
            <Button
              variant={textMode ? "primary" : "outline"}
              size="icon-sm"
              onClick={() => {
                setTextMode((v) => !v);
                setPenMode(false);
              }}
              aria-label={t("editor.addText.ariaLabel")}
              aria-pressed={textMode}
              data-coachmark="tools"
            >
              <Type className="size-3.5" />
            </Button>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setDownloadMenuOpen((v) => !v)} aria-label={t("editor.download.ariaLabel")} data-coachmark="tools">
              <Download className="size-3.5" />
            </Button>
            {downloadMenuOpen ? <>
              <div className="fixed inset-0 z-40" onClick={() => setDownloadMenuOpen(false)} />
              <div className="animate-in fade-in zoom-in-95 absolute top-full right-0 z-50 mt-1 min-w-[180px] rounded-lg bg-canvas p-1 shadow-soft ring-1 ring-hairline duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      exportJson();
                      setDownloadMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] hover:bg-surface-soft"
                  >
                    <FileJson className="size-3.5" /> {t("editor.download.json")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void exportImage();
                      setDownloadMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] hover:bg-surface-soft"
                  >
                    <ImageDown className="size-3.5" /> {t("editor.download.image")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      fileRef.current?.click();
                      setDownloadMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] hover:bg-surface-soft sm:hidden"
                  >
                    <Upload className="size-3.5" /> {t("editor.import")}
                  </button>
              </div>
            </> : null}
          </div>
          <Button className="hidden sm:inline-flex" variant="outline" size="sm" onClick={() => fileRef.current?.click()} data-coachmark="tools">
            <Upload className="size-3.5" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => setTourOpen(true)} aria-label={t("editor.tour.open")} data-coachmark="tools">
            <HelpCircle className="size-3.5" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => importJson(e.target.files?.[0])}
          />
          {user ? (
            tree.origin === "cloud" ? (
              <span className="caption hidden text-ink/60 lg:inline">
                {cloudSavedAt ? t("editor.saved") : t("editor.savingToAccount")}
              </span>
            ) : (
              <Button size="sm" onClick={() => void saveToAccount()} disabled={savingCloud}>
                <Cloud className="size-3.5" />
                {savingCloud ? t("editor.savingToAccount") : t("editor.saveToAccount")}
              </Button>
            )
          ) : null}
        </div>
      </div>

      {!user && !noticeDismissed ? (
        <div className="animate-in fade-in slide-in-from-top-1 flex min-h-14 items-center gap-2 bg-block-lilac px-3 py-2 duration-200 sm:gap-3 sm:px-5">
          <p className="min-w-0 flex-1 text-[14px] leading-5 sm:text-[16px]">{t("editor.localNotice")}</p>
          <Button asChild size="sm" variant="primary" className="shrink-0">
            <Link to="/login">{t("nav.signIn")}</Link>
          </Button>
          <button
            type="button"
            onClick={dismissNotice}
            aria-label={t("editor.dismissNotice.ariaLabel")}
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink/60 hover:bg-canvas/40 hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1" data-coachmark="canvas">
          <TreeCanvas
            doc={doc}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setSelectedUnionId(null);
            }}
            onSelectUnion={(id) => {
              setSelectedUnionId(id);
              setSelectedId(null);
            }}
            onMultiSelect={setMultiIds}
            onChange={(next) => commit(next)}
            fitNonce={fitNonce}
            exportRef={exportPngRef}
            visibleIds={visibleIds}
            onUnlinkRelation={handleUnlinkRelation}
            onAnnotationTextChange={handleAnnotationTextChange}
            onDeleteAnnotation={handleDeleteAnnotation}
            onAnnotationFocus={() => {
              handleAnnotationFocus();
              setTextMode(false);
            }}
            penMode={penMode}
            textMode={textMode}
            onTextPlaced={() => setTextMode(false)}
            penTool={penTool}
            penColor={penColor}
            onAddStroke={handleAddStroke}
            onEraseStroke={handleEraseStroke}
          />
          {nasab ? (
            <div className="pointer-events-none absolute top-4 left-4 right-4 max-w-xl rounded-md bg-canvas/90 px-4 py-3 ring-1 ring-hairline md:right-auto">
              <p className="caption">{t("editor.nasabLabel")}</p>
              <p className="mt-1 text-[15px] leading-snug font-medium">{nasab}</p>
            </div>
          ) : null}
          {focusRoot ? (
            <div className="animate-in fade-in slide-in-from-top-1 pointer-events-none absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-ink px-4 py-2 text-inverse-ink shadow-soft duration-150">
              <Focus className="size-3.5" />
              <span className="text-[13px] font-medium">
                {t("editor.focus.banner", { name: focusRoot.name || t("panel.noName") })}
              </span>
              <button
                type="button"
                onClick={exitFocus}
                className="pointer-events-auto ml-1 rounded-pill bg-on-inverse-soft/20 px-2.5 py-1 text-[12px] font-medium hover:bg-on-inverse-soft/30"
              >
                {t("editor.focus.exit")}
              </button>
            </div>
          ) : null}
          {penMode ? (
            <div className="animate-in fade-in slide-in-from-bottom-1 absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-canvas px-3 py-2 shadow-soft ring-1 ring-hairline duration-150">
              {STROKE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setPenColor(c);
                    setPenTool("draw");
                  }}
                  aria-label={c}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-canvas",
                    penTool === "draw" && penColor === c
                      ? "ring-2 ring-ink"
                      : "ring-1 ring-hairline",
                  )}
                  style={{ backgroundColor: c === STROKE_COLORS[0] ? "var(--color-ink)" : c }}
                />
              ))}
              <span className="h-6 w-px bg-hairline" />
              <button
                type="button"
                onClick={() => setPenTool((v) => (v === "erase" ? "draw" : "erase"))}
                aria-label={t("editor.pen.erase")}
                title={t("editor.pen.erase")}
                className={cn(
                  "grid size-8 place-items-center rounded-full",
                    penTool === "erase"
                    ? "bg-danger text-on-primary"
                    : "text-ink/60 hover:bg-surface-soft hover:text-ink",
                )}
              >
                <Eraser className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAddDialog}
              aria-label={t("editor.addPerson.ariaLabel")}
              data-coachmark="add-person"
              className="absolute bottom-5 left-1/2 z-10 flex h-11 -translate-x-1/2 items-center gap-2 rounded-pill bg-primary px-5 text-[14px] font-medium text-on-primary shadow-soft transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              <Plus className="size-4" /> {t("editor.addPerson")}
            </button>
          )}
        </div>
        {selected && multiIds.length <= 1 ? (
          <div
            key={selected.id}
            className={cn(
              "animate-in slide-in-from-bottom-6 fade-in duration-300 ease-out",
              "editor-panel-sheet absolute inset-x-0 bottom-0 z-20 h-[60dvh] max-h-[34rem] md:static md:h-auto md:max-h-none md:w-[360px]",
              "md:slide-in-from-bottom-0 md:slide-in-from-right-6",
            )}
          >
            <PersonPanel
              doc={doc}
              person={selected}
              onChange={(next) => commitField(next)}
              onClose={() => setSelectedId(null)}
              onAddSpouse={() => {
                const r = addSpouse(doc, selected.id);
                mutate(r.doc, r.spouseId);
              }}
              onAddChild={() => {
                const r = addChild(doc, selected.id);
                mutate(r.doc, r.childId);
              }}
              onAddParent={() => {
                const r = addParent(doc, selected.id);
                mutate(r.doc, r.parentId);
              }}
              onAddSibling={() => {
                const r = addSibling(doc, selected.id);
                mutate(r.doc, r.siblingId);
              }}
              onDelete={() => {
                if (!window.confirm(t("panel.deleteConfirm", { name: selected.name || t("panel.noName") }))) return;
                const next = removePerson(doc, selected.id);
                mutate(next);
                setSelectedId(next.people[0]?.id ?? null);
              }}
              onSelect={setSelectedId}
              onUnlinkParent={(parentId) => commit(unlinkChild(doc, parentId, selected.id))}
              onUnlinkSpouse={(spouseId) => commit(unlinkSpouse(doc, selected.id, spouseId))}
              onUnlinkChild={(childId) => commit(unlinkChild(doc, selected.id, childId))}
              onFocus={() => focusOn(selected.id)}
            />
          </div>
        ) : null}
        {multiIds.length > 1 ? (
          <div className="editor-panel-sheet animate-in slide-in-from-bottom-6 fade-in duration-300 ease-out absolute inset-x-0 bottom-0 z-20 h-[70%] md:static md:h-auto md:w-[360px] md:slide-in-from-bottom-0 md:slide-in-from-right-6">
            <div className="flex h-full flex-col gap-5 overflow-y-auto rounded-t-2xl bg-canvas p-5 shadow-soft ring-1 ring-hairline md:rounded-2xl">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{t("editor.bulk.selected", { count: multiIds.length })}</p>
                <button
                  type="button"
                  onClick={() => setMultiIds([])}
                  className="rounded-pill bg-surface-soft px-3 py-1.5 text-[13px] text-ink"
                >
                  {t("editor.bulk.clear")}
                </button>
              </div>
              <p className="caption -mt-3">{t("editor.bulk.hint")}</p>
              <div className="grid gap-1.5">
                <Label>{t("panel.field.shape")}</Label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyBulk({ shape: undefined })}
                    className="rounded-pill bg-surface-soft px-3 py-1.5 text-[13px] text-ink"
                  >
                    {t("panel.shape.rect")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBulk({ shape: "circle" })}
                    className="rounded-pill bg-surface-soft px-3 py-1.5 text-[13px] text-ink"
                  >
                    {t("panel.shape.circle")}
                  </button>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("panel.field.color")}</Label>
                <div className="flex flex-wrap gap-2">
                  {NODE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => applyBulk({ color: c })}
                      className={cn("size-8 rounded-full ring-1 ring-hairline", COLOR_SWATCH[c])}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("panel.field.icon")}</Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {PERSON_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      aria-label={icon}
                      onClick={() => applyBulk({ icon })}
                      className="grid size-10 place-items-center rounded-md bg-surface-soft text-ink"
                    >
                      <PersonGlyph name={icon as PersonIcon} className="size-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <BoardTour open={tourOpen} onFinish={finishTour} />

      {addDialogOpen ? (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-start justify-center bg-overlay-scrim/50 pt-[12vh] px-4 duration-150"
          onClick={() => setAddDialogOpen(false)}
        >
          <div
            className="animate-in fade-in zoom-in-95 w-full max-w-sm rounded-lg bg-canvas p-5 shadow-soft duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="eyebrow">{t("editor.addDialog.eyebrow")}</p>
              <button
                type="button"
                onClick={() => setAddDialogOpen(false)}
                aria-label={t("editor.union.close.ariaLabel")}
                className="grid size-8 place-items-center rounded-full bg-surface-soft"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {doc.people.length > 0 ? (
              <>
                <div className="mt-4 grid gap-1.5">
                  <Label>{t("editor.addDialog.fromLabel")}</Label>
                  {doc.people.length > 1 ? (
                    <>
                      <Input
                        placeholder={t("editor.search.placeholder")}
                        value={addFromQuery}
                        onChange={(e) => setAddFromQuery(e.target.value)}
                      />
                      <ul className="mt-1 max-h-52 overflow-y-auto rounded-md ring-1 ring-hairline">
                        {addFromHits.map((p) => {
                          const active = addFromId === p.id;
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => setAddFromId(p.id)}
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2.5 text-left",
                                  active ? "bg-primary text-on-primary" : "hover:bg-surface-soft",
                                )}
                              >
                                <span
                                  className={cn(
                                    "grid size-8 shrink-0 place-items-center overflow-hidden rounded-full",
                                    active ? "bg-on-primary/20" : "bg-surface-soft",
                                  )}
                                >
                                  {p.photo ? (
                                    <img src={p.photo} alt="" className="size-full object-cover" />
                                  ) : (
                                    <PersonGlyph name={p.icon ?? "user"} className="size-4" />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-medium">
                                    {p.name || t("panel.noName")}
                                  </span>
                                  <span
                                    className={cn(
                                      "block truncate text-[12px]",
                                      active ? "text-on-primary/70" : "text-ink/50",
                                    )}
                                  >
                                    {formatNasab(doc, p.id)}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                        {addFromHits.length === 0 ? (
                          <li className="px-3 py-4 text-center body-sm">
                            {t("editor.search.noResults")}
                          </li>
                        ) : null}
                      </ul>
                    </>
                  ) : (
                    <p className="body-sm rounded-md bg-surface-soft px-3 py-2.5">
                      {doc.people[0]?.name || t("panel.noName")}
                    </p>
                  )}
                </div>

                <div className="mt-4 grid gap-1.5">
                  <Label>{t("editor.addDialog.asLabel")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {RELATIONS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setAddRelation(r.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-[13px] font-medium",
                          addRelation === r.id
                            ? "bg-primary text-on-primary"
                            : "bg-surface-soft text-ink",
                        )}
                      >
                        <r.icon className="size-3.5" /> {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button className="mt-5 w-full" onClick={confirmAddPerson}>
                  {t("editor.addDialog.confirm")}
                </Button>
                <button
                  type="button"
                  onClick={addWithoutRelation}
                  className="mt-3 w-full text-center text-[13px] text-ink/60 underline underline-offset-4"
                >
                  {t("editor.addDialog.noRelation")}
                </button>
              </>
            ) : (
              <Button className="mt-5 w-full" onClick={addWithoutRelation}>
                {t("editor.addDialog.confirm")}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {selectedUnion ? (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-start justify-center bg-overlay-scrim/50 pt-[12vh] px-4 duration-150"
          onClick={() => setSelectedUnionId(null)}
        >
          <div
            className="animate-in fade-in zoom-in-95 w-full max-w-sm rounded-lg bg-canvas p-5 shadow-soft duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="eyebrow">{t("editor.union.eyebrow")}</p>
              <button
                type="button"
                onClick={() => setSelectedUnionId(null)}
                aria-label={t("editor.union.close.ariaLabel")}
                className="grid size-8 place-items-center rounded-full bg-surface-soft"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="headline mt-2">{unionPartnerNames}</p>
            <div className="mt-4 grid gap-1.5">
              <Label>{t("editor.union.labelField")}</Label>
              <Input
                value={selectedUnion.label ?? ""}
                placeholder="1946"
                onChange={(e) =>
                  commitField(
                    patchUnion(doc, selectedUnion.id, { label: e.target.value || undefined }),
                  )
                }
              />
            </div>
            <div className="mt-4 grid gap-1.5">
              <Label>{t("editor.union.notesField")}</Label>
              <Textarea
                value={selectedUnion.notes ?? ""}
                placeholder={t("editor.union.notesPlaceholder")}
                onChange={(e) =>
                  commitField(
                    patchUnion(doc, selectedUnion.id, { notes: e.target.value || undefined }),
                  )
                }
              />
            </div>
          </div>
        </div>
      ) : null}

      {searchOpen ? (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-start justify-center bg-overlay-scrim/50 pt-[12vh] px-4 duration-150"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="animate-in fade-in zoom-in-95 w-full max-w-lg rounded-lg bg-canvas p-4 shadow-soft duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              autoFocus
              placeholder={t("editor.search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="mt-3 max-h-72 overflow-y-auto">
              {hits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2.5 text-left hover:bg-surface-soft"
                    onClick={() => {
                      setSelectedId(p.id);
                      setSearchOpen(false);
                      setFitNonce((n) => n + 1);
                    }}
                  >
                    <span className="block text-[15px] font-medium">{p.name}</span>
                    <span className="caption mt-1 block opacity-70">
                      {formatNasab(doc, p.id)}
                    </span>
                  </button>
                </li>
              ))}
              {hits.length === 0 ? (
                <li className="px-3 py-6 text-center body-sm">{t("editor.search.noResults")}</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
