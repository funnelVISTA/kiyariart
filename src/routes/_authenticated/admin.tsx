import { createFileRoute, Navigate } from "@tanstack/react-router";

// /admin → redirect to /admin/orders (current single admin view).
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — art by KIYARI" }, { name: "robots", content: "noindex" }] }),
  component: () => <Navigate to="/admin/orders" replace />,
});
