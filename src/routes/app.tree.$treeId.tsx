import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { EditorShell } from "@/components/tree/editor-shell";
import { TreeEditorLoadingTemplate } from "@/components/loading-templates";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLocale } from "@/lib/i18n/context";
import { getCloudTree } from "@/lib/tree/api";
import { getLocalTree, saveLocalTree } from "@/lib/tree/storage";
import type { StoredTree } from "@/lib/tree/types";

export const Route = createFileRoute("/app/tree/$treeId")({
  component: TreeEditorPage,
});

function TreeEditorPage() {
  const { treeId } = Route.useParams();
  const { t } = useLocale();
  const { user, isPending } = useCurrentUserState();
  // Local storage only exists in the browser. Start from the same state on the
  // server and client, then hydrate the local tree after React has mounted.
  const [tree, setTree] = useState<StoredTree | null>(null);
  const [isLocalReady, setIsLocalReady] = useState(false);

  const cloudQuery = useQuery({
    queryKey: ["cloud-tree", treeId, user?.id],
    queryFn: () => getCloudTree({ data: treeId }),
    enabled: isLocalReady && Boolean(user) && !isPending && !tree,
    retry: false,
  });

  useEffect(() => {
    const local = getLocalTree(treeId);
    if (local) setTree(local);
    setIsLocalReady(true);
  }, [treeId]);

  useEffect(() => {
    if (tree || !cloudQuery.data) return;
    const loaded = cloudQuery.data;
    saveLocalTree({ ...loaded, origin: "local" });
    setTree(loaded);
  }, [cloudQuery.data, tree]);

  if (!isLocalReady || (!tree && (isPending || cloudQuery.isFetching))) {
    return <TreeEditorLoadingTemplate />;
  }

  if (!tree) {
    return (
      <div className="mx-auto grid max-w-lg place-items-center px-6 py-24 text-center">
        <h1 className="headline">{t("treePage.notFound.title")}</h1>
        <p className="body mt-3">{t("treePage.notFound.body")}</p>
        <Button asChild className="mt-8">
          <Link to="/app">{t("treePage.notFound.back")}</Link>
        </Button>
      </div>
    );
  }

  return <EditorShell tree={tree} onTreeChange={setTree} />;
}
