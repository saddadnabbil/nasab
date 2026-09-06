import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <Outlet />
    </div>
  );
}
