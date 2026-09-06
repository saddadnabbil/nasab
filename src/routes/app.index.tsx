import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Cloud, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TreeGridLoadingTemplate } from "@/components/loading-templates";
import { SiteNav } from "@/components/site-nav";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLocale } from "@/lib/i18n/context";
import { deleteCloudTree, listCloudTrees } from "@/lib/tree/api";
import { emptyTree } from "@/lib/tree/ops";
import { sampleAlFalah } from "@/lib/tree/sample";
import { createLocalTree, deleteLocalTree, listLocalTrees } from "@/lib/tree/storage";
import type { TreeMeta } from "@/lib/tree/types";

type DeleteTarget = TreeMeta & { cloud?: boolean };

export const Route = createFileRoute("/app/")({ component: TreesHome });

function TreesHome() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user, isPending } = useCurrentUserState();
  const [local, setLocal] = useState<TreeMeta[]>([]);
  const [isLocalReady, setIsLocalReady] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLocal(listLocalTrees());
    setIsLocalReady(true);
  }, []);

  const cloudQuery = useQuery({
    queryKey: ["cloud-trees", user?.id],
    queryFn: () => listCloudTrees(),
    enabled: Boolean(user) && !isPending,
    retry: false,
  });

  function openNew(sample: boolean) {
    const tree = createLocalTree(sample ? sampleAlFalah() : emptyTree(t("editor.newTreeName")));
    void navigate({ to: "/app/tree/$treeId", params: { treeId: tree.id } });
  }

  async function removeLocal(id: string) {
    deleteLocalTree(id);
    setLocal(listLocalTrees());
  }

  async function removeCloud(id: string) {
    try {
      await deleteCloudTree({ data: id });
      await cloudQuery.refetch();
      toast.success(t("treesHome.toast.cloudDeleted"));
    } catch {
      toast.error(t("treesHome.toast.cloudDeleteFailed"));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    if (deleteTarget.cloud) await removeCloud(deleteTarget.id);
    else await removeLocal(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-[1280px] px-6 py-10 md:px-12 md:py-16">
        <p className="eyebrow">{t("treesHome.eyebrow")}</p>
        <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h1 className="display-lg min-w-0 max-w-3xl">{t("treesHome.heading")}</h1>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Button onClick={() => openNew(true)}>{t("treesHome.ctaSample")}</Button>
            <Button variant="outline" onClick={() => openNew(false)}>
              <Plus className="size-4" /> {t("treesHome.ctaEmpty")}
            </Button>
          </div>
        </div>

        <section className="mt-14">
          <p className="eyebrow">{t("treesHome.local.eyebrow")}</p>
          <p className="body-sm mt-2 max-w-xl">{t("treesHome.local.body")}</p>
          {!isLocalReady ? <TreeGridLoadingTemplate /> : (
            <TreeGrid
              trees={local}
              empty={t("treesHome.local.empty")}
              onDelete={(tree) => setDeleteTarget(tree)}
              onOpen={(id) => void navigate({ to: "/app/tree/$treeId", params: { treeId: id } })}
            />
          )}
        </section>

        <section className="mt-16">
          <div className="color-block bg-block-mint">
            <p className="eyebrow">{t("treesHome.account.eyebrow")}</p>
            {!user && !isPending ? (
              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <p className="subhead min-w-0 max-w-xl">{t("treesHome.account.prompt")}</p>
                <Button asChild className="shrink-0">
                  <Link to="/login">{t("nav.signIn")}</Link>
                </Button>
              </div>
            ) : null}
            {isPending ? <p className="body mt-4">{t("treesHome.account.loading")}</p> : null}
            {user ? (
              <>
                <p className="body-sm mt-2">
                  {cloudQuery.isFetching
                    ? t("treesHome.account.syncing")
                    : `${user.displayName ?? t("treesHome.account.defaultName")} · ${t("treesHome.account.savedInCloud")}`}
                </p>
                <TreeGrid
                  trees={(cloudQuery.data ?? []).map((tr) => ({
                    id: tr.id,
                    name: tr.name,
                    description: tr.description,
                    origin: "cloud" as const,
                    updatedAt: tr.updatedAt,
                    personCount: tr.personCount,
                  }))}
                  empty={t("treesHome.account.empty")}
                  onDelete={(tree) => setDeleteTarget({ ...tree, cloud: true })}
                  onOpen={(id) => void navigate({ to: "/app/tree/$treeId", params: { treeId: id } })}
                  cloud
                />
              </>
            ) : null}
          </div>
        </section>
      </main>
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogTitle>{t("treesHome.deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("treesHome.deleteDialog.body", { name: deleteTarget?.name || t("editor.newTreeName") })}
          </DialogDescription>
          <div className="mt-7 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              {t("treesHome.deleteDialog.cancel")}
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={isDeleting}>
              <Trash2 className="size-4" />
              {t("treesHome.deleteDialog.action")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TreeGrid({
  trees,
  empty,
  onDelete,
  onOpen,
  cloud,
}: {
  trees: TreeMeta[];
  empty: string;
  onDelete: (tree: TreeMeta) => void;
  onOpen: (id: string) => void;
  cloud?: boolean;
}) {
  const { t } = useLocale();
  if (trees.length === 0) {
    return <p className="body mt-6 max-w-lg">{empty}</p>;
  }
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trees.map((tr) => (
        <li key={`${tr.origin}-${tr.id}`} className="relative">
          <div
            role="link"
            tabIndex={0}
            onClick={() => onOpen(tr.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(tr.id);
              }
            }}
            className="group flex h-full min-h-[17rem] flex-col rounded-lg bg-canvas p-6 ring-1 ring-hairline transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            aria-label={`${t("treesHome.card.open")}: ${tr.name}`}
          >
            <p className="caption flex items-center gap-1.5">
              {cloud ? <Cloud className="size-3" /> : null}
              {t("treesHome.card.personCount", { count: tr.personCount })}
            </p>
            <h3 className="headline mt-3">{tr.name}</h3>
            <p className="body-sm mt-2 line-clamp-3 min-h-[3.5em]">
              {tr.description || t("treesHome.card.noDescription")}
            </p>
            <div className="mt-auto flex items-center gap-2 pt-6">
              <Button size="sm" onClick={(event) => { event.stopPropagation(); onOpen(tr.id); }}>
                {t("treesHome.card.open")}
              </Button>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-full bg-danger-soft text-danger transition-colors hover:bg-danger hover:text-on-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-danger"
                aria-label={`${t("treesHome.card.delete")}: ${tr.name}`}
                onClick={(event) => { event.stopPropagation(); onDelete(tr); }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
